export function extractDriveFileIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const pathMatch = /\/file\/d\/([^/?#]+)/.exec(parsed.pathname);
    return cleanDriveId(pathMatch?.[1] ?? parsed.searchParams.get("id"));
  } catch {
    const match = /\/file\/d\/([^/?#&]+)/.exec(url) ?? /[?&]id=([^&#]+)/.exec(url);
    return cleanDriveId(match?.[1]);
  }
}

export function extractDriveFolderIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const match = /\/folders\/([^/?#]+)/.exec(parsed.pathname);
    return cleanDriveId(match?.[1]);
  } catch {
    const match = /\/folders\/([^/?#&]+)/.exec(url);
    return cleanDriveId(match?.[1]);
  }
}

export function isDriveResourceId(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,100}$/.test(value);
}

export function cleanDriveId(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const decoded = decodeURIComponent(value.trim()).trim();
    return isDriveResourceId(decoded) ? decoded : null;
  } catch {
    const trimmed = value.trim();
    return isDriveResourceId(trimmed) ? trimmed : null;
  }
}
