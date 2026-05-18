import type { FrontmatterFields } from "./types";

type FrontmatterValue = string | boolean | string[];

interface ParsedFrontmatter {
  data: Record<string, FrontmatterValue>;
  content: string;
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
  return `---\n${stringifyFrontmatter(data)}---\n\n${parsed.content.trimStart()}`.trimEnd() + "\n";
}

function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { data: {}, content: markdown };
  const closeIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closeIndex === -1) return { data: {}, content: markdown };
  return {
    data: parseYamlBlock(lines.slice(1, closeIndex)),
    content: lines.slice(closeIndex + 1).join("\n")
  };
}

function parseYamlBlock(lines: string[]): Record<string, FrontmatterValue> {
  const data: Record<string, FrontmatterValue> = {};
  let arrayKey: string | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (arrayKey && trimmed.startsWith("- ")) {
      const current = data[arrayKey];
      if (Array.isArray(current)) current.push(parseString(trimmed.slice(2)));
      continue;
    }

    arrayKey = null;
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (rawValue === "") {
      data[key] = [];
      arrayKey = key;
      continue;
    }
    data[key] = parseValue(rawValue);
  }

  return data;
}

function parseValue(rawValue: string): FrontmatterValue {
  const value = rawValue.trim();
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => parseString(item.trim())).filter(Boolean);
  }
  return parseString(value);
}

function parseString(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function stringifyFrontmatter(data: Record<string, FrontmatterValue | undefined>): string {
  return Object.entries(data)
    .filter((entry): entry is [string, FrontmatterValue] => entry[1] !== undefined)
    .map(([key, value]) => {
      if (Array.isArray(value)) return value.length > 0 ? `${key}:\n${value.map((item) => `  - ${quoteString(item)}`).join("\n")}\n` : `${key}: []\n`;
      return `${key}: ${typeof value === "boolean" ? String(value) : quoteString(value)}\n`;
    })
    .join("");
}

function quoteString(value: string): string {
  if (/^[A-Za-z0-9_./@-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function stringField(value: FrontmatterValue | undefined): string {
  return typeof value === "string" ? value : "";
}
