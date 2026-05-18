# MarkDrive

Your Markdown, native in Drive.

MarkDrive is a Manifest V3 Chrome Extension for editing, previewing, and saving `.md` files directly in Google Drive.

## Development

```bash
pnpm install
pnpm generate:icons
pnpm build
```

Load `dist` as an unpacked extension from `chrome://extensions`.

## OAuth Setup

1. Open Google Cloud Console and create or select a project.
2. Enable Google Drive API v3.
3. Configure the OAuth consent screen.
4. Create an OAuth client with application type `Chrome Extension`.
5. Use the unpacked extension ID shown in `chrome://extensions`.
6. Build with `MARKDRIVE_OAUTH_CLIENT_ID` set to the Chrome Extension client ID.

```bash
$env:MARKDRIVE_OAUTH_CLIENT_ID="your-client-id.apps.googleusercontent.com"
pnpm build
```

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+S | Save to Drive |
| Ctrl+B | Bold selection |
| Ctrl+I | Italic selection |
| Ctrl+K | Link selection |
| Ctrl+Shift+F | Find and replace |
| Ctrl+\\ | Toggle view |
| F11 | Fullscreen |
| :w | Save in Vim mode |

## Modules

- `manifest`: MV3 permissions, Drive host access, OAuth scopes, options, commands.
- `background`: Chrome identity, Drive API v3 file operations, conflict detection, open actions.
- `content`: Google Drive markdown click interception.
- `app`: CodeMirror editor, markdown preview, sidebar, frontmatter, Drive browser, status, toasts.
- `options`: Persisted user settings through `chrome.storage.local`.
