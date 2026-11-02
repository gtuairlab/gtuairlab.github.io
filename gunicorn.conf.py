# Sunucu ayarı: gunicorn bu dosyayı başlangıç klasöründen kendiliğinden okur (Render: gunicorn --chdir backend app:app).
# Tek süreç + iş parçacıkları: zamanlayıcı (veri toplama, bildirimler) tek kopya çalışır; uzun bir istek süreci
# öldürtmez, diğer istekleri de bekletmez (2 Kasım 2026: birden çok işçi her işi iki kez yapıyordu).
workers = 1
worker_class = "gthread"
threads = 8
timeout = 120
