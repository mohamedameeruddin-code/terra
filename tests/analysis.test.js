import { describe, it, expect } from 'vitest';
import {
  computeOtsuThreshold,
  findWasteLineFromProfile,
} from '../src/lib/analysis/segment.js';
import {
  calculateFillPercentage,
  classifyStatus,
  computeConfidence,
} from '../src/lib/analysis/estimate.js';

describe('Pure-Math Image Analysis Pipeline', () => {
  describe('Otsu Thresholding on 1D Profile', () => {
    it('finds appropriate bimodal separation threshold', () => {
      // Synthetic profile: smooth empty top (low variance ~5-15) and textured waste bottom (high variance ~60-90)
      const emptyTop = [5, 6, 8, 7, 10, 9, 8, 12];
      const wasteBottom = [65, 75, 80, 70, 85, 90, 78, 88];
      const profile = [...emptyTop, ...wasteBottom];

      const threshold = computeOtsuThreshold(profile);
      expect(threshold).toBeGreaterThan(12);
      expect(threshold).toBeLessThan(65);
    });

    it('handles flat or uniform profile without crashing', () => {
      const flat = [20, 20, 20, 20, 20];
      const threshold = computeOtsuThreshold(flat);
      expect(threshold).toBe(20);
    });
  });

  describe('findWasteLineFromProfile', () => {
    it('detects waste line where texture sustained above threshold', () => {
      // 100 rows total: top 40 rows low variance (empty), bottom 60 rows high variance (waste)
      const roiHeight = 100;
      const profile = [];
      for (let i = 0; i < 40; i++) profile.push(10 + Math.sin(i) * 3);
      for (let i = 40; i < 100; i++) profile.push(80 + Math.sin(i) * 10);

      const wasteLine = findWasteLineFromProfile(profile, roiHeight, 0.05);

      // Should find line near row 40
      expect(wasteLine).toBeGreaterThanOrEqual(38);
      expect(wasteLine).toBeLessThanOrEqual(44);
    });

    it('returns roiHeight for completely empty bin (no waste above threshold)', () => {
      const roiHeight = 50;
      const emptyProfile = new Array(50).fill(5);
      const wasteLine = findWasteLineFromProfile(emptyProfile, roiHeight);
      expect(wasteLine).toBe(roiHeight);
    });
  });

  describe('calculateFillPercentage and Clamping', () => {
    it('correctly calculates half fill (50%)', () => {
      const roiHeight = 100;
      const roiBottomY = 100;
      const wasteLineY = 50; // half way down
      const fill = calculateFillPercentage(roiBottomY, wasteLineY, roiHeight);
      expect(fill).toBe(50);
    });

    it('correctly calculates empty fill (0%)', () => {
      const roiHeight = 100;
      const roiBottomY = 100;
      const wasteLineY = 100; // at the bottom
      const fill = calculateFillPercentage(roiBottomY, wasteLineY, roiHeight);
      expect(fill).toBe(0);
    });

    it('correctly calculates full fill (100%)', () => {
      const roiHeight = 100;
      const roiBottomY = 100;
      const wasteLineY = 0; // at the top
      const fill = calculateFillPercentage(roiBottomY, wasteLineY, roiHeight);
      expect(fill).toBe(100);
    });

    it('clamps overflow values between 0 and 100', () => {
      const roiHeight = 100;
      const roiBottomY = 100;

      // Negative wasteLineY (garbage heaping above the rim)
      const overflowFill = calculateFillPercentage(roiBottomY, -20, roiHeight);
      expect(overflowFill).toBe(100);

      // Waste line below the bottom
      const underflowFill = calculateFillPercentage(roiBottomY, 120, roiHeight);
      expect(underflowFill).toBe(0);
    });
  });

  describe('classifyStatus', () => {
    it('correctly categorizes OK, WARN, and CRITICAL according to thresholds', () => {
      expect(classifyStatus(25, 70, 90)).toBe('OK');
      expect(classifyStatus(69.9, 70, 90)).toBe('OK');
      expect(classifyStatus(70, 70, 90)).toBe('WARN');
      expect(classifyStatus(85, 70, 90)).toBe('WARN');
      expect(classifyStatus(90, 70, 90)).toBe('CRITICAL');
      expect(classifyStatus(99.5, 70, 90)).toBe('CRITICAL');
    });
  });

  describe('computeConfidence', () => {
    it('returns high confidence for sharp contrast between empty and full regions', () => {
      const emptyTop = [5, 5, 5, 5];
      const wasteBottom = [80, 85, 90, 95];
      const profile = [...emptyTop, ...wasteBottom];

      const conf = computeConfidence(profile, 4);
      expect(conf).toBeGreaterThan(0.7);
    });
  });
});
