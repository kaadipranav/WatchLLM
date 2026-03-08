import attackWorker, { Env } from "./chaos_worker";

type SimulationConfig = {
  categories?: string[];
  num_runs?: number;
  max_turns?: number;
  target_agent_url?: string;
};

type SimulationRow = {
  id: string;
  agent_id: string;
  status: string;
  config: SimulationConfig | null;
};

type AgentRow = {
  id: string;
  system_prompt: string | null;
};

type SimRunRow = {
  id: string;
  category: string;
  failed: boolean;
  severity: number;
  r2_trace_key: string | null;
};

type AttackResult = {
  failed: boolean;
  severity: number;
  category: string;
  explanation: string;
  rule_triggered: boolean;
};

const DEFAULT_MAX_TURNS = 5;

const DEFAULT_CATEGORIES = [
  "prompt_injection",
  "goal_hijacking",
  "memory_poisoning",
  "tool_abuse",
  "boundary_testing",
  "jailbreak_variants",
] as const;

function supabaseHeaders(env: Env): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

function supabaseUrl(env: Env, path: string): string {
  const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  url.pathname = path;
  return url.toString();
}

async function supabaseGet<T>(env: Env, path: string): Promise<T> {
  const response = await fetch(supabaseUrl(env, path), {
    method: "GET",
    headers: supabaseHeaders(env),
  });

  if (!response.ok) {
    throw new Error(`Supabase GET ${path} failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function supabasePatch(
  env: Env,
  path: string,
  body: Record<string, unknown>
): Promise<void> {
  const response = await fetch(supabaseUrl(env, path), {
    method: "PATCH",
    headers: {
      ...supabaseHeaders(env),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase PATCH ${path} failed with status ${response.status}`
    );
  }
}

function parseCategories(config: SimulationConfig | null): string[] {
  const candidate = config?.categories;
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return [...DEFAULT_CATEGORIES];
  }
  return candidate.filter((value) => typeof value === "string" && value.length > 0);
}

function maxSeverity(simRuns: SimRunRow[]): number {
  if (simRuns.length === 0) return 0;
  return simRuns.reduce((max, row) => Math.max(max, Number(row.severity) || 0), 0);
}

function buildSummaryReport(simulationId: string, simRuns: SimRunRow[]) {
  const categoryMap = new Map<string, { runs: number; failures: number; totalSeverity: number }>();

  for (const row of simRuns) {
    if (!categoryMap.has(row.category)) {
      categoryMap.set(row.category, { runs: 0, failures: 0, totalSeverity: 0 });
    }
    const bucket = categoryMap.get(row.category)!;
    bucket.runs += 1;
    if (row.failed) {
      bucket.failures += 1;
      bucket.totalSeverity += Number(row.severity) || 0;
    }
  }

  const categories: Record<string, { runs: number; failures: number; avg_severity: number }> = {};
  for (const [category, value] of categoryMap.entries()) {
    categories[category] = {
      runs: value.runs,
      failures: value.failures,
      avg_severity: value.failures > 0 ? Number((value.totalSeverity / value.failures).toFixed(2)) : 0,
    };
  }

  return {
    simulation_id: simulationId,
    generated_at: new Date().toISOString(),
    categories,
  };
}

function buildReplayManifest(simulationId: string, simRuns: SimRunRow[]) {
  const failures = simRuns
    .filter((row) => row.failed)
    .sort((a, b) => (b.severity - a.severity) || a.id.localeCompare(b.id))
    .map((row) => ({
      run_id: row.id,
      category: row.category,
      severity: row.severity,
      r2_trace_key: row.r2_trace_key,
    }));

  return {
    simulation_id: simulationId,
    generated_at: new Date().toISOString(),
    failures,
  };
}

async function runAttackForCategory(
  env: Env,
  simulationId: string,
  category: string,
  purpose: string,
  targetAgentUrl: string,
  maxTurns: number
): Promise<AttackResult> {
  const payload = {
    purpose,
    category,
    target_agent_url: targetAgentUrl,
    simulation_id: simulationId,
    run_id: crypto.randomUUID(),
    max_turns: maxTurns,
  };

  const request = new Request("https://watchllm.internal/attack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const response = await attackWorker.fetch(request, env);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Attack worker failed for ${category}: ${text}`);
  }

  return JSON.parse(text) as AttackResult;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let payload: any;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON body", { status: 400 });
    }

    const simulationId = payload?.simulation_id;
    if (typeof simulationId !== "string" || simulationId.length === 0) {
      return new Response("Missing required field: simulation_id", { status: 400 });
    }

    try {
      // Mark the simulation as running before fan-out begins.
      await supabasePatch(env, `/rest/v1/simulations?id=eq.${simulationId}`, {
        status: "running",
      });

      const simulations = await supabaseGet<SimulationRow[]>(
        env,
        `/rest/v1/simulations?id=eq.${simulationId}&select=id,agent_id,status,config`
      );

      if (simulations.length === 0) {
        return new Response("Simulation not found", { status: 404 });
      }

      const simulation = simulations[0];
      const config = simulation.config ?? {};
      const categories = parseCategories(config);
      const maxTurns =
        typeof config.max_turns === "number" && config.max_turns > 0
          ? config.max_turns
          : DEFAULT_MAX_TURNS;

      const targetAgentUrl = config.target_agent_url;
      if (!targetAgentUrl || typeof targetAgentUrl !== "string") {
        throw new Error(
          "Simulation config missing target_agent_url. Add config.target_agent_url before triggering orchestrator."
        );
      }

      const agents = await supabaseGet<AgentRow[]>(
        env,
        `/rest/v1/agents?id=eq.${simulation.agent_id}&select=id,system_prompt`
      );
      if (agents.length === 0) {
        throw new Error(`Agent not found for simulation ${simulationId}`);
      }

      const purpose = agents[0].system_prompt ?? "General assistant";

      // Fan out one attack worker run per category and await all results.
      await Promise.all(
        categories.map((category) =>
          runAttackForCategory(
            env,
            simulationId,
            category,
            purpose,
            targetAgentUrl,
            maxTurns
          )
        )
      );

      const simRuns = await supabaseGet<SimRunRow[]>(
        env,
        `/rest/v1/sim_runs?simulation_id=eq.${simulationId}&select=id,category,failed,severity,r2_trace_key`
      );

      const summary = buildSummaryReport(simulationId, simRuns);
      const replayManifest = buildReplayManifest(simulationId, simRuns);
      const summaryKey = `reports/${simulationId}/summary.json`;
      const replayManifestKey = `reports/${simulationId}/replay_manifest.json`;

      await env.TRACES_BUCKET.put(summaryKey, JSON.stringify(summary), {
        httpMetadata: { contentType: "application/json" },
      });
      await env.TRACES_BUCKET.put(replayManifestKey, JSON.stringify(replayManifest), {
        httpMetadata: { contentType: "application/json" },
      });

      const totalRuns = simRuns.length;
      const failedRuns = simRuns.filter((row) => row.failed).length;
      const severityScore = maxSeverity(simRuns);

      await supabasePatch(env, `/rest/v1/simulations?id=eq.${simulationId}`, {
        status: "completed",
        total_runs: totalRuns,
        failed_runs: failedRuns,
        severity_score: severityScore,
        r2_report_key: summaryKey,
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          status: "completed",
          simulation_id: simulationId,
          categories,
          total_runs: totalRuns,
          failed_runs: failedRuns,
          severity_score: severityScore,
          report_keys: {
            summary: summaryKey,
            replay_manifest: replayManifestKey,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err: any) {
      try {
        await supabasePatch(env, `/rest/v1/simulations?id=eq.${simulationId}`, {
          status: "failed",
          completed_at: new Date().toISOString(),
        });
      } catch {
        // Ignore cascading failure while trying to set terminal state.
      }

      return new Response(
        JSON.stringify({
          status: "failed",
          simulation_id: simulationId,
          error: String(err?.message ?? err ?? "Unknown error"),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};
