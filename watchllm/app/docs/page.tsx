import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "WatchLLM documentation — agent reliability platform: SDK, CLI, and simulations.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col items-center justify-center px-6">
      <h1
        className="text-3xl font-extrabold tracking-tight text-center"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Documentation
      </h1>
      <p
        className="mt-4 max-w-md text-center text-white/45 text-[15px] leading-relaxed"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Full docs are shipping next. For now, install the Python SDK and CLI from
        the repo, or open the quickstart in{" "}
        <code
          className="text-[#00C896]"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          docs/quickstart.md
        </code>
        .
      </p>
      <Link
        href="/"
        className="mt-10 text-[14px] text-[#00C896] hover:underline"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        ← Back home
      </Link>
    </div>
  );
}
