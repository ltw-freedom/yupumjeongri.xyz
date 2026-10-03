/**
 * 쇼릴 렌더러 — showreel.html 을 프레임 단위로 찍어 ffmpeg 로 MP4 를 만든다.
 *
 *   node render.mjs                     # → showreel.mp4 (1920×1080, 60fps, 15초)
 *   node render.mjs --stills 3.2,6.9    # → .cache/still-3.20.png … (특정 시점 확인용)
 *
 * 프레임마다 window.reel.seek(t) 로 시간을 직접 지정하므로 실시간 재생과 무관하게 결과가 같다.
 * playwright-core 가 필요하다. 프로젝트 의존성에 넣지 않았으니 PW_PATH 로 위치를 알려주거나
 * 이 폴더에서 `npm i --no-save playwright-core` 후 실행할 것. 브라우저는 설치된 Chrome 을 쓴다.
 */
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pwPath = process.env.PW_PATH ? pathToFileURL(join(process.env.PW_PATH, 'index.mjs')).href : 'playwright-core';
const { chromium } = await import(pwPath);

const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : join(here, 'showreel.mp4');
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await chromium.launch({ executablePath: chrome, args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
page.on('pageerror', (e) => console.error('pageerror:', e.message));
await page.goto(pathToFileURL(join(here, 'showreel.html')).href);
await page.evaluate(async () => { await window.reel.ready; window.reel.capture(); });

const shot = (t) => page.evaluate((s) => window.reel.seek(s), t).then(() => page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1920, height: 1080 } }));

if (stillsArg) {
  const dir = join(here, '.cache');
  mkdirSync(dir, { recursive: true });
  for (const s of stillsArg.split(',').map(Number)) {
    const file = join(dir, `still-${s.toFixed(2)}.png`);
    await page.evaluate((x) => window.reel.seek(x), s);
    await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1920, height: 1080 } });
    console.log(file);
  }
} else {
  const { fps, duration } = await page.evaluate(() => ({ fps: window.reel.fps, duration: window.reel.duration }));
  const total = Math.round(fps * duration);
  const ff = spawn('ffmpeg', [
    '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-movflags', '+faststart', out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = 0; f < total; f++) {
    const buf = await shot(f / fps);
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`\rframe ${f}/${total}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  console.log(`\n${out}`);
}
await browser.close();
