"use client";

import { useEffect, useState } from "react";

const STRESS_LABELS = [
  "prompt injection",
  "hallucination",
  "tool abuse",
  "context poisoning",
  "infinite loops",
  "goal hijacking",
  "memory poisoning",
  "boundary drift",
] as const;

export function StressTestGrid() {
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setPulse((p) => (p + 1) % STRESS_LABELS.length),
      700
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 w-full max-w-xl">
      {STRESS_LABELS.map((label, i) => {
        const hot = (pulse + i) % 4 === 0;
        return (
          <div
            key={label}
            className={`rounded border border-white/[0.08] px-2 py-3 text-center text-[10px] uppercase tracking-wider transition-all duration-500 ${
              hot
                ? "bg-[#00C896]/15 text-white border-[#00C896]/40 shadow-[0_0_20px_rgba(0,200,150,0.12)]"
                : "bg-white/[0.03] text-white/45"
            }`}
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}

export function GraphReplayVisual() {
  return (
    <div
      className="relative w-full max-w-xl rounded-lg border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <svg viewBox="0 0 360 200" className="w-full h-auto" aria-hidden>
        <defs>
          <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>
        </defs>
        <line x1="60" y1="100" x2="150" y2="55" stroke="url(#edge)" strokeWidth="2" />
        <line x1="60" y1="100" x2="150" y2="145" stroke="url(#edge)" strokeWidth="2" />
        <line x1="150" y1="55" x2="250" y2="100" stroke="url(#edge)" strokeWidth="2" />
        <line x1="150" y1="145" x2="250" y2="100" stroke="url(#edge)" strokeWidth="2" />
        <line x1="250" y1="100" x2="310" y2="100" stroke="url(#edge)" strokeWidth="2" />
        <circle cx="60" cy="100" r="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
        <circle cx="150" cy="55" r="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
        <circle
          cx="150"
          cy="145"
          r="12"
          fill="rgba(255,80,90,0.25)"
          stroke="#ff6b7a"
          strokeWidth="2"
          className="animate-pulse"
        />
        <circle cx="250" cy="100" r="10" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
        <circle cx="310" cy="100" r="10" fill="rgba(0,200,150,0.15)" stroke="#00C896" strokeWidth="1.5" />
        <text x="60" y="104" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
          user
        </text>
        <text x="150" y="59" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
          plan
        </text>
        <text x="150" y="149" textAnchor="middle" fill="#ff8a94" fontSize="9">
          tool
        </text>
        <text x="250" y="104" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9">
          judge
        </text>
        <text x="310" y="104" textAnchor="middle" fill="#00C896" fontSize="9">
          out
        </text>
      </svg>
      <div className="mt-2 space-y-1">
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-white/35">
          <span>t — 0ms</span>
          <span className="text-[#ff6b7a]">failure @ node · tool</span>
          <span>t — 840ms</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-white/20 to-[#ff6b7a]/80" />
        </div>
      </div>
    </div>
  );
}

export function ForkReplayVisual() {
  return (
    <div
      className="relative w-full max-w-xl rounded-lg border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-6"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <svg viewBox="0 0 360 220" className="w-full h-auto" aria-hidden>
        <path
          d="M40 110 L120 110 L120 70 L200 50"
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
        />
        <path
          d="M120 110 L120 150 L200 170"
          fill="none"
          stroke="rgba(0,200,150,0.45)"
          strokeWidth="2"
        />
        <rect x="20" y="98" width="40" height="24" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" />
        <rect x="200" y="38" width="140" height="28" rx="4" fill="rgba(255,80,90,0.12)" stroke="#ff6b7a" />
        <rect x="200" y="156" width="140" height="28" rx="4" fill="rgba(0,200,150,0.1)" stroke="#00C896" />
        <rect x="108" y="98" width="24" height="24" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" />
        <text x="40" y="114" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="9">
          fork
        </text>
        <text x="270" y="56" textAnchor="middle" fill="#ff8a94" fontSize="10">
          original (failed)
        </text>
        <text x="270" y="174" textAnchor="middle" fill="#00C896" fontSize="10">
          fix (passed)
        </text>
      </svg>
    </div>
  );
}
