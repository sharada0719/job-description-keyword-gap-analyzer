"""Verify the SQLite database exists and all tables were created."""
import sqlite3
import os
import sys

db_path = "./jobgap.db"

if not os.path.exists(db_path):
    print(f"ERROR: Database file '{db_path}' not found!")
    sys.exit(1)

print(f"Database file exists: {db_path} ({os.path.getsize(db_path)} bytes)")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [row[0] for row in cursor.fetchall()]
print(f"\nTables found ({len(tables)}):")
for t in tables:
    cursor.execute(f"PRAGMA table_info({t})")
    cols = cursor.fetchall()
    print(f"  {t}: {len(cols)} columns")
    for col in cols:
        print(f"    [{col[1]}] {col[2]} {'NOT NULL' if col[3] else ''}")

expected = {"users", "resumes", "job_descriptions", "analyses", "alembic_version"}
actual = set(tables)
missing = expected - actual
if missing:
    print(f"\nMISSING TABLES: {missing}")
    sys.exit(1)
else:
    print(f"\nAll expected tables present.")

conn.close()
