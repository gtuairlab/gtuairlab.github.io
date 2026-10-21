// GTÜ AirLab — service worker (telefona kurulan uygulama için)
// Uygulama dosyaları: önce ağ → her açılışta en güncel sürüm; ağ yoksa son kopya.
// Sürümlü CDN kütüphaneleri: önce önbellek.
// API ve harita karoları önbelleğe alınmaz (veri her zaman canlı).
const CACHE = "gtu-hava-v1";
const SHELL = [
    "./", "index.html", "manifest.webmanifest",
    "js/icons.js", "js/colorscale.js", "js/api.js", "js/campus.js", "js/app.js", "js/who.js", "js/kiyas.js", "js/ozet.js", "js/maruziyet.js", "js/shell.js", "js/bildirim.js",
    "data/campus.geojson", "data/duyurular.json", "data/tuzla_saatlik.json",
    "icons/icon.svg", "icons/icon-192.png",
    "vendor/leaflet/leaflet.js", "vendor/leaflet/leaflet.css", "vendor/leaflet-heat.js", "vendor/chart.umd.min.js", "vendor/fonts/fonts.css",
];
// Kütüphaneler ve yazı tipleri artık yerel (vendor/); eski sürümlerden kalan CDN istekleri için önbellek kuralı duruyor
const CDN = /^(unpkg\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/;

self.addEventListener("install", e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin === self.location.origin) e.respondWith(networkFirst(req));
    else if (CDN.test(url.hostname)) e.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
    const cache = await caches.open(CACHE);
    try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
    } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: true })
            || (req.mode === "navigate" && await cache.match("index.html"));
        if (hit) return hit;
        throw err;
    }
}

async function cacheFirst(req) {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok || res.type === "opaque") cache.put(req, res.clone());
    return res;
}

// Bildirimler (backend/bildirim.py): kötü hava uyarısı ve sabah 08.00 özeti
self.addEventListener("push", e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (_) { d = { body: e.data && e.data.text() }; }
    e.waitUntil(self.registration.showNotification(d.title || "GTÜ AirLab", {
        body: d.body || "", tag: d.tag || "airlab", renotify: true,
        icon: "icons/icon-192.png", badge: "icons/icon-192.png", data: { url: d.url || "./" },
    }));
});

self.addEventListener("notificationclick", e => {
    e.notification.close();
    const url = new URL(e.notification.data && e.notification.data.url || "./", self.location.href).href;
    e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
        const c = list.find(w => w.url.startsWith(new URL("./", self.location.href).href));
        return c ? c.focus() : self.clients.openWindow(url);
    }));
});
