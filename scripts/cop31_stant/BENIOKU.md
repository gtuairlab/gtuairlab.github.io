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
uygulamanın gerçek telefon ekranları, kampüs haritası: uygulamanın uydu + kampüs katmanı görünümü, `harita_yakala.py`, zoom 17,5) ve `harita/` (uydu eşlemesi; ziyaretçi videoları da bunu kullanır).
Uydu görüntüsü (© Esri, Maxar) ve uygulama ekranları her seferinde **canlı uygulamadan** üretilir, repoya girmez (repo herkese açık).
Sabit dosyalar `sabit/`: COP31 ve YÖK logoları (YÖK'ün COP31 dijital poster şablonundan), GTÜ İngilizce logosu, `icons.js` (Lucide, ISC).

## Sürüm 12 Kasım 2026 (2:22, döngü)
Kurgu GTÜ'nün COP31 tanıtım paylaşımını izler: soru ("Do we breathe the same air?") → 1 · Measure (giyilebilir ve sabit sensörler,
gerçek uydu haritası) → ölçülen bulgular → modellenen doz (zamanlama, iki ziyaretçi) → 2 · Predict (makine öğrenmesi, geliştiriliyor) →
3 · Share (açık uygulama, gerçek telefon ekranları) → kapanış (COP31/YÖK/GTÜ logoları, karekod, YÖK sorumluluk metni). Sahne süreleri
`SCN`'de `[ad, tasarım süresi, film süresi]`: animasyon anahtarları tasarım süresine göre yazılıdır, çizimde film süresine ölçeklenir.
Renkler GTÜ/COP31 laciverti; köşede karekod (sağ üst) ve COP31 rozeti (sol üst). Yazım BM/Oxford (modelled, Centre).

## Kayıt
```bash
python scripts/cop31_stant/film_kayit.py <gecici>/stant kare 2,30,60   # durağan kareler (kontrol)
python scripts/cop31_stant/film_kayit.py <gecici>/stant film 4         # tam film → <gecici>/stant/film.mp4 (4 işçi)
node scripts/cop31_stant/kayit.js <gecici>/stant film 3                # aynı işin Node sürümü (bulutta NODE_PATH ile)
```
Yeniden üretmeden önce: canlı uygulamayı açıp ekranların düzgün olduğuna bakın (sensör çevrimdışı, boş grafik vb.); ekranlar ve harita her
çalıştırmada canlı yakalanır, alt yazıdaki tarih yakalama günüdür. Stantta: gerçek TV'de karekodu 2 m'den 2–3 telefonla deneyin; TV görüntü
boyutu "Just Scan / Screen Fit" (kenar kırpma kapalı); otomatik kapanma ve eko karartma kapalı.

Ziyaretçi videoları: `python scripts/cop31_animasyon/kayit_yerel.py <gecici>/stant/harita <gecici>/video AB`.

## Bulutta (Claude Code web / mobil) çalıştırma
1. Bulut ortamı (claude.ai/code → ortam ayarı → **Network access → Allowed domains**) şu alan adlarına izin vermeli:
   `gtuairlab.github.io`, `server.arcgisonline.com`, `services.arcgisonline.com`, `gtu-air-quality.onrender.com`
   (ilk ikisi uydu karoları ve uygulama, sonuncusu uygulamanın canlı verisi). İzin yoksa uydu dokusu ve ekranlar üretilemez.
2. Oturum `cop31/animasyon-guncelleme` dalından başlar; yukarıdaki iki komut aynen çalışır (Linux'ta Playwright Chromium,
   `PLAYWRIGHT_BROWSERS_PATH`; ffmpeg sistemden). Node betikleri için `NODE_PATH` Playwright'ın kurulu olduğu yeri göstermeli.
3. Çıktılar (MP4, PNG) repoya konmaz; telefondan izlemek için oturum içinden özel bir Claude sayfası (Artifact) olarak yayımlanır.
