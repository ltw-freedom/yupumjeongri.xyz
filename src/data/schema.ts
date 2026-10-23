import { site, absoluteUrl } from './site';
import { offerablePrices, vatIncluded, type PriceRow } from './pricing';
import { services } from './services';

/**
 * 구조화 데이터는 "많이 넣는 것"이 아니라 "페이지 내용과 일치하는 것"이 중요하다.
 * 실제로 그 페이지에 없는 정보는 넣지 말 것.
 */

/**
 * 지역을 문자열 대신 행정구역 객체로 — '중구'·'강서구'·'광주시'처럼 다른 광역에도 있는 이름을
 * 상위 행정구역(containedInPlace)으로 구분한다. 표기는 화면(브레드크럼)과 같게 둔다.
 */
export type PlaceSpec = { name: string; city?: boolean; parent?: PlaceSpec };

export function place(spec: PlaceSpec): Record<string, unknown> {
  return {
    '@type': spec.city ? 'City' : 'AdministrativeArea',
    name: spec.name,
    ...(spec.parent ? { containedInPlace: place(spec.parent) } : {}),
  };
}

/** 사이트 공통 서비스 지역 — 서울·경기 */
const servedRegions = () => site.areaServed.map((name) => place({ name }));

/**
 * 사이트의 주체 노드(/#business).
 *
 * 2026-10-23 LocalBusiness → Organization. 구글은 LocalBusiness 에 address 를 필수로 요구하는데
 * 주소는 공개하지 않기로 했다(README '하지 않기로 한 것'). 주소 없는 LocalBusiness 1,187개가 전부
 * 구조화 데이터 오류로 읽혔다. 방문형 서비스라 영업 범위는 areaServed 로 나타낸다.
 * 전화 상담을 운영하지 않으므로 telephone 은 넣지 않고, 접수 창구(상담 폼)를 contactPoint 로 둔다.
 * priceRange 는 LocalBusiness 전용 속성이라 함께 빠졌다 — 가격은 Offer 가 담당한다.
 */
export function organization() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': absoluteUrl('/#business'),
    name: site.name,
    url: site.url,
    description: site.description,
    slogan: site.slogan,
    image: absoluteUrl('/og-image.png'),
    logo: absoluteUrl('/icon-512.png'),
    areaServed: servedRegions(),
    // 실제로 하는 서비스만 (services.ts). 페이지마다 있는 서비스 목록과 같다.
    knowsAbout: services.map((service) => service.name),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      url: absoluteUrl(site.consultPath),
      availableLanguage: 'Korean',
      areaServed: 'KR',
    },
  };
}

/** 가격 한 줄을 Offer 로 */
function offer(row: { name: string; description: string; min: number; max?: number }, url: string) {
  return {
    '@type': 'Offer',
    name: row.name,
    description: row.description,
    url,
    priceCurrency: 'KRW',
    availability: 'https://schema.org/InStock',
    priceSpecification: {
      '@type': 'PriceSpecification',
      priceCurrency: 'KRW',
      minPrice: row.min,
      // 상한이 없는 구간('250만원부터')은 maxPrice 를 아예 내보내지 않는다.
      ...(row.max === undefined ? {} : { maxPrice: row.max }),
      // 표기 금액은 전부 부가세 별도 (pricing.ts 의 vatIncluded)
      valueAddedTaxIncluded: vatIncluded,
    },
  };
}

function aggregate(rows: { name: string; description: string; min: number; max?: number }[], url: string) {
  // 상한 없는 행이 하나라도 있으면 highPrice 를 내보내지 않는다 — 30평 이상 '250만원부터'가 있는데
  // highPrice 250만원을 내면 '최대 250만원'으로 읽힌다(2026-10-23 수정).
  const openEnded = rows.some((row) => row.max === undefined);
  return {
    '@type': 'AggregateOffer',
    priceCurrency: 'KRW',
    lowPrice: Math.min(...rows.map((row) => row.min)),
    ...(openEnded ? {} : { highPrice: Math.max(...rows.map((row) => row.max!)) }),
    offerCount: rows.length,
    offers: rows.map((row) => offer(row, url)),
  };
}

const fromPriceRow = (row: PriceRow) => ({ name: row.type, description: row.note, min: row.minPrice, max: row.maxPrice });

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
 * @param keys 그 페이지의 표에 실린 행만 넘긴다(서비스 페이지는 일부 행만 싣는다). 없으면 전체 표.
 */
export function aggregateOffer(path: string, keys?: PriceRow['key'][]) {
  const rows = keys ? offerablePrices.filter((row) => keys.includes(row.key)) : offerablePrices;
  return aggregate(rows.map(fromPriceRow), absoluteUrl(path));
}

/** /cost/ 전용 — 기준 가격표를 Service + AggregateOffer 로 내보낸다 */
export function priceOffers() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': absoluteUrl('/cost/#service'),
    name: '유품정리',
    serviceType: '유품정리',
    description: '주거 형태별 기준 가격을 공개하고, 그 범위 안에서 견적을 냅니다.',
    url: absoluteUrl('/cost/'),
    provider: provider(),
    areaServed: servedRegions(),
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

/**
 * Service.provider — @id 만 두면 그 노드가 정의되지 않은 페이지(지역·서비스)에서 빈 참조가 된다.
 * name·url 을 같이 넣어 단독으로도 읽히게 하고, @id 로 홈의 Organization 과 잇는다.
 * 칼럼의 author·publisher 도 이 노드를 쓴다 — 같은 @id 에 타입이 둘이 되지 않게.
 */
export const provider = () => ({
  '@type': 'Organization',
  '@id': absoluteUrl('/#business'),
  name: site.name,
  url: site.url,
});

/** 지역 페이지가 다루는 서비스 — 이름에 지역을 넣고, 종류(serviceType)는 지역 없이 둔다 */
const areaServiceTypes = services.map((service) => service.name);

export function serviceSchema(options: {
  name: string;
  description: string;
  path: string;
  /** place() 로 만든 행정구역. 없으면 서울·경기 */
  areaServed?: Record<string, unknown>[];
  /** 없으면 지역 페이지 기본값(유품정리·고독사 유품정리·빈집 정리) */
  serviceType?: string | string[];
  /**
   * 이 페이지가 기준 가격표(PriceTable)를 렌더하면 true, 일부 행만 싣는다면 그 행의 key 목록.
   * 지역 페이지처럼 표가 그대로 실려 있는 곳에서만 켤 것 — 자세한 이유는 aggregateOffer().
   */
  withPrices?: boolean | PriceRow['key'][];
}) {
  const url = absoluteUrl(options.path);
  const offers = options.withPrices
    ? aggregateOffer(options.path, Array.isArray(options.withPrices) ? options.withPrices : undefined)
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: options.name,
    description: options.description,
    url,
    serviceType: options.serviceType ?? areaServiceTypes,
    provider: provider(),
    areaServed: options.areaServed ?? servedRegions(),
    ...(offers ? { offers } : {}),
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
