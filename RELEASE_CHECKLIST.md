# MarkDrive Release Checklist

## Build

- Run `pnpm install`.
- Run `pnpm generate:icons`.
- Run `pnpm generate:og`.
- Run `pnpm check`.
- Run `MARKDRIVE_OAUTH_CLIENT_ID=<client-id> pnpm lint:oauth` with the production OAuth client id.
- Run `MARKDRIVE_OAUTH_CLIENT_ID=<client-id> pnpm release:verify` after live Drive QA evidence is recorded.

## Chrome Extension QA

- Load `dist/` as an unpacked extension in Chrome.
- Confirm the toolbar action opens MarkDrive.
- Confirm `Ctrl+Shift+M` opens MarkDrive.

## Live Drive Verification

These checks require a real Google account, a production Chrome Extension OAuth client ID, and Drive API v3 enabled.

- Open a `.md` file from Google Drive grid view and verify it opens in MarkDrive.
- Open a `.md` file from Google Drive list view and verify it opens in MarkDrive.
- Right-click a `.md` file in Google Drive and verify "Open with MarkDrive" opens the same file.
- Edit the opened file, press `Ctrl+S`, and verify the original Drive file modified time updates without creating a duplicate.
- Enable 5 second autosave, edit the file, and verify autosave updates the original Drive file.
- Create an external Drive edit, save from MarkDrive, and verify the conflict modal offers Keep Mine, Keep Drive, and Save as Copy.
- Use Vim mode and `:w`, then verify the original Drive file saves in place.
- Create a new `.md` file in the current Drive folder from MarkDrive.
- Use the Drive browser folder tree to search, open, rename, and trash Markdown files only.
- Paste and drag an image, then verify it uploads into `MarkDrive Images` and inserts a direct Drive image reference.
- Export Markdown and verify the downloaded `.md` matches the editor contents.
- Export self-contained HTML and verify highlighted code, frontmatter header, and ToC render offline.
- Print to PDF and verify serif body text, page numbers, ToC, frontmatter header, and highlighted code.
- Toggle Dark, Light, Dracula, Nord, and Solarized themes and verify editor, preview, and UI all update.
- Toggle split, editor-only, preview-only, soft wrap, fullscreen, find and replace, and unsaved changes guard.

## Store Submission

- Use `STORE_LISTING.md` for listing copy and permission rationale.
- Use `PRIVACY.md` as the privacy policy source.
- Upload `public/og-image.png` and generated icons as promotional assets where applicable.
- Confirm the package does not include source maps or remote font URLs.
- Tag `v1.0.0` only after every live Drive verification item above passes.

## Live Evidence File

Record live QA in `release/live-drive-verification.json`. The file must include the production `clientId`, loaded 32-character Chrome `extensionId`, email-style `tester`, Chrome or Edge `browser` with version, Google account email `driveAccount`, root `completedAt`, and a `checks` array. Each check must have `result` set to `pass`, a strict UTC ISO `completedAt` timestamp that is not after the root completion time, and a repository-relative evidence file under `output/live` that exists. Screenshots must be PNG, JPG, JPEG, or WebP files of at least 10 KB. Markdown export evidence must be `.md` or `.txt` and at least 100 bytes. HTML export evidence must be `.html` or a screenshot and at least 1 KB. PDF export evidence must be `.pdf` and at least 1 KB.

Required check IDs:

- `drive-grid-open`
- `drive-list-open`
- `drive-context-open`
- `ctrl-s-save-in-place`
- `autosave-in-place`
- `conflict-modal`
- `vim-w-save`
- `new-file-current-folder`
- `drive-browser`
- `image-upload`
- `export-markdown`
- `export-html`
- `export-pdf`
- `themes`
- `layout-and-guards`
