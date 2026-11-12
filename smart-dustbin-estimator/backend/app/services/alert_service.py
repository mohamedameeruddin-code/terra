from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models import Alert, Bin


def check_and_create_alerts(db: Session, bin_obj: Bin, fill_pct: float, status: str):
    """
    FR-10: WARN alert at >= warn threshold and CRITICAL alert at >= critical threshold,
    once per crossing.
    """
    now = datetime.now(timezone.utc)

    if status in ("WARN", "CRITICAL"):
        # Check if an open alert of this type already exists for this bin
        existing_alert = (
            db.query(Alert)
            .filter(
                Alert.bin_id == bin_obj.id,
                Alert.type == status,
                Alert.acknowledged_at == None
            )
            .first()
        )

        if not existing_alert:
            msg = (
                f"{bin_obj.name} ({bin_obj.location}) reached {fill_pct:.1f}% capacity ({status}). Immediate collection recommended."
                if status == "CRITICAL"
                else f"{bin_obj.name} ({bin_obj.location}) is at {fill_pct:.1f}% capacity ({status}). Plan collection soon."
            )
            new_alert = Alert(
                bin_id=bin_obj.id,
                type=status,
                message=msg,
                created_at=now
            )
            db.add(new_alert)
            db.commit()


def check_offline_bins(db: Session):
    """
    FR-11: Create OFFLINE alert if no reading is received for 3x the expected interval.
    """
    bins = db.query(Bin).all()
    now = datetime.now(timezone.utc)

    for b in bins:
        latest_reading = b.readings[0] if b.readings else None
        if latest_reading:
            last_ts = latest_reading.ts
            if last_ts.tzinfo is None:
                last_ts = last_ts.replace(tzinfo=timezone.utc)
            max_silence_sec = b.interval_min * 60 * 3
            if (now - last_ts).total_seconds() > max_silence_sec:
                # Check for existing open OFFLINE alert
                existing = (
                    db.query(Alert)
                    .filter(
                        Alert.bin_id == b.id,
                        Alert.type == "OFFLINE",
                        Alert.acknowledged_at == None
                    )
                    .first()
                )
                if not existing:
                    new_alert = Alert(
                        bin_id=b.id,
                        type="OFFLINE",
                        message=f"{b.name} ({b.location}) has stopped reporting telemetry (offline > {int(max_silence_sec / 60)} min).",
                        created_at=now
                    )
                    db.add(new_alert)
                    db.commit()

