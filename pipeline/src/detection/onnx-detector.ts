/**
 * ONNX YOLO Vessel Detector
 *
 * Runs YOLOv8 inference via ONNX Runtime Node.js.
 * No Python runtime needed — the model is pre-exported to ONNX format.
 */

import * as ort from "onnxruntime-node";
import { DETECTION } from "../config/settings.js";
import { toModelInput } from "../preprocessing/sar-processor.js";
import type { Tile, TileDetection } from "../preprocessing/tiler.js";

// ============================================================
// Types
// ============================================================

export interface DetectionResult {
  detections: TileDetection[];
  inferenceTimeMs: number;
}

// ============================================================
// Model Loading
// ============================================================

let session: ort.InferenceSession | null = null;

/**
 * Load the YOLO ONNX model.
 * Cached — only loads once, subsequent calls return the same session.
 */
export async function loadModel(
  modelPath: string = DETECTION.ONNX_MODEL_PATH
): Promise<ort.InferenceSession> {
  if (session) return session;

  console.log(`[Detector] Loading ONNX model: ${modelPath}`);

  const options: ort.InferenceSession.SessionOptions = {
    executionProviders: ["cpu"], // Use 'cuda' if GPU available
    graphOptimizationLevel: "all",
  };

  try {
    session = await ort.InferenceSession.create(modelPath, options);
    console.log(`[Detector] Model loaded successfully`);
    console.log(
      `[Detector] Input names: ${session.inputNames.join(", ")}`
    );
    console.log(
      `[Detector] Output names: ${session.outputNames.join(", ")}`
    );
    return session;
  } catch (error) {
    throw new Error(
      `Failed to load ONNX model at ${modelPath}: ${error instanceof Error ? error.message : error}`
    );
  }
}

// ============================================================
// Inference
// ============================================================

/**
 * Run YOLO inference on a single tile.
 *
 * YOLOv8 ONNX model expects:
 *   Input:  [1, 3, 640, 640] Float32 (normalized 0-1)
 *   Output: [1, 84, 8400] Float32 (for COCO classes) or [1, 5, N] for custom
 *
 * Output format: [x_center, y_center, width, height, ...class_confidences]
 * transposed to [8400, 84] for easier processing.
 */
export async function detectOnTile(
  modelSession: ort.InferenceSession,
  tile: Tile,
  confidenceThreshold: number = DETECTION.CONFIDENCE_THRESHOLD
): Promise<DetectionResult> {
  const inputSize = DETECTION.MODEL_INPUT_SIZE;
  const startTime = Date.now();

  // Prepare input tensor
  const inputData = toModelInput(tile.data, tile.width, tile.height, inputSize);
  const inputTensor = new ort.Tensor("float32", inputData, [
    1,
    3,
    inputSize,
    inputSize,
  ]);

  // Determine the correct input name
  const inputName = modelSession.inputNames[0] || "images";

  // Run inference
  const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };
  const results = await modelSession.run(feeds);

  // Parse output
  const outputName = modelSession.outputNames[0];
  const output = results[outputName];
  const outputData = output.data as Float32Array;
  const outputDims = output.dims as number[];

  const detections = parseYOLOOutput(
    outputData,
    outputDims,
    confidenceThreshold,
    tile.width / inputSize, // scale factor X
    tile.height / inputSize // scale factor Y
  );

  const inferenceTimeMs = Date.now() - startTime;

  return { detections, inferenceTimeMs };
}

/**
 * Parse YOLOv8 output tensor into detection bounding boxes.
 *
 * YOLOv8 output shape: [1, 4 + num_classes, num_predictions]
 * For vessel detection (1 class): [1, 5, N]
 * Row 0-3: x_center, y_center, width, height (in input scale)
 * Row 4+: class confidence scores
 */
function parseYOLOOutput(
  data: Float32Array,
  dims: number[],
  threshold: number,
  scaleX: number,
  scaleY: number
): TileDetection[] {
  const detections: TileDetection[] = [];

  // Handle both [1, 5+, N] and [1, N, 5+] layouts
  let numPredictions: number;
  let numFields: number;
  let transposed: boolean;

  if (dims.length === 3) {
    if (dims[1] < dims[2]) {
      // [1, fields, predictions] — standard YOLOv8
      numFields = dims[1];
      numPredictions = dims[2];
      transposed = true;
    } else {
      // [1, predictions, fields]
      numFields = dims[2];
      numPredictions = dims[1];
      transposed = false;
    }
  } else if (dims.length === 2) {
    numPredictions = dims[0];
    numFields = dims[1];
    transposed = false;
  } else {
    console.warn(`[Detector] Unexpected output dims: [${dims.join(", ")}]`);
    return [];
  }

  const numClasses = numFields - 4;

  for (let i = 0; i < numPredictions; i++) {
    let xc: number, yc: number, w: number, h: number;
    let maxClassConf = 0;

    if (transposed) {
      // data layout: [field][prediction]
      xc = data[0 * numPredictions + i];
      yc = data[1 * numPredictions + i];
      w = data[2 * numPredictions + i];
      h = data[3 * numPredictions + i];

      for (let c = 0; c < numClasses; c++) {
        const conf = data[(4 + c) * numPredictions + i];
        if (conf > maxClassConf) maxClassConf = conf;
      }
    } else {
      const offset = i * numFields;
      xc = data[offset + 0];
      yc = data[offset + 1];
      w = data[offset + 2];
      h = data[offset + 3];

      for (let c = 0; c < numClasses; c++) {
        const conf = data[offset + 4 + c];
        if (conf > maxClassConf) maxClassConf = conf;
      }
    }

    if (maxClassConf >= threshold) {
      detections.push({
        x: xc * scaleX,
        y: yc * scaleY,
        w: w * scaleX,
        h: h * scaleY,
        confidence: maxClassConf,
      });
    }
  }

  return detections;
}

/**
 * Run detection on multiple tiles sequentially.
 */
export async function batchDetect(
  modelSession: ort.InferenceSession,
  tiles: Tile[],
  confidenceThreshold: number = DETECTION.CONFIDENCE_THRESHOLD
): Promise<DetectionResult[]> {
  console.log(
    `[Detector] Running inference on ${tiles.length} tiles (threshold=${confidenceThreshold})`
  );

  const results: DetectionResult[] = [];
  let totalDetections = 0;
  let totalTimeMs = 0;

  for (let i = 0; i < tiles.length; i++) {
    const result = await detectOnTile(
      modelSession,
      tiles[i],
      confidenceThreshold
    );
    results.push(result);
    totalDetections += result.detections.length;
    totalTimeMs += result.inferenceTimeMs;

    if ((i + 1) % 10 === 0 || i === tiles.length - 1) {
      console.log(
        `[Detector] Processed ${i + 1}/${tiles.length} tiles — ` +
          `${totalDetections} detections so far`
      );
    }
  }

  console.log(
    `[Detector] Batch complete: ${totalDetections} total detections ` +
      `in ${totalTimeMs}ms (avg ${(totalTimeMs / tiles.length).toFixed(1)}ms/tile)`
  );

  return results;
}
