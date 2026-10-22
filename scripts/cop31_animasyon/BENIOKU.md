# COP31 sunumu · 3B ziyaretçi animasyonları

İki izometrik (3B) kampüs sahnesi: **Ziyaretçi A** 2 saat kirli noktalarda (36,5 µg), **Ziyaretçi B** 8 saat temiz noktalarda (16,2 µg).
Sayılar uygulamanın maruziyet modelinden; kaynak ve hesap `ajanlar/animasyon/HAFIZA.md`. Sorumlu: Ajan 6 (`.claude/agents/animasyon.md`).

| Dosya | İçerik |
|---|---|
| `iso_engine.js` | Ortak çizim motoru (canvas): sahne, binalar, trafik, partikül pusu, zemin kirlilik rengi, sensörler, ziyaretçi, panel |
| `sahneler.json` | A ve B senaryoları: zaman dilimleri, yol, derişim, doz, etiketler |
| `yap.py` | İkisini birleştirip `cikti/embed_A.html`, `embed_B.html` üretir; 16 KB sınırını denetler |
| `kare.js` | Test kareleri alır (Playwright); çıktıyı repoya değil geçici klasöre yazın |

```bash
python3 scripts/cop31_animasyon/yap.py
NODE_PATH=/opt/node-tools/node_modules node scripts/cop31_animasyon/kare.js /tmp/kareler
```

Sunuma yükleme ana ajanın işidir: `cikti/embed_X.html` içeriği slayt `visitorX`'teki `<x-embed>` içine konur ve yayımlanır.
