import React from 'react';

export default function StatTile({ label, value, subtext, signal = 'normal' }) {
  const signalColor =
    signal === 'sprout'
      ? 'var(--sprout)'
      : signal === 'rind'
      ? 'var(--rind)'
      : signal === 'ember'
      ? 'var(--ember)'
      : 'var(--bone)';

  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-value" style={{ color: signalColor }}>
        {value}
      </span>
      {subtext && (
        <span style={{ fontSize: '11px', color: 'var(--lichen)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}
