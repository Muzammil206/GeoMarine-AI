/**
 * Pipeline Status & Metrics Routes
 *
 * GET /api/pipeline/status          — Summary of recent pipeline activity
 * GET /api/pipeline/metrics         — Per-run quality metrics (last 100 runs)
 * GET /api/pipeline/metrics/summary — Per-port aggregated accuracy summary
 */

import type { FastifyInstance } from "fastify";

export default async function pipelineRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/pipeline/status
   * Returns stats about the last pipeline run, per-port image counts, etc.
   */
  fastify.get("/api/pipeline/status", async () => {
    const { rows: portStats } = await fastify.pg.query(`
      SELECT
        p.id,
        p.name,
        p.state,
        COUNT(i.id)::int                                          AS total_images,
        SUM(CASE WHEN i.processed THEN 1 ELSE 0 END)::int        AS processed_images,
        MAX(i.acquisition_date)                                    AS last_acquisition,
        COALESCE(SUM(i.detection_count), 0)::int                  AS total_detections
      FROM ports p
      LEFT JOIN images i ON i.port_id = p.id
      GROUP BY p.id, p.name, p.state
      ORDER BY last_acquisition DESC NULLS LAST
    `);

    const { rows: recentRuns } = await fastify.pg.query(`
      SELECT
        i.id,
        i.product_id,
        i.acquisition_date,
        i.processed,
        i.tile_count,
        i.detection_count,
        p.name AS port_name,
        p.id   AS port_id
      FROM images i
      JOIN ports p ON i.port_id = p.id
      ORDER BY i.acquisition_date DESC
      LIMIT 20
    `);

    const { rows: summary } = await fastify.pg.query(`
      SELECT
        COUNT(*)::int                                             AS total_images,
        SUM(CASE WHEN processed THEN 1 ELSE 0 END)::int          AS processed_images,
        SUM(COALESCE(detection_count, 0))::int                   AS total_detections,
        MAX(acquisition_date)                                     AS last_run,
        MIN(acquisition_date)                                     AS first_run
      FROM images
    `);

    return {
      summary: summary[0],
      port_stats: portStats,
      recent_runs: recentRuns,
    };
  });

  /**
   * GET /api/pipeline/metrics
   * Returns the last 100 pipeline run metrics for trend analysis.
   * Query params:
   *   port_id  — filter by port (optional)
   *   limit    — max rows (default: 100, max: 500)
   */
  fastify.get<{
    Querystring: { port_id?: string; limit?: string };
  }>("/api/pipeline/metrics", async (request) => {
    const portId = request.query.port_id
      ? parseInt(request.query.port_id, 10)
      : null;
    const limit = Math.min(
      parseInt(request.query.limit ?? "100", 10),
      500
    );

    const { rows } = await fastify.pg.query(
      `SELECT
         pm.id,
         pm.run_date,
         pm.raw_detections,
         pm.post_nms_detections,
         pm.post_water_detections,
         ROUND(pm.suppression_rate::numeric, 4)   AS suppression_rate,
         ROUND(pm.water_reject_rate::numeric, 4)  AS water_reject_rate,
         ROUND(pm.avg_confidence::numeric, 4)     AS avg_confidence,
         ROUND(pm.p50_confidence::numeric, 4)     AS p50_confidence,
         ROUND(pm.p90_confidence::numeric, 4)     AS p90_confidence,
         pm.inference_ms,
         p.id   AS port_id,
         p.name AS port_name
       FROM pipeline_metrics pm
       JOIN ports p ON pm.port_id = p.id
       WHERE ($1::int IS NULL OR pm.port_id = $1)
       ORDER BY pm.run_date DESC
       LIMIT $2`,
      [portId, limit]
    );

    return { metrics: rows, count: rows.length };
  });

  /**
   * GET /api/pipeline/metrics/summary
   * Per-port aggregated accuracy metrics (30-day rolling window).
   * Used by the dashboard pipeline accuracy panel.
   */
  fastify.get("/api/pipeline/metrics/summary", async () => {
    const { rows } = await fastify.pg.query(`
      SELECT
        p.id                                                        AS port_id,
        p.name                                                      AS port_name,
        COUNT(pm.id)::int                                           AS total_runs,
        ROUND(AVG(pm.suppression_rate)::numeric, 3)                AS avg_suppression_rate,
        ROUND(AVG(pm.water_reject_rate)::numeric, 3)               AS avg_water_reject_rate,
        ROUND(AVG(pm.avg_confidence)::numeric, 3)                  AS avg_confidence,
        ROUND(AVG(pm.p90_confidence)::numeric, 3)                  AS avg_p90_confidence,
        ROUND(AVG(pm.post_water_detections)::numeric, 1)           AS avg_detections_per_run,
        MAX(pm.run_date)                                            AS last_run,
        ROUND(
          AVG(CASE WHEN pm.avg_confidence >= 0.70 THEN 1 ELSE 0 END)::numeric, 2
        )                                                           AS high_conf_run_rate
      FROM ports p
      LEFT JOIN pipeline_metrics pm ON pm.port_id = p.id
        AND pm.run_date >= NOW() - INTERVAL '30 days'
      GROUP BY p.id, p.name
      ORDER BY p.id
    `);

    return { summary: rows };
  });
}
