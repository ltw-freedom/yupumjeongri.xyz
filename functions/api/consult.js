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

  // 허니팟. 사람에게는 보이지 않는 필드라 값이 차 있으면 봇이다.
  // 봇에게 실패를 알려주면 우회를 시도하므로 성공한 것처럼 돌려보낸다.
  if (field(form, 'company', 1)) {
    return redirect('/consult/done/', origin);
  }

  const name = field(form, 'name', 40);
  const contact = field(form, 'contact', 60);
  const region = field(form, 'region', 60);
  const type = field(form, 'type', 40);
  const message = field(form, 'message', 2000);
  const agreed = form.get('privacy') !== null;

  if (!name || !contact || !agreed) {
    return redirect('/consult/?error=required', origin);
  }

  const receivedAt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const rows = [
    ['성함', name],
    ['연락처', contact],
    ['지역', region || '—'],
    ['서비스', type || '—'],
    ['접수 시각', `${receivedAt} (KST)`],
  ];

  const payload = {
    text: `새 상담 신청 — ${name} / ${contact}`, // 알림 미리보기용
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '새 상담 신청', emoji: false },
      },
      {
        type: 'section',
        fields: rows.map(([label, value]) => ({
          type: 'mrkdwn',
          text: `*${label}*\n${value}`,
        })),
      },
      ...(message
        ? [{ type: 'section', text: { type: 'mrkdwn', text: `*상담 내용*\n${message}` } }]
        : []),
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `yupumjeongri.xyz · 개인정보 수집 동의 완료` }],
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
