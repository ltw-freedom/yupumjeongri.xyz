/**
 * 네이버 순위 측정 — "{시군구} 유품정리" 56개 키워드에서 우리 페이지가 웹 영역 몇 위인지 잰다.
 *
 * 왜 필요한가: 2026-09 기준 시군구 페이지가 54개 중 29개 키워드에서 웹 영역 12위 안에 든다.
 * 이 순위는 시군구 템플릿(title·description 패턴)에서 나오므로, 템플릿을 고친 뒤나 주기적으로
 * 다시 재서 기준선과 비교해야 떨어지는 지역을 바로 잡을 수 있다. 분석 전문은 docs/seo-naver.md.
 *
 * 측정 방식:
 *  - 네이버 **모바일** 통합검색(m.search.naver.com)을 받아 웹 영역(fds-web-doc-root) 결과 순서를 센다.
 *    PC 검색(search.naver.com)은 스크립트 요청을 차단 페이지로 돌려보낸다.
 *  - 비로그인·요청 PC 의 IP 위치 기준이다. 한국 IP·로그인 상태의 실제 화면과 조금 다를 수 있으니
 *    절대 순위보다 **같은 환경에서 잰 이전 측정과의 변화**를 볼 것.
 *  - 요청 사이에 1.5초씩 쉰다 (56건 ≈ 1분 30초). 간격을 줄이지 말 것 — 차단당하면 측정 자체가 끊긴다.
 *  - 12위 밖이면 순위 null. 웹 탭 2페이지 이후는 보지 않는다.
 *
 * 사용법:
 *   node scripts/naver-rank.mjs            측정 → scripts/data/naver-rank/{오늘}.json 저장 + 직전 측정과 비교
 *   node scripts/naver-rank.mjs --no-save  저장하지 않고 결과만 출력
 *
 * 결과 파일은 커밋해서 기준선 이력으로 남긴다.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const HOST = 'yupumjeongri.xyz';
const UA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';
const DELAY_MS = 1500;
const DISTRICTS = new URL('../src/data/districts.ts', import.meta.url);
const OUT_DIR = new URL('./data/naver-rank/', import.meta.url);

/** 짧은 이름이 모호한 지역은 검색어를 따로 둔다 ("중 유품정리", "광주 유품정리" 는 다른 뜻이 된다) */
const QUERY_OVERRIDES = {
  jung: '서울 중구 유품정리',
  gwangju: '경기 광주 유품정리',
};

/** districts.ts 는 자동 생성 파일이라 배열 부분이 순수 JSON 이다 — TS 로더 없이 잘라서 읽는다 */
function readDistricts() {
  const src = readFileSync(DISTRICTS, 'utf-8');
  const start = src.indexOf('= [', src.indexOf('export const districtCities')) + 2;
  const end = src.indexOf('\n];', start) + 2;
  return JSON.parse(src.slice(start, end)).map(({ region, slug, name }) => ({ region, slug, name }));
}

export function queryFor(city) {
  return QUERY_OVERRIDES[city.slug] ?? `${city.name.replace(/[구시군]$/, '')} 유품정리`;
}

/**
 * 모바일 SERP HTML 에서 웹 영역 결과를 순서대로 뽑는다.
 * 네이버 마크업이 바뀌면 여기가 먼저 깨진다 — 결과가 0건이면 이 함수부터 볼 것.
 */
export function parseWebSection(html) {
  return html
    .split('fds-web-doc-root')
    .slice(1)
    .map((block) => {
      const href = block.slice(0, 8000).match(/href="(https?:\/\/[^"]+)"/)?.[1];
      try {
        const url = new URL(href.replace(/&amp;/g, '&'));
        return `${url.hostname}${decodeURIComponent(url.pathname)}`;
      } catch {
        return '?';
      }
    });
}

export function rankOf(results) {
  const i = results.findIndex((r) => r.startsWith(`${HOST}/`));
  return i < 0 ? { rank: null, url: null } : { rank: i + 1, url: results[i].slice(HOST.length) };
}

async function measure(city) {
  const query = queryFor(city);
  const res = await fetch(`https://m.search.naver.com/search.naver?query=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
  });
  const results = parseWebSection(await res.text());
  return { slug: city.slug, name: city.name, query, ...rankOf(results), top: results[0] ?? null, total: results.length };
}

function previousRun(today) {
  if (!existsSync(OUT_DIR)) return null;
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.json') && f !== `${today}.json`).sort();
  return files.length ? JSON.parse(readFileSync(new URL(files.at(-1), OUT_DIR), 'utf-8')) : null;
}

const fmt = (rank) => (rank == null ? '-' : String(rank));

async function main() {
  const save = !process.argv.includes('--no-save');
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
  const cities = readDistricts();

  const rows = [];
  for (const city of cities) {
    rows.push(await measure(city));
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  if (rows.every((r) => r.total === 0)) {
    console.error('웹 영역 결과가 전부 0건입니다. 차단당했거나 네이버 마크업이 바뀌었습니다 — parseWebSection() 확인.');
    process.exit(1);
  }

  const prev = previousRun(today);
  const prevBySlug = new Map((prev?.rows ?? []).map((r) => [r.slug, r]));
  console.log(`기준: ${prev ? prev.date : '(이전 측정 없음)'} → ${today}\n`);
  for (const r of rows) {
    const before = prevBySlug.get(r.slug)?.rank ?? null;
    const moved = before === r.rank ? '' : `  (${fmt(before)} → ${fmt(r.rank)})`;
    console.log(`${r.name.padEnd(6)} ${fmt(r.rank).padStart(2)}위  ${r.url ?? `1위: ${r.top ?? '-'}`}${moved}`);
  }
  const ranked = rows.filter((r) => r.rank != null);
  console.log(`\n12위 안: ${ranked.length}/${rows.length}  ·  1위 ${ranked.filter((r) => r.rank === 1).length}  ·  3위 안 ${ranked.filter((r) => r.rank <= 3).length}`);

  if (save) {
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(new URL(`${today}.json`, OUT_DIR), `${JSON.stringify({ date: today, rows }, null, 1)}\n`);
    console.log(`저장: scripts/data/naver-rank/${today}.json`);
  }
}

// 직접 실행할 때만 측정한다 — import 하면 파싱 함수만 쓸 수 있다
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
