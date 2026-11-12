# kayit.js'nin Python karşılığı (Windows masaüstü ve bulut; 12 Kasım 2026): Edge (Playwright) + imageio-ffmpeg. Çıktı aynı: visitorX.mp4 + visitorX.png
# (son kare = sonuç kartı) + saniyede bir kare (X_kNN.png, kontakt sayfası için). Çıktılar repoya YAZILMAZ (lisanslı uydu görüntüsü).
# Kullanım: pip install playwright imageio-ffmpeg ; python kayit_yerel.py <harita_klasoru> <cikti_klasoru> [A|B|AB]   (CRF=23, FPS=30)
import base64, json, os, shutil, subprocess, sys, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__)).replace("\\", "/")
REPO = os.path.dirname(os.path.dirname(HERE))
HK, OUT = sys.argv[1], sys.argv[2]
WHICH = sys.argv[3] if len(sys.argv) > 3 else "AB"
FPS, CRF = int(os.environ.get("FPS", 30)), os.environ.get("CRF", "23")
os.makedirs(OUT, exist_ok=True)
J = lambda p: json.load(open(p, encoding="utf-8"))
b64 = lambda p: base64.b64encode(open(p, "rb").read()).decode()
data = {"doku": "data:image/png;base64," + b64(HK + "/doku.png"), "georef": J(HK + "/georef.json"),
        "geo": J(REPO + "/frontend_v2/data/campus.geojson"), "sahneler": J(HERE + "/sahneler.json"),
        "rotalar": J(HERE + "/harita_rotalar.json"), "ikon": "data:image/png;base64," + b64(REPO + "/frontend_v2/icons/icon-192.png")}
FF = shutil.which("ffmpeg") or __import__("imageio_ffmpeg").get_ffmpeg_exe()   # bulutta sistem ffmpeg, Windows'ta imageio-ffmpeg
with sync_playwright() as p:
    br = p.chromium.launch(channel="msedge") if sys.platform == "win32" else p.chromium.launch()
    errs = []
    for key in WHICH:
        pg = br.new_page(viewport={"width": 1664, "height": 700})
        pg.on("pageerror", lambda e, k=key: errs.append(f"{k}: {e}"))
        pg.goto("file:///" + HERE.lstrip("/") + "/harita_dogal.html")
        info = pg.evaluate("d => init(d)", {**data, "key": key})
        N = round(info["total"] * FPS)
        print(f"{key}: {info['total']:.2f} s, {N} frames", flush=True)
        mp4 = os.path.join(OUT, f"visitor{key}.mp4")
        ff = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-i", "-", "-c:v", "libx264",
                               "-preset", "slow", "-profile:v", "high", "-crf", CRF, "-g", str(FPS), "-keyint_min", str(FPS), "-sc_threshold", "0",
                               "-bf", "2", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", str(FPS), mp4], stdin=subprocess.PIPE)
        t0 = time.time()
        for i in range(N):
            pg.evaluate("t => render(t)", i / FPS)
            buf = pg.screenshot(type="png")
            ff.stdin.write(buf)
            if i == N - 1:
                open(os.path.join(OUT, f"visitor{key}.png"), "wb").write(buf)
            if i % FPS == 0:
                open(os.path.join(OUT, f"{key}_k{i // FPS:02d}.png"), "wb").write(buf)
            if i % 150 == 0:
                print(f"  {key} {i}/{N} ({time.time() - t0:.0f} s)", flush=True)
        ff.stdin.close(); ff.wait()
        print(f"  {mp4}: {os.path.getsize(mp4) / 1e6:.2f} MB", flush=True)
        pg.close()
    print("JS errors:", errs or "none")
    br.close()
