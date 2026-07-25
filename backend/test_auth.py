"""
Quick smoke-test of the auth API.
Run while the backend server is running on port 8000.

    python test_auth.py

Tests:
  1. POST /api/v1/auth/register  → 201 + tokens
  2. POST /api/v1/auth/login     → 200 + tokens
  3. GET  /api/v1/users/me       → 200 + user profile (authenticated)
  4. POST /api/v1/auth/refresh   → 200 + new tokens
  5. GET  /api/v1/users/me       → 200 (with refreshed token)
  6. GET  /api/v1/users/me       → 401 (no token → protected route works)
"""
import json
import sys
import urllib.request
import urllib.error
import time

BASE = "http://localhost:8000/api/v1"
EMAIL = f"test_{int(time.time())}@example.com"
PASSWORD = "testpassword123"
FULL_NAME = "Test User"


def req(method, path, body=None, token=None):
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def check(label, status, data, expected_status):
    icon = "✅" if status == expected_status else "❌"
    print(f"{icon} [{status}] {label}")
    if status != expected_status:
        print(f"   Expected {expected_status}, got {status}")
        print(f"   Response: {json.dumps(data, indent=2)[:300]}")
    return status == expected_status


passed = 0
failed = 0

# 1. Register
status, data = req("POST", "/auth/register", {
    "email": EMAIL, "full_name": FULL_NAME, "password": PASSWORD
})
ok = check("Register new user", status, data, 201)
passed += ok; failed += (not ok)
access_token   = data.get("access_token", "")
refresh_token  = data.get("refresh_token", "")

# 2. Login
status, data = req("POST", "/auth/login", {"email": EMAIL, "password": PASSWORD})
ok = check("Login with credentials", status, data, 200)
passed += ok; failed += (not ok)
access_token  = data.get("access_token", access_token)
refresh_token = data.get("refresh_token", refresh_token)

# 3. Get profile (authenticated)
status, data = req("GET", "/users/me", token=access_token)
ok = check("GET /users/me (authenticated)", status, data, 200)
passed += ok; failed += (not ok)
if ok:
    print(f"   email={data.get('email')}  name={data.get('full_name')}")

# 4. Refresh token
status, data = req("POST", "/auth/refresh", {"refresh_token": refresh_token})
ok = check("Refresh access token", status, data, 200)
passed += ok; failed += (not ok)
new_access_token = data.get("access_token", access_token)

# 5. Profile with refreshed token
status, data = req("GET", "/users/me", token=new_access_token)
ok = check("GET /users/me (refreshed token)", status, data, 200)
passed += ok; failed += (not ok)

# 6. Protected route without token → must be 401/403
status, data = req("GET", "/users/me")
ok = check("GET /users/me (no token) → 401/403", status, data, 403)
if not ok and status == 401:
    ok = True  # either is acceptable
    print(f"   (Got 401 instead of 403 — both are correct)")
    failed -= 1; passed += 1

# 7. Wrong password → 401
status, data = req("POST", "/auth/login", {"email": EMAIL, "password": "wrongpassword"})
ok = check("Login with wrong password → 401", status, data, 401)
passed += ok; failed += (not ok)

print(f"\nResults: {passed} passed, {failed} failed")
sys.exit(0 if failed == 0 else 1)
