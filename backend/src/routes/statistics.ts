/**
 * Statistics Routes
 *
 * GET /api/statistics/summary        — Platform overview stats
 * GET /api/statistics/daily          — Daily vessel counts
 * GET /api/statistics/monthly        — Monthly averages
 * GET /api/statistics/port-ranking   — Ports ranked by activity
 */

import type { FastifyInstance } from "fastify";

export default async function statisticsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/statistics/summary — Overview statistics
   */
  fastify.get("/api/statistics/summary", async () => {
    const { rows } = await fastify.pg.query(`
      SELECT
        (SELECT COUNT(*) FROM detections)::int AS total_detections,
        (SELECT COUNT(*) FROM ports)::int AS total_ports,
        (SELECT COUNT(DISTINCT port_id) FROM images WHERE processed = TRUE)::int AS active_ports,
        (SELECT MAX(acquisition_date) FROM images WHERE processed = TRUE) AS latest_image_date,
        (SELECT COUNT(*) FROM images WHERE processed = TRUE)::int AS total_images,
        (SELECT COALESCE(SUM(vessel_count), 0) FROM daily_statistics WHERE date = CURRENT_DATE)::int AS vessels_today,
        (SELECT COALESCE(AVG(vessel_count), 0) FROM daily_statistics WHERE date >= CURRENT_DATE - INTERVAL '7 days') AS avg_daily_7d
    `);

    return rows[0];
  });

  /**
   * GET /api/statistics/daily — Daily vessel counts
   */
  fastify.get<{
    Querystring: {
      port_id?: string;
      date_from?: string;
      date_to?: string;
    };
  }>("/api/statistics/daily", async (request) => {
    const { port_id, date_from, date_to } = request.query;

    let query = `
      SELECT 
        ds.date,
        ds.vessel_count,
        ds.image_count,
        p.name AS port_name,
        p.id AS port_id
      FROM daily_statistics ds
      JOIN ports p ON ds.port_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let idx = 1;

    if (port_id) {
      query += ` AND ds.port_id = $${idx}`;
      params.push(parseInt(port_id));
      idx++;
    }
    if (date_from) {
      query += ` AND ds.date >= $${idx}`;
      params.push(date_from);
      idx++;
    }
    if (date_to) {
      query += ` AND ds.date <= $${idx}`;
      params.push(date_to);
      idx++;
    }

    query += " ORDER BY ds.date DESC, p.id LIMIT 500";

    const { rows } = await fastify.pg.query(query, params);
    return { data: rows };
  });

  /**
   * GET /api/statistics/monthly — Monthly averages
   */
  fastify.get<{
    Querystring: { port_id?: string; year?: string };
  }>("/api/statistics/monthly", async (request) => {
    const { port_id, year } = request.query;

    let query = `
      SELECT 
        ms.year,
        ms.month,
        ms.average_count,
        ms.max_count,
        ms.min_count,
        ms.total_images,
        ms.total_detections,
        p.name AS port_name,
        p.id AS port_id
      FROM monthly_statistics ms
      JOIN ports p ON ms.port_id = p.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];
    let idx = 1;

    if (port_id) {
      query += ` AND ms.port_id = $${idx}`;
      params.push(parseInt(port_id));
      idx++;
    }
    if (year) {
      query += ` AND ms.year = $${idx}`;
      params.push(parseInt(year));
      idx++;
    }

    query += " ORDER BY ms.year DESC, ms.month DESC, p.id LIMIT 200";

    const { rows } = await fastify.pg.query(query, params);
    return { data: rows };
  });

  /**
   * GET /api/statistics/port-ranking — Ports ranked by activity
   */
  fastify.get("/api/statistics/port-ranking", async () => {
    const { rows } = await fastify.pg.query(`
      SELECT 
        p.id,
        p.name,
        p.state,
        COALESCE((SELECT COUNT(*)::int FROM detections d WHERE d.port_id = p.id), 0) AS total_detections,
        COALESCE((SELECT COUNT(*)::int FROM images i WHERE i.port_id = p.id AND i.processed = TRUE), 0) AS total_images,
        COALESCE((SELECT AVG(vessel_count)::float FROM daily_statistics ds WHERE ds.port_id = p.id), 0) AS avg_daily_count,
        COALESCE((SELECT MAX(vessel_count)::int FROM daily_statistics ds WHERE ds.port_id = p.id), 0) AS peak_count,
        (SELECT MAX(acquisition_date) FROM images i WHERE i.port_id = p.id AND i.processed = TRUE) AS latest_image,
        COALESCE(
          (SELECT vessel_count FROM daily_statistics 
           WHERE port_id = p.id ORDER BY date DESC LIMIT 1), 0
        )::int AS current_count
      FROM ports p
      ORDER BY total_detections DESC
    `);

    return { data: rows };
  });
}
