"use client";

import MagicBentoCard from "../../components/MagicBentoCard";

export default function AgentsPage() {
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
            textShadow: "0 0 10px rgba(0, 240, 255, 0.25)",
          }}
        >
          Agents
        </h1>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "rgba(255,255,255,0.25)",
            letterSpacing: "0.06em",
          }}
        >
          registered agents · configure via @chaos decorator
        </p>
      </div>

      <MagicBentoCard
        glowColor="0, 240, 255"
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
            background: "rgba(0,240,255,0.08)",
            border: "1px solid rgba(0,240,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "22px",
            margin: "0 auto 1.25rem",
          }}
        >
          🤖
        </div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "15px",
            color: "rgba(255,255,255,0.35)",
            lineHeight: 1.7,
            marginBottom: "1.25rem",
          }}
        >
          Connected agents will appear here once configured.
        </p>
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "#00F0FF",
            background: "rgba(0,240,255,0.06)",
            border: "1px solid rgba(0,240,255,0.15)",
            borderRadius: "4px",
            padding: "6px 14px",
            display: "inline-block",
            textShadow: "0 0 8px rgba(0,240,255,0.4)",
          }}
        >
          @chaos(key=&quot;sk_proj_xxx&quot;)
        </code>
      </MagicBentoCard>
    </div>
  );
}
