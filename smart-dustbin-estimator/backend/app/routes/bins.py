import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Bin, Reading, Collection
from app.schemas import BinCreate, BinUpdate, BinResponse, ReadingResponse
from app.services.sensor_estimator import (
    calculate_fill_rate_and_ttf,
    determine_bin_status,
)

router = APIRouter(prefix="/api/bins", tags=["Bins"])


def enrich_bin(b: Bin) -> BinResponse:
    latest = b.readings[0] if b.readings else None
    current_fill = latest.fill_pct if latest else 0.0
    last_seen = latest.ts if latest else None
    battery = latest.battery_pct if latest else 100.0

    status = determine_bin_status(
        current_fill,
        b.warn_pct,
        b.critical_pct,
        last_seen,
        b.interval_min
    )

    # Compute rate and TTF
    readings_dict = [{"ts": r.ts, "fill_pct": r.fill_pct} for r in reversed(b.readings[:30])]
    rate, ttf = calculate_fill_rate_and_ttf(readings_dict, current_fill)

    return BinResponse(
        id=b.id,
        name=b.name,
        location=b.location,
        depth_cm=b.depth_cm,
        dead_zone_cm=b.dead_zone_cm,
        warn_pct=b.warn_pct,
        critical_pct=b.critical_pct,
        interval_min=b.interval_min,
        api_key=b.api_key,
        created_at=b.created_at,
        fill_pct=round(current_fill, 1),
        rate_pct_per_hr=rate,
        ttf_min=ttf,
        status=status,
        last_seen=last_seen,
        battery_pct=battery
    )


@router.get("", response_model=List[BinResponse])
def get_all_bins(db: Session = Depends(get_db)):
    """FR-13: List all bins with latest estimate (fill, rate, ttf, status)."""
    bins = db.query(Bin).all()
    return [enrich_bin(b) for b in bins]


@router.post("", response_model=BinResponse, status_code=201)
def create_bin(bin_in: BinCreate, db: Session = Depends(get_db)):
    """FR-17: Create new dustbin with unique API key for sensor authentication."""
    api_key = f"sde_{secrets.token_hex(16)}"
    new_bin = Bin(
        name=bin_in.name,
        location=bin_in.location,
        depth_cm=bin_in.depth_cm,
        dead_zone_cm=bin_in.dead_zone_cm,
        warn_pct=bin_in.warn_pct,
        critical_pct=bin_in.critical_pct,
        interval_min=bin_in.interval_min,
        api_key=api_key
    )
    db.add(new_bin)
    db.commit()
    db.refresh(new_bin)
    return enrich_bin(new_bin)


@router.get("/{bin_id}", response_model=BinResponse)
def get_bin(bin_id: int, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")
    return enrich_bin(bin_obj)


@router.put("/{bin_id}", response_model=BinResponse)
def update_bin(bin_id: int, bin_in: BinUpdate, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")

    update_data = bin_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(bin_obj, field, value)

    db.commit()
    db.refresh(bin_obj)
    return enrich_bin(bin_obj)


@router.delete("/{bin_id}")
def delete_bin(bin_id: int, db: Session = Depends(get_db)):
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")
    db.delete(bin_obj)
    db.commit()
    return {"status": "deleted", "id": bin_id}


@router.get("/{bin_id}/history")
def get_bin_history(
    bin_id: int,
    range_str: str = Query("24h", alias="range"),
    db: Session = Depends(get_db)
):
    """
    FR-16: History time series for bin detail chart (24h / 7d / 30d).
    Downsamples appropriately for responsive rendering.
    """
    bin_obj = db.query(Bin).filter(Bin.id == bin_id).first()
    if not bin_obj:
        raise HTTPException(status_code=404, detail="Bin not found")

    now = datetime.now(timezone.utc)
    if range_str == "7d":
        since = now - timedelta(days=7)
    elif range_str == "30d":
        since = now - timedelta(days=30)
    else:  # default 24h
        since = now - timedelta(hours=24)

    readings = (
        db.query(Reading)
        .filter(Reading.bin_id == bin_id, Reading.ts >= since)
        .order_by(Reading.ts.asc())
        .all()
    )

    collections = (
        db.query(Collection)
        .filter(Collection.bin_id == bin_id, Collection.emptied_at >= since)
        .order_by(Collection.emptied_at.asc())
        .all()
    )

    # Format for chart
    series = [
        {
            "ts": r.ts.isoformat(),
            "time_label": r.ts.strftime("%H:%M" if range_str == "24h" else "%b %d %H:%M"),
            "fill_pct": round(r.fill_pct, 1),
            "distance_cm": r.distance_cm,
            "battery_pct": r.battery_pct
        }
        for r in readings
    ]

    collections_data = [
        {
            "emptied_at": c.emptied_at.isoformat(),
            "time_label": c.emptied_at.strftime("%H:%M" if range_str == "24h" else "%b %d %H:%M"),
            "emptied_by": c.emptied_by,
            "fill_before": c.fill_before
        }
        for c in collections
    ]

    return {
        "bin_id": bin_id,
        "name": bin_obj.name,
        "depth_cm": bin_obj.depth_cm,
        "warn_pct": bin_obj.warn_pct,
        "critical_pct": bin_obj.critical_pct,
        "series": series,
        "collections": collections_data
    }

