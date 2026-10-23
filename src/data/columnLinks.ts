import type { CollectionEntry } from 'astro:content';

type Column = CollectionEntry<'columns'>;

/**
 * 칼럼 목록의 정렬 — 최신순, 날짜가 같으면 id 순.
 * getCollection 은 순서를 보장하지 않아, 같은 날 발행한 칼럼(8/24 고양·송파)의 순서가 빌드마다 바뀌었다.
 * RSS·llms.txt·목록 페이지가 이 함수로 같은 순서를 쓴다.
 */
export function byNewest(a: Column, b: Column): number {
  return b.data.publishedAt.getTime() - a.data.publishedAt.getTime() || a.id.localeCompare(b.id);
}

/**
 * 지역 페이지의 '관련 칼럼' — 그 시군구를 직접 다룬 칼럼을 먼저, 남는 자리는 같은 광역 칼럼으로 채운다.
 *
 * 예전엔 정렬 없이 앞에서 3개를 잘라 빌드마다 목록이 바뀌었고(2026-10-23 확인: 시군구 17쪽),
 * 광역 slug 로 걸린 지역 무관 칼럼이 50쪽 넘게 같은 자리를 차지해 성남·서초 전용 칼럼이 밀려났다.
 */
export function relatedColumnsFor(columns: Column[], citySlug: string, regionSlug: string, limit = 3): Column[] {
  const sorted = [...columns].sort(byNewest);
  const local = sorted.filter((entry) => entry.data.relatedAreas.includes(citySlug));
  const regional = sorted.filter(
    (entry) => !entry.data.relatedAreas.includes(citySlug) && entry.data.relatedAreas.includes(regionSlug),
  );
  return [...local, ...regional].slice(0, limit);
}
