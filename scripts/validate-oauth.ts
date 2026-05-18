import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const clientId = process.env.MARKDRIVE_OAUTH_CLIENT_ID?.trim();
const fallbackClientId = "markdrive-unconfigured.apps.googleusercontent.com";

if (!clientId || !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
  console.error("MARKDRIVE_OAUTH_CLIENT_ID must be set to a Google OAuth client id before release.");
  process.exit(1);
}

if (clientId === fallbackClientId) {
  console.error("MARKDRIVE_OAUTH_CLIENT_ID must not use the development fallback client id.");
  process.exit(1);
}

const manifest = await readBuiltManifest();
const manifestClientId = manifest.oauth2?.client_id;

if (manifestClientId !== clientId) {
  console.error("dist/manifest.json OAuth client id must match MARKDRIVE_OAUTH_CLIENT_ID. Run pnpm build with the release client id.");
  process.exit(1);
}

if (manifestClientId === fallbackClientId) {
  console.error("dist/manifest.json must not contain the development fallback client id.");
  process.exit(1);
}

console.log("OAuth client id is release-ready.");

interface BuiltManifest {
  oauth2?: {
    client_id?: string;
  };
}

async function readBuiltManifest(): Promise<BuiltManifest> {
  const path = resolve(import.meta.dirname, "..", "dist", "manifest.json");
  try {
    return JSON.parse(await readFile(path, "utf8")) as BuiltManifest;
  } catch {
    console.error("dist/manifest.json is missing or unreadable. Run pnpm build before release OAuth validation.");
    process.exit(1);
  }
}
