/**
 * 기준 가격 데이터.
 *
 * 2026년 8월, 가격을 공개하는 업체들의 자료를 조사해 그 시세 범위 안에서 정한 기준이다.
 *  - 우아한정리 공개 가격표: 유품정리 최소 35 / 평균 80 / 최대 300만원, 폐기물 1톤당 40만원~
 *  - 숨고 거래 통계(견적요청 1.8만 건): 평균 55만원, 최저 14 ~ 최고 150만원
 *  - 평형별 가격 공개 업체(대국자원환경 등): 원룸 80~120 / 투룸 120~180 / 20평대 180~250만원
 * 단가·범위를 조정할 때는 이 파일만 수정하면 된다.
 */

export type PriceRow = {
  /** 예상 비용 계산기(EstimateCalc)가 행을 찾는 키. 표기를 바꿔도 계산기가 깨지지 않게 따로 둔다. */
  key: 'oneroom' | 'tworoom' | 'apt20' | 'apt30' | 'special' | 'binjip';
  /** 주거 형태 */
  type: string;
  /** 기준 범위 — 화면에 보이는 표기는 항상 이 문자열이 담당한다 */
  range: string;
  /** 범위가 달라지는 조건 */
  note: string;
  /**
   * 구조화 데이터(Offer)용 숫자, 단위는 원.
   * range 문자열을 파싱하지 않고 따로 적는다 — 표기를 바꿔도 스키마가 깨지지 않게.
   * 둘을 고칠 때는 반드시 같이 고칠 것.
   */
  minPrice: number;
  /** 상한이 없는 구간('250만원부터')은 생략한다 */
  maxPrice?: number;
  /**
   * 단독 금액이 아니라 다른 항목에 더해지는 추가분인가.
   * true 면 Offer 로 내보내지 않는다 — '위 금액 + 80만원'을 80만원짜리 상품으로
   * 오해하게 만드는 구조화 데이터는 실제 페이지 내용과 불일치다.
   */
  additive?: boolean;
};

export type UnitRate = {
  item: string;
  rate: string;
  note: string;
};

/**
 * 가격 기준 시점 — /cost/, 지역 페이지 요약, llms.txt 에 함께 노출한다.
 * AI 답변 엔진은 날짜가 붙은 숫자를 더 잘 인용한다. 가격을 고치면 이 값도 같이 올릴 것.
 */
export const pricesAsOf = '2026년 9월';

/**
 * 부가세 — 사이트에 표기하는 모든 금액(기준 가격·단가·계산기)은 **부가세 별도**다.
 * 견적 분쟁이 가장 잦은 지점이라 금액이 나오는 곳마다 같이 적는다. 표기는 vatLabel 하나로 통일.
 * 스키마의 PriceSpecification.valueAddedTaxIncluded 도 이 값을 따른다.
 */
export const vatIncluded = false;
export const vatLabel = '부가세 별도';
export const vatNote = '표기 금액은 모두 부가세(VAT) 별도입니다.';

/** 주거 형태별 기준 가격 */
export const basePrices: PriceRow[] = [
  {
    key: 'oneroom',
    type: '원룸 · 오피스텔 (10평 이하)',
    range: '40만 ~ 90만원',
    note: '짐이 적어 1톤 이내로 끝나면 30만원대에 마무리되기도 합니다.',
    minPrice: 400_000,
    maxPrice: 900_000,
  },
  {
    key: 'tworoom',
    type: '투룸 (15평 안팎)',
    range: '90만 ~ 160만원',
    note: '폐기물 양과 엘리베이터 유무에 따라 범위 안에서 달라집니다.',
    minPrice: 900_000,
    maxPrice: 1_600_000,
  },
  {
    key: 'apt20',
    type: '아파트 · 주택 20평대',
    range: '150만 ~ 250만원',
    note: '살림 규모가 크면 차량과 인력이 추가됩니다.',
    minPrice: 1_500_000,
    maxPrice: 2_500_000,
  },
  {
    key: 'apt30',
    type: '아파트 · 주택 30평 이상',
    range: '250만원부터',
    note: '물량 편차가 커서 방문 확인 후 확정 견적으로 안내드립니다.',
    minPrice: 2_500_000,
  },
  {
    key: 'special',
    type: '고독사 특수청소 포함',
    range: '위 금액 + 80만 ~ 200만원',
    note: '오염 범위, 소독 횟수, 자재 철거 여부에 따라 달라집니다.',
    minPrice: 800_000,
    maxPrice: 2_000_000,
    additive: true,
  },
  {
    key: 'binjip',
    type: '빈집 · 쓰레기집 정리',
    range: '원룸 기준 50만 ~ 150만원',
    note: '쌓인 폐기물 양이 기준입니다. 평형보다 짐의 부피가 좌우합니다.',
    minPrice: 500_000,
    maxPrice: 1_500_000,
  },
];

/**
 * Offer 로 내보낼 수 있는 행. 추가분(additive)은 단독으로 구매할 수 있는 금액이 아니라 뺀다.
 */
export const offerablePrices: PriceRow[] = basePrices.filter((row) => !row.additive);

/**
 * 사이트 전체 가격 하한·상한 (원). LocalBusiness.priceRange 와 AggregateOffer 에 쓴다.
 * '250만원부터' 처럼 상한이 없는 행은 하한을 상한 후보로 본다 —
 * 없는 상한을 지어내는 것보다 낮게 잡는 쪽이 안전하다.
 */
export const priceBounds = {
  low: Math.min(...offerablePrices.map((row) => row.minPrice)),
  high: Math.max(...offerablePrices.map((row) => row.maxPrice ?? row.minPrice)),
};

/** 견적서를 구성하는 단가 — 견적 근거를 그대로 공개한다 */
export const unitRates: UnitRate[] = [
  {
    item: '폐기물 처리 (1톤 차량 1대)',
    rate: '40만 ~ 55만원',
    note: '생활 폐기물 기준. 가전·가구 등 품목에 따라 달라집니다.',
  },
  {
    item: '폐기물 처리 (반 차 · 0.5톤)',
    rate: '25만원 안팎',
    note: '짐이 적은 현장은 반 차 기준으로 계산합니다.',
  },
  {
    item: '작업 인력 (1인)',
    rate: '10만 ~ 15만원',
    note: '물량과 반출 동선에 따라 투입 인원이 정해집니다.',
  },
  {
    item: '사다리차',
    rate: '시간당 12만원 안팎',
    note: '엘리베이터 사용이 어려운 현장에서만 추가됩니다.',
  },
  {
    item: '소독 · 방역 (추가 시)',
    rate: '20만 ~ 30만원',
    note: '일반 유품정리에 소독을 더하는 경우의 추가분입니다.',
  },
];

/**
 * 시장 비교 — 같은 주거 형태에서 가격을 공개한 다른 업체의 범위와 우리 기준 범위.
 * 이 파일 머리의 2026년 8월 조사 자료(평형별 가격 공개 업체)를 그대로 옮긴 것이다.
 * 페이지에는 업체명을 적지 않는다 — 표시광고법상 비교 광고는 객관적 근거가 있어야 하므로
 * 조사 시점과 기준을 문장으로 함께 노출한다(marketComparisonNote).
 * 조사 자료를 갱신하면 이 표와 파일 머리 주석, basePrices 를 같이 고칠 것.
 */
export type MarketRow = {
  type: string;
  /** 가격을 공개한 다른 업체들의 범위 */
  market: string;
  /** 우리 기준 범위 — basePrices 의 range 와 반드시 같아야 한다 */
  ours: string;
};

export const marketComparison: MarketRow[] = [
  { type: '원룸 · 오피스텔', market: '80만 ~ 120만원', ours: '40만 ~ 90만원' },
  { type: '투룸', market: '120만 ~ 180만원', ours: '90만 ~ 160만원' },
  { type: '아파트 · 주택 20평대', market: '180만 ~ 250만원', ours: '150만 ~ 250만원' },
];

export const marketComparisonNote =
  '2026년 8월, 평형별 가격을 홈페이지에 공개한 유품정리 업체들의 자료를 조사한 범위입니다. 가격을 공개하지 않는 업체는 비교에서 뺐습니다. 조사 시점 이후 바뀐 값이 있을 수 있습니다. 대한유품정리 금액은 부가세 별도이며, 다른 업체 자료의 부가세 포함 여부는 업체마다 다릅니다.';

/**
 * 예상 비용 계산기(EstimateCalc) 설정.
 *
 * **새 금액을 만들지 않는다.** 계산기는 위 basePrices 범위를 "짐의 양"으로 좁혀 보여줄 뿐이고,
 * 더하는 항목도 basePrices(특수청소)·unitRates(사다리차)에 이미 공개된 값만 쓴다.
 * 그래서 계산기 결과는 언제나 공개 가격표 안에 있다 — 정찰제 약속과 어긋날 수 없다.
 *
 * 짐의 양 구간은 기준 범위 안에서의 위치(0 = 하한, 1 = 상한)다.
 * 결과는 5만원 단위로 반올림한다. 비율을 바꾸면 /cost/ 계산기 설명 문장도 같이 볼 것.
 */
export const estimator = {
  housing: (['oneroom', 'tworoom', 'apt20', 'apt30'] as const).map((key) => {
    const row = basePrices.find((r) => r.key === key)!;
    return { key, label: row.type.replace(/\s*\(.*\)$/, ''), detail: row.type.match(/\((.*)\)/)?.[1] ?? '', min: row.minPrice, max: row.maxPrice };
  }),
  volume: [
    { key: 'low', label: '적은 편', detail: '가구·가전이 몇 점 없는 집', from: 0, to: 0.5 },
    { key: 'mid', label: '보통', detail: '살던 그대로 가구·가전이 다 있는 집', from: 0.25, to: 0.75 },
    { key: 'high', label: '많은 편', detail: '베란다·창고·방 하나가 짐으로 찬 집', from: 0.5, to: 1 },
  ],
  access: [
    { key: 'elevator', label: '엘리베이터 있음', ladder: false },
    { key: 'low', label: '엘리베이터 없음 · 2층 이하', ladder: false },
    { key: 'high', label: '엘리베이터 없음 · 3층 이상', ladder: true },
  ],
  special: (() => {
    const row = basePrices.find((r) => r.key === 'special')!;
    return { min: row.minPrice, max: row.maxPrice!, range: row.range.replace(/^위 금액\s*\+\s*/, '') };
  })(),
  /** 사다리차 — 엘리베이터 없는 3층 이상에서만 안내한다 */
  ladder: unitRates.find((r) => r.item === '사다리차')!.rate,
  roundTo: 50_000,
};

/** 기준 가격 행을 키로 찾는다 */
export function priceRow(key: PriceRow['key']): PriceRow {
  return basePrices.find((r) => r.key === key)!;
}

/**
 * 비용 직답 문장 — 질문("유품정리 비용 얼마?")에 첫 문장으로 답하는 용도(AEO).
 * 지역 페이지·/cost/·llms.txt 가 같은 문장을 쓰도록 여기서 만든다.
 * @param subject 문장 주어. 예: '마포구 유품정리 비용'
 */
export function priceAnswer(subject = '유품정리 비용'): string {
  const r = (key: PriceRow['key']) => priceRow(key).range.replace(/\s*~\s*/, '~');
  return `${subject}은 ${pricesAsOf} 기준 원룸 ${r('oneroom')}, 투룸 ${r('tworoom')}, 20평대 아파트 ${r('apt20')}이며, 고독사 현장은 특수청소 ${priceRow('special').range.replace(/^위 금액\s*\+\s*/, '').replace(/\s*~\s*/, '~')}이 더해집니다(${vatLabel}).`;
}
