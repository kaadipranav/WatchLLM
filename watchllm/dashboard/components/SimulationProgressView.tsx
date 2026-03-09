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

type Props = {
  simulationId: string;
};

const backgroundStyle: React.CSSProperties = {
  backgroundColor: "#020617", // near-black
  color: "#f9fafb", // very light gray
  padding: "1.5rem",
  borderRadius: "0.75rem",
  border: "1px solid #1f2937",
  fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#9ca3af",
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
  color: "#9ca3af",
  marginBottom: "0.25rem",
};

const valueStyle: React.CSSProperties = {
  fontSize: "1rem",
};

function severityColor(severity: number | null | undefined): string {
  if (severity == null) return "#9ca3af"; // neutral gray
  if (severity <= 2) return "#22c55e"; // green (safe)
  if (severity === 3) return "#eab308"; // yellow (warning)
  return "#ef4444"; // red (failure)
}

export function SimulationProgressView({ simulationId }: Props) {
  const [simulation, setSimulation] = useState<SimulationRow | null>(null);
  const [failures, setFailures] = useState<FailureSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

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
    backgroundColor: "#111827",
    overflow: "hidden",
  };

  const progressBarFill: React.CSSProperties = {
    width: `${progress}%`,
    height: "100%",
    backgroundColor: "#4b5563", // neutral gray; severity colors are reserved
    transition: "width 150ms ease-out",
  };

  const wrapperStyle: React.CSSProperties = {
    display: "grid",
    gap: "1rem",
  };

  return (
    <div style={wrapperStyle}>
      <section style={backgroundStyle}>
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

        <div style={sectionTitleStyle}>Live Failures</div>
        <div
          style={{
            maxHeight: "12rem",
            overflowY: "auto",
            borderRadius: "0.5rem",
            border: "1px solid #111827",
            padding: "0.75rem",
            backgroundColor: "#020617",
          }}
        >
          {failures.length === 0 ? (
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
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
                    backgroundColor: isSelected ? "#111827" : "#020617",
                    color: "#f9fafb",
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
                        color: "#9ca3af",
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
              color: "#9ca3af",
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

