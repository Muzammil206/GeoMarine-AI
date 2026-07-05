"use client";

import { useEffect, useState, use } from "react";
import dynamic from "next/dynamic";
import VesselCountChart from "@/components/charts/VesselCountChart";
import OccupancyGauge from "@/components/charts/OccupancyGauge";
import StatCard from "@/components/cards/StatCard";
import { fetchPort, fetchPortDetections, type Port } from "@/lib/api";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--ink-3)",
        background: "var(--surface-2)",
        borderRadius: "var(--r-lg)",
      }}
    >
      Loading map...
    </div>
  ),
});

const PORT_DATA_DEMO: Record<number, {
  name: string;
  state: string;
  description: string;
  vesselCount: number;
  avgDaily: number;
  peakCount: number;
  totalDetections: number;
  totalImages: number;
}> = {
  1: { name: "Apapa Port", state: "Lagos", description: "Largest and busiest port in Nigeria, located in Lagos. Handles containerized and general cargo.", vesselCount: 34, avgDaily: 34.4, peakCount: 52, totalDetections: 1204, totalImages: 48 },
  2: { name: "Tin Can Island Port", state: "Lagos", description: "Second major port in Lagos, handles containers, vehicles, dry and liquid bulk cargo.", vesselCount: 19, avgDaily: 19.6, peakCount: 31, totalDetections: 687, totalImages: 38 },
  3: { name: "Onne Port", state: "Rivers", description: "Federal Ocean Terminal and Federal Lighter Terminal. Major oil and gas logistics hub.", vesselCount: 12, avgDaily: 12.1, peakCount: 22, totalDetections: 423, totalImages: 28 },
  4: { name: "Calabar Port", state: "Cross River", description: "Located on the Calabar River, handles general cargo and some containerized freight.", vesselCount: 8, avgDaily: 7.9, peakCount: 14, totalDetections: 198, totalImages: 15 },
  5: { name: "Warri Port", state: "Delta", description: "Also known as Delta Port Complex. Handles general and bulk cargo.", vesselCount: 7, avgDaily: 7.5, peakCount: 13, totalDetections: 187, totalImages: 10 },
  6: { name: "Port Harcourt Port", state: "Rivers", description: "Located on the Bonny River. Handles general cargo, containers, and petroleum products.", vesselCount: 7, avgDaily: 5.9, peakCount: 11, totalDetections: 148, totalImages: 12 },
};

function confidenceBadgeClass(conf: number): string {
  if (conf >= 0.8) return "badge-green";
  if (conf >= 0.6) return "badge-amber";
  return "badge-red";
}

export default function PortDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const portId = parseInt(id);

  const [port, setPort] = useState<Port | null>(null);
  const [dailyStats, setDailyStats] = useState<Array<{ date: string; vessel_count: number }>>([]);
  const [detections, setDetections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPort(portId)
      .then((res) => {
        if (res && res.properties) {
          setPort(res.properties);
          setDailyStats(res.daily_stats || []);
        }
      })
      .catch((err) => console.error("Error fetching port info:", err));

    fetchPortDetections(portId)
      .then((res) => {
        if (res && res.features) {
          setDetections(
            res.features.map((f) => ({
              id: f.properties.id,
              latitude: f.properties.latitude,
              longitude: f.properties.longitude,
              confidence: f.properties.confidence,
              detected_at: f.properties.detected_at,
            }))
          );
        }
      })
      .catch((err) => console.error("Error fetching port detections:", err))
      .finally(() => setLoading(false));
  }, [portId]);

  if (loading || !port) {
    return (
      <div className="body-sm" style={{ padding: 40, textAlign: "center" }}>
        Loading port details...
      </div>
    );
  }

  // Fallbacks & Calculated Values
  const demoFallback = PORT_DATA_DEMO[portId] || PORT_DATA_DEMO[1];
  const vesselCount = port.latest_vessel_count || 0;
  
  const avgDaily = dailyStats.length > 0 
    ? dailyStats.reduce((sum, d) => sum + d.vessel_count, 0) / dailyStats.length 
    : demoFallback.avgDaily;

  const peakCount = dailyStats.length > 0 
    ? Math.max(...dailyStats.map((d) => d.vessel_count)) 
    : demoFallback.peakCount;

  const statusColor =
    vesselCount > 20
      ? "var(--negative-fg)"
      : vesselCount > 10
        ? "var(--warning-fg)"
        : "var(--positive-fg)";

  const statusLabel =
    vesselCount > 20 ? "High traffic" : vesselCount > 10 ? "Moderate" : "Normal";

  return (
    <div>
      {/* Port Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <h2 className="display-sm">{port.name}</h2>
            <span
              className={`badge ${
                vesselCount > 20
                  ? "badge-red"
                  : vesselCount > 10
                    ? "badge-amber"
                    : "badge-green"
              }`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="body-sm">
            {port.state} State — {port.description}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <StatCard
          title="Current vessels"
          value={vesselCount}
          icon="ship"
        />
        <StatCard
          title="Daily average"
          value={avgDaily.toFixed(1)}
          icon="chart"
        />
        <StatCard
          title="Peak count"
          value={peakCount}
          icon="trend"
        />
        <StatCard
          title="Total detections"
          value={port.total_detections}
          subtitle={`From ${port.total_images} images`}
          icon="satellite"
        />
      </div>

      {/* Map + Gauge */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 240px",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div
          className="card-static"
          style={{ overflow: "hidden", height: 400 }}
        >
          <MapView 
            style={{ borderRadius: "var(--r-lg)" }} 
            center={[port.center_lon, port.center_lat]} 
            zoom={12} 
            portId={portId} 
          />
        </div>
        <div
          className="card-static"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <OccupancyGauge
            value={vesselCount}
            max={peakCount + 10}
            label="Port occupancy"
            size={200}
          />
          <p className="body-sm" style={{ marginTop: 8, textAlign: "center" }}>
            Capacity estimate based on peak historical count
          </p>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="card-static" style={{ padding: "20px", marginBottom: 24 }}>
        <VesselCountChart
          title={`${port.name} — daily vessel detections`}
          data={[...dailyStats].reverse()}
          height={340}
        />
      </div>

      {/* Recent Detections Table */}
      <div className="card-static" style={{ padding: "20px" }}>
        <h3
          style={{
            fontFamily: "var(--serif)",
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            color: "var(--ink)",
            marginBottom: 16,
          }}
        >
          Recent detections
        </h3>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["ID", "Latitude", "Longitude", "Confidence", "Detected at"].map((h) => (
                <th
                  key={h}
                  className="ui-label"
                  style={{
                    textAlign: "left",
                    padding: "10px 16px",
                    borderBottom: "0.5px solid var(--border-2)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {detections.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "20px 16px", textAlign: "center" }} className="body-sm">
                  No detections available for this port.
                </td>
              </tr>
            ) : (
              detections.slice(0, 10).map((det) => (
                <tr
                  key={det.id}
                  style={{ transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border-2)", color: "var(--ink-3)", fontFamily: "var(--mono)", fontSize: 12 }}>
                    #{det.id}
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border-2)", color: "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 12 }}>
                    {det.latitude.toFixed(4)}°N
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border-2)", color: "var(--ink-2)", fontFamily: "var(--mono)", fontSize: 12 }}>
                    {det.longitude.toFixed(4)}°E
                  </td>
                  <td style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border-2)" }}>
                    <span
                      className={`badge ${confidenceBadgeClass(det.confidence)}`}
                    >
                      {(det.confidence * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="ui-mono" style={{ padding: "10px 16px", borderBottom: "0.5px solid var(--border-2)" }}>
                    {new Date(det.detected_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
