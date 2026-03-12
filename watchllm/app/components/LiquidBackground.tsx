"use client";

// Cyber-Plasma Liquid Void: full-screen living liquid plasma background
// Layered radial/conic gradients with mouse parallax + metaball flow
// GPU-accelerated, 60fps, no heavy dependencies

import { useEffect, useRef, useCallback } from "react";

export function LiquidBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const rafRef = useRef<number>(0);

  // Cyber-Plasma Liquid Void: mouse/gyro parallax (max 3px shift)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = {
      x: e.clientX / window.innerWidth,
      y: e.clientY / window.innerHeight,
    };
  }, []);

  useEffect(() => {
    // Cyber-Plasma Liquid Void: touch device detection — skip parallax
    const isTouch = window.matchMedia("(hover: none)").matches;
    if (isTouch) return;

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    const animate = () => {
      if (containerRef.current) {
        const dx = (mouseRef.current.x - 0.5) * 3; // max 3px
        const dy = (mouseRef.current.y - 0.5) * 3;
        containerRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
      }
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [handleMouseMove]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "#0A0A0A",
      }}
    >
      {/* Cyber-Plasma Liquid Void: parallax-shifting plasma container */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          inset: "-20px",
          willChange: "transform",
        }}
      >
        {/* Cyber-Plasma Liquid Void: plasma vein 1 — electric cyan */}
        <div
          className="plasma-vein-1"
          style={{
            position: "absolute",
            width: "70vmax",
            height: "70vmax",
            top: "-15%",
            left: "5%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 40% 40%, rgba(0, 240, 255, 0.18) 0%, transparent 70%)",
            filter: "blur(80px)",
            mixBlendMode: "screen",
            animation: "plasma-flow-1 28s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />

        {/* Cyber-Plasma Liquid Void: plasma vein 2 — deep violet */}
        <div
          className="plasma-vein-2"
          style={{
            position: "absolute",
            width: "60vmax",
            height: "60vmax",
            bottom: "-10%",
            right: "-5%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 60% 60%, rgba(110, 0, 255, 0.14) 0%, transparent 70%)",
            filter: "blur(90px)",
            mixBlendMode: "screen",
            animation: "plasma-flow-2 32s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />

        {/* Cyber-Plasma Liquid Void: plasma vein 3 — hot magenta */}
        <div
          className="plasma-vein-3"
          style={{
            position: "absolute",
            width: "55vmax",
            height: "55vmax",
            top: "35%",
            left: "-10%",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at 50% 50%, rgba(255, 42, 140, 0.10) 0%, transparent 65%)",
            filter: "blur(100px)",
            mixBlendMode: "screen",
            animation: "plasma-flow-3 35s ease-in-out infinite alternate",
            willChange: "transform",
          }}
        />

        {/* Cyber-Plasma Liquid Void: conic overlay for data-current feel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "conic-gradient(from 180deg at 50% 50%, rgba(0, 240, 255, 0.03) 0deg, transparent 60deg, rgba(110, 0, 255, 0.03) 120deg, transparent 180deg, rgba(255, 42, 140, 0.02) 240deg, transparent 360deg)",
            animation: "plasma-conic-rotate 45s linear infinite",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}
