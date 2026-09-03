/**
 * 법정동 데이터 생성기.
 *
 * 입력:
 *  - scripts/data/bjd-seoul-gyeonggi.csv
 *      국토교통부 법정동코드 전체자료(data.go.kr/data/15123287)에서
 *      서울·경기의 "존재" 상태 읍면동 단위까지만 남긴 것 (리 제외, UTF-8)
 *  - scripts/data/seoul_dong_slug.json · gyeonggi_dong_slug.json
 *      유품정리연구소(C:/dev/yupumjeongri)에서 사람이 검수한 slug 맵.
 *      여기 있으면 그 값을 쓰고, 없으면 자동 로마자 변환으로 폴백한다.
 *
 * 출력:
 *  - src/data/districts.ts        (자동 생성 — 직접 수정 금지)
 *  - src/data/sitemap-wave1.json  (1차 사이트맵 웨이브에 넣을 동 경로 목록)
 *
 * 재생성:  node scripts/generate-districts.mjs
 *
 * '…N가' 법정동 처리 (유품정리연구소 AREA.md 1장·bjd.py 검증 규칙):
 *  - 어간이 '동'이면 합친다: 성수동1가·성수동2가 → 성수동 한 페이지.
 *    사람이 부르는 이름이 성수동이고, 검색도 그렇게 한다.
 *  - 어간이 '로/가'면 페이지를 만들지 않는다: 을지로3가·종로5가.
 *    "을지로3가 유품정리"를 검색하는 사람은 없고, '을지로동'은 없는 이름이다.
 *  - 주의: 영등포구엔 '당산동'과 '당산동1~6가'가 둘 다 있어 합치면 중복된다.
 *    순서를 지키며 중복을 제거한다.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// 로마자 변환 (Revised Romanization 근사) — 검수 slug 가 없을 때의 폴백
// ---------------------------------------------------------------------------
const CHO = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h'];
const JUNG = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i'];
// 음절 말 종성 (다음 음절과의 결합 규칙 적용 전 기본값)
const JONG = ['', 'k', 'k', 'k', 'n', 'n', 'n', 't', 'l', 'k', 'm', 'p', 'l', 'l', 'l', 'l', 'm', 'p', 'p', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 't'];
// 다음 음절이 모음(ㅇ 초성)으로 시작할 때의 연음 표기
const JONG_LIAISON = ['', 'g', 'kk', 'gs', 'n', 'nj', 'nh', 'd', 'r', 'lg', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'b', 'bs', 's', 'ss', 'ng', 'j', 'ch', 'k', 't', 'p', 'h'];

const K_GROUP = new Set(['k']);
const T_GROUP = new Set(['t']);
const P_GROUP = new Set(['p']);

function decompose(ch) {
  const code = ch.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return null;
  return { cho: Math.floor(code / 588), jung: Math.floor((code % 588) / 28), jong: code % 28 };
}

export function romanize(word) {
  const syllables = [...word].map((ch) => ({ ch, jamo: decompose(ch) }));
  let out = '';
  for (let i = 0; i < syllables.length; i++) {
    const cur = syllables[i].jamo;
    if (!cur) {
      out += syllables[i].ch; // 숫자 등 비한글 문자는 그대로 통과
      continue;
    }
    const next = syllables[i + 1]?.jamo ?? null;
    let cho = CHO[cur.cho];
    let jong = JONG[cur.jong];

    if (next) {
      const nextCho = next.cho;
      if (nextCho === 11) {
        // 연음: 목 + 아 → mog-a 식으로 종성이 다음 초성처럼 발음된다
        jong = JONG_LIAISON[cur.jong];
      } else if (nextCho === 2 || nextCho === 6) {
        // 다음 초성이 ㄴ/ㅁ — 비음화
        if (K_GROUP.has(jong)) jong = 'ng';
        else if (T_GROUP.has(jong)) jong = 'n';
        else if (P_GROUP.has(jong)) jong = 'm';
      } else if (nextCho === 5) {
        // 다음 초성이 ㄹ
        if (jong === 'l' || jong === 'n') jong = 'l'; // 신림 → sillim
        else if (K_GROUP.has(jong)) jong = 'ng'; // 독립 → dongnip
      }
    }
    out += cho + JUNG[cur.jung] + jong;

    // 다음 초성 ㄹ의 유음화·비음화 표기
    if (next && next.cho === 5) {
      const j = JONG[cur.jong];
      if (j === 'l' || j === 'n') syllables[i + 1].override = 'l'; // 선릉 → seolleung
      else if (j === 'ng' || j === 'm' || K_GROUP.has(j)) syllables[i + 1].override = 'n'; // 종로 → jongno
    }
    if (syllables[i].override) {
      // 위에서 계산한 초성 치환을 이번 음절에 적용해 다시 쓴다
      out = out.slice(0, out.length - (cho + JUNG[cur.jung] + jong).length);
      out += syllables[i].override + JUNG[cur.jung] + jong;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 시·군·구 공식 로마자 슬러그
// ---------------------------------------------------------------------------
const CITY_SLUGS = {
  종로구: 'jongno', 중구: 'jung', 용산구: 'yongsan', 성동구: 'seongdong', 광진구: 'gwangjin',
  동대문구: 'dongdaemun', 중랑구: 'jungnang', 성북구: 'seongbuk', 강북구: 'gangbuk', 도봉구: 'dobong',
  노원구: 'nowon', 은평구: 'eunpyeong', 서대문구: 'seodaemun', 마포구: 'mapo', 양천구: 'yangcheon',
  강서구: 'gangseo', 구로구: 'guro', 금천구: 'geumcheon', 영등포구: 'yeongdeungpo', 동작구: 'dongjak',
  관악구: 'gwanak', 서초구: 'seocho', 강남구: 'gangnam', 송파구: 'songpa', 강동구: 'gangdong',
  수원시: 'suwon', 성남시: 'seongnam', 의정부시: 'uijeongbu', 안양시: 'anyang', 부천시: 'bucheon',
  광명시: 'gwangmyeong', 평택시: 'pyeongtaek', 동두천시: 'dongducheon', 안산시: 'ansan', 고양시: 'goyang',
  과천시: 'gwacheon', 구리시: 'guri', 남양주시: 'namyangju', 오산시: 'osan', 시흥시: 'siheung',
  군포시: 'gunpo', 의왕시: 'uiwang', 하남시: 'hanam', 용인시: 'yongin', 파주시: 'paju',
  이천시: 'icheon', 안성시: 'anseong', 김포시: 'gimpo', 화성시: 'hwaseong', 광주시: 'gwangju',
  양주시: 'yangju', 포천시: 'pocheon', 여주시: 'yeoju', 연천군: 'yeoncheon', 가평군: 'gapyeong',
  양평군: 'yangpyeong',
};

// ---------------------------------------------------------------------------
// 유품정리연구소의 검수 slug 맵 로드
//  - 서울: 구 이름 키 ("강남구")
//  - 경기: 시 또는 "시 구" 키 ("하남시" | "수원시 장안구") — 일부 시군 미수록
// ---------------------------------------------------------------------------
function loadSlugMap(file) {
  return JSON.parse(readFileSync(join(root, 'scripts/data', file), 'utf-8')).slugs;
}
const reviewedSlugs = { ...loadSlugMap('seoul_dong_slug.json'), ...loadSlugMap('gyeonggi_dong_slug.json') };

function reviewedSlug(cityName, gu, dongName) {
  const byGuKey = gu ? reviewedSlugs[`${cityName} ${gu}`] : undefined;
  const byCityKey = reviewedSlugs[cityName];
  return byGuKey?.[dongName] ?? byCityKey?.[dongName];
}

// ---------------------------------------------------------------------------
// '…N가' 처리 — bjd.py 의 page_name 과 같은 규칙
// ---------------------------------------------------------------------------
const GA_UNIT = /^(.+?)\d+가$/;

/** 법정동 원본 이름 → 페이지가 쓸 이름. 페이지를 만들지 않는 이름이면 null */
function pageName(bjdName) {
  const m = bjdName.match(GA_UNIT);
  if (!m) return bjdName;
  const stem = m[1];
  // '동'으로 끝나는 어간만 합친다. '을지로'·'종로'는 임의로 '을지로동'을 만들면 안 된다.
  return stem.endsWith('동') ? stem : null;
}

// ---------------------------------------------------------------------------
// 동 슬러그 폴백: ○○동은 '동'을 떼고, 읍·면은 -eup / -myeon 접미사로 남긴다.
// 뗐을 때 한 글자가 되는 이름(중동 등)은 접미사까지 통째로 로마자화한다.
// ---------------------------------------------------------------------------
function fallbackSlug(name) {
  const m = name.match(/^(.{2,})([동읍면])$/);
  if (!m) return romanize(name);
  const [, base, suffix] = m;
  if (suffix === '동') return romanize(base);
  return `${romanize(base)}-${suffix === '읍' ? 'eup' : 'myeon'}`;
}

// ---------------------------------------------------------------------------
// CSV 파싱 → 구조화
// ---------------------------------------------------------------------------
const csv = readFileSync(join(root, 'scripts/data/bjd-seoul-gyeonggi.csv'), 'utf-8');
// 원본 CSV 에 "대신면 " 처럼 뒤 공백이 붙은 행이 있어 필드를 정리해서 읽는다
const rows = csv
  .trim()
  .split('\n')
  .slice(1)
  .map((line) => line.split(',').map((field) => field.trim()));

/** code 앞 5자리 → 시군구 이름 토큰 */
const sggByPrefix = new Map();
for (const [code, name] of rows) {
  if (code.slice(5) === '00000' && code.slice(2, 5) !== '000') {
    sggByPrefix.set(code.slice(0, 5), name.split(/\s+/).slice(1)); // ['수원시','장안구'] | ['평택시'] | ['송파구']
  }
}

/** cityName → { region, dongs: [{name, gu}] } — '가' 병합·제외 적용, 순서 유지 */
const cities = new Map();
let droppedGa = 0;
let mergedGa = 0;
for (const [code, name] of rows) {
  if (code.slice(8) !== '00' || code.slice(5, 8) === '000') continue; // 읍면동 단위만
  const region = code.startsWith('11') ? 'seoul' : 'gyeonggi';
  const tokens = sggByPrefix.get(code.slice(0, 5));
  if (!tokens) continue;
  const cityName = tokens[0];
  const gu = tokens[1]; // 일반구 (없으면 undefined)
  const rawName = name.split(/\s+/).pop();

  const dongName = pageName(rawName);
  if (!dongName) {
    droppedGa++; // 을지로3가 류 — 페이지 없음
    continue;
  }
  if (dongName !== rawName) mergedGa++;

  if (!cities.has(cityName)) cities.set(cityName, { region, dongs: [] });
  const list = cities.get(cityName).dongs;
  // 병합으로 생기는 중복(성수동1가+2가, 당산동+당산동N가)은 첫 등장만 남긴다
  if (!list.some((d) => d.name === dongName && d.gu === gu)) list.push({ name: dongName, gu });
}

// ---------------------------------------------------------------------------
// 슬러그 부여 (검수 slug 우선) + 시 안에서의 충돌 해소
// ---------------------------------------------------------------------------
let reviewedCount = 0;
const result = [];
for (const [cityName, { region, dongs }] of cities) {
  const citySlug = CITY_SLUGS[cityName];
  if (!citySlug) throw new Error(`시·군·구 슬러그 누락: ${cityName}`);
  const seen = new Set();
  const list = dongs.map(({ name, gu }) => {
    const reviewed = reviewedSlug(cityName, gu, name);
    if (reviewed) reviewedCount++;
    let slug = reviewed ?? fallbackSlug(name);
    if (seen.has(slug)) {
      // 같은 시 안에서 슬러그가 겹치면 (대개 다른 일반구의 동명) 구 이름으로 구분한다
      const suffix = gu ? romanize(gu.replace(/구$/, '')) : '2';
      slug = `${slug}-${suffix}`;
      if (seen.has(slug)) throw new Error(`동 슬러그 충돌 해소 실패: ${cityName} ${name}`);
    }
    seen.add(slug);
    return gu ? { slug, name, gu } : { slug, name };
  });
  result.push({ slug: citySlug, name: cityName, region, dongs: list });
}

// ---------------------------------------------------------------------------
// TypeScript 파일로 출력
// ---------------------------------------------------------------------------
const seoulCount = result.filter((c) => c.region === 'seoul').length;
const ggCount = result.filter((c) => c.region === 'gyeonggi').length;
const dongCount = result.reduce((n, c) => n + c.dongs.length, 0);

const banner = `/**
 * 자동 생성 파일 — 직접 수정하지 말 것.
 * 재생성: node scripts/generate-districts.mjs
 * 원본: 국토교통부 법정동코드 (scripts/data/bjd-seoul-gyeonggi.csv)
 *       + 유품정리연구소 검수 slug 맵 (scripts/data/*_dong_slug.json)
 *
 * 서울 ${seoulCount}개 구, 경기 ${ggCount}개 시·군, 동·읍·면 페이지 ${dongCount}개.
 * '…N가' 법정동은 어간이 동이면 병합(성수동1가→성수동), 로·가면 제외(을지로3가).
 */

export type DistrictDong = {
  slug: string;
  /** 페이지가 쓰는 동 이름 (잠실동 · 가평읍 · 성수동[1·2가 병합] …) */
  name: string;
  /** 일반구가 있는 경기 시의 소속 구 (성남시 수정구 등) */
  gu?: string;
};

export type DistrictCity = {
  slug: string;
  name: string;
  region: 'seoul' | 'gyeonggi';
  dongs: DistrictDong[];
};

`;

const body = `export const districtCities: DistrictCity[] = ${JSON.stringify(result, null, 2)};

export function getDistrictCity(region: string, slug: string): DistrictCity | undefined {
  return districtCities.find((city) => city.region === region && city.slug === slug);
}

export function getDong(city: DistrictCity, dongSlug: string): DistrictDong | undefined {
  return city.dongs.find((dong) => dong.slug === dongSlug);
}

/** 같은 시·구 안의 인접 법정동 (내부 링크용) — 목록상 앞뒤로 감싸며 뽑는다 */
export function nearbyDongs(city: DistrictCity, dongSlug: string, limit = 6): DistrictDong[] {
  const pool = city.dongs.filter((d) => d.slug !== dongSlug);
  const index = city.dongs.findIndex((d) => d.slug === dongSlug);
  if (index === -1) return pool.slice(0, limit);
  const start = Math.max(0, Math.min(index, pool.length - limit));
  return pool.slice(start, start + limit);
}
`;

writeFileSync(join(root, 'src/data/districts.ts'), banner + body, 'utf-8');

// ---------------------------------------------------------------------------
// 사이트맵 1차 웨이브 목록 (AREA.md 6장 — 웨이브 발행)
//
// 페이지는 전부 빌드되고 내부 링크로 연결되지만, 사이트맵으로 "밀어주는" 동은
// 단계적으로 늘린다. 한꺼번에 1,200개를 제출하면 색인 대기열에만 쌓이고
// 그 자체가 저품질 신호가 된다.
//
// 1차 웨이브 = 큐레이션 지역(areas.ts에 손으로 쓴 콘텐츠가 있는 시·군·구)의 동 전체.
// 확대하려면 astro.config.mjs 의 SITEMAP_DONG_WAVE 를 'all' 로 바꾼다.
// ---------------------------------------------------------------------------
const CURATED_CITY_SLUGS = ['gangnam', 'songpa', 'seocho', 'gwanak', 'mapo', 'seongnam', 'suwon', 'goyang'];
const aliases = JSON.parse(readFileSync(join(root, 'src/data/dongAliases.json'), 'utf-8'));
/**
 * 큐레이션 지역 밖이지만 생활권 이름이 곧 법정동이라 별칭 페이지를 만들지 않는 곳.
 * "평촌 유품정리"·"다산 유품정리"는 이 법정동 페이지가 받으므로 1차 웨이브에 같이 넣는다.
 * (분당·판교·일산은 큐레이션 지역인 성남·고양의 법정동이라 이미 포함된다.)
 */
const WAVE1_KEYWORD_DONGS = [
  '/area/gyeonggi/anyang/pyeongchon/', // 평촌동 — 평촌신도시
  '/area/gyeonggi/namyangju/dasan/', // 다산동 — 다산신도시
];
const wave1 = [
  // 신도시 별칭(위례·동탄·광교·수지·운정)은 검색 가치가 커서 항상 1차 웨이브에 넣는다
  ...aliases.map((alias) => `/area/${alias.region}/${alias.citySlug}/${alias.slug}/`),
  ...WAVE1_KEYWORD_DONGS,
  ...result
    .filter((city) => CURATED_CITY_SLUGS.includes(city.slug))
    .flatMap((city) => city.dongs.map((dong) => `/area/${city.region}/${city.slug}/${dong.slug}/`)),
];
writeFileSync(join(root, 'src/data/sitemap-wave1.json'), JSON.stringify(wave1, null, 2), 'utf-8');

console.log(
  `생성 완료: 서울 ${seoulCount}구 + 경기 ${ggCount}시·군, 동 페이지 ${dongCount}개 → src/data/districts.ts\n` +
    `  '가' 처리: ${droppedGa}개 제외(을지로류), ${mergedGa}개 행 병합(성수동류)\n` +
    `  검수 slug 적용: ${reviewedCount}/${dongCount}\n` +
    `  사이트맵 1차 웨이브: 동 ${wave1.length}개 → src/data/sitemap-wave1.json`,
);
