/**
 * PostgreSQL Plugin
 *
 * Registers a pg connection pool on the Fastify instance.
 */

import { Pool } from "pg";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyInstance {
    pg: Pool;
  }
}

async function postgresPlugin(fastify: FastifyInstance) {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://maritime:maritime_secret@localhost:5432/maritime_intel";

  const pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    ssl:
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
  });

  // Test connection
  try {
    const result = await pool.query("SELECT PostGIS_Version() AS v");
    fastify.log.info(`PostGIS connected: v${result.rows[0].v}`);
  } catch (err) {
    fastify.log.error("Failed to connect to PostgreSQL");
    throw err;
  }

  fastify.decorate("pg", pool);

  fastify.addHook("onClose", async () => {
    await pool.end();
    fastify.log.info("PostgreSQL pool closed");
  });
}

export default fp(postgresPlugin, { name: "postgres" });
