/**
 * 동 페이지끼리 본문이 얼마나 같은지 잰다 — scripts/area-similarity.mjs(시군구 56쪽)와 같은 방식을
 * 동 페이지(법정동 1,090쪽 + 신도시 별칭)에 적용한다.
 *
 *   npm run build && node scripts/dong-similarity.mjs
 *   node scripts/dong-similarity.mjs --json scripts/data/dong-similarity/YYYY-MM-DD-label.json
 *   node scripts/dong-similarity.mjs --dist ../other-build/dist --groups-from scripts/data/dong-similarity/X.json
 *
 * 방식
 * - dist/area/{region}/{city}/{dong}/index.html 의 <main> 텍스트(script·style 제거, 태그 제거)
 * - 그 페이지 자신의 지역명을 지운다: 동 이름·짧은 이름(동/읍/면 뗀 것), 일반구 이름·짧은 이름,
 *   시군구 이름·짧은 이름, 광역명(서울특별시·경기도·서울·경기). 긴 이름부터 지운다.
 *   짧은 이름은 2글자 이상일 때만 지운다(dongShortName 과 같은 규칙 — '중구'→'중' 같은 한 글자는 남긴다).
 * - 공백 기준 5단어 shingle 집합의 Jaccard
 * - 쌍 선택 (1,096쪽 전 쌍 60만 개는 너무 많다)
 *   (a) 같은 시군구 안의 모든 쌍
 *   (b) 다른 시군구끼리의 쌍을 slug 순으로 나열한 뒤 고정 간격으로 3,000쌍 추출 (난수 없음 — 다시 돌려도 같은 쌍)
 * - 페이지 고유 shingle 비율: 그 페이지에만 있는 shingle 수 / 그 페이지 shingle 수 (전체 페이지 기준)
 * - 두 변형을 함께 잰다: raw(위 그대로) · digitsMasked(숫자 덩어리 '13,487'·'52.7' 를 '#' 하나로 바꾼 뒤).
 *   숫자만 다른 문장은 digitsMasked 에서 같은 문장이 된다 — 문장 자체가 얼마나 다른지 보는 지표.
 * - 그룹: 동 페이지의 주거 형태 블록이 행정동과 이어졌는지(data-housing-source="dong"|"city")로 페이지를 나누고,
 *   같은 시군구 쌍을 dd(둘 다 dong)·mx(한쪽만)·cc(둘 다 city)로 따로 집계한다.
 *   변경 전 빌드처럼 속성이 없는 dist 는 --groups-from 으로 다른 측정 JSON 의 pageGroups 를 빌려 쓴다.
 *
 * 지역명 목록은 src/data/districts.ts·dongAliases.json 에서 읽는다(빌드 결과의 title 파싱보다 안전).
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

const argValue = (flag) => {
  const i = process.argv.indexOf(flag);
  if (i < 0) return null;
  const v = process.argv[i + 1];
  if (!v || v.startsWith('--')) throw new Error(`${flag} 다음에 값을 주세요`);
  return v;
};
const DIST = join(argValue('--dist') ?? 'dist', 'area');
const groupsFrom = argValue('--groups-from');
const borrowedGroups = groupsFrom ? JSON.parse(readFileSync(groupsFrom, 'utf8')).pageGroups : null;
if (groupsFrom && !borrowedGroups) throw new Error(`${groupsFrom} 에 pageGroups 가 없습니다`);
const K = 5;
const CROSS_SAMPLE = 3000;
const REGION_NAMES = { seoul: ['서울특별시', '서울'], gyeonggi: ['경기도', '경기'] };

// ── 지역 데이터 ─────────────────────────────────────────────
function loadDistricts() {
  const src = readFileSync('src/data/districts.ts', 'utf8');
  const start = src.indexOf('export const districtCities');
  const open = src.indexOf('[', src.indexOf('=', start));
  const close = src.indexOf('\n];', open);
  return JSON.parse(src.slice(open, close + 2));
}
const cities = loadDistricts();
const aliases = JSON.parse(readFileSync('src/data/dongAliases.json', 'utf8'));

/** key region/city/dong → { cityName, gu, dongName, alias } */
const units = new Map();
for (const c of cities) {
  for (const d of c.dongs) {
    units.set(`${c.region}/${c.slug}/${d.slug}`, { city: c.name, gu: d.gu, dong: d.name, alias: false });
  }
}
for (const a of aliases) {
  const c = cities.find((x) => x.region === a.region && x.slug === a.citySlug);
  units.set(`${a.region}/${a.citySlug}/${a.slug}`, { city: c.name, gu: a.gu, dong: a.name, alias: true });
}

const shortOf = (name, suffix) => {
  const m = name.match(new RegExp(`^(.{2,})[${suffix}]$`));
  return m ? m[1] : null;
};

// ── 텍스트 ─────────────────────────────────────────────────
function decode(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
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

function namesFor(region, u) {
  const names = [u.dong, shortOf(u.dong, '동읍면'), u.city, shortOf(u.city, '시군구'), ...REGION_NAMES[region]];
  if (u.gu) names.push(u.gu, shortOf(u.gu, '구'));
  return [...new Set(names.filter(Boolean))].sort((a, b) => b.length - a.length);
}

function shinglesOf(words) {
  const shingles = new Set();
  for (let i = 0; i + K <= words.length; i++) shingles.add(words.slice(i, i + K).join(' '));
  return shingles;
}

// ── 페이지 읽기 ─────────────────────────────────────────────
const pages = [];
for (const region of readdirSync(DIST, { withFileTypes: true })) {
  if (!region.isDirectory()) continue;
  for (const city of readdirSync(join(DIST, region.name), { withFileTypes: true })) {
    if (!city.isDirectory()) continue;
    for (const dong of readdirSync(join(DIST, region.name, city.name), { withFileTypes: true })) {
      const file = join(DIST, region.name, city.name, dong.name, 'index.html');
      if (!dong.isDirectory() || !existsSync(file)) continue;
      const slug = `${region.name}/${city.name}/${dong.name}`;
      const u = units.get(slug);
      if (!u) throw new Error(`districts.ts·dongAliases.json 에 없는 동 페이지: ${slug}`);
      const html = readFileSync(file, 'utf8');
      const group = borrowedGroups ? (borrowedGroups[slug] ?? null) : (html.match(/data-housing-source="(dong|city)"/)?.[1] ?? null);
      let text = mainText(html);
      for (const n of namesFor(region.name, u)) text = text.split(n).join(' ');
      const words = text.split(/\s+/).filter(Boolean);
      const masked = text.replace(/\d[\d,.]*/g, '#').split(/\s+/).filter(Boolean);
      pages.push({ slug, city: `${region.name}/${city.name}`, alias: u.alias, group, words: words.length, rawShingles: shinglesOf(words), maskedShingles: shinglesOf(masked) });
    }
  }
}
pages.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
if (pages.length === 0) throw new Error('dist/area 에 동 페이지가 없습니다 — npm run build 먼저');

function jaccard(a, b) {
  if (a.size > b.size) [a, b] = [b, a];
  let inter = 0;
  for (const s of a) if (b.has(s)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ── 통계 ───────────────────────────────────────────────────
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
function summary(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  const r = (v) => Math.round(v * 10000) / 10000;
  return { n: s.length, mean: r(mean(s)), median: r(q(0.5)), p90: r(q(0.9)), min: r(s[0]), max: r(s[s.length - 1]) };
}


function measure(key) {
  for (const p of pages) p.shingles = p[key];
  // ── (a) 같은 시군구 안 모든 쌍 ──────────────────────────────
  const within = [];
  const perCity = new Map();
  const perPage = new Map(pages.map((p) => [p.slug, []]));
  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length && pages[j].city === pages[i].city; j++) {
      const v = jaccard(pages[i].shingles, pages[j].shingles);
      within.push(v);
      if (!perCity.has(pages[i].city)) perCity.set(pages[i].city, []);
      perCity.get(pages[i].city).push(v);
      perPage.get(pages[i].slug).push(v);
      perPage.get(pages[j].slug).push(v);
    }
  }

  // ── (b) 다른 시군구끼리 결정적 표본 ─────────────────────────
  // slug 순 정렬된 페이지에서 (i<j, 시군구 다름) 쌍을 사전순으로 번호 매기고, 고정 간격으로 고른다.
  const crossCountFrom = pages.map((p, i) => pages.length - 1 - i - pages.slice(i + 1).filter((q) => q.city === p.city).length);
  const crossTotal = crossCountFrom.reduce((a, b) => a + b, 0);
  const sampleN = Math.min(CROSS_SAMPLE, crossTotal);
  const targets = Array.from({ length: sampleN }, (_, k) => Math.floor(((k + 0.5) * crossTotal) / sampleN));
  const cross = [];
  {
    let t = 0;
    let base = 0;
    for (let i = 0; i < pages.length && t < targets.length; i++) {
      if (targets[t] >= base + crossCountFrom[i]) {
        base += crossCountFrom[i];
        continue;
      }
      let idx = base;
      for (let j = i + 1; j < pages.length && t < targets.length; j++) {
        if (pages[j].city === pages[i].city) continue;
        if (idx === targets[t]) {
          cross.push(jaccard(pages[i].shingles, pages[j].shingles));
          t++;
        }
        idx++;
      }
      base += crossCountFrom[i];
    }
  }

  // ── 페이지 고유 shingle 비율 ────────────────────────────────
  const df = new Map();
  for (const p of pages) for (const s of p.shingles) df.set(s, (df.get(s) ?? 0) + 1);
  const uniqueRatio = pages.map((p) => {
    if (p.shingles.size === 0) return 0;
    let u = 0;
    for (const s of p.shingles) if (df.get(s) === 1) u++;
    return u / p.shingles.size;
  });


  const groupPairs = { dd: [], mx: [], cc: [] };
  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length && pages[j].city === pages[i].city; j++) {
      const a = pages[i].group;
      const b = pages[j].group;
      if (!a || !b) continue;
      const g = a === 'dong' && b === 'dong' ? 'dd' : a === 'city' && b === 'city' ? 'cc' : 'mx';
      groupPairs[g].push(jaccard(pages[i].shingles, pages[j].shingles));
    }
  }
  return {
    meanShingles: Math.round(mean(pages.map((p) => p.shingles.size))),
    withinCity: summary(within),
    withinCityByGroup: Object.fromEntries(Object.entries(groupPairs).map(([g, xs]) => [g, xs.length ? summary(xs) : null])),
    crossCity: { ...summary(cross), populationPairs: crossTotal },
    uniqueShingleRatio: summary(uniqueRatio),
    pagesWithZeroUniqueShingles: uniqueRatio.filter((v) => v === 0).length,
    perCity,
    perPage,
  };
}

const raw = measure('rawShingles');
const digitsMasked = measure('maskedShingles');

let head = null;
try {
  head = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {}

const variantOut = (v) => ({
  meanShingles: v.meanShingles,
  withinCity: v.withinCity,
  withinCityByGroup: v.withinCityByGroup,
  crossCity: v.crossCity,
  uniqueShingleRatio: v.uniqueShingleRatio,
  pagesWithZeroUniqueShingles: v.pagesWithZeroUniqueShingles,
});
const sampleN = raw.crossCity.n;

const result = {
  measuredAt: new Date().toISOString(),
  gitHead: head,
  method: {
    source: 'dist/area/{region}/{city}/{dong}/index.html <main> 텍스트',
    removedNames: '동·짧은 동·일반구·짧은 일반구·시군구·짧은 시군구(짧은 이름은 2글자 이상만)·광역명',
    shingle: `${K}단어(공백 기준) 집합 Jaccard`,
    withinCity: '같은 시군구 안 모든 쌍',
    crossCity: `다른 시군구 쌍을 slug 사전순으로 번호 매겨 floor((k+0.5)·전체/${sampleN}) 번째를 추출(난수 없음)`,
    uniqueShingleRatio: '그 페이지에만 있는 shingle / 그 페이지 shingle (전체 페이지 기준)',
    digitsMasked: "지역명 제거 뒤 숫자 덩어리(/\d[\d,.]*/)를 '#' 하나로 바꾸고 같은 방식으로 잰 값",
    groups: groupsFrom
      ? `${groupsFrom} 의 pageGroups 로 나눔 — dd 둘 다 dong · mx 한쪽만 · cc 둘 다 city (같은 시군구 쌍)`
      : 'data-housing-source 속성으로 나눔 — dd 둘 다 dong · mx 한쪽만 · cc 둘 다 city (같은 시군구 쌍)',
  },
  pages: pages.length,
  aliasPages: pages.filter((p) => p.alias).length,
  groupPages: {
    dong: pages.filter((p) => p.group === 'dong').length,
    city: pages.filter((p) => p.group === 'city').length,
    none: pages.filter((p) => !p.group).length,
  },
  meanWords: Math.round(mean(pages.map((p) => p.words))),
  // raw — 이전 측정 JSON 과 같은 자리의 값
  ...variantOut(raw),
  digitsMasked: variantOut(digitsMasked),
  perCityWithinMean: Object.fromEntries(
    [...raw.perCity].map(([c, xs]) => [c, Math.round(mean(xs) * 10000) / 10000]).sort((a, b) => b[1] - a[1]),
  ),
  mostSimilarWithinCity: [...raw.perPage]
    .filter(([, xs]) => xs.length)
    .map(([slug, xs]) => ({ slug, meanWithinCity: Math.round(mean(xs) * 10000) / 10000 }))
    .sort((a, b) => b.meanWithinCity - a.meanWithinCity)
    .slice(0, 10),
  pageGroups: Object.fromEntries(pages.map((p) => [p.slug, p.group])),
};

const f = (v) => (v == null ? '-' : v.toFixed(3));
const line = (label, s) =>
  console.log(
    s
      ? `${label} pairs ${s.n} · mean ${f(s.mean)} · median ${f(s.median)} · p90 ${f(s.p90)} · min ${f(s.min)} · max ${f(s.max)}`
      : `${label} (no pairs)`,
  );
console.log(`dong pages ${result.pages} (alias ${result.aliasPages}) · HEAD ${head ?? '?'} · groups dong ${result.groupPages.dong} / city ${result.groupPages.city} / none ${result.groupPages.none}`);
console.log(`mean words ${result.meanWords}`);
for (const [name, v] of [
  ['raw', raw],
  ['digits→#', digitsMasked],
]) {
  console.log(`[${name}] mean shingles ${v.meanShingles}`);
  line('  within-city ', v.withinCity);
  for (const g of ['dd', 'mx', 'cc']) line(`    ${g}        `, v.withinCityByGroup[g]);
  line('  cross-city  ', v.crossCity);
  const u = v.uniqueShingleRatio;
  console.log(`  unique-shingle ratio · mean ${f(u.mean)} · median ${f(u.median)} · p90 ${f(u.p90)} · zero-unique pages ${v.pagesWithZeroUniqueShingles}`);
}
console.log(`  (cross-city population ${raw.crossCity.populationPairs} pairs, sampled ${sampleN})`);
console.log('most similar cities (raw within mean):');
for (const [c, v] of Object.entries(result.perCityWithinMean).slice(0, 5)) console.log(`  ${c} ${f(v)}`);

const out = argValue('--json');
if (out) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
  console.log(`saved ${out}`);
}
