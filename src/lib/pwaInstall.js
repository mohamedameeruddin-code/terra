/**
 * PWA installation helper and device detection
 */

let deferredPrompt = null;
const listeners = new Set();

export function initPwaInstall() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar
    e.preventDefault();
    deferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notifyListeners();
  });
}

function notifyListeners() {
  for (const fn of listeners) {
    fn(canInstallPwa());
  }
}

export function subscribeToInstallPrompt(callback) {
  listeners.add(callback);
  callback(canInstallPwa());
  return () => listeners.delete(callback);
}

export function canInstallPwa() {
  return !!deferredPrompt;
}

export async function promptPwaInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  notifyListeners();
  return outcome === 'accepted';
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

export function isIos() {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
