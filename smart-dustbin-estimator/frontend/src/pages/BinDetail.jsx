import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Battery,
  Clock,
  Trash2,
  TrendingUp,
  RotateCcw,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import FillColumn from '../components/FillColumn';
import StatusPill from '../components/StatusPill';
import { getBin, getBinHistory, markBinEmptied } from '../api/client';

const BinDetail = () => {
  const { id } = useParams();
  const [bin, setBin] = useState(null);
  const [history, setHistory] = useState(null);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [binRes, histRes] = await Promise.all([
        getBin(id),
        getBinHistory(id, timeRange),
      ]);
      setBin(binRes);
      setHistory(histRes);
    } catch (err) {
      console.error('Failed to load bin detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id, timeRange]);

  const handleEmpty = async () => {
    try {
      await markBinEmptied(id);
      loadData();
    } catch (err) {
      alert('Error emptying bin: ' + err.message);
    }
  };

  if (loading && !bin) {
    return <div className="page-container">Loading bin telemetry...</div>;
  }

  if (!bin) {
    return (
      <div className="page-container">
        <p>Bin not found.</p>
        <Link to="/" className="btn btn-ghost btn-sm">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Back button & Title */}
      <div style={{ marginBottom: '20px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--lichen)',
            fontSize: '13px',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Fleet Overview</span>
        </Link>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '24px' }}>{bin.name}</h1>
              <StatusPill status={bin.status} />
            </div>
            <div style={{ color: 'var(--lichen)', fontSize: '14px', marginTop: '2px' }}>
              {bin.location} • Monitored via Node API
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleEmpty} className="btn btn-primary btn-sm">
              <span>Mark Emptied</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Split: Live Meter + Telemetry Stat Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '24px',
          marginBottom: '24px',
          alignItems: 'stretch',
        }}
      >
        {/* Large Fill Meter */}
        <div
          className="chamfer-card"
          style={{
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            backgroundColor: 'var(--soil-900)',
          }}
        >
          <FillColumn fillPct={bin.fill_pct} status={bin.status} height={140} />
          <div>
            <div className="section-label">LIVE LEVEL</div>
            <div className="mono-metric" style={{ fontSize: '48px', lineHeight: 1.1 }}>
              {bin.fill_pct?.toFixed(1)}%
            </div>
            <div
              className="mono"
              style={{
                fontSize: '12px',
                color: bin.status === 'CRITICAL' ? 'var(--ember)' : 'var(--sprout)',
                fontWeight: 600,
                marginTop: '4px',
              }}
            >
              {bin.ttf_min !== null && bin.ttf_min !== undefined
                ? `FULL IN ${Math.floor(bin.ttf_min / 60)}h ${bin.ttf_min % 60}m`
                : 'STABLE'}
            </div>
          </div>
        </div>

        {/* Diagnostic Stat Tiles */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
          }}
        >
          <div className="chamfer-card" style={{ padding: '16px 20px' }}>
            <span className="section-label">FILL VELOCITY</span>
            <div className="mono-metric" style={{ fontSize: '26px', marginTop: '6px' }}>
              {bin.rate_pct_per_hr ? `+${bin.rate_pct_per_hr}%` : '0%'}
              <span style={{ fontSize: '12px', color: 'var(--lichen)' }}> / hr</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--lichen)', marginTop: '4px' }}>
              Linear regression trend
            </div>
          </div>

          <div className="chamfer-card" style={{ padding: '16px 20px' }}>
            <span className="section-label">NODE BATTERY</span>
            <div className="mono-metric" style={{ fontSize: '26px', marginTop: '6px' }}>
              {bin.battery_pct?.toFixed(0)}%
            </div>
            <div style={{ fontSize: '11px', color: 'var(--sprout)', marginTop: '4px' }}>
              Normal battery health
            </div>
          </div>

          <div className="chamfer-card" style={{ padding: '16px 20px' }}>
            <span className="section-label">CALIBRATED DEPTH</span>
            <div className="mono-metric" style={{ fontSize: '26px', marginTop: '6px' }}>
              {bin.depth_cm}
              <span style={{ fontSize: '12px', color: 'var(--lichen)' }}> cm</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--lichen)', marginTop: '4px' }}>
              Dead zone: {bin.dead_zone_cm} cm
            </div>
          </div>
        </div>
      </div>

      {/* Historical Trend Chart Panel */}
      <div className="chamfer-card" style={{ padding: '24px', marginBottom: '32px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '17px' }}>TIME SERIES TELEMETRY</h2>
            <div className="section-label" style={{ fontSize: '10px' }}>
              FILL LEVEL OVER TIME & DISPATCH THRESHOLDS
            </div>
          </div>

          {/* Range Toggles */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['24h', '7d', '30d'].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`btn btn-sm ${timeRange === r ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11px' }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Component */}
        <div style={{ width: '100%', height: '320px' }}>
          {history?.series?.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history.series} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="time_label"
                  stroke="var(--lichen)"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  stroke="var(--lichen)"
                  fontSize={11}
                  tickLine={false}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--soil-900)',
                    borderColor: 'var(--line)',
                    color: 'var(--bone)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                  }}
                />
                {/* Warning threshold (70%) */}
                <ReferenceLine
                  y={bin.warn_pct || 70}
                  stroke="var(--rind)"
                  strokeDasharray="4 4"
                  label={{ value: `WARN ${bin.warn_pct}%`, fill: 'var(--rind)', fontSize: 10 }}
                />
                {/* Critical threshold (90%) */}
                <ReferenceLine
                  y={bin.critical_pct || 90}
                  stroke="var(--ember)"
                  strokeDasharray="4 4"
                  label={{ value: `CRITICAL ${bin.critical_pct}%`, fill: 'var(--ember)', fontSize: 10 }}
                />
                <Line
                  type="monotone"
                  dataKey="fill_pct"
                  stroke="var(--sprout)"
                  strokeWidth={2}
                  dot={false}
                  name="Fill %"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--lichen)' }}>
              No historical readings in this time window.
            </div>
          )}
        </div>
      </div>

      {/* Collection History Table */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '17px', marginBottom: '14px' }}>EMPTYING & COLLECTION LOGS</h2>
        {history?.collections?.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Emptied By</th>
                  <th>Fill Prior to Emptying</th>
                </tr>
              </thead>
              <tbody>
                {history.collections.map((c, idx) => (
                  <tr key={idx}>
                    <td className="mono">{new Date(c.emptied_at).toLocaleString()}</td>
                    <td>{c.emptied_by}</td>
                    <td className="mono" style={{ color: 'var(--ember)' }}>
                      {c.fill_before?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="chamfer-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--lichen)' }}>
            No recent emptying events recorded for this bin.
          </div>
        )}
      </div>
    </div>
  );
};

export default BinDetail;

