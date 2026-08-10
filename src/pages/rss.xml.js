import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site } from '../data/site';

/**
 * 칼럼 RSS 피드.
 *
 * 서치어드바이저는 사이트맵과 별개로 RSS 제출을 받는다 — 새 칼럼 발행을
 * 네이버에 알리는 채널이다. 지역 페이지 1,000여 개는 사이트맵(웨이브)이
 * 담당하고, RSS 에는 사람이 쓴 칼럼만 최신순으로 담는다.
 */
export async function GET(context) {
  const columns = await getCollection('columns', ({ data }) => !data.draft);
  const sorted = columns.sort((a, b) => b.data.publishedAt - a.data.publishedAt);

  return rss({
    title: `${site.name} 칼럼`,
    description: '유품정리 비용·절차·현장에 대해 아는 것을 그대로 적는 칼럼입니다.',
    site: context.site,
    items: sorted.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/column/${entry.id}/`,
    })),
    customData: '<language>ko</language>',
  });
}
