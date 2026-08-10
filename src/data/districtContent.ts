/**
 * 시·동 페이지의 템플릿 콘텐츠 빌더.
 *
 * 1,000개가 넘는 동 페이지가 유사문서로 묶이지 않도록, 페이지마다
 * **관점이 다른 골격 5종** 중 하나를 슬러그 해시로 결정적으로 배정한다
 * (유품정리연구소 AREA.md 5장 — "템플릿 회전은 어순만 바꾸는 게 아니라
 * 다른 관점이어야 한다"). 같은 페이지는 빌드마다 같은 골격을 받는다.
 *
 *   골격 0 비용·견적 / 1 절차·일정 / 2 유가족·보관품 / 3 특수청소·소독 / 4 빈집·공실
 *
 * 원칙: 지어낸 지역 정보를 넣지 않는다. "○○동 작업 ○백 건" 같은
 * 검증 불가한 주장 대신, 어디서나 참인 서비스 사실 + 공개 가격만 쓴다.
 * (지역 고유 정보는 areas.ts 의 큐레이션 티어가 담당한다)
 */

import type { DistrictCity, DistrictDong } from './districts';
import type { DongAlias } from './dongAliases';

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/** 슬러그 해시로 배열에서 하나를 결정적으로 고른다 */
function pick<T>(items: T[], seed: string): T {
  return items[hash(seed) % items.length];
}

/** 페이지에 배정되는 골격 번호 (0~4) — 모든 섹션이 같은 골격을 따른다 */
function skeleton(city: DistrictCity, dong: { slug: string }): number {
  return hash(`skel:${city.slug}:${dong.slug}`) % 5;
}

/** "잠실동" → "잠실", "가평읍" → "가평", "중동"·"종로1가"는 그대로 */
export function dongShortName(name: string): string {
  const m = name.match(/^(.{2,})[동읍면]$/);
  return m ? m[1] : name;
}

/** "송파구 잠실동" | "성남시 수정구 위례동" — 검색 관행에 맞춘 전체 표기 */
export function dongDisplayName(city: DistrictCity, dong: { name: string; gu?: string }): string {
  return [city.name, dong.gu, dong.name].filter(Boolean).join(' ');
}

/** 동 페이지 리드 문단 — 골격별로 다른 관점에서 시작한다 */
export function dongLead(city: DistrictCity, dong: DistrictDong | DongAlias): string {
  const display = dongDisplayName(city, dong);
  const short = dongShortName(dong.name);
  const variants = [
    // 0 비용·견적
    `${display} 유품정리 비용을 먼저 공개합니다. 원룸 40만원대부터 주거 형태별 기준 범위 안에서 견적을 내고, 견적서에 없는 금액은 청구하지 않습니다.`,
    // 1 절차·일정
    `${display} 유품정리는 현장 확인부터 공간 정돈까지 5단계로 진행합니다. 접수 후 보통 1~3일 안에 방문하며, 일정이 정해져 있다면 그에 맞춰 조율합니다.`,
    // 2 유가족·보관품
    `${display}에서 유품정리를 진행할 때는 버리는 일보다 남기는 일을 먼저 합니다. 서류·사진·기록물은 따로 분류해 전달드리고, 나머지를 공개된 비용 기준으로 정리합니다.`,
    // 3 특수청소·소독
    `${short} 지역 유품정리와 고독사 특수청소를 함께 진행합니다. 오염 범위 확인, 폐기물 처리, 소독까지 항목별 견적으로 안내드리고 견적서 그대로 마무리합니다.`,
    // 4 빈집·공실
    `${display}의 빈집 정리와 유품정리를 진행합니다. 오래 비어 있던 집도 폐기물 양 기준으로 견적을 내며, 비용 범위는 미리 공개되어 있습니다.`,
  ];
  return variants[skeleton(city, dong)];
}

/** 동 페이지 비용 안내 문단 */
export function dongCostNote(city: DistrictCity, dong: DistrictDong | DongAlias): string {
  const display = dongDisplayName(city, dong);
  const variants = [
    `${display}도 아래 공개 기준 그대로 적용됩니다. 지역이 다르다고 비용이 달라지지 않습니다 — 범위가 달라지는 건 물품 양, 반출 동선, 특수청소 여부뿐입니다.`,
    `아래 기준은 ${display}을 포함한 서비스 전 지역에 동일하게 적용됩니다. 현장 사진 몇 장이면 방문 전에 이 범위 안에서 예상 견적을 안내드립니다.`,
    `보관품 분류를 포함해도 아래 기준 범위 안에서 진행됩니다. ${display} 현장도 방문 확인 후 항목별 견적서를 드리고, 견적서에 없는 금액은 청구하지 않습니다.`,
    `특수청소가 필요한 현장은 아래 기준에 오염 범위에 따른 추가분이 붙습니다. ${display}도 같은 기준표로 계산하며, 항목별 견적서로 근거를 공개합니다.`,
    `빈집·쓰레기집 정리는 평형보다 쌓인 폐기물 양이 기준입니다. ${display} 현장도 아래 공개 기준으로 계산하고, 추가금 없이 견적서 그대로 진행합니다.`,
  ];
  return variants[skeleton(city, dong)];
}

/** 동 페이지 FAQ — 첫 질문은 골격을 따르고, 나머지는 별도 해시로 회전한다 */
export function dongFaqs(city: DistrictCity, dong: DistrictDong | DongAlias): { q: string; a: string }[] {
  const display = dongDisplayName(city, dong);
  const short = dongShortName(dong.name);
  const bySkeleton = [
    {
      q: `${display}에서 유품정리 비용은 얼마나 하나요?`,
      a: `원룸 기준 40만~90만원, 20평대 아파트 기준 150만~250만원 범위입니다. ${short} 지역이라고 달라지는 금액은 없고, 물품 양과 반출 동선에 따라 범위 안에서 정해집니다.`,
    },
    {
      q: `${display}은 접수 후 얼마나 빨리 진행되나요?`,
      a: `보통 접수 후 1~3일 안에 현장 확인 일정을 잡고, 확인 당일 항목별 견적서를 드립니다. 이주 기한처럼 정해진 날짜가 있다면 상담 시 먼저 알려주세요.`,
    },
    {
      q: `${display} 현장에서 남겨야 할 서류가 나오면 어떻게 하나요?`,
      a: `통장·인감·계약서 등 서류와 사진·기록물은 작업 중 따로 분류해 전달드립니다. 보관하실 물건을 상담 때 미리 정해두시면 작업이 빨라집니다.`,
    },
    {
      q: `${display}에서 고독사 특수청소도 같이 되나요?`,
      a: `가능합니다. 유품정리에 특수청소·소독을 더하면 오염 범위에 따라 80만~200만원이 추가되며, 방문 확인 때 항목별로 나눠 안내드립니다.`,
    },
    {
      q: `${display}의 오래 비어 있던 집도 정리되나요?`,
      a: `가능합니다. 빈집 정리는 평형보다 쌓인 폐기물 양이 견적 기준이라, 현장 사진 몇 장이면 방문 전에 예상 범위를 안내드릴 수 있습니다.`,
    },
  ];
  const second = pick(
    [
      {
        q: `${short} 지역은 방문 견적이 무료인가요?`,
        a: `네, ${display}을 포함한 서울·경기 전 지역 방문 견적이 무료입니다. 현장 사진을 먼저 보내주시면 방문 전에 대략적인 범위도 안내드립니다.`,
      },
      {
        q: `이웃에게 알려지지 않게 진행할 수 있나요?`,
        a: `가능합니다. 무표기 차량으로 진행하고, 작업 시간대도 조정할 수 있습니다. ${display} 현장도 동일하게 적용됩니다.`,
      },
      {
        q: `유가족이 멀리 있는데 위임으로 진행할 수 있나요?`,
        a: `가능합니다. 작업 전후 사진과 물품 목록을 공유해 드리고, 보관품은 택배로 발송합니다. ${short} 현장도 같은 방식으로 진행합니다.`,
      },
    ],
    `faq2:${city.slug}:${dong.slug}`,
  );
  const third = pick(
    [
      {
        q: `견적서에 없는 추가 비용이 나올 수 있나요?`,
        a: `없습니다. 방문 확인 후 항목별 견적서를 드리고, 거기에 없는 금액은 청구하지 않습니다. 이 원칙은 전 지역 동일합니다.`,
      },
      {
        q: `다른 업체 견적서가 있으면 더 저렴하게 되나요?`,
        a: `동일 조건의 타사 견적서를 제시하시면 그보다 낮은 금액으로 진행합니다. 조건이 명시된 최저가 보상 원칙입니다.`,
      },
      {
        q: `작업은 하루 안에 끝나나요?`,
        a: `대부분의 현장은 하루 안에 마무리됩니다. 물품 양이 많거나 특수청소가 포함되면 이틀로 나누며, 견적 때 소요 시간을 함께 안내드립니다.`,
      },
    ],
    `faq3:${city.slug}:${dong.slug}`,
  );
  return [bySkeleton[skeleton(city, dong)], second, third];
}

/** 큐레이션이 없는 시·군·구 페이지의 리드 문단 */
export function cityLead(city: DistrictCity): string {
  const short = city.name.replace(/[구시군]$/, '');
  const dongCount = city.dongs.length;
  const sample = city.dongs
    .slice(0, 3)
    .map((dong) => dong.name)
    .join('·');
  const variants = [
    `${city.name} 전 지역(${sample} 등 ${dongCount}개 법정동)에서 유품정리·고독사 특수청소·빈집 정리를 진행합니다. 비용 범위를 먼저 공개하고, 견적서 외 추가금 없이 진행합니다.`,
    `${short} 지역 유품정리 전문. ${sample} 등 ${city.name} ${dongCount}개 법정동 전체에서 방문 견적을 받으실 수 있습니다. 공개된 가격 기준 그대로, 추가금 없이 진행합니다.`,
    `${city.name}에서 유품정리, 고독사 특수청소, 빈집 정리를 의뢰하실 수 있습니다. ${sample} 등 ${dongCount}개 법정동 전 지역 방문하며, 공개된 비용 기준 안에서 항목별 견적을 드립니다.`,
  ];
  return pick(variants, `citylead:${city.slug}`);
}

/** 큐레이션이 없는 시·군·구 페이지의 FAQ */
export function cityFaqs(city: DistrictCity): { q: string; a: string }[] {
  const short = city.name.replace(/[구시군]$/, '');
  return [
    {
      q: `${city.name} 전 지역 모두 가능한가요?`,
      a: `네, ${city.name}의 모든 법정동에서 진행합니다. 아래 법정동 목록에서 해당 지역 안내 페이지를 확인하실 수 있습니다.`,
    },
    {
      q: `${short} 지역 유품정리 비용은 얼마인가요?`,
      a: `원룸 40만~90만원, 20평대 아파트 150만~250만원 범위이며, 전 지역 동일한 기준을 적용합니다. 자세한 기준은 비용 안내 페이지에 공개되어 있습니다.`,
    },
    {
      q: `방문 견적에 비용이 드나요?`,
      a: `무료입니다. 현장 사진을 먼저 보내주시면 방문 전에 예상 범위도 안내드립니다. 방문 후 항목별 견적서를 드리고, 견적서에 없는 금액은 청구하지 않습니다.`,
    },
  ];
}
