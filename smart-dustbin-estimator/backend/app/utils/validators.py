import os
from fastapi import HTTPException, UploadFile
from app.config import ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGE_SIZE_BYTES


def validate_image_file(file: UploadFile):
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: JPG, JPEG, PNG."
        )


def get_fill_classification(fill_percentage: float) -> tuple[str, str]:
    """
    Returns (status, recommendation) based on PRD thresholds:
    0-20%: Empty
    21-40%: Low
    41-60%: Medium
    61-80%: High
    81-100%: Critical
    """
    p = max(0.0, min(100.0, fill_percentage))
    if p <= 20.0:
        return "Empty", "Bin is virtually empty. No immediate collection needed."
    elif p <= 40.0:
        return "Low", "Bin is at low capacity. Normal monitoring."
    elif p <= 60.0:
        return "Medium", "Bin is half full. Standard collection cycle applies."
    elif p <= 80.0:
        return "High", "High volume detected. Schedule collection soon to prevent overflow."
    else:
        return "Critical", "CRITICAL OVERFLOW RISK. Immediate waste collection required!"

