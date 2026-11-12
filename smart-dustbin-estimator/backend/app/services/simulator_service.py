import asyncio
import random
import secrets
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Bin, Reading, Collection, Alert
from app.services.sensor_estimator import (
    smooth_reading,
    calculate_fill_percentage,
    detect_emptying_event,
    determine_bin_status,
)
from app.services.alert_service import check_and_create_alerts


DEFAULT_DEMO_BINS = [
    {"name": "Canteen Gate", "location": "Campus North", "depth_cm": 100.0, "rate": 8.5, "initial_fill": 68.0, "offline": False},
    {"name": "Library Corridor", "location": "Academic Block A", "depth_cm": 90.0, "rate": 2.2, "initial_fill": 28.0, "offline": False},
    {"name": "Main Quad Plaza", "location": "Central Lawn", "depth_cm": 120.0, "rate": 9.8, "initial_fill": 92.5, "offline": False},
    {"name": "Lab Block 2", "location": "Engineering Wing", "depth_cm": 100.0, "rate": 4.5, "initial_fill": 54.0, "offline": False},
    {"name": "Hostel A Entrance", "location": "Residential Zone", "depth_cm": 110.0, "rate": 5.0, "initial_fill": 15.0, "offline": False, "emptied_recently": True},
    {"name": "Cafeteria Patio", "location": "Food Court Outdoors", "depth_cm": 100.0, "rate": 11.0, "initial_fill": 84.0, "offline": False},
    {"name": "Workshop Yard", "location": "Technical Compound", "depth_cm": 130.0, "rate": 3.0, "initial_fill": 45.0, "offline": True},
    {"name": "Admin Foyer", "location": "Ground Floor Lobby", "depth_cm": 80.0, "rate": 1.8, "initial_fill": 22.0, "offline": False},
]


class SimulatorManager:
    def __init__(self):
        self.is_running = False
        self._task: asyncio.Task = None

    def initialize_demo_bins(self, db: Session):
        """Seeds the 8 demo bins and generates realistic past readings if database is empty."""
        existing_count = db.query(Bin).count()
        if existing_count > 0:
            return

        now = datetime.now(timezone.utc)

        for item in DEFAULT_DEMO_BINS:
            api_key = f"sde_key_{secrets.token_hex(16)}"
            bin_obj = Bin(
                name=item["name"],
                location=item["location"],
                depth_cm=item["depth_cm"],
                dead_zone_cm=20.0,
                warn_pct=70.0,
                critical_pct=90.0,
                interval_min=5,
                api_key=api_key,
                created_at=now - timedelta(days=2)
            )
            db.add(bin_obj)
            db.flush()

            # Generate past 24 readings (5 min intervals = last 2 hours of data)
            current_f = item["initial_fill"]
            depth = item["depth_cm"]
            dead_zone = 20.0
            usable = depth - dead_zone

            prev_smoothed = None
            recent_dists = []

            # If offline, the last reading was 35 mins ago (> 3x interval of 5m = 15m)
            num_points = 24
            offset_minutes = 35 if item.get("offline") else 0

            for i in range(num_points, 0, -1):
                point_time = now - timedelta(minutes=(i * 5 + offset_minutes))
                
                # Approximate fill level walking backwards
                f = max(5.0, min(100.0, current_f - (item["rate"] * (i * 5 / 60.0))))
                
                # If emptied recently, simulate empty drop 30 mins ago
                if item.get("emptied_recently") and i > 6:
                    f = min(95.0, 75.0 + (i - 6) * 2.0)

                # Distance: fill = (depth - d) / usable * 100 => d = depth - (fill/100 * usable)
                ideal_d = depth - (f / 100.0 * usable)
                noisy_d = round(ideal_d + random.uniform(-1.2, 1.2), 1)

                smoothed = smooth_reading(noisy_d, recent_dists, prev_smoothed, alpha=0.3)
                recent_dists.append(noisy_d)
                prev_smoothed = smoothed

                computed_fill = calculate_fill_percentage(smoothed, depth, dead_zone)

                reading = Reading(
                    bin_id=bin_obj.id,
                    distance_cm=noisy_d,
                    smoothed_distance_cm=smoothed,
                    fill_pct=computed_fill,
                    battery_pct=round(max(60.0, 100.0 - (i * 0.2)), 0),
                    ts=point_time
                )
                db.add(reading)

            # If emptied recently, record collection event
            if item.get("emptied_recently"):
                coll = Collection(
                    bin_id=bin_obj.id,
                    emptied_at=now - timedelta(minutes=30),
                    emptied_by="Ravi (Lead Collector)",
                    fill_before=86.5
                )
                db.add(coll)

            db.commit()

            # Trigger initial alerts check
            latest_status = determine_bin_status(
                current_f,
                bin_obj.warn_pct,
                bin_obj.critical_pct,
                now - timedelta(minutes=offset_minutes),
                bin_obj.interval_min
            )
            check_and_create_alerts(db, bin_obj, current_f, latest_status)

    async def _simulator_loop(self):
        """Background loop that ticks every 5 seconds to simulate real-time telemetry."""
        while self.is_running:
            try:
                await asyncio.sleep(5)
                db = SessionLocal()
                try:
                    bins = db.query(Bin).all()
                    now = datetime.now(timezone.utc)

                    for b in bins:
                        # Skip simulated updates for offline bins
                        if "Workshop" in b.name:
                            continue

                        latest = b.readings[0] if b.readings else None
                        prev_fill = latest.fill_pct if latest else 20.0
                        prev_smoothed = latest.smoothed_distance_cm if latest else None
                        
                        # Add a small increment based on location fill rate
                        delta = random.uniform(0.1, 0.4)
                        new_fill = min(100.0, prev_fill + delta)

                        usable = b.depth_cm - b.dead_zone_cm
                        ideal_d = b.depth_cm - (new_fill / 100.0 * usable)
                        # Add subtle sensor noise (+/- 0.8 cm)
                        noisy_d = round(ideal_d + random.uniform(-0.8, 0.8), 1)

                        recent_dists = [r.distance_cm for r in b.readings[:4]]
                        smoothed = smooth_reading(noisy_d, recent_dists, prev_smoothed, alpha=0.3)
                        computed_fill = calculate_fill_percentage(smoothed, b.depth_cm, b.dead_zone_cm)

                        new_reading = Reading(
                            bin_id=b.id,
                            distance_cm=noisy_d,
                            smoothed_distance_cm=smoothed,
                            fill_pct=computed_fill,
                            battery_pct=latest.battery_pct if latest else 95.0,
                            ts=now
                        )
                        db.add(new_reading)
                        db.commit()

                        status = determine_bin_status(
                            computed_fill,
                            b.warn_pct,
                            b.critical_pct,
                            now,
                            b.interval_min
                        )
                        check_and_create_alerts(db, b, computed_fill, status)
                finally:
                    db.close()
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Simulator loop error: {e}")
                await asyncio.sleep(2)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._simulator_loop())

    def stop(self):
        if self.is_running:
            self.is_running = False
            if self._task:
                self._task.cancel()
                self._task = None


simulator = SimulatorManager()

