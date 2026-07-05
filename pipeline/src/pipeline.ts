/**
 * Main Pipeline Orchestrator
 *
 * Executes the full vessel detection pipeline:
 * 1. Discover latest Sentinel-1 imagery for each port
 * 2. Download and extract VV band
 * 3. Preprocess SAR image (Lee filter → dB → normalize)
 * 4. Generate tiles
 * 5. Run YOLO ONNX inference
 * 6. Post-process (NMS, confidence filter)
 * 7. Georeference detections
 * 8. Validate water locations
 * 9. Store in PostGIS
 * 10. Update statistics
 *
 * Run: bun run src/pipeline.ts
 */

import { mkdir } from "fs/promises";
import { NIGERIAN_PORTS, type PortDefinition } from "./config/ports.js";
import { STORAGE } from "./config/settings.js";
import { getLatestForPort, getProductDownloadUrl } from "./acquisition/stac-client.js";
import { acquireProduct } from "./acquisition/downloader.js";
import { readGeoTIFF } from "./preprocessing/geotiff-reader.js";
import { preprocessSAR } from "./preprocessing/sar-processor.js";
import { generateTiles, remapDetections, mergeAllTileDetections } from "./preprocessing/tiler.js";
import { loadModel, batchDetect } from "./detection/onnx-detector.js";
import { postProcess, validateWaterLocations } from "./detection/post-processor.js";
import { georeferenceDetections } from "./geospatial/georeferencer.js";
import { isOnWater } from "./geospatial/water-mask.js";
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
// Pipeline
// ============================================================

interface PipelineResult {
  port: string;
  productId: string | null;
  detections: number;
  status: "success" | "skipped" | "no_data" | "error";
  error?: string;
  durationMs: number;
}

/**
 * Process a single port: discover → download → detect → store.
 */
async function processPort(port: PortDefinition): Promise<PipelineResult> {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Processing: ${port.name} (${port.state})`);
  console.log(`${"=".repeat(60)}`);

  try {
    // Step 1: Get port ID from database
    const portId = await getPortIdByName(port.name);
    if (!portId) {
      return {
        port: port.name,
        productId: null,
        detections: 0,
        status: "error",
        error: `Port "${port.name}" not found in database. Run seed first.`,
        durationMs: Date.now() - startTime,
      };
    }

    // Step 2: Discover latest Sentinel-1 product
    console.log(`[Pipeline] Searching for latest Sentinel-1 data...`);
    const latestProduct = await getLatestForPort(port);

    if (!latestProduct) {
      console.log(`[Pipeline] No recent Sentinel-1 data found for ${port.name}`);
      return {
        port: port.name,
        productId: null,
        detections: 0,
        status: "no_data",
        durationMs: Date.now() - startTime,
      };
    }

    const productId = latestProduct.id;
    const acquisitionDate = latestProduct.properties.datetime;
    console.log(`[Pipeline] Found product: ${productId}`);
    console.log(`[Pipeline] Acquisition date: ${acquisitionDate}`);

    // Step 3: Check if already processed
    const alreadyProcessed = await isProductProcessed(productId, portId);
    if (alreadyProcessed) {
      console.log(`[Pipeline] Product already processed — skipping`);
      return {
        port: port.name,
        productId,
        detections: 0,
        status: "skipped",
        durationMs: Date.now() - startTime,
      };
    }

    // Step 4: Download product
    const downloadUrl = getProductDownloadUrl(latestProduct);
    if (!downloadUrl) {
      throw new Error("Could not determine download URL for product");
    }

    const vvPath = await acquireProduct(downloadUrl, productId);

    // Step 5: Insert image record
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

    // Step 6: Read and preprocess GeoTIFF
    const geotiff = await readGeoTIFF(vvPath);
    const processed = preprocessSAR(geotiff);

    // Step 7: Generate tiles
    const tiles = generateTiles(processed.data, processed.width, processed.height);

    // Step 8: Run YOLO inference
    const model = await loadModel();
    const tileResults = await batchDetect(model, tiles);

    // Step 9: Remap detections to full image coords
    const allRemapped = tileResults.map((result, i) =>
      remapDetections(result.detections, tiles[i])
    );
    const mergedDetections = mergeAllTileDetections(allRemapped);

    // Step 10: Post-process (NMS + confidence filter)
    const postProcessed = postProcess(mergedDetections);

    // Step 11: Georeference
    const georeferenced = georeferenceDetections(
      postProcessed,
      processed.geoTransform
    );

    // Step 12: Water validation — primary filter (port polygon + 150m buffer)
    const validated = validateWaterLocations(georeferenced, port.polygon);

    // Step 12b: Backstop — reject any remaining detections that land on the
    // coarse ocean mask (catches georeferencing drift or polygon edge cases)
    const waterFiltered = validated.filter((d) => isOnWater(d.lon, d.lat));
    if (waterFiltered.length < validated.length) {
      console.log(
        `[Pipeline] Ocean backstop: ${validated.length} → ${waterFiltered.length} ` +
        `(${validated.length - waterFiltered.length} additional land detections removed)`
      );
    }

    // Step 12c: Log confidence distribution for model quality monitoring
    const confBuckets = { high: 0, medium: 0, low: 0 };
    for (const d of waterFiltered) {
      if (d.confidence >= 0.80) confBuckets.high++;
      else if (d.confidence >= 0.60) confBuckets.medium++;
      else confBuckets.low++;
    }
    console.log(
      `[Pipeline] Confidence distribution: ` +
      `high(≥0.80)=${confBuckets.high} ` +
      `medium(0.60–0.80)=${confBuckets.medium} ` +
      `low(0.50–0.60)=${confBuckets.low}`
    );

    // Step 13: Store detections
    const insertedCount = await insertDetections(waterFiltered, imageId, portId);

    // Step 14: Mark image as processed
    await markImageProcessed(imageId, tiles.length, insertedCount);

    // Step 15: Update statistics
    const dateStr = new Date(acquisitionDate).toISOString().split("T")[0];
    await updateDailyStats(dateStr, portId, insertedCount);

    console.log(
      `[Pipeline] ✓ ${port.name}: ${insertedCount} vessels detected`
    );

    return {
      port: port.name,
      productId,
      detections: insertedCount,
      status: "success",
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Pipeline] ✗ ${port.name}: ${message}`);

    return {
      port: port.name,
      productId: null,
      detections: 0,
      status: "error",
      error: message,
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================
// Main Entry Point
// ============================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Nigeria Maritime Intelligence — Detection Pipeline ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nStarted at: ${new Date().toISOString()}`);
  console.log(`Ports to process: ${NIGERIAN_PORTS.length}`);

  // Ensure storage directories exist
  await mkdir(STORAGE.RAW_DIR, { recursive: true });
  await mkdir(STORAGE.PROCESSED_DIR, { recursive: true });
  await mkdir(STORAGE.TILES_DIR, { recursive: true });

  // Test database connection
  const dbOk = await testConnection();
  if (!dbOk) {
    console.error("\n✗ Database connection failed. Aborting.");
    process.exit(1);
  }

  // Process each port
  const results: PipelineResult[] = [];
  for (const port of NIGERIAN_PORTS) {
    const result = await processPort(port);
    results.push(result);
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`);
  console.log("PIPELINE SUMMARY");
  console.log(`${"=".repeat(60)}`);

  const successful = results.filter((r) => r.status === "success");
  const skipped = results.filter((r) => r.status === "skipped");
  const noData = results.filter((r) => r.status === "no_data");
  const errors = results.filter((r) => r.status === "error");
  const totalDetections = results.reduce((sum, r) => sum + r.detections, 0);

  console.table(
    results.map((r) => ({
      Port: r.port,
      Status: r.status,
      Detections: r.detections,
      "Duration (s)": (r.durationMs / 1000).toFixed(1),
      Error: r.error || "—",
    }))
  );

  console.log(`\nSuccessful: ${successful.length}`);
  console.log(`Skipped (already processed): ${skipped.length}`);
  console.log(`No data available: ${noData.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Total vessels detected: ${totalDetections}`);
  console.log(`\nFinished at: ${new Date().toISOString()}`);

  await closePool();
}

main().catch((error) => {
  console.error("Fatal pipeline error:", error);
  closePool().then(() => process.exit(1));
});
