import os
import json
import shutil
import uuid
import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from typing import Optional, List

from app.database import get_db
from app.config import UPLOAD_DIR, PROCESSED_DIR, SAMPLE_DIR
from app.models import AnalysisRecord
from app.schemas import AnalysisResponse, AnalysisRecordSummary
from app.utils.validators import validate_image_file
from app.services.image_processor import (
    load_and_preprocess_image,
    detect_bin_roi_auto,
    render_annotated_image
)
from app.services.segmentation import segment_waste_in_roi
from app.services.fill_estimator import estimate_fill_level

router = APIRouter(prefix="/api", tags=["Analysis"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_dustbin_image(
    file: UploadFile = File(...),
    roi_json: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Upload and analyze a dustbin image with Ensemble Classical CV & Trained ML Model.
    Supports normalized percentage ROI coordinates from responsive browser screens.
    """
    validate_image_file(file)

    # Generate unique filename
    ext = os.path.splitext(file.filename or "image.jpg")[1].lower()
    unique_id = uuid.uuid4().hex[:10]
    saved_filename = f"{unique_id}_{file.filename}"
    upload_path = UPLOAD_DIR / saved_filename

    # Save uploaded file
    with open(upload_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Load and resize while preserving aspect ratio
        img_bgr, scale_factor = load_and_preprocess_image(str(upload_path))
        h, w = img_bgr.shape[:2]

        # Determine ROI with screen coordinate normalization support
        roi = None
        if roi_json:
            try:
                parsed = json.loads(roi_json)
                if "x_pct" in parsed and "width_pct" in parsed:
                    # Normalized percentage coordinates (0.0 to 1.0)
                    rx = int(np.clip(parsed["x_pct"] * w, 0, w - 10))
                    ry = int(np.clip(parsed["y_pct"] * h, 0, h - 10))
                    rw = int(np.clip(parsed["width_pct"] * w, 10, w - rx))
                    rh = int(np.clip(parsed["height_pct"] * h, 10, h - ry))
                    roi = {"x": rx, "y": ry, "width": rw, "height": rh}
                elif "client_width" in parsed and parsed.get("client_width", 0) > 0:
                    scale_x = w / float(parsed["client_width"])
                    scale_y = h / float(parsed["client_height"])
                    rx = int(np.clip(parsed["x"] * scale_x, 0, w - 10))
                    ry = int(np.clip(parsed["y"] * scale_y, 0, h - 10))
                    rw = int(np.clip(parsed["width"] * scale_x, 10, w - rx))
                    rh = int(np.clip(parsed["height"] * scale_y, 10, h - ry))
                    roi = {"x": rx, "y": ry, "width": rw, "height": rh}
                elif all(k in parsed for k in ("x", "y", "width", "height")):
                    rx = int(np.clip(parsed["x"] * scale_factor, 0, w - 10))
                    ry = int(np.clip(parsed["y"] * scale_factor, 0, h - 10))
                    rw = int(np.clip(parsed["width"] * scale_factor, 10, w - rx))
                    rh = int(np.clip(parsed["height"] * scale_factor, 10, h - ry))
                    roi = {"x": rx, "y": ry, "width": rw, "height": rh}
            except Exception as e:
                print(f"Failed to parse custom ROI JSON: {e}")

        # Fallback to automatic detection if ROI not provided or invalid
        if roi is None:
            roi = detect_bin_roi_auto(img_bgr)

        # Crop ROI
        rx, ry = roi["x"], roi["y"]
        rw, rh = roi["width"], roi["height"]
        roi_crop = img_bgr[ry:ry + rh, rx:rx + rw]

        # Segment waste inside ROI
        waste_mask, smooth_tops, diagnostics = segment_waste_in_roi(roi_crop)

        # Estimate fill level & classification using Ensemble AI (CV + Trained ML)
        fill_pct, status, confidence, usable_h, detected_h, recommendation, ml_breakdown = estimate_fill_level(
            roi, smooth_tops, diagnostics, roi_crop=roi_crop
        )

        diagnostics.update(ml_breakdown)

        # Compute average top Y in full image coordinates for waterline rendering
        core_avg_top = float(np.mean(smooth_tops))
        waste_waterline_y = int(ry + core_avg_top)

        # Render annotated visual output
        annotated_bgr = render_annotated_image(
            img_bgr=img_bgr,
            roi=roi,
            waste_mask=waste_mask,
            waste_top_y=waste_waterline_y,
            fill_pct=fill_pct,
            status=status,
            confidence=confidence
        )

        # Save processed image
        result_filename = f"result_{saved_filename}"
        result_path = PROCESSED_DIR / result_filename
        cv2.imwrite(str(result_path), annotated_bgr)

        # Store record in SQLite database
        record = AnalysisRecord(
            image_name=file.filename or saved_filename,
            image_path=str(upload_path),
            result_image_path=str(result_path),
            fill_percentage=fill_pct,
            fill_status=status,
            confidence_score=confidence,
            usable_bin_height=usable_h,
            detected_waste_height=detected_h,
            recommendation=recommendation,
            roi_coordinates=json.dumps(roi),
            notes=notes
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return AnalysisResponse(
            id=record.id,
            image_name=record.image_name,
            original_image_url=f"/uploads/{saved_filename}",
            processed_image_url=f"/processed/{result_filename}",
            fill_percentage=fill_pct,
            fill_status=status,
            confidence_score=confidence,
            usable_bin_height=usable_h,
            detected_waste_height=detected_h,
            recommendation=recommendation,
            notes=notes,
            created_at=record.created_at,
            breakdown=diagnostics
        )

    except Exception as e:
        if upload_path.exists():
            upload_path.unlink()
        raise HTTPException(status_code=500, detail=f"Image analysis error: {str(e)}")


@router.get("/samples")
def get_sample_images():
    """Returns sample test images available for 1-click evaluation."""
    samples = []
    if SAMPLE_DIR.exists():
        for f in os.listdir(SAMPLE_DIR):
            if any(f.lower().endswith(ext) for ext in (".jpg", ".jpeg", ".png")):
                samples.append({
                    "filename": f,
                    "url": f"/samples/{f}",
                    "name": f.replace("_", " ").split(".")[0].title()
                })
    return samples


@router.post("/analyze-sample/{filename}", response_model=AnalysisResponse)
async def analyze_sample_image(filename: str, db: Session = Depends(get_db)):
    """Runs instant analysis on a preloaded sample image."""
    sample_path = SAMPLE_DIR / filename
    if not sample_path.exists():
        raise HTTPException(status_code=404, detail="Sample image not found")

    unique_id = uuid.uuid4().hex[:8]
    dest_filename = f"sample_{unique_id}_{filename}"
    upload_path = UPLOAD_DIR / dest_filename
    shutil.copyfile(sample_path, upload_path)

    # Process
    img_bgr, scale_factor = load_and_preprocess_image(str(upload_path))
    roi = detect_bin_roi_auto(img_bgr)

    rx, ry = roi["x"], roi["y"]
    rw, rh = roi["width"], roi["height"]
    roi_crop = img_bgr[ry:ry + rh, rx:rx + rw]

    waste_mask, smooth_tops, diagnostics = segment_waste_in_roi(roi_crop)
    fill_pct, status, confidence, usable_h, detected_h, recommendation, ml_breakdown = estimate_fill_level(
        roi, smooth_tops, diagnostics, roi_crop=roi_crop
    )
    diagnostics.update(ml_breakdown)

    core_avg_top = float(np.mean(smooth_tops))
    waste_waterline_y = int(ry + core_avg_top)

    annotated_bgr = render_annotated_image(
        img_bgr, roi, waste_mask, waste_waterline_y, fill_pct, status, confidence
    )

    result_filename = f"result_{dest_filename}"
    result_path = PROCESSED_DIR / result_filename
    cv2.imwrite(str(result_path), annotated_bgr)

    record = AnalysisRecord(
        image_name=f"Sample: {filename}",
        image_path=str(upload_path),
        result_image_path=str(result_path),
        fill_percentage=fill_pct,
        fill_status=status,
        confidence_score=confidence,
        usable_bin_height=usable_h,
        detected_waste_height=detected_h,
        recommendation=recommendation,
        roi_coordinates=json.dumps(roi),
        notes="Evaluated via preloaded sample test suite with trained ML model"
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return AnalysisResponse(
        id=record.id,
        image_name=record.image_name,
        original_image_url=f"/uploads/{dest_filename}",
        processed_image_url=f"/processed/{result_filename}",
        fill_percentage=fill_pct,
        fill_status=status,
        confidence_score=confidence,
        usable_bin_height=usable_h,
        detected_waste_height=detected_h,
        recommendation=recommendation,
        notes=record.notes,
        created_at=record.created_at,
        breakdown=diagnostics
    )
