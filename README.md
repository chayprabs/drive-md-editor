# MarkDrive

Your Markdown, native in Drive.

MarkDrive is a Manifest V3 Chrome Extension for editing, previewing, and saving `.md` files directly in Google Drive.

## Development

```bash
pnpm install
pnpm generate:icons
pnpm build
pnpm check
```

`pnpm check` runs the build, bundle limits, marker scan, and invariant scripts (including `lint:quality` and `lint:offline`).

Load `dist` as an unpacked extension from `chrome://extensions`.

File type support (Markdown variants, plain text, JSON): [docs/file-type-support.md](./docs/file-type-support.md)

## Release Verification

Production release requires:

1. A **Chrome Extension** OAuth client id from Google Cloud Console.
2. Live Google Drive QA evidence under `output/live/`.
3. A completed `release/live-drive-verification.json`.

Start here:

- [docs/oauth-setup.md](./docs/oauth-setup.md)
- [docs/live-qa-guide.md](./docs/live-qa-guide.md)
- [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)

Generate the evidence scaffold:

```powershell
pnpm generate:live-evidence
```

After live Drive QA is complete:

```powershell
$env:MARKDRIVE_OAUTH_CLIENT_ID = Read-Host "Chrome Extension OAuth client ID"
pnpm release:verify
```

## OAuth Setup (summary)

1. Open Google Cloud Console and create or select a project.
2. Enable Google Drive API v3.
3. Configure the OAuth consent screen and add the Drive scopes MarkDrive uses.
4. Load the unpacked extension once and copy its Chrome extension ID.
5. Create an OAuth client with application type **Chrome Extension** using that extension ID.
6. Rebuild with `MARKDRIVE_OAUTH_CLIENT_ID` set to the Chrome Extension client ID.

Do **not** create a Web application or Desktop OAuth client. MarkDrive does not use a client secret.

Full steps: [docs/oauth-setup.md](./docs/oauth-setup.md)

```powershell
$env:MARKDRIVE_OAUTH_CLIENT_ID = Read-Host "Chrome Extension OAuth client ID"
pnpm build
pnpm lint:oauth
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
- `app`: Editor, preview, Drive browser, exports, settings sync.
- `options`: Theme, autosave, Vim mode, onboarding.
