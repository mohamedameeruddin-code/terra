import React from 'react';

/**
 * 20-segment physical fill column meter
 */
export default function FillColumn({
  fillPct = 0,
  status = 'OK',
  height = 160,
  width = 24,
  showLabel = true,
}) {
  const TOTAL_CELLS = 20;
  const clampedFill = Math.max(0, Math.min(100, fillPct));
  const activeCells = Math.round((clampedFill / 100) * TOTAL_CELLS);

  const statusClass =
    status === 'CRITICAL' || clampedFill >= 90
      ? 'filled-critical'
      : status === 'WARN' || clampedFill >= 70
      ? 'filled-warn'
      : 'filled-ok';

  return (
    <div className="fill-column-container">
      <div
        className="fill-column-meter"
        style={{ height: `${height}px`, width: `${width}px` }}
      >
        {Array.from({ length: TOTAL_CELLS }).map((_, i) => {
          const isFilled = i < activeCells;
          return (
            <div
              key={i}
              className={`fill-column-cell ${isFilled ? statusClass : 'empty'}`}
              style={{ flex: 1 }}
            />
          );
        })}
      </div>
      {showLabel && (
        <span className="mono" style={{ fontSize: '11px', fontWeight: 700 }}>
          {clampedFill.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
