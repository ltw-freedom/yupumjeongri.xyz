/**
 * IndexNow 제출 — 네이버 서치어드바이저 + Bing(api.indexnow.org) 에 URL 을 밀어 넣는다.
 *
 * 왜 필요한가: 2026-09 기준 네이버 색인률이 12% 수준이고, 신규 칼럼이 색인되는 데
 * 4~7일이 걸렸다. 사이트맵 제출만으로는 "언제 가져갈지"를 네이버가 정한다.
 * IndexNow 는 우리가 "이 URL 이 바뀌었다"고 먼저 알리는 프로토콜이고, 네이버와 Bing
 * (Yandex·Seznam·Yep 도 공유) 이 받는다. Google 은 참여하지 않는다 → Search Console.
 *
 * 인증: 사이트 루트에 `/{key}.txt` 파일이 있어야 한다 (public/ 에 두었다).
 * 키를 바꾸면 이 파일의 KEY 와 public/{key}.txt 를 반드시 같이 바꿀 것.
 *
 * 사용법 (dist/ 가 있어야 하므로 build 뒤에 실행):
 *   node scripts/indexnow.mjs --all            사이트맵의 전체 URL 제출 (초기 1회, 대규모 개편 뒤)
 *   node scripts/indexnow.mjs --recent [days]  최근 N일(기본 14) 안에 발행·수정된 칼럼 + 칼럼 목록 + 홈
 *   node scripts/indexnow.mjs /column/foo/ /cost/   지정한 경로만
 *
 * IndexNow 규약상 "바뀐 URL" 만 보내는 것이 원칙이다. 배포 스크립트는 --recent 를 쓰고,
 * --all 은 손으로만 돌린다 (같은 URL 을 매일 전량 재제출하면 신호 가치가 떨어진다).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://yupumjeongri.xyz';
const HOST = 'yupumjeongri.xyz';
const KEY = 'e7f8f8a019ddeb13a7958033e59cf553';
const KEY_LOCATION = `${SITE}/${KEY}.txt`;

/** 제출 대상 엔진. 네이버는 자체 엔드포인트, 나머지는 api.indexnow.org 가 공유한다. */
const ENDPOINTS = [
  { name: 'Naver', url: 'https://searchadvisor.naver.com/indexnow' },
  { name: 'IndexNow(Bing 등)', url: 'https://api.indexnow.org/indexnow' },
];

const DIST = new URL('../dist/', import.meta.url);
const COLUMNS = new URL('../src/content/columns/', import.meta.url);

function readSitemapUrls() {
  const indexPath = new URL('sitemap-index.xml', DIST);
  if (!existsSync(indexPath)) {
    throw new Error('dist/sitemap-index.xml 이 없습니다. 먼저 npm run build 를 실행하세요.');
  }
  const index = readFileSync(indexPath, 'utf-8');
  const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = new Set();
  for (const child of children) {
    const file = child.replace(SITE, '').replace(/^\//, '');
    const xml = readFileSync(new URL(file, DIST), 'utf-8');
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1]);
  }
  return [...urls];
}

/** 최근 N일 안에 발행·수정된 칼럼 URL. frontmatter 의 publishedAt / updatedAt 을 본다. */
function recentColumnUrls(days) {
  const since = Date.now() - days * 86_400_000;
  const urls = [];
  for (const file of readdirSync(COLUMNS)) {
    if (!file.endsWith('.md')) continue;
    const src = readFileSync(new URL(file, COLUMNS), 'utf-8');
    if (/^draft:\s*true/m.test(src)) continue;
    const dates = [...src.matchAll(/^(?:publishedAt|updatedAt):\s*(\S+)/gm)].map((m) => Date.parse(m[1]));
    if (dates.some((d) => d >= since)) urls.push(`${SITE}/column/${file.replace(/\.md$/, '')}/`);
  }
  return urls;
}

function toAbsolute(pathOrUrl) {
  if (pathOrUrl.startsWith('http')) return pathOrUrl;
  const p = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE}${p.endsWith('/') || p.includes('.') ? p : `${p}/`}`;
}

async function submit(urlList) {
  const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList });
  for (const { name, url } of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body,
      });
      const text = (await res.text()).trim();
      // 200 OK, 202 Accepted 가 정상. 403 = 키 파일 불일치, 422 = URL·호스트 불일치, 429 = 과다 제출.
      const ok = res.status === 200 || res.status === 202;
      console.log(`${ok ? '✔' : '✖'} ${name}: HTTP ${res.status}${text ? ` ${text.slice(0, 200)}` : ''}`);
    } catch (err) {
      console.log(`✖ ${name}: ${err.message}`);
    }
  }
}

const args = process.argv.slice(2);
let urls;
let label;
if (args[0] === '--all') {
  urls = readSitemapUrls();
  label = '사이트맵 전체';
} else if (args[0] === '--recent') {
  const days = Number(args[1]) || 14;
  urls = [`${SITE}/`, `${SITE}/column/`, ...recentColumnUrls(days)];
  label = `최근 ${days}일 칼럼 + 목록 + 홈`;
} else if (args.length > 0) {
  urls = args.map(toAbsolute);
  label = '지정 경로';
} else {
  console.log('사용법: node scripts/indexnow.mjs --all | --recent [days] | <path> [<path> ...]');
  process.exit(1);
}

urls = [...new Set(urls)];
console.log(`IndexNow 제출 — ${label}, ${urls.length}개 URL`);
if (urls.length <= 20) for (const u of urls) console.log(`  ${u}`);

// 규약상 1회 요청에 10,000개까지. 사이트맵 전량이라도 한 번에 들어가지만 안전하게 나눈다.
for (let i = 0; i < urls.length; i += 5000) {
  await submit(urls.slice(i, i + 5000));
}
