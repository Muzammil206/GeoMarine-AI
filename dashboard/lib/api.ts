/**
 * API Client
 *
 * Typed fetch wrapper for the maritime intelligence backend API.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ============================================================
// Types
// ============================================================

export interface Port {
  id: number;
  name: string;
  state: string;
  description: string;
  center_lon: number;
  center_lat: number;
  area_km2: number;
  latest_vessel_count: number;
  latest_date: string | null;
  total_detections: number;
  total_images: number;
}

export interface PortGeoJSON {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Port;
    geometry: GeoJSON.Geometry;
  }>;
}

export interface Detection {
  id: number;
  latitude: number;
  longitude: number;
  confidence: number;
  detected_at: string;
  port_name: string;
  port_id: number;
}

export interface DetectionGeoJSON {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Detection;
    geometry: GeoJSON.Geometry;
  }>;
}

export interface SummaryStats {
  total_detections: number;
  total_ports: number;
  active_ports: number;
  latest_image_date: string | null;
  total_images: number;
  vessels_today: number;
  avg_daily_7d: number;
}

export interface DailyStat {
  date: string;
  vessel_count: number;
  image_count: number;
  port_name: string;
  port_id: number;
}

export interface MonthlyStat {
  year: number;
  month: number;
  average_count: number;
  max_count: number;
  min_count: number;
  total_images: number;
  total_detections: number;
  port_name: string;
  port_id: number;
}

export interface PortRanking {
  id: number;
  name: string;
  state: string;
  total_detections: number;
  total_images: number;
  avg_daily_count: number;
  peak_count: number;
  latest_image: string | null;
  current_count: number;
}

export interface HeatmapData {
  type: "heatmap";
  grid_size: number;
  points: Array<{
    lon: number;
    lat: number;
    count: number;
    avgConfidence: number;
  }>;
}

// ============================================================
// Fetch Helpers
// ============================================================

async function apiFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") url.searchParams.set(k, v);
    });
  }

  const res = await fetch(url.toString(), {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// ============================================================
// API Functions
// ============================================================

export async function fetchPorts(): Promise<PortGeoJSON> {
  return apiFetch<PortGeoJSON>("/api/ports");
}

export async function fetchPort(id: number | string) {
  return apiFetch<{
    type: "Feature";
    properties: Port;
    geometry: GeoJSON.Geometry;
    daily_stats: Array<{ date: string; vessel_count: number }>;
  }>(`/api/ports/${id}`);
}

export async function fetchPortDetections(
  id: number | string,
  params?: { date_from?: string; date_to?: string; limit?: string }
): Promise<DetectionGeoJSON> {
  return apiFetch<DetectionGeoJSON>(`/api/ports/${id}/detections`, params);
}

export async function fetchDetections(params?: {
  port_id?: string;
  date_from?: string;
  date_to?: string;
  min_confidence?: string;
  limit?: string;
}): Promise<DetectionGeoJSON> {
  return apiFetch<DetectionGeoJSON>("/api/detections", params);
}

export async function fetchLatestDetections(): Promise<DetectionGeoJSON> {
  return apiFetch<DetectionGeoJSON>("/api/detections/latest");
}

export async function fetchHeatmap(params?: {
  port_id?: string;
  grid_size?: string;
}): Promise<HeatmapData> {
  return apiFetch<HeatmapData>("/api/detections/heatmap", params);
}

export async function fetchSummary(): Promise<SummaryStats> {
  return apiFetch<SummaryStats>("/api/statistics/summary");
}

export async function fetchDailyStats(params?: {
  port_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<{ data: DailyStat[] }> {
  return apiFetch<{ data: DailyStat[] }>("/api/statistics/daily", params);
}

export async function fetchMonthlyStats(params?: {
  port_id?: string;
  year?: string;
}): Promise<{ data: MonthlyStat[] }> {
  return apiFetch<{ data: MonthlyStat[] }>("/api/statistics/monthly", params);
}

export async function fetchPortRanking(): Promise<{ data: PortRanking[] }> {
  return apiFetch<{ data: PortRanking[] }>("/api/statistics/port-ranking");
}

// ============================================================
// Pipeline Status
// ============================================================

export interface PipelinePortStat {
  id: number;
  name: string;
  state: string;
  total_images: number;
  processed_images: number;
  last_acquisition: string | null;
  total_detections: number;
}

export interface PipelineRun {
  id: number;
  product_id: string;
  acquisition_date: string;
  processed: boolean;
  tile_count: number | null;
  detection_count: number | null;
  port_name: string;
  port_id: number;
}

export interface PipelineStatus {
  summary: {
    total_images: number;
    processed_images: number;
    total_detections: number;
    last_run: string | null;
    first_run: string | null;
  };
  port_stats: PipelinePortStat[];
  recent_runs: PipelineRun[];
}

export async function fetchPipelineStatus(): Promise<PipelineStatus> {
  return apiFetch<PipelineStatus>("/api/pipeline/status");
}

