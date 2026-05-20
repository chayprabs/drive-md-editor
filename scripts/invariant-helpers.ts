import { readFile } from "node:fs/promises";

export async function readSource(path: string): Promise<string> {
  return normalizeNewlines(await readFile(path, "utf8"));
}

export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

export function includesAll(source: string, fragments: readonly string[]): boolean {
  return fragments.every((fragment) => source.includes(fragment));
}

export function extractCssBlock(css: string, selector: string): string | null {
  const normalized = normalizeNewlines(css);
  const start = normalized.indexOf(selector);
  if (start === -1) return null;
  const bodyStart = normalized.indexOf("{", start);
  if (bodyStart === -1) return null;
  return readBalancedBlock(normalized, bodyStart);
}

export function extractAtRule(css: string, rule: string): string | null {
  const normalized = normalizeNewlines(css);
  const start = normalized.indexOf(rule);
  if (start === -1) return null;
  const bodyStart = normalized.indexOf("{", start);
  if (bodyStart === -1) return null;
  return readBalancedBlock(normalized, bodyStart);
}

function readBalancedBlock(text: string, bodyStart: number): string | null {
  let depth = 0;
  for (let index = bodyStart; index < text.length; index += 1) {
    if (text[index] === "{") depth += 1;
    if (text[index] === "}") depth -= 1;
    if (depth === 0) return text.slice(bodyStart + 1, index);
  }
  return null;
}
