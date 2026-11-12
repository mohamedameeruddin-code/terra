import React, { useState, useRef, useEffect } from 'react';
import { Crosshair, RotateCcw } from 'lucide-react';

const RoiSelector = ({ imageSrc, onRoiChange, initialRoi = null }) => {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [roi, setRoi] = useState(initialRoi || { x: 40, y: 30, width: 220, height: 320 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'move' or 'nw', 'ne', 'sw', 'se'
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const notifyChange = (currentRoi) => {
    if (imgRef.current && onRoiChange) {
      const cw = imgRef.current.clientWidth || 300;
      const ch = imgRef.current.clientHeight || 400;

      const payload = {
        x: currentRoi.x,
        y: currentRoi.y,
        width: currentRoi.width,
        height: currentRoi.height,
        client_width: cw,
        client_height: ch,
        x_pct: Math.max(0, Math.min(1.0, currentRoi.x / cw)),
        y_pct: Math.max(0, Math.min(1.0, currentRoi.y / ch)),
        width_pct: Math.max(0.05, Math.min(1.0, currentRoi.width / cw)),
        height_pct: Math.max(0.05, Math.min(1.0, currentRoi.height / ch)),
      };
      onRoiChange(payload);
    }
  };

  useEffect(() => {
    notifyChange(roi);
  }, [roi]);

  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragType(type);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    setRoi((prev) => {
      let { x, y, width, height } = prev;
      const maxW = imgRef.current ? imgRef.current.clientWidth : 800;
      const maxH = imgRef.current ? imgRef.current.clientHeight : 800;

      if (dragType === 'move') {
        x = Math.max(0, Math.min(maxW - width, x + dx));
        y = Math.max(0, Math.min(maxH - height, y + dy));
      } else if (dragType === 'se') {
        width = Math.max(40, Math.min(maxW - x, width + dx));
        height = Math.max(40, Math.min(maxH - y, height + dy));
      } else if (dragType === 'sw') {
        const newX = Math.max(0, x + dx);
        width = Math.max(40, width + (x - newX));
        x = newX;
        height = Math.max(40, Math.min(maxH - y, height + dy));
      } else if (dragType === 'ne') {
        const newY = Math.max(0, y + dy);
        height = Math.max(40, height + (y - newY));
        y = newY;
        width = Math.max(40, Math.min(maxW - x, width + dx));
      } else if (dragType === 'nw') {
        const newX = Math.max(0, x + dx);
        const newY = Math.max(0, y + dy);
        width = Math.max(40, width + (x - newX));
        height = Math.max(40, height + (y - newY));
        x = newX;
        y = newY;
      }

      const nextRoi = { x, y, width, height };
      notifyChange(nextRoi);
      return nextRoi;
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragType(null);
  };

  const resetToDefault = () => {
    if (imgRef.current) {
      const w = imgRef.current.clientWidth;
      const h = imgRef.current.clientHeight;
      // Intelligent dustbin framing: captures 70% width and 84% height including top heap!
      const rx = Math.round(w * 0.15);
      const ry = Math.round(h * 0.08);
      const rw = Math.round(w * 0.70);
      const rh = Math.round(h * 0.84);
      const newRoi = { x: rx, y: ry, width: rw, height: rh };
      setRoi(newRoi);
      notifyChange(newRoi);
    }
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: '8px', userSelect: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Crosshair size={13} style={{ color: 'var(--sprout)' }} />
          INTERACTIVE DUSTBIN REGION (ROI)
        </span>
        <button
          type="button"
          onClick={resetToDefault}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '10px', padding: '2px 8px' }}
        >
          <RotateCcw size={11} />
          <span>Full Dustbin Fit</span>
        </button>
      </div>

      <div
        ref={containerRef}
        style={{
          position: 'relative',
          display: 'inline-block',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          border: '1px solid var(--line)',
          background: 'var(--soil-950)',
        }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Dustbin upload preview"
          style={{ display: 'block', maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }}
          onLoad={resetToDefault}
        />

        {/* Draggable & Resizable ROI Bounding Box */}
        <div
          style={{
            position: 'absolute',
            left: `${roi.x}px`,
            top: `${roi.y}px`,
            width: `${roi.width}px`,
            height: `${roi.height}px`,
            border: '2px solid var(--sprout)',
            boxShadow: '0 0 10px rgba(184, 245, 60, 0.4), inset 0 0 10px rgba(184, 245, 60, 0.1)',
            cursor: 'move',
            boxSizing: 'border-box',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
          {/* Label chip */}
          <div
            style={{
              position: 'absolute',
              top: '-20px',
              left: '-2px',
              backgroundColor: 'var(--sprout)',
              color: 'var(--soil-950)',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: '2px 2px 0 0',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            DUSTBIN & OVERFLOW HEAP
          </div>

          {/* 4 Corner handles */}
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              left: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--sprout)',
              borderRadius: '1px',
              cursor: 'nw-resize',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'nw')}
          />
          <div
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--sprout)',
              borderRadius: '1px',
              cursor: 'ne-resize',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'ne')}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--sprout)',
              borderRadius: '1px',
              cursor: 'sw-resize',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'sw')}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              right: '-6px',
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--sprout)',
              borderRadius: '1px',
              cursor: 'se-resize',
            }}
            onMouseDown={(e) => handleMouseDown(e, 'se')}
          />
        </div>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--lichen)' }}>
        Adjust the lime box to enclose the dustbin cylinder and any protruding waste heaps. Outside surroundings are excluded.
      </div>
    </div>
  );
};

export default RoiSelector;
