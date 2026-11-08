/**
 * 검색·AI 봇 실제 방문 — 일별 집계(D1 bot_hits). 콘솔(서치어드바이저·Search Console) 없이
 * "네이버 Yeti 가 오긴 오는가, 어느 페이지를 긁는가"를 보려고 둔다.
 *
 * 봇은 JS 를 실행하지 않거나 비콘을 거르므로(funnel.js BOT_RE) events 표엔 안 잡힌다. 그래서 Worker 응답 단계에서 센다.
 * 저장하는 것: KST 날짜·봇 이름·Cloudflare 검증 분류·경로 종류·상태코드·횟수. IP·전체 UA·실제 경로·쿼리스트링은 남기지 않는다.
 * 스키마는 migrations/0002_bot_hits.sql. 테이블이 아직 없어도 INSERT 실패를 삼키므로 응답은 그대로 나간다.
 *
 * 숫자를 직접 보려면:
 *   npx wrangler d1 execute yupumjeongri-funnel --remote --command "SELECT day, bot, SUM(hits) FROM bot_hits GROUP BY 1, 2 ORDER BY 1 DESC, 3 DESC"
 * 같은 봇의 Cloudflare 쪽 표본 집계는 scripts/bot-crawl.mjs.
 */
import { kstDay } from './funnel.js';

/**
 * UA 정규식 → 이름. 위에서부터 처음 맞는 것 하나만 쓴다.
 * 이름이 서로 겹치지 않게 골랐지만, 더 구체적인 것(…-User, …-SearchBot)을 앞에 둬 순서가 바뀌어도 안전하게 했다.
 * scripts/bot-crawl.mjs 도 이 표를 그대로 import 한다 — 두 측정이 같은 기준으로 묶이게.
 */
export const BOTS = [
  [/Yeti\//i, 'Yeti'], // 네이버
  // 다음(카카오) 수집기는 예전 Daumoa, 지금은 'Daum/4.1' 로 온다. 둘 다 같은 이름으로 묶는다.
  [/Daumoa|\bDaum\/\d/i, 'Daumoa'],
  [/Google-InspectionTool/i, 'Google-InspectionTool'],
  [/GoogleOther/i, 'GoogleOther'],
  [/Googlebot/i, 'Googlebot'],
  [/bingbot/i, 'bingbot'],
  [/OAI-SearchBot/i, 'OAI-SearchBot'],
  [/ChatGPT-User/i, 'ChatGPT-User'],
  [/GPTBot/i, 'GPTBot'],
  [/Perplexity-User/i, 'Perplexity-User'],
  [/PerplexityBot/i, 'PerplexityBot'],
  [/Claude-SearchBot/i, 'Claude-SearchBot'],
  [/Claude-User/i, 'Claude-User'],
  [/ClaudeBot/i, 'ClaudeBot'],
  [/Applebot/i, 'Applebot'],
];

/** UA 에서 봇 이름. 표에 없으면 null */
export function botName(ua) {
  if (!ua) return null;
  for (const [re, name] of BOTS) if (re.test(ua)) return name;
  return null;
}

// 정적 자산 — 봇이 페이지를 읽는지가 관심사라 이미지·스타일·스크립트·폰트는 세지 않는다.
const ASSET_RE = /\.(?:png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|map|woff2?|ttf|otf|eot)$/i;

// 첫 경로 조각 → 종류. 지역(area)은 깊이로 나눠 따로 본다.
const SECTION = { cost: 'cost', faq: 'faq', process: 'process', service: 'service', consult: 'consult', column: 'column' };
const AREA_DEPTH = ['area-hub', 'area-sido', 'area-sigungu', 'area-dong'];

/** 경로 → kind. 기록하지 않을 경로면 null */
export function pathKind(pathname) {
  // robots·sitemap·llms 는 확장자가 있어도 크롤러가 사이트를 어떻게 훑는지 보여 주므로 먼저 잡는다.
  if (pathname === '/robots.txt') return 'robots';
  if (/^\/sitemap(?:-index|-\d+)?\.xml$/.test(pathname)) return 'sitemap';
  if (pathname === '/llms.txt' || pathname === '/llms-full.txt') return 'llms';
  if (pathname === '/rss.xml') return 'rss';
  if (pathname.startsWith('/_astro/') || pathname.startsWith('/cdn-cgi/') || ASSET_RE.test(pathname)) return null;
  if (pathname === '/') return 'home';

  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'area') return AREA_DEPTH[parts.length - 1] ?? 'other';
  return SECTION[parts[0]] ?? 'other';
}

/**
 * 최종 응답을 돌려주기 직전에 부른다. 무엇이 실패해도 던지지 않고, 응답을 기다리게 하지도 않는다
 * (INSERT 는 ctx.waitUntil 로 응답 뒤에 돈다).
 */
export function logBot(request, response, env, ctx) {
  try {
    const bot = botName(request.headers.get('User-Agent'));
    if (!bot || !env.FUNNEL_DB || !ctx?.waitUntil) return;
    const kind = pathKind(new URL(request.url).pathname);
    if (!kind) return;
    const verified = String(request.cf?.verifiedBotCategory || '').slice(0, 60);

    const write = async () => {
      await env.FUNNEL_DB.prepare(
        'INSERT INTO bot_hits (day, bot, verified, kind, status, hits) VALUES (?, ?, ?, ?, ?, 1) ' +
          'ON CONFLICT(day, bot, verified, kind, status) DO UPDATE SET hits = hits + 1',
      )
        .bind(kstDay(), bot, verified, kind, response.status)
        .run();
    };
    // 실패(테이블 미적용 포함)는 조용히 삼킨다 — 봇 요청마다 오류 로그가 쌓이지 않게.
    ctx.waitUntil(write().catch(() => {}));
  } catch {
    // 측정이 응답을 깨뜨리면 안 된다.
  }
}
