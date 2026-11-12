import React from 'react';

const StatusPill = ({ status = 'OK' }) => {
  const norm = (status || 'OK').toUpperCase();

  let variantClass = 'status-ok';
  if (norm === 'CRITICAL') {
    variantClass = 'status-critical';
  } else if (norm === 'WARN' || norm === 'HIGH') {
    variantClass = 'status-warn';
  } else if (norm === 'OFFLINE') {
    variantClass = 'status-offline';
  } else if (norm === 'MEDIUM') {
    variantClass = 'status-ok';
  }

  return (
    <span className={`status-pill ${variantClass}`}>
      <span className="status-dot" />
      <span>{norm}</span>
    </span>
  );
};

export default StatusPill;

