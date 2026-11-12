import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff } from 'lucide-react';
import { canInstallPwa, promptPwaInstall, subscribeToInstallPrompt } from '../lib/pwaInstall';

export default function TopBar() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = subscribeToInstallPrompt((canInstall) => {
      setInstallable(canInstall);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleInstallClick = async () => {
    await promptPwaInstall();
  };

  return (
    <header className="top-bar">
      <div className="top-bar-brand">
        <svg width="24" height="24" viewBox="0 0 512 512" fill="none">
          <path d="M 60 110 L 330 65 L 340 95 L 70 140 Z" fill="#B8F53C" />
          <rect x="75" y="145" width="250" height="20" rx="4" fill="#B8F53C" />
          <path d="M 90 175 L 115 350 Q 118 365 135 365 L 265 365 Q 282 365 285 350 L 310 175 Z" fill="#17211B" stroke="#B8F53C" strokeWidth="16" />
          <path d="M 50 260 L 120 260 L 145 220 L 175 300 L 205 240 L 225 270 L 255 260 L 350 260" stroke="#B8F53C" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ color: 'var(--sprout)' }}>TERRA</span>
        <span style={{ fontSize: '11px', color: 'var(--lichen)', fontWeight: 500 }}>
          ESTIMATOR
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {installable && (
          <button
            type="button"
            className="btn-primary"
            onClick={handleInstallClick}
            style={{
              minHeight: '32px',
              height: '32px',
              fontSize: '11px',
              padding: '0 10px',
              display: 'flex',
              gap: '6px',
            }}
          >
            <Download size={14} />
            INSTALL
          </button>
        )}

        <div
          title={isOnline ? 'Online (Connected)' : 'Offline (Local Cache Active)'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            color: isOnline ? 'var(--sprout)' : 'var(--ash)',
            background: 'var(--soil-800)',
            padding: '4px 8px',
            borderRadius: '2px',
            border: '1px solid var(--line)',
          }}
        >
          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
          <span>{isOnline ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}
