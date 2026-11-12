# Bulut oturumu görevi · COP31 stant filmi (12 Kasım 2026)

Bu dosya bir bulut oturumunun başlangıç tarifidir. Kullanıcı telefondan takip ediyor: yanıtlar Türkçe, kısa ve düz.

## Başlangıç
1. `git fetch origin && git checkout cop31/animasyon-guncelleme` — yalnızca bu dalda çalış ve commit'le; `main`'e birleştirmeden önce kullanıcıya sor.
2. Oku: `CLAUDE.md`, `scripts/cop31_stant/BENIOKU.md`, `scripts/cop31_animasyon/BENIOKU.md`, `ajanlar/animasyon/HAFIZA.md`.

## Görev
Yeni COP31 stant döngü filmi: **2:00–2:30**, 1920×1080, standda sürekli dönecek (dikişsiz döngü). Temel: `film.html` + `film.js`
(eski sürüm 170 sn, 9 sahne: open, gap, built, evid, timing, visit, app, next, join; süreler `SCN`). Eskisinden daha güzel ve kısa olsun.
- **COP31 simgeleri:** COP31 Türkiye Antalya logosu, YÖK logosu, GTÜ İngilizce logosu (`sabit/`); **karekod** https://gtuairlab.github.io/frontend_v2/
  (`varlik_hazirla.py` üretir ve çözerek test eder).
- **Kurgu, üniversitenin Instagram paylaşımının üzerine** (gtuedutr, reel DfoxWMlRg31; Türkçe, lacivert düz illüstrasyon, sarı vurgular):
  "Bir soru: Aynı havayı mı soluyoruz? Dış hava aynı, iç ortamlar farklı olabilir" → 1 Kişisel ölçüm: düşük maliyetli taşınabilir sensörler →
  iç ve dış ortamda sabit sensörler → 2 Makine öğrenimi: maruziyet için ileriye dönük tahmin → 3 Herkese açık uygulama: sensörü olmayanlar da
  kampüs havasını çevrimiçi görür. Film **İngilizce**, animasyonlu, **gerçek kampüs uydu haritası** üzerinde.
- **Kapanış kartı:** YÖK sorumluluk metni: "Gebze Technical University is solely responsible for the views, information and statements expressed
  in this film, as well as for its preparation and content. It does not necessarily reflect the views of the Council of Higher Education of
  Türkiye (YÖK), nor does it imply any responsibility or liability on its part."

## Kurallar
- BM/Oxford yazımı (modelled, Centre). Her sayı `ajanlar/veri-analiz/raporlar/2026-10-13_kampus_maruziyet/sayilar.json` ya da
  `ajanlar/animasyon/HAFIZA.md`'den gelmeli; ölçülen ile modellenen ayrı etiketlenir; makine öğrenmesi modeli "in development".
- Atmotube PRO 2'den ya da "eklenecek CO₂"den söz edilmez; saha ekibinin adı geçmez.
- Bildirimler yayında (12 Kasım 08:00 sabah özeti gönderildi): `CLAUDE.md`'deki "VAPID anahtarlarını ekle" maddesi eskimiş; kullanıcıya söyle, kendin düzenleme.
- 20 Ekim 2026'dan beri Amfi 1'de iç ortam PurpleAir'i de var.
- Lisanslı görüntü (© Esri, Maxar) ve MP4 repoya girmez.

## Nasıl
```bash
pip install playwright segno pillow numpy scipy opencv-python-headless
python scripts/cop31_stant/varlik_hazirla.py /tmp/stant
node scripts/cop31_stant/kayit.js /tmp/stant kare 2,30,60
node scripts/cop31_stant/kayit.js /tmp/stant film 3
```
Ağ izni gerekir: `gtuairlab.github.io`, `server.arcgisonline.com`, `services.arcgisonline.com`, `gtu-air-quality.onrender.com`.
Engelliyse kullanıcıya tam olarak hangi alan adlarını ekleyeceğini söyle (claude.ai/code → ortam GTUAIRLAB → Network access), sonra tekrar dene.
`kayit.js` Playwright'ı bulamazsa `NODE_PATH`'i ayarla ya da `scripts/cop31_animasyon/kayit_yerel.py` gibi Python'a taşı.

## Bitti sayılır
1. Bağımsız bir denetçi ajan filmi kontrol etti (sayılar, yazım, COP31/YÖK markası, döngü dikişi, stant mesafesinden okunabilirlik);
   bulgular düzeltildi ve yeniden kontrol edildi.
2. Son MP4 (gerekirse sıkıştırılmış) ve birkaç kare, telefondan izlenebilecek **özel bir claude.ai Artifact** olarak yayımlandı; bağlantı kullanıcıya verildi.
3. Kod değişiklikleri bu dala commit'lendi ve gönderildi.
