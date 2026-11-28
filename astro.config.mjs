// @ts-check
import { readFileSync, readdirSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkGfm from 'remark-gfm';
// 비칼럼 페이지의 실제 내용 변경일 — 규칙은 그 파일 머리 주석 (빌드 날짜 자동 주입 금지)
import { lookupContentDate } from './src/data/contentDates.ts';
// 동 페이지 색인 기준 — 실제 작업 기록이 있는 동만 ([dong].astro 의 noindex 와 같은 기준)
import { dongCases } from './src/data/dongCases.ts';

/**
 * 동 페이지 사이트맵 — 2026-11-15 부터 동 페이지는 noindex, follow 다 (docs/seo-naver.md 4-15).
 *
 * 예전에는 웨이브(wave1 221쪽 → 'all')로 단계 발행했지만, 네이버(10/30 노출 −93%, 색인 112 → 50)·구글(색인 574 · 3개월 노출 45)이
 * 동 1,096쪽 지역명 치환 템플릿을 포함한 사이트 전체를 낮게 본 것으로 판단해 동 페이지를 색인에서 뺐다.
 * noindex 페이지를 사이트맵에 넣으면 신호가 어긋나므로, 사이트맵에는 noindex 가 아닌 동(= dongCases.ts 에 운영자가 확인한
 * 실제 작업 기록이 있는 동)만 넣는다. src/data/sitemap-wave1.json 은 이력으로만 남긴다.
 */
const indexableDongs = new Set(dongCases.map((c) => `/area/${c.region}/${c.city}/${c.dong}/`));
/**
 * 칼럼 사이트맵 lastmod — frontmatter 의 updatedAt(없으면 publishedAt). Bing 은 lastmod 로 재수집 순서를 정한다.
 * 칼럼만 넣는다: 날짜가 실제로 기록된 문서는 칼럼뿐이고, 빌드 날짜를 전 페이지에 찍는 건 가짜 신선도다.
 */
const columnsDir = new URL('./src/content/columns/', import.meta.url);
/** @type {Map<string, string>} 칼럼 경로 → YYYY-MM-DD */
const columnLastmod = new Map();
/** 공개(draft 아님) 칼럼의 발행일 — /column/ 목록과 홈 '최근 칼럼' 블록의 lastmod 계산에 쓴다 */
const livePublishedDates = [];
for (const file of readdirSync(columnsDir).filter((name) => name.endsWith('.md'))) {
  const text = readFileSync(new URL(file, columnsDir), 'utf-8');
  const updated = text.match(/^updatedAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  const published = text.match(/^publishedAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  const date = updated ?? published;
  if (date) columnLastmod.set(`/column/${file.replace(/\.md$/, '')}/`, date);
  if (published && !/^draft:\s*true/m.test(text)) livePublishedDates.push(published);
}
/**
 * 새 칼럼이 공개된 가장 늦은 날 — /column/ 목록(제목·설명 카드)과 홈 '최근 칼럼' 블록은 새 칼럼이 붙을 때 바뀐다.
 * 칼럼 날짜에서 나온 값이라 빌드 날짜 주입이 아니다(contentDates.ts 머리 규칙). 홈은 index.astro 의 updated 와 같은 계산.
 */
const latestColumnPublished = livePublishedDates.sort().at(-1);
/** @param {string} pathname */
function listingLastmod(pathname) {
  if (pathname === '/column/') return latestColumnPublished;
  if (pathname === '/') return [lookupContentDate('/'), latestColumnPublished].filter(Boolean).sort().at(-1);
  return undefined;
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
        // 동 페이지는 실제 작업 기록이 있어 색인 대상인 것만 (위 indexableDongs 설명)
        return indexableDongs.has(pathname);
      },
      serialize: (item) => {
        const pathname = new URL(item.url).pathname;
        // 칼럼은 frontmatter, 나머지는 contentDates.ts 의 수동 지도. 둘 다 없으면(동 페이지 등) lastmod 를 붙이지 않는다.
        const lastmod = columnLastmod.get(pathname) ?? listingLastmod(pathname) ?? lookupContentDate(pathname);
        return lastmod ? { ...item, lastmod } : item;
      },
    }),
  ],
});
