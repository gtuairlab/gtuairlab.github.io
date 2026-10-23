"""COP31 harita animasyonu · uydu dokusunu hazırlar (repoya görüntü girmez; çıktı geçici klasöre).
Kullanım: python3 harita_hazirla.py <uygulama_ekran_goruntusu.png> <cikti_klasoru>
Girdi: uygulamanın Uydu katmanındaki masaüstü ekran görüntüsü (1920×922, 20 Ekim 2026; harita alanı x 330–1530, y 60–880).
1) Coğrafi eşleme: Web Mercator'da tek ölçek + öteleme (kuzey yukarı). Kontrol noktaları: PurpleAir işareti ve uygulamanın
   bina etiketleri (Leaflet etiketi bina sınır kutusunun merkezindedir). En küçük kareler, aykırılar (>15 px) dışarıda;
   sonra uygulamanın çizdiği mavi bina dolgularıyla örtüşme (IoU) en büyüklenerek ince ayar.
2) Temizleme: uygulamanın yarı saydam dolguları (bina/yol/yeşil/otopark) tersine çevrilir; kenar çizgileri, etiketler,
   işaretçiler ve PurpleAir kutusu çevreden doldurulur (normalleştirilmiş evrişim).
3) Harita alanı kırpılır, 3× büyütülür ve hafif keskinleştirilir → doku.png; eşleme → georef.json; kontrol → kontrol_*.png."""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
GEO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend_v2', 'data', 'campus.geojson')
F = json.load(open(GEO, encoding='utf-8'))['features']
R = 6378137.0
def merc(lon, lat): return (math.radians(lon) * R, R * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)))
def rings(g): return g['coordinates'] if g['type'] == 'Polygon' else [r for p in g['coordinates'] for r in p]
def bboxc(i):
    pts = [q for r in rings(F[i]['geometry']) for q in r]; xs = [q[0] for q in pts]; ys = [q[1] for q in pts]
    return ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
MAP = (330, 60, 1530, 880)        # yalnızca harita alanı (paneller ve filigran dışarıda)

# ── 1. kontrol noktaları (ekran pikseli, etiket kutusu merkezi) ──
CP = {'PurpleAir (SUMER)': ((29.360985, 40.806155), (1115, 705)),
      'Martest Lab.': (bboxc(273), (735.8, 175.8)), 'Kongre ve Kültür M.': (bboxc(169), (1089, 364)),
      'Rektörlük': (bboxc(270), (998.5, 461)), 'Personel Yemekhanesi': (bboxc(268), (975, 503)),
      'Mimarlık Fak. N Blok': (bboxc(152), (1156.5, 511.5)), 'Ana Kapı': (bboxc(167), (1243, 580)),
      'İşletme Fak.': (bboxc(142), (1149, 599)), 'Elektronik/İnşaat Müh.': (bboxc(80), (921, 686.8)),
      'TeknoPark': (bboxc(21), (1085, 813))}
def lsq(keys):
    A, b = [], []
    for k in keys:
        X, Y = merc(*CP[k][0]); px, py = CP[k][1]; A += [[X, 1, 0], [-Y, 0, 1]]; b += [px, py]
    return np.linalg.lstsq(np.array(A), np.array(b), rcond=None)[0]
def resid(s, tx, ty):
    return {k: math.hypot(s * merc(*ll)[0] + tx - p[0], -s * merc(*ll)[1] + ty - p[1]) for k, (ll, p) in CP.items()}
keys = list(CP)
for _ in range(3):
    s, tx, ty = lsq(keys); r = resid(s, tx, ty); keys = [k for k in CP if r[k] <= 15]
img = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float64)
H, W = img.shape[:2]
inmap = np.zeros((H, W), bool); inmap[MAP[1]:MAP[3], MAP[0]:MAP[2]] = True
blue = ((img[..., 2] - img[..., 0]) > 30) & ((img[..., 2] - img[..., 1]) > 15) & inmap
bina = [f for f in F if f['properties'].get('cat') == 'bina']
def raster(feats, s, tx, ty, k=1):
    m = Image.new('L', (W * k, H * k), 0); d = ImageDraw.Draw(m)
    for f in feats:
        for rg in rings(f['geometry']):
            d.polygon([((s * merc(*q)[0] + tx) * k, (-s * merc(*q)[1] + ty) * k) for q in rg], fill=255)
    return m
def iou(s, tx, ty):
    m = (np.asarray(raster(bina, s, tx, ty)) > 0) & inmap
    return (m & blue).sum() / (m | blue).sum()
X0, Y0 = merc(29.360985, 40.806155)
best = (iou(s, tx, ty), s, tx, ty); iou0 = best[0]
for it in range(4):
    sc0, s0, tx0, ty0 = best; cx, cy = s0 * X0 + tx0, -s0 * Y0 + ty0
    for ds in np.linspace(-.006, .006, 7) * .5 ** it:
        for dx in np.arange(-6, 7, 2) * .5 ** it:
            for dy in np.arange(-6, 7, 2) * .5 ** it:
                s2 = s0 * (1 + ds); t2 = (cx + dx - s2 * X0, cy + dy + s2 * Y0); v = iou(s2, *t2)
                if v > best[0]: best = (v, s2, *t2)
_, s, tx, ty = best
r = resid(s, tx, ty)
mpp = math.cos(math.radians(40.806)) / s
print(f'Eşleme: {mpp:.3f} m/piksel · IoU {iou0:.3f} → {best[0]:.3f}')
for k, v in r.items(): print(f'  {k:24s} artık {v:5.1f} px ({v * mpp:5.1f} m){"" if k in keys else "  (aykırı, dışarıda)"}')
rin = [r[k] for k in keys]
print(f'  RMS (kullanılan {len(keys)} nokta): {math.sqrt(np.mean(np.square(rin))):.1f} px; tümü: {math.sqrt(np.mean(np.square(list(r.values())))):.1f} px')

# ── 2. temizleme ──
STY = {'yol': ('#c9ccd3', .14), 'otopark': ('#c9ccd3', .10), 'yesil': ('#3aa36f', .16), 'orman': ('#3aa36f', .36), 'bina': ('#5b8def', .26)}
hexc = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)
out = img.copy()
for cat in ['bina', 'orman', 'yesil', 'otopark', 'yol']:        # üstten alta doğru tersine çevir
    col, a = STY[cat]; T = np.ones((H, W))
    for f in F:
        if f['properties'].get('cat') != cat: continue
        cov = np.asarray(raster([f], s, tx, ty, 4).resize((W, H), Image.BOX)) / 255.0
        T *= 1 - a * cov
    out = (out - (1 - T)[..., None] * hexc(col)) / T[..., None]
out = np.clip(out, 0, 255)
mask = np.zeros((H, W), bool)
# kenar çizgileri (yerleşim hatası payıyla 2 px genişletilmiş)
lines = Image.new('L', (W, H), 0); d = ImageDraw.Draw(lines)
for f in F:
    cat = f['properties'].get('cat')
    if cat not in ('bina', 'orman', 'otopark', 'sinir'): continue     # yeşil alan çizgisi soluk (%45, 0,8 px): bırakılır
    for rg in rings(f['geometry']):
        p = [(s * merc(*q)[0] + tx, -s * merc(*q)[1] + ty) for q in rg]; d.line(p + [p[0]], fill=255, width=3)
mask |= np.asarray(lines) > 0
linem = mask.copy()
lum = img.mean(2)
# uygulamanın etiketleri: (simge merkezi, yazı kutusu)
LBL = [((672.5, 175.8), (685, 164, 812, 188)), ((1036.5, 363.5), (1050, 351, 1156, 378)), ((967.5, 461), (981, 451, 1045, 471)),
       ((932.5, 502.5), (945, 489, 1031, 518)), ((1095, 511.5), (1107, 502, 1233, 522)), ((1220.5, 580), (1233, 570, 1281, 590)),
       ((1111.5, 599), (1124, 589, 1202, 609)), ((878, 686.5), (890, 673, 979, 701)), ((1222.5, 731), (1235, 718, 1351, 746)),
       ((1050.5, 813), (1063, 803, 1134, 823)), (None, (918, 391, 1052, 410))]
yy, xx = np.mgrid[0:H, 0:W]
for ic, (x0, y0, x1, y1) in LBL:
    if ic: mask |= (xx - ic[0]) ** 2 + (yy - ic[1]) ** 2 <= 17 ** 2
    box = np.zeros((H, W), bool); box[y0:y1, x0:x1] = True
    mask |= ndimage.binary_dilation((lum > 150) & box, iterations=4) & ndimage.binary_dilation(box, iterations=4)
# PurpleAir kutusu, işaretçiler, ATP-4, Amfi simgesi
for x0, y0, x1, y1 in [(1048, 661, 1183, 689), (1106, 686, 1124, 695), (1130, 732, 1171, 749), (1160, 700, 1192, 731)]:
    mask[y0:y1, x0:x1] = True
for (cx, cy, rr) in [(1115.5, 705, 23), (1150.8, 720.8, 11)]:
    mask |= (xx - cx) ** 2 + (yy - cy) ** 2 <= rr ** 2
# altlık haritanın küçük yer adları (sahne içindekiler)
for x0, y0, x1, y1 in [(1043, 403, 1098, 440), (786, 316, 832, 350), (1286, 570, 1348, 600), (1243, 778, 1302, 810), (1322, 364, 1378, 394)]:
    mask[y0:y1, x0:x1] = True
mask &= inmap
def fill(im, m):
    res = im.copy(); known = (~m).astype(float); todo = m.copy()
    for sg in [1, 2, 3, 5, 8, 13, 21, 34]:
        num = np.stack([ndimage.gaussian_filter(res[..., c] * known, sg) for c in range(3)], -1)
        den = ndimage.gaussian_filter(known, sg)
        ok = todo & (den > .08); res[ok] = num[ok] / den[ok, None]; todo &= ~ok
    # doku: 30 px aşağıdan alınan ince ayrıntı (yalnızca doldurulan yerde, hafif)
    hp = im - np.stack([ndimage.gaussian_filter(im[..., c], 2) for c in range(3)], -1)
    hp = np.roll(hp, 30, 0); hp[np.roll(m, 30, 0)] = 0
    res[m] += .6 * hp[m]
    return res
out = fill(out, mask)
# büyük örtüler (PurpleAir kutusu ve işaretçisi): bulanık leke yerine komşu çimden kopya + renk uyumu
def clone(im, m, off):
    src = np.roll(im, (-off[1], -off[0]), (0, 1)); diff = im - src
    low = np.stack([ndimage.gaussian_filter(np.where(m, 0, diff[..., c]), 6) for c in range(3)], -1)
    w = ndimage.gaussian_filter((~m).astype(float), 6)[..., None]
    corr = np.where(w > 1e-3, low / np.maximum(w, 1e-3), 0)
    res = im.copy(); res[m] = (src + corr)[m]; return res
for (x0, y0, x1, y1), off in [((1046, 659, 1185, 697), (0, -40)), ((1090, 680, 1141, 730), (0, 50))]:
    m = np.zeros((H, W), bool); m[y0:y1, x0:x1] = True
    if x1 - x0 < 60: m &= (xx - 1115.5) ** 2 + (yy - 705) ** 2 <= 25 ** 2
    out = clone(out, m, off)
# her binanın tabanında doldurulmuş (gerçek olmayan) doku payı: çatı dokusu yerine düz çatı kullanmak için
masked = {}
for i, f in enumerate(F):
    if f['properties'].get('cat') != 'bina': continue
    m = np.asarray(raster([f], s, tx, ty)) > 0
    if m.sum(): masked[i] = round(float((m & mask & ~linem).sum() / m.sum()), 2)
crop = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).crop(MAP)
UP = 3
big = crop.resize((crop.width * UP, crop.height * UP), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=3, percent=55, threshold=2))
big.save(os.path.join(OUT, 'doku.png'))
json.dump({'s': s, 'tx': tx, 'ty': ty, 'crop': MAP[:2], 'up': UP, 'm_per_px': mpp, 'residual_px': r, 'used': keys,
           'iou': best[0], 'masked': masked}, open(os.path.join(OUT, 'georef.json'), 'w'), ensure_ascii=False, indent=1)
# kontrol: bina tabanları temizlenmiş dokunun üstünde
chk = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(chk)
for f in bina:
    for rg in rings(f['geometry']):
        p = [(s * merc(*q)[0] + tx, -s * merc(*q)[1] + ty) for q in rg]; d.line(p + [p[0]], fill=(255, 60, 60), width=1)
chk.crop(MAP).save(os.path.join(OUT, 'kontrol_tabanlar.png'))
Image.fromarray((mask * 255).astype(np.uint8)).crop(MAP).save(os.path.join(OUT, 'kontrol_maske.png'))
print('Yazıldı:', OUT)
