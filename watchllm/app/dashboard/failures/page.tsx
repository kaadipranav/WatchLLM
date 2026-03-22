"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { MagicBentoCard } from "../../components/MagicBentoCard";

type SimulationSummary = {
  id: string;
  status: string;
  severity_score: number | null;
  total_runs: number;
  failed_runs: number;
  created_at: string;
};

export default function FailuresPage() {
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

  const totals = useMemo(() => {
    const totalRuns = simulations.reduce((sum, sim) => sum + sim.total_runs, 0);
    const failedRuns = simulations.reduce((sum, sim) => sum + sim.failed_runs, 0);
    const avgSeverity = simulations.length > 0
      ? simulations.reduce((sum, sim) => sum + (sim.severity_score ?? 0), 0) / simulations.length
      : 0;

    return {
      totalRuns,
      failedRuns,
      failureRate: totalRuns > 0 ? Math.round((failedRuns / totalRuns) * 100) : 0,
      avgSeverity: Number(avgSeverity.toFixed(2)),
    };
  }, [simulations]);

  const riskySimulations = useMemo(
    () =>
      [...simulations]
        .filter((sim) => sim.failed_runs > 0 || (sim.severity_score ?? 0) >= 3)
        .sort((a, b) => (b.severity_score ?? 0) - (a.severity_score ?? 0))
        .slice(0, 8),
    [simulations]
  );

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
          className="dashboard-headline"
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 800,
            letterSpacing: "0.02em",
            marginBottom: "12px",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          FAILURES
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
          TRIAGE QUEUE, HOTSPOTS & ACTION ITEMS
        </p>
      </div>

      <div
        className="dashboard-grid-3"
        style={{
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {[{ label: "Total Failed Runs", value: totals.failedRuns }, { label: "Failure Rate", value: `${totals.failureRate}%` }, { label: "Avg Severity", value: totals.avgSeverity.toFixed(2) }].map((item) => (
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
            <div
              style={{
                fontSize: "28px",
                color: item.label === "Avg Severity" && totals.avgSeverity >= 3 ? "#ff8c98" : "#fff",
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
              }}
            >
              {item.value}
            </div>
          </MagicBentoCard>
        ))}
      </div>

      <div className="dashboard-grid-2" style={{ display: "grid", gap: "12px" }}>
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
            Highest Risk Simulations
          </div>

          {loading ? (
            <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px" }}>
              Loading triage queue...
            </div>
          ) : riskySimulations.length === 0 ? (
            <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", lineHeight: 1.7 }}>
              No failures detected yet. Run a simulation to find out.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "8px" }}>
              {riskySimulations.map((sim) => {
                const simFailureRate = sim.total_runs > 0
                  ? Math.round((sim.failed_runs / sim.total_runs) * 100)
                  : 0;

                return (
                  <div
                    key={sim.id}
                    className="dashboard-grid-4"
                    style={{
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px",
                      background: "rgba(15,15,35,0.35)",
                      padding: "12px",
                      display: "grid",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", color: "#fff" }}>
                        Sim {sim.id.slice(0, 8)}
                      </div>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "10px", color: "#6c6c8a" }}>
                        {new Date(sim.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "11px", color: "#b5b5c8" }}>
                      {sim.failed_runs}/{sim.total_runs}
                    </div>
                    <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: "11px", color: "#b5b5c8" }}>
                      {simFailureRate}%
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono',monospace",
                        fontSize: "11px",
                        textAlign: "right",
                        color: (sim.severity_score ?? 0) >= 3 ? "#ff8c98" : "#8fd9b2",
                      }}
                    >
                      sev {(sim.severity_score ?? 0).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </MagicBentoCard>

        <MagicBentoCard
          style={{
            padding: "20px",
            background: "rgba(247,59,0,0.03)",
            border: "1px solid rgba(247,59,0,0.2)",
            display: "grid",
            gap: "10px",
            height: "fit-content",
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
            Triage Playbook
          </div>
          <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", lineHeight: 1.7 }}>
            1. Replay highest severity runs first.
          </div>
          <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", lineHeight: 1.7 }}>
            2. Patch system prompt or tool guardrails.
          </div>
          <div style={{ color: "#8a8a93", fontFamily: "'IBM Plex Mono',monospace", fontSize: "12px", lineHeight: 1.7 }}>
            3. Re-run targeted categories and compare failure-rate deltas.
          </div>
        </MagicBentoCard>
      </div>
    </div>
  );
}
