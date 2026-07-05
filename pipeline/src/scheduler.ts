/**
 * Pipeline Scheduler
 *
 * Runs the vessel detection pipeline automatically on a daily schedule.
 * Designed to run as a persistent background daemon.
 *
 * Usage:
 *   bun run src/scheduler.ts                  # Default: runs at 06:00 UTC daily
 *   SCHEDULE_HOUR=8 bun run src/scheduler.ts  # Run at 08:00 UTC daily
 *   RUN_ON_STARTUP=true bun run src/scheduler.ts  # Also run immediately on start
 *
 * Stop: Ctrl+C or kill the process (handles SIGINT/SIGTERM gracefully)
 */

import { NIGERIAN_PORTS, type PortDefinition } from "./config/ports.js";
import { STORAGE } from "./config/settings.js";
import { mkdir } from "fs/promises";
import { getLatestForPort, getProductDownloadUrl } from "./acquisition/stac-client.js";
import { acquireProduct } from "./acquisition/downloader.js";
import { readGeoTIFF } from "./preprocessing/geotiff-reader.js";
import { preprocessSAR } from "./preprocessing/sar-processor.js";
import { generateTiles, remapDetections, mergeAllTileDetections } from "./preprocessing/tiler.js";
import { loadModel, batchDetect } from "./detection/onnx-detector.js";
import { postProcess, validateWaterLocations } from "./detection/post-processor.js";
import { georeferenceDetections } from "./geospatial/georeferencer.js";
import { testConnection, closePool } from "./database/connection.js";
import {
  getPortIdByName,
  isProductProcessed,
  insertImage,
  insertDetections,
  markImageProcessed,
} from "./database/queries.js";
import { updateDailyStats } from "./analytics/statistics.js";

// ============================================================
// Configuration
// ============================================================

const SCHEDULE_HOUR = parseInt(process.env.SCHEDULE_HOUR ?? "6", 10);   // UTC hour to run (0–23)
const SCHEDULE_MINUTE = parseInt(process.env.SCHEDULE_MINUTE ?? "0", 10); // UTC minute to run
const RUN_ON_STARTUP = process.env.RUN_ON_STARTUP === "true";

// ============================================================
// Helpers
// ============================================================

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getNextRunMs(): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(SCHEDULE_HOUR, SCHEDULE_MINUTE, 0, 0);

  // If that time has already passed today, schedule for tomorrow
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

function log(msg: string) {
  console.log(`[Scheduler ${new Date().toISOString()}] ${msg}`);
}

// ============================================================
// Single Port Processing (reused from pipeline.ts)
// ============================================================

async function processPort(port: PortDefinition) {
  const startTime = Date.now();
  log(`Processing: ${port.name} (${port.state})`);

  try {
    const portId = await getPortIdByName(port.name);
    if (!portId) {
      return { port: port.name, status: "error" as const, detections: 0, error: "Port not in DB", durationMs: Date.now() - startTime };
    }

    const latestProduct = await getLatestForPort(port);
    if (!latestProduct) {
      log(`  → No recent Sentinel-1 data for ${port.name}`);
      return { port: port.name, status: "no_data" as const, detections: 0, durationMs: Date.now() - startTime };
    }

    const productId = latestProduct.id;
    const acquisitionDate = latestProduct.properties.datetime;

    if (await isProductProcessed(productId, portId)) {
      log(`  → Already processed: ${productId}`);
      return { port: port.name, status: "skipped" as const, detections: 0, durationMs: Date.now() - startTime };
    }

    const downloadUrl = getProductDownloadUrl(latestProduct);
    if (!downloadUrl) throw new Error("Could not determine download URL");

    const vvPath = await acquireProduct(downloadUrl, productId);
    const imageId = await insertImage({
      acquisitionDate,
      productId,
      imagePath: vvPath,
      portId,
      metadata: {
        orbitDirection: latestProduct.properties["s1:orbit_direction"],
        polarizations: latestProduct.properties["sar:polarizations"],
      },
    });

    const geotiff = await readGeoTIFF(vvPath);
    const processed = preprocessSAR(geotiff);
    const tiles = generateTiles(processed.data, processed.width, processed.height);
    const model = await loadModel();
    const tileResults = await batchDetect(model, tiles);
    const allRemapped = tileResults.map((result, i) => remapDetections(result.detections, tiles[i]));
    const merged = mergeAllTileDetections(allRemapped);
    const postProcessed = postProcess(merged);
    const georeferenced = georeferenceDetections(postProcessed, processed.geoTransform);
    const validated = validateWaterLocations(georeferenced, port.polygon);
    const insertedCount = await insertDetections(validated, imageId, portId);
    await markImageProcessed(imageId, tiles.length, insertedCount);

    const dateStr = new Date(acquisitionDate).toISOString().split("T")[0];
    await updateDailyStats(dateStr, portId, insertedCount);

    log(`  ✓ ${port.name}: ${insertedCount} vessels detected`);
    return { port: port.name, status: "success" as const, detections: insertedCount, durationMs: Date.now() - startTime };

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`  ✗ ${port.name}: ${message}`);
    return { port: port.name, status: "error" as const, detections: 0, error: message, durationMs: Date.now() - startTime };
  }
}

// ============================================================
// One Full Pipeline Run
// ============================================================

async function runPipeline(): Promise<void> {
  const runStart = Date.now();
  log("═".repeat(56));
  log("Starting scheduled pipeline run");
  log("═".repeat(56));

  await mkdir(STORAGE.RAW_DIR, { recursive: true });
  await mkdir(STORAGE.PROCESSED_DIR, { recursive: true });
  await mkdir(STORAGE.TILES_DIR, { recursive: true });

  const dbOk = await testConnection();
  if (!dbOk) {
    log("✗ Database connection failed — aborting this run");
    return;
  }

  const results = [];
  for (const port of NIGERIAN_PORTS) {
    results.push(await processPort(port));
  }

  const successful = results.filter((r) => r.status === "success").length;
  const skipped   = results.filter((r) => r.status === "skipped").length;
  const noData    = results.filter((r) => r.status === "no_data").length;
  const errors    = results.filter((r) => r.status === "error").length;
  const total     = results.reduce((s, r) => s + r.detections, 0);

  log("─".repeat(56));
  log(`Run complete in ${formatDuration(Date.now() - runStart)}`);
  log(`  Successful : ${successful}  |  Skipped: ${skipped}  |  No data: ${noData}  |  Errors: ${errors}`);
  log(`  Total new vessels detected: ${total}`);
  log("─".repeat(56));
}

// ============================================================
// Scheduler Loop
// ============================================================

let shuttingDown = false;

async function scheduleLoop(): Promise<void> {
  // Optionally run immediately on startup
  if (RUN_ON_STARTUP) {
    log("RUN_ON_STARTUP=true — running pipeline now before entering schedule loop");
    await runPipeline();
  }

  while (!shuttingDown) {
    const waitMs = getNextRunMs();
    const nextRun = new Date(Date.now() + waitMs);

    log(`Next run scheduled at ${nextRun.toUTCString()} (in ${formatDuration(waitMs)})`);

    // Sleep until next scheduled time, checking every minute for shutdown
    const sleepChunkMs = 60_000; // wake up every minute to check for shutdown
    let waited = 0;
    while (waited < waitMs && !shuttingDown) {
      const chunk = Math.min(sleepChunkMs, waitMs - waited);
      await Bun.sleep(chunk);
      waited += chunk;
    }

    if (!shuttingDown) {
      await runPipeline();
    }
  }
}

// ============================================================
// Graceful Shutdown
// ============================================================

async function shutdown(signal: string) {
  log(`Received ${signal} — shutting down gracefully...`);
  shuttingDown = true;
  await closePool();
  log("Database pool closed. Goodbye.");
  process.exit(0);
}

process.on("SIGINT",  () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ============================================================
// Main
// ============================================================

console.log("╔════════════════════════════════════════════════════════╗");
console.log("║  Nigeria Maritime Intelligence — Pipeline Scheduler   ║");
console.log("╚════════════════════════════════════════════════════════╝");
log(`Schedule: daily at ${String(SCHEDULE_HOUR).padStart(2, "0")}:${String(SCHEDULE_MINUTE).padStart(2, "0")} UTC`);
log(`Ports monitored: ${NIGERIAN_PORTS.length}`);
log("Press Ctrl+C to stop.");
console.log("");

scheduleLoop().catch(async (err) => {
  console.error("Fatal scheduler error:", err);
  await closePool();
  process.exit(1);
});
