from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bin, Reading, Collection
from app.schemas import ReadingCreate, ReadingResponse
from app.services.sensor_estimator import (
    validate_raw_distance,
    smooth_reading,
    is_outlier,
    calculate_fill_percentage,
    detect_emptying_event,
    determine_bin_status,
)
from app.services.alert_service import check_and_create_alerts

router = APIRouter(prefix="/api/readings", tags=["Readings"])


@router.post("", response_model=ReadingResponse, status_code=status.HTTP_201_CREATED)
def ingest_reading(
    reading_in: ReadingCreate,
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    db: Session = Depends(get_db)
):
    """
    FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7:
    Sensor ingestion endpoint. Authenticates device via X-API-Key,
    validates distance, smooths reading, rejects outliers, computes fill %,
    detects emptying events, and evaluates alerts.
    """
    # 1. Look up bin
    bin_obj = db.query(Bin).filter(Bin.id == reading_in.bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")

    # Authenticate API Key if present on the bin
    if bin_obj.api_key and x_api_key and bin_obj.api_key != x_api_key:
        raise HTTPException(status_code=401, detail="Invalid API Key for this bin")

    # 2. Validate raw distance
    if not validate_raw_distance(reading_in.distance_cm, bin_obj.depth_cm):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid distance {reading_in.distance_cm} cm. Must be between 0 and {bin_obj.depth_cm + 10} cm."
        )

    # 3. Previous reading checks
    latest_reading = bin_obj.readings[0] if bin_obj.readings else None
    now = reading_in.timestamp or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    # Outlier rejection check (jump > 40% in < 60s)
    if latest_reading:
        prev_ts = latest_reading.ts
        if prev_ts.tzinfo is None:
            prev_ts = prev_ts.replace(tzinfo=timezone.utc)
        diff_sec = (now - prev_ts).total_seconds()

        if is_outlier(reading_in.distance_cm, latest_reading.distance_cm, diff_sec):
            # Log and reject outlier reading without updating smoothed state
            raise HTTPException(
                status_code=422,
                detail="Outlier reading discarded (unrealistic jump > 40% in under 1 minute)."
            )

    # 4. Smoothing: median of last 5 + EMA
    recent_dists = [r.distance_cm for r in bin_obj.readings[:4]]
    prev_smoothed = latest_reading.smoothed_distance_cm if latest_reading else None
    smoothed_d = smooth_reading(reading_in.distance_cm, recent_dists, prev_smoothed, alpha=0.3)

    # 5. Fill percentage calculation
    fill_pct = calculate_fill_percentage(smoothed_d, bin_obj.depth_cm, bin_obj.dead_zone_cm)

    # 6. Emptying event detection (drop >= 30 points)
    if latest_reading and detect_emptying_event(fill_pct, latest_reading.fill_pct):
        collection_event = Collection(
            bin_id=bin_obj.id,
            emptied_at=now,
            emptied_by="Auto-detected Emptying Event",
            fill_before=latest_reading.fill_pct
        )
        db.add(collection_event)

    # 7. Create reading record
    new_reading = Reading(
        bin_id=bin_obj.id,
        distance_cm=reading_in.distance_cm,
        smoothed_distance_cm=smoothed_d,
        fill_pct=round(fill_pct, 1),
        battery_pct=reading_in.battery_pct if reading_in.battery_pct is not None else 100.0,
        ts=now
    )
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)

    # 8. Check alerts
    bin_status = determine_bin_status(
        fill_pct,
        bin_obj.warn_pct,
        bin_obj.critical_pct,
        now,
        bin_obj.interval_min
    )
    check_and_create_alerts(db, bin_obj, fill_pct, bin_status)

    return new_reading

