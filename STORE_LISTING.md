# MarkDrive Chrome Web Store Listing

## Short Description

Edit, preview, and save Markdown files directly in Google Drive.

## Detailed Description

MarkDrive is a focused Markdown editor for Google Drive. Open `.md` files from Drive, edit in a split editor, preview rendered Markdown, and save changes back to Drive without downloading and re-uploading files.

Key features:

- Live Markdown preview with tables, task lists, footnotes, anchors, callouts, Mermaid diagrams, KaTeX math, and syntax highlighting.
- Google Drive save flow with manual save, autosave, offline retry, and conflict resolution.
- Drive browser with folder navigation, breadcrumbs, search, create, rename, and trash actions.
- Editor workflow with line numbers, folding, Vim mode, formatting buttons, find and replace, image paste upload, and HTML paste conversion.
- Export Markdown, HTML, and print-ready PDF.
- Themes for dark, light, Dracula, Nord, and Solarized.

## Permission Rationale

- `identity`: Authenticates with Google so MarkDrive can access files selected through Drive.
- `storage`: Saves local settings, recent files, and queued offline saves.
- `tabs`: Opens the editor from the extension action, command, Drive page, or context menu.
- `alarms`: Supports retry timing for deferred background work.
- `contextMenus`: Adds "Open with MarkDrive" in Google Drive.
- `scripting`: Supports Drive page integration for Markdown file targeting.
- `https://www.googleapis.com/*`: Reads and writes the user's selected Drive files through Google APIs.
- `https://drive.google.com/*`: Detects Markdown files and folders inside the Drive web app.

## Privacy Disclosure

MarkDrive stores settings, recent file metadata, and offline save drafts locally in Chrome extension storage. Markdown file content is sent only to Google Drive APIs for opening, saving, creating files, and uploading pasted images. MarkDrive does not sell user data, show ads, or send document content to any non-Google third-party service.

## Support

Users can report issues through the project repository or the Chrome Web Store support channel.
