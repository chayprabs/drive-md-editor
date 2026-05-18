import matter from "gray-matter";
import type { FrontmatterFields } from "./types";

type FrontmatterValue = string | boolean | string[] | number | null;

interface ParsedFrontmatter {
  data: Record<string, FrontmatterValue>;
  content: string;
  lineOffset: number;
}

export function readFrontmatter(markdown: string): FrontmatterFields {
  const parsed = parseFrontmatter(markdown);
  return {
    title: stringField(parsed.data.title),
    date: stringField(parsed.data.date),
    tags: Array.isArray(parsed.data.tags) ? parsed.data.tags : [],
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
  const data: Record<string, FrontmatterValue | undefined> = {
    ...parsed.data,
    title: fields.title || undefined,
    date: fields.date || undefined,
    tags: fields.tags.length > 0 ? fields.tags : undefined,
    author: fields.author || undefined,
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

function stringField(value: FrontmatterValue | undefined): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
