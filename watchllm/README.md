# WatchLLM

**Agent reliability, from first run to production.**

Stress test. Replay. Fix. Ship.

WatchLLM is an **agent reliability platform**: stress-test failure modes before production, replay every run as an inspectable graph, and fork from any node to validate fixes without cold reruns.

- **Web:** Next.js dashboard (Clerk, Supabase client)
- **API:** FastAPI (`watchllm/api/`)
- **SDK / CLI:** Python (`watchllm` package — `pip install -e .`)
- **Workers:** Cloudflare Workers + R2 (`worker/`, `wrangler.toml`)

See `docs/quickstart.md` for CI wiring.
