import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const columns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/columns' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    /** 본문을 의미 있게 고친 날짜. 없으면 publishedAt 을 그대로 쓴다 */
    updatedAt: z.coerce.date().optional(),
    /** 답변엔진용 Q&A. 본문 하단에 렌더되고 FAQPage 스키마로도 나간다 */
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    /** 이 글과 연결할 지역 slug (region 또는 city). 내부 링크 그래프를 만드는 용도 */
    relatedAreas: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { columns };
