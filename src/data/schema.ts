import { site, absoluteUrl } from './site';

/**
 * 구조화 데이터는 "많이 넣는 것"이 아니라 "페이지 내용과 일치하는 것"이 중요하다.
 * 실제로 그 페이지에 없는 정보는 넣지 말 것.
 */

export function localBusiness(areaServed: string[] = [...site.areaServed]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': absoluteUrl('/#business'),
    name: site.name,
    url: site.url,
    description: site.description,
    slogan: site.slogan,
    areaServed,
    // 전화 상담을 운영하지 않으므로 telephone 은 넣지 않는다.
    // 대신 접수 창구를 명시해 둔다.
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: absoluteUrl(site.consultPath),
      availableLanguage: 'Korean',
      areaServed: 'KR',
    },
    // priceRange 는 /cost/ 에 실제 범위를 공개한 뒤에 추가한다.
    // 페이지에 없는 값을 구조화 데이터에만 넣으면 불일치가 된다.
  };
}

/** 사이트 전체를 나타내는 WebSite 스키마 — 홈에서만 한 번 노출한다 */
export function webSite() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absoluteUrl('/#website'),
    name: site.name,
    url: site.url,
    description: site.description,
    inLanguage: 'ko',
    publisher: { '@id': absoluteUrl('/#business') },
  };
}

export function serviceSchema(options: {
  name: string;
  description: string;
  path: string;
  areaServed?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: options.name,
    description: options.description,
    url: absoluteUrl(options.path),
    serviceType: options.name,
    provider: { '@id': absoluteUrl('/#business') },
    areaServed: options.areaServed ?? [...site.areaServed],
  };
}

export function faqSchema(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
