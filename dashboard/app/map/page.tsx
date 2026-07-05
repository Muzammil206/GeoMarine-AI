"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "var(--text-muted)",
        fontSize: 14,
      }}
    >
      Loading maritime map...
    </div>
  ),
});

export default function MapPage() {
  return (
    <div style={{ margin: "-24px -32px", height: "calc(100vh - 64px)" }}>
      <MapView style={{ borderRadius: 0 }} />
    </div>
  );
}
