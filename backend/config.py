import os
from dotenv import load_dotenv

load_dotenv()

PURPLEAIR_API_KEY = os.getenv("PURPLEAIR_API_KEY", "")
PURPLEAIR_SENSOR_ID = int(os.getenv("PURPLEAIR_SENSOR_ID", "229263"))
PURPLEAIR_LAT = float(os.getenv("PURPLEAIR_LAT", "40.806155"))
PURPLEAIR_LON = float(os.getenv("PURPLEAIR_LON", "29.360985"))
# İkinci PurpleAir: Kimya ve Çevre Müh. binası Amfi 1, İÇ ORTAM (20 Ekim 2026). Sensör numarası PurpleAir haritasındaki
# "select=" değeridir (Amfi 1: 228591); ortam değişkeninde 0 verilirse iç sensör toplanmaz. Özel (private) kayıtlı sensör için okuma anahtarı yalnızca ortam değişkeninde.
PURPLEAIR_INDOOR_SENSOR_ID = int(os.getenv("PURPLEAIR_INDOOR_SENSOR_ID", "228591") or 0)
PURPLEAIR_INDOOR_READ_KEY = os.getenv("PURPLEAIR_INDOOR_READ_KEY", "")
PURPLEAIR_INDOOR_NAME = os.getenv("PURPLEAIR_INDOOR_NAME", "Amfi 1")

# Kampüs sınırı (kampus.py): herkese açık uçlarda bu alanın dışındaki konumlar gösterilmez
CAMPUS_LAT = float(os.getenv("CAMPUS_LAT", "40.8114"))
CAMPUS_LON = float(os.getenv("CAMPUS_LON", "29.3563"))
CAMPUS_RADIUS_KM = float(os.getenv("CAMPUS_RADIUS_KM", "2.0"))

DATABASE_URL = os.getenv("DATABASE_URL", "")
SQLITE_PATH = os.getenv("SQLITE_PATH", "campus_air.db")

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "changeme")

POLL_INTERVAL_MINUTES = int(os.getenv("POLL_INTERVAL_MINUTES", "2"))

# CORS origins for the frontend
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
