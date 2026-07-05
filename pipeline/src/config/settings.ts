import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(import.meta.dir, "../../.env") });

// ============================================================
// Database
// ============================================================
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://maritime:maritime_secret@localhost:5432/maritime_intel";

// ============================================================
// Copernicus Data Space Ecosystem
// ============================================================
export const CDSE = {
  // New STAC v1 endpoint (Sentinel-1 search via OData is more reliable)
  STAC_URL: "https://stac.dataspace.copernicus.eu/v1",
  // OData v1 catalog — the primary working endpoint for Sentinel-1 search
  ODATA_URL: "https://catalogue.dataspace.copernicus.eu/odata/v1",
  TOKEN_URL:
    "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
  DOWNLOAD_BASE: "https://zipper.dataspace.copernicus.eu/odata/v1",
  USERNAME: process.env.CDSE_USERNAME || "",
  PASSWORD: process.env.CDSE_PASSWORD || "",
  COLLECTION: "SENTINEL-1",
  PRODUCT_TYPE: "IW_GRDH_1S",
  POLARIZATION: "VV",
};

// ============================================================
// Detection
// ============================================================
export const DETECTION = {
  CONFIDENCE_THRESHOLD: parseFloat(
    process.env.DETECTION_CONFIDENCE_THRESHOLD || "0.50"
  ),
  NMS_IOU_THRESHOLD: 0.45,
  MODEL_INPUT_SIZE: 640,
  ONNX_MODEL_PATH:
    process.env.ONNX_MODEL_PATH ||
    resolve(import.meta.dir, "../../models/yolov8-vessel.onnx"),
};

// ============================================================
// Preprocessing
// ============================================================
export const PREPROCESSING = {
  TILE_SIZE: parseInt(process.env.TILE_SIZE || "512", 10),
  TILE_OVERLAP: parseInt(process.env.TILE_OVERLAP || "64", 10),
  LEE_FILTER_WINDOW: 7,
};

// ============================================================
// Storage
// ============================================================
export const DATA_DIR = resolve(
  import.meta.dir,
  process.env.DATA_DIR || "../../data"
);

export const STORAGE = {
  RAW_DIR: resolve(DATA_DIR, "raw"),
  PROCESSED_DIR: resolve(DATA_DIR, "processed"),
  TILES_DIR: resolve(DATA_DIR, "tiles"),
};
