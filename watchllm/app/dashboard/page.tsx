"use client";

import { useEffect, useState } from "react";
import { SimulationProgressView } from "../../dashboard/components/SimulationProgressView";
import { CostControlStrategy } from "../../dashboard/components/CostControlStrategy";

type SimulationSummary = {
  id: string;
  status: string;
  severity_score: number | null;
  total_runs: number;
  failed_runs: number;
  created_at: string;
};

export default function DashboardPage() {
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimulations = async () => {
      try {
        const res = await fetch("/api/simulations");
        if (res.ok) {
          const data: SimulationSummary[] = await res.json();
          setSimulations(data);

          // Auto-select the first running simulation, or the most recent one
          const running = data.find((s) => s.status === "running");
          if (running) {
            setActiveId(running.id);
          } else if (data.length > 0) {
            setActiveId(data[0].id);
          }
        }
      } catch {
        // Best-effort fetch
      } finally {
        setLoading(false);
      }
    };

    fetchSimulations();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <div
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          Loading simulations...
        </div>
      </div>
    );
  }

  if (!activeId) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            marginBottom: "1rem",
          }}
        >
          Simulations
        </h1>
        <div
          style={{
            backgroundColor: "#0a0a0a",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "0.75rem",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.45)",
              marginBottom: "1rem",
            }}
          >
            No simulations found. Launch your first chaos test from the CLI.
          </p>
          <code
            style={{
              display: "inline-block",
              backgroundColor: "#000000",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.375rem",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            watchllm attack --agent your-agent.py
          </code>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
        }}
      >
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Simulations
        </h1>

        {simulations.length > 1 && (
          <select
            value={activeId}
            onChange={(e) => setActiveId(e.target.value)}
            style={{
              backgroundColor: "#0a0a0a",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "0.375rem",
              padding: "0.375rem 0.75rem",
              fontSize: "0.8rem",
              fontFamily: 'var(--font-mono, monospace)',
              cursor: "pointer",
            }}
          >
            {simulations.map((sim) => (
              <option key={sim.id} value={sim.id}>
                {sim.id.slice(0, 8)}… — {sim.status}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        <SimulationProgressView simulationId={activeId} />
        <CostControlStrategy estimatedRuns={simulations.find((s) => s.id === activeId)?.total_runs ?? 0} />
      </div>
    </div>
  );
}
