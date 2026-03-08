-- F2: Row Level Security policies
-- NOTE: This migration assumes tables from 001_initial_schema.sql already exist.
-- Supabase service role (BYPASSRLS) bypasses these policies and should only be used in
-- trusted server-side contexts (API + Workers).

BEGIN;

ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sim_runs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_select_own'
  ) THEN
    CREATE POLICY projects_select_own
      ON public.projects
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_insert_own'
  ) THEN
    CREATE POLICY projects_insert_own
      ON public.projects
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_update_own'
  ) THEN
    CREATE POLICY projects_update_own
      ON public.projects
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'projects' AND policyname = 'projects_delete_own'
  ) THEN
    CREATE POLICY projects_delete_own
      ON public.projects
      FOR DELETE
      USING (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'simulations' AND policyname = 'simulations_select_own'
  ) THEN
    CREATE POLICY simulations_select_own
      ON public.simulations
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'simulations' AND policyname = 'simulations_update_own'
  ) THEN
    CREATE POLICY simulations_update_own
      ON public.simulations
      FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'agents' AND policyname = 'agents_select_via_project_owner'
  ) THEN
    CREATE POLICY agents_select_via_project_owner
      ON public.agents
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id = agents.project_id
            AND p.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sim_runs' AND policyname = 'sim_runs_select_via_simulation_owner'
  ) THEN
    CREATE POLICY sim_runs_select_via_simulation_owner
      ON public.sim_runs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM public.simulations s
          WHERE s.id = sim_runs.simulation_id
            AND s.user_id = auth.uid()
        )
      );
  END IF;
END
$$;

COMMIT;
