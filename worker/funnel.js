/**
 * 방문·상담 깔때기 — 이벤트 기록(POST /api/event)과 주 1회 Slack 요약. 숫자는 D1 에 쌓인다.
 * (매일 09:00 요약은 실제 상담이 들어오기 시작해 2026-10-08 껐다. 2026-11-26 부터 월요일 09:00 KST 에
 *  지난 7일 요약 한 번만 보낸다 — 접수가 0 인 주에도 오므로, 이 요약이 오는 것 자체가 Slack 웹훅이 살아 있다는 확인이다.)
 *
 * 브라우저 쪽은 src/scripts/funnel.ts. 저장소는 D1 yupumjeongri-funnel (스키마 migrations/).
 * 번호·IP 는 저장하지 않는다. 유입 출처는 호스트만, 검색어는 리퍼러에 실려 올 때만 남긴다.
 *
 * 상담 폼이 Slack 으로 넘기지 못한 신청은 type 'fail' 로 센다(2026-11-26). 전에는 전송이 실패하면 어디에도 남지 않아
 * 웹훅이 끊겨도 알 길이 없었다. 번호·내용은 남기지 않고 횟수와 까닭만 남긴다 — ref 칸에 까닭을 적는다:
 *   config(웹훅 Secret 없음) · slack-404 처럼 slack-<상태코드> · exception(연결 실패). 표를 새로 만들지 않아 마이그레이션이 필요 없다.
 *
 * 현장 사진을 함께 보낸 접수는 type 'consult' 행의 ref 칸에 'photo-<장 수>' 를 적는다(2026-11-27, 사진이 없으면 빈 값).
 * 사진 자체와 열람 주소는 D1 에 넣지 않는다 — 사진은 KV PHOTOS 에만 30일 있다(worker/photos.js).
 *
 * 숫자를 직접 보려면:
 *   npx wrangler d1 execute yupumjeongri-funnel --remote --command "SELECT day, type, COUNT(*) FROM events GROUP BY 1, 2 ORDER BY 1 DESC"
 *   전송 실패만: ... --command "SELECT day, ref, path, COUNT(*) FROM events WHERE type = 'fail' GROUP BY 1, 2, 3 ORDER BY 1 DESC"
 */

const TYPES = new Set(['view', 'focus', 'invalid', 'submit', 'calc', 'cta']);
// 스크립트를 실행하는 크롤러·미리보기 봇. 카카오톡 인앱 브라우저(KAKAOTALK)는 사람이라 거르지 않는다.
const BOT_RE = /bot|crawl|spider|slurp|yeti|headless|lighthouse|preview|scrap|facebookexternalhit/i;
const SITE_HOST = 'yupumjeongri.xyz';

/** KST 날짜 YYYY-MM-DD. offsetDays=-1 이면 어제 */
export function kstDay(offsetDays = 0, now = Date.now()) {
  return new Date(now + 9 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);
}

/** 리퍼러에서 출처 호스트와 검색어를 꺼낸다. 사이트 안 이동은 빈 값 */
export function parseReferrer(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '');
    if (host === SITE_HOST) return { ref: '', query: '' };
    const q = url.searchParams.get('query') ?? url.searchParams.get('q') ?? '';
    return { ref: host.slice(0, 80), query: q.replace(/\s+/g, ' ').trim().slice(0, 60) };
  } catch {
    return { ref: '', query: '' };
  }
}

function deviceOf(request) {
  return /Mobi|Android|iPhone|iPad/i.test(request.headers.get('User-Agent') ?? '') ? 'mobile' : 'desktop';
}

async function insert(env, row) {
  await env.FUNNEL_DB.prepare(
    'INSERT INTO events (ts, day, type, path, sid, ref, query, device) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(Date.now(), kstDay(), row.type, row.path ?? '', row.sid ?? '', row.ref ?? '', row.query ?? '', row.device ?? '')
    .run();
}

/** POST /api/event — 항상 204. 측정 실패가 페이지에 드러나지 않게 한다. */
export async function handleEvent(request, env, ctx) {
  const done = new Response(null, { status: 204 });
  if (request.method !== 'POST' || !env.FUNNEL_DB) return done;
  if (BOT_RE.test(request.headers.get('User-Agent') ?? '')) return done;

  let data;
  try {
    data = JSON.parse((await request.text()).slice(0, 2000));
  } catch {
    return done;
  }
  const type = String(data.t ?? '');
  const path = String(data.p ?? '');
  const sid = String(data.s ?? '');
  if (!TYPES.has(type) || !/^\/[\w\-/%.]{0,200}$/.test(path) || !/^[a-z0-9]{6,30}$/.test(sid)) return done;

  const { ref, query } = type === 'view' ? parseReferrer(String(data.r ?? '')) : { ref: '', query: '' };
  ctx.waitUntil(insert(env, { type, path, sid, ref, query, device: deviceOf(request) }).catch((err) => console.error('funnel insert', err)));
  return done;
}

/** 상담 접수 성공 — 서버에서 직접 센다 (JS 가 꺼진 브라우저도 포함). 사진을 함께 받았으면 장 수만 ref 에 'photo-3' 처럼 */
export function recordConsult(env, ctx, request, page, photoCount = 0) {
  if (!env.FUNNEL_DB) return;
  const n = Math.max(0, Math.min(9, Math.trunc(Number(photoCount) || 0)));
  const ref = n ? `photo-${n}` : '';
  ctx.waitUntil(insert(env, { type: 'consult', path: page, ref, device: deviceOf(request) }).catch((err) => console.error('funnel consult', err)));
}

/**
 * 상담 신청을 Slack 으로 넘기지 못했다 — 횟수와 까닭만 센다. 번호·내용은 남기지 않는다.
 * reason: 'config' | 'slack-<상태코드>' | 'exception' (events.ref 칸에 들어간다)
 */
export function recordConsultFail(env, ctx, request, reason, page) {
  if (!env.FUNNEL_DB) return;
  const ref = String(reason ?? '').replace(/[^\w-]/g, '').slice(0, 30) || 'unknown';
  ctx.waitUntil(insert(env, { type: 'fail', path: page, ref, device: deviceOf(request) }).catch((err) => console.error('funnel fail', err)));
}

async function all(env, sql, ...binds) {
  return (await env.FUNNEL_DB.prepare(sql).bind(...binds).all()).results ?? [];
}

/** endDay(KST, 그날 포함)까지 7일의 깔때기 숫자와, 견줄 그 전 7일 */
export async function summarizeWeek(env, endDay) {
  const at = Date.parse(`${endDay}T12:00:00+09:00`);
  const startDay = kstDay(-6, at);
  const prevStart = kstDay(-13, at);
  const prevEnd = kstDay(-7, at);
  const [counts] = await all(
    env,
    `SELECT
       COUNT(DISTINCT CASE WHEN type = 'view' THEN sid END)    AS visitors,
       SUM(type = 'view')                                      AS views,
       COUNT(DISTINCT CASE WHEN type = 'view' AND ref != '' THEN sid END) AS external,
       COUNT(DISTINCT CASE WHEN type = 'view' AND ref LIKE '%naver.com' THEN sid END) AS naver,
       COUNT(DISTINCT CASE WHEN type = 'view' AND device = 'mobile' THEN sid END) AS mobile,
       COUNT(DISTINCT CASE WHEN type = 'calc' THEN sid END)    AS calc,
       COUNT(DISTINCT CASE WHEN type = 'cta' THEN sid END)     AS cta,
       COUNT(DISTINCT CASE WHEN type = 'focus' THEN sid END)   AS focus,
       SUM(type = 'invalid')                                   AS invalid,
       COUNT(DISTINCT CASE WHEN type = 'submit' THEN sid END)  AS submit,
       SUM(type = 'consult')                                   AS consult,
       SUM(type = 'consult' AND ref LIKE 'photo-%')            AS consult_photo,
       SUM(CASE WHEN type = 'consult' AND ref LIKE 'photo-%' THEN CAST(substr(ref, 7) AS INTEGER) ELSE 0 END) AS photos,
       SUM(type = 'fail')                                      AS fail
     FROM events WHERE day >= ? AND day <= ?`,
    startDay,
    endDay,
  );
  const range = [startDay, endDay];
  const fails = await all(env, `SELECT ref, COUNT(*) AS n FROM events WHERE day >= ? AND day <= ? AND type = 'fail' GROUP BY ref ORDER BY n DESC LIMIT 5`, ...range);
  const sources = await all(
    env,
    `SELECT ref, COUNT(DISTINCT sid) AS n FROM events WHERE day >= ? AND day <= ? AND type = 'view' AND ref != '' GROUP BY ref ORDER BY n DESC LIMIT 5`,
    ...range,
  );
  const landings = await all(
    env,
    `SELECT path, COUNT(DISTINCT sid) AS n FROM events WHERE day >= ? AND day <= ? AND type = 'view' AND ref != '' GROUP BY path ORDER BY n DESC LIMIT 5`,
    ...range,
  );
  const queries = await all(
    env,
    `SELECT query, COUNT(*) AS n FROM events WHERE day >= ? AND day <= ? AND type = 'view' AND query != '' GROUP BY query ORDER BY n DESC LIMIT 5`,
    ...range,
  );
  const [prev] = await all(
    env,
    `SELECT COUNT(DISTINCT CASE WHEN type = 'view' THEN sid END) AS visitors,
            COUNT(DISTINCT CASE WHEN type = 'view' AND ref LIKE '%naver.com' THEN sid END) AS naver,
            SUM(type = 'consult') AS consult
     FROM events WHERE day >= ? AND day <= ?`,
    prevStart,
    prevEnd,
  );
  return { startDay, endDay, counts, fails, sources, landings, queries, prev };
}

export function weeklyText({ startDay, endDay, counts: c, fails, sources, landings, queries, prev }) {
  const n = (v) => Number(v ?? 0);
  const md = (day) => `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`;
  const list = (rows, key) => (rows.length ? rows.map((r) => `${r[key]} ${r.n}`).join(' · ') : '없음');
  return [
    `*대한유품정리 지난 7일(${md(startDay)}~${md(endDay)}) 방문·상담 깔때기*`,
    `방문 *${n(c?.visitors)}명* (페이지뷰 ${n(c?.views)}) — 외부 유입 ${n(c?.external)} · 네이버 ${n(c?.naver)} · 모바일 ${n(c?.mobile)}`,
    `계산기 사용 ${n(c?.calc)} → 상담 버튼 ${n(c?.cta)} → 번호 칸 누름 *${n(c?.focus)}* → 제출 ${n(c?.submit)} (형식 오류 ${n(c?.invalid)}) → 접수 *${n(c?.consult)}건*`,
    ...(n(c?.consult_photo) ? [`그중 현장 사진을 함께 보낸 접수 ${n(c?.consult_photo)}건 (사진 ${n(c?.photos)}장, 30일 뒤 자동 삭제)`] : []),
    ...(n(c?.fail)
      ? [`:warning: *Slack 으로 넘기지 못한 신청 ${n(c?.fail)}건* (${list(fails, 'ref')}) — 신청자는 오류 화면을 봤습니다. 웹훅 Secret 을 확인하세요.`]
      : []),
    `유입 출처: ${list(sources, 'ref')}`,
    `들어온 페이지: ${list(landings, 'path')}`,
    `검색어: ${list(queries, 'query')}`,
    `그 전 7일: 방문 ${n(prev?.visitors)}명 · 네이버 ${n(prev?.naver)} · 접수 ${n(prev?.consult)}건`,
    '_매주 월요일 09:00 에 옵니다. 안 오면 상담 알림 웹훅이 끊긴 것입니다._',
  ].join('\n');
}

/** cron — 어제까지 7일 요약을 상담 채널로. 접수가 0 인 주에도 보낸다(웹훅 생존 확인을 겸한다). */
export async function sendWeekly(env) {
  if (!env.FUNNEL_DB) return;
  const text = weeklyText(await summarizeWeek(env, kstDay(-1)));
  // 로컬(wrangler dev --test-scheduled)은 웹훅이 없으면 로그로만 — /__scheduled 로 확인한다
  if (!env.SLACK_WEBHOOK_URL) return console.log(text);
  const res = await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) console.error('깔때기 주간 요약 전송 실패', res.status, await res.text());
}
