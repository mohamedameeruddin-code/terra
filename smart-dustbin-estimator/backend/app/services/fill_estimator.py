import numpy as np
import cv2
from typing import Dict, Any, Tuple
from app.utils.validators import get_fill_classification
from app.services.ml_waste_classifier import ml_classifier


def estimate_fill_level(
    roi: Dict[str, int],
    smooth_tops: np.ndarray,
    diagnostics: Dict[str, Any],
    roi_crop: np.ndarray = None
) -> Tuple[float, str, float, float, float, str, Dict[str, Any]]:
    """
    Computes fill percentage, status classification, confidence score, and collection recommendation
    using an Ensemble AI pipeline combining:
    1. Classical Computer Vision column-wise waterline geometry
    2. Trained ML Public Dustbin Classifier (Random Forest on 14 texture/color/edge features)
    3. Public street dustbin heap and overflow heuristics
    
    Returns:
        fill_percentage: float (0.0 to 100.0)
        fill_status: str (Empty, Low, Medium, High, Critical)
        confidence_score: float (0.0 to 100.0)
        usable_bin_height: float (pixels)
        detected_waste_height: float (pixels)
        recommendation: str
        ml_breakdown: dict
    """
    rh = roi["height"]
    rw = roi["width"]

    if rh <= 0 or len(smooth_tops) == 0:
        return 0.0, "Empty", 50.0, float(rh), 0.0, "Invalid ROI provided.", {}

    usable_bin_height = float(rh)

    # In dustbins, waste can heap unevenly. Use the trimmed mean of the upper boundary
    sorted_tops = np.sort(smooth_tops)
    trim_pct = 0.15
    trim_count = int(len(sorted_tops) * trim_pct)
    if trim_count > 0 and len(sorted_tops) > 2 * trim_count:
        core_tops = sorted_tops[trim_count:-trim_count]
    else:
        core_tops = sorted_tops

    # Effective top waterline relative to ROI top (0 is top, rh is bottom)
    avg_top_y = float(np.mean(core_tops))

    # Waste height is the vertical distance from bottom (rh) up to avg_top_y
    detected_waste_height = max(0.0, usable_bin_height - avg_top_y)
    geom_fill = (detected_waste_height / usable_bin_height) * 100.0

    # 2. Run Trained ML Public Dustbin Model
    ml_class = "Medium"
    ml_conf = 85.0
    ml_probs = {}
    if roi_crop is not None and roi_crop.size > 0:
        ml_class, ml_conf, ml_probs = ml_classifier.predict(roi_crop)

    # 3. Public Dustbin Heaping & Overflow Heuristic
    # If waste reaches into the top 18% of the bin (avg_top_y <= rh * 0.18) or
    # if ML model has high confidence in Critical/Overflow (> 0.65):
    is_top_overflow = False
    if (avg_top_y <= usable_bin_height * 0.18) or (ml_probs.get("Critical", 0.0) >= 0.60):
        is_top_overflow = True

    # Ensemble synthesis
    if is_top_overflow or ml_class == "Critical":
        # Overflowing or at brim capacity: 95% - 100%
        fill_percentage = max(92.0, min(100.0, geom_fill + 15.0 if geom_fill < 90 else 100.0))
        status = "Critical"
        recommendation = "CRITICAL OVERFLOW RISK. Immediate waste collection required!"
    else:
        fill_percentage = round(float(np.clip(geom_fill, 0.0, 100.0)), 1)
        status, recommendation = get_fill_classification(fill_percentage)

    # Adjust confidence score with ML model agreement
    base_confidence = 85.0
    if status == ml_class:
        confidence = min(98.0, max(base_confidence, ml_conf))
    else:
        confidence = max(75.0, (base_confidence + ml_conf) / 2.0)

    ml_breakdown = {
        "ml_predicted_class": ml_class,
        "ml_confidence": ml_conf,
        "class_probabilities": ml_probs,
        "is_top_overflow": is_top_overflow,
        "geometric_fill_pct": round(geom_fill, 1)
    }

    return (
        round(fill_percentage, 1),
        status,
        round(confidence, 1),
        usable_bin_height,
        detected_waste_height,
        recommendation,
        ml_breakdown
    )
