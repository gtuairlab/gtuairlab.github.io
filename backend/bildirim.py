"""
Telefon bildirimleri (Web Push) — kötü hava uyarısı ve her sabah 08.00 durum özeti.

Akış: uygulama (frontend_v2/js/bildirim.js) tarayıcının push aboneliğini /api/push/subscribe ile buraya gönderir;
abonelik `push_subscriptions` tablosunda tutulur (ad, e-posta, konum yok; yalnızca tarayıcının verdiği adres ve anahtarlar).
Zamanlanmış işler (app.py) uyarı koşulunu ve sabah özetini buradan gönderir.

Kampüs değeri: dış PurpleAir'in son 30 dakikadaki kayıtları, uygulamadaki US EPA düzeltmesiyle (colorscale.js → paCorrect,
aynı formül) tek tek düzeltilip ortalanır; A/B kanalı uyuşmayan kayıt alınmaz. HKİ sınıfı colorscale.js → HKI_PM25 ile aynı.
Uyarı kuralı (docs/hesaplama_ve_kaynaklar.md §10a):
  - 30 dk ortalaması HKİ > 100 ("Hassas" ve üstü) → uyarı; sınıf kötüleşirse yeni uyarı; aynı sınıfta en çok 3 saatte bir.
  - Uyarıdan sonra 60 dk ortalaması HKİ ≤ 100'e inince "düzeldi" bildirimi.
  - 23.00–07.00 arası uyarı gönderilmez (sabah özeti durumu bildirir).

Anahtarlar yalnızca ortam değişkeninde (Render → Environment): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY.
Tanımlı değilse ya da DATABASE_URL yoksa modül kapalı kalır, uygulama bildirim seçeneğini göstermez.
"""

import os
import json
import datetime
import threading
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

import db

TR = ZoneInfo("Europe/Istanbul")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY", "").strip()
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "").strip()
VAPID_SUBJECT = os.getenv("VAPID_SUBJECT", "https://gtuairlab.github.io")   # yalnızca alan adı (yol yok; py_vapid kuralı)
APP_URL = "https://gtuairlab.github.io/frontend_v2/"

try:
    from pywebpush import webpush, WebPushException
except Exception:
    webpush = None

# Sunucu yalnızca tarayıcıların push servislerine istek atar (başka adrese değil)
PUSH_HOSTS = ("fcm.googleapis.com", "android.googleapis.com", "push.services.mozilla.com", "push.apple.com",
              "notify.windows.com")
MAX_SUBS = 5000


def is_enabled():
    return bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY and webpush and db._USE_POSTGRES)


SCHEMA = """
CREATE TABLE IF NOT EXISTS push_subscriptions (
    endpoint   TEXT PRIMARY KEY,
    p256dh     TEXT NOT NULL,
    auth       TEXT NOT NULL,
    alarm      BOOLEAN NOT NULL DEFAULT TRUE,
    sabah      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    last_ok    TIMESTAMPTZ,
    fails      INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS push_state (
    key        TEXT PRIMARY KEY,
    value      JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE push_state ENABLE ROW LEVEL SECURITY
"""


def init():
    if not db._USE_POSTGRES:
        print("[bildirim] DATABASE_URL yok — bildirimler kapalı.")
        return
    try:
        with db.get_conn() as conn:
            cur = conn.cursor()
            for stmt in SCHEMA.split(";"):
                if stmt.strip():
                    cur.execute(stmt)
        print(f"[bildirim] tablolar hazır; gönderim {'açık' if is_enabled() else 'kapalı (VAPID anahtarı yok)'}.")
    except Exception as e:
        print(f"[bildirim] init hatası: {e}")


# ---------------------------------------------------------------------------
# Abonelik
# ---------------------------------------------------------------------------

def valid_subscription(sub):
    """Tarayıcının verdiği abonelik nesnesini denetler; geçerliyse (endpoint, p256dh, auth) döner."""
    if not isinstance(sub, dict):
        return None
    ep, keys = sub.get("endpoint"), sub.get("keys") or {}
    p, a = keys.get("p256dh"), keys.get("auth")
    if not (isinstance(ep, str) and isinstance(p, str) and isinstance(a, str)):
        return None
    if len(ep) > 1000 or len(p) > 200 or len(a) > 100:
        return None
    u = urlparse(ep)
    host = (u.hostname or "").lower()
    if u.scheme != "https" or not any(host == h or host.endswith("." + h) for h in PUSH_HOSTS):
        return None
    return ep, p, a


def save_subscription(sub, alarm=True, sabah=True):
    ok = valid_subscription(sub)
    if not ok:
        return False
    ep, p, a = ok
    with db.get_conn() as conn:
        cur = conn.cursor()
        if not alarm and not sabah:
            cur.execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (ep,))
            return True
        cur.execute("SELECT count(*) FROM push_subscriptions")
        if cur.fetchone()[0] >= MAX_SUBS:
            cur.execute("SELECT 1 FROM push_subscriptions WHERE endpoint = %s", (ep,))
            if not cur.fetchone():
                return False
        cur.execute("""INSERT INTO push_subscriptions (endpoint, p256dh, auth, alarm, sabah)
                       VALUES (%s, %s, %s, %s, %s)
                       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth,
                         alarm = EXCLUDED.alarm, sabah = EXCLUDED.sabah, updated_at = now(), fails = 0""",
                    (ep, p, a, bool(alarm), bool(sabah)))
    return True


def delete_subscription(endpoint):
    with db.get_conn() as conn:
        conn.cursor().execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (endpoint,))


# ---------------------------------------------------------------------------
# Gönderim
# ---------------------------------------------------------------------------

def _send_one(row, payload, ttl, urgency):
    ep, p, a = row
    try:
        webpush(subscription_info={"endpoint": ep, "keys": {"p256dh": p, "auth": a}},
                data=json.dumps(payload, ensure_ascii=False), vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_SUBJECT}, ttl=ttl, headers={"Urgency": urgency}, timeout=15)
        return "ok"
    except WebPushException as e:
        code = getattr(e.response, "status_code", None)
        return "gone" if code in (404, 410) else f"hata {code}"
    except Exception as e:
        return f"hata {type(e).__name__}"


def send(kind, payload, ttl=3 * 3600, urgency="normal", endpoint=None):
    """kind: 'alarm' | 'sabah' | 'test'. Süresi dolmuş abonelikler (404/410) silinir. Gönderilen sayı döner."""
    if not is_enabled():
        return 0
    with db.get_conn() as conn:
        cur = conn.cursor()
        if endpoint:
            cur.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE endpoint = %s", (endpoint,))
        else:
            cur.execute(f"SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE {'alarm' if kind == 'alarm' else 'sabah'}")
        rows = cur.fetchall()
    sent, gone, failed = 0, [], []
    for r in rows:
        res = _send_one(r, payload, ttl, urgency)
        if res == "ok":
            sent += 1
        elif res == "gone":
            gone.append(r[0])
        else:
            failed.append(r[0])
    with db.get_conn() as conn:
        cur = conn.cursor()
        if gone:
            cur.execute("DELETE FROM push_subscriptions WHERE endpoint = ANY(%s)", (gone,))
        if failed:
            # Üst üste 20 kez ulaşılamayan abonelik bırakılır
            cur.execute("UPDATE push_subscriptions SET fails = fails + 1 WHERE endpoint = ANY(%s)", (failed,))
            cur.execute("DELETE FROM push_subscriptions WHERE fails >= 20")
        ok_eps = [r[0] for r in rows if r[0] not in gone and r[0] not in failed]
        if ok_eps:
            cur.execute("UPDATE push_subscriptions SET last_ok = now(), fails = 0 WHERE endpoint = ANY(%s)", (ok_eps,))
    print(f"[bildirim] {kind}: {sent}/{len(rows)} gönderildi, {len(gone)} süresi dolmuş silindi, {len(failed)} hata")
    return sent


# ---------------------------------------------------------------------------
# Kampüs değeri (uygulamadaki düzeltme ve HKİ ile aynı)
# ---------------------------------------------------------------------------

def _epa_cf1(cf1, rh):
    if rh is None or rh < 0 or rh > 100:
        rh = 50
    return max(0.0, 0.524 * cf1 - 0.0862 * rh + 5.75)


def _epa_atm(x, rh):
    if rh is None or rh < 0 or rh > 100:
        rh = 50
    if x < 30:
        y = 0.524 * x - 0.0862 * rh + 5.75
    elif x < 50:
        w = x / 20 - 1.5
        y = (0.786 * w + 0.524 * (1 - w)) * x - 0.0862 * rh + 5.75
    elif x < 210:
        y = 0.786 * x - 0.0862 * rh + 5.75
    elif x < 260:
        w = x / 50 - 4.2
        y = (0.69 * w + 0.786 * (1 - w)) * x - 0.0862 * rh * (1 - w) + 2.966 * w + 5.75 * (1 - w) + 8.84e-4 * x * x * w
    else:
        y = 2.966 + 0.69 * x + 8.84e-4 * x * x
    return max(0.0, y)


def _agree(a, b):
    if a is None or b is None:
        return None
    d, m = abs(a - b), (a + b) / 2
    return not (d >= 5 and m > 0 and d / m >= 0.70)


def correct(r):
    """purpleair_readings satırı → US EPA düzeltmeli PM₂.₅ (kanallar uyuşmuyorsa None). colorscale.js → paCorrect."""
    c1a, c1b, hum = r.get("pm2_5_cf1_a"), r.get("pm2_5_cf1_b"), r.get("humidity_pct")
    if c1a is not None and c1b is not None:
        return None if _agree(c1a, c1b) is False else _epa_cf1((c1a + c1b) / 2, hum)
    raw = r.get("pm2_5")
    if raw is None or _agree(r.get("pm2_5_a"), r.get("pm2_5_b")) is False:
        return None
    return _epa_atm(raw, hum)


HKI_PM25 = [  # colorscale.js → HKI_PM25 (ulusal HKİ, PM₂.₅)
    (0, 50, 0.0, 12.0, "İyi"), (51, 100, 12.1, 35.4, "Orta"), (101, 150, 35.5, 55.4, "Hassas"),
    (151, 200, 55.5, 150.4, "Sağlıksız"), (201, 300, 150.5, 250.4, "Kötü"), (301, 500, 250.5, 500.4, "Tehlikeli"),
]


def hki(v):
    c = max(0.0, int(v * 10 + 1e-9) / 10)
    for k, (ilo, ihi, clo, chi, ad) in enumerate(HKI_PM25):
        if c <= chi:
            return {"i": int((ihi - ilo) / (chi - clo) * (c - clo) + ilo + 0.5), "ad": ad, "k": k}   # JS Math.round ile aynı
    return {"i": 500, "ad": "Tehlikeli", "k": len(HKI_PM25) - 1}


def campus_mean(minutes=30, min_n=None):
    """Son `minutes` dakikanın düzeltilmiş ortalaması; yeterli kayıt yoksa None. (ortalama, kayıt sayısı, son ölçüm)"""
    since = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=minutes)
    with db.get_conn() as conn:
        cur = conn.cursor()
        cur.execute("""SELECT pm2_5, pm2_5_a, pm2_5_b, pm2_5_cf1_a, pm2_5_cf1_b, humidity_pct, recorded_at
                       FROM purpleair_readings WHERE recorded_at >= %s ORDER BY recorded_at""", (since,))
        rows = db.fetchall(cur)
    vals = [v for v in (correct(r) for r in rows) if v is not None]
    need = min_n if min_n is not None else max(5, minutes // 4)   # 2 dk aralıkla beklenenin ~yarısı
    if len(vals) < need:
        return None
    return sum(vals) / len(vals), len(vals), rows[-1]["recorded_at"]


ADVICE = {  # ozet.js → ADVICE ile aynı ton
    "İyi": "Açık hava etkinlikleri için uygun.",
    "Orta": "Kirliliğe çok hassas kişiler uzun süreli, yoğun açık hava etkinliklerini sınırlamayı düşünebilir.",
    "Hassas": "Hassas grupların uzun süreli ve yoğun açık hava etkinliklerini azaltması önerilir.",
    "Sağlıksız": "Uzun süreli, yoğun açık hava etkinliklerinin azaltılması; hassas grupların bunlardan kaçınması önerilir.",
    "Kötü": "Açık hava etkinliklerinin kısaltılması, mümkünse kapalı alanda kalınması önerilir.",
    "Tehlikeli": "Açık havada bulunulmaması, kapalı alanda kalınması önerilir.",
}


# Bildirim başlığında sınıfın açık adı ("Hassas" uygulamada kısaltmadır)
AD_TAM = {"Hassas": "Hassas gruplar için sağlıksız"}


def f1tr(v):
    return f"{v:.1f}".replace(".", ",")


# ---------------------------------------------------------------------------
# Durum (yeniden başlatmada ve iki sunucu kopyası çakıştığında çift gönderimi önler)
# ---------------------------------------------------------------------------

def _claim(key):
    """Anahtar ilk kez yazılıyorsa True (bu iş bu sunucuda yapılır), yazılmışsa False."""
    with db.get_conn() as conn:
        cur = conn.cursor()
        cur.execute("INSERT INTO push_state (key, value) VALUES (%s, '{}'::jsonb) ON CONFLICT (key) DO NOTHING RETURNING key", (key,))
        return cur.fetchone() is not None


def _get_state(key):
    with db.get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT value FROM push_state WHERE key = %s", (key,))
        r = cur.fetchone()
        return r[0] if r else None


def _set_state(key, value):
    with db.get_conn() as conn:
        conn.cursor().execute("""INSERT INTO push_state (key, value, updated_at) VALUES (%s, %s::jsonb, now())
                                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()""",
                              (key, json.dumps(value)))


_lock = threading.Lock()


# ---------------------------------------------------------------------------
# Zamanlanmış işler
# ---------------------------------------------------------------------------

def check_alarm(now=None):
    """10 dakikada bir: kötü hava uyarısı ve düzelme bildirimi."""
    if not is_enabled() or not _lock.acquire(blocking=False):
        return
    try:
        now = now or datetime.datetime.now(TR)
        if now.hour >= 23 or now.hour < 7:
            return
        st = _get_state("alarm") or {}
        m30 = campus_mean(30)
        if not m30:
            return
        v, n, _ = m30
        h = hki(v)
        last = datetime.datetime.fromisoformat(st["at"]) if st.get("at") else None
        if h["i"] > 100:
            due = (not st.get("active") or h["k"] > st.get("k", -1)
                   or (last and now - last >= datetime.timedelta(hours=3) and h["k"] >= st.get("k", 0)))
            if due:
                send("alarm", {
                    "title": f"Kampüste hava: {AD_TAM.get(h['ad'], h['ad'])} (HKİ {h['i']})",
                    "body": f"PM₂.₅ {f1tr(v)} µg/m³ (son 30 dk ortalaması). {ADVICE[h['ad']]}",
                    "tag": "airlab-alarm", "url": APP_URL,
                }, ttl=2 * 3600, urgency="high")
                _set_state("alarm", {"active": True, "k": h["k"], "at": now.isoformat()})
        elif st.get("active"):
            m60 = campus_mean(60)
            if m60 and hki(m60[0])["i"] <= 100:
                h60 = hki(m60[0])
                send("alarm", {
                    "title": f"Kampüste hava düzeldi: {h60['ad']} (HKİ {h60['i']})",
                    "body": f"Son 1 saatin ortalaması PM₂.₅ {f1tr(m60[0])} µg/m³.",
                    "tag": "airlab-alarm", "url": APP_URL,
                }, ttl=2 * 3600)
                _set_state("alarm", {"active": False, "k": -1, "at": now.isoformat()})
    except Exception as e:
        print(f"[bildirim] uyarı denetimi hatası: {e}")
    finally:
        _lock.release()


def morning(now=None):
    """Her gün 08.00 (Türkiye saati): kampüsün o anki durumu."""
    if not is_enabled():
        return
    try:
        now = now or datetime.datetime.now(TR)
        if not _claim(f"sabah-{now.date().isoformat()}"):
            return
        m = campus_mean(30)
        if m:
            v, n, _ = m
            h = hki(v)
            payload = {"title": f"Günaydın · Kampüste hava: {AD_TAM.get(h['ad'], h['ad'])} (HKİ {h['i']})",
                       "body": f"PM₂.₅ {f1tr(v)} µg/m³ (son 30 dakikanın ortalaması, US EPA düzeltmeli). {ADVICE[h['ad']]}"}
        else:
            payload = {"title": "Günaydın · GTÜ AirLab",
                       "body": "Kampüs sensöründen şu an güncel ölçüm alınamıyor; bölge istasyonunun değeri uygulamada."}
        send("sabah", {**payload, "tag": "airlab-sabah", "url": APP_URL})
    except Exception as e:
        print(f"[bildirim] sabah özeti hatası: {e}")
