# COP31 sunumu · 3B ziyaretçi animasyonları

İki izometrik (3B) kampüs sahnesi: **Ziyaretçi A** 2 saat kirli noktalarda (36,5 µg), **Ziyaretçi B** 8 saat temiz noktalarda (16,2 µg).
Sayılar uygulamanın maruziyet modelinden; kaynak ve hesap `ajanlar/animasyon/HAFIZA.md`. Sorumlu: Ajan 6 (`.claude/agents/animasyon.md`).

| Dosya | İçerik |
|---|---|
| `iso_engine.js` | Ortak çizim motoru (canvas): sahne, binalar, trafik, partikül pusu, zemin kirlilik rengi, sensörler, ziyaretçi, panel |
| `sahneler.json` | A ve B senaryoları: zaman dilimleri, yol, derişim, doz, etiketler |
| `yap.py` | İkisini birleştirip `cikti/embed_A.html`, `embed_B.html` üretir; 16 KB sınırını denetler |
| `kare.js` | Test kareleri alır (Playwright); çıktıyı repoya değil geçici klasöre yazın |

```bash
python3 scripts/cop31_animasyon/yap.py
NODE_PATH=/opt/node-tools/node_modules node scripts/cop31_animasyon/kare.js /tmp/kareler
```

Sunuma yükleme ana ajanın işidir: `cikti/embed_X.html` içeriği slayt `visitorX`'teki `<x-embed>` içine konur ve yayımlanır.

## Gerçek kampüs videoları (uydu + 3B binalar, 23 Ekim 2026)

| Dosya | İçerik |
|---|---|
| `harita_hazirla.py` | Uygulamanın Uydu ekran görüntüsünü coğrafi eşler (Web Mercator, tek ölçek + öteleme; etiket noktaları + mavi bina dolgusu IoU), uygulama katmanlarını temizler, `doku.png` + `georef.json` üretir |
| `harita3b.html` | Çizim motoru: uydu zemini, `campus.geojson` tabanlarından yükseltilmiş binalar (dikey ×2), güneş konumuna göre gölge, temsilî kirlilik zemini, trafik, ziyaretçi, sensörler, panel. Deterministik `render(t)` |
| `harita_rotalar.json` | Güzergâhlar (boylam/enlem), bakış yönü, bina yükseklik varsayımları, sonuç kartı metinleri. Sayılar `sahneler.json`'dan okunur |
| `kayit.js` | Playwright ile 30 fps kare kare çizer, ffmpeg ile H.264 MP4 (yuv420p, faststart) + durağan kare PNG |

```bash
python3 scripts/cop31_animasyon/harita_hazirla.py <ekran_goruntusu.png> <gecici>/harita
CRF=19 NODE_PATH=/opt/node-tools/node_modules node scripts/cop31_animasyon/kayit.js <gecici>/harita <gecici>/video AB --kareler
```
Uydu görüntüsü (© Esri, Maxar) ve videolar repoya girmez; yalnızca kod ve sahne tanımı.

Video A'da 08:00'de uygulamanın gerçek sabah özeti bildirimi görünür (metin `backend/bildirim.py` → `summary_payload`, İngilizce çeviri;
15,4 µg/m³ = kampüs profili P(08), HKİ 58). Atmotube ziyaretçide değil, R katsayısının saha verisinden geldiği binalarda sabit işarettir.
Döngü geçişi yok: son kare ve durağan PNG sonuç kartıdır (≥ 5 sn bekler). Videoya özgü süre ve panel metinleri `harita_rotalar.json`'da
(`sure`, `bekle`, `etiket`); `sahneler.json` (embed ile ortak) değişmedi.
