/**
 * 방문·상담 깔때기 — 이벤트 기록(POST /api/event)과 매일 아침 Slack 요약.
 *
 * 브라우저 쪽은 src/scripts/funnel.ts. 저장소는 D1 yupumjeongri-funnel (스키마 migrations/).
 * 번호·IP 는 저장하지 않는다. 유입 출처는 호스트만, 검색어는 리퍼러에 실려 올 때만 남긴다.
 *
 * 숫자를 직접 보려면:
 *   npx wrangler d1 execute yupumjeongri-funnel --remote --command "SELECT day, type, COUNT(*) FROM events GROUP BY 1, 2 ORDER BY 1 DESC"
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

/** 상담 접수 성공 — 서버에서 직접 센다 (JS 가 꺼진 브라우저도 포함) */
export function recordConsult(env, ctx, request, page) {
  if (!env.FUNNEL_DB) return;
  ctx.waitUntil(insert(env, { type: 'consult', path: page, device: deviceOf(request) }).catch((err) => console.error('funnel consult', err)));
}

async function all(env, sql, ...binds) {
  return (await env.FUNNEL_DB.prepare(sql).bind(...binds).all()).results ?? [];
}

/** 하루치 깔때기 숫자 */
export async function summarize(env, day) {
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
       SUM(type = 'consult')                                   AS consult
     FROM events WHERE day = ?`,
    day,
  );
  const sources = await all(
    env,
    `SELECT ref, COUNT(DISTINCT sid) AS n FROM events WHERE day = ? AND type = 'view' AND ref != '' GROUP BY ref ORDER BY n DESC LIMIT 5`,
    day,
  );
  const landings = await all(
    env,
    `SELECT path, COUNT(DISTINCT sid) AS n FROM events WHERE day = ? AND type = 'view' AND ref != '' GROUP BY path ORDER BY n DESC LIMIT 5`,
    day,
  );
  const queries = await all(
    env,
    `SELECT query, COUNT(*) AS n FROM events WHERE day = ? AND type = 'view' AND query != '' GROUP BY query ORDER BY n DESC LIMIT 5`,
    day,
  );
  const [week] = await all(
    env,
    `SELECT COUNT(DISTINCT CASE WHEN type = 'view' THEN sid END) AS visitors,
            COUNT(DISTINCT CASE WHEN type = 'focus' THEN sid END) AS focus,
            SUM(type = 'consult') AS consult
     FROM events WHERE day > ? AND day <= ?`,
    kstDay(-7, Date.parse(`${day}T12:00:00+09:00`)),
    day,
  );
  return { day, counts, sources, landings, queries, week };
}

export function digestText({ day, counts: c, sources, landings, queries, week }) {
  const n = (v) => Number(v ?? 0);
  const list = (rows, key) => (rows.length ? rows.map((r) => `${r[key]} ${r.n}`).join(' · ') : '없음');
  return [
    `*대한유품정리 어제(${day}) 방문·상담 깔때기*`,
    `방문 *${n(c.visitors)}명* (페이지뷰 ${n(c.views)}) — 외부 유입 ${n(c.external)} · 네이버 ${n(c.naver)} · 모바일 ${n(c.mobile)}`,
    `계산기 사용 ${n(c.calc)} → 상담 버튼 ${n(c.cta)} → 번호 칸 누름 *${n(c.focus)}* → 제출 ${n(c.submit)} (형식 오류 ${n(c.invalid)}) → 접수 *${n(c.consult)}건*`,
    `유입 출처: ${list(sources, 'ref')}`,
    `들어온 페이지: ${list(landings, 'path')}`,
    `검색어: ${list(queries, 'query')}`,
    `최근 7일: 방문 ${n(week?.visitors)}명 · 번호 칸 누름 ${n(week?.focus)} · 접수 ${n(week?.consult)}건`,
  ].join('\n');
}

/** cron — 어제 요약을 상담 채널로 */
export async function sendDigest(env) {
  if (!env.FUNNEL_DB) return;
  // 로컬(wrangler dev --test-scheduled)은 웹훅이 없으니 로그로만 — /__scheduled 로 확인한다
  const text = digestText(await summarize(env, kstDay(env.SLACK_WEBHOOK_URL ? -1 : 0)));
  if (!env.SLACK_WEBHOOK_URL) return console.log(text);
  const res = await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) console.error('깔때기 요약 전송 실패', res.status, await res.text());
}
