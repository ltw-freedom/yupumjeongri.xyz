// @ts-check
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';

/**
 * 동 페이지 사이트맵 웨이브 (유품정리연구소 AREA.md 6장의 웨이브 발행 규칙).
 *
 * 동 페이지 1,000여 개는 전부 빌드되고 내부 링크로 연결되지만, 사이트맵으로
 * 검색엔진에 "밀어주는" 것은 단계적으로 한다. 신규 도메인이 한 번에 소화할 수
 * 있는 신규 URL 은 제한적이고, 색인 대기열에만 쌓이면 그 자체가 저품질 신호다.
 *
 *  - 'wave1': 큐레이션 지역의 동 + 신도시 별칭만 사이트맵에 포함 (기본)
 *  - 'all'  : 동 페이지 전부 포함 — 1차 웨이브 색인률이 80%를 넘으면 올린다
 */
const SITEMAP_DONG_WAVE = /** @type {'wave1' | 'all'} */ ('wave1');
const wave1Dongs = new Set(JSON.parse(readFileSync(new URL('./src/data/sitemap-wave1.json', import.meta.url), 'utf-8')));
/**
 * 칼럼 사이트맵 lastmod — frontmatter 의 updatedAt(없으면 publishedAt). Bing 은 lastmod 로 재수집 순서를 정한다.
 * 칼럼만 넣는다: 날짜가 실제로 기록된 문서는 칼럼뿐이고, 빌드 날짜를 전 페이지에 찍는 건 가짜 신선도다.
 */
const columnsDir = new URL('./src/content/columns/', import.meta.url);
/** @type {Map<string, string>} 칼럼 경로 → YYYY-MM-DD */
const columnLastmod = new Map();
for (const file of readdirSync(columnsDir).filter((name) => name.endsWith('.md'))) {
  const text = readFileSync(new URL(file, columnsDir), 'utf-8');
  const updated = text.match(/^updatedAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  const published = text.match(/^publishedAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  const date = updated ?? published;
  if (date) columnLastmod.set(`/column/${file.replace(/\.md$/, '')}/`, date);
}

/** /area/{region}/{city}/{dong}/ 4단 경로인가 */
const isDongPath = (/** @type {string} */ pathname) => /^\/area\/[^/]+\/[^/]+\/[^/]+\/$/.test(pathname);

// https://astro.build/config
export default defineConfig({
  site: 'https://yupumjeongri.xyz',
  // /area/seoul/gangnam/ 형태로 통일 (Django의 APPEND_SLASH 와 같은 감각)
  trailingSlash: 'always',
  server: {
    // Claude Code 프리뷰가 PORT 환경변수로 포트를 지정한다. 없으면 astro 기본값(4321).
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  build: {
    format: 'directory',
  },
  markdown: {
    // 칼럼의 금액 범위 '40만~90만원' 이 GFM 기본값(물결표 하나도 취소선)에서 <del> 로 렌더되어
    // 숫자가 지워진 것처럼 보였다(2026-10-23 발견, 칼럼 7편 13곳). 취소선은 물결표 두 개(~~)만 인정한다.
    // Astro 기본 GFM 을 끄고 같은 플러그인을 옵션과 함께 다시 붙인다.
    gfm: false,
    remarkPlugins: [[remarkGfm, { singleTilde: false }]],
  },
  integrations: [
    sitemap({
      // noindex 인 페이지를 사이트맵에 넣으면 신호가 어긋난다.
      filter: (page) => {
        if (page.includes('/consult/done/')) return false;
        const pathname = new URL(page).pathname;
        if (!isDongPath(pathname)) return true;
        // 동 페이지는 웨이브 단위로만 사이트맵에 올린다 (위 SITEMAP_DONG_WAVE 설명)
        return SITEMAP_DONG_WAVE === 'all' || wave1Dongs.has(pathname);
      },
      serialize: (item) => {
        const lastmod = columnLastmod.get(new URL(item.url).pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
