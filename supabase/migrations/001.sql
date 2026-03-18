-- users
CREATE TABLE IF NOT EXISTS public.users (
  id         uuid PRIMARY KEY,
  clerk_id   text UNIQUE,
  email      text,
  tier       text DEFAULT 'free',  -- 'free' | 'pro' | 'team'
  created_at timestamptz DEFAULT now()
);

-- projects
CREATE TABLE IF NOT EXISTS public.projects (
  id         uuid PRIMARY KEY,
  user_id    uuid REFERENCES public.users(id),
  name       text,
  sdk_key    text UNIQUE,  -- format: sk_proj_xxx
  created_at timestamptz DEFAULT now()
);

-- agents
CREATE TABLE IF NOT EXISTS public.agents (
  id             uuid PRIMARY KEY,
  project_id     uuid REFERENCES public.projects(id),
  system_prompt  text,
  model          text,
  tools          jsonb,  -- array of tool definitions
  fingerprint    text,   -- hash of system_prompt + tools
  registered_at  timestamptz DEFAULT now()
);

-- simulations
CREATE TABLE IF NOT EXISTS public.simulations (
  id             uuid PRIMARY KEY,
  agent_id       uuid REFERENCES public.agents(id),
  user_id        uuid REFERENCES public.users(id),
  status         text DEFAULT 'queued',  -- 'queued'|'running'|'completed'|'failed'
  config         jsonb,  -- { categories: [...], num_runs: 1000, max_turns: 5 }
  total_runs     integer DEFAULT 0,
  failed_runs    integer DEFAULT 0,
  severity_score float,   -- overall 1-5, computed on completion
  r2_report_key  text,    -- pointer to full report in R2
  created_at     timestamptz DEFAULT now(),
  completed_at   timestamptz
);

-- sim_runs
CREATE TABLE IF NOT EXISTS public.sim_runs (
  id             uuid PRIMARY KEY,
  simulation_id  uuid REFERENCES public.simulations(id),
  category       text,    -- one of the 6 failure categories
  turn_count     integer,
  failed         boolean,
  severity       integer,  -- 1-5
  rule_triggered boolean,
  explanation    text,
  r2_trace_key   text,     -- pointer to full conversation trace in R2
  created_at     timestamptz DEFAULT now()
);