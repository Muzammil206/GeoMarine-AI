/**
 * Copernicus Data Space Authenticated Downloader
 *
 * Handles OAuth2 authentication with CDSE and downloads
 * Sentinel-1 GRD product files (ZIP → extract VV GeoTIFF).
 */

import { createWriteStream } from "fs";
import { mkdir, readdir, unlink } from "fs/promises";
import { join, resolve } from "path";
import { pipeline } from "stream/promises";
import { createUnzip } from "zlib";
import { CDSE, STORAGE } from "../config/settings.js";

// ============================================================
// OAuth2 Token Management
// ============================================================

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Obtain an OAuth2 access token from CDSE identity provider.
 */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.token;
  }

  if (!CDSE.USERNAME || !CDSE.PASSWORD) {
    throw new Error(
      "CDSE credentials not configured. Set CDSE_USERNAME and CDSE_PASSWORD in .env"
    );
  }

  console.log("[Downloader] Requesting CDSE access token...");

  const body = new URLSearchParams({
    grant_type: "password",
    username: CDSE.USERNAME,
    password: CDSE.PASSWORD,
    client_id: "cdse-public",
  });

  const response = await fetch(CDSE.TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `CDSE auth failed (${response.status}): ${text.slice(0, 300)}`
    );
  }

  const data: TokenResponse = await response.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  console.log(
    `[Downloader] Token acquired, expires in ${data.expires_in}s`
  );
  return data.access_token;
}

// ============================================================
// Product Download
// ============================================================

/**
 * Download a Sentinel-1 product ZIP from CDSE.
 */
export async function downloadProduct(
  downloadUrl: string,
  productId: string
): Promise<string> {
  const token = await getAccessToken();
  const outputDir = resolve(STORAGE.RAW_DIR, productId);
  const zipPath = join(outputDir, `${productId}.zip`);

  await mkdir(outputDir, { recursive: true });

  console.log(`[Downloader] Downloading product: ${productId}`);
  console.log(`[Downloader] URL: ${downloadUrl}`);

  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(
      `Download failed (${response.status}): ${response.statusText}`
    );
  }

  if (!response.body) {
    throw new Error("No response body received");
  }

  // Stream to file
  const fileStream = createWriteStream(zipPath);
  const reader = response.body.getReader();

  let downloaded = 0;
  const contentLength = parseInt(
    response.headers.get("content-length") || "0",
    10
  );

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fileStream.write(value);
    downloaded += value.length;

    if (contentLength > 0) {
      const pct = ((downloaded / contentLength) * 100).toFixed(1);
      process.stdout.write(`\r[Downloader] Progress: ${pct}%`);
    }
  }

  fileStream.end();
  console.log(`\n[Downloader] Downloaded to: ${zipPath}`);

  return zipPath;
}

/**
 * Extract a downloaded ZIP and locate the VV measurement GeoTIFF.
 *
 * Sentinel-1 SAFE format typically stores measurement data at:
 * *.SAFE/measurement/*-vv-*.tiff
 */
export async function extractVVBand(
  zipPath: string,
  outputDir: string
): Promise<string> {
  console.log(`[Downloader] Extracting VV band from: ${zipPath}`);

  await mkdir(outputDir, { recursive: true });

  // Use Bun's native unzip via shell (more reliable for SAFE .zip)
  const proc = Bun.spawn(["unzip", "-o", "-q", zipPath, "-d", outputDir], {
    stdout: "pipe",
    stderr: "pipe",
  });

  await proc.exited;

  if (proc.exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`Unzip failed: ${stderr}`);
  }

  // Find the VV band GeoTIFF
  const vvPath = await findVVFile(outputDir);
  if (!vvPath) {
    throw new Error(
      `No VV measurement band found in extracted product at ${outputDir}`
    );
  }

  console.log(`[Downloader] Found VV band: ${vvPath}`);
  return vvPath;
}

/**
 * Recursively search for the VV polarization measurement file.
 */
async function findVVFile(dir: string): Promise<string | null> {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      const found = await findVVFile(fullPath);
      if (found) return found;
    } else if (
      entry.name.toLowerCase().includes("-vv-") &&
      (entry.name.endsWith(".tiff") || entry.name.endsWith(".tif"))
    ) {
      return fullPath;
    }
  }

  return null;
}

/**
 * Full download workflow: download ZIP → extract → return VV GeoTIFF path.
 */
export async function acquireProduct(
  downloadUrl: string,
  productId: string
): Promise<string> {
  const zipPath = await downloadProduct(downloadUrl, productId);
  const extractDir = resolve(STORAGE.RAW_DIR, productId, "extracted");
  const vvPath = await extractVVBand(zipPath, extractDir);

  // Clean up ZIP to save space
  try {
    await unlink(zipPath);
    console.log(`[Downloader] Cleaned up ZIP file`);
  } catch {
    // Non-critical
  }

  return vvPath;
}
