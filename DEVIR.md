# GTÜ AirLab · Hesap devri (2 Kasım 2026)

Bu belge, projeyi **akademik Claude hesabına** taşımak için hazırlandı. İki bölüm var:
**A** senin yapacağın adımlar, **B** yeni hesaptaki Claude'un bilmesi gerekenler.
Anahtar ve parolaların **değerleri bu belgede yok** (repo herkese açık); yalnızca adları ve nerede durdukları yazıyor.

> Önemli: Uygulama, sunucu, veritabanı, sensörler ve bildirimler **Claude hesabından bağımsız** çalışır.
> Hesap değiştirmek hiçbir şeyi durdurmaz. Taşınan şey yalnızca Claude tarafı: oturumlar, bağlayıcılar, yayımlanmış sayfalar ve sohbetteki dosyalar.

---

## A. Senin yapacakların (sırayla)

### A0. `claude-gmail-proje` klasörü (3 Kasım 2026)
Eski hesabın sohbetinde tek zip olarak gönderildi; indirip masaüstüne aç. Claude hesabına bağlı her şeyin yedeği içinde:
| Alt klasör | İçerik |
|---|---|
| `DEVIR.md`, `DEVIR.pdf` | Bu belge (PDF okunması kolay kopya) |
| `1_COP31_stant/` | Stant filmi (MP4, 2 Kasım), konuşma kartı (2 Kasım), masa karekod kartı (PDF) |
| `2_COP31_sunum_yedegi/` | "GTU AirLab · COP31" sunumunun slayt dosyaları, görselleri ve iki ziyaretçi videosu + zamanlama animasyonu (MP4) |
| `3_tanitim_sunumu_yedegi/` | "GTÜ AirLab Tanıtım" sunumunun slayt dosyaları ve görselleri |
| `4_sayfalar/` | "AirLab Ajan Yapısı" ve "Bir Ölçümün Yolculuğu" sayfaları (tarayıcıda açılır) |
| `5_repo/` | Reponun tam kopyası (git bundle, bütün geçmişiyle) |

Sunum yedekleri, paylaşım yeni hesapta açılmazsa yeni Claude'un sunumu yeniden kurması içindir (slayt dosyaları + görseller).
**Klasörde olmayanlar:** "Yönetici Özeti" (Docs) ve "Kampüs Hava Kalitesi Raporu (demo)" (Dashboard) dosya olarak çıkarılamıyor;
sayfalarından indir ya da paylaş (A1-3). El ilanının (`GTU-AirLab-COP31-handout.pdf`) kaynağı kayıtlarda yok; 22 Ekim'deki sohbet
mesajından indir. Veritabanı klasörde yok, gerekmiyor: Supabase'de duruyor ve Claude hesabından bağımsız (B4).

### A1. Eski hesaptan çıkmadan önce (eski hesapta)
1. **Sohbette gönderilen dosyaları indir.** Bulut çalışma ortamı geçicidir; bu dosyaların kopyası yalnızca sohbette duruyor:
   - COP31 stant filmi `GTU-AirLab-Stand11-loop.mp4` — **2 Kasım'da gönderilen son sürüm** (2 dk 50 sn, sessiz, petrol yeşili zemin, açılışta ad;
     Atmotube PRO 2 / CO₂ cümlesi çıkarıldı)
   - Konuşma kartı `GTU-AirLab-Stand11-konusma-karti.pdf` (A5, iki yüz) — **2 Kasım'da gönderilen son sürüm** ("What comes next?" yanıtında
     Atmotube PRO 2 / CO₂ çıkarıldı)
   - El ilanı `GTU-AirLab-COP31-handout.pdf` (22 Ekim; zip'te yok, bu mesajdan indir) ve masa karekod kartı `GTU-AirLab-Stand11-karekod-kart.pdf`
     (A4, ortadan katlanır; zip'te 3 Kasım kopyası var)
   - Aynı adla daha önce gönderilmiş eski sürümler (stant videosu 23, 26, 27 Ekim; konuşma kartı 23 Ekim) gerekmiyor; en sondakini al.
   - Not: filmin girdileri (logo, karekod, ekran görüntüleri) COP31 sunumunun içinde duruyor; uydu dokusu onlardan yeniden kurulur
     (`scripts/cop31_stant/hazirla.sh` başındaki not). Sunum silinirse film yeniden kaydedilemez; MP4'ü mutlaka indir.
2. **COP31 sunumu "GTU AirLab · COP31":** https://claude.ai/artifact/34tYuKM4XNMxG6st6egjWH
   - **Paylaş** menüsünden akademik e-postana **düzenleme** izni ver; yeni hesaptaki Claude aynı bağlantıyı güncelleyebilsin.
   - Son sürüm 25 (2 Kasım: "Next 12 months" slaydı ve konuşmacı notundan Atmotube PRO 2 / CO₂ çıkarıldı; eski sürümler sürüm geçmişinde).
   - Yedek olarak **PPTX ve PDF** indir. İki ziyaretçi videosu ve zamanlama animasyonu sunumun içinde gömülü; bağlantıdan açınca oynar,
     PPTX/PDF'de durağan kare olarak kalır. Bu videoların ayrı kopyası yok; standda sunumu bağlantıdan (internetle) aç.
3. **Projeye ait diğer yayımlanmış sayfalar** (aynı yolla paylaş ya da indir):
   - GTÜ AirLab Tanıtım — https://claude.ai/artifact/AEGwdonp9Bq56AcEVGs33Y
   - GTÜ AirLab · Yönetici Özeti ve Yöntem Belgesi — https://claude.ai/artifact/X1vS9b81mPwyd8je8PsKHd
   - AirLab Ajan Yapısı — https://claude.ai/artifact/LEWmrnj45XGn596CeHfTZ8
   - Bir Ölçümün Yolculuğu — https://claude.ai/artifact/LyJDJ6Sab6msAZDtSx8E3v
   - Kampüs Hava Kalitesi Raporu (demo) — https://claude.ai/artifact/V6SgTe8KymsYSitM57wbZX
4. **Zamanlanmış görev:** Projeye ait zamanlanmış Claude görevi **yok**. Sunucuyu uyanık tutan iş Supabase'de çalışıyor (B4), Claude'a bağlı değil.
5. Eski hesapta bağlı **GitHub ve Supabase bağlayıcılarını** istersen sonra kaldırabilirsin; yeni hesap kendi bağlantısını kurar (A2).
   Diğer bağlayıcılar (Google Drive, Canva, Figma vb.) bu projede kullanılmıyor.
6. **Sohbet geçmişi hesaplar arasında taşınmaz.** Projenin bütün bilgisi repoda: `CLAUDE.md` (kurallar, bekleyen işler), bu belge,
   `docs/` (yöntem ve kaynaklar), `ajanlar/*/HAFIZA.md` (ajan hafızaları). Eski hesapta claude.ai'de bu projeye ait bir Proje talimatı
   ya da hafıza notu tuttuysan metnini kopyalayıp yeni hesapta Claude'a yapıştır.

### A2. Yeni (akademik) hesapta kurulum
0. Akademik hesap kurumsal bir plandaysa (Education/Enterprise) Claude Code, bağlayıcılar ve kurum dışından gelen paylaşımlar
   yöneticinin iznine bağlı olabilir. Bir adım görünmüyorsa üniversitenin Claude yöneticisine sor. Paylaşım açılmazsa yedek yol:
   sayfayı eski hesaptan indirip yeni hesapta yeniden yayımlatmak (bağlantı değişir; stant filmindeki karekod uygulamaya gittiği için etkilenmez).
1. **GitHub bağla:** https://claude.ai/connect-github
   - Bağladığın GitHub kullanıcısı **gtuairlab** organizasyonunun üyesi ve repoda yazma izni olan kullanıcı olmalı.
     Akademik hesapta başka bir GitHub kullanıcısı kullanacaksan önce onu https://github.com/orgs/gtuairlab/people adresinden organizasyona ekle.
   - Aynı sayfa, Claude GitHub uygulaması gtuairlab organizasyonunda kurulu değilse kurmanı ister (organizasyon sahibi olarak onayla).
     Doğrudan bağlantı: https://github.com/apps/claude/installations/select_target
2. **Claude Code (web) oturumu:** https://claude.ai/code → repo olarak **`gtuairlab/gtuairlab.github.io`** seç.
   - Belgeler: https://code.claude.com/docs/en/claude-code-on-the-web
   - İsteğe bağlı ağ izni: oturum başlığındaki bulut ortamı menüsü → Edit → Network access → **Limited** düzeyinde (uygulamanın eski
     sürümünde **Custom**) Allowed domains'e `gtu-air-quality.onrender.com` ekle; paket yöneticileri kutusu ("Allow package managers" /
     "Also include default list of common package managers") işaretli kalsın. Böylece Claude sunucuyu doğrudan sınar; eklenmezse
     Supabase üzerinden dolaylı sınar (bu hesapta öyle çalıştık). Adımlar: https://code.claude.com/docs/en/cloud-environments#network-access
3. **Supabase bağlayıcısı:** https://claude.ai/customize/connectors → **Supabase** → projenin sahibi olan Supabase hesabınla giriş yap.
   Proje: **gtu-hava-kalitesi** (bölge eu-central-1, ref `wgirpaysokuoygycmdst`). Bağlayıcılar oturum başlarken okunur:
   bağladıktan sonra **yeni oturum** aç.
4. **Masaüstü (Türkiye'deki bilgisayar):** Claude masaüstü uygulamasında eski hesaptan çık, akademik hesapla gir → Claude Code →
   klasör olarak gtuairlab klonunu seç (klon zaten varsa yeniden klonlama, `git pull` yeter; yoksa
   `git clone https://github.com/gtuairlab/gtuairlab.github.io`).
   ÇŞB ve İBB'ye yalnızca Türkiye'den erişildiği için Tuzla geçmişi gibi betikler masaüstünde çalışır.
5. **İlk mesaj (yeni hesapta, Claude Code oturumunda):**
   > "Bu proje başka bir Claude hesabından devredildi. Önce `DEVIR.md`'yi ve `CLAUDE.md`'yi oku, sonra `main`'i güncelle,
   > sunucunun ve verinin canlı durumunu kontrol et ve bekleyen işleri kısaca listele."

### A3. Claude'dan bağımsız, sende kalan hesaplar (değişmez; şifreleri Claude'a verme)
| Hizmet | Ne için | Nereden yönetilir |
|---|---|---|
| GitHub · `gtuairlab` organizasyonu | Kod ve site (GitHub Pages) | https://github.com/gtuairlab/gtuairlab.github.io |
| Render · servis `gtu-air-quality` | Sunucu (API, veri toplama, bildirimler) | https://dashboard.render.com → servis → Environment / Logs |
| Supabase · proje `gtu-hava-kalitesi` | Veritabanı | https://supabase.com/dashboard |
| PurpleAir | Dış (229263) ve iç (228591) sensör, okuma anahtarı, puan kullanımı | https://develop.purpleair.com |
| Atmotube | 5 giyilebilir cihaz (ATP-1…5), bulut anahtarı | Atmotube uygulaması / hesabı |
| GTÜ birim sayfası | Vitrin: airlab.gtu.edu.tr → gtu.edu.tr/kategori/9611 | GTÜ web editörü |

---

## B. Yeni hesaptaki Claude için

### B1. Adresler
- Uygulama (yayın): https://gtuairlab.github.io/frontend_v2/ — kök https://gtuairlab.github.io oraya yönlendirir.
- Sunucu API: https://gtu-air-quality.onrender.com (sağlık: `/health`)
- Repo (tek kaynak `main`): https://github.com/gtuairlab/gtuairlab.github.io — `main`'e push hem siteyi hem Render sunucusunu günceller.
- Eski repo `ilkerakmirza/gtu-air-quality`: yalnızca yönlendirme sayfaları; geçmişinde kişisel belgeler ve eski bir anahtar var.
  **Silinmesi kullanıcının ayrı onayına bağlı.** Eski site adresi https://ilkerakmirza.github.io/gtu-air-quality/ yenisine yönlendirir.

### B2. Çalışma kuralları
Tamamı `CLAUDE.md`'de (Claude Code bu dosyayı kendiliğinden okur): oturum başı adımları, sade Türkçe, KVKK, arayüz ilkeleri,
HKİ, US EPA düzeltmesi, sayı biçimi, kaynak kaydı, duyuru ekleme, telefon uygulaması, proje yapısı ve **Bekleyen işler**.
Uzman ajanlar `.claude/agents/` (6 ajan: veri-kontrol, isleme-yontem, son-kontrol, arayuz-kalitesi, veri-analiz, animasyon);
hafızaları `ajanlar/<ad>/HAFIZA.md`, özet `ajanlar/BENIOKU.md`.

### B3. Sunucu (Render) ortam değişkenleri — yalnızca adlar
Değerleri kullanıcı Render → Environment'ta tutar; **değer isteme, repoya yazma.**

| Ad | Açıklama |
|---|---|
| `DATABASE_URL` | Supabase Postgres bağlantısı (Supabase → Connect) |
| `PURPLEAIR_API_KEY` | PurpleAir okuma anahtarı (kullanıcının kararı: yenilenmeyecek, tekrar önerme) |
| `PURPLEAIR_SENSOR_ID` / `PURPLEAIR_INDOOR_SENSOR_ID` | 229263 (SUMER çatısı) / 228591 (Amfi 1, iç) — kodda varsayılan |
| `PURPLEAIR_INDOOR_READ_KEY`, `PURPLEAIR_INDOOR_NAME` | İç sensör özel okuma anahtarı (varsa), görünen ad (varsayılan "Amfi 1") |
| `PURPLEAIR_LAT`, `PURPLEAIR_LON`, `CAMPUS_LAT`, `CAMPUS_LON`, `CAMPUS_RADIUS_KM` | Konumlar (kodda varsayılan var) |
| `ATMOTUBE_API_KEY` | Atmotube bulut anahtarı |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Telefon bildirimleri. Anahtar değişirse tüm abonelikler geçersiz olur |
| `ADMIN_TOKEN` | Yönetici uçları; varsayılanı `changeme`, uzun rastgele değer tanımlı olmalı (kullanıcı kontrol edecek) |
| `TUYA_ACCESS_ID`, `TUYA_ACCESS_SECRET`, `TUYA_API_ENDPOINT` | Eski CO₂ sensörleri (Tuya) — şimdilik kapalı |
| `TUYA_CO2_DEVICES` ya da tek cihaz için `TUYA_CO2_DEVICE_ID`, `TUYA_CO2_NAME`, `TUYA_CO2_LOCATION`, `TUYA_CO2_ANCHOR`, `TUYA_CO2_LAT`, `TUYA_CO2_LON` | Tuya CO₂ cihaz listesi ve konumları (`backend/tuya_co2.py`) |
| `POLL_INTERVAL_MINUTES`, `CORS_ORIGINS`, `PORT` | Ayarlar (varsayılan 2 dk, `*`; `PORT`'u Render verir) |
| `SQLITE_PATH`, `DB_PATH` | Yalnızca `DATABASE_URL` yokken yerel SQLite dosyası (Render'da gerekmez) |
| `WAQI_TOKEN` | **Henüz yok, kodda da yok**; Tuzla için olası yedek (B6-2) |

Sunucu `gunicorn.conf.py` ile tek süreç + 8 iş parçacığı çalışır; zamanlayıcıyı tek süreç yürütür (2 Kasım 2026 düzeltmesi).

### B4. Veritabanı (Supabase, `gtu-hava-kalitesi`)
| Tablo | İçerik (2 Kasım 2026, yaklaşık satır) |
|---|---|
| `purpleair_readings` | Dış PurpleAir, 2 dakikalık (≈126 bin) |
| `purpleair_indoor_readings` | İç PurpleAir, Amfi 1 (≈9 bin) |
| `measurements` | Kalıcı arşiv: PurpleAir, Atmotube, İBB/Tuzla, CO₂ (≈37 bin) |
| `upload_sessions`, `atmotube_readings` | Saha oturumları ve ölçümleri (102 oturum, ≈12 bin ölçüm) |
| `atmotube_backfill` | Atmotube geçmiş doldurma ilerlemesi (sütunlar `device`, `day`, `fetched_at`) |
| `push_subscriptions`, `push_state` | Bildirim abonelikleri (2) ve gönderim durumu |
| `yedek_purpleair_nisan`, `yedek_atmotube_nem_128` | Geri dönüş yedekleri |
| `gecici_pa_indirme`, `gecici_pa_eklenen`, `gecici_cf1_eklenen` | PurpleAir arşiv içe aktarımının geçici tabloları |

- `pg_cron` işi **`render-uyanik-tut`** (`*/5 * * * *`, etkin): 5 dakikada bir `/health`, Render'ın uyumasını önler. Yedek: `.github/workflows/sunucu-uyanik.yml`.
- RLS açık; sunucu `postgres` rolüyle bağlanır. Bulut oturumu onrender.com'a erişemezse sunucuyu `net.http_get` ile Supabase üzerinden sınayabilirsin.
- Tam yedek istenirse: Supabase → Database → Backups (ya da `pg_dump` ile `DATABASE_URL`).

### B5. Repo haritası (kısa)
- `frontend_v2/` yayındaki uygulama · `backend/` sunucu · `docs/` yöntem belgeleri (her eşik ve hesap `hesaplama_ve_kaynaklar.md`'de)
- `ajanlar/veri-analiz/raporlar/2026-10-13_kampus_maruziyet/` kampüs maruziyet raporu ve `sayilar.json` (sunumdaki sayıların kaynağı)
- `scripts/cop31_animasyon/` ziyaretçi videoları, `scripts/cop31_stant/` stant filmi. **Uydu görüntüsü ve uygulama ekran görüntüleri repoda yok**
  (Esri/Maxar lisansı ve boyut); yeniden kayıt için uygulamanın uydu katmanından yeni ekran görüntüsü gerekir (`scripts/cop31_animasyon/harita_hazirla.py` girdi yolu ister).
- `scripts/purpleair_arsiv/` yarım kalan arşiv içe aktarımı (B6-6), `scripts/tanitim_video/` tanıtım videosu, `scripts/csb_gecmis.py` / `tuzla_gecmis.py` Tuzla geçmişi,
  `scripts/ekip_kasasi.js` ekip görünümü ad kasası.

### B6. Bekleyen işler (öncelik sırasıyla; ayrıntı `CLAUDE.md` → Bekleyen işler)
1. **COP31 (12 Kasım 2026, Stant 11, 11:00–11:30):** sunum (A1-2), stant filmi USB'de ve telefonda, el ilanı baskısı, konuşma kartı,
   masa karekod kartı, masada Atmotube/PurpleAir cihazı. Organizasyondan ekran çözünürlüğü ve USB/HDMI bilgisi alınacak.
   Atmotube PRO 2 / CO₂ ifadesi kullanıcının isteğiyle stant filminden, sunumdan (sürüm 25) ve konuşma kartından çıkarıldı (2 Kasım 2026;
   kural `CLAUDE.md`: tanıtımlarda Atmotube Pro 2'den ya da eklenecek CO₂'den söz edilmez). Karekod kartında geçmiyor. **El ilanının kaynağı
   kayıtlarda yok, denetlenemedi:** basmadan önce PDF'te "Atmotube PRO 2" ya da "CO₂" geçiyor mu bak; geçiyorsa yeniden üretilmeli.
   Filmdeki ziyaretçi konum işaretleri temsilîdir.
2. **Tuzla bölge istasyonu verisi yok (22 Ekim 2026 09:00'dan beri):** İBB ve ÇŞB yurt dışından gelen bağlantıyı engelliyor, sunucu yurt dışında.
   Uygulama "Veri alınamıyor" gösteriyor. Seçenekler: Türkiye'de sürekli açık bir bilgisayar ya da GTÜ sunucusunda küçük bir toplayıcı (gerçek zamanlı);
   WAQI istasyon @14848 (ücretsiz `WAQI_TOKEN`, birkaç saat gecikmeli, US AQI'den µg/m³'e çevrim tablosu doğrulanmamış). Kullanıcının kararı bekleniyor.
3. **Atmotube geçmiş doldurma ilerlemiyor:** `atmotube_backfill` 2 Kasım 13:52 UTC'de hâlâ 16 gün (ATP-1 1–15 Haziran, ATP-3 1 Haziran; son yazım 21 Ekim).
   Yakın günler arşive giriyor (ör. ATP-4 2 Kasım 200 kayıt). Tek-süreç düzeltmesi 2 Kasım 12:27 UTC'de (Türkiye 15:27) gönderildi; sonraki saatlerde artmalı.
   Kontrol: `select device, count(*), max(day) from atmotube_backfill group by 1;` — artmıyorsa Render → Logs'ta `[collector/atmotube_history]`
   satırlarına bak (büyük olasılıkla HTTP 429: yakın günler isteği sınırı doldurup eski günlere sıra gelmiyor).
4. **Atmotube PRO 2 (CO₂):** cihaz gelince (Kasım sonu) toplayıcıya CO₂ alanı eklenecek (`measurements.co2_ppm` var); `CO2_AKTIF` ayarı ve Tuya toplayıcısının donmuş değer sorunu.
5. **Sunucu güvenliği:** `/api/upload` korumasız (önce ekipte CSV yükleyen var mı sorulacak); `ADMIN_TOKEN` kontrolü;
   **Atmotube anahtarı:** 14 Ekim 2026'ya kadar hata metniyle herkese açık çıktıya yazılmış olabilir (artık maskeleniyor) → yenilenmesi önerilir,
   karar kullanıcının (yenilenirse Render → Environment → `ATMOTUBE_API_KEY`).
6. **PurpleAir arşivi:** 27–30 Nisan'daki 781 eski kaydın silinmesi kullanıcıda (Supabase SQL Editor; komut `scripts/purpleair_arsiv/BENIOKU.md`).
7. **Eski repo silme** (KVKK, kullanıcının onayıyla) ve `app.js` → `PEOPLE` anahtarlarının kaldırılması (onay bekliyor).
8. **Amfi 1 ders programı** 19 Ocak 2027'de bitiyor; bahar programı gelince `frontend_v2/data/amfi1_program.json`.
9. **Atmotube yan yana ölçüm** (5 cihaz SUMER çatısında PurpleAir yanında, ≥24 sa), **adsız 20 bina**, **PurpleAir kontrolleri**, **Tuzla PM₂.₅ geçmişi** (masaüstü).
10. **Tanıtım:** uzun 16:9 (YouTube) tanıtım videosu yeniden kaydedilmedi (`scripts/tanitim_video/`); airlab.gtu.edu.tr birim sayfasındaki
    uygulama bağlantısı https://gtuairlab.github.io olmalı (eski ilkerakmirza adresiyse güncellenmeli).

### B7. Son durum (2 Kasım 2026, devir anı)
- Sunucu ayakta; dış ve iç PurpleAir 2 dakikada bir veri gönderiyor (son kayıt 13:52 UTC); bildirimler çalışıyor (2 Kasım 09:28 UTC uyarı, 09:58 UTC düzelme gitti).
- Son commitler: `7930bec` arayüz denetimi kalan maddeler · `ae34631` sunucu tek zamanlayıcı + bağlantı zaman aşımı.
- Uygulama denetimi (Ajan 4) bulgularının tamamı giderildi; görünür eksik Tuzla (B6-2), arka planda Atmotube eski günler (B6-3).
