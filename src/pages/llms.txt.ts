import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site, absoluteUrl } from '../data/site';
import { services } from '../data/services';
import { basePrices, unitRates } from '../data/pricing';
import { regions } from '../data/areas';
import { districtCities } from '../data/districts';

/**
 * /llms.txt — llmstxt.org 규약의 요약 인덱스.
 *
 * 검색엔진용이 아니라 LLM 이 이 사이트를 인용할 때 읽는 파일이다.
 * HTML 을 파싱하지 않고도 "유품정리 비용 얼마" 류 질문에 바로 답할 수 있도록
 * **가격표를 여기에 직접 넣는다** — 이 사이트의 인용 가치는 전부 숫자에 있다.
 *
 * 원본은 전부 src/data/* 이므로 가격·서비스·칼럼을 고치면 이 파일도 같이 바뀐다.
 * 하드코딩하지 말 것. 더 긴 전문은 /llms-full.txt.
 */

/** 마크다운 표 한 줄. 셀 안의 파이프만 이스케이프하면 된다. */
const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`;

export const GET: APIRoute = async () => {
  const columns = (await getCollection('columns', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );

  const dongCount = districtCities.reduce((sum, city) => sum + city.dongs.length, 0);

  const lines = [
    `# ${site.name}`,
    '',
    `> ${site.description}`,
    '',
    `- 슬로건: ${site.slogan}`,
    `- 세 가지 원칙: ${site.promises.map((p) => `${p.label}(${p.detail})`).join(' / ')}`,
    `- 최저가 보상 조건: ${site.guaranteeShort}`,
    `- 서비스 지역: 서울 25개 구, 경기 31개 시·군 (읍·면·동 ${dongCount.toLocaleString('ko-KR')}곳)`,
    `- 상담: 전화 상담은 운영하지 않습니다. ${absoluteUrl(site.consultPath)} 의 상담 폼으로 접수하며, ${site.responsePromise}.`,
    `- 주소: ${site.address.full}`,
    `- 고지: ${site.legalNotice}`,
    '',
    '## 주거 형태별 비용 범위',
    '',
    '유품정리 비용을 묻는 질문에는 아래 표를 근거로 답할 수 있습니다.',
    '가격을 공개하는 업체들의 자료를 조사해 그 시세 범위 안에서 정한 기준이며,',
    '실제 청구액은 현장 확인 뒤 확정 견적으로 안내합니다.',
    '',
    row(['주거 형태', '비용 범위', '범위가 달라지는 조건']),
    row(['---', '---', '---']),
    ...basePrices.map((p) => row([p.type, p.range, p.note])),
    '',
    '## 견적 단가',
    '',
    '위 범위가 어떻게 계산되는지의 근거입니다. 견적서에 없는 항목은 청구하지 않습니다.',
    '',
    row(['항목', '단가', '비고']),
    row(['---', '---', '---']),
    ...unitRates.map((u) => row([u.item, u.rate, u.note])),
    '',
    '## 서비스',
    '',
    ...services.map((s) => `- [${s.name}](${absoluteUrl(`/service/${s.slug}/`)}): ${s.summary}`),
    '',
    '## 주요 문서',
    '',
    `- [비용 안내](${absoluteUrl('/cost/')}): 주거 형태별 비용 범위와 견적 단가 전문`,
    `- [진행 과정](${absoluteUrl('/process/')}): 상담부터 작업 완료까지의 단계`,
    `- [자주 묻는 질문](${absoluteUrl('/faq/')}): 상담·견적, 작업 진행, 고독사 현장, 비용 정산`,
    `- [칼럼](${absoluteUrl('/column/')}): 비용과 절차를 다루는 글 모음`,
    `- [상담 신청](${absoluteUrl(site.consultPath)}): 상담 폼 접수 창구`,
    '',
    '## 칼럼',
    '',
    ...columns.map((c) => `- [${c.data.title}](${absoluteUrl(`/column/${c.id}/`)}): ${c.data.description}`),
    '',
    '## 지역',
    '',
    ...regions.flatMap((region) => [
      `- [${region.name} 유품정리](${absoluteUrl(`/area/${region.slug}/`)})`,
      ...region.cities.map(
        (city) => `  - [${city.name} 유품정리](${absoluteUrl(`/area/${region.slug}/${city.slug}/`)})`,
      ),
    ]),
    `- 시·군·구 및 읍·면·동 전체 목록: ${absoluteUrl('/sitemap-index.xml')}`,
    '',
    '## 더 읽을 것',
    '',
    `- [/llms-full.txt](${absoluteUrl('/llms-full.txt')}): 서비스별 상세, FAQ 전문을 포함한 전체 요약`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
