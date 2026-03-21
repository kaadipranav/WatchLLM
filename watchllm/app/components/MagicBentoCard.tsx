"use client";

import React, { useRef, useEffect, useCallback } from "react";

/* ──────────────────────────────────────────────────────────────
   MagicBentoCard — spotlight + border-glow wrapper
   Based on the MagicBento pattern but stripped down:
     ✗ No stars / particles
     ✗ No tilt / magnetism
     ✓ Spotlight glow that follows cursor
     ✓ Border glow on hover
     ✓ Click ripple
   ────────────────────────────────────────────────────────────── */

const GLOW_COLOR = "247, 59, 0";
const SPOTLIGHT_RADIUS = 350;

function updateCardGlow(
  card: HTMLElement,
  mouseX: number,
  mouseY: number,
  intensity: number
) {
  const rect = card.getBoundingClientRect();
  const rx = ((mouseX - rect.left) / rect.width) * 100;
  const ry = ((mouseY - rect.top) / rect.height) * 100;
  card.style.setProperty("--glow-x", `${rx}%`);
  card.style.setProperty("--glow-y", `${ry}%`);
  card.style.setProperty("--glow-intensity", String(intensity));
}

type Props = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: any;
  /** Set false to skip the hover effect entirely */
  interactive?: boolean;
};

export function MagicBentoCard({
  children,
  className = "",
  style,
  as: Tag = "div",
  interactive = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (e: MouseEvent) => {
      if (!interactive || !ref.current) return;
      updateCardGlow(ref.current, e.clientX, e.clientY, 1);
    },
    [interactive]
  );

  const handleLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.setProperty("--glow-intensity", "0");
  }, []);

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!interactive || !ref.current) return;
      const el = ref.current;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const maxD = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );

      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position:absolute;width:${maxD * 2}px;height:${maxD * 2}px;
        border-radius:50%;pointer-events:none;z-index:100;
        left:${x - maxD}px;top:${y - maxD}px;
        background:radial-gradient(circle,rgba(${GLOW_COLOR},0.25) 0%,rgba(${GLOW_COLOR},0.1) 30%,transparent 70%);
        transform:scale(0);opacity:1;
        transition:transform 0.6s cubic-bezier(.22,1,.36,1),opacity 0.6s ease;
      `;
      el.appendChild(ripple);
      requestAnimationFrame(() => {
        ripple.style.transform = "scale(1)";
        ripple.style.opacity = "0";
      });
      setTimeout(() => ripple.remove(), 700);
    },
    [interactive]
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || !interactive) return;
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    el.addEventListener("click", handleClick);
    return () => {
      el.removeEventListener("mousemove", handleMove);
      el.removeEventListener("mouseleave", handleLeave);
      el.removeEventListener("click", handleClick);
    };
  }, [interactive, handleMove, handleLeave, handleClick]);

  return (
    <Tag
      ref={ref as any}
      className={`magic-bento ${className}`}
      style={
        {
          ...style,
          position: "relative",
          overflow: "hidden",
          "--glow-x": "50%",
          "--glow-y": "50%",
          "--glow-intensity": "0",
          "--glow-radius": `${SPOTLIGHT_RADIUS}px`,
          "--glow-color": GLOW_COLOR,
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
