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
import strikethrough from "./markdown-it-strikethrough";
import type { OutlineItem } from "./types";

const calloutTypes = ["note", "warning", "tip", "danger"] as const;

const markdownUtils = new MarkdownIt().utils;

export interface CodeHighlighter {
  getLanguage(language: string): unknown;
  highlight(code: string, options: { language: string; ignoreIllegals: boolean }): { value: string };
}

function createMarkdownIt(codeHighlighter?: CodeHighlighter): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight(code, lang): string {
      const languageClass = lang ? ` class="language-${markdownUtils.escapeHtml(lang)}"` : "";
      if (lang && codeHighlighter?.getLanguage(lang)) {
        try {
          return `<pre><code${languageClass}>${codeHighlighter.highlight(code, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
        } catch {
          return `<pre><code${languageClass}>${markdownUtils.escapeHtml(code)}</code></pre>`;
        }
      }
      return `<pre><code${languageClass}>${markdownUtils.escapeHtml(code)}</code></pre>`;
    }
  });

  md.use(footnote)
    .use(emoji)
    .use(strikethrough)
    .use(anchor, {
      permalink: anchor.permalink.headerLink()
    })
    .use(sup)
    .use(sub)
    .use(mark)
    .use(taskLists, { enabled: true, label: true, labelAfter: true });

  const defaultLinkOpen = md.renderer.rules.link_open ?? ((tokens, index, options, _env, self) => self.renderToken(tokens, index, options));
  md.renderer.rules.link_open = (tokens, index, options, env, self) => {
    const href = tokens[index].attrGet("href");
    if (href && /^https?:\/\//i.test(href)) {
      tokens[index].attrSet("target", "_blank");
      tokens[index].attrSet("rel", "noopener noreferrer");
    }
    return defaultLinkOpen(tokens, index, options, env, self);
  };

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

function strikethrough(md: MarkdownIt): void {
  md.inline.ruler.before("emphasis", "strikethrough", (state, silent) => {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x7e /* ~ */ || state.src.charCodeAt(start + 1) !== 0x7e) return false;
    let scanned = start + 2;
    while (scanned < state.posMax) {
      if (state.src.charCodeAt(scanned) === 0x7e && state.src.charCodeAt(scanned + 1) === 0x7e) {
        if (scanned === start + 2) return false;
        if (silent) return true;
        const tokenOpen = state.push("s_open", "s", 1);
        tokenOpen.markup = "~~";
        state.push("text", "", 0).content = state.src.slice(start + 2, scanned);
        const tokenClose = state.push("s_close", "s", -1);
        tokenClose.markup = "~~";
        state.pos = scanned + 2;
        return true;
      }
      scanned += 1;
    }
    return false;
  });
}

const md = createMarkdownIt();

export function renderMarkdown(markdown: string, codeHighlighter?: CodeHighlighter): string {
  const rewritten = rewriteDriveImageUrls(markdownWithoutFrontmatter(markdown));
  return (codeHighlighter ? createMarkdownIt(codeHighlighter) : md).render(rewritten);
}

export function rewriteDriveImageUrls(markdown: string): string {
  return markdown.replace(/!\[([^\]]*)\]\((https:\/\/drive\.google\.com\/[^)\s]+)\)/g, (match, alt: string, url: string) => {
    const fileId = extractDriveFileId(url);
    return fileId ? `![${alt}](https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)})` : match;
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
