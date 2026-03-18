"use client";

import { MagicBentoCard } from "../../components/MagicBentoCard";

export default function FailuresPage() {
  return (
    <div style={{ padding: "0" }}>
      <div style={{ marginBottom: "40px", borderBottom: "1px solid #1a1a2e", paddingBottom: "20px" }}>
        <h1
          style={{
            fontFamily: "'Anton',sans-serif",
            fontSize: "42px",
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
            color: "#4a4a6a",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          ATTACK HISTORY & TRIAGE REPORTS
        </p>
      </div>
      <MagicBentoCard
        style={{
          padding: "80px 2rem",
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "13px",
          color: "#8a8a93",
          textAlign: "center",
          background: "rgba(124,110,247,0.02)",
          border: "1px solid rgba(124,110,247,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "280px",
          letterSpacing: "0.02em",
          lineHeight: 1.6,
        }}
      >
        Failure history across all simulations will appear here.
      </MagicBentoCard>
    </div>
  );
}
