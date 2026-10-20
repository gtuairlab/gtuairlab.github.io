# Arayüz kalitesi · hafıza

## Test düzeneği
- `test/mock.js`: Render API taklidi (27 Nisan'dan bugüne saatlik PurpleAir; PM₁₀/sıcaklık yalnızca seyrek saatlerde; canlı kayıt cf_1'li;
  bir saha oturumu). `test/run.js`: masaüstü ve telefonda Özet, Sağlık, Araştırma, oynatma; konsol hatası ve "NaN/undefined/null" taraması.
  `test/shot2.js`: ayrıntı ekran görüntüleri. Sunucu: `python3 -m http.server 8791 --directory frontend_v2`.
  Çıktı `OUT_DIR` (yoksa geçici klasör); repoya yazılmaz. Playwright yolu `PLAYWRIGHT_MODULE` ile değiştirilebilir.
- Bulut oturumu onrender.com'a ve harita karolarına ulaşamaz; karo hataları beklenen, gerçek veri denemesi masaüstü oturumunda.

## Geçmiş bulgular (12 Ekim 2026, hepsi kapatıldı)
- Sağlık: PM₁₀ ortalaması birkaç güne dayandığı hâlde dönem ortalaması gibi görünüyordu.
- Özet: "%0 daha temiz" ve "benzer (fark %5)" çelişkisi.
- Oynatma: PM₁₀/sıcaklık "--"ye düşüp titriyordu.
- PM₁₀ kutusunda birimsiz "günlük 45 aşılan" ve "(≥6 saat)" teknik ifadesi.

## Tanıtım videosu denetimi (20 Ekim 2026)
- Altyazı sürelerini üst banttaki piksel değişiminden ölç (10 kare/sn); ölçüt ~3 kelime/sn; altyazısız boşlukları ayrıca listele.
- Kayıt betiğindeki kamera yakınlaştırması (`zoomTo`) tam genişlikteki içeriği kenarlardan kırpar; yerine vurgu halkası (`highlight`).
- Telefonda 1 CSS px ≈ 0,72 pt (540 px çizim); 12 px açıklama okunmaz. Kısa sürüm artık uygulamayı 468 px çizip 1,154 kat büyütüyor.
- LinkedIn'in 4:5 orta kırpma riski (doğrulanmadı): başlık ve açıklama y 142–818 (540×960 ölçeği) içinde kalmalı; ilk kare siyah olmamalı.
- Videoda yakalanıp düzeltilen uygulama hataları: ısı haritası lejantı tersti (trend.js); kampüs–Tuzla grafiği takvim ekseninde değildi;
  yolculuk haritasında yüzde etiketleri çakışıyordu ve karo yokken harita boştu (maruziyet.js, soluk bina katmanı eklendi).

## İzlenecekler
- Araştırma'daki "PurpleAir aynı anda Δ" ham Atmotube ile düzeltilmiş PurpleAir'i karşılaştırıyor (grafik ikisini de ham kullanıyor); karar bekliyor.
