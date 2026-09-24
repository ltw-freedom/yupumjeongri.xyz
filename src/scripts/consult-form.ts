/**
 * 상담 폼 공통 보강 — 사이트 안의 모든 form[data-consult] 에 붙는다.
 *
 * 폼 자체는 JS 없이도 동작한다(일반 POST → 서버 303). 여기서 하는 일은 전부 "보강"이다.
 *  - 신청한 페이지 경로를 hidden page 필드에 넣는다 (전환이 어느 페이지에서 나는지 Slack 에서 본다)
 *  - 휴대폰 번호를 입력하는 대로 010-1234-5678 형태로 맞춘다
 *  - 번호 형식이 틀리면 서버에 보내기 전에 그 자리에서 알린다 — 왕복 한 번에 입력이 날아가던 문제
 *  - 전송 중에는 버튼을 잠가 두 번 접수되지 않게 한다
 *  - 보내기 직전 입력값을 sessionStorage 에 담아 두고, 서버가 ?error= 로 돌려보내면 되살린다
 *  - 접수 완료 페이지에서 "010-12**-5678 로 연락드립니다"를 보여준다 (번호 오타 확인용)
 *  - 모바일에서 입력 칸에 포커스가 있으면 하단 고정 CTA 를 숨긴다 (키보드 위에 떠서 입력을 가린다)
 *
 * 판정 규칙은 functions/api/consult.js 의 normalizePhone() 과 같게 유지할 것.
 */

const DRAFT_KEY = 'consult-draft';
const PHONE_RE = /^01[016789]\d{7,8}$/;
/** 되살리지 않는 필드 — 허니팟과 페이지마다 달라지는 값 */
const SKIP = new Set(['hp_leave_blank', 'page']);

function digitsOf(value: string): string {
  return value.replace(/\D/g, '').replace(/^82/, '0');
}

function formatPhone(value: string): string {
  const d = digitsOf(value).slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  // 10자리(011-123-4567)와 11자리(010-1234-5678)를 가른다
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

function readDraft(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveDraft(form: HTMLFormElement) {
  const data: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (!SKIP.has(key) && typeof value === 'string' && value) data[key] = value;
  });
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    /* 사생활 보호 모드 등 — 되살리기만 못 할 뿐 전송에는 영향 없다 */
  }
}

function restoreDraft(form: HTMLFormElement, draft: Record<string, string>) {
  for (const [key, value] of Object.entries(draft)) {
    const fields = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[name="${CSS.escape(key)}"]`,
    );
    // 계산기·지역 페이지에서 보낸 항목(짐의 양, 페이지 지역 등)은 /consult/ 폼에 칸이 없다.
    // 버리지 않고 숨은 필드로 붙여 다시 보낼 때 함께 가게 한다.
    if (!fields.length) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.append(input);
      continue;
    }
    fields.forEach((el) => {
      if (el instanceof HTMLInputElement && (el.type === 'radio' || el.type === 'checkbox')) {
        el.checked = el.value === value;
      } else if (!(el instanceof HTMLInputElement && el.type === 'hidden')) {
        el.value = value;
      }
    });
  }
}

function showPhoneError(form: HTMLFormElement, message: string) {
  const box = form.querySelector<HTMLElement>('[data-phone-error]');
  const input = form.querySelector<HTMLInputElement>('input[name="phone"]');
  if (box) {
    box.textContent = message;
    box.hidden = false;
  }
  input?.setAttribute('aria-invalid', 'true');
  input?.focus();
}

function clearPhoneError(form: HTMLFormElement) {
  const box = form.querySelector<HTMLElement>('[data-phone-error]');
  if (box) box.hidden = true;
  form.querySelector('input[name="phone"]')?.removeAttribute('aria-invalid');
}

function enhance(form: HTMLFormElement) {
  const page = form.querySelector<HTMLInputElement>('input[name="page"]');
  if (page) page.value = location.pathname;

  const phone = form.querySelector<HTMLInputElement>('input[name="phone"]');
  phone?.addEventListener('input', () => {
    // 지우는 중에는 하이픈을 다시 끼우지 않는다 — 커서가 튀어서 지우기가 안 된다
    const deleting = phone.value.length < (phone.dataset.prev?.length ?? 0);
    if (!deleting) phone.value = formatPhone(phone.value);
    phone.dataset.prev = phone.value;
    if (PHONE_RE.test(digitsOf(phone.value))) clearPhoneError(form);
  });

  // 브라우저 기본 말풍선 대신 폼 안의 문장으로 알린다 (모바일에서 말풍선이 잘 안 보인다)
  form.noValidate = true;

  form.addEventListener('submit', (event) => {
    const value = digitsOf(phone?.value ?? '');
    if (!value) {
      event.preventDefault();
      showPhoneError(form, '연락받으실 휴대폰 번호를 입력해 주세요.');
      return;
    }
    if (!PHONE_RE.test(value)) {
      event.preventDefault();
      showPhoneError(form, '휴대폰 번호를 다시 확인해 주세요. 예: 010-1234-5678');
      return;
    }
    if (phone) phone.value = formatPhone(phone.value);
    saveDraft(form);

    // 상담 페이지처럼 보내기 버튼이 둘인 폼도 있다 — 누른 버튼 글자를 바꾸고 전부 잠근다
    const pressed = (event.submitter as HTMLButtonElement | null) ?? form.querySelector('button[type="submit"]');
    form.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((button) => {
      button.dataset.label = button.textContent ?? '';
      if (button === pressed) button.textContent = '보내는 중…';
      // 같은 틱에 disabled 로 바꾸면 일부 브라우저가 submitter 를 폼 데이터에서 뺀다 — 한 틱 미룬다
      setTimeout(() => (button.disabled = true));
    });
  });
}

document.querySelectorAll<HTMLFormElement>('form[data-consult]').forEach(enhance);

// 뒤로 가기로 돌아왔을 때(bfcache) 잠긴 버튼을 푼다
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return;
  document.querySelectorAll<HTMLButtonElement>('form[data-consult] button[type="submit"]').forEach((button) => {
    if (button.dataset.label) button.textContent = button.dataset.label;
    button.disabled = false;
  });
});

// 서버가 ?error= 로 돌려보냈다면 방금 입력한 내용을 되살린다
const params = new URLSearchParams(location.search);
if (params.has('error')) {
  const draft = readDraft();
  const form = document.querySelector<HTMLFormElement>('form[data-consult]');
  if (draft && form) restoreDraft(form, draft);
}

// 접수 완료 — 남긴 번호를 가려서 보여 주고 임시 저장을 지운다
const echo = document.querySelector<HTMLElement>('[data-phone-echo]');
if (echo) {
  const phone = readDraft()?.phone;
  if (phone) {
    const f = formatPhone(phone).split('-');
    if (f.length === 3) {
      echo.textContent = `${f[0]}-${f[1].slice(0, 2)}${'*'.repeat(f[1].length - 2)}-${f[2]}`;
      echo.closest<HTMLElement>('[data-phone-echo-wrap]')?.removeAttribute('hidden');
    }
  }
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* 무시 */
  }
}

// 모바일 하단 고정 CTA — 입력 중에는 숨긴다
// 키보드가 올라오는 칸만 — 라디오·체크박스를 누를 때는 숨기지 않는다
const isField = (el: EventTarget | null) =>
  (el instanceof HTMLInputElement && !['radio', 'checkbox', 'hidden', 'submit', 'button'].includes(el.type)) ||
  el instanceof HTMLTextAreaElement;
document.addEventListener('focusin', (event) => {
  if (isField(event.target)) document.body.classList.add('is-typing');
});
document.addEventListener('focusout', (event) => {
  if (isField(event.target)) document.body.classList.remove('is-typing');
});

// 하단 고정 CTA 의 '예상 비용' 버튼 — 이 페이지에 계산기가 있으면 페이지 안으로 보낸다
if (document.getElementById('estimate')) {
  document.querySelectorAll<HTMLAnchorElement>('[data-estimate-link]').forEach((a) => {
    a.href = '#estimate';
  });
}
