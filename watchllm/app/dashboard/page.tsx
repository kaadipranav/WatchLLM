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
    <div style={{ marginBottom: "40px", borderBottom: "1px solid #1a1a2e", paddingBottom: "20px" }}>
      <h1
        style={{
          fontFamily: "'Manrope',sans-serif",
          fontSize: "42px",
          fontWeight: 800,
          letterSpacing: "0.02em",
          color: "#ffffff",
          marginBottom: "12px",
          textTransform: "uppercase",
        }}
      >
        SIMULATIONS
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
        {count > 0
          ? `${count} ACTIVE · SELECT TO INSPECT`
          : "NO ACTIVE SIMULATIONS"}
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
        gap: "12px",
        background: hover
          ? "rgba(124,110,247,0.1)"
          : "rgba(124,110,247,0.05)",
        border: "1px solid rgba(124,110,247,0.3)",
        borderRadius: "4px",
        padding: "10px 16px",
        cursor: "default",
        transition: "all 200ms ease",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <code
        style={{
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "11px",
          color: "#a594ff",
          userSelect: "all",
          letterSpacing: "0.05em",
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
          color: copied ? "#39d98a" : "#7c6ef7",
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
        padding: "80px 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "28px",
        textAlign: "center",
        background: "rgba(124,110,247,0.02)",
        border: "1px solid rgba(124,110,247,0.1)",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "13px",
            color: "#8a8a93",
            maxWidth: "420px",
            lineHeight: 1.7,
            letterSpacing: "0.02em",
          }}
        >
          No simulations found. Launch your first chaos test from the CLI.
        </p>
      </div>
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
          ? "rgba(124,110,247,0.1)"
          : "rgba(26,26,46,0.4)",
        border: isActive ? "1px solid rgba(124,110,247,0.5)" : "1px solid #1a1a2e",
        borderRadius: "4px",
        padding: "14px 16px",
        cursor: "pointer",
        textAlign: "left",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 200ms ease, transform 200ms ease, background 150ms ease",
      }}
    >
      <div
        style={{ display: "flex", flexDirection: "column", gap: "6px" }}
      >
        <span
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12px",
            color: "#ffffff",
            letterSpacing: "0.05em",
            fontWeight: 500,
          }}
        >
          {sim.id.slice(0, 8)}
        </span>
        <span
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "10px",
            color: "#4a4a6a",
            letterSpacing: "0.02em",
          }}
        >
          {new Date(sim.created_at)
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")}{" "}
          · {sim.total_runs} RUNS
        </span>
      </div>
      <span
        style={{
          fontFamily: "'IBM Plex Mono',monospace",
          fontSize: "11px",
          color: accentColor,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          fontWeight: 600,
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
      <div style={{ padding: "0" }}>
        <PageHeader count={0} />
        <p
          style={{
            fontFamily: "'IBM Plex Mono',monospace",
            fontSize: "12px",
            color: "#4a4a6a",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          FETCHING SIMULATIONS…
        </p>
      </div>
    );
  }

  // ── Empty state ──
  if (!activeId) {
    return (
      <div style={{ padding: "0" }}>
        <PageHeader count={0} />
        <EmptyState />
      </div>
    );
  }

  // ── Populated state ──
  return (
    <div style={{ padding: "0" }}>
      <PageHeader count={simulations.length} />

      {simulations.length > 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            marginBottom: "32px",
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

      <div style={{ display: "grid", gap: "24px" }}>
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
