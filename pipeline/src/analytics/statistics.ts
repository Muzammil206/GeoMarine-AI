/**
 * Statistics Engine
 *
 * Aggregates detection data into daily and monthly statistics.
 */

import { getPool } from "../database/connection.js";
import {
  upsertDailyStatistic,
  refreshMonthlyStatistics,
} from "../database/queries.js";

/**
 * Update daily statistics for a port based on detection count.
 */
export async function updateDailyStats(
  date: string,
  portId: number,
  vesselCount: number
): Promise<void> {
  await upsertDailyStatistic(date, portId, vesselCount);

  // Also refresh the monthly rollup
  const d = new Date(date);
  await refreshMonthlyStatistics(d.getFullYear(), d.getMonth() + 1, portId);

  console.log(
    `[Stats] Updated daily stats: port=${portId}, date=${date}, vessels=${vesselCount}`
  );
}

/**
 * Recalculate all monthly statistics from daily data.
 * Useful for backfilling or correcting aggregation errors.
 */
export async function recalculateAllMonthlyStats(): Promise<void> {
  const pool = getPool();

  console.log("[Stats] Recalculating all monthly statistics...");

  await pool.query(`
    INSERT INTO monthly_statistics (year, month, port_id, average_count, max_count, min_count, total_images, total_detections)
    SELECT 
      EXTRACT(YEAR FROM date)::INTEGER AS year,
      EXTRACT(MONTH FROM date)::INTEGER AS month,
      port_id,
      AVG(vessel_count) AS average_count,
      MAX(vessel_count) AS max_count,
      MIN(vessel_count) AS min_count,
      SUM(image_count) AS total_images,
      SUM(vessel_count) AS total_detections
    FROM daily_statistics
    GROUP BY EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), port_id
    ON CONFLICT (year, month, port_id)
    DO UPDATE SET
      average_count = EXCLUDED.average_count,
      max_count = EXCLUDED.max_count,
      min_count = EXCLUDED.min_count,
      total_images = EXCLUDED.total_images,
      total_detections = EXCLUDED.total_detections
  `);

  console.log("[Stats] Monthly statistics recalculated");
}

/**
 * Get a summary of current platform statistics.
 */
export async function getSummaryStats() {
  const pool = getPool();

  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM detections) AS total_detections,
      (SELECT COUNT(DISTINCT port_id) FROM images WHERE processed = TRUE) AS active_ports,
      (SELECT MAX(acquisition_date) FROM images WHERE processed = TRUE) AS latest_image_date,
      (SELECT COUNT(*) FROM images WHERE processed = TRUE) AS total_images
  `);

  return result.rows[0];
}
