import React from 'react';

export default function StatusPill({ status = 'OK' }) {
  const normalized = status.toUpperCase();
  const cls =
    normalized === 'CRITICAL'
      ? 'status-pill-critical'
      : normalized === 'WARN'
      ? 'status-pill-warn'
      : 'status-pill-ok';

  return (
    <span className={`status-pill ${cls}`}>
      {normalized}
    </span>
  );
}
