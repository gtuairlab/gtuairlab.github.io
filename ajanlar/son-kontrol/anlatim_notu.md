# GTÜ AirLab: kısa anlatım notu (PurpleAir geçmişi, 12 Ekim 2026)

> Durum: içe aktarmanın 27–30 Nisan adımı tamamlanınca aşağıdaki sayılar kesinleşir (`scripts/purpleair_arsiv/BENIOKU.md`).

## Proje ne ölçüyor?
GTÜ kampüsünde dış ortam havasındaki ince partikül maddeyi (PM₂.₅, µg/m³) sürekli izliyoruz; ayrıca PM₁₀, sıcaklık, nem ve
taşınabilir cihazlarla kısa saha ölçümleri var. 20 Ekim 2026'dan beri Amfi 1'de (Kimya ve Çevre Müh. binası) iç ortam PurpleAir'i
de var; derslik havası dış sensörle aynı saatlerde karşılaştırılıyor. CO₂ ölçümü şimdilik kapalı. Sonuçlar herkese açık bir
uygulamada Ulusal Hava Kalitesi İndeksi (HKİ) sınıflarıyla ve WHO 2021 kılavuz değerleriyle karşılaştırılarak gösteriliyor.

## Veri kaynakları
- **PurpleAir PA-II** (SUMER çatısı, sensör 229263): kampüsün sabit dış ortam sensörü. Sunucumuz 2 dakikada bir okur.
- **PurpleAir PA-II, iç ortam** (Amfi 1, sensör 228591): 20 Ekim 2026'dan beri, 2 dakikada bir.
- **Tuzla istasyonu** (İBB / ÇŞB, ~6,4 km): bölge karşılaştırması için resmî istasyon.
- **Atmotube** taşınabilir cihazlar: saha yürüyüşleri (düzeltilmeden, göreli kullanılır).

## İç ortam ölçümü (3 cümlede)
1. İç/dış oranı, aynı saatlerin ham (CF=1) ortalamalarının oranıdır; EPA düzeltmesindeki sabit terim temiz saatlerde oranı yapay
   olarak 1'e yaklaştırdığı için oran ham değerle hesaplanır (ör. %50 nemde ham 10/20 = 0,50 iken EPA'lı oran 0,56).
2. Saatler bölümün güz ders programına göre üçe ayrılır: ders (en az 30 dakikası derse denk gelen saatler, haftada 33), boş derslik (hafta içi
   08–18'de programda ders olmayan saatler) ve gece (23–05); gece oranı dış havanın içeri sızma oranına yaklaşır.
3. Kurulumdan sonraki ilk saat (ısınma, kurulum tozu) analize girmez; ilk günde oran yaklaşık 1'dir (0,99, boş derslik saatleri).

## PurpleAir neden ve nasıl düzeltiliyor? (3 cümlede)
1. Düşük maliyetli optik sensörler PM₂.₅'i resmî cihazlara göre yüksek okur ve nemden etkilenir; ABD genelinde fark yaklaşık %40'tır.
2. Bu yüzden ABD Çevre Koruma Ajansı'nın (US EPA) yaklaşık 12 000 eş zamanlı ölçümle geliştirdiği denklemi, yayımlandığı
   girdiyle aynen uyguluyoruz: **PM₂.₅ = 0,524 × cf_1 − 0,0862 × nem + 5,75** (Barkjohn vd., 2021, *AMT* 14:4617).
3. Yeni formül türetmedik; PurpleAir haritasındaki "US EPA" değeri de aynı denklemle hesaplanır, yani sonucu herkes bağımsız
   olarak karşılaştırabilir. Ayrıca sensörün iki kanalı (A ve B) birbirinden çok farklıysa o ölçüm kullanılmaz.

## Bu içe aktarma ne yaptı, neden?
- Denklemin girdisi olan **cf_1** değerini sunucumuz yalnızca 12 Ekim 2026'dan beri kaydediyordu. Ayrıca ücretsiz sunucu
  zaman zaman uyuduğu için 27 Nisan – 6 Ekim arasında ölçümlerin çoğu veritabanına hiç yazılmamıştı (o dönemde yalnızca
  ~3 400 kayıt vardı).
- PurpleAir'in **kendi veri arşivinden** (Data Download Tool) aynı sensörün o dönemdeki 2 dakikalık kayıtlarını (110 752 satır)
  indirdik. Arşiv ile bizim kayıtlarımız örtüşen zamanlarda neredeyse birebir aynı: 3 391 kaydın 3 385'i aynı saniyede,
  bunların 3 384'ü aynı değerde.
- Kurallar sade: aynı zaman ve aynı değer → mevcut kayda cf_1 eklendi (3 341); ±60 saniye içinde hiç kayıt yok → arşiv satırı
  yeni kayıt olarak eklendi (107 361); kayıt varsa bizimki korundu. 15 Haziran'da başka yoldan aktarılmış 781 Nisan kaydı
  önce yedek tabloya alındı, sonra arşivin daha ayrıntılı kayıtlarıyla değiştirildi. Her adımın geri alma yolu var.
- **Sonuç:** O dönem için 110 752 kayıt, 110 745'inde cf_1 var; 3 718 saat, 153 tam gün (≥ 18 saat). Böylece geçmişin tamamı
  tek ve yayımlanmış yöntemle hesaplanıyor; aylık ve WHO karşılaştırmaları artık birkaç gün yerine bütün döneme dayanıyor.

## Sınırlılıklar
- Denklem ABD verisiyle geliştirildi; Türkiye'de resmî bir cihazın yanında (kolokasyon) doğrulanmadı.
- Arşivde PM₁₀ ve sıcaklık yok: bu dönemde PM₁₀ yalnızca sunucunun canlı kaydettiği az sayıda günden geliyor ve uygulama
  bunu "yetersiz PM₁₀ verisi" diye açıkça yazıyor. PM₁₀ ve Atmotube değerleri düzeltilmez.
- Sensör 5–7 Temmuz ve 3–5 Ekim'de kapalıydı; bu günler boş kalır. Çöl tozu günlerinde PM₂.₅ olduğundan düşük görünebilir.
- 7 kayıtta cf_1 yok (6'sı arşivle 1 saniye kayık, 1'inde iki kaynak farklı); bunlar EPA'nın yedek biçimiyle hesaplanır.
- EPA denklemi iç ortamda doğrulanmadı; ders programı gerçek doluluğu göstermez (iptal, sınav, katılım); anlamlı bir ders/gece
  karşılaştırması için en az 2 hafta veri gerekir. İki PurpleAir henüz yan yana konmadı.
- Tuzla istasyonu 6,4 km uzakta ve ölçüm yöntemi farklı; aradaki fark EPA düzeltmesinin hata payı büyüklüğünde, bu yüzden
  "temiz/kirli" hükmü verilmez. Kişisel maruziyet hesabı o günün ölçümünü değil, tüm dönemin saatlik profilini kullanır.

## Jüri / hakemden beklenen 5 soru
1. **"Neden ham sensör değerini göstermiyorsunuz?"** Ham değer resmî cihazlara göre sistematik olarak yüksek; EPA düzeltmesi
   bu sapmayı gideren, yaygın kabul görmüş yöntem. Ham değer veritabanında duruyor ve ekranda ikincil olarak gösteriliyor.
2. **"ABD'de geliştirilmiş bir denklem burada geçerli mi?"** Kesin olarak bilmiyoruz; bu bir sınırlılık. Yöntem yayımlanmış
   ve PurpleAir haritasının "US EPA" değeriyle aynı, yani bağımsız olarak denetlenebilir. Yerel doğrulama için sensörü birkaç
   hafta resmî bir istasyonun yanına koymak (kolokasyon) planlanıyor.
3. **"Sonradan veri eklemek sonuçları değiştirmek değil mi?"** Eklenen veri aynı sensörün üreticideki kaydı; örtüşen
   kayıtların %99,8'i bizimkiyle aynı. Hiçbir değer düzeltilmedi ya da elenmedi; mevcut kayıtlar korundu, değiştirilen
   781 kayıt yedekte duruyor.
4. **"Günlük ortalama için kaç saat yeterli?"** En az 18 saat (%75 tamlık; ABD mevzuatı 40 CFR Part 50'deki yaygın kural) tam gün;
   6–17 saat ölçülen günler "gösterge gün" olarak ayrıca işaretlenir. Dönemde 153 tam, 4 gösterge gün var.
5. **"Ani yükselmeleri neden ayıklamadınız?"** İki kanalın birlikte gördüğü kısa yükselmeler (ör. yakında sigara, egzoz)
   gerçek maruziyet olabilir; yalnızca iki kanalın uyuşmadığı ölçümler (%0,12) dışarıda kalır.

## Ek sorular (20 Ekim 2026, tanıtım videosu ve iç ortam)
6. **"Kampüs Tuzla'dan daha mı temiz?"** Son 30 günde kampüs ortalaması %14 düşük (16,2 / 18,7 µg/m³); yöntemler ve konum farklı,
   fark hata payı büyüklüğünde, hüküm vermiyoruz.
7. **"Ders saatini nasıl belirlediniz?"** Bölümün yayımlanmış güz programından; saatlik ortalamada en az 30 dakikası derse denk
   gelen saat ders sayılır (haftada 33 saat).
8. **"İç/dış oranını neden ham değerle hesaplıyorsunuz?"** Düzeltmenin sabit terimi oranı bozar (%50 nemde ham 10/20 = 0,50 iken
   EPA'lı 0,56).
9. **"Videodaki veriler gerçek mi?"** Evet: 20 Ekim 2026 16:25 itibarıyla veritabanındaki ölçümler; bulut ortamı sunucuya
   erişemediği için yanıtlar bu anlık görüntüden verildi. Ad ya da kampüs dışı konum yok.
10. **"Kişisel maruziyet ne kadar güvenilir?"** Bir tahmindir: derişim × bina ve ortam katsayıları × solunum hızı (US EPA 2011)
    × süre; kişisel ölçüm değildir, girilen bilgiler cihazdan çıkmaz.
