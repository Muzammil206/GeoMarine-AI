/**
 * Database Connection
 *
 * PostgreSQL connection pool using the `pg` library.
 * Connects to cloud PostGIS instance configured via DATABASE_URL.
 */

import { Pool } from "pg";
import { DATABASE_URL } from "../config/settings.js";

let pool: Pool | null = null;

/**
 * Get or create the database connection pool.
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl:
        DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1")
          ? false
          : { rejectUnauthorized: false },
    });

    pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err.message);
    });

    console.log(`[DB] Connection pool created`);
  }
  return pool;
}

/**
 * Test the database connection and verify PostGIS is available.
 */
export async function testConnection(): Promise<boolean> {
  try {
    const p = getPool();
    const result = await p.query("SELECT PostGIS_Version() AS version");
    console.log(
      `[DB] Connected — PostGIS version: ${result.rows[0]?.version}`
    );
    return true;
  } catch (error) {
    console.error(
      `[DB] Connection failed:`,
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/**
 * Close the connection pool gracefully.
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log(`[DB] Connection pool closed`);
  }
}
