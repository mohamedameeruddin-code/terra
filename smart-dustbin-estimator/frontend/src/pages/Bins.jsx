import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Key, Copy, Check, ExternalLink } from 'lucide-react';
import { getBins, createBin, deleteBin } from '../api/client';
import StatusPill from '../components/StatusPill';

const Bins = () => {
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  const [form, setForm] = useState({
    name: '',
    location: '',
    depth_cm: 100.0,
    dead_zone_cm: 20.0,
    warn_pct: 70.0,
    critical_pct: 90.0,
    interval_min: 5,
  });

  const loadBins = async () => {
    try {
      setLoading(true);
      const data = await getBins();
      setBins(data);
    } catch (err) {
      console.error('Failed to load bins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBins();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createBin({
        ...form,
        depth_cm: parseFloat(form.depth_cm),
        dead_zone_cm: parseFloat(form.dead_zone_cm),
        warn_pct: parseFloat(form.warn_pct),
        critical_pct: parseFloat(form.critical_pct),
        interval_min: parseInt(form.interval_min, 10),
      });
      setShowModal(false);
      setForm({
        name: '',
        location: '',
        depth_cm: 100.0,
        dead_zone_cm: 20.0,
        warn_pct: 70.0,
        critical_pct: 90.0,
        interval_min: 5,
      });
      loadBins();
    } catch (err) {
      alert('Failed to register bin: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this bin and all its readings?')) {
      try {
        await deleteBin(id);
        loadBins();
      } catch (err) {
        alert('Failed to delete bin: ' + err.message);
      }
    }
  };

  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
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
          <h1 style={{ marginBottom: '4px' }}>Fleet Bins Management</h1>
          <p style={{ color: 'var(--lichen)', fontSize: '15px' }}>
            Register new dustbin containers, configure calibrated dimensions, and issue ESP32 node API credentials.
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
          <Plus size={14} />
          <span>Register New Bin</span>
        </button>
      </div>

      {/* Bins Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Location</th>
              <th>Dimensions</th>
              <th>Thresholds</th>
              <th>Device API Key</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {bins.map((b) => (
              <tr key={b.id}>
                <td className="mono" style={{ color: 'var(--lichen)' }}>
                  #{b.id}
                </td>
                <td>
                  <strong style={{ color: 'var(--bone)' }}>{b.name}</strong>
                </td>
                <td style={{ color: 'var(--lichen)' }}>{b.location}</td>
                <td className="mono" style={{ fontSize: '12px' }}>
                  Depth: {b.depth_cm}cm • DeadZone: {b.dead_zone_cm}cm
                </td>
                <td className="mono" style={{ fontSize: '12px' }}>
                  Warn: {b.warn_pct}% • Crit: {b.critical_pct}%
                </td>
                <td>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'var(--soil-950)',
                      padding: '3px 8px',
                      borderRadius: '2px',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <span className="mono" style={{ fontSize: '11px', color: 'var(--sprout)' }}>
                      {b.api_key.substring(0, 14)}...
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(b.api_key)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--lichen)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Copy API key for firmware"
                    >
                      {copiedKey === b.api_key ? (
                        <Check size={12} style={{ color: 'var(--sprout)' }} />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>
                </td>
                <td>
                  <StatusPill status={b.status} />
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--ember)', borderColor: 'transparent' }}
                    title="Delete bin"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Bin Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(10, 15, 12, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="chamfer-card"
            style={{
              width: '480px',
              maxWidth: '90%',
              padding: '28px',
              backgroundColor: 'var(--soil-900)',
            }}
          >
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Register New Dustbin</h2>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                  BIN NAME
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Science Wing West"
                  className="input"
                />
              </div>

              <div>
                <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                  LOCATION
                </label>
                <input
                  type="text"
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Floor 2 Corridor"
                  className="input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    DEPTH (CM)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={form.depth_cm}
                    onChange={(e) => setForm({ ...form, depth_cm: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    DEAD ZONE (CM)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={form.dead_zone_cm}
                    onChange={(e) => setForm({ ...form, dead_zone_cm: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    WARN THRESHOLD (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={form.warn_pct}
                    onChange={(e) => setForm({ ...form, warn_pct: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="section-label" style={{ display: 'block', marginBottom: '4px' }}>
                    CRITICAL THRESHOLD (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={form.critical_pct}
                    onChange={(e) => setForm({ ...form, critical_pct: e.target.value })}
                    className="input"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-ghost btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Register & Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bins;

