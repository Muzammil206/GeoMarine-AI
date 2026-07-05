/**
 * Port Seeder
 *
 * Seeds the PostGIS database with Nigerian port boundary polygons.
 * Run once: bun run src/database/seed-ports.ts
 */

import { readFile } from "fs/promises";
import { resolve } from "path";
import { getPool, testConnection, closePool } from "./connection.js";

async function seedPorts() {
  console.log("=== Nigeria Maritime Intelligence — Port Seeder ===\n");

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error("Cannot connect to database. Check DATABASE_URL.");
    process.exit(1);
  }

  const pool = getPool();

  // Read and execute init.sql
  const initPath = resolve(import.meta.dir, "../../../database/init.sql");
  const seedPath = resolve(import.meta.dir, "../../../database/seed.sql");

  try {
    console.log("[Seed] Running init.sql...");
    const initSql = await readFile(initPath, "utf-8");
    await pool.query(initSql);
    console.log("[Seed] Schema created successfully");

    console.log("[Seed] Running seed.sql...");
    const seedSql = await readFile(seedPath, "utf-8");
    await pool.query(seedSql);
    console.log("[Seed] Port boundaries seeded successfully");

    // Verify
    const result = await pool.query(
      `SELECT id, name, state, 
              ST_Area(geom::geography) / 1000000 AS area_km2,
              ST_X(ST_Centroid(geom)) AS center_lon,
              ST_Y(ST_Centroid(geom)) AS center_lat
       FROM ports ORDER BY id`
    );

    console.log("\n--- Seeded Ports ---");
    console.table(
      result.rows.map((r: Record<string, unknown>) => ({
        ID: r.id,
        Name: r.name,
        State: r.state,
        "Area (km²)": Number(r.area_km2).toFixed(2),
        Center: `${Number(r.center_lat).toFixed(4)}°N, ${Number(r.center_lon).toFixed(4)}°E`,
      }))
    );

    console.log(`\n✓ ${result.rows.length} ports seeded successfully`);
  } catch (error) {
    console.error("[Seed] Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

seedPorts();
