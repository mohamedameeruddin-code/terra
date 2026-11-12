import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, Dict, Any


def load_and_preprocess_image(image_path: str, max_dimension: int = 1200) -> Tuple[np.ndarray, float]:
    """
    Loads an image from disk and resizes it if needed while preserving aspect ratio.
    Returns: (processed_bgr_image, scale_factor)
    """
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Could not read image at {image_path}")

    h, w = img.shape[:2]
    scale = 1.0
    if max(h, w) > max_dimension:
        scale = max_dimension / float(max(h, w))
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

    return img, scale


def detect_bin_roi_auto(img_bgr: np.ndarray) -> Dict[str, int]:
    """
    Automatic bin region detection fallback when manual ROI is not provided.
    Finds the most prominent vertical container or central region.
    """
    h, w = img_bgr.shape[:2]

    # Pre-process for contour finding: convert to grayscale, blur, edge detect
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (7, 7), 0)
    edges = cv2.Canny(blurred, 40, 140)

    # Dilate edges to close gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edges, kernel, iterations=2)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    best_roi = None
    max_score = -1

    for c in contours:
        x, y, bw, bh = cv2.boundingRect(c)
        area = bw * bh
        # Look for a sizable region that is centered and taller than wide (typical bin)
        if area > (w * h * 0.12):
            aspect = bh / float(bw)
            center_dist = abs((x + bw / 2) - w / 2) / (w / 2)
            score = area * (1.0 - 0.4 * center_dist)
            if 0.7 <= aspect <= 3.0 and score > max_score:
                max_score = score
                best_roi = {"x": int(x), "y": int(y), "width": int(bw), "height": int(bh)}

    if best_roi is None:
        # Default fallback: central 60% width, 70% height
        roi_w = int(w * 0.60)
        roi_h = int(h * 0.75)
        best_roi = {
            "x": int((w - roi_w) / 2),
            "y": int((h - roi_h) / 2 + (h * 0.05)),
            "width": roi_w,
            "height": roi_h
        }

    return best_roi


def render_annotated_image(
    img_bgr: np.ndarray,
    roi: Dict[str, int],
    waste_mask: np.ndarray,
    waste_top_y: int,
    fill_pct: float,
    status: str,
    confidence: float
) -> np.ndarray:
    """
    Draws professional annotations on the output image:
    - Selected bin boundary (with subtle dashed or clean border)
    - Waste segmentation translucent mask
    - Upper waste boundary waterline
    - Diagnostic metrics HUD badge (fill %, status, confidence)
    """
    annotated = img_bgr.copy()
    h, w = annotated.shape[:2]

    rx, ry = roi["x"], roi["y"]
    rw, rh = roi["width"], roi["height"]

    # 1. Overlay translucent waste mask inside ROI
    mask_h, mask_w = waste_mask.shape[:2]
    # Resize mask if it slightly differs
    if (mask_h, mask_w) != (rh, rw):
        waste_mask = cv2.resize(waste_mask, (rw, rh), interpolation=cv2.INTER_NEAREST)

    # Determine status color (BGR)
    if status == "Empty":
        status_color = (118, 203, 143)      # Living green (#8FCB76 in BGR)
        hud_border = (60, 245, 184)         # Sprout lime
    elif status == "Low":
        status_color = (118, 203, 143)
        hud_border = (60, 245, 184)
    elif status == "Medium":
        status_color = (201, 199, 79)       # Tide cyan / teal
        hud_border = (201, 199, 79)
    elif status == "High":
        status_color = (36, 165, 245)       # Amber (#F5A524 in BGR)
        hud_border = (36, 165, 245)
    else:  # Critical
        status_color = (60, 90, 235)        # Ember red (#EB5A3C in BGR)
        hud_border = (60, 90, 235)

    # Extract ROI from annotated image
    roi_region = annotated[ry:ry + rh, rx:rx + rw]
    overlay_color = np.zeros_like(roi_region)
    overlay_color[:] = status_color

    # Blend waste mask inside ROI
    alpha = 0.38
    waste_indices = waste_mask > 0
    if np.any(waste_indices):
        roi_region[waste_indices] = cv2.addWeighted(
            roi_region[waste_indices], 1.0 - alpha,
            overlay_color[waste_indices], alpha, 0
        )
    annotated[ry:ry + rh, rx:rx + rw] = roi_region

    # 2. Draw Dustbin ROI bounding box
    cv2.rectangle(annotated, (rx, ry), (rx + rw, ry + rh), (180, 245, 60), 2, cv2.LINE_AA)

    # Corner brackets for high-tech look
    corner_len = min(20, rw // 5, rh // 5)
    thick = 3
    # Top-left
    cv2.line(annotated, (rx, ry), (rx + corner_len, ry), (184, 245, 60), thick)
    cv2.line(annotated, (rx, ry), (rx, ry + corner_len), (184, 245, 60), thick)
    # Top-right
    cv2.line(annotated, (rx + rw, ry), (rx + rw - corner_len, ry), (184, 245, 60), thick)
    cv2.line(annotated, (rx + rw, ry), (rx + rw, ry + corner_len), (184, 245, 60), thick)
    # Bottom-left
    cv2.line(annotated, (rx, ry + rh), (rx + corner_len, ry + rh), (184, 245, 60), thick)
    cv2.line(annotated, (rx, ry + rh), (rx, ry + rh - corner_len), (184, 245, 60), thick)
    # Bottom-right
    cv2.line(annotated, (rx + rw, ry + rh), (rx + rw - corner_len, ry + rh), (184, 245, 60), thick)
    cv2.line(annotated, (rx + rw, ry + rh), (rx + rw, ry + rh - corner_len), (184, 245, 60), thick)

    # 3. Draw Waste Waterline (Upper Boundary)
    if ry <= waste_top_y <= ry + rh:
        cv2.line(annotated, (rx, waste_top_y), (rx + rw, waste_top_y), hud_border, 2, cv2.LINE_AA)
        # Small indicator flag
        label_waterline = f"WASTE LEVEL: {int(fill_pct)}%"
        cv2.putText(annotated, label_waterline, (rx + 6, waste_top_y - 6),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, hud_border, 1, cv2.LINE_AA)

    # 4. Draw HUD diagnostic overlay at top of ROI or top-left
    hud_x = max(10, rx)
    hud_y = max(10, ry - 45) if ry >= 50 else (ry + 10)
    hud_w = 260
    hud_h = 42

    # Draw dark HUD background
    hud_bg = annotated[hud_y:hud_y + hud_h, hud_x:hud_x + hud_w]
    if hud_bg.shape[0] == hud_h and hud_bg.shape[1] == hud_w:
        hud_box = np.zeros_like(hud_bg)
        hud_box[:] = (12, 18, 15)  # #0F1210 dark soil
        cv2.addWeighted(hud_box, 0.85, hud_bg, 0.15, 0, hud_bg)
        annotated[hud_y:hud_y + hud_h, hud_x:hud_x + hud_w] = hud_bg
        cv2.rectangle(annotated, (hud_x, hud_y), (hud_x + hud_w, hud_y + hud_h), hud_border, 1)

        # Primary line
        title_str = f"FILL: {fill_pct:.1f}%  |  {status.upper()}"
        cv2.putText(annotated, title_str, (hud_x + 8, hud_y + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (218, 233, 238), 1, cv2.LINE_AA)
        sub_str = f"Conf: {confidence:.0f}%  |  Est. Visual Fill"
        cv2.putText(annotated, sub_str, (hud_x + 8, hud_y + 34),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.38, (149, 160, 143), 1, cv2.LINE_AA)

    return annotated

