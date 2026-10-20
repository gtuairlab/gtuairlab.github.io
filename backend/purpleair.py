"""
PurpleAir API polling — runs on a background scheduler every 2 minutes.
Stores readings to the database via db.save_purpleair_reading().
"""

import urllib.request
import json
import datetime
from config import (PURPLEAIR_API_KEY, PURPLEAIR_SENSOR_ID, PURPLEAIR_LAT, PURPLEAIR_LON,
                    PURPLEAIR_INDOOR_SENSOR_ID, PURPLEAIR_INDOOR_READ_KEY)
import db

# pm2.5_cf_1_a/b: US EPA 2021 düzeltmesinin girdisi (PurpleAir haritasındaki "US EPA" dönüşümü de bunu kullanır)
FIELDS = "pm1.0_atm,pm2.5_atm,pm2.5_atm_a,pm2.5_atm_b,pm2.5_cf_1_a,pm2.5_cf_1_b,pm10.0_atm,temperature,humidity,last_seen"
API_URL = f"https://api.purpleair.com/v1/sensors/{PURPLEAIR_SENSOR_ID}"

_last_poll_status = {"success": None, "error": None, "at": None}
_last_saved_at = None   # son kaydedilen ölçüm zamanı (sensör çevrimdışıyken aynı ölçüm tekrar kaydedilmesin)


def _fahrenheit_to_celsius(f):
    if f is None:
        return None
    return round((f - 32) * 5 / 9, 1)


def poll():
    global _last_poll_status, _last_saved_at
    if not PURPLEAIR_API_KEY:
        _last_poll_status = {"success": False, "error": "PURPLEAIR_API_KEY not set", "at": _now()}
        print("[purpleair] WARNING: API key not set, skipping poll")
        return

    try:
        url = API_URL + "?fields=" + urllib.request.quote(FIELDS, safe=",.")
        req = urllib.request.Request(url, headers={"X-API-Key": PURPLEAIR_API_KEY})
        with urllib.request.urlopen(req, timeout=10) as resp:
            sensor = json.loads(resp.read().decode()).get("sensor", {})

        # PurpleAir uses Unix timestamps for last_seen
        last_seen_unix = sensor.get("last_seen")
        if last_seen_unix:
            recorded_at = datetime.datetime.utcfromtimestamp(last_seen_unix).isoformat() + "Z"
        else:
            recorded_at = _now()

        data = {
            "recorded_at":  recorded_at,
            "pm1_0":        sensor.get("pm1.0_atm"),
            "pm2_5":        sensor.get("pm2.5_atm"),
            "pm2_5_a":      sensor.get("pm2.5_atm_a"),
            "pm2_5_b":      sensor.get("pm2.5_atm_b"),
            "pm2_5_cf1_a":  sensor.get("pm2.5_cf_1_a"),
            "pm2_5_cf1_b":  sensor.get("pm2.5_cf_1_b"),
            "pm10_0":       sensor.get("pm10.0_atm"),
            "temperature_c": _fahrenheit_to_celsius(sensor.get("temperature")),
            "humidity_pct": sensor.get("humidity"),
            "lat":          PURPLEAIR_LAT,
            "lon":          PURPLEAIR_LON,
        }

        # Sensör PurpleAir'e yeni veri göndermiyorsa API aynı son ölçümü döndürür; kopya kaydetme
        if _last_saved_at is None:
            latest = db.get_latest_purpleair()
            _last_saved_at = _ts(latest.get("recorded_at")) if latest else None
        new_at = _ts(recorded_at)
        if _last_saved_at is not None and new_at is not None and new_at <= _last_saved_at:
            _last_poll_status = {"success": True, "error": None, "at": _now(), "stale_since": recorded_at}
            print(f"[purpleair] Yeni ölçüm yok (son ölçüm {recorded_at}); kayıt atlandı")
            return

        db.save_purpleair_reading(data)
        _last_saved_at = new_at
        _last_poll_status = {"success": True, "error": None, "at": _now()}
        print(f"[purpleair] Polled OK — PM2.5={data['pm2_5']} µg/m³ at {recorded_at}")

    except Exception as e:
        _last_poll_status = {"success": False, "error": str(e), "at": _now()}
        print(f"[purpleair] Poll error: {e}")


def _ts(v):
    """Zaman damgasını karşılaştırılabilir UTC datetime'a çevir (str ya da datetime)."""
    if v is None:
        return None
    if isinstance(v, datetime.datetime):
        return v if v.tzinfo else v.replace(tzinfo=datetime.timezone.utc)
    s = str(v).replace("Z", "+00:00")
    try:
        d = datetime.datetime.fromisoformat(s)
    except ValueError:
        return None
    return d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)


# ── İç ortam sensörü (Amfi 1) ─────────────────────────────────────────────
# Dış sensörle aynı alanlar + konum ve kayıt türü (location_type: 0 dış, 1 iç). Ayrı tabloya yazılır
# (purpleair_indoor_readings); dış sensörün ekranları ve hesapları etkilenmez.
INDOOR_FIELDS = FIELDS + ",latitude,longitude,location_type"
_indoor_status = {"success": None, "error": None, "at": None, "sensor_index": PURPLEAIR_INDOOR_SENSOR_ID or None}
_indoor_last_at = None


def poll_indoor():
    global _indoor_status, _indoor_last_at
    if not PURPLEAIR_INDOOR_SENSOR_ID or not PURPLEAIR_API_KEY:
        _indoor_status = {"success": False, "error": "iç sensör tanımlı değil", "at": _now(), "sensor_index": None}
        return
    try:
        url = (f"https://api.purpleair.com/v1/sensors/{PURPLEAIR_INDOOR_SENSOR_ID}?fields="
               + urllib.request.quote(INDOOR_FIELDS, safe=",."))
        if PURPLEAIR_INDOOR_READ_KEY:
            url += "&read_key=" + urllib.request.quote(PURPLEAIR_INDOOR_READ_KEY, safe="")
        req = urllib.request.Request(url, headers={"X-API-Key": PURPLEAIR_API_KEY})
        with urllib.request.urlopen(req, timeout=10) as resp:
            sensor = json.loads(resp.read().decode()).get("sensor", {})
        ls = sensor.get("last_seen")
        recorded_at = datetime.datetime.utcfromtimestamp(ls).isoformat() + "Z" if ls else _now()
        if _indoor_last_at is None:
            latest = db.get_latest_purpleair_indoor()
            _indoor_last_at = _ts(latest.get("recorded_at")) if latest else None
        new_at = _ts(recorded_at)
        base = {"at": _now(), "sensor_index": PURPLEAIR_INDOOR_SENSOR_ID, "location_type": sensor.get("location_type")}
        if _indoor_last_at is not None and new_at is not None and new_at <= _indoor_last_at:
            _indoor_status = {"success": True, "error": None, "stale_since": recorded_at, **base}
            return
        db.save_purpleair_indoor_reading({
            "sensor_index": PURPLEAIR_INDOOR_SENSOR_ID, "recorded_at": recorded_at,
            "pm1_0": sensor.get("pm1.0_atm"), "pm2_5": sensor.get("pm2.5_atm"),
            "pm2_5_a": sensor.get("pm2.5_atm_a"), "pm2_5_b": sensor.get("pm2.5_atm_b"),
            "pm2_5_cf1_a": sensor.get("pm2.5_cf_1_a"), "pm2_5_cf1_b": sensor.get("pm2.5_cf_1_b"),
            "pm10_0": sensor.get("pm10.0_atm"), "temperature_c": _fahrenheit_to_celsius(sensor.get("temperature")),
            "humidity_pct": sensor.get("humidity"), "lat": sensor.get("latitude"), "lon": sensor.get("longitude"),
        })
        _indoor_last_at = new_at
        _indoor_status = {"success": True, "error": None, **base}
        backfill_indoor(sensor.get("latitude"), sensor.get("longitude"))
    except Exception as e:
        # Hata metninde okuma anahtarı görünmesin
        import re
        msg = re.sub(r"read_key=[^&\s]*", "read_key=…", str(e))
        _indoor_status = {"success": False, "error": msg[:200], "at": _now(), "sensor_index": PURPLEAIR_INDOOR_SENSOR_ID}
        print(f"[purpleair/indoor] Poll error: {msg[:200]}")


# Kurulumdan sunucunun okumaya başladığı ana kadarki boşluk: PurpleAir geçmiş verisinden (2 dk'lık, average=0) bir kez
# doldurulur. Yalnızca ilk kayıt son 3 gün içindeyse (yeni sensör) ve her süreçte bir kez çalışır; mükerrer kayıt yazılmaz.
HISTORY_FIELDS = "pm1.0_atm,pm2.5_atm,pm2.5_atm_a,pm2.5_atm_b,pm2.5_cf_1_a,pm2.5_cf_1_b,pm10.0_atm,temperature,humidity"
_indoor_backfill_done = False


def backfill_indoor(lat=None, lon=None):
    global _indoor_backfill_done
    if _indoor_backfill_done or not PURPLEAIR_INDOOR_SENSOR_ID or not PURPLEAIR_API_KEY:
        return 0
    _indoor_backfill_done = True
    try:
        first = db.get_first_purpleair_indoor()
        first_at = _ts(first.get("recorded_at")) if first else None
        now = datetime.datetime.now(datetime.timezone.utc)
        if first_at is None or now - first_at > datetime.timedelta(days=3):
            return 0
        end = int(first_at.timestamp()) - 1
        start = end - 2 * 86400   # gerçek zamanlı geçmiş en çok 2 gün
        url = (f"https://api.purpleair.com/v1/sensors/{PURPLEAIR_INDOOR_SENSOR_ID}/history?average=0"
               f"&start_timestamp={start}&end_timestamp={end}&fields=" + urllib.request.quote(HISTORY_FIELDS, safe=",."))
        if PURPLEAIR_INDOOR_READ_KEY:
            url += "&read_key=" + urllib.request.quote(PURPLEAIR_INDOOR_READ_KEY, safe="")
        req = urllib.request.Request(url, headers={"X-API-Key": PURPLEAIR_API_KEY})
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
        fields, rows = body.get("fields") or [], body.get("data") or []
        n = 0
        for row in rows:
            r = dict(zip(fields, row))
            ts = r.get("time_stamp")
            if not ts:
                continue
            db.save_purpleair_indoor_reading({
                "sensor_index": PURPLEAIR_INDOOR_SENSOR_ID,
                "recorded_at": datetime.datetime.utcfromtimestamp(ts).isoformat() + "Z",
                "pm1_0": r.get("pm1.0_atm"), "pm2_5": r.get("pm2.5_atm"),
                "pm2_5_a": r.get("pm2.5_atm_a"), "pm2_5_b": r.get("pm2.5_atm_b"),
                "pm2_5_cf1_a": r.get("pm2.5_cf_1_a"), "pm2_5_cf1_b": r.get("pm2.5_cf_1_b"),
                "pm10_0": r.get("pm10.0_atm"), "temperature_c": _fahrenheit_to_celsius(r.get("temperature")),
                "humidity_pct": r.get("humidity"), "lat": lat, "lon": lon,
            })
            n += 1
        print(f"[purpleair/indoor] Geçmiş dolduruldu: {n} kayıt (ilk canlı kayıttan önceki 2 gün)")
        return n
    except Exception as e:
        import re
        msg = re.sub(r"read_key=[^&\s]*", "read_key=…", str(e))[:200]
        print(f"[purpleair/indoor] Geçmiş doldurma hatası: {msg}")
        return 0


def get_indoor_status():
    return _indoor_status


def get_poll_status():
    return _last_poll_status


def _now():
    return datetime.datetime.utcnow().isoformat() + "Z"
