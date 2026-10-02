/**
 * 방문·상담 깔때기 기록 — 방문 → 번호 칸 누름 → 제출 시도 → 접수 중 어디서 끊기는지 보려는 것.
 *
 * 2026-10 상담 0건이 7주째 이어졌는데 "방문이 없어서인지, 와서 안 남기는 건지"를 판별할 숫자가 없었다.
 * 네이버 애널리틱스는 대시보드를 열어야 보이고 폼 단계는 잡지 못한다. 그래서 직접 센다.
 *
 * 받는 것: 이벤트 종류·페이지 경로·유입 출처 호스트·검색어(리퍼러에 실려 올 때만)·탭마다 새로 만드는 임의 id.
 * 번호·IP·쿠키는 쓰지 않는다. 서버는 worker/funnel.js, 요약은 매일 09:00 Slack 상담 채널.
 */

export type FunnelEvent = 'view' | 'focus' | 'invalid' | 'submit' | 'calc' | 'cta';

const SID_KEY = 'funnel-sid';

function sessionId(): string {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return 'nostorage';
  }
}

/** 실패해도 페이지 동작에는 영향이 없다 — 측정용이다 */
export function track(type: FunnelEvent, extra: { r?: string } = {}) {
  try {
    const body = JSON.stringify({ t: type, p: location.pathname, s: sessionId(), ...extra });
    const blob = new Blob([body], { type: 'text/plain' });
    if (!navigator.sendBeacon?.('/api/event', blob)) {
      fetch('/api/event', { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  } catch {
    /* 무시 */
  }
}

/** 한 페이지에서 같은 이벤트는 한 번만 — 번호 칸을 여러 번 눌러도 1 */
const once = new Set<FunnelEvent>();
function trackOnce(type: FunnelEvent) {
  if (once.has(type)) return;
  once.add(type);
  track(type);
}

track('view', { r: document.referrer });

document.addEventListener('focusin', (event) => {
  const el = event.target;
  if (el instanceof HTMLInputElement && el.name === 'phone') trackOnce('focus');
});

// 상담 페이지로 가는 링크(헤더·하단 고정 CTA·본문 버튼) — 폼이 없는 페이지에서 관심을 보였다는 신호
document.addEventListener('click', (event) => {
  const a = (event.target as Element | null)?.closest?.('a[href]');
  if (a && new URL((a as HTMLAnchorElement).href, location.href).pathname === '/consult/') trackOnce('cta');
});

// 예상 비용 계산기를 만졌는지
document.getElementById('estimate')?.addEventListener('change', () => trackOnce('calc'));
