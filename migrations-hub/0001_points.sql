-- 허브 관제판 '주간 성적표' 공용 카운터 표 (2026-11-29). D1 hub_leads — 같은 운영자의 여러 브랜드 Worker 가 같이 쓴다.
-- 설계: 운영자 허브 저장소 docs/scorecard-design.md. 이 저장소가 공용 스키마를 맡는다(적용은 아래 명령, 운영자 요청 때만).
--   npx wrangler d1 migrations apply hub_leads --remote
--
-- **이름·연락처·주소·문의 글·IP·검색어는 넣지 않는다.** 허브는 D1 읽기 토큰으로 이 표를 읽는다.
-- 한 행 = 한 사건(상담 한 건, 웹훅 점검 한 번) 또는 하루 집계 한 줄.
CREATE TABLE IF NOT EXISTS points (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  ts      INTEGER NOT NULL,              -- 쓴 시각(ms)
  day     TEXT    NOT NULL,              -- KST YYYY-MM-DD. lead·webhook 은 그날, funnel·source·landing 은 집계 대상일
  brand   TEXT    NOT NULL,              -- 브랜드 키 (daehan, onnuri, chuckchuck …)
  site    TEXT    NOT NULL DEFAULT '',   -- 사이트 호스트 (온누리 서브도메인처럼 한 브랜드에 여럿일 때)
  kind    TEXT    NOT NULL,              -- lead | webhook | funnel | source | landing
  result  TEXT    NOT NULL DEFAULT '',   -- lead: consult|fail|test · webhook: alive|dead|unknown|config|exception
  label   TEXT    NOT NULL DEFAULT '',   -- lead: 상담 분야 이름 · webhook: Slack 응답 코드 · source: 유입 호스트 · landing: 들어온 페이지
  source  TEXT    NOT NULL DEFAULT '',   -- lead: 유입 범주 (naver|google|ai|direct|other, 모르면 '')
  page    TEXT    NOT NULL DEFAULT '',   -- lead: 신청 페이지 경로
  reason  TEXT    NOT NULL DEFAULT '',   -- lead(fail): 실패 까닭 코드
  photos  INTEGER NOT NULL DEFAULT 0,    -- lead: 사진 장 수
  value   INTEGER NOT NULL DEFAULT 0,    -- webhook: HTTP 상태 · source/landing: 방문자 수
  data    TEXT    NOT NULL DEFAULT ''    -- funnel: 하루 깔때기 숫자 JSON
);

CREATE INDEX IF NOT EXISTS points_brand_kind_day ON points (brand, kind, day);
