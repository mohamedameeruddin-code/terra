# Smart Dustbin Estimator — TERRA (v2.0)
### Offline-First Progressive Web App (PWA) with On-Device Vision AI Fill Estimation

TERRA is an offline-first waste intelligence and dustbin fill level monitoring PWA built with React, Vite, OpenCV.js, and IndexedDB. It operates in accordance with the **Soil & Signal** technical design specifications.

**Live Deployment URL:** [https://mohamedameeruddin-code.github.io/terra/](https://mohamedameeruddin-code.github.io/terra/)

---

## 🌟 Core Architecture & Key Features

1. **100% Client-Side & Local-First:**
   - No backend required for v1.
   - All analyses, telemetry calculations, and original/processed images are stored persistently in **IndexedDB** (`terra-db`).
2. **On-Device Vision AI Analysis (OpenCV.js in Web Worker):**
   - Pure on-device computation that keeps the UI thread 100% responsive.
   - Adaptive vertical-profile texture variance segmentation and Canny edge analysis to identify dustbin waterline.
   - Dynamic fill percentage calculation ($0\text{–}100\%$) and status classification:
     - **OK:** $0\text{–}69\%$ (Lime Sprout `#B8F53C`)
     - **WARN:** $70\text{–}89\%$ (Amber Rind `#F5A524`)
     - **CRITICAL:** $\ge 90\%$ (Crimson Ember `#EB5A3C`)
3. **Offline PWA with Service Worker Precaching:**
   - Service worker caches the entire application shell, OpenCV.js WASM engine, fonts, and icons.
   - Once loaded once, **the app operates fully in Airplane Mode and with the host computer offline.**
   - Touch-friendly ROI selector with 44px pointer handles, drag-to-move, and full-image calibration.
4. **Export & Storage Management:**
   - Real-time `navigator.storage.estimate()` usage tracking with quota warning at 80%.
   - Full CSV and JSON data export.
   - `navigator.storage.persist()` protection against browser eviction.

---

## 📱 Mobile Installation & Offline Usage

### Android / Chrome:
1. Open [https://mohamedameeruddin-code.github.io/terra/](https://mohamedameeruddin-code.github.io/terra/) on your mobile device.
2. An **"INSTALL TERRA"** button appears in the top header and inside Settings.
3. Tap it to add the standalone app to your home screen.

### iOS / Safari:
1. Open the URL in Safari.
2. Tap the **Share** button (box with an arrow pointing up) in Safari's bottom toolbar.
3. Scroll down and tap **"Add to Home Screen"**.
4. Launch TERRA directly from your home screen.

---

## 🚀 Deployment Instructions

### Option 1: GitHub Pages (Current Live Host)
```bash
# Build the project
npm run build

# Deploy dist to gh-pages branch
cd dist
git init
git checkout -B gh-pages
git add -A
git commit -m "Deploy TERRA PWA"
git remote add origin https://github.com/mohamedameeruddin-code/terra.git
git push -u origin gh-pages --force
```

### Option 2: Vercel
1. Push source code to GitHub: `git push -u origin main`.
2. Open [Vercel Dashboard](https://vercel.com/new).
3. Select the `terra` repository. Vercel automatically reads `vercel.json` and deploys to a custom `*.vercel.app` HTTPS domain.

### Option 3: Netlify
1. Connect repository to Netlify.
2. Netlify reads `netlify.toml` automatically, setting build command `npm run build` and publish directory `dist`.

---

## 🔮 Future Architecture: Cloud Data Sync (v2 Roadmap)

While v1 is strictly local-first on each device via IndexedDB, the sync interface stub exists in [`src/lib/sync/index.js`](src/lib/sync/index.js):
- **Record Flags:** Each record in IndexedDB includes `createdAt`, `updatedAt`, `synced` (boolean), and `deleted` (soft-delete tombstone).
- **Sync Endpoints:**
  - `pushPending()`: Batch POSTs all records where `synced === false` to a Supabase or Firebase PostgreSQL backend.
  - `pullUpdates()`: Queries remote changes updated after `lastSyncAt` with conflict resolution (latest timestamp wins).

---

## ⚠️ Transparent Limitations

- **iOS Safari Storage Eviction:** Safari on iOS may purge local IndexedDB storage after ~7 days of non-use if accessed only through standard browser tabs. Installing the app via **"Add to Home Screen"** or periodically exporting JSON backups is recommended.
- **Lighting & Framing Sensitivity:** Optimal edge and texture segmentation occurs when the container interior is evenly illuminated and the camera frames the entire rim and vertical body.
- **iOS Safari Manual Install:** iOS does not provide an automated programmatic `beforeinstallprompt` API; users must manually tap "Add to Home Screen".

