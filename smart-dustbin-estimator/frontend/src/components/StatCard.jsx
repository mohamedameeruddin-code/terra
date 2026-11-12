import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'var(--sprout)' }) => {
  return (
    <div
      className="chamfer-card"
      style={{
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle indicator bar on left */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '3px',
          height: '100%',
          backgroundColor: color,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <span className="section-label">{title}</span>
        {Icon && <Icon size={18} style={{ color: color, opacity: 0.9 }} />}
      </div>

      <div>
        <div className="mono-metric" style={{ color: 'var(--bone)', marginBottom: '4px' }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ fontSize: '13px', color: 'var(--lichen)' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

