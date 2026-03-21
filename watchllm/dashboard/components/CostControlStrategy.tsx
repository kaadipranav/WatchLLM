"use client";

import React from "react";

type Props = {
  estimatedRuns: number;
};

export function CostControlStrategy({ estimatedRuns }: Props) {
  const safeRuns = Number.isFinite(estimatedRuns)
    ? Math.max(0, estimatedRuns)
    : 0;

  // Pro plan: $0.02 per additional run
  const estimatedCost = safeRuns * 0.02;

  return (
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
      <div
        style={{
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          marginBottom: "0.5rem",
          fontFamily: "var(--font-mono)",
        }}
      >
        Cost Control Strategy
      </div>

      <div
        style={{
          fontSize: "0.9rem",
          marginBottom: "0.5rem",
          fontFamily: "var(--font-sans)",
          fontWeight: 500,
        }}
      >
        Estimated runs: {safeRuns.toLocaleString("en-US")} | Estimated cost:
        ~${estimatedCost.toFixed(2)}
      </div>

      <div
        style={{
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
        }}
      >
        Based on current configuration and Pro tier pricing
        (&nbsp;$0.02/additional run&nbsp;).
      </div>

      <div
        style={{
          fontSize: "0.82rem",
          marginTop: "0.75rem",
          paddingTop: "0.5rem",
          borderTop: "1px dashed var(--border-subtle)",
          color: "var(--warning)",
          fontFamily: "var(--font-sans)",
        }}
      >
        Sandbox Mode strongly recommended: route all tool calls to a safe test
        environment so agents cannot trigger real-world actions during chaos
        simulations.
      </div>
    </section>
  );
}
