/**
 * Image Tiler
 *
 * Splits preprocessed SAR images into overlapping tiles
 * suitable for YOLO model inference. Handles tile generation,
 * coordinate tracking, and detection remapping.
 */

import { PREPROCESSING } from "../config/settings.js";

// ============================================================
// Types
// ============================================================

export interface Tile {
  /** Tile image data (single-band Uint8Array) */
  data: Uint8Array;
  /** Tile width */
  width: number;
  /** Tile height */
  height: number;
  /** Origin X in full image pixel coords */
  originX: number;
  /** Origin Y in full image pixel coords */
  originY: number;
  /** Tile index */
  index: number;
}

export interface TileDetection {
  /** Bounding box center X in tile pixel coords */
  x: number;
  /** Bounding box center Y in tile pixel coords */
  y: number;
  /** Bounding box width */
  w: number;
  /** Bounding box height */
  h: number;
  /** Detection confidence score */
  confidence: number;
}

export interface RemappedDetection {
  /** Bounding box center X in full-image pixel coords */
  x: number;
  /** Bounding box center Y in full-image pixel coords */
  y: number;
  /** Bounding box width */
  w: number;
  /** Bounding box height */
  h: number;
  /** Detection confidence score */
  confidence: number;
}

// ============================================================
// Tile Generation
// ============================================================

/**
 * Generate overlapping tiles from a preprocessed SAR image.
 *
 * Uses a sliding window with configurable tile size and overlap.
 * Tiles at the edges are padded with zeros if they extend beyond
 * the image boundary.
 */
export function generateTiles(
  data: Uint8Array,
  width: number,
  height: number,
  tileSize: number = PREPROCESSING.TILE_SIZE,
  overlap: number = PREPROCESSING.TILE_OVERLAP
): Tile[] {
  const stride = tileSize - overlap;
  const tiles: Tile[] = [];
  let index = 0;

  const numTilesX = Math.ceil((width - overlap) / stride);
  const numTilesY = Math.ceil((height - overlap) / stride);

  console.log(
    `[Tiler] Generating ${numTilesX}x${numTilesY} = ${numTilesX * numTilesY} tiles ` +
      `(size=${tileSize}, overlap=${overlap}, stride=${stride})`
  );

  for (let ty = 0; ty < numTilesY; ty++) {
    for (let tx = 0; tx < numTilesX; tx++) {
      const originX = tx * stride;
      const originY = ty * stride;

      // Create tile buffer (zero-padded)
      const tileData = new Uint8Array(tileSize * tileSize);

      // Copy pixels from source image
      for (let y = 0; y < tileSize; y++) {
        for (let x = 0; x < tileSize; x++) {
          const srcX = originX + x;
          const srcY = originY + y;

          if (srcX < width && srcY < height) {
            tileData[y * tileSize + x] = data[srcY * width + srcX];
          }
          // else: already 0 (zero-padded)
        }
      }

      tiles.push({
        data: tileData,
        width: tileSize,
        height: tileSize,
        originX,
        originY,
        index: index++,
      });
    }
  }

  console.log(`[Tiler] Generated ${tiles.length} tiles`);
  return tiles;
}

// ============================================================
// Detection Remapping
// ============================================================

/**
 * Remap tile-local detections back to full-image pixel coordinates.
 */
export function remapDetections(
  detections: TileDetection[],
  tile: Tile
): RemappedDetection[] {
  return detections.map((det) => ({
    x: det.x + tile.originX,
    y: det.y + tile.originY,
    w: det.w,
    h: det.h,
    confidence: det.confidence,
  }));
}

/**
 * Merge detections from all tiles, accounting for duplicates
 * in overlapping regions. Uses the detection's full-image coordinates.
 */
export function mergeAllTileDetections(
  allDetections: RemappedDetection[][]
): RemappedDetection[] {
  // Flatten all detections
  const merged: RemappedDetection[] = [];
  for (const tileDets of allDetections) {
    merged.push(...tileDets);
  }

  console.log(
    `[Tiler] Merged ${merged.length} detections from ${allDetections.length} tiles`
  );
  return merged;
}
