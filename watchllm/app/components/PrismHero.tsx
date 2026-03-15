"use client";

import dynamic from "next/dynamic";

const Prism = dynamic(() => import("./Prism"), { ssr: false });

/**
 * Thin client wrapper so the Server Component page.tsx can nest
 * the WebGL Prism without the "ssr: false in Server Component" error.
 */
export function PrismHero() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <Prism
        animationType="rotate"
        timeScale={0.5}
        height={3.5}
        baseWidth={5.5}
        scale={3.6}
        hueShift={0}
        colorFrequency={1}
        noise={0}
        glow={1}
        transparent={true}
      />
      {/* Dark overlay so copy remains readable over the prism */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.88) 70%, #0A0A0A 100%)",
        }}
      />
    </div>
  );
}
