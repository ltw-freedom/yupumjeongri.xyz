/**
 * 네이버 색인 조사 — 사이트맵의 URL 을 하나씩 `site:` 로 검색해 네이버 웹 영역에 색인됐는지 센다.
 *
 * 왜 필요한가: 서치어드바이저 '색인 현황' 은 로그인해야 보이고 URL 단위가 아니다. 어느 묶음(시군구·동·칼럼)이
 * 색인되고 어느 묶음이 빠지는지 알아야 사이트맵 웨이브(astro.config.mjs 의 SITEMAP_DONG_WAVE)와
 * 수집 요청 우선순위를 정할 수 있다. 2026-09-07 첫 조사(41/301)는 임시 스크립트라 남지 않았다 — 이번부터 남긴다.
 *
 * 측정 방식과 한계:
 *  - 네이버 **모바일** 웹문서 탭(m.search.naver.com, where=m_web)에 `site:yupumjeongri.xyz/경로` 를 넣고,
 *    결과 링크 중 그 경로가 **정확히** 있으면 색인으로 센다. (`site:도메인` 한 방은 27건에서 잘려 총량 측정에 못 쓴다.)
 *  - `site:` 는 **과소 집계**다 — 2026-10-06 조사에서 순위에 올라 있는 페이지도 `site:` 로는 안 나오는 경우가 있었다.
 *    그래서 "색인 아님"이 아니라 "site: 로 확인 안 됨"으로 읽고, 같은 방식의 이전 측정과 **변화**를 볼 것.
 *  - `--title` 을 주면 시군구·칼럼 페이지는 추가로 **제목 완전일치 검색**("제목" 따옴표)도 한다. site: 로 안 나오는데
 *    제목 검색엔 나오면 색인은 됐지만 site: 가 빠뜨린 것이고, 둘 다 안 나오면 미색인 또는 유사문서 제외다.
 *  - 요청 사이에 1.5초씩 쉰다. 사이트맵 300여 URL 이면 8분 안팎. 간격을 줄이지 말 것 — 차단당하면 끝까지 0건이 된다.
 *  - 비로그인·요청 PC 의 IP 기준. naver-rank.mjs 와 같은 환경에서 재면 두 결과를 같이 읽을 수 있다.
 *
 * 사용법:
 *   node scripts/naver-index.mjs             사이트맵 전체 → scripts/data/naver-index/{오늘}.json 저장 + 직전 측정과 비교
 *   node scripts/naver-index.mjs --title     시군구·칼럼은 제목 완전일치 검색까지 (약 70건 추가)
 *   node scripts/naver-index.mjs --no-save   저장하지 않고 출력만
 *   node scripts/naver-index.mjs --only area/seoul/mapo/   경로 조각이 포함된 URL 만 (빠른 확인용)
 *
 * 결과 JSON 은 커밋해서 이력으로 남긴다. 결과가 전부 "확인 안 됨"이면 차단당했거나 마크업이 바뀐 것 — ourLinks() 부터 볼 것.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';

const HOST = 'yupumjeongri.xyz';
const SITEMAP = `https://${HOST}/sitemap-0.xml`;
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';
const DELAY_MS = 1500;
const OUT_DIR = new URL('./data/naver-index/', import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (p) => p.replace(/\/+$/, '') || '/';

/** 경로 → 묶음 이름. 색인은 묶음 단위로 갈리므로 요약도 묶음 단위로 낸다. */
export function groupOf(path) {
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 0) return '홈';
  if (seg[0] === 'area') return ['지역 허브', '광역', '시군구', '동'][seg.length - 1] ?? '동';
  if (seg[0] === 'column') return seg.length === 1 ? '칼럼 목록' : '칼럼';
  if (seg[0] === 'service') return '서비스';
  return '정면';
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' } });
  return res.text();
}

/** 검색 결과 HTML 에서 우리 도메인으로 가는 링크 경로를 전부 뽑는다 (중복 제거, 끝 슬래시 무시). */
export function ourLinks(html) {
  const re = new RegExp(`href="https?://(?:www\.)?${HOST.replace('.', '\.')}(/[^"#?]*)?`, 'g');
  const out = new Set();
  for (const m of html.matchAll(re)) {
    try {
      out.add(strip(decodeURIComponent(m[1] ?? '/')));
    } catch {
      out.add(strip(m[1] ?? '/'));
    }
  }
  return [...out];
}

async function searchWeb(query) {
  return fetchText(`https://m.search.naver.com/search.naver?where=m_web&query=${encodeURIComponent(query)}`);
}

/** `site:` 조회 — 정확히 그 경로가 결과에 있으면 found, 우리 다른 페이지만 있으면 others 에 남긴다. */
async function checkSite(path) {
  const links = ourLinks(await searchWeb(`site:${HOST}${path}`));
  return { found: links.includes(strip(path)), others: links.filter((l) => l !== strip(path)).length };
}

/** 제목 완전일치 조회 — 라이브 페이지의 <title> 에서 " | 대한유품정리" 앞부분을 따옴표로 검색한다. */
async function checkTitle(path) {
  const title = (await fetchText(`https://${HOST}${path}`)).match(/<title>([^<]*)<\/title>/)?.[1]?.split(' | ')[0]?.trim();
  if (!title) return { title: null, found: null };
  await sleep(DELAY_MS);
  const links = ourLinks(await searchWeb(`"${title}"`));
  return { title, found: links.includes(strip(path)) };
}

function previousRun(today) {
  if (!existsSync(OUT_DIR)) return null;
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json') && f !== `${today}.json`).sort();
  return files.length ? JSON.parse(readFileSync(new URL(files.at(-1), OUT_DIR), 'utf-8')) : null;
}

async function main() {
  const args = process.argv.slice(2);
  const save = !args.includes('--no-save');
  const withTitle = args.includes('--title');
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());

  const paths = [...(await fetchText(SITEMAP)).matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .filter((p) => !only || p.includes(only));
  console.log(`사이트맵 ${paths.length} URL · site: 조회${withTitle ? ' + 제목 검색(시군구·칼럼)' : ''} · 약 ${Math.ceil((paths.length * DELAY_MS) / 60000)}분\n`);

  const rows = [];
  for (const path of paths) {
    const group = groupOf(path);
    const row = { path, group, ...(await checkSite(path)) };
    await sleep(DELAY_MS);
    if (withTitle && (group === '시군구' || group === '칼럼')) {
      const t = await checkTitle(path);
      row.title = t.title;
      row.titleFound = t.found;
      await sleep(DELAY_MS);
    }
    rows.push(row);
    const mark = row.found ? 'O' : row.titleFound ? 'T' : '-';
    process.stdout.write(`${mark} ${path}${row.found || row.titleFound ? '' : row.others ? `  (다른 페이지 ${row.others})` : ''}\n`);
  }

  if (rows.every((r) => !r.found && !r.others)) {
    console.error('\n우리 링크가 한 건도 안 보입니다. 차단당했거나 네이버 마크업이 바뀌었습니다 — ourLinks() 확인.');
    process.exit(1);
  }

  const prev = previousRun(today);
  const prevFound = new Set((prev?.rows ?? []).filter((r) => r.found).map((r) => r.path));
  console.log(`\n기준: ${prev ? prev.date : '(이전 측정 없음)'} → ${today}`);
  console.log('묶음별 (site: 확인 / 전체' + (withTitle ? ' · 제목 검색으로만 확인' : '') + '):');
  const groups = [...new Set(rows.map((r) => r.group))];
  for (const g of groups) {
    const rs = rows.filter((r) => r.group === g);
    const found = rs.filter((r) => r.found).length;
    const titleOnly = rs.filter((r) => !r.found && r.titleFound).length;
    const before = prev ? rs.filter((r) => prevFound.has(r.path)).length : null;
    console.log(`  ${g.padEnd(6)} ${String(found).padStart(3)} / ${String(rs.length).padStart(3)}` +
      (withTitle && (g === '시군구' || g === '칼럼') ? `   +제목만 ${titleOnly}` : '') +
      (prev ? `   (직전 ${before})` : ''));
  }
  const total = rows.filter((r) => r.found).length;
  console.log(`  합계     ${String(total).padStart(3)} / ${String(rows.length).padStart(3)}` + (prev ? `   (직전 ${prevFound.size})` : ''));

  if (prev) {
    const gained = rows.filter((r) => r.found && !prevFound.has(r.path)).map((r) => r.path);
    const lost = rows.filter((r) => !r.found && prevFound.has(r.path)).map((r) => r.path);
    if (gained.length) console.log(`\n새로 확인됨 (${gained.length}):\n  ${gained.join('\n  ')}`);
    if (lost.length) console.log(`\n사라짐 (${lost.length}):\n  ${lost.join('\n  ')}`);
  }

  if (save && !only) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(new URL(`${today}.json`, OUT_DIR), `${JSON.stringify({ date: today, withTitle, rows }, null, 1)}\n`);
    console.log(`\n저장: scripts/data/naver-index/${today}.json`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
