"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  {
    group: "Monitor",
    items: [
      {
        href: "/",
        label: "Overview",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        ),
      },
      {
        href: "/map",
        label: "Live map",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
        ),
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "Data",
    items: [
      {
        href: "/detections",
        label: "Detections",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        ),
      },
      {
        href: "/ports",
        label: "Ports",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="5" r="3" />
            <line x1="12" y1="8" x2="12" y2="22" />
            <path d="M5 15H2a10 10 0 0 0 20 0h-3" />
          </svg>
        ),
      },
    ],
  },
  {
    group: "System",
    items: [
      {
        href: "/pipeline",
        label: "Pipeline",
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        ),
      },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside
      style={{
        width: 240,
        minHeight: "100vh",
        borderRight: "1px solid var(--border)",
        background: "var(--sidebar-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 50,
      }}
    >
      {/* Brand header */}
      <div
        style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          {/* Brand mark — green gradient hexagon feel */}
          <Image src="/logo1.png" alt="Logo" width={32} height={32} />

          <div>
            <div
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              Maritime Intel
            </div>
            <div
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9.5,
                color: "var(--accent)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginTop: 1,
              }}
            >
              Nigeria · Live
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 12px" }}>
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            <div className="nav-group-label">{group.group}</div>
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${active ? "active" : ""}`}
                  style={{ marginBottom: 2 }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* System status footer */}
      <div
        style={{
          padding: "14px 16px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="live-badge" style={{ display: "inline-flex" }}>
          <span className="live-dot" aria-hidden="true" />
          System online
        </div>
        <div
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            color: "var(--ink-faint)",
            marginTop: 6,
            letterSpacing: "0.04em",
          }}
        >
          Sentinel-1 · 6h cadence
        </div>
      </div>
    </aside>
  );
}
