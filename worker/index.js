/**
 * Cloudflare Worker 진입점 — Workers(정적 자산 + 라우트) 배포용.
 *
 * 이 사이트는 Pages 가 아니라 Worker(yupumjeongri-xyz)로 서빙된다.
 * Pages Functions 규약(functions/api/consult.js)은 Worker 에서 자동으로 잡히지
 * 않으므로, 여기서 해당 핸들러를 가져와 /api/consult 에 직접 연결한다.
 * 그 외 모든 요청은 정적 자산(dist/)으로 넘긴다.
 *
 * 배포: npx wrangler deploy  (설정은 루트 wrangler.jsonc)
 */
import { onRequestPost, onRequestGet } from '../functions/api/consult.js';
import { handleEvent, kstDay, recordConsult, recordConsultFail, summarizeDay } from './funnel.js';
import { checkWebhook, writeFunnelDay, writeLead } from './hubstats.js';
import { logBot } from './botlog.js';
import { servePhoto } from './photos.js';

const CANONICAL_HOST = 'yupumjeongri.xyz';

/** 끝 슬래시 없는 페이지 주소인가 — 마지막 조각에 점이 있으면 파일(robots.txt, og-image.png …), /api/ 는 제외 */
function needsSlash(pathname) {
  const last = pathname.split('/').pop();
  return !pathname.endsWith('/') && !last.includes('.') && !pathname.startsWith('/api/');
}

/**
 * 경로 정리 — 관례 주소 /sitemap.xml 은 실제 사이트맵 색인으로, 끝 슬래시 없는 페이지 주소엔 슬래시를.
 * 바꿀 게 없으면 null. 호스트 리다이렉트와 같은 응답에서 쓰여 리다이렉트가 두 번 이어지지 않는다.
 */
function canonicalPath(pathname) {
  if (pathname === '/sitemap.xml') return '/sitemap-index.xml';
  return needsSlash(pathname) ? `${pathname}/` : null;
}

/** 리다이렉트 코드 — POST(상담 폼·깔때기 비콘)는 308 이어야 본문이 유지된다. 301 이면 브라우저가 GET 으로 바꿔 접수가 사라진다 */
const movedCode = (request) => (request.method === 'GET' || request.method === 'HEAD' ? 301 : 308);

/** 로컬 개발 주소 — wrangler dev */
const isLocalHost = (hostname) =>
  ['localhost', '127.0.0.1', '[::1]'].includes(hostname) || hostname.endsWith('.localhost');

/** 요청 하나의 실제 처리 — 리다이렉트·API·정적 자산. 봇 집계는 아래 export default 가 감싼다 */
const site = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // apex(https) 가 아닌 요청은 전부 apex 로 301 — canonical 이 https://yupumjeongri.xyz 라 신호를 한 곳으로 모은다.
    //  - www: Worker 라우트로만 붙여 두고 여기서 보낸다 (2026-09-07 이전엔 Worker 가 없어 522 가 났다).
    //  - http → https.
    //  - workers.dev 기본 주소: 사이트 전체를 200 으로 내주고 있었다(2026-10-23 확인). 두 호스트에 같은 문서가 있으면 중복이다.
    // 끝 슬래시가 빠진 페이지 주소도 같은 응답에서 붙여 리다이렉트가 두 번 이어지지 않게 한다.
    const isLocal = isLocalHost(url.hostname);
    if (!isLocal && (url.hostname !== CANONICAL_HOST || url.protocol === 'http:')) {
      url.hostname = CANONICAL_HOST;
      url.protocol = 'https:';
      url.port = '';
      url.pathname = canonicalPath(url.pathname) ?? url.pathname;
      return Response.redirect(url.href, movedCode(request));
    }

    if (pathname === '/api/event') return handleEvent(request, env, ctx);

    if (pathname === '/api/consult' || pathname === '/api/consult/') {
      const context = {
        request,
        env,
        // 접수·실패·시험은 D1 깔때기(worker/funnel.js)와 허브 성적표 카운터(worker/hubstats.js) 두 곳에 건수만 센다
        onConsult: (page, photoCount, service) => {
          recordConsult(env, ctx, request, page, photoCount);
          writeLead(env, { result: 'consult', service, page, photos: photoCount });
        },
        // Slack 으로 넘기지 못한 신청 — 횟수와 까닭만
        onConsultFail: (reason, page) => {
          recordConsultFail(env, ctx, request, reason, page);
          writeLead(env, { result: 'fail', page, reason });
        },
        // 시험 접수 — Slack 상담 채널로 보내지 않았다. D1 깔때기에는 세지 않고 카운터에만 '시험'으로
        onTest: (page) => writeLead(env, { result: 'test', page }),
      };
      return request.method === 'POST' ? onRequestPost(context) : onRequestGet(context);
    }

    // 상담 폼 현장 사진 열람 — 이 주소는 Slack 상담 메시지에만 실린다. JPEG·PNG 는 image 블록이라 Slack 이 이 주소에서 사진을
    // 불러와 메시지에 보여 준다. 30일 뒤 KV 에서 저절로 지워진다(worker/photos.js)
    if (pathname.startsWith('/api/photo/')) return servePhoto(request, env, pathname);

    // 끝 슬래시 없는 페이지 주소(/cost)는 정적 자산 기본 동작이 307(임시)로 보낸다.
    // 사이트 정책(trailingSlash: 'always')에 맞춰 여기서 먼저 301(영구)로 보낸다. /sitemap.xml 도 여기서.
    // 마지막 조각에 점이 있으면 파일(robots.txt, og-image.png …)이므로 건드리지 않는다.
    const fixedPath = canonicalPath(pathname);
    if (fixedPath) {
      url.pathname = fixedPath;
      return Response.redirect(url.href, movedCode(request));
    }

    const response = await env.ASSETS.fetch(request);
    // 빌드 산출물(/_astro/*)은 파일 이름에 내용 해시가 있어 1년 캐시해도 된다. 단 200 일 때만 —
    // _headers 로 걸면 404 까지 1년 캐시돼, 배포 직후 옛 해시를 찾는 탭이 스타일 없이 굳는다(2026-10-23 검토).
    if (pathname.startsWith('/_astro/') && response.status === 200) {
      const cached = new Response(response.body, response);
      cached.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return cached;
    }
    return response;
  },
};

export default {
  // 응답 갈래(리다이렉트 301/308·API·정적 자산·404)마다 넣지 않고, 최종 응답 한 곳에서 봇 방문을 센다.
  // logBot 은 던지지 않고 INSERT 를 waitUntil 로 미루므로 응답 내용·속도는 그대로다.
  async fetch(request, env, ctx) {
    const response = await site.fetch(request, env, ctx);
    logBot(request, response, env, ctx);
    return response;
  },
  // wrangler.jsonc triggers.crons — 매일 09:00 KST. Slack 에는 아무것도 보내지 않는다(2026-11-28).
  // 어제 하루 깔때기 숫자를 허브 성적표 카운터에 넘기고, 상담 웹훅이 살아 있는지 메시지 없이 점검한다(worker/hubstats.js).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      Promise.all([
        env.FUNNEL_DB ? summarizeDay(env, kstDay(-1)).then((day) => writeFunnelDay(env, day)) : null,
        checkWebhook(env),
      ]).catch((err) => console.error('매일 집계·웹훅 점검 실패', err)),
    );
  },
};
