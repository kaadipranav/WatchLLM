"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MagicBentoCard } from "../../components/MagicBentoCard";

type SimulationSummary = {
  id: string;
  agent_id?: string;
  status: string;
  severity_score: number | null;
  total_runs: number;
  failed_runs: number;
  created_at: string;
};

type AgentAggregate = {
  agentId: string;
  simulations: number;
  failedRuns: number;
  totalRuns: number;
  avgSeverity: number;
  lastSeenAt: string;
  runningCount: number;
};

export default function AgentsPage() {
  const { getToken } = useAuth();
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/simulations", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          setSimulations([]);
          return;
        }
        const payload = (await res.json()) as SimulationSummary[];
        setSimulations(Array.isArray(payload) ? payload : []);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [getToken]);

  const agents = useMemo(() => {
    const map = new Map<string, AgentAggregate>();

    for (const sim of simulations) {
      if (!sim.agent_id) continue;
      const current = map.get(sim.agent_id) ?? {
        agentId: sim.agent_id,
        simulations: 0,
        failedRuns: 0,
        totalRuns: 0,
        avgSeverity: 0,
        lastSeenAt: sim.created_at,
        runningCount: 0,
      };

      current.simulations += 1;
      current.failedRuns += sim.failed_runs;
      current.totalRuns += sim.total_runs;
      current.avgSeverity += sim.severity_score ?? 0;
      if (sim.status === "running") {
        current.runningCount += 1;
      }
      if (new Date(sim.created_at).getTime() > new Date(current.lastSeenAt).getTime()) {
        current.lastSeenAt = sim.created_at;
      }

      map.set(sim.agent_id, current);
    }

    const rows = [...map.values()].map((row) => ({
      ...row,
      avgSeverity:
        row.simulations > 0 ? Number((row.avgSeverity / row.simulations).toFixed(2)) : 0,
    }));

    rows.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
    return rows;
  }, [simulations]);

  const totalSimulations = simulations.length;
  const activeAgents = agents.length;
  const runningAgents = agents.filter((agent) => agent.runningCount > 0).length;

  return (
    <div style={{ padding: "0" }}>
      <div
        style={{
          marginBottom: "40px",
          borderBottom: "1px solid rgba(247,59,0,0.22)",
          paddingBottom: "20px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "42px",
            fontWeight: 800,
            letterSpacing: "0.02em",
            marginBottom: "12px",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          AGENTS
        </h1>
        <p
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12px",
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          REGISTRY, ACTIVITY & SAFETY SIGNALS
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {[{ label: "Tracked Agents", value: activeAgents }, { label: "Total Simulations", value: totalSimulations }, { label: "Agents Running", value: runningAgents }].map((item) => (
          <MagicBentoCard
            key={item.label}
            style={{
              padding: "16px",
              border: "1px solid rgba(247,59,0,0.2)",
              background: "rgba(247,59,0,0.03)",
            }}
          >
            <div
              style={{
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: "11px",
                color: "#6c6c8a",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "8px",
              }}
            >
              {item.label}
            </div>
            <div style={{ fontSize: "28px", color: "#fff", fontWeight: 700, fontFamily: "var(--font-sans)" }}>
              {item.value}
            </div>
          </MagicBentoCard>
        ))}
      </div>

      <MagicBentoCard
        style={{
          padding: "20px",
          background: "rgba(247,59,0,0.03)",
          border: "1px solid rgba(247,59,0,0.2)",
          display: "grid",
          gap: "10px",
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "11px",
            color: "#6c6c8a",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Agent Activity
        </div>

        {loading ? (
          <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px" }}>
            Loading agent activity...
          </div>
        ) : agents.length === 0 ? (
          <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", lineHeight: 1.7 }}>
            No agents found yet. Create a project, register an agent through the SDK, then run a simulation to populate this view.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {agents.map((agent) => {
              const failureRate = agent.totalRuns > 0
                ? Math.round((agent.failedRuns / agent.totalRuns) * 100)
                : 0;
              return (
                <div
                  key={agent.agentId}
                  style={{
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "6px",
                    background: "rgba(15,15,35,0.35)",
                    padding: "12px",
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    gap: "10px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", color: "#fff" }}>
                      Agent {agent.agentId.slice(0, 8)}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "10px", color: "#6c6c8a" }}>
                      Last seen {new Date(agent.lastSeenAt).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "11px", color: "#b5b5c8" }}>
                    {agent.simulations} sims
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "11px", color: "#b5b5c8" }}>
                    {failureRate}% fail
                  </div>
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono',monospace",
                      fontSize: "11px",
                      color: agent.avgSeverity >= 3 ? "#ff8c98" : "#8fd9b2",
                      textAlign: "right",
                    }}
                  >
                    sev {agent.avgSeverity.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </MagicBentoCard>
    </div>
  );
}
