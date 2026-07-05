"use client";

import { useState, useEffect } from "react";

export default function Header() {
  const [formatted, setFormatted] = useState<string>("");
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setFormatted(
        now.toLocaleDateString("en-NG", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      );
      setTime(now.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        height: 56,
        borderBottom: "1px solid var(--border)",
        background: "var(--header-bg)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 36px",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Left: product title */}
      <div>
        <h1
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--ink)",
            lineHeight: 1.2,
            letterSpacing: "-0.015em",
          }}
        >
          Nigeria Maritime Intelligence
        </h1>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 9.5,
            color: "var(--ink-faint)",
            marginTop: 1,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          Port activity · SAR satellite monitoring
        </p>
      </div>

      {/* Right: clock + live badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Live clock */}
        {formatted && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--accent)",
                letterSpacing: "0.04em",
                fontWeight: 500,
              }}
            >
              {time}
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 9.5,
                color: "var(--ink-faint)",
                letterSpacing: "0.04em",
              }}
            >
              {formatted}
            </span>
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 28,
            background: "var(--border)",
          }}
        />

        {/* Live badge */}
        <div className="live-badge">
          <span className="live-dot" aria-hidden="true" />
          Live
        </div>
      </div>
    </header>
  );
}
