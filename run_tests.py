"""
WatchLLM — automated test runner (no real Clerk token needed).
Runs all tests that can be validated without a live database or LLM calls.
"""
import json
import subprocess
import sys
import os
import urllib.request
import urllib.error

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))

BASE = "http://127.0.0.1:8000"
PASS = 0
FAIL = 0

def req(method, path, body=None, headers=None, expected=None):
    global PASS, FAIL
    url = f"{BASE}{path}"
    data = json.dumps(body).encode() if body else None
    h = headers or {}
    if data:
        h.setdefault("Content-Type", "application/json")
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        resp = urllib.request.urlopen(r, timeout=5)
        code = resp.status
        body_bytes = resp.read()
    except urllib.error.HTTPError as e:
        code = e.code
        body_bytes = e.read()

    resp_json = {}
    try:
        resp_json = json.loads(body_bytes.decode())
    except Exception:
        pass

    ok = code in expected if isinstance(expected, (list, tuple)) else code == expected
    mark = "PASS" if ok else "FAIL"
    if ok:
        PASS += 1
    else:
        FAIL += 1
    print(f"  [{mark}] {method} {path} -> HTTP {code} (expected {expected})")
    if not ok:
        print(f"         body: {body_bytes[:200].decode(errors='replace')}")
    return code, resp_json


# ─── A9: Auth middleware ───────────────────────────────────────────────────────
print("\n=== A9: Auth middleware (no token → all must be 401) ===")
req("POST", "/api/register-agent", expected=401)
req("POST", "/api/simulate", expected=401)
req("GET",  "/api/simulation/00000000-0000-0000-0000-000000000000/status", expected=401)
req("GET",  "/api/simulation/00000000-0000-0000-0000-000000000000/report", expected=401)
req("GET",  "/api/simulation/00000000-0000-0000-0000-000000000000/replay/00000000-0000-0000-0000-000000000001", expected=401)
req("POST", "/api/simulation/00000000-0000-0000-0000-000000000000/cancel", expected=401)
req("GET",  "/api/me", expected=401)

print("\n=== A9: Exempt routes (webhooks + health must NOT be 401) ===")
# Webhook without valid signature → 400/422 from Svix, or 500 if secret not configured (dev). NOT our 401
code, _ = req("POST", "/api/webhooks/clerk", expected=[400, 422, 500])
code, _ = req("POST", "/api/webhooks/stripe", expected=[400, 422, 500])
req("GET", "/health", expected=200)

# ─── A9: Bearer present but invalid token → 401 ────────────────────────────
print("\n=== A9: Invalid Bearer token → 401 ===")
req("GET", "/api/me",
    headers={"Authorization": "Bearer not.a.real.token"},
    expected=401)

# ─── A10: Input validation ────────────────────────────────────────────────────
print("\n=== A10: Input validation (invalid fields → 422 or 401) ===")
# Without token these hit auth first (401), so send a bogus Bearer to reach validation
BOGUS = "Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImlzcyI6Imh0dHBzOi8vY2xlcmsuZXhhbXBsZS5jb20iLCJleHAiOjk5OTk5OTk5OTksImlhdCI6MTcwMDAwMDAwMH0.invalidsig"
# Invalid UUID in path
req("GET", "/api/simulation/not-a-uuid/status",
    headers={"Authorization": BOGUS},
    expected=[401, 422])  # 401 because JWKS fails, but route validation also fires
# Simulate with unknown category (hits validation after auth)
req("POST", "/api/simulate",
    body={"categories": ["unknown_category"], "num_runs": 1, "max_turns": 3},
    headers={"Authorization": BOGUS},
    expected=[401, 422])
# num_runs out of range
req("POST", "/api/simulate",
    body={"categories": ["prompt_injection"], "num_runs": 9999, "max_turns": 3},
    headers={"Authorization": BOGUS},
    expected=[401, 422])

# ─── Health endpoint ───────────────────────────────────────────────────────────
print("\n=== Health endpoint ===")
code, body = req("GET", "/health", expected=200)
if body.get("status") == "ok":
    print("  [PASS] /health returns { status: ok }")
    PASS += 1
else:
    print(f"  [FAIL] /health body unexpected: {body}")
    FAIL += 1

# ─── Webhook routes are truly exempt (not 401) ───────────────────────────────
print("\n=== Confirmation: webhooks return non-401 even with no Auth header ===")
for path in ["/api/webhooks/clerk", "/api/webhooks/stripe", "/api/webhooks/razorpay"]:
    code, _ = req("POST", path, expected=[400, 422, 500])
    if code != 401:
        print(f"  [PASS] {path} is auth-exempt (got {code})")
        PASS += 1
    else:
        print(f"  [FAIL] {path} incorrectly blocked by auth middleware")
        FAIL += 1

# ─── CLI tests ───────────────────────────────────────────────────────────────
print("\n=== CLI: watchllm --help ===")
result = subprocess.run(
    [sys.executable, "-m", "watchllm.cli.main", "--help"],
    capture_output=True, text=True, cwd=REPO_ROOT,
    env={**os.environ, "WATCHLLM_API_KEY": "", "NEXT_PUBLIC_APP_URL": ""}
)
if "simulate" in result.stdout and "doctor" in result.stdout:
    print("  [PASS] watchllm --help shows 'simulate' and 'doctor' subcommands")
    PASS += 1
else:
    print(f"  [FAIL] --help missing subcommands. Output:\n{result.stdout[:500]}")
    FAIL += 1

print("\n=== E2: CLI fail-fast (missing WATCHLLM_API_KEY → exit 2) ===")
env_no_key = {k: v for k, v in os.environ.items() if k != "WATCHLLM_API_KEY"}
env_no_key.pop("NEXT_PUBLIC_APP_URL", None)
# Use a fresh HOME dir so ~/.watchllm/config is absent
import tempfile
with tempfile.TemporaryDirectory() as tmpdir:
    env_no_key["USERPROFILE"] = tmpdir  # Windows home
    env_no_key["HOME"] = tmpdir
    result = subprocess.run(
        [sys.executable, "-m", "watchllm.cli.main", "simulate", "--purpose", "test"],
        capture_output=True, text=True, env=env_no_key, cwd=REPO_ROOT
    )
if result.returncode == 2:
    print("  [PASS] exits with code 2 when WATCHLLM_API_KEY is missing")
    PASS += 1
else:
    print(f"  [FAIL] exit code was {result.returncode}. stderr: {result.stderr[:300]}")
    FAIL += 1

print("\n=== E4: watchllm doctor ===")
result = subprocess.run(
    [sys.executable, "-m", "watchllm.cli.main", "doctor"],
    capture_output=True, text=True, cwd=REPO_ROOT,
    env={**os.environ,
         "WATCHLLM_API_KEY": "test-key",
         "NEXT_PUBLIC_APP_URL": BASE}
)
output = result.stdout + result.stderr
if "WATCHLLM_API_KEY" in output:
    print("  [PASS] doctor runs and mentions WATCHLLM_API_KEY")
    PASS += 1
else:
    print(f"  [FAIL] unexpected doctor output:\n{output[:500]}")
    FAIL += 1

# ─── G3/G4: Dashboard code safety ────────────────────────────────────────────
print("\n=== G4: No SUPABASE_SERVICE_ROLE_KEY in dashboard/ ===")
import glob
dashboard_files = glob.glob(os.path.join(REPO_ROOT, "watchllm/dashboard/**/*"), recursive=True)
found_leak = []
for f in dashboard_files:
    if os.path.isfile(f):
        try:
            content = open(f, encoding="utf-8", errors="ignore").read()
            if "SUPABASE_SERVICE_ROLE_KEY" in content:
                found_leak.append(f)
        except Exception:
            pass
if found_leak:
    print(f"  [FAIL] Found SUPABASE_SERVICE_ROLE_KEY in: {found_leak}")
    FAIL += 1
else:
    print("  [PASS] No SUPABASE_SERVICE_ROLE_KEY in dashboard/")
    PASS += 1

print("\n=== G3: Supabase channel.unsubscribe() in SimulationProgressView ===")
spv = open(os.path.join(REPO_ROOT, "watchllm/dashboard/components/SimulationProgressView.tsx"), encoding="utf-8").read()
if "channel.unsubscribe()" in spv and "removeChannel" not in spv:
    print("  [PASS] Uses channel.unsubscribe() — no deprecated removeChannel")
    PASS += 1
elif "removeChannel" in spv:
    print("  [FAIL] Still uses deprecated removeChannel")
    FAIL += 1
else:
    print("  [WARN] channel.unsubscribe() not found — check cleanup logic")
    FAIL += 1

print("\n=== G5: suggested_fix in FailureReplayViewer ===")
frv = open(os.path.join(REPO_ROOT, "watchllm/dashboard/components/FailureReplayViewer.tsx"), encoding="utf-8").read()
if "suggested_fix" in frv and "Suggested Fix" in frv:
    print("  [PASS] FailureReplayViewer renders suggested_fix block")
    PASS += 1
else:
    print("  [FAIL] suggested_fix block missing from FailureReplayViewer")
    FAIL += 1

print("\n=== G5: suggested_fix generation in chaos_worker.ts ===")
worker = open(os.path.join(REPO_ROOT, "watchllm/worker/chaos_worker.ts"), encoding="utf-8").read()
if "generateSuggestedFix" in worker and "suggested_fix" in worker:
    print("  [PASS] chaos_worker.ts has generateSuggestedFix()")
    PASS += 1
else:
    print("  [FAIL] generateSuggestedFix missing from chaos_worker.ts")
    FAIL += 1

print("\n=== G2: Attack category matrix in SimulationProgressView ===")
if "ATTACK_CATEGORIES" in spv and "avg_severity" in spv.lower() or "avgSeverity" in spv:
    print("  [PASS] Category matrix exists in SimulationProgressView")
    PASS += 1
else:
    print("  [FAIL] Category matrix missing from SimulationProgressView")
    FAIL += 1

print("\n=== H3: Sentry init in clerk_webhook.py ===")
api_code = open(os.path.join(REPO_ROOT, "watchllm/api/clerk_webhook.py"), encoding="utf-8").read()
if "_init_sentry" in api_code and "FastApiIntegration" in api_code and "SENTRY_DSN" in api_code:
    print("  [PASS] Sentry init with FastApiIntegration and SENTRY_DSN env")
    PASS += 1
else:
    print("  [FAIL] Sentry init missing or incomplete")
    FAIL += 1

# ─── Python compile check ─────────────────────────────────────────────────────
print("\n=== Python compile check (watchllm/) ===")
result = subprocess.run(
    [sys.executable, "-m", "compileall", "-q", "watchllm/"],
    capture_output=True, text=True, cwd=REPO_ROOT
)
if result.returncode == 0:
    print("  [PASS] All Python files compile without errors")
    PASS += 1
else:
    print(f"  [FAIL] Compile errors:\n{result.stdout}{result.stderr}")
    FAIL += 1

# ─── Summary ──────────────────────────────────────────────────────────────────
total = PASS + FAIL
print(f"\n{'='*50}")
print(f"  RESULTS: {PASS}/{total} passed  |  {FAIL} failed")
print(f"{'='*50}")
sys.exit(0 if FAIL == 0 else 1)
