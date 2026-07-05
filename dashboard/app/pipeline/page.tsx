"use client";

import { useEffect, useState } from "react";
import { fetchPipelineStatus, type PipelineStatus } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PortMetricSummary {
  port_id: number;
  port_name: string;
  total_runs: number;
  avg_suppression_rate: number | null;
  avg_water_reject_rate: number | null;
  avg_confidence: number | null;
  avg_p90_confidence: number | null;
  avg_detections_per_run: number | null;
  last_run: string | null;
  high_conf_run_rate: number | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days  = Math.floor(ms / 86400000);
  if (days  > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins  > 0) return `${mins}m ago`;
  return "Just now";
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%",
      background: ok ? "var(--positive-fg)" : "var(--warning-fg)",
      flexShrink: 0,
    }} />
  );
}

export default function PipelinePage() {
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshed, setRefreshed] = useState<Date | null>(null);
  const [portMetrics, setPortMetrics] = useState<PortMetricSummary[]>([]);

  const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const load = () => {
    setLoading(true);
    Promise.all([
      fetchPipelineStatus(),
      fetch(`${BACKEND}/api/pipeline/metrics/summary`)
        .then((r) => r.json())
        .then((d) => d.summary as PortMetricSummary[])
        .catch(() => [] as PortMetricSummary[]),
    ])
      .then(([pipelineData, metricsData]) => {
        setStatus(pipelineData);
        setPortMetrics(metricsData);
        setError(null);
        setRefreshed(new Date());
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const summary = status?.summary;
  const processedPct = summary && summary.total_images > 0
    ? ((summary.processed_images / summary.total_images) * 100).toFixed(1)
    : "0";

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <h2 className="display-sm">Pipeline status</h2>
          <p className="body-sm" style={{ marginTop: 4 }}>
            Satellite acquisition and vessel detection activity
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="body-sm">
            {refreshed ? `Updated ${refreshed.toLocaleTimeString()}` : "Loading..."}
          </span>
          <button onClick={load} disabled={loading} className="btn-secondary">
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px",
          borderRadius: "var(--r-sm)",
          background: "var(--rust-50)",
          border: "1px solid rgba(163,64,47,0.2)",
          color: "var(--rust-600)",
          fontSize: 13,
          marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total images",     value: summary?.total_images     ?? "—" },
          { label: "Processed",        value: summary?.processed_images ?? "—" },
          { label: "Total detections", value: summary?.total_detections.toLocaleString() ?? "—" },
          { label: "Processing rate",  value: `${processedPct}%` },
        ].map(({ label, value }) => (
          <div key={label} className="card-static" style={{ padding: 20 }}>
            <p className="text-caption" style={{ marginBottom: 10 }}>{label}</p>
            <p className="text-stat">{value}</p>
          </div>
        ))}
      </div>

      {/* Timeline info */}
      {summary && (
        <div className="card-static" style={{ padding: 20, marginBottom: 24 }}>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 15.5,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 16,
            }}
          >
            Pipeline timeline
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              { label: "First satellite pass", value: summary.first_run ? new Date(summary.first_run).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "None" },
              { label: "Last pipeline run",    value: summary.last_run  ? new Date(summary.last_run).toLocaleDateString("en-GB",  { day: "numeric", month: "long", year: "numeric" }) : "Never" },
              { label: "Last run",             value: timeAgo(summary.last_run) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-caption" style={{ marginBottom: 6 }}>{label}</p>
                <p style={{ fontFamily: "var(--serif)", fontSize: 15.5, fontWeight: 600, color: "var(--ink)" }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-port status */}
      <div className="card-static" style={{ padding: 20, marginBottom: 24 }}>
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: 15.5,
            fontWeight: 600,
            color: "var(--ink)",
            marginBottom: 16,
          }}
        >
          Per-port image status
        </h3>
        {loading && !status ? (
          <p className="text-body">Loading...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(status?.port_stats ?? []).map((port) => {
              const pct = port.total_images > 0 ? (port.processed_images / port.total_images) * 100 : 0;
              const hasData = port.total_images > 0;
              return (
                <div key={port.id} style={{ padding: "14px 16px", borderRadius: "var(--r-md)", background: "var(--stone-100)", border: "1px solid var(--stone-200)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusDot ok={hasData} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{port.name}</span>
                    </div>
                    <span className="text-caption">{port.state}</span>
                  </div>

                  {/* Progress bar — clay gradient */}
                  <div style={{ height: 3, background: "var(--stone-200)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--clay-400), var(--clay-600))", borderRadius: 2, transition: "width 0.6s ease" }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                    <div>
                      <p className="text-caption" style={{ marginBottom: 2 }}>Images</p>
                      <p style={{ color: "var(--ink-soft)", fontWeight: 600 }}>{port.processed_images}/{port.total_images}</p>
                    </div>
                    <div>
                      <p className="text-caption" style={{ marginBottom: 2 }}>Detections</p>
                      <p style={{ color: "var(--clay-600)", fontWeight: 600 }}>{port.total_detections.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-caption" style={{ marginBottom: 2 }}>Last pass</p>
                      <p className="text-mono">{timeAgo(port.last_acquisition)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Model accuracy panel ────────────────────────────────────────── */}
      <div className="card-static" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "var(--serif)", fontSize: 15.5, fontWeight: 600, color: "var(--ink)" }}>
            Model accuracy (30-day)
          </h3>
          <span className="text-caption" style={{ fontSize: 11 }}>Post-fix metrics — updates each pipeline run</span>
        </div>

        {portMetrics.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-faint)", fontSize: 13 }}>
            No pipeline runs recorded yet.
            <br />
            <span style={{ fontSize: 12, marginTop: 4, display: "block" }}>
              Run <code style={{ background: "var(--stone-100)", padding: "2px 6px", borderRadius: "var(--r-sm)", fontFamily: "var(--mono)" }}>bun run detect</code> to generate first metrics.
            </span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {portMetrics.map((m) => {
              const wr = m.avg_water_reject_rate;
              const conf = m.avg_confidence;
              const sr = m.avg_suppression_rate;

              // Colour-code water rejection rate: green < 5%, amber 5-15%, red > 15%
              const wrColor = wr == null ? "var(--ink-faint)" : wr < 0.05 ? "var(--positive-fg)" : wr < 0.15 ? "var(--warning-fg)" : "var(--rust-600)";
              // Colour-code confidence: green > 70%, amber 60-70%, red < 60%
              const confColor = conf == null ? "var(--ink-faint)" : conf > 0.70 ? "var(--positive-fg)" : conf > 0.60 ? "var(--warning-fg)" : "var(--rust-600)";
              // NMS suppression: healthy 30-60%, outside that is suspicious
              const srColor = sr == null ? "var(--ink-faint)" : (sr >= 0.30 && sr <= 0.60) ? "var(--positive-fg)" : "var(--warning-fg)";

              return (
                <div key={m.port_id} style={{ padding: "14px 16px", borderRadius: "var(--r-md)", background: "var(--stone-100)", border: "1px solid var(--stone-200)" }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 12 }}>{m.port_name}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <p className="text-caption" style={{ marginBottom: 3 }}>Land rejection</p>
                      <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 700, color: wrColor }}>
                        {wr != null ? `${(wr * 100).toFixed(1)}%` : "—"}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>target &lt;5%</p>
                    </div>
                    <div>
                      <p className="text-caption" style={{ marginBottom: 3 }}>Avg confidence</p>
                      <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 700, color: confColor }}>
                        {conf != null ? `${(conf * 100).toFixed(1)}%` : "—"}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>target &gt;70%</p>
                    </div>
                    <div>
                      <p className="text-caption" style={{ marginBottom: 3 }}>NMS suppression</p>
                      <p style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 700, color: srColor }}>
                        {sr != null ? `${(sr * 100).toFixed(1)}%` : "—"}
                      </p>
                      <p style={{ fontSize: 10, color: "var(--ink-faint)", marginTop: 2 }}>target 30–60%</p>
                    </div>
                  </div>
                  <p className="text-caption" style={{ marginTop: 10 }}>
                    {m.total_runs} run{m.total_runs !== 1 ? "s" : ""} · avg {m.avg_detections_per_run?.toFixed(0) ?? "—"} vessels/pass
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          Recent satellite passes
        </h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Port","Acquisition date","Product ID","Status","Tiles","Detections"].map((h) => (
                  <th key={h} className="text-caption" style={{ textAlign: "left", padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-faint)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(status?.recent_runs ?? []).map((run) => (
                <tr key={run.id}
                  style={{ transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--stone-100)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink)", fontWeight: 500 }}>{run.port_name}</td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-muted)" }}>
                    {new Date(run.acquisition_date).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)" }}>
                    {run.product_id.slice(0, 28)}…
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)" }}>
                    <span className={`badge ${run.processed ? "badge-green" : "badge-amber"}`}>
                      {run.processed ? "Processed" : "Pending"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-muted)" }}>{run.tile_count ?? "—"}</td>
                  <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--clay-600)", fontWeight: 600, fontFamily: "var(--mono)", fontSize: 12 }}>{run.detection_count ?? "—"}</td>
                </tr>
              ))}
              {!loading && !status?.recent_runs?.length && (
                <tr><td colSpan={6} style={{ padding: "30px 16px", textAlign: "center", color: "var(--ink-faint)" }}>
                  No pipeline runs recorded yet. Run <code style={{ background: "var(--stone-100)", padding: "2px 6px", borderRadius: "var(--r-sm)", fontFamily: "var(--mono)" }}>bun run detect</code> from the pipeline directory to start.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* How to run */}
        <div style={{
          marginTop: 20,
          padding: "14px 16px",
          borderRadius: "var(--r-md)",
          background: "var(--azure-50)",
          border: "1px solid rgba(61,119,163,0.15)",
        }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--azure-600)", marginBottom: 8 }}>Run the pipeline from the terminal</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { cmd: "bun run detect",           desc: "Run once for latest imagery" },
              { cmd: "RUN_ON_STARTUP=true bun run scheduler", desc: "Start daily scheduler daemon" },
              { cmd: "bun run backfill -- --days 30",         desc: "Backfill last 30 days" },
              { cmd: "bun run backfill:dry",                  desc: "Preview without downloading" },
            ].map(({ cmd, desc }) => (
              <div key={cmd} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12 }}>
                <code style={{ background: "var(--stone-50)", padding: "3px 8px", borderRadius: "var(--r-sm)", color: "var(--ink)", fontFamily: "var(--mono)", fontSize: 10.5, flexShrink: 0, border: "1px solid var(--stone-200)" }}>{cmd}</code>
                <span className="text-body">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
