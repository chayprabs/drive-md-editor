export type MarkDriveFileKind = "markdown" | "text" | "json";

const markdownExtensions = [".md", ".markdown", ".mdown"] as const;
const textExtensions = [".txt"] as const;
const jsonExtensions = [".json"] as const;

const allSupportedExtensions = [...markdownExtensions, ...textExtensions, ...jsonExtensions] as const;

export function extensionFromFileName(name: string): string | null {
  const trimmed = name.trim();
  const index = trimmed.lastIndexOf(".");
  if (index <= 0 || index === trimmed.length - 1) return null;
  return trimmed.slice(index).toLowerCase();
}

export function fileKindFromName(name: string): MarkDriveFileKind | null {
  const extension = extensionFromFileName(name);
  if (!extension) return null;
  if ((markdownExtensions as readonly string[]).includes(extension)) return "markdown";
  if ((textExtensions as readonly string[]).includes(extension)) return "text";
  if ((jsonExtensions as readonly string[]).includes(extension)) return "json";
  return null;
}

export function isSupportedFileName(name: string): boolean {
  return fileKindFromName(name) !== null;
}

export function isMarkdownLikeFileName(name: string): boolean {
  return fileKindFromName(name) === "markdown";
}

export function supportedExtensions(): readonly string[] {
  return allSupportedExtensions;
}

export function fileKindLabel(kind: MarkDriveFileKind): string {
  if (kind === "markdown") return "Markdown";
  if (kind === "text") return "Plain text";
  return "JSON";
}

export function mimeTypeForFileName(name: string): string {
  const kind = fileKindFromName(name);
  if (kind === "text") return "text/plain; charset=utf-8";
  if (kind === "json") return "application/json; charset=utf-8";
  return "text/markdown; charset=utf-8";
}

export function defaultFileNameForKind(kind: MarkDriveFileKind): string {
  if (kind === "text") return "Untitled.txt";
  if (kind === "json") return "Untitled.json";
  return "Untitled.md";
}

export function defaultContentForKind(kind: MarkDriveFileKind): string {
  if (kind === "text") return "";
  if (kind === "json") return "{\n  \n}\n";
  return "";
}

export function normalizeSupportedFileName(name: string, kind: MarkDriveFileKind = "markdown"): string {
  const cleaned = name
    .replace(/[\x00-\x1f<>:"|?*]+/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const extension = extensionFromFileName(cleaned);
  const targetExtension = extensionForKind(kind);
  const base = extension ? cleaned.slice(0, -extension.length).trim() : cleaned;
  const safeBase = base || "Untitled";
  if (!safeBase || /^\.(md|markdown|mdown|txt|json)$/i.test(safeBase)) return defaultFileNameForKind(kind);
  if (extension && fileKindFromName(cleaned) === kind) return cleaned;
  return `${safeBase}${targetExtension}`;
}

export function duplicateFileName(name: string): string {
  const extension = extensionFromFileName(name);
  if (!extension) return `${name} copy`;
  const base = name.slice(0, -extension.length);
  return `${base} copy${extension}`;
}

function extensionForKind(kind: MarkDriveFileKind): string {
  if (kind === "text") return ".txt";
  if (kind === "json") return ".json";
  return ".md";
}

export function driveNameContainsClauses(): string[] {
  return allSupportedExtensions.map((extension) => `name contains '${extension.replace(/'/g, "\\'")}'`);
}

export function jsonSyntaxStatus(content: string): { valid: boolean; message: string } {
  const trimmed = content.trim();
  if (!trimmed) return { valid: true, message: "Empty JSON" };
  try {
    JSON.parse(trimmed);
    return { valid: true, message: "Valid JSON" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { valid: false, message };
  }
}
