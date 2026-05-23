// One-shot script to generate PWA icons from public/favicon.svg.
// Run with: node scripts/generate-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "public", "favicon.svg");
const svgBuffer = readFileSync(svgPath);

const outputs = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

// Maskable icon: pads the flame inside a safe zone (~80% of icon size) so
// Android's adaptive icon mask doesn't crop the flame on circular/squircle masks.
const maskableSize = 512;
const safeZoneRatio = 0.78;
const innerSize = Math.round(maskableSize * safeZoneRatio);
const padding = Math.round((maskableSize - innerSize) / 2);

await Promise.all([
  ...outputs.map(({ name, size }) =>
    sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(join(root, "public", name))
      .then(() => console.log(`✓ ${name} (${size}×${size})`))
  ),
  // Maskable: render flame at innerSize, then composite onto a dark padded background.
  sharp({
    create: {
      width: maskableSize,
      height: maskableSize,
      channels: 4,
      background: { r: 14, g: 14, b: 16, alpha: 1 },
    },
  })
    .composite([
      {
        input: await sharp(svgBuffer).resize(innerSize, innerSize).png().toBuffer(),
        top: padding,
        left: padding,
      },
    ])
    .png()
    .toFile(join(root, "public", "icon-maskable.png"))
    .then(() => console.log(`✓ icon-maskable.png (${maskableSize}×${maskableSize}, padded)`)),
]);

console.log("\nAll icons generated in public/");
