"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchDetections, fetchPorts, type Detection, type PortGeoJSON } from "@/lib/api";

type SortKey = "detected_at" | "confidence" | "port_name";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 50;

export default function DetectionsPage() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [ports, setPorts]           = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading]       = useState(false);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(0);

  // Filters
  const [portFilter, setPortFilter]   = useState("");
  const [dateFrom, setDateFrom]       = useState("");
  const [dateTo, setDateTo]           = useState("");
  const [minConf, setMinConf]         = useState("50");

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>("detected_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Load port list for filter dropdown
  useEffect(() => {
    fetchPorts()
      .then((res: PortGeoJSON) => {
        setPorts(res.features.map((f) => ({ id: f.properties.id, name: f.properties.name })));
      })
      .catch(console.error);
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetchDetections({
      ...(portFilter && { port_id: portFilter }),
      ...(dateFrom   && { date_from: dateFrom }),
      ...(dateTo     && { date_to: dateTo }),
      min_confidence: String(Number(minConf) / 100),
      limit: "500",
    })
      .then((res) => {
        const rows = res.features.map((f) => f.properties);
        setTotal(rows.length);
        setDetections(rows);
        setPage(0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [portFilter, dateFrom, dateTo, minConf]);

  // Load on mount
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...detections].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "detected_at") cmp = a.detected_at.localeCompare(b.detected_at);
    if (sortKey === "confidence")  cmp = a.confidence - b.confidence;
    if (sortKey === "port_name")   cmp = a.port_name.localeCompare(b.port_name);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);

  const sortIcon = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : " ⇅";

  const inputStyle: React.CSSProperties = {
    background: "var(--stone-50)",
    border: "1px solid var(--stone-300)",
    borderRadius: "var(--r-md)",
    color: "var(--ink)",
    fontSize: 13,
    padding: "8px 12px",
    fontFamily: "var(--sans)",
    outline: "none",
    width: "100%",
    transition: "border-color 0.15s ease",
    boxShadow: "var(--sh-inset)",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: "var(--ink)",
          }}
        >
          Detection search
        </h2>
        <p className="text-body" style={{ marginTop: 4 }}>
          Filter and explore all vessel detections across the monitored ports.
        </p>
      </div>

      {/* Filter panel */}
      <div className="card-static" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          {/* Port */}
          <div>
            <label className="text-caption" style={{ display: "block", marginBottom: 6 }}>Port</label>
            <select value={portFilter} onChange={(e) => setPortFilter(e.target.value)} style={inputStyle}>
              <option value="">All ports</option>
              {ports.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="text-caption" style={{ display: "block", marginBottom: 6 }}>Date from</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </div>

          {/* Date to */}
          <div>
            <label className="text-caption" style={{ display: "block", marginBottom: 6 }}>Date to</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>

          {/* Min confidence */}
          <div>
            <label className="text-caption" style={{ display: "block", marginBottom: 6 }}>
              Min confidence: {minConf}%
            </label>
            <input type="range" min={50} max={95} step={5} value={minConf}
              onChange={(e) => setMinConf(e.target.value)}
              style={{ width: "100%", accentColor: "var(--clay-600)", marginTop: 10 }}
            />
          </div>

          {/* Search button */}
          <div>
            <button onClick={load} className="btn-primary">
              Search
            </button>
          </div>
        </div>

        {/* Quick filters */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[
            { label: "Last 7 days",  action: () => { const d = new Date(); d.setDate(d.getDate()-7); setDateFrom(d.toISOString().split("T")[0]); setDateTo(""); } },
            { label: "Last 30 days", action: () => { const d = new Date(); d.setDate(d.getDate()-30); setDateFrom(d.toISOString().split("T")[0]); setDateTo(""); } },
            { label: "High confidence only", action: () => setMinConf("80") },
            { label: "Clear filters", action: () => { setPortFilter(""); setDateFrom(""); setDateTo(""); setMinConf("50"); } },
          ].map((f) => (
            <button key={f.label} onClick={f.action}
              style={{
                padding: "4px 12px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--stone-300)",
                background: "transparent",
                color: "var(--ink-muted)",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--sans)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink)"; e.currentTarget.style.borderColor = "var(--stone-500)"; e.currentTarget.style.background = "var(--stone-100)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-muted)"; e.currentTarget.style.borderColor = "var(--stone-300)"; e.currentTarget.style.background = "transparent"; }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results summary */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p className="body-sm">
          {loading ? "Searching..." : `${total.toLocaleString()} detection${total !== 1 ? "s" : ""} found`}
          {sorted.length > 0 && ` · showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, sorted.length)}`}
        </p>
        {/* CSV export */}
        <button
          onClick={() => {
            const csv = ["ID,Port,Latitude,Longitude,Confidence,Detected At",
              ...sorted.map((d) => `${d.id},${d.port_name},${d.latitude},${d.longitude},${(d.confidence*100).toFixed(1)}%,${d.detected_at}`)
            ].join("\n");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
            a.download = `detections-${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
          }}
          className="btn-secondary"
          style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="card-static" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--stone-100)" }}>
                {[
                  { key: null,           label: "ID" },
                  { key: "port_name",    label: "Port" },
                  { key: null,           label: "Latitude" },
                  { key: null,           label: "Longitude" },
                  { key: "confidence",   label: "Confidence" },
                  { key: "detected_at",  label: "Detected at" },
                ].map(({ key, label }) => (
                  <th key={label}
                    onClick={() => key && toggleSort(key as SortKey)}
                    className="text-caption"
                    style={{
                      textAlign: "left", padding: "12px 16px",
                      borderBottom: "1px solid var(--stone-200)",
                      color: "var(--ink-faint)",
                      cursor: key ? "pointer" : "default",
                      userSelect: "none",
                    }}
                  >
                    {label}{key ? sortIcon(key as SortKey) : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "var(--ink-3)" }}>Searching...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "40px 16px", textAlign: "center", color: "var(--ink-3)" }}>
                  No detections match the current filters. Try adjusting the date range or confidence threshold.
                </td></tr>
              ) : (
                paginated.map((det) => (
                  <tr key={det.id}
                    style={{ transition: "background 0.15s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--stone-100)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 10.5 }}>#{det.id}</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink)", fontWeight: 500 }}>{det.port_name}</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-muted)", fontFamily: "var(--mono)", fontSize: 10.5 }}>{det.latitude.toFixed(5)}°N</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", color: "var(--ink-muted)", fontFamily: "var(--mono)", fontSize: 10.5 }}>{det.longitude.toFixed(5)}°E</td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)" }}>
                      <span className={`badge ${
                        det.confidence >= 0.8 ? "badge-green" : det.confidence >= 0.6 ? "badge-amber" : "badge-red"
                      }`}>{(det.confidence * 100).toFixed(1)}%</span>
                    </td>
                    <td style={{ padding: "10px 16px", borderBottom: "1px solid var(--stone-200)", fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--ink-faint)" }}>
                      {new Date(det.detected_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, padding: "16px", borderTop: "1px solid var(--stone-200)" }}>
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
              className="btn-ghost"
              style={{ fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}>← Prev
            </button>
            <span className="text-body">Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="btn-ghost"
              style={{ fontSize: 12, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
