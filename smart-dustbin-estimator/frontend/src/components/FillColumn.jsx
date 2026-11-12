import React from 'react';

const FillColumn = ({ fillPct = 0, status = 'OK', height = 110, showTicks = true }) => {
  const clampedFill = Math.max(0, Math.min(100, fillPct));
  const totalCells = 20; // 5% per cell
  const filledCellsCount = Math.round((clampedFill / 100) * totalCells);

  // Status class for cell coloring
  let statusClass = 'status-ok';
  if (status === 'CRITICAL' || clampedFill >= 90) {
    statusClass = 'status-critical';
  } else if (status === 'WARN' || clampedFill >= 70) {
    statusClass = 'status-warn';
  }

  return (
    <div className="fill-column-wrapper">
      <div className="fill-column-meter" style={{ height: `${height}px` }}>
        {Array.from({ length: totalCells }).map((_, index) => {
          const isFilled = index < filledCellsCount;
          return (
            <div
              key={index}
              className={`fill-column-cell ${isFilled ? `filled ${statusClass}` : ''}`}
            />
          );
        })}
      </div>

      {showTicks && (
        <div className="fill-column-ticks" style={{ height: `${height}px` }}>
          <span>100</span>
          <span>75</span>
          <span>50</span>
          <span>25</span>
          <span>0</span>
        </div>
      )}
    </div>
  );
};

export default FillColumn;

