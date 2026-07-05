-- Nigeria Maritime Intelligence Platform
-- Database Schema — Phase 1
-- Requires PostgreSQL 14+ with PostGIS 3.x

CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- PORTS — Monitored port boundaries
-- ============================================================
CREATE TABLE IF NOT EXISTS ports (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    state VARCHAR(100),
    description TEXT,
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ports_geom ON ports USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_ports_name ON ports (name);

-- ============================================================
-- IMAGES — Processed satellite image records
-- ============================================================
CREATE TABLE IF NOT EXISTS images (
    id SERIAL PRIMARY KEY,
    acquisition_date TIMESTAMPTZ NOT NULL,
    source VARCHAR(50) DEFAULT 'sentinel-1',
    product_id VARCHAR(255),                    -- CDSE STAC product identifier
    image_path TEXT,                             -- Storage path for downloaded GeoTIFF
    port_id INTEGER REFERENCES ports(id) ON DELETE SET NULL,
    processed BOOLEAN DEFAULT FALSE,
    tile_count INTEGER DEFAULT 0,
    detection_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',                -- Orbit direction, polarization, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, port_id)
);

CREATE INDEX IF NOT EXISTS idx_images_port ON images (port_id);
CREATE INDEX IF NOT EXISTS idx_images_date ON images (acquisition_date DESC);
CREATE INDEX IF NOT EXISTS idx_images_processed ON images (processed) WHERE processed = FALSE;

-- ============================================================
-- DETECTIONS — Individual vessel detections
-- ============================================================
CREATE TABLE IF NOT EXISTS detections (
    id SERIAL PRIMARY KEY,
    image_id INTEGER REFERENCES images(id) ON DELETE CASCADE,
    port_id INTEGER REFERENCES ports(id) ON DELETE SET NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    latitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_Y(geom)) STORED,
    longitude DOUBLE PRECISION GENERATED ALWAYS AS (ST_X(geom)) STORED,
    confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    bbox JSONB,                                  -- {x, y, width, height} pixel coords
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detections_geom ON detections USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_detections_port_date ON detections (port_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_detections_image ON detections (image_id);
CREATE INDEX IF NOT EXISTS idx_detections_confidence ON detections (confidence) WHERE confidence >= 0.5;

-- ============================================================
-- DAILY STATISTICS — Aggregated daily vessel counts
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_statistics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    port_id INTEGER REFERENCES ports(id) ON DELETE CASCADE,
    vessel_count INTEGER NOT NULL DEFAULT 0,
    image_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, port_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_port_date ON daily_statistics (port_id, date DESC);

-- ============================================================
-- MONTHLY STATISTICS — Aggregated monthly averages
-- ============================================================
CREATE TABLE IF NOT EXISTS monthly_statistics (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL CHECK (year >= 2014),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    port_id INTEGER REFERENCES ports(id) ON DELETE CASCADE,
    average_count FLOAT NOT NULL DEFAULT 0,
    max_count INTEGER DEFAULT 0,
    min_count INTEGER DEFAULT 0,
    total_images INTEGER DEFAULT 0,
    total_detections INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, month, port_id)
);

CREATE INDEX IF NOT EXISTS idx_monthly_stats_port ON monthly_statistics (port_id, year DESC, month DESC);

-- ============================================================
-- HELPER FUNCTION — Auto-update updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ports_updated_at
    BEFORE UPDATE ON ports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PIPELINE METRICS — Per-run model quality tracking
-- ============================================================
-- Each row = one pipeline run for one port.
-- suppression_rate  : fraction of raw detections removed by NMS  (healthy: 0.30-0.60)
-- water_reject_rate : fraction removed by land mask               (target: < 0.05)
-- avg_confidence    : mean detection confidence                   (target: > 0.70)
-- p90_confidence    : 90th-percentile confidence                  (target: > 0.80)
CREATE TABLE IF NOT EXISTS pipeline_metrics (
    id SERIAL PRIMARY KEY,
    run_date TIMESTAMPTZ DEFAULT NOW(),
    port_id INTEGER REFERENCES ports(id) ON DELETE SET NULL,
    image_id INTEGER REFERENCES images(id) ON DELETE SET NULL,
    raw_detections INTEGER NOT NULL DEFAULT 0,
    post_nms_detections INTEGER NOT NULL DEFAULT 0,
    post_water_detections INTEGER NOT NULL DEFAULT 0,
    suppression_rate FLOAT GENERATED ALWAYS AS (
        CASE WHEN raw_detections > 0
             THEN 1.0 - post_nms_detections::float / raw_detections
             ELSE 0 END
    ) STORED,
    water_reject_rate FLOAT GENERATED ALWAYS AS (
        CASE WHEN post_nms_detections > 0
             THEN 1.0 - post_water_detections::float / post_nms_detections
             ELSE 0 END
    ) STORED,
    avg_confidence FLOAT,
    p50_confidence FLOAT,
    p90_confidence FLOAT,
    inference_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_port_date
    ON pipeline_metrics (port_id, run_date DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_date
    ON pipeline_metrics (run_date DESC);
