"use client";

import { useEffect } from "react";

type TerminalUpdates = {
  status?: string;
  category?: string;
  rule?: string;
  severity?: string;
  report?: string;
};

export type TerminalEntry = {
  type: "cmd" | "meta" | "warn" | "alert" | "outcome";
  text: string;
  badge?: string;
  updates?: TerminalUpdates;
};

type Props = {
  terminalSequence: TerminalEntry[];
};

export function LandingPageEffects({ terminalSequence }: Props) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timeoutIds = new Set<number>();
    const listenerCleanups: Array<() => void> = [];
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const id = window.setTimeout(() => {
          timeoutIds.delete(id);
          resolve();
        }, ms);
        timeoutIds.add(id);
      });

    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );

    if (!prefersReducedMotion && "IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.setAttribute("data-reveal-state", "visible");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.16 },
      );

      revealItems.forEach((item) => observer.observe(item));
      listenerCleanups.push(() => observer.disconnect());
    } else {
      revealItems.forEach((item) => item.setAttribute("data-reveal-state", "visible"));
    }

    const buttons = Array.from(
      document.querySelectorAll<HTMLElement>("[data-ink-button]"),
    );

    const setInkOrigin = (button: HTMLElement, x: number, y: number) => {
      const rect = button.getBoundingClientRect();
      const maxX = Math.max(x, rect.width - x);
      const maxY = Math.max(y, rect.height - y);
      const size = Math.hypot(maxX, maxY) * 2;

      button.style.setProperty("--ink-x", `${x}px`);
      button.style.setProperty("--ink-y", `${y}px`);
      button.style.setProperty("--ink-size", `${size}px`);
    };

    buttons.forEach((button) => {
      const centerX = button.clientWidth / 2;
      const centerY = button.clientHeight / 2;
      setInkOrigin(button, centerX, centerY);

      const handlePointer = (event: PointerEvent) => {
        const rect = button.getBoundingClientRect();
        setInkOrigin(button, event.clientX - rect.left, event.clientY - rect.top);
      };

      const handleFocus = () => {
        setInkOrigin(button, button.clientWidth / 2, button.clientHeight / 2);
      };

      button.addEventListener("pointerenter", handlePointer);
      button.addEventListener("pointermove", handlePointer);
      button.addEventListener("focus", handleFocus);

      listenerCleanups.push(() => {
        button.removeEventListener("pointerenter", handlePointer);
        button.removeEventListener("pointermove", handlePointer);
        button.removeEventListener("focus", handleFocus);
      });
    });

    const terminalLines = document.getElementById("terminalLines");
    const statusPill = document.getElementById("statusPill");
    const metricCategory = document.getElementById("metricCategory");
    const metricRule = document.getElementById("metricRule");
    const metricSeverity = document.getElementById("metricSeverity");
    const metricReport = document.getElementById("metricReport");

    if (
      !terminalLines ||
      !statusPill ||
      !metricCategory ||
      !metricRule ||
      !metricSeverity ||
      !metricReport
    ) {
      return () => {
        listenerCleanups.forEach((cleanup) => cleanup());
        timeoutIds.forEach((id) => window.clearTimeout(id));
      };
    }

    const resetTelemetry = () => {
      statusPill.textContent = "Armed";
      statusPill.classList.remove("is-failed");
      metricCategory.textContent = "Awaiting attack loadout";
      metricRule.textContent = "None";
      metricSeverity.textContent = "Pending";
      metricReport.textContent =
        "Stress run will surface the first breakage path that survives your agent's current guardrails.";
    };

    const applyUpdates = (updates: TerminalUpdates = {}) => {
      if (updates.status) {
        statusPill.textContent = updates.status;
        if (updates.status === "FAILED") {
          statusPill.classList.add("is-failed");
        }
      }

      if (updates.category) metricCategory.textContent = updates.category;
      if (updates.rule) metricRule.textContent = updates.rule;
      if (updates.severity) metricSeverity.textContent = updates.severity;
      if (updates.report) metricReport.textContent = updates.report;
    };

    const typeTerminalLine = async (entry: TerminalEntry) => {
      const line = document.createElement("div");
      line.className = `terminal-line ${entry.type}`;

      if (entry.type === "cmd") {
        const prefix = document.createElement("span");
        prefix.className = "terminal-prefix";
        prefix.textContent = ">";
        line.appendChild(prefix);
      }

      if (entry.badge) {
        const badge = document.createElement("span");
        badge.className = "terminal-badge";
        badge.textContent = entry.badge;
        line.appendChild(badge);
      }

      const text = document.createElement("span");
      line.appendChild(text);

      const cursor = document.createElement("span");
      cursor.className = "terminal-cursor";
      line.appendChild(cursor);

      terminalLines.appendChild(line);

      for (const char of entry.text) {
        if (cancelled) return;
        text.textContent += char;
        await sleep(entry.type === "cmd" ? 14 : 10);
      }

      cursor.remove();
      applyUpdates(entry.updates);
      await sleep(entry.badge ? 780 : 260);
    };

    const runTerminal = async () => {
      if (prefersReducedMotion) {
        resetTelemetry();
        terminalLines.innerHTML = "";

        terminalSequence.forEach((entry) => {
          const line = document.createElement("div");
          line.className = `terminal-line ${entry.type}`;

          if (entry.type === "cmd") {
            const prefix = document.createElement("span");
            prefix.className = "terminal-prefix";
            prefix.textContent = ">";
            line.appendChild(prefix);
          }

          if (entry.badge) {
            const badge = document.createElement("span");
            badge.className = "terminal-badge";
            badge.textContent = entry.badge;
            line.appendChild(badge);
          }

          const text = document.createElement("span");
          text.textContent = entry.text;
          line.appendChild(text);
          terminalLines.appendChild(line);
          applyUpdates(entry.updates);
        });

        return;
      }

      while (!cancelled) {
        terminalLines.innerHTML = "";
        resetTelemetry();

        for (const entry of terminalSequence) {
          if (cancelled) break;
          await typeTerminalLine(entry);
        }

        if (cancelled) break;
        await sleep(1500);
      }
    };

    void runTerminal();

    return () => {
      cancelled = true;
      listenerCleanups.forEach((cleanup) => cleanup());
      timeoutIds.forEach((id) => window.clearTimeout(id));
    };
  }, [terminalSequence]);

  return null;
}
