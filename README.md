# 🚢 Nigeria Maritime Intelligence & Port Activity Monitoring Platform

AI-powered maritime intelligence platform monitoring vessel activity across major Nigerian ports using Sentinel-1 SAR satellite imagery.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  CDSE STAC API                      │
│           (Sentinel-1 GRD Discovery)                │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Pipeline (Bun/TypeScript)               │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌────────┐ │
│  │ Download │→ │SAR Preproc│→ │YOLO    │→ │PostGIS │ │
│  │ & Extract│  │Lee Filter │  │ONNX    │  │Storage │ │
│  └─────────┘  └──────────┘  └────────┘  └────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Backend (Fastify/Bun)                    │
│           REST API serving GeoJSON                   │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│              Dashboard (Next.js)                     │
│  MapLibre GL JS · ECharts · TailwindCSS             │
└─────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- **Bun** >= 1.3
- **Node.js** >= 20 (for Next.js)
- **PostgreSQL** + PostGIS (cloud or local via Docker)

### 1. Environment Setup

```bash
cp .env.example .env
# Edit .env with your database URL and CDSE credentials
```

### 2. Database Setup

**Option A — Cloud PostgreSQL:**
```bash
# Run schema + seed against your cloud DB
cd pipeline && bun run src/database/seed-ports.ts
```

**Option B — Local Docker:**
```bash
docker compose up -d db
# Schema + seed auto-run from init scripts
```

### 3. Install Dependencies

```bash
cd pipeline && bun install
cd ../backend && bun install
cd ../dashboard && bun install
```

### 4. YOLO Model (One-time)

```bash
cd pipeline/scripts
pip install ultralytics
python export-yolo-onnx.py
# Outputs: pipeline/models/yolov8-vessel.onnx
```

### 5. Run Services

```bash
# Terminal 1 — Backend API
cd backend && bun run dev
# → http://localhost:3001

# Terminal 2 — Dashboard
cd dashboard && bun run dev
# → http://localhost:3000

# Terminal 3 — Run detection pipeline
cd pipeline && bun run src/pipeline.ts
```

## Project Structure

```
nigeria-maritime-intel/
├── pipeline/          # Bun/TS — SAR processing + YOLO vessel detection
├── backend/           # Fastify — REST API serving PostGIS data
├── dashboard/         # Next.js — Interactive maritime dashboard
├── database/          # SQL schema + port seed data
├── docker-compose.yml # Local PostGIS dev environment
└── .env.example       # Configuration template
```

## Monitored Ports

| Port | State | Coordinates |
|------|-------|-------------|
| Apapa Port | Lagos | 6.4500°N, 3.3900°E |
| Tin Can Island Port | Lagos | 6.4330°N, 3.3430°E |
| Onne Port | Rivers | 4.6845°N, 7.1575°E |
| Calabar Port | Cross River | 4.9765°N, 8.3215°E |
| Warri Port | Delta | 5.5174°N, 5.7501°E |
| Port Harcourt Port | Rivers | 4.7774°N, 7.0134°E |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ports` | All ports (GeoJSON) |
| GET | `/api/ports/:id` | Port detail + daily stats |
| GET | `/api/ports/:id/detections` | Port detections |
| GET | `/api/detections` | All detections (filterable) |
| GET | `/api/detections/latest` | Latest 100 detections |
| GET | `/api/detections/heatmap` | Grid aggregation |
| GET | `/api/statistics/summary` | Platform overview |
| GET | `/api/statistics/daily` | Daily vessel counts |
| GET | `/api/statistics/monthly` | Monthly averages |
| GET | `/api/statistics/port-ranking` | Ports ranked by activity |

## Tech Stack

- **Runtime:** Bun + Node.js
- **Pipeline:** TypeScript, geotiff.js, onnxruntime-node, @turf/turf, sharp
- **Backend:** Fastify 5, pg, PostGIS
- **Dashboard:** Next.js 16, MapLibre GL JS, ECharts, TailwindCSS 4
- **Database:** PostgreSQL 16 + PostGIS 3.4
- **ML:** YOLOv8 (ONNX format)
- **Data Source:** Copernicus Data Space STAC API (Sentinel-1 GRD)

## License

Proprietary — All rights reserved.
