import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Play,
  Square,
  Cpu,
  Layers,
  Info,
  CheckCircle,
  Sliders,
  HardDrive,
} from 'lucide-react';
import {
  getSimulatorStatus,
  startSimulator,
  stopSimulator,
} from '../api/client';

const Settings = () => {
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [thresholds, setThresholds] = useState({
    empty: 20,
    low: 40,
    medium: 60,
    high: 80,
    critical: 90,
  });

  useEffect(() => {
    getSimulatorStatus()
      .then((data) => setIsSimRunning(data.is_running))
      .catch(() => {});
  }, []);

  const handleToggleSim = async () => {
    setSimLoading(true);
    try {
      if (isSimRunning) {
        await stopSimulator();
        setIsSimRunning(false);
      } else {
        await startSimulator();
        setIsSimRunning(true);
      }
    } catch (err) {
      alert('Failed to toggle simulator: ' + err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>System Configuration & Diagnostics</h1>
        <p style={{ color: 'var(--lichen)', fontSize: '15px' }}>
          Calibrate detection thresholds, control simulated campus telemetry, and inspect ESP32 hardware node integration.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Simulator & Threshold Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Simulator Card */}
          <div className="chamfer-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Cpu size={18} style={{ color: 'var(--sprout)' }} />
              <h2 style={{ fontSize: '16px' }}>TELEMETRY SIMULATOR ENGINE</h2>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--lichen)', marginBottom: '16px' }}>
              Generates continuous, realistic ultrasonic distance telemetry across 8 virtual campus dustbins with variable fill rates, emptying events, and offline scenarios.
            </p>

            <div
              style={{
                padding: '14px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--soil-950)',
                border: '1px solid var(--line)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div>
                <div className="section-label">SIMULATOR ENGINE STATE</div>
                <div style={{ fontWeight: 600, color: isSimRunning ? 'var(--sprout)' : 'var(--lichen)', fontSize: '15px' }}>
                  {isSimRunning ? 'RUNNING (5-Second Pulse Cycle)' : 'IDLE / PAUSED'}
                </div>
              </div>

              <button
                onClick={handleToggleSim}
                disabled={simLoading}
                className={`btn btn-sm ${isSimRunning ? 'btn-danger' : 'btn-primary'}`}
              >
                {isSimRunning ? (
                  <>
                    <Square size={13} fill="currentColor" />
                    <span>Pause Simulator</span>
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    <span>Activate Simulator</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Fill-Level Classification Thresholds */}
          <div className="chamfer-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Sliders size={18} style={{ color: 'var(--sprout)' }} />
              <h2 style={{ fontSize: '16px' }}>CALIBRATION & THRESHOLDS</h2>
            </div>

            <form onSubmit={handleSaveThresholds} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    EMPTY (0 – X%)
                  </label>
                  <input
                    type="number"
                    value={thresholds.empty}
                    onChange={(e) => setThresholds({ ...thresholds, empty: e.target.value })}
                    className="input mono"
                  />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    LOW (21 – X%)
                  </label>
                  <input
                    type="number"
                    value={thresholds.low}
                    onChange={(e) => setThresholds({ ...thresholds, low: e.target.value })}
                    className="input mono"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    MEDIUM (41 – X%)
                  </label>
                  <input
                    type="number"
                    value={thresholds.medium}
                    onChange={(e) => setThresholds({ ...thresholds, medium: e.target.value })}
                    className="input mono"
                  />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    HIGH (61 – X%)
                  </label>
                  <input
                    type="number"
                    value={thresholds.high}
                    onChange={(e) => setThresholds({ ...thresholds, high: e.target.value })}
                    className="input mono"
                  />
                </div>
              </div>

              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                  CRITICAL OVERFLOW THRESHOLD (%)
                </label>
                <input
                  type="number"
                  value={thresholds.critical}
                  onChange={(e) => setThresholds({ ...thresholds, critical: e.target.value })}
                  className="input mono"
                />
              </div>

              <button type="submit" className="btn btn-ghost btn-sm" style={{ marginTop: '8px' }}>
                {saveSuccess ? (
                  <>
                    <CheckCircle size={14} style={{ color: 'var(--sprout)' }} />
                    <span>Thresholds Applied</span>
                  </>
                ) : (
                  <span>Update Detection Thresholds</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Hardware Node Pinout & Architecture */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="chamfer-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <HardDrive size={18} style={{ color: 'var(--sprout)' }} />
              <h2 style={{ fontSize: '16px' }}>ESP32 HARDWARE INTEGRATION</h2>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--lichen)', marginBottom: '16px' }}>
              The node sketch is located at <code className="mono">firmware/sde_node.ino</code>. It wakes from deep sleep every 5 minutes, measures ultrasonic median distance, and submits telemetry via HTTP POST with device API key authentication.
            </p>

            <div
              style={{
                backgroundColor: 'var(--soil-950)',
                padding: '16px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--line)',
                marginBottom: '16px',
              }}
            >
              <div className="section-label" style={{ marginBottom: '8px' }}>
                PINOUT SCHEMATIC
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }} className="mono">
                <li style={{ fontSize: '12px', color: 'var(--bone)' }}>
                  • <strong style={{ color: 'var(--sprout)' }}>GPIO 5</strong>: TRIG (Ultrasonic Trigger Pulse)
                </li>
                <li style={{ fontSize: '12px', color: 'var(--bone)' }}>
                  • <strong style={{ color: 'var(--sprout)' }}>GPIO 18</strong>: ECHO (5V Divider to 3.3V Logic)
                </li>
                <li style={{ fontSize: '12px', color: 'var(--bone)' }}>
                  • <strong style={{ color: 'var(--sprout)' }}>GPIO 34</strong>: BATTERY_ADC (1:2 Voltage Divider)
                </li>
                <li style={{ fontSize: '12px', color: 'var(--bone)' }}>
                  • <strong style={{ color: 'var(--sprout)' }}>Power</strong>: 3.7V LiPo or 5V USB Source
                </li>
              </ul>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--lichen)' }}>
              Supports waterproof JSN-SR04T and standard HC-SR04 distance transducers.
            </div>
          </div>

          <div className="chamfer-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Info size={18} style={{ color: 'var(--sprout)' }} />
              <h2 style={{ fontSize: '16px' }}>ABOUT THIS PLATFORM</h2>
            </div>

            <p style={{ fontSize: '14px', color: 'var(--bone)', marginBottom: '8px' }}>
              <strong>Smart Dustbin Estimator (SDE)</strong>
            </p>
            <p style={{ fontSize: '13px', color: 'var(--lichen)', lineHeight: 1.6 }}>
              A hybrid cyber-physical waste intelligence system developed for college mini-projects, municipal monitoring, and facility operations. Combines classical computer vision ROI segmentation with ultrasonic IoT telemetry, predictive time-to-full algorithms, and automated route prioritisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

