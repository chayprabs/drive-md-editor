import type { ManifestV3Export } from "@crxjs/vite-plugin";

const oauthClientId = process.env.MARKDRIVE_OAUTH_CLIENT_ID ?? "markdrive-unconfigured.apps.googleusercontent.com";

export const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: "MarkDrive",
  short_name: "MarkDrive",
  version: "1.0.0",
  description:
    "Edit, preview, and save .md files directly in Google Drive. Live preview, syntax highlighting, Mermaid, KaTeX, dark mode, seamless Drive sync.",
  icons: {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  action: {
    default_title: "MarkDrive",
    default_icon: {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png"
    }
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: ["https://drive.google.com/drive/*", "https://drive.google.com/file/*"],
      js: ["src/content/drive-interceptor.ts"],
      run_at: "document_idle"
    }
  ],
  options_page: "options.html",
  permissions: ["identity", "storage", "tabs", "alarms", "contextMenus", "scripting"],
  host_permissions: ["https://www.googleapis.com/*", "https://drive.google.com/*"],
  oauth2: {
    client_id: oauthClientId,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.metadata.readonly"
    ]
  },
  commands: {
    "open-markdrive": {
      suggested_key: {
        default: "Ctrl+Shift+M"
      },
      description: "Open MarkDrive"
    }
  },
  web_accessible_resources: [
    {
      resources: ["index.html", "icons/*.png", "icon.svg"],
      matches: ["https://drive.google.com/*"]
    }
  ]
};
