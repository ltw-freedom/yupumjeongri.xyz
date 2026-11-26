/**
 * POST /api/consult — 상담 폼을 받아 Slack 으로 넘긴다.
 *
 * 파일 위치와 onRequestPost/onRequestGet 이름은 Pages Functions 규약이지만, 실서비스는 Pages 가 아니라
 * Worker yupumjeongri-xyz 다. worker/index.js 가 이 핸들러를 import 해 /api/consult 에 연결한다
 * (로직은 이 파일 한 곳만 고치면 된다). 어댑터를 바꿀 필요는 없다.
 *
 * !! 웹훅 URL 은 절대 코드에 넣지 않는다 !!
 * 이 사이트는 정적 사이트라 클라이언트에 들어간 값은 전부 공개된다.
 * 운영 SLACK_WEBHOOK_URL 은 Worker yupumjeongri-xyz 의 Secret 이다
 * (npx wrangler secret put SLACK_WEBHOOK_URL --name yupumjeongri-xyz, 배포해도 유지된다 — README '상담 접수' 절).
 * 로컬은 저장소 루트 .dev.vars 에 넣는다(.gitignore 됨).
 *
 * 현장 사진(선택, 최대 5장, 2026-11-27): 상담 폼과 같은 요청(multipart)으로 온다. 본문은 8MB 까지만 읽고,
 * 번호 검증을 통과한 신청의 사진만 KV PHOTOS 에 30일 넣은 뒤 Slack 메시지에 image 블록(열람 주소)으로 싣는다(worker/photos.js).
 * 사진 저장이 실패해도 접수는 그대로 보내고 실패한 장 수만 적는다. Slack 이 사진을 받아 가지 못해 메시지를 거절하면
 * 2초·5초 기다렸다 image 블록 그대로 다시 보내고(KV 지역 반영 지연 대비), 그래도 안 되면 image 블록을 빼고 링크로 보낸다.
 *
 * Slack 알림 모양(2026-11-27, 브랜드 공통 형식): 아래 consultSlackPayload(). 번호 한 칸 폼(QuickConsult·EstimateCalc)과
 * 완료 화면 덧붙이기도 이 핸들러로 와서 같은 모양이 된다(덧붙이기는 머리글이 다르다).
 */

import { discardPhotos, MAX_REQUEST_BYTES, photoFiles, photoUrl, PHOTO_TTL_DAYS, readCappedBody, storePhotos } from '../../worker/photos.js';

/** 폼 값 하나를 다듬어 꺼낸다. 길이를 제한해 웹훅 폭탄을 막는다. */
function field(form, key, max) {
  return String(form.get(key) ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function redirect(url, origin) {
  return new Response(null, { status: 303, headers: { Location: new URL(url, origin).href } });
}

/**
 * 휴대폰 번호만 받는다. 하이픈·공백·국가번호(+82) 표기를 모두 010… 형태로 맞춘 뒤 검증하고,
 * Slack 에는 정규화된 값을 넘긴다 (같은 번호가 표기만 달리 쌓이는 것을 막는다).
 * 형식이 아니면 null 을 돌려준다.
 */
function normalizePhone(raw) {
  const digits = raw.replace(/\D/g, '').replace(/^82/, '0');
  if (!/^01[016789]\d{7,8}$/.test(digits)) return null;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** 웹훅으로 한 번 보낸다. 실패 응답이면 본문(Slack 의 오류 이름)을 남긴다 */
async function postSlack(webhook, payload) {
  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) console.error('Slack 전송 실패', res.status, await res.text().catch(() => ''));
  return res;
}

// --- Slack 상담 알림 모양 (2026-11-27, 사업주 요청으로 브랜드 공통 형식) ---------------------------------
// 머리글 → <!channel> → 한 줄에 한 항목(상담 분야·작업희망일·연락처·주소·현장 정보·문의 내용) → 사진 image 블록 → 운영 안내.
// 2열 fields 는 쓰지 않는다 — Slack 모바일에서 복사하면 줄바꿈이 사라진다.
// 연락처는 하이픈 평문이다(모바일 앱이 번호를 알아보고 누르면 전화가 걸린다. Slack 링크는 http(s) 만 되어 tel: 을 못 쓴다).
// 주소는 카카오맵 링크 API 로 감싼다(폰에서 카카오맵 앱으로 넘어간다. kakaomap:// 앱 스킴은 Slack 이 막는다).
// 월요일 깔때기 요약(worker/funnel.js)은 이 모양과 따로다.

const KAKAO_MAP_SEARCH_URL = 'https://map.kakao.com/link/search/';
/** Slack image 블록이 그릴 수 있는 형식. WebP·HEIC·HEIF 는 image 블록 대신 링크 한 줄로 둔다 */
export const SLACK_IMAGE_TYPES = new Set(['image/jpeg', 'image/png']);
/** Slack section 한 블록의 글자 수 한도 */
const SECTION_MAX = 3000;
/**
 * image 블록 메시지가 거절됐을 때 image 블록 그대로 다시 보내기 전에 기다리는 시간(ms). 고객이 완료 화면을 기다리는
 * 동기 경로라 합계 7초로 묶는다. 그래도 거절되면 링크 판으로 보낸다.
 */
export const SLACK_IMAGE_RETRY_DELAYS = [2000, 5000];
/** 웹훅 자체가 없거나 막힌 응답 — 기다렸다 다시 보내도 소용없다 */
const WEBHOOK_GONE = new Set([403, 404, 410]);

/** Slack mrkdwn 이스케이프 — 사용자 입력의 <!channel>·<주소|글자> 가 멘션·링크로 먹지 않게 */
export const slackEscape = (value) =>
  String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const kakaoMapUrl = (address) => KAKAO_MAP_SEARCH_URL + encodeURIComponent(String(address).trim());

/**
 * 알림에 싣는 (라벨, 값) 목록 — 본문 블록과 복사용 text 가 같은 구성을 쓴다.
 * 이 사이트 폼에는 이름 칸이 없어 '이름' 줄을 두지 않고, 희망일 칸이 없어 작업희망일은 늘 '미지정'이다.
 * 덧붙이기(완료 화면)는 번호와 덧붙인 글·사진만 오므로 그 두 줄만 둔다 — 빈 칸을 '미지정'으로 채우면 앞선 신청과 헷갈린다.
 */
export function consultItems(c) {
  const message = c.message ? [{ label: '문의 내용', value: c.message }] : [];
  if (c.followup) return [{ label: '연락처', value: c.phone }, ...message];
  // 계산기·상담 폼에서 고른 현장 조건. 주거 형태 이름에도 ' · ' 가 들어 있어 짐의 양·특수청소는 앞말을 붙인다
  const siteInfo = [c.housing, c.volume && `짐 ${c.volume}`, c.access, c.special && `특수청소 ${c.special}`]
    .filter(Boolean)
    .join(' · ');
  return [
    { label: '상담 분야', value: c.type || '미지정' },
    { label: '작업희망일', value: '미지정' },
    { label: '연락처', value: c.phone },
    c.address
      ? { label: '주소', value: c.address, note: c.addressNote, map: kakaoMapUrl(c.address) }
      : { label: '주소', value: '미입력' },
    ...(siteInfo ? [{ label: '현장 정보', value: siteInfo }] : []),
    ...message,
    ...(c.estimate ? [{ label: '화면에 보여준 예상 비용', value: c.estimate }] : []),
  ];
}

/** 한 항목을 mrkdwn 한 줄로 — 주소 글자는 카카오맵 링크로 감싼다 */
function itemLine({ label, value, note, map }) {
  const text = map ? `<${map}|${slackEscape(value)}>` : slackEscape(value);
  return `*${label}:* ${text}${note ? ` ${slackEscape(note)}` : ''}`;
}

/** 긴 줄을 한도 안으로 자른다. 이스케이프한 &amp; 같은 글자와 서로게이트 쌍은 가르지 않는다 */
function splitLong(line, max) {
  const parts = [];
  let rest = line;
  while (rest.length > max) {
    let cut = max;
    const amp = rest.lastIndexOf('&', cut - 1);
    if (amp > cut - 5 && !rest.slice(amp, cut).includes(';')) cut = amp;
    const code = rest.charCodeAt(cut - 1);
    if (code >= 0xd800 && code <= 0xdbff) cut -= 1;
    parts.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  parts.push(rest);
  return parts;
}

/** 줄들을 section 한도(3,000자) 안의 덩어리로 묶는다. 문의 내용은 2,000자까지 받으므로 보통 한 덩어리다 */
function sectionTexts(lines) {
  const out = [];
  let cur = '';
  for (const piece of lines.flatMap((line) => splitLong(line, SECTION_MAX))) {
    if (cur && cur.length + 1 + piece.length > SECTION_MAX) {
      out.push(cur);
      cur = piece;
    } else cur = cur ? `${cur}\n${piece}` : piece;
  }
  if (cur) out.push(cur);
  return out;
}

const mrkdwnSection = (text) => ({ type: 'section', text: { type: 'mrkdwn', text } });

/**
 * 상담 한 건의 웹훅 payload. images: false 면 image 블록 없이 사진을 모두 링크 줄로 둔다
 * (Slack 이 사진을 받아 가지 못해 거절했을 때 다시 보내는 모양).
 * 문의 내용은 자르지 않는다 — 이 사이트는 상담 내용을 Slack 에만 남겨서 자르면 그대로 사라진다(폼 상한 2,000자).
 */
export function consultSlackPayload(c, { images = true } = {}) {
  const title = c.followup ? '같은 접수에 덧붙인 내용이 들어왔어요' : '새 상담 신청이 들어왔어요';
  const items = consultItems(c);
  const photos = c.photos ?? [];
  const n = photos.length;

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: title, emoji: false } },
    // 채널 알림이 '멘션만'이어도 폰에 푸시가 가게 한다. header 는 plain_text 라 멘션을 따로 둔다
    mrkdwnSection('<!channel>'),
    ...sectionTexts(items.map(itemLine)).map(mrkdwnSection),
  ];

  // 사진은 순서대로 — 그릴 수 있는 형식은 image 블록, 그 밖(또는 images: false)은 링크 줄. 이어진 링크 줄은 한 section 으로 묶는다
  let links = [];
  const flushLinks = () => {
    if (links.length) blocks.push(mrkdwnSection(links.join('\n')));
    links = [];
  };
  photos.forEach((photo, i) => {
    const drawable = SLACK_IMAGE_TYPES.has(photo.type);
    if (images && drawable) {
      flushLinks();
      blocks.push({
        type: 'image',
        title: { type: 'plain_text', text: `현장 사진 ${i + 1}/${n}` },
        image_url: photo.url,
        alt_text: `현장 사진 ${i + 1}`,
      });
    } else {
      const format = String(photo.type ?? '').replace('image/', '').toUpperCase();
      const why = drawable ? '' : ` (${format || '원본'} — Slack 미리보기 안 됨, 눌러서 열기)`;
      links.push(`<${photo.url}|현장 사진 ${i + 1}/${n}>${why}`);
    }
  });
  flushLinks();

  const notes = [];
  if (n) notes.push(`현장 사진은 ${PHOTO_TTL_DAYS}일 뒤 자동 삭제`);
  if (c.photoFailed) notes.push(`:warning: 사진 ${c.photoFailed}장은 저장하지 못했습니다 (형식·용량·저장 오류).`);
  if (c.skippedByBrowser) notes.push(`신청자가 고른 사진 중 ${c.skippedByBrowser}장은 용량이 커서 브라우저에서 뺐습니다.`);
  if (!images && photos.some((p) => SLACK_IMAGE_TYPES.has(p.type))) {
    notes.push('Slack 이 사진을 바로 불러오지 못해 링크로 보냈습니다. 링크를 누르면 사진이 열립니다.');
  }
  if (c.honeypot) notes.push(':warning: 스팸 의심 — 허니팟 칸에 값이 있음 (번호가 정상이라 접수함)');
  notes.push(
    c.followup
      ? 'yupumjeongri.xyz · 같은 번호의 앞선 신청에 덧붙인 내용 (새 신청 아님) · 상담 종료 후 바로 파기'
      : `yupumjeongri.xyz${c.page ? ` · 신청 페이지 ${c.page}` : ''} · 상담 종료 후 바로 파기`,
  );
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: notes.join('\n') }] });

  // 알림 미리보기와 '메시지 복사'용 평문 — 본문과 같은 줄 구성, 링크 없이. 사진은 빈 줄 뒤에 주소만 한 줄에 하나씩.
  // 이 text 도 Slack 이 mrkdwn 으로 읽으므로 사용자 입력은 이스케이프한다(화면에는 원래 글자로 보인다)
  const textLines = [
    title,
    ...items.map(({ label, value, note }) => `${label}: ${slackEscape(value)}${note ? ` ${note}` : ''}`),
  ];
  if (n) textLines.push('', `현장 사진 ${n}장`, ...photos.map((p) => p.url));

  return { text: textLines.join('\n'), blocks };
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  const webhook = env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    console.error('SLACK_WEBHOOK_URL 환경변수가 없습니다.');
    context.onConsultFail?.('config', '');
    return redirect('/consult/?error=config', origin);
  }

  // 사진이 실린 multipart 도 있으므로 본문을 상한까지만 읽고 나서 파싱한다(큰 본문을 통째로 파싱하지 않는다).
  // 줄인 사진 5장이면 2MB 안팎이다. 상한을 넘는 건 브라우저 줄이기가 통하지 않은 경우뿐이라 드물다.
  let form;
  try {
    const body = await readCappedBody(request, MAX_REQUEST_BYTES);
    if (!body) {
      console.warn('상담 요청 본문이 상한을 넘음', request.headers.get('Content-Length'));
      // 본문을 읽지 않고는 어느 폼인지 모른다 — 덧붙이기 폼이면 완료 화면의 Referer 로 가른다
      const fromDone = (request.headers.get('Referer') ?? '').includes('/consult/done/');
      return redirect(fromDone ? '/consult/done/?error=toolarge' : '/consult/?error=toolarge', origin);
    }
    form = await new Response(body, { headers: { 'Content-Type': request.headers.get('Content-Type') ?? '' } }).formData();
  } catch {
    return redirect('/consult/?error=form', origin);
  }

  // 허니팟. 사람에게는 보이지 않는 필드라 값이 차 있으면 봇일 가능성이 높다.
  // 다만 모바일 브라우저 자동완성이 화면 밖 필드까지 채우는 경우가 있어서
  // (예전 필드명 'company' + 라벨 '회사명'은 주소록의 회사명이 들어갈 수 있었다)
  // 번호가 정상이면 버리지 않고 '스팸 의심' 표시만 붙여 넘긴다. 진짜 상담 한 건이 더 비싸다.
  const honeypot = field(form, 'hp_leave_blank', 1) || field(form, 'company', 1);

  // 접수 완료 화면의 '같은 접수에 덧붙이기' — 새 신청이 아니라 앞선 신청의 추가 내용이다.
  // 깔때기에 접수로 세지 않고, 실패하면 상담 폼이 아니라 완료 화면으로 돌려보낸다.
  const followup = field(form, 'followup', 1) === '1';
  const donePath = followup ? '/consult/done/?added=1' : '/consult/done/';
  const sendFailPath = followup ? '/consult/done/?error=send' : '/consult/?error=send';

  const rawPhone = field(form, 'phone', 20);
  // 지역 페이지의 빠른 상담 폼은 지역 입력 칸 없이 페이지의 지역명을 regionHint 로 보낸다
  const region = field(form, 'region', 60);
  const regionHint = field(form, 'regionHint', 60);
  const type = field(form, 'type', 40);
  const message = field(form, 'message', 2000);
  // 예상 비용 계산기에서 고른 조건 — 회신 전에 현장 규모를 가늠하는 용도
  const housing = field(form, 'housing', 40);
  const volume = field(form, 'volume', 20);
  const access = field(form, 'access', 40);
  const special = field(form, 'special', 20);
  const estimate = field(form, 'estimate', 120);
  // 어느 페이지에서 신청했는지 — 전환이 어디서 나는지 보려는 것. 개인정보가 아니다.
  // 경로 형태만 받는다 — Slack mrkdwn 에 <!channel> 같은 문자열이 끼어드는 것을 막는다.
  const rawPage = field(form, 'page', 200);
  const page = /^\/[\w\-/%.]*$/.test(rawPage) ? rawPage : '';

  // 현장 사진 — 파일만 꺼내 두고, 저장은 번호 검증을 통과한 뒤에 한다(잘못된 신청이 KV 쓰기 한도를 쓰지 않게)
  const files = photoFiles(form);
  // 브라우저가 용량 때문에 뺀 사진 수 (src/scripts/photo-field.ts) — 고른 사진이 더 있었다는 걸 Slack 에서 알 수 있게
  const skippedByBrowser = Number(field(form, 'photo_skipped', 1)) || 0;

  if (followup && (!rawPhone || (!message && !files.length))) {
    return redirect(rawPhone ? '/consult/done/' : sendFailPath, origin);
  }

  if (!rawPhone) {
    return honeypot ? redirect('/consult/done/', origin) : redirect('/consult/?error=required', origin);
  }

  // 브라우저 pattern 검증은 우회될 수 있으므로 서버에서 다시 본다.
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    if (followup) return redirect(sendFailPath, origin);
    // 봇에게 실패를 알려주면 우회를 시도하므로 성공한 것처럼 돌려보낸다
    return honeypot ? redirect('/consult/done/', origin) : redirect('/consult/?error=phone', origin);
  }
  if (honeypot) console.warn('허니팟 값이 있으나 번호가 정상이라 접수함', phone);

  const photos = await storePhotos(env, files);
  const photoFailed = photos.failed + photos.dropped;

  const slack = {
    followup,
    honeypot: Boolean(honeypot),
    phone,
    type,
    // 지역 칸이 비었으면 빠른 상담 폼이 보낸 페이지의 지역명 — 신청자가 적은 값이 아니라는 표시를 붙인다
    address: region || regionHint,
    addressNote: !region && regionHint ? '(신청 페이지 기준)' : '',
    housing,
    volume,
    access,
    special,
    estimate,
    message,
    page,
    photos: photos.stored.map((id, i) => ({ url: photoUrl(origin, id), type: photos.types[i] })),
    photoFailed,
    skippedByBrowser,
  };

  try {
    // 사진은 위 storePhotos() 를 await 한 뒤라 KV 저장이 끝난 상태에서 보낸다(waitUntil 로 미루지 않는다).
    let res = await postSlack(webhook, consultSlackPayload(slack));
    // image 블록의 사진을 Slack 이 받아 가지 못하면 메시지 전체가 400(invalid_blocks 등)으로 거절된다 — Slack 이 메시지를
    // 받지 않은 것이라 다시 보내도 중복이 아니다. 흔한 까닭은 KV 지역 반영 지연이다: 쓴 곳(한국)에는 바로 보이지만
    // Slack 서버가 있는 미국 쪽에는 수십 초 늦게 보일 수 있다(2026-11-27 다른 브랜드 운영 시험에서 Slackbot GET 404).
    // 그래서 잠깐 기다렸다가 image 블록 그대로 다시 보내고(SLACK_IMAGE_RETRY_DELAYS), 그래도 안 되면 링크로 바꿔 보낸다.
    // 웹훅 자체가 끊긴 응답(403·404·410)은 기다려도 소용없어 바로 링크 판으로 간다. 네트워크 예외는 아래 catch — 다시 보내지 않는다.
    const hasImages = slack.photos.some((p) => SLACK_IMAGE_TYPES.has(p.type));
    if (!res.ok && hasImages) {
      const sleep = context.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
      if (!WEBHOOK_GONE.has(res.status)) {
        for (const ms of SLACK_IMAGE_RETRY_DELAYS) {
          console.warn(`Slack 이 사진 블록이 든 메시지를 거절해 ${ms / 1000}초 뒤 다시 보냄`, res.status);
          await sleep(ms);
          res = await postSlack(webhook, consultSlackPayload(slack));
          if (res.ok) break;
        }
      }
      if (!res.ok) {
        console.warn('Slack 이 사진 블록이 든 메시지를 끝내 거절해 링크로 다시 보냄', res.status);
        res = await postSlack(webhook, consultSlackPayload(slack, { images: false }));
      }
    }

    if (!res.ok) {
      context.onConsultFail?.(`slack-${res.status}`, page);
      await discardPhotos(env, photos.stored);
      return redirect(sendFailPath, origin);
    }
  } catch (err) {
    console.error('Slack 전송 중 예외', err);
    context.onConsultFail?.('exception', page);
    await discardPhotos(env, photos.stored);
    return redirect(sendFailPath, origin);
  }

  // 깔때기 기록 (worker/funnel.js) — Worker 가 넘겨줄 때만. 덧붙이기는 새 접수가 아니다.
  // 위의 전송 실패(onConsultFail)는 덧붙이기도 센다 — 웹훅이 끊겼는지 보려는 숫자라서다. 번호·내용은 넘기지 않는다.
  // 사진을 보낸 신청은 깔때기에 장 수만 함께 센다(events.ref = 'photo-3', worker/funnel.js).
  if (!followup) context.onConsult?.(page, photos.stored.length);
  // 완료 화면이 '사진 N장도 전달됨 / M장은 저장하지 못함'을 알릴 수 있게 숫자만 붙인다
  const photoQuery = files.length
    ? `photos=${photos.stored.length}${photoFailed ? `&photo_failed=${photoFailed}` : ''}`
    : '';
  return redirect(photoQuery ? `${donePath}${donePath.includes('?') ? '&' : '?'}${photoQuery}` : donePath, origin);
}

/** GET 으로 들어오면 폼으로 되돌린다. */
export async function onRequestGet(context) {
  return redirect('/consult/', new URL(context.request.url).origin);
}
