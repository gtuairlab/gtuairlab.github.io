"""COP31 stant filmi · uydu dokusunun girdisini sunumdaki iki ekran görüntüsünden yeniden kurar (2 Kasım 2026).
Özgün girdi (uygulamanın Uydu katmanı, masaüstü 1920×922, 20 Ekim 2026) bulut ortamı sıfırlanınca silindi. Sunum
"GTU AirLab · COP31" (claude.ai/artifact/34tYuKM4XNMxG6st6egjWH) varlıklarında aynı ekranın iki kesiti duruyor:
  6dd5448755f54cda5c9280ce96dd6c27  1920×770 → ekran satırları 0–770
  32c2f54e37f20897afc39c40b93ee06c   960×780 → ekran x 560–1520, y 90–870 (SIFT kaydı: ölçek 1,0000, artık 0,03 px)
Ekranın kalan küçük kısmı ayna ile doldurulur; filmde görünmez (film.js → FOC). Çıktı harita_hazirla.py'nin girdisidir.
Kullanım: python3 ekran_birlestir.py <varlik_klasoru> <cikti.png>   (numpy, opencv-python-headless)"""
import sys
import cv2
import numpy as np

A, OUT = sys.argv[1], sys.argv[2]
def oku(ad):
    for uz in ("", ".jpg", ".png"):
        im = cv2.imread(f"{A}/{ad}{uz}")
        if im is not None:
            return im
    sys.exit(f"bulunamadı: {A}/{ad}")

big, zoom = oku("6dd5448755f54cda5c9280ce96dd6c27"), oku("32c2f54e37f20897afc39c40b93ee06c")
scr = np.zeros((922, 1920, 3), np.uint8)
scr[90:870, 560:1520] = zoom
scr[:770] = big
scr[870:922] = scr[869:817:-1]
scr[770:922, 1520:1920] = scr[770:922, 1519:1119:-1]
scr[770:922, :560] = scr[770:922, 1119:559:-1]
cv2.imwrite(OUT, scr)
print("yazıldı:", OUT)
