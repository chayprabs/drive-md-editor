import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const files = ["README.md", ...(await collectSourceFiles(resolve(root, "src")))];
const forbidden = ["TODO", "placeholder", "stub"];
const offenders: string[] = [];

for (const file of files) {
  const text = await readFile(resolve(root, file), "utf8");
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const word of forbidden) {
      if (line.toLowerCase().includes(word.toLowerCase())) {
        offenders.push(`${file}:${index + 1}: ${word}`);
      }
    }
  });
}

if (offenders.length > 0) {
  console.error(offenders.join("\n"));
  process.exit(1);
}

async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(fullPath);
      if (/\.(ts|tsx|css)$/.test(entry.name)) return [fullPath.replace(`${root}\\`, "").replaceAll("\\", "/")];
      return [];
    })
  );
  return files.flat();
}
