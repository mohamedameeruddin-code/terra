import React, { useState } from 'react';
import FillColumn from '../components/FillColumn';
import StatusPill from '../components/StatusPill';
import { saveAnalysis } from '../lib/db';
import { downloadBlob, exportToJson } from '../lib/exportData';
import { Save, RefreshCw, Download, Check, AlertTriangle, X } from 'lucide-react';

export default function ResultModal({ result, onRetake, onClose }) {
  const [isSaved, setIsSaved] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const {
    binLabel,
    fillPct,
    confidence,
    status,
    wasteLineY,
    durationMs,
    roi,
    processedUrl,
    processedBlob,
    originalBlob,
    imageWidth,
    imageHeight,
  } = result;

  const isLowConfidence = confidence < 0.4;

  const handleSave = async () => {
    if (isSaving || isSaved) return;
    setIsSaving(true);
    try {
      await saveAnalysis({
        binLabel,
        fillPct,
        confidence,
        status,
        roi,
        notes,
        durationMs,
        originalBlob,
        processedBlob,
        imageWidth,
        imageHeight,
      });
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save to IndexedDB:', err);
      alert('Could not save analysis. Storage might be restricted.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportImage = () => {
    if (processedBlob) {
      downloadBlob(
        processedBlob,
        `terra-${binLabel.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.jpg`
      );
    }
  };

  const handleExportJson = () => {
    exportToJson(
      {
        binLabel,
        fillPct,
        confidence,
        status,
        durationMs,
        wasteLineY,
        roi,
        timestamp: new Date().toISOString(),
      },
      `terra-analysis-${Date.now()}.json`
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 15, 12, 0.95)',
        zIndex: 500,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div style={{ maxWidth: '800px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="terra-label">ANALYSIS VERDICT</span>
            <h2 style={{ fontSize: '20px' }}>{binLabel}</h2>
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={onClose}
            style={{ minHeight: '40px', height: '40px', width: '40px', padding: 0 }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Low Confidence Warning */}
        {isLowConfidence && (
          <div
            className="terra-card"
            style={{
              borderColor: 'var(--rind)',
              background: 'rgba(245, 165, 36, 0.12)',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <AlertTriangle size={24} color="var(--rind)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--rind)', fontSize: '13px' }}>
                LOW CONFIDENCE ({Math.round(confidence * 100)}%) — RETAKE RECOMMENDED
              </div>
              <ul style={{ color: 'var(--lichen)', fontSize: '12px', marginTop: '6px', paddingLeft: '16px', lineHeight: 1.6 }}>
                <li>Ensure adequate ambient lighting inside the container.</li>
                <li>Hold the phone level directly facing the dustbin opening.</li>
                <li>Frame the entire rim and body of the dustbin within the screen.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Main Grid: Processed Image & Telemetry Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Processed Image with native pinch-zoom */}
          <div className="terra-card" style={{ padding: '8px' }}>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius)' }}>
              <img
                src={processedUrl}
                alt="Vision Scan Result"
                style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pinch-zoom' }}
              />
            </div>
            <div style={{ padding: '8px 4px 4px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--lichen)' }}>
              <span>Dashed line: estimated waste height</span>
              <span className="mono">{durationMs}ms</span>
            </div>
          </div>

          {/* Metrics & Verdict Panel */}
          <div className="terra-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="terra-label">Estimated Fill</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '38px', fontWeight: 800, color: 'var(--bone)', lineHeight: 1 }}>
                  {fillPct.toFixed(1)}%
                </div>
              </div>
              <StatusPill status={status} />
            </div>

            {/* Segmented Fill Meter */}
            <div style={{ background: 'var(--soil-950)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '16px', display: 'flex', alignItems: 'center', gap: '20px' }}>
              <FillColumn fillPct={fillPct} status={status} height={120} width={32} showLabel={false} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                <div>
                  <span className="terra-label">Capacity Status</span>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: status === 'CRITICAL' ? 'var(--ember)' : status === 'WARN' ? 'var(--rind)' : 'var(--sprout)' }}>
                    {status === 'CRITICAL' ? 'OVERFLOW IMMINENT' : status === 'WARN' ? 'THRESHOLD REACHED' : 'CAPACITY NORMAL'}
                  </div>
                </div>

                <div>
                  <span className="terra-label">Confidence Score</span>
                  <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--bone)' }}>
                    {(confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Notes Input */}
            <div>
              <label className="terra-label">Audit Notes (Optional)</label>
              <textarea
                className="terra-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add inspection notes or waste description..."
                style={{ resize: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaved || isSaving}
            style={{ flex: 1, minWidth: '140px' }}
          >
            {isSaved ? (
              <>
                <Check size={18} style={{ marginRight: '6px' }} />
                SAVED TO LOCAL DB
              </>
            ) : (
              <>
                <Save size={18} style={{ marginRight: '6px' }} />
                {isSaving ? 'SAVING...' : 'SAVE SCAN'}
              </>
            )}
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={onRetake}
            style={{ flex: 1, minWidth: '120px' }}
          >
            <RefreshCw size={16} style={{ marginRight: '6px' }} />
            RETAKE
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportImage}
            title="Download annotated JPEG"
          >
            <Download size={16} style={{ marginRight: '6px' }} />
            IMAGE
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={handleExportJson}
            title="Export JSON telemetry"
          >
            JSON
          </button>
        </div>
      </div>
    </div>
  );
}
