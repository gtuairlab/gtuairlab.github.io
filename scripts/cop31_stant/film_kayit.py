"""COP31 stant filmi · kayıt (kayit.js'nin Python karşılığı; Windows'ta Edge, bulutta/Linux'ta Playwright Chromium).
  Durağan kareler:  python film_kayit.py <klasor> kare 2,30,60 [cikti_klasoru]
  Tam film:         python film_kayit.py <klasor> film [isci_sayisi]   → <klasor>/film.mp4 (H.264, yuv420p, faststart)
<klasor>: varlik_hazirla.py çıktısı (film.html + film.js + assets/). Döngü: son kareden ilk kareye kesintisiz (film.js T periyodik)."""
import os, shutil, subprocess, sys, time

DIR = os.path.abspath(sys.argv[1]); MODE = sys.argv[2]
URL = "file:///" + DIR.replace("\\", "/").lstrip("/") + "/film.html"
FF = shutil.which("ffmpeg") or __import__("imageio_ffmpeg").get_ffmpeg_exe()


def open_page(p):
    ARGS = ["--disable-gpu", "--disable-dev-shm-usage", "--disable-extensions", "--renderer-process-limit=1"]   # az bellekli makinede sekme çökmesin
    b = p.chromium.launch(channel="msedge", args=ARGS) if sys.platform == "win32" else p.chromium.launch(args=ARGS)
    pg = b.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL)
    pg.wait_for_function("() => window.FILM && (window.FILM.ready || window.FILM.error)", timeout=300000)
    e = pg.evaluate("() => window.FILM.error")
    if e: raise RuntimeError(e)
    return b, pg, errs


def part(w, a, z, fps):   # bir işçi: [a, z) karelerini parca_w.mkv'ye yazar (ayrı süreç olarak çağrılır: "parca w a z fps")
    from playwright.sync_api import sync_playwright
    out = os.path.join(DIR, f"parca_{w}.mkv")
    with sync_playwright() as p:
        b, pg, errs = open_page(p)
        ff = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-i", "-",
                               "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", out], stdin=subprocess.PIPE)
        for i in range(a, z):
            pg.evaluate("t => window.FILM.render(t)", i / fps)
            ff.stdin.write(pg.screenshot(type="jpeg", quality=95))   # JPEG: daha az bellek ve daha hızlı
        ff.stdin.close(); ff.wait(); b.close()
    if errs: print("JS hataları:", " | ".join(errs), flush=True)
    return out


if __name__ == "__main__":
    from playwright.sync_api import sync_playwright
    if MODE == "parca":
        part(*[int(x) for x in sys.argv[3:7]])
    elif MODE == "kare":
        od = os.path.abspath(sys.argv[4]) if len(sys.argv) > 4 else os.path.join(DIR, "kareler"); os.makedirs(od, exist_ok=True)
        with sync_playwright() as p:
            b, pg, errs = open_page(p)
            for t in [float(x) for x in sys.argv[3].split(",")]:
                pg.evaluate("t => window.FILM.render(t)", t)
                pg.screenshot(path=os.path.join(od, f"t{t:07.2f}.png"))
            b.close()
        print("kareler:", od, "JS hataları: " + " | ".join(errs) if errs else "JS hatası yok")
    elif MODE == "film":
        N = int(sys.argv[3]) if len(sys.argv) > 3 else 4
        with sync_playwright() as p:
            b, pg, _ = open_page(p); T, FPS = pg.evaluate("() => [window.FILM.T, window.FILM.FPS]"); b.close()
        total = round(T * FPS); per = -(-total // N); t0 = time.time()
        print(f"film: {T} s, {total} kare, {N} işçi", flush=True)
        procs = []
        for w in range(N):   # ayrı süreçler, kademeli başlatılır
            if w * per >= total: break
            procs.append(subprocess.Popen([sys.executable, os.path.abspath(__file__), DIR, "parca", str(w), str(w * per),
                                           str(min(total, (w + 1) * per)), str(FPS)]))
            time.sleep(8)
        if any([p.wait() for p in procs]): raise SystemExit("bir işçi hata verdi")
        res = [os.path.join(DIR, f"parca_{w}.mkv") for w in range(len(procs))]
        lst = os.path.join(DIR, "parcalar.txt")
        open(lst, "w").write("".join(f"file '{os.path.basename(o)}'\n" for o in res))
        mp4 = os.path.join(DIR, "film.mp4")
        subprocess.run([FF, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c:v", "libx264", "-preset", "slow",
                        "-profile:v", "high", "-crf", os.environ.get("CRF", "20"), "-g", str(FPS), "-bf", "2",
                        "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p", "-color_range", "tv", "-colorspace", "bt709",
                        "-color_primaries", "bt709", "-color_trc", "bt709", "-level:v", "4.1", "-refs", "4", "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",   # TV/USB oynatıcı uyumu   # JPEG kareler tam aralık; ekranlar için TV aralığı
                        "-movflags", "+faststart", "-r", str(FPS), mp4], check=True, cwd=DIR)
        print(f"{mp4}: {os.path.getsize(mp4) / 1e6:.1f} MB, {time.time() - t0:.0f} s")
