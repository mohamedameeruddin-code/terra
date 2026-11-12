import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Battery,
  Camera,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import AlertBanner from '../components/AlertBanner';
import FillColumn from '../components/FillColumn';
import StatusPill from '../components/StatusPill';
import { getDashboard, getBins, markBinEmptied } from '../api/client';

const Dashboard = ({ liveData }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [bins, setBins] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Initial load
  const loadData = async () => {
    try {
      setLoading(true);
      const [dash, bList] = await Promise.all([getDashboard(), getBins()]);
      setDashboardData(dash);
      setBins(bList);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync with live SSE telemetry if available
  useEffect(() => {
    if (liveData && liveData.bins) {
      setBins((prevBins) => {
        const liveMap = new Map(liveData.bins.map((b) => [b.id, b]));
        return prevBins.map((b) => {
          if (liveMap.has(b.id)) {
            const update = liveMap.get(b.id);
            return {
              ...b,
              fill_pct: update.fill_pct,
              rate_pct_per_hr: update.rate_pct_per_hr,
              ttf_min: update.ttf_min,
              status: update.status,
              battery_pct: update.battery_pct,
              last_seen: update.last_seen,
            };
          }
          return b;
        });
      });
    }
  }, [liveData]);

  const handleEmptyBin = async (binId) => {
    try {
      await markBinEmptied(binId);
      loadData();
    } catch (err) {
      alert('Failed to mark bin as emptied: ' + err.message);
    }
  };

  const filteredBins = bins.filter((b) => {
    if (statusFilter === 'ALL') return true;
    return (b.status || '').toUpperCase() === statusFilter;
  });

  // Calculate live stats
  const needEmptyingCount = bins.filter((b) => (b.status || '').toUpperCase() === 'CRITICAL').length;
  const warningCount = bins.filter((b) => (b.status || '').toUpperCase() === 'WARN').length;
  const offlineCount = bins.filter((b) => (b.status || '').toUpperCase() === 'OFFLINE').length;

  return (
    <div className="page-container">
      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Good day. Let's keep things clean.</h1>
        <p style={{ color: 'var(--lichen)', fontSize: '15px' }}>
          Monitor visual waste levels, real-time sensor estimates, and identify bins that need attention.
        </p>
      </div>

      {/* Critical Alert Banner */}
      <AlertBanner alerts={dashboardData?.collection_alerts || []} />

      {/* Top 4 Stat Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          title="TOTAL FLEET BINS"
          value={bins.length}
          subtitle="Monitored in campus zones"
          icon={Layers}
          color="var(--sprout)"
        />
        <StatCard
          title="CRITICAL / OVERFLOW"
          value={needEmptyingCount}
          subtitle="Bins exceeding 90% threshold"
          icon={AlertTriangle}
          color="var(--ember)"
        />
        <StatCard
          title="WARNING CAPACITY"
          value={warningCount}
          subtitle="Bins exceeding 70% threshold"
          icon={Clock}
          color="var(--rind)"
        />
        <StatCard
          title="AI VISION SCANS"
          value={dashboardData?.total_scans || 0}
          subtitle="Image fill evaluations"
          icon={Camera}
          color="var(--tide)"
        />
      </div>

      {/* Bins Section Header & Filters */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h2 style={{ fontSize: '18px' }}>LIVE TELEMETRY & FILL STATUS</h2>
          <div className="section-label" style={{ fontSize: '11px', color: 'var(--lichen)' }}>
            UPDATED CONTINUOUSLY VIA SENSOR STREAM
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {['ALL', 'CRITICAL', 'WARN', 'OK', 'OFFLINE'].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`btn btn-sm ${statusFilter === filterKey ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '11px' }}
            >
              {filterKey}
            </button>
          ))}
        </div>
      </div>

      {/* Bin Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        {filteredBins.map((bin) => {
          const isCritical = (bin.status || '').toUpperCase() === 'CRITICAL';
          return (
            <div
              key={bin.id}
              className="chamfer-card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: isCritical ? 'var(--glow-ember)' : 'none',
                borderColor: isCritical ? 'var(--ember)' : 'var(--line)',
              }}
            >
              <div>
                {/* Header: Name, Location, Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', color: 'var(--bone)', marginBottom: '2px' }}>
                      {bin.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--lichen)' }}>
                      {bin.location}
                    </div>
                  </div>
                  <StatusPill status={bin.status} />
                </div>

                {/* Main Middle: FillColumn + Big Percentage */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', margin: '14px 0' }}>
                  <FillColumn fillPct={bin.fill_pct} status={bin.status} height={105} />
                  <div>
                    <div className="mono-metric" style={{ fontSize: '38px', lineHeight: 1 }}>
                      {bin.fill_pct?.toFixed(1)}%
                    </div>
                    <div
                      className="mono"
                      style={{
                        fontSize: '12px',
                        color: isCritical ? 'var(--ember)' : 'var(--lichen)',
                        marginTop: '6px',
                        fontWeight: 600,
                      }}
                    >
                      {bin.status === 'OFFLINE'
                        ? 'NO TELEMETRY'
                        : bin.ttf_min !== null && bin.ttf_min !== undefined
                        ? `FULL IN ${Math.floor(bin.ttf_min / 60)}h ${bin.ttf_min % 60}m`
                        : 'LEVEL STABLE'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer: Telemetry & Actions */}
              <div
                style={{
                  borderTop: '1px solid var(--line)',
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--lichen)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Battery size={13} style={{ color: 'var(--sprout)' }} />
                    <span className="mono">{bin.battery_pct?.toFixed(0)}%</span>
                  </span>
                  <span className="mono" style={{ fontSize: '11px' }}>
                    {bin.rate_pct_per_hr ? `+${bin.rate_pct_per_hr}%/h` : '0%/h'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <Link to={`/bins/${bin.id}`} className="btn btn-ghost btn-sm" title="Detailed History Chart">
                    <span>Inspect</span>
                  </Link>
                  {isCritical && (
                    <button
                      onClick={() => handleEmptyBin(bin.id)}
                      className="btn btn-primary btn-sm"
                      title="Quick empty"
                    >
                      <span>Empty</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Section B: Recent AI Vision Analysis Scans */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '18px' }}>RECENT COMPUTER VISION SCANS</h2>
            <div className="section-label" style={{ fontSize: '11px', color: 'var(--lichen)' }}>
              CAMERA ROI OCCUPANCY ESTIMATIONS
            </div>
          </div>
          <Link to="/analysis" className="btn btn-primary btn-sm">
            <Camera size={14} />
            <span>Launch New Scan</span>
          </Link>
        </div>

        {dashboardData?.recent_analyses?.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Thumbnail</th>
                  <th>Image Source</th>
                  <th>Estimated Fill</th>
                  <th>Classification</th>
                  <th>Confidence</th>
                  <th>Scan Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.recent_analyses.map((rec) => (
                  <tr key={rec.id}>
                    <td style={{ width: '60px' }}>
                      <img
                        src={rec.processed_image_url || rec.original_image_url}
                        alt="thumbnail"
                        style={{
                          width: '44px',
                          height: '44px',
                          objectFit: 'cover',
                          borderRadius: '2px',
                          border: '1px solid var(--line)',
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{rec.image_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--lichen)' }}>
                        {rec.recommendation || 'Standard cycle'}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--bone)' }}>
                        {rec.fill_percentage?.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <StatusPill status={rec.fill_status} />
                    </td>
                    <td>
                      <span className="mono" style={{ color: 'var(--sprout)' }}>
                        {rec.confidence_score?.toFixed(0)}%
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: '12px', color: 'var(--lichen)' }}>
                      {new Date(rec.created_at).toLocaleString()}
                    </td>
                    <td>
                      <Link to="/history" className="btn btn-ghost btn-sm">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="chamfer-card"
            style={{ padding: '32px', textAlign: 'center', color: 'var(--lichen)' }}
          >
            No vision scans recorded yet. Upload a dustbin photo to perform classical CV segmentation.
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

