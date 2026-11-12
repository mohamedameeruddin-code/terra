import React from 'react';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AlertBanner = ({ alerts = [] }) => {
  if (!alerts || alerts.length === 0) return null;

  const topAlert = alerts[0];

  return (
    <div className="alert-banner">
      <div className="alert-banner-content">
        <AlertTriangle size={20} style={{ color: 'var(--ember)', flexShrink: 0 }} />
        <div className="alert-banner-text">
          <strong>CRITICAL ATTENTION REQUIRED:</strong> {topAlert.message}
          {alerts.length > 1 && (
            <span style={{ color: 'var(--lichen)', marginLeft: '8px' }}>
              (+{alerts.length - 1} more active alert{alerts.length > 2 ? 's' : ''})
            </span>
          )}
        </div>
      </div>

      <Link to="/collection" className="btn btn-primary btn-sm">
        <span>Route Sheet</span>
        <ArrowRight size={14} />
      </Link>
    </div>
  );
};

export default AlertBanner;

