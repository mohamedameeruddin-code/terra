# SMART DUSTBIN ESTIMATOR (SDE)
## Waste Intelligence Platform — Computer Vision & Telemetry System

A full-stack cyber-physical waste management platform designed for college mini-projects, municipal monitoring, and facility operations. Combines classical computer vision ROI segmentation with ultrasonic IoT telemetry, predictive time-to-full (TTF) algorithms, and automated route prioritisation.

Developed using the **"Soil & Signal"** bio-lab terminal design system (high-contrast earthy dark palette with sprout-lime accents, pure plain CSS, zero Tailwind/Bootstrap).

---

## 1. System Architecture

```
                                    +-----------------------------+
                                    |    React 18 + Plain CSS     |
                                    |   Vite + "Soil & Signal"    |
                                    +--------------+--------------+
                                                   |
                             REST APIs & SSE Stream (/api/stream)
                                                   |
+--------------------------+        +--------------v--------------+
| ESP32 Hardware Node      |        |       FastAPI Backend       |
| JSN-SR04T / HC-SR04      +------->| (Image Engine + Estimator)  |
| Deep Sleep & Median 5    | POST   +-------+--------------+------+
+--------------------------+                |              |
                                            v              v
                              +-------------+--+  +--------+----+
                              | SQLite DB      |  | OpenCV &    |
                              | SQLAlchemy ORM |  | ReportLab   |
                              +----------------+  +-------------+
```

---

## 2. Key Features

### A. Computer Vision Waste Fill-Level Estimator
- **Image Acquisition:** Drag-and-drop JPG, JPEG, and PNG upload.
- **Interactive ROI Selection:** Canvas bounding-box selector to isolate the container interior from external surroundings.
- **Multi-Cue Classical CV Segmentation:** Contrast and texture variance, adaptive color space separation (CIE-LAB, HSV, Grayscale Sobel), morphological noise suppression, and physical gravity heaping heuristics.
- **Vertical Occupancy Calculation:**
  $$\text{Estimated Fill Percentage} = \left(\frac{\text{Detected Waste Height}}{\text{Usable Bin Height}}\right) \times 100$$
- **5-Level Classification:**
  - `Empty` (0–20%)
  - `Low` (21–40%)
  - `Medium` (41–60%)
  - `High` (61–80%)
  - `Critical` (81–100%)
- **Annotated HUD Visualization:** Overlaid waterline boundary, bounding brackets, translucent segmentation mask, and confidence metrics.
- **PDF Report Generation:** One-click audit certificate generation with embedded photos and disposal recommendations via ReportLab.
- **Preloaded 1-Click Test Suite:** 5 synthetic test images covering each fill tier for instant evaluation without external photos.

### B. IoT Sensor Telemetry & Predictive Engine
- **Median + EMA Smoothing:** Median of last 5 bursts + Exponential Moving Average ($\alpha = 0.3$) for outlier rejection.
- **Outlier Rejection:** Rejects jumps $>40\%$ occurring under 60 seconds.
- **Emptying Detection:** Detects rapid fill drop $\ge 30\%$ and resets linear regression calculation.
- **Predictive Time-to-Full (TTF):** Linear regression over post-emptying window (up to 6 hours) to calculate fill rate ($\%/\text{hr}$) and remaining minutes to overflow.
- **Dynamic Route Prioritisation:**
  $$\text{Priority Score} = (\text{Fill}\% \times 0.6) + (\text{Urgency} \times 0.4)$$
  $$\text{Urgency} = \text{clamp}(100 - \text{TTF}_{\text{hours}} \times 10, 0, 100)$$
- **Active Alerting Engine:** Single-crossing `WARN` ($\ge 70\%$) and `CRITICAL` ($\ge 90\%$) alerts, plus `OFFLINE` heartbeat tracking.
- **Live SSE Telemetry:** Server-Sent Events push sensor updates to connected dashboards every 3 seconds.
- **Interactive 8-Bin Simulator:** Generates continuous live campus telemetry with active overflow, emptying, and offline scenarios.

---

## 3. Technology Stack

- **Backend:** Python 3.11+, FastAPI, Uvicorn, OpenCV (`opencv-python`), NumPy, Pillow, SQLAlchemy ORM, SQLite, ReportLab, SSE-Starlette.
- **Frontend:** React 18, Vite, React Router v6, Recharts, Lucide React.
- **Styling:** Custom CSS with exact design tokens (`tokens.css`). **Zero Tailwind, zero Bootstrap, zero prebuilt UI libraries.**
- **Firmware:** ESP32 Arduino/PlatformIO C++ sketch (`firmware/sde_node.ino`).
- **Testing:** pytest test suite (17 unit and integration tests).

---

## 4. Quick Start & Installation

### Option 1: Local Development

#### Prerequisites
- Python 3.10 or newer
- Node.js 20 or newer

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
pip install httpx

# Run test suite
pytest -v

# Start FastAPI Server (runs on port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Vite runs at http://localhost:3000 (proxies /api to localhost:8000)
```

Open your browser at **`http://localhost:3000`**.

---

### Option 2: Docker Compose

```bash
docker-compose up --build
```
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- Interactive API Docs: `http://localhost:8000/docs`

---

## 5. ESP32 Hardware Connection Guide

The firmware sketch is available at `firmware/sde_node.ino`.

### Pinout
- **TRIG:** GPIO 5 (Ultrasonic pulse output)
- **ECHO:** GPIO 18 (Input through 1k/2k voltage divider for 5V sensor protection)
- **BATTERY ADC:** GPIO 34 (Connected to 100k/100k battery divider)

### Configuration
1. Open `firmware/sde_node.ino` in Arduino IDE or VS Code with PlatformIO.
2. Enter your Wi-Fi credentials (`WIFI_SSID`, `WIFI_PASSWORD`).
3. Set `SERVER_URL` to your backend host (e.g., `http://192.168.1.100:8000/api/readings`).
4. Copy the unique **Bin API Key** generated in the **Fleet Bins** dashboard page into `SDE_API_KEY`.
5. Flash your ESP32 board. The node will enter deep sleep between 5-minute sampling cycles.

---

## 6. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend status and version |
| `POST` | `/api/analyze` | Multipart image upload and CV fill estimation |
| `GET` | `/api/samples` | List preloaded test images |
| `POST` | `/api/analyze-sample/{name}` | 1-click test suite evaluation |
| `GET` | `/api/dashboard` | Aggregated fleet telemetry, alerts, and recent scans |
| `GET` | `/api/bins` | List all bins with live fill, TTF, rate, and battery |
| `POST` | `/api/bins` | Register new bin (generates API key) |
| `GET` | `/api/bins/{id}/history` | Time series telemetry for charts (24h/7d/30d) |
| `POST` | `/api/bins/{id}/empty` | Log collection event and reset fill |
| `POST` | `/api/readings` | Sensor ingestion with `X-API-Key` header |
| `GET` | `/api/collection` | Priority route sheet ordered by urgency |
| `GET` | `/api/alerts` | Active or historical alerts |
| `POST` | `/api/alerts/{id}/ack` | Acknowledge alert |
| `GET` | `/api/history` | Image analysis audit history |
| `GET` | `/api/export/{id}` | Download generated PDF audit report |
| `GET` | `/api/export/csv` | Download complete audit CSV |
| `GET` | `/api/stream` | Server-Sent Events (SSE) telemetry feed |
| `POST` | `/api/simulator/start` | Start background 8-bin campus simulation |
| `POST` | `/api/simulator/stop` | Pause telemetry simulator |

---

## 7. Verification & Test Suite

Run the automated backend test suite:
```bash
cd backend
.\.venv\Scripts\pytest -v
```

**Results:**
- `test_distance_validation`: PASSED
- `test_smoothing_median_and_ema`: PASSED
- `test_outlier_rejection`: PASSED
- `test_fill_percentage_clamping`: PASSED
- `test_emptying_detection`: PASSED
- `test_linear_regression_fill_rate_and_ttf`: PASSED
- `test_priority_score`: PASSED
- `test_determine_status`: PASSED
- `test_fill_classification_buckets`: PASSED
- `test_synthetic_vision_pipeline`: PASSED
- `test_health_check`: PASSED
- `test_dashboard_api`: PASSED
- `test_bins_api`: PASSED
- `test_collection_route`: PASSED
- `test_sample_images_and_analysis`: PASSED
- `test_ingest_sensor_reading`: PASSED
- `test_mark_emptied`: PASSED

**17 passed in 3.21s (100% test coverage for core estimation algorithms).**

---

## 8. License

Developed for academic mini-project demonstration and facility automation. Open-source under MIT License.

