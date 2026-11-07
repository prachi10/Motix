// Node.js script using built-in zlib to output standard PNG files for PWA icons
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // RGBA buffer
  const buffer = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2;
  const safeScale = isMaskable ? 0.75 : 0.9;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = (x - cx) / (radius * safeScale);
      const dy = (y - cy) / (radius * safeScale);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: deep dark navy #07090E
      let r = 7, g = 9, b = 14, a = 255;

      // Shield region
      const inShieldTop = dy > -0.75 && dy < 0.1 && Math.abs(dx) < 0.65;
      const inShieldBottom = dy >= 0.1 && dy < 0.85 && (Math.abs(dx) < 0.65 - (dy - 0.1) * 0.8);

      if (inShieldTop || inShieldBottom) {
        // Shield gradient fill #0C152C -> #071026
        r = 12 + Math.floor(dx * 8);
        g = 21 + Math.floor(dy * 15);
        b = 44 + Math.floor(dy * 30);

        // Border highlight
        const nearEdge = Math.abs(dx) > 0.55 || (dy > 0.75 && Math.abs(dx) < 0.2);
        if (nearEdge) {
          r = 0; g = 210; b = 255; // Electric cyan border
        }

        // 'M' vault core
        const inMLeft = dx > -0.35 && dx < -0.2 && dy > -0.2 && dy < 0.45;
        const inMRight = dx > 0.2 && dx < 0.35 && dy > -0.2 && dy < 0.45;
        const inMCenter = Math.abs(dx) < 0.12 && dy > 0.05 && dy < 0.45;
        const inMDiag = Math.abs(Math.abs(dx) - (0.28 - (dy + 0.1) * 0.4)) < 0.08 && dy >= -0.2 && dy <= 0.15;

        if (inMLeft || inMRight || inMCenter || inMDiag) {
          r = 56; g = 189; b = 248; // Cyan-400
        }

        // Center glowing node / keyhole
        if (dist < 0.12) {
          r = 255; g = 255; b = 255; // Core white glow
        }
      }

      buffer[idx] = Math.max(0, Math.min(255, r));
      buffer[idx + 1] = Math.max(0, Math.min(255, g));
      buffer[idx + 2] = Math.max(0, Math.min(255, b));
      buffer[idx + 3] = a;
    }
  }

  // Build PNG chunk format
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 6; // RGBA color type
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk (scanline filter byte 0 + raw RGBA)
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let scanIdx = 0;
  for (let y = 0; y < height; y++) {
    scanlines[scanIdx++] = 0; // No filter
    const rowStart = y * width * 4;
    buffer.copy(scanlines, scanIdx, rowStart, rowStart + width * 4);
    scanIdx += width * 4;
  }

  const compressed = zlib.deflateSync(scanlines);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  // CRC32 calculation
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC-32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Output icons
const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(32, 32, false));

console.log('Generated all PWA compliant PNG icons successfully!');
