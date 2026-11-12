import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const ICONS_DIR = path.resolve('public/icons');
fs.mkdirSync(ICONS_DIR, { recursive: true });

// SVG icon content: Soil #0A0F0C background, Sprout #B8F53C dustbin with angled lid and pulse line
function getSvg(size, isMaskable = false) {
  const scale = size / 512;
  const padding = isMaskable ? 512 * 0.15 : 512 * 0.08;
  const contentSize = 512 - (padding * 2);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" fill="#0A0F0C"/>
  <g transform="translate(${padding}, ${padding}) scale(${contentSize / 400})">
    <!-- Angled Lid -->
    <path d="M 60 110 L 330 65 L 340 95 L 70 140 Z" fill="#B8F53C" />
    <path d="M 180 75 L 205 50 L 235 55 L 210 80 Z" fill="#B8F53C" opacity="0.85" />
    
    <!-- Dustbin Body Rim -->
    <rect x="75" y="145" width="250" height="20" rx="4" fill="#B8F53C" />
    
    <!-- Dustbin Tapered Body -->
    <path d="M 90 175 L 115 350 Q 118 365 135 365 L 265 365 Q 282 365 285 350 L 310 175 Z" 
          fill="#17211B" stroke="#B8F53C" stroke-width="14" stroke-linejoin="round" />
          
    <!-- Waste Fill Area / Pulse Line -->
    <path d="M 106 270 Q 150 250 200 280 T 294 270 L 285 350 Q 282 365 265 365 L 135 365 Q 118 365 115 350 Z" 
          fill="#B8F53C" opacity="0.25" />
          
    <!-- Pulse Line across the bin -->
    <path d="M 50 260 L 120 260 L 145 220 L 175 300 L 205 240 L 225 270 L 255 260 L 350 260" 
          fill="none" stroke="#B8F53C" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" />
          
    <!-- Sensor Signal Wave Arcs -->
    <path d="M 170 30 Q 200 10 230 30" fill="none" stroke="#B8F53C" stroke-width="8" stroke-linecap="round" opacity="0.7" />
    <path d="M 150 15 Q 200 -10 250 15" fill="none" stroke="#B8F53C" stroke-width="6" stroke-linecap="round" opacity="0.4" />
  </g>
</svg>`;
}

// Minimal pure Node.js PNG generator with zlib
function createPng(width, height, renderPixel) {
  // RGBA buffer with filter byte per row (0 = None)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return c ^ -1;
}

// Geometry renderer for Terra icon
function terraRenderer(isMaskable) {
  return function(x, y, w, h) {
    const nx = x / w;
    const ny = y / h;
    
    // Background #0A0F0C
    let r = 10, g = 15, b = 12, a = 255;

    // Coordinate space inside safe zone: center 0.5, 0.5
    const cx = (nx - 0.5) / (isMaskable ? 0.7 : 0.85) + 0.5;
    const cy = (ny - 0.5) / (isMaskable ? 0.7 : 0.85) + 0.5;

    if (cx < 0 || cx > 1 || cy < 0 || cy > 1) {
      return [r, g, b, a];
    }

    // Colors
    const sprout = [184, 245, 60, 255];
    const soilBody = [23, 33, 27, 255];
    const glow = [184, 245, 60, 80];

    // Bin Body (trapezoid from y: 0.35 to 0.78, x: 0.25..0.75 down to 0.30..0.70)
    if (cy >= 0.35 && cy <= 0.78) {
      const progress = (cy - 0.35) / 0.43;
      const left = 0.25 + 0.05 * progress;
      const right = 0.75 - 0.05 * progress;
      
      if (cx >= left && cx <= right) {
        // Border of bin
        if (cx <= left + 0.03 || cx >= right - 0.03 || cy >= 0.75) {
          return sprout;
        }
        // Fill area
        if (cy >= 0.55) {
          return [50, 75, 45, 255];
        }
        return soilBody;
      }
    }

    // Bin Rim (rectangle at y: 0.30 to 0.35, x: 0.22 to 0.78)
    if (cy >= 0.30 && cy <= 0.35 && cx >= 0.22 && cx <= 0.78) {
      return sprout;
    }

    // Angled Lid (tilted line/polygon above rim: from (0.20, 0.26) to (0.80, 0.18))
    const lidLineY = 0.26 - (cx - 0.20) * 0.14;
    if (cx >= 0.18 && cx <= 0.82 && Math.abs(cy - lidLineY) <= 0.022) {
      return sprout;
    }

    // Handle on lid
    if (cx >= 0.45 && cx <= 0.55 && cy >= lidLineY - 0.045 && cy <= lidLineY) {
      return sprout;
    }

    // Pulse Line cutting across horizontally at y: 0.58
    if (cx >= 0.12 && cx <= 0.88) {
      // Pulse shape: flat, peak up at 0.40, peak down at 0.48, then flat
      let pulseY = 0.58;
      if (cx >= 0.35 && cx < 0.43) {
        pulseY = 0.58 - (cx - 0.35) / 0.08 * 0.12;
      } else if (cx >= 0.43 && cx < 0.51) {
        pulseY = 0.46 + (cx - 0.43) / 0.08 * 0.20;
      } else if (cx >= 0.51 && cx < 0.58) {
        pulseY = 0.66 - (cx - 0.51) / 0.07 * 0.08;
      }
      if (Math.abs(cy - pulseY) <= 0.016) {
        return sprout;
      }
    }

    // Sensor waves above the lid
    const dx = cx - 0.5;
    const dy = cy - 0.12;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if ((Math.abs(dist - 0.08) <= 0.012 || Math.abs(dist - 0.14) <= 0.012) && cy < 0.12) {
      return sprout;
    }

    return [r, g, b, a];
  };
}

// Generate files
console.log('Generating PWA icons...');

fs.writeFileSync(path.join(ICONS_DIR, 'favicon.svg'), getSvg(64));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), createPng(192, 192, terraRenderer(false)));
fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), createPng(512, 512, terraRenderer(false)));
fs.writeFileSync(path.join(ICONS_DIR, 'maskable-512.png'), createPng(512, 512, terraRenderer(true)));
fs.writeFileSync(path.join(ICONS_DIR, 'apple-touch-180.png'), createPng(180, 180, terraRenderer(false)));

console.log('Successfully generated all icons in public/icons/');

