"use client";

import { useEffect, useState } from "react";
import StatCard from "@/components/cards/StatCard";
import PortCard from "@/components/cards/PortCard";
import {
  fetchSummary,
  fetchPorts,
  fetchLatestDetections,
  type SummaryStats,
  type Port,
  type Detection,
} from "@/lib/api";

// Demo data for initial render (before backend is connected)
const DEMO_SUMMARY: SummaryStats = {
  total_detections: 2847,
  total_ports: 6,
  active_ports: 6,
  latest_image_date: new Date().toISOString(),
  total_images: 142,
  vessels_today: 87,
  avg_daily_7d: 73.4,
};

const DEMO_PORTS: Array<Port> = [
  { id: 1, name: "Apapa Port", state: "Lagos", description: "", center_lon: 3.39, center_lat: 6.45, area_km2: 9.2, latest_vessel_count: 34, latest_date: new Date().toISOString(), total_detections: 1204, total_images: 48 },
  { id: 2, name: "Tin Can Island Port", state: "Lagos", description: "", center_lon: 3.343, center_lat: 6.433, area_km2: 12.1, latest_vessel_count: 19, latest_date: new Date().toISOString(), total_detections: 687, total_images: 38 },
  { id: 3, name: "Onne Port", state: "Rivers", description: "", center_lon: 7.1575, center_lat: 4.685, area_km2: 17.8, latest_vessel_count: 12, latest_date: new Date().toISOString(), total_detections: 423, total_images: 28 },
  { id: 4, name: "Calabar Port", state: "Cross River", description: "", center_lon: 8.3215, center_lat: 4.9765, area_km2: 18.4, latest_vessel_count: 8, latest_date: new Date().toISOString(), total_detections: 198, total_images: 15 },
  { id: 5, name: "Warri Port", state: "Delta", description: "", center_lon: 5.75, center_lat: 5.5175, area_km2: 17.6, latest_vessel_count: 7, latest_date: new Date().toISOString(), total_detections: 187, total_images: 10 },
  { id: 6, name: "Port Harcourt Port", state: "Rivers", description: "", center_lon: 7.0134, center_lat: 4.7774, area_km2: 21.1, latest_vessel_count: 7, latest_date: new Date().toISOString(), total_detections: 148, total_images: 12 },
];

const DEMO_ACTIVITY: Array<{ id: number; port_name: string; confidence: number; detected_at: string }> = [
  { id: 1, port_name: "Apapa Port", confidence: 0.94, detected_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 2, port_name: "Tin Can Island Port", confidence: 0.87, detected_at: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: 3, port_name: "Apapa Port", confidence: 0.81, detected_at: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
  { id: 4, port_name: "Onne Port", confidence: 0.76, detected_at: new Date(Date.now() - 1000 * 60 * 25).toISOString() },
  { id: 5, port_name: "Calabar Port", confidence: 0.92, detected_at: new Date(Date.now() - 1000 * 60 * 40).toISOString() },
  { id: 6, port_name: "Apapa Port", confidence: 0.68, detected_at: new Date(Date.now() - 1000 * 60 * 55).toISOString() },
  { id: 7, port_name: "Warri Port", confidence: 0.73, detected_at: new Date(Date.now() - 1000 * 60 * 70).toISOString() },
  { id: 8, port_name: "Port Harcourt Port", confidence: 0.89, detected_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function confidenceBadgeClass(conf: number): string {
  if (conf >= 0.8) return "badge-green";
  if (conf >= 0.6) return "badge-amber";
  return "badge-red";
}

export default function HomePage() {
  const [summary, setSummary] = useState<SummaryStats>(DEMO_SUMMARY);
  const [ports, setPorts] = useState<Port[]>(DEMO_PORTS);
  const [activity, setActivity] = useState<any[]>(DEMO_ACTIVITY);

  useEffect(() => {
    fetchSummary()
      .then((data) => {
        if (data) setSummary(data);
      })
      .catch((err) => console.error("Error fetching summary stats:", err));

    fetchPorts()
      .then((data) => {
        if (data && data.features) {
          setPorts(data.features.map((f: { properties: Port }) => f.properties));
        }
      })
      .catch((err) => console.error("Error fetching ports:", err));

    fetchLatestDetections()
      .then((data) => {
        if (data && data.features && data.features.length > 0) {
          setActivity(
            data.features.map((f) => ({
              id: f.properties.id,
              port_name: f.properties.port_name,
              confidence: f.properties.confidence,
              detected_at: f.properties.detected_at,
            }))
          );
        }
      })
      .catch((err) => console.error("Error fetching latest detections:", err));
  }, []);

  return (
    <div>
      {/* Page Title */}
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontFamily: "var(--serif)",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: "var(--ink)",
          }}
        >
          Dashboard overview
        </h2>
        <p className="text-body" style={{ marginTop: 4 }}>
          Real-time maritime intelligence across Nigerian ports
        </p>
      </div>

      {/* Stat Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        <StatCard
          title="Total detections"
          value={summary.total_detections}
          subtitle={`Across ${summary.total_images} satellite images`}
          icon="satellite"
          trend={{ value: 12, label: "vs last week" }}
        />
        <StatCard
          title="Active ports"
          value={summary.active_ports}
          subtitle={`of ${summary.total_ports} monitored`}
          icon="anchor"
        />
        <StatCard
          title="Vessels today"
          value={summary.vessels_today}
          subtitle="Current satellite pass"
          icon="ship"
          trend={{ value: 5, label: "vs yesterday" }}
        />
        <StatCard
          title="7-day average"
          value={Math.round(summary.avg_daily_7d)}
          subtitle="Vessels per day"
          icon="chart"
          trend={{ value: -3, label: "vs prior week" }}
        />
      </div>

      {/* Main Content: Activity Feed + Port Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: 20,
        }}
      >
        {/* Recent Activity Feed */}
        <div className="card-static" style={{ padding: "20px" }}>
          <h3
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--serif)",
              fontSize: 15.5,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            <span className="live-dot" aria-hidden="true" />
            Recent detections
          </h3>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              maxHeight: 480,
              overflowY: "auto",
            }}
          >
            {activity.map((det) => (
              <div
                key={det.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: "var(--r-sm)",
                  transition: "background 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--stone-100)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--r-sm)",
                      background: "var(--sage-50)",
                      border: "1px solid var(--stone-200)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--sage-700)",
                    }}
                    aria-hidden="true"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2M4 20l2-8h12l2 8" />
                      <path d="M12 4v8M8 12l4-8 4 8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-label">{det.port_name}</p>
                    <p className="text-mono" style={{ marginTop: 2 }}>
                      {timeAgo(det.detected_at)}
                    </p>
                  </div>
                </div>

                <span className={`badge ${confidenceBadgeClass(det.confidence)}`}>
                  {(det.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Port Status Grid */}
        <div>
          <h3
            style={{
              fontFamily: "var(--serif)",
              fontSize: 15.5,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 16,
            }}
          >
            Port status
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 16,
            }}
          >
            {ports.map((port) => (
              <PortCard
                key={port.id}
                id={port.id}
                name={port.name}
                state={port.state}
                vesselCount={port.latest_vessel_count}
                totalDetections={port.total_detections}
                latestDate={port.latest_date}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
