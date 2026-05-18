import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

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
const expectedMetaTitle = "MarkDrive \u2014 Markdown Editor for Google Drive";
const expectedMetaDescription =
  "Edit, preview, and save .md files directly in Google Drive. Live preview, syntax highlighting, Mermaid, KaTeX, dark mode, seamless Drive sync. The markdown editor Google Drive never shipped.";

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
  if (iconPath) {
    const file = resolve(dist, iconPath);
    await expectFile(file, `Missing ${size}px icon file.`);
    await expectPngDimensions(file, Number(size), Number(size), `${size}px icon must be ${size}x${size}.`);
  }
}

const files = await listFiles(dist);
const indexHtml = await readFile(resolve(dist, "index.html"), "utf8");
expect(indexHtml.includes(`<title>${expectedMetaTitle}</title>`), "Index title must match MarkDrive meta title.");
expect(indexHtml.includes(`name="description"`) && indexHtml.includes(`content="${expectedMetaDescription}"`), "Index description must match MarkDrive meta description.");
expect(indexHtml.includes(`property="og:title"`) && indexHtml.includes(`content="${expectedMetaTitle}"`), "Open Graph title must match MarkDrive meta title.");
await expectPngDimensions(resolve(dist, "og-image.png"), 1200, 630, "Open Graph image must be 1200x630.");
const iconSvg = await readFile(resolve(dist, "icon.svg"), "utf8");
expect(/#2DD4BF/i.test(iconSvg), "SVG icon must use MarkDrive teal #2DD4BF.");
expect(/#0d1117/i.test(iconSvg), "SVG icon must use MarkDrive dark background #0d1117.");

const highlightChunk = files.find((file) => /[\\/]highlight-languages-[^\\/]+\.js$/.test(file));
expect(Boolean(highlightChunk), "Highlight language registry chunk must be emitted.");
if (highlightChunk) {
  const highlightText = await readFile(highlightChunk, "utf8");
  const registeredLanguages = new Set([...highlightText.matchAll(/\["([^"]+)",/g)].map((match) => match[1]));
  expect(registeredLanguages.size >= 100, `Highlight chunk must register at least 100 languages; found ${registeredLanguages.size}.`);
}
for (const file of files) {
  expect(!file.endsWith(".map"), `Source map emitted: ${file}`);
  if (/\.(html|css|js|json)$/.test(file)) {
    const text = await readFile(file, "utf8");
    expect(!/https:\/\/fonts\.googleapis\.com|https:\/\/fonts\.gstatic\.com/.test(text), `Remote font URL emitted: ${file}`);
    expect(!/\beval\s*\(|new Function\s*\(/.test(text), `Unsafe dynamic code evaluation emitted: ${file}`);
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

async function expectPngDimensions(path: string, width: number, height: number, message: string): Promise<void> {
  try {
    const metadata = await sharp(path).metadata();
    expect(metadata.width === width && metadata.height === height, message);
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
