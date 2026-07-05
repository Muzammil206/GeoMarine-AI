/**
 * Ports Routes
 *
 * GET /api/ports           — All ports as GeoJSON FeatureCollection
 * GET /api/ports/:id       — Single port with latest stats
 * GET /api/ports/:id/detections — Detections within a port
 */

import type { FastifyInstance } from "fastify";
import { toFeatureCollection, toFeature } from "../utils/geojson.js";

export default async function portRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/ports — All ports as GeoJSON
   */
  fastify.get("/api/ports", async () => {
    const { rows } = await fastify.pg.query(`
      SELECT 
        p.id,
        p.name,
        p.state,
        p.description,
        ST_AsGeoJSON(p.geom)::json AS geometry,
        ST_X(ST_Centroid(p.geom)) AS center_lon,
        ST_Y(ST_Centroid(p.geom)) AS center_lat,
        ST_Area(p.geom::geography) / 1000000 AS area_km2,
        COALESCE(ds.vessel_count, 0) AS latest_vessel_count,
        ds.date AS latest_date,
        (SELECT COUNT(*) FROM detections d WHERE d.port_id = p.id) AS total_detections,
        (SELECT COUNT(*) FROM images i WHERE i.port_id = p.id AND i.processed = TRUE) AS total_images
      FROM ports p
      LEFT JOIN LATERAL (
        SELECT vessel_count, date
        FROM daily_statistics
        WHERE port_id = p.id
        ORDER BY date DESC
        LIMIT 1
      ) ds ON TRUE
      ORDER BY p.id
    `);

    return toFeatureCollection(rows);
  });

  /**
   * GET /api/ports/:id — Single port with detailed stats
   */
  fastify.get<{ Params: { id: string } }>(
    "/api/ports/:id",
    async (request, reply) => {
      const { id } = request.params;

      const { rows } = await fastify.pg.query(
        `
        SELECT 
          p.id,
          p.name,
          p.state,
          p.description,
          ST_AsGeoJSON(p.geom)::json AS geometry,
          ST_X(ST_Centroid(p.geom)) AS center_lon,
          ST_Y(ST_Centroid(p.geom)) AS center_lat,
          ST_Area(p.geom::geography) / 1000000 AS area_km2,
          COALESCE(ds.vessel_count, 0) AS latest_vessel_count,
          ds.date AS latest_date,
          (SELECT COUNT(*) FROM detections d WHERE d.port_id = p.id) AS total_detections,
          (SELECT COUNT(*) FROM images i WHERE i.port_id = p.id AND i.processed = TRUE) AS total_images,
          (SELECT MAX(acquisition_date) FROM images i WHERE i.port_id = p.id AND i.processed = TRUE) AS latest_image_date
        FROM ports p
        LEFT JOIN LATERAL (
          SELECT vessel_count, date
          FROM daily_statistics
          WHERE port_id = p.id
          ORDER BY date DESC
          LIMIT 1
        ) ds ON TRUE
        WHERE p.id = $1
      `,
        [id]
      );

      if (rows.length === 0) {
        reply.status(404);
        return { error: "Port not found" };
      }

      // Get recent daily stats
      const statsResult = await fastify.pg.query(
        `SELECT date, vessel_count 
         FROM daily_statistics 
         WHERE port_id = $1 
         ORDER BY date DESC 
         LIMIT 90`,
        [id]
      );

      const port = toFeature(rows[0]);
      return {
        ...port,
        daily_stats: statsResult.rows,
      };
    }
  );

  /**
   * GET /api/ports/:id/detections — Detections for a specific port
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { date_from?: string; date_to?: string; limit?: string };
  }>("/api/ports/:id/detections", async (request) => {
    const { id } = request.params;
    const { date_from, date_to, limit = "500" } = request.query;

    let query = `
      SELECT 
        d.id,
        d.latitude,
        d.longitude,
        d.confidence,
        d.detected_at,
        d.bbox,
        ST_AsGeoJSON(d.geom)::json AS geometry,
        i.acquisition_date,
        i.product_id
      FROM detections d
      JOIN images i ON d.image_id = i.id
      WHERE d.port_id = $1
    `;
    const params: (string | number)[] = [id];
    let paramIndex = 2;

    if (date_from) {
      query += ` AND d.detected_at >= $${paramIndex}`;
      params.push(date_from);
      paramIndex++;
    }

    if (date_to) {
      query += ` AND d.detected_at <= $${paramIndex}`;
      params.push(date_to);
      paramIndex++;
    }

    query += ` ORDER BY d.detected_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const { rows } = await fastify.pg.query(query, params);
    return toFeatureCollection(rows);
  });
}
