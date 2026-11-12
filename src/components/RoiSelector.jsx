import React, { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Touch-friendly interactive ROI bounding box selector
 */
export default function RoiSelector({ imageSrc, initialRoi, onRoiChange }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageObjRef = useRef(null);

  // Normalized ROI: { x, y, width, height } in original image coordinates
  const [roi, setRoi] = useState(initialRoi || null);
  const [dragHandle, setDragHandle] = useState(null); // 'tl', 'tr', 'bl', 'br', 'move', or null
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [roiStart, setRoiStart] = useState(null);

  const HANDLE_RADIUS = 22; // 44px touch-friendly hit target

  // Load image
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      imageObjRef.current = img;
      // Default initial ROI: center 70% width, 80% height
      const defaultRoi = {
        x: Math.round(img.naturalWidth * 0.15),
        y: Math.round(img.naturalHeight * 0.10),
        width: Math.round(img.naturalWidth * 0.70),
        height: Math.round(img.naturalHeight * 0.80),
      };
      const initial = initialRoi || defaultRoi;
      setRoi(initial);
      if (onRoiChange) onRoiChange(initial);
      redrawCanvas(initial);
    };
  }, [imageSrc]);

  // Convert canvas pointer coordinates to image natural coordinates
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Draw image, darkened backdrop, ROI box, and handles
  const redrawCanvas = useCallback((currentRoi) => {
    const canvas = canvasRef.current;
    const img = imageObjRef.current;
    if (!canvas || !img || !currentRoi) return;

    const ctx = canvas.getContext('2d');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Draw base image
    ctx.drawImage(img, 0, 0);

    // Darkened backdrop outside ROI
    ctx.fillStyle = 'rgba(10, 15, 12, 0.65)';
    ctx.fillRect(0, 0, canvas.width, currentRoi.y); // top
    ctx.fillRect(0, currentRoi.y, currentRoi.x, currentRoi.height); // left
    ctx.fillRect(
      currentRoi.x + currentRoi.width,
      currentRoi.y,
      canvas.width - (currentRoi.x + currentRoi.width),
      currentRoi.height
    ); // right
    ctx.fillRect(
      0,
      currentRoi.y + currentRoi.height,
      canvas.width,
      canvas.height - (currentRoi.y + currentRoi.height)
    ); // bottom

    // ROI Box border
    ctx.strokeStyle = '#B8F53C';
    ctx.lineWidth = Math.max(3, Math.round(canvas.width * 0.004));
    ctx.strokeRect(currentRoi.x, currentRoi.y, currentRoi.width, currentRoi.height);

    // Draw 4 touch handles
    const handles = [
      { id: 'tl', x: currentRoi.x, y: currentRoi.y },
      { id: 'tr', x: currentRoi.x + currentRoi.width, y: currentRoi.y },
      { id: 'bl', x: currentRoi.x, y: currentRoi.y + currentRoi.height },
      { id: 'br', x: currentRoi.x + currentRoi.width, y: currentRoi.y + currentRoi.height },
    ];

    const hRadius = Math.max(16, Math.round(canvas.width * 0.016));
    handles.forEach((h) => {
      ctx.fillStyle = '#B8F53C';
      ctx.beginPath();
      ctx.arc(h.x, h.y, hRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0A0F0C';
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }, []);

  // Pointer Down
  const handlePointerDown = (e) => {
    e.preventDefault();
    if (!roi || !canvasRef.current) return;

    const { x, y } = getCanvasCoords(e);
    const hHit = Math.max(HANDLE_RADIUS, canvasRef.current.width * 0.035);

    // Check handles
    const nearTL = Math.hypot(x - roi.x, y - roi.y) < hHit;
    const nearTR = Math.hypot(x - (roi.x + roi.width), y - roi.y) < hHit;
    const nearBL = Math.hypot(x - roi.x, y - (roi.y + roi.height)) < hHit;
    const nearBR = Math.hypot(x - (roi.x + roi.width), y - (roi.y + roi.height)) < hHit;

    let handle = null;
    if (nearTL) handle = 'tl';
    else if (nearTR) handle = 'tr';
    else if (nearBL) handle = 'bl';
    else if (nearBR) handle = 'br';
    else if (
      x >= roi.x &&
      x <= roi.x + roi.width &&
      y >= roi.y &&
      y <= roi.y + roi.height
    ) {
      handle = 'move';
    }

    if (handle) {
      setDragHandle(handle);
      setDragStart({ x, y });
      setRoiStart({ ...roi });
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    if (!dragHandle || !roiStart || !imageObjRef.current) return;
    e.preventDefault();

    const { x, y } = getCanvasCoords(e);
    const dx = x - dragStart.x;
    const dy = y - dragStart.y;
    const imgW = imageObjRef.current.naturalWidth;
    const imgH = imageObjRef.current.naturalHeight;

    let next = { ...roiStart };

    if (dragHandle === 'move') {
      next.x = Math.max(0, Math.min(imgW - next.width, roiStart.x + dx));
      next.y = Math.max(0, Math.min(imgH - next.height, roiStart.y + dy));
    } else if (dragHandle === 'tl') {
      const newX = Math.min(roiStart.x + roiStart.width - 40, Math.max(0, roiStart.x + dx));
      const newY = Math.min(roiStart.y + roiStart.height - 40, Math.max(0, roiStart.y + dy));
      next.width = roiStart.x + roiStart.width - newX;
      next.height = roiStart.y + roiStart.height - newY;
      next.x = newX;
      next.y = newY;
    } else if (dragHandle === 'tr') {
      const newY = Math.min(roiStart.y + roiStart.height - 40, Math.max(0, roiStart.y + dy));
      next.width = Math.max(40, Math.min(imgW - roiStart.x, roiStart.width + dx));
      next.height = roiStart.y + roiStart.height - newY;
      next.y = newY;
    } else if (dragHandle === 'bl') {
      const newX = Math.min(roiStart.x + roiStart.width - 40, Math.max(0, roiStart.x + dx));
      next.width = roiStart.x + roiStart.width - newX;
      next.height = Math.max(40, Math.min(imgH - roiStart.y, roiStart.height + dy));
      next.x = newX;
    } else if (dragHandle === 'br') {
      next.width = Math.max(40, Math.min(imgW - roiStart.x, roiStart.width + dx));
      next.height = Math.max(40, Math.min(imgH - roiStart.y, roiStart.height + dy));
    }

    // Round
    next = {
      x: Math.round(next.x),
      y: Math.round(next.y),
      width: Math.round(next.width),
      height: Math.round(next.height),
    };

    setRoi(next);
    redrawCanvas(next);
    if (onRoiChange) onRoiChange(next);
  };

  // Pointer Up
  const handlePointerUp = () => {
    setDragHandle(null);
  };

  // Reset Button
  const handleReset = () => {
    if (!imageObjRef.current) return;
    const img = imageObjRef.current;
    const defaultRoi = {
      x: Math.round(img.naturalWidth * 0.15),
      y: Math.round(img.naturalHeight * 0.10),
      width: Math.round(img.naturalWidth * 0.70),
      height: Math.round(img.naturalHeight * 0.80),
    };
    setRoi(defaultRoi);
    redrawCanvas(defaultRoi);
    if (onRoiChange) onRoiChange(defaultRoi);
  };

  // Use Full Image Button
  const handleFullImage = () => {
    if (!imageObjRef.current) return;
    const img = imageObjRef.current;
    const fullRoi = {
      x: 0,
      y: 0,
      width: img.naturalWidth,
      height: img.naturalHeight,
    };
    setRoi(fullRoi);
    redrawCanvas(fullRoi);
    if (onRoiChange) onRoiChange(fullRoi);
  };

  return (
    <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--line)',
          backgroundColor: '#000',
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            touchAction: 'none',
            cursor: dragHandle ? 'crosshair' : 'grab',
          }}
        />
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div className="mono" style={{ fontSize: '11px', color: 'var(--lichen)' }}>
          ROI: {roi ? `${roi.width} × ${roi.height} px` : '—'}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleReset}
            style={{ minHeight: '36px', height: '36px', fontSize: '12px', padding: '0 12px' }}
          >
            RESET
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleFullImage}
            style={{ minHeight: '36px', height: '36px', fontSize: '12px', padding: '0 12px' }}
          >
            FULL IMAGE
          </button>
        </div>
      </div>
    </div>
  );
}

