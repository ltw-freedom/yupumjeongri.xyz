/**
 * 허브 관제판 '주간 성적표'에 넘기는 내용 없는 카운터 (2026-11-28, 사업주 결정 "Slack 상담 채널엔 실제 고객 문의만,
 * 주간 요약은 관제판에서"). 설계는 운영자 허브 저장소 docs/scorecard-design.md.
 *
 * 저장소: Workers Analytics Engine 데이터셋 hub_leads (바인딩 HUB_LEADS, wrangler.jsonc). 3개월 보관.
 * 허브는 Account Analytics Read 권한만 있는 토큰으로 SQL API 를 읽는다 — 그 권한으로는 KV·D1 의 상담 값을 못 읽는다.
 * **이름·연락처·주소·문의 글·IP·검색어는 쓰지 않는다.** 건수, 신청 페이지 경로, 상담 분야 이름, 까닭 코드만.
 *
 * 한 점의 칸(같은 데이터셋을 쓰는 브랜드 공통 순서):
 *   index1 = 브랜드 키 'daehan'
 *   blob1  = 종류 'lead' | 'webhook' | 'funnel' | 'source' | 'landing'
 *   blob2  = 사이트 호스트
 *   lead    : blob3 결과(consult|fail|test) · blob4 상담 분야 · blob5 유입 범주(이 사이트 폼은 리퍼러를 받지 않아 '') ·
 *             blob6 신청 페이지 · blob7 실패 까닭 · double1 = 1 · double2 = 사진 장 수
 *   webhook : blob3 상태(alive|dead|unknown|config|exception) · blob4 Slack 응답 코드 이름 · double1 HTTP 상태
 *   funnel  : blob3 날짜(KST) · double1~14 = FUNNEL_FIELDS 순서
 *   source  : blob3 날짜 · blob4 유입 호스트 · double1 방문자 수 (상위 5)
 *   landing : blob3 날짜 · blob4 들어온 페이지 · double1 방문자 수 (상위 5)
 * 같은 날 cron 이 두 번 돌면 funnel·source·landing 점이 겹친다 — 읽는 쪽이 날짜마다 하나만 쓴다.
 */

export const BRAND = 'daehan';
const HOST = 'yupumjeongri.xyz';

/** funnel 점의 double 순서 — worker/funnel.js summarizeDay 의 counts 키 */
export const FUNNEL_FIELDS = [
  'visitors', 'views', 'external', 'naver', 'mobile', 'calc', 'cta',
  'focus', 'invalid', 'submit', 'consult', 'consult_photo', 'photos', 'fail',
];

const clip = (value, max) => String(value ?? '').replace(/[\r\n]/g, ' ').trim().slice(0, max);

function write(env, blobs, doubles) {
  if (!env.HUB_LEADS) return; // 로컬·테스트에는 바인딩이 없다
  try {
    env.HUB_LEADS.writeDataPoint({ indexes: [BRAND], blobs: [blobs[0], HOST, ...blobs.slice(1)], doubles });
  } catch (err) {
    console.error('hub_leads 쓰기 실패', err);
  }
}

/** 상담 한 건의 결과 — consult(Slack 전달), fail(전달 못 함), test(시험 접수라 Slack 에 보내지 않음) */
export function writeLead(env, { result, service = '', page = '', reason = '', photos = 0 }) {
  write(env, ['lead', result, clip(service, 30), '', clip(page, 120), clip(reason, 30)], [1, Math.max(0, Number(photos) || 0)]);
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
 * 지워진 웹훅은 no_service 같은 코드로 답한다(=끊김). 결과는 hub_leads 에 한 점. 상담 채널에는 아무것도 남지 않는다.
 * 2026-11-26~11-28 에는 월요일 주간 요약이 이 확인을 겸했다.
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
  if (result.state !== 'alive') console.error('상담 웹훅 점검', result.state, result.status, result.code);
  write(env, ['webhook', result.state, result.code], [result.status]);
  return result;
}

/** 하루 깔때기 숫자와 유입 상위 — worker/funnel.js summarizeDay 의 결과를 그대로 받는다 */
export function writeFunnelDay(env, { day, counts, sources, landings }) {
  write(env, ['funnel', day], FUNNEL_FIELDS.map((key) => Number(counts?.[key] ?? 0)));
  for (const row of sources ?? []) write(env, ['source', day, clip(row.ref, 80)], [Number(row.n ?? 0)]);
  for (const row of landings ?? []) write(env, ['landing', day, clip(row.path, 120)], [Number(row.n ?? 0)]);
}
