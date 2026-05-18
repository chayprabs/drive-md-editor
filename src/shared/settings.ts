import type { MarkDriveSettings } from "./types";

export const defaultSettings: MarkDriveSettings = {
  theme: "dark",
  autosaveInterval: 5000,
  vimMode: false,
  softWrap: true,
  lastFolderId: null,
  onboardingComplete: false
};

const storageKey = "markdrive.settings";

export async function loadSettings(): Promise<MarkDriveSettings> {
  const stored = await chrome.storage.local.get(storageKey);
  return { ...defaultSettings, ...(stored[storageKey] as Partial<MarkDriveSettings> | undefined) };
}

export async function saveSettings(settings: MarkDriveSettings): Promise<void> {
  await chrome.storage.local.set({ [storageKey]: settings });
}

export async function updateSettings(update: Partial<MarkDriveSettings>): Promise<MarkDriveSettings> {
  const current = await loadSettings();
  const next = { ...current, ...update };
  await saveSettings(next);
  return next;
}
