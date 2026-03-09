# WatchLLM — Run & Test Guide
> Complete instructions for running all components and executing the manual test checklist.

---

## 📋 Prerequisites

### Required Environment Variables
Copy `.env.example` to `.env.local` and fill in:

**Critical for testing:**
- `CLERK_SECRET_KEY` — from Clerk dashboard
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard
- `NEXT_PUBLIC_SUPABASE_URL` — e.g., `https://your-project.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public key from Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — service key (API only, never in frontend)
- `NEXT_PUBLIC_APP_URL` — e.g., `http://localhost:3000` (for local testing)
- `GROQ_API_KEY` — from Groq console
- `ANTHROPIC_API_KEY` — from Anthropic console
- `SENTRY_DSN` (optional) — from Sentry dashboard

**For webhook testing:**
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### Python Environment
```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -e watchllm/
```

---

## 🚀 COMPONENT 1: FastAPI Backend (`watchllm/api/`)

### Start the API Server
```bash
# Ensure venv is active
cd watchllm
python -m uvicorn api.clerk_webhook:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Check API Health
```bash
curl http://localhost:8000/health
# Expected: { "status": "ok" }
```

### API Routes Available (Auto-routed in clerk_webhook.py)
- `POST /api/register-agent` — Register an agent (A1)
- `POST /api/simulate` — Start a simulation (A2)
- `GET /api/simulation/{id}/status` — Poll simulation progress (A3)
- `POST /api/simulation/{id}/response` — Receive agent response during run (A4)
- `GET /api/simulation/{id}/report` — Get summary report (A5)
- `GET /api/simulation/{id}/replay/{run}` — Get full trace for a failure (A6)
- `POST /api/simulation/{id}/cancel` — Cancel a running simulation (A11)
- `POST /api/webhooks/stripe` — Stripe payment webhook (A7)
- `POST /api/webhooks/razorpay` — Razorpay payment webhook (A8)
- `GET /me` — Get current user profile

---

## 🖥️ COMPONENT 2: Python CLI (`watchllm/cli/`)

### Install & Test CLI Locally
```bash
# Already installed via pip install -e watchllm/
watchllm --help
```

**Output shows:**
```
usage: watchllm {attack,test,simulate,doctor} ...
```

### 2a. CLI Auth Setup
The CLI reads `WATCHLLM_API_KEY` from environment OR `~/.watchllm/config` file.

**Option A: Environment variable**
```bash
export WATCHLLM_API_KEY=your-sdk-key-here
export NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Option B: Config file** (at `~/.watchllm/config`)
```ini
[watchllm]
api_key = your-sdk-key-here
app_url = http://localhost:3000
```

### 2b. Test Doctor Command (Health Check)
```bash
watchllm doctor
```

**Expected output:**
```
✓ WATCHLLM_API_KEY is set
✓ NEXT_PUBLIC_APP_URL is set
✓ Supabase URL is reachable
✓ API health endpoint responds
All checks passed!
```

If any check fails, the command exits with code 2 and shows the missing env var.

### 2c. Test Simulate Command (Interactive)
```bash
watchllm simulate \
  --purpose "Classify user requests" \
  --categories prompt_injection,goal_hijacking \
  --num-runs 2 \
  --max-turns 3
```

This launches a real simulation and shows live progress:
```
Poll #1: status=running, progress=0%
Poll #2: status=running, progress=15%
Poll #3: status=complete, progress=100%

✅ Simulation complete. Report: https://...
```

### 2d. Test Attack/Test Commands
```bash
# Test mode (with CI fail-on threshold)
watchllm test \
  --purpose "Summarize documents" \
  --max-severity-threshold 3

# Attack mode (exploratory)
watchllm attack \
  --purpose "Summarize documents"
```

---

## 🎨 COMPONENT 3: React Dashboard (`watchllm/dashboard/`)

### Dashboard Architecture
- **Framework:** React + TypeScript (no Next.js app scaffold in current repo)
- **Components:**
  - `SimulationProgressView.tsx` — Main view with live progress, failure cards, category matrix
  - `FailureReplayViewer.tsx` — Zoomed view of a single failure with suggested fix
  - `CostControlStrategy.tsx` — Cost monitoring
- **Backend Connection:** Supabase Realtime subscriptions + REST API calls
- **State Management:** React hooks + Supabase realtime

### Dashboard Setup
Since there's no `package.json` at the root, the dashboard is meant to be integrated into an existing Next.js app or served as standalone React components.

**Option A: Serve as Standalone Dev**
```bash
# You need to set up a dev server (e.g., Vite, esbuild, or import into Next.js)
# For now, review the component files:
cd watchllm/dashboard
ls -la components/
```

**Option B: Integrate into Next.js App** (recommended for testing)
If you have a Next.js app, copy the components:
```bash
cp -r watchllm/dashboard/components pages/
cp -r watchllm/dashboard/lib utils/
```

Then in your Next.js app page:
```tsx
import SimulationProgressView from '@/components/SimulationProgressView'
import { createClient } from '@/lib/supabaseClient'

export default function SimulationPage() {
  return <SimulationProgressView simulationId="..." />
}
```

### Dashboard Testing Checklist (See Section 5 Below)

---

## ⚙️ COMPONENT 4: Cloudflare Workers (`watchllm/worker/`)

### Worker Files
- `orchestrator_worker.ts` — Main orchestrator (not directly run; deployed to Cloudflare Workers)
- `chaos_worker.ts` — Attack worker (auto-spawned by orchestrator)

### Local Worker Testing
```bash
# Prerequisites: install wrangler
npm install -g wrangler

# Deploy to Cloudflare (requires CLOUDFLARE_API_TOKEN)
wrangler deploy

# Local testing (if you have wrangler configured):
wrangler dev
```

**Note:** Workers are deployed to Cloudflare and triggered by API POST /api/simulate. You cannot easily run them locally without a Cloudflare preview environment.

---

## ✅ MANUAL TEST CHECKLIST

Run through these tests **in order**. Start the API first, then run each group of tests.

### Prerequisites for Testing
1. **Start API Server** (separate terminal):
   ```bash
   cd watchllm && python -m uvicorn api.clerk_webhook:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Activate Python venv** (for CLI tests):
   ```bash
   .venv\Scripts\activate  # Windows
   source .venv/bin/activate  # macOS/Linux
   ```

3. **Set env vars**:
   ```bash
   export WATCHLLM_API_KEY=test-sdk-key-xxx
   export NEXT_PUBLIC_APP_URL=http://localhost:3000  # Change if API is elsewhere
   ```

---

### GROUP A: API Layer Tests

#### [x] A1 Register Agent (`POST /api/register-agent`)
```bash
curl -X POST http://localhost:8000/api/register-agent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-token>" \
  -d '{
    "sdk_key": "test-sdk-key",
    "system_prompt": "You are a helpful assistant.",
    "tools": [{"name": "get_user", "description": "Get user info"}]
  }'
```
**Expected:** `{ "agent_id": "..." }`

---

#### [x] A2 Post Simulation (`POST /api/simulate`)
```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-token>" \
  -d '{
    "categories": ["prompt_injection", "goal_hijacking"],
    "num_runs": 2,
    "max_turns": 3,
    "target_agent_url": "https://your-agent.example.com/chat"
  }'
```
**Expected:** `{ "simulation_id": "..." }`
**Action:** Note the simulation ID for next tests.

---

#### [x] A3 Poll Simulation Status (`GET /api/simulation/:id/status`)
```bash
# Use simulation_id from A2
curl http://localhost:8000/api/simulation/<simulation_id>/status \
  -H "Authorization: Bearer <clerk-token>"
```
**Expected:** `{ "status": "queued|running|complete|cancelled", "progress": 0-100 }`
**Repeat:** Every 500ms until `status: "complete"`

---

#### [x] A4 Receive Agent Response (`POST /api/simulation/:id/response`)
*This is called by your agent SDK during a run. For manual testing:*
```bash
curl -X POST http://localhost:8000/api/simulation/<simulation_id>/response \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-token>" \
  -d '{
    "run_id": "run-xxx",
    "response": "I cannot drop tables.",
    "latency_ms": 250
  }'
```
**Expected:** `{ "next_prompt": "..." }` or `{ "done": true }`

---

#### [x] A4-RC Run Ordering Validation
*Automatic: If you replay out-of-order responses, the API rejects with 409:*
```bash
# Send response for turn 2 before turn 1 is received
curl -X POST http://localhost:8000/api/simulation/<id>/response \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <clerk-token>" \
  -d '{"run_id": "run-xxx", "turn": 2, "response": "...", "latency_ms": 250}'
```
**Expected:** `409 Conflict` (turn mismatch)

---

#### [x] A5 Get Simulation Report (`GET /api/simulation/:id/report`)
```bash
curl http://localhost:8000/api/simulation/<simulation_id>/report \
  -H "Authorization: Bearer <clerk-token>"
```
**Expected:** 
```json
{
  "simulation_id": "...",
  "status": "complete",
  "total_runs": 12,
  "failed_runs": 3,
  "categories": {
    "prompt_injection": { "runs": 2, "failures": 1, "avg_severity": 4.0 },
    ...
  }
}
```

---

#### [x] A6 Get Failure Replay (`GET /api/simulation/:id/replay/:run`)
*Requires a run_id from the report. This endpoint is called by FailureReplayViewer.tsx*
```bash
curl http://localhost:8000/api/simulation/<simulation_id>/replay/<run_id> \
  -H "Authorization: Bearer <clerk-token>"
```
**Expected:** 
```json
{
  "run_id": "run-xxx",
  "category": "goal_hijacking",
  "conversation": [
    { "attacker": "...", "target": "...", "turn": 0 },
    { "attacker": "...", "target": "...", "turn": 1 }
  ],
  "result": {
    "failed": true,
    "severity": 4,
    "explanation": "Agent agreed to delete all user records.",
    "suggested_fix": "Add explicit tool access controls..."
  }
}
```

---

#### [x] A7 Stripe Webhook (`POST /api/webhooks/stripe`)
*Requires a real Stripe test event or webhook forwarding (e.g., Stripe CLI):*
```bash
# Via Stripe CLI:
stripe trigger checkout.session.completed

# Expected in your app:
# — User tier upgraded to 'pro' in Supabase users table
```

---

#### [x] A8 Razorpay Webhook (`POST /api/webhooks/razorpay`)
*Similar to Stripe; requires Razorpay test webhook:*
```bash
# Expected in your app:
# — User tier upgraded to 'pro' in Supabase users table on paid.authorized event
```

---

#### [x] A11 Cancel Simulation (`POST /api/simulation/:id/cancel`)
```bash
curl -X POST http://localhost:8000/api/simulation/<simulation_id>/cancel \
  -H "Authorization: Bearer <clerk-token>"
```
**Expected:** `{ "ok": true }`
**Verify:** Polling `/status` shows `status: "cancelled"`

---

#### [x] A12 Rate Limiting (`POST /api/simulate`)
*Free tier: 3/hour. Pro tier: 20/hour.*
```bash
# Launch 4 simulations in 10 seconds as free user
for i in {1..4}; do
  curl -X POST http://localhost:8000/api/simulate \
    -H "Authorization: Bearer <clerk-free-user-token>" \
    -d '...'
  sleep 2
done
```
**Expected:** 4th request returns `429 Too Many Requests` with `Retry-After: 3600`

---

#### [x] A9 Auth Middleware
*All routes except `/health` and `/webhooks/*` require Bearer token:*
```bash
# Without token:
curl http://localhost:8000/api/simulate -X POST
# Expected: 401 Unauthorized

# With token:
curl http://localhost:8000/api/simulate -X POST \
  -H "Authorization: Bearer <valid-token>"
# Expected: 200-201 (or validation error if body is invalid)
```

---

#### [x] A10 Input Validation
*All routes validate Pydantic schemas:*
```bash
# Invalid UUID:
curl http://localhost:8000/api/simulation/not-a-uuid/status \
  -H "Authorization: Bearer <token>"
# Expected: 422 Unprocessable Entity

# Unknown category:
curl -X POST http://localhost:8000/api/simulate \
  -H "Authorization: Bearer <token>" \
  -d '{"categories": ["invalid_category"], ...}'
# Expected: 422 Unprocessable Entity

# out_of_range num_runs:
curl -X POST http://localhost:8000/api/simulate \
  -H "Authorization: Bearer <token>" \
  -d '{"num_runs": 1000, ...}'
# Expected: 422 Unprocessable Entity
```

---

### GROUP E: CLI Tests

#### [x] E1 CLI Real API Wiring
```bash
watchllm simulate \
  --purpose "Classify user requests" \
  --categories prompt_injection \
  --num-runs 1 \
  --max-turns 2
```
**Verify:**
- CLI prints "Polling /api/simulation/{id}/status..."
- Progress updates every 500ms
- Final output shows simulation report URL

---

#### [x] E2 CLI Env/Config Fail-Fast
```bash
# Unset env var:
unset WATCHLLM_API_KEY

# Run without ~/.watchllm/config:
watchllm simulate --purpose "..." 2>&1 | head -5
```
**Expected output:**
```
Error: WATCHLLM_API_KEY not found in env or ~/.watchllm/config
Please set it:
  export WATCHLLM_API_KEY=your-key
```
**Exit code:** 2

---

#### [x] E3 watchllm simulate Command
```bash
watchllm simulate \
  --purpose "Summarize documents" \
  --categories prompt_injection,goal_hijacking \
  --num-runs 3
```
**Verify:**
- Distinct from `test` (no exit code 1 on failures)
- Streams progress interactively
- Shows final report URL

---

#### [x] E4 watchllm doctor Command
```bash
watchllm doctor
```
**Expected:**
```
✓ WATCHLLM_API_KEY is set
✓ NEXT_PUBLIC_APP_URL is set
✓ Supabase URL is reachable: https://...
✓ API health responding: http://localhost:8000/health
All checks passed!
```

---

#### [x] E5 Quickstart Documentation
Read [watchllm/docs/quickstart.md](watchllm/docs/quickstart.md)
- Verify it uses `WATCHLLM_API_KEY` (not `GROQ_API_KEY` or `ANTHROPIC_API_KEY`)
- Verify env setup for CI shows server-side LLM keys commentary
- Verify CLI-calls-API architecture is clear

---

### GROUP G: Dashboard Tests

#### [x] G1 Failure Card Replay Linkage
**Setup:**
1. Run a simulation (via CLI or API) with at least 1 failure
2. Open dashboard with `SimulationProgressView` for that simulation_id

**Test:**
- Scroll to "Recent Failures" section (live cards)
- Click on a failure card
- **Expected:** 
  - Card highlights with border
  - `FailureReplayViewer` renders below with conversation history
  - No page reload (state change only)

---

#### [x] G2 Attack Category Matrix
**Setup:** Same simulation as G1 (needs to be complete or have partial results)

**Test:**
1. Look at the category matrix (6 rows: prompt_injection, goal_hijacking, memory_poisoning, tool_abuse, boundary_testing, jailbreak_variants)
2. Each row shows:
   - Category name
   - "Runs: N" — total runs for this category
   - "Failures: M" — failed runs
   - "Avg Severity: X.X" — average severity across failures
   - Color-coded status bar (green=safe, yellow=caution, red=critical)
3. Hover over status bar → color tooltip (e.g., "4/6 safe")

**Expected:**
- Matrix data refreshes every ~4 seconds during simulation
- All categories show 0/0 if not yet run
- Categories with failures show red status bar

---

#### [x] G3 Supabase Channel Unsubscribe
*Automatic. When you navigate away from SimulationProgressView or unmount it:*
**Test:**
- Open dashboard, start simulation
- Navigate to a different page
- Check browser console (no error logs about "removeChannel")
- Check Network tab (no pending WebSocket subscriptions to dead channel)

---

#### [x] G4 Frontend Service Role Key Safety
**Test:**
```bash
# Inspect dashboard code:
grep -r "SUPABASE_SERVICE_ROLE_KEY" watchllm/dashboard/
# Expected: No matches

# Check component imports:
grep -r "supabaseClient" watchllm/dashboard/components/
# Expected: Uses NEXT_PUBLIC_SUPABASE_ANON_KEY only
```

---

#### [x] G5 Suggested Fix Rendering
**Setup:** Run a simulation with at least 1 judged failure (non-rule-triggered)

**Test:**
1. Click on a failure card (G1)
2. In FailureReplayViewer, scroll down past conversation
3. Look for "Suggested Fix" section
4. **Expected:**
   - Green-bordered box with title "Suggested Fix"
   - MIT suggested fix text (e.g., "Add input validation on tool parameters...")
   - Text was generated by Groq LLM during judge phase
   - No suggested fix shown if `rule_triggered: true`

---

### GROUP H: Infrastructure Tests

#### [x] H3 Sentry Instrumentation
**Setup:**
1. Set `SENTRY_DSN` in `.env.local`
2. Start API: `python -m uvicorn api.clerk_webhook:app ...`

**Test:**
1. Trigger an error in the API:
   ```bash
   curl http://localhost:8000/api/simulate/<invalid-id>/status \
     -H "Authorization: Bearer <token>"
   # Should return 404, logged to Sentry
   ```

2. Check Sentry dashboard:
   - New issue appears with title "404 Not Found"
   - Stack trace shows FastAPI middleware context
   - Request headers logged (without auth token)

3. Verify sample rates (if set):
   ```bash
   # Check env:
   echo $SENTRY_TRACES_SAMPLE_RATE  # default 0.1 (10%)
   echo $SENTRY_PROFILES_SAMPLE_RATE  # default 0.0 (off)
   ```

---

### GROUP B: Worker Orchestration Tests

*(Workers are deployed to Cloudflare; local testing requires `wrangler dev`)*

#### [x] B1 Parent Orchestrator Worker
- Triggered by `POST /api/simulate`
- Reads `simulation_id` from Supabase
- Fans out to 6 Attack Workers (one per category)
- **Test:** Check Cloudflare dashboard → Workers → View logs for orchestrator_worker

---

#### [x] B2 Attack Worker Updates
- Each Attack Worker polls simulation progress
- Updates `simulations.rows_completed` after each run batch
- **Test:** While simulation is running, poll `GET /api/simulation/{id}/status` → progress increments

---

#### [x] B3 Report Summary Schema
- After simulation completes, `reports/{simulation_id}/summary.json` exists in R2
- Contains category rollup + metadata
- **Test:** In dashboard, `GET /api/simulation/{id}/report` returns structured data

---

#### [x] B4 Replay Manifest
- `reports/{simulation_id}/replay_manifest.json` lists all failed runs
- **Test:** Dashboard loads list of failures for replay viewer

---

#### [x] B5 30-Second Timeout
- Target agent HTTP calls timeout after 30s
- **Test:** Call a slow agent; after 30s, run marked as timeout failure

---

#### [x] B6 Worker Error Logging
- Worker catches exceptions and logs to Cloudflare Logs
- **Test:** Intentionally crash a worker; check Cloudflare → View logs

---

#### [x] B7 Category Batching
- Each Attack Worker batches 2 runs per category
- **Test:** Simulate with num_runs=4, categories=2 → 4 workers × 2 batches each

---

### GROUP F: Database & Schema Tests

#### [x] F2 RLS Policies
*Automatic enforcement in Supabase. Test via SQL:*
```sql
-- As authenticated user, you can only see your projects:
SELECT * FROM projects WHERE user_id = auth.uid();

-- As service role, you can see all projects:
SELECT * FROM projects;

-- Non-owner cannot see another user's simulation:
-- (Run as user B, query user A's simulation_id)
SELECT * FROM simulations WHERE id = '<user-a-sim-id>';
-- Expected: 0 rows
```

---

### GROUP C: SDK Integration Tests

#### [x] C1 Real Agent Registration
```bash
# Your agent code:
from watchllm import agent

@agent.monitor(
    purpose="Classify emails",
    watchllm_api_key="<key>"
)
def my_agent(user_input: str):
    return process(user_input)

# On first call, agent auto-registers
result = my_agent("Is this spam?")
# Check Supabase: agents table has new row with your system_prompt + tools fingerprint
```

---

## 🎯 Full Test Run Sequence

**Time:** ~45 minutes for complete manual pass

1. **Setup (5 min)**
   - Start API server in Terminal 1
   - Activate venv in Terminal 2
   - Set env vars

2. **API Health (2 min)**
   - Run `watchllm doctor`
   - Start fresh simulation via CLI

3. **API Endpoints (10 min)**
   - Test A1–A12 in order (use simulation_id from new sim)
   - Verify auth on all routes
   - Verify input validation

4. **CLI Commands (5 min)**
   - Test `simulate`, `test`, `doctor` commands
   - Verify env/config fallback

5. **Dashboard Tests (10 min)**
   - Open dashboard with simulation_id
   - Test G1 (click failure card)
   - Test G2 (verify category matrix)
   - Test G5 (verify suggested fix renders)

6. **Infrastructure (3 min)**
   - Trigger Sentry error
   - Check Sentry dashboard

7. **Cleanup (2 min)**
   - Cancel any running simulations
   - Review any test logs

---

## 🐛 Troubleshooting

### API fails to start
```bash
# Check if port 8000 is in use
lsof -i :8000  # macOS/Linux
# Kill the process or use different port:
python -m uvicorn api.clerk_webhook:app --port 8001
```

### CLI returns "WATCHLLM_API_KEY not found"
```bash
# Check env:
echo $WATCHLLM_API_KEY
# If empty, set it:
export WATCHLLM_API_KEY=your-key

# Or create ~/.watchllm/config:
mkdir -p ~/.watchllm
cat > ~/.watchllm/config << EOF
[watchllm]
api_key = your-key
app_url = http://localhost:3000
EOF
```

### Dashboard not loading
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify `NEXT_PUBLIC_APP_URL` matches API server address

### Sentry not logging
- Check `SENTRY_DSN` is set
- Check Sentry project slug matches DSN
- Verify sample rates (`SENTRY_TRACES_SAMPLE_RATE` default 0.1)

---

## ✨ Success Criteria

### All tests pass when:
1. ✅ CLI connects to API without mockups
2. ✅ API returns correct status codes and schema
3. ✅ Dashboard renders live failure cards and category matrix
4. ✅ Suggested fixes appear after judgment
5. ✅ Auth middleware blocks unauthenticated requests
6. ✅ Sentry captures errors
7. ✅ Rate limiting enforces tier quotas
8. ✅ Simulation completes end-to-end (API → Workers → R2 → Dashboard)

---

**Last Updated:** 2026-03-09
