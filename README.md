# yupumjeongri.xyz

**대한유품정리** 웹사이트. **Astro (SSG)** 정적 사이트를 **Cloudflare Worker** 로 서빙한다([배포](#cloudflare-workers-배포)).

상담 접수는 사이트 자체 폼 하나로 받는다 — `/consult/` 등 번호 칸 → Worker `/api/consult` → Slack #대한유품정리-상담.
깔때기 기록은 D1 `yupumjeongri-funnel`. 다른 브랜드 시스템과는 연결하지 않는다(브랜드 격리).

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
> 로고에 태극·무궁화 등 정부 상징 유사 요소를 넣지 않는다. (푸터의 공공기관 오인 방지 고지는 2026-09-26 운영자 지시로 삭제했다.)

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

### 받는 항목은 최소로

| 필드 | 필수 | 비고 |
| --- | --- | --- |
| `nickname` | O | **실명을 받지 않는다.** 회신 때 부를 호칭이면 된다 |
| `phone` | O | **휴대폰 번호만.** 이메일·카톡 아이디는 받지 않는다 |
| `region` / `type` / `message` | | 선택 |
| `housing` / `volume` / `access` / `special` / `estimate` | | 선택 — 예상 비용 계산기(`EstimateCalc`)에서 고른 조건과 화면에 보여준 금액 |
| `regionHint` | | 지역 입력 칸이 없는 빠른 상담 폼이 페이지의 지역명을 대신 보낸다 |
| `page` | | 신청한 페이지 경로. 어느 페이지에서 전환이 나는지 Slack 에서 본다 (개인정보 아님) |

접수 창구는 `/consult/` 한 페이지가 아니라 **같은 엔드포인트로 보내는 폼 네 종류**다.
버튼 문구는 전부 **'상담 신청'**, 회신 약속은 `site.responsePromise`("최대한 빠르게") 하나로 쓴다.
"○분 안에", "○시 전에" 같은 구체적인 회신 시각은 적지 않는다 — 밤·주말에 지킬 수 없는 약속이 된다.
전화번호가 없는 사이트라 "번호 칸"이 전화 버튼 역할을 하므로, 번호 칸을 모바일 첫 화면에 둔다.

- `QuickConsult` — 번호 한 칸 + 버튼. 홈 히어로, 지역 페이지 첫 화면(`AreaQuick`), 모든 페이지 하단 `CTA`
- `EstimateCalc` — 예상 비용 계산기 + 번호 칸. 홈, `/cost/#estimate`, 동 페이지. **시군구 페이지에서는 2026-10-23 뺐다**
  (21일간 10세션이 썼지만 접수 0, 56쪽 공통 문구라 유사도만 올림 → `/cost/#estimate` 링크로).
  금액은 `pricing.ts` 의 공개 값에서만 계산한다(`estimator` 주석). 새 금액을 만들지 않는다
- `/consult/` — 번호 칸 바로 아래 보내기 버튼, 선택 항목은 눌러서 고르는 칩
- 공통 보강 `src/scripts/consult-form.ts` — 번호 자동 하이픈, 전송 전 즉시 검증, 중복 전송 방지,
  `?error=` 로 돌아오면 입력 복원, 완료 페이지에서 남긴 번호를 가려서 보여 주기

- **파일 업로드는 없다.** 폼에 첨부 필드가 없으므로 "사진을 보내주시면 견적을…" 류의
  카피를 어디에도 쓰지 말 것. 지킬 수 없는 약속이 된다. (우리가 유가족에게 *보내는*
  작업 전후 사진은 별개이고, 그 문구는 유지한다.)
- **개인정보 수집·이용 동의 체크박스는 두지 않는다.** 상담 회신에 필요한 최소 항목만
  받고 폼 하단 고지(`site.privacy`)로 갈음한다. 항목을 늘리려면 동의 절차를 다시
  검토해야 하므로, 늘리기 전에 반드시 상의할 것.
- 번호 검증은 `functions/api/consult.js` 의 `normalizePhone()` 이 담당한다.
  하이픈·공백·`+82` 표기를 `010-1234-5678` 형태로 정규화해 Slack 에 넘긴다.
  브라우저 `pattern` 은 우회 가능하므로 서버 검증이 진짜 방어선이다.

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

허니팟 필드(`hp_leave_blank`, `FormHidden.astro`) + 필수값 검증 + 필드별 길이 제한이 들어가 있다.
허니팟 이름·라벨은 자동완성이 알아보는 단어(company·회사명·name·email …)를 쓰지 않는다 — 예전 `company`/'회사명'은
모바일 자동완성이 채워 실제 신청이 봇으로 버려질 수 있었다. 같은 이유로 **허니팟 값이 있어도 번호가 정상이면
버리지 않고 '스팸 의심' 표시를 붙여 Slack 으로 보낸다.**
그래도 `/api/consult` 는 공개 엔드포인트이므로, 유입이 생긴 뒤
Cloudflare 대시보드에서 해당 경로에 **Rate limiting rule** 을 걸 것.

## SEO

- 페이지마다 `<title>`, `meta description`, `canonical`, OG 태그 — `BaseLayout` 이 처리
- H1 은 페이지당 하나
- `sitemap-index.xml` 은 `@astrojs/sitemap` 이 빌드 시 자동 생성
- `robots.txt` 는 `public/robots.txt`
- JSON-LD: 홈·지역 허브 `Organization`(`/#business`), 서비스·지역 `Service`(지역은 `AdministrativeArea`/`City` 객체 +
  상위 행정구역), FAQ 있는 페이지 `FAQPage`, 칼럼 `Article`, 전 페이지 `BreadcrumbList`. 빌더는 `src/data/schema.ts`.
  `LocalBusiness` 를 쓰지 않는 이유: 구글이 address 를 필수로 요구하는데 주소는 공개하지 않는다(2026-10-23 전환).
- 아이콘: `public/favicon.svg` 하나가 원본. `npm run icons` 가 `favicon.ico`·`apple-touch-icon.png`·`icon-192/512.png` 를 굽는다.
- 사이트맵 lastmod 는 칼럼에만(frontmatter 날짜). 빌드 날짜를 전 페이지에 찍지 않는다.
- URL 은 trailing slash 로 통일 (`astro.config.mjs` 의 `trailingSlash: 'always'`)

### 네이버 순위 — 건드리기 전에 읽을 것

2026-09 기준 **시군구 페이지가 "{지역} 유품정리" 54개 키워드 중 29개에서 네이버 웹 영역 12위 안**
(1위 10개)에 든다. 분석·기준선·재측정 방법은 [`docs/seo-naver.md`](docs/seo-naver.md).

- 순위는 시군구 템플릿에서 나온다 — `src/pages/area/[region]/[city]/index.astro` 의 `title`
  ("송파구유품정리 · 송파 유품정리 …")·`description`("송파유품정리 업체 — …")과 `cityShortName()`.
  **이 패턴은 바꾸지 말 것.** 고쳐야 하면 일부 지역에 먼저 적용하고 순위를 재서 확인한다.
- URL·slug 변경, `.xyz` → `.co.kr` 도메인 이전은 순위 리셋 위험이 있다.
- **동 페이지는 2026-11-15 부터 `noindex, follow`·사이트맵 제외**(사업주 승인, `docs/seo-naver.md` 4-15). 지역명 치환 템플릿이 사이트의 97%라 사이트 전체가 낮게 평가됐다고 판단했다.
  다시 여는 건 `src/data/dongCases.ts` 에 운영자가 확인한 실제 작업 기록이 생긴 동만 — 그 파일 하나로 noindex 와 사이트맵이 같이 풀린다.
- 순위·색인 측정: **`naver-rank.mjs`·`naver-index.mjs` 는 쓰지 않는다** — 2026-10-13·10-21 운영자 결정(네이버 검색 화면
  자동 조회 전면 중단). 서치어드바이저·Search Console·Bing Webmaster 와 사람이 직접 보는 소수 표본으로만 잰다(`docs/seo-naver.md` 5장).
- 봇 실제 방문(콘솔 없이, 우리 Cloudflare 만 조회): `node scripts/bot-crawl.mjs --days 21` — Yeti·Googlebot·GPTBot 등 일별 요청·상태코드·상위 경로
  (Cloudflare 적응형 표본, 과거 30일까지. 토큰은 `CF_API_TOKEN` 또는 wrangler OAuth).
- 봇 방문 정확 집계: Worker 가 D1 `bot_hits` 에 KST 일별로 센다(`worker/botlog.js`, 처음 한 번 `npx wrangler d1 migrations apply yupumjeongri-funnel --remote`) —
  `npx wrangler d1 execute yupumjeongri-funnel --remote --command "SELECT day, bot, SUM(hits) FROM bot_hits GROUP BY 1, 2 ORDER BY 1 DESC"`.
- 시군구 페이지끼리 본문 유사도(유사문서 제외 원인, `docs/seo-naver.md` 4-2·4-5):
  `npm run build && node scripts/area-similarity.mjs`. 시군구 템플릿에 공통 문구를 더하면 이걸로 평균이 오르지 않는지 볼 것.
  지역마다 다른 본문은 `src/data/cityStats.ts`·`cityDongHousing.ts`(2025 인구주택총조사, KOSIS)에서 만든다 — 출처 없는 지역 정보는 넣지 않는다.

### AI 크롤러 / LLM 인용 (AEO)

"유품정리 비용 얼마" 류 질문의 답이 검색에서 LLM 으로 넘어가는 중이다.
이 사이트는 **금액을 실제로 공개하는 몇 안 되는 사이트**라 인용되는 쪽에 서는 것이 유리하다.

- `public/robots.txt` 에 GPTBot·ClaudeBot·PerplexityBot·Google-Extended 등을 **명시적으로** Allow.
  `User-agent: *` 로도 이미 허용되지만, 로봇 규약상 특정 UA 그룹에 매칭된 봇은 `*` 를 통째로
  무시하므로 그룹마다 `Disallow` 를 다시 적어야 한다. 지우지 말 것.
- `/llms.txt` — llmstxt.org 규약의 요약 인덱스. **가격표를 파일 안에 직접 넣는다.**
  HTML 을 파싱하지 않는 모델도 금액을 바로 인용할 수 있게 하는 것이 목적이다.
- `/llms-full.txt` — 서비스별 진행 단계와 FAQ 전문까지 담은 전문판.

둘 다 `src/pages/llms*.txt.ts` 가 `src/data/*` 에서 생성한다. 가격·서비스·FAQ 를 고치면
자동으로 따라 바뀌므로 **텍스트를 하드코딩하지 말 것**. FAQ 는 `/faq/` 페이지와 원본을
공유하도록 `src/data/faqs.ts` 로 빼 두었다.

## Cloudflare Workers 배포

실서비스는 Cloudflare **Worker** `yupumjeongri-xyz` 로 서빙된다
(정적 자산 `dist/` + `/api/consult` 핸들러, 설정은 루트 `wrangler.jsonc`).
커스텀 도메인 `yupumjeongri.xyz` 는 대시보드에서 이 Worker 에 연결되어 있고,
`wrangler.jsonc` 에는 routes 를 적지 않으므로 배포해도 그대로 유지된다.

### 자동 배포 — main 에 푸시하면 배포 (2026-11-18 전환)

운영자 결정(2026-11-18)으로 손으로 돌리던 배포를 없앤다. Cloudflare 가 이 저장소를 직접 보고
(Workers Builds), `main` 에 푸시할 때마다 빌드해서 배포한다. 어느 기기에서 푸시해도 결과가 같다.

| 단계 | 값 |
|---|---|
| 연결 위치 | 대시보드 → Workers & Pages → `yupumjeongri-xyz` → Settings → Build → Connect repository |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |
| Build variables | `NODE_VERSION=22` (`.nvmrc` 와 같은 값). 그 밖에 넣을 값은 없다 — 빌드는 환경변수를 읽지 않는다 |
| Preview builds | 켜지 않는다. 프리뷰도 운영 `SLACK_WEBHOOK_URL` 을 써서 시험 제출이 운영 Slack 으로 간다 |

- **연결됐는지 아는 법**: GitHub 커밋 옆에 `Workers Builds: yupumjeongri-xyz` 표시가 붙는다.
  이 표시가 없는 동안은 아직 연결 전이고, 푸시해도 배포되지 않는다.
- **푸시가 곧 배포다.** 확인하지 않은 변경, 문서만 고친 커밋도 `main` 에 푸시하면 운영이 다시 빌드된다.
  푸시 전에 `npm run check` 와 `npm run build` 를 통과시킨다. 덜 끝난 작업은 `main` 이 아닌 브랜치로 올린다.
- **배포 확인**: 커밋 옆 표시가 성공인지 보고, `/` · `/cost/` · `/consult/` · `/llms.txt` 응답과
  `sitemap-0.xml` 의 주소 수를 본다. 실패하면 대시보드의 빌드 로그 첫 오류 줄을 본다.
- **IndexNow 는 자동 배포에 넣지 않았다.** 넣으면 문서만 고친 푸시에도 같은 주소를 매번 다시 보내게 된다
  ("바뀐 URL 만" 원칙). 칼럼을 더하거나 고친 푸시는 배포가 끝난 뒤
  `npm run build && node scripts/indexnow.mjs --recent`, 그 밖에는 바뀐 경로만
  `node scripts/indexnow.mjs <경로>` 로 보낸다. Cloudflare 로그인 없이 어느 기기에서나 된다.
- **되돌리기**: 대시보드 → Deployments 에서 이전 버전을 고르거나 `npx wrangler rollback`.
  그 뒤 원인 커밋을 되돌려 푸시한다(안 그러면 다음 푸시가 다시 덮는다).
- 전환 시점(2026-11-18) 확인: `origin/main`(`874e3a6`)을 새로 받아 빌드한 결과가 운영본과 같았다
  (사이트맵 84 주소, `/` · `/cost/` · `/llms.txt` 본문 일치). 연결만으로 운영 내용은 바뀌지 않는다.

### 손으로 배포 (급할 때만)

자동 배포가 실패했고 바로 고칠 수 없을 때만 쓴다. 다음 푸시 때 자동 배포가 다시 덮어쓴다.

```bash
npm run build && npx wrangler deploy
```

- `wrangler login` 된 계정(dlxoqkftk1@gmail.com 계정)이어야 한다.
- `SLACK_WEBHOOK_URL` Secret 은 Worker 에 등록되어 있고 배포 후에도 유지된다.
  없으면 상담 폼이 `?error=config` 로 되돌아온다.
- `functions/` 디렉터리는 Pages 규약이지만, Worker 에서는 `worker/index.js` 가
  같은 핸들러를 import 해 `/api/consult` 에 연결한다 (로직은 한 곳만 수정하면 된다).

## 남은 작업 (TODO)

### 운영자가 직접 할 일 — 우선순위 순 (2026-11-15 정리)

배경: 10/30 네이버 노출 −93%, 구글 3개월 노출 45 → 11/15 동 페이지 1,096쪽 noindex·사이트맵 84 URL 로 축소 배포(`docs/seo-naver.md` 4-15).
끝낸 항목은 체크하고 날짜를 적는다. 1~2 는 이번 배포 효과를 앞당기는 일이라 가장 먼저.

- [ ] **0. Cloudflare 에서 이 저장소 연결하기 — 자동 배포** (5분, 2026-11-18 추가)
  - 대시보드 → Workers & Pages → `yupumjeongri-xyz` → Settings → Build → Connect repository → `ltw-freedom/yupumjeongri.xyz`
  - 설정값은 [배포](#cloudflare-workers-배포) 절의 표 그대로. 끝나면 Claude 에 알려 시험 푸시로 확인
- [ ] **1. 네이버 서치어드바이저 — 사이트맵 다시 제출 + 핵심 페이지 수집 요청** (10분)
  - 요청 → 사이트맵 제출: `https://yupumjeongri.xyz/sitemap-index.xml` (305 → 84 URL 로 바뀜)
  - 요청 → 웹 페이지 수집: `/` · `/cost/` · `/faq/` · `/process/` · `/service/yupumjeongri/`
  - 동 페이지는 수집 요청하지 말 것(noindex 라 의미 없음)
- [ ] **2. 구글 Search Console — 사이트맵 다시 제출** (5분)
  - Sitemaps → `sitemap-index.xml` 제출. URL 검사로 `/`·`/cost/` 색인 생성 요청
  - 몇 주 동안 '페이지' 보고서에 'noindex 태그에 의해 제외됨'이 1,000 가까이 늘어난다 — 의도한 결과, 손대지 않는다. 동 페이지 '삭제' 요청도 하지 않는다
- [ ] **3. 네이버 블로그에 실제 현장 기록 올리기** (작업 끝날 때마다)
  - 네이버 AI 브리핑·통합검색 출처는 대부분 블로그·지식iN·플레이스라 웹사이트만으로는 불리하다
  - 실제 작업만(지어낸 사례 금지). 지역·주거 형태·견적서 금액 범위(부가세 별도)·작업 전후 사진. 고인·유가족을 알아볼 내용은 빼기
  - 글 끝에 `https://yupumjeongri.xyz/cost/` 링크 하나
- [ ] **4. 실제 작업 기록을 사이트에도 넘기기** (3과 같은 건)
  - 다음 작업 때 Claude 에 `작업 끝난 날짜 · 동 이름 · 주거 형태(예: 다세대 3층, 엘리베이터 없음) · 견적서 금액 범위 · 한두 줄 요약`을 주면
    `src/data/dongCases.ts` 에 넣는다 → **그 동 페이지만 noindex 가 풀리고 사이트맵에 다시 들어간다**
- [ ] **5. 실제 의뢰인 한 줄 후기 받기** — 작업까지 간 건부터. 받으면 Claude 에 원문 그대로 전달(지어낸 후기 금지, 아래 '후기 섹션')
- [ ] **6. Bing Webmaster — Crawl Control 최대로** (5분, 4-10 에서 남은 일)
  - Configuration → Crawl Control → 전 시간대 맨 위(Faster crawl) → Save. `/cost/` 가 Indexed 로 바뀌었는지 URL Inspection 으로 확인
- [ ] **7. 2026-12-15 전후 재판정용 스크린샷 3장** — 다음 점검 때 Claude 에 전달
  - 서치어드바이저 콘텐츠 노출/클릭(최근 30일 일별 그래프), 사이트 진단(색인 그래프), GSC 실적(3개월, 노출수·평균 게재순위 켜기)
  - 판정 기준: 네이버 하루 노출 100 이상이면 회복 중, 50 미만이면 시군구 페이지 축소를 결정해야 한다(4-15)

- [ ] 후기 섹션 — 실제 의뢰인 코멘트를 받은 사례만 싣는다 (지어낸 후기 금지). 첫 실제 접수부터 작업 후 한 줄 요청
  (2026-10-20: 실제 접수 4명 — 10/2 김포·10/6 군포·10/7 망원·10/7 분당. 작업까지 간 건이 있으면 그 건부터.
  2026-10-27: + 10/20 관악 신림동(D1 기록, 운영자 회신 확인 대기), 그 뒤 새 접수 0 — 작업까지 간 건은 아직 운영자 확인 전.
  2026-11-03: 새 접수 0, 네이버 유입 10/27 뒤 7일째 0 — `docs/seo-naver.md` 4-12)
- [ ] `/api/consult` Rate limiting rule — 유입이 늘면 Cloudflare 대시보드에서 건다 ([스팸 방어](#스팸-방어))
  (2026-10-20: 스팸 0건, 외부 유입 하루 2명 안팎 — 아직 불필요. 2026-10-27 재확인: 10/20 뒤 제출 0, 유입 하루 2 — 그대로 불필요. 2026-11-03: 유입 거의 0 — 불필요)

### 하지 않기로 한 것 (2026-10-06 운영자 결정)

다시 제안하지 말 것. 정책이 바뀌면 이 목록부터 고친다.

- **사업자 정보·주소 표기 안 함** — 푸터·명함·JSON-LD(주소가 필요한 `LocalBusiness` 대신 `Organization`)·llms.txt·칼럼 어디에도 넣지 않는다.
  `site.ts` 에 주소 필드도 두지 않는다.
- **`/guarantee/` 최저가 보상제 페이지 안 만듦** — 따로 정한 조건이 없다. "최저가 보상"은
  `site.guaranteeShort`(동일 조건 타사 견적서 대비) 문장으로만 쓴다.
- **상표 출원 안 함** — 2026-10-06 KIPRIS 확인 시 '대한유품정리' 동일·유사 출원/등록은 없었다.
- **도메인 이전 안 함** — `.xyz` 유지. 네이버 순위가 이 도메인에 잡혀 있다 (`docs/seo-naver.md`).
- **네이버 스마트플레이스 등록 안 함**

### 완료 — 유지할 때 알아둘 것

- `/cost/` 비용 범위 공개 + `priceRange` / `AggregateOffer` / `Offer` / `PriceSpecification` JSON-LD.
  표시 문자열(`range`)과 스키마용 숫자(`minPrice`/`maxPrice`)가 `pricing.ts` 에 나란히 있으니 **항상 같이 고칠 것**.
  `Offer` 는 `PriceTable` 을 실제로 렌더하는 페이지(`/cost/`, 지역 페이지)에서만 붙인다.
- 표기 금액은 전부 **부가세 별도** — `pricing.ts` 의 `vatIncluded`·`vatLabel`·`vatNote` 한 곳에서 관리한다.
  새로 금액을 적는 곳(칼럼 본문 포함)에도 부가세 별도임을 같이 적을 것.
- 비용 직답 문장 `priceAnswer()` — `/cost/`·지역·서비스 페이지·llms.txt 가 같은 문장을 쓴다. 가격을 고치면 `pricesAsOf` 기준일도 올릴 것.
- `SLACK_WEBHOOK_URL` Secret — Worker 에 등록됨. 9/13·10/2 실제 접수 경로로 Slack 도착 확인.
- 실제 현장 사진 — `src/assets/cases/` 가공본 + `src/data/cases.ts`
- 서울 25개 구, 경기 31개 시·군, 동·읍·면 1090쪽 (`src/data/districts.ts`, 2026-11-15 부터 동 페이지는 noindex)
