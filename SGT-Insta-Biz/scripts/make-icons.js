// Draws the PWA icons (sun over mountains) as PNGs with no image libraries.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../app/public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x / size, y / size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const TOP = [15, 118, 110];
const BOTTOM = [8, 80, 88];
const SUN = [253, 186, 72];
const SNOW = [255, 255, 255];
const PEAK = [226, 240, 236];

// s = scale of the artwork (1 = full bleed, smaller keeps it inside the maskable safe zone)
function art(x, y, s) {
  const u = (x - 0.5) / s + 0.5;
  const v = (y - 0.5) / s + 0.5;
  let c = mix(TOP, BOTTOM, y);
  if ((u - 0.66) ** 2 + (v - 0.34) ** 2 < 0.11 ** 2) c = SUN;
  const m1 = v > 0.78 - (0.42 - Math.abs(u - 0.38)) * 1.15 && v < 0.82;
  const m2 = v > 0.78 - (0.3 - Math.abs(u - 0.7)) * 1.1 && v < 0.82;
  if (m2) c = PEAK;
  if (m1) c = SNOW;
  return [...c, 255];
}

function rounded(x, y, r) {
  const dx = Math.max(r - x, 0, x - (1 - r));
  const dy = Math.max(r - y, 0, y - (1 - r));
  return dx * dx + dy * dy <= r * r;
}

for (const size of [192, 512]) {
  writeFileSync(new URL(`icon-${size}.png`, OUT), png(size, (x, y) => (rounded(x, y, 0.22) ? art(x, y, 1) : [0, 0, 0, 0])));
  writeFileSync(new URL(`maskable-${size}.png`, OUT), png(size, (x, y) => art(x, y, 0.78)));
}
writeFileSync(new URL('apple-touch-icon.png', OUT), png(180, (x, y) => art(x, y, 0.9)));
console.log('Icons written to app/public/icons/');
