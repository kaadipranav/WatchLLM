"use client";

import { useState } from "react";

const CODE_LINES = [
  { indent: 0, parts: [{ c: "kw", t: "from" }, { c: "plain", t: " watchllm " }, { c: "kw", t: "import" }, { c: "plain", t: " chaos" }] },
  { indent: 0, parts: [] },
  {
    indent: 0,
    parts: [
      { c: "dec", t: "@chaos" },
      { c: "plain", t: "(" },
      { c: "arg", t: "key" },
      { c: "plain", t: "=" },
      { c: "str", t: '"sk_proj_xxx"' },
      { c: "plain", t: ")" },
    ],
  },
  {
    indent: 0,
    parts: [
      { c: "kw", t: "def" },
      { c: "plain", t: " " },
      { c: "fn", t: "my_agent" },
      { c: "plain", t: "(" },
      { c: "arg", t: "input" },
      { c: "plain", t: ": " },
      { c: "builtin", t: "str" },
      { c: "plain", t: ") -> " },
      { c: "builtin", t: "str" },
      { c: "plain", t: ":" },
    ],
  },
  { indent: 1, parts: [{ c: "cmt", t: "# your agent code here" }] },
  { indent: 1, parts: [{ c: "plain", t: "..." }] },
];

const COLORS: Record<string, string> = {
  kw: "#c792ea",
  dec: "#82aaff",
  str: "#c3e88d",
  arg: "#f78c6c",
  fn: "#82aaff",
  builtin: "#ffcb6b",
  cmt: "#546e7a",
  plain: "#e0e0e0",
};

export function SdkBlock() {
  const [copied, setCopied] = useState(false);

  const raw = `from watchllm import chaos

@chaos(key="sk_proj_xxx")
def my_agent(input: str) -> str:
    # your agent code here
    ...`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative w-full max-w-2xl rounded-lg border border-white/[0.08] bg-[#050505] overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-2.5 bg-black/50">
        <span
          className="text-[11px] uppercase tracking-wider text-white/40"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          sdk.py
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-wider text-white/70 hover:border-[#00C896]/50 hover:text-white transition-colors"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        className="overflow-x-auto p-5 text-left text-[13px] leading-relaxed"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        <code>
          {CODE_LINES.map((line, i) => (
            <div key={i} className="whitespace-pre">
              {line.indent > 0 ? "    " : ""}
              {line.parts.map((p, j) => (
                <span key={j} style={{ color: COLORS[p.c] ?? COLORS.plain }}>
                  {p.t}
                </span>
              ))}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
