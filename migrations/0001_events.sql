-- 방문·상담 깔때기 이벤트. 개인정보(번호·IP)는 넣지 않는다.
-- sid 는 브라우저 탭마다 새로 만드는 임의 값이라 사람을 특정하지 못한다 — 같은 방문을 묶어 세는 용도.
CREATE TABLE IF NOT EXISTS events (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  ts     INTEGER NOT NULL,          -- epoch ms
  day    TEXT    NOT NULL,          -- KST 날짜 YYYY-MM-DD
  type   TEXT    NOT NULL,          -- view | focus | invalid | submit | consult | calc | cta
  path   TEXT    NOT NULL DEFAULT '',
  sid    TEXT    NOT NULL DEFAULT '',
  ref    TEXT    NOT NULL DEFAULT '', -- 유입 출처 호스트 (m.search.naver.com 등), 내부 이동은 빈 값
  query  TEXT    NOT NULL DEFAULT '', -- 검색어 (리퍼러에 실려 올 때만)
  device TEXT    NOT NULL DEFAULT ''  -- mobile | desktop
);
CREATE INDEX IF NOT EXISTS events_day_type ON events (day, type);
