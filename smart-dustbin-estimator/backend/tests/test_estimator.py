import pytest
from datetime import datetime, timezone, timedelta
from app.services.sensor_estimator import (
    validate_raw_distance,
    smooth_reading,
    is_outlier,
    calculate_fill_percentage,
    detect_emptying_event,
    calculate_fill_rate_and_ttf,
    compute_priority_score,
    determine_bin_status
)


def test_distance_validation():
    depth = 100.0
    assert validate_raw_distance(50.0, depth) is True
    assert validate_raw_distance(105.0, depth) is True
    assert validate_raw_distance(0.0, depth) is False
    assert validate_raw_distance(-5.0, depth) is False
    assert validate_raw_distance(115.0, depth) is False  # D + 10 = 110


def test_smoothing_median_and_ema():
    # 5 readings: [50, 52, 51, 49, 80] (80 is noise)
    recent = [50.0, 52.0, 51.0, 49.0]
    noisy_sample = 80.0
    # Median of [50, 52, 51, 49, 80] = 51.0
    smoothed = smooth_reading(noisy_sample, recent, prev_smoothed=50.0, alpha=0.3)
    # 0.3 * 51 + 0.7 * 50 = 15.3 + 35.0 = 50.3
    assert abs(smoothed - 50.3) < 0.1


def test_outlier_rejection():
    # Reading jumps from 50 to 80 (60% jump) in 20 seconds
    assert is_outlier(80.0, 50.0, time_diff_seconds=20.0, threshold_pct=40.0) is True
    # Reading changes from 50 to 55 (10% change) in 20 seconds
    assert is_outlier(55.0, 50.0, time_diff_seconds=20.0, threshold_pct=40.0) is False
    # Jump after 5 minutes is NOT discarded (could be legitimate fill over time)
    assert is_outlier(80.0, 50.0, time_diff_seconds=300.0, threshold_pct=40.0) is False


def test_fill_percentage_clamping():
    depth = 100.0
    dead_zone = 20.0  # usable is 80.0
    # At empty distance = 100cm -> fill = (100 - 100) / 80 = 0%
    assert calculate_fill_percentage(100.0, depth, dead_zone) == 0.0
    # At full distance = 20cm -> fill = (100 - 20) / 80 = 100%
    assert calculate_fill_percentage(20.0, depth, dead_zone) == 100.0
    # Halfway distance = 60cm -> fill = (100 - 60) / 80 = 50%
    assert calculate_fill_percentage(60.0, depth, dead_zone) == 50.0
    # Out of bounds clamping
    assert calculate_fill_percentage(110.0, depth, dead_zone) == 0.0
    assert calculate_fill_percentage(10.0, depth, dead_zone) == 100.0


def test_emptying_detection():
    # Drop by 35 points is an emptying event
    assert detect_emptying_event(current_fill=15.0, prev_fill=50.0) is True
    # Drop by 10 points is normal fluctuation
    assert detect_emptying_event(current_fill=40.0, prev_fill=50.0) is False
    # Increase in fill is not emptying
    assert detect_emptying_event(current_fill=60.0, prev_fill=50.0) is False


def test_linear_regression_fill_rate_and_ttf():
    now = datetime.now(timezone.utc)
    # 6 points over 2 hours increasing at ~10% per hour
    readings = []
    for i in range(6):
        ts = now - timedelta(hours=2.0 - (i * 0.4))
        fill = 40.0 + (i * 4.0)  # 40, 44, 48, 52, 56, 60
        readings.append({"ts": ts, "fill_pct": fill})

    current_fill = 60.0
    rate, ttf = calculate_fill_rate_and_ttf(readings, current_fill)
    assert rate > 8.0 and rate < 12.0
    assert ttf is not None
    assert ttf > 0  # Remaining 40% / 10%/hr = ~4 hours = ~240 mins


def test_priority_score():
    # Urgent bin: 95% full, TTF = 30 mins (0.5 hrs)
    # urgency = clamp(100 - 0.5 * 10, 0, 100) = 95
    # score = 95 * 0.6 + 95 * 0.4 = 95.0
    score = compute_priority_score(fill_pct=95.0, ttf_minutes=30)
    assert score >= 90.0

    # Low priority: 15% full, stable (ttf = None)
    low_score = compute_priority_score(fill_pct=15.0, ttf_minutes=None)
    assert low_score == round(15.0 * 0.6, 1)


def test_determine_status():
    now = datetime.now(timezone.utc)
    # Normal OK
    assert determine_bin_status(35.0, warn_pct=70.0, critical_pct=90.0, last_seen=now) == "OK"
    # WARN
    assert determine_bin_status(75.0, warn_pct=70.0, critical_pct=90.0, last_seen=now) == "WARN"
    # CRITICAL
    assert determine_bin_status(92.0, warn_pct=70.0, critical_pct=90.0, last_seen=now) == "CRITICAL"
    # OFFLINE (last seen 25 mins ago, interval = 5m => max silence is 15m)
    stale_time = now - timedelta(minutes=25)
    assert determine_bin_status(35.0, warn_pct=70.0, critical_pct=90.0, last_seen=stale_time, interval_min=5) == "OFFLINE"

