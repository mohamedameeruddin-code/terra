import React from 'react';

const STEPS = ['PREPARING', 'SEGMENTING', 'ESTIMATING', 'RENDERING'];

export default function ProgressBar({ currentStep = 'PREPARING' }) {
  const currentIndex = Math.max(0, STEPS.indexOf(currentStep));

  return (
    <div className="progress-bar-container" style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--sprout)',
        }}
      >
        <span>STATUS: {currentStep}</span>
        <span>{Math.round(((currentIndex + 1) / STEPS.length) * 100)}%</span>
      </div>

      <div className="progress-segmented">
        {STEPS.map((step, idx) => (
          <div
            key={step}
            className={`progress-segment ${idx <= currentIndex ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
