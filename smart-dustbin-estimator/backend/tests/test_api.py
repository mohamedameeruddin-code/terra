import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_dashboard_api(client):
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "total_bins" in data
    assert "need_emptying" in data
    assert "distribution" in data
    assert data["total_bins"] >= 8  # Seeds 8 demo bins


def test_bins_api(client):
    response = client.get("/api/bins")
    assert response.status_code == 200
    bins = response.json()
    assert len(bins) >= 8
    first = bins[0]
    assert "fill_pct" in first
    assert "status" in first
    assert "api_key" in first


def test_collection_route(client):
    response = client.get("/api/collection")
    assert response.status_code == 200
    sheet = response.json()
    assert len(sheet) >= 8
    # Ensure ranked in descending order of priority_score
    scores = [item["priority_score"] for item in sheet]
    assert scores == sorted(scores, reverse=True)


def test_sample_images_and_analysis(client):
    # Verify samples endpoint returns test images
    response = client.get("/api/samples")
    assert response.status_code == 200
    samples = response.json()
    assert len(samples) >= 1

    # Analyze first sample
    first_sample = samples[0]["filename"]
    res = client.post(f"/api/analyze-sample/{first_sample}")
    assert res.status_code == 200
    result = res.json()
    assert "fill_percentage" in result
    assert "fill_status" in result
    assert "processed_image_url" in result
    assert 0.0 <= result["fill_percentage"] <= 100.0


def test_ingest_sensor_reading(client):
    from datetime import datetime, timezone, timedelta
    # Retrieve a bin
    bins_res = client.get("/api/bins")
    test_bin = bins_res.json()[0]

    # Ingest a valid reading 2 minutes later to avoid sub-minute outlier jump
    future_time = datetime.now(timezone.utc) + timedelta(minutes=3)
    reading_payload = {
        "bin_id": test_bin["id"],
        "distance_cm": 45.0,
        "battery_pct": 98.0,
        "timestamp": future_time.isoformat()
    }
    res = client.post(
        "/api/readings",
        json=reading_payload,
        headers={"X-API-Key": test_bin["api_key"]}
    )
    assert res.status_code == 201
    reading = res.json()
    assert reading["bin_id"] == test_bin["id"]
    assert reading["fill_pct"] >= 0.0


def test_mark_emptied(client):
    bins_res = client.get("/api/bins")
    test_bin = bins_res.json()[0]

    res = client.post(
        f"/api/bins/{test_bin['id']}/empty",
        json={"emptied_by": "Test Operator"}
    )
    assert res.status_code == 200
    data = res.json()
    assert data["bin_id"] == test_bin["id"]
    assert data["emptied_by"] == "Test Operator"
