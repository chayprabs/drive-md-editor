import matter from "gray-matter";
import type { FrontmatterFields } from "./types";

type FrontmatterValue = string | boolean | string[] | number | Date | null;

interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
  lineOffset: number;
}

export function readFrontmatter(markdown: string): FrontmatterFields {
  const parsed = parseFrontmatter(markdown);
  return {
    title: stringField(parsed.data.title),
    date: stringField(parsed.data.date),
    tags: tagsField(parsed.data.tags),
    author: stringField(parsed.data.author),
    draft: typeof parsed.data.draft === "boolean" ? parsed.data.draft : false
  };
}

export function markdownWithoutFrontmatter(markdown: string): string {
  return parseFrontmatter(markdown).content;
}

export function markdownContentWithLineOffset(markdown: string): { content: string; lineOffset: number } {
  const parsed = parseFrontmatter(markdown);
  return { content: parsed.content, lineOffset: parsed.lineOffset };
}

export function writeFrontmatter(markdown: string, fields: FrontmatterFields): string {
  const parsed = parseFrontmatter(markdown);
  const tags = normalizeTags(fields.tags);
  const data: Record<string, FrontmatterValue | undefined> = {
    ...parsed.data,
    title: stringField(fields.title) || undefined,
    date: stringField(fields.date) || undefined,
    tags: tags.length > 0 ? tags : undefined,
    author: stringField(fields.author) || undefined,
    draft: fields.draft
  };
  return matter.stringify(parsed.content.trimStart(), compactFrontmatter(data)).trimEnd() + "\n";
}

function parseFrontmatter(markdown: string): ParsedFrontmatter {
  try {
    const parsed = matter(markdown);
    return {
      data: parsed.data as Record<string, FrontmatterValue>,
      content: parsed.content,
      lineOffset: markdown.slice(0, markdown.length - parsed.content.length).split("\n").length - 1
    };
  } catch {
    return { data: {}, content: markdown, lineOffset: 0 };
  }
}

function compactFrontmatter(data: Record<string, FrontmatterValue | undefined>): Record<string, FrontmatterValue> {
  return Object.fromEntries(Object.entries(data).filter((entry): entry is [string, FrontmatterValue] => entry[1] !== undefined));
}

function stringField(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
}

function tagsField(value: unknown): string[] {
  const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return normalizeTags(values);
}

function normalizeTags(values: unknown[]): string[] {
  return Array.from(new Set(values.map((item) => stringField(item)).filter(Boolean)));
}
