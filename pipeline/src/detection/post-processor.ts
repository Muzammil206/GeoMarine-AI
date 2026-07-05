/**
 * Post-Processor
 *
 * Validates and filters vessel detections:
 * - Non-Maximum Suppression (NMS) to remove duplicate detections
 * - Confidence threshold filtering
 * - Water location validation (reject land-based false positives)
 */

import * as turf from "@turf/turf";
import { DETECTION } from "../config/settings.js";
import type { RemappedDetection } from "../preprocessing/tiler.js";

// ============================================================
// Non-Maximum Suppression
// ============================================================

/**
 * Apply Non-Maximum Suppression to remove overlapping detections.
 *
 * Critical for tile-overlap regions where the same vessel may be
 * detected in multiple adjacent tiles.
 */
export function applyNMS(
  detections: RemappedDetection[],
  iouThreshold: number = DETECTION.NMS_IOU_THRESHOLD
): RemappedDetection[] {
  if (detections.length === 0) return [];

  // Sort by confidence (descending)
  const sorted = [...detections].sort(
    (a, b) => b.confidence - a.confidence
  );
  const kept: RemappedDetection[] = [];
  const suppressed = new Set<number>();

  for (let i = 0; i < sorted.length; i++) {
    if (suppressed.has(i)) continue;

    kept.push(sorted[i]);

    for (let j = i + 1; j < sorted.length; j++) {
      if (suppressed.has(j)) continue;

      const iou = computeIoU(sorted[i], sorted[j]);
      if (iou > iouThreshold) {
        suppressed.add(j);
      }
    }
  }

  console.log(
    `[PostProc] NMS: ${detections.length} → ${kept.length} detections (suppressed ${suppressed.size})`
  );

  return kept;
}

/**
 * Compute Intersection over Union (IoU) between two bounding boxes.
 */
function computeIoU(a: RemappedDetection, b: RemappedDetection): number {
  const aLeft = a.x - a.w / 2;
  const aRight = a.x + a.w / 2;
  const aTop = a.y - a.h / 2;
  const aBottom = a.y + a.h / 2;

  const bLeft = b.x - b.w / 2;
  const bRight = b.x + b.w / 2;
  const bTop = b.y - b.h / 2;
  const bBottom = b.y + b.h / 2;

  const interLeft = Math.max(aLeft, bLeft);
  const interRight = Math.min(aRight, bRight);
  const interTop = Math.max(aTop, bTop);
  const interBottom = Math.min(aBottom, bBottom);

  if (interLeft >= interRight || interTop >= interBottom) return 0;

  const interArea = (interRight - interLeft) * (interBottom - interTop);
  const aArea = a.w * a.h;
  const bArea = b.w * b.h;

  return interArea / (aArea + bArea - interArea);
}

// ============================================================
// Confidence Filtering
// ============================================================

/**
 * Filter detections by minimum confidence threshold.
 */
export function filterByConfidence(
  detections: RemappedDetection[],
  minConfidence: number = DETECTION.CONFIDENCE_THRESHOLD
): RemappedDetection[] {
  const filtered = detections.filter((d) => d.confidence >= minConfidence);

  console.log(
    `[PostProc] Confidence filter (>= ${minConfidence}): ` +
      `${detections.length} → ${filtered.length} detections`
  );

  return filtered;
}

// ============================================================
// Water Validation
// ============================================================

// Minimum bounding box area in pixels² — below this is noise, not a vessel
const MIN_PIXEL_AREA = 100;
// Max and min vessel aspect ratios (w/h) — real vessels are elongated but not
// infinitely so. Streaks beyond these are SAR range sidelobes or clutter.
const MAX_ASPECT_RATIO = 6.0;
const MIN_ASPECT_RATIO = 0.16; // inverse of 6

/**
 * Validate that detections are located on water, not on land or infrastructure.
 *
 * Applies three sequential filters:
 * 1. Size filter — reject sub-pixel noise (area < MIN_PIXEL_AREA)
 * 2. Aspect ratio filter — reject SAR clutter streaks (w/h > 6 or < 0.16)
 * 3. Water location filter — reject detections on the polygon boundary
 *    (docks, cranes, roads) using a 150m inward edge buffer.
 *
 * The 150m buffer reflects the typical depth of dock infrastructure
 * at Nigerian ports (Apapa, Tin Can, Onne all have >100m quay aprons).
 */
export function validateWaterLocations(
  detections: Array<{ lon: number; lat: number; confidence: number; x: number; y: number; w: number; h: number }>,
  portPolygon: [number, number][],
  edgeBufferMeters: number = 150
): Array<{ lon: number; lat: number; confidence: number; x: number; y: number; w: number; h: number }> {
  if (detections.length === 0) return [];

  let rejectedSize = 0;
  let rejectedAspect = 0;
  let rejectedOutOfPort = 0;
  let rejectedEdge = 0;

  // Create turf polygon from the water-channel boundary
  const polygon = turf.polygon([portPolygon]);

  // Create inner buffer — shrink polygon by edgeBufferMeters to exclude
  // dock aprons, quay walls, and near-shore infrastructure.
  const buffered = turf.buffer(polygon, -edgeBufferMeters / 1000, {
    units: "kilometers",
  });

  const validated: typeof detections = [];

  for (const det of detections) {
    // Filter 1: minimum pixel area (sub-pixel = sensor noise)
    if (det.w * det.h < MIN_PIXEL_AREA) {
      rejectedSize++;
      continue;
    }

    // Filter 2: aspect ratio sanity (SAR range sidelobes are extremely thin)
    const aspectRatio = det.w / det.h;
    if (aspectRatio > MAX_ASPECT_RATIO || aspectRatio < MIN_ASPECT_RATIO) {
      rejectedAspect++;
      continue;
    }

    // Filter 3: point must be within the port water polygon
    const point = turf.point([det.lon, det.lat]);
    const inPort = turf.booleanPointInPolygon(point, polygon);
    if (!inPort) {
      rejectedOutOfPort++;
      continue;
    }

    // Filter 4: point must be inside the inner buffer (away from dock edge)
    if (buffered) {
      const inWater = turf.booleanPointInPolygon(point, buffered);
      if (!inWater) {
        rejectedEdge++;
        continue;
      }
    }

    validated.push(det);
  }

  console.log(
    `[PostProc] Water validation: ${detections.length} → ${validated.length} ` +
    `(rejected: size=${rejectedSize}, aspect=${rejectedAspect}, ` +
    `out-of-port=${rejectedOutOfPort}, edge-zone=${rejectedEdge})`
  );

  return validated;
}

// ============================================================
// Full Post-Processing Pipeline
// ============================================================

/**
 * Run the full post-processing pipeline:
 * 1. Confidence filtering
 * 2. Non-Maximum Suppression
 *
 * Water validation is done separately after georeferencing.
 */
export function postProcess(
  detections: RemappedDetection[],
  confidenceThreshold?: number,
  nmsThreshold?: number
): RemappedDetection[] {
  console.log(
    `[PostProc] Starting post-processing on ${detections.length} raw detections`
  );

  // Step 1: Confidence filter
  const filtered = filterByConfidence(detections, confidenceThreshold);

  // Step 2: NMS
  const nmsResult = applyNMS(filtered, nmsThreshold);

  console.log(
    `[PostProc] Post-processing complete: ${detections.length} → ${nmsResult.length} detections`
  );

  return nmsResult;
}
