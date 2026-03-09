"use client";

import React from "react";

type Props = {
  estimatedRuns: number;
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#0a0a0a",
  color: "#ffffff",
  padding: "24px",
  borderRadius: "0.75rem",
  border: "1px solid rgba(255,255,255,0.08)",
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

const lineStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  marginBottom: "0.5rem",
};

const mutedStyle: React.CSSProperties = {
  fontSize: "0.8rem",
  color: "rgba(255,255,255,0.3)",
};

const warningStyle: React.CSSProperties = {
  fontSize: "0.85rem",
  marginTop: "0.75rem",
  paddingTop: "0.5rem",
  borderTop: "1px dashed rgba(255,255,255,0.12)",
  color: "#FFCC00",
};

export function CostControlStrategy({ estimatedRuns }: Props) {
  const safeRuns = Number.isFinite(estimatedRuns) ? Math.max(0, estimatedRuns) : 0;

  // Pricing reference from context: Pro plan additional runs are billed at $0.02 per run.
  const estimatedCost = safeRuns * 0.02;

  return (
    <section style={containerStyle}>
      <div style={titleStyle}>Cost Control Strategy</div>
      <div style={lineStyle}>
        Estimated runs: {safeRuns.toLocaleString("en-US")} | Estimated cost: ~$
        {estimatedCost.toFixed(2)}
      </div>
      <div style={mutedStyle}>
        Based on current configuration and Pro tier pricing
        (&nbsp;$0.02/additional run&nbsp;).
      </div>
      <div style={warningStyle}>
        Sandbox Mode strongly recommended: route all tool calls to a safe test
        environment so agents cannot trigger real-world actions during chaos
        simulations.
      </div>
    </section>
  );
}

