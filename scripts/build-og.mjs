/**
 * OG 이미지 생성기 — public/og-image.png (1200×630)
 *
 * 카카오톡·페이스북 공유 미리보기는 SVG 를 렌더링하지 못하므로 래스터가 필요하다.
 * SVG 를 문자열로 조립한 뒤 sharp(librsvg + pango)로 PNG 를 굽는다.
 *
 *   npm run og
 *
 * 결과물(public/og-image.png)은 커밋하므로 빌드 파이프라인에는 들어가지 않는다.
 * sharp 는 astro 의 의존성 트리에서 딸려온다 — 직접 설치하지 않는다.
 *
 * 슬로건·색을 바꿀 때는 src/data/site.ts 를 먼저 고치고 이 스크립트를 다시 돌릴 것.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const W = 1200;
const H = 630;

const NAVY = '#16233D';
const NAVY_DEEP = '#0E1730';
const GOLD = '#C8892A';
const GOLD_LIGHT = '#E8C07A';

/** 파비콘과 같은 비율의 추모 국화. R 은 바깥 꽃잎 끝까지의 반지름. */
function chrysanthemum({ cx, cy, r, fill, centerFill, opacity = 1 }) {
  const petals = [];

  // 바깥 10장
  const oW = 0.274 * r;
  const oTip = -r;
  const oLen = (1 - 0.387) * r;
  for (let i = 0; i < 10; i++) {
    petals.push(
      `<rect x="${-oW / 2}" y="${oTip}" width="${oW}" height="${oLen}" rx="${oW / 2}" transform="rotate(${i * 36})"/>`,
    );
  }

  // 안쪽 10장 (18도 엇갈림)
  const iW = 0.242 * r;
  const iTip = -0.79 * r;
  const iLen = (0.79 - 0.355) * r;
  for (let i = 0; i < 10; i++) {
    petals.push(
      `<rect x="${-iW / 2}" y="${iTip}" width="${iW}" height="${iLen}" rx="${iW / 2}" transform="rotate(${i * 36 + 18})"/>`,
    );
  }

  // 꽃심은 바깥 꽃잎이 시작되는 0.387r 을 반드시 넘어야 한다. 그보다 작으면
  // 안쪽 꽃잎 사이 틈이 고리 모양으로 비쳐 점선 링처럼 보인다.
  return `<g transform="translate(${cx} ${cy})" fill="${fill}" opacity="${opacity}">
    ${petals.join('\n    ')}
    <circle r="${0.403 * r}"/>
    <circle r="${0.226 * r}" fill="${centerFill}"/>
  </g>`;
}

const FONT = "'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR','Segoe UI',sans-serif";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${NAVY_DEEP}"/>
    </linearGradient>
    <clipPath id="frame"><rect width="${W}" height="${H}"/></clipPath>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <g clip-path="url(#frame)">
    ${chrysanthemum({ cx: 1002, cy: 300, r: 188, fill: '#ffffff', centerFill: '#ffffff', opacity: 0.07 })}
  </g>

  <!-- 상단 브랜드 라인 -->
  ${chrysanthemum({ cx: 122, cy: 112, r: 42, fill: '#ffffff', centerFill: GOLD })}
  <text x="184" y="127" font-family="${FONT}" font-size="34" font-weight="700"
        letter-spacing="3" fill="#ffffff">대한유품정리</text>

  <!-- 슬로건 -->
  <text x="80" y="330" font-family="${FONT}" font-size="82" font-weight="700"
        letter-spacing="-3" fill="#ffffff">유품정리,</text>
  <text x="80" y="428" font-family="${FONT}" font-size="82" font-weight="700"
        letter-spacing="-3" fill="#ffffff">값부터 공개합니다</text>

  <!-- 세 가지 약속 -->
  <text x="80" y="500" font-family="${FONT}" font-size="31" font-weight="600"
        letter-spacing="-1" fill="${GOLD_LIGHT}">정찰제 · 견적서 외 추가금 0원 · 최저가 보상</text>

  <!-- 하단 -->
  <rect x="80" y="548" width="${W - 160}" height="1" fill="#ffffff" opacity="0.18"/>
  <text x="80" y="592" font-family="${FONT}" font-size="26" font-weight="500"
        letter-spacing="0.5" fill="#ffffff" opacity="0.62">yupumjeongri.xyz</text>
</svg>`;

const out = fileURLToPath(new URL('../public/og-image.png', import.meta.url));

// palette(8bit) 로 줄이면 워터마크처럼 옅은 면에 밴딩이 생긴다. 트루컬러로 굽는다.
await sharp(Buffer.from(svg), { density: 96 })
  .png({ compressionLevel: 9 })
  .toFile(out);

// 디버그용으로 소스 SVG 도 남긴다 (public 에는 두지 않는다)
writeFileSync(fileURLToPath(new URL('./og-image.svg', import.meta.url)), svg);

console.log(`og-image.png 생성 완료 → ${out}`);
