import { existsSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const evidencePath = resolve(root, "release", "live-drive-verification.json");
const requiredChecks = [
  "drive-grid-open",
  "drive-list-open",
  "drive-context-open",
  "ctrl-s-save-in-place",
  "autosave-in-place",
  "conflict-modal",
  "vim-w-save",
  "new-file-current-folder",
  "drive-browser",
  "image-upload",
  "export-markdown",
  "export-html",
  "export-pdf",
  "themes",
  "layout-and-guards"
] as const;

const screenshotRule = { extensions: [".png", ".jpg", ".jpeg", ".webp"], minBytes: 10_000 } as const;
const evidenceRules: Record<LiveDriveCheckId, { extensions: readonly string[]; minBytes: number }> = {
  "drive-grid-open": screenshotRule,
  "drive-list-open": screenshotRule,
  "drive-context-open": screenshotRule,
  "ctrl-s-save-in-place": screenshotRule,
  "autosave-in-place": screenshotRule,
  "conflict-modal": screenshotRule,
  "vim-w-save": screenshotRule,
  "new-file-current-folder": screenshotRule,
  "drive-browser": screenshotRule,
  "image-upload": screenshotRule,
  "export-markdown": { extensions: [".md", ".txt"], minBytes: 100 },
  "export-html": { extensions: [".html", ".png", ".jpg", ".jpeg", ".webp"], minBytes: 1_000 },
  "export-pdf": { extensions: [".pdf"], minBytes: 1_000 },
  themes: screenshotRule,
  "layout-and-guards": screenshotRule
};

const failures: string[] = [];
const clientId = process.env.MARKDRIVE_OAUTH_CLIENT_ID?.trim();

expect(Boolean(clientId) && /^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId ?? ""), "MARKDRIVE_OAUTH_CLIENT_ID must be set to the production Chrome Extension OAuth client id.");
expect(clientId !== "markdrive-unconfigured.apps.googleusercontent.com", "MARKDRIVE_OAUTH_CLIENT_ID must not use the unconfigured development client id.");

const manifest = await readJson<ExtensionManifest>(resolve(root, "dist", "manifest.json"), "Run pnpm build with the production OAuth client id before release verification.");
if (manifest) {
  expect(manifest.oauth2?.client_id === clientId, "dist/manifest.json OAuth client id must match MARKDRIVE_OAUTH_CLIENT_ID.");
}

expect(existsSync(evidencePath), "release/live-drive-verification.json must exist after live Google Drive QA.");
const evidence = await readJson<LiveDriveEvidence>(evidencePath, "Create release/live-drive-verification.json after completing the live Drive verification checklist.");

if (evidence) {
  expect(evidence.clientId === clientId, "Live verification evidence clientId must match MARKDRIVE_OAUTH_CLIENT_ID.");
  expect(chromeExtensionId(evidence.extensionId), "Live verification evidence extensionId must be the loaded Chrome extension id.");
  expect(emailLike(evidence.tester), "Live verification evidence tester must be an email-style owner identifier.");
  expect(browserWithVersion(evidence.browser), "Live verification evidence browser must include Chrome or Edge and a version.");
  expect(emailLike(evidence.driveAccount), "Live verification evidence driveAccount must be the Google account email used for QA.");
  expect(validIsoDate(evidence.completedAt), "Live verification evidence completedAt must be an ISO timestamp.");
  expect(notFuture(evidence.completedAt), "Live verification evidence completedAt must not be in the future.");
  expect(Array.isArray(evidence.checks), "Live verification evidence checks must be an array.");
  expect(evidence.checks?.length === requiredChecks.length, `Live verification evidence must include exactly ${requiredChecks.length} checks.`);
  const rootCompletedAt = Date.parse(evidence.completedAt);

  const seen = new Set<string>();
  for (const check of evidence.checks ?? []) {
    expect(requiredChecks.includes(check.id as LiveDriveCheckId), `Unknown live Drive verification check: ${check.id}`);
    expect(!seen.has(check.id), `Duplicate live Drive verification check: ${check.id}`);
    seen.add(check.id);
    expect(check.result === "pass", `Live Drive check ${check.id} must have result pass.`);
    expect(validIsoDate(check.completedAt), `Live Drive check ${check.id} must include an ISO completedAt timestamp.`);
    expect(notFuture(check.completedAt), `Live Drive check ${check.id} completedAt must not be in the future.`);
    if (validIsoDate(check.completedAt) && validIsoDate(evidence.completedAt)) {
      expect(Date.parse(check.completedAt) <= rootCompletedAt, `Live Drive check ${check.id} completedAt must not be after the root completedAt.`);
    }
    expect(nonEmpty(check.evidence), `Live Drive check ${check.id} must include a local evidence file path.`);
    if (nonEmpty(check.evidence)) {
      expect(!isAbsolute(check.evidence), `Live Drive check ${check.id} evidence must use a repository-relative path.`);
      const evidenceFile = resolve(root, check.evidence);
      const evidenceRelative = relative(resolve(root, "output", "live"), evidenceFile);
      expect(!evidenceRelative.startsWith("..") && evidenceRelative !== "", `Live Drive check ${check.id} evidence must live under output/live.`);
      expect(existsSync(evidenceFile), `Live Drive check ${check.id} evidence file does not exist: ${check.evidence}`);
      if (existsSync(evidenceFile)) {
        const rule = evidenceRules[check.id as LiveDriveCheckId];
        const fileSize = statSync(evidenceFile).size;
        expect(rule.extensions.includes(extname(check.evidence).toLowerCase()), `Live Drive check ${check.id} evidence must use one of: ${rule.extensions.join(", ")}.`);
        expect(fileSize >= rule.minBytes, `Live Drive check ${check.id} evidence file must be at least ${rule.minBytes} bytes.`);
      }
    }
  }

  for (const id of requiredChecks) {
    expect(seen.has(id), `Missing live Drive verification check: ${id}`);
  }
}

const tagsAtHead = execFileSync("git", ["tag", "--points-at", "HEAD"], { cwd: root, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
for (const tag of [
  "module/app",
  "module/background",
  "module/branding",
  "module/content",
  "module/docs",
  "module/drive",
  "module/editor",
  "module/export",
  "module/options",
  "module/preview",
  "module/release",
  "module/theme",
  "module/ui"
]) {
  expect(tagsAtHead.includes(tag), `Required module tag must point at HEAD: ${tag}`);
}

if (process.env.MARKDRIVE_REQUIRE_V1_TAG === "1") {
  expect(tagsAtHead.includes("v1.0.0"), "v1.0.0 must point at HEAD when MARKDRIVE_REQUIRE_V1_TAG=1.");
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Release readiness evidence passed.");

async function readJson<T>(path: string, missingMessage: string): Promise<T | undefined> {
  if (!existsSync(path)) {
    failures.push(missingMessage);
    return undefined;
  }

  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch (error) {
    failures.push(`${path} must contain valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validIsoDate(value: unknown): value is string {
  return nonEmpty(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

function notFuture(value: unknown): boolean {
  return validIsoDate(value) && Date.parse(value) <= Date.now() + 5 * 60 * 1000;
}

function chromeExtensionId(value: unknown): value is string {
  return nonEmpty(value) && /^[a-p]{32}$/.test(value);
}

function emailLike(value: unknown): value is string {
  return nonEmpty(value) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function browserWithVersion(value: unknown): value is string {
  return nonEmpty(value) && /^(Chrome|Microsoft Edge|Edge) \d+\.\d+\.\d+\.\d+$/.test(value);
}

type ExtensionManifest = {
  oauth2?: {
    client_id?: string;
  };
};

type LiveDriveEvidence = {
  clientId: string;
  extensionId: string;
  tester: string;
  browser: string;
  driveAccount: string;
  completedAt: string;
  checks: Array<{
    id: LiveDriveCheckId;
    result: "pass" | "fail";
    completedAt: string;
    evidence: string;
  }>;
};

type LiveDriveCheckId = (typeof requiredChecks)[number];
