/*
 * ============================================================================
 * SMART DUSTBIN ESTIMATOR (SDE) - ESP32 FIRMWARE NODE
 * ============================================================================
 * Hardware:
 *   - ESP32-WROOM-32 DevKit
 *   - Ultrasonic Distance Sensor: JSN-SR04T (waterproof) or HC-SR04
 *   - Voltage Divider for Battery Monitoring (ADC GPIO 34)
 *
 * Pin Connections:
 *   - TRIG_PIN:    GPIO 5
 *   - ECHO_PIN:    GPIO 18 (via 1k/2k resistor voltage divider if using 5V HC-SR04)
 *   - BATTERY_PIN: GPIO 34 (ADC1_CH6, 100k/100k divider)
 *
 * Power Architecture:
 *   - ESP32 deep sleep between measurement cycles (default 5 minutes).
 *   - Takes 5 raw ultrasonic bursts, computes median distance.
 *   - Wi-Fi reconnection with exponential backoff.
 *   - RTC memory ring buffer holds up to 20 samples if Wi-Fi is temporarily offline.
 *   - Transmits HTTP POST to /api/readings with header X-API-Key.
 * ============================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>

// ---------------------------------------------------------------------------
// Network & Backend Configuration
// ---------------------------------------------------------------------------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Backend endpoint (replace with your server IP / domain)
const char* SERVER_URL    = "http://192.168.1.100:8000/api/readings";

// Bin Credentials (obtain from the SDE Admin Dashboard)
const int   BIN_ID        = 1;
const char* SDE_API_KEY   = "sde_your_assigned_api_key_here";

// Sleep configuration
#define TIME_TO_SLEEP_SEC 300     // 5 minutes
#define uS_TO_S_FACTOR    1000000ULL

// GPIO Pin Definitions
#define TRIG_PIN          5
#define ECHO_PIN          18
#define BATTERY_PIN       34

// ---------------------------------------------------------------------------
// RTC Slow Memory Persistence (Survives Deep Sleep)
// ---------------------------------------------------------------------------
struct QueuedReading {
    float distance_cm;
    float battery_pct;
};

#define MAX_BUFFERED_READINGS 20
RTC_DATA_ATTR int bootCount = 0;
RTC_DATA_ATTR int queueCount = 0;
RTC_DATA_ATTR QueuedReading rtcQueue[MAX_BUFFERED_READINGS];

// ---------------------------------------------------------------------------
// Helper: Take 1 Distance Measurement (cm)
// ---------------------------------------------------------------------------
float readSingleDistanceCm() {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout (~5 meters max)
    if (duration == 0) {
        return 999.0; // Timeout or out of range
    }
    // Speed of sound = 343 m/s = 0.0343 cm/microsecond
    // Distance = (duration / 2) * 0.0343
    return (float)duration * 0.0343 / 2.0;
}

// ---------------------------------------------------------------------------
// Helper: Take 5 samples and compute median
// ---------------------------------------------------------------------------
float readMedianDistance() {
    const int SAMPLES = 5;
    float samples[SAMPLES];

    for (int i = 0; i < SAMPLES; i++) {
        samples[i] = readSingleDistanceCm();
        delay(40);
    }

    // Bubble sort 5 values
    for (int i = 0; i < SAMPLES - 1; i++) {
        for (int j = i + 1; j < SAMPLES; j++) {
            if (samples[i] > samples[j]) {
                float tmp = samples[i];
                samples[i] = samples[j];
                samples[j] = tmp;
            }
        }
    }

    // Return median (element index 2)
    return samples[2];
}

// ---------------------------------------------------------------------------
// Helper: Read Battery Percentage
// ---------------------------------------------------------------------------
float readBatteryPercentage() {
    // 12-bit ADC (0 - 4095), 3.3V ref with 1:2 divider -> max 6.6V input
    int raw = analogRead(BATTERY_PIN);
    float measured_v = ((float)raw / 4095.0) * 3.3 * 2.0;
    
    // For single LiPo cell: 4.2V = 100%, 3.3V = 0%
    float pct = ((measured_v - 3.3) / (4.2 - 3.3)) * 100.0;
    if (pct > 100.0) pct = 100.0;
    if (pct < 0.0)   pct = 0.0;
    return round(pct);
}

// ---------------------------------------------------------------------------
// Helper: Connect to Wi-Fi with exponential backoff
// ---------------------------------------------------------------------------
bool connectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return true;

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    int maxAttempts = 15;
    while (WiFi.status() != WL_CONNECTED && attempts < maxAttempts) {
        delay(300);
        attempts++;
    }

    return (WiFi.status() == WL_CONNECTED);
}

// ---------------------------------------------------------------------------
// Helper: Transmit Reading to Backend API
// ---------------------------------------------------------------------------
bool postReading(float distance_cm, float battery_pct) {
    if (WiFi.status() != WL_CONNECTED) return false;

    HTTPClient http;
    http.begin(SERVER_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", SDE_API_KEY);

    char payload[128];
    snprintf(payload, sizeof(payload),
             "{\"bin_id\":%d,\"distance_cm\":%.1f,\"battery_pct\":%.0f}",
             BIN_ID, distance_cm, battery_pct);

    int httpCode = http.POST(payload);
    bool success = (httpCode >= 200 && httpCode < 300);

    http.end();
    return success;
}

// ---------------------------------------------------------------------------
// Main Setup (Runs on every wake-up cycle)
// ---------------------------------------------------------------------------
void setup() {
    bootCount++;
    Serial.begin(115200);
    delay(100);

    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    pinMode(BATTERY_PIN, INPUT);

    // 1. Take sensor readings
    float distance = readMedianDistance();
    float battery  = readBatteryPercentage();

    Serial.printf("[SDE Node] Boot #%d | Distance: %.1f cm | Battery: %.0f%%\n",
                  bootCount, distance, battery);

    // 2. Attempt Wi-Fi Connection
    bool online = connectWiFi();

    if (online) {
        // Flush any previously buffered readings from RTC memory
        while (queueCount > 0) {
            QueuedReading item = rtcQueue[queueCount - 1];
            if (postReading(item.distance_cm, item.battery_pct)) {
                queueCount--;
            } else {
                break;
            }
        }

        // Post current reading
        bool sent = postReading(distance, battery);
        if (!sent && queueCount < MAX_BUFFERED_READINGS) {
            rtcQueue[queueCount++] = { distance, battery };
        }
    } else {
        // Offline: buffer to RTC memory
        if (queueCount < MAX_BUFFERED_READINGS) {
            rtcQueue[queueCount++] = { distance, battery };
        }
    }

    // Disconnect Wi-Fi before entering deep sleep
    WiFi.disconnect(true);
    WiFi.mode(WIFI_OFF);

    // 3. Configure ESP32 Deep Sleep Timer and enter low power mode
    esp_sleep_enable_timer_wakeup(TIME_TO_SLEEP_SEC * uS_TO_S_FACTOR);
    Serial.println("[SDE Node] Entering deep sleep...");
    Serial.flush();
    esp_deep_sleep_start();
}

void loop() {
    // Loop is not executed in deep-sleep architecture
}

