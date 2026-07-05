/**
 * SAR Image Processor
 *
 * Preprocessing pipeline for Sentinel-1 SAR imagery:
 * - Lee speckle filter (noise reduction)
 * - dB conversion
 * - Normalization (0–255 for model input)
 * - Port clipping
 */

import { PREPROCESSING } from "../config/settings.js";
import type { GeoTIFFData } from "./geotiff-reader.js";

// ============================================================
// Lee Speckle Filter
// ============================================================

/**
 * Apply Lee speckle noise filter to SAR image data.
 *
 * The Lee filter computes local statistics (mean, variance) within a
 * sliding window and applies adaptive smoothing:
 *   filtered = mean + K * (pixel - mean)
 *   where K = max(0, 1 - variance_noise / variance_local)
 *
 * This preserves edges while reducing speckle in homogeneous areas.
 */
export function applyLeeFilter(
  data: Float32Array,
  width: number,
  height: number,
  windowSize: number = PREPROCESSING.LEE_FILTER_WINDOW
): Float32Array {
  console.log(
    `[SAR] Applying Lee filter (window=${windowSize}) on ${width}x${height} image`
  );

  const output = new Float32Array(data.length);
  const halfWindow = Math.floor(windowSize / 2);

  // Estimate global noise variance (using the entire image)
  // For SAR, noise variance ≈ mean² for fully developed speckle
  let globalSum = 0;
  let globalSumSq = 0;
  let validCount = 0;

  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0 && isFinite(data[i])) {
      globalSum += data[i];
      globalSumSq += data[i] * data[i];
      validCount++;
    }
  }

  const globalMean = globalSum / validCount;
  const globalVariance = globalSumSq / validCount - globalMean * globalMean;
  const noiseVariance = globalVariance * 0.25; // Approximate for 1-look SAR

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const centerVal = data[idx];

      // Skip invalid pixels
      if (centerVal <= 0 || !isFinite(centerVal)) {
        output[idx] = 0;
        continue;
      }

      // Compute local statistics within the window
      let localSum = 0;
      let localSumSq = 0;
      let count = 0;

      const yStart = Math.max(0, y - halfWindow);
      const yEnd = Math.min(height - 1, y + halfWindow);
      const xStart = Math.max(0, x - halfWindow);
      const xEnd = Math.min(width - 1, x + halfWindow);

      for (let wy = yStart; wy <= yEnd; wy++) {
        for (let wx = xStart; wx <= xEnd; wx++) {
          const val = data[wy * width + wx];
          if (val > 0 && isFinite(val)) {
            localSum += val;
            localSumSq += val * val;
            count++;
          }
        }
      }

      if (count === 0) {
        output[idx] = 0;
        continue;
      }

      const localMean = localSum / count;
      const localVariance = localSumSq / count - localMean * localMean;

      // Compute weighting factor K
      // K = 1 → keep original pixel (high local variance = edge/target)
      // K = 0 → use local mean (low local variance = homogeneous area)
      const K = Math.max(
        0,
        Math.min(1, (localVariance - noiseVariance) / Math.max(localVariance, 1e-10))
      );

      output[idx] = localMean + K * (centerVal - localMean);
    }
  }

  console.log(`[SAR] Lee filter complete`);
  return output;
}

// ============================================================
// dB Conversion
// ============================================================

/**
 * Convert linear SAR intensity values to decibel (dB) scale.
 * dB = 10 * log10(intensity)
 */
export function convertToDb(data: Float32Array): Float32Array {
  console.log(`[SAR] Converting to dB scale`);

  const output = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    if (data[i] > 0 && isFinite(data[i])) {
      output[i] = 10 * Math.log10(data[i]);
    } else {
      output[i] = -50; // Floor value for invalid/zero pixels
    }
  }

  return output;
}

// ============================================================
// Normalization
// ============================================================

/**
 * Normalize image data to 0–255 uint8 range using percentile clipping.
 * Uses 2nd and 98th percentiles to handle outliers.
 */
export function normalize(data: Float32Array): Uint8Array {
  console.log(`[SAR] Normalizing to 0-255`);

  // Find valid values and sort for percentile calculation
  const validValues: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (isFinite(data[i]) && data[i] > -50) {
      validValues.push(data[i]);
    }
  }
  validValues.sort((a, b) => a - b);

  // Compute percentiles for robust normalization
  const p2Index = Math.floor(validValues.length * 0.02);
  const p98Index = Math.floor(validValues.length * 0.98);
  const minVal = validValues[p2Index] || -30;
  const maxVal = validValues[p98Index] || 0;
  const range = maxVal - minVal || 1;

  console.log(
    `[SAR] Normalization range: [${minVal.toFixed(2)}, ${maxVal.toFixed(2)}] dB`
  );

  const output = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const clamped = Math.max(minVal, Math.min(maxVal, data[i]));
    output[i] = Math.round(((clamped - minVal) / range) * 255);
  }

  return output;
}

// ============================================================
// Full Preprocessing Pipeline
// ============================================================

/**
 * Run the full SAR preprocessing pipeline on a GeoTIFF:
 * 1. Lee speckle filter
 * 2. Convert to dB
 * 3. Normalize to 0-255
 *
 * Returns processed Uint8Array ready for tiling and model inference.
 */
export function preprocessSAR(geotiff: GeoTIFFData): {
  data: Uint8Array;
  width: number;
  height: number;
  geoTransform: number[];
} {
  console.log(`[SAR] Starting preprocessing pipeline`);

  // Step 1: Speckle reduction
  const filtered = applyLeeFilter(
    geotiff.data,
    geotiff.width,
    geotiff.height
  );

  // Step 2: Convert to dB scale
  const dbData = convertToDb(filtered);

  // Step 3: Normalize to 0-255
  const normalized = normalize(dbData);

  console.log(`[SAR] Preprocessing complete`);

  return {
    data: normalized,
    width: geotiff.width,
    height: geotiff.height,
    geoTransform: geotiff.geoTransform,
  };
}

/**
 * Convert single-band uint8 SAR image to 3-channel (RGB) Float32Array
 * for YOLO model input. YOLO expects [batch, channels, height, width]
 * normalized to 0.0–1.0.
 */
export function toModelInput(
  data: Uint8Array,
  width: number,
  height: number,
  targetSize: number = 640
): Float32Array {
  // Create 3-channel tensor by repeating the single band
  const tensorSize = 3 * targetSize * targetSize;
  const tensor = new Float32Array(tensorSize);

  const scaleX = width / targetSize;
  const scaleY = height / targetSize;

  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        // Bilinear-ish: nearest neighbor for speed
        const srcX = Math.min(Math.floor(x * scaleX), width - 1);
        const srcY = Math.min(Math.floor(y * scaleY), height - 1);
        const srcIdx = srcY * width + srcX;
        const dstIdx = c * targetSize * targetSize + y * targetSize + x;
        tensor[dstIdx] = data[srcIdx] / 255.0;
      }
    }
  }

  return tensor;
}
