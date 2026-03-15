"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import { MagicBentoCard } from "../components/MagicBentoCard";
import { SimulationProgressView } from "../../dashboard/components/SimulationProgressView";
import { CostControlStrategy } from "../../dashboard/components/CostControlStrategy";

type SimulationSummary = {
  id: string;
  status: string;
  severity_score: number | null;
  total_runs: number;
  failed_runs: number;
  created_at: string;
};

const CLI_COMMAND = "watchllm attack --agent your-agent.py";

const STATUS_COLOR: Record<string, string> = {
  running:  "var(--accent)",
  failed:   "var(--danger)",
  passed:   "var(--success)",
  complete: "var(--success)",
};

// ──────────────────────────────────────────────────────
// Page header
// ──────────────────────────────────────────────────────
function PageHeader({ count }: { count: number }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "24px",
          fontWeight: 650,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          marginBottom: "6px",
        }}
      >
        Simulations
      </h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "var(--text-muted)",
          letterSpacing: "0.04em",
        }}
      >
        {count > 0
          ? `${count} simulation${count !== 1 ? "s" : ""} · select to inspect`
          : "no active simulations"}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// CLI command copy pill
// ──────────────────────────────────────────────────────
function CopyPill() {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(CLI_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  };

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
        background: hover
          ? "rgba(255,255,255,0.06)"
          : "rgba(255,255,255,0.04)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 14px",
        cursor: "default",
        transition: "background 150ms ease",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <code
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--accent)",
          userSelect: "all",
        }}
      >
        {CLI_COMMAND}
      </code>
      <button
        onClick={handleCopy}
        aria-label="Copy command"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          color: copied ? "var(--accent)" : "var(--text-muted)",
          transition: "color 150ms ease",
        }}
      >
        {copied ? (
          <Check size={13} strokeWidth={2} />
        ) : (
          <ClipboardCopy size={13} strokeWidth={2} />
        )}
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────
function EmptyState() {
  return (
    <MagicBentoCard
      style={{
        padding: "60px 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "20px",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "14px",
          color: "var(--text-secondary)",
          maxWidth: "360px",
          lineHeight: 1.6,
        }}
      >
        No simulations found. Launch your first chaos test from the CLI.
      </p>
      <CopyPill />
    </MagicBentoCard>
  );
}

// ──────────────────────────────────────────────────────
// Simulation row card
// ──────────────────────────────────────────────────────
function SimulationRow({
  sim,
  index,
  isActive,
  onClick,
}: {
  sim: SimulationSummary;
  index: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const accentColor = STATUS_COLOR[sim.status] ?? "var(--text-muted)";

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 40);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        background: isActive
          ? "rgba(140, 92, 245, 0.06)"
          : "rgba(255,255,255,0.03)",
        border: "none",
        borderLeft: `2px solid ${accentColor}`,
        borderRadius: "6px",
        padding: "12px 16px",
        cursor: "pointer",
        textAlign: "left",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 200ms ease, transform 200ms ease, background 150ms ease",
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: "4px" }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--text-primary)",
            letterSpacing: "0.02em",
          }}
        >
          {sim.id.slice(0, 8)}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--text-muted)",
          }}
        >
          {new Date(sim.created_at)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")}{" "}
          · {sim.total_runs} runs
        </span>
      </div>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          color: accentColor,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {sim.status}
      </span>
    </button>
  );
}

// ──────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const [simulations, setSimulations] = useState<SimulationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimulations = async () => {
      try {
        const res = await fetch("/api/simulations");
        if (res.ok) {
          const data: SimulationSummary[] = await res.json();
          setSimulations(data);
          const running = data.find((s) => s.status === "running");
          setActiveId(running ? running.id : data[0]?.id ?? null);
        }
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    };
    fetchSimulations();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <PageHeader count={0} />
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          fetching simulations…
        </p>
      </div>
    );
  }

  // ── Empty state ──
  if (!activeId) {
    return (
      <div style={{ padding: "2rem" }}>
        <PageHeader count={0} />
        <EmptyState />
      </div>
    );
  }

  // ── Populated state ──
  return (
    <div style={{ padding: "2rem" }}>
      <PageHeader count={simulations.length} />

      {simulations.length > 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginBottom: "24px",
          }}
        >
          {simulations.map((sim, i) => (
            <SimulationRow
              key={sim.id}
              sim={sim}
              index={i}
              isActive={activeId === sim.id}
              onClick={() => setActiveId(sim.id)}
            />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gap: "1.5rem" }}>
        <SimulationProgressView simulationId={activeId} />
        <CostControlStrategy
          estimatedRuns={
            simulations.find((s) => s.id === activeId)?.total_runs ?? 0
          }
        />
      </div>
    </div>
  );
}
