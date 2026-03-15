"use client";

import MagicBentoCard from "../../components/MagicBentoCard";

export default function FailuresPage() {
  return (
    <div style={{ padding: "2.5rem" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "#ffffff",
            marginBottom: "6px",
            textShadow: "0 0 10px rgba(255, 42, 140, 0.25)",
          }}
        >
          Failures
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.06em",
          }}
        >
          all failure events across simulations
        </p>
      </div>

      <MagicBentoCard
        glowColor="255, 42, 140"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "3rem 2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: "rgba(255,42,140,0.08)",
            border: "1px solid rgba(255,42,140,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            margin: "0 auto 1.25rem",
          }}
        >
          ⚠️
        </div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "15px",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.7,
          }}
        >
          Failure history across all simulations will appear here.
        </p>
      </MagicBentoCard>
    </div>
  );
}
