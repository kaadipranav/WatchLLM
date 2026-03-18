-- 003_api_keys.sql
-- Add first-class WatchLLM API keys with revocation/expiry and per-user ownership.

BEGIN;

CREATE TABLE IF NOT EXISTS public.api_keys (
  id           uuid PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id   uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name         text NOT NULL,
  key_prefix   text NOT NULL UNIQUE,
  key_hash     text NOT NULL UNIQUE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON public.api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active_lookup ON public.api_keys(key_prefix, revoked_at, expires_at);

ALTER TABLE IF EXISTS public.api_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_select_own'
  ) THEN
    CREATE POLICY api_keys_select_own
      ON public.api_keys
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_insert_own'
  ) THEN
    CREATE POLICY api_keys_insert_own
      ON public.api_keys
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_update_own'
  ) THEN
    CREATE POLICY api_keys_update_own
      ON public.api_keys
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_delete_own'
  ) THEN
    CREATE POLICY api_keys_delete_own
      ON public.api_keys
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END
$$;

COMMIT;
