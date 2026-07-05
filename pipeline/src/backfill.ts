/**
 * Historical Backfill CLI
 *
 * Processes Sentinel-1 imagery for any historical date range.
 * Useful for catching up missed runs or building a historical dataset.
 *
 * Usage:
 *   bun run src/backfill.ts --from 2026-06-01 --to 2026-06-24
 *   bun run src/backfill.ts --days 30              # last 30 days
 *   bun run src/backfill.ts --from 2026-06-01      # from date to today
 *   bun run src/backfill.ts --port "Apapa Port" --days 14  # single port
 *   bun run src/backfill.ts --dry-run --days 7     # preview without downloading
 */

import { parseArgs } from "util";
import { mkdir } from "fs/promises";
import { NIGERIAN_PORTS, type PortDefinition } from "./config/ports.js";
import { STORAGE } from "./config/settings.js";
import { getProductsForPort, getProductDownloadUrl } from "./acquisition/stac-client.js";
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
// CLI Argument Parsing
// ============================================================

const { values: args } = parseArgs({
  args: process.argv.slice(2),
  options: {
    from:    { type: "string" },   // YYYY-MM-DD start date
    to:      { type: "string" },   // YYYY-MM-DD end date (default: today)
    days:    { type: "string" },   // Shortcut: last N days
    port:    { type: "string" },   // Filter to a single port by name
    "dry-run": { type: "boolean", default: false },  // Preview only
    help:    { type: "boolean", default: false },
  },
  strict: false,
});

if (args.help) {
  console.log(`
Nigeria Maritime Intelligence — Backfill CLI
─────────────────────────────────────────────
Usage:
  bun run src/backfill.ts --from 2026-06-01 --to 2026-06-24
  bun run src/backfill.ts --days 30
  bun run src/backfill.ts --from 2026-06-01 --port "Apapa Port"
  bun run src/backfill.ts --dry-run --days 14

Options:
  --from   YYYY-MM-DD   Start date (required unless --days is set)
  --to     YYYY-MM-DD   End date (default: today)
  --days   N            Shortcut for --from = today minus N days
  --port   "Name"       Process only this port (default: all 6 ports)
  --dry-run             Query the catalog and list products but don't download
  --help                Show this help message
`);
  process.exit(0);
}

// ============================================================
// Date Resolution
// ============================================================

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function resolveDates(): { dateFrom: string; dateTo: string } {
  const today = toDateStr(new Date());

  if (args.days) {
    const n = parseInt(args.days, 10);
    if (isNaN(n) || n <= 0) {
      console.error("Error: --days must be a positive integer");
      process.exit(1);
    }
    const from = new Date();
    from.setDate(from.getDate() - n);
    return { dateFrom: toDateStr(from), dateTo: today };
  }

  if (!args.from) {
    console.error("Error: provide --from <YYYY-MM-DD> or --days <N>");
    console.error("Run with --help for usage.");
    process.exit(1);
  }

  return {
    dateFrom: args.from,
    dateTo: args.to ?? today,
  };
}

// ============================================================
// Port Filter
// ============================================================

function resolvePorts(): PortDefinition[] {
  if (!args.port) return NIGERIAN_PORTS;

  const match = NIGERIAN_PORTS.find(
    (p) => p.name.toLowerCase() === (args.port as string).toLowerCase()
  );
  if (!match) {
    console.error(`Error: Port "${args.port}" not found.`);
    console.error("Available ports:");
    NIGERIAN_PORTS.forEach((p) => console.error(`  • ${p.name}`));
    process.exit(1);
  }
  return [match];
}

// ============================================================
// Process one satellite product for one port
// ============================================================

interface ProductResult {
  port: string;
  productId: string;
  date: string;
  status: "success" | "skipped" | "error" | "dry-run";
  detections: number;
  error?: string;
}

async function processProduct(
  port: PortDefinition,
  portId: number,
  productId: string,
  acquisitionDate: string,
  downloadUrl: string,
  dryRun: boolean
): Promise<ProductResult> {
  if (dryRun) {
    return { port: port.name, productId, date: acquisitionDate.split("T")[0], status: "dry-run", detections: 0 };
  }

  try {
    const alreadyProcessed = await isProductProcessed(productId, portId);
    if (alreadyProcessed) {
      console.log(`    → Already processed, skipping`);
      return { port: port.name, productId, date: acquisitionDate.split("T")[0], status: "skipped", detections: 0 };
    }

    const vvPath = await acquireProduct(downloadUrl, productId);
    const imageId = await insertImage({ acquisitionDate, productId, imagePath: vvPath, portId, metadata: {} });
    const geotiff = await readGeoTIFF(vvPath);
    const processed = preprocessSAR(geotiff);
    const tiles = generateTiles(processed.data, processed.width, processed.height);
    const model = await loadModel();
    const tileResults = await batchDetect(model, tiles);
    const allRemapped = tileResults.map((r, i) => remapDetections(r.detections, tiles[i]));
    const merged = mergeAllTileDetections(allRemapped);
    const postProcessed = postProcess(merged);
    const georeferenced = georeferenceDetections(postProcessed, processed.geoTransform);
    const validated = validateWaterLocations(georeferenced, port.polygon);
    const insertedCount = await insertDetections(validated, imageId, portId);
    await markImageProcessed(imageId, tiles.length, insertedCount);
    const dateStr = new Date(acquisitionDate).toISOString().split("T")[0];
    await updateDailyStats(dateStr, portId, insertedCount);

    console.log(`    ✓ ${insertedCount} vessels detected`);
    return { port: port.name, productId, date: acquisitionDate.split("T")[0], status: "success", detections: insertedCount };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`    ✗ Error: ${message}`);
    return { port: port.name, productId, date: acquisitionDate.split("T")[0], status: "error", detections: 0, error: message };
  }
}

// ============================================================
// Main Backfill Logic
// ============================================================

async function main() {
  const { dateFrom, dateTo } = resolveDates();
  const ports = resolvePorts();
  const dryRun = args["dry-run"] as boolean;

  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║  Nigeria Maritime Intelligence — Historical Backfill  ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  console.log(`  Date range : ${dateFrom} → ${dateTo}`);
  console.log(`  Ports      : ${ports.map((p) => p.name).join(", ")}`);
  console.log(`  Mode       : ${dryRun ? "DRY RUN (no downloads)" : "LIVE"}`);
  console.log("");

  if (!dryRun) {
    const dbOk = await testConnection();
    if (!dbOk) {
      console.error("✗ Database connection failed. Aborting.");
      process.exit(1);
    }
    await mkdir(STORAGE.RAW_DIR, { recursive: true });
    await mkdir(STORAGE.PROCESSED_DIR, { recursive: true });
    await mkdir(STORAGE.TILES_DIR, { recursive: true });
  }

  const allResults: ProductResult[] = [];

  for (const port of ports) {
    console.log(`\n⚓ ${port.name} (${port.state})`);
    console.log(`   Searching STAC catalog: ${dateFrom} → ${dateTo} ...`);

    let portId: number | null = null;
    if (!dryRun) {
      portId = await getPortIdByName(port.name);
      if (!portId) {
        console.error(`   ✗ Port not found in database — skipping`);
        continue;
      }
    }

    // Fetch all products in the date range (up to 50 per port)
    const products = await getProductsForPort(port, dateFrom, dateTo, 50);

    if (products.length === 0) {
      console.log(`   No satellite passes found in this range.`);
      continue;
    }

    console.log(`   Found ${products.length} satellite pass(es):`);

    for (const product of products) {
      const acquisitionDate = product.properties.datetime;
      const dateLabel = acquisitionDate.split("T")[0];
      console.log(`\n   📡 ${product.id} (${dateLabel})`);

      const downloadUrl = getProductDownloadUrl(product);
      if (!downloadUrl) {
        console.log(`    ⚠ No download URL — skipping`);
        continue;
      }

      if (dryRun) {
        console.log(`    → [DRY RUN] Would download and process this product`);
        allResults.push({ port: port.name, productId: product.id, date: dateLabel, status: "dry-run", detections: 0 });
        continue;
      }

      const result = await processProduct(
        port,
        portId!,
        product.id,
        acquisitionDate,
        downloadUrl,
        false
      );
      allResults.push(result);
    }
  }

  // ─── Summary ────────────────────────────────────────────────
  console.log(`\n${"═".repeat(58)}`);
  console.log("BACKFILL SUMMARY");
  console.log("═".repeat(58));

  if (allResults.length === 0) {
    console.log("No satellite products found for the specified range.");
  } else {
    console.table(
      allResults.map((r) => ({
        Port: r.port,
        Date: r.date,
        Status: r.status,
        Detections: r.detections,
        Error: r.error ?? "—",
      }))
    );

    const success  = allResults.filter((r) => r.status === "success").length;
    const skipped  = allResults.filter((r) => r.status === "skipped").length;
    const errors   = allResults.filter((r) => r.status === "error").length;
    const dryRuns  = allResults.filter((r) => r.status === "dry-run").length;
    const total    = allResults.reduce((s, r) => s + r.detections, 0);

    console.log(`\nProcessed : ${success}  |  Skipped: ${skipped}  |  Errors: ${errors}  |  Dry-run: ${dryRuns}`);
    console.log(`Total new vessels detected: ${total}`);
  }

  if (!dryRun) await closePool();
  console.log("\nDone.");
}

main().catch(async (err) => {
  console.error("Fatal backfill error:", err);
  await closePool().catch(() => {});
  process.exit(1);
});
