// scripts/generate-pwa-icons.mjs
//
// Dependency-free PNG generator for the PWA icons. Produces:
//   public/pwa-192x192.png
//   public/pwa-512x512.png
//   public/apple-touch-icon.png  (180×180)
//
// Each icon is a solid amber (#f59e0b) square with a centred white "P".
// The 512×512 doubles as the maskable icon, so the letter is sized to ~50%
// of canvas width to stay inside the maskable safe-zone (80% inner area).
//
// We avoid `sharp` and similar native deps — Node's built-in `zlib` plus a
// hand-rolled CRC32 is enough to write a valid RGBA PNG. Run with:
//   node scripts/generate-pwa-icons.mjs

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// ─── PNG primitives ──────────────────────────────────────────────────

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePng(width, height, getPixel) {
  // Each scanline = 1 filter byte + width × 4 RGBA bytes.
  const stride = 1 + width * 4;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const rowOff = y * stride;
    raw[rowOff] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const px = rowOff + 1 + x * 4;
      raw[px]     = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // bit depth 8
  ihdr.writeUInt8(6, 9);  // color type RGBA
  ihdr.writeUInt8(0, 10); // compression: deflate
  ihdr.writeUInt8(0, 11); // filter: none
  ihdr.writeUInt8(0, 12); // interlace: none

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Letter shape ────────────────────────────────────────────────────

// "P" rendered on a 5×7 grid. 1 = letter pixel, 0 = transparent over bg.
const LETTER_P = [
  '11110',
  '10001',
  '10001',
  '10001',
  '11110',
  '10000',
  '10000',
];

const PATTERN_W = LETTER_P[0].length;
const PATTERN_H = LETTER_P.length;

const BG_R = 0xf5, BG_G = 0x9e, BG_B = 0x0b;  // amber #f59e0b
const FG_R = 0xff, FG_G = 0xff, FG_B = 0xff;  // white

/**
 * The 512 icon doubles as the maskable variant, so the letter occupies
 * ~50% of the canvas (well inside the 80% safe zone). The 192/180 use a
 * slightly larger 60% so the P is legible at small sizes.
 */
function makeIconPixelGetter(size, scaleFactor = 0.55) {
  const drawW = Math.floor(size * scaleFactor);
  const drawH = Math.floor((drawW / PATTERN_W) * PATTERN_H);
  const pixelSize = Math.max(1, Math.floor(drawW / PATTERN_W));
  const offsetX = Math.floor((size - PATTERN_W * pixelSize) / 2);
  const offsetY = Math.floor((size - PATTERN_H * pixelSize) / 2);

  return (x, y) => {
    const px = Math.floor((x - offsetX) / pixelSize);
    const py = Math.floor((y - offsetY) / pixelSize);
    if (
      px >= 0 && px < PATTERN_W &&
      py >= 0 && py < PATTERN_H &&
      LETTER_P[py][px] === '1'
    ) {
      return [FG_R, FG_G, FG_B, 255];
    }
    return [BG_R, BG_G, BG_B, 255];
  };
}

// ─── Output ──────────────────────────────────────────────────────────

const targets = [
  { path: 'public/pwa-192x192.png',     size: 192, scale: 0.60 },
  { path: 'public/pwa-512x512.png',     size: 512, scale: 0.50 }, // maskable safe-zone
  { path: 'public/apple-touch-icon.png', size: 180, scale: 0.60 },
];

for (const { path, size, scale } of targets) {
  const png = makePng(size, size, makeIconPixelGetter(size, scale));
  writeFileSync(path, png);
  // eslint-disable-next-line no-console
  console.log(`wrote ${path} — ${size}×${size}, ${png.length} bytes`);
}
