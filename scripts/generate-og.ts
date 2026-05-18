import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const out = resolve(root, "public", "og-image.png");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" fill="none" stroke="#e6edf3" stroke-opacity="0.045" stroke-width="1"/>
    </pattern>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2DD4BF" stop-opacity="0.22"/>
      <stop offset="0.36" stop-color="#2DD4BF" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="36" stdDeviation="34" flood-color="#000000" flood-opacity="0.42"/>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="#0d1117"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(82 205)" filter="url(#shadow)">
    <rect width="220" height="220" rx="42" fill="#111820" stroke="#28313d"/>
    <rect x="46" y="46" width="128" height="128" rx="24" fill="#0d1117"/>
    <path d="M71 132V84h14l25 29 25-29h14v48h-15V107l-22 25h-4l-22-25v25H71Z" fill="#2DD4BF"/>
    <path d="M110 70v66m0 0 18-18m-18 18-18-18" stroke="#2DD4BF" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <text x="356" y="270" fill="#2DD4BF" font-family="Arial, sans-serif" font-size="116" font-weight="800" letter-spacing="0">MarkDrive</text>
  <text x="360" y="350" fill="#e6edf3" font-family="Arial, sans-serif" font-size="42" font-weight="700" letter-spacing="0">Your Markdown, native in Drive.</text>
  <rect x="360" y="382" width="440" height="50" rx="8" fill="#0d1117" fill-opacity="0.72" stroke="#28313d"/>
  <text x="374" y="415" fill="#8b949e" font-family="Consolas, monospace" font-size="24" letter-spacing="0"># edit .md directly in Google Drive</text>
</svg>`;

await mkdir(resolve(root, "public"), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`Generated ${out}`);
