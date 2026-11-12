import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisRecord
from app.schemas import AnalysisRecordSummary, AnalysisResponse

router = APIRouter(prefix="/api/history", tags=["History"])


@router.get("", response_model=List[AnalysisRecordSummary])
def get_history(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """FR-09: Retrieve saved image analysis records."""
    query = db.query(AnalysisRecord)

    if search:
        query = query.filter(
            (AnalysisRecord.image_name.ilike(f"%{search}%")) |
            (AnalysisRecord.notes.ilike(f"%{search}%")) |
            (AnalysisRecord.recommendation.ilike(f"%{search}%"))
        )

    if status and status.lower() != "all":
        query = query.filter(AnalysisRecord.fill_status.ilike(status))

    records = query.order_by(AnalysisRecord.created_at.desc()).all()

    results = []
    for r in records:
        orig_url = f"/uploads/{os.path.basename(r.image_path)}" if r.image_path else ""
        proc_url = f"/processed/{os.path.basename(r.result_image_path)}" if r.result_image_path else ""
        results.append(
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
    return results


@router.get("/{record_id}", response_model=AnalysisResponse)
def get_history_record(record_id: int, db: Session = Depends(get_db)):
    """FR-09: Returns details of a specific analysis record."""
    r = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Analysis record not found")

    orig_url = f"/uploads/{os.path.basename(r.image_path)}" if r.image_path else ""
    proc_url = f"/processed/{os.path.basename(r.result_image_path)}" if r.result_image_path else ""

    return AnalysisResponse(
        id=r.id,
        image_name=r.image_name,
        original_image_url=orig_url,
        processed_image_url=proc_url,
        fill_percentage=r.fill_percentage,
        fill_status=r.fill_status,
        confidence_score=r.confidence_score,
        usable_bin_height=r.usable_bin_height,
        detected_waste_height=r.detected_waste_height,
        recommendation=r.recommendation,
        notes=r.notes,
        created_at=r.created_at
    )


@router.delete("/{record_id}")
def delete_history_record(record_id: int, db: Session = Depends(get_db)):
    """FR-09: Delete a single analysis record and its stored files."""
    r = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Analysis record not found")

    # Safely remove files if they exist
    if r.image_path and os.path.exists(r.image_path):
        try:
            os.remove(r.image_path)
        except OSError:
            pass

    if r.result_image_path and os.path.exists(r.result_image_path):
        try:
            os.remove(r.result_image_path)
        except OSError:
            pass

    db.delete(r)
    db.commit()
    return {"status": "deleted", "id": record_id}

