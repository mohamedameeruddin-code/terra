/**
 * Vertical profile texture segmentation for dustbin fill estimation
 */

/**
 * Compute Otsu's threshold on a 1D profile array
 */
export function computeOtsuThreshold(values) {
  if (!values || values.length === 0) return 0;

  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // If completely flat, return max
  if (min === max || max - min < 0.001) return max;

  const numBins = 64;
  const histogram = new Array(numBins).fill(0);
  const binWidth = (max - min) / numBins;

  for (const v of values) {
    const bin = Math.min(numBins - 1, Math.floor((v - min) / binWidth));
    histogram[bin]++;
  }

  const total = values.length;
  let sum = 0;
  for (let i = 0; i < numBins; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let weightB = 0;
  let maxVariance = 0;
  let thresholdBin = 0;

  for (let i = 0; i < numBins; i++) {
    weightB += histogram[i];
    if (weightB === 0) continue;

    const weightF = total - weightB;
    if (weightF === 0) break;

    sumB += i * histogram[i];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;

    const varianceBetween = weightB * weightF * Math.pow(meanB - meanF, 2);
    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      thresholdBin = i;
    }
  }

  return min + (thresholdBin + 0.5) * binWidth;
}

/**
 * Pure-math function: Find the topmost row where texture exceeds adaptive threshold
 * and stays above for at least minSustainPct (default 5%) of ROI height.
 */
export function findWasteLineFromProfile(profileScores, roiHeight, minSustainPct = 0.05) {
  if (!profileScores || profileScores.length === 0) {
    return roiHeight; // default empty
  }

  let min = Infinity;
  let max = -Infinity;
  for (const v of profileScores) {
    if (v < min) min = v;
    if (v > max) max = v;
  }

  // If profile is uniform (no significant variance between empty and waste), bin is empty
  if (max - min < 1.0) {
    return roiHeight;
  }

  const threshold = computeOtsuThreshold(profileScores);
  const sustainCount = Math.max(2, Math.floor(roiHeight * minSustainPct));

  let wasteLine = roiHeight;
  let currentRun = 0;

  for (let y = 0; y < profileScores.length; y++) {
    if (profileScores[y] > threshold) {
      currentRun++;
      if (currentRun >= sustainCount) {
        wasteLine = Math.max(0, y - sustainCount + 1);
        break;
      }
    } else {
      currentRun = 0;
    }
  }

  return Math.max(0, Math.min(roiHeight, wasteLine));
}

/**
 * Compute texture variance & edge gradient across each row in RGBA ImageData
 */
export function extractVerticalProfile(imageData, roi) {
  const { width, height, data } = imageData;
  const roiX = Math.max(0, Math.floor(roi.x));
  const roiY = Math.max(0, Math.floor(roi.y));
  const roiW = Math.min(width - roiX, Math.floor(roi.width));
  const roiH = Math.min(height - roiY, Math.floor(roi.height));

  const rowScores = new Float32Array(roiH);

  for (let ry = 0; ry < roiH; ry++) {
    const y = roiY + ry;
    let sumVar = 0;
    let sumGrad = 0;
    let prevLum = 0;

    const rowLums = new Float32Array(roiW);
    let meanLum = 0;

    for (let rx = 0; rx < roiW; rx++) {
      const x = roiX + rx;
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Perceived luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      rowLums[rx] = lum;
      meanLum += lum;

      if (rx > 0) {
        sumGrad += Math.abs(lum - prevLum);
      }
      prevLum = lum;
    }

    meanLum /= roiW;

    for (let rx = 0; rx < roiW; rx++) {
      sumVar += Math.pow(rowLums[rx] - meanLum, 2);
    }
    const variance = sumVar / roiW;
    const gradient = sumGrad / roiW;

    rowScores[ry] = Math.sqrt(variance) * 0.6 + gradient * 0.4;
  }

  return {
    rowScores,
    roiH,
    roiW,
    roiX,
    roiY,
  };
}
