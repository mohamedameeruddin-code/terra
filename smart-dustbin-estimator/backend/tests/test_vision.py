import pytest
import numpy as np
import cv2
from pathlib import Path
from app.services.image_processor import detect_bin_roi_auto, render_annotated_image
from app.services.segmentation import segment_waste_in_roi
from app.services.fill_estimator import estimate_fill_level
from app.services.ml_waste_classifier import ml_classifier
from app.utils.validators import get_fill_classification


def test_fill_classification_buckets():
    # 0-20% Empty
    s1, _ = get_fill_classification(12.0)
    assert s1 == "Empty"
    # 21-40% Low
    s2, _ = get_fill_classification(35.0)
    assert s2 == "Low"
    # 41-60% Medium
    s3, _ = get_fill_classification(55.0)
    assert s3 == "Medium"
    # 61-80% High
    s4, _ = get_fill_classification(75.0)
    assert s4 == "High"
    # 81-100% Critical
    s5, _ = get_fill_classification(92.0)
    assert s5 == "Critical"


def test_synthetic_vision_pipeline():
    h, w = 500, 400
    img = np.full((h, w, 3), 200, dtype=np.uint8)

    # Bin body
    bx, by, bw, bh = 80, 80, 240, 360
    cv2.rectangle(img, (bx, by), (bx + bw, by + bh), (60, 60, 60), -1)

    # Waste in bottom 60% of bin
    waste_h = int(bh * 0.60)
    waste_top = (by + bh) - waste_h
    for y in range(waste_top, by + bh, 8):
        for x in range(bx + 10, bx + bw - 10, 8):
            cv2.circle(img, (x, y), 5, (np.random.randint(40, 240), np.random.randint(40, 240), np.random.randint(40, 240)), -1)

    roi = {"x": bx, "y": by, "width": bw, "height": bh}
    roi_crop = img[by:by + bh, bx:bx + bw]

    mask, smooth_tops, diag = segment_waste_in_roi(roi_crop)
    fill_pct, status, conf, usable_h, detected_h, rec, ml_breakdown = estimate_fill_level(
        roi, smooth_tops, diag, roi_crop=roi_crop
    )

    assert 40.0 <= fill_pct <= 80.0
    assert status in ("Medium", "High")
    assert conf >= 50.0
    assert "ml_predicted_class" in ml_breakdown

    annotated = render_annotated_image(img, roi, mask, int(by + np.mean(smooth_tops)), fill_pct, status, conf)
    assert annotated.shape == img.shape


def test_ml_classifier_on_public_dustbin():
    # Test classifier on user's public overflowing dustbin image
    user_img_path = Path(__file__).resolve().parent.parent / "uploads" / "fc68b76ea5_images.jpg"
    if user_img_path.exists():
        img = cv2.imread(str(user_img_path))
        h, w = img.shape[:2]
        # Frame the dustbin
        roi = {"x": int(w * 0.15), "y": int(h * 0.10), "width": int(w * 0.70), "height": int(h * 0.82)}
        crop = img[roi["y"]:roi["y"] + roi["height"], roi["x"]:roi["x"] + roi["width"]]

        pred_class, conf, probs = ml_classifier.predict(crop)
        assert pred_class in ("Critical", "High")

        mask, smooth_tops, diag = segment_waste_in_roi(crop)
        fill_pct, status, conf, usable_h, det_h, rec, ml_breakdown = estimate_fill_level(
            roi, smooth_tops, diag, roi_crop=crop
        )
        assert fill_pct >= 90.0
        assert status == "Critical"
