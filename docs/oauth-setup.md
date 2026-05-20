# MarkDrive OAuth Setup

This guide walks through production OAuth for MarkDrive. Follow the steps in order. Do not skip the Chrome Extension client type.

MarkDrive uses **Chrome Extension OAuth** only. You do not need a client secret.

## What you need at the end

Record these values before you rebuild for release:

```text
MARKDRIVE_OAUTH_CLIENT_ID = <your-id>.apps.googleusercontent.com
Chrome extension ID       = <32 lowercase letters from chrome://extensions>
Tester Google account     = <email used for live Drive QA>
```

## What not to do

- Do **not** create a **Web application** OAuth client for MarkDrive.
- Do **not** create a **Desktop app** OAuth client for MarkDrive.
- Do **not** create or store a **client secret**. Chrome extensions do not use one.
- Do **not** reuse the development fallback id `markdrive-unconfigured.apps.googleusercontent.com` for release builds.
- Do **not** tag `v1.0.0` until `pnpm release:verify` passes with real live QA evidence.

## Step 1: Create or choose a Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project, for example `MarkDrive Production`, or select an existing one.

## Step 2: Enable Google Drive API

1. Go to **APIs & Services → Library**.
2. Search for **Google Drive API**.
3. Open it and click **Enable**.

MarkDrive uses Drive API v3 for open, save, create, rename, trash, folder browse, and image upload.

## Step 3: Configure the OAuth consent screen

1. Go to **APIs & Services → OAuth consent screen**.
2. Choose **External** unless this extension is only for one Google Workspace organization.
3. Set **App name** to `MarkDrive`.
4. Add user support and developer contact emails.
5. Add these scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
6. If the app stays in **Testing**, add every Google account that will run live QA as a **Test user**.

## Step 4: Load MarkDrive once and copy the extension ID

You need the extension ID **before** creating the OAuth client.

From PowerShell in the repo:

```powershell
cd C:\Users\chait\OneDrive\Desktop\google-drive-md-editor
pnpm install
$env:MARKDRIVE_OAUTH_CLIENT_ID = "markdrive-unconfigured.apps.googleusercontent.com"
pnpm build
```

Then in Chrome:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `C:\Users\chait\OneDrive\Desktop\google-drive-md-editor\dist`.
5. On the MarkDrive card, copy **ID**. It is exactly 32 lowercase letters (`a` through `p`).

This temporary build is only for reading the extension ID and inspecting UI. Drive auth, save, browser, and image upload require the real Chrome Extension OAuth client id.

## Step 5: Create the Chrome Extension OAuth client

1. Go to **APIs & Services → Credentials**.
2. Click **Create Credentials → OAuth client ID**.
3. Choose application type **Chrome Extension**.
4. Paste the 32-character extension ID from Step 4.
5. Click **Create**.
6. Copy the generated **Client ID**. It ends with `.apps.googleusercontent.com`.

If you do not see **Chrome Extension** as an option, confirm you are creating an OAuth client ID, not an API key or service account.

## Step 6: Rebuild MarkDrive with the production client id

From PowerShell:

```powershell
cd C:\Users\chait\OneDrive\Desktop\google-drive-md-editor
$env:MARKDRIVE_OAUTH_CLIENT_ID = Read-Host "Chrome Extension OAuth client ID"
pnpm build
pnpm lint:oauth
```

Expected result:

- `dist/manifest.json` contains the same client id you entered.
- `pnpm lint:oauth` prints `OAuth client id is release-ready.`

## Step 7: Reload the unpacked extension

1. Return to `chrome://extensions`.
2. Click **Reload** on MarkDrive.
3. Confirm the extension ID did **not** change. If you removed and re-added the unpacked extension, the ID changed and you must create a new Chrome Extension OAuth client for the new ID.

## Step 8: Verify auth in Chrome

1. Open MarkDrive from the toolbar or `Ctrl+Shift+M`.
2. Open a `.md` file from Google Drive or use the Drive browser.
3. Complete Google sign-in when prompted.
4. Save once with `Ctrl+S` and confirm the original Drive file updates.

If auth fails, check:

- Drive API is enabled.
- OAuth consent screen includes your Google account as a test user.
- The OAuth client type is **Chrome Extension**, not Web or Desktop.
- The OAuth client extension ID matches the loaded MarkDrive extension ID exactly.
- You rebuilt after setting `MARKDRIVE_OAUTH_CLIENT_ID`.

## Release commands

After live Drive QA evidence is recorded:

```powershell
$env:MARKDRIVE_OAUTH_CLIENT_ID = Read-Host "Chrome Extension OAuth client ID"
pnpm release:verify
```

See [docs/live-qa-guide.md](./live-qa-guide.md) for the evidence workflow.
