import { openDB } from 'idb';

const DB_NAME = 'terra-db';
const DB_VERSION = 1;

// Default application settings
export const DEFAULT_SETTINGS = {
  warnPct: 70,
  criticalPct: 90,
  imageMaxSide: 1024,
  defaultBinLabel: 'Bin #1',
  unit: 'metric',
  hasSeenInstallTip: false,
};

let dbPromise = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        // Analyses store
        if (!db.objectStoreNames.contains('analyses')) {
          const analysesStore = db.createObjectStore('analyses', { keyPath: 'id' });
          analysesStore.createIndex('createdAt', 'createdAt');
          analysesStore.createIndex('binLabel', 'binLabel');
        }

        // Separate Images store for lightweight queries
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Optional Bins store
        if (!db.objectStoreNames.contains('bins')) {
          db.createObjectStore('bins', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// Generate simple UUID
export function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Save an image blob to IndexedDB
 */
export async function saveImageBlob(blob, kind, width, height) {
  const db = await getDb();
  const id = generateId();
  const imageRecord = {
    id,
    blob,
    kind, // 'original' | 'processed'
    width: width || 0,
    height: height || 0,
    bytes: blob ? blob.size : 0,
    createdAt: new Date().toISOString(),
  };
  await db.put('images', imageRecord);
  return id;
}

/**
 * Get image by ID
 */
export async function getImage(id) {
  if (!id) return null;
  const db = await getDb();
  return await db.get('images', id);
}

/**
 * Save complete analysis with original and processed image blobs
 */
export async function saveAnalysis({
  binLabel = 'Bin #1',
  fillPct = 0,
  confidence = 1,
  status = 'OK',
  roi = null,
  notes = '',
  originalBlob = null,
  processedBlob = null,
  durationMs = 0,
  imageWidth = 0,
  imageHeight = 0,
}) {
  const db = await getDb();
  const analysisId = generateId();
  const now = new Date().toISOString();

  let originalImageId = null;
  let processedImageId = null;

  if (originalBlob) {
    originalImageId = await saveImageBlob(originalBlob, 'original', imageWidth, imageHeight);
  }
  if (processedBlob) {
    processedImageId = await saveImageBlob(processedBlob, 'processed', imageWidth, imageHeight);
  }

  const analysisRecord = {
    id: analysisId,
    binLabel,
    createdAt: now,
    fillPct: Math.round(fillPct * 10) / 10,
    confidence: Math.round(confidence * 100) / 100,
    status,
    roi,
    notes,
    originalImageId,
    processedImageId,
    durationMs,
  };

  await db.put('analyses', analysisRecord);
  return analysisRecord;
}

/**
 * Retrieve all analyses sorted descending by createdAt
 */
export async function getAnalyses() {
  const db = await getDb();
  const analyses = await db.getAllFromIndex('analyses', 'createdAt');
  return analyses.reverse(); // newest first
}

/**
 * Get single analysis by ID with images attached
 */
export async function getAnalysis(id) {
  const db = await getDb();
  const analysis = await db.get('analyses', id);
  if (!analysis) return null;

  let originalImage = null;
  let processedImage = null;

  if (analysis.originalImageId) {
    originalImage = await db.get('images', analysis.originalImageId);
  }
  if (analysis.processedImageId) {
    processedImage = await db.get('images', analysis.processedImageId);
  }

  return {
    ...analysis,
    originalImage,
    processedImage,
  };
}

/**
 * Delete an analysis and associated image blobs
 */
export async function deleteAnalysis(id) {
  const db = await getDb();
  const analysis = await db.get('analyses', id);
  if (analysis) {
    if (analysis.originalImageId) {
      await db.delete('images', analysis.originalImageId);
    }
    if (analysis.processedImageId) {
      await db.delete('images', analysis.processedImageId);
    }
    await db.delete('analyses', id);
  }
}

/**
 * Retrieve settings or defaults
 */
export async function getSettings() {
  const db = await getDb();
  const savedSettings = await db.getAll('settings');
  const result = { ...DEFAULT_SETTINGS };
  for (const item of savedSettings) {
    result[item.key] = item.value;
  }
  return result;
}

/**
 * Update single setting
 */
export async function saveSetting(key, value) {
  const db = await getDb();
  await db.put('settings', { key, value });
}

/**
 * Compute aggregate dashboard statistics
 */
export async function getDashboardStats() {
  const db = await getDb();
  const analyses = await db.getAll('analyses');
  const settings = await getSettings();

  const total = analyses.length;
  if (total === 0) {
    return {
      total: 0,
      averageFill: 0,
      criticalCount: 0,
      warnCount: 0,
      okCount: 0,
      lastAnalysis: null,
      perBin: {},
      trend: [],
    };
  }

  let fillSum = 0;
  let criticalCount = 0;
  let warnCount = 0;
  let okCount = 0;
  const perBin = {};

  // Sort by date
  analyses.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const item of analyses) {
    fillSum += item.fillPct;
    if (item.status === 'CRITICAL' || item.fillPct >= settings.criticalPct) {
      criticalCount++;
    } else if (item.status === 'WARN' || item.fillPct >= settings.warnPct) {
      warnCount++;
    } else {
      okCount++;
    }

    perBin[item.binLabel] = {
      latestFill: item.fillPct,
      latestStatus: item.status,
      lastUpdated: item.createdAt,
    };
  }

  const averageFill = Math.round((fillSum / total) * 10) / 10;
  const lastAnalysis = analyses[analyses.length - 1];

  // 7-day trend calculation
  const trend = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const itemsOnDay = analyses.filter((a) => a.createdAt.startsWith(dayStr));
    const avgOnDay = itemsOnDay.length
      ? Math.round((itemsOnDay.reduce((acc, curr) => acc + curr.fillPct, 0) / itemsOnDay.length) * 10) / 10
      : null;
    trend.push({
      date: dayStr.slice(5), // MM-DD
      avgFill: avgOnDay,
      count: itemsOnDay.length,
    });
  }

  return {
    total,
    averageFill,
    criticalCount,
    warnCount,
    okCount,
    lastAnalysis,
    perBin,
    trend,
  };
}

/**
 * Clear all records
 */
export async function clearAllData() {
  const db = await getDb();
  await db.clear('analyses');
  await db.clear('images');
  await db.clear('bins');
}
