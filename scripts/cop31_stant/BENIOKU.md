# COP31 stant filmi (döngü, 1920×1080)

Çizim deterministiktir: `film.js` → `FILM.render(t)`; `kayit.js` kare kare kaydeder (Playwright + ffmpeg). Sahne süreleri `film.js` → `SCN`.
Sayıların kaynağı: kampüs maruziyet raporu (`ajanlar/veri-analiz/raporlar/2026-10-13_kampus_maruziyet/sayilar.json`) ve
`ajanlar/animasyon/HAFIZA.md` (iki ziyaretçi senaryosu).

## Varlıklar: tek komut (12 Kasım 2026)
```bash
pip install playwright segno pillow numpy scipy opencv-python-headless
python scripts/cop31_stant/varlik_hazirla.py <gecici>/stant
```
Çıktı `<gecici>/stant/`: `film.html`, `film.js`, `assets/` (fontlar, AirLab/COP31/YÖK/GTÜ logoları, Lucide ikonları, test edilmiş karekod,
uygulamanın gerçek telefon ekranları, kampüs uydu dokusu) ve `harita/` (uydu eşlemesi; ziyaretçi videoları da bunu kullanır).
Uydu görüntüsü (© Esri, Maxar) ve uygulama ekranları her seferinde **canlı uygulamadan** üretilir, repoya girmez (repo herkese açık).
Sabit dosyalar `sabit/`: COP31 ve YÖK logoları (YÖK'ün COP31 dijital poster şablonundan), GTÜ İngilizce logosu, `icons.js` (Lucide, ISC).

## Kayıt
```bash
node scripts/cop31_stant/kayit.js <gecici>/stant kare 2,30,60      # durağan kareler (kontrol)
node scripts/cop31_stant/kayit.js <gecici>/stant film 3            # tam film, 3 işçi
```
Ziyaretçi videoları: `python scripts/cop31_animasyon/kayit_yerel.py <gecici>/stant/harita <gecici>/video AB`.

## Bulutta (Claude Code web / mobil) çalıştırma
1. Bulut ortamı (claude.ai/code → ortam ayarı → **Network access → Allowed domains**) şu alan adlarına izin vermeli:
   `gtuairlab.github.io`, `server.arcgisonline.com`, `services.arcgisonline.com`, `gtu-air-quality.onrender.com`
   (ilk ikisi uydu karoları ve uygulama, sonuncusu uygulamanın canlı verisi). İzin yoksa uydu dokusu ve ekranlar üretilemez.
2. Oturum `cop31/animasyon-guncelleme` dalından başlar; yukarıdaki iki komut aynen çalışır (Linux'ta Playwright Chromium,
   `PLAYWRIGHT_BROWSERS_PATH`; ffmpeg sistemden). Node betikleri için `NODE_PATH` Playwright'ın kurulu olduğu yeri göstermeli.
3. Çıktılar (MP4, PNG) repoya konmaz; telefondan izlemek için oturum içinden özel bir Claude sayfası (Artifact) olarak yayımlanır.
