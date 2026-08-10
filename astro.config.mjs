// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://yupumjeongri.xyz',
  // /area/seoul/gangnam/ 형태로 통일 (Django의 APPEND_SLASH 와 같은 감각)
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      // noindex 인 페이지를 사이트맵에 넣으면 신호가 어긋난다.
      filter: (page) => !page.includes('/consult/done/'),
    }),
  ],
});
