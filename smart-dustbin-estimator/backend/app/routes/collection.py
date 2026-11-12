from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bin, Reading, Collection, Alert
from app.schemas import PriorityItem, CollectionCreate, CollectionResponse
from app.services.sensor_estimator import (
    calculate_fill_rate_and_ttf,
    compute_priority_score,
    determine_bin_status,
)

router = APIRouter(prefix="/api", tags=["Collection"])


@router.get("/collection", response_model=List[PriorityItem])
def get_priority_collection_sheet(db: Session = Depends(get_db)):
    """
    FR-14: Priority collection list.
    Computes priority score: score = fill% * 0.6 + urgency * 0.4
    where urgency = clamp(100 - TTF_hours * 10, 0, 100).
    Sorted descending by urgency & fill score.
    """
    bins = db.query(Bin).all()
    items = []

    for b in bins:
        latest = b.readings[0] if b.readings else None
        current_fill = latest.fill_pct if latest else 0.0
        battery = latest.battery_pct if latest else 100.0
        last_seen = latest.ts if latest else None

        readings_dict = [{"ts": r.ts, "fill_pct": r.fill_pct} for r in reversed(b.readings[:30])]
        rate, ttf = calculate_fill_rate_and_ttf(readings_dict, current_fill)

        status = determine_bin_status(
            current_fill,
            b.warn_pct,
            b.critical_pct,
            last_seen,
            b.interval_min
        )

        p_score = compute_priority_score(current_fill, ttf)

        items.append({
            "bin_id": b.id,
            "bin_name": b.name,
            "location": b.location,
            "fill_pct": round(current_fill, 1),
            "ttf_min": ttf,
            "status": status,
            "priority_score": p_score,
            "battery_pct": battery,
            "last_seen": last_seen
        })

    # Sort descending by priority score
    items.sort(key=lambda x: x["priority_score"], reverse=True)

    # Assign ranks
    result = []
    for rank, item in enumerate(items, start=1):
        result.append(PriorityItem(rank=rank, **item))

    return result


@router.post("/bins/{bin_id}/empty", response_model=CollectionResponse)
def mark_bin_emptied(
    bin_id: int,
    payload: CollectionCreate = CollectionCreate(),
    db: Session = Depends(get_db)
):
    """
    FR-15: Collector logs an emptying event.
    Inserts a collection record, resets fill level to 0%, and resolves active alerts.
    """
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")

    now = datetime.now(timezone.utc)
    latest = bin_obj.readings[0] if bin_obj.readings else None
    fill_before = latest.fill_pct if latest else 0.0

    # 1. Log collection event
    collection = Collection(
        bin_id=bin_id,
        emptied_at=now,
        emptied_by=payload.emptied_by or "Collector",
        fill_before=round(fill_before, 1)
    )
    db.add(collection)

    # 2. Add reset reading (empty bin distance = depth_cm)
    reset_reading = Reading(
        bin_id=bin_id,
        distance_cm=bin_obj.depth_cm,
        smoothed_distance_cm=bin_obj.depth_cm,
        fill_pct=0.0,
        battery_pct=latest.battery_pct if latest else 100.0,
        ts=now
    )
    db.add(reset_reading)

    # 3. Automatically acknowledge any active WARN or CRITICAL alerts for this bin
    active_alerts = (
        db.query(Alert)
        .filter(
            Alert.bin_id == bin_id,
            Alert.type.in_(["WARN", "CRITICAL"]),
            Alert.acknowledged_at == None
        )
        .all()
    )
    for alert in active_alerts:
        alert.acknowledged_at = now

    db.commit()
    db.refresh(collection)

    return collection

