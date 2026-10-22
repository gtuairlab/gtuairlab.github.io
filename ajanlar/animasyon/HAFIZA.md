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
- Sahnedeki bina adları temsilî (Library, Café, Congress Centre, Chem. & Env. Eng., SUMER); gerçek yerleşim değildir, slayt altında yazar.
- Sensör renkleri: PurpleAir mor (#6A3FB5 / #B79BFF), Atmotube koyu cihaz + beyaz halka. Ziyaretçi A turuncu #F0883E, B mavi #5B8CFF.
- Zemin rengi: yeşil → sarı → turuncu → kırmızı (HKİ sınıf renklerine yakın), sağ panelde açıklaması var.
