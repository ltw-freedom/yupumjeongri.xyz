/**
 * 동 페이지(법정동·신도시 별칭)의 '주거 형태와 예상 견적' 블록 — 주택 구성 숫자, 문장, 예시 계산.
 *
 * 왜 있나: 동 페이지끼리 본문이 평균 72% 같았다(2026-11-08 측정, scripts/dong-similarity.mjs).
 * 동마다 다른 **실데이터**로 고유한 내용을 만든다. 지어낸 작업 사례·후기·건수는 절대 넣지 않는다(표시광고법).
 *
 * 원칙
 *  - 주택 수는 전부 cityDongHousing.ts(2025 인구주택총조사, 행정동 단위)에서, 금액은 전부 pricing.ts 에서 온다.
 *    여기서 숫자를 손으로 적지 않는다.
 *  - 통계는 행정동, 페이지는 법정동이다. 이름으로만 잇는다(아래 matchRows). 못 이으면 이 블록을 그리지 않고
 *    한 줄로 그 사실과 시군구 통계 링크만 적는다 — 시군구 숫자를 '이 동의 구성'처럼 보여 주지 않는다.
 *    이름이 같아도 경계는 다를 수 있으므로 출처 줄에 늘 그 단서를 단다.
 *  - 주거 형태별 작업 특성은 사이트에 이미 있는 사실만 쓴다:
 *      pricing.ts 계산기(엘리베이터 없음 · 3층 이상이면 사다리차),
 *      칼럼 송파 아파트 편(엘리베이터로 반출되면 추가 비용 없음, 저층 계단 반출이면 인력이 늘 수 있음),
 *      성남 계단 빌라 편(층수·물량에 따라 사다리차와 인력 중 싼 쪽, 계단 반출은 인력 1인당 단가),
 *      고양 덕양 주택 편(주택은 계단 반출·차량 접근이 변수, 마당·창고·옥상 적치물은 실내 평형에 안 잡히는 물량).
 *  - 시군구 페이지 통계 블록(cityStatsContent.ts)과 문장이 겹치지 않게, 여기서는 '이 동 vs 시군구 전체' 각도만 쓴다.
 *  - 고독사·특수청소·빈집 비용은 다루지 않는다(담당 지도상 다른 브랜드 몫).
 */

import type { DistrictCity, DistrictDong } from './districts';
import { districtCities } from './districts';
import type { DongAlias } from './dongAliases';
import { cityDongHousing, type DongHousingRow } from './cityDongHousing';
import { cityStatsSource } from './cityStats';
import { dongShortName, josa } from './districtContent';
import { estimator, pricesAsOf, unitRates, vatLabel, volumeMatrix } from './pricing';

export type HousingKind = 'apartment' | 'multiplex' | 'rowhouse' | 'detached';

/** 화면 표기 — 막대·범례·문장이 같은 이름을 쓴다 */
export const housingKindLabel: Record<HousingKind, string> = {
  apartment: '아파트',
  multiplex: '다세대',
  rowhouse: '연립',
  detached: '단독',
};
/** 막대 순서 (왼쪽부터) */
export const housingKinds: HousingKind[] = ['apartment', 'multiplex', 'rowhouse', 'detached'];
/** DongHousingRow 의 열 번호 */
const kindCol: Record<HousingKind, 2 | 3 | 4 | 5> = { detached: 2, apartment: 3, rowhouse: 4, multiplex: 5 };

export type HousingSum = {
  total: number;
  detached: number;
  apartment: number;
  rowhouse: number;
  multiplex: number;
  /** 'X'(비밀보호)·'-'(해당 없음)이라 0 으로 센 칸 — '청운효자동 아파트' 형식 */
  nullCells: string[];
};

export type DongHousing = HousingSum & {
  /** 'dong' = 이름으로 이은 행정동의 합, 'city' = 못 이음(블록을 그리지 않는다) */
  source: 'dong' | 'city';
  /** 합친 행정동 이름 (source='city' 면 빈 배열) */
  adminNames: string[];
  /**
   * 이름은 맞지만 그 행정동이 법정동의 일부만 덮는 것으로 알려진 경우(partialLegal) —
   * 문장·차트에서 '법정동 ○○동 가운데 행정동 ○○동 구역'이라고 적는다.
   */
  partial: boolean;
  /** 같은 시군구 전체 합 — 비교선 */
  city: HousingSum;
  /** 같은 행정동 자료를 함께 쓰는 다른 법정동 페이지 이름 (자기 자신·별칭 페이지 제외) */
  sharedNames: string[];
};

// ── 이름 매칭 ────────────────────────────────────────────────

/**
 * 동 이름 어간 — 숫자·'가'·'동/읍/면'을 뗀다.
 *   망원동→망원, 망원1동→망원, 종로1·2·3·4가동→종로, 을지로1가→을지로, 성수동1가→성수, 성수1가1동→성수, 청운효자동→청운효자
 * '가'는 숫자 바로 뒤에 붙은 것만 뗀다(가회동의 '가'는 이름이다).
 */
export function dongStem(name: string): string {
  let s = name.replace(/[동읍면]$/, '');
  let removedGa = false;
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(/[\d·]+가$/, () => {
      removedGa = true;
      return '';
    });
    s = s.replace(/[\d·]+$/, '');
    if (s === before) break;
  }
  // '성수동1가' 처럼 '가' 앞에 '동'이 남은 경우
  if (removedGa) s = s.replace(/동$/, '');
  return s;
}

/** 끝 글자 종류 — 읍·면은 그대로, 나머지(동·'1가' 등·별칭)는 '동'. 동·읍·면이 다르면 다른 곳이다(송산동 ≠ 송산면) */
function unitKind(name: string): '동' | '읍' | '면' {
  const last = name.slice(-1);
  return last === '읍' || last === '면' ? last : '동';
}

/**
 * 행정동 어간. 'X본동'·'X본N동'은 법정동 X동을 나눈 행정동이므로 '본'을 뗀다(망우본동→망우, 심곡본1동→심곡본 X).
 * 단, 같은 시군구에 'X본동'이라는 법정동이 따로 있으면 '본'은 이름의 일부다(부천 심곡본동·소사본동, 군포 산본동).
 */
function adminStem(name: string, legalNames: Set<string>): string {
  const m = name.match(/^(.+)본(\d*)동$/);
  if (m && !legalNames.has(`${m[1]}본동`)) return dongStem(`${m[1]}${m[2]}동`);
  return dongStem(name);
}

/**
 * 이름은 같지만 행정동이 법정동의 일부만 덮는 경우 — 행정구역 개편으로 법정동 하나가 이름이 다른 여러 행정동으로
 * 나뉜 곳. 이름만으로는 알 수 없어 확인된 곳만 적는다(2026-11-08 검수). 여기 있는 페이지는 '구역'이라고 적는다.
 *   관악 신림동 — 행정동 신림동 외에 서원·신원·서림·신사·난향·조원·대학·삼성·미성·난곡동이 법정동 신림동이다
 *   강북 미아동 — 행정동 미아동 외에 송중·송천·삼각산동 등이 법정동 미아동에 걸친다
 *   중구 신당동 — 행정동 신당동·신당5동 외에 다산·약수·청구·동화동이 법정동 신당동이다
 *   용산 용산동 — 법정동 용산동2가(행정동 용산2가동) 외 용산동1·3·5·6가가 다른 행정동에 속한다
 *   안양 비산동·관양동·평촌동·호계동 — 평촌 신도시 행정동(부흥·달안·부림·평안·귀인·범계·신촌·갈산·인덕원동)이
 *     이름이 다른 채로 이 네 법정동에 나뉘어 있다
 *   군포 산본동 — 산본 신도시 행정동(재궁·오금·수리·궁내·광정동)도 법정동 산본동이다
 */
const partialLegal: Record<string, string[]> = {
  gwanak: ['신림동'],
  gangbuk: ['미아동'],
  jung: ['신당동'],
  yongsan: ['용산동'],
  anyang: ['비산동', '관양동', '평촌동', '호계동'],
  gunpo: ['산본동'],
};

/**
 * 이름이 맞아도 빼는 행정동(명시적 제외) — { 시군구 slug: { 법정동 이름: [뺄 행정동] } }
 *   송파 잠실동 — 잠실4동(파크리오 일대)·잠실6동(장미아파트 일대)은 법정동 신천동이라 잠실동 합계에서 뺀다
 */
const excludeAdmin: Record<string, Record<string, string[]>> = {
  songpa: { 잠실동: ['잠실4동', '잠실6동'] },
};

/**
 * 법정동 이름 → 같은 시군구 행정동 행.
 *  0) excludeAdmin 에 적힌 행정동은 결과에서 뺀다
 *  1) 법정동 이름에 '숫자+동'이 있으면(상도1동) 행정동 이름이 완전히 같을 때만 매칭
 *  2) 어간과 동·읍·면 종류가 같으면 매칭 (망원동 → 망원1동·망원2동, 망우동 → 망우본동·망우3동)
 *  3) 없으면 어간 2글자 이상이 행정동 어간에 들어 있고 종류가 같으면 매칭 (청운동 → 청운효자동, 도선동 → 왕십리도선동)
 *  4) 그래도 없으면 빈 배열
 */
function matchRows(citySlug: string, rows: DongHousingRow[], legalName: string, legalNames: Set<string>): DongHousingRow[] {
  const drop = excludeAdmin[citySlug]?.[legalName] ?? [];
  return matchByName(rows, legalName, legalNames).filter((row) => !drop.includes(row[0]));
}

function matchByName(rows: DongHousingRow[], legalName: string, legalNames: Set<string>): DongHousingRow[] {
  if (/\d동$/.test(legalName)) return rows.filter((row) => row[0] === legalName);
  const stem = dongStem(legalName);
  if (!stem) return [];
  const kind = unitKind(legalName);
  const sameKind = rows.filter((row) => unitKind(row[0]) === kind);
  const exact = sameKind.filter((row) => adminStem(row[0], legalNames) === stem);
  if (exact.length > 0) return exact;
  if (stem.length < 2) return [];
  return sameKind.filter((row) => adminStem(row[0], legalNames).includes(stem));
}

function sumRows(rows: DongHousingRow[]): HousingSum {
  const sum: HousingSum = { total: 0, detached: 0, apartment: 0, rowhouse: 0, multiplex: 0, nullCells: [] };
  for (const row of rows) {
    sum.total += row[1];
    for (const kind of housingKinds) {
      const v = row[kindCol[kind]];
      if (v === null) sum.nullCells.push(`${row[0]} ${housingKindLabel[kind]}`);
      else sum[kind] += v;
    }
  }
  return sum;
}

function cityRows(dc: DistrictCity): DongHousingRow[] {
  const rows = cityDongHousing[dc.slug];
  if (!rows) throw new Error(`dongHousing: cityDongHousing 에 '${dc.slug}' 가 없습니다`);
  return rows;
}

/** 시군구별: 법정동 이름 → 매칭된 행정동 이름들 (빌드 중 1,096쪽이 반복해 쓰므로 한 번만 만든다) */
const legalMatchCache = new Map<string, Map<string, string[]>>();
function legalMatches(dc: DistrictCity): Map<string, string[]> {
  const key = `${dc.region}/${dc.slug}`;
  let m = legalMatchCache.get(key);
  if (!m) {
    const rows = cityDongHousing[dc.slug] ?? [];
    const legalNames = new Set(dc.dongs.map((d) => d.name));
    m = new Map(dc.dongs.map((d) => [d.name, matchRows(dc.slug, rows, d.name, legalNames).map((row) => row[0])]));
    // 손으로 적은 목록이 실제 페이지·매칭과 어긋나면 빌드를 멈춘다
    for (const name of [...(partialLegal[dc.slug] ?? []), ...Object.keys(excludeAdmin[dc.slug] ?? {})]) {
      if (!m.get(name)?.length) throw new Error(`dongHousing: ${dc.slug} '${name}' 은 매칭된 법정동 페이지가 아닙니다 (partialLegal·excludeAdmin 확인)`);
    }
    legalMatchCache.set(key, m);
  }
  return m;
}

const byKo = (a: string, b: string) => a.localeCompare(b, 'ko', { numeric: true });

/**
 * 동 페이지 하나의 주택 구성.
 * 별칭(신도시) 페이지는 별칭 이름의 어간과 같은 행정동을 먼저 찾고(위례동→위례동, 동탄→동탄1~9동, 광교→광교1·2동),
 * 없을 때만 alias.legalDongs 각각의 매칭을 합친다(같은 행정동은 한 번만).
 */
export function matchAdminDongs(dc: DistrictCity, unit: DistrictDong | DongAlias): DongHousing {
  const rows = cityRows(dc);
  const city = sumRows(rows);
  const legal = legalMatches(dc);
  let adminNames: string[];
  if ('legalDongs' in unit) {
    const legalNames = new Set(dc.dongs.map((d) => d.name));
    const stem = dongStem(unit.name);
    const own = rows.filter((row) => unitKind(row[0]) === '동' && adminStem(row[0], legalNames) === stem).map((row) => row[0]);
    adminNames = own.length > 0 ? own : [...new Set(unit.legalDongs.flatMap((name) => legal.get(name) ?? []))];
  } else {
    adminNames = legal.get(unit.name) ?? [];
  }
  adminNames = [...adminNames].sort(byKo);

  if (adminNames.length === 0) {
    return { ...city, source: 'city', adminNames: [], partial: false, city, sharedNames: [] };
  }
  const matched = rows.filter((row) => adminNames.includes(row[0]));
  const self = 'legalDongs' in unit ? null : unit.name;
  const sharedNames = [...legal]
    .filter(([name, admins]) => name !== self && admins.some((a) => adminNames.includes(a)))
    .map(([name]) => name);
  const partial = !('legalDongs' in unit) && (partialLegal[dc.slug] ?? []).includes(unit.name);
  return { ...sumRows(matched), source: 'dong', adminNames, partial, city, sharedNames };
}

// ── 비율 ─────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('ko-KR');
const p1 = (v: number) => `${v.toFixed(1)}%`;
/** 화면에 보이는 소수 첫째 자리 값 — 차이(%p)는 이 값끼리 뺀다 */
const r1 = (v: number) => Math.round(v * 10) / 10;
const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);

export type KindShare = {
  kind: HousingKind;
  label: string;
  count: number;
  share: number;
  /**
   * 합친 행정동의 그 유형 칸이 전부 'X'·'-' 라 값을 모른다 → 문장에서 비율로 말하지 않는다
   * (cityDongHousing.ts 규칙). 일부 칸만 비면 0 으로 센 합을 그대로 쓰고 출처 줄에 그 칸을 적는다.
   */
  unknown: boolean;
};

/** 네 유형의 비율 */
export function kindShares(sum: HousingSum): KindShare[] {
  return housingKinds.map((kind) => ({
    kind,
    label: housingKindLabel[kind],
    count: sum[kind],
    share: pct(sum[kind], sum.total),
    unknown: sum[kind] === 0 && sum.nullCells.some((cell) => cell.endsWith(` ${housingKindLabel[kind]}`)),
  }));
}

/** 네 유형 밖의 주택(비주거용 건물 안 주택 + 0 으로 센 칸) 비율 */
export function otherShare(sum: HousingSum): number {
  return Math.max(0, pct(sum.total - sum.apartment - sum.multiplex - sum.rowhouse - sum.detached, sum.total));
}

/** 비중 1위 유형 (0 으로 센 칸이 있는 유형도 센 값 그대로 비교한다 — 실제 값은 그보다 크거나 같다) */
export function topKind(sum: HousingSum): HousingKind {
  return [...kindShares(sum)].sort((a, b) => b.count - a.count)[0].kind;
}

// ── 문장 ─────────────────────────────────────────────────────

const inline = (range: string) => range.replace(/\s*~\s*/g, '~');
function rate(prefix: string): string {
  const row = unitRates.find((u) => u.item.startsWith(prefix));
  if (!row) throw new Error(`dongHousing: pricing.ts unitRates 에 '${prefix}' 행이 없습니다`);
  return inline(row.rate);
}

/** 문장 조각. link 가 있으면 문장 끝에 링크를 붙인다 */
export type Sentence = { text: string; link?: { href: string; label: string } };

/** '행정동 망원1동·망원2동' | '법정동 신림동 가운데 행정동 신림동 구역' — 문장·차트·출처 줄이 같은 표기를 쓴다 */
export function adminLabel(unit: DistrictDong | DongAlias, h: DongHousing): string {
  const names = h.adminNames.join('·');
  return h.partial ? `법정동 ${unit.name} 가운데 행정동 ${names} 구역` : `행정동 ${names}`;
}

/**
 * 블록 문장 — source='dong' 일 때만 쓴다.
 * 구성 요약 1(1위 유형의 크기에 따라 문형이 갈린다), 시군구 대비 1, 행정동 순위 0~1, 견적에 닿는 1~2.
 * 같은 데이터면 같은 문장(결정적). 난수·날짜를 쓰지 않는다.
 */
export function dongHousingSentences(dc: DistrictCity, unit: DistrictDong | DongAlias, h: DongHousing): Sentence[] {
  if (h.source !== 'dong') throw new Error('dongHousingSentences: 행정동을 잇지 못한 페이지에는 블록을 그리지 않습니다');
  const out: Sentence[] = [];
  const shares = kindShares(h);
  const sayable = shares.filter((s) => !s.unknown).sort((a, b) => b.share - a.share);
  const [first, ...rest] = sayable;
  const restList = rest.map((s) => `${s.label} ${p1(s.share)}`).join('·');
  const subject = h.partial
    ? `${adminLabel(unit, h)}의 주택 ${fmt(h.total)}호는`
    : `${josa(unit.name, '은', '는')} ${adminLabel(unit, h)} 기준 주택 ${fmt(h.total)}호 가운데`;

  // 1) 구성 요약 — 1위 비중이 80% 이상 / 50% 이상 / 그 아래에 따라 다른 사실을 말한다
  const firstIs = `${josa(first.label, '이', '가')} ${p1(first.share)}로`;
  if (rest.length === 0) {
    out.push({ text: `${subject} ${firstIs} 다른 유형은 비공개·없음입니다.` });
  } else if (first.share >= 80) {
    out.push({ text: `${subject} ${firstIs} 대부분이고, 나머지는 ${restList}입니다.` });
  } else if (first.share >= 50) {
    out.push({ text: `${subject} ${firstIs} 절반을 넘고, 이어서 ${restList}입니다.` });
  } else {
    out.push({
      text: `${subject} 가장 많은 ${first.label}도 ${p1(first.share)}로 절반에 못 미쳐, ${restList}와 섞여 있습니다.`,
    });
  }

  // 2) 시군구 대비 — 화면 표시값(소수 첫째 자리)끼리 뺀 차이가 가장 큰 유형 하나
  const cityShares = kindShares(h.city);
  const diffs = sayable
    .map((s) => ({ ...s, city: r1(cityShares.find((c) => c.kind === s.kind)!.share) }))
    .map((s) => ({ ...s, diff: r1(r1(s.share) - s.city) }))
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  const d = diffs[0];
  if (!d || Math.abs(d.diff) < 3) {
    out.push({ text: `${dc.name} 전체와 비교하면 어느 유형도 3%p 넘게 차이 나지 않습니다.` });
  } else {
    out.push({
      text: `${dc.name} 전체(${d.city.toFixed(1)}%)보다 ${d.label} 비중이 ${Math.abs(d.diff).toFixed(1)}%p ${d.diff > 0 ? '높습니다' : '낮습니다'}.`,
    });
  }

  // 2-1) 행정동별 순위 — 네 유형 칸이 모두 공개된 행정동끼리만 비교한다(비공개 칸을 0 으로 세면 순위가 부풀기 때문)
  const top = topKind(h);
  const rows = cityRows(dc);
  const complete = rows.filter((row) => row[1] > 0 && housingKinds.every((k) => row[kindCol[k]] !== null));
  const ranked = complete
    .map((row) => ({ name: row[0], total: row[1], share: pct(row[kindCol[top]] as number, row[1]) }))
    .sort((a, b) => b.share - a.share);
  const parts = h.adminNames
    .map((name) => {
      const r = ranked.find((x) => x.name === name);
      if (!r) return null;
      // 화면에 보이는 소수 첫째 자리 기준 공동 순위
      const shown = p1(r.share);
      const rank = 1 + ranked.filter((x) => p1(x.share) !== shown && x.share > r.share).length;
      const tie = ranked.some((x) => x.name !== r.name && p1(x.share) === shown);
      return { rank, text: `${r.name}(${fmt(r.total)}호) ${shown}로 ${tie ? '공동 ' : ''}${rank}위` };
    })
    .filter((x): x is { rank: number; text: string } => x !== null)
    .sort((a, b) => a.rank - b.rank)
    .map((x) => x.text);
  if (parts.length > 0 && ranked.length >= 3) {
    const shown = parts.slice(0, 6);
    const more = parts.length > shown.length ? ` 외 ${parts.length - shown.length}곳` : '';
    const scope =
      complete.length === rows.length
        ? `${dc.name} 행정동 ${rows.length}곳 가운데`
        : `${dc.name} 행정동 ${rows.length}곳 중 네 유형 칸이 모두 공개된 ${complete.length}곳 가운데`;
    out.push({
      text: `${scope} ${housingKindLabel[top]} 비중 순위는 ${shown.join(', ')}${more}입니다.`,
    });
  }

  // 3) 견적에 닿는 문장 — 비중 1위 유형으로 고르고, 사이트(칼럼·계산기)에 이미 있는 조건만 쓴다
  const ladder = estimator.ladder;
  const labor = rate('작업 인력');
  const lowRise = pct(h.multiplex + h.rowhouse, h.total);
  const apt = pct(h.apartment, h.total);
  if (top === 'apartment') {
    out.push({
      text: `아파트는 엘리베이터로 반출되면 추가 비용이 없고, 엘리베이터를 쓸 수 없어 사다리차가 필요하면 사다리차(${ladder}, ${vatLabel})가 더해집니다.`,
      link: { href: '/column/songpa-apateu-yupumjeongri/', label: '아파트 단지 유품정리 칼럼' },
    });
    if (lowRise >= 20) {
      out.push({
        text: `연립·다세대도 ${p1(lowRise)}라, 저층 계단 반출이면 사다리차 대신 인력(1인 ${labor})이 늘어날 수 있습니다.`,
      });
    }
  } else if (top === 'multiplex' || top === 'rowhouse') {
    out.push({
      text: `엘리베이터 없는 빌라는 계단 반출 인력(1인 ${labor})으로 계산하고, 층수와 물량에 따라 사다리차(${ladder})와 인력 중 싼 쪽을 견적서에 적습니다(${vatLabel}).`,
      link: { href: '/column/seongnam-yupumjeongri-gyedan-banchul/', label: '계단 빌라 반출 칼럼' },
    });
    if (apt >= 20) {
      out.push({ text: `아파트(${p1(apt)})는 엘리베이터로 반출되면 추가 비용이 없습니다.` });
    }
  } else {
    out.push({
      text: `주택은 계단 반출과 차량 접근이 변수이고, 마당·창고·옥상 적치물은 실내 평형에 안 잡히는 물량이라 폐기물(1톤 차량 1대 ${rate('폐기물 처리 (1톤')}, ${vatLabel})로 견적서에 따로 적습니다.`,
      link: { href: '/column/goyang-ilsan-deogyang-yupumjeongri/', label: '주택·다가구 반출 칼럼' },
    });
    if (lowRise >= 20) {
      out.push({
        text: `연립·다세대(${p1(lowRise)})는 계산기 기준으로 엘리베이터 없는 3층 이상이면 사다리차(${ladder})가 더해집니다.`,
      });
    }
  }
  return out;
}

/** 출처 줄 (figcaption) */
export function dongHousingSource(unit: DistrictDong | DongAlias, h: DongHousing): string {
  const base = `출처: ${cityStatsSource.org} KOSIS ${cityStatsSource.survey}(${cityStatsSource.asOf} 기준), ${adminLabel(unit, h)} 합계.`;
  const boundary = h.partial
    ? ''
    : 'legalDongs' in unit
      ? ` 행정동과 생활권은 경계가 달라 이 합계가 ${unit.name} 생활권의 범위와 꼭 같지는 않습니다.`
      : ` 행정동과 법정동은 경계가 달라 이 합계가 법정동 ${unit.name}의 범위와 꼭 같지는 않습니다.`;
  const nulls = h.nullCells.length > 0 ? ` 비공개(X)·해당 없음(-) 칸(${h.nullCells.join('·')})은 0으로 셌습니다.` : '';
  return base + boundary + nulls;
}

/** 행정동을 잇지 못한 페이지의 한 줄 — 시군구 숫자를 이 동의 숫자처럼 보여 주지 않는다 */
export function dongHousingFallback(unit: DistrictDong | DongAlias): string {
  return `${josa(unit.name, '과', '와')} 이름이 맞는 행정동 주택 통계(${cityStatsSource.survey})를 찾지 못해 이 동만의 주거 구성은 싣지 않았습니다.`;
}

// ── 예시 계산 ────────────────────────────────────────────────

export type EstimateExample = {
  heading: string;
  /** '실제 작업 사례가 아닙니다. …' — 항상 첫 줄 */
  disclaimer: string;
  /** 조건을 고른 근거 */
  basis: string;
  rows: { label: string; value: string }[];
  /** '175만 ~ 225만원' */
  range: string;
  /** 있으면 한 줄 더 (다세대·연립의 3층 이상 사다리차) */
  extra?: string;
  asOf: string;
};

/**
 * 비중 1위 유형 → 계산기 조건 하나를 예로 골라, 계산기(EstimateCalc)와 같은 식으로 계산한 예시. source='dong' 일 때만.
 * 금액은 volumeMatrix() — 계산기와 같은 식(기준 범위 하한 + 폭 × 짐의 양 구간, 5만원 반올림)을 빌드 때 돌린 값이다.
 * 단독은 pricing.ts 분류('아파트 · 주택 20평대')를 따라 apt20 행에 엘리베이터 없음 조건을 쓴다.
 */
export function dongEstimateExample(unit: DistrictDong | DongAlias, h: DongHousing): EstimateExample {
  if (h.source !== 'dong') throw new Error('dongEstimateExample: 행정동을 잇지 못한 페이지에는 예시 계산을 그리지 않습니다');
  const top = topKind(h);
  const scenario =
    top === 'apartment'
      ? { housing: 'apt20', volume: 'mid', access: 'elevator' }
      : top === 'detached'
        ? { housing: 'apt20', volume: 'mid', access: 'low' }
        : { housing: 'tworoom', volume: 'mid', access: 'low' };
  const row = volumeMatrix().find((r) => r.key === scenario.housing)!;
  const cell = row.cells.find((c) => c.key === scenario.volume)!;
  if (!cell.withinBase) throw new Error(`dongHousing: 예시 계산이 기준 범위를 벗어났습니다 (${scenario.housing}/${scenario.volume})`);
  const housing = estimator.housing.find((x) => x.key === scenario.housing)!;
  const volume = estimator.volume.find((v) => v.key === scenario.volume)!;
  const access = estimator.access.find((a) => a.key === scenario.access)!;
  const topShare = p1(pct(h[top], h.total));
  const where = h.partial ? `행정동 ${h.adminNames.join('·')} 구역` : '위 행정동 합계';

  return {
    heading: h.partial
      ? `행정동 ${h.adminNames.join('·')} 구역 주거 형태로 본 예시 계산`
      : `${dongShortName(unit.name)} 주거 형태로 본 예시 계산`,
    disclaimer: '실제 작업 사례가 아닙니다. 위 주택 구성과 공개 가격표로 계산한 예시입니다.',
    basis: `${where}에서 ${housingKindLabel[top]}(${topShare})${josa(housingKindLabel[top], '이', '가').slice(-1)} 가장 많아 그 주거 형태로 계산기 조건 하나를 예로 골랐습니다. 집 크기·짐의 양·층수에 따라 금액은 달라집니다.`,
    rows: [
      { label: '주거 형태', value: `${housing.label}${housing.detail ? ` (${housing.detail})` : ''}` },
      { label: '짐의 양', value: volume.label },
      { label: '층수 · 엘리베이터', value: access.label },
    ],
    range: cell.range,
    extra:
      top === 'multiplex' || top === 'rowhouse'
        ? `계산기에서 '엘리베이터 없음 · 3층 이상'을 고르면 사다리차(${estimator.ladder})가 더해집니다.`
        : undefined,
    asOf: `${pricesAsOf} 공개 가격표 기준, ${vatLabel}`,
  };
}

/** 빌드 점검용 — 법정동 페이지 중 행정동과 이어진 수 */
export function matchedLegalDongCount(): { matched: number; total: number } {
  let matched = 0;
  let total = 0;
  for (const dc of districtCities) {
    for (const names of legalMatches(dc).values()) {
      total++;
      if (names.length > 0) matched++;
    }
  }
  return { matched, total };
}
