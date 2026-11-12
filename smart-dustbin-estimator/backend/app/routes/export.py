from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisRecord
from app.services.report_generator import generate_pdf_report, generate_history_csv

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/csv")
def export_history_csv(db: Session = Depends(get_db)):
    """FR-11: Download complete analysis history as CSV."""
    records = db.query(AnalysisRecord).order_by(AnalysisRecord.created_at.desc()).all()
    csv_data = generate_history_csv(records)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smart_dustbin_history.csv"}
    )


@router.get("/{record_id}")
def export_analysis_pdf(record_id: int, db: Session = Depends(get_db)):
    """FR-11: Download PDF analysis report for a specific scan."""
    record = db.query(AnalysisRecord).filter(AnalysisRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Analysis record not found")

    try:
        pdf_stream = generate_pdf_report(record)
        return Response(
            content=pdf_stream.getvalue(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=analysis_report_{record.id}.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")

