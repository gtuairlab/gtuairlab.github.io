# Son kontrol · hafıza

## Kararlar
- **12 Ekim 2026, PurpleAir arşiv içe aktarımı:** veritabanı planı ONAY; commit 4 düzeltmeden sonra ONAY (hepsi yapıldı).
  Yakalanan kullanıcı kararı: silinecek 781 Nisan kaydındaki sıcaklık (33 saat) → kullanıcı "taşı" dedi; geri alma ölçütü buna göre
  `pm1_0 IS NULL` oldu. Geri alınamayan tek etki: id dizisi (~107 bin değer tüketilir), zararsız.
- Kontrol listesi: yedek → geri alma yolu → adımlar tekrar çalıştırılabilir ve < 60 sn → sayılar veri kontrolüyle aynı →
  belge iddiaları verilerle aynı → arayüz kalitesi bulguları kapalı → kullanıcı kararı gereken konular listelendi.
- **20 Ekim 2026, tanıtım videosu + Amfi 1 ders programı commit'i:** veritabanı adımı yok; commit 4 küçük düzeltmeyle ONAY (hepsi
  yapıldı), video ONAY. "Gerçek ölçüm" iddiası `anlik_mock.js` okunarak doğrulandı (sentetik veri yok). Dönem dışı ve tatil günlerinin
  hafta içi gündüz saatleri "boş derslik" sayılır; 19 Ocak 2027'den sonra program güncellenmeli.
- Ana ajanın yöntem seçimleri (ör. tam saat kuralı ile 30 dk örtüşme) her zaman "kullanıcı kararı" listesine yazılır.
- Takip edilmeyen yeni veri dosyaları commit'e eklenmezse uygulama sessizce yedek kurala düşer: `git status`'taki `??` satırlarını
  her seferinde kontrol et.

## Anlatım notu
`anlatim_notu.md`: projenin kısa anlatımı ve olası jüri soruları. PurpleAir sayıları Nisan adımı bitince geçerlidir.

- 21 Ekim 2026, telefon bildirimleri: ONAY (tablolar yalnızca CREATE IF NOT EXISTS + RLS; geri alma DROP TABLE). Yeni renk yerine `var(--red)`;
  Python `round()` yerine `int(x + 0.5)` (JS Math.round ile aynı HKİ). Korumasız POST uçlarında alan adı beyaz listesi, kayıt üst sınırı
  ve IP başına sınır aranır. Zamanlanmış işler tek gunicorn işçisi varsayar (Render start komutunda `-w` olmamalı).
