import React from 'react';

const FillGauge = ({ percentage = 0, size = 180, strokeWidth = 14, status = 'Empty' }) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Use a 270-degree open gauge arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (clamped / 100) * arcLength;

  let strokeColor = '#B8F53C'; // Sprout
  if (clamped > 80 || status === 'Critical') {
    strokeColor = '#EB5A3C'; // Ember
  } else if (clamped > 60 || status === 'High') {
    strokeColor = '#F5A524'; // Rind / Amber
  } else if (clamped > 40 || status === 'Medium') {
    strokeColor = '#4FC7C9'; // Tide
  }

  return (
    <div className="circular-gauge-container" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(135deg)', overflow: 'visible' }}
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--soil-700)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />

        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1), stroke 400ms ease',
            filter: clamped >= 70 ? `drop-shadow(0 0 6px ${strokeColor})` : 'none',
          }}
        />
      </svg>

      {/* Numerical HUD in Center */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -46%)',
          textAlign: 'center',
        }}
      >
        <div className="gauge-pct-text">{clamped.toFixed(1)}%</div>
        <div
          className="gauge-sub-text"
          style={{ color: strokeColor, fontWeight: 700 }}
        >
          {status.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default FillGauge;

