/**
 * 아이콘 생성기 — public/favicon.svg 하나에서 래스터 아이콘을 굽는다.
 *
 *   node scripts/build-icons.mjs
 *
 * 왜: 파비콘이 SVG 하나뿐이라 /favicon.ico 가 404 였고(2026-10-23 확인), 검색 결과·북마크·홈 화면이
 * SVG 를 읽는다는 보장이 없다. 그래서 같은 국화 심볼로
 *  - favicon.ico      16·32·48px (PNG 를 담은 ICO — 브라우저가 /favicon.ico 를 관례로 찾는다)
 *  - apple-touch-icon.png  180px (iOS 홈 화면. 모서리는 iOS 가 직접 깎으므로 둥근 모서리 없이 꽉 채운다)
 *  - icon-192.png · icon-512.png (안드로이드·구조화 데이터 logo)
 * 를 만든다. 결과물은 커밋한다(빌드 파이프라인에 넣지 않음). 심볼을 바꾸면 favicon.svg 를 고치고 다시 돌릴 것.
 * sharp 는 astro 의존성 트리에서 딸려온다 (build-og.mjs 와 같음).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const svg = readFileSync(pub('favicon.svg'), 'utf-8');
// 홈 화면·로고용은 배경을 꽉 채운다 (투명 모서리가 iOS 에서 검게 보인다)
const squareSvg = svg.replace('rx="7"', 'rx="0"');

const png = (source, size) => sharp(Buffer.from(source), { density: (72 * size) / 32 }).resize(size, size).png().toBuffer();

/** PNG 여러 장을 ICO 하나로 — 헤더 6바이트 + 이미지당 디렉터리 16바이트 + PNG 원본 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = 아이콘
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + images.length * 16;
  const dirs = images.map(({ size, data }) => {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(size >= 256 ? 0 : size, 0);
    dir.writeUInt8(size >= 256 ? 0 : size, 1);
    dir.writeUInt8(0, 2); // 팔레트 없음
    dir.writeUInt8(0, 3);
    dir.writeUInt16LE(1, 4); // 색 평면
    dir.writeUInt16LE(32, 6); // 비트 수
    dir.writeUInt32LE(data.length, 8);
    dir.writeUInt32LE(offset, 12);
    offset += data.length;
    return dir;
  });
  return Buffer.concat([header, ...dirs, ...images.map((image) => image.data)]);
}

const icoSizes = [16, 32, 48];
const icoImages = await Promise.all(icoSizes.map(async (size) => ({ size, data: await png(svg, size) })));
writeFileSync(pub('favicon.ico'), ico(icoImages));
writeFileSync(pub('apple-touch-icon.png'), await png(squareSvg, 180));
writeFileSync(pub('icon-192.png'), await png(squareSvg, 192));
writeFileSync(pub('icon-512.png'), await png(squareSvg, 512));
console.log('favicon.ico, apple-touch-icon.png, icon-192.png, icon-512.png 생성');
