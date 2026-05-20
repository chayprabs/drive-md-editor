# MarkDrive File Type Support

MarkDrive supports a focused set of text-like Google Drive files. Markdown remains the primary product.

## Supported today

| Extension | Mode | Preview | Notes |
| --- | --- | --- | --- |
| `.md` | Markdown | Yes | Default new file type |
| `.markdown` | Markdown | Yes | Same editor and preview as `.md` |
| `.mdown` | Markdown | Yes | Same editor and preview as `.md` |
| `.txt` | Plain text | No | Source-only editing; exports as `.txt` |
| `.json` | JSON | No | Syntax highlighting; invalid JSON is shown in the status bar |

All supported types save in place to the same Drive file ID with conflict detection unchanged.

## Intentionally not supported

### HTML (`.html`)

HTML preview would require a carefully sandboxed renderer. MarkDrive does not ship an HTML preview because unsanitized HTML in an extension preview pane would recreate XSS risk against the user's Google account session.

HTML may be added later only if preview can be isolated with a strict allowlist sanitizer and invariant tests. Until then, HTML files are not listed in Drive or opened from Drive interception.

### Other types

Binary formats, Google Docs native files, and code files without an explicit extension policy remain out of scope.

## Testing

1. Create `notes.markdown`, `draft.mdown`, `readme.txt`, and `config.json` in a Drive folder.
2. Confirm each appears in the MarkDrive Drive browser.
3. Open each from Drive grid/list and from the content script click handler.
4. Edit and `Ctrl+S`; verify the same Drive file updates without duplication.
5. For `.json`, introduce a syntax error and confirm the status bar reports invalid JSON.
6. For `.txt`, confirm preview controls are hidden and export downloads `.txt` bytes.
