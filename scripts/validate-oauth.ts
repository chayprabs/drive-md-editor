const clientId = process.env.MARKDRIVE_OAUTH_CLIENT_ID?.trim();

if (!clientId || !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
  console.error("MARKDRIVE_OAUTH_CLIENT_ID must be set to a Google OAuth client id before release.");
  process.exit(1);
}

if (clientId === "markdrive-unconfigured.apps.googleusercontent.com") {
  console.error("MARKDRIVE_OAUTH_CLIENT_ID must not use the development fallback client id.");
  process.exit(1);
}

console.log("OAuth client id is release-ready.");
