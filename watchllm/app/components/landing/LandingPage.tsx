"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMark } from "./LogoMark";
import { HeroTerminal } from "./HeroTerminal";
import {
  ForkReplayVisual,
  GraphReplayVisual,
  StressTestGrid,
} from "./FeatureVisuals";
import { SdkBlock } from "./SdkBlock";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkCls =
    "text-[13px] text-white/55 hover:text-white transition-colors tracking-tight";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-[border-color,background-color] duration-200 ${
        scrolled
          ? "border-b border-white/[0.08] bg-[#080808]/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-white no-underline"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          <LogoMark className="text-[#00C896]" />
          <span className="text-[15px] font-extrabold tracking-tight">
            WatchLLM
          </span>
        </Link>

        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-10">
          <a href="#product" className={linkCls}>
            Product
          </a>
          <Link href="/docs" className={linkCls}>
            Docs
          </Link>
          <a href="#pricing" className={linkCls}>
            Pricing
          </a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="rounded-md border border-white/[0.12] bg-transparent px-4 py-2 text-[13px] font-medium text-white/80 hover:border-white/25 hover:text-white transition-colors no-underline"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md px-4 py-2 text-[13px] font-semibold text-black bg-[#00C896] hover:brightness-110 transition-[filter] no-underline"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden relative h-10 w-10 rounded border border-white/[0.1] bg-white/[0.03]"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span
            className={`absolute left-2 top-[14px] block h-0.5 w-6 bg-white/80 transition-all duration-200 ${
              open ? "top-[19px] rotate-45" : ""
            }`}
          />
          <span
            className={`absolute left-2 top-[19px] block h-0.5 w-6 bg-white/80 transition-opacity duration-200 ${
              open ? "opacity-0" : ""
            }`}
          />
          <span
            className={`absolute left-2 top-[24px] block h-0.5 w-6 bg-white/80 transition-all duration-200 ${
              open ? "top-[19px] -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#080808]/95 backdrop-blur-xl px-4 py-6 flex flex-col gap-4">
          <a href="#product" className={linkCls} onClick={() => setOpen(false)}>
            Product
          </a>
          <Link href="/docs" className={linkCls} onClick={() => setOpen(false)}>
            Docs
          </Link>
          <a href="#pricing" className={linkCls} onClick={() => setOpen(false)}>
            Pricing
          </a>
          <hr className="border-white/[0.08]" />
          <Link
            href="/sign-in"
            className="rounded-md border border-white/[0.12] px-4 py-3 text-center text-[13px] text-white/80 no-underline"
            onClick={() => setOpen(false)}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-[#00C896] px-4 py-3 text-center text-[13px] font-semibold text-black no-underline"
            onClick={() => setOpen(false)}
          >
            Get started
          </Link>
        </div>
      )}
    </header>
  );
}

function ProblemIconSilent() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v4M12 16v4M4 12h4M16 12h4"
        stroke="#00C896"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" stroke="#00C896" strokeWidth="1.5" />
    </svg>
  );
}

function ProblemIconLogs() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="#00C896" strokeWidth="1.5" />
      <path d="M8 9h8M8 12h5M8 15h7" stroke="#00C896" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ProblemIconMoney() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="#00C896" strokeWidth="1.5" />
      <path
        d="M12 8v8M10 10h3a2 2 0 010 4h-3"
        stroke="#00C896"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white antialiased selection:bg-[#00C896]/40">
      <Nav />

      <main className="pt-14">
        {/* HERO */}
        <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24 pt-16 md:pt-24 md:pb-32">
          <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="max-w-xl lg:max-w-[540px]">
              <div
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 backdrop-blur-md"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00C896] opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00C896]" />
                </span>
                <span className="text-[11px] uppercase tracking-wider text-white/55">
                  Agent Reliability Platform
                </span>
              </div>
              <h1
                className="text-[clamp(2.25rem,5vw,3.75rem)] font-extrabold leading-[1.05] tracking-tight text-white"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Your agent works in dev.
                <br />
                WatchLLM makes it work in prod.
              </h1>
              <p
                className="mt-6 text-[17px] leading-snug text-white/50"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Stress test with real failure scenarios. Replay any run graph.
                Fork from any node. Ship agents that don&apos;t embarrass you.
              </p>
              <p
                className="mt-4 text-[13px] font-medium tracking-wide text-[#00C896]"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Stress test. Replay. Fix. Ship.
              </p>
              <p
                className="mt-5 text-[15px] leading-relaxed text-white/40 border-l-2 border-[#00C896]/40 pl-4"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Your agent passed every test. Then it hit production and dropped
                your database. WatchLLM lets you rewind to exactly where it went
                wrong.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/sign-up"
                  className="rounded-md px-6 py-3 text-[14px] font-semibold text-black bg-[#00C896] hover:brightness-110 transition-[filter] no-underline inline-flex"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Start testing free
                </Link>
                <Link
                  href="/docs"
                  className="rounded-md border border-white/[0.12] px-6 py-3 text-[14px] font-medium text-white/75 hover:border-white/25 hover:text-white transition-colors no-underline inline-flex"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Read the docs
                </Link>
              </div>
              <p
                className="mt-8 text-[13px] text-white/35"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                No credit card · Deploy in 5 min · Works with any agent
                framework
              </p>
            </div>
            <HeroTerminal />
          </div>
        </section>

        {/* PROBLEM */}
        <section
          id="product"
          className="border-t border-white/[0.08] bg-[#0a0a0a] py-20 md:py-28"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              {[
                {
                  Icon: ProblemIconSilent,
                  title: "Agents fail silently",
                  body: "You don't know it's broken until a user hits it.",
                },
                {
                  Icon: ProblemIconLogs,
                  title: "Logs don't replay",
                  body: "You see the crash. You can't reproduce it.",
                },
                {
                  Icon: ProblemIconMoney,
                  title: "Every debug costs money",
                  body: "Rerunning agents burns API credits fast.",
                },
              ].map(({ Icon, title, body }) => (
                <div
                  key={title}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl"
                >
                  <Icon />
                  <h3
                    className="mt-4 text-lg font-bold text-white tracking-tight"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {title}
                  </h3>
                  <p
                    className="mt-2 text-[15px] leading-snug text-white/45"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-6xl space-y-24 px-4 sm:px-6 md:space-y-32">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
              <div className="flex-1 order-2 lg:order-1">
                <StressTestGrid />
              </div>
              <div className="flex-1 order-1 lg:order-2">
                <p
                  className="text-[11px] uppercase tracking-widest text-[#00C896]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Stress test
                </p>
                <h2
                  className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Break it before users do
                </h2>
                <p
                  className="mt-4 text-[17px] leading-snug text-white/45 max-w-md"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Run 20+ attack categories against your agent. See exactly
                  which failure modes it can&apos;t handle.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-10 lg:flex-row-reverse lg:items-center lg:gap-16">
              <div className="flex-1">
                <GraphReplayVisual />
              </div>
              <div className="flex-1">
                <p
                  className="text-[11px] uppercase tracking-widest text-[#00C896]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Graph replay
                </p>
                <h2
                  className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Rewind to the exact moment it went wrong
                </h2>
                <p
                  className="mt-4 text-[17px] leading-snug text-white/45 max-w-md"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Every run recorded as a graph. Every decision node inspectable.
                  Time-travel debugging for agents.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
              <div className="flex-1 order-2 lg:order-1">
                <ForkReplayVisual />
              </div>
              <div className="flex-1 order-1 lg:order-2">
                <p
                  className="text-[11px] uppercase tracking-widest text-[#00C896]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  Fork &amp; replay
                </p>
                <h2
                  className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Fix once. Don&apos;t rerun everything.
                </h2>
                <p
                  className="mt-4 text-[17px] leading-snug text-white/45 max-w-md"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Branch from any node in any run. Test your fix from that exact
                  state. Zero wasted API calls.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SDK */}
        <section className="border-t border-white/[0.08] bg-[#0a0a0a] py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
            <h2
              className="text-3xl md:text-4xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Three lines. Any framework. CI/CD ready.
            </h2>
            <div className="mt-10 flex justify-center">
              <SdkBlock />
            </div>
          </div>
        </section>

        {/* METRICS */}
        <section className="py-16 md:py-20 border-t border-white/[0.08]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-white/[0.08]">
              {[
                { k: "20+", sub: "attack categories" },
                { k: "< 5 min", sub: "to first simulation" },
                { k: "100%", sub: "run coverage via graph replay" },
                { k: "0", sub: "cold reruns with fork & replay" },
              ].map((m) => (
                <div key={m.sub} className="text-center px-4 py-2">
                  <div
                    className="text-3xl md:text-4xl font-extrabold text-[#00C896] tabular-nums"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {m.k}
                  </div>
                  <div
                    className="mt-2 text-[12px] uppercase tracking-wider text-white/40"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {m.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="border-t border-white/[0.08] bg-[#0a0a0a] py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              className="text-center text-3xl md:text-4xl font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Pricing
            </h2>
            <p
              className="mx-auto mt-3 max-w-lg text-center text-[15px] text-white/45"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Card billing via Stripe internationally and Razorpay in India.
              Same tiers everywhere—pick your currency at checkout.
            </p>
            <div className="mt-12 grid gap-6 lg:grid-cols-3 lg:gap-8">
              {[
                {
                  name: "Free",
                  price: "$0",
                  limits: [
                    "100 simulation runs / month",
                    "Up to 3 agents",
                    "7-day report retention",
                  ],
                  cta: "Start free",
                  href: "/sign-up" as const,
                  highlight: false,
                },
                {
                  name: "Pro",
                  price: "$20",
                  period: "/mo",
                  limits: [
                    "10,000 runs / month included",
                    "$0.02 per extra run",
                    "Unlimited agents · 90-day retention",
                  ],
                  cta: "Upgrade to Pro",
                  href: "/sign-up" as const,
                  highlight: true,
                },
                {
                  name: "Team",
                  price: "$60",
                  period: "/seat /mo",
                  limits: [
                    "Unlimited runs",
                    "Custom categories · CI/CD hooks",
                    "Slack alerts on severity 4–5",
                  ],
                  cta: "Contact sales",
                  href: "mailto:hello@watchllm.dev?subject=WatchLLM%20Team" as const,
                  highlight: false,
                },
              ].map((tier) => (
                <div
                  key={tier.name}
                  className={`flex flex-col rounded-lg border bg-white/[0.03] p-8 backdrop-blur-xl ${
                    tier.highlight
                      ? "border-[#00C896] shadow-[0_0_40px_rgba(0,200,150,0.08)]"
                      : "border-white/[0.08]"
                  }`}
                >
                  <h3
                    className="text-lg font-bold"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {tier.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span
                      className="text-4xl font-extrabold text-white"
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {tier.price}
                    </span>
                    {"period" in tier && tier.period && (
                      <span className="text-white/40 text-sm">{tier.period}</span>
                    )}
                  </div>
                  <ul className="mt-6 flex-1 space-y-3 text-left">
                    {tier.limits.map((line) => (
                      <li
                        key={line}
                        className="text-[14px] text-white/50 leading-snug"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                  {tier.href.startsWith("mailto:") ? (
                    <a
                      href={tier.href}
                      className={`mt-8 block w-full rounded-md py-3 text-center text-[14px] font-semibold no-underline transition-[filter] border border-white/[0.12] text-white/85 hover:border-white/25`}
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {tier.cta}
                    </a>
                  ) : (
                    <Link
                      href={tier.href}
                      className={`mt-8 block w-full rounded-md py-3 text-center text-[14px] font-semibold no-underline transition-[filter] ${
                        tier.highlight
                          ? "bg-[#00C896] text-black hover:brightness-110"
                          : "border border-white/[0.12] text-white/85 hover:border-white/25"
                      }`}
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {tier.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-white/[0.08] py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <LogoMark className="text-[#00C896]" />
                  <span
                    className="text-[15px] font-extrabold tracking-tight"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    WatchLLM
                  </span>
                </div>
                <p
                  className="mt-2 max-w-xs text-[13px] text-white/40 leading-relaxed"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Agent reliability, from first run to production.
                </p>
              </div>
              <div className="flex flex-wrap gap-8 text-[13px]">
                <div className="flex flex-col gap-2">
                  <a href="#product" className="text-white/55 hover:text-white">
                    Product
                  </a>
                  <Link href="/docs" className="text-white/55 hover:text-white">
                    Docs
                  </Link>
                  <a
                    href="https://github.com/watchllm"
                    className="text-white/55 hover:text-white"
                    rel="noopener noreferrer"
                  >
                    GitHub
                  </a>
                  <a href="#" className="text-white/55 hover:text-white">
                    Status
                  </a>
                </div>
              </div>
              <p
                className="text-[13px] text-white/35 max-w-[200px]"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Built for engineers who ship agents
              </p>
            </div>
            <div
              className="mt-12 flex flex-col gap-3 border-t border-white/[0.08] pt-8 text-[12px] text-white/30 sm:flex-row sm:justify-between"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              <span>© {new Date().getFullYear()} WatchLLM</span>
              <div className="flex gap-6">
                <a href="#" className="hover:text-white/50">
                  Privacy
                </a>
                <a href="#" className="hover:text-white/50">
                  Terms
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
