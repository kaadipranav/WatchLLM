"use client";

import { MagicBentoCard } from "../../components/MagicBentoCard";

export default function AgentsPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1
        style={{
          fontSize: "1.25rem",
          fontWeight: 650,
          letterSpacing: "-0.025em",
          marginBottom: "1rem",
          color: "var(--text-primary)",
        }}
      >
        Agents
      </h1>
      <MagicBentoCard
        style={{
          padding: "2.5rem",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: "0.85rem",
          color: "var(--text-secondary)",
        }}
      >
        Connected agents will appear here once configured.
      </MagicBentoCard>
    </div>
  );
}
