from __future__ import annotations

from fastapi import FastAPI, Request

app = FastAPI()


@app.post("/api/webhooks/clerk")
async def clerk_webhook(request: Request):
    """
    Basic Clerk webhook endpoint stub.

    This will eventually:
    - Verify the Clerk webhook signature
    - Parse the event payload
    - Upsert users into the Supabase `users` table
    """
    _raw_body = await request.body()
    # TODO: verify signature and sync to Supabase
    return {"status": "ok"}

