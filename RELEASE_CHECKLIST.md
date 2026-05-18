# MarkDrive Release Checklist

## Build

- Run `pnpm install`.
- Run `pnpm generate:icons`.
- Run `pnpm generate:og`.
- Run `pnpm check`.
- Run `MARKDRIVE_OAUTH_CLIENT_ID=<client-id> pnpm lint:oauth` with the production OAuth client id.

## Chrome Extension QA

- Load `dist/` as an unpacked extension in Chrome.
- Confirm the toolbar action opens MarkDrive.
- Confirm `Ctrl+Shift+M` opens MarkDrive.
- Open a `.md` file from Google Drive.
- Save a changed file and verify Drive modified time updates.
- Create, rename, and trash a Markdown file from the Drive browser.
- Paste an image and verify it uploads into the Drive image folder.
- Toggle split, editor, preview, soft wrap, and all themes.
- Verify find and replace, export Markdown, export HTML, and print to PDF.

## Store Submission

- Use `STORE_LISTING.md` for listing copy and permission rationale.
- Use `PRIVACY.md` as the privacy policy source.
- Upload `public/og-image.png` and generated icons as promotional assets where applicable.
- Confirm the package does not include source maps or remote font URLs.
- Tag the release after the final verification commit.
