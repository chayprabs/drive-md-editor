# MarkDrive Release Handoff Notes

These notes capture the final setup, design direction, and local checkout steps discussed before release.

## Current State

- The codebase builds and passes the local validation suite.
- `main` has moved to additive commits from this point forward.
- The release is not tagged `v1.0.0` yet because production OAuth and live Google Drive verification are still missing.
- The remaining blocker is not normal feature coding. It is production OAuth setup plus browser-based Google Drive QA evidence.

## What Is Needed To Finish Release

1. Create or choose a Google Cloud project for MarkDrive.
2. Enable Google Drive API in that project.
3. Configure the OAuth consent screen.
4. Load the unpacked extension once and copy its Chrome extension ID.
5. Create a Chrome Extension OAuth client ID using that extension ID.
6. Rebuild MarkDrive with `MARKDRIVE_OAUTH_CLIENT_ID`.
7. Complete live Google Drive QA.
8. Save evidence under `output/live/`.
9. Create `release/live-drive-verification.json`.
10. Run `pnpm release:verify`.
11. If verification passes, tag and push `v1.0.0`.

## OAuth Setup Values Needed

No client secret is needed.

Send or record these values:

```text
MARKDRIVE_OAUTH_CLIENT_ID = <client-id>.apps.googleusercontent.com
Chrome extension ID = <32 lowercase letters from chrome://extensions>
Tester Google account = <email used for live QA>
```

The manifest uses these scopes:

```text
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.metadata.readonly
```

## Google Cloud Setup Steps

1. Open Google Cloud Console.
2. Create or choose a project, for example `MarkDrive Production`.
3. Go to `APIs & Services -> Library`.
4. Enable `Google Drive API`.
5. Go to `APIs & Services -> OAuth consent screen`.
6. Set app name to `MarkDrive`.
7. Add user support and developer contact emails.
8. Use `External` unless this is only for a Workspace organization.
9. Add yourself as a test user if the app stays in testing.
10. Add the two Drive scopes listed above.
11. Go to `APIs & Services -> Credentials`.
12. Choose `Create Credentials -> OAuth client ID`.
13. Select application type `Chrome Extension`.
14. Paste the extension ID from `chrome://extensions`.
15. Copy the generated client ID.

## Local Checkout Steps

From PowerShell:

```powershell
cd C:\Users\chait\OneDrive\Desktop\google-drive-md-editor
pnpm install
$env:MARKDRIVE_OAUTH_CLIENT_ID = "markdrive-unconfigured.apps.googleusercontent.com"
pnpm build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select `C:\Users\chait\OneDrive\Desktop\google-drive-md-editor\dist`.
5. Confirm MarkDrive appears.
6. Copy the extension ID shown on the MarkDrive card.

The temporary OAuth client ID is only for inspecting the UI. Drive auth, save, image upload, and Drive browser need the real Chrome Extension OAuth client ID.

## UI Direction

MarkDrive should feel like a quiet, professional Drive-native Markdown workbench.

Design target:

> A Drive-native Markdown workbench: compact toolbar, left utility sidebar, serious CodeMirror editor, refined document preview, subtle teal identity.

The UI should be:

- Editor-first.
- Dense but calm.
- Fast to scan.
- Utility-oriented.
- Not a marketing page.
- Not card-heavy.
- Not decorative.

Main layout:

```text
toolbar: MarkDrive, file/edit/view/export/options actions
left rail: Outline / Drive / Frontmatter tabs
sidebar: selected utility panel
main area: editor and preview split panes
status bar: filename, words, chars, reading time, cursor, save state
```

Toolbar:

- 40px tall.
- 28x28 icon buttons.
- New, Save, Bold, Italic, Link, Find.
- Split, editor-only, preview-only, soft wrap, theme.
- Export Markdown, HTML, PDF, Options.
- Collapse lower-priority actions into `...` on narrow widths.

Sidebar:

- Outline: heading tree with jump-to-line.
- Drive: folder path, search, `.md` file list, folder tree, new file, rename, trash.
- Frontmatter: title, date, tags, author, draft.

Editor:

- CodeMirror-focused.
- JetBrains Mono.
- Clear line numbers.
- Subtle active line.
- Teal selection/caret accent.

Preview:

- Lora/serif body.
- Polished document reading feel.
- Code highlighting.
- Mermaid and KaTeX.
- Callouts for note, warning, tip, danger.
- Clickable task checkboxes.

Themes:

- Dark: `#0d1117` background and `#2DD4BF` accent.
- Light.
- Dracula.
- Nord.
- Solarized.

All theme color should flow through CSS custom properties.

## Live QA Checklist

Capture evidence for:

1. Drive grid open.
2. Drive list open.
3. Drive context open.
4. Ctrl+S save in-place.
5. Autosave in-place.
6. Conflict modal.
7. Vim `:w` save.
8. New file in current folder.
9. Drive browser.
10. Image upload.
11. Markdown export.
12. HTML export.
13. PDF export.
14. Themes.
15. Layout and unsaved-change guards.

Screenshots/files should go under:

```text
output/live/
```

