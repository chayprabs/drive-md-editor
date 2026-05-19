import type { DriveFile, DriveFolder, DriveFolderPathItem, OpenDocument } from "../shared/types";
import { normalizeDriveAssetName, normalizeMarkdownFileName } from "../shared/drive-names";
import { isDriveResourceId } from "../shared/drive-url";

const apiBase = "https://www.googleapis.com/drive/v3";
const uploadBase = "https://www.googleapis.com/upload/drive/v3";

export class DriveApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfterMs?: number
  ) {
    super(message);
  }
}

function assertDriveResourceId(fileId: string, label = "Drive file id"): void {
  if (!isDriveResourceId(fileId)) throw new DriveApiError(400, `Invalid ${label}.`);
}

function assertOptionalDriveResourceId(folderId: string | null, label = "Drive folder id"): void {
  if (folderId) assertDriveResourceId(folderId, label);
}

async function request<T>(token: string, input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers
    }
  });

  if (!response.ok) throw await driveErrorFromResponse(response);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getMarkdownFile(token: string, fileId: string): Promise<{ file: DriveFile; markdown: string }> {
  assertDriveResourceId(fileId);
  const fields = "id,name,mimeType,modifiedTime,parents,webViewLink";
  const file = await request<DriveFile>(token, `${apiBase}/files/${fileId}?fields=${encodeURIComponent(fields)}`);
  const contentResponse = await fetch(`${apiBase}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!contentResponse.ok) throw await driveErrorFromResponse(contentResponse);
  return { file, markdown: await contentResponse.text() };
}

export async function saveMarkdownFile(
  token: string,
  fileId: string,
  markdown: string,
  previousModifiedTime: string | null
): Promise<OpenDocument> {
  assertDriveResourceId(fileId);
  const current = await request<DriveFile>(
    token,
    `${apiBase}/files/${fileId}?fields=${encodeURIComponent("id,name,mimeType,modifiedTime,parents")}`
  );
  if (previousModifiedTime && current.modifiedTime !== previousModifiedTime) {
    const drive = await getMarkdownFile(token, fileId);
    throw new DriveApiError(409, JSON.stringify({ modifiedTime: drive.file.modifiedTime, markdown: drive.markdown }));
  }

  const updated = await request<DriveFile>(
    token,
    `${uploadBase}/files/${fileId}?uploadType=media&fields=${encodeURIComponent("id,name,mimeType,modifiedTime,parents")}`,
    {
      method: "PATCH",
      body: markdown,
      headers: { "Content-Type": "text/markdown; charset=utf-8" }
    }
  );

  return {
    fileId: updated.id,
    name: updated.name,
    markdown,
    modifiedTime: updated.modifiedTime,
    folderId: updated.parents?.[0] ?? null,
    localVersion: Date.now()
  };
}

export async function createMarkdownFile(
  token: string,
  name: string,
  markdown: string,
  folderId: string | null
): Promise<OpenDocument> {
  assertOptionalDriveResourceId(folderId);
  const metadata = {
    name: normalizeMarkdownFileName(name),
    mimeType: "text/markdown",
    parents: folderId ? [folderId] : undefined
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([markdown], { type: "text/markdown" }));

  const created = await request<DriveFile>(
    token,
    `${uploadBase}/files?uploadType=multipart&fields=${encodeURIComponent("id,name,mimeType,modifiedTime,parents,webViewLink")}`,
    {
      method: "POST",
      body: form
    }
  );

  return {
    fileId: created.id,
    name: created.name,
    markdown,
    modifiedTime: created.modifiedTime,
    folderId: created.parents?.[0] ?? folderId,
    localVersion: Date.now()
  };
}

export async function listMarkdownFiles(token: string, folderId: string | null, query: string): Promise<DriveFile[]> {
  assertOptionalDriveResourceId(folderId);
  const terms = ["trashed = false", `name contains ${driveQueryLiteral(".md")}`];
  if (folderId) terms.push(`${driveQueryLiteral(folderId)} in parents`);
  if (query.trim()) terms.push(`name contains ${driveQueryLiteral(query.trim())}`);

  const files = await listDriveFiles<DriveFile>(token, new URLSearchParams({
    q: terms.join(" and "),
    spaces: "drive",
    orderBy: "modifiedTime desc",
    pageSize: "50",
    fields: "nextPageToken,files(id,name,mimeType,modifiedTime,parents,webViewLink)"
  }));
  return files.filter((file) => /\.md$/i.test(file.name));
}

export async function listFolders(token: string, folderId: string | null): Promise<DriveFolder[]> {
  assertOptionalDriveResourceId(folderId);
  const parent = folderId ?? "root";
  return listDriveFiles<DriveFolder>(token, new URLSearchParams({
    q: [
      "trashed = false",
      "mimeType = 'application/vnd.google-apps.folder'",
      `${driveQueryLiteral(parent)} in parents`
    ].join(" and "),
    orderBy: "name",
    pageSize: "50",
    fields: "nextPageToken,files(id,name,parents)"
  }));
}

export async function getFolderPath(token: string, folderId: string | null): Promise<DriveFolderPathItem[]> {
  const path: DriveFolderPathItem[] = [{ id: null, name: "My Drive" }];
  if (!folderId) return path;
  assertDriveResourceId(folderId, "Drive folder id");

  const folders: DriveFolder[] = [];
  let currentId: string | undefined = folderId;
  const seen = new Set<string>();
  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const folder: DriveFolder = await request<DriveFolder>(
      token,
      `${apiBase}/files/${currentId}?fields=${encodeURIComponent("id,name,parents")}`
    );
    folders.unshift(folder);
    currentId = folder.parents?.[0];
  }

  return [...path, ...folders.map((folder) => ({ id: folder.id, name: folder.name }))];
}

export async function renameFile(token: string, fileId: string, name: string): Promise<void> {
  assertDriveResourceId(fileId);
  await request(token, `${apiBase}/files/${fileId}`, {
    method: "PATCH",
    body: JSON.stringify({ name: normalizeMarkdownFileName(name) })
  });
}

export async function trashFile(token: string, fileId: string): Promise<void> {
  assertDriveResourceId(fileId);
  await request(token, `${apiBase}/files/${fileId}`, {
    method: "PATCH",
    body: JSON.stringify({ trashed: true })
  });
}

export async function uploadImage(
  token: string,
  name: string,
  mimeType: string,
  dataUrl: string,
  folderId: string | null
): Promise<string> {
  assertOptionalDriveResourceId(folderId);
  const imagesFolder = await ensureImagesFolder(token, folderId);
  const { bytes, contentType } = decodeImageDataUrl(dataUrl, mimeType);
  const metadata = { name: normalizeDriveAssetName(name), parents: [imagesFolder] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([bytes], { type: contentType }));
  const created = await request<DriveFile>(
    token,
    `${uploadBase}/files?uploadType=multipart&fields=${encodeURIComponent("id,name")}`,
    { method: "POST", body: form }
  );
  return `![${escapeMarkdownAltText(created.name)}](https://drive.google.com/uc?export=view&id=${encodeURIComponent(created.id)})`;
}

function decodeImageDataUrl(dataUrl: string, mimeType: string): { bytes: ArrayBuffer; contentType: string } {
  const match = /^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new DriveApiError(400, "Invalid image data URL.");
  const contentType = match[1].toLowerCase();
  if (!contentType.startsWith("image/")) throw new DriveApiError(400, "Only image uploads are supported.");
  if (mimeType && mimeType.toLowerCase() !== contentType) throw new DriveApiError(400, "Image MIME type does not match the uploaded data.");
  let binary: string;
  try {
    binary = atob(match[2]);
  } catch {
    throw new DriveApiError(400, "Invalid image data URL.");
  }
  if (binary.length === 0) throw new DriveApiError(400, "Image upload is empty.");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return { bytes: bytes.buffer, contentType };
}

function escapeMarkdownAltText(text: string): string {
  return text.replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function driveQueryLiteral(value: string): string {
  return `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

async function ensureImagesFolder(token: string, parentFolderId: string | null): Promise<string> {
  assertOptionalDriveResourceId(parentFolderId);
  const parent = parentFolderId ?? "root";
  const params = new URLSearchParams({
    q: [
      "trashed = false",
      "mimeType = 'application/vnd.google-apps.folder'",
      `name = ${driveQueryLiteral("MarkDrive Images")}`,
      `${driveQueryLiteral(parent)} in parents`
    ].join(" and "),
    fields: "files(id,name,parents)",
    pageSize: "1"
  });
  const existing = await request<{ files: DriveFile[] }>(token, `${apiBase}/files?${params.toString()}`);
  if (existing.files[0]) return existing.files[0].id;

  const created = await request<DriveFile>(token, `${apiBase}/files?fields=${encodeURIComponent("id,name,parents")}`, {
    method: "POST",
    body: JSON.stringify({
      name: "MarkDrive Images",
      mimeType: "application/vnd.google-apps.folder",
      parents: [parent]
    })
  });
  return created.id;
}

async function listDriveFiles<T>(token: string, params: URLSearchParams): Promise<T[]> {
  const files: T[] = [];
  let pageToken: string | undefined;
  do {
    if (pageToken) params.set("pageToken", pageToken);
    else params.delete("pageToken");
    const result = await request<{ files: T[]; nextPageToken?: string }>(token, `${apiBase}/files?${params.toString()}`);
    files.push(...result.files);
    pageToken = result.nextPageToken;
  } while (pageToken);
  return files;
}

async function driveErrorFromResponse(response: Response): Promise<DriveApiError> {
  const retryAfterMs = parseRetryAfterMs(response);
  const body = await response.json().catch(() => ({ error: { message: response.statusText } }));
  const message =
    typeof body?.error?.message === "string" ? body.error.message : `Drive request failed with ${response.status}`;
  return new DriveApiError(response.status, message, retryAfterMs);
}

function parseRetryAfterMs(response: Response): number | undefined {
  const retryAfter = response.headers.get("retry-after");
  if (!retryAfter) return undefined;
  const seconds = Number.parseInt(retryAfter, 10);
  if (Number.isFinite(seconds)) return seconds * 1000;
  const retryDate = Date.parse(retryAfter);
  return Number.isNaN(retryDate) ? undefined : Math.max(0, retryDate - Date.now());
}
