"use client";

import { useEffect, useState } from "react";

const CATEGORIES = [
  "prompt_injection",
  "goal_hijacking",
  "memory_poisoning",
  "tool_abuse",
  "boundary_testing",
  "jailbreak_variants",
] as const;

export function HeroTerminal() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 900);
    return () => clearInterval(id);
  }, []);

  const activeIdx = tick % CATEGORIES.length;
  const progress = Math.min(94, 18 + (tick % 40) * 2);
  const failed = 7 + (tick % 5);
  const passed = 184 + (tick % 12);

  return (
    <div
      className="w-full max-w-[640px] rounded-lg border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
      style={{ fontFamily: "var(--font-mono)" }}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-4 py-2.5 bg-black/40">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[11px] tracking-wide text-white/40">
          watchllm simulate · sim_8f2a91
        </span>
      </div>
      <div className="p-5 text-[12px] leading-relaxed text-white/70">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[#00C896]">●</span>
          <span className="uppercase tracking-wider text-white/45 text-[10px]">
            Running
          </span>
          <span className="text-white/35">|</span>
          <span className="text-white/55">
            Agent reliability sweep · 6 categories
          </span>
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-[#00C896] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mb-4 flex gap-6 text-[11px]">
          <span>
            <span className="text-white/35">failed</span>{" "}
            <span className="text-[#ff6b7a] tabular-nums">{failed}</span>
          </span>
          <span>
            <span className="text-white/35">passed</span>{" "}
            <span className="text-[#00C896] tabular-nums">{passed}</span>
          </span>
          <span>
            <span className="text-white/35">turns</span>{" "}
            <span className="text-white/80 tabular-nums">5 max</span>
          </span>
        </div>
        <div className="space-y-1.5">
          {CATEGORIES.map((cat, i) => {
            const isActive = i === activeIdx;
            const isPast = i < activeIdx;
            return (
              <div
                key={cat}
                className={`flex items-center gap-2 rounded border px-2.5 py-1.5 transition-all duration-300 ${
                  isActive
                    ? "border-[#00C896]/50 bg-[#00C896]/[0.07] text-white"
                    : isPast
                      ? "border-white/[0.06] text-white/40"
                      : "border-white/[0.06] text-white/25"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isActive
                      ? "bg-[#00C896] animate-pulse"
                      : isPast
                        ? "bg-white/25"
                        : "bg-white/10"
                  }`}
                />
                <span className="text-[11px] tracking-wide">{cat}</span>
                {isActive && (
                  <span className="ml-auto text-[10px] uppercase tracking-wider text-[#00C896]/90">
                    probing →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
