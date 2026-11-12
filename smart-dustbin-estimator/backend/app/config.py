import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
PROCESSED_DIR = BASE_DIR / "processed"
SAMPLE_DIR = BASE_DIR / "sample_images"
DB_PATH = BASE_DIR / "smart_dustbin.db"

# Ensure directories exist
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

# Application constants & defaults
DATABASE_URL = f"sqlite:///{DB_PATH.as_posix()}"

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Fill level thresholds
DEFAULT_EMPTY_PCT = 20.0
DEFAULT_LOW_PCT = 40.0
DEFAULT_MEDIUM_PCT = 60.0
DEFAULT_HIGH_PCT = 80.0
DEFAULT_CRITICAL_PCT = 90.0

# Sensor defaults
DEFAULT_BIN_DEPTH_CM = 100.0
DEFAULT_DEAD_ZONE_CM = 20.0
DEFAULT_WARN_THRESHOLD = 70.0
DEFAULT_CRITICAL_THRESHOLD = 90.0
DEFAULT_INTERVAL_MIN = 5

