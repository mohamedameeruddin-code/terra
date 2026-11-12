from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Alert
from app.schemas import AlertResponse
from app.services.alert_service import check_offline_bins

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse])
def get_alerts(
    open_only: bool = Query(True, alias="open"),
    db: Session = Depends(get_db)
):
    """FR-10, FR-11: List alerts with optional filtering by open status."""
    # Run proactive check for offline bins
    check_offline_bins(db)

    query = db.query(Alert)
    if open_only:
        query = query.filter(Alert.acknowledged_at == None)

    alerts = query.order_by(Alert.created_at.desc()).all()

    result = []
    for a in alerts:
        result.append(
            AlertResponse(
                id=a.id,
                bin_id=a.bin_id,
                bin_name=a.bin.name if a.bin else "Unknown",
                location=a.bin.location if a.bin else "Unknown",
                type=a.type,
                message=a.message,
                created_at=a.created_at,
                acknowledged_at=a.acknowledged_at
            )
        )
    return result


@router.post("/{alert_id}/ack", response_model=AlertResponse)
def acknowledge_alert(alert_id: int, db: Session = Depends(get_db)):
    """FR-12: Acknowledge an alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(alert)

    return AlertResponse(
        id=alert.id,
        bin_id=alert.bin_id,
        bin_name=alert.bin.name if alert.bin else "Unknown",
        location=alert.bin.location if alert.bin else "Unknown",
        type=alert.type,
        message=alert.message,
        created_at=alert.created_at,
        acknowledged_at=alert.acknowledged_at
    )

