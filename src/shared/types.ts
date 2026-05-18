export type ThemeName = "dark" | "light" | "dracula" | "nord" | "solarized";

export type AutosaveInterval = 2000 | 5000 | 30000 | 0;

export type ViewMode = "split" | "editor" | "preview";

export interface MarkDriveSettings {
  theme: ThemeName;
  autosaveInterval: AutosaveInterval;
  vimMode: boolean;
  softWrap: boolean;
  lastFolderId: string | null;
  onboardingComplete: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  parents?: string[];
  webViewLink?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parents?: string[];
}

export interface RecentFile {
  id: string;
  name: string;
  modifiedTime: string;
  openedAt: string;
}

export interface OpenDocument {
  fileId: string | null;
  name: string;
  markdown: string;
  modifiedTime: string | null;
  folderId: string | null;
  localVersion: number;
}

export interface FrontmatterFields {
  title: string;
  date: string;
  tags: string[];
  author: string;
  draft: boolean;
}

export interface SaveConflict {
  local: OpenDocument;
  drive: {
    markdown: string;
    modifiedTime: string;
  };
}

export interface ToastMessage {
  id: string;
  tone: "info" | "success" | "warning" | "danger";
  title: string;
  detail?: string;
}

export interface OutlineItem {
  id: string;
  text: string;
  level: number;
  line: number;
}
