"use client";

import { useEffect, useState } from "react";
import PortCard from "@/components/cards/PortCard";
import { fetchPorts, type Port } from "@/lib/api";

const DEMO_PORTS: Array<Port> = [
  { id: 1, name: "Apapa Port", state: "Lagos", description: "", center_lon: 3.39, center_lat: 6.45, area_km2: 9.2, latest_vessel_count: 34, latest_date: new Date().toISOString(), total_detections: 1204, total_images: 48 },
  { id: 2, name: "Tin Can Island Port", state: "Lagos", description: "", center_lon: 3.343, center_lat: 6.433, area_km2: 12.1, latest_vessel_count: 19, latest_date: new Date().toISOString(), total_detections: 687, total_images: 38 },
  { id: 3, name: "Onne Port", state: "Rivers", description: "", center_lon: 7.1575, center_lat: 4.685, area_km2: 17.8, latest_vessel_count: 12, latest_date: new Date().toISOString(), total_detections: 423, total_images: 28 },
  { id: 4, name: "Calabar Port", state: "Cross River", description: "", center_lon: 8.3215, center_lat: 4.9765, area_km2: 18.4, latest_vessel_count: 8, latest_date: new Date().toISOString(), total_detections: 198, total_images: 15 },
  { id: 5, name: "Warri Port", state: "Delta", description: "", center_lon: 5.75, center_lat: 5.5175, area_km2: 17.6, latest_vessel_count: 7, latest_date: new Date().toISOString(), total_detections: 187, total_images: 10 },
  { id: 6, name: "Port Harcourt Port", state: "Rivers", description: "", center_lon: 7.0134, center_lat: 4.7774, area_km2: 21.1, latest_vessel_count: 7, latest_date: new Date().toISOString(), total_detections: 148, total_images: 12 },
];

export default function PortsPage() {
  const [ports, setPorts] = useState<Port[]>(DEMO_PORTS);

  useEffect(() => {
    fetchPorts()
      .then((data) => {
        if (data && data.features) {
          setPorts(data.features.map((f: { properties: Port }) => f.properties));
        }
      })
      .catch((err) => console.error("Error fetching ports:", err));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
          Monitored Ports
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {ports.length} Nigerian ports under satellite surveillance
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 20,
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
  );
}
