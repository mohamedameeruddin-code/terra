import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any


def validate_raw_distance(distance_cm: float, depth_cm: float) -> bool:
    """FR-2 & TRD 3.6: validate 0 < d < D + 10"""
    return 0.0 < distance_cm <= (depth_cm + 10.0)


def smooth_reading(
    current_distance: float,
    recent_distances: List[float],
    prev_smoothed: Optional[float] = None,
    alpha: float = 0.3
) -> float:
    """
    FR-5 & TRD 3.6:
    Median of last 5 readings, then EMA(alpha = 0.3).
    """
    history = (recent_distances[-4:] + [current_distance]) if recent_distances else [current_distance]
    median_val = float(np.median(history))

    if prev_smoothed is None:
        return median_val
    return float(alpha * median_val + (1.0 - alpha) * prev_smoothed)


def is_outlier(
    current_distance: float,
    prev_distance: Optional[float],
    time_diff_seconds: float,
    threshold_pct: float = 40.0
) -> bool:
    """
    FR-6: Discard outliers (reading jump > 40% in under 1 minute).
    """
    if prev_distance is None or prev_distance <= 0:
        return False
    if time_diff_seconds > 60.0:
        return False

    jump_pct = abs(current_distance - prev_distance) / prev_distance * 100.0
    return jump_pct > threshold_pct


def calculate_fill_percentage(
    distance_cm: float,
    depth_cm: float,
    dead_zone_cm: float = 20.0
) -> float:
    """
    FR-4: clamp((D - d_smoothed) / (D - dead_zone) * 100, 0, 100)
    """
    usable_depth = depth_cm - dead_zone_cm
    if usable_depth <= 0:
        return 0.0

    raw_fill = (depth_cm - distance_cm) / usable_depth * 100.0
    return float(np.clip(raw_fill, 0.0, 100.0))


def detect_emptying_event(current_fill: float, prev_fill: Optional[float]) -> bool:
    """
    FR-7: System shall detect an emptying event (fill drops by >= 30 points).
    """
    if prev_fill is None:
        return False
    return (prev_fill - current_fill) >= 30.0


def calculate_fill_rate_and_ttf(
    readings: List[Dict[str, Any]],
    current_fill: float,
    window_hours: float = 6.0
) -> Tuple[float, Optional[int]]:
    """
    FR-8 & FR-9:
    Computes fill rate (% per hour) by linear regression over post-emptying data
    (window <= 6h, minimum 4 points).
    TTF = (100 - current_fill) / fill_rate * 60 minutes.
    If rate <= 0.1 %/hr -> return (rate, None) signifying 'Stable'.
    """
    if len(readings) < 4:
        return 0.0, None

    # Filter to window and post-emptying
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=window_hours)

    window_points = []
    for r in readings:
        r_ts = r["ts"]
        if r_ts.tzinfo is None:
            r_ts = r_ts.replace(tzinfo=timezone.utc)
        if r_ts >= cutoff:
            window_points.append(r)

    # Check for emptying events in the window to reset regression window
    start_idx = 0
    for i in range(1, len(window_points)):
        if (window_points[i - 1]["fill_pct"] - window_points[i]["fill_pct"]) >= 30.0:
            start_idx = i

    valid_slice = window_points[start_idx:]
    if len(valid_slice) < 4:
        return 0.0, None

    # Linear regression: X = hours from earliest point, Y = fill_pct
    base_time = valid_slice[0]["ts"]
    if base_time.tzinfo is None:
        base_time = base_time.replace(tzinfo=timezone.utc)

    x_vals = []
    y_vals = []
    for p in valid_slice:
        pts = p["ts"]
        if pts.tzinfo is None:
            pts = pts.replace(tzinfo=timezone.utc)
        hours = (pts - base_time).total_seconds() / 3600.0
        x_vals.append(hours)
        y_vals.append(p["fill_pct"])

    x = np.array(x_vals)
    y = np.array(y_vals)

    # Check if time span is meaningful (at least 5 minutes)
    if (x[-1] - x[0]) < (5.0 / 60.0):
        return 0.0, None

    # Slope of linear regression
    n = len(x)
    denom = n * np.sum(x**2) - (np.sum(x))**2
    if abs(denom) < 1e-9:
        return 0.0, None

    slope = (n * np.sum(x * y) - np.sum(x) * np.sum(y)) / denom
    fill_rate_per_hr = max(0.0, float(slope))

    if fill_rate_per_hr <= 0.1:
        return round(fill_rate_per_hr, 2), None

    # TTF in minutes
    remaining_fill = max(0.0, 100.0 - current_fill)
    ttf_minutes = int((remaining_fill / fill_rate_per_hr) * 60.0)
    return round(fill_rate_per_hr, 2), ttf_minutes


def compute_priority_score(fill_pct: float, ttf_minutes: Optional[int]) -> float:
    """
    FR-14: score = fill% * 0.6 + urgency * 0.4
    urgency = clamp(100 - TTF_hours * 10, 0, 100)
    """
    if ttf_minutes is None:
        urgency = 0.0
    else:
        ttf_hours = ttf_minutes / 60.0
        urgency = float(np.clip(100.0 - ttf_hours * 10.0, 0.0, 100.0))

    score = (fill_pct * 0.6) + (urgency * 0.4)
    return round(float(np.clip(score, 0.0, 100.0)), 1)


def determine_bin_status(
    fill_pct: float,
    warn_pct: float,
    critical_pct: float,
    last_seen: Optional[datetime],
    interval_min: int = 5
) -> str:
    """
    Status determination:
    - OFFLINE if last_seen > 3x interval
    - CRITICAL if fill_pct >= critical_pct
    - WARN if fill_pct >= warn_pct
    - OK otherwise
    """
    if last_seen is not None:
        now = datetime.now(timezone.utc)
        if last_seen.tzinfo is None:
            last_seen = last_seen.replace(tzinfo=timezone.utc)
        offline_threshold_sec = interval_min * 60 * 3
        if (now - last_seen).total_seconds() > offline_threshold_sec:
            return "OFFLINE"

    if fill_pct >= critical_pct:
        return "CRITICAL"
    elif fill_pct >= warn_pct:
        return "WARN"
    return "OK"

