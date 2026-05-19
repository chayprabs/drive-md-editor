import { fileKindFromName, normalizeSupportedFileName, type MarkDriveFileKind } from "./file-types";

export function normalizeDriveFileName(name: string, kind?: MarkDriveFileKind): string {
  const resolvedKind = kind ?? fileKindFromName(name) ?? "markdown";
  return normalizeSupportedFileName(name, resolvedKind);
}

export function normalizeMarkdownFileName(name: string): string {
  const cleaned = name
    .replace(/[\x00-\x1f<>:"|?*]+/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || /^\.md$/i.test(cleaned)) return "Untitled.md";
  return /\.md$/i.test(cleaned) ? cleaned : `${cleaned}.md`;
}

export function normalizeDriveAssetName(name: string, fallback = "markdrive-image.png"): string {
  const cleaned = name
    .replace(/[\x00-\x1f<>:"|?*]+/g, "-")
    .replace(/[\\/]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");
  if (!cleaned || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(cleaned)) return fallback;
  return cleaned;
}
