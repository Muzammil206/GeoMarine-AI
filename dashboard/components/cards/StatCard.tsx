"use client";

function resolveRole(icon: string): "sage" | "clay" | "azure" | "rust" {
  if (icon === "satellite") return "azure";
  if (icon === "anchor")    return "sage";
  if (icon === "ship")      return "sage";
  if (icon === "chart")     return "clay";
  if (icon === "trophy")    return "clay";
  if (icon === "trend")     return "azure";
  return "clay";
}

const ICONS: Record<string, React.ReactNode> = {
  satellite: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v4M12 18v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M2 12h4M18 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
  anchor: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="5" r="3" />
      <line x1="12" y1="8" x2="12" y2="22" />
      <path d="M5 15H2a10 10 0 0 0 20 0h-3" />
    </svg>
  ),
  ship: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2M4 20l2-8h12l2 8" />
      <path d="M12 4v8M8 12l4-8 4 8" />
    </svg>
  ),
  chart: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  trophy: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H2V4h4M18 9h4V4h-4M8 21h8M12 17v4" />
      <path d="M6 4h12v8a6 6 0 0 1-12 0V4z" />
    </svg>
  ),
  trend: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
};

function resolveIcon(icon: string): React.ReactNode {
  if (icon === "🛰️" || icon === "satellite") return ICONS.satellite;
  if (icon === "⚓"  || icon === "anchor")    return ICONS.anchor;
  if (icon === "🚢"  || icon === "ship")      return ICONS.ship;
  if (icon === "📊"  || icon === "chart")     return ICONS.chart;
  if (icon === "🏆"  || icon === "trophy")    return ICONS.trophy;
  if (icon === "📈"  || icon === "trend")     return ICONS.trend;
  return ICONS.chart;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  trend?: { value: number; label: string };
  accentColor?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend }: StatCardProps) {
  const role = resolveRole(icon);

  return (
    <div className={`stat-card role-${role}`} style={{ padding: "18px 20px" }}>
      {/* Label + icon */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <p
          style={{
            fontFamily: "var(--body)",
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {title}
        </p>
        <div className={`stat-icon role-${role}`}>
          {resolveIcon(icon)}
        </div>
      </div>

      {/* Value — Space Grotesk bold, tight tracking */}
      <p className="text-stat" style={{ marginBottom: subtitle || trend ? 8 : 0 }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>

      {subtitle && (
        <p
          style={{
            fontFamily: "var(--body)",
            fontSize: 11.5,
            color: "var(--text-muted)",
            marginBottom: trend ? 8 : 0,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      )}

      {trend && (
        <div className={`delta ${trend.value >= 0 ? "up" : "down"}`}>
          {trend.value >= 0 ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
          {Math.abs(trend.value)}%
          {trend.label && (
            <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 2 }}>
              {trend.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
