"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { FailureReplayViewer } from "./FailureReplayViewer";

type SimulationStatus = "queued" | "running" | "completed" | "failed";

type SimulationRow = {
  id: string;
  status: SimulationStatus;
  severity_score: number | null;
  total_runs: number;
  failed_runs: number;
  config: {
    categories?: string[];
    num_runs?: number;
    max_turns?: number;
  } | null;
};

type SimRunRow = {
  id: string;
  simulation_id: string;
  category: string;
  failed: boolean;
  severity: number;
  explanation: string | null;
};

type FailureSummary = {
  id: string;
  category: string;
  severity: number;
  explanation: string | null;
};

type CategoryReportRow = {
  runs: number;
  failures: number;
  avg_severity: number;
};

type SummaryReport = {
  simulation_id: string;
  categories: Record<string, CategoryReportRow>;
};

type Props = {
  simulationId: string;
};

const backgroundStyle: React.CSSProperties = {
  color: "#ffffff",
  padding: "24px",
  fontFamily: 'var(--font-mono, "JetBrains Mono", ui-monospace, monospace)',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "rgba(255,255,255,0.45)",
  marginBottom: "0.5rem",
};

const headlineStyle: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 600,
  marginBottom: "1rem",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1rem",
  marginBottom: "1.25rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "rgba(255,255,255,0.45)",
  marginBottom: "0.25rem",
};

const valueStyle: React.CSSProperties = {
  fontSize: "1rem",
};

const ATTACK_CATEGORIES = [
  "prompt_injection",
  "goal_hijacking",
  "memory_poisoning",
  "tool_abuse",
  "boundary_testing",
  "jailbreak_variants",
];

function severityColor(severity: number | null | undefined): string {
  if (severity == null) return "rgba(255,255,255,0.3)";
  if (severity <= 2) return "rgba(255,255,255,0.45)";
  if (severity === 3) return "#FFCC00";
  return "#FF2A8C"; // Cyber-Plasma Liquid Void: hot magenta for failure
}

export function SimulationProgressView({ simulationId }: Props) {
  const [simulation, setSimulation] = useState<SimulationRow | null>(null);
  const [failures, setFailures] = useState<FailureSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [categoryReport, setCategoryReport] = useState<Record<string, CategoryReportRow>>({});

  useEffect(() => {
    const channel = supabase
      .channel(`simulation:${simulationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "simulations",
          filter: `id=eq.${simulationId}`,
        },
        (payload) => {
          const record = payload.new as SimulationRow;
          setSimulation(record);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sim_runs",
          filter: `simulation_id=eq.${simulationId}`,
        },
        (payload) => {
          const record = payload.new as SimRunRow;
          if (record.failed) {
            setFailures((current) => [
              {
                id: record.id,
                category: record.category,
                severity: record.severity,
                explanation: record.explanation,
              },
              ...current,
            ]);
            setSelectedRunId((current) => current ?? record.id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [simulationId]);

  useEffect(() => {
    let active = true;

    const fetchCategoryReport = async () => {
      try {
        const response = await fetch(`/api/simulation/${simulationId}/report`);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as SummaryReport;
        if (!active || !payload || typeof payload !== "object") {
          return;
        }

        const categories = payload.categories ?? {};
        const normalized: Record<string, CategoryReportRow> = {};
        for (const category of ATTACK_CATEGORIES) {
          const row = categories[category];
          normalized[category] = {
            runs: typeof row?.runs === "number" ? row.runs : 0,
            failures: typeof row?.failures === "number" ? row.failures : 0,
            avg_severity: typeof row?.avg_severity === "number" ? row.avg_severity : 0,
          };
        }
        setCategoryReport(normalized);
      } catch {
        // Report fetch is best-effort while simulation is in flight.
      }
    };

    fetchCategoryReport();
    const intervalId = window.setInterval(fetchCategoryReport, 4000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [simulationId]);

  const totalRuns =
    simulation?.config?.num_runs ?? simulation?.total_runs ?? 0;
  const completedRuns = simulation?.total_runs ?? 0;
  const progress =
    totalRuns > 0 ? Math.min(100, Math.round((completedRuns / totalRuns) * 100)) : 0;

  const severityScore = simulation?.severity_score ?? null;
  const severityStyle: React.CSSProperties = {
    ...valueStyle,
    color: severityColor(severityScore),
  };

  const progressBarTrack: React.CSSProperties = {
    width: "100%",
    height: "0.5rem",
    borderRadius: "999px",
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  };

  const progressBarFill: React.CSSProperties = {
    width: `${progress}%`,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.2)", // neutral; severity colors are reserved
    transition: "width 150ms ease-out",
  };

  const wrapperStyle: React.CSSProperties = {
    display: "grid",
    gap: "1rem",
  };

  return (
    <div style={wrapperStyle}>
      <section className="bento-card plasma-border" style={backgroundStyle}>
        <div style={sectionTitleStyle}>Simulation Control</div>
        <div style={headlineStyle}>Simulation {simulationId}</div>

        <div style={gridStyle}>
          <div>
            <div style={labelStyle}>Status</div>
            <div style={valueStyle}>{simulation?.status ?? "queued"}</div>
          </div>
          <div>
            <div style={labelStyle}>Progress</div>
            <div style={valueStyle}>{progress}%</div>
            <div style={progressBarTrack}>
              <div style={progressBarFill} />
            </div>
          </div>
          <div>
            <div style={labelStyle}>Agent Safety Score</div>
            <div style={severityStyle}>
              {severityScore != null ? severityScore.toFixed(2) : "—"}
            </div>
          </div>
        </div>

        <div style={sectionTitleStyle}>Attack Category Matrix</div>
        <div
          style={{
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.08)",
            overflow: "hidden",
            marginBottom: "1.25rem",
          }}
        >
          {ATTACK_CATEGORIES.map((category) => {
            const row = categoryReport[category] ?? {
              runs: 0,
              failures: 0,
              avg_severity: 0,
            };

            const failureRate = row.runs > 0 ? Math.min(100, Math.round((row.failures / row.runs) * 100)) : 0;
            const barColor = severityColor(row.avg_severity);

            return (
              <div
                key={category}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  padding: "0.6rem 0.75rem",
                  backgroundColor: "rgba(10, 10, 10, 0.6)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.7fr 0.7fr 0.7fr",
                    gap: "0.5rem",
                    fontSize: "0.8rem",
                    alignItems: "center",
                    marginBottom: "0.4rem",
                  }}
                >
                  <span>{category}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>runs: {row.runs}</span>
                  <span style={{ color: "rgba(255,255,255,0.3)" }}>fail: {row.failures}</span>
                  <span style={{ color: barColor }}>avg: {row.avg_severity.toFixed(2)}</span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "0.35rem",
                    borderRadius: "999px",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${failureRate}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      transition: "width 150ms ease-out",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div style={sectionTitleStyle}>Live Failures</div>
        <div
          style={{
            maxHeight: "12rem",
            overflowY: "auto",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "0.75rem",
            backgroundColor: "rgba(10, 10, 10, 0.6)",
          }}
        >
          {failures.length === 0 ? (
            <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>
              Waiting for first failure signal…
            </div>
          ) : (
            failures.map((failure) => {
              const isSelected = selectedRunId === failure.id;
              return (
                <button
                  key={failure.id}
                  type="button"
                  onClick={() => setSelectedRunId(failure.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.5rem 0.75rem",
                    marginBottom: "0.5rem",
                    borderRadius: "0.5rem",
                    border: `1px solid ${severityColor(failure.severity)}`,
                    backgroundColor: isSelected ? "rgba(0, 240, 255, 0.08)" : "rgba(10, 10, 10, 0.6)",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.25rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span>{failure.category}</span>
                    <span
                      style={{
                        color: severityColor(failure.severity),
                        fontSize: "0.8rem",
                      }}
                    >
                      Severity {failure.severity}
                    </span>
                  </div>
                  {failure.explanation && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "rgba(255,255,255,0.3)",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {failure.explanation}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {selectedRunId && (
          <div
            style={{
              marginTop: "0.75rem",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Selected run: {selectedRunId}
          </div>
        )}
      </section>

      {selectedRunId && (
        <FailureReplayViewer simulationId={simulationId} runId={selectedRunId} />
      )}
    </div>
  );
}

