"""
소개 영상 빌드 — showreel.src.html 에 폰트·사진을 인라인해서 한 파일로 만든다.

  python docs/showreel/build.py            # → docs/showreel/showreel.html (독립 실행용, doctype 포함)
  python docs/showreel/build.py --artifact  # → 위 + .cache/showreel.artifact.html (doctype 없는 본문 버전)

폰트는 파일에 실제로 쓰인 글자만 남겨 서브셋한다. 카피를 고치면 다시 빌드할 것.
 - Pretendard Variable: jsdelivr 원본을 받아 fontTools 로 서브셋 (tnum 등 레이아웃 기능 유지)
 - Noto Serif KR 700, IBM Plex Mono 400/500: Google Fonts 의 text= 서브셋을 그대로 받는다
사진은 __PHOTO:파일명__ 자리에 src/assets/cases/파일명 을 긴 변 960px 로 줄여 넣는다.
"""
import base64
import io
import os
import re
import string
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools import subset
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
CACHE = Path(os.environ.get('REEL_CACHE', HERE / '.cache'))
CACHE.mkdir(parents=True, exist_ok=True)

UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
PRETENDARD_URL = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/web/variable/woff2/PretendardVariable.woff2'


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def data_uri(raw: bytes, mime: str) -> str:
    return f'data:{mime};base64,{base64.b64encode(raw).decode()}'


def google_subset(family: str, weights: str, text: str) -> list[bytes]:
    q = urllib.parse.urlencode({'family': f'{family}:wght@{weights}', 'text': text, 'display': 'block'})
    css = fetch(f'https://fonts.googleapis.com/css2?{q}').decode()
    urls = re.findall(r'url\((https://[^)]+)\)', css)
    if not urls:
        raise SystemExit(f'Google Fonts returned no font files for {family}:\n{css[:400]}')
    return [fetch(u) for u in urls]


def main() -> None:
    src = (HERE / 'showreel.src.html').read_text(encoding='utf-8')

    extra = '–—·→←×~‘’“”…−°'
    chars = sorted(set(src) | set(string.printable.strip()) | set(extra) | {' '})
    text_all = ''.join(c for c in chars if c.isprintable())
    text_latin = ''.join(c for c in text_all if ord(c) < 0x3000)

    # Pretendard Variable → subset
    pret = CACHE / 'PretendardVariable.woff2'
    if not pret.exists():
        pret.write_bytes(fetch(PRETENDARD_URL))
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    font = subset.load_font(str(pret), opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text_all)
    sub.subset(font)
    buf = io.BytesIO()
    subset.save_font(font, buf, opts)
    sans = buf.getvalue()

    (serif,) = google_subset('Noto Serif KR', '700', text_all)
    mono4, mono5 = google_subset('IBM Plex Mono', '400;500', text_latin)

    photo_bytes = 0

    def photo(m: re.Match) -> str:
        nonlocal photo_bytes
        img = Image.open(ROOT / 'src/assets/cases' / m.group(1)).convert('RGB')
        img.thumbnail((960, 960))
        jb = io.BytesIO()
        img.save(jb, 'JPEG', quality=80, optimize=True, progressive=True)
        photo_bytes += jb.tell()
        return data_uri(jb.getvalue(), 'image/jpeg')

    out = (
        src.replace('__FONT_SANS__', data_uri(sans, 'font/woff2'))
        .replace('__FONT_SERIF__', data_uri(serif, 'font/woff2'))
        .replace('__FONT_MONO4__', data_uri(mono4, 'font/woff2'))
        .replace('__FONT_MONO5__', data_uri(mono5, 'font/woff2'))
    )
    out = re.sub(r'__PHOTO:([\w.-]+)__', photo, out)

    standalone = (
        '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '</head>\n<body>\n' + out + '\n</body>\n</html>\n'
    )
    (HERE / 'showreel.html').write_text(standalone, encoding='utf-8')
    if '--artifact' in sys.argv:
        (CACHE / 'showreel.artifact.html').write_text(out, encoding='utf-8')

    def kb(b: bytes) -> str:
        return f'{len(b) / 1024:.0f}KB'

    print(f'sans {kb(sans)} · serif {kb(serif)} · mono {kb(mono4)}+{kb(mono5)} · photos {photo_bytes / 1024:.0f}KB')
    print(f'showreel.html {len(standalone.encode()) / 1024:.0f}KB · {len(text_all)} glyphs')


if __name__ == '__main__':
    main()
