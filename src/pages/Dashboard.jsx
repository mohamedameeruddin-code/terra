import React, { useState, useEffect } from 'react';
import StatTile from '../components/StatTile';
import FillColumn from '../components/FillColumn';
import StatusPill from '../components/StatusPill';
import { getDashboardStats } from '../lib/db';
import { BarChart3, AlertOctagon, TrendingUp, Layers } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((data) => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--lichen)' }}>
        Computing fleet telemetry from IndexedDB...
      </div>
    );
  }

  const { total, averageFill, criticalCount, warnCount, okCount, lastAnalysis, perBin, trend } = stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>FLEET TELEMETRY DASHBOARD</h1>
        <p style={{ color: 'var(--lichen)', fontSize: '13px' }}>
          Aggregated waste intelligence computed on-device from local database.
        </p>
      </div>

      {/* Metric Tiles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        <StatTile
          label="Total Scans"
          value={total}
          subtext="Recorded inspections"
          signal="normal"
        />

        <StatTile
          label="Avg Fill Level"
          value={`${averageFill}%`}
          subtext={`${okCount} normal • ${warnCount} warning`}
          signal={averageFill >= 70 ? 'rind' : 'sprout'}
        />

        <StatTile
          label="Critical Overflow"
          value={criticalCount}
          subtext={criticalCount > 0 ? 'Urgent collection needed' : 'All clear'}
          signal={criticalCount > 0 ? 'ember' : 'sprout'}
        />

        <StatTile
          label="Last Scan"
          value={lastAnalysis ? `${lastAnalysis.fillPct}%` : '—'}
          subtext={lastAnalysis ? lastAnalysis.binLabel : 'No scans yet'}
          signal="normal"
        />
      </div>

      {/* 7-Day Trend SVG Chart */}
      <div className="terra-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="terra-label">7-Day Fill Trend</span>
            <h3 style={{ fontSize: '16px' }}>Average Fill History</h3>
          </div>
          <TrendingUp size={20} color="var(--sprout)" />
        </div>

        {trend && trend.length > 0 ? (
          <div style={{ height: '140px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 0' }}>
            {trend.map((point) => {
              const val = point.avgFill !== null ? point.avgFill : 0;
              const barHeight = Math.max(8, (val / 100) * 110);
              const color =
                val >= 90 ? 'var(--ember)' : val >= 70 ? 'var(--rind)' : val > 0 ? 'var(--sprout)' : 'var(--soil-800)';

              return (
                <div
                  key={point.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--lichen)' }}>
                    {val > 0 ? `${val.toFixed(0)}%` : '—'}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '28px',
                      height: `${barHeight}px`,
                      backgroundColor: color,
                      borderRadius: '2px',
                      transition: 'height 0.3s ease',
                      boxShadow: val > 0 ? `0 0 6px ${color}40` : 'none',
                    }}
                  />
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--lichen)' }}>
                    {point.date}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--lichen)', fontSize: '13px' }}>
            Insufficient trend data
          </div>
        )}
      </div>

      {/* Per-Bin Latest Status Cards */}
      <div className="terra-card">
        <div style={{ marginBottom: '14px' }}>
          <span className="terra-label">Monitored Fleet</span>
          <h3 style={{ fontSize: '16px' }}>Active Dustbin Containers</h3>
        </div>

        {Object.keys(perBin).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--lichen)', fontSize: '13px' }}>
            No dustbins registered yet. Analyze an image to register a container.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}
          >
            {Object.entries(perBin).map(([label, binData]) => (
              <div
                key={label}
                style={{
                  background: 'var(--soil-800)',
                  border: '1px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--bone)', marginBottom: '4px' }}>
                    {label}
                  </div>
                  <StatusPill status={binData.latestStatus} />
                  <div style={{ fontSize: '11px', color: 'var(--lichen)', marginTop: '6px' }}>
                    {new Date(binData.lastUpdated).toLocaleDateString()}
                  </div>
                </div>

                <FillColumn
                  fillPct={binData.latestFill}
                  status={binData.latestStatus}
                  height={60}
                  width={20}
                  showLabel={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

