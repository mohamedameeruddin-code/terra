import fs from 'fs';
import path from 'path';

const DIST_DIR = path.resolve('dist');

function checkDir(dir) {
  let foundViolations = false;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (checkDir(fullPath)) foundViolations = true;
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html'))) {
      // Exclude heavy vendor opencv.js from scan if present
      if (entry.name.includes('opencv')) continue;

      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('localhost') || content.includes('127.0.0.1')) {
        console.error(`[BUILD VERIFICATION ERROR] Found forbidden localhost/127.0.0.1 reference in ${fullPath}`);
        foundViolations = true;
      }
    }
  }
  return foundViolations;
}

if (!fs.existsSync(DIST_DIR)) {
  console.error('dist directory does not exist.');
  process.exit(1);
}

const failed = checkDir(DIST_DIR);
if (failed) {
  console.error('Build check failed: bundle must not contain hardcoded localhost or 127.0.0.1.');
  process.exit(1);
} else {
  console.log('✅ Build check passed: 0 localhost/127.0.0.1 references found.');
}

