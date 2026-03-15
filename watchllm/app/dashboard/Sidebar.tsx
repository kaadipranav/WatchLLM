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
          padding: "9px 16px",
          fontSize: "13px",
          fontFamily: "var(--font-sans)",
          fontWeight: isActive ? 500 : 400,
          color: isActive
            ? "#ffffff"
            : isHovered
            ? "rgba(255,255,255,0.7)"
            : "rgba(255,255,255,0.35)",
          background: isActive
            ? "rgba(140, 92, 245, 0.08)"
            : isHovered
            ? "rgba(255,255,255,0.03)"
            : "transparent",
          textDecoration: "none",
          letterSpacing: "-0.01em",
          cursor: "pointer",
          transition: "color 150ms ease, background 150ms ease",
        }}
      >
        {/* Active indicator */}
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "2px",
            background: "var(--accent)",
            transformOrigin: "bottom",
            transform: isActive ? "scaleY(1)" : "scaleY(0)",
            transition: "transform 150ms ease",
            borderRadius: "0 2px 2px 0",
          }}
        />
        {item.label}
      </Link>
    );
  };

  return (
    <aside
      className="sidebar-glass"
      style={{
        width: "200px",
        minHeight: "100vh",
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
        <span
          style={{
            display: "inline-block",
            width: "3px",
            height: "14px",
            background: "var(--accent)",
            borderRadius: "2px",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: "12px",
            letterSpacing: "0.12em",
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
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
          margin: "8px 0",
        }}
      />

      {/* Secondary nav */}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          marginBottom: "20px",
        }}
      >
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
            color: "rgba(255,255,255,0.2)",
          }}
        >
          account
        </span>
      </div>
    </aside>
  );
}
