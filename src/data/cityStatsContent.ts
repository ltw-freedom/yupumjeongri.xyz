/**
 * 시·군·구 페이지의 '주택·가구 통계' 블록 — cityStats.ts 의 공공 통계를 유품정리 비용·작업 방식과 잇는 서술.
 *
 * 원칙 (docs/seo-naver.md 4-5):
 *  - 숫자는 전부 cityStats.ts(2025 인구주택총조사)에서 오거나, 그 숫자로 계산한 비율·순위·광역 평균이다.
 *  - 비용 금액은 pricing.ts 의 공개 기준을 그대로 가져온다. 여기서 새 금액을 만들지 않는다.
 *  - 지역 해석은 통계가 보여 주는 것(주택 구성·가구 구성·빈집)까지만. "이 동네는 ○○가 많다" 류의
 *    출처 없는 주장, 작업 건수, 고독사 발생 같은 말은 쓰지 않는다.
 *  - 같은 문장이 56쪽에 똑같이 깔리면 다시 유사문서가 된다. 어떤 문단이 나올지는 그 지역 숫자가 정하고,
 *    문장마다 그 지역 숫자를 넣고, 남는 연결 문장은 슬러그 해시로 여러 표현 중 하나를 고른다.
 *    `node scripts/area-similarity.mjs` 로 평균 유사도를 재고 고칠 것.
 */

import type { DistrictCity } from './districts';
import { districtCities } from './districts';
import { cityStats, cityStatsSource, type CityStats } from './cityStats';
import { cityDongHousing } from './cityDongHousing';
import { basePrices, unitRates } from './pricing';
import { josa, pick } from './districtContent';

const fmt = (n: number) => n.toLocaleString('ko-KR');
const pct = (part: number, whole: number) => (whole === 0 ? 0 : (part / whole) * 100);
const p1 = (v: number) => `${v.toFixed(1)}%`;

const price = (key: string) => basePrices.find((row) => row.key === key)!.range.replace(/^(위 금액 \+ |원룸 기준 )/, '');
const rate = (item: string) => unitRates.find((row) => row.item.startsWith(item))!.rate;

type Shares = {
  apartment: number;
  lowRise: number;
  detachedGeneral: number;
  multiHousehold: number;
  onePerson: number;
  onePerson65: number;
  vacant: number;
};

function shares(s: CityStats): Shares {
  const h = s.housing;
  return {
    apartment: pct(h.apartment, h.total),
    lowRise: pct(h.multiplex + h.rowhouse, h.total),
    detachedGeneral: pct(h.detachedGeneral, h.total),
    multiHousehold: pct(h.multiHousehold, h.total),
    onePerson: pct(s.households.onePerson, s.households.total),
    onePerson65: pct(s.households.onePerson65, s.households.total),
    vacant: pct(s.vacant.total, h.total),
  };
}

/** 광역(서울 25개 구 · 경기 31개 시군) 비율 — 소속 시군구 숫자를 모두 더해 낸다 (= 광역 총계) */
function regionShares(region: DistrictCity['region']): Shares {
  const sum: CityStats = {
    housing: { total: 0, apartment: 0, multiplex: 0, rowhouse: 0, detachedGeneral: 0, multiHousehold: 0, detachedCommercial: 0, nonResidential: 0 },
    households: { total: 0, onePerson: 0, onePerson65: 0 },
    vacant: { total: 0, apartment: 0, detached: 0, multiplex: 0 },
  };
  for (const dc of districtCities.filter((c) => c.region === region)) {
    const s = cityStats[dc.slug];
    for (const group of ['housing', 'households', 'vacant'] as const) {
      for (const [k, v] of Object.entries(s[group])) (sum[group] as Record<string, number>)[k] += v;
    }
  }
  return shares(sum);
}

/** 같은 광역 안에서 이 지표가 몇 번째로 높은가 (1 = 가장 높음) */
function rankIn(dc: DistrictCity, metric: keyof Shares): { rank: number; of: number } {
  const peers = districtCities.filter((c) => c.region === dc.region);
  const values = peers.map((c) => ({ slug: c.slug, v: shares(cityStats[c.slug])[metric] })).sort((a, b) => b.v - a.v);
  return { rank: values.findIndex((x) => x.slug === dc.slug) + 1, of: peers.length };
}

/** "가장 높은" / "3번째로 높은" / "5번째로 낮은" / "가장 낮은" */
function rankPhrase(r: { rank: number; of: number }): string {
  if (r.rank === 1) return '가장 높은';
  if (r.rank === r.of) return '가장 낮은';
  if (r.rank <= r.of / 2) return `${r.rank}번째로 높은`;
  return `${r.of - r.rank + 1}번째로 낮은`;
}

/** "평균(57.0%)보다 3.1%p 높습니다" */
function compare(local: number, avg: number): string {
  const diff = local - avg;
  if (Math.abs(diff) < 0.5) return `평균(${p1(avg)})과 비슷합니다`;
  return `평균(${p1(avg)})보다 ${Math.abs(diff).toFixed(1)}%p ${diff > 0 ? '높습니다' : '낮습니다'}`;
}

export type CityStatsRow = { label: string; count: string; share: string };
export type CityStatsDongRow = { dong: string; total: string; apt: string; low: string; det: string };

export type CityStatsBlock = {
  heading: string;
  paragraphs: string[];
  housingCaption: string;
  housingRows: CityStatsRow[];
  householdCaption: string;
  householdRows: CityStatsRow[];
  dongRows: CityStatsDongRow[];
  source: { label: string; url: string };
};

export function cityStatsBlock(dc: DistrictCity): CityStatsBlock | null {
  const s = cityStats[dc.slug];
  if (!s) return null;
  const h = s.housing;
  const g = s.households;
  const v = s.vacant;
  const local = shares(s);
  const avg = regionShares(dc.region);
  const R = dc.region === 'seoul' ? '서울' : '경기';
  const unit = dc.region === 'seoul' ? '구' : '시·군';
  const name = dc.name;
  const seed = (k: string) => `stats:${k}:${dc.slug}`;

  // --- 주택 구성: 비중이 큰 순서대로 (지역마다 순서가 달라진다) ---
  const kinds = [
    { label: '아파트', n: h.apartment, unit: '호' },
    { label: '다세대주택', n: h.multiplex, unit: '호' },
    { label: '연립주택', n: h.rowhouse, unit: '호' },
    { label: '일반 단독주택', n: h.detachedGeneral, unit: '호' },
    // 주택총조사는 다가구주택을 건물 1동 = 1호로 센다 — 표에서 '동'으로 적어 오해를 막는다
    { label: '다가구주택', n: h.multiHousehold, unit: '동' },
    { label: '영업겸용 단독주택', n: h.detachedCommercial, unit: '호' },
    { label: '비주거용 건물 내 주택', n: h.nonResidential, unit: '호' },
  ].sort((a, b) => b.n - a.n);
  const top3 = kinds.slice(0, 3).map((k) => `${k.label} ${p1(pct(k.n, h.total))}`);

  const paragraphs: string[] = [];
  paragraphs.push(
    pick(
      [
        `${cityStatsSource.survey} 기준 ${name} 주택 ${fmt(h.total)}호는 ${top3.join(', ')} 순입니다. 아파트 비중은 ${R} ${compare(local.apartment, avg.apartment)}.`,
        `${josa(name, '은', '는')} 주택이 ${fmt(h.total)}호이고(${cityStatsSource.survey}), ${top3[0]}·${top3[1]}·${top3[2]}로 나뉩니다. 아파트만 보면 ${R} ${compare(local.apartment, avg.apartment)}.`,
        `${top3[0]}, ${top3[1]}, ${top3[2]} — ${cityStatsSource.survey}에 잡힌 ${name} 주택 ${fmt(h.total)}호의 구성입니다. 아파트 비율로는 ${R} ${compare(local.apartment, avg.apartment)}.`,
      ],
      seed('intro'),
    ),
  );

  // --- 주택 구성 → 반출 동선·비용. 해당하는 것만, 그 지역 숫자를 넣어 쓴다 ---
  const cost: string[] = [];
  const lowRise = h.multiplex + h.rowhouse;
  if (local.lowRise >= 20) {
    const r = rankPhrase(rankIn(dc, 'lowRise'));
    cost.push(
      pick(
        [
          `연립·다세대 ${fmt(lowRise)}호(${p1(local.lowRise)})는 ${R} ${unit} 가운데 ${r} 비중입니다. 주택으로 쓰는 층이 4개 층 이하인 건물이라 엘리베이터 없이 계단으로 내리는 현장이 많고, 인력(1인 ${rate('작업 인력')})이 그만큼 붙습니다.`,
          `${name}에서 연립·다세대는 ${fmt(lowRise)}호, 비중 ${p1(local.lowRise)}로 ${R}에서 ${r} 편입니다. 4개 층 이하 건물이 대부분이라 계단 반출이 잦고, 계단 작업은 인력 단가(1인 ${rate('작업 인력')}) 기준으로 견적에 들어갑니다.`,
          `계단 반출이 많은 지역입니다 — 연립·다세대가 ${p1(local.lowRise)}(${fmt(lowRise)}호)로 ${R} ${unit} 중 ${r} 수준이고, 이런 건물은 층수가 4개 층 이하라 승강기가 없는 경우가 흔합니다. 인력은 1인 ${rate('작업 인력')}입니다.`,
        ],
        seed('lowrise'),
      ) + ` 엘리베이터 없는 3층 이상에서 큰 가구가 계단으로 안 내려가면 사다리차(${rate('사다리차')})를 따로 적습니다.`,
    );
  }
  if (local.apartment >= 70) {
    const tenths = Math.round(local.apartment / 10);
    cost.push(
      pick(
        [
          `아파트가 ${fmt(h.apartment)}호, 열 집 중 ${tenths}집꼴입니다. 엘리베이터 사용 예약과 관리사무소 반출 신고를 먼저 잡고, 반출 동선이 짧아 같은 평형이면 인력이 덜 드는 편입니다(20평대 ${price('apt20')}).`,
          `${p1(local.apartment)}가 아파트(${fmt(h.apartment)}호)라 ${name} 현장은 대부분 관리사무소 신고와 승강기 예약으로 시작합니다. 동선이 짧으면 20평대가 ${price('apt20')} 범위 아래쪽에서 끝나기도 합니다.`,
          `${name} 주택의 ${p1(local.apartment)}, ${fmt(h.apartment)}호가 아파트입니다. 단지마다 반출 가능 시간과 승강기 보양 규정이 달라 일정 전에 확인하고, 20평대는 ${price('apt20')} 기준입니다.`,
        ],
        seed('apt'),
      ),
    );
  }
  if (local.detachedGeneral >= 15) {
    const times = (local.detachedGeneral / avg.detachedGeneral).toFixed(1);
    cost.push(
      pick(
        [
          `일반 단독주택이 ${fmt(h.detachedGeneral)}호(${p1(local.detachedGeneral)})로 ${R} 평균(${p1(avg.detachedGeneral)})의 ${times}배입니다. 마당·창고·다락까지 정리하는 단독주택은 평형보다 폐기물 양이 견적을 정하고, 1톤 차량 한 대분이 ${rate('폐기물 처리 (1톤')}입니다.`,
          `${R} 평균의 ${times}배인 ${p1(local.detachedGeneral)}가 일반 단독주택(${fmt(h.detachedGeneral)}호)입니다. 창고·헛간·다락에서 나오는 짐이 많아 방 수보다 톤수로 계산하며, 1톤에 ${rate('폐기물 처리 (1톤')}입니다.`,
        ],
        seed('detached'),
      ),
    );
  }
  if (local.multiHousehold >= 5) {
    cost.push(
      `다가구주택 ${fmt(h.multiHousehold)}동(${p1(local.multiHousehold)})은 한 건물에 여러 세대가 사는 구조라 정리 범위가 방 한두 칸인 경우가 많고, 원룸 ${price('oneroom')}·투룸 ${price('tworoom')}에서 견적이 나옵니다.`,
    );
  }
  if (cost.length === 0) {
    cost.push(
      `아파트 ${p1(local.apartment)}, 연립·다세대 ${p1(local.lowRise)}, 단독 ${p1(local.detachedGeneral + local.multiHousehold)}로 어느 한쪽에 몰리지 않은 구성이라, ${name} 상담은 주거 형태와 층수·엘리베이터 유무를 먼저 여쭤봅니다(엘리베이터 없는 3층 이상은 사다리차 ${rate('사다리차')}).`,
    );
  }
  paragraphs.push(...cost);

  // --- 가구 구성 ---
  const oneRank = rankPhrase(rankIn(dc, 'onePerson'));
  const oldRank = rankPhrase(rankIn(dc, 'onePerson65'));
  paragraphs.push(
    pick(
      [
        `일반가구 ${fmt(g.total)}가구 중 1인 가구가 ${fmt(g.onePerson)}가구(${p1(local.onePerson)})로 ${R} ${unit} 가운데 ${oneRank} 비율입니다. 그중 ${fmt(g.onePerson65)}가구는 가구주가 65세 이상으로, 전체 가구의 ${p1(local.onePerson65)}(${R} ${oldRank} 쪽)입니다.`,
        `1인 가구 ${fmt(g.onePerson)}가구, 일반가구 ${fmt(g.total)}가구의 ${p1(local.onePerson)}입니다(${R}에서 ${oneRank} 편). 65세 이상 혼자 사는 가구는 ${fmt(g.onePerson65)}가구 — 전체의 ${p1(local.onePerson65)}로 ${R} 안에서 ${oldRank} 수준입니다.`,
        `${name} 일반가구 ${fmt(g.total)}가구 가운데 ${p1(local.onePerson)}인 ${fmt(g.onePerson)}가구가 혼자 삽니다. ${R} ${unit} 중 ${oneRank} 비율이고, 65세 이상 1인 가구는 ${fmt(g.onePerson65)}가구(${p1(local.onePerson65)}, ${oldRank} 쪽)입니다.`,
      ],
      seed('households'),
    ),
  );
  if (local.onePerson65 >= avg.onePerson65) {
    paragraphs.push(
      pick(
        [
          `65세 이상 1인 가구 비율 ${p1(local.onePerson65)}는 ${R} 평균 ${p1(avg.onePerson65)} 이상입니다. 혼자 지내시던 어르신 집은 평수가 작아도 오래 쓴 살림으로 물량이 많을 수 있어, 방 개수보다 짐의 양을 먼저 여쭙습니다.`,
          `${R} 평균(${p1(avg.onePerson65)})보다 고령 1인 가구 비율이 높은 편(${p1(local.onePerson65)})이라, 작은 집이라도 수십 년 쌓인 살림을 기준으로 물량을 봅니다 — 원룸 ${price('oneroom')}, 투룸 ${price('tworoom')}.`,
        ],
        seed('old'),
      ),
    );
  } else if (local.onePerson >= avg.onePerson) {
    paragraphs.push(
      `1인 가구 비율이 ${R} 평균(${p1(avg.onePerson)})을 넘는 만큼 원룸·오피스텔 정리(${price('oneroom')}) 비중이 큰 편이고, 특수청소가 필요한 현장은 ${price('special')}이 더해집니다.`,
    );
  }

  // --- 빈집 ---
  const vacantKinds = [
    { label: '아파트', n: v.apartment },
    { label: '단독주택', n: v.detached },
    { label: '다세대주택', n: v.multiplex },
  ].sort((a, b) => b.n - a.n);
  const vTop = vacantKinds[0];
  const vacantTail: Record<string, string> = {
    아파트: `빈 아파트는 관리사무소 반출 규정을 확인한 뒤 정리하고`,
    단독주택: `오래 빈 단독주택은 마당·창고까지 범위에 넣어 보고`,
    다세대주택: `빈 다세대는 계단 반출 층수를 먼저 확인하고`,
  };
  paragraphs.push(
    `사람이 살지 않는 주택(미거주 주택)은 ${fmt(v.total)}호, 전체의 ${p1(local.vacant)}입니다(${R} ${p1(avg.vacant)}). ` +
      `${josa(vTop.label, '이', '가')} ${fmt(vTop.n)}호로 가장 많고 ${vacantKinds[1].label} ${fmt(vacantKinds[1].n)}호가 뒤를 잇습니다. ` +
      `${vacantTail[vTop.label]}, 빈집 정리는 원룸 기준 ${price('binjip')}에서 쌓인 양에 따라 정합니다.`,
  );

  // --- 행정동별: 같은 시군구 안에서도 주택 구성이 크게 갈린다 ---
  const dongs = (cityDongHousing[dc.slug] ?? []).map(([dong, total, detached, apartment, rowhouse, multiplex]) => ({
    dong,
    total,
    apt: apartment === null ? null : pct(apartment, total),
    low: rowhouse === null && multiplex === null ? null : pct((rowhouse ?? 0) + (multiplex ?? 0), total),
    det: detached === null ? null : pct(detached, total),
  }));
  // 주택 1,000호 미만 동은 비율이 튀어 순위에서 뺀다 (표에는 남긴다)
  const ranked = dongs.filter((d) => d.total >= 1000);
  const topBy = (key: 'apt' | 'low' | 'det', exclude: string[]) =>
    ranked
      .filter((d) => d[key] !== null && !exclude.includes(d.dong))
      .sort((a, b) => (b[key] as number) - (a[key] as number))[0];
  if (ranked.length >= 3) {
    const a = topBy('apt', []);
    const l = topBy('low', [a.dong]);
    const d = topBy('det', [a.dong, l?.dong ?? '']);
    const parts = [`${a.dong}은 주택 ${fmt(a.total)}호 중 아파트가 ${p1(a.apt!)}`];
    if (l && l.low! >= 20) parts.push(`${l.dong}은 연립·다세대가 ${p1(l.low!)}`);
    if (d && d.det! >= 20) parts.push(`${d.dong}은 단독주택이 ${p1(d.det!)}`);
    // 단독주택이 많은 시·군(읍·면 지역)은 계단보다 마당·창고 물량이 먼저다
    const detTail = d && d.det! >= 20 ? ` ${d.dong}처럼 단독주택이 많은 곳은 마당·창고 짐까지 물량에 넣어 봅니다.` : '';
    const lowTail =
      l && l.low! >= 20 ? ` 같은 ${name} 안에서도 ${l.dong} 쪽은 계단 반출을, ${a.dong} 쪽은 승강기 예약을 먼저 확인합니다.` : '';
    const tail = local.detachedGeneral >= 15 ? detTail || lowTail : lowTail || detTail;
    paragraphs.push(`행정동 ${dongs.length}곳으로 나눠 보면 ${parts.join(', ')}입니다.${tail}`);
  }
  const dongRows: CityStatsDongRow[] = dongs.map((d) => ({
    dong: d.dong,
    total: fmt(d.total),
    apt: d.apt === null ? '·' : p1(d.apt),
    low: d.low === null ? '·' : p1(d.low),
    det: d.det === null ? '·' : p1(d.det),
  }));

  const housingRows: CityStatsRow[] = kinds
    .filter((k) => k.n > 0)
    .map((k) => ({ label: k.label, count: `${fmt(k.n)}${k.unit}`, share: p1(pct(k.n, h.total)) }));
  const householdRows: CityStatsRow[] = [
    { label: '1인 가구', count: `${fmt(g.onePerson)}가구`, share: p1(local.onePerson) },
    { label: '65세 이상 1인 가구', count: `${fmt(g.onePerson65)}가구`, share: p1(local.onePerson65) },
    { label: '빈집', count: `${fmt(v.total)}호`, share: `주택의 ${p1(local.vacant)}` },
  ];

  return {
    heading: `${name} 주택·가구 통계로 본 유품정리`,
    paragraphs,
    housingCaption: `${name} 주택 ${fmt(h.total)}호의 종류`,
    housingRows,
    householdCaption: `${name} 일반가구 ${fmt(g.total)}가구 · 빈집`,
    householdRows,
    dongRows,
    source: {
      label: `${cityStatsSource.org} ${cityStatsSource.survey}(${cityStatsSource.asOf} 기준)`,
      url: cityStatsSource.url,
    },
  };
}
