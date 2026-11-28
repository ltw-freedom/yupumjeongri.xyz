// 허브 성적표 카운터 (worker/hubstats.js, 2026-11-28) 검사 — npm test. Analytics Engine 과 Slack 은 가짜로 바꿔 끼운다.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkWebhook, classifyWebhookReply, FUNNEL_FIELDS, writeFunnelDay, writeLead } from '../worker/hubstats.js';

const fakeEnv = (extra = {}) => {
  const points = [];
  return { points, env: { HUB_LEADS: { writeDataPoint: (p) => points.push(p) }, ...extra } };
};

test('lead 점: 브랜드 인덱스, 결과·분야·페이지·까닭과 장 수만 — 번호·내용 칸은 없다', () => {
  const { env, points } = fakeEnv();
  writeLead(env, { result: 'consult', service: '유품정리', page: '/consult/', photos: 2 });
  writeLead(env, { result: 'fail', page: '/', reason: 'slack-404' });
  assert.deepEqual(points[0], {
    indexes: ['daehan'],
    blobs: ['lead', 'yupumjeongri.xyz', 'consult', '유품정리', '', '/consult/', ''],
    doubles: [1, 2],
  });
  assert.equal(points[1].blobs[6], 'slack-404');
});

test('바인딩이 없으면(로컬·테스트) 아무것도 하지 않는다', () => {
  writeLead({}, { result: 'consult' });
});

test('웹훅 응답 판정: no_text·invalid_payload 는 살아 있음, no_service·404 는 끊김, 그 밖은 모름', () => {
  assert.equal(classifyWebhookReply(400, 'no_text').state, 'alive');
  assert.equal(classifyWebhookReply(400, 'invalid_payload').state, 'alive');
  assert.equal(classifyWebhookReply(404, 'no_service').state, 'dead');
  assert.equal(classifyWebhookReply(410, 'whatever').state, 'dead');
  assert.equal(classifyWebhookReply(500, 'oops').state, 'unknown');
});

test('웹훅 점검: 빈 JSON 하나만 보내 메시지를 만들지 않고, 결과를 webhook 점으로', async () => {
  const sent = [];
  const { env, points } = fakeEnv({ SLACK_WEBHOOK_URL: 'https://hooks.example.test/x' });
  const result = await checkWebhook(env, async (url, init) => {
    sent.push(init.body);
    return new Response('no_text', { status: 400 });
  });
  assert.deepEqual(sent, ['{}']);
  assert.equal(result.state, 'alive');
  assert.deepEqual(points[0].blobs, ['webhook', 'yupumjeongri.xyz', 'alive', 'no_text']);
  assert.deepEqual(points[0].doubles, [400]);
});

test('웹훅 점검: Secret 이 없으면 config, 연결 실패는 exception', async () => {
  const a = fakeEnv();
  assert.equal((await checkWebhook(a.env)).state, 'config');
  const b = fakeEnv({ SLACK_WEBHOOK_URL: 'https://hooks.example.test/x' });
  assert.equal((await checkWebhook(b.env, async () => { throw new Error('net'); })).state, 'exception');
});

test('하루 깔때기: funnel 점 하나(FUNNEL_FIELDS 순서)와 유입·페이지 상위 점', () => {
  const { env, points } = fakeEnv();
  writeFunnelDay(env, {
    day: '2026-11-28',
    counts: { visitors: 5, naver: 2, consult: 1 },
    sources: [{ ref: 'search.naver.com', n: 2 }],
    landings: [{ path: '/cost/', n: 3 }],
  });
  assert.equal(points.length, 3);
  assert.deepEqual(points[0].blobs, ['funnel', 'yupumjeongri.xyz', '2026-11-28']);
  assert.equal(points[0].doubles.length, FUNNEL_FIELDS.length);
  assert.equal(points[0].doubles[FUNNEL_FIELDS.indexOf('consult')], 1);
  assert.deepEqual(points[1].blobs, ['source', 'yupumjeongri.xyz', '2026-11-28', 'search.naver.com']);
  assert.deepEqual(points[2].blobs, ['landing', 'yupumjeongri.xyz', '2026-11-28', '/cost/']);
});
