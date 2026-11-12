"""COP31 ziyaretçi videoları · uygulamanın uydu görünümünü yakalar (masaüstü, Windows/Edge; 12 Kasım 2026).
Uygulamayı 1920×922 açar (20 Ekim 2026 girdisiyle aynı çerçeve: zoom 15,5), uygulama arayüzünü, Leaflet düğmelerini,
canlı cihaz işaretlerini (ör. ATP-2) ve etiketleri gizler; yalnızca uydu + kampüs dolguları kalır. Kontrol noktalarının
kesin ekran konumunu canlı haritadan (map.latLngToContainerPoint) yazar.
Kullanım:
  CP_DUMP=<gecici>/cp_ll.json python harita_hazirla.py yok <gecici>          (kontrol noktalarının boylam/enlemi)
  python uydu_yakala.py <gecici>/harita <gecici>/cp_ll.json        (sat.png + cp_px.json)
  CP_PX=<gecici>/harita/cp_px.json python harita_hazirla.py <gecici>/harita/sat.png <gecici>/harita
Gereken: pip install playwright. Windows'ta Edge kullanılır; bulutta/Linux'ta Playwright Chromium (PLAYWRIGHT_BROWSERS_PATH, ör. /opt/pw-browsers).
Bulut ortamında ağ izni gerekir: gtuairlab.github.io, server.arcgisonline.com, services.arcgisonline.com, gtu-air-quality.onrender.com. Çıktılar repoya girmez (lisanslı uydu görüntüsü)."""
import json, sys, time
from playwright.sync_api import sync_playwright

OUT = sys.argv[1]
pts = json.load(open(sys.argv[2], encoding="utf-8"))
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge") if sys.platform == "win32" else p.chromium.launch()
    pg = b.new_page(viewport={"width": 1920, "height": 922})
    pg.goto("https://gtuairlab.github.io/frontend_v2/", wait_until="networkidle")
    time.sleep(6)
    info = pg.evaluate("() => ({ zoom: map.getZoom(), center: map.getCenter() })")
    print("harita:", info)
    px = pg.evaluate("""(pts) => { const r = map.getContainer().getBoundingClientRect(), o = {};
        for (const [k, [lon, lat]] of Object.entries(pts)) { const q = map.latLngToContainerPoint([lat, lon]); o[k] = [q.x + r.left, q.y + r.top]; }
        return o; }""", pts)
    pg.evaluate("""() => { const m = map.getContainer();
        for (const el of document.body.querySelectorAll('*')) if (!el.contains(m) && !m.contains(el)) el.style.visibility = 'hidden';
        for (const sel of ['.leaflet-control-container', '.leaflet-marker-pane', '.leaflet-tooltip-pane', '.leaflet-popup-pane', '.leaflet-shadow-pane'])
          m.querySelectorAll(sel).forEach(e => e.style.visibility = 'hidden'); }""")
    time.sleep(1)
    pg.screenshot(path=OUT + "/sat.png")
    json.dump({"info": info, "px": px}, open(OUT + "/cp_px.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    b.close()
print("yazıldı:", OUT + "/sat.png", OUT + "/cp_px.json")
