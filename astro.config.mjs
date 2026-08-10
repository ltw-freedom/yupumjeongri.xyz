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
  integrations: [sitemap()],
});
