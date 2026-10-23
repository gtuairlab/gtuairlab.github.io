# Ajan 6 · Animasyon — hafıza

## Görev ve tarihçe
- 22 Ekim 2026: kullanıcının isteğiyle kuruldu. İlk iş: COP31 sunumundaki iki 3B "ziyaretçi" animasyonu
  (Ziyaretçi A: 2 saat, kirli noktalar; Ziyaretçi B: 8 saat, temiz noktalar). Kullanıcı 3B ve gerçeğe yakın istiyor;
  "3B tam anlaşılmıyor" geri bildirimi üzerine zemin kirlilik rengi, sensör etiketleri ve solunum partikülleri eklendi.
- Sunum: Slides artifact'i (ana ajan yayımlar). Slaytlar `visitorA`, `visitorB`; embed 1664×700, slaytta left 128 / top 250.

## Sunum aracı sınırları (x-embed)
- Ağ yok: dış görsel, yazı tipi, kütüphane yüklenmez; her şey canvas + düz JS. Yazı tipi: Helvetica, Arial.
- Boyut ≤ 16 KB (yap.py denetler). Yazılar ≥ 24 px. PDF/PPTX dışa aktarımında durağan kare olur.

## Sayılar (değiştirme; kaynak: uygulamanın maruziyet modeli, `frontend_v2/js/maruziyet.js`)
- Model: C = P(saat) × R(bina) × F(ortam); doz = C × solunum hızı × süre. P: kampüs saatlik profili (anlık görüntü, 20 Ekim 2026).
- F: açık hava 1,0; kapalı pencere 0,5. Solunum: oturma 0,25; tempolu yürüme 1,56 m³/sa (US EPA 2011).
- R (saha verisi, n): Güzide Kafe 2,0 (122), Kongre ve Kültür Merkezi 1,40 (49), Kimya ve Çevre Müh. 0,92 (3959), Kütüphane 0,62 (135).
- A (07:00–09:00): yürüyüş 16,0 µg/m³ → 12,46 µg; kafe terası 30,9 → 7,73; yol boyu yürüyüş 20,9 → 16,31; **toplam 36,5 µg / 2 sa**.
- B (10:00–18:00): kütüphane 3,9 → 1,97; bölüm binası 5,3 → 5,94; akşamüstü yürüyüş 9,7 → 7,53; kütüphane 2,9 → 0,73;
  **toplam 16,2 µg / 8 sa**. Oran 2,3.
- Zamanlama slaytı (ayrı): aynı 1 saatlik yürüyüş 06–09 → 22,9 µg, 16–19 → 14,1 µg (−%38), rapor 13 Ekim `sayilar.json` F.

## Kurallar
- Sunum videoları (23 Ekim 2026'dan beri) gerçek kampüs yerleşimi üzerindedir: gerçek kampüs, temsilî ziyaretçi, temsilî kirlilik zemini,
  bina yükseklikleri varsayım (dikey ×2). Slayt altı: "Real campus layout (imagery © Esri, Maxar; building heights assumed). Illustrative visitor, modelled dose…".
  Eski izometrik embed motoru (`iso_engine.js`) temsilî sahnedir; yedek olarak durur.
- Sensör renkleri: PurpleAir mor (#6A3FB5 / #B79BFF), Atmotube koyu cihaz + beyaz halka. Ziyaretçi A turuncu #F0883E, B mavi #5B8CFF.
- Zemin rengi: yeşil → sarı → turuncu → kırmızı (HKİ sınıf renklerine yakın), sağ panelde açıklaması var.

## Turlar
- 22 Ekim 2026, 1. tur: açılış ipucu, takip eden hafif yakınlaşma (en çok %12), ortam gölgesi ve kaldırım, derişim renkli iz,
  PurpleAir çizimi ve "measures every 2 min", Atmotube yakın plan balonu, içerideyken saydam bina ve "visitor inside" etiketi,
  doz hızına bağlı nefes taneleri. Embed A 13 963, B 14 133 bayt. Ana ajan onayladı ve sunuma yükledi.

## Teknik notlar
- Etiketler ekran uzayında çizilir (`pill` → `R` listesi); balon `R` ile çakışmayan ilk konumu seçer ve orada kalmaya çalışır;
  ziyaretçinin üstüne binen etiket %35 saydam olur. Yeni etiketi `pill` ile ekle.
- `sahneler.json`'da yalnızca `path` ve `at` görseldir; içerideki `at` bina içinde, kapıya yakın; yürüyüş yolu oradan başlar.
  A yaya olarak kaldırımda yürür (b ≈ 9,3). İç ortam PurpleAir'i Chem'in sağ cephesinde (ön cephede içerideki ziyaretçiyi örter).
- Kare denetimi: `kare.js`'e ek olarak saniyede bir kare alan yoğun yakalama + kontakt sayfası (geçici klasörde) çakışma ve zıplamaları yakalar.
- Açık (isteğe bağlı): B 12:00'de kütüphaneden Chem'e sıçrar; arada yürüyüş eklemek dozu böler (onay gerekir).

## Gerçek kampüs videoları (22–23 Ekim 2026, 2. iş)
- Kullanıcı: "kampüs haritasını kullan, birebir gerçekçi olsun". Embed yerine VIDEO (1664×700, 30 fps, H.264): `harita_hazirla.py`,
  `harita3b.html`, `harita_rotalar.json`, `kayit.js`. Çıktı geçici klasörde; uydu görüntüsü ve video repoya girmez.
- Eşleme: 2,557 m/piksel, 8 etiket noktasında RMS 5,5 px (~14 m); Personel Yemekhanesi (55 px) ve Elektronik/İnşaat (21 px) etiketleri
  aykırı (etiket yerleşimi). Bina yükseklikleri varsayım (varsayılan 12 m), dikey abartma ×2.
- Güzergâh uzunlukları: A yürüyüş 1 ≈1,30 km, A yürüyüş 2 ≈1,49 km (Kuzey Girişi → Ana Kapı → doğu yolu → Kongre), B yürüyüşü ≈1,17 km;
  her biri 30 dk dilimine göre kısa (5 km/sa ile 14–18 dk). Sayılar değişmedi.
- Etiket kararları (ana ajan, 2. bağımsız kontrol): Atmotube ziyaretçinin üzerinde GÖSTERİLMEZ (doz model); rozet "Atmotube / wearable",
  lejant "● Atmotube: wearable (field sessions)", "Ground & path color" (Amerikan yazımı), "dawn" yerine "early morning",
  sürekli uyarı "Illustrative scenario · modelled dose, not a measured person", panelde "Elapsed", B sonuç kartı
  "2 hours in the wrong places > 8 hours in the right places". B'nin iç ortam durağı: "bir bölüm binasındaki amfi".
- iso_engine.js (embed) da aynı etiketlere çekildi; Atmotube kişinin üstünden ve bağlantı çizgisi kaldırıldı (A 13 623, B 13 793 bayt).
- 23 Ekim, 2. tur (ana ajan + bağımsız denetçi): A'ya 08:00 sabah özeti bildirimi ("Good morning · Campus air: Moderate (AQI 58)",
  PM₂.₅ 15,4 = kafe dilimi 07:30–08:30 profil ortalaması = kafe 30,9 / R 2,0; gerçek 08:00 bildirimi 07:30–08:00 ortalamasını kullanırdı: P(07) 16,0 → HKİ 59, sınıf aynı) ve kafede "Campus sensor: 15.4 · at this café terrace: 30.9 µg/m³"; AQI > 100 uyarısı
  gösterilmez (senaryoda hava Orta). "Main road" → "Road traffic" (yol D-100/TEM değil, kampüsün doğusundaki yerel yol).
  Atmotube: hareketli rozet kaldırıldı; Güzide/Kongre (A) ve Kütüphane/Kimya ve Çevre (B) üzerinde sabit işaret + tek "Atmotube field data".
  Döngü geçişi yok, sonuç kartı ≥ 5 sn; zemin lejantı "ground shading: illustrative"; panel metinleri "Busy café terrace",
  "Walk to the Congress Center"; Amerikan yazımı (modeled, Center). A kafe durağı kafenin kuzey tarafına alındı (işaretle çakışmasın).
  Videolar: A 18,5 sn 6,34 MB, B 18,3 sn 4,53 MB (CRF 19).
- 23 Ekim, 3. tur (kullanıcı: "çok hızlı", "net notlar", "bildirimi uygulama gönderiyormuş gibi"): A 34,5 sn, B 34 sn; açılış genel
  planı 3 sn; altyazı çubuğu (beyaz, ≥ 30 px, tek satır, 2,6–3,5 sn, saate bağlı); telefon (380×530) sol altta yükselir: A'da 08:00
  push (kilit ekranı "Tuesday, 20 October 08:00", kart + sarsıntı, etiket "GTU AirLab app · push notification"), iki videonun sonunda
  maruziyet asistanı ("Your day 36.5 µg / 16.2 µg · 2.0 h / 8.0 h · largest share: walk to the Congress Center / late-afternoon walk").
  Not: uygulamanın kendisi asistanda µg'yi tam sayıya yuvarlar (36 / 16, `maruziyet.js` f0); videoda deste ile tutarlı 36.5 / 16.2.
- 23 Ekim, 4. tur (bağımsız denetçi): altyazı ziyaretçiyi örtecekse ya da telefonun yanına 30 px'te sığmıyorsa haritanın üstüne çıkar;
  telefon etiketi telefonun hemen üstünde; sonda kamera sağa kayar (telefon ziyaretçiyi/işaretleri örtmesin); bildirim 8,5 sn
  (A kafe 12 sn, A ≈ 38,5 sn), "US EPA-corrected" bölünmez (bölünmez boşluk); kilit ekranı saati sahne saatini izler;
  B yürüyüş altyazısı "…, in the cleaner hours" (16:00 en temiz saat değil, 3. en düşük).
