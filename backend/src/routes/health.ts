/**
 * Health Route
 */

import type { FastifyInstance } from "fastify";

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get("/api/health", async (request, reply) => {
    try {
      const result = await fastify.pg.query(
        "SELECT PostGIS_Version() AS postgis, NOW() AS db_time"
      );
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          postgis: result.rows[0].postgis,
          serverTime: result.rows[0].db_time,
        },
      };
    } catch {
      reply.status(503);
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        database: { connected: false },
      };
    }
  });
}
