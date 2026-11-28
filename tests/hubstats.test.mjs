// 허브 성적표 카운터 (worker/hubstats.js, 공용 D1 hub_leads) 검사 — npm test. D1 과 Slack 은 가짜로 바꿔 끼운다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { checkWebhook, classifyWebhookReply, FUNNEL_FIELDS, KEEP_DAYS, writeFunnelDay, writeLead } from '../worker/hubstats.js';

/** 가짜 D1 — 실행된 문장(sql, 값)을 기록한다. INSERT 는 칸 이름으로 풀어 rows 에 넣는다 */
function fakeDb() {
  const executed = [];
  const rows = [];
  const record = (sql, values) => {
    executed.push({ sql, values });
    const m = sql.match(/^INSERT INTO points \(([^)]+)\)/);
    if (m) rows.push(Object.fromEntries(m[1].split(', ').map((c, i) => [c, values[i]])));
  };
  const db = {
    prepare: (sql) => ({ bind: (...values) => ({ sql, values, run: async () => record(sql, values) }) }),
    batch: async (stmts) => stmts.forEach((s) => record(s.sql, s.values)),
  };
  return { db, executed, rows };
}

const ctxOf = () => {
  const waits = [];
  return { waits, ctx: { waitUntil: (p) => waits.push(p) } };
};

test('스키마: 표의 칸이 코드가 쓰는 칸과 같다 (migrations-hub/0001_points.sql)', () => {
  const sql = readFileSync(new URL('../migrations-hub/0001_points.sql', import.meta.url), 'utf8');
  for (const col of ['ts', 'day', 'brand', 'site', 'kind', 'result', 'label', 'source', 'page', 'reason', 'photos', 'value', 'data']) {
    assert.match(sql, new RegExp(`\\n  ${col}\\s`), col);
  }
});

test('lead 행: 결과·분야·페이지·까닭·장 수만 — 번호·내용 칸은 없고, 응답 뒤로 미룬다', async () => {
  const { db, rows } = fakeDb();
  const { ctx, waits } = ctxOf();
  writeLead({ HUB_DB: db }, ctx, { result: 'consult', service: '유품정리', page: '/consult/', photos: 2 });
  writeLead({ HUB_DB: db }, ctx, { result: 'fail', page: '/', reason: 'slack-404' });
  assert.equal(waits.length, 2);
  await Promise.all(waits);
  assert.equal(rows[0].brand, 'daehan');
  assert.equal(rows[0].site, 'yupumjeongri.xyz');
  assert.equal(rows[0].kind, 'lead');
  assert.equal(rows[0].result, 'consult');
  assert.equal(rows[0].label, '유품정리');
  assert.equal(rows[0].page, '/consult/');
  assert.equal(rows[0].photos, 2);
  assert.match(rows[0].day, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(rows[1].reason, 'slack-404');
});

test('바인딩이 없으면(로컬·테스트) 아무것도 하지 않는다', async () => {
  const { ctx, waits } = ctxOf();
  writeLead({}, ctx, { result: 'consult' });
  assert.equal(waits.length, 0);
  await writeFunnelDay({}, { day: '2026-11-28', counts: {} });
});

test('쓰기가 실패해도 던지지 않는다 (상담 접수에 영향 없음)', async () => {
  const { ctx, waits } = ctxOf();
  const db = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error('d1 down'); } }) }) };
  writeLead({ HUB_DB: db }, ctx, { result: 'consult' });
  await Promise.all(waits);
});

test('웹훅 응답 판정: no_text·invalid_payload 는 살아 있음, no_service·404 는 끊김, 그 밖은 모름', () => {
  assert.equal(classifyWebhookReply(400, 'no_text').state, 'alive');
  assert.equal(classifyWebhookReply(400, 'invalid_payload').state, 'alive');
  assert.equal(classifyWebhookReply(404, 'no_service').state, 'dead');
  assert.equal(classifyWebhookReply(410, 'whatever').state, 'dead');
  assert.equal(classifyWebhookReply(500, 'oops').state, 'unknown');
});

test('웹훅 점검: 빈 JSON 하나만 보내 메시지를 만들지 않고, 결과를 webhook 행으로', async () => {
  const sent = [];
  const { db, rows } = fakeDb();
  const result = await checkWebhook({ HUB_DB: db, SLACK_WEBHOOK_URL: 'https://hooks.example.test/x' }, async (url, init) => {
    sent.push(init.body);
    return new Response('no_text', { status: 400 });
  });
  assert.deepEqual(sent, ['{}']);
  assert.equal(result.state, 'alive');
  assert.equal(rows[0].kind, 'webhook');
  assert.equal(rows[0].result, 'alive');
  assert.equal(rows[0].label, 'no_text');
  assert.equal(rows[0].value, 400);
});

test('웹훅 점검: Secret 이 없으면 config, 연결 실패는 exception', async () => {
  const { db } = fakeDb();
  assert.equal((await checkWebhook({ HUB_DB: db })).state, 'config');
  const thrower = async () => {
    throw new Error('net');
  };
  assert.equal((await checkWebhook({ HUB_DB: db, SLACK_WEBHOOK_URL: 'https://hooks.example.test/x' }, thrower)).state, 'exception');
});

test('하루 깔때기: 그날 행을 지우고 다시 쓰며, 오래된 행을 지우고, funnel JSON 과 유입·페이지 상위 행을 쓴다', async () => {
  const { db, executed, rows } = fakeDb();
  await writeFunnelDay(
    { HUB_DB: db },
    {
      day: '2026-11-28',
      counts: { visitors: 5, naver: 2, consult: 1 },
      sources: [{ ref: 'search.naver.com', n: 2 }],
      landings: [{ path: '/cost/', n: 3 }],
    },
  );
  assert.match(executed[0].sql, /^DELETE FROM points WHERE brand = \? AND day = \? AND kind IN/);
  assert.deepEqual(executed[0].values, ['daehan', '2026-11-28']);
  assert.match(executed[1].sql, /^DELETE FROM points WHERE brand = \? AND day < \?/);
  assert.equal(KEEP_DAYS, 400);
  assert.equal(rows.length, 3);
  const funnel = JSON.parse(rows[0].data);
  assert.deepEqual(Object.keys(funnel), FUNNEL_FIELDS);
  assert.equal(funnel.consult, 1);
  assert.equal(rows[0].day, '2026-11-28');
  assert.deepEqual([rows[1].kind, rows[1].label, rows[1].value], ['source', 'search.naver.com', 2]);
  assert.deepEqual([rows[2].kind, rows[2].label, rows[2].value], ['landing', '/cost/', 3]);
});

test('조작된 폼 값: 상담 분야·신청 페이지에 번호·메일 같은 값이 오면 비운다', async () => {
  const { db, rows } = fakeDb();
  const { ctx, waits } = ctxOf();
  writeLead({ HUB_DB: db }, ctx, { result: 'consult', service: '010-1234-5678', page: '/010-1234-5678' });
  writeLead({ HUB_DB: db }, ctx, { result: 'consult', service: 'a@b.com', page: '/column/30pyeong-apateu-yupumjeongri-biyong/' });
  await Promise.all(waits);
  assert.equal(rows[0].label, '');
  assert.equal(rows[0].page, '');
  assert.equal(rows[1].label, '');
  assert.equal(rows[1].page, '/column/30pyeong-apateu-yupumjeongri-biyong/');
});

test('준비 단계에서 던져도(바인딩 이상) 상담 흐름으로 번지지 않는다', () => {
  const { ctx } = ctxOf();
  writeLead({ HUB_DB: { prepare: () => { throw new Error('bad'); } } }, ctx, { result: 'consult' });
});

test('웹훅 점검: 기록 쓰기가 실패해도 결과를 돌려주고 던지지 않는다', async () => {
  const db = { prepare: () => ({ bind: () => ({ run: async () => { throw new Error('no such table'); } }) }) };
  const r = await checkWebhook({ HUB_DB: db, SLACK_WEBHOOK_URL: 'https://hooks.example.test/x' }, async () => new Response('no_text', { status: 400 }));
  assert.equal(r.state, 'alive');
});
