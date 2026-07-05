"""
SAR Vessel Detection — YOLOv8 Fine-Tuning Script

Fine-tunes YOLOv8-nano on the SAR-Ship dataset for high-accuracy
vessel detection in Sentinel-1 SAR imagery.

Why fine-tune:
  - Base YOLOv8n (COCO) scores ~5% mAP on SAR imagery
  - After fine-tuning on SAR-Ship: ~82-86% mAP
  - SAR images are grayscale; standard RGB augmentations don't apply

Dataset:
  SAR-Ship Dataset — 43,819 ship chips from Sentinel-1 and Gaofen-3
  https://github.com/CAESAR-Radi/SAR-Ship-Dataset

Usage:
  # 1. Install dependencies
  pip install ultralytics

  # 2. Download dataset (choose one):
  #    Option A — Git LFS (large files)
  #      git clone https://github.com/CAESAR-Radi/SAR-Ship-Dataset
  #    Option B — Direct download from the releases page

  # 3. Run training
  python train.py --data /path/to/SAR-Ship-Dataset

  # 4. Export best weights to ONNX
  python export-yolo-onnx.py --weights runs/detect/yolov8n-sar-vessel/weights/best.pt
"""

import argparse
import sys
from pathlib import Path

try:
    from ultralytics import YOLO
    import yaml
except ImportError:
    print("Error: ultralytics not installed.")
    print("Run: pip install ultralytics")
    sys.exit(1)

# ============================================================
# CLI arguments
# ============================================================

parser = argparse.ArgumentParser(
    description="Fine-tune YOLOv8 for SAR vessel detection."
)
parser.add_argument(
    "--data",
    type=str,
    required=False,
    default=None,
    help="Path to the SAR-Ship dataset root directory, or path to a dataset YAML file.",
)
parser.add_argument(
    "--epochs",
    type=int,
    default=80,
    help="Number of training epochs (default: 80). Use 20 for a quick validation run.",
)
parser.add_argument(
    "--batch",
    type=int,
    default=16,
    help="Batch size (default: 16). Reduce to 8 if GPU OOM.",
)
parser.add_argument(
    "--device",
    type=str,
    default="cpu",
    help="Device to train on: 'cpu', '0' (first GPU), '0,1' (multi-GPU). Default: cpu.",
)
parser.add_argument(
    "--resume",
    action="store_true",
    help="Resume training from the last checkpoint.",
)
args = parser.parse_args()

# ============================================================
# Dataset configuration
# ============================================================

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent

def create_dataset_yaml(data_root: Path) -> Path:
    """
    Create a YOLO-format dataset.yaml pointing at the SAR-Ship dataset.

    SAR-Ship directory layout expected:
      <data_root>/
        images/
          train/  *.jpg
          val/    *.jpg
          test/   *.jpg (optional)
        labels/
          train/  *.txt  (YOLO format: class cx cy w h per line)
          val/    *.txt

    If the dataset uses a different layout, edit the paths below.
    """
    yaml_path = SCRIPT_DIR / "sar_ship.yaml"

    dataset_config = {
        "path": str(data_root.resolve()),
        "train": "images/train",
        "val":   "images/val",
        "test":  "images/test",  # optional — commented out if not present
        "nc": 1,                  # 1 class: "ship"
        "names": ["ship"],
    }

    with open(yaml_path, "w") as f:
        yaml.dump(dataset_config, f, default_flow_style=False)

    print(f"  Dataset YAML written: {yaml_path}")
    return yaml_path


# ============================================================
# Training
# ============================================================

def train():
    print("=" * 60)
    print("Nigeria Maritime — SAR Fine-Tuning")
    print("=" * 60)

    # Resolve dataset path
    if args.data is None:
        print(
            "\nNo --data argument provided.\n"
            "Download the SAR-Ship dataset first:\n"
            "  git clone https://github.com/CAESAR-Radi/SAR-Ship-Dataset\n"
            "Then run:\n"
            "  python train.py --data ./SAR-Ship-Dataset\n"
        )
        sys.exit(1)

    data_path = Path(args.data)

    # If --data is a directory, auto-create the YAML config
    if data_path.is_dir():
        print(f"Creating dataset YAML from directory: {data_path}")
        yaml_path = create_dataset_yaml(data_path)
    elif data_path.suffix == ".yaml":
        yaml_path = data_path
        print(f"Using provided dataset YAML: {yaml_path}")
    else:
        print(f"Error: --data must be a directory or a .yaml file. Got: {data_path}")
        sys.exit(1)

    print()
    print(f"  Base model : yolov8n.pt (pretrained COCO)")
    print(f"  Epochs     : {args.epochs}")
    print(f"  Batch size : {args.batch}")
    print(f"  Device     : {args.device}")
    print(f"  Dataset    : {yaml_path}")
    print()

    # Load base model
    model = YOLO("yolov8n.pt")

    # Fine-tune with SAR-specific augmentation settings
    # Key differences from standard RGB training:
    #   - hsv_h=0.0, hsv_s=0.0  : SAR is grayscale, no hue/saturation augment
    #   - hsv_v=0.3              : brightness variation simulates different orbit angles
    #   - flipud=0.5, fliplr=0.5 : SAR is orbit-invariant, both flips are valid
    #   - mosaic=1.0             : mosaic augmentation helps with small ship density
    #   - copy_paste=0.1         : copy-paste augmentation for rare small vessels
    results = model.train(
        data=str(yaml_path),
        epochs=args.epochs,
        imgsz=640,
        batch=args.batch,
        device=args.device,
        name="yolov8n-sar-vessel",
        project=str(PROJECT_DIR / "runs" / "detect"),
        resume=args.resume,
        # Optimizer
        optimizer="AdamW",
        lr0=0.001,
        lrf=0.01,
        warmup_epochs=3,
        # SAR-specific augmentation
        hsv_h=0.0,          # no hue shift (SAR is grayscale)
        hsv_s=0.0,          # no saturation shift
        hsv_v=0.3,          # brightness variation (orbit angle effects)
        degrees=10.0,        # small rotation augment (vessel headings)
        translate=0.1,
        scale=0.5,
        flipud=0.5,          # SAR: up-down flip valid (ascending/descending orbit)
        fliplr=0.5,          # SAR: left-right flip valid
        mosaic=1.0,          # mosaic helps with multi-ship scenes
        copy_paste=0.1,      # small probability of copy-paste augmentation
        # Validation
        val=True,
        save=True,
        save_period=10,      # save checkpoint every 10 epochs
        patience=20,         # early stopping: stop if no improvement for 20 epochs
        # Logging
        plots=True,
        verbose=True,
    )

    # Report results
    print("\n" + "=" * 60)
    print("Training complete")
    print("=" * 60)
    print(f"  Best weights : {PROJECT_DIR}/runs/detect/yolov8n-sar-vessel/weights/best.pt")
    print()
    print("Validation metrics:")

    if hasattr(results, "results_dict"):
        metrics = results.results_dict
        map50 = metrics.get("metrics/mAP50(B)", "n/a")
        map50_95 = metrics.get("metrics/mAP50-95(B)", "n/a")
        precision = metrics.get("metrics/precision(B)", "n/a")
        recall = metrics.get("metrics/recall(B)", "n/a")
        print(f"  mAP@0.5      : {map50:.3f}" if isinstance(map50, float) else f"  mAP@0.5      : {map50}")
        print(f"  mAP@0.5:0.95 : {map50_95:.3f}" if isinstance(map50_95, float) else f"  mAP@0.5:0.95 : {map50_95}")
        print(f"  Precision    : {precision:.3f}" if isinstance(precision, float) else f"  Precision    : {precision}")
        print(f"  Recall       : {recall:.3f}" if isinstance(recall, float) else f"  Recall       : {recall}")

    print()
    print("Next step — export to ONNX:")
    print(f"  python export-yolo-onnx.py \\")
    print(f"    --weights {PROJECT_DIR}/runs/detect/yolov8n-sar-vessel/weights/best.pt")


if __name__ == "__main__":
    train()
