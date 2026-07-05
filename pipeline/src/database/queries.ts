/**
 * Database Queries
 *
 * Parameterized SQL queries for storing and retrieving
 * ports, images, detections, and statistics.
 */

import { getPool } from "./connection.js";
import type { GeoReferencedDetection } from "../geospatial/georeferencer.js";

// ============================================================
// Ports
// ============================================================

/**
 * Get all ports from the database.
 */
export async function getPorts() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT id, name, state, description,
           ST_AsGeoJSON(geom)::json AS geometry,
           ST_X(ST_Centroid(geom)) AS center_lon,
           ST_Y(ST_Centroid(geom)) AS center_lat
    FROM ports
    ORDER BY id
  `);
  return result.rows;
}

/**
 * Get a port ID by name. Returns null if not found.
 */
export async function getPortIdByName(
  name: string
): Promise<number | null> {
  const pool = getPool();
  const result = await pool.query("SELECT id FROM ports WHERE name = $1", [
    name,
  ]);
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ============================================================
// Images
// ============================================================

/**
 * Check if a product has already been processed for a port.
 */
export async function isProductProcessed(
  productId: string,
  portId: number
): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    "SELECT id FROM images WHERE product_id = $1 AND port_id = $2",
    [productId, portId]
  );
  return result.rows.length > 0;
}

/**
 * Insert a new image record and return its ID.
 */
export async function insertImage(params: {
  acquisitionDate: string;
  productId: string;
  imagePath: string;
  portId: number;
  metadata?: Record<string, unknown>;
}): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO images (acquisition_date, product_id, image_path, port_id, metadata)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      params.acquisitionDate,
      params.productId,
      params.imagePath,
      params.portId,
      JSON.stringify(params.metadata || {}),
    ]
  );
  return result.rows[0].id;
}

/**
 * Mark an image as processed with detection count.
 */
export async function markImageProcessed(
  imageId: number,
  tileCount: number,
  detectionCount: number
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE images 
     SET processed = TRUE, tile_count = $2, detection_count = $3
     WHERE id = $1`,
    [imageId, tileCount, detectionCount]
  );
}

// ============================================================
// Detections
// ============================================================

/**
 * Insert multiple vessel detections in a single transaction.
 */
export async function insertDetections(
  detections: GeoReferencedDetection[],
  imageId: number,
  portId: number
): Promise<number> {
  if (detections.length === 0) return 0;

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let inserted = 0;
    for (const det of detections) {
      await client.query(
        `INSERT INTO detections (image_id, port_id, geom, confidence, bbox)
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6)`,
        [
          imageId,
          portId,
          det.lon,
          det.lat,
          det.confidence,
          JSON.stringify({ x: det.x, y: det.y, w: det.w, h: det.h }),
        ]
      );
      inserted++;
    }

    await client.query("COMMIT");
    console.log(
      `[DB] Inserted ${inserted} detections for image ${imageId}`
    );
    return inserted;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// Statistics
// ============================================================

/**
 * Upsert daily statistics for a port.
 * If a record already exists for this date/port, update the vessel count.
 */
export async function upsertDailyStatistic(
  date: string,
  portId: number,
  vesselCount: number
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO daily_statistics (date, port_id, vessel_count, image_count)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (date, port_id)
     DO UPDATE SET 
       vessel_count = GREATEST(daily_statistics.vessel_count, $3),
       image_count = daily_statistics.image_count + 1`,
    [date, portId, vesselCount]
  );
}

/**
 * Update monthly statistics by aggregating daily data.
 */
export async function refreshMonthlyStatistics(
  year: number,
  month: number,
  portId: number
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `INSERT INTO monthly_statistics (year, month, port_id, average_count, max_count, min_count, total_images, total_detections)
     SELECT 
       $1 AS year,
       $2 AS month,
       $3 AS port_id,
       COALESCE(AVG(vessel_count), 0) AS average_count,
       COALESCE(MAX(vessel_count), 0) AS max_count,
       COALESCE(MIN(vessel_count), 0) AS min_count,
       COALESCE(SUM(image_count), 0) AS total_images,
       COALESCE(SUM(vessel_count), 0) AS total_detections
     FROM daily_statistics
     WHERE port_id = $3
       AND EXTRACT(YEAR FROM date) = $1
       AND EXTRACT(MONTH FROM date) = $2
     ON CONFLICT (year, month, port_id)
     DO UPDATE SET
       average_count = EXCLUDED.average_count,
       max_count = EXCLUDED.max_count,
       min_count = EXCLUDED.min_count,
       total_images = EXCLUDED.total_images,
       total_detections = EXCLUDED.total_detections`,
    [year, month, portId]
  );
}

/**
 * Get the latest processed image date for a port.
 */
export async function getLatestImageDate(
  portId: number
): Promise<string | null> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT acquisition_date 
     FROM images 
     WHERE port_id = $1 AND processed = TRUE
     ORDER BY acquisition_date DESC 
     LIMIT 1`,
    [portId]
  );
  return result.rows.length > 0
    ? result.rows[0].acquisition_date
    : null;
}
