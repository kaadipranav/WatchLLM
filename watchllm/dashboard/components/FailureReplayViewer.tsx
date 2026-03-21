"use client";

import { useEffect, useState } from "react";

type ConversationTurn = {
  attacker: string;
  target: string;
  turn: number;
};

type JudgeResult = {
  failed: boolean;
  severity: number;
  category: string;
  explanation: string;
  suggested_fix?: string;
  rule_triggered: boolean;
};

type TracePayload = {
  simulation_id: string;
  run_id: string;
  purpose: string;
  category: string;
  conversation: ConversationTurn[];
  result: JudgeResult;
};

type Props = {
  simulationId: string;
  runId: string;
};

const containerStyle: React.CSSProperties = {
  color: "#ffffff",
  padding: "24px",
  fontFamily:
    'var(--font-mono, "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace)',
};

const titleStyle: React.CSSProperties = {
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

const explanationStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "rgba(255,255,255,0.45)",
  marginBottom: "1rem",
  whiteSpace: "pre-wrap",
};

const suggestedFixStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  color: "rgba(255,255,255,0.7)",
  marginBottom: "1rem",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.04)",
  whiteSpace: "pre-wrap",
};

function severityColor(severity: number): string {
  if (severity <= 2) return "rgba(255,255,255,0.45)";
  if (severity === 3) return "#FFCC00";
  return "#f73b00";
}

export function FailureReplayViewer({ simulationId, runId }: Props) {
  const [trace, setTrace] = useState<TracePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchTrace = async () => {
      setLoading(true);
      setError(null);
      try {
        // Backend should proxy to R2 using the path:
        // traces/{simulation_id}/{run_id}/full_trace.json.gz
        const res = await fetch(
          `/api/simulation/${simulationId}/replay/${runId}`
        );
        if (!res.ok) {
          throw new Error(`Failed to load replay (${res.status})`);
        }
        const data: TracePayload = await res.json();
        setTrace(data);
      } catch (err: any) {
        setError(err?.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchTrace();
  }, [simulationId, runId]);

  const listStyle: React.CSSProperties = {
    maxHeight: "16rem",
    overflowY: "auto",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  if (loading && !trace) {
    return (
      <section className="bento-card plasma-border" style={containerStyle}>
        <div style={titleStyle}>Failure Replay</div>
        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>
          Loading replay from R2…
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bento-card plasma-border" style={containerStyle}>
        <div style={titleStyle}>Failure Replay</div>
        <div style={{ fontSize: "0.85rem", color: "#f73b00" }}>{error}</div>
      </section>
    );
  }

  if (!trace) {
    return (
      <section className="bento-card plasma-border" style={containerStyle}>
        <div style={titleStyle}>Failure Replay</div>
        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>
          No replay data loaded.
        </div>
      </section>
    );
  }

  const breakingTurnIndex =
    trace.conversation.length > 0 ? trace.conversation.length - 1 : -1;

  return (
    <section className="bento-card plasma-border" style={containerStyle}>
      <div style={titleStyle}>Failure Replay</div>
      <div style={headlineStyle}>
        Simulation {simulationId} · Run {runId}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.5rem",
          fontSize: "0.85rem",
        }}
      >
        <span>Category: {trace.result.category}</span>
        <span
          style={{
            color: severityColor(trace.result.severity),
          }}
        >
          Severity {trace.result.severity}
        </span>
      </div>

      <div style={explanationStyle}>{trace.result.explanation}</div>

      {!trace.result.rule_triggered && trace.result.suggested_fix && (
        <div style={suggestedFixStyle}>
          <div
            style={{
              fontSize: "0.75rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "rgba(255,255,255,0.45)",
              marginBottom: "0.35rem",
            }}
          >
            Suggested Fix
          </div>
          <div>{trace.result.suggested_fix}</div>
        </div>
      )}

      <div style={listStyle}>
        {trace.conversation.map((turn, index) => {
          const isBreaking = index === breakingTurnIndex && trace.result.failed;

          return (
            <div
              key={turn.turn}
              style={{
                padding: "0.75rem 0.85rem",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: isBreaking
                  ? "rgba(247, 59, 0, 0.1)"
                  : "rgba(10, 10, 10, 0.6)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.35rem",
                  fontSize: "0.8rem",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                <span>Turn {turn.turn}</span>
                {isBreaking && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#f73b00",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Breach Point
                  </span>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                  gap: "0.75rem",
                  fontSize: "0.8rem",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Attacker
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{turn.attacker}</div>
                </div>
                <div>
                  <div
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    Agent
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{turn.target}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

