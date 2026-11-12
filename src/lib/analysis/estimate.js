/**
 * Fill percentage and confidence calculation
 */

export function calculateFillPercentage(roiBottomY, wasteLineY, roiHeight) {
  if (!roiHeight || roiHeight <= 0) return 0;
  const rawFill = ((roiBottomY - wasteLineY) / roiHeight) * 100;
  return Math.max(0, Math.min(100, rawFill));
}

export function classifyStatus(fillPct, warnPct = 70, criticalPct = 90) {
  if (fillPct >= criticalPct) return 'CRITICAL';
  if (fillPct >= warnPct) return 'WARN';
  return 'OK';
}

export function computeConfidence(profileScores, wasteLineIndex) {
  if (!profileScores || profileScores.length === 0) return 0.5;

  const total = profileScores.length;
  const topPart = profileScores.slice(0, Math.max(1, wasteLineIndex));
  const bottomPart = profileScores.slice(Math.max(1, wasteLineIndex));

  const meanTop = topPart.length ? topPart.reduce((a, b) => a + b, 0) / topPart.length : 0;
  const meanBottom = bottomPart.length ? bottomPart.reduce((a, b) => a + b, 0) / bottomPart.length : 0;

  // Contrast between empty region (top) and waste region (bottom)
  const contrast = meanBottom > 0 ? Math.max(0, (meanBottom - meanTop) / (meanBottom + meanTop + 1e-5)) : 0.5;

  // Base confidence on contrast and profile stability
  let conf = 0.4 + contrast * 0.6;
  return Math.max(0.1, Math.min(0.99, conf));
}

