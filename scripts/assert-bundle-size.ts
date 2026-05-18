import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const maxBytes = 5 * 1024 * 1024;
const total = await directorySize(dist);

if (total > maxBytes) {
  console.error(`Extension bundle is ${formatBytes(total)}, exceeding ${formatBytes(maxBytes)}.`);
  process.exit(1);
}

console.log(`Extension bundle is ${formatBytes(total)}.`);

async function directorySize(dir: string): Promise<number> {
  const entries = await readdir(dir, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return directorySize(fullPath);
      return (await stat(fullPath)).size;
    })
  );
  return sizes.reduce((sum, size) => sum + size, 0);
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
