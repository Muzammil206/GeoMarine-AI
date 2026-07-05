"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const DEMO_PORTS_GEOJSON = {
  type: "FeatureCollection" as const,
  features: [
    { type: "Feature" as const, properties: { id: 1, name: "Apapa Port", state: "Lagos", latest_vessel_count: 34 }, geometry: { type: "Polygon" as const, coordinates: [[[3.375,6.435],[3.405,6.435],[3.405,6.465],[3.375,6.465],[3.375,6.435]]] } },
    { type: "Feature" as const, properties: { id: 2, name: "Tin Can Island Port", state: "Lagos", latest_vessel_count: 19 }, geometry: { type: "Polygon" as const, coordinates: [[[3.325,6.415],[3.36,6.415],[3.36,6.45],[3.325,6.45],[3.325,6.415]]] } },
    { type: "Feature" as const, properties: { id: 3, name: "Onne Port", state: "Rivers", latest_vessel_count: 12 }, geometry: { type: "Polygon" as const, coordinates: [[[7.135,4.665],[7.18,4.665],[7.18,4.705],[7.135,4.705],[7.135,4.665]]] } },
    { type: "Feature" as const, properties: { id: 4, name: "Calabar Port", state: "Cross River", latest_vessel_count: 8 }, geometry: { type: "Polygon" as const, coordinates: [[[8.3,4.955],[8.343,4.955],[8.343,4.998],[8.3,4.998],[8.3,4.955]]] } },
    { type: "Feature" as const, properties: { id: 5, name: "Warri Port", state: "Delta", latest_vessel_count: 7 }, geometry: { type: "Polygon" as const, coordinates: [[[5.73,5.495],[5.77,5.495],[5.77,5.54],[5.73,5.54],[5.73,5.495]]] } },
    { type: "Feature" as const, properties: { id: 6, name: "Port Harcourt Port", state: "Rivers", latest_vessel_count: 7 }, geometry: { type: "Polygon" as const, coordinates: [[[6.99,4.755],[7.037,4.755],[7.037,4.8],[6.99,4.8],[6.99,4.755]]] } },
  ],
};

interface MapViewProps {
  style?: React.CSSProperties;
  center?: [number, number];
  zoom?: number;
  portId?: number;
}

type MapMode = "dots" | "heatmap";

export default function MapView({ style, center, zoom, portId }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);

  // Layer visibility
  const [showPorts, setShowPorts] = useState(true);
  const [showVessels, setShowVessels] = useState(true);
  const [mapMode, setMapMode] = useState<MapMode>("dots");

  // Filters
  const [minConfidence, setMinConfidence] = useState(50); // 50–100
  const [vesselCount, setVesselCount] = useState<number>(0);

  const portLocations: Record<string, [number, number]> = {
    "Apapa Port": [3.39, 6.45],
    "Tin Can Island Port": [3.343, 6.433],
    "Onne Port": [7.1575, 4.685],
    "Calabar Port": [8.3215, 4.9765],
    "Warri Port": [5.75, 5.5175],
    "Port Harcourt Port": [7.0134, 4.7774],
  };

  // ── Fetch and update vessel detections ─────────────────────
  const loadVessels = useCallback((m: maplibregl.Map, confidence: number) => {
    if (!m.isStyleLoaded() || !m.getSource("vessels")) return;

    const detectionsUrl = portId
      ? `${API}/api/ports/${portId}/detections?min_confidence=${confidence / 100}`
      : `${API}/api/detections?min_confidence=${confidence / 100}&limit=500`;

    fetch(detectionsUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data.features) {
          setVesselCount(data.features.length);
          (m.getSource("vessels") as maplibregl.GeoJSONSource)?.setData(data);
        }
      })
      .catch(() => {});
  }, [portId]);

  const loadHeatmap = useCallback((m: maplibregl.Map) => {
    if (!m.isStyleLoaded() || !m.getSource("heatmap-src")) return;

    const heatUrl = portId
      ? `${API}/api/detections/heatmap?port_id=${portId}&grid_size=0.003`
      : `${API}/api/detections/heatmap?grid_size=0.005`;

    fetch(heatUrl)
      .then((r) => r.json())
      .then((data) => {
        if (data.points) {
          const geojson = {
            type: "FeatureCollection" as const,
            features: data.points.map((p: { lon: number; lat: number; count: number }) => ({
              type: "Feature" as const,
              properties: { count: p.count },
              geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
            })),
          };
          (m.getSource("heatmap-src") as maplibregl.GeoJSONSource)?.setData(geojson);
        }
      })
      .catch(() => {});
  }, [portId]);

  // ── Map initialisation ──────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
      center: center || [5.5, 5.5],
      zoom: zoom || 5.8,
      attributionControl: false,
    });

    m.addControl(new maplibregl.NavigationControl(), "bottom-right");
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");

    m.on("load", () => {
      // ── Port boundaries ──
      m.addSource("ports", { type: "geojson", data: DEMO_PORTS_GEOJSON as GeoJSON.FeatureCollection });
      m.addLayer({ id: "port-fill",   type: "fill",   source: "ports", paint: { "fill-color": "#1b5e3b", "fill-opacity": 0.08 } });
      m.addLayer({ id: "port-border", type: "line",   source: "ports", paint: { "line-color": "#1b5e3b", "line-width": 2, "line-opacity": 0.6 } });
      m.addLayer({ id: "port-labels", type: "symbol", source: "ports",
        layout: { "text-field": ["get", "name"], "text-size": 12, "text-anchor": "top", "text-offset": [0, 1], "text-font": ["Open Sans Bold"] },
        paint:  { "text-color": "#1b5e3b", "text-halo-color": "#faf9f6", "text-halo-width": 2 },
      });

      // Load live port boundaries
      fetch(`${API}/api/ports`)
        .then((r) => r.json())
        .then((data) => { if (data.features) (m.getSource("ports") as maplibregl.GeoJSONSource)?.setData(data); })
        .catch(() => {});

      // ── Vessel dots ──
      m.addSource("vessels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      m.addLayer({
        id: "vessel-pulse", type: "circle", source: "vessels",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "confidence"], 0.5, 10, 1.0, 16],
          "circle-color": ["interpolate", ["linear"], ["get", "confidence"], 0.5, "#ef4444", 0.65, "#f59e0b", 0.8, "#10b981"],
          "circle-opacity": 0.15,
        },
      });

      m.addLayer({
        id: "vessel-dots", type: "circle", source: "vessels",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "confidence"], 0.5, 4, 1.0, 7],
          "circle-color": ["interpolate", ["linear"], ["get", "confidence"], 0.5, "#ef4444", 0.65, "#f59e0b", 0.8, "#10b981"],
          "circle-opacity": 0.9,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-stroke-opacity": 0.3,
        },
      });

      // ── Heatmap source + layer ──
      m.addSource("heatmap-src", { type: "geojson", data: { type: "FeatureCollection", features: [] } });

      m.addLayer({
        id: "vessel-heatmap",
        type: "heatmap",
        source: "heatmap-src",
        layout: { visibility: "none" },
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "count"], 0, 0, 50, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 12, 2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 4, 15, 10, 30],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,   "rgba(6,10,20,0)",
            0.2, "rgba(6,182,212,0.4)",
            0.4, "rgba(6,182,212,0.7)",
            0.6, "rgba(251,191,36,0.9)",
            0.8, "rgba(239,68,68,1)",
            1.0, "#ffffff",
          ],
          "heatmap-opacity": 0.85,
        },
      });

      // ── Click handlers ──
      m.on("click", "vessel-dots", (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties!;
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates;
        const conf = Number(props.confidence);
        const confColor = conf >= 0.8 ? "#34d399" : conf >= 0.6 ? "#fbbf24" : "#f87171";

        new maplibregl.Popup({ offset: 15 })
          .setLngLat(coords as [number, number])
          .setHTML(`
            <div style="font-family:Inter,sans-serif;">
              <div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#141210;">🚢 Vessel Detection</div>
              <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;">
                <span style="color:#7a746d;">Port</span><span style="color:#141210;">${props.port_name}</span>
                <span style="color:#7a746d;">Confidence</span><span style="color:${confColor};font-weight:600;">${(conf*100).toFixed(1)}%</span>
                <span style="color:#7a746d;">Location</span><span style="color:#141210;">${coords[1].toFixed(4)}°N, ${coords[0].toFixed(4)}°E</span>
                <span style="color:#7a746d;">Time</span><span style="color:#141210;">${new Date(props.detected_at).toLocaleString()}</span>
              </div>
            </div>
          `)
          .addTo(m);
      });

      m.on("mouseenter", "vessel-dots", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "vessel-dots", () => { m.getCanvas().style.cursor = ""; });
      m.on("mouseenter", "port-fill",   () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "port-fill",   () => { m.getCanvas().style.cursor = ""; });

      loadVessels(m, 50);
      loadHeatmap(m);
    });

    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to center/zoom changes ───────────────────────────
  useEffect(() => {
    if (map.current && center) map.current.jumpTo({ center, zoom: zoom || 12 });
  }, [center, zoom]);

  // ── React to portId changes ────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const wait = () => {
      if (!m.isStyleLoaded()) { setTimeout(wait, 100); return; }
      loadVessels(m, minConfidence);
      loadHeatmap(m);
    };
    wait();
  }, [portId, loadVessels, loadHeatmap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── React to confidence slider ─────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded() || !m.getSource("vessels")) return;
    loadVessels(m, minConfidence);
  }, [minConfidence, loadVessels]);

  // ── React to mapMode toggle ────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;

    const isDots = mapMode === "dots";
    const dotLayers   = ["vessel-pulse", "vessel-dots"];
    const heatLayers  = ["vessel-heatmap"];

    dotLayers .forEach((l) => { if (m.getLayer(l)) m.setLayoutProperty(l, "visibility", isDots ? "visible" : "none"); });
    heatLayers.forEach((l) => { if (m.getLayer(l)) m.setLayoutProperty(l, "visibility", isDots ? "none" : "visible"); });
  }, [mapMode]);

  // ── React to layer toggles ─────────────────────────────────
  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    ["port-fill","port-border","port-labels"].forEach((l) => {
      if (m.getLayer(l)) m.setLayoutProperty(l, "visibility", showPorts ? "visible" : "none");
    });
  }, [showPorts]);

  useEffect(() => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    const vis = showVessels ? "visible" : "none";
    ["vessel-pulse","vessel-dots","vessel-heatmap"].forEach((l) => {
      if (m.getLayer(l)) m.setLayoutProperty(l, "visibility", showVessels ? (l === "vessel-heatmap" ? (mapMode === "heatmap" ? vis : "none") : vis) : "none");
    });
  }, [showVessels, mapMode]);

  const flyToPort = (coords: [number, number]) => {
    map.current?.flyTo({ center: coords, zoom: 13, duration: 1500 });
  };

  const controlBtn = (active: boolean) => ({
    padding: "6px 14px",
    borderRadius: 8,
    border: "none",
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "Inter",
    cursor: "pointer",
    transition: "all 0.2s",
    background: active ? "rgba(27,94,59,0.08)" : "transparent",
    color: active ? "var(--accent)" : "var(--text-muted)",
  } as React.CSSProperties);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%", borderRadius: 16, overflow: "hidden" }} />

      {/* Control Panel */}
      <div className="glass-card-static" style={{ position: "absolute", top: 16, right: 16, padding: "16px", minWidth: 220, zIndex: 10 }}>
        
        {/* Mode toggle */}
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          View Mode
        </p>
        <div style={{ display: "flex", gap: 4, background: "var(--bg-secondary)", borderRadius: 8, padding: 3, marginBottom: 14 }}>
          <button style={controlBtn(mapMode === "dots")}    onClick={() => setMapMode("dots")}>    🔵 Dots</button>
          <button style={controlBtn(mapMode === "heatmap")} onClick={() => setMapMode("heatmap")}>🔥 Heatmap</button>
        </div>

        {/* Confidence slider */}
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Min Confidence: <span style={{ color: "var(--accent)" }}>{minConfidence}%</span>
        </p>
        <input
          type="range" min={50} max={95} step={5}
          value={minConfidence}
          onChange={(e) => setMinConfidence(Number(e.target.value))}
          style={{ width: "100%", accentColor: "var(--accent)", marginBottom: 14 }}
        />

        <div style={{ height: 1, background: "var(--border-subtle)", margin: "0 0 12px" }} />

        {/* Layer toggles */}
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Layers</p>
        {[
          { label: "Port Boundaries",    state: showPorts,   set: setShowPorts },
          { label: "Vessel Detections",  state: showVessels, set: setShowVessels },
        ].map(({ label, state, set }) => (
          <label key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer", marginBottom: 6 }}>
            <input type="checkbox" checked={state} onChange={(e) => set(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            {label}
          </label>
        ))}

        <div style={{ height: 1, background: "var(--border-subtle)", margin: "12px 0" }} />

        {/* Quick Jump */}
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Jump</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {Object.entries(portLocations).map(([name, coords]) => (
            <button key={name} onClick={() => flyToPort(coords)}
              style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 12, padding: "5px 6px", borderRadius: 6, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(27,94,59,0.06)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              ⚓ {name}
            </button>
          ))}
        </div>
      </div>

      {/* Vessel count badge */}
      <div className="glass-card-static" style={{ position: "absolute", top: 16, left: 16, padding: "8px 14px", zIndex: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent-green)", boxShadow: "0 0 8px rgba(16,185,129,0.6)", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{vesselCount}</span>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>vessels shown</span>
      </div>

      {/* Legend */}
      <div className="glass-card-static" style={{ position: "absolute", bottom: 16, left: 16, padding: "10px 14px", zIndex: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {mapMode === "heatmap" ? "Density" : "Confidence"}
        </p>
        {mapMode === "dots" ? (
          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
            {[{ color: "#10b981", label: "High ≥80%" }, { color: "#f59e0b", label: "Med 60-80%" }, { color: "#ef4444", label: "Low 50-60%" }].map((i) => (
              <div key={i.label} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
                <div style={{ width: 9, height: 9, borderRadius: "50%", background: i.color, boxShadow: `0 0 5px ${i.color}60` }} />
                {i.label}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
            {[{ color: "var(--green-400)", label: "Low" }, { color: "#fbbf24", label: "Medium" }, { color: "#ef4444", label: "High" }].map((i) => (
              <div key={i.label} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
                <div style={{ width: 9, height: 9, borderRadius: 2, background: i.color }} />
                {i.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
