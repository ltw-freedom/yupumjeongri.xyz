# yupumjeongri.xyz

유품정리연구소 웹사이트. **Astro (SSG) + Cloudflare Pages** 정적 사이트.

상담 접수·CRM 등 실제 업무 처리는 기존 비워도(Django) 쪽에서 담당하고,
이 저장소는 정적 HTML만 생성한다.

## 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 미리보기
npm run check    # 타입 체크
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

## SEO

- 페이지마다 `<title>`, `meta description`, `canonical`, OG 태그 — `BaseLayout` 이 처리
- H1 은 페이지당 하나
- `sitemap-index.xml` 은 `@astrojs/sitemap` 이 빌드 시 자동 생성
- `robots.txt` 는 `public/robots.txt`
- JSON-LD: 홈/지역 `LocalBusiness`, 서비스/지역 `Service`, FAQ 있는 페이지 `FAQPage`,
  칼럼 `Article`, 전 페이지 `BreadcrumbList`
- URL 은 trailing slash 로 통일 (`astro.config.mjs` 의 `trailingSlash: 'always'`)

## Cloudflare Pages 배포

Pages 프로젝트를 이 저장소에 연결하고:

| 설정 | 값 |
| --- | --- |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | `22` (환경변수 `NODE_VERSION=22`) |

이후 `main` 에 push 하면 자동 배포된다. 커스텀 도메인 `yupumjeongri.xyz` 는
Pages 프로젝트의 Custom domains 에서 연결한다 (DNS·SSL 은 Cloudflare 가 처리).

## 남은 작업 (TODO)

- [ ] `src/data/site.ts` 의 `consultUrl` 을 실제 비워도 상담 폼/API 주소로 교체
- [ ] `public/og-image.jpg` 추가 (현재 참조만 되어 있고 파일 없음)
- [ ] `public/images/` 에 실제 현장 사진(WebP) 추가 후 각 페이지에 배치
- [ ] `/cost/` 에 실제 가격표 반영 (확정 전까지 임의 금액 표기 금지)
- [ ] 사업자 정보(상호/대표/주소/사업자등록번호) 푸터에 추가
- [ ] 2차: 서울 25개 구, 경기 주요 도시 확장
