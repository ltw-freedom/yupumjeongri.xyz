// 상담 폼 현장 사진 (worker/photos.js, functions/api/consult.js) 검사 — npm test (node --test, 의존성 없음, Node 20 이상)
// 실제 KV·Slack 에는 닿지 않는다. KV 는 아래 FakeKV, Slack 은 globalThis.fetch 를 바꿔 끼워 본다.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ALLOWED_TYPES,
  MAX_PHOTO_BYTES,
  MAX_PHOTOS,
  MAX_REQUEST_BYTES,
  PHOTO_TTL_DAYS,
  readCappedBody,
  servePhoto,
  sniffImage,
  storePhotos,
} from '../worker/photos.js';
import { onRequestPost } from '../functions/api/consult.js';
import { recordConsult, weeklyText } from '../worker/funnel.js';

class FakeKV {
  constructor() {
    this.map = new Map();
    this.puts = [];
    this.deleted = [];
  }
  async put(key, value, opts) {
    this.puts.push({ key, opts });
    this.map.set(key, { value: new Uint8Array(value), metadata: opts?.metadata ?? null });
  }
  async getWithMetadata(key) {
    const hit = this.map.get(key);
    if (!hit) return { value: null, metadata: null };
    return { value: new Blob([hit.value]).stream(), metadata: hit.metadata };
  }
  async delete(key) {
    this.deleted.push(key);
    this.map.delete(key);
  }
}

const bytes = (...head) => new Uint8Array([...head, ...new Array(64).fill(0)]);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'));
const HEIC = bytes(0, 0, 0, 0x18, ...ascii('ftypheic'));
const HEIF = bytes(0, 0, 0, 0x18, ...ascii('ftypmif1'));
const HTML = new TextEncoder().encode('<html><script>alert(1)</script></html>');
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const GIF = bytes(...ascii('GIF89a'));

const file = (data, name = 'a.jpg', type = 'image/jpeg') => new File([data], name, { type });

// --- 형식 판정 -------------------------------------------------------------

test('매직 바이트로 jpeg·png·webp·heic·heif 만 알아본다', () => {
  assert.equal(sniffImage(JPEG), 'image/jpeg');
  assert.equal(sniffImage(PNG), 'image/png');
  assert.equal(sniffImage(WEBP), 'image/webp');
  assert.equal(sniffImage(HEIC), 'image/heic');
  assert.equal(sniffImage(HEIF), 'image/heif');
  for (const bad of [HTML, SVG, GIF, new Uint8Array(0), new Uint8Array([0xff, 0xd8])]) assert.equal(sniffImage(bad), '');
  for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']) assert.ok(ALLOWED_TYPES.has(t));
  assert.equal(ALLOWED_TYPES.size, 5);
});

// --- 저장 ------------------------------------------------------------------

test('저장: 허용 형식만 30일 TTL 로, 형식 표시(MIME·이름)는 믿지 않는다', async () => {
  const kv = new FakeKV();
  const r = await storePhotos({ PHOTOS: kv }, [
    file(JPEG),
    file(HTML, 'evil.jpg', 'image/jpeg'), // 이름·MIME 은 jpg 지만 내용은 HTML
    file(SVG, 'x.svg', 'image/svg+xml'),
    file(PNG, 'b.png', 'application/octet-stream'), // MIME 이 틀려도 내용이 PNG 면 받는다
  ]);
  assert.equal(r.stored.length, 2);
  assert.equal(r.failed, 2);
  assert.equal(r.dropped, 0);
  assert.deepEqual(r.types, ['image/jpeg', 'image/png']); // stored 와 같은 순서 — Slack image 블록 여부를 가른다
  for (const id of r.stored) assert.match(id, /^[0-9a-f]{32}$/); // 128비트
  assert.notEqual(r.stored[0], r.stored[1]);
  for (const p of kv.puts) assert.equal(p.opts.expirationTtl, PHOTO_TTL_DAYS * 86400);
  assert.deepEqual(kv.puts.map((p) => p.opts.metadata.type).sort(), ['image/jpeg', 'image/png']);
});

test('저장: 장당 5MB 초과는 빼고, 5장을 넘으면 넘는 만큼 뺀다', async () => {
  const kv = new FakeKV();
  const big = new Uint8Array(MAX_PHOTO_BYTES + 1);
  big.set(JPEG.subarray(0, 4));
  const files = [file(big), ...Array.from({ length: 6 }, () => file(JPEG))];
  const r = await storePhotos({ PHOTOS: kv }, files);
  assert.equal(MAX_PHOTOS, 5);
  assert.equal(r.stored.length, 4); // 앞 5장 중 큰 1장 실패
  assert.equal(r.failed, 1);
  assert.equal(r.dropped, 2);
});

test('저장: KV 바인딩이 없거나 put 이 실패해도 던지지 않고 실패 수만 센다', async () => {
  const none = await storePhotos({}, [file(JPEG), file(PNG)]);
  assert.deepEqual(none, { stored: [], types: [], failed: 2, dropped: 0 });
  const kv = new FakeKV();
  kv.put = async () => {
    throw new Error('KV put failed: 429 daily limit');
  };
  const r = await storePhotos({ PHOTOS: kv }, [file(JPEG)]);
  assert.deepEqual(r, { stored: [], types: [], failed: 1, dropped: 0 });
});

test('본문 상한: 넘으면 null, 안 넘으면 그대로', async () => {
  const small = new Request('https://x.test/', { method: 'POST', body: 'a=1' });
  assert.equal(new TextDecoder().decode(await readCappedBody(small, 10)), 'a=1');
  const declared = new Request('https://x.test/', { method: 'POST', body: 'a', headers: { 'Content-Length': String(MAX_REQUEST_BYTES + 1) } });
  assert.equal(await readCappedBody(declared), null);
  const streamed = new Request('https://x.test/', { method: 'POST', body: new Uint8Array(20) });
  assert.equal(await readCappedBody(streamed, 10), null);
});

// --- 열람 ------------------------------------------------------------------

async function stored(kv, data, type) {
  const id = 'a'.repeat(32);
  kv.map.set(id, { value: data, metadata: type ? { type } : null });
  return id;
}

const get = (id, method = 'GET') => new Request(`https://yupumjeongri.xyz/api/photo/${id}`, { method });

function assertSafeHeaders(res) {
  assert.equal(res.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(res.headers.get('Content-Security-Policy'), "default-src 'none'; sandbox");
  assert.match(res.headers.get('X-Robots-Tag'), /noindex/);
  assert.match(res.headers.get('Cache-Control'), /^private/);
}

test('열람: 허용 형식은 그 형식 그대로 inline, 머리글 붙음', async () => {
  const kv = new FakeKV();
  const id = await stored(kv, JPEG, 'image/jpeg');
  const res = await servePhoto(get(id), { PHOTOS: kv }, `/api/photo/${id}`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'image/jpeg');
  assert.equal(res.headers.get('Content-Disposition'), 'inline');
  assertSafeHeaders(res);
  assert.deepEqual(new Uint8Array(await res.arrayBuffer()), JPEG);
});

test('열람: 허용 목록 밖 형식(메타데이터가 이상한 경우)은 octet-stream + attachment', async () => {
  for (const type of ['text/html', 'image/svg+xml', undefined]) {
    const kv = new FakeKV();
    const id = await stored(kv, HTML, type);
    const res = await servePhoto(get(id), { PHOTOS: kv }, `/api/photo/${id}`);
    assert.equal(res.headers.get('Content-Type'), 'application/octet-stream');
    assert.equal(res.headers.get('Content-Disposition'), 'attachment');
    assertSafeHeaders(res);
  }
});

test('열람: 형식이 틀린 주소·없는 사진은 404, POST 는 405 — 모두 같은 보안 머리글', async () => {
  const kv = new FakeKV();
  for (const path of ['/api/photo/../secret', '/api/photo/ABC', `/api/photo/${'b'.repeat(32)}`]) {
    const res = await servePhoto(get('x'), { PHOTOS: kv }, path);
    assert.equal(res.status, 404);
    assertSafeHeaders(res);
  }
  const res = await servePhoto(get('x', 'POST'), { PHOTOS: kv }, `/api/photo/${'a'.repeat(32)}`);
  assert.equal(res.status, 405);
  assertSafeHeaders(res);
});

// --- 상담 접수 전체 흐름 ----------------------------------------------------

let slackCalls;
const realFetch = globalThis.fetch;
beforeEach(() => {
  slackCalls = [];
  globalThis.fetch = async (url, init) => {
    slackCalls.push({ url, body: JSON.parse(init.body) });
    return new Response('ok', { status: 200 });
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function consultRequest(fields, photos = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  for (const p of photos) fd.append('photos', p);
  return new Request('https://yupumjeongri.xyz/api/consult', { method: 'POST', body: fd });
}

async function post(req, env) {
  const calls = { consult: [], fail: [] };
  const res = await onRequestPost({
    request: req,
    env: { SLACK_WEBHOOK_URL: 'https://hooks.example.test/x', ...env },
    onConsult: (...a) => calls.consult.push(a),
    onConsultFail: (...a) => calls.fail.push(a),
  });
  return { res, calls, location: res.headers.get('Location') };
}

const slackText = () => JSON.stringify(slackCalls.at(-1)?.body ?? {});

test('접수: 사진 2장 저장 + 형식 밖 1장은 빼고 접수는 계속, Slack 에 링크와 30일 안내', async () => {
  const kv = new FakeKV();
  const { location, calls } = await post(
    consultRequest({ phone: '01012345678', page: '/consult/' }, [file(JPEG), file(HTML, 'x.jpg'), file(PNG, 'y.png', 'image/png')]),
    { PHOTOS: kv },
  );
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?photos=2&photo_failed=1');
  assert.equal(kv.map.size, 2);
  const text = slackText();
  for (const id of kv.map.keys()) assert.ok(text.includes(`https://yupumjeongri.xyz/api/photo/${id}`));
  assert.ok(text.includes('30일 뒤 자동 삭제'));
  assert.ok(text.includes('사진 1장은 저장하지 못했습니다'));
  assert.deepEqual(calls.consult, [['/consult/', 2]]);
});

test('접수: 사진 없이 보낸 신청은 전과 같다 (urlencoded, KV 쓰기 없음)', async () => {
  const kv = new FakeKV();
  const req = new Request('https://yupumjeongri.xyz/api/consult', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'phone=010-1234-5678&region=%EA%B4%80%EC%95%85',
  });
  const { location, calls } = await post(req, { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/');
  assert.equal(kv.puts.length, 0);
  assert.ok(!slackText().includes('현장 사진'));
  assert.deepEqual(calls.consult, [['', 0]]);
});

test('접수: KV 가 없어도 접수는 Slack 으로 가고 실패 장 수를 적는다', async () => {
  const { location } = await post(consultRequest({ phone: '01012345678' }, [file(JPEG)]), {});
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?photos=0&photo_failed=1');
  assert.equal(slackCalls.length, 1);
  assert.ok(slackText().includes('사진 1장은 저장하지 못했습니다'));
});

test('접수: 번호가 틀린 신청은 사진을 저장하지 않는다', async () => {
  const kv = new FakeKV();
  const { location } = await post(consultRequest({ phone: '0101234' }, [file(JPEG)]), { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/?error=phone');
  assert.equal(kv.puts.length, 0);
  assert.equal(slackCalls.length, 0);
});

test('접수: Slack 전송이 실패하면 저장한 사진을 지운다', async () => {
  globalThis.fetch = async () => new Response('no', { status: 404 });
  const kv = new FakeKV();
  const { location, calls } = await post(consultRequest({ phone: '01012345678' }, [file(JPEG)]), { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/?error=send');
  assert.equal(kv.map.size, 0);
  assert.equal(kv.deleted.length, 1);
  assert.equal(calls.fail.length, 1);
});

test('접수: 본문이 상한을 넘으면 파싱하지 않고 되돌린다', async () => {
  const req = new Request('https://yupumjeongri.xyz/api/consult', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data; boundary=x', 'Content-Length': String(MAX_REQUEST_BYTES + 1) },
    body: 'x',
  });
  const { location } = await post(req, { PHOTOS: new FakeKV() });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/?error=toolarge');
  assert.equal(slackCalls.length, 0);
});

test('덧붙이기: 글 없이 사진만 보내도 받는다', async () => {
  const kv = new FakeKV();
  const { location, calls } = await post(consultRequest({ phone: '010-1234-5678', followup: '1' }, [file(JPEG)]), { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?added=1&photos=1');
  assert.equal(kv.map.size, 1);
  assert.equal(calls.consult.length, 0); // 덧붙이기는 새 접수로 세지 않는다
});

// --- 깔때기 ----------------------------------------------------------------

test('깔때기: 사진 장 수만 consult 행의 ref 에 photo-N 으로', async () => {
  const rows = [];
  const env = {
    FUNNEL_DB: {
      prepare: () => ({ bind: (...v) => ({ run: async () => rows.push(v) }) }),
    },
  };
  const waits = [];
  const ctx = { waitUntil: (p) => waits.push(p) };
  const req = new Request('https://yupumjeongri.xyz/api/consult');
  recordConsult(env, ctx, req, '/consult/', 3);
  recordConsult(env, ctx, req, '/consult/');
  await Promise.all(waits);
  assert.equal(rows[0][2], 'consult');
  assert.equal(rows[0][5], 'photo-3');
  assert.equal(rows[1][5], '');
  const text = weeklyText({ startDay: '2026-11-23', endDay: '2026-11-29', counts: { consult: 2, consult_photo: 1, photos: 3 }, fails: [], sources: [], landings: [], queries: [], prev: {} });
  assert.ok(text.includes('현장 사진을 함께 보낸 접수 1건 (사진 3장'));
});
