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
    telephone: site.tel,
    description: site.description,
    areaServed,
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
