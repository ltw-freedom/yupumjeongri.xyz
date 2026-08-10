# yupumjeongri.xyz

**대한유품정리** 웹사이트. **Astro (SSG) + Cloudflare Pages** 정적 사이트.

상담 접수·CRM 등 실제 업무 처리는 기존 비워도(Django) 쪽에서 담당하고,
이 저장소는 정적 HTML만 생성한다.

## 브랜드 · 포지셔닝

기존 **비워도**(업무·CRM), **유품정리연구소**(정중함·전문성)와 겹치지 않게
**가격 투명성** 축으로 간다. 카피와 페이지 기획은 항상 숫자·조건·비교 가능성으로 끌고 갈 것.

| 항목 | 값 |
| --- | --- |
| 상호 | 대한유품정리 |
| 슬로건 | 유품정리, 값부터 공개합니다 |
| 서브 | 정찰제 · 견적서 외 추가금 0원 · 최저가 보상 |
| 심볼 | 추모 국화 (`public/favicon.svg`) |
| 컬러 | 딥 네이비 `#16233D` / 금색 포인트 `#8f5e14` (파비콘 위 금색은 `#C8892A`) |

브랜드 문자열은 전부 `src/data/site.ts` 한 곳에 있다. 하드코딩하지 말 것.

> **"국내 최저가" 류 표현 금지.** 표시광고법 제5조 실증책임상 절대적 최상급 표현은
> 전국 가격 조사 증빙이 필요해 사실상 실증이 불가능하다. 조건이 명시된
> **"최저가 보상"**(동일 조건 타사 견적서 대비)으로만 쓴다.
>
> 상호에 "대한"이 들어가므로 공공기관 오인을 막는 고지(`site.legalNotice`)를
> 푸터에 상시 노출한다. 로고에 태극·무궁화 등 정부 상징 유사 요소를 넣지 않는다.

## 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 미리보기
npm run check    # 타입 체크
npm run og       # public/og-image.png 다시 굽기
```

Node 18.20.8 이상 필요 (개발 환경 기준 v22).

## 구조

Django 를 해봤다면 대응 관계가 대충 이렇다.

| Astro | Django |
| --- | --- |
| `src/pages/` | `urls.py` + `views.py` (파일 경로 = URL) |
| `src/layouts/BaseLayout.astro` | `templates/base.html` |
| `src/components/` | `{% include %}` 템플릿 조각 |
| `src/data/*.ts` | 모델/픽스처 (빌드 시점 데이터) |
| `getStaticPaths()` | `path("<slug:slug>/", ...)` + queryset |
| `public/` | `static/` |

```text
src/
├── components/     Header, Footer, Hero, CTA, ServiceCard, FAQ, Breadcrumb
├── layouts/
│   └── BaseLayout.astro    title/description/canonical/OG/JSON-LD 처리
├── pages/
│   ├── index.astro
│   ├── service/            index + [slug] (services.ts 기반)
│   ├── cost/
│   ├── process/
│   ├── faq/
│   ├── area/               index + [region]/index + [region]/[city]
│   ├── column/             index + [...slug] (content collection)
│   └── 404.astro
├── content/columns/        마크다운 칼럼
├── data/
│   ├── site.ts             사이트 공통 정보 (상호, 전화, 상담 URL)
│   ├── services.ts         서비스 정의
│   ├── areas.ts            지역 정의 → /area/{region}/{city}/ 자동 생성
│   └── schema.ts           JSON-LD 빌더
└── styles/global.css
```

## 페이지 추가하기

### 지역 추가

`src/data/areas.ts` 의 `regions[].cities` 에 항목을 추가하면
`/area/{region}/{city}/` 페이지가 자동 생성된다.

단, `City` 타입의 필드(`traits`, `costFactors`, `faqs`)는 전부 필수다.
**지역명만 치환한 페이지는 만들지 않는다** — 그 지역에서 실제로 다른 내용이
없다면 아직 그 페이지를 만들 때가 아니다.

### 칼럼 추가

`src/content/columns/` 에 마크다운 파일을 추가한다. frontmatter:

```yaml
---
title: 제목
description: meta description 으로 쓰임
publishedAt: 2026-03-11
relatedAreas: ['gwanak', 'seoul']   # 지역 페이지와 상호 링크됨
draft: false
---
```

`relatedAreas` 에 지역 slug 를 넣으면 해당 지역 페이지에 "관련 칼럼"으로,
칼럼 페이지에는 "관련 지역"으로 양방향 링크가 생긴다.

### 서비스 추가

`src/data/services.ts` 에 항목 추가 → `/service/{slug}/` 자동 생성.

## 상담 접수 (Slack)

전화 상담은 운영하지 않는다. 접수 창구는 `/consult/` 폼 **하나뿐**이고,
`functions/api/consult.js` 의 핸들러가 받아서 Slack 으로 넘긴다.
(실서비스는 Worker 로 배포되므로 `worker/index.js` 가 이 핸들러를 `/api/consult` 에 연결한다.)

```text
/consult/  ──POST(form)──▶  /api/consult  ──▶  Slack Incoming Webhook
    ▲                            │
    └──── 303 ?error=... ────────┴──── 303 /consult/done/
```

JS 없이도 동작하도록 일반 form POST 로 두고, 결과는 서버가 303 리다이렉트로 알린다.
`?error=` 코드를 사람이 읽을 문장으로 바꾸는 것만 클라이언트 스크립트가 한다.

### 웹훅 URL 은 코드에 넣지 않는다

정적 사이트라 클라이언트에 들어간 값은 **전부 공개**된다. 웹훅 URL 이 노출되면
누구나 그 채널에 무제한으로 메시지를 밀어 넣을 수 있다. 반드시 환경변수로 둘 것.

**운영** — Worker `yupumjeongri-xyz` 에 Secret 으로 등록되어 있다 (배포해도 유지된다).

```bash
npx wrangler secret put SLACK_WEBHOOK_URL --name yupumjeongri-xyz
```

**로컬** — 저장소 루트에 `.dev.vars` 를 만든다 (`.gitignore` 되어 있다).

```ini
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

`astro dev` 는 Pages Functions 를 실행하지 않는다. 폼 전송까지 확인하려면:

```bash
npx wrangler pages dev dist --compatibility-date=2026-08-10
```

### 스팸 방어

허니팟 필드(`company`) + 필수값 검증 + 필드별 길이 제한이 들어가 있다.
그래도 `/api/consult` 는 공개 엔드포인트이므로, 유입이 생긴 뒤
Cloudflare 대시보드에서 해당 경로에 **Rate limiting rule** 을 걸 것.

## SEO

- 페이지마다 `<title>`, `meta description`, `canonical`, OG 태그 — `BaseLayout` 이 처리
- H1 은 페이지당 하나
- `sitemap-index.xml` 은 `@astrojs/sitemap` 이 빌드 시 자동 생성
- `robots.txt` 는 `public/robots.txt`
- JSON-LD: 홈/지역 `LocalBusiness`, 서비스/지역 `Service`, FAQ 있는 페이지 `FAQPage`,
  칼럼 `Article`, 전 페이지 `BreadcrumbList`
- URL 은 trailing slash 로 통일 (`astro.config.mjs` 의 `trailingSlash: 'always'`)

## Cloudflare Workers 배포

실서비스는 Cloudflare **Worker** `yupumjeongri-xyz` 로 서빙된다
(정적 자산 `dist/` + `/api/consult` 핸들러, 설정은 루트 `wrangler.jsonc`).
커스텀 도메인 `yupumjeongri.xyz` 는 대시보드에서 이 Worker 에 연결되어 있고,
`wrangler.jsonc` 에는 routes 를 적지 않으므로 배포해도 그대로 유지된다.

```bash
npm run build && npx wrangler deploy
```

- `wrangler login` 된 계정(dlxoqkftk1@gmail.com 계정)이어야 한다.
- `SLACK_WEBHOOK_URL` Secret 은 Worker 에 등록되어 있고 배포 후에도 유지된다.
  없으면 상담 폼이 `?error=config` 로 되돌아온다.
- `functions/` 디렉터리는 Pages 규약이지만, Worker 에서는 `worker/index.js` 가
  같은 핸들러를 import 해 `/api/consult` 에 연결한다 (로직은 한 곳만 수정하면 된다).

## 남은 작업 (TODO)

배포 전 필수:

- [ ] **`/cost/` 에 서비스별 비용 범위(최소~최대) 공개** — 이 사이트의 핵심 자산.
      숫자가 들어가면 `localBusiness()` 에 `priceRange`, 가격표에 `Offer` /
      `PriceSpecification` JSON-LD 를 함께 추가한다. 확정 전까지 임의 금액 표기 금지.
- [ ] **`/guarantee/` 최저가 보상제 페이지** — 적용 조건(동일 조건의 정의, 유효 기간,
      제외 항목, 증빙 방법)을 확정해야 작성 가능. 조건 없는 보상 문구는 쓰지 않는다.
- [ ] **Cloudflare Pages 에 `SLACK_WEBHOOK_URL` Secret 등록** — 이거 없으면 상담 접수가 안 된다.
- [ ] 사업자 정보(상호/대표/주소/사업자등록번호) 푸터에 추가.
      전자상거래법 제10조는 사이버몰 운영자에게 전화번호 표시를 요구하므로,
      전화 상담을 받지 않더라도 대표 연락처를 어떻게 표기할지 함께 정할 것.
- [ ] "대한유품정리" 상표·상호 중복 확인 (KIPRIS)

이후:

- [ ] `public/images/` 에 실제 현장 사진(WebP) 추가 후 각 페이지에 배치
- [ ] `.co.kr` / `.kr` 도메인 확보 후 `.xyz` 를 301 리다이렉트로 붙이는 안 검토
- [ ] 각 페이지 첫 문단을 40~60자 직답형으로 정리 (AEO 발췌 최적화)
- [ ] 2차: 서울 25개 구, 경기 주요 도시 확장
