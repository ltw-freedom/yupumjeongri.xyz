/**
 * 시군구 페이지끼리 본문이 얼마나 같은지 잰다 (docs/seo-naver.md 4-2·4-5 의 측정 방식).
 *
 *   npm run build && node scripts/area-similarity.mjs
 *
 * dist/area/{region}/{city}/index.html 56쪽의 <main> 텍스트에서 지역명(시군구 이름·짧은 이름·광역명)을
 * 지운 뒤, 공백 기준 5단어 shingle 집합의 Jaccard 를 모든 쌍에 대해 구해 평균·분포를 출력한다.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist/area';
const K = 5;

function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function mainText(html) {
  const m = html.match(/<main[\s\S]*?<\/main>/);
  if (!m) throw new Error('no <main>');
  return decode(
    m[0]
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

/** title "마포구유품정리 · 마포 유품정리 비용·견적 | …" → ['마포구', '마포'] */
function cityNames(html) {
  const t = html.match(/<title>([^<]+)<\/title>/)[1];
  const m = t.match(/^(.+?)유품정리 · (.+?) 유품정리/);
  return [m[1], m[2]];
}

const pages = [];
for (const region of readdirSync(DIST, { withFileTypes: true })) {
  if (!region.isDirectory()) continue;
  for (const city of readdirSync(join(DIST, region.name), { withFileTypes: true })) {
    const file = join(DIST, region.name, city.name, 'index.html');
    if (!city.isDirectory() || !existsSync(file)) continue;
    const html = readFileSync(file, 'utf8');
    let text = mainText(html);
    // 긴 이름부터 지워야 '마포구'가 '마포'+'구'로 남지 않는다
    const names = [...cityNames(html), '서울특별시', '경기도', '서울', '경기'].sort((a, b) => b.length - a.length);
    for (const n of names) text = text.split(n).join(' ');
    const words = text.split(/\s+/).filter(Boolean);
    const shingles = new Set();
    for (let i = 0; i + K <= words.length; i++) shingles.add(words.slice(i, i + K).join(' '));
    pages.push({ slug: `${region.name}/${city.name}`, words: words.length, shingles });
  }
}

function jaccard(a, b) {
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  return inter / (a.size + b.size - inter);
}

const perPage = new Map(pages.map((p) => [p.slug, []]));
const all = [];
for (let i = 0; i < pages.length; i++) {
  for (let j = i + 1; j < pages.length; j++) {
    const v = jaccard(pages[i].shingles, pages[j].shingles);
    all.push(v);
    perPage.get(pages[i].slug).push(v);
    perPage.get(pages[j].slug).push(v);
  }
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
all.sort((a, b) => a - b);
const pct = (p) => all[Math.min(all.length - 1, Math.floor(p * all.length))];
console.log(`pages ${pages.length} · pairs ${all.length}`);
console.log(`mean Jaccard ${mean(all).toFixed(3)} · median ${pct(0.5).toFixed(3)} · min ${all[0].toFixed(3)} · max ${all[all.length - 1].toFixed(3)}`);
console.log(`mean words ${Math.round(mean(pages.map((p) => p.words)))}`);
const ranked = [...perPage].map(([slug, xs]) => [slug, mean(xs)]).sort((a, b) => b[1] - a[1]);
console.log('most similar to the rest:');
for (const [slug, v] of ranked.slice(0, 5)) console.log(`  ${slug} ${v.toFixed(3)}`);
console.log('least similar:');
for (const [slug, v] of ranked.slice(-3)) console.log(`  ${slug} ${v.toFixed(3)}`);
