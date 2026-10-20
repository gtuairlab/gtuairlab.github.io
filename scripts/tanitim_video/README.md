# Tanıtım videoları

Uygulamanın tanıtım videolarını otomatik kaydeder: Playwright uygulamayı yönetir, ekran 30 fps kaydedilir,
üst bantta başlık ve vurgulu açıklamalar, altta telifsiz (tamamen koddan sentezlenmiş) fon müziği eklenir.

| Sürüm | Boyut | Süre | Platform |
|---|---|---|---|
| `short` | 1080×1920 (9:16) | ~90 sn | LinkedIn, Instagram Reels |
| `long` | 1920×1080 (16:9) | ~2,5 dk | YouTube |

Kısa sürümün akışı: giriş → ölçüm ağı (dış ortam, Amfi 1 iç ortam, taşınabilir) → harita → Özet (HKİ, son 24 saat) →
Amfi 1 (iç/dış oranı, sıcaklık, ayrıntılı analiz) → Trendler (gün × saat, kampüs–bölge) → bina bazlı saha ölçümleri →
kişisel maruziyet (asistan, grafik, yolculuk haritası) → kapanış (karekod, adres, kayıt tarihi).

## Kayıt

```bash
python -m http.server 8765 --directory frontend_v2 &        # uygulama yerelde açık olmalı
python -c "import qrcode; qrcode.make('https://gtuairlab.github.io/frontend_v2/').save('scripts/tanitim_video/qr.png')"
HD=1 GERCEK=1 node scripts/tanitim_video/video_kaydet.js short    # → scripts/tanitim_video/cikti/airlab-short.mp4
```

- **Veri:** `GERCEK=1` canlı sunucu verisini kullanır (yayın sürümü; sensörlerin veri gönderdiği bir saatte kaydedin).
  Sunucuya erişilemeyen ortamlarda (ör. bulut oturumu) `TAKLIT=<modül.js>` ile sunucu yanıtları gerçek verinin bir anlık
  görüntüsünden verilir: modül `handle(url)` → `{status, contentType, body}` ve `NOW` (anlık görüntü zamanı, ms) dışa aktarır;
  tarayıcı saati `NOW`'a ayarlanır, kapanış kartına kayıt tarihi yazılır. İkisi de verilmezse **örnek veri** kullanılır ve
  videoda "TASLAK · ÖRNEK VERİ" etiketi görünür (yayımlanmaz).
- **HD (yayın kalitesi):** `HD=1` → ekran 1,5 kat yüksek çözünürlükte yakalanıp 1080×1920'ye küçültülür (keskin yazı), H.264 High, CRF 14.
- Betik sahne zamanlarını `cikti/airlab-<mod>.sahneler.json`'a yazar; müziğin kapanış akoru buradaki `kapanis` anına hizalanır.
- **Sensör görselleri** (uzun sürüm): `foto/purpleair.jpg`, `foto/atmotube.jpg` (ya da `.png`). Ekibin kendi çektiği (ya da kullanım izni olan),
  kişi/yüz içermeyen fotoğraflar kullanın.
- Gerekenler: Node.js + `playwright` (Chromium), `ffmpeg`; müzik için Python + `numpy`.

## Müzik ve birleştirme

```bash
cd scripts/tanitim_video/cikti
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 airlab-short.mp4)
K=$(python -c "import json; print(json.load(open('airlab-short.sahneler.json'))['kapanis'])")
python ../fon_muzigi.py $D muzik.wav 100 $K               # uzun sürüm için tempo 84
# Ses düzeyi: iki geçişli loudnorm (−16 LUFS, gerçek tepe −1,5 dBTP). Önce ölç:
ffmpeg -i muzik.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null -
# sonra ölçülen değerleri (input_i, input_tp, input_lra, input_thresh, target_offset) ikinci geçişe ver:
ffmpeg -i airlab-short.mp4 -i muzik.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -ar 48000 \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=…:measured_TP=…:measured_LRA=…:measured_thresh=…:offset=…:linear=true,afade=t=in:d=0.4" \
  -shortest -movflags +faststart GTU-AirLab-tanitim.mp4
```

Müzik koddan üretildiği için telif sorunu yoktur: Fa – Sol – La minör – Do döngüsü; pad ve piyano ile başlar, arpej, bas,
hafif ritim ve zil ezgisi sırayla girer; kapanış kartında ritim durur ve Do majör akorla yankılanarak söner.

## İçerik kuralları
- Gerçek kişi adı, yüzü ya da kampüs dışı konum videoya girmez (KVKK). Saha oturumlarının adları gösterilmez.
- Altyazılardaki bilgi uygulamadaki yöntemle tutarlı olmalı (`docs/hesaplama_ve_kaynaklar.md`); sağlık hükmü yerine ölçülü dil.
- Karekod ve adres, kalıcı uygulama adresini göstermelidir (https://gtuairlab.github.io/frontend_v2/).
- Örnek veriyle kaydedilen video yayımlanmaz; yayın sürümü gerçek veriyle kaydedilir ve kayıt tarihi kapanışta yazılır.
