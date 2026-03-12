"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";
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

const STATUS_BORDER: Record<string, string> = {
  running:  "#00F0FF",
  failed:   "#FF2A8C",
  passed:   "#6E00FF",
  complete: "#6E00FF",
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Page title block (shared between empty + populated states)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function PageHeader({ count }: { count: number }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "22px",
          // Premium Grotesk upgrade for fancy corporate feel
          fontWeight: 640,
          letterSpacing: "-0.02em",
          color: "#ffffff",
          marginBottom: "6px",
          /* Cyber-Plasma Liquid Void: neon heading glow */
          textShadow: "0 0 8px rgba(0, 240, 255, 0.3)",
        }}
      >
        Simulations
      </h1>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          color: "#444",
          letterSpacing: "0.05em",
        }}
      >
        {count > 0 ? `${count} simulation${count !== 1 ? "s" : ""} Â· select to inspect` : "no active simulations"}
      </p>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CLI command copy pill
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CopyPill() {
  const [copied, setCopied] = useState(false);
  const [pillHover, setPillHover] = useState(false);
  const [iconHover, setIconHover] = useState(false);

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
        background: pillHover ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.08)",
        border: "1px solid rgba(0, 240, 255, 0.15)",
        padding: "6px 14px",
        cursor: "default",
        transition: "background 150ms ease",
      }}
      onMouseEnter={() => setPillHover(true)}
      onMouseLeave={() => setPillHover(false)}
    >
      <code
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "#00F0FF",
          userSelect: "all",
          /* Cyber-Plasma Liquid Void: neon code glow */
          textShadow: "0 0 6px rgba(0, 240, 255, 0.3)",
        }}
      >
        {CLI_COMMAND}
      </code>
      <button
        onClick={handleCopy}
        onMouseEnter={() => setIconHover(true)}
        onMouseLeave={() => setIconHover(false)}
        aria-label="Copy command"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          // Premium Grotesk upgrade for fancy corporate feel
          fontFamily: "var(--font-sans)",
          color: copied ? "#00F0FF" : iconHover ? "#00F0FF" : "#444",
          transition: "color 150ms ease",
        }}
      >
        {copied
          ? <Check size={13} strokeWidth={2} />
          : <ClipboardCopy size={13} strokeWidth={2} />
        }
      </button>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Empty state card
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EmptyState() {
  return (
    <div
      className="bento-card plasma-border"
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
          color: "#555",
          maxWidth: "360px",
          lineHeight: 1.6,
        }}
      >
        No simulations found. Launch your first chaos test from the CLI.
      </p>
      <CopyPill />
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Simulation row card (for future populated state)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        /* Cyber-Plasma Liquid Void: glass simulation row */
        background: isActive ? "rgba(0, 240, 255, 0.06)" : "rgba(255,255,255,0.04)",
        border: "none",
        borderLeft: `2px solid ${accentColor}`,
        borderRadius: "4px",
        padding: "12px 16px",
        cursor: "pointer",
        textAlign: "left",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 200ms ease, transform 200ms ease, background 150ms ease",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
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
            color: "#444",
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
          letterSpacing: "0.08em",
        }}
      >
        {sim.status}
      </span>
    </button>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Page
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            color: "#333",
          }}
        >
          fetching simulationsâ€¦
        </p>
      </div>
    );
  }

  // â”€â”€ Empty state â”€â”€
  if (!activeId) {
    return (
      <div style={{ padding: "2rem" }}>
        <PageHeader count={0} />
        <EmptyState />
      </div>
    );
  }

  // â”€â”€ Populated state â”€â”€
  return (
    <div style={{ padding: "2rem" }}>
      <PageHeader count={simulations.length} />

      {simulations.length > 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "24px" }}>
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
          estimatedRuns={simulations.find((s) => s.id === activeId)?.total_runs ?? 0}
        />
      </div>
    </div>
  );
}

