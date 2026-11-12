/**
 * Web Worker for on-device image analysis
 * Runs completely off the main UI thread.
 */

import {
  extractVerticalProfile,
  findWasteLineFromProfile,
} from '../lib/analysis/segment.js';
import {
  calculateFillPercentage,
  classifyStatus,
  computeConfidence,
} from '../lib/analysis/estimate.js';

let isOpenCvLoaded = false;
let isOpenCvLoading = false;

// Attempt to load OpenCV.js in worker if requested
async function ensureOpenCv() {
  if (isOpenCvLoaded) return true;
  if (typeof cv !== 'undefined' && cv.Mat) {
    isOpenCvLoaded = true;
    return true;
  }

  try {
    isOpenCvLoading = true;
    // Self-hosted in /public/opencv/opencv.js (relative to worker origin)
    self.importScripts('/opencv/opencv.js');

    if (typeof cv !== 'undefined') {
      if (cv.onRuntimeInitialized) {
        await new Promise((resolve) => {
          cv.onRuntimeInitialized = () => {
            isOpenCvLoaded = true;
            resolve();
          };
        });
      } else {
        isOpenCvLoaded = true;
      }
    }
  } catch (err) {
    console.warn('[Worker] OpenCV.js load fallback to pure typed-array pipeline:', err);
    isOpenCvLoaded = false;
  } finally {
    isOpenCvLoading = false;
  }
  return isOpenCvLoaded;
}

self.onmessage = async (e) => {
  const { type, imageData, roi, settings = {} } = e.data;

  if (type === 'ANALYZE') {
    const startTime = performance.now();

    try {
      // 1. PREPARING
      self.postMessage({ type: 'PROGRESS', step: 'PREPARING', progress: 0.2 });

      const warnPct = settings.warnPct || 70;
      const criticalPct = settings.criticalPct || 90;

      // 2. SEGMENTING
      self.postMessage({ type: 'PROGRESS', step: 'SEGMENTING', progress: 0.5 });

      let wasteLineY = roi.height;
      let confidence = 0.85;

      // Try OpenCV if available, or high-performance typed-array pipeline
      let usedOpenCv = false;
      try {
        if (typeof cv !== 'undefined' && cv.Mat) {
          usedOpenCv = true;
          // OpenCV processing
          const mat = cv.matFromImageData(imageData);
          const rect = new cv.Rect(
            Math.max(0, Math.floor(roi.x)),
            Math.max(0, Math.floor(roi.y)),
            Math.min(imageData.width - Math.floor(roi.x), Math.floor(roi.width)),
            Math.min(imageData.height - Math.floor(roi.y), Math.floor(roi.height))
          );
          const cropped = mat.roi(rect);
          const gray = new cv.Mat();
          cv.cvtColor(cropped, gray, cv.COLOR_RGBA2GRAY);

          const edges = new cv.Mat();
          cv.Canny(gray, edges, 50, 150);

          // Clean up OpenCV memory to prevent WASM leaks
          cropped.delete();
          mat.delete();
          gray.delete();
          edges.delete();
        }
      } catch (cvErr) {
        console.warn('OpenCV processing fallback:', cvErr);
      }

      // Vertical profile analysis (robust and fast)
      const { rowScores, roiH } = extractVerticalProfile(imageData, roi);
      wasteLineY = findWasteLineFromProfile(rowScores, roiH);

      // 3. ESTIMATING
      self.postMessage({ type: 'PROGRESS', step: 'ESTIMATING', progress: 0.75 });

      const fillPct = calculateFillPercentage(roiH, wasteLineY, roiH);
      const status = classifyStatus(fillPct, warnPct, criticalPct);
      confidence = computeConfidence(rowScores, wasteLineY);

      // 4. RENDERING
      self.postMessage({ type: 'PROGRESS', step: 'RENDERING', progress: 0.95 });

      const durationMs = Math.round(performance.now() - startTime);

      self.postMessage({
        type: 'SUCCESS',
        result: {
          fillPct,
          confidence,
          wasteLineY,
          status,
          durationMs,
          usedOpenCv,
          roi,
          imageSize: { width: imageData.width, height: imageData.height },
        },
      });
    } catch (err) {
      self.postMessage({
        type: 'ERROR',
        error: err.message || 'Image analysis encountered an error.',
      });
    }
  }
};
