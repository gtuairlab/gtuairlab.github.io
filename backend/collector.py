"""
Canlı veri toplayıcı — üç kaynağı (PurpleAir, İBB, Atmotube) kalıcı arşive yazar.
Scheduler tarafından düzenli çağrılır (app.py).
"""

import datetime
import archive
import db
import ibb
import csb
import atmotube_cloud
import kampus
import tuya_co2

# Türkiye sabit UTC+3 (2016'dan beri yaz saati yok)
def _tr_local_to_utc(naive_iso):
    """İBB'nin Türkiye yerel saatini (tz'siz) UTC ISO'ya çevirir."""
    if not naive_iso:
        return naive_iso
    try:
        dt = datetime.datetime.fromisoformat(naive_iso.replace("Z", ""))
        return (dt - datetime.timedelta(hours=3)).isoformat() + "+00:00"
    except Exception:
        return naive_iso


def collect_purpleair():
    """PurpleAir son okumasını arşive ekle (poll zaten SQLite'a yazdı)."""
    try:
        d = db.get_latest_purpleair()
        if not d:
            return 0
        return archive.log_rows([{
            "source": "purpleair", "device": "PA-II",
            "recorded_at": d.get("recorded_at"),
            "pm1_0": d.get("pm1_0"), "pm2_5": d.get("pm2_5"), "pm10_0": d.get("pm10_0"),
            "voc_ppm": None,
            "temperature_c": d.get("temperature_c"), "humidity_pct": d.get("humidity_pct"),
            "pressure_hpa": d.get("pressure_hpa"),
            "lat": d.get("lat"), "lon": d.get("lon"),
        }])
    except Exception as e:
        print(f"[collector/purpleair] {e}")
        return 0


def collect_ibb():
    """İBB en yakın istasyon (Tuzla) saatlik değerini arşive ekle."""
    try:
        d = ibb.get_nearest_station(force=True)
        if not d or d.get("pm2_5") is None:
            return 0
        return archive.log_rows([{
            "source": "ibb", "device": d.get("station_name"),
            "recorded_at": _tr_local_to_utc(d.get("recorded_at")),
            "pm1_0": None, "pm2_5": d.get("pm2_5"), "pm10_0": d.get("pm10_0"),
            "voc_ppm": None,
            "temperature_c": d.get("temperature_c"), "humidity_pct": d.get("humidity_pct"),
            "pressure_hpa": None,
            "lat": d.get("lat"), "lon": d.get("lon"),
        }])
    except Exception as e:
        print(f"[collector/ibb] {e}")
        return 0


def collect_csb():
    """CSB Tuzla istasyonu saatlik PM2.5 değerini arşive ekle (Türkiye saati → UTC)."""
    try:
        d = csb.get_latest(force=True)
        if not d or d.get("pm2_5") is None:
            return 0
        return archive.log_rows([{
            "source": "csb", "device": d.get("station_name"),
            "recorded_at": _tr_local_to_utc(d.get("recorded_at")),
            "pm1_0": None, "pm2_5": d.get("pm2_5"), "pm10_0": None,
            "voc_ppm": None, "temperature_c": None, "humidity_pct": None,
            "pressure_hpa": None, "lat": d.get("lat"), "lon": d.get("lon"),
        }])
    except Exception as e:
        print(f"[collector/csb] {e}")
        return 0


def collect_atmotube():
    """5 Atmotube cihazının son okumalarını arşive ekle."""
    try:
        devices = atmotube_cloud.get_live_devices(force=True)
        rows = []
        for d in devices:
            r = d.get("reading")
            if not r:
                continue
            rows.append({
                "source": "atmotube", "device": d.get("device"),
                "recorded_at": r.get("recorded_at"),
                "pm1_0": r.get("pm1_0"), "pm2_5": r.get("pm2_5"), "pm10_0": r.get("pm10_0"),
                "voc_ppm": r.get("voc_ppm"),
                "temperature_c": r.get("temperature_c"), "humidity_pct": r.get("humidity_pct"),
                "pressure_hpa": r.get("pressure_hpa"),
                "lat": r.get("lat"), "lon": r.get("lon"),
            })
        return archive.log_rows(rows)
    except Exception as e:
        print(f"[collector/atmotube] {e}")
        return 0


HISTORY_RECENT_DAYS = 30            # son kayıttan bugüne en çok bu kadar gün her saat yeniden sorulur
HISTORY_START = datetime.date(2026, 6, 1)   # eski günlerin bir kerelik doldurulacağı ilk gün
HISTORY_OLD_DAYS_PER_RUN = 5        # her çalışmada cihaz başına en çok bu kadar eski gün (bulut 429 vermesin diye az)


def _atmotube_day_rows(name, mac, day):
    items = atmotube_cloud.fetch_device_history(
        mac, day.isoformat(), (day + datetime.timedelta(days=1)).isoformat())
    rows = []
    for it in items:
        c = it.get("coords") or {}
        rows.append({
            "source": "atmotube", "device": name, "recorded_at": it.get("time"),
            "pm1_0": it.get("pm1"), "pm2_5": it.get("pm25"), "pm10_0": it.get("pm10"),
            "voc_ppm": it.get("voc"), "temperature_c": it.get("t"),
            "humidity_pct": atmotube_cloud.clean_humidity(it.get("h")), "pressure_hpa": it.get("p"),
            "lat": c.get("lat"), "lon": c.get("lon"),
        })
    return rows


def collect_atmotube_history():
    """Saatte bir: Atmotube bulutunun dakikalık kaydını gün gün çekip arşive ekler (mükerrersiz).
    1) Yakın günler: arşivdeki son kayıttan bugüne (en çok 30 gün) her saat yeniden sorulur; cihaz telefona
       geç bağlansa da belleğindeki ölçümler gelir. 2) Eski günler (1 Haziran 2026'dan beri): her gün bir kez
       çekilir, atmotube_backfill tablosuna işaretlenir; yük yayılsın diye her çalışmada en çok 5 gün.
    Yakın günler önce sorulur ve her gün ayrı denenir: eski bir günün hatası yakın günleri engellemez.
    Bulut "çok fazla istek" (HTTP 429) derse çalışma o saat için durur (22 Ekim 2026: önce eski günler
    sorulduğu için 429'a takılıp yakın günlerin dakikalık kaydı arşive hiç girmiyordu)."""
    import time
    if not archive.is_enabled() or not atmotube_cloud.ATMOTUBE_API_KEY:
        return 0
    today = datetime.date.today()
    recent, old = [], []          # önce bütün cihazların yakın günleri, sonra eski günler
    for name, mac in atmotube_cloud.DEVICES.items():
        try:
            last = archive.latest_device_reading("atmotube", name)
            recent_from = today - datetime.timedelta(days=1)
            if last:
                last_day = datetime.date.fromisoformat(last["recorded_at"][:10])
                recent_from = max(today - datetime.timedelta(days=HISTORY_RECENT_DAYS), min(last_day, recent_from))
            done = archive.backfilled_days(name)
            old_days = [HISTORY_START + datetime.timedelta(days=i)
                        for i in range((recent_from - HISTORY_START).days)]
            old += [(name, mac, d, True) for d in old_days if d not in done][:HISTORY_OLD_DAYS_PER_RUN]
            recent += [(name, mac, recent_from + datetime.timedelta(days=i), False)
                       for i in range((today - recent_from).days + 1)]
        except Exception as e:
            print(f"[collector/atmotube_history] {name}: {atmotube_cloud._safe_error(e)}")
    recent.sort(key=lambda x: x[2], reverse=True)   # en yeni günler önce: uzun süredir eşitlenmeyen cihaz diğerlerini bekletmesin
    total = 0
    for name, mac, day, is_old in recent + old:
        try:
            total += archive.log_rows(_atmotube_day_rows(name, mac, day))
            if is_old:
                archive.mark_backfilled(name, day)
        except Exception as e:
            err = atmotube_cloud._safe_error(e)
            print(f"[collector/atmotube_history] {name} {day}: {err}")
            if err == "HTTP 429":
                print("[collector/atmotube_history] bulut istek sınırı: bu saatlik çalışma durduruldu")
                break
        time.sleep(1.0)   # bulutu yormamak için
    if total:
        print(f"[collector/atmotube_history] {total} ölçüm arşivlendi (geçmiş/gecikmeli).")
        sync_atmotube_sessions()
    return total


def collect_co2():
    """CO₂ sensörlerinin (Tuya) son okumalarını arşive ekle."""
    try:
        devices = tuya_co2.get_live_devices(force=True)
        rows = []
        for d in devices:
            r = d.get("reading")
            if not r or r.get("co2_ppm") is None:
                continue
            rows.append({
                "source": "co2", "device": d.get("device"),
                "recorded_at": r.get("recorded_at"),
                "pm1_0": None, "pm2_5": None, "pm10_0": None,
                "voc_ppm": None, "co2_ppm": r.get("co2_ppm"),
                "temperature_c": r.get("temperature_c"), "humidity_pct": r.get("humidity_pct"),
                "pressure_hpa": None,
                "lat": r.get("lat"), "lon": r.get("lon"),
                # konumu hangi Atmotube'dan aldı (ATP-2) — CSV'de yan yana eşlemek için
                "anchor_device": d.get("anchored_to"),
            })
        return archive.log_rows(rows)
    except Exception as e:
        print(f"[collector/co2] {e}")
        return 0


def sync_atmotube_sessions():
    """Arşivdeki Atmotube (ATP-1..5) verisini, saha ölçümleri panelinde seçilebilir
    olsun diye cihaz-gün bazlı oturumlara (upload_sessions + atmotube_readings) dönüştürür.
    Son 3 gün işlenir; tekrar çalıştırılabilir (ON CONFLICT ile mükerrer engellenir)."""
    if not archive.is_enabled():
        return
    try:
        with db.get_conn() as conn:
            cur = conn.cursor()
            # Cihaz kampüs dışına götürüldüğünde (ev, yol) o ölçümler saha oturumuna alınmaz
            # Son 3 günün ölçümleri + son 1 günde arşive giren (cihaz geç eşitlendiyse eski tarihli) günler
            cur.execute(f"""
                SELECT device, (recorded_at AT TIME ZONE 'Europe/Istanbul')::date AS d,
                       COUNT(*), MIN(recorded_at), MAX(recorded_at)
                FROM measurements
                WHERE source='atmotube' AND (lat IS NULL OR {kampus.sql_box()})
                  AND (device, (recorded_at AT TIME ZONE 'Europe/Istanbul')::date) IN (
                      SELECT DISTINCT device, (recorded_at AT TIME ZONE 'Europe/Istanbul')::date
                      FROM measurements
                      WHERE source='atmotube'
                        AND (recorded_at > now() - interval '3 days' OR ingested_at > now() - interval '1 day'))
                GROUP BY device, d ORDER BY device, d
            """)
            groups = cur.fetchall()
            for device, d, cnt, mn, mx in groups:
                name = f"{device}_{d.strftime('%Y%m%d')}"
                try:
                    sn = int(str(device).split("-")[1])
                except Exception:
                    sn = 1
                cur.execute("SELECT id FROM upload_sessions WHERE session_name=%s", (name,))
                row = cur.fetchone()
                if row:
                    sid = row[0]
                    cur.execute("UPDATE upload_sessions SET reading_count=%s, end_time=%s WHERE id=%s",
                                (cnt, mx, sid))
                else:
                    cur.execute("""INSERT INTO upload_sessions
                        (session_name, micro_environment, sensor_number, reading_count, start_time, end_time, notes)
                        VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id""",
                        (name, 'portable', sn, cnt, mn, mx, f"{device} canlı saha ölçümü"))
                    sid = cur.fetchone()[0]
                # Ölçümleri ekle (mükerrer atlanır)
                cur.execute(f"""
                    INSERT INTO atmotube_readings
                        (session_id, recorded_at, voc_ppm, pm1_0, pm2_5, pm10_0,
                         temperature_c, humidity_pct, pressure_hpa, lat, lon)
                    SELECT %s, recorded_at, voc_ppm, pm1_0, pm2_5, pm10_0,
                           temperature_c, humidity_pct, pressure_hpa, lat, lon
                    FROM measurements
                    WHERE source='atmotube' AND device=%s
                      AND (recorded_at AT TIME ZONE 'Europe/Istanbul')::date = %s
                      AND (lat IS NULL OR {kampus.sql_box()})
                    ON CONFLICT (session_id, recorded_at) DO NOTHING
                """, (sid, device, d))
    except Exception as e:
        print(f"[sync_atmotube] {e}")


def collect_fast():
    """2 dakikada bir: PurpleAir + Atmotube + CO₂ (+ cihaz oturumlarını güncelle)."""
    n = collect_purpleair() + collect_atmotube() + collect_co2()
    sync_atmotube_sessions()
    if n:
        print(f"[collector] {n} yeni kayıt arşivlendi (PurpleAir+Atmotube+CO₂).")


def collect_hourly():
    """Saatte bir: Tuzla istasyonu (İBB açık verisi). ÇŞB yerel toplayıcısı Haziran 2026'dan
    beri çalışmadığı için Tuzla arşivi İBB'den sürdürülür (aynı istasyon; ÇŞB gelirse
    kaynak alanı farklı olduğundan çakışmaz)."""
    return collect_ibb()
