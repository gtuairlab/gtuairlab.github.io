// Telefon bildirimleri (Web Push): kötü hava uyarısı ve her sabah 08.00 durum özeti.
// Duyurular panelindeki "Bildirimler" kartı. Abonelik sunucuda (backend/bildirim.py) ad, e-posta ya da konum olmadan tutulur;
// iletim tarayıcının push servisiyle olur (Android/Chrome: Google, iPhone: Apple, Firefox: Mozilla). Kapatınca abonelik silinir.
const Bildirim = (() => {
    const PREFS = "gtu.push.prefs";
    const $ = id => document.getElementById(id);
    let pubKey = null;

    const lsGet = () => { try { return JSON.parse(localStorage.getItem(PREFS)) || { alarm: true, sabah: true }; } catch (_) { return { alarm: true, sabah: true }; } };
    const lsSet = v => { try { localStorage.setItem(PREFS, JSON.stringify(v)); } catch (_) {} };

    const IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const STANDALONE = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

    function keyBytes(b64) {
        const s = atob((b64 + "=".repeat((4 - b64.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
        return Uint8Array.from(s, c => c.charCodeAt(0));
    }

    async function post(path, body) {
        const res = await fetch(API_BASE + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!res.ok) throw new Error(res.status);
        return res.json();
    }

    async function currentSub() {
        const reg = await navigator.serviceWorker.ready;
        return reg.pushManager.getSubscription();
    }

    function msg(t, warn) { const m = $("push-msg"); m.textContent = t || ""; m.classList.toggle("warn", !!warn); }

    async function render() {
        const card = $("push-card");
        const sub = supported() ? await currentSub().catch(() => null) : null;
        const on = !!sub && Notification.permission === "granted";
        const p = lsGet();
        $("push-alarm").checked = p.alarm; $("push-sabah").checked = p.sabah;
        $("push-opts").hidden = !on;
        $("push-on").hidden = on;
        $("push-test").hidden = $("push-off").hidden = !on;
        $("push-state").textContent = on ? "Açık" : "Kapalı";
        $("push-state").classList.toggle("on", on);
        card.hidden = false;
    }

    async function enable() {
        msg("");
        try {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") {
                msg("Bildirim izni verilmedi. İzni tarayıcının site ayarlarından açabilirsiniz.", true);
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription()
                || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(pubKey) });
            const p = lsGet();
            if (!p.alarm && !p.sabah) { p.alarm = p.sabah = true; lsSet(p); }
            await post("/api/push/subscribe", { subscription: sub.toJSON(), ...p });
            msg("Bildirimler açıldı.");
        } catch (e) {
            console.warn("[bildirim]", e);
            msg("Bildirimler açılamadı; bağlantıyı kontrol edip yeniden deneyin.", true);
        }
        render();
    }

    async function disable() {
        msg("");
        try {
            const sub = await currentSub();
            if (sub) {
                await post("/api/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
                await sub.unsubscribe();
            }
            msg("Bildirimler kapatıldı.");
        } catch (e) { console.warn("[bildirim]", e); }
        render();
    }

    async function savePrefs() {
        const p = { alarm: $("push-alarm").checked, sabah: $("push-sabah").checked };
        lsSet(p);
        if (!p.alarm && !p.sabah) return disable();
        try {
            const sub = await currentSub();
            if (sub) { await post("/api/push/subscribe", { subscription: sub.toJSON(), ...p }); msg("Tercihler kaydedildi."); }
        } catch (e) { msg("Tercihler kaydedilemedi; yeniden deneyin.", true); }
    }

    async function test() {
        try {
            const sub = await currentSub();
            const r = sub && await post("/api/push/test", { endpoint: sub.endpoint });
            msg(r && r.ok ? "Deneme bildirimi gönderildi; birkaç saniye içinde gelmesi beklenir." : "Deneme bildirimi gönderilemedi.", !(r && r.ok));
        } catch (e) { msg(String(e.message) === "429" ? "Bir dakika sonra yeniden deneyin." : "Deneme bildirimi gönderilemedi.", true); }
    }

    async function init() {
        if (!$("push-card")) return;
        try {
            const res = await fetch(API_BASE + "/api/push/key");
            const j = await res.json();
            if (!j.enabled) return;              // sunucuda bildirim yapılandırılmamış: kart gizli kalır
            pubKey = j.publicKey;
        } catch (_) { return; }
        if (!supported()) {
            // iPhone/iPad: bildirim yalnızca Ana Ekrana eklenmiş uygulamada çalışır (iOS 16.4 ve sonrası)
            if (IOS && !STANDALONE) {
                $("push-card").hidden = false;
                $("push-on").hidden = true;
                msg("iPhone'da bildirim almak için önce uygulamayı Ana Ekrana ekleyin (Safari → Paylaş → Ana Ekrana Ekle), sonra uygulamayı oradan açın.");
            }
            return;
        }
        $("push-on").addEventListener("click", enable);
        $("push-off").addEventListener("click", disable);
        $("push-test").addEventListener("click", test);
        $("push-alarm").addEventListener("change", savePrefs);
        $("push-sabah").addEventListener("change", savePrefs);
        render();
    }

    document.addEventListener("DOMContentLoaded", init);
    return { render };
})();
