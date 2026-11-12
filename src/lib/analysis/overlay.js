/**
 * Render visual annotations and overlay onto processed image
 */

export function renderAnalysisOverlay(
  baseCanvas,
  roi,
  wasteLineY,
  fillPct,
  status,
  confidence
) {
  const canvas = document.createElement('canvas');
  canvas.width = baseCanvas.width;
  canvas.height = baseCanvas.height;
  const ctx = canvas.getContext('2d');

  // Draw original image
  ctx.drawImage(baseCanvas, 0, 0);

  const { x, y, width, height } = roi;
  const statusColor =
    status === 'CRITICAL' ? '#EB5A3C' : status === 'WARN' ? '#F5A524' : '#B8F53C';

  // 1. Draw tinted mask over waste area (from wasteLine down to ROI bottom)
  const wasteAbsY = y + wasteLineY;
  const wasteHeight = height - wasteLineY;

  if (wasteHeight > 0) {
    ctx.fillStyle = status === 'CRITICAL'
      ? 'rgba(235, 90, 60, 0.28)'
      : status === 'WARN'
      ? 'rgba(245, 165, 36, 0.25)'
      : 'rgba(184, 245, 60, 0.22)';
    ctx.fillRect(x, wasteAbsY, width, wasteHeight);
  }

  // 2. Draw ROI Bounding Box
  ctx.strokeStyle = '#B8F53C';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);

  // 3. Draw Dashed Waste Line
  ctx.beginPath();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 4;
  ctx.moveTo(x - 10, wasteAbsY);
  ctx.lineTo(x + width + 10, wasteAbsY);
  ctx.stroke();
  ctx.setLineDash([]); // Reset line dash

  // 4. Waste Line Indicator Badge
  ctx.fillStyle = statusColor;
  ctx.font = 'bold 13px monospace';
  const labelText = `WASTE LINE (${fillPct.toFixed(1)}%)`;
  const textWidth = ctx.measureText(labelText).width;
  ctx.fillRect(x + 8, Math.max(y + 4, wasteAbsY - 24), textWidth + 14, 22);

  ctx.fillStyle = '#0A0F0C';
  ctx.fillText(labelText, x + 15, Math.max(y + 20, wasteAbsY - 8));

  // 5. Top Status Badge
  const badgeText = `${status} • ${fillPct.toFixed(1)}% FILL`;
  ctx.font = 'bold 15px monospace';
  const badgeWidth = ctx.measureText(badgeText).width + 20;

  ctx.fillStyle = 'rgba(10, 15, 12, 0.85)';
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(x, y - 36 > 10 ? y - 36 : y + 6, badgeWidth, 30, 4) : ctx.rect(x, y - 36 > 10 ? y - 36 : y + 6, badgeWidth, 30);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = statusColor;
  ctx.fillText(badgeText, x + 10, (y - 36 > 10 ? y - 36 : y + 6) + 20);

  return canvas;
}

