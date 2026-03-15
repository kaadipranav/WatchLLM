"use client";

import React, { useRef, useEffect, useCallback } from "react";
import gsap from "gsap";

/**
 * MagicBentoCard — wrapper that applies the MagicBento spotlight + border-glow
 * effect to ANY children. No stars / particle system (enableStars=false).
 *
 * Usage:
 *   <MagicBentoCard glowColor="0, 240, 255">
 *     ... any content ...
 *   </MagicBentoCard>
 */

interface MagicBentoCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glowColor?: string;          // "r, g, b"  e.g. "132, 0, 255"
  enableBorderGlow?: boolean;
  enableTilt?: boolean;
  clickEffect?: boolean;
  borderRadius?: string;
}

const MagicBentoCard: React.FC<MagicBentoCardProps> = ({
  children,
  className = "",
  style,
  glowColor = "0, 240, 255",
  enableBorderGlow = true,
  enableTilt = false,
  clickEffect = true,
  borderRadius = "12px",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const updateGlowCSS = useCallback(
    (el: HTMLDivElement, mouseX: number, mouseY: number) => {
      const rect = el.getBoundingClientRect();
      const relativeX = ((mouseX - rect.left) / rect.width) * 100;
      const relativeY = ((mouseY - rect.top) / rect.height) * 100;
      el.style.setProperty("--glow-x", `${relativeX}%`);
      el.style.setProperty("--glow-y", `${relativeY}%`);
    },
    []
  );

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      updateGlowCSS(el, e.clientX, e.clientY);
      el.style.setProperty("--glow-intensity", "1");

      if (enableTilt) {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / rect.height) * -8;
        const rotateY = ((x - rect.width / 2) / rect.width) * 8;
        gsap.to(el, {
          rotateX,
          rotateY,
          duration: 0.15,
          ease: "power2.out",
          transformPerspective: 1000,
        });
      }
    };

    const handleMouseLeave = () => {
      el.style.setProperty("--glow-intensity", "0");
      if (enableTilt) {
        gsap.to(el, { rotateX: 0, rotateY: 0, duration: 0.3, ease: "power2.out" });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const maxDistance = Math.max(
        Math.hypot(x, y),
        Math.hypot(x - rect.width, y),
        Math.hypot(x, y - rect.height),
        Math.hypot(x - rect.width, y - rect.height)
      );
      const ripple = document.createElement("div");
      ripple.style.cssText = `
        position:absolute;
        width:${maxDistance * 2}px;
        height:${maxDistance * 2}px;
        border-radius:50%;
        background:radial-gradient(circle,rgba(${glowColor},0.35) 0%,rgba(${glowColor},0.15) 30%,transparent 70%);
        left:${x - maxDistance}px;
        top:${y - maxDistance}px;
        pointer-events:none;
        z-index:100;
      `;
      el.appendChild(ripple);
      gsap.fromTo(
        ripple,
        { scale: 0, opacity: 1 },
        { scale: 1, opacity: 0, duration: 0.7, ease: "power2.out", onComplete: () => ripple.remove() }
      );
    };

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("click", handleClick);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("click", handleClick);
    };
  }, [updateGlowCSS, enableTilt, clickEffect, glowColor]);

  const borderGlowAfter: React.CSSProperties = enableBorderGlow
    ? {}
    : {};

  return (
    <>
      <style>{`
        .magic-bento-card {
          --glow-x: 50%;
          --glow-y: 50%;
          --glow-intensity: 0;
          position: relative;
          overflow: hidden;
          transition: transform 300ms cubic-bezier(0.18,0.89,0.32,1.28), box-shadow 300ms ease, border-color 300ms ease;
        }
        .magic-bento-card:hover {
          transform: translateY(-3px) scale(1.005);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(${glowColor}, 0.15);
        }
        .magic-bento-card.with-border-glow::after {
          content: '';
          position: absolute;
          inset: 0;
          padding: 1px;
          background: radial-gradient(
            200px circle at var(--glow-x) var(--glow-y),
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.9)) 0%,
            rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 35%,
            transparent 65%
          );
          border-radius: inherit;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          pointer-events: none;
          z-index: 2;
        }
      `}</style>
      <div
        ref={cardRef}
        className={`magic-bento-card ${enableBorderGlow ? "with-border-glow" : ""} ${className}`}
        style={{
          borderRadius,
          ...style,
        }}
      >
        {children}
      </div>
    </>
  );
};

export default MagicBentoCard;
