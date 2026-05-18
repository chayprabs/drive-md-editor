import matter from "gray-matter";
import type { FrontmatterFields } from "./types";

export function readFrontmatter(markdown: string): FrontmatterFields {
  const parsed = matter(markdown);
  const data = parsed.data as Partial<Record<keyof FrontmatterFields, unknown>>;
  return {
    title: typeof data.title === "string" ? data.title : "",
    date: typeof data.date === "string" ? data.date : "",
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === "string") : [],
    author: typeof data.author === "string" ? data.author : "",
    draft: typeof data.draft === "boolean" ? data.draft : false
  };
}

export function writeFrontmatter(markdown: string, fields: FrontmatterFields): string {
  const parsed = matter(markdown);
  const data = {
    ...parsed.data,
    title: fields.title || undefined,
    date: fields.date || undefined,
    tags: fields.tags.length > 0 ? fields.tags : undefined,
    author: fields.author || undefined,
    draft: fields.draft
  };
  return matter.stringify(parsed.content.trimStart(), data).trimEnd() + "\n";
}
