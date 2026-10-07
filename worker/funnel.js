/**
 * 방문·상담 깔때기 — 이벤트 기록(POST /api/event). 숫자는 D1 에 쌓이기만 한다
 * (매일 09:00 Slack 요약은 실제 상담이 들어오기 시작해 2026-10-08 껐다).
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
