"""Verify all required packages are installed."""
import importlib
import sys

packages = [
    ("aiosqlite", "aiosqlite"),
    ("sqlalchemy", "sqlalchemy"),
    ("alembic", "alembic"),
    ("fastapi", "fastapi"),
    ("uvicorn", "uvicorn"),
    ("pydantic", "pydantic"),
    ("pydantic_settings", "pydantic_settings"),
    ("jose", "python-jose"),
    ("passlib", "passlib"),
    ("multipart", "python-multipart"),
]

missing = []
for mod, pkg in packages:
    try:
        m = importlib.import_module(mod)
        ver = getattr(m, "__version__", "unknown")
        print(f"OK  {pkg:30s} {ver}")
    except ImportError:
        print(f"MISSING  {pkg}")
        missing.append(pkg)

# Also verify asyncpg is NOT installed
try:
    import asyncpg
    print(f"WARNING: asyncpg is still installed — should be removed")
except ImportError:
    print("OK  asyncpg is NOT installed (correct)")

try:
    import psycopg2
    print(f"WARNING: psycopg2 is still installed — should be removed")
except ImportError:
    print("OK  psycopg2 is NOT installed (correct)")

if missing:
    print(f"\nMISSING PACKAGES: {missing}")
    sys.exit(1)
else:
    print("\nAll required packages present.")
