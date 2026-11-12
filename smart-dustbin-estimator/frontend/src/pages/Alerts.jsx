import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Clock } from 'lucide-react';
import { getAlerts, acknowledgeAlert } from '../api/client';

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [openTab, setOpenTab] = useState(true); // true = open, false = acknowledged
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await getAlerts(openTab);
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [openTab]);

  const handleAck = async (id) => {
    try {
      await acknowledgeAlert(id);
      loadAlerts();
    } catch (err) {
      alert('Failed to acknowledge alert: ' + err.message);
    }
  };

  return (
    <div className="page-container">
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>System Alert Feed</h1>
          <p style={{ color: 'var(--lichen)', fontSize: '15px' }}>
            Single-crossing threshold triggers and node heartbeat monitoring.
          </p>
        </div>

        <button onClick={loadAlerts} disabled={loading} className="btn btn-ghost btn-sm">
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          onClick={() => setOpenTab(true)}
          className={`btn btn-sm ${openTab ? 'btn-primary' : 'btn-ghost'}`}
        >
          Active Open Alerts
        </button>
        <button
          onClick={() => setOpenTab(false)}
          className={`btn btn-sm ${!openTab ? 'btn-primary' : 'btn-ghost'}`}
        >
          All Historical Alerts
        </button>
      </div>

      {/* Alert Feed List */}
      {alerts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map((a) => {
            let barColor = 'var(--rind)';
            if (a.type === 'CRITICAL') barColor = 'var(--ember)';
            if (a.type === 'OFFLINE') barColor = 'var(--ash)';

            return (
              <div
                key={a.id}
                className="chamfer-card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${barColor}`,
                  gap: '16px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span
                      className="mono"
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '2px',
                        backgroundColor: 'var(--soil-950)',
                        color: barColor,
                        border: `1px solid ${barColor}`,
                      }}
                    >
                      {a.type}
                    </span>
                    <strong style={{ color: 'var(--bone)', fontSize: '15px' }}>
                      {a.bin_name}
                    </strong>
                    <span style={{ fontSize: '13px', color: 'var(--lichen)' }}>
                      • {a.location}
                    </span>
                  </div>

                  <div style={{ fontSize: '14px', color: 'var(--bone)' }}>
                    {a.message}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--lichen)',
                      marginTop: '6px',
                    }}
                  >
                    <Clock size={12} />
                    <span>{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>

                {!a.acknowledged_at && (
                  <button
                    onClick={() => handleAck(a.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ borderColor: 'var(--line)' }}
                  >
                    <CheckCircle size={13} />
                    <span>ACK</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="chamfer-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--lichen)' }}>
          No active alerts. All fleet bins are within operational limits.
        </div>
      )}
    </div>
  );
};

export default Alerts;

