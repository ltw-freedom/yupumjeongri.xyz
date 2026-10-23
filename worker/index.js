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
import { handleEvent, recordConsult } from './funnel.js';

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

export default {
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
      const context = { request, env, onConsult: (page) => recordConsult(env, ctx, request, page) };
      return request.method === 'POST' ? onRequestPost(context) : onRequestGet(context);
    }

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
