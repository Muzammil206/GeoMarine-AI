"use client";

import Link from "next/link";

interface PortCardProps {
  id: number;
  name: string;
  state: string;
  vesselCount: number;
  totalDetections: number;
  latestDate: string | null;
}

function trafficBadge(count: number): { cls: string; label: string } {
  if (count > 20) return { cls: "badge-red",   label: "High traffic" };
  if (count > 10) return { cls: "badge-amber",  label: "Moderate" };
  return               { cls: "badge-green",  label: "Normal" };
}

export default function PortCard({
  id,
  name,
  state,
  vesselCount,
  totalDetections,
  latestDate,
}: PortCardProps) {
  const { cls, label } = trafficBadge(vesselCount);

  return (
    <Link href={`/ports/${id}`} style={{ textDecoration: "none" }}>
      <div className="card" style={{ padding: "18px 20px", cursor: "pointer" }}>

        {/* Port header row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Theme anchor icon */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: "var(--accent-dim)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent)",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="5" r="3" />
                <line x1="12" y1="8" x2="12" y2="22" />
                <path d="M5 15H2a10 10 0 0 0 20 0h-3" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                  letterSpacing: "-0.01em",
                }}
              >
                {name}
              </p>
              <p
                style={{
                  fontFamily: "var(--body)",
                  fontSize: 11.5,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                {state} State
              </p>
            </div>
          </div>

          <span className={`badge ${cls}`} style={{ flexShrink: 0, marginTop: 2 }}>
            {label}
          </span>
        </div>

        {/* Stats grid — light/theme-toned cells */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: "var(--stone-100)",
              borderRadius: 8,
              padding: "10px 12px",
              textAlign: "center",
              border: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--accent)",
                lineHeight: 1,
              }}
            >
              {vesselCount}
            </p>
            <p
              style={{
                fontFamily: "var(--body)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-faint)",
                marginTop: 5,
              }}
            >
              Current vessels
            </p>
          </div>
          <div
            style={{
              background: "var(--stone-100)",
              borderRadius: 8,
              padding: "10px 12px",
              textAlign: "center",
              border: "1px solid var(--border)",
            }}
          >
            <p
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              {totalDetections.toLocaleString()}
            </p>
            <p
              style={{
                fontFamily: "var(--body)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--text-faint)",
                marginTop: 5,
              }}
            >
              Total detections
            </p>
          </div>
        </div>

        {/* Last scan timestamp */}
        {latestDate && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              color: "var(--text-faint)",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9.5,
                letterSpacing: "0.04em",
              }}
            >
              Last scan:{" "}
              {new Date(latestDate).toLocaleDateString("en-NG", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
