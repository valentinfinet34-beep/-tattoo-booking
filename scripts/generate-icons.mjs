import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="100" fill="#140f0d"/>
  <text x="256" y="336" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="272" fill="#f2f0e9" text-anchor="middle">S</text>
  <rect x="146" y="374" width="220" height="18" rx="9" fill="#c81e1e"/>
</svg>
`;

const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "apple-touch-icon.png", size: 180 },
];

for (const { file, size } of targets) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(join(outDir, file));
  console.log(`Généré: ${file} (${size}x${size})`);
}
