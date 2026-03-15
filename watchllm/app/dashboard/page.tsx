"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import { SimulationProgressView } from "../../dashboard/components/SimulationProgressView";
import { CostControlStrategy } from "../../dashboard/components/CostControlStrategy";
import MagicBentoCard from "../components/MagicBentoCard";

type SimulationSummary = {
  id: string;
  status: string;
  severity_score: number | null;
  total_runs: number;
  failed_runs: number;
  created_at: string;
};

const CLI_COMMAND = "watchllm attack --agent your-agent.py";

const STATUS_BORDER: Record<string, string> = {
  running:  "#00F0FF",
  failed:   "#FF2A8C",
  passed:   "#6E00FF",
  complete: "#6E00FF",
};

const STATUS_GLOW: Record<string, string> = {
  running:  "0, 240, 255",
  failed:   "255, 42, 140",
  passed:   "110, 0, 255",
  complete: "110, 0, 255",
};

// ── Page header ──────────────────────────────────────────────────────────────
function PageHeader({ count }: { count: number }) {
  return (
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
        Simulations
      </h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.06em",
        }}
      >
        {count > 0
          ? `${count} simulation${count !== 1 ? "s" : ""} · select to inspect`
          : "no active simulations"}
      </p>
    </div>
  );
}

// ── CLI copy pill ─────────────────────────────────────────────────────────────
function CopyPill() {
  const [copied, setCopied] = useState(false);

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
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(0, 240, 255, 0.15)",
        borderRadius: "6px",
        padding: "8px 16px",
        cursor: "default",
      }}
    >
      <code
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "#00F0FF",
          userSelect: "all",
          textShadow: "0 0 8px rgba(0, 240, 255, 0.4)",
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
          color: copied ? "#00F0FF" : "rgba(255,255,255,0.25)",
          transition: "color 150ms ease",
        }}
      >
        {copied ? <Check size={14} strokeWidth={2} /> : <ClipboardCopy size={14} strokeWidth={2} />}
      </button>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <MagicBentoCard
      glowColor="0, 240, 255"
      className="plasma-border"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        padding: "72px 2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
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
        }}
      >
        ⚡
      </div>
      <p
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "15px",
          color: "rgba(255,255,255,0.35)",
          maxWidth: "360px",
          lineHeight: 1.7,
        }}
      >
        No simulations found. Launch your first chaos test from the CLI.
      </p>
      <CopyPill />
    </MagicBentoCard>
  );
}

// ── Simulation row ────────────────────────────────────────────────────────────
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
  const accentColor = STATUS_BORDER[sim.status] ?? "rgba(255,255,255,0.2)";
  const glowColor = STATUS_GLOW[sim.status] ?? "255, 255, 255";

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 40);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <MagicBentoCard
      glowColor={glowColor}
      borderRadius="6px"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 200ms ease, transform 200ms ease",
        background: isActive ? "rgba(0,240,255,0.06)" : "rgba(255,255,255,0.04)",
        border: "none",
        borderLeft: `2px solid ${accentColor}`,
      }}
    >
      <button
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          background: "none",
          border: "none",
          padding: "12px 16px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "#ffffff",
              letterSpacing: "0.02em",
            }}
          >
            {sim.id.slice(0, 8)}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            {new Date(sim.created_at).toISOString().slice(0, 19).replace("T", " ")} · {sim.total_runs} runs
          </span>
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: accentColor,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            textShadow: `0 0 8px rgba(${glowColor}, 0.5)`,
          }}
        >
          {sim.status}
        </span>
      </button>
    </MagicBentoCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
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
      <div style={{ padding: "2.5rem" }}>
        <PageHeader count={0} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "rgba(255,255,255,0.2)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#00F0FF",
              animation: "pulse-glow 1.5s ease-in-out infinite",
            }}
          />
          fetching simulations…
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!activeId) {
    return (
      <div style={{ padding: "2.5rem" }}>
        <PageHeader count={0} />
        <EmptyState />
      </div>
    );
  }

  // ── Populated state ──
  return (
    <div style={{ padding: "2.5rem" }}>
      <PageHeader count={simulations.length} />

      {simulations.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "28px" }}>
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
        <MagicBentoCard
          glowColor="0, 240, 255"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <SimulationProgressView simulationId={activeId} />
        </MagicBentoCard>
        <MagicBentoCard
          glowColor="110, 0, 255"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <CostControlStrategy
            estimatedRuns={simulations.find((s) => s.id === activeId)?.total_runs ?? 0}
          />
        </MagicBentoCard>
      </div>
    </div>
  );
}
