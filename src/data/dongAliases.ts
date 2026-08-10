/**
 * 법정동 목록에 없는 생활지명(신도시·행정동) 별칭 페이지.
 *
 * "위례 유품정리"처럼 검색량은 크지만 법정동이 아닌 지명을 잡기 위한
 * 수동 큐레이션 레이어다. 별칭 페이지는 법정동 페이지와 같은 템플릿을 쓰되,
 * 해당 생활권을 구성하는 법정동 페이지로 내부 링크를 건다.
 *
 * 데이터는 dongAliases.json 에 있다 — 사이트맵 웨이브를 만드는
 * scripts/generate-districts.mjs 가 같은 파일을 읽기 때문에 JSON 으로 둔다.
 *
 * 추가 기준: 실제로 "지명 + 유품정리" 검색이 있을 법한 신도시·대형 생활권만.
 * 이미 같은 이름의 법정동이 있으면(판교동·미사동·별내동·다산동·배곧동·옥정동 등)
 * 추가하지 말 것 — 법정동 페이지가 그 키워드를 그대로 커버한다.
 */
import aliasData from './dongAliases.json';

export type DongAlias = {
  region: 'seoul' | 'gyeonggi';
  citySlug: string;
  slug: string;
  /** 페이지 제목에 쓰는 이름 — 검색 관행에 맞춘다 (위례동·동탄 …) */
  name: string;
  /** 일반구 표기 (성남시 수정구 위례동처럼 구까지 붙여 쓰는 경우) */
  gu?: string;
  /** 이 생활권을 구성하는 법정동 이름 (해당 시의 법정동 페이지로 링크) */
  legalDongs: string[];
  /** 리드 문장에 쓰는 생활권 설명 한 줄 */
  intro: string;
};

export const dongAliases = aliasData as DongAlias[];

export function getAliases(region: string, citySlug: string): DongAlias[] {
  return dongAliases.filter((alias) => alias.region === region && alias.citySlug === citySlug);
}
