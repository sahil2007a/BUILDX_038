import io
import os
import time
from typing import Any, Dict, List, Tuple
import numpy as np
from PIL import Image

MODEL_PATH = os.getenv("MODEL_PATH", "models/best.pt")

yolo_model = None
pothole_class_id = None


def load_pothole_model():
    """
    Loads real YOLO pothole detection model per Section 36 & 37 specification.
    """
    global yolo_model, pothole_class_id

    print("\n" + "=" * 50)
    print("Loading pothole model...")

    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Pothole model not found at {MODEL_PATH}.")
        print("Please ensure models/best.pt is in place.")
        print("=" * 50 + "\n")
        return None

    try:
        from ultralytics import YOLO
        yolo_model = YOLO(MODEL_PATH)
        print("✓ Model loaded ✓ Pothole detection ready")

        # Inspect actual class names from model
        names = yolo_model.names
        print(f"Model classes: {names}")
        
        # Identify pothole class id
        pothole_class_id = 0
        if isinstance(names, dict):
            for k, v in names.items():
                if "pothole" in str(v).lower() or str(v) == "0":
                    pothole_class_id = k
                    break
        elif isinstance(names, list):
            for idx, v in enumerate(names):
                if "pothole" in str(v).lower():
                    pothole_class_id = idx
                    break

        print(f"Mapped pothole class ID: {pothole_class_id}")
        print("=" * 50 + "\n")
        return yolo_model
    except Exception as e:
        print(f"ERROR: Failed to initialize YOLO model: {e}")
        print("=" * 50 + "\n")
        return None


def run_yolo_inference(
    image_input: Any,
    conf_threshold: float = 0.25,
    imgsz: int = 640,
) -> Tuple[List[Dict[str, Any]], int]:
    """
    Runs actual YOLO inference on an image (bytes, PIL Image, or numpy array).
    Returns (detections, inference_ms).
    Normalized bounding box format:
    {
        "class": "pothole",
        "confidence": float,
        "bbox": { "x": float, "y": float, "width": float, "height": float }
    }
    """
    global yolo_model
    if yolo_model is None:
        yolo_model = load_pothole_model()

    if yolo_model is None:
        return [], 0

    start_time = time.time()

    # Convert bytes or file to PIL image if needed
    if isinstance(image_input, bytes):
        image = Image.open(io.BytesIO(image_input)).convert("RGB")
    else:
        image = image_input

    # Run inference
    results = yolo_model.predict(image, conf=conf_threshold, imgsz=imgsz, verbose=False)
    inference_ms = int((time.time() - start_time) * 1000)

    detections = []
    if len(results) > 0 and results[0].boxes is not None:
        boxes = results[0].boxes
        for i in range(len(boxes)):
            box = boxes[i]
            conf = float(box.conf[0].item())
            cls_id = int(box.cls[0].item())

            # Verify pothole class
            if pothole_class_id is not None and cls_id != pothole_class_id:
                # Still accept if model has only 1 class
                if len(yolo_model.names) > 1:
                    continue

            # xywhn gives normalized center x, center y, width, height in [0, 1]
            cx, cy, w, h = box.xywhn[0].tolist()

            # Convert to normalized top-left coordinates: x, y, width, height
            top_left_x = max(0.0, min(1.0, cx - (w / 2.0)))
            top_left_y = max(0.0, min(1.0, cy - (h / 2.0)))
            box_width = min(1.0 - top_left_x, w)
            box_height = min(1.0 - top_left_y, h)

            detections.append({
                "class": "pothole",
                "confidence": round(conf, 3),
                "bbox": {
                    "x": round(top_left_x, 4),
                    "y": round(top_left_y, 4),
                    "width": round(box_width, 4),
                    "height": round(box_height, 4),
                },
            })

    return detections, inference_ms
