/**
 * 검색·AI 봇 실제 방문 — Cloudflare GraphQL Analytics(httpRequestsAdaptiveGroups)에서 읽는다.
 *
 * 왜: 운영자가 서치어드바이저·Search Console 을 볼 여력이 없다(2026-11-05). 네이버 유입이 0 일 때
 * "Yeti 가 아예 안 오는지(수집 문제)" vs "와서 읽는데 노출이 안 되는지(순위 문제)"를 콘솔 없이 가르려고 둔다.
 * 우리 Cloudflare 계정의 우리 zone 만 조회한다. **네이버 도메인(검색 화면·서치어드바이저)은 조회하지 않는다** —
 * 네이버 자동 조회 전면 중단 결정(2026-10-13·10-21)과 부딪히지 않는다.
 *
 * 숫자는 적응형 표본이다. Cloudflare 가 요청을 표본 추출한 뒤 비율로 되돌린 추정치(count)라
 * 하루 몇 건 수준에선 ±1~2 가 흔들릴 수 있다. 정확한 건수는 Worker 가 D1 에 쌓는 bot_hits 표
 * (worker/botlog.js, migrations/0002_bot_hits.sql)를 본다. 이 스크립트는 그 표가 생기기 전 과거 30일까지 볼 수 있다는 게 쓸모다.
 *
 * 사용법:
 *   node scripts/bot-crawl.mjs              지난 14일 (오늘 KST 포함)
 *   node scripts/bot-crawl.mjs --days 21    최대 30 (Free 플랜 보존 기간이 31일)
 *
 * 토큰: 환경변수 CF_API_TOKEN (권한 Analytics:Read + Zone:Read). 없으면 wrangler login 의 OAuth 토큰을 설정 파일에서 읽는다
 *   (Windows: %USERPROFILE%\.wrangler\config\default.toml 또는 %APPDATA%\xdg.config\.wrangler\config\default.toml).
 *   OAuth 토큰은 몇 시간마다 만료된다 — 만료면 `npx wrangler whoami` 를 한 번 돌리면 갱신된다.
 * 날짜는 KST 로 묶는다(KST 00:00 = UTC 전날 15:00). 봇 판별 표는 worker/botlog.js 의 BOTS 를 그대로 쓴다.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { BOTS, botName, pathKind } from '../worker/botlog.js';

const ZONE_NAME = 'yupumjeongri.xyz';
const API = 'https://api.cloudflare.com/client/v4';
const KST_MS = 9 * 3600_000;
const DAY_MS = 86400_000;

// GraphQL 쪽 1차 거르기 — LIKE 는 대소문자를 가리므로 실제 UA 표기 그대로 적는다.
// 최종 이름은 BOTS 정규식으로 다시 매긴다(두 측정이 같은 기준이 되게).
const UA_LIKE = [
  'Yeti/', 'Daumoa', 'Daum/', 'Google-InspectionTool', 'GoogleOther', 'Googlebot', 'bingbot',
  'OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Perplexity-User', 'PerplexityBot',
  'Claude-SearchBot', 'Claude-User', 'ClaudeBot', 'Applebot',
];

function parseDays(argv) {
  const i = argv.indexOf('--days');
  const n = i >= 0 ? Number(argv[i + 1]) : 14;
  if (!Number.isInteger(n) || n < 1) {
    console.error('--days 는 1~30 정수');
    process.exit(1);
  }
  return Math.min(n, 30);
}

/** 토큰과 출처. 환경변수가 우선, 없으면 wrangler OAuth 설정 파일 */
function loadToken() {
  if (process.env.CF_API_TOKEN) return { token: process.env.CF_API_TOKEN, from: '환경변수 CF_API_TOKEN', oauth: false };
  const candidates = [
    join(homedir(), '.wrangler', 'config', 'default.toml'),
    process.env.APPDATA && join(process.env.APPDATA, 'xdg.config', '.wrangler', 'config', 'default.toml'),
    process.env.XDG_CONFIG_HOME && join(process.env.XDG_CONFIG_HOME, '.wrangler', 'config', 'default.toml'),
    join(homedir(), '.config', '.wrangler', 'config', 'default.toml'),
  ].filter(Boolean);
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    const toml = readFileSync(file, 'utf8');
    const token = toml.match(/^oauth_token\s*=\s*"([^"]+)"/m)?.[1];
    if (!token) continue;
    const exp = toml.match(/^expiration_time\s*=\s*"([^"]+)"/m)?.[1];
    if (exp && Date.parse(exp) < Date.now()) {
      console.error(`wrangler OAuth 토큰이 만료됐다 (${exp}, ${file}).`);
      console.error('`npx wrangler whoami` 를 한 번 돌려 갱신하거나 CF_API_TOKEN 을 설정한 뒤 다시 실행.');
      process.exit(1);
    }
    return { token, from: `wrangler OAuth 설정 파일 ${file}`, oauth: true };
  }
  console.error('토큰이 없다. CF_API_TOKEN(Analytics:Read) 을 설정하거나 `npx wrangler login` 뒤 다시 실행.');
  process.exit(1);
}

function failOnRateLimit(errors) {
  if ((errors ?? []).some((e) => /rate limiter budget depleted/i.test(e?.message ?? ''))) {
    console.error('Cloudflare GraphQL 요청 한도 소진(Rate limiter budget depleted). 5분 뒤 다시 실행.');
    process.exit(2);
  }
}

async function cf(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json().catch(() => ({}));
  failOnRateLimit(body.errors);
  return { ok: res.ok, body };
}

const QUERY = `query ($zone: String!, $filter: ZoneHttpRequestsAdaptiveGroupsFilter_InputObject!) {
  viewer {
    zones(filter: { zoneTag: $zone }) {
      httpRequestsAdaptiveGroups(filter: $filter, limit: 10000, orderBy: [count_DESC]) {
        count
        dimensions { userAgent edgeResponseStatus clientRequestPath }
      }
    }
  }
}`;

/** 퍼센트 인코딩된 한글 경로를 읽을 수 있게. 깨진 인코딩이면 그대로 */
function readable(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/** KST 날짜 문자열 (UTC ms 기준) */
const kstDate = (ms) => new Date(ms + KST_MS).toISOString().slice(0, 10);

async function main() {
  const days = parseDays(process.argv.slice(2));
  const { token, from } = loadToken();
  console.log(`토큰: ${from}`);

  const zoneRes = await cf(token, `/zones?name=${ZONE_NAME}`);
  const zone = zoneRes.body.result?.[0]?.id;
  if (!zone) {
    console.error(`zone 조회 실패: ${JSON.stringify(zoneRes.body.errors ?? zoneRes.body)}`);
    process.exit(1);
  }

  // KST 날짜별 창. 오늘은 지금 시각까지만(진행 중).
  const now = Date.now();
  const todayKst = kstDate(now);
  const todayStart = Date.parse(`${todayKst}T00:00:00+09:00`);
  const windows = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = todayStart - i * DAY_MS;
    windows.push({ day: kstDate(start), start, end: Math.min(start + DAY_MS, now) });
  }
  console.log(`zone: ${ZONE_NAME}  기간: ${windows[0].day} ~ ${todayKst} (KST ${days}일, 오늘은 진행 중)`);
  console.log('숫자는 Cloudflare 적응형 표본 추정치(count). 정확한 건수는 D1 bot_hits.\n');

  // KST 하루씩 묻는다. 한도(budget)는 쿼리 횟수보다 한 번에 훑는 기간에 크게 깎인다 —
  // 7일·21일을 한 번에 물으면 첫 쿼리에서 바로 'budget depleted' 가 났고, 하루씩 6번은 통과했다(2026-11-08).
  const rows = []; // { day, bot, status, path, count }
  for (const w of windows) {
    const filter = {
      datetime_geq: new Date(w.start).toISOString(),
      datetime_lt: new Date(w.end).toISOString(),
      OR: UA_LIKE.map((s) => ({ userAgent_like: `%${s}%` })),
    };
    const { body } = await cf(token, '/graphql', {
      method: 'POST',
      body: JSON.stringify({ query: QUERY, variables: { zone, filter } }),
    });
    if (body.errors?.length) {
      console.error(`${w.day} 조회 실패: ${body.errors.map((e) => e.message).join(' / ')}`);
      if (/authentication|not authorized|permission/i.test(JSON.stringify(body.errors))) {
        console.error('토큰 권한 부족 — Analytics:Read 가 있는 CF_API_TOKEN 으로 다시 실행.');
      }
      process.exit(1);
    }
    const groups = body.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
    if (groups.length >= 10000) console.warn(`${w.day}: 10000 묶음 한도에 걸렸다 — 이 날 숫자는 덜 셌을 수 있다.`);
    for (const g of groups) {
      const bot = botName(g.dimensions.userAgent);
      if (!bot) continue; // LIKE 로 걸렸지만 표에 없는 UA (예: 'Daum/' 이 들어간 다른 앱)
      rows.push({ day: w.day, bot, status: g.dimensions.edgeResponseStatus, path: g.dimensions.clientRequestPath, count: g.count });
    }
  }

  const botOrder = BOTS.map(([, name]) => name).filter((name, i, a) => a.indexOf(name) === i);
  const seen = botOrder.filter((b) => rows.some((r) => r.bot === b));
  if (seen.length === 0) {
    console.log('기간 안에 표의 봇 요청이 없다.');
    return;
  }

  // 1) 일별 요청 수 — 날짜 × 봇. 정적 자산(/_astro/ 등)까지 포함한 전체 요청.
  const sum = (list) => list.reduce((a, r) => a + r.count, 0);
  console.log('[일별 요청 수] 정적 자산 포함 전체');
  const width = seen.map((b) => Math.max(b.length, 5));
  console.log(['날짜      ', ...seen.map((b, i) => b.padStart(width[i]))].join('  '));
  for (const w of windows) {
    const cells = seen.map((b, i) => String(sum(rows.filter((r) => r.day === w.day && r.bot === b))).padStart(width[i]));
    console.log([w.day, ...cells].join('  '));
  }
  console.log(['합계      ', ...seen.map((b, i) => String(sum(rows.filter((r) => r.bot === b))).padStart(width[i]))].join('  '));

  // 2) 봇별 상태코드 분포·페이지/자산 비율·상위 경로 10개(자산 제외)
  for (const b of seen) {
    const mine = rows.filter((r) => r.bot === b);
    const byStatus = new Map();
    for (const r of mine) byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + r.count);
    const pages = mine.filter((r) => pathKind(r.path));
    console.log(`\n[${b}] 총 ${sum(mine)} · 페이지 ${sum(pages)} · 자산 ${sum(mine) - sum(pages)}`);
    console.log(`  상태코드: ${[...byStatus].sort((a, c) => c[1] - a[1]).map(([s, n]) => `${s} ${n}`).join(', ')}`);

    const byPath = new Map();
    for (const r of pages) byPath.set(r.path, (byPath.get(r.path) ?? 0) + r.count);
    const top = [...byPath].sort((a, c) => c[1] - a[1]).slice(0, 10);
    if (top.length) console.log('  상위 경로(자산 제외):');
    for (const [p, n] of top) console.log(`    ${String(n).padStart(5)}  ${pathKind(p).padEnd(12)} ${readable(p)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
