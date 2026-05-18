import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";

const root = resolve(import.meta.dirname, "..");
const indexHtml = await readFile(resolve(root, "index.html"), "utf8");
const iconSvg = await readFile(resolve(root, "public", "icon.svg"), "utf8");
const ogHtml = await readFile(resolve(root, "public", "og.html"), "utf8");
const generateIcons = await readFile(resolve(root, "scripts", "generate-icons.ts"), "utf8");
const generateOg = await readFile(resolve(root, "scripts", "generate-og.ts"), "utf8");
const failures: string[] = [];

const metaTitle = "MarkDrive \u2014 Markdown Editor for Google Drive";
const metaDescription =
  "Edit, preview, and save .md files directly in Google Drive. Live preview, syntax highlighting, Mermaid, KaTeX, dark mode, seamless Drive sync. The markdown editor Google Drive never shipped.";
const tagline = "Your Markdown, native in Drive.";

expect(indexHtml.includes(`<title>${metaTitle}</title>`), "Index title must match the required MarkDrive title.");
expect(indexHtml.includes(`name="title" content="${metaTitle}"`), "Index meta title must match the required MarkDrive title.");
expect(indexHtml.includes(`name="description"`) && indexHtml.includes(`content="${metaDescription}"`), "Index meta description must match the required copy.");
expect(indexHtml.includes(`property="og:title" content="${metaTitle}"`), "Open Graph title must match the required title.");
expect(indexHtml.includes(`property="og:image" content="/og-image.png"`), "Open Graph image must reference the generated image.");

expect(iconSvg.includes('aria-label="MarkDrive"'), "SVG icon must be labelled MarkDrive.");
expect(iconSvg.includes('fill="#0d1117"'), "SVG icon must use the required dark background.");
expect(iconSvg.includes('fill="#2DD4BF"'), "SVG icon must use the required teal fill.");
expect(iconSvg.includes('stroke="#2DD4BF"'), "SVG icon must use the required teal stroke.");
expect(iconSvg.includes("M64 24v66"), "SVG icon must include the downward arrow mark.");

expect(ogHtml.includes("width=1200"), "Source OG HTML must target 1200px width.");
expect(ogHtml.includes("height: 630px"), "Source OG HTML must target 630px height.");
expect(ogHtml.includes("MarkDrive"), "Source OG HTML must show the product name.");
expect(ogHtml.includes(tagline), "Source OG HTML must show the tagline.");
expect(ogHtml.includes("repeating-linear-gradient"), "Source OG HTML must include a markdown-like texture.");
expect(ogHtml.includes("#0d1117"), "Source OG HTML must use the required dark background.");
expect(ogHtml.includes("#2dd4bf"), "Source OG HTML must use the required teal accent.");

expect(generateIcons.includes("const sizes = [16, 32, 48, 128] as const"), "Icon generator must export the required PNG sizes.");
expect(generateIcons.includes("public\", \"icon.svg\""), "Icon generator must use the source SVG.");
expect(generateOg.includes("width=\"1200\" height=\"630\""), "OG generator must create a 1200x630 image.");
expect(generateOg.includes(tagline), "OG generator must include the tagline.");
expect(generateOg.includes("pattern id=\"grid\""), "OG generator must include the texture pattern.");

await expectPngDimensions(resolve(root, "public", "og-image.png"), 1200, 630, "Generated OG image must be 1200x630.");
for (const size of [16, 32, 48, 128]) {
  await expectPngDimensions(resolve(root, "public", "icons", `icon-${size}.png`), size, size, `${size}px icon must be ${size}x${size}.`);
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Branding invariants passed.");

async function expectPngDimensions(path: string, width: number, height: number, message: string): Promise<void> {
  try {
    const metadata = await sharp(path).metadata();
    expect(metadata.width === width && metadata.height === height, message);
  } catch {
    failures.push(message);
  }
}

function expect(condition: boolean | undefined, message: string): void {
  if (!condition) failures.push(message);
}
