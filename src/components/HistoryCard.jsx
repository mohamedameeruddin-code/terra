import React, { useState, useEffect } from 'react';
import StatusPill from './StatusPill';
import FillColumn from './FillColumn';
import { getImage } from '../lib/db';
import { Trash2, ExternalLink } from 'lucide-react';

export default function HistoryCard({ analysis, onSelect, onDelete }) {
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    let active = true;
    const loadThumb = async () => {
      const imgId = analysis.processedImageId || analysis.originalImageId;
      if (!imgId) return;
      const imgRecord = await getImage(imgId);
      if (imgRecord && imgRecord.blob && active) {
        const url = URL.createObjectURL(imgRecord.blob);
        setThumbUrl(url);
      }
    };

    loadThumb();

    return () => {
      active = false;
      if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    };
  }, [analysis.id]);

  const dateStr = new Date(analysis.createdAt).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="terra-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px',
        cursor: 'pointer',
      }}
      onClick={() => onSelect && onSelect(analysis)}
    >
      {/* Thumbnail */}
      <div
        style={{
          width: '68px',
          height: '68px',
          borderRadius: 'var(--radius)',
          backgroundColor: 'var(--soil-800)',
          border: '1px solid var(--line)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt="Scan thumbnail"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '10px', color: 'var(--lichen)' }}>NO IMG</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--bone)' }}>
            {analysis.binLabel || 'Bin #1'}
          </span>
          <StatusPill status={analysis.status} />
        </div>

        <div style={{ fontSize: '12px', color: 'var(--lichen)', marginBottom: '4px' }}>
          {dateStr}
        </div>

        <div className="mono" style={{ fontSize: '11px', color: 'var(--sprout)' }}>
          Confidence: {Math.round(analysis.confidence * 100)}%
        </div>
      </div>

      {/* Fill Column */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <FillColumn
          fillPct={analysis.fillPct}
          status={analysis.status}
          height={50}
          width={18}
          showLabel={true}
        />

        {onDelete && (
          <button
            type="button"
            className="btn-ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(analysis.id);
            }}
            title="Delete scan"
            style={{ padding: '6px', minHeight: '36px', height: '36px' }}
          >
            <Trash2 size={16} color="var(--lichen)" />
          </button>
        )}
      </div>
    </div>
  );
}
