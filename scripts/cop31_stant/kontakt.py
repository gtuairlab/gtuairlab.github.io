"""Kontakt sayfası: PNG kareleri (ya da videodan aralıklı kareleri) etiketli ızgaraya dizer.
  python3 kontakt.py png <cikti.png> <sutun> <genislik> kare1.png kare2.png ...
  python3 kontakt.py video <film.mp4> <aralik_sn> <cikti_oneki> [sutun=4] [genislik=480] [sayfa_basina=40]
"""
import sys, os, subprocess, tempfile, glob
from PIL import Image, ImageDraw, ImageFont

def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()

def sheet(files, labels, out, cols, w):
    h = round(w * 9 / 16); rows = (len(files) + cols - 1) // cols; pad = 6
    S = Image.new('RGB', (cols * (w + pad) + pad, rows * (h + pad) + pad), (40, 40, 40)); d = ImageDraw.Draw(S); f = font(max(12, w // 22))
    for i, (fn, lab) in enumerate(zip(files, labels)):
        im = Image.open(fn).convert('RGB').resize((w, h), Image.LANCZOS)
        x, y = pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad); S.paste(im, (x, y))
        tw = d.textlength(lab, font=f); d.rectangle((x, y, x + tw + 10, y + f.size + 8), fill=(0, 0, 0)); d.text((x + 5, y + 3), lab, fill=(255, 220, 0), font=f)
    S.save(out); print(out, S.size)

if sys.argv[1] == 'png':
    out, cols, w = sys.argv[2], int(sys.argv[3]), int(sys.argv[4]); files = sys.argv[5:]
    sheet(files, [os.path.basename(f)[:-4] for f in files], out, cols, w)
else:
    mp4, step, pre = sys.argv[2], float(sys.argv[3]), sys.argv[4]
    cols = int(sys.argv[5]) if len(sys.argv) > 5 else 4; w = int(sys.argv[6]) if len(sys.argv) > 6 else 480; per = int(sys.argv[7]) if len(sys.argv) > 7 else 40
    td = tempfile.mkdtemp()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', mp4, '-vf', f'fps=1/{step}', os.path.join(td, '%04d.png')], check=True)
    fs = sorted(glob.glob(os.path.join(td, '*.png')))
    labs = [f'{(i) * step:.0f} s' for i in range(len(fs))]   # fps filtresi: k. kare ≈ k·adım
    for p in range(0, len(fs), per):
        sheet(fs[p:p + per], labs[p:p + per], f'{pre}_{p // per + 1}.png', cols, w)
