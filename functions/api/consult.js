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
 * 번호 검증을 통과한 신청의 사진만 KV PHOTOS 에 30일 넣은 뒤 Slack 메시지에 열람 링크를 붙인다(worker/photos.js).
 * 사진 저장이 실패해도 접수는 그대로 보내고 실패한 장 수만 적는다.
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

  const receivedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const rows = followup
    ? [
        ['휴대폰', phone],
        ['받은 시각', `${receivedAt} (KST)`],
      ]
    : [
        ['휴대폰', phone],
        ['지역', region || (regionHint ? `${regionHint} (신청 페이지 기준)` : '—')],
        ['서비스', type || '—'],
        ['접수 시각', `${receivedAt} (KST)`],
      ];

  // 계산기 조건은 고른 것만 붙인다. Slack section 한 블록의 fields 는 최대 10개.
  const estimateRows = [
    ['주거 형태', housing],
    ['짐의 양', volume],
    ['층수 · 엘리베이터', access],
    ['특수청소', special],
    ['화면에 보여준 예상 비용', estimate],
  ].filter(([, value]) => value);

  const toFields = (list) =>
    list.map(([label, value]) => ({ type: 'mrkdwn', text: `*${label}*\n${value}` }));

  // 사진 링크 — 이미지 블록은 쓰지 않는다. Slack 이 이미지를 못 불러오면 메시지 전체가 거절되어 접수가 사라진다.
  const photoLines = [];
  if (photos.stored.length) {
    photoLines.push(
      `*현장 사진 ${photos.stored.length}장* (${PHOTO_TTL_DAYS}일 뒤 자동 삭제)`,
      photos.stored.map((id, i) => `<${photoUrl(origin, id)}|사진 ${i + 1}>`).join('  ·  '),
    );
  }
  if (photoFailed) photoLines.push(`:warning: 사진 ${photoFailed}장은 저장하지 못했습니다 (형식·용량·저장 오류).`);
  if (skippedByBrowser) photoLines.push(`신청자가 고른 사진 중 ${skippedByBrowser}장은 용량이 커서 브라우저에서 뺐습니다.`);

  const title = followup ? '상담 신청 추가 내용' : '새 상담 신청';
  const payload = {
    text: `${title} — ${phone}${photos.stored.length ? ` · 사진 ${photos.stored.length}장` : ''}${honeypot ? ' (스팸 의심)' : ''}`, // 알림 미리보기용
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: honeypot ? `${title} (스팸 의심 — 허니팟 값 있음)` : title, emoji: false },
      },
      { type: 'section', fields: toFields(rows) },
      ...(estimateRows.length ? [{ type: 'section', fields: toFields(estimateRows) }] : []),
      ...(message
        ? [{ type: 'section', text: { type: 'mrkdwn', text: `*${followup ? '덧붙인 내용' : '상담 내용'}*\n${message}` } }]
        : []),
      ...(photoLines.length ? [{ type: 'section', text: { type: 'mrkdwn', text: photoLines.join('\n') } }] : []),
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: followup
              ? 'yupumjeongri.xyz · 같은 번호의 앞선 신청에 덧붙인 내용 (새 신청 아님) · 상담 종료 후 바로 파기'
              : `yupumjeongri.xyz${page ? ` · 신청 페이지 ${page}` : ''} · 상담 종료 후 바로 파기`,
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error('Slack 전송 실패', res.status, await res.text());
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
