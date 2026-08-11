import { site, absoluteUrl } from './site';
import { offerablePrices, priceBounds } from './pricing';

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
    // /cost/ 에 공개한 기준 가격표에서 그대로 뽑아 쓴다 (pricing.ts).
    // 표기를 바꾸면 여기도 같이 바뀌므로 페이지와 어긋날 일이 없다.
    priceRange: `${(priceBounds.low / 10_000).toLocaleString('ko-KR')}만원~${(priceBounds.high / 10_000).toLocaleString('ko-KR')}만원`,
    currenciesAccepted: 'KRW',
  };
}

/**
 * 기준 가격표(PriceTable)의 AggregateOffer.
 *
 * **PriceTable 을 실제로 렌더하는 페이지에서만 붙일 것.** 지금은 /cost/ 와
 * 지역(시·군·구, 읍·면·동) 페이지가 그렇다. 표가 없는 페이지에 이것만 넣으면
 * 구조화 데이터와 본문이 어긋난다.
 *
 * 단가표(unitRates)는 넣지 않는다 — 견적서를 구성하는 항목일 뿐
 * 단독으로 구매하는 상품이 아니라서 Offer 로 표현하면 실제와 어긋난다.
 *
 * @param path Offer 가 가리킬 페이지. 그 표가 실제로 있는 URL 을 넘긴다.
 */
export function aggregateOffer(path: string) {
  const url = absoluteUrl(path);
  return {
    '@type': 'AggregateOffer',
    priceCurrency: 'KRW',
    lowPrice: priceBounds.low,
    highPrice: priceBounds.high,
    offerCount: offerablePrices.length,
    offers: offerablePrices.map((row) => ({
      '@type': 'Offer',
      name: row.type,
      description: row.note,
      url,
      priceCurrency: 'KRW',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: 'KRW',
        minPrice: row.minPrice,
        // 상한이 없는 구간('250만원부터')은 maxPrice 를 아예 내보내지 않는다.
        ...(row.maxPrice === undefined ? {} : { maxPrice: row.maxPrice }),
        // valueAddedTaxIncluded 는 페이지에 부가세 별도 여부가 명시되기 전까지 넣지 않는다.
      },
    })),
  };
}

/** /cost/ 전용 — 기준 가격표를 Service + AggregateOffer 로 내보낸다 */
export function priceOffers() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: '유품정리',
    serviceType: '유품정리',
    description: '주거 형태별 기준 가격을 공개하고, 그 범위 안에서 견적을 냅니다.',
    url: absoluteUrl('/cost/'),
    provider: { '@id': absoluteUrl('/#business') },
    areaServed: [...site.areaServed],
    offers: aggregateOffer('/cost/'),
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
  /**
   * 이 페이지가 기준 가격표(PriceTable)를 렌더하면 true.
   * 지역 페이지처럼 표가 그대로 실려 있는 곳에서만 켤 것 — 자세한 이유는 aggregateOffer().
   */
  withPrices?: boolean;
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
    ...(options.withPrices ? { offers: aggregateOffer(options.path) } : {}),
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
