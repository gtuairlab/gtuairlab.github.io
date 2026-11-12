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
- 26 Ekim, 5. tur ("takılıyor, binalar karışık"): eski motorda etiketler her karede yer değiştiriyordu (A 317 sıçrama, en büyük 345 px),
  B 12:00 ziyaretçi 417 px ışınlanıyordu, kamera ivme sıçraması 9–14 px/kare, anahtar kare 8,3 sn. Yeni `harita_dogal.html` (sabit çapalı
  etiketler, önceden hesaplı yay kamerası, sönüp yanan geçiş, 3–4 vurgulu bina ×1, -g 30). Açık: 12,3 / 9,4 MB; CRF 26 ile ≈ 8,6 MB.
- 12 Kasım 2026, 7. tur (ana ajan; COP31 YÖK şablonu): videolar masaüstünde yeniden kaydedildi (`uydu_yakala.py`, `kayit_yerel.py`;
  Edge + imageio-ffmpeg). Bugünkü uygulamada canlı Atmotube işareti ("ATP-2") ve yakınlaştırma düğmeleri dokuya karışıyordu → yakalamada
  arayüz ve işaretler gizlenir. Kontrol noktaları canlı Leaflet haritasından (çerçeve 20 Ekim'le aynı: zoom 15,5). Yazım BM/COP standardına
  (Oxford) çekildi: Centre, modelled, colour (23 Ekim'deki Amerikan yazımı kararı, YÖK/COP31 şablonlu sunumla tutarlılık için değişti).
  Sayılar değişmedi (36,5 / 16,2 µg; oran 2,3). Sunum: `Desktop\COP31\COP31_GTU_AirLab_Presentation.pptx`, slayt 10–11.
- 12 Kasım 2026, stant filmi yeni sürüm (ana ajan; `scripts/cop31_stant/`): 2:21 dikişsiz döngü, kurgu GTÜ'nün COP31 Instagram tanıtımını izler
  (soru → 1 ölçüm ve model → 2 tahmin, geliştiriliyor → 3 paylaşım → kapanış). İki bağımsız denetim (yabancı akademisyen, stant yöneticisi), iki tur:
  COP31/YÖK/GTÜ logoları yalnızca açılış ve kapanışta (YÖK şablonundaki gibi, sorumluluk metniyle); köşede kalıcı COP31 rozeti YOK
  (resmî onay izlenimi) → yerine adım şeridi "GTU AirLab · Stand 11 | 1 Measure & model · 2 Predict · 3 Share". "38% less" her yerde
  "modelled"; ziyaretçi sonucu "2.3×"; iklim cümlesi soru ve tahmin sahnelerinde; "Türkiye national AQI"; karekod kısa adres
  https://gtuairlab.github.io/ (M, sürüm 3) ve "Turkish interface" uyarısı. Video H.264 High 4.1, 4 ref, TV aralığı, BT.709; ayrıca 10× art arda dosya.
- 12 Kasım 2026, stant filmi 9. tur (kullanıcı: "karekod bazen görseli kapatıyor", "Atmotube haritası çok çorak"): harita sahnesinin
  dokusu artık `harita_yakala.py` ile uygulamanın kendi görünümünden (Esri uydu + kampüs katmanı: binalar, yeşil alan, yol; zoom 17,
  aynı kadraj ve doku koordinatları). Eski kesit, 3B videolar için binaları silinmiş ve 3× büyütülmüş dokudan geliyordu (bulanık, binasız).
  Kaynak satırı: "Imagery © Esri, Maxar · building outlines: GTU AirLab app". Karekod rozeti (x 1636–1884, y 20–326) için güvenli alan:
  harita sahnesindeki telefon aşağı (top 362, 314×680), ziyaretçi saatleri başlığın yanına, tahmin kartları ve çizgisi y 372, paylaşım
  sahnesindeki özellik listesi y 352'den. Denetim: karekod altında kalan öğeleri tüm filmde 0,25 sn aralıkla tarayan betik (DOM kutuları).
  Aynı gün denetim (akademisyen: değişikliklerle kabul; stant yöneticisi: değişikliklerle hazır; karekod hiçbir şeyi örtmüyor) → uygulananlar:
  karekod "HTTPS://GTUAIRLAB.GITHUB.IO/" (büyük harf → alfanümerik, sürüm 2, Q, sessiz bölge 2: modüller ≈ %30 iri; 2 m'den okunması
  için gerçek TV'de 2–3 telefonla denenmeli, tezgâha A5 karekod); uygulama ekranı alt yazısı "captured {{EKRAN_TARIHI}}" (varlik_hazirla.py
  yakalama gününü yazar; eskiden yanlışlıkla "20 October" kalmıştı); Esri telifi güncel hâli "Esri, Vantor, Earthstar Geographics, GIS User
  Community" (Maxar → Vantor; uygulamanın kendi künyesi hâlâ "Esri, Maxar"); zamanlama sahnesi 14,7 / 9,0 µg/m³ = 107 hafta içi günün
  medyanı (lejant ve kaynak satırı); ATP-4/5 döngüleri kartın üstünde; cihaz etiketleri iç ortam karesinin üstünde; iç ortam işareti kimya
  binasının güney kanadında (avluda değil); veri paketleri r 5; tahmin sahnesi 13 sn (film 2:23); "reference only" görünür; başlıklar
  text-wrap:balance; telefon ekranları 40 px aşağı (çentik); adım şeridi koyu sahnede opak ve geçişin ortasında renk değiştirir.
  harita_yakala.py zoom 17,5 (zoom 18 karoları), bütün karolar inene kadar bekler, koyu alan > %1 ise hata verir.
- 12 Kasım 2026, 10. tur (kullanıcı: karekoda iletişim, poster/sunum bilgisi): iki denetçi de "tek karekod + kök adreste İngilizce COP31
  sayfası" önerdi (ikinci karekod ya da vCard karekodu TV'den 1–2 m'de okunmaz, ziyaretçiyi böler). Film etiketi "Scan: app & info /
  poster · slides · contact" (rozet 284 px), kapanış kartı aynı. Karekod içeriği değişmedi (kök adres). Kök `index.html` + `cop31/`
  (poster/sunum PDF, vCard, logo) hazırlandı; yayına alma (main) kullanıcının KVKK/Esri onayını bekliyor. Film 2:23, karekod 16. sn'den
  sonuna kadar her karede çözülüyor, %35 küçültmede de okunuyor.
- 13 Kasım 2026, son denetim (yabancı akademisyen, yerli akademisyen, sektör temsilcileri; üçü de "değişikliklerle hazır"):
  "2.3×" yalnızca uygulama modelinin sonucu (iç ortam payı iki kez düşülüyor: R × 0,5); ölçülen kişisel/çatı oranlarıyla A/B ≈ 1,2–1,5.
  Her üründe başlık "2 h in the wrong places can exceed 8 h in the right places", aralık kaynak satırında. Kafe katsayısı R = 2,0 model
  üst sınırı (G = 1,89'dan), kafe/çatı oranı değil (0,96). Özel işletme adı (Güzide) COP malzemelerinden çıkarıldı → "campus café"
  (animasyon etiketi dahil; iç anahtar "Güzide Kafe" campus.geojson için kaldı). "Türkiye national AQI" → "AQI (HKİ scale, indicative)"
  (resmî HKİ 24 sa ortalama ve çok kirleticili; PM₂.₅ kesimleri İBB/US EPA 2012 uyarlaması). Unvan her yerde "Asst. Prof. Dr.";
  destek "TÜBİTAK 1002-A (Rapid Support) and GTU Scientific Research Projects (BAP, GTU-105)" (kaynak: kullanıcının COP31 başvurusu).
  Konuşmacı notlarında "reference" kalmadı. Esri künyesi ziyaretçi videolarında harita sağ üst köşesinde.
