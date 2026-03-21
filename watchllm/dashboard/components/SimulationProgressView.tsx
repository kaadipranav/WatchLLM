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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--text-muted)",
  marginBottom: "0.5rem",
  fontFamily: "var(--font-mono)",
};

const headlineStyle: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 600,
  fontFamily: "var(--font-sans)",
  marginBottom: "1rem",
  color: "var(--text-primary)",
  letterSpacing: "-0.02em",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1rem",
  marginBottom: "1.5rem",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-muted)",
  marginBottom: "0.25rem",
  fontFamily: "var(--font-mono)",
};

const valueStyle: React.CSSProperties = {
  fontSize: "1rem",
  fontFamily: "var(--font-sans)",
  fontWeight: 550,
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
  if (severity == null) return "var(--text-muted)";
  if (severity <= 2) return "var(--text-secondary)";
  if (severity === 3) return "var(--warning)";
  return "var(--danger)";
}

export function SimulationProgressView({ simulationId }: Props) {
  const [simulation, setSimulation] = useState<SimulationRow | null>(null);
  const [failures, setFailures] = useState<FailureSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [categoryReport, setCategoryReport] = useState<
    Record<string, CategoryReportRow>
  >({});

  // ---------- initial data load (runs once on mount) ----------
  useEffect(() => {
    let cancelled = false;

    const loadInitialState = async () => {
      // Fetch the simulation row
      const { data: simData } = await supabase
        .from("simulations")
        .select("id, status, severity_score, total_runs, failed_runs, config")
        .eq("id", simulationId)
        .limit(1)
        .single();

      if (!cancelled && simData) {
        setSimulation(simData as SimulationRow);
      }

      // Fetch existing failed runs (up to 50, newest first)
      const { data: runsData } = await supabase
        .from("sim_runs")
        .select("id, simulation_id, category, failed, severity, explanation")
        .eq("simulation_id", simulationId)
        .eq("failed", true)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!cancelled && Array.isArray(runsData) && runsData.length > 0) {
        const loaded = runsData.map((r: SimRunRow) => ({
          id: r.id,
          category: r.category,
          severity: r.severity,
          explanation: r.explanation,
        }));
        setFailures(loaded);
        setSelectedRunId(loaded[0]?.id ?? null);
      }
    };

    loadInitialState();
    return () => {
      cancelled = true;
    };
  }, [simulationId]);

  // ---------- realtime subscription (deduplicates against initial load) ----------
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
            setFailures((current) => {
              // deduplicate: ignore if already loaded from initial fetch
              if (current.some((f) => f.id === record.id)) return current;
              return [
                {
                  id: record.id,
                  category: record.category,
                  severity: record.severity,
                  explanation: record.explanation,
                },
                ...current,
              ];
            });
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
        const response = await fetch(
          `/api/simulation/${simulationId}/report`
        );
        if (!response.ok) return;

        const payload = (await response.json()) as SummaryReport;
        if (!active || !payload || typeof payload !== "object") return;

        const categories = payload.categories ?? {};
        const normalized: Record<string, CategoryReportRow> = {};
        for (const category of ATTACK_CATEGORIES) {
          const row = categories[category];
          normalized[category] = {
            runs: typeof row?.runs === "number" ? row.runs : 0,
            failures: typeof row?.failures === "number" ? row.failures : 0,
            avg_severity:
              typeof row?.avg_severity === "number" ? row.avg_severity : 0,
          };
        }
        setCategoryReport(normalized);
      } catch {
        // best-effort
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
    totalRuns > 0
      ? Math.min(100, Math.round((completedRuns / totalRuns) * 100))
      : 0;

  const severityScore = simulation?.severity_score ?? null;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <section
        className="magic-bento"
        style={{
          color: "var(--text-primary)",
          padding: "24px",
          position: "relative",
          overflow: "hidden",
          "--glow-x": "50%",
          "--glow-y": "50%",
          "--glow-intensity": "0",
          "--glow-radius": "350px",
          "--glow-color": "247, 59, 0",
        } as React.CSSProperties}
      >
        <div style={sectionTitleStyle}>Simulation Control</div>
        <div style={headlineStyle}>Simulation {simulationId}</div>

        <div style={gridStyle}>
          <div>
            <div style={labelStyle}>Status</div>
            <div style={valueStyle}>
              {simulation?.status ?? "queued"}
            </div>
          </div>
          <div>
            <div style={labelStyle}>Progress</div>
            <div style={valueStyle}>{progress}%</div>
            <div
              style={{
                width: "100%",
                height: "4px",
                borderRadius: "999px",
                backgroundColor: "rgba(255,255,255,0.06)",
                overflow: "hidden",
                marginTop: "6px",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: "999px",
                  transition: "width 200ms ease-out",
                }}
              />
            </div>
          </div>
          <div>
            <div style={labelStyle}>Agent Safety Score</div>
            <div
              style={{
                ...valueStyle,
                color: severityColor(severityScore),
              }}
            >
              {severityScore != null
                ? severityScore.toFixed(2)
                : "—"}
            </div>
          </div>
        </div>

        <div style={sectionTitleStyle}>Attack Category Matrix</div>
        <div
          style={{
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            overflow: "hidden",
            marginBottom: "1.5rem",
          }}
        >
          {ATTACK_CATEGORIES.map((category) => {
            const row = categoryReport[category] ?? {
              runs: 0,
              failures: 0,
              avg_severity: 0,
            };

            const failureRate =
              row.runs > 0
                ? Math.min(
                    100,
                    Math.round((row.failures / row.runs) * 100)
                  )
                : 0;
            const barColor = severityColor(row.avg_severity);

            return (
              <div
                key={category}
                style={{
                  borderBottom: "1px solid var(--border-faint)",
                  padding: "0.6rem 0.75rem",
                  backgroundColor: "rgba(255,255,255,0.02)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 0.7fr 0.7fr 0.7fr",
                    gap: "0.5rem",
                    fontSize: "0.78rem",
                    alignItems: "center",
                    marginBottom: "0.4rem",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <span style={{ color: "var(--text-primary)" }}>
                    {category}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    runs: {row.runs}
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>
                    fail: {row.failures}
                  </span>
                  <span style={{ color: barColor }}>
                    avg: {row.avg_severity.toFixed(2)}
                  </span>
                </div>
                <div
                  style={{
                    width: "100%",
                    height: "3px",
                    borderRadius: "999px",
                    backgroundColor: "rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${failureRate}%`,
                      height: "100%",
                      backgroundColor: barColor,
                      borderRadius: "999px",
                      transition: "width 200ms ease-out",
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
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-subtle)",
            padding: "0.75rem",
            backgroundColor: "rgba(255,255,255,0.02)",
          }}
        >
          {failures.length === 0 ? (
            <div
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
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
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${severityColor(failure.severity)}`,
                    backgroundColor: isSelected
                      ? "rgba(247, 59, 0, 0.1)"
                      : "rgba(255,255,255,0.02)",
                    color: "var(--text-primary)",
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
                      fontFamily: "var(--font-mono)",
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
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                        whiteSpace: "pre-wrap",
                        fontFamily: "var(--font-mono)",
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
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            Selected run: {selectedRunId}
          </div>
        )}
      </section>

      {selectedRunId && (
        <FailureReplayViewer
          simulationId={simulationId}
          runId={selectedRunId}
        />
      )}
    </div>
  );
}
