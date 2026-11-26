/**
 * 상담 폼 현장 사진 칸(src/components/PhotoField.astro) — 고른 사진을 브라우저에서 줄여 폼과 한 요청으로 보낸다 (2026-11-27).
 *
 * - 사진 칸은 JS 가 켤 때만 보인다. JS 가 꺼진 브라우저는 지금처럼 번호·선택 항목만 보낸다(폼 접수 자체는 그대로).
 * - 고르는 즉시 한 장씩 차례로 줄인다: 긴 변 1600px, JPEG 품질 0.8 (장당 대략 200~400KB).
 *   EXIF 회전은 createImageBitmap(imageOrientation: 'from-image'), 안 되면 <img> 디코딩(브라우저가 회전을 적용)으로 지킨다.
 *   줄인 결과가 원본보다 크면 원본을, 디코딩에 실패하면(HEIC 등) 원본을 보낸다. 그래도 장당 5MB 를 넘으면 그 사진만 빼고 알린다.
 * - 보내기를 누르면 줄이기가 끝날 때까지 버튼에 진행 상태를 보이고, 끝나면 사진을 파일 칸에 넣어 multipart 로 보낸다.
 * - 한 요청으로 보내는 까닭: 줄인 5장이면 2MB 안팎이라 한 번에 보내도 되고, 따로 올리면 신청을 그만둔 사람의
 *   사진도 KV 에 남아 하루 쓰기 한도(계정 전체 1,000건)와 저장 공간을 쓴다. 서버 상한은 worker/photos.js.
 *
 * 상한 숫자는 worker/photos.js 와 같게 유지한다.
 */

export const MAX_PHOTOS = 5;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** 한 요청에 싣는 사진 합계 — 서버 요청 상한(8MB)에서 글자 항목 몫을 넉넉히 뺀 값 */
const BUDGET_BYTES = 7.5 * 1024 * 1024;
const LONG_EDGE = 1600;
const QUALITY = 0.8;
/** 한 장 디코딩이 이보다 오래 걸리면 원본을 보낸다 */
const DECODE_TIMEOUT_MS = 20_000;
const RETRY_KEY = 'consult-photos';

type Item = {
  file: File;
  li: HTMLLIElement;
  /** 보낼 결과 — 줄인 JPEG 또는 원본. 아직 줄이는 중이면 undefined */
  out?: Blob;
  url?: string;
  removed?: boolean;
};

export interface PhotoField {
  /** 고른(아직 빼지 않은) 사진 수 */
  count(): number;
  /** 줄이기를 끝내고 파일 칸에 넣는다. 실패해도 던지지 않는다 — 사진은 선택 항목이라 접수가 먼저다 */
  prepare(onProgress?: (done: number, total: number) => void): Promise<void>;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/** EXIF 회전을 지켜 디코딩한다. 실패하면 null */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close(): void } | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* 옵션을 모르는 브라우저·디코딩 불가 형식 — 아래 <img> 로 한 번 더 */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // 요즘 브라우저는 <img> 에 EXIF 회전을 적용하고, 그 크기·방향 그대로 캔버스에 그린다
    if (!img.naturalWidth) return null;
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** 긴 변 1600px JPEG 로 줄인다. 디코딩·인코딩에 실패하면 null */
async function shrink(file: File): Promise<Blob | null> {
  const image = await decode(file);
  if (!image) return null;
  try {
    const scale = Math.min(1, LONG_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff'; // 투명 PNG 가 JPEG 에서 검게 나오지 않게
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image.source, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  } finally {
    image.close();
  }
}

/** 보낼 결과 하나 — 줄인 것이 원본보다 작을 때만 줄인 것을 쓴다 */
async function prepareOne(file: File): Promise<Blob> {
  try {
    const small = await withTimeout(shrink(file), DECODE_TIMEOUT_MS);
    if (small && small.size > 0 && small.size < file.size) return small;
  } catch {
    /* 시간 초과·예외 — 원본으로 */
  }
  return file;
}

const supportsFileList = () => {
  try {
    return typeof DataTransfer === 'function' && new DataTransfer().files instanceof FileList;
  } catch {
    return false;
  }
};

export function setupPhotoField(form: HTMLFormElement): PhotoField | null {
  const root = form.querySelector<HTMLElement>('[data-photo-field]');
  const input = root?.querySelector<HTMLInputElement>('input[type="file"]');
  const list = root?.querySelector<HTMLUListElement>('[data-photo-list]');
  const msg = root?.querySelector<HTMLElement>('[data-photo-msg]');
  const skippedField = root?.querySelector<HTMLInputElement>('input[name="photo_skipped"]');
  if (!root || !input || !list || !msg) return null;
  // 고른 사진을 파일 칸에 다시 넣을 수 없는 브라우저는 사진 칸을 켜지 않는다(원본을 그대로 보내 상한을 넘는 일을 막는다)
  if (!supportsFileList()) return null;
  root.hidden = false;

  const items: Item[] = [];
  let skipped = 0;
  // 한 장씩 차례로 — 12MP 사진 여러 장을 한꺼번에 디코딩하면 휴대폰 메모리가 모자란다
  let queue: Promise<void> = Promise.resolve();

  const live = () => items.filter((it) => !it.removed);

  const say = (text: string) => {
    msg.textContent = text;
    msg.hidden = !text;
  };

  const render = () => {
    const n = live().length;
    root.dataset.count = String(n);
    root.querySelector<HTMLElement>('[data-photo-count]')!.textContent = n ? `${n}/${MAX_PHOTOS}장` : '';
    input.disabled = n >= MAX_PHOTOS;
  };

  const drop = (item: Item) => {
    item.removed = true;
    if (item.url) URL.revokeObjectURL(item.url);
    item.li.remove();
    render();
  };

  const add = (file: File) => {
    const li = document.createElement('li');
    li.className = 'photo-field__item is-busy';
    const thumb = document.createElement('span');
    thumb.className = 'photo-field__thumb';
    thumb.textContent = '줄이는 중';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'photo-field__remove';
    remove.textContent = '빼기';
    li.append(thumb, remove);
    list.append(li);

    const item: Item = { file, li };
    items.push(item);
    remove.setAttribute('aria-label', `사진 ${live().length} 빼기`);
    remove.addEventListener('click', () => {
      drop(item);
      say('');
    });

    queue = queue.then(async () => {
      if (item.removed) return;
      const out = await prepareOne(file);
      if (item.removed) return;
      if (out.size > MAX_PHOTO_BYTES) {
        skipped += 1;
        drop(item);
        say(`용량이 커서(5MB 초과) 보낼 수 없는 사진 1장을 뺐습니다. 다른 사진으로 골라 주세요.`);
        return;
      }
      item.out = out;
      li.classList.remove('is-busy');
      item.url = URL.createObjectURL(out);
      const img = document.createElement('img');
      img.alt = '';
      img.src = item.url;
      // HEIC 원본처럼 이 브라우저가 못 보여 주는 사진은 글자로 — 보내는 데는 문제없다
      img.addEventListener('error', () => (thumb.textContent = '사진'));
      thumb.textContent = '';
      thumb.append(img);
    });
    render();
  };

  input.addEventListener('change', () => {
    const picked = Array.from(input.files ?? []).filter((f) => f.size > 0);
    input.value = ''; // 같은 칸으로 몇 번이고 더 고를 수 있게 비운다. 고른 사진은 목록이 들고 있다
    const room = MAX_PHOTOS - live().length;
    picked.slice(0, Math.max(0, room)).forEach(add);
    say(picked.length > room ? `사진은 ${MAX_PHOTOS}장까지 보낼 수 있어 ${picked.length - Math.max(0, room)}장은 넣지 않았습니다.` : '');
  });

  // 전송 오류로 돌아온 화면 — 사진은 브라우저가 되살릴 수 없어 다시 고르게 한다
  try {
    if (new URLSearchParams(location.search).has('error') && Number(sessionStorage.getItem(RETRY_KEY))) {
      say('사진은 다시 골라 주세요. 글자 입력은 그대로 두었습니다.');
    }
    sessionStorage.removeItem(RETRY_KEY);
  } catch {
    /* 무시 */
  }

  return {
    count: () => live().length,
    async prepare(onProgress) {
      try {
        const total = live().length;
        const tick = () => onProgress?.(live().filter((it) => it.out).length, live().length);
        tick();
        const timer = setInterval(tick, 300);
        await queue;
        clearInterval(timer);
        if (!total) return;

        const dt = new DataTransfer();
        let used = 0;
        let over = 0;
        live().forEach((item, i) => {
          if (!item.out) return;
          if (used + item.out.size > BUDGET_BYTES) {
            over += 1;
            return;
          }
          used += item.out.size;
          const ext = item.out.type === 'image/jpeg' ? 'jpg' : (item.file.name.split('.').pop() || 'img').slice(0, 5);
          dt.items.add(new File([item.out], `photo-${i + 1}.${ext}`, { type: item.out.type || 'application/octet-stream' }));
        });
        input.disabled = false; // 잠긴 칸은 폼 데이터에서 빠진다
        input.files = dt.files;
        if (skippedField) skippedField.value = String(Math.min(9, skipped + over));
        if (dt.files.length) form.enctype = 'multipart/form-data';
        try {
          sessionStorage.setItem(RETRY_KEY, String(dt.files.length));
        } catch {
          /* 무시 */
        }
      } catch {
        // 사진 준비가 어떤 이유로든 실패하면 사진 없이 보낸다 — 접수가 먼저다
        try {
          input.files = new DataTransfer().files;
        } catch {
          input.value = '';
        }
      }
    },
  };
}
