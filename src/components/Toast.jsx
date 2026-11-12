import React from 'react';
import { Info, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Toast({ message, type = 'info', onDismiss }) {
  if (!message) return null;

  return (
    <div className="toast-container">
      <div className="toast">
        {type === 'success' && <CheckCircle2 size={16} color="var(--sprout)" />}
        {type === 'warn' && <AlertTriangle size={16} color="var(--rind)" />}
        {type === 'info' && <Info size={16} color="var(--tide)" />}
        <span>{message}</span>
      </div>
    </div>
  );
}

