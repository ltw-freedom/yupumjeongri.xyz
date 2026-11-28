// 상담 Slack 알림 모양 (functions/api/consult.js, 2026-11-27 브랜드 공통 형식) 검사 — npm test (node --test, 의존성 없음)
// 실제 Slack·KV 에는 닿지 않는다. Slack 은 globalThis.fetch 를 바꿔 끼우고, KV 는 아래 FakeKV 다. 값은 모두 시험용 가짜다.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { consultSlackPayload, kakaoMapUrl, onRequestPost, SLACK_IMAGE_DELAYS, slackEscape } from '../functions/api/consult.js';

class FakeKV {
  constructor() {
    this.map = new Map();
    this.deleted = [];
  }
  async put(key, value, opts) {
    this.map.set(key, { value, metadata: opts?.metadata ?? null });
  }
  async delete(key) {
    this.deleted.push(key);
    this.map.delete(key);
  }
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(32).fill(0)]);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));
const HEIC = new Uint8Array([0, 0, 0, 0x18, ...ascii('ftypheic'), ...new Array(32).fill(0)]);
const file = (data, name = 'a.jpg') => new File([data], name, { type: 'image/jpeg' });

/** 시험용 상담 한 건 — consultSlackPayload 에 바로 넣는 모양 */
const sample = (over = {}) => ({
  followup: false,
  honeypot: false,
  phone: '010-1234-5678',
  type: '유품정리',
  address: '서울 노원구 월계동',
  addressNote: '',
  housing: '투룸 · 빌라',
  volume: '보통',
  access: '엘리베이터 없음 · 3층 이상',
  special: '아니요',
  estimate: '250만~350만원 (부가세 별도)',
  message: '다음 달 말까지 집을 비워야 합니다.',
  page: '/consult/',
  photos: [
    { url: 'https://yupumjeongri.xyz/api/photo/' + 'a'.repeat(32), type: 'image/jpeg' },
    { url: 'https://yupumjeongri.xyz/api/photo/' + 'b'.repeat(32), type: 'image/jpeg' },
  ],
  photoFailed: 0,
  skippedByBrowser: 0,
  ...over,
});

const types = (payload) => payload.blocks.map((b) => b.type);
const itemsText = (payload) => payload.blocks[2].text.text;
const contextText = (payload) => payload.blocks.at(-1).elements.map((e) => e.text).join('\n');

// --- Slack 바꿔 끼우기 ------------------------------------------------------

let slackCalls;
let replies;
/** 기다린 시간(ms) — 실제로 기다리지 않고 기록만 한다(onRequestPost 의 context.sleep 주입) */
let slept;
/** 기다림과 전송의 순서 — 'wait 3000', 'send' … */
let order;
const realFetch = globalThis.fetch;
beforeEach(() => {
  slackCalls = [];
  replies = [];
  slept = [];
  order = [];
  globalThis.fetch = async (url, init) => {
    slackCalls.push({ url, body: JSON.parse(init.body) });
    order.push('send');
    const r = replies.shift() ?? { status: 200, body: 'ok' };
    return new Response(r.body, { status: r.status });
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

async function submit(fields, photos = [], env = {}) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  for (const p of photos) fd.append('photos', p);
  const calls = { consult: [], fail: [], test: [] };
  const res = await onRequestPost({
    request: new Request('https://yupumjeongri.xyz/api/consult', { method: 'POST', body: fd }),
    env: { SLACK_WEBHOOK_URL: 'https://hooks.example.test/x', ...env },
    onConsult: (...a) => calls.consult.push(a),
    onConsultFail: (...a) => calls.fail.push(a),
    onTest: (...a) => calls.test.push(a),
    sleep: async (ms) => {
      slept.push(ms);
      order.push(`wait ${ms}`);
    },
  });
  return { location: res.headers.get('Location'), calls, body: slackCalls.at(-1)?.body };
}

// --- 모양 ------------------------------------------------------------------

test('모양: 머리글 → <!channel> → 한 줄 한 항목 section → 사진 image 블록 → context, fields 없음', () => {
  const p = consultSlackPayload(sample());
  assert.deepEqual(types(p), ['header', 'section', 'section', 'image', 'image', 'context']);
  assert.deepEqual(p.blocks[0], { type: 'header', text: { type: 'plain_text', text: '새 상담 신청이 들어왔어요', emoji: false } });
  assert.deepEqual(p.blocks[1], { type: 'section', text: { type: 'mrkdwn', text: '<!channel>' } });
  for (const b of p.blocks) assert.equal(b.fields, undefined);
  assert.ok(p.blocks.length <= 50);
});

test('모양: 항목 순서와 라벨 — 이름 줄은 없고 작업희망일은 미지정', () => {
  const lines = itemsText(consultSlackPayload(sample())).split('\n');
  assert.deepEqual(
    lines.map((l) => l.match(/^\*(.+?):\*/)[1]),
    ['상담 분야', '작업희망일', '연락처', '주소', '현장 정보', '문의 내용', '화면에 보여준 예상 비용'],
  );
  assert.equal(lines[0], '*상담 분야:* 유품정리');
  assert.equal(lines[1], '*작업희망일:* 미지정');
  assert.equal(lines[2], '*연락처:* 010-1234-5678');
  assert.equal(lines[4], '*현장 정보:* 투룸 · 빌라 · 짐 보통 · 엘리베이터 없음 · 3층 이상 · 특수청소 아니요');
  assert.ok(!itemsText(consultSlackPayload(sample())).includes('*이름:*'));
});

test('모양: 고른 값이 없으면 현장 정보·문의 내용·예상 비용 줄을 빼고, 분야·주소는 미지정·미입력', () => {
  const p = consultSlackPayload(
    sample({ type: '', address: '', housing: '', volume: '', access: '', special: '', estimate: '', message: '' }),
  );
  assert.equal(itemsText(p), '*상담 분야:* 미지정\n*작업희망일:* 미지정\n*연락처:* 010-1234-5678\n*주소:* 미입력');
  assert.ok(!JSON.stringify(p).includes('map.kakao.com'));
});

test('복사용 text: 머리글 다음 줄부터 라벨: 값, 링크 없이, 사진은 빈 줄 뒤 장 수와 주소', () => {
  const p = consultSlackPayload(sample());
  assert.equal(
    p.text,
    [
      '새 상담 신청이 들어왔어요',
      '상담 분야: 유품정리',
      '작업희망일: 미지정',
      '연락처: 010-1234-5678',
      '주소: 서울 노원구 월계동',
      '현장 정보: 투룸 · 빌라 · 짐 보통 · 엘리베이터 없음 · 3층 이상 · 특수청소 아니요',
      '문의 내용: 다음 달 말까지 집을 비워야 합니다.',
      '화면에 보여준 예상 비용: 250만~350만원 (부가세 별도)',
      '',
      '현장 사진 2장',
      'https://yupumjeongri.xyz/api/photo/' + 'a'.repeat(32),
      'https://yupumjeongri.xyz/api/photo/' + 'b'.repeat(32),
    ].join('\n'),
  );
  assert.ok(!p.text.includes('<'));
});

// --- 연락처·주소·이스케이프 ------------------------------------------------

test('연락처: 어떤 표기로 와도 하이픈 평문, tel: 링크는 만들지 않는다', async () => {
  for (const raw of ['01012345678', '010 1234 5678', '+82 10-1234-5678']) {
    const { body } = await submit({ phone: raw });
    assert.ok(body.blocks[2].text.text.includes('*연락처:* 010-1234-5678'), raw);
    assert.ok(body.text.includes('연락처: 010-1234-5678'));
    assert.ok(!JSON.stringify(body).includes('tel:'));
  }
  const { body } = await submit({ phone: '0111234567' }); // 10자리
  assert.ok(body.text.includes('연락처: 011-123-4567'));
});

test('주소: 카카오맵 링크 API 로 감싸고 주소 글자를 encodeURIComponent 로 넣는다', () => {
  const line = itemsText(consultSlackPayload(sample())).split('\n')[3];
  assert.equal(
    line,
    '*주소:* <https://map.kakao.com/link/search/%EC%84%9C%EC%9A%B8%20%EB%85%B8%EC%9B%90%EA%B5%AC%20%EC%9B%94%EA%B3%84%EB%8F%99|서울 노원구 월계동>',
  );
  assert.equal(kakaoMapUrl(' 성남시 분당구 '), 'https://map.kakao.com/link/search/%EC%84%B1%EB%82%A8%EC%8B%9C%20%EB%B6%84%EB%8B%B9%EA%B5%AC');
  // 링크 꾸밈을 깨는 글자도 주소 안에서는 인코딩된다
  assert.equal(kakaoMapUrl('a|b>c&d'), 'https://map.kakao.com/link/search/a%7Cb%3Ec%26d');
});

test('주소: 지역 칸이 비면 빠른 상담 폼의 페이지 지역명을 쓰고 (신청 페이지 기준)을 링크 밖에 붙인다', async () => {
  const { body } = await submit({ phone: '010-1234-5678', regionHint: '서울 마포구', page: '/area/seoul/mapo/' });
  const line = body.blocks[2].text.text.split('\n')[3];
  assert.equal(line, `*주소:* <${kakaoMapUrl('서울 마포구')}|서울 마포구> (신청 페이지 기준)`);
  assert.ok(body.text.endsWith('\n주소: 서울 마포구 (신청 페이지 기준)'));
  assert.ok(contextText(body).includes('신청 페이지 /area/seoul/mapo/'));
  // 지역 칸을 적었으면 그 값이 먼저다
  const typed = await submit({ phone: '010-1234-5678', region: '서울 관악구', regionHint: '서울 마포구' });
  assert.ok(typed.body.text.endsWith('\n주소: 서울 관악구'));
});

test('이스케이프: 입력 안의 <!channel>·링크 꾸밈·& 는 멘션·링크로 먹지 않는다 (본문·text 모두)', () => {
  const evil = '<!channel> <https://evil.test|여기> & 끝';
  const p = consultSlackPayload(sample({ message: evil, address: '노원구 <!here>', type: '<@U123>' }));
  const json = JSON.stringify(p);
  assert.equal(json.split('<!channel>').length - 1, 1); // 둘째 블록의 멘션 하나뿐
  assert.ok(!json.includes('<!here>'));
  assert.ok(!json.includes('<@U123>'));
  assert.ok(!json.includes('<https://evil.test'));
  assert.ok(itemsText(p).includes('*문의 내용:* &lt;!channel&gt; &lt;https://evil.test|여기&gt; &amp; 끝'));
  assert.ok(itemsText(p).includes(`*주소:* <${kakaoMapUrl('노원구 <!here>')}|노원구 &lt;!here&gt;>`));
  assert.ok(p.text.includes('문의 내용: &lt;!channel&gt; &lt;https://evil.test|여기&gt; &amp; 끝'));
  assert.equal(slackEscape('a&<b>'), 'a&amp;&lt;b&gt;');
});

test('글자 수: 긴 문의 내용도 section 하나 3,000자 안으로 나누고 &amp; 를 가르지 않는다, 내용은 자르지 않는다', () => {
  const message = '&'.repeat(2000); // 이스케이프하면 10,000자
  const p = consultSlackPayload(sample({ message }));
  const sections = p.blocks.filter((b) => b.type === 'section').slice(1);
  assert.ok(sections.length >= 4);
  for (const s of sections) {
    assert.ok(s.text.text.length <= 3000, String(s.text.text.length));
    assert.doesNotMatch(s.text.text, /&(?!amp;|lt;|gt;)/);
  }
  const all = sections.map((s) => s.text.text).join('');
  assert.equal(all.split('&amp;').length - 1, 2000);
  assert.ok(p.blocks.length <= 50);
});

// --- 사진 ------------------------------------------------------------------

test('사진: JPEG·PNG 는 image 블록(제목 i/n), HEIC·WebP 는 그 자리에 링크 한 줄', () => {
  const url = (c) => 'https://yupumjeongri.xyz/api/photo/' + c.repeat(32);
  const p = consultSlackPayload(
    sample({
      photos: [
        { url: url('a'), type: 'image/jpeg' },
        { url: url('b'), type: 'image/heic' },
        { url: url('c'), type: 'image/webp' },
        { url: url('d'), type: 'image/png' },
      ],
    }),
  );
  assert.deepEqual(types(p), ['header', 'section', 'section', 'image', 'section', 'image', 'context']);
  assert.deepEqual(p.blocks[3], {
    type: 'image',
    title: { type: 'plain_text', text: '현장 사진 1/4' },
    image_url: url('a'),
    alt_text: '현장 사진 1',
  });
  assert.equal(
    p.blocks[4].text.text,
    `<${url('b')}|현장 사진 2/4> (HEIC — Slack 미리보기 안 됨, 눌러서 열기)\n<${url('c')}|현장 사진 3/4> (WEBP — Slack 미리보기 안 됨, 눌러서 열기)`,
  );
  assert.equal(p.blocks[5].title.text, '현장 사진 4/4');
  assert.ok(p.text.endsWith(['', '현장 사진 4장', url('a'), url('b'), url('c'), url('d')].join('\n')));
  assert.ok(contextText(p).includes('현장 사진은 30일 뒤 자동 삭제'));
});

test('사진: images:false 면 image 블록 없이 모두 링크 줄', () => {
  const p = consultSlackPayload(sample(), { images: false });
  assert.deepEqual(types(p), ['header', 'section', 'section', 'section', 'context']);
  assert.match(p.blocks[3].text.text, /^<https:\/\/yupumjeongri\.xyz\/api\/photo\/a{32}\|현장 사진 1\/2>\n<https:\/\/yupumjeongri\.xyz\/api\/photo\/b{32}\|현장 사진 2\/2>$/);
});

test('사진 없을 때: image 블록·사진 줄·30일 안내가 없다', () => {
  const p = consultSlackPayload(sample({ photos: [] }));
  assert.deepEqual(types(p), ['header', 'section', 'section', 'context']);
  assert.ok(!p.text.includes('현장 사진'));
  assert.ok(!contextText(p).includes('자동 삭제'));
});

test('운영 안내는 맨 아래 context — 사진 저장 실패·브라우저에서 뺀 사진·스팸 의심', () => {
  const p = consultSlackPayload(sample({ photoFailed: 2, skippedByBrowser: 1, honeypot: true }));
  const ctx = contextText(p);
  assert.ok(ctx.includes('사진 2장은 저장하지 못했습니다'));
  assert.ok(ctx.includes('1장은 용량이 커서 브라우저에서 뺐습니다'));
  assert.ok(ctx.includes('스팸 의심'));
  assert.equal(p.blocks[0].text.text, '새 상담 신청이 들어왔어요');
  assert.ok(!itemsText(p).includes('저장하지 못했습니다'));
});

// --- 덧붙이기 ---------------------------------------------------------------

test('덧붙이기: 머리글이 덧붙임이고, 연락처·문의 내용 두 줄만 둔다', async () => {
  const kv = new FakeKV();
  const { body, location } = await submit({ phone: '010-1234-5678', followup: '1', message: '2층 단독주택입니다.' }, [file(JPEG)], { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?added=1&photos=1');
  assert.equal(body.blocks[0].text.text, '같은 접수에 덧붙인 내용이 들어왔어요');
  assert.equal(body.blocks[1].text.text, '<!channel>');
  assert.equal(body.blocks[2].text.text, '*연락처:* 010-1234-5678\n*문의 내용:* 2층 단독주택입니다.');
  assert.equal(body.blocks[3].type, 'image');
  assert.ok(body.text.startsWith('같은 접수에 덧붙인 내용이 들어왔어요\n연락처: 010-1234-5678\n문의 내용: 2층 단독주택입니다.\n\n현장 사진 1장\nhttps://yupumjeongri.xyz/api/photo/'));
  assert.ok(contextText(body).includes('새 신청 아님'));
});

// --- 보내기와 다시 보내기 ----------------------------------------------------

test('접수 흐름: 상담 폼 전체 칸이 같은 모양으로 Slack 에 간다 (사진 image 블록 = 열람 주소)', async () => {
  const kv = new FakeKV();
  const { body, location } = await submit(
    { phone: '01012345678', type: '유품정리', region: '서울 노원구 월계동', housing: '아파트', message: '시험', page: '/consult/' },
    [file(JPEG), file(HEIC, 'b.heic')],
    { PHOTOS: kv },
  );
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?photos=2');
  assert.equal(slackCalls.length, 1);
  const ids = [...kv.map.keys()];
  assert.deepEqual(types(body), ['header', 'section', 'section', 'image', 'section', 'context']);
  assert.ok(ids.some((id) => body.blocks[3].image_url === `https://yupumjeongri.xyz/api/photo/${id}`));
  assert.ok(body.blocks[4].text.text.includes('(HEIC'));
  assert.equal(body.blocks[2].text.text.split('\n')[4], '*현장 정보:* 아파트');
});

test('번호 한 칸 폼: 번호만 와도 같은 모양 (분야·희망일 미지정, 주소 미입력)', async () => {
  const { body } = await submit({ phone: '010-1234-5678', page: '/' });
  assert.equal(body.blocks[0].text.text, '새 상담 신청이 들어왔어요');
  assert.equal(body.blocks[2].text.text, '*상담 분야:* 미지정\n*작업희망일:* 미지정\n*연락처:* 010-1234-5678\n*주소:* 미입력');
  assert.equal(body.text, '새 상담 신청이 들어왔어요\n상담 분야: 미지정\n작업희망일: 미지정\n연락처: 010-1234-5678\n주소: 미입력');
});

const imageCount = (body) => types(body).filter((t) => t === 'image').length;

test('첫 전송 전 대기: image 블록이 있으면 3초 기다린 뒤 보낸다, 받으면 더 기다리지 않는다', async () => {
  assert.deepEqual(SLACK_IMAGE_DELAYS, { firstDelay: 3000, retryDelay: 5000 });
  const { location } = await submit({ phone: '010-1234-5678' }, [file(JPEG)], { PHOTOS: new FakeKV() });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?photos=1');
  assert.deepEqual(order, ['wait 3000', 'send']);
});

test('첫 전송 전 대기: 사진이 없거나 HEIC 만이면(image 블록 없음) 기다리지 않는다', async () => {
  await submit({ phone: '010-1234-5678' });
  assert.deepEqual(order, ['send']);
  order = [];
  await submit({ phone: '010-1234-5678' }, [file(HEIC, 'a.heic')], { PHOTOS: new FakeKV() });
  assert.deepEqual(order, ['send']);
});

test('다시 보내기: 사진 블록 때문에 400 이면 5초 기다렸다 image 블록 그대로 한 번 다시 보내 사진째 살린다', async () => {
  replies = [{ status: 400, body: 'invalid_blocks' }];
  const kv = new FakeKV();
  const { location, calls } = await submit({ phone: '010-1234-5678', page: '/consult/' }, [file(JPEG), file(JPEG)], { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?photos=2');
  assert.deepEqual(order, ['wait 3000', 'send', 'wait 5000', 'send']);
  assert.equal(imageCount(slackCalls[0].body), 2);
  assert.deepEqual(slackCalls[1].body, slackCalls[0].body); // 같은 메시지 그대로
  assert.equal(kv.deleted.length, 0);
  assert.equal(calls.fail.length, 0);
  assert.equal(calls.consult.length, 1);
});

test('다시 보내기: 재시도도 거절되면 더 기다리지 않고 image 블록을 뺀 링크 판으로 접수를 살린다', async () => {
  replies = [400, 400].map((status) => ({ status, body: 'invalid_blocks' }));
  const kv = new FakeKV();
  const { location, calls } = await submit({ phone: '010-1234-5678', page: '/consult/' }, [file(JPEG), file(JPEG)], { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/done/?photos=2');
  assert.deepEqual(order, ['wait 3000', 'send', 'wait 5000', 'send', 'send']);
  const links = slackCalls[2].body;
  assert.equal(imageCount(slackCalls[1].body), 2);
  assert.equal(imageCount(links), 0);
  for (const id of kv.map.keys()) assert.ok(JSON.stringify(links).includes(`<https://yupumjeongri.xyz/api/photo/${id}|현장 사진`));
  assert.ok(contextText(links).includes('Slack 이 사진을 바로 불러오지 못해 링크로 보냈습니다'));
  assert.ok(!contextText(slackCalls[0].body).includes('링크로 보냈습니다'));
  assert.equal(links.text, slackCalls[0].body.text); // 복사본은 같다
  assert.equal(kv.deleted.length, 0); // 사진은 그대로 둔다
  assert.equal(calls.fail.length, 0);
  assert.equal(calls.consult.length, 1);
});

test('다시 보내기: 링크 판까지 실패하면 전처럼 사진을 지우고 실패로 센다', async () => {
  replies = [400, 400, 500].map((status) => ({ status, body: 'error' }));
  const kv = new FakeKV();
  const { location, calls } = await submit({ phone: '010-1234-5678' }, [file(JPEG)], { PHOTOS: kv });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/?error=send');
  assert.equal(slackCalls.length, 3);
  assert.equal(kv.map.size, 0);
  assert.equal(kv.deleted.length, 1);
  assert.deepEqual(calls.fail, [['slack-500', '']]);
  assert.equal(calls.consult.length, 0);
});

test('다시 보내기: 웹훅이 끊긴 응답(403·404·410)은 재시도 대기 없이 링크 판 한 번만', async () => {
  replies = [404, 404].map((status) => ({ status, body: 'no_service' }));
  const { location, calls } = await submit({ phone: '010-1234-5678' }, [file(JPEG)], { PHOTOS: new FakeKV() });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/?error=send');
  assert.deepEqual(order, ['wait 3000', 'send', 'send']);
  assert.equal(slackCalls.length, 2);
  assert.equal(imageCount(slackCalls[1].body), 0);
  assert.deepEqual(calls.fail, [['slack-404', '']]);
});

test('다시 보내기: 네트워크 예외는 다시 보내지 않는다(결과를 모름)', async () => {
  globalThis.fetch = async (url, init) => {
    slackCalls.push({ url, body: JSON.parse(init.body) });
    throw new Error('network');
  };
  const { location, calls } = await submit({ phone: '010-1234-5678' }, [file(JPEG)], { PHOTOS: new FakeKV() });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/?error=send');
  assert.equal(slackCalls.length, 1);
  assert.deepEqual(slept, [3000]); // 첫 전송 전 대기뿐
  assert.deepEqual(calls.fail, [['exception', '']]);
});

test('다시 보내기: image 블록이 없던 메시지(사진 없음·HEIC 만)는 다시 보내지 않는다', async () => {
  replies = [{ status: 404, body: 'no_service' }];
  const { location, calls } = await submit({ phone: '010-1234-5678' });
  assert.equal(location, 'https://yupumjeongri.xyz/consult/?error=send');
  assert.equal(slackCalls.length, 1);
  assert.deepEqual(calls.fail, [['slack-404', '']]);

  replies = [{ status: 400, body: 'invalid_blocks' }];
  slackCalls = [];
  slept = [];
  const heic = await submit({ phone: '010-1234-5678' }, [file(HEIC, 'a.heic')], { PHOTOS: new FakeKV() });
  assert.equal(heic.location, 'https://yupumjeongri.xyz/consult/?error=send');
  assert.equal(slackCalls.length, 1);
  assert.deepEqual(slept, []);
});

// --- 시험 접수 (2026-11-28: Slack 상담 채널엔 실제 고객 문의만) -------------------

test('시험 접수: 010-0000-0000 이나 [시험] 은 Slack 에 보내지 않고 완료 화면으로, 깔때기 대신 test 로만 센다', async () => {
  const kv = new FakeKV();
  for (const fields of [
    { phone: '010-0000-0000', page: '/consult/' },
    { phone: '010-1234-5678', message: '[시험] 연락 금지', page: '/consult/' },
  ]) {
    const { location, calls } = await submit(fields, [file(JPEG)], { PHOTOS: kv });
    assert.equal(location, 'https://yupumjeongri.xyz/consult/done/');
    assert.deepEqual(calls.test, [['/consult/']]);
    assert.equal(calls.consult.length, 0);
  }
  assert.equal(slackCalls.length, 0);
  assert.equal(kv.map.size, 0); // 사진도 저장하지 않는다
});

test('시험 접수: ALLOW_TEST_TO_SLACK=on 인 날만 실제처럼 Slack 에 간다', async () => {
  const { calls } = await submit({ phone: '010-0000-0000', type: '유품정리' }, [], { ALLOW_TEST_TO_SLACK: 'on' });
  assert.equal(slackCalls.length, 1);
  assert.equal(calls.test.length, 0);
  assert.equal(calls.consult[0][2], '유품정리'); // 상담 분야 이름이 카운터로 넘어간다
});
