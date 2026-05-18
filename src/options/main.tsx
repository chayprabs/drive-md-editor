import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { sendMessage } from "../shared/messages";
import { defaultSettings } from "../shared/settings";
import type { AutosaveInterval, MarkDriveSettings, ThemeName } from "../shared/types";
import "../app/styles.css";

function Options(): React.ReactElement {
  const [settings, setSettings] = useState<MarkDriveSettings>(defaultSettings);

  useEffect(() => {
    void sendMessage({ type: "settings:get" }).then((response) => {
      if (response.ok && "settings" in response) setSettings(response.settings);
    });
  }, []);

  async function update(update: Partial<MarkDriveSettings>): Promise<void> {
    const response = await sendMessage({ type: "settings:update", settings: update });
    if (response.ok && "settings" in response) setSettings(response.settings);
  }

  return (
    <main className="options-page">
      <h1>MarkDrive Options</h1>
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
    </main>
  );
}

createRoot(document.getElementById("options-root")!).render(<Options />);
