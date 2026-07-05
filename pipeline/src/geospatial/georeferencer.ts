/**
 * Georeferencer
 *
 * Converts pixel coordinates from detection results into
 * geographic WGS84 coordinates using the GeoTIFF's affine transform.
 */

import type { RemappedDetection } from "../preprocessing/tiler.js";

// ============================================================
// Coordinate Transformation
// ============================================================

/**
 * Convert pixel coordinates to geographic coordinates (lon, lat)
 * using a GDAL-style affine geo-transform.
 *
 * GeoTransform: [originX, pixelWidth, rotX, originY, rotY, pixelHeight]
 *
 * lon = originX + pixelX * pixelWidth + pixelY * rotX
 * lat = originY + pixelX * rotY + pixelY * pixelHeight
 */
export function pixelToCoords(
  pixelX: number,
  pixelY: number,
  geoTransform: number[]
): [number, number] {
  const [originX, pixelWidth, rotX, originY, rotY, pixelHeight] =
    geoTransform;

  const lon = originX + pixelX * pixelWidth + pixelY * rotX;
  const lat = originY + pixelX * rotY + pixelY * pixelHeight;

  return [lon, lat];
}

// ============================================================
// Detection Georeferencing
// ============================================================

export interface GeoReferencedDetection {
  /** Longitude (WGS84) */
  lon: number;
  /** Latitude (WGS84) */
  lat: number;
  /** Detection confidence score */
  confidence: number;
  /** Original pixel bounding box */
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Convert all detections from pixel coordinates to geographic coordinates.
 */
export function georeferenceDetections(
  detections: RemappedDetection[],
  geoTransform: number[]
): GeoReferencedDetection[] {
  console.log(
    `[GeoRef] Georeferencing ${detections.length} detections`
  );

  const georeferenced: GeoReferencedDetection[] = [];

  for (const det of detections) {
    // Use bounding box center as the vessel location
    const [lon, lat] = pixelToCoords(det.x, det.y, geoTransform);

    // Basic sanity check — coordinates should be in Nigerian waters
    if (lon < 2.5 || lon > 9.5 || lat < 3.5 || lat > 7.5) {
      // Outside Nigerian coastal range — likely bad georeference
      continue;
    }

    georeferenced.push({
      lon,
      lat,
      confidence: det.confidence,
      x: det.x,
      y: det.y,
      w: det.w,
      h: det.h,
    });
  }

  console.log(
    `[GeoRef] Georeferenced ${georeferenced.length}/${detections.length} detections ` +
      `(${detections.length - georeferenced.length} rejected — out of bounds)`
  );

  return georeferenced;
}
