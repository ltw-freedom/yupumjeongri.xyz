-- 검색·AI 봇 실제 방문 일별 집계 (worker/botlog.js 가 씀). IP·전체 UA·실제 경로·쿼리스트링은 넣지 않는다.
-- 콘솔(서치어드바이저·Search Console) 없이 "Yeti 가 오는가, 어느 종류 페이지를 긁는가, 몇 번 404·301 을 받는가"를 보려는 표.
-- 행 하나 = (KST 날짜, 봇, Cloudflare 검증 분류, 경로 종류, 상태코드) 조합. 요청마다 hits 가 1씩 오른다.
--
-- 적용 (사람이 한 번):
--   npx wrangler d1 migrations apply yupumjeongri-funnel --remote
-- 적용 전에도 Worker 는 INSERT 실패를 삼키므로 사이트는 그대로 돈다(집계만 비어 있다).
--
-- 조회 예시:
--   봇별 일별 합계
--   npx wrangler d1 execute yupumjeongri-funnel --remote --command "SELECT day, bot, SUM(hits) AS hits FROM bot_hits GROUP BY 1, 2 ORDER BY 1 DESC, 3 DESC"
--   네이버 Yeti 가 어떤 종류 페이지를 어떤 상태로 받았나 (최근 14일)
--   npx wrangler d1 execute yupumjeongri-funnel --remote --command "SELECT kind, status, SUM(hits) AS hits FROM bot_hits WHERE bot = 'Yeti' AND day >= date('now', '+9 hours', '-14 days') GROUP BY 1, 2 ORDER BY 3 DESC"
--   UA 만 흉내 낸 가짜 봇 가려내기 — verified 가 빈 값이면 Cloudflare 가 검증하지 못한 요청
--   npx wrangler d1 execute yupumjeongri-funnel --remote --command "SELECT bot, verified, SUM(hits) FROM bot_hits GROUP BY 1, 2 ORDER BY 1"
CREATE TABLE IF NOT EXISTS bot_hits (
  day      TEXT    NOT NULL,             -- KST 날짜 YYYY-MM-DD (funnel.js kstDay)
  bot      TEXT    NOT NULL,             -- Yeti | Daumoa | Googlebot | GPTBot … (botlog.js BOTS)
  verified TEXT    NOT NULL DEFAULT '',  -- request.cf.verifiedBotCategory, 검증 못 하면 빈 값
  kind     TEXT    NOT NULL,             -- robots | sitemap | llms | rss | home | cost | … | area-dong | other
  status   INTEGER NOT NULL,             -- 응답 상태코드 (200, 301, 308, 404 …)
  hits     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, bot, verified, kind, status)
);
