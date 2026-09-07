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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    // www 는 Worker 커스텀 도메인으로만 붙여 두고 여기서 apex 로 301 보낸다.
    // (2026-09-07 이전엔 www 에 DNS 만 있고 Worker 가 없어 522 가 났다.)
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.href, 301);
    }

    if (pathname === '/api/consult' || pathname === '/api/consult/') {
      const context = { request, env };
      return request.method === 'POST' ? onRequestPost(context) : onRequestGet(context);
    }

    return env.ASSETS.fetch(request);
  },
};
