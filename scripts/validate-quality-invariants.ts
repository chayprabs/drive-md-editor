import { cleanDriveId, isDriveResourceId } from "../src/shared/drive-url";
import { renderMarkdown } from "../src/shared/markdown";
import { summarizeSearch } from "../src/shared/search";

const failures: string[] = [];

const strikethroughHtml = renderMarkdown("~~removed~~");
expect(strikethroughHtml.includes("<del>") && strikethroughHtml.includes("removed"), "Markdown renderer must output GFM strikethrough as <del>.");
expect(!strikethroughHtml.includes("<s>"), "Markdown renderer must not leave strikethrough as <s>.");

expect(isDriveResourceId("abcdefghijklmnopqrstuvwxyz"), "Drive resource id validation must accept real-looking ids.");
expect(cleanDriveId("  abcdefghijklmnopqrstuvwxyz  ") === "abcdefghijklmnopqrstuvwxyz", "Drive id cleanup must trim valid ids.");
expect(cleanDriveId("not valid id!") === null, "Drive id cleanup must reject malformed ids.");
expect(cleanDriveId("") === null, "Drive id cleanup must reject empty ids.");

expect(summarizeSearch("alpha beta", { query: "(", caseSensitive: false, wholeWord: false, regex: true }).invalid, "Search summary must flag invalid regex patterns.");
expect(summarizeSearch("alpha beta", { query: "alpha", caseSensitive: false, wholeWord: false, regex: false }).matches === 1, "Search summary must count literal matches.");

const chromeMock = createChromeStorageMock();
const previousChrome = globalThis.chrome;
globalThis.chrome = chromeMock as typeof chrome;

try {
  const { defaultSettings, loadSettings, saveSettings, updateSettings } = await import("../src/shared/settings");

  expect(defaultSettings.theme === "dark", "Default settings must keep a known theme.");

  await saveSettings({
    ...defaultSettings,
    theme: "dark",
    autosaveInterval: 5000,
    vimMode: false,
    softWrap: true,
    lastFolderId: null,
    onboardingComplete: false
  });
  const loaded = await loadSettings();
  expect(loaded.theme === "dark", "Settings persistence must round-trip valid settings.");

  await chromeMock.storage.local.set({
    "markdrive.settings": {
      theme: "not-a-theme",
      autosaveInterval: 999,
      vimMode: "yes",
      softWrap: "no",
      lastFolderId: "!!!",
      onboardingComplete: "done"
    }
  });
  const normalized = await loadSettings();
  expect(normalized.theme === defaultSettings.theme, "Settings load must fall back to the default theme for invalid stored values.");
  expect(normalized.autosaveInterval === defaultSettings.autosaveInterval, "Settings load must fall back to the default autosave interval for invalid stored values.");
  expect(normalized.vimMode === defaultSettings.vimMode, "Settings load must fall back for invalid vimMode values.");
  expect(normalized.softWrap === defaultSettings.softWrap, "Settings load must fall back for invalid softWrap values.");
  expect(normalized.lastFolderId === null, "Settings load must clear invalid lastFolderId values.");
  expect(normalized.onboardingComplete === defaultSettings.onboardingComplete, "Settings load must fall back for invalid onboardingComplete values.");

  const updated = await updateSettings({ theme: "nord", autosaveInterval: 0 });
  expect(updated.theme === "nord" && updated.autosaveInterval === 0, "Settings update must persist supported theme and autosave values.");
} finally {
  globalThis.chrome = previousChrome;
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Quality runtime invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}

function createChromeStorageMock(): { storage: { local: { get: (key: string) => Promise<Record<string, unknown>>; set: (value: Record<string, unknown>) => Promise<void> } } } {
  let store: Record<string, unknown> = {};
  return {
    storage: {
      local: {
        async get(key: string) {
          return { [key]: store[key] };
        },
        async set(value: Record<string, unknown>) {
          store = { ...store, ...value };
        }
      }
    }
  };
}
