"use client";

import { useEffect, useState } from "react";
import VesselCountChart from "@/components/charts/VesselCountChart";
import PortComparisonChart from "@/components/charts/PortComparisonChart";
import StatCard from "@/components/cards/StatCard";
import {
  fetchPortRanking,
  fetchDailyStats,
  fetchMonthlyStats,
  type PortRanking,
  type MonthlyStat,
} from "@/lib/api";

type TimeRange = "7d" | "30d" | "90d";

function toDateFrom(range: TimeRange): string {
  const d = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [ranking, setRanking]     = useState<PortRanking[]>([]);
  const [dailyStats, setDailyStats] = useState<{ date: string; vessel_count: number }[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [peakDay, setPeakDay]     = useState<{ count: number; label: string }>({ count: 0, label: "—" });
  const [trend, setTrend]         = useState<{ value: number; label: string }>({ value: 0, label: "—" });
  const [loading, setLoading]     = useState(true);

  // ── Re-fetch daily data whenever time range changes ──────
  useEffect(() => {
    setLoading(true);
    const dateFrom = toDateFrom(timeRange);

    fetchDailyStats({ date_from: dateFrom })
      .then((res) => {
        if (!res?.data?.length) return;

        // Peak day
        let maxStat = res.data[0];
        res.data.forEach((s) => { if (s.vessel_count > maxStat.vessel_count) maxStat = s; });
        setPeakDay({
          count: maxStat.vessel_count,
          label: `${maxStat.port_name} — ${new Date(maxStat.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`,
        });

        // Aggregate by date across all ports
        const agg: Record<string, number> = {};
        res.data.forEach((s) => {
          const d = s.date.split("T")[0];
          agg[d] = (agg[d] || 0) + s.vessel_count;
        });
        const chartData = Object.entries(agg)
          .map(([date, vessel_count]) => ({ date, vessel_count }))
          .sort((a, b) => a.date.localeCompare(b.date));
        setDailyStats(chartData);

        // Fleet trend: last half vs first half of window
        if (chartData.length >= 4) {
          const half   = Math.floor(chartData.length / 2);
          const recent = chartData.slice(half);
          const prior  = chartData.slice(0, half);
          const avgR   = recent.reduce((s, d) => s + d.vessel_count, 0) / recent.length;
          const avgP   = prior.reduce((s, d) => s + d.vessel_count, 0)  / prior.length;
          const diff   = avgP > 0 ? ((avgR - avgP) / avgP) * 100 : 0;
          setTrend({ value: diff, label: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}% vs prev period` });
        }
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [timeRange]);

  // ── Ranking and monthly stats load once ─────────────────
  useEffect(() => {
    fetchPortRanking()
      .then((res) => { if (res?.data) setRanking(res.data); })
      .catch(console.error);

    fetchMonthlyStats()
      .then((res) => { if (res?.data) setMonthlyStats(res.data); })
      .catch(console.error);
  }, []);

  // ── Derive monthly chart data (all ports summed, last 6 months) ──
  const monthlySummary = (() => {
    const agg: Record<string, number> = {};
    monthlyStats.forEach((m) => {
      const key = `${m.year}-${String(m.month).padStart(2,"0")}`;
      agg[key] = (agg[key] || 0) + m.total_detections;
    });
    return Object.entries(agg)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, count]) => {
        const [year, mon] = key.split("-");
        return { date: `${MONTH_NAMES[parseInt(mon) - 1]} ${year}`, vessel_count: count };
      });
  })();

  const busiestPort = ranking[0];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2
            style={{
              fontFamily: "var(--serif)",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.015em",
              color: "var(--ink)",
            }}
          >
            Maritime analytics
          </h2>
          <p className="text-body" style={{ marginTop: 4 }}>
            Cross-port trends and comparative statistics
          </p>
        </div>

        {/* Time range selector */}
        <div style={{ display: "flex", gap: 4, background: "var(--stone-100)", borderRadius: "var(--r-md)", padding: 4, border: "1px solid var(--stone-200)" }}>
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              style={{
                padding: "6px 16px", borderRadius: "var(--r-sm)", border: "none",
                fontSize: 12, fontWeight: 500, fontFamily: "var(--sans)", cursor: "pointer",
                transition: "all 0.15s",
                background: timeRange === range ? "var(--stone-50)" : "transparent",
                color:      timeRange === range ? "var(--ink)"      : "var(--ink-muted)",
                boxShadow:  timeRange === range ? "var(--sh-1)"     : "none",
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, marginBottom: 28 }}>
        <StatCard
          title="Busiest port"
          value={busiestPort ? busiestPort.name.replace(" Port","") : "—"}
          subtitle={busiestPort ? `${busiestPort.total_detections.toLocaleString()} total detections` : ""}
          icon="trophy"
        />
        <StatCard
          title={`Peak day (${timeRange})`}
          value={peakDay.count}
          subtitle={peakDay.label}
          icon="trend"
        />
        <StatCard
          title="Fleet trend"
          value={trend.label}
          subtitle="Activity vs previous period"
          icon="chart"
          trend={{ value: trend.value, label: "" }}
        />
      </div>

      {/* Daily + Port comparison charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
        <div className="card-static" style={{ padding: 20 }}>
          {loading ? (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-faint)", fontSize: 13 }}>
              Loading...
            </div>
          ) : (
            <VesselCountChart
              title={`Daily vessel detections — ${timeRange}`}
              data={dailyStats}
              height={300}
            />
          )}
        </div>
        <div className="card-static" style={{ padding: 20 }}>
          <PortComparisonChart
            title="Total detections by port"
            data={ranking.map((r) => ({ name: r.name.replace(" Port",""), count: r.total_detections }))}
            height={300}
          />
        </div>
      </div>

      {/* Monthly trend chart */}
      {monthlySummary.length > 0 && (
        <div className="card-static" style={{ padding: 20, marginBottom: 28 }}>
          <VesselCountChart
            title="Monthly vessel activity — all ports combined"
            data={monthlySummary}
            height={260}
          />
        </div>
      )}

      {/* Port ranking table */}
      <div className="card-static" style={{ padding: 20 }}>
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: 15.5,
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: 16,
          }}
        >
          Port activity ranking
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Rank","Port","State","Current","Avg/day","Peak","Total detections"].map((h) => (
                  <th key={h} className="text-caption" style={{ textAlign: "left", padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-faint)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((port, i) => (
                <tr key={port.name}
                  style={{ transition: "background 0.15s", cursor: "pointer" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--stone-100)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>#{i+1}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink)", fontWeight: 600 }}>{port.name}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-muted)" }}>{port.state}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--stone-200)", fontWeight: 600, color: port.current_count > 20 ? "var(--rust-600)" : port.current_count > 10 ? "var(--clay-600)" : "var(--sage-600)" }}>
                    {port.current_count}
                  </td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-muted)" }}>{port.avg_daily_count.toFixed(1)}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-muted)" }}>{port.peak_count}</td>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--clay-600)", fontWeight: 600, fontFamily: "var(--mono)", fontSize: 12 }}>{port.total_detections.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
