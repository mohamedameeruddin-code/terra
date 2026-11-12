import React, { useState, useEffect } from 'react';
import { Truck, Check, RefreshCw, AlertTriangle, ArrowUpDown, Battery } from 'lucide-react';
import StatusPill from '../components/StatusPill';
import { getPriorityCollection, markBinEmptied } from '../api/client';

const Collection = () => {
  const [routeItems, setRouteItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emptyingId, setEmptyingId] = useState(null);
  const [justEmptiedIds, setJustEmptiedIds] = useState(new Set());

  const loadRouteSheet = async () => {
    try {
      setLoading(true);
      const data = await getPriorityCollection();
      setRouteItems(data);
    } catch (err) {
      console.error('Failed to load collection route:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRouteSheet();
  }, []);

  const handleEmpty = async (binId) => {
    try {
      setEmptyingId(binId);
      await markBinEmptied(binId, 'Ravi (Lead Collector)');
      setJustEmptiedIds((prev) => new Set(prev).add(binId));
      setTimeout(() => {
        loadRouteSheet();
      }, 800);
    } catch (err) {
      alert('Failed to mark bin as emptied: ' + err.message);
    } finally {
      setEmptyingId(null);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: '4px' }}>Priority Collection Route Sheet</h1>
          <p style={{ color: 'var(--lichen)', fontSize: '15px' }}>
            Dynamically prioritised emptying order based on current fill occupancy and predicted time-to-full.
          </p>
        </div>

        <button
          onClick={loadRouteSheet}
          disabled={loading}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh Sheet</span>
        </button>
      </div>

      {/* Priority Algorithm Legend Pill */}
      <div
        className="chamfer-card"
        style={{
          padding: '12px 18px',
          marginBottom: '24px',
          backgroundColor: 'var(--soil-950)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span className="section-label" style={{ color: 'var(--sprout)' }}>
          DISPATCH ALGORITHM:
        </span>
        <span className="mono" style={{ fontSize: '12px', color: 'var(--bone)' }}>
          Priority Score = (Fill% × 0.6) + (Urgency × 0.4)
        </span>
        <span style={{ fontSize: '12px', color: 'var(--lichen)', marginLeft: 'auto' }}>
          Sorted descending by urgency
        </span>
      </div>

      {/* Route Sheet Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Rank</th>
              <th>Dustbin Target</th>
              <th>Location</th>
              <th>Fill Level</th>
              <th>Time To Full (TTF)</th>
              <th>Priority Score</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {routeItems.map((item) => {
              const isEmptied = justEmptiedIds.has(item.bin_id);
              const isCritical = (item.status || '').toUpperCase() === 'CRITICAL';

              return (
                <tr
                  key={item.bin_id}
                  style={{
                    opacity: isEmptied ? 0.45 : 1,
                    textDecoration: isEmptied ? 'line-through' : 'none',
                    transition: 'opacity 300ms ease',
                    backgroundColor: isCritical && !isEmptied ? 'rgba(235, 90, 60, 0.05)' : 'transparent',
                  }}
                >
                  <td>
                    <span
                      className="mono"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '26px',
                        height: '26px',
                        borderRadius: '2px',
                        backgroundColor: item.rank <= 3 ? 'var(--ember)' : 'var(--soil-800)',
                        color: item.rank <= 3 ? '#fff' : 'var(--bone)',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    >
                      #{item.rank}
                    </span>
                  </td>

                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--bone)' }}>
                      {item.bin_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--lichen)' }}>
                      <Battery size={11} style={{ color: 'var(--sprout)' }} />
                      <span className="mono">{item.battery_pct?.toFixed(0)}% Battery</span>
                    </div>
                  </td>

                  <td style={{ color: 'var(--lichen)' }}>{item.location}</td>

                  <td>
                    <span className="mono" style={{ fontSize: '16px', fontWeight: 600, color: isCritical ? 'var(--ember)' : 'var(--bone)' }}>
                      {item.fill_pct?.toFixed(1)}%
                    </span>
                  </td>

                  <td className="mono" style={{ fontSize: '13px' }}>
                    {item.ttf_min !== null && item.ttf_min !== undefined
                      ? `${Math.floor(item.ttf_min / 60)}h ${item.ttf_min % 60}m`
                      : 'Stable'}
                  </td>

                  <td>
                    <span
                      className="mono"
                      style={{
                        padding: '3px 8px',
                        borderRadius: '2px',
                        backgroundColor: 'var(--soil-950)',
                        border: '1px solid var(--line)',
                        color: item.priority_score >= 80 ? 'var(--ember)' : 'var(--sprout)',
                        fontWeight: 600,
                      }}
                    >
                      {item.priority_score?.toFixed(1)}
                    </span>
                  </td>

                  <td>
                    <StatusPill status={item.status} />
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    {isEmptied ? (
                      <span style={{ color: 'var(--fern)', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Check size={14} /> Emptied
                      </span>
                    ) : (
                      <button
                        onClick={() => handleEmpty(item.bin_id)}
                        disabled={emptyingId === item.bin_id}
                        className="btn btn-ghost btn-sm"
                        style={{
                          borderColor: 'var(--sprout)',
                          color: 'var(--sprout)',
                        }}
                      >
                        <Check size={13} />
                        <span>{emptyingId === item.bin_id ? 'Logging...' : 'MARK EMPTIED'}</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Collection;

