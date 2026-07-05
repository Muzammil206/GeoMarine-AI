"""
YOLO → ONNX Model Export Script

One-time script to convert a PyTorch YOLO model to ONNX format
for inference in Node.js via onnxruntime-node.

Usage (base model):
  pip install ultralytics
  python export-yolo-onnx.py

Usage (fine-tuned checkpoint):
  python export-yolo-onnx.py --weights runs/detect/yolov8n-sar-vessel/weights/best.pt

Output:
  ../models/yolov8-vessel.onnx
"""

import os
import argparse
from pathlib import Path

try:
    from ultralytics import YOLO
except ImportError:
    print("Error: ultralytics not installed.")
    print("Run: pip install ultralytics")
    exit(1)

# ============================================================
# CLI arguments
# ============================================================

parser = argparse.ArgumentParser(
    description="Export a YOLO model to ONNX for the maritime detection pipeline."
)
parser.add_argument(
    "--weights",
    type=str,
    default=None,
    help=(
        "Path to a fine-tuned .pt weights file. "
        "If not specified, uses yolov8n.pt (base COCO pretrained model). "
        "Example: runs/detect/yolov8n-sar-vessel/weights/best.pt"
    ),
)
parser.add_argument(
    "--imgsz",
    type=int,
    default=640,
    help="Input image size for export (default: 640). Must match pipeline TILE_SIZE.",
)
parser.add_argument(
    "--output-dir",
    type=str,
    default=None,
    help="Directory to write the ONNX model (default: ../models relative to this script).",
)
args = parser.parse_args()

# ============================================================
# Configuration
# ============================================================

# If a fine-tuned checkpoint was provided, use it. Otherwise fall back to base.
if args.weights:
    WEIGHTS_PATH = args.weights
    SOURCE_LABEL = f"fine-tuned ({args.weights})"
else:
    WEIGHTS_PATH = "yolov8n.pt"   # downloaded automatically by ultralytics on first run
    SOURCE_LABEL = "base yolov8n (COCO pretrained)"

OUTPUT_DIR = Path(args.output_dir) if args.output_dir else (
    Path(__file__).parent.parent / "models"
)
INPUT_SIZE = args.imgsz

# ============================================================
# Export
# ============================================================

def export_model():
    print("=" * 60)
    print("Nigeria Maritime — YOLO ONNX Export")
    print("=" * 60)
    print(f"  Source weights : {SOURCE_LABEL}")
    print(f"  Input size     : {INPUT_SIZE}x{INPUT_SIZE}")
    print(f"  Output dir     : {OUTPUT_DIR}")
    print()

    print(f"Loading model: {WEIGHTS_PATH}")
    model = YOLO(WEIGHTS_PATH)

    # Create output directory
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Export to ONNX
    print("Exporting to ONNX...")
    model.export(
        format="onnx",
        imgsz=INPUT_SIZE,
        simplify=True,       # run onnxsim to reduce redundant ops
        opset=17,            # required for onnxruntime-node compatibility
        dynamic=False,       # fixed batch=1, faster inference
    )

    # ultralytics saves the .onnx next to the .pt file (or in cwd for pretrained)
    stem = Path(WEIGHTS_PATH).stem                          # e.g. "best" or "yolov8n"
    candidate_paths = [
        Path(WEIGHTS_PATH).parent / f"{stem}.onnx",        # beside the .pt
        Path(f"{stem}.onnx"),                              # cwd fallback
        Path("yolov8n.onnx"),                              # base model cwd fallback
        Path("runs/detect/train/weights/best.onnx"),        # common ultralytics output
    ]

    target_path = OUTPUT_DIR / "yolov8-vessel.onnx"

    for candidate in candidate_paths:
        if candidate.exists():
            candidate.rename(target_path)
            size_mb = target_path.stat().st_size / 1024 / 1024
            print(f"\n✓ Exported successfully")
            print(f"  Output : {target_path}")
            print(f"  Size   : {size_mb:.1f} MB")
            print()
            print("Next steps:")
            print("  1. Set ONNX_MODEL_PATH in .env (or leave as default)")
            print("  2. Run: bun run src/pipeline.ts")
            return

    print("\n✗ Could not find the exported ONNX file.")
    print("  Checked locations:")
    for c in candidate_paths:
        print(f"    {c}")
    print("  Try running with --output-dir /path/to/models manually.")
    exit(1)


if __name__ == "__main__":
    export_model()
