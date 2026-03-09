"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Simulations", href: "/dashboard" },
  { label: "Agents", href: "/dashboard/agents" },
  { label: "Failures", href: "/dashboard/failures" },
] as const;

const BOTTOM_NAV = [
  { label: "Settings", href: "/dashboard/settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  const renderLink = (item: { label: string; href: string }) => {
    const isActive =
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href);
    const isHovered = hovered === item.href;

    return (
      <Link
        key={item.href}
        href={item.href}
        onMouseEnter={() => setHovered(item.href)}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          paddingTop: "8px",
          paddingBottom: "8px",
          paddingRight: "16px",
          paddingLeft: "16px",
          fontSize: "13px",
          fontFamily: "var(--font-sans)",
          fontWeight: 400,
          color: isActive ? "#ffffff" : isHovered ? "#cccccc" : "#555555",
          background: isActive
            ? "rgba(255,255,255,0.07)"
            : isHovered
            ? "rgba(255,255,255,0.04)"
            : "transparent",
          textDecoration: "none",
          letterSpacing: "0",
          cursor: "pointer",
          transition: "color 150ms ease, background 150ms ease",
        }}
      >
        {/* Animated active indicator — scaleY 0→1 from bottom */}
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "2px",
            background: "#7B61FF",
            transformOrigin: "bottom",
            transform: isActive ? "scaleY(1)" : "scaleY(0)",
            transition: "transform 150ms ease",
          }}
        />
        {item.label}
      </Link>
    );
  };

  return (
    <aside
      style={{
        width: "200px",
        minHeight: "100vh",
        background: "#080808",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        flexShrink: 0,
      }}
    >
      {/* Wordmark */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 16px",
          marginBottom: "32px",
          textDecoration: "none",
        }}
      >
        {/* Cyan vertical bar */}
        <span
          style={{
            display: "inline-block",
            width: "2px",
            height: "12px",
            background: "#00D4FF",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "12px",
            letterSpacing: "0.15em",
            color: "#ffffff",
            textTransform: "uppercase",
          }}
        >
          WatchLLM
        </span>
      </Link>

      {/* Primary nav */}
      <nav style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        {NAV_ITEMS.map(renderLink)}
      </nav>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "rgba(255,255,255,0.05)",
          margin: "8px 0",
        }}
      />

      {/* Secondary nav (Settings) */}
      <nav style={{ display: "flex", flexDirection: "column", marginBottom: "20px" }}>
        {BOTTOM_NAV.map(renderLink)}
      </nav>

      {/* Account area */}
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: "24px", height: "24px" },
            },
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "#333",
          }}
        >
          account
        </span>
      </div>
    </aside>
  );
}
