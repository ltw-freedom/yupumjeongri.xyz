/**
 * 상담 폼 현장 사진 — KV PHOTOS 에 30일 두고, Slack 상담 메시지에는 열람 주소를 싣는다 (2026-11-27).
 * JPEG·PNG 는 image 블록으로 메시지 안에 바로 보이고, Slack 이 그리지 못하는 형식은 링크 한 줄이다(functions/api/consult.js).
 *
 * 흐름: 브라우저(src/scripts/photo-field.ts)가 사진을 긴 변 1600px JPEG 로 줄여 상담 폼과 한 요청으로 보낸다
 *   → functions/api/consult.js 가 번호 검증을 통과한 신청에서만 storePhotos() 로 KV 에 넣는다
 *   → Slack 메시지의 image 블록·링크가 /api/photo/<id> 를 가리킴 → 이 Worker 의 servePhoto() 가 내준다
 *     (image 블록은 Slack 서버가 이 주소를 직접 받아 간다).
 *
 * - 사진은 선택 항목이다. 저장이 실패해도 접수는 막지 않고, 실패한 장 수를 Slack 메시지에 적는다.
 * - 키는 crypto.getRandomValues 16바이트(128비트)를 16진수 32자로 쓴 것 — 추측할 수 없는 주소가 곧 열람 권한이다.
 *   서명용 Secret 을 따로 두지 않는다(운영 설정을 늘리지 않으려고). 링크는 Slack 상담 채널에만 나간다.
 * - 보관은 KV expirationTtl 30일. 키가 지워지면 링크도 404 가 되므로 링크 유효 기간도 30일이다.
 * - 형식은 내용 첫 바이트(매직 바이트)로 판정한다(브라우저가 붙인 MIME·파일 이름을 믿지 않는다). JPEG·PNG·WebP·HEIC·HEIF 만
 *   저장하고, 그 밖의 형식은 그 사진만 빼고 접수는 계속한다(실패 장 수로 센다).
 * - 열람 응답은 허용 목록 형식으로만 낸다. 응답마다 nosniff 와 CSP "default-src 'none'; sandbox". 목록 밖이면
 *   application/octet-stream + Content-Disposition: attachment.
 * - 한도(무료 플랜 기준): KV 값 하나 25MiB · 쓰기 하루 1,000건(계정 전체) · 저장 1GB(계정 전체).
 *   그래서 장당 5MB, 한 신청 5장, 요청 전체 8MB 로 묶는다. 장당 수백 KB 로 줄여 오므로 보통 2MB 안팎이다.
 *
 * 열람 기록·목록은 두지 않는다. 지우려면 대시보드 KV 화면이나
 *   npx wrangler kv key delete <id> --binding PHOTOS --remote
 */

/** 한 신청에 받는 사진 수. src/scripts/photo-field.ts 의 MAX_PHOTOS 와 같아야 한다 */
export const MAX_PHOTOS = 5;
/** 장당 상한 — 줄이기에 실패한 원본(HEIC 등)까지 생각한 값. photo-field.ts 의 MAX_PHOTO_BYTES 와 같게 */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** 요청 전체 상한 — 이보다 크면 폼을 파싱하지 않는다(무료 플랜 CPU 10ms). photo-field.ts 의 예산보다 조금 크게 */
export const MAX_REQUEST_BYTES = 8 * 1024 * 1024;
/** 보관 기간(일). 사이트 문구는 src/data/site.ts privacy.photoDays */
export const PHOTO_TTL_DAYS = 30;

const ID_RE = /^[0-9a-f]{32}$/;
/** 저장·열람 모두 이 형식만. 판정은 sniffImage() — 내용 첫 바이트로 한다 */
export const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 첫 바이트로 이미지 형식을 판정한다. 모르는 형식이면 '' */
export function sniffImage(head) {
  const b = head;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const ascii = (from, to) => String.fromCharCode(...b.slice(from, to));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (b.length >= 12 && ascii(4, 8) === 'ftyp') {
    const brand = ascii(8, 12);
    if (['heic', 'heix', 'hevc', 'heim', 'heis'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1', 'heif'].includes(brand)) return 'image/heif';
  }
  return '';
}

/** 폼에서 사진 파일만 꺼낸다 — 빈 파일 칸(사진을 고르지 않은 채 보낸 multipart)은 뺀다 */
export function photoFiles(form) {
  return form.getAll('photos').filter((f) => typeof f !== 'string' && f.size > 0);
}

/**
 * 요청 본문을 상한까지만 읽는다. 넘으면 null — 그때는 폼을 파싱하지 않는다.
 * Content-Length 가 있으면 읽기 전에 거른다.
 */
export async function readCappedBody(request, max = MAX_REQUEST_BYTES) {
  const declared = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(declared) && declared > max) return null;
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

/**
 * 사진을 KV 에 넣는다. 앞에서부터 MAX_PHOTOS 장까지만 본다.
 * 돌려주는 값: stored = 저장된 사진의 id, types = stored 와 같은 순서의 형식(image/jpeg …, Slack 에서 image 블록으로
 * 그릴지 가를 때 쓴다), failed = 형식·크기·저장 오류로 넣지 못한 장 수, dropped = 장 수 초과로 뺀 수
 */
export async function storePhotos(env, files) {
  const take = files.slice(0, MAX_PHOTOS);
  const dropped = files.length - take.length;
  if (!take.length) return { stored: [], types: [], failed: 0, dropped };
  if (!env.PHOTOS) {
    console.error('PHOTOS KV 바인딩이 없어 사진을 저장하지 못함', take.length);
    return { stored: [], types: [], failed: take.length, dropped };
  }

  const results = await Promise.allSettled(
    take.map(async (file) => {
      if (file.size > MAX_PHOTO_BYTES) throw new Error(`too-large ${file.size}`);
      const data = new Uint8Array(await file.arrayBuffer());
      const type = sniffImage(data.subarray(0, 16));
      if (!type) throw new Error('not-image');
      const id = newId();
      await env.PHOTOS.put(id, data, {
        expirationTtl: PHOTO_TTL_DAYS * 86400,
        metadata: { type, at: Date.now() },
      });
      return { id, type };
    }),
  );
  const stored = [];
  const types = [];
  let failed = 0;
  for (const r of results) {
    if (r.status === 'fulfilled') {
      stored.push(r.value.id);
      types.push(r.value.type);
    } else {
      failed += 1;
      console.error('사진 저장 실패', String(r.reason?.message ?? r.reason));
    }
  }
  return { stored, types, failed, dropped };
}

/** Slack 전송이 실패한 신청의 사진은 지운다 — 신청자가 다시 보내면 새로 저장되므로 남겨 둘 까닭이 없다 */
export async function discardPhotos(env, ids) {
  if (!env.PHOTOS || !ids.length) return;
  await Promise.allSettled(ids.map((id) => env.PHOTOS.delete(id)));
}

export const photoUrl = (origin, id) => `${origin}/api/photo/${id}`;

/** 열람 응답마다 붙이는 머리글 — 검색 차단, 개인 캐시만, 내용 추측·스크립트 실행 차단 */
const PHOTO_HEADERS = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, max-age=86400',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Referrer-Policy': 'no-referrer',
};

const notFound = () =>
  new Response('사진이 없거나 보관 기간(30일)이 지나 삭제되었습니다.', {
    status: 404,
    headers: { ...PHOTO_HEADERS, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
  });

/** GET /api/photo/<id> — 보관된 현장 사진 한 장 */
export async function servePhoto(request, env, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, { status: 405, headers: { ...PHOTO_HEADERS, Allow: 'GET, HEAD' } });
  }
  const id = pathname.slice('/api/photo/'.length).replace(/\/$/, '');
  if (!ID_RE.test(id) || !env.PHOTOS) return notFound();
  const { value, metadata } = await env.PHOTOS.getWithMetadata(id, { type: 'stream' });
  if (!value) return notFound();
  if (request.method === 'HEAD') await value.cancel().catch(() => {});
  // 허용 목록의 형식만 그 형식으로 보여 준다. 목록 밖(있어서는 안 되지만)은 내려받기로만 낸다.
  // HEIC 원본은 브라우저에 따라 보이지 않고 내려받기로 열린다.
  const allowed = ALLOWED_TYPES.has(metadata?.type);
  return new Response(request.method === 'HEAD' ? null : value, {
    headers: {
      ...PHOTO_HEADERS,
      'Content-Type': allowed ? metadata.type : 'application/octet-stream',
      'Content-Disposition': allowed ? 'inline' : 'attachment',
    },
  });
}
