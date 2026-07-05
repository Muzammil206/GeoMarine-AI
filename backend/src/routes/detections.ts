/**
 * Detections Routes
 *
 * GET /api/detections          — All detections (GeoJSON, filterable)
 * GET /api/detections/latest   — Most recent detections
 * GET /api/detections/heatmap  — Aggregated density data
 */

import type { FastifyInstance } from "fastify";
import { toFeatureCollection } from "../utils/geojson.js";

export default async function detectionRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/detections — All detections as GeoJSON
   */
  fastify.get<{
    Querystring: {
      port_id?: string;
      date_from?: string;
      date_to?: string;
      min_confidence?: string;
      limit?: string;
    };
  }>("/api/detections", async (request) => {
    const {
      port_id,
      date_from,
      date_to,
      min_confidence = "0.5",
      limit = "1000",
    } = request.query;

    let query = `
      SELECT 
        d.id,
        d.latitude,
        d.longitude,
        d.confidence,
        d.detected_at,
        ST_AsGeoJSON(d.geom)::json AS geometry,
        p.name AS port_name,
        p.id AS port_id
      FROM detections d
      JOIN ports p ON d.port_id = p.id
      WHERE d.confidence >= $1
    `;
    const params: (string | number)[] = [parseFloat(min_confidence)];
    let idx = 2;

    if (port_id) {
      query += ` AND d.port_id = $${idx}`;
      params.push(parseInt(port_id));
      idx++;
    }
    if (date_from) {
      query += ` AND d.detected_at >= $${idx}`;
      params.push(date_from);
      idx++;
    }
    if (date_to) {
      query += ` AND d.detected_at <= $${idx}`;
      params.push(date_to);
      idx++;
    }

    query += ` ORDER BY d.detected_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit));

    const { rows } = await fastify.pg.query(query, params);
    return toFeatureCollection(rows);
  });

  /**
   * GET /api/detections/latest — Most recent detections across all ports
   */
  fastify.get("/api/detections/latest", async () => {
    const { rows } = await fastify.pg.query(`
      SELECT 
        d.id,
        d.latitude,
        d.longitude,
        d.confidence,
        d.detected_at,
        ST_AsGeoJSON(d.geom)::json AS geometry,
        p.name AS port_name,
        p.id AS port_id
      FROM detections d
      JOIN ports p ON d.port_id = p.id
      ORDER BY d.detected_at DESC
      LIMIT 100
    `);

    return toFeatureCollection(rows);
  });

  /**
   * GET /api/detections/heatmap — Aggregated grid for heatmap visualization
   */
  fastify.get<{
    Querystring: { port_id?: string; grid_size?: string };
  }>("/api/detections/heatmap", async (request) => {
    const { port_id, grid_size = "0.005" } = request.query;

    let whereClause = "";
    const params: (string | number)[] = [parseFloat(grid_size)];

    if (port_id) {
      whereClause = "WHERE d.port_id = $2";
      params.push(parseInt(port_id));
    }

    const { rows } = await fastify.pg.query(
      `
      SELECT 
        ST_X(ST_SnapToGrid(d.geom, $1)) AS grid_lon,
        ST_Y(ST_SnapToGrid(d.geom, $1)) AS grid_lat,
        COUNT(*) AS count,
        AVG(d.confidence) AS avg_confidence
      FROM detections d
      ${whereClause}
      GROUP BY grid_lon, grid_lat
      ORDER BY count DESC
    `,
      params
    );

    return {
      type: "heatmap",
      grid_size: parseFloat(grid_size),
      points: rows.map((r: Record<string, unknown>) => ({
        lon: r.grid_lon,
        lat: r.grid_lat,
        count: parseInt(String(r.count)),
        avgConfidence: parseFloat(String(r.avg_confidence)),
      })),
    };
  });
}
