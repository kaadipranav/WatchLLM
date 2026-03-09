"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const NAV_ITEMS = [
  { label: "Simulations", href: "/dashboard" },
  { label: "Agents", href: "/dashboard/agents" },
  { label: "Failures", href: "/dashboard/failures" },
  { label: "Settings", href: "/dashboard/settings" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "200px",
        minHeight: "100vh",
        background: "#000000",
        borderRight: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        fontFamily: "var(--font-mono)",
        flexShrink: 0,
      }}
    >
      <Link
        href="/dashboard"
        style={{
          fontSize: "0.9rem",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          padding: "0 24px",
          marginBottom: "32px",
          color: "#fff",
          textDecoration: "none",
        }}
      >
        WATCHLLM
      </Link>

      <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "8px 24px",
                fontSize: "0.8rem",
                color: isActive ? "#fff" : "rgba(255,255,255,0.45)",
                textDecoration: "none",
                position: "relative",
                letterSpacing: "0.02em",
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "3px",
                    height: "16px",
                    background: "#3B82F6",
                    borderRadius: "0 2px 2px 0",
                  }}
                />
              )}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "0 24px" }}>
        <UserButton
          appearance={{
            elements: {
              avatarBox: { width: "28px", height: "28px" },
            },
          }}
        />
      </div>
    </aside>
  );
}
