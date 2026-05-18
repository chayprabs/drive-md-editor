import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const appSource = await readFile(resolve(root, "src/app/main.tsx"), "utf8");
const settingsSource = await readFile(resolve(root, "src/shared/settings.ts"), "utf8");
const typesSource = await readFile(resolve(root, "src/shared/types.ts"), "utf8");
const optionsSource = await readFile(resolve(root, "src/options/main.tsx"), "utf8");
const backgroundSource = await readFile(resolve(root, "src/background/index.ts"), "utf8");
const messagesSource = await readFile(resolve(root, "src/shared/messages.ts"), "utf8");
const failures: string[] = [];

const settingKeys = ["theme", "autosaveInterval", "vimMode", "softWrap", "lastFolderId", "onboardingComplete"];
const themes = ["dark", "light", "dracula", "nord", "solarized"];
const autosaveValues = ["2000", "5000", "30000", "0"];

expect(typesSource.includes("export interface MarkDriveSettings"), "Settings type must be explicit.");
expect(settingsSource.includes("const storageKey = \"markdrive.settings\""), "Settings must use the MarkDrive storage key.");
expect(settingsSource.includes("chrome.storage.local.get(storageKey)"), "Settings must load from chrome.storage.local.");
expect(settingsSource.includes("chrome.storage.local.set({ [storageKey]: normalized })"), "Settings saves must persist normalized values.");
expect(settingsSource.includes("normalizeSettings(stored[storageKey])"), "Settings loads must normalize stored values.");
expect(settingsSource.includes("normalizeSettings({ ...current, ...update })"), "Settings updates must normalize merged values.");
expect(settingsSource.includes("function isTheme(value: unknown): value is ThemeName"), "Settings must validate theme values at runtime.");
expect(settingsSource.includes("themes.includes(value as ThemeName)"), "Settings must only accept known themes.");
expect(settingsSource.includes("function isAutosaveInterval(value: unknown): value is AutosaveInterval"), "Settings must validate autosave intervals at runtime.");
expect(settingsSource.includes("autosaveIntervals.includes(value as AutosaveInterval)"), "Settings must only accept supported autosave intervals.");
expect(settingsSource.includes("typeof item.vimMode === \"boolean\""), "Settings must validate vimMode as a boolean.");
expect(settingsSource.includes("typeof item.softWrap === \"boolean\""), "Settings must validate softWrap as a boolean.");
expect(settingsSource.includes("typeof item.onboardingComplete === \"boolean\""), "Settings must validate onboardingComplete as a boolean.");
expect(settingsSource.includes("import { cleanDriveId } from \"./drive-url\";"), "Settings must share Drive id cleanup.");
expect(settingsSource.includes("lastFolderId: cleanDriveId(item.lastFolderId)"), "Settings must normalize or clear lastFolderId.");
expect(backgroundSource.includes("request.type === \"settings:get\""), "Background must route settings:get.");
expect(backgroundSource.includes("request.type === \"settings:update\""), "Background must route settings:update.");
expect(backgroundSource.includes("function isSettingsUpdate(value: unknown): value is Partial<MarkDriveSettings>"), "Background must validate settings updates before persistence.");
expect(backgroundSource.includes("const validSettingsKeys = new Set([\"theme\", \"autosaveInterval\", \"vimMode\", \"softWrap\", \"lastFolderId\", \"onboardingComplete\"])"), "Background settings validation must reject unknown settings keys.");
expect(backgroundSource.includes("validSettingsThemes.has(record.theme)") && backgroundSource.includes("validSettingsAutosaveIntervals.has(record.autosaveInterval)"), "Background settings validation must reject invalid settings values.");
expect(backgroundSource.includes("record.lastFolderId === undefined || optionalDriveId(record.lastFolderId)"), "Background settings validation must validate optional lastFolderId.");
expect(messagesSource.includes("const validThemes = new Set([\"dark\", \"light\", \"dracula\", \"nord\", \"solarized\"])"), "Runtime settings responses must only accept known themes.");
expect(messagesSource.includes("const validAutosaveIntervals = new Set([2000, 5000, 30000, 0])"), "Runtime settings responses must only accept supported autosave intervals.");
expect(messagesSource.includes("validThemes.has(record.theme)") && messagesSource.includes("validAutosaveIntervals.has(record.autosaveInterval)"), "Shared message validation must reject malformed settings responses.");

for (const key of settingKeys) {
  expect(typesSource.includes(`${key}:`), `MarkDriveSettings must include ${key}.`);
  expect(settingsSource.includes(`${key}:`), `defaultSettings must define ${key}.`);
  expect(optionsSource.includes(`settings.${key}`) || optionsSource.includes(`${key}:`), `Options page must expose ${key}.`);
}

for (const theme of themes) {
  expect(optionsSource.includes(`value="${theme}"`), `Options page must expose ${theme} theme.`);
}

for (const value of autosaveValues) {
  expect(optionsSource.includes(`value={${value}}`), `Options page must expose autosave value ${value}.`);
}

expect(optionsSource.includes("settingsRef"), "Options page must use an atomic settings ref for rapid updates.");
expect(optionsSource.includes("sendMessage({ type: \"settings:get\" })"), "Options page must load settings through the background.");
expect(optionsSource.includes("sendMessage({ type: \"settings:update\", settings: next })"), "Options page must persist updates through the background.");
expect(optionsSource.includes("sendMessage({ type: \"settings:update\", settings: defaultSettings })"), "Options page must reset through the background.");
expect(optionsSource.includes("const [error, setError]"), "Options page must track settings failures.");
expect(optionsSource.includes("role=\"alert\""), "Options page settings failures must be announced to assistive technologies.");
expect(optionsSource.includes("settingsRef.current = previous") && optionsSource.includes("setSettings(previous)"), "Options page must roll back optimistic setting changes after failed saves.");
expect(optionsSource.includes("Settings failed to load.") && optionsSource.includes("Settings failed to save.") && optionsSource.includes("Settings failed to reset."), "Options page must show explicit load/save/reset failure messages.");
expect(appSource.includes("title: \"Settings failed to load\""), "Editor settings load failures must show user feedback.");
expect(appSource.includes("title: \"Settings failed to save\""), "Editor settings save failures must show user feedback.");
expect(appSource.includes("const previous = settings") && appSource.includes("setSettings(previous)"), "Editor toolbar settings must roll back optimistic changes after failed saves.");
expect(appSource.includes("describeUnknownError(failure)"), "Editor settings failures must include a useful error detail.");
expect(appSource.includes("}, [pushToast]);"), "Editor settings load effect must include the toast dependency.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Settings invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
