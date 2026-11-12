import asyncio
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse

from app.database import SessionLocal
from app.models import Bin, Alert
from app.services.sensor_estimator import determine_bin_status, calculate_fill_rate_and_ttf

router = APIRouter(prefix="/api", tags=["Streaming"])


@router.get("/stream")
async def sse_live_stream(request: Request):
    """
    Real-time Server-Sent Events (SSE) feed.
    Broadcasts live bin telemetry, fill updates, and alerts every 3 seconds.
    """
    async def event_generator():
        while True:
            if await request.is_disconnected():
                break

            db = SessionLocal()
            try:
                bins = db.query(Bin).all()
                bins_summary = []
                for b in bins:
                    latest = b.readings[0] if b.readings else None
                    current_fill = latest.fill_pct if latest else 0.0
                    last_seen = latest.ts if latest else None

                    status = determine_bin_status(
                        current_fill,
                        b.warn_pct,
                        b.critical_pct,
                        last_seen,
                        b.interval_min
                    )

                    readings_dict = [{"ts": r.ts, "fill_pct": r.fill_pct} for r in reversed(b.readings[:30])]
                    rate, ttf = calculate_fill_rate_and_ttf(readings_dict, current_fill)

                    bins_summary.append({
                        "id": b.id,
                        "name": b.name,
                        "location": b.location,
                        "fill_pct": round(current_fill, 1),
                        "rate_pct_per_hr": rate,
                        "ttf_min": ttf,
                        "status": status,
                        "battery_pct": latest.battery_pct if latest else 100.0,
                        "last_seen": last_seen.isoformat() if last_seen else None
                    })

                # Open alerts count
                open_alerts_count = db.query(Alert).filter(Alert.acknowledged_at == None).count()

                payload = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "bins": bins_summary,
                    "open_alerts_count": open_alerts_count
                }

                yield {
                    "event": "update",
                    "data": json.dumps(payload)
                }

            finally:
                db.close()

            await asyncio.sleep(3)

    return EventSourceResponse(event_generator())

