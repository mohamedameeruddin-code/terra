import React, { useState, useEffect } from 'react';
import { getSettings, saveSetting, clearAllData, getAnalyses } from '../lib/db';
import { getStorageEstimate, requestPersistence, checkPersistence } from '../lib/storage';
import { canInstallPwa, promptPwaInstall, isIos, isStandalone } from '../lib/pwaInstall';
import { exportToCsv, exportToJson } from '../lib/exportData';
import {
  Sliders,
  HardDrive,
  Download,
  Trash2,
  CheckCircle,
  HelpCircle,
  Share2,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);
  const [isPersisted, setIsPersisted] = useState(false);
  const [installAvailable, setInstallAvailable] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  useEffect(() => {
    getSettings().then((s) => setSettings(s));
    getStorageEstimate().then((info) => setStorageInfo(info));
    checkPersistence().then((p) => setIsPersisted(p));
    setInstallAvailable(canInstallPwa());

    // Check Service Worker readiness
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setOfflineReady(true);
      });
    }
  }, []);

  const handleUpdate = async (key, val) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    await saveSetting(key, val);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2000);
  };

  const handleRequestPersist = async () => {
    const granted = await requestPersistence();
    setIsPersisted(granted);
    if (!granted) {
      alert('Storage persistence request was declined by the browser. Data remains local in IndexedDB.');
    }
  };

  const handleExportAll = async () => {
    const data = await getAnalyses();
    if (!data.length) {
      alert('No inspection records to export.');
      return;
    }
    exportToJson(data, `terra-backup-${Date.now()}.json`);
  };

  const handleClearData = async () => {
    if (confirm('Are you sure you want to delete ALL inspection history and image data? This cannot be undone.')) {
      await clearAllData();
      alert('All local data cleared.');
      window.location.reload();
    }
  };

  if (!settings) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>CONFIGURATION & STORAGE</h1>
        <p style={{ color: 'var(--lichen)', fontSize: '13px' }}>
          Manage detection thresholds, offline service worker, and local storage persistence.
        </p>
      </div>

      {saveSuccessMsg && (
        <div style={{ background: 'rgba(184, 245, 60, 0.15)', border: '1px solid var(--sprout)', color: 'var(--sprout)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 600 }}>
          Settings updated successfully.
        </div>
      )}

      {/* PWA & Offline Readiness Indicator */}
      <div className="terra-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <span className="terra-label">PWA Status</span>
            <h3 style={{ fontSize: '16px' }}>Offline Readiness</h3>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '2px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              backgroundColor: offlineReady ? 'rgba(184, 245, 60, 0.15)' : 'rgba(245, 165, 36, 0.15)',
              color: offlineReady ? 'var(--sprout)' : 'var(--rind)',
              border: `1px solid ${offlineReady ? 'var(--sprout)' : 'var(--rind)'}`,
            }}
          >
            {offlineReady ? 'OFFLINE READY' : 'CACHING ASSETS...'}
          </div>
        </div>

        <p style={{ fontSize: '13px', color: 'var(--lichen)', lineHeight: 1.5, marginBottom: '16px' }}>
          {offlineReady
            ? 'The application shell, OpenCV vision engine, fonts, and assets are fully cached. You can run this app with zero internet and with the laptop powered off.'
            : 'Service worker is caching the application shell and vision assets into local browser storage.'}
        </p>

        {/* Install Button for Android/Chrome */}
        {installAvailable && !isStandalone() && (
          <button
            type="button"
            className="btn-primary"
            onClick={promptPwaInstall}
            style={{ width: '100%', marginBottom: '10px' }}
          >
            <Smartphone size={18} style={{ marginRight: '8px' }} />
            INSTALL TERRA TO HOME SCREEN
          </button>
        )}

        {/* iOS Safari Instructions Card */}
        {isIos() && !isStandalone() && (
          <div
            style={{
              background: 'var(--soil-800)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: '14px',
              marginTop: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sprout)', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
              <Share2 size={16} />
              Install on iPhone / iOS Safari
            </div>
            <p style={{ fontSize: '12px', color: 'var(--lichen)', lineHeight: 1.5 }}>
              Tap the <strong>Share</strong> button in Safari’s toolbar, scroll down, and select <strong>"Add to Home Screen"</strong>. This launches TERRA in fullscreen standalone mode.
            </p>
          </div>
        )}
      </div>

      {/* Detection Threshold Settings */}
      <div className="terra-card">
        <div style={{ marginBottom: '16px' }}>
          <span className="terra-label">Classification</span>
          <h3 style={{ fontSize: '16px' }}>Status Thresholds</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div>
            <label className="terra-label">Warning Threshold ({settings.warnPct}%)</label>
            <input
              type="range"
              min="40"
              max="85"
              step="5"
              value={settings.warnPct}
              onChange={(e) => handleUpdate('warnPct', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--rind)' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--lichen)' }}>
              Fill level triggering WARN status
            </span>
          </div>

          <div>
            <label className="terra-label">Critical Overflow ({settings.criticalPct}%)</label>
            <input
              type="range"
              min="75"
              max="98"
              step="1"
              value={settings.criticalPct}
              onChange={(e) => handleUpdate('criticalPct', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--ember)' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--lichen)' }}>
              Fill level triggering CRITICAL alert
            </span>
          </div>
        </div>
      </div>

      {/* Storage and Persistence */}
      <div className="terra-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="terra-label">IndexedDB Storage</span>
            <h3 style={{ fontSize: '16px' }}>Local Storage Usage</h3>
          </div>
          <HardDrive size={20} color="var(--lichen)" />
        </div>

        {storageInfo && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
              <span className="mono">Used: {storageInfo.usageMb} MB</span>
              <span className="mono">Quota: {storageInfo.quotaMb} MB ({storageInfo.percent}%)</span>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'var(--soil-800)', borderRadius: '2px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(100, storageInfo.percent)}%`,
                  height: '100%',
                  backgroundColor: storageInfo.isNearLimit ? 'var(--ember)' : 'var(--sprout)',
                }}
              />
            </div>

            {storageInfo.isNearLimit && (
              <div style={{ color: 'var(--ember)', fontSize: '12px', marginTop: '6px', fontWeight: 600 }}>
                ⚠️ Warning: Local storage usage is above 80% quota!
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--bone)' }}>
              Persistent Storage
            </div>
            <div style={{ fontSize: '11px', color: 'var(--lichen)' }}>
              {isPersisted ? 'Storage protected from browser cleanup' : 'Browser may evict data if disk runs low'}
            </div>
          </div>

          {!isPersisted && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRequestPersist}
              style={{ minHeight: '36px', height: '36px', fontSize: '12px' }}
            >
              REQUEST PERSISTENCE
            </button>
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="terra-card">
        <div style={{ marginBottom: '16px' }}>
          <span className="terra-label">Data Management</span>
          <h3 style={{ fontSize: '16px' }}>Backup & Reset</h3>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportAll}
            style={{ flex: 1, minWidth: '160px' }}
          >
            <Download size={16} style={{ marginRight: '6px' }} />
            BACKUP ALL DATA (JSON)
          </button>

          <button
            type="button"
            className="btn-danger"
            onClick={handleClearData}
            style={{ flex: 1, minWidth: '160px' }}
          >
            <Trash2 size={16} style={{ marginRight: '6px' }} />
            CLEAR ALL RECORDS
          </button>
        </div>
      </div>

      {/* Version and Diagnostics */}
      <div style={{ textAlign: 'center', padding: '16px', color: 'var(--lichen)', fontSize: '12px' }}>
        <p><strong>Smart Dustbin Estimator — TERRA v2.0</strong></p>
        <p>Soil & Signal Dark Palette • 100% Client-Side • OpenCV.js Engine</p>
      </div>
    </div>
  );
}

