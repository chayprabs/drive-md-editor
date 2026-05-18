import type { DriveFile, DriveFolder, OpenDocument } from "../shared/types";

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

async function request<T>(token: string, input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers
    }
  });

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    const retryAfterMs = retryAfter ? Number.parseInt(retryAfter, 10) * 1000 : undefined;
    const body = await response.json().catch(() => ({ error: { message: response.statusText } }));
    const message =
      typeof body?.error?.message === "string" ? body.error.message : `Drive request failed with ${response.status}`;
    throw new DriveApiError(response.status, message, retryAfterMs);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function getMarkdownFile(token: string, fileId: string): Promise<{ file: DriveFile; markdown: string }> {
  const fields = "id,name,mimeType,modifiedTime,parents,webViewLink";
  const file = await request<DriveFile>(token, `${apiBase}/files/${fileId}?fields=${encodeURIComponent(fields)}`);
  const contentResponse = await fetch(`${apiBase}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!contentResponse.ok) {
    throw new DriveApiError(contentResponse.status, contentResponse.statusText);
  }
  return { file, markdown: await contentResponse.text() };
}

export async function saveMarkdownFile(
  token: string,
  fileId: string,
  markdown: string,
  previousModifiedTime: string | null
): Promise<OpenDocument> {
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
  const metadata = {
    name: name.endsWith(".md") ? name : `${name}.md`,
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
  const terms = ["trashed = false", "name contains '.md'"];
  if (folderId) terms.push(`'${folderId.replace(/'/g, "\\'")}' in parents`);
  if (query.trim()) terms.push(`name contains '${query.trim().replace(/'/g, "\\'")}'`);

  const params = new URLSearchParams({
    q: terms.join(" and "),
    spaces: "drive",
    orderBy: "modifiedTime desc",
    pageSize: "50",
    fields: "files(id,name,mimeType,modifiedTime,parents,webViewLink)"
  });
  const result = await request<{ files: DriveFile[] }>(token, `${apiBase}/files?${params.toString()}`);
  return result.files;
}

export async function listFolders(token: string, folderId: string | null): Promise<DriveFolder[]> {
  const parent = folderId ?? "root";
  const params = new URLSearchParams({
    q: [
      "trashed = false",
      "mimeType = 'application/vnd.google-apps.folder'",
      `'${parent.replace(/'/g, "\\'")}' in parents`
    ].join(" and "),
    orderBy: "name",
    pageSize: "50",
    fields: "files(id,name,parents)"
  });
  const result = await request<{ files: DriveFolder[] }>(token, `${apiBase}/files?${params.toString()}`);
  return result.files;
}

export async function renameFile(token: string, fileId: string, name: string): Promise<void> {
  await request(token, `${apiBase}/files/${fileId}`, {
    method: "PATCH",
    body: JSON.stringify({ name: name.endsWith(".md") ? name : `${name}.md` })
  });
}

export async function trashFile(token: string, fileId: string): Promise<void> {
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
  const imagesFolder = await ensureImagesFolder(token, folderId);
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const metadata = { name, parents: [imagesFolder] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([bytes], { type: mimeType }));
  const created = await request<DriveFile>(
    token,
    `${uploadBase}/files?uploadType=multipart&fields=${encodeURIComponent("id,name")}`,
    { method: "POST", body: form }
  );
  return `![${created.name}](https://drive.google.com/uc?export=view&id=${created.id})`;
}

async function ensureImagesFolder(token: string, parentFolderId: string | null): Promise<string> {
  const parent = parentFolderId ?? "root";
  const params = new URLSearchParams({
    q: [
      "trashed = false",
      "mimeType = 'application/vnd.google-apps.folder'",
      "name = 'MarkDrive Images'",
      `'${parent.replace(/'/g, "\\'")}' in parents`
    ].join(" and "),
    fields: "files(id,name)",
    pageSize: "1"
  });
  const existing = await request<{ files: DriveFile[] }>(token, `${apiBase}/files?${params.toString()}`);
  if (existing.files[0]) return existing.files[0].id;

  const created = await request<DriveFile>(token, `${apiBase}/files?fields=${encodeURIComponent("id,name")}`, {
    method: "POST",
    body: JSON.stringify({
      name: "MarkDrive Images",
      mimeType: "application/vnd.google-apps.folder",
      parents: [parent]
    })
  });
  return created.id;
}
