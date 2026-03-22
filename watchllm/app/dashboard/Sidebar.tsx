"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";

const NAV_ITEMS = [
  { label: "Simulations", href: "/dashboard" },
  { label: "Projects", href: "/dashboard/projects" },
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
        className="dashboard-sidebar-link"
        href={item.href}
        onMouseEnter={() => setHovered(item.href)}
        onMouseLeave={() => setHovered(null)}
        style={{
          display: "flex",
          alignItems: "center",
          position: "relative",
          padding: "10px 14px",
          fontSize: "12px",
          fontFamily: "'IBM Plex Mono',monospace",
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: isActive
            ? "#ffffff"
            : isHovered
            ? "rgba(255,255,255,0.6)"
            : "rgba(255,255,255,0.4)",
          background: isActive
            ? "rgba(247,59,0,0.14)"
            : isHovered
            ? "rgba(247,59,0,0.08)"
            : "transparent",
          border: isActive
            ? "1px solid rgba(247,59,0,0.45)"
            : "1px solid transparent",
          borderRadius: "4px",
          textDecoration: "none",
          cursor: "pointer",
          transition: "all 150ms ease",
          marginBottom: "4px",
        }}
      >
        <span className="dashboard-sidebar-label">{item.label}</span>
      </Link>
    );
  };

  return (
    <aside
      className="sidebar-glass"
      style={{
        width: "220px",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        flexShrink: 0,
        background: "rgba(10,10,12,0.94)",
        borderRight: "1px solid rgba(247,59,0,0.2)",
      }}
    >
      {/* Wordmark */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 8px",
          marginBottom: "28px",
          textDecoration: "none",
          borderBottom: "1px solid rgba(247,59,0,0.18)",
        }}
      >
        <span
          className="dashboard-wordmark-text"
          style={{
            display: "inline-block",
            fontFamily: "'Manrope',sans-serif",
            fontWeight: 800,
            fontSize: "13px",
            letterSpacing: "0.08em",
            color: "var(--accent)",
            textTransform: "uppercase",
          }}
        >
          ◆ WATCH
        </span>
      </Link>

      {/* Primary nav */}
      <nav style={{ display: "flex", flexDirection: "column", flex: 1, paddingBottom: "16px" }}>
        {NAV_ITEMS.map(renderLink)}
      </nav>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "rgba(247,59,0,0.18)",
          margin: "12px 0",
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
          className="dashboard-account-label"
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
