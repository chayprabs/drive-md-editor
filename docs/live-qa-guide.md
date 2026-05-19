# MarkDrive Live Google Drive QA Guide

Complete this checklist in Chrome with a **production Chrome Extension OAuth client id** and a real Google account. Save evidence under `output/live/`, then fill `release/live-drive-verification.json`.

Do not commit fake screenshots, placeholder exports, or copied template JSON as real evidence. `pnpm release:verify` rejects example addresses, template paths, and missing files.

## Before you start

1. Finish [oauth-setup.md](./oauth-setup.md).
2. Rebuild with the production client id and reload the unpacked extension.
3. Create the evidence folder:

```powershell
cd C:\Users\chait\OneDrive\Desktop\google-drive-md-editor
New-Item -ItemType Directory -Force -Path output/live | Out-Null
```

4. Generate a blank evidence manifest scaffold:

```powershell
pnpm generate:live-evidence
```

That writes `release/live-drive-verification.example.json`. Copy it to `release/live-drive-verification.json` only after you replace every placeholder with real values and real files.

## Evidence rules

| Check type | Allowed files | Minimum size |
| --- | --- | --- |
| Screenshot checks | `.png`, `.jpg`, `.jpeg`, `.webp` | 10 KB |
| Markdown export | `.md` or `.txt` | 100 bytes |
| HTML export | `.html` or screenshot types | 1 KB |
| PDF export | `.pdf` | 1 KB |

Use repository-relative paths such as `output/live/drive-grid-open.png`.

Timestamps must be strict UTC ISO strings like `2026-05-20T14:30:00.000Z`.

## Checklist mapped to evidence ids

### `drive-grid-open`

1. Open Google Drive in **grid** view.
2. Click a `.md` file.
3. Confirm MarkDrive opens the same file.
4. Save screenshot as `output/live/drive-grid-open.png`.

### `drive-list-open`

1. Switch Drive to **list** view.
2. Open a `.md` file into MarkDrive.
3. Save screenshot as `output/live/drive-list-open.png`.

### `drive-context-open`

1. Right-click a `.md` file in Drive.
2. Choose **Open with MarkDrive**.
3. Confirm the same file opens.
4. Save screenshot as `output/live/drive-context-open.png`.

### `ctrl-s-save-in-place`

1. Open an existing Drive `.md` file.
2. Edit content.
3. Press `Ctrl+S`.
4. Refresh Drive and confirm the same file id updated without a duplicate.
5. Save screenshot showing the updated modified time as `output/live/ctrl-s-save-in-place.png`.

### `autosave-in-place`

1. In MarkDrive options, set autosave to **5 seconds**.
2. Edit an opened Drive file and wait for autosave.
3. Confirm the original Drive file updated.
4. Save screenshot as `output/live/autosave-in-place.png`.

### `conflict-modal`

1. Open a Drive file in MarkDrive.
2. Edit the same file externally in Drive or another client.
3. Save from MarkDrive and confirm the conflict modal shows **Keep Mine**, **Keep Drive**, and **Save as Copy**.
4. Save screenshot as `output/live/conflict-modal.png`.

### `vim-w-save`

1. Enable Vim mode in options.
2. Open a Drive file, edit, run `:w`.
3. Confirm the original Drive file saved in place.
4. Save screenshot as `output/live/vim-w-save.png`.

### `new-file-current-folder`

1. Browse to a Drive folder in MarkDrive.
2. Create a new `.md` file there.
3. Confirm the file appears in that folder in Drive.
4. Save screenshot as `output/live/new-file-current-folder.png`.

### `drive-browser`

1. Use the Drive sidebar to search, open, rename, and trash Markdown files.
2. Save screenshot as `output/live/drive-browser.png`.

### `image-upload`

1. Paste or drag an image into the editor.
2. Confirm upload into `MarkDrive Images` in the current folder.
3. Confirm the markdown contains a direct Drive image reference.
4. Save screenshot as `output/live/image-upload.png`.

### `export-markdown`

1. Export Markdown from the toolbar.
2. Save the downloaded file to `output/live/export-markdown.md`.

### `export-html`

1. Export HTML from the toolbar.
2. Save the downloaded file to `output/live/export-markdown.html` or capture a screenshot of the opened export.

### `export-pdf`

1. Export PDF via print.
2. Save the PDF to `output/live/export-markdown.pdf`.

### `themes`

1. Toggle Dark, Light, Dracula, Nord, and Solarized.
2. Confirm editor, preview, and UI chrome all update.
3. Save screenshot as `output/live/themes.png`.

### `layout-and-guards`

1. Toggle split, editor-only, preview-only, soft wrap, fullscreen, and find/replace.
2. Attempt to leave with unsaved changes and confirm the guard appears.
3. Save screenshot as `output/live/layout-and-guards.png`.

## Finish the evidence file

1. Copy `release/live-drive-verification.example.json` to `release/live-drive-verification.json`.
2. Replace every placeholder field with real values:
   - `clientId`: production OAuth client id
   - `extensionId`: loaded MarkDrive extension id from `chrome://extensions`
   - `tester`: your real email
   - `browser`: for example `Chrome 136.0.7103.114`
   - `driveAccount`: Google account email used for QA
   - `completedAt`: UTC ISO timestamp for the overall run
3. Set each check `result` to `pass`, set per-check `completedAt`, and point `evidence` to the real files above.

## Verify release readiness

```powershell
$env:MARKDRIVE_OAUTH_CLIENT_ID = Read-Host "Chrome Extension OAuth client ID"
pnpm release:verify
```

If verification fails, read the error list literally. Fix missing files, wrong timestamps, mismatched client ids, or placeholder values before tagging a release.
