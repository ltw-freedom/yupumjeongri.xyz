import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const columns = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/columns' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    /** 이 글과 연결할 지역 slug (region 또는 city). 내부 링크 그래프를 만드는 용도 */
    relatedAreas: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { columns };
