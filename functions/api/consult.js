/**
 * POST /api/consult — 상담 폼을 받아 Slack 으로 넘긴다.
 *
 * Cloudflare Pages Functions. 저장소 루트의 functions/ 는 Pages 가 자동으로 잡아가고,
 * Astro 의 정적 빌드(dist/)와 나란히 배포된다. 어댑터를 바꿀 필요는 없다.
 *
 * !! 웹훅 URL 은 절대 코드에 넣지 않는다 !!
 * 이 사이트는 정적 사이트라 클라이언트에 들어간 값은 전부 공개된다.
 * Cloudflare Pages > Settings > Environment variables 에 SLACK_WEBHOOK_URL 을
 * "Secret" 타입으로 등록할 것. 로컬은 저장소 루트 .dev.vars 에 넣는다(.gitignore 됨).
 */

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
    return redirect('/consult/?error=config', origin);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return redirect('/consult/?error=form', origin);
  }

  // 허니팟. 사람에게는 보이지 않는 필드라 값이 차 있으면 봇일 가능성이 높다.
  // 다만 모바일 브라우저 자동완성이 화면 밖 필드까지 채우는 경우가 있어서
  // (예전 필드명 'company' + 라벨 '회사명'은 주소록의 회사명이 들어갈 수 있었다)
  // 번호가 정상이면 버리지 않고 '스팸 의심' 표시만 붙여 넘긴다. 진짜 상담 한 건이 더 비싸다.
  const honeypot = field(form, 'hp_leave_blank', 1) || field(form, 'company', 1);

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

  if (!rawPhone) {
    return honeypot ? redirect('/consult/done/', origin) : redirect('/consult/?error=required', origin);
  }

  // 브라우저 pattern 검증은 우회될 수 있으므로 서버에서 다시 본다.
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    // 봇에게 실패를 알려주면 우회를 시도하므로 성공한 것처럼 돌려보낸다
    return honeypot ? redirect('/consult/done/', origin) : redirect('/consult/?error=phone', origin);
  }
  if (honeypot) console.warn('허니팟 값이 있으나 번호가 정상이라 접수함', phone);

  const receivedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const rows = [
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

  const payload = {
    text: `새 상담 신청 — ${phone}${honeypot ? ' (스팸 의심)' : ''}`, // 알림 미리보기용
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: honeypot ? '새 상담 신청 (스팸 의심 — 허니팟 값 있음)' : '새 상담 신청', emoji: false },
      },
      { type: 'section', fields: toFields(rows) },
      ...(estimateRows.length ? [{ type: 'section', fields: toFields(estimateRows) }] : []),
      ...(message
        ? [{ type: 'section', text: { type: 'mrkdwn', text: `*상담 내용*\n${message}` } }]
        : []),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `yupumjeongri.xyz${page ? ` · 신청 페이지 ${page}` : ''} · 상담 종료 후 바로 파기` },
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
      return redirect('/consult/?error=send', origin);
    }
  } catch (err) {
    console.error('Slack 전송 중 예외', err);
    return redirect('/consult/?error=send', origin);
  }

  return redirect('/consult/done/', origin);
}

/** GET 으로 들어오면 폼으로 되돌린다. */
export async function onRequestGet(context) {
  return redirect('/consult/', new URL(context.request.url).origin);
}
