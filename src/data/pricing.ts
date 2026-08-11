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

/** 주거 형태별 기준 가격 */
export const basePrices: PriceRow[] = [
  {
    type: '원룸 · 오피스텔 (10평 이하)',
    range: '40만 ~ 90만원',
    note: '짐이 적어 1톤 이내로 끝나면 30만원대에 마무리되기도 합니다.',
    minPrice: 400_000,
    maxPrice: 900_000,
  },
  {
    type: '투룸 (15평 안팎)',
    range: '90만 ~ 160만원',
    note: '폐기물 양과 엘리베이터 유무에 따라 범위 안에서 달라집니다.',
    minPrice: 900_000,
    maxPrice: 1_600_000,
  },
  {
    type: '아파트 · 주택 20평대',
    range: '150만 ~ 250만원',
    note: '살림 규모가 크면 차량과 인력이 추가됩니다.',
    minPrice: 1_500_000,
    maxPrice: 2_500_000,
  },
  {
    type: '아파트 · 주택 30평 이상',
    range: '250만원부터',
    note: '물량 편차가 커서 방문 확인 후 확정 견적으로 안내드립니다.',
    minPrice: 2_500_000,
  },
  {
    type: '고독사 특수청소 포함',
    range: '위 금액 + 80만 ~ 200만원',
    note: '오염 범위, 소독 횟수, 자재 철거 여부에 따라 달라집니다.',
    minPrice: 800_000,
    maxPrice: 2_000_000,
    additive: true,
  },
  {
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
