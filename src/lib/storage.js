/**
 * Storage persistence and quota estimation helpers
 */

export async function requestPersistence() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persist();
      return isPersisted;
    } catch (e) {
      console.warn('Persistence request error:', e);
      return false;
    }
  }
  return false;
}

export async function checkPersistence() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      return await navigator.storage.persisted();
    } catch (e) {
      return false;
    }
  }
  return false;
}

export async function getStorageEstimate() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const { quota, usage } = await navigator.storage.estimate();
      const usageMb = (usage / (1024 * 1024)).toFixed(1);
      const quotaMb = (quota / (1024 * 1024)).toFixed(0);
      const percent = quota ? Math.min(100, Math.round((usage / quota) * 100)) : 0;
      const isNearLimit = percent >= 80;

      return {
        usage,
        quota,
        usageMb,
        quotaMb,
        percent,
        isNearLimit,
      };
    } catch (e) {
      console.warn('Storage estimate failed:', e);
    }
  }

  return {
    usage: 0,
    quota: 0,
    usageMb: '0',
    quotaMb: '0',
    percent: 0,
    isNearLimit: false,
  };
}
