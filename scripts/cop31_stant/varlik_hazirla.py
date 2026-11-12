"""COP31 stant filmi · tüm varlıkları tek komutla hazırlar (Windows masaüstü ve bulut; 12 Kasım 2026).
Kullanım:  python scripts/cop31_stant/varlik_hazirla.py <cikti_klasoru>
Çıktı: <cikti>/film.html, film.js, assets/ (fonts, logo, qr, cop31, yok, gtu, icons.js, app_summary.jpg, app_exposure.jpg,
campus_sat.jpg) ve <cikti>/harita/ (doku.png + georef.json, ziyaretçi videoları için de kullanılır).
Lisanslı uydu görüntüsü (© Esri, Maxar) ve uygulama ekranları her seferinde canlı uygulamadan üretilir; REPOYA GİRMEZ.
Gerekenler: pip install playwright segno pillow numpy scipy (Windows'ta Edge; bulutta Playwright Chromium + ffmpeg).
Bulut ortamının ağ izni: gtuairlab.github.io, server.arcgisonline.com, services.arcgisonline.com, gtu-air-quality.onrender.com.
Sabit varlıklar (sabit/): COP31 ve YÖK logoları (YÖK'ün COP31 şablonundan), GTÜ İngilizce logosu, Lucide ikonları (ISC)."""
import os, shutil, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
ANIM = os.path.join(REPO, "scripts", "cop31_animasyon")
OUT = os.path.abspath(sys.argv[1]); A = os.path.join(OUT, "assets"); HK = os.path.join(OUT, "harita")
APP = "https://gtuairlab.github.io/frontend_v2/"
QR_URL = "https://gtuairlab.github.io/"   # kısa adres (uygulamaya yönlenir): daha az ve daha iri modül, stantta daha uzaktan okunur
for d in (A, os.path.join(A, "fonts"), HK):
    os.makedirs(d, exist_ok=True)
env = dict(os.environ, PYTHONUTF8="1")


def step(m): print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)


# 1 · yerel/sabit dosyalar
step("fontlar, logolar, ikonlar")
for f in os.listdir(os.path.join(REPO, "frontend_v2", "vendor", "fonts")):
    shutil.copy(os.path.join(REPO, "frontend_v2", "vendor", "fonts", f), os.path.join(A, "fonts", f))
shutil.copy(os.path.join(REPO, "docs", "gorseller", "airlab_logo_simge.png"), os.path.join(A, "logo.png"))
for src, dst in (("cop31.png", "cop31.png"), ("yok.png", "yok.png"), ("gtu_en.png", "gtu.png"), ("icons.js", "icons.js")):
    shutil.copy(os.path.join(HERE, "sabit", src), os.path.join(A, dst))
for f in ("film.html", "film.js"):
    shutil.copy(os.path.join(HERE, f), os.path.join(OUT, f))

# 2 · karekod (test edilir)
step("karekod: " + QR_URL)
import segno
segno.make(QR_URL, error="m").save(os.path.join(A, "qr.png"), scale=24, border=4, dark="#0B2E33", light="#FFFFFF")
try:
    import cv2, numpy as np
    from PIL import Image
    v = cv2.QRCodeDetector().detectAndDecode(np.array(Image.open(os.path.join(A, "qr.png")).convert("RGB")))[0]
    print("  karekod çözüldü:", v); assert v == QR_URL
except ImportError:
    print("  (opencv yok: karekod çözme testi atlandı)")

# 3 · uygulamanın telefon ekranları (390x844 @2x)
step("uygulama ekranları")
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge") if sys.platform == "win32" else p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, is_mobile=True, has_touch=True,
                        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1")
    pg = ctx.new_page(); pg.goto(APP, wait_until="networkidle"); time.sleep(6)
    pg.screenshot(path=os.path.join(A, "app_summary.png"))
    pg.get_by_text("Bugün ne kadar", exact=False).first.click(timeout=8000); time.sleep(3)
    pg.screenshot(path=os.path.join(A, "app_exposure.png"))
    b.close()
from PIL import Image
for n in ("app_summary", "app_exposure"):
    Image.open(os.path.join(A, n + ".png")).convert("RGB").save(os.path.join(A, n + ".jpg"), quality=90)
    os.remove(os.path.join(A, n + ".png"))

# 4 · uydu dokusu (ziyaretçi videolarıyla aynı yol)
step("uydu dokusu: kontrol noktaları, yakalama, eşleme (birkaç dakika)")
cp_ll = os.path.join(HK, "cp_ll.json")
subprocess.run([sys.executable, os.path.join(ANIM, "harita_hazirla.py"), "yok", HK], env=dict(env, CP_DUMP=cp_ll), check=True)
subprocess.run([sys.executable, os.path.join(ANIM, "uydu_yakala.py"), HK, cp_ll], env=env, check=True)
subprocess.run([sys.executable, os.path.join(ANIM, "harita_hazirla.py"), os.path.join(HK, "sat.png"), HK],
               env=dict(env, CP_PX=os.path.join(HK, "cp_px.json")), check=True)
Image.open(os.path.join(HK, "doku.png")).convert("RGB").crop((700, 830, 3600, 2460)).save(os.path.join(A, "campus_sat.jpg"), quality=90)
step("hazır: " + OUT)
