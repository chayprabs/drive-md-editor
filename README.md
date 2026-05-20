# MarkDrive

**Your Markdown, native in Drive.**

MarkDrive is a **Manifest V3 Chrome Extension** that lets you edit, preview, and save text files directly in Google Drive—without leaving the browser. Open a `.md` file from Drive and you get a full workbench: CodeMirror editor, live Markdown preview, frontmatter panel, Drive browser, exports, themes, autosave, conflict handling, and optional Vim mode.

---

## Table of contents

- [Why MarkDrive](#why-markdrive)
- [Features](#features)
- [Supported file types](#supported-file-types)
- [Quick start (use the extension)](#quick-start-use-the-extension)
- [Development](#development)
- [OAuth setup](#oauth-setup)
- [Release verification](#release-verification)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Project structure](#project-structure)
- [Documentation](#documentation)
- [Privacy](#privacy)
- [FAQ](#faq)

---

## Why MarkDrive

Google Drive is great for storage, but its built-in preview for Markdown is read-only. MarkDrive adds a proper editor and preview that writes back to the **same Drive file**—with conflict detection when Drive changes underneath you, offline queuing when the network drops, and exports when you need a copy outside Drive.

---

## Features

| Area | What you get |
| --- | --- |
| **Editing** | CodeMirror 6 with Markdown, JSON, and plain-text modes; soft wrap; find and replace; optional Vim mode (`:w` saves) |
| **Preview** | GFM-style Markdown: task lists, footnotes, emoji, callouts, strikethrough, syntax-highlighted code blocks, Mermaid diagrams, KaTeX math |
| **Frontmatter** | YAML fields: title, date, tags, author, draft—editable in the sidebar |
| **Drive integration** | Open from Drive grid/list; context menu “Open with MarkDrive”; in-app Drive browser (browse, search, rename, trash) |
| **Save model** | `Ctrl+S` and autosave (2s / 5s / 30s / off); saves update the **original file ID**, not a duplicate |
| **Conflicts** | If Drive’s revision changed externally: **Keep Mine**, **Keep Drive**, or **Save as Copy** |
| **Offline** | Queues saves locally and retries when connectivity returns |
| **Images** | Paste or drag images; uploads go to a `MarkDrive Images` folder and insert Drive image links |
| **Export** | Download Markdown; self-contained HTML; print-to-PDF with ToC and frontmatter styling |
| **Themes** | Dark, Light, Dracula, Nord, Solarized—editor, preview, and chrome UI stay in sync |
| **Layouts** | Split, editor-only, preview-only; fullscreen; unsaved-change guard |

---

## Supported file types

| Extension | Mode | Live preview |
| --- | --- | --- |
| `.md`, `.markdown`, `.mdown` | Markdown | Yes |
| `.txt` | Plain text | No (source only) |
| `.json` | JSON | No (syntax highlight + validity in status bar) |

HTML, Google Docs native files, and binary formats are **not** supported today. Details: [docs/file-type-support.md](./docs/file-type-support.md).

---

## Quick start (use the extension)

### End users

1. Install MarkDrive from the Chrome Web Store *(when published)*, **or** load a build from a developer (see [Development](#development)).
2. Sign in with Google when prompted—the extension requests Drive scopes only for files you use through MarkDrive.
3. In Google Drive, open a supported file (e.g. `notes.md`) from the grid, list, or right-click **Open with MarkDrive**.
4. Edit, preview, and press **Ctrl+S** (or enable autosave in options).

Toolbar shortcut: **Ctrl+Shift+M** opens MarkDrive.

### Developers (first run)

```bash
pnpm install
pnpm generate:icons
pnpm build
```

Load `dist` as an unpacked extension from `chrome://extensions` (Developer mode → **Load unpacked**).

For Drive save/auth to work, complete [OAuth setup](#oauth-setup) and rebuild with your real client id.

---

## Development

**Requirements:** Node.js ≥ 20.11, pnpm ≥ 9, Google Chrome or Microsoft Edge.

```bash
pnpm install
pnpm generate:icons
pnpm build
pnpm check
```

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Vite dev server (UI development) |
| `pnpm build` | Typecheck + production build into `dist/` |
| `pnpm check` | Build, bundle limits, marker scan, and invariant scripts |
| `pnpm lint:oauth` | Verify `dist/manifest.json` OAuth client id |
| `pnpm generate:live-evidence` | Scaffold live QA evidence files |

`pnpm check` runs the build, bundle limits, marker scan, and invariant scripts (including quality and offline validators).

After changing code, reload the extension on `chrome://extensions` → **Reload**.

---

## OAuth setup

MarkDrive uses **Chrome Extension OAuth** only. It **does not use a client secret**. Do **not** create a Web application or Desktop OAuth client for this project.

### Summary

1. Open **Google Cloud Console** and create or select a project.
2. **Enable Google Drive API v3**.
3. Configure the **OAuth consent screen** and add the Drive scopes MarkDrive uses (`drive.file`, `drive.metadata.readonly`).
4. Build once with a placeholder id, load `dist` on **chrome://extensions**, and copy the 32-character extension **ID**.
5. Create an OAuth client with application type **Chrome Extension** and that extension ID.
6. Rebuild with your production client id:

```powershell
$env:MARKDRIVE_OAUTH_CLIENT_ID = Read-Host "Chrome Extension OAuth client ID"
pnpm build
pnpm lint:oauth
```

Do **not** create a **Web application** OAuth client. Do **not** create a **Desktop app** OAuth client. MarkDrive does not use a **client secret**.

Full walkthrough: [docs/oauth-setup.md](./docs/oauth-setup.md)

---

## Release verification

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

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| Ctrl+Shift+M | Open MarkDrive (extension command) |
| Ctrl+S | Save to Drive |
| Ctrl+B | Bold selection |
| Ctrl+I | Italic selection |
| Ctrl+K | Link selection |
| Ctrl+Shift+F | Find and replace |
| Ctrl+\\ | Toggle view |
| F11 | Fullscreen |
| :w | Save in Vim mode |

---

## Project structure

MarkDrive is split into Chrome extension surfaces:

- `manifest` — MV3 permissions, Drive host access, OAuth scopes, options, commands.
- `background` — Chrome identity, Drive API v3 file operations, conflict detection, open actions.
- `content` — Google Drive click interception for supported files.
- `app` — Editor, preview, Drive browser, exports, settings sync.
- `options` — Theme, autosave, Vim mode, onboarding.

Stack: TypeScript, React 19, Vite, `@crxjs/vite-plugin`, CodeMirror 6, markdown-it, Mermaid, KaTeX.

---

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/oauth-setup.md](./docs/oauth-setup.md) | Step-by-step Google Cloud OAuth |
| [docs/live-qa-guide.md](./docs/live-qa-guide.md) | Live Drive QA and evidence capture |
| [docs/file-type-support.md](./docs/file-type-support.md) | Supported extensions and testing |
| [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) | Pre-store release checklist |
| [PRIVACY.md](./PRIVACY.md) | Privacy policy source |
| [STORE_LISTING.md](./STORE_LISTING.md) | Chrome Web Store listing copy |

---

## Privacy

MarkDrive sends file content and images to **Google Drive APIs** only when you open, save, create, upload, rename, or trash. Settings, recent files, and offline drafts stay in **local Chrome extension storage**. No ads, no analytics on document content.

See [PRIVACY.md](./PRIVACY.md).

---

## FAQ

### General

**What is MarkDrive?**  
A Chrome extension that edits Markdown (and selected text types) stored in Google Drive, with live preview and in-place save.

**Who is it for?**  
Anyone who keeps notes, docs, or wikis as `.md` files in Drive and wants a real editor instead of preview-only or export-edit-reupload workflows.

**Does it work in Firefox or Safari?**  
No. It is built for Chromium browsers (Chrome, Edge, Brave, etc.) as a Manifest V3 extension.

**Is it free?**  
The project is open source; hosting and Google API usage follow your own Google account quotas.

**Does MarkDrive upload my files to a third-party server?**  
No. Content goes to Google Drive APIs under your account. See [PRIVACY.md](./PRIVACY.md).

---

### Installation and updates

**How do I install it for daily use?**  
Use the Chrome Web Store listing when available, or load `dist/` as an unpacked extension for development ([Quick start](#quick-start-use-the-extension)).

**Why does “Load unpacked” ask for a folder?**  
Point Chrome at the `dist/` directory produced by `pnpm build`, not the repository root.

**How do I update after pulling new code?**  
Run `pnpm build`, then click **Reload** on the MarkDrive card in `chrome://extensions`.

**The extension ID changed—what now?**  
Create a new **Chrome Extension** OAuth client in Google Cloud with the new ID, set `MARKDRIVE_OAUTH_CLIENT_ID`, rebuild, and reload. Old client ids tied to a previous extension ID will not authenticate.

---

### Google Drive and OAuth

**Why do I need Google Cloud setup?**  
Chrome extensions use OAuth2 to call Drive API v3 on your behalf. You must register a **Chrome Extension** client id bound to your extension’s ID.

**Which OAuth client type should I use?**  
**Chrome Extension** only. Do **not** create a Web application or Desktop client.

**Do I need a client secret?**  
No. Chrome Extension OAuth does not use one.

**What scopes does MarkDrive request?**  
`https://www.googleapis.com/auth/drive.file` (files the app creates or opens) and `https://www.googleapis.com/auth/drive.metadata.readonly` (folder browse and metadata).

**Sign-in failed or “needs access”—what should I check?**  
Confirm Drive API is enabled, consent screen test users include your account (if app is in Testing), OAuth client type is Chrome Extension with the correct 32-character id, and you rebuilt with `MARKDRIVE_OAUTH_CLIENT_ID` set.

**Can I use my work Google Workspace account?**  
Yes, if your admin allows the OAuth app and Drive API access. Internal apps may use an Internal consent screen in Cloud Console.

**Why doesn’t save work with the default dev build?**  
An unconfigured placeholder client id is only for UI inspection. Follow [OAuth setup](#oauth-setup) for real Drive read/write.

---

### Opening and saving files

**How do I open a Markdown file from Drive?**  
Click the file in grid or list view (content script opens MarkDrive), use the context menu **Open with MarkDrive**, or browse from the in-app Drive panel.

**Does saving create a new file?**  
No. Manual save (`Ctrl+S`), autosave, and Vim `:w` update the **same** Drive file id.

**What is autosave?**  
Optional intervals: 2 seconds, 5 seconds, 30 seconds, or disabled. Configure in the extension options page.

**What happens if I edit the same file in two places?**  
MarkDrive compares Drive revision metadata. If Drive changed since you opened, you get a conflict modal: **Keep Mine**, **Keep Drive**, or **Save as Copy**.

**What if I’m offline?**  
Saves are queued locally and retried when the network returns. You’ll see offline state in the UI until sync completes.

**Drive is rate-limiting me—why?**  
Heavy autosave or rapid repeated saves can hit Google quotas. The UI shows a cooldown timer; wait and retry.

**The file was deleted in Drive—what does MarkDrive do?**  
You’ll see an error that the file is unavailable; restore from Drive trash or open a different file.

---

### Editor, preview, and Markdown

**What Markdown flavor is supported?**  
GFM-oriented features via markdown-it: tables, task lists, strikethrough (`~~text~~`), footnotes, emoji, superscript/subscript, highlight (`==mark==`), fenced code with highlight.js, admonition-style callouts (`::: note` etc.), Mermaid blocks, and KaTeX math.

**Does preview run scripts from my Markdown?**  
Raw HTML in source is disabled (`html: false` in the renderer). Preview is meant to be safe for untrusted notes you wrote yourself.

**What are frontmatter `tags` in the sidebar?**  
YAML metadata on your document (comma-separated labels), **not** Git tags on GitHub. Unrelated to version control.

**Can I use Vim keybindings?**  
Yes. Enable Vim mode in options; `:w` saves to Drive like `Ctrl+S`.

**How do images work?**  
Paste or drag into the editor. Images upload to a `MarkDrive Images` folder in Drive and insert a Markdown image link using a viewable Drive URL.

**Why don’t Mermaid or math render?**  
Ensure the preview pane is visible and the syntax is valid. Very large diagrams may be slow on low-end machines.

---

### File types and limitations

**Which extensions work?**  
`.md`, `.markdown`, `.mdown`, `.txt`, `.json`. See [docs/file-type-support.md](./docs/file-type-support.md).

**Can I edit `.html` or Google Docs?**  
Not today. HTML preview would need strict sanitization; native Google Docs are out of scope.

**Can I edit `.docx` or PDFs?**  
No. MarkDrive targets plain text-like Drive files only.

**JSON shows “invalid”—is that blocking save?**  
The status bar warns on parse errors; you can still save bytes to Drive if you choose to.

---

### Export and print

**What export formats exist?**  
For Markdown files: download `.md`, export self-contained **HTML**, and **print to PDF** from the preview layout.

**Does HTML export need the network?**  
The export bundles styles and content for offline viewing of that snapshot.

**PDF export looks wrong—tips?**  
Use print preview after the layout settles; very wide tables may need soft wrap or smaller content.

---

### Themes, layout, and UI

**Which themes are available?**  
Dark, Light, Dracula, Nord, and Solarized.

**What view modes exist?**  
Split (editor + preview), editor-only, and preview-only. Toggle with **Ctrl+\\** or the toolbar.

**Where are settings stored?**  
`chrome.storage.local` (theme, autosave, Vim, onboarding, last folder, etc.).

---

### Drive browser and “MarkDrive Images”

**What can the in-app Drive browser do?**  
Browse folders, search supported files, open, rename, and trash Markdown-family files per release QA scope.

**What is the `MarkDrive Images` folder?**  
Default upload target for pasted/dropped images so links stay on Drive.

---

### Development and contributing

**How do I run the full quality gate?**  
`pnpm check` after `pnpm build`.

**Why does `pnpm check` fail on git history?**  
Some merge commits from GitHub PRs are not Conventional Commit format; that lint is strict. Feature code can still build.

**How do I contribute?**  
Fork the repo, branch from `main`, run `pnpm check`, open a PR. Follow existing commit style (`feat(scope): message`) when possible.

**Where is the release checklist?**  
[RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) and [docs/live-qa-guide.md](./docs/live-qa-guide.md).

---

### Releases, tags, and GitHub

**What are Git tags on GitHub?**  
Optional labels on commits (often `v1.0.0` for releases). This repo does **not** require module tags for daily use.

**When should I run `pnpm release:verify`?**  
Before tagging a store release, after OAuth is production-ready and live QA evidence is filled in under `output/live/`.

**Is there a Chrome Web Store listing yet?**  
Use [STORE_LISTING.md](./STORE_LISTING.md) when publishing; until then, distribute via unpacked `dist/` or your own packaging pipeline.

---

### Troubleshooting

| Symptom | Things to try |
| --- | --- |
| Extension won’t load | Run `pnpm build`; select `dist/`; check Chrome error on the extension card |
| OAuth / sign-in loop | New Chrome Extension client id; correct extension ID; consent screen test user |
| File won’t open from Drive | Extension enabled; file extension supported; refresh Drive tab |
| Save does nothing | Network; sign-in; conflict modal dismissed; check offline queue state |
| Preview blank | Toggle preview pane; check for broken Mermaid/KaTeX in source |
| Old UI after git pull | `pnpm build` + Reload on `chrome://extensions` |

For OAuth-specific errors, see [docs/oauth-setup.md](./docs/oauth-setup.md) troubleshooting section.

---

## Repository

**GitHub:** [chayprabs/drive-md-editor](https://github.com/chayprabs/drive-md-editor)

Questions, bugs, and contributions: open an issue on the repository.

---

*MarkDrive — Your Markdown, native in Drive.*
