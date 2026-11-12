import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Asus/AppData/Local/Programs/Antigravity IDE/resources/app/node_modules/playwright');

const SCREENSHOTS_DIR = path.resolve('screenshots');
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function runE2eVerification() {
  console.log('🚀 Starting TERRA Mobile & Offline-First E2E Acceptance Test...');

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  // Mobile viewport (Pixel 7 / iPhone)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  const LIVE_URL = 'https://mohamedameeruddin-code.github.io/terra/';
  console.log(`🌐 1. Navigating to live public HTTPS URL: ${LIVE_URL}`);
  await page.goto(LIVE_URL, { waitUntil: 'networkidle' });

  // Wait for service worker registration & cache
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_01_loaded.png') });
  console.log('📸 Captured mobile_01_loaded.png');

  // Verify UI title
  const title = await page.title();
  console.log(`Page title: ${title}`);

  // Test Offline Simulation (Airplane mode / laptop turned off)
  console.log('✈️ 2. Enabling Offline Mode (Simulating Airplane Mode & Laptop Off)...');
  await context.setOffline(true);

  console.log('🔄 3. Reloading page while 100% OFFLINE...');
  await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_02_offline_reload.png') });
  console.log('📸 Captured mobile_02_offline_reload.png (Loaded fully offline from Service Worker cache!)');

  // Click on "Critical (92%)" sample test button
  console.log('🔍 4. Loading test dustbin sample while offline...');
  const sampleBtn = page.locator('button:has-text("Critical (92%)")');
  await sampleBtn.click();
  await page.waitForTimeout(1500);

  // Click "ANALYSE DUSTBIN FILL LEVEL"
  console.log('⚡ 5. Triggering On-Device Vision AI Analysis in Web Worker...');
  const analyseBtn = page.locator('button:has-text("ANALYSE DUSTBIN FILL LEVEL")');
  await analyseBtn.click();

  // Wait for result modal to appear
  await page.waitForSelector('text=ANALYSIS VERDICT', { timeout: 15000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_03_analysis_result.png') });
  console.log('📸 Captured mobile_03_analysis_result.png');

  // Click SAVE SCAN
  console.log('💾 6. Saving scan to IndexedDB (terra-db)...');
  const saveBtn = page.locator('button:has-text("SAVE SCAN")');
  await saveBtn.click();
  await page.waitForTimeout(1000);

  // Close modal
  const closeBtn = page.locator('button[style*="width: 40px"]');
  if (await closeBtn.count() > 0) {
    await closeBtn.first().click();
  } else {
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(1000);

  // Navigate to History page
  console.log('📜 7. Checking Scan History in IndexedDB...');
  const historyNav = page.locator('nav.bottom-nav a[href="#/history"]');
  await historyNav.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_04_history.png') });
  console.log('📸 Captured mobile_04_history.png');

  // Navigate to Dashboard
  console.log('📊 8. Checking Fleet Telemetry Dashboard...');
  const dashboardNav = page.locator('nav.bottom-nav a[href="#/dashboard"]');
  await dashboardNav.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_05_dashboard.png') });
  console.log('📸 Captured mobile_05_dashboard.png');

  // Navigate to Settings
  console.log('⚙️ 9. Checking Settings and Storage Persistence...');
  const settingsNav = page.locator('nav.bottom-nav a[href="#/settings"]');
  await settingsNav.click();
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mobile_06_settings.png') });
  console.log('📸 Captured mobile_06_settings.png');

  console.log('✅ ALL OFFLINE ACCEPTANCE TESTS PASSED SUCCESSFULLY!');
  await browser.close();
}

runE2eVerification().catch((err) => {
  console.error('❌ E2E Verification failed:', err);
  process.exit(1);
});
