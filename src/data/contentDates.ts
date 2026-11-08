/**
 * 비칼럼 페이지의 '실제 내용 변경일' 수동 지도.
 *
 * 읽는 곳: 사이트맵 lastmod(astro.config.mjs), WebPage.dateModified(schema.ts webPage), 화면 하단 '최종 수정' 줄.
 * 칼럼은 frontmatter updatedAt·publishedAt 이 따로 맡으므로 여기 넣지 않는다.
 *
 * 규칙 — **실제로 고칠 때만 날짜를 올린다.**
 *  - 빌드·배포 날짜를 자동으로 넣지 않는다. 배포할 때마다 전 페이지가 '오늘 수정'이 되면 가짜 신선도이고,
 *    검색엔진이 lastmod 를 믿지 않게 되면 진짜로 고친 날도 묻힌다(칼럼 lastmod 와 같은 원칙).
 *  - 날짜는 그 경로를 그리는 소스(페이지 템플릿 + 본문을 만드는 데이터 파일)의 git log 상 마지막 '본문' 변경일이다.
 *    주석·입력칸 툴팁(title 속성)·meta description 만 고친 날은 올리지 않는다 — 읽는 사람이 보는 내용이 그대로라서.
 *  - 페이지 본문을 고친 커밋에서 이 파일의 해당 줄도 같이 고친다. 잊으면 사이트맵이 옛 날짜를 그대로 낸다.
 *  - 동 페이지(/area/{광역}/{시군구}/{동}/)는 넣지 않는다. 1,000여 쪽이 같은 날짜로 한꺼번에 바뀌는 신호는 의미가 없다.
 *
 * astro.config.mjs 가 이 파일을 직접 import 한다(Astro 는 config 를 Node 로 못 읽으면 Vite 로 다시 읽어 .ts 도 풀린다).
 * 그래서 이 파일은 다른 모듈을 import 하지 않는다 — config 쪽에서 astro:content 같은 가상 모듈은 풀리지 않는다.
 */

/** 경로 → YYYY-MM-DD. 근거는 줄마다 커밋으로 적는다 */
export const contentDates: Readonly<Record<string, string>> = {
  // 2026-11-08: answer-box 가격 직답을 priceAnswerCore 로, 진행 과정 제목 정리
  '/': '2026-11-08',
  // 2026-11-08: 평수별 비용 표·계산 방법·견적 받는 법 절, FAQ 추가
  '/cost/': '2026-11-08',
  // 2026-11-08: faqs.ts 비용·견적 문답 각도 변경·추가
  '/faq/': '2026-11-08',
  // 2026-11-08: 8단계 절차·유가족이 정할 것·비용 줄·절차 FAQ (process.ts)
  '/process/': '2026-11-08',
  // 2026-11-08: title·h1 에 '견적'
  '/consult/': '2026-11-08',
  // 2026-10-23 6589f5e: 서비스 허브 본문 마지막 변경. 이후 services.ts 변경은 허브가 읽지 않는 title·description·lead 와,
  // 같은 내용으로 자리만 옮긴 steps(11/8) 뿐이다
  '/service/': '2026-10-23',
  // 2026-11-08: lead 첫 문장 정의문, 핵심 5단계/전체 8단계 구분 (services.ts)
  '/service/yupumjeongri/': '2026-11-08',
  // 2026-10-23 6589f5e: [slug].astro 템플릿·services.ts 마지막 본문 변경
  '/service/godoksa-yupumjeongri/': '2026-10-23',
  '/service/binjip-jeongri/': '2026-10-23',
  // 2026-10-23 6589f5e: 지역 허브·광역 허브 템플릿 마지막 변경
  '/area/': '2026-10-23',
  '/area/seoul/': '2026-10-23',
  '/area/gyeonggi/': '2026-10-23',
};

/**
 * 시군구 56쪽 — 공통 템플릿([region]/[city]/index.astro) 하나로 묶는다.
 * 2026-10-23 6589f5e 가 템플릿·본문 데이터(cityStatsContent·districtContent·areas)를 마지막으로 고쳤다.
 * 그 뒤 10/27 a43aaf7 은 파일럿 5곳의 meta description 만 바꿔 본문 변경이 아니므로 올리지 않았다.
 */
export const cityPagesDate = '2026-10-23';

/** /area/{광역}/{시군구}/ 3단 경로인가 (동은 4단이라 걸리지 않는다) */
export const isCityPath = (pathname: string) => /^\/area\/[^/]+\/[^/]+\/$/.test(pathname);

/** 지도에 있으면 날짜, 없으면 undefined — 사이트맵처럼 '없으면 안 붙인다'인 곳에서 쓴다 */
export function lookupContentDate(pathname: string): string | undefined {
  return contentDates[pathname] ?? (isCityPath(pathname) ? cityPagesDate : undefined);
}

/** 페이지가 '최종 수정'을 내걸 때 쓴다 — 지도에 없는 경로면 빌드를 멈춰 빈 날짜가 나가지 않게 한다 */
export function contentDate(pathname: string): string {
  const date = lookupContentDate(pathname);
  if (!date) throw new Error(`contentDates.ts 에 ${pathname} 의 내용 변경일이 없습니다`);
  return date;
}
