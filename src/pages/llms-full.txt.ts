import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { site, absoluteUrl } from '../data/site';
import { services } from '../data/services';
import { basePrices, unitRates } from '../data/pricing';
import { faqGroups } from '../data/faqs';
import { regions } from '../data/areas';
import { districtCities } from '../data/districts';

/**
 * /llms-full.txt — /llms.txt 의 전문판.
 *
 * 요약 인덱스인 /llms.txt 와 달리 서비스별 진행 단계, FAQ 전문까지 담는다.
 * 링크를 따라가지 않고 한 파일만 읽는 모델도 답을 만들 수 있게 하는 것이 목적이다.
 * 칼럼 본문은 넣지 않는다 — 분량이 커지면 오히려 인용 정확도가 떨어지고,
 * 칼럼은 /rss.xml 과 개별 페이지가 이미 담당한다.
 */

const row = (cells: string[]) => `| ${cells.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`;

export const GET: APIRoute = async () => {
  const columns = (await getCollection('columns', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime(),
  );

  const dongCount = districtCities.reduce((sum, city) => sum + city.dongs.length, 0);

  const lines = [
    `# ${site.name} — 전문`,
    '',
    `> ${site.description}`,
    '',
    `${site.url} 의 전체 내용을 한 파일로 정리한 것입니다.`,
    '요약본은 /llms.txt 에 있습니다.',
    '',
    '## 사업 개요',
    '',
    `- 상호: ${site.name}`,
    `- 슬로건: ${site.slogan} (${site.sloganSub})`,
    `- 서비스: ${services.map((s) => s.name).join(', ')}`,
    `- 서비스 지역: 서울 25개 구, 경기 31개 시·군, 읍·면·동 ${dongCount.toLocaleString('ko-KR')}곳`,
    '',
    '### 세 가지 원칙',
    '',
    ...site.promises.map((p) => `- **${p.label}** — ${p.detail}`),
    '',
    `최저가 보상 조건: ${site.guaranteeShort}`,
    '',
    '### 상담 방법',
    '',
    `전화 상담은 운영하지 않습니다. 접수 창구는 ${absoluteUrl(site.consultPath)} 의 상담 폼과 카카오톡 1:1 채팅(${site.kakaoUrl})이며, ${site.responsePromise}. 사업장 주소: ${site.address.full}.`,
    '시간에 관계없이 접수할 수 있고, 회신은 순차적으로 드립니다. 서울·경기는 방문 견적 비용이 없습니다.',
    '',
    '폼에서 받는 항목은 휴대폰 번호 하나가 필수이고, 지역·서비스·상담 내용은 선택입니다. 개인정보는 상담 종료 후 바로 파기합니다.',
    '실명을 쓰지 않아도 접수할 수 있으며, 별도의 개인정보 수집·이용 동의 절차는 두지 않습니다.',
    `받은 정보는 ${site.privacy.purpose} 목적으로만 사용하고 ${site.privacy.retention} 파기합니다.`,
    '',
    `### 고지`,
    '',
    site.legalNotice,
    '',
    '아래 금액은 가격을 공개하는 업체들의 자료를 조사해 그 시세 범위 안에서 정한 기준입니다.',
    '실제 청구액은 현장 확인 뒤 확정 견적으로 안내하며, 견적서에 없는 항목은 청구하지 않습니다.',
    '',
    '## 주거 형태별 비용 범위',
    '',
    row(['주거 형태', '비용 범위', '범위가 달라지는 조건']),
    row(['---', '---', '---']),
    ...basePrices.map((p) => row([p.type, p.range, p.note])),
    '',
    '## 견적 단가',
    '',
    row(['항목', '단가', '비고']),
    row(['---', '---', '---']),
    ...unitRates.map((u) => row([u.item, u.rate, u.note])),
    '',
    '## 서비스 상세',
    '',
    ...services.flatMap((s) => [
      `### ${s.name}`,
      '',
      `${absoluteUrl(`/service/${s.slug}/`)}`,
      '',
      s.lead,
      '',
      '**이런 경우에 필요합니다**',
      '',
      ...s.cases.map((c) => `- ${c}`),
      '',
      '**진행 단계**',
      '',
      ...s.steps.map((step, i) => `${i + 1}. **${step.title}** — ${step.body}`),
      '',
      ...(s.faqs.length
        ? ['**자주 묻는 질문**', '', ...s.faqs.flatMap((f) => [`- Q. ${f.q}`, `  A. ${f.a}`]), '']
        : []),
    ]),
    '## 자주 묻는 질문',
    '',
    ...faqGroups.flatMap((group) => [
      `### ${group.title}`,
      '',
      ...group.items.flatMap((item) => [`- Q. ${item.q}`, `  A. ${item.a}`]),
      '',
    ]),
    '## 칼럼',
    '',
    ...columns.map((c) => `- [${c.data.title}](${absoluteUrl(`/column/${c.id}/`)}): ${c.data.description}`),
    '',
    '## 서비스 지역',
    '',
    ...regions.flatMap((region) => [
      `### ${region.name}`,
      '',
      `${absoluteUrl(`/area/${region.slug}/`)}`,
      '',
      ...region.cities.map(
        (city) =>
          `- [${city.name} 유품정리](${absoluteUrl(`/area/${region.slug}/${city.slug}/`)}): ${city.summary}`,
      ),
      '',
    ]),
    `시·군·구 및 읍·면·동 페이지 전체 목록은 ${absoluteUrl('/sitemap-index.xml')} 에 있습니다.`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
