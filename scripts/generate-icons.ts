import { mkdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const svg = await readFile(resolve(root, "public", "icon.svg"));
const outDir = resolve(root, "public", "icons");
const sizes = [16, 32, 48, 128] as const;

await mkdir(outDir, { recursive: true });

await Promise.all(
  sizes.map((size) =>
    sharp(svg)
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(resolve(outDir, `icon-${size}.png`))
  )
);

console.log(`Generated ${sizes.length} MarkDrive icons in ${outDir}`);
