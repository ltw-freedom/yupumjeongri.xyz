/**
 * 동 페이지 '실제 작업 기록' — 실제로 끝난 작업만, 운영자가 사실을 확인한 것만 넣는다.
 * 지어낸 사례·후기 금지(표시광고법 기만 광고, 검색 스팸). 비어 있으면 동 페이지에 절 자체가 나오지 않는다.
 *
 * 넣을 때
 *  - date 는 작업을 마친 날(YYYY-MM-DD), priceRange 는 실제 견적서 금액 범위(부가세 별도 표기 포함)
 *  - summary 에 고인·유가족을 알아볼 수 있는 내용(이름, 건물명, 호수, 사연)을 쓰지 않는다
 *  - 고객 발언 인용·만족도·별점은 넣지 않는다
 */

export type DongCase = {
  region: 'seoul' | 'gyeonggi';
  /** districts.ts 의 시군구 slug */
  city: string;
  /** 동 페이지 slug (법정동 또는 별칭) */
  dong: string;
  /** 작업을 마친 날 YYYY-MM-DD */
  date: string;
  /** 주거 형태 — '다세대 3층(엘리베이터 없음)' 처럼 */
  housing: string;
  /** '120만~140만원(부가세 별도)' */
  priceRange: string;
  summary: string;
  confirmedBy: '운영자';
};

export const dongCases: DongCase[] = [];

export function casesFor(region: string, city: string, dong: string): DongCase[] {
  return dongCases.filter((c) => c.region === region && c.city === city && c.dong === dong);
}
