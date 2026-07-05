/**
 * Nigeria Maritime Intelligence — Backend API
 *
 * Fastify server serving maritime intelligence data from PostGIS.
 * Run: bun run dev
 */

import Fastify from "fastify";
import { config } from "dotenv";
import { resolve } from "path";

// Load .env from project root
config({ path: resolve(import.meta.dir, "../../.env") });

import postgresPlugin from "./plugins/postgres.js";
import corsPlugin from "./plugins/cors.js";
import healthRoutes from "./routes/health.js";
import portRoutes from "./routes/ports.js";
import detectionRoutes from "./routes/detections.js";
import statisticsRoutes from "./routes/statistics.js";
import pipelineRoutes from "./routes/pipeline.js";

const PORT = parseInt(process.env.BACKEND_PORT || "3001", 10);
const HOST = process.env.BACKEND_HOST || "0.0.0.0";

async function start() {
  const fastify = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { colorize: true },
      },
    },
  });

  // Plugins
  await fastify.register(corsPlugin);
  await fastify.register(postgresPlugin);

  // Routes
  await fastify.register(healthRoutes);
  await fastify.register(portRoutes);
  await fastify.register(detectionRoutes);
  await fastify.register(statisticsRoutes);
  await fastify.register(pipelineRoutes);

  // Start
  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n🚢 Maritime Intelligence API running at http://${HOST}:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   Ports:  http://localhost:${PORT}/api/ports`);
    console.log(`   Stats:  http://localhost:${PORT}/api/statistics/summary\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
