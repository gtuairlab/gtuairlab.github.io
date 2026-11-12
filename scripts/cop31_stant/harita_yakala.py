"""COP31 stant filmi · kampüs haritasını uygulamanın kendi görünümünden (uydu + kampüs katmanı: binalar, yeşil alan, yol) yakalar.
Eski campus_sat.jpg, 3B ziyaretçi videoları için binaları silinmiş ve 3 kat büyütülmüş dokudan kesiliyordu (bulanık, "çorak").
Bu betik aynı coğrafi kadrajı (film.js'deki doku koordinatları değişmesin diye) zoom 17,5'te (zoom 18 karoları) yakalar
ve 2900×1630 campus_sat.jpg olarak küçülterek yazar. Canlı cihaz işaretleri, etiketler ve uygulama arayüzü gizlenir.
Kullanım:  python harita_yakala.py <cikti.jpg>
Kadraj: 20 Ekim 2026 yakalamasının (1920×922, zoom 15,5) piksel penceresi; doku = (ekran − (330, 60)) × 3, kesit (700, 830)."""
import sys, time
from PIL import Image
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
W, H = 2900, 1630
# kesitin 15,5 zoom ekranındaki köşeleri (1920×922 görünüm, harita tam ekran)
X0, Y0 = 330 + 700 / 3, 60 + 830 / 3
X1, Y1 = X0 + W / 3, Y0 + H / 3
Z = 17.5
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge") if sys.platform == "win32" else p.chromium.launch()
    pg = b.new_page(viewport={"width": 1920, "height": 922})
    pg.goto("https://gtuairlab.github.io/frontend_v2/", wait_until="networkidle")
    time.sleep(6)
    # 1 · eski çerçevede köşelerin boylam/enlemi
    pg.evaluate("() => { map.setView([40.81179173113218, 29.35627334999999], 15.5, { animate: false }); }")
    time.sleep(1)
    ll = pg.evaluate("""([a, b, c, d]) => { const r = map.getContainer().getBoundingClientRect();
        const f = (x, y) => map.containerPointToLatLng([x - r.left, y - r.top]);
        return [f(a, b), f(c, d)]; }""", [X0, Y0, X1, Y1])
    print("köşeler:", ll)
    # 2 · aynı pencere zoom Z'de: piksel boyutu × 2^(Z-15.5); görünüm buna göre büyütülür
    k = 2 ** (Z - 15.5)
    vw, vh = int(W / 3 * k) + 40, int(H / 3 * k) + 40
    pg.set_viewport_size({"width": vw, "height": vh})
    time.sleep(2)
    pg.evaluate("() => { map.invalidateSize(false); }")
    pg.evaluate("""([a, b, z]) => { map.setView([(a.lat + b.lat) / 2, (a.lng + b.lng) / 2], z, { animate: false }); }""", [ll[0], ll[1], Z])
    pg.wait_for_load_state("networkidle")
    # zoom 18 karoları çok: hepsi inene kadar bekle (eksik karo kadrajda koyu boşluk bırakır)
    for i in range(90):
        left = pg.evaluate("() => [...document.querySelectorAll('img.leaflet-tile')].filter(t => !(t.complete && t.naturalWidth > 0 && t.classList.contains('leaflet-tile-loaded'))).length")
        if left == 0 and i >= 3: break
        time.sleep(2)
    print("bekleyen karo:", left); time.sleep(3)
    box = pg.evaluate("""([a, b]) => { const r = map.getContainer().getBoundingClientRect();
        const p = map.latLngToContainerPoint(a), q = map.latLngToContainerPoint(b);
        return [p.x + r.left, p.y + r.top, q.x + r.left, q.y + r.top, map.getZoom()]; }""", [ll[0], ll[1]])
    print("kutu:", box)
    pg.evaluate("""() => { const m = map.getContainer();
        for (const el of document.body.querySelectorAll('*')) if (!el.contains(m) && !m.contains(el)) el.style.visibility = 'hidden';
        for (const sel of ['.leaflet-control-container', '.leaflet-marker-pane', '.leaflet-tooltip-pane', '.leaflet-popup-pane', '.leaflet-shadow-pane'])
          m.querySelectorAll(sel).forEach(e => e.style.visibility = 'hidden');
        m.querySelectorAll('img.leaflet-tile').forEach(t => { if (/Reference|Boundaries/.test(t.src)) t.style.visibility = 'hidden'; }); }""")
    time.sleep(1)
    tmp = OUT + ".tam.png"
    pg.screenshot(path=tmp, clip={"x": box[0], "y": box[1], "width": box[2] - box[0], "height": box[3] - box[1]}, scale="device")
    b.close()
im = Image.open(tmp).convert("RGB").resize((W, H), Image.LANCZOS)
import numpy as np
dark = float((np.asarray(im.convert("L")) < 22).mean())   # yüklenmemiş karo = düz koyu alan
print(f"koyu piksel payı: {dark:.2%}")
if dark > 0.01: raise SystemExit("harita eksik yüklendi (koyu alan > %1); yeniden çalıştırın")
im.save(OUT, quality=92)
print("yazıldı:", OUT, im.size)
