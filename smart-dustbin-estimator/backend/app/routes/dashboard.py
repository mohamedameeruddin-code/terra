from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List

from app.database import get_db
from app.models import Bin, AnalysisRecord, Alert, Reading
from app.schemas import DashboardStats, AlertResponse, AnalysisRecordSummary
from app.services.sensor_estimator import determine_bin_status, calculate_fill_rate_and_ttf

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard_data(db: Session = Depends(get_db)):
    """
    FR-10: Dashboard Analytics.
    Returns fleet totals, fill level summaries, collection alerts, recent scans, and distribution.
    """
    bins = db.query(Bin).all()
    now = datetime.now(timezone.utc)

    total_bins = len(bins)
    need_emptying = 0
    warning_bins = 0
    offline_bins = 0
    fill_sum = 0.0

    distribution = {
        "Empty": 0,
        "Low": 0,
        "Medium": 0,
        "High": 0,
        "Critical": 0
    }

    for b in bins:
        latest = b.readings[0] if b.readings else None
        current_fill = latest.fill_pct if latest else 0.0
        fill_sum += current_fill

        status = determine_bin_status(
            current_fill,
            b.warn_pct,
            b.critical_pct,
            latest.ts if latest else None,
            b.interval_min
        )

        if status == "OFFLINE":
            offline_bins += 1
        elif status == "CRITICAL":
            need_emptying += 1
        elif status == "WARN":
            warning_bins += 1

        # Distribution count
        if current_fill <= 20.0:
            distribution["Empty"] += 1
        elif current_fill <= 40.0:
            distribution["Low"] += 1
        elif current_fill <= 60.0:
            distribution["Medium"] += 1
        elif current_fill <= 80.0:
            distribution["High"] += 1
        else:
            distribution["Critical"] += 1

    avg_fill = round(fill_sum / total_bins, 1) if total_bins > 0 else 0.0

    # Vision Scans
    total_scans = db.query(AnalysisRecord).count()
    recent_analyses_raw = (
        db.query(AnalysisRecord)
        .order_by(AnalysisRecord.created_at.desc())
        .limit(6)
        .all()
    )

    recent_analyses = []
    for r in recent_analyses_raw:
        # Build relative URLs
        orig_url = f"/uploads/{os.path.basename(r.image_path)}" if r.image_path else ""
        proc_url = f"/processed/{os.path.basename(r.result_image_path)}" if r.result_image_path else ""
        recent_analyses.append(
            AnalysisRecordSummary(
                id=r.id,
                image_name=r.image_name,
                original_image_url=orig_url,
                processed_image_url=proc_url,
                fill_percentage=r.fill_percentage,
                fill_status=r.fill_status,
                confidence_score=r.confidence_score,
                recommendation=r.recommendation,
                created_at=r.created_at,
                notes=r.notes
            )
        )

    # Active collection alerts (open alerts for High / Critical / Offline)
    open_alerts_raw = (
        db.query(Alert)
        .filter(Alert.acknowledged_at == None)
        .order_by(Alert.created_at.desc())
        .limit(8)
        .all()
    )

    collection_alerts = []
    for a in open_alerts_raw:
        b_name = a.bin.name if a.bin else "Unknown Bin"
        b_loc = a.bin.location if a.bin else ""
        collection_alerts.append(
            AlertResponse(
                id=a.id,
                bin_id=a.bin_id,
                bin_name=b_name,
                location=b_loc,
                type=a.type,
                message=a.message,
                created_at=a.created_at,
                acknowledged_at=a.acknowledged_at
            )
        )

    return DashboardStats(
        total_bins=total_bins,
        need_emptying=need_emptying,
        warning_bins=warning_bins,
        offline_bins=offline_bins,
        total_scans=total_scans,
        avg_fill_pct=avg_fill,
        collection_alerts=collection_alerts,
        recent_analyses=recent_analyses,
        distribution=distribution
    )
import os
