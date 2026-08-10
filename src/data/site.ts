export const site = {
  name: '유품정리연구소',
  url: 'https://yupumjeongri.xyz',
  title: '유품정리연구소 | 유품정리 · 고독사 정리 · 빈집 정리',
  description:
    '유품정리, 고독사 현장 정리, 빈집 정리를 정중하게 진행합니다. 현장 확인부터 유품 분류, 보관품 선별, 폐기, 공간 정돈까지 한 번에 도와드립니다.',
  tel: '1533-1422',
  telHref: 'tel:1533-1422',
  areaServed: ['서울', '경기'],

  // 상담 접수는 기존 비워도(Django) 쪽에서 처리한다.
  // TODO: 실제 상담 폼/엔드포인트 주소로 교체할 것.
  consultUrl: 'https://biwodo.com/',
} as const;

/** canonical / og:url 등에 쓰는 절대 URL 생성기 */
export function absoluteUrl(pathname: string): string {
  return new URL(pathname, site.url).href;
}
