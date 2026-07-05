/**
 * GeoTIFF Reader
 *
 * Reads Sentinel-1 SAR GeoTIFF files using the geotiff.js library.
 * Extracts raster data, geo-transform, and metadata.
 */

import { fromFile } from "geotiff";

// ============================================================
// Types
// ============================================================

export interface GeoTIFFData {
  /** Raw raster data as Float32Array */
  data: Float32Array;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Geo-transform: [originX, pixelWidth, 0, originY, 0, pixelHeight] */
  geoTransform: number[];
  /** Bounding box [west, south, east, north] */
  bbox: [number, number, number, number];
  /** Number of bands */
  bands: number;
  /** NoData value if defined */
  noDataValue: number | null;
}

// ============================================================
// Reader
// ============================================================

/**
 * Read a GeoTIFF file and extract the first band as Float32Array.
 */
export async function readGeoTIFF(filePath: string): Promise<GeoTIFFData> {
  console.log(`[GeoTIFF] Reading: ${filePath}`);

  const tiff = await fromFile(filePath);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const bands = image.getSamplesPerPixel();
  const origin = image.getOrigin();
  const resolution = image.getResolution();
  const bbox = image.getBoundingBox() as [number, number, number, number];

  // Read raster data — first band only for SAR VV
  const rasters = await image.readRasters();
  const rawData = rasters[0] as Float32Array | Uint16Array | Int16Array;

  // Convert to Float32Array if needed
  const data =
    rawData instanceof Float32Array
      ? rawData
      : new Float32Array(rawData.length).map((_, i) => rawData[i]);

  // Construct GDAL-style geo-transform
  // [originX, pixelSizeX, rotationX, originY, rotationY, pixelSizeY]
  const geoTransform = [
    origin[0], // originX (top-left longitude)
    resolution[0], // pixel width (degrees per pixel)
    0, // rotation (usually 0)
    origin[1], // originY (top-left latitude)
    0, // rotation (usually 0)
    resolution[1], // pixel height (negative = top-to-bottom)
  ];

  // Get nodata value
  const fileDirectory = image.fileDirectory;
  const noDataValue =
    fileDirectory.GDAL_NODATA !== undefined
      ? parseFloat(String(fileDirectory.GDAL_NODATA))
      : null;

  console.log(`[GeoTIFF] Size: ${width}x${height}, Bands: ${bands}`);
  console.log(
    `[GeoTIFF] Bbox: [${bbox.map((v) => v.toFixed(4)).join(", ")}]`
  );

  return { data, width, height, geoTransform, bbox, bands, noDataValue };
}

/**
 * Read a GeoTIFF and return metadata only (no raster data).
 * Useful for quick checks without loading large raster arrays.
 */
export async function readGeoTIFFMetadata(filePath: string) {
  const tiff = await fromFile(filePath);
  const image = await tiff.getImage();

  return {
    width: image.getWidth(),
    height: image.getHeight(),
    bands: image.getSamplesPerPixel(),
    origin: image.getOrigin(),
    resolution: image.getResolution(),
    bbox: image.getBoundingBox() as [number, number, number, number],
  };
}
