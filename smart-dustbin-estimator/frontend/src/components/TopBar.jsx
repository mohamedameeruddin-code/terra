import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Activity, Cpu } from 'lucide-react';
import { startSimulator, stopSimulator, getSimulatorStatus } from '../api/client';

const TopBar = ({ isConnected = true }) => {
  const [timeStr, setTimeStr] = useState('');
  const [isSimRunning, setIsSimRunning] = useState(false);
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    getSimulatorStatus()
      .then((data) => setIsSimRunning(data.is_running))
      .catch(() => {});
  }, []);

  const toggleSimulator = async () => {
    try {
      setSimLoading(true);
      if (isSimRunning) {
        await stopSimulator();
        setIsSimRunning(false);
      } else {
        await startSimulator();
        setIsSimRunning(true);
      }
    } catch (err) {
      console.error('Simulator toggle error:', err);
    } finally {
      setSimLoading(false);
    }
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: 'var(--soil-950)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span
          className="mono"
          style={{
            fontSize: '12px',
            color: 'var(--lichen)',
            letterSpacing: '0.08em',
          }}
        >
          SECTOR: CENTRAL CAMPUS & FACILITIES
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Simulator Toggle Button */}
        <button
          onClick={toggleSimulator}
          disabled={simLoading}
          className="btn btn-ghost btn-sm"
          style={{
            borderColor: isSimRunning ? 'rgba(184, 245, 60, 0.4)' : 'var(--line)',
            color: isSimRunning ? 'var(--sprout)' : 'var(--lichen)',
          }}
          title={isSimRunning ? 'Pause campus background telemetry simulation' : 'Start campus background telemetry simulation'}
        >
          {isSimRunning ? (
            <>
              <Square size={12} fill="var(--sprout)" />
              <span>SIMULATOR: ACTIVE</span>
            </>
          ) : (
            <>
              <Play size={12} />
              <span>SIMULATOR: IDLE</span>
            </>
          )}
        </button>

        {/* Live Digital Clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--soil-900)',
            padding: '5px 12px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line)',
          }}
        >
          <Clock size={14} style={{ color: 'var(--sprout)' }} />
          <span className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bone)' }}>
            {timeStr || '00:00:00'}
          </span>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--lichen)' }}>
            UTC
          </span>
        </div>
      </div>
    </header>
  );
};

export default TopBar;

