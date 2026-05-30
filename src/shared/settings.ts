import type { AutosaveInterval, MarkDriveSettings, ThemeName } from "./types";
import { cleanDriveId } from "./drive-url";

export const defaultSettings: MarkDriveSettings = {
  theme: "light",
  autosaveInterval: 5000,
  vimMode: false,
  softWrap: true,
  lastFolderId: null,
  onboardingComplete: false
};

const storageKey = "markdrive.settings";
const themes: ThemeName[] = ["dark", "light", "dracula", "nord", "solarized"];
const autosaveIntervals: AutosaveInterval[] = [2000, 5000, 30000, 0];

export async function loadSettings(): Promise<MarkDriveSettings> {
  const stored = await chrome.storage.local.get(storageKey);
  return normalizeSettings(stored[storageKey]);
}

export async function saveSettings(settings: MarkDriveSettings): Promise<void> {
  const normalized = normalizeSettings(settings);
  await chrome.storage.local.set({ [storageKey]: normalized });
}

export async function updateSettings(update: Partial<MarkDriveSettings>): Promise<MarkDriveSettings> {
  const current = await loadSettings();
  const next = normalizeSettings({ ...current, ...update });
  await chrome.storage.local.set({ [storageKey]: next });
  return next;
}

function normalizeSettings(value: unknown): MarkDriveSettings {
  const item = value && typeof value === "object" ? value as Partial<MarkDriveSettings> : {};
  return {
    theme: isTheme(item.theme) ? item.theme : defaultSettings.theme,
    autosaveInterval: isAutosaveInterval(item.autosaveInterval) ? item.autosaveInterval : defaultSettings.autosaveInterval,
    vimMode: typeof item.vimMode === "boolean" ? item.vimMode : defaultSettings.vimMode,
    softWrap: typeof item.softWrap === "boolean" ? item.softWrap : defaultSettings.softWrap,
    lastFolderId: cleanDriveId(item.lastFolderId),
    onboardingComplete: typeof item.onboardingComplete === "boolean" ? item.onboardingComplete : defaultSettings.onboardingComplete
  };
}

function isTheme(value: unknown): value is ThemeName {
  return typeof value === "string" && themes.includes(value as ThemeName);
}

function isAutosaveInterval(value: unknown): value is AutosaveInterval {
  return typeof value === "number" && autosaveIntervals.includes(value as AutosaveInterval);
}
