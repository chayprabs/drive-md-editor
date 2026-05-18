import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

interface Manifest {
  manifest_version?: number;
  name?: string;
  version?: string;
  description?: string;
  permissions?: string[];
  host_permissions?: string[];
  icons?: Record<string, string>;
  background?: { service_worker?: string; type?: string };
  content_scripts?: Array<{ matches?: string[] }>;
}

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const manifest = JSON.parse(await readFile(resolve(dist, "manifest.json"), "utf8")) as Manifest;
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as { version?: string };
const failures: string[] = [];

expect(manifest.manifest_version === 3, "Manifest must be MV3.");
expect(manifest.name === "MarkDrive", "Manifest name must be MarkDrive.");
expect(manifest.version === packageJson.version, "Manifest version must match package version.");
expect(Boolean(manifest.description && manifest.description.length <= 132), "Manifest description must exist and fit Chrome Web Store limits.");
expect(manifest.background?.type === "module" && Boolean(manifest.background.service_worker), "Background service worker must be an ES module.");
expect(!manifest.permissions?.includes("debugger"), "Extension must not request debugger permission.");
expect(!manifest.host_permissions?.includes("<all_urls>"), "Extension must not request all URLs.");

for (const size of ["16", "32", "48", "128"]) {
  const iconPath = manifest.icons?.[size];
  expect(Boolean(iconPath), `Missing ${size}px icon in manifest.`);
  if (iconPath) await expectFile(resolve(dist, iconPath), `Missing ${size}px icon file.`);
}

const files = await listFiles(dist);
for (const file of files) {
  expect(!file.endsWith(".map"), `Source map emitted: ${file}`);
  if (/\.(html|css|js|json)$/.test(file)) {
    const text = await readFile(file, "utf8");
    expect(!/https:\/\/fonts\.googleapis\.com|https:\/\/fonts\.gstatic\.com/.test(text), `Remote font URL emitted: ${file}`);
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Extension package validation passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

async function expectFile(path: string, message: string): Promise<void> {
  try {
    const info = await stat(path);
    expect(info.isFile(), message);
  } catch {
    failures.push(message);
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : Promise.resolve([fullPath]);
  }));
  return nested.flat();
}
