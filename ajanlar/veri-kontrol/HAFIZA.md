# Veri kontrolü · hafıza

## Kararlar ve bulgular
- **12 Ekim 2026, PurpleAir arşivi (27 Nis – 6 Eki, sensör 229263, 2 dk):** UYGUN. Sunucu kayıtlarının 3391'inden 3385'i arşivle
  aynı zaman damgalı, 3384'ü aynı değerli (fark ≤ 0,05 µg/m³; sunucu 2, arşiv 1 ondalık); 1 tutarsız kayıt (22 Haziran 11:50:28Z,
  B kanalı 9,0 / 8,3). Tamlık %94,4; 3718 saat; 153 tam gün (≥ 18 saat), 4 gösterge gün. Kesintiler iki kaynakta aynı
  (5–7 Temmuz, 3–5 Ekim: sensör kapalı). A/B denetimi: 134 iki dakikalık kayıt (%0,12), 5 saat; Mayıs başında B kanalı hafif yüksek.
  27 kısa ani yükselme, 24'ünde iki kanal uyumlu (gerçek olay; ayıklanmaz).
- Beklenen sayılar (içe aktarma): 781 Nisan kaydı değişir, 3341 kayda cf_1, 107 361 yeni kayıt; sonuçta 6 Ekim 21:00 UTC öncesi
  110 752 kayıt, 110 745'inde cf_1. Elle denetim (TR): 15 Mayıs 14:00 → 11,053; 1 Ağustos 08:00 → 7,370; 6 Mayıs 08:00 → 27,931 µg/m³.

- **13 Ekim 2026, Ajan 5 kampüs maruziyet raporu:** 8 kritik sayı bağımsız hesapla doğrulandı, hepsi tuttu (154 tam gün, 12,71;
  döngü 06:00 16,47 / 18:00 9,39; %5 eşiği 27,46; 8–12 Ekim 36,94; en kötü 60 dk ortanca 20,09; Kimya payı %87,8; tipik gün 7,04 / 12,34;
  CO₂ 2 798 donuk kayıt). `scratchpad/tanitim/veri/saatlik.json`'un son saati (12 Ekim 13:00 UTC) yarım: SQL'den yeniden al.
  Saha paydası: 4 015 nokta (12 oturum), PM₂.₅'i olan 4 008.
- 13 Ekim 2026 (rapor v1.2, saha karşılaştırması): yedi kritik madde bağımsız yeniden hesaplandı, hepsi TUTAR. Eşleme kuralları: Atmotube–PurpleAir ±3 dk, bina eşlemesi campus.geojson içi ya da ≤15 m (B'nin K_D'si 15 m sınırındaki tek kayda göre 1,12–1,13), %10 kırpma round(0,1·n).
- 20 Ekim 2026 (Amfi 1 iç PurpleAir, 228591): `purpleair_readings` tekil dizini yalnızca `recorded_at` → iç sensör ayrı tabloda
  (`purpleair_indoor_readings`). İç sensörde EPA düzeltmesi gösterimde notla; I/O, F_inf ve Atmotube oranları ham cf_1 ile (+5,75 ve nem
  terimi temiz saatlerde I/O'yu 0,50'den 0,90'a çıkarıyor; regresyon eğimi korunuyor). Dış referans (6–20 Ekim): saatlik cf_1 p10/p50/p90
  7,58/27,48/83,83; nem %57,5; |A−B| 1,50; cf_1 sıfırı 0; tamlık %89,3 (2 dk), %96,7 (saatlik). Kimya ve Çevre binası SUMER'e 141 m.
  Atmotube Pro = SPS30 (ikincil); beklenti Atmotube/ham PA ≈ 0,55–0,75, /EPA'lı ≈ 1; iç ortam yan yana çarpan üretmez.
- **Tanıtım videosu denetimi (20 Ekim 2026):** Özet 16,0 / HKİ 59, bugün 19,25 (17 saat), Amfi 1 15,35 / I/O 1,000, analiz
  15,30 / 16,22 / 0,967; ısı haritası 33,28 (n=4) / 4,34 (n=2) / 15,61 / 15,95; kampüs–Tuzla 16,163 / 18,709, −%13,6, 571 saat —
  hepsi bağımsız hesapla tuttu. Anlık görüntüde dış son ölçüm 13:20:26Z, ham dış 13:22:26Z, iç 13:24:21Z (fark ≤0,1 µg/m³).
- **Dış sensör B kanalı** 16–18 Ekim 2026'da ayrıştı: 2 dk düzeyinde 100 kayıt kuralı geçemiyor, saatlik kural yalnızca 3 saati
  düşürüyor (izlenmeli). Son 30 günde tamlık %81,4 (kayıt), %85,4 (saat).
- **Maruziyet modeli:** P tüm dönemin saatlik profili (09–11 ≈ 13,2; 12–13 ≈ 12,2), o günün ölçümü değil; R(Güzide) = 2,00 (üst sınır),
  R(Kütüphane) ≈ 0,63, R(Kimya) ≈ 0,92. "Soludum" dili tahmin olduğunu belirtmeli.
- **Amfi 1 ısınma kuralı** ilk saat dilimini atlıyordu (fiilen 22 dk); düzeltildi (ilk kısmi saat + 1 saat): 20 Ekim I/O 0,99 (3 saat),
  iç/dış 14,8 / 15,5.
- **Amfi 1 ders saatleri** bölümün 2026-27 güz programından (`data/amfi1_program.json`). Ajan 1 ≥30 dk örtüşme önermişti; ana ajan
  tam saat kuralını seçti (ders başı/sonu yarım saatleri karışık). Sınıflar: ders / boş derslik / gece. PDF ve öğretim üyesi adları repoya girmez.
- Tuzla yorumunda "temiz/kirli" hükmü verilmez ("%x düşük/yüksek, ölçüm yöntemleri farklı"): fark (2,5 µg/m³) EPA düzeltmesinin
  hata payı (~3 µg/m³, ikincil) büyüklüğünde.

## Literatür durumu
- Barkjohn, Gantt, Clements (2021), *AMT* 14:4617–4637, doi:10.5194/amt-14-4617-2021: girdi cf_1 ve PurpleAir nemi, %90 günlük
  tamlık **birincil (özetten)**; katsayılar 0,524 / 0,0862 / 5,75 ve 5 µg/m³ + %70 kanal kuralı **ikincil** (tam metin bulut
  ortamından açılamadı).
- 18 saat (%75) günlük tamlık kuralı: 40 CFR 50 **Ek K** (PM₁₀). Ek N (PM₂.₅) için 18/24 ifadesi doğrulanmadı.
- Üretici arşivi ile canlı API kaydının eşdeğerliği için literatür kaynağı bulunamadı; veriyle gösterildi.
- Kaynak denetimi (13 Ekim 2026): Shittu 2025, Künsch 1989, Dons 2011 gerçek (Dons kara karbon içindir, PM₂.₅ diye anılmaz). Kitagawa 1955'in geçerli DOI'si yok; DOI yazma.
- Bu ortamda WebFetch/curl dış sitelere erişemiyor; iç ortam literatürü yalnızca arama özetlerinden (hepsi ikincil), tam metin masaüstünde.
- **İç ortam EPA literatürü (20 Ekim 2026):** Barkjohn 2021 dış ortam kolokasyonundan; EPA haritası yalnızca dış sensörleri kullanır;
  iç ortamda doğrulanmış düzeltme yok. Singer & Delp 2018 (2 kat içinde), Demanega 2021 (%50'ye kadar düşük), Park 2023 (1 µm üstü
  tutarsız), Bi 2021 ön baskı (kalibrasyon yok), Wallace & Ott 2023 (iki tarafa ALT-CF3). Hepsi ikincil. Karar: gösterimde EPA (iç
  nemle, notla), oranlarda ham ÷ ham; değişiklik yok. 20 Ekim iç EPA ÷ ham ortanca 0,612 (0,562–0,669; 211 kayıt); %39 nemde EPA = ham
  eşiği cf_1 ≈ 5; nem farkı 0,0862 µg/m³/puan (bugün ±0,85, kış +3,4–4,7). Couzo vd. 2024: PurpleAir nemi dışarıda −17,4 puan (ikincil).
  İsteğe bağlı (kullanıcı kararı): `pm2.5_alt` kaydı, iki PurpleAir'in 24–48 sa yan yana ölçümü. İlk Amfi 1 ders saatleri 21 Ekim 11, 14, 15.
- US EPA EFH 2011 Tablo 6-2 başlığı teyitli, değerleri ikincil. US EPA 2024 AQI "İyi" üst sınırı 9,0 µg/m³ (ikincil); HKİ tablosu 2012 EPA AQI ile aynı.

## Açık sorular
- Katsayıları masaüstü oturumunda makalenin tam metninden teyit et.

## Betikler
`betikler/`: `ortak.py` (yükleyiciler), `tahmin.py` (adım sayıları), `kalite.py` (uygunluk), `nokta.py` (elle denetim saatleri),
`gun.py` (günlük tamlık), `ek.py` (boşluklar, aykırılar), `bulanik.py` (1 s kayık kayıtlar), `dosya.py`.
Kullanım: `python3 -I <betik> <csv> [<veritabanı anlık görüntüsü>] <betik klasörü>`.
