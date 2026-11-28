/**
 * 허브 관제판 '주간 성적표'에 넘기는 내용 없는 카운터 (2026-11-28 사업주 결정 "Slack 상담 채널엔 실제 고객 문의만,
 * 주간 요약은 관제판에서"). 설계는 운영자 허브 저장소 docs/scorecard-design.md.
 *
 * 저장소: 공용 D1 hub_leads 의 points 표 (바인딩 HUB_DB, 스키마 migrations-hub/0001_points.sql). 같은 운영자의 여러 브랜드
 * Worker 가 같이 쓰고 brand 칸으로 가른다. 400일 지난 이 브랜드 행은 매일 cron 이 지운다.
 * (처음엔 Analytics Engine 이었으나 계정에서 켜지지 않아 배포가 code 10089 로 실패해 2026-11-29 D1 으로 바꿨다.)
 *
 * **이름·연락처·주소·문의 글·IP·검색어는 쓰지 않는다.** 건수, 신청 페이지 경로, 상담 분야 이름, 까닭 코드만.
 * 쓰기는 응답 뒤로 미룬다(ctx.waitUntil). 카운터가 실패해도 상담 접수와 고객 화면에는 영향이 없다.
 */

export const BRAND = 'daehan';
const HOST = 'yupumjeongri.xyz';
/** 이 일수보다 오래된 이 브랜드 행은 매일 cron 이 지운다 */
export const KEEP_DAYS = 400;

/** funnel 행 data JSON 의 키 — worker/funnel.js summarizeDay 의 counts 키 */
export const FUNNEL_FIELDS = [
  'visitors', 'views', 'external', 'naver', 'mobile', 'calc', 'cta',
  'focus', 'invalid', 'submit', 'consult', 'consult_photo', 'photos', 'fail',
];

const clip = (value, max) => String(value ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);
/**
 * 폼에서 온 글자 칸(상담 분야·신청 페이지) — 화면에선 고른 값이지만 서버는 조작된 요청도 받는다.
 * 숫자 5자리 이상이나 @ 가 있으면(번호·메일처럼 사람을 가리킬 수 있는 값) 버린다.
 */
const scrub = (value, max) => {
  const text = clip(value, max);
  return /\d{5,}|@/.test(text.replace(/[\s-]/g, '')) ? '' : text;
};

/** KST 날짜 YYYY-MM-DD (offsetDays=-1 이면 어제) */
const kstDay = (offsetDays = 0, now = Date.now()) =>
  new Date(now + 9 * 3600_000 + offsetDays * 86400_000).toISOString().slice(0, 10);

const COLUMNS = ['ts', 'day', 'brand', 'site', 'kind', 'result', 'label', 'source', 'page', 'reason', 'photos', 'value', 'data'];
const INSERT_SQL = `INSERT INTO points (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map(() => '?').join(', ')})`;

/** 한 행 INSERT 문 — 빠진 칸은 빈 값·0 */
function insertStatement(env, row) {
  const full = { ts: Date.now(), day: kstDay(), brand: BRAND, site: HOST, result: '', label: '', source: '', page: '', reason: '', photos: 0, value: 0, data: '', ...row };
  return env.HUB_DB.prepare(INSERT_SQL).bind(...COLUMNS.map((c) => full[c]));
}

/** 상담 한 건의 결과 — consult(Slack 전달), fail(전달 못 함), test(시험 접수라 Slack 에 보내지 않음) */
export function writeLead(env, ctx, { result, service = '', page = '', reason = '', photos = 0 }) {
  if (!env.HUB_DB) return; // 로컬·테스트에 바인딩이 없으면 넘어간다
  // 상담 흐름(Slack 전송 뒤, 실패 처리 안)에서 불리므로 무엇이 실패해도 던지지 않는다
  try {
    const statement = insertStatement(env, {
      kind: 'lead',
      result,
      label: scrub(service, 30),
      page: scrub(page, 120),
      reason: clip(reason, 30),
      photos: Math.max(0, Math.trunc(Number(photos) || 0)),
    });
    ctx.waitUntil(statement.run().catch((err) => console.error('hub_leads lead 쓰기 실패', err)));
  } catch (err) {
    console.error('hub_leads lead 준비 실패', err);
  }
}

// Slack 이 '받았지만 내용이 잘못됐다'고 답하는 코드 — 웹훅이 살아 있다는 뜻이다. 메시지는 남지 않는다.
const ALIVE_CODES = new Set(['no_text', 'invalid_payload', 'missing_text_or_fallback_or_attachments']);
// 웹훅이 지워졌거나 막혔다는 코드
const DEAD_CODES = new Set(['no_service', 'no_service_id', 'no_team', 'team_disabled', 'invalid_token', 'channel_is_archived', 'channel_not_found', 'action_prohibited']);

/** Slack 응답 → 상태. 코드 이름을 먼저 보고, 모르는 코드면 HTTP 상태로 가른다 */
export function classifyWebhookReply(status, body) {
  const code = clip(body, 40).replace(/[^\w-]/g, '');
  if (ALIVE_CODES.has(code)) return { state: 'alive', code };
  if (DEAD_CODES.has(code) || [403, 404, 410].includes(status)) return { state: 'dead', code };
  return { state: 'unknown', code };
}

/**
 * 웹훅 생존 점검 — 빈 JSON({}) 을 보낸다. Slack 은 text 가 없어 메시지를 만들지 않고 no_text 류로 거절한다(=살아 있음).
 * 지워진 웹훅은 no_service 같은 코드로 답한다(=끊김). 결과는 webhook 행 하나. 상담 채널에는 아무것도 남지 않는다.
 * 2026-11-26~11-28 에는 월요일 주간 요약(실제로는 한 번도 나가지 않음)이 이 확인을 겸하려 했다.
 */
export async function checkWebhook(env, fetchImpl = fetch) {
  let result;
  if (!env.SLACK_WEBHOOK_URL) {
    result = { state: 'config', code: '', status: 0 };
  } else {
    try {
      const res = await fetchImpl(env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const body = await res.text().catch(() => '');
      result = { ...classifyWebhookReply(res.status, body), status: res.status };
    } catch {
      result = { state: 'exception', code: '', status: 0 };
    }
  }
  console.log('상담 웹훅 점검', result.state, result.status, result.code);
  if (env.HUB_DB) {
    try {
      await insertStatement(env, { kind: 'webhook', result: result.state, label: result.code, value: result.status }).run();
    } catch (err) {
      console.error('hub_leads webhook 쓰기 실패', err);
    }
  }
  return result;
}

/**
 * 하루 깔때기 숫자와 유입 상위 — worker/funnel.js summarizeDay 의 결과. 같은 날을 다시 돌려도 겹치지 않게
 * 그날의 funnel·source·landing 행을 지우고 다시 쓴다. 오래된 이 브랜드 행도 여기서 지운다(KEEP_DAYS).
 */
export async function writeFunnelDay(env, { day, counts, sources, landings }) {
  if (!env.HUB_DB) return;
  const data = JSON.stringify(Object.fromEntries(FUNNEL_FIELDS.map((key) => [key, Number(counts?.[key] ?? 0)])));
  await env.HUB_DB.batch([
    env.HUB_DB.prepare(`DELETE FROM points WHERE brand = ? AND day = ? AND kind IN ('funnel', 'source', 'landing')`).bind(BRAND, day),
    env.HUB_DB.prepare(`DELETE FROM points WHERE brand = ? AND day < ?`).bind(BRAND, kstDay(-KEEP_DAYS)),
    insertStatement(env, { kind: 'funnel', day, data }),
    ...(sources ?? []).map((row) => insertStatement(env, { kind: 'source', day, label: clip(row.ref, 80), value: Number(row.n ?? 0) })),
    ...(landings ?? []).map((row) => insertStatement(env, { kind: 'landing', day, label: clip(row.path, 120), value: Number(row.n ?? 0) })),
  ]);
}
