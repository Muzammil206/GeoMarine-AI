/**
 * CDSE Credential & Catalog Test
 *
 * Verifies that the Copernicus Data Space Ecosystem (CDSE) credentials
 * in .env are valid and that the STAC catalog returns real Sentinel-1
 * products for each Nigerian port.
 *
 * Run: bun run src/acquisition/test-auth.ts
 */

import { searchSentinel1 } from "./stac-client.js";
import { NIGERIAN_PORTS } from "../config/ports.js";
import { CDSE } from "../config/settings.js";

async function testAuth() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Nigeria Maritime — CDSE Credential & Catalog Test  ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  // ── Check credentials are set ──────────────────────────────────────────────
  console.log("\n1. Checking credentials in environment...");
  if (!CDSE.USERNAME || !CDSE.PASSWORD) {
    console.error(
      "✗ CDSE_USERNAME or CDSE_PASSWORD not set in .env\n" +
      "  Register at: https://dataspace.copernicus.eu/\n" +
      "  Then add to .env:\n" +
      "    CDSE_USERNAME=your@email.com\n" +
      "    CDSE_PASSWORD=yourpassword"
    );
    process.exit(1);
  }
  console.log(`✓ Username: ${CDSE.USERNAME}`);
  console.log(`✓ Password: ${"*".repeat(CDSE.PASSWORD.length)}`);

  // ── Test STAC catalog (no auth required for catalog) ──────────────────────
  console.log("\n2. Testing STAC catalog access (last 14 days)...");

  const today = new Date();
  const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);
  const dateTo = today.toISOString().split("T")[0];
  const dateFrom = twoWeeksAgo.toISOString().split("T")[0];

  console.log(`   Date range: ${dateFrom} to ${dateTo}\n`);

  let totalFound = 0;
  const results: Array<{ port: string; count: number; latest?: string }> = [];

  for (const port of NIGERIAN_PORTS) {
    try {
      const features = await searchSentinel1(port.bbox, dateFrom, dateTo, 3);
      const latest = features[0]?.properties?.datetime ?? "—";
      results.push({ port: port.name, count: features.length, latest });
      totalFound += features.length;

      const status = features.length > 0 ? "✓" : "○";
      console.log(`${status} ${port.name}: ${features.length} products`);
      if (features.length > 0) {
        console.log(`  Latest: ${latest}`);
        console.log(`  ID: ${features[0].id}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`✗ ${port.name}: STAC query failed — ${msg}`);
      results.push({ port: port.name, count: -1 });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(56));
  console.log(`Total products found: ${totalFound}`);

  const portsWithData = results.filter((r) => r.count > 0).length;
  const portsFailed = results.filter((r) => r.count === -1).length;

  if (portsFailed > 0) {
    console.log(`\n⚠ ${portsFailed} port(s) failed catalog query.`);
    console.log("  This may indicate a network issue or STAC endpoint change.");
    console.log("  Check CDSE status: https://dataspace.copernicus.eu/news");
  }

  if (totalFound === 0) {
    console.log(
      "\n⚠ No products found. This could mean:\n" +
      "  1. Sentinel-1 hasn't passed over Nigeria in the last 14 days\n" +
      "     (revisit time is ~6 days — try extending to 30 days)\n" +
      "  2. STAC catalog has an outage\n" +
      "  3. The bbox or collection name has changed\n" +
      "\n  Check: https://catalogue.dataspace.copernicus.eu/stac"
    );
  } else {
    console.log(
      `\n✓ Catalog access confirmed. ${portsWithData}/6 ports have recent imagery.`
    );
    console.log("\nNext step — test download authentication:");
    console.log("  bun run src/pipeline.ts");
    console.log("\nOr run a single-port backfill:");
    console.log("  bun run src/backfill.ts --port \"Apapa Port\" --days 12 --dry-run");
  }
}

testAuth().catch((err) => {
  console.error("\nFatal error:", err);
  process.exit(1);
});
