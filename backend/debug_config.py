import traceback
import sys
sys.path.insert(0, ".")
try:
    from app.core.config import Settings
    s = Settings()
    print("CORS_ORIGINS:", s.CORS_ORIGINS)
    print("DATABASE_URL:", s.DATABASE_URL)
    print("OK")
except Exception:
    traceback.print_exc()
