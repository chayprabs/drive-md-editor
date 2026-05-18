import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { RotateCcw } from "lucide-react";
import { sendMessage } from "../shared/messages";
import { defaultSettings } from "../shared/settings";
import type { AutosaveInterval, MarkDriveSettings, ThemeName } from "../shared/types";
import "../app/styles.css";

function Options(): React.ReactElement {
  const [settings, setSettings] = useState<MarkDriveSettings>(defaultSettings);
  const [error, setError] = useState<string | null>(null);
  const settingsRef = useRef<MarkDriveSettings>(defaultSettings);

  useEffect(() => {
    void sendMessage({ type: "settings:get" }).then((response) => {
      if (response.ok && "settings" in response) {
        settingsRef.current = response.settings;
        setSettings(response.settings);
        setError(null);
        return;
      }
      if (!response.ok) setError(response.message);
    }).catch((failure: unknown) => {
      setError(failure instanceof Error ? failure.message : "Settings failed to load.");
    });
  }, []);

  async function update(update: Partial<MarkDriveSettings>): Promise<void> {
    const previous = settingsRef.current;
    const next = { ...settingsRef.current, ...update };
    settingsRef.current = next;
    setSettings(next);
    setError(null);
    try {
      const response = await sendMessage({ type: "settings:update", settings: next });
      if (response.ok && "settings" in response) {
        settingsRef.current = response.settings;
        setSettings(response.settings);
        return;
      }
      settingsRef.current = previous;
      setSettings(previous);
      if (!response.ok) setError(response.message);
    } catch (failure) {
      settingsRef.current = previous;
      setSettings(previous);
      setError(failure instanceof Error ? failure.message : "Settings failed to save.");
    }
  }

  async function reset(): Promise<void> {
    const previous = settingsRef.current;
    settingsRef.current = defaultSettings;
    setSettings(defaultSettings);
    setError(null);
    try {
      const response = await sendMessage({ type: "settings:update", settings: defaultSettings });
      if (response.ok && "settings" in response) {
        settingsRef.current = response.settings;
        setSettings(response.settings);
        return;
      }
      settingsRef.current = previous;
      setSettings(previous);
      if (!response.ok) setError(response.message);
    } catch (failure) {
      settingsRef.current = previous;
      setSettings(previous);
      setError(failure instanceof Error ? failure.message : "Settings failed to reset.");
    }
  }

  return (
    <main className="options-page">
      <h1>MarkDrive Options</h1>
      {error ? <p className="inline-error" role="alert">{error}</p> : null}
      <label>Theme<select value={settings.theme} onChange={(event) => void update({ theme: event.target.value as ThemeName })}>
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="dracula">Dracula</option>
        <option value="nord">Nord</option>
        <option value="solarized">Solarized</option>
      </select></label>
      <label>Autosave<select value={settings.autosaveInterval} onChange={(event) => void update({ autosaveInterval: Number(event.target.value) as AutosaveInterval })}>
        <option value={2000}>2 seconds</option>
        <option value={5000}>5 seconds</option>
        <option value={30000}>30 seconds</option>
        <option value={0}>Off</option>
      </select></label>
      <label className="checkbox"><input type="checkbox" checked={settings.vimMode} onChange={(event) => void update({ vimMode: event.target.checked })} /> Vim mode</label>
      <label className="checkbox"><input type="checkbox" checked={settings.softWrap} onChange={(event) => void update({ softWrap: event.target.checked })} /> Soft wrap</label>
      <label className="checkbox"><input type="checkbox" checked={settings.onboardingComplete} onChange={(event) => void update({ onboardingComplete: event.target.checked })} /> Onboarding complete</label>
      <label>Last Drive folder<input value={settings.lastFolderId ?? ""} onChange={(event) => void update({ lastFolderId: event.target.value.trim() || null })} /></label>
      <button className="settings-reset" onClick={() => void reset()}><RotateCcw size={14} /> Reset settings</button>
    </main>
  );
}

createRoot(document.getElementById("options-root")!).render(<Options />);
