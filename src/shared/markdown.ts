import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import anchor from "markdown-it-anchor";
import container from "markdown-it-container";
import { full as emoji } from "markdown-it-emoji";
import footnote from "markdown-it-footnote";
import mark from "markdown-it-mark";
import sub from "markdown-it-sub";
import sup from "markdown-it-sup";
import taskLists from "markdown-it-task-lists";
import { markdownContentWithLineOffset, markdownWithoutFrontmatter } from "./frontmatter";
import type { OutlineItem } from "./types";

const calloutTypes = ["note", "warning", "tip", "danger"] as const;

const markdownUtils = new MarkdownIt().utils;

function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(code, lang): string {
      const languageClass = lang ? ` class="language-${markdownUtils.escapeHtml(lang)}"` : "";
      return `<pre><code${languageClass}>${markdownUtils.escapeHtml(code)}</code></pre>`;
    }
  });

  md.use(footnote)
    .use(emoji)
    .use(anchor, {
      permalink: anchor.permalink.headerLink()
    })
    .use(sup)
    .use(sub)
    .use(mark)
    .use(taskLists, { enabled: true, label: true, labelAfter: true });

  for (const type of calloutTypes) {
    md.use(container, type, {
      render(tokens: Token[], index: number): string {
        if (tokens[index].nesting === 1) {
          return `<aside class="callout callout-${type}" role="note"><strong>${type}</strong>\n`;
        }
        return "</aside>\n";
      }
    });
  }

  return md;
}

const md = createMarkdownIt();

export function renderMarkdown(markdown: string): string {
  const rewritten = rewriteDriveImageUrls(markdownWithoutFrontmatter(markdown));
  return md.render(rewritten);
}

export function rewriteDriveImageUrls(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\((https:\/\/drive\.google\.com\/[^)\s]+)\)/g, (match, alt: string, url: string) => {
    const fileId = extractDriveFileId(url);
    return fileId ? `![${alt}](https://drive.google.com/uc?export=view&id=${fileId})` : match;
  });
}

function extractDriveFileId(url: string): string | null {
  const pathMatch = /\/file\/d\/([^/?#]+)/.exec(url);
  if (pathMatch) return pathMatch[1];
  try {
    return new URL(url).searchParams.get("id");
  } catch {
    return null;
  }
}

export function extractOutline(markdown: string): OutlineItem[] {
  const { content, lineOffset } = markdownContentWithLineOffset(markdown);
  return content
    .split(/\r?\n/)
    .map((line, index) => {
      const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
      if (!match) return null;
      const text = match[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\p{Letter}\p{Number}\s-]/gu, "")
        .trim()
        .replace(/\s+/g, "-");
      return { id, text, level: match[1].length, line: lineOffset + index + 1 };
    })
    .filter((item): item is OutlineItem => item !== null);
}

export function readingTimeMinutes(markdown: string): number {
  const words = markdownWithoutFrontmatter(markdown).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
