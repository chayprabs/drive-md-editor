import React, { useEffect, useMemo, useRef, useState } from "react";
import { readFrontmatter } from "../shared/frontmatter";
import { extractOutline, renderMarkdown } from "../shared/markdown";
import type { ThemeName } from "../shared/types";

interface Props {
  markdown: string;
  theme: ThemeName;
  onChange(markdown: string): void;
  onHydrationError(failure: unknown): void;
  printRequestId?: number;
  onPrintReady?(requestId: number): void;
}

export function PreviewPane({ markdown, theme, onChange, onHydrationError, printRequestId = 0, onPrintReady }: Props): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const hydrationVersionRef = useRef(0);
  const lastPrintReadyRef = useRef(0);
  const [previewMarkdown, setPreviewMarkdown] = useState(markdown);
  const html = useMemo(() => renderMarkdown(previewMarkdown), [previewMarkdown]);
  const printFrontmatter = useMemo(() => readFrontmatter(previewMarkdown), [previewMarkdown]);
  const printOutline = useMemo(() => extractOutline(previewMarkdown), [previewMarkdown]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewMarkdown(markdown), 50);
    return () => window.clearTimeout(timer);
  }, [markdown]);

  useEffect(() => {
    if (printRequestId > 0) setPreviewMarkdown(markdown);
  }, [markdown, printRequestId]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const version = hydrationVersionRef.current + 1;
    hydrationVersionRef.current = version;
    const isCurrentHydration = () => hydrationVersionRef.current === version;
    const timer = window.setTimeout(() => {
      void hydrateMathAndDiagrams(host, theme, onHydrationError, isCurrentHydration).catch((failure: unknown) => {
        if (isCurrentHydration()) onHydrationError(failure);
      }).finally(() => {
        if (isCurrentHydration() && printRequestId > 0 && previewMarkdown === markdown && lastPrintReadyRef.current !== printRequestId) {
          lastPrintReadyRef.current = printRequestId;
          onPrintReady?.(printRequestId);
        }
      });
    }, printRequestId > 0 ? 0 : 50);
    return () => {
      window.clearTimeout(timer);
      if (hydrationVersionRef.current === version) hydrationVersionRef.current += 1;
    };
  }, [html, markdown, onHydrationError, onPrintReady, previewMarkdown, printRequestId, theme]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const click = (event: MouseEvent) => {
      const input = (event.target as Element | null)?.closest<HTMLInputElement>("input[type='checkbox']");
      if (!input) return;
      if (previewMarkdown !== markdown) return;
      const checkboxIndex = [...host.querySelectorAll<HTMLInputElement>("input[type='checkbox']")].indexOf(input);
      if (checkboxIndex < 0) return;
      let taskIndex = -1;
      const next = markdown.replace(/^(\s*(?:[-*+]|\d+[.)])\s+\[)( |x|X)(\]\s+.+)$/gm, (line, start: string, checked: string, end: string) => {
        taskIndex += 1;
        if (taskIndex !== checkboxIndex) return line;
        return `${start}${checked.toLowerCase() === "x" ? " " : "x"}${end}`;
      });
      onChange(next);
    };
    host.addEventListener("click", click);
    return () => host.removeEventListener("click", click);
  }, [markdown, onChange]);

  return (
    <article className="preview-pane" ref={hostRef}>
      <header className="print-header">
        <h1>{printFrontmatter.title || "Untitled"}</h1>
        <dl>
          {printFrontmatter.date ? <><dt>Date</dt><dd>{printFrontmatter.date}</dd></> : null}
          {printFrontmatter.author ? <><dt>Author</dt><dd>{printFrontmatter.author}</dd></> : null}
          {printFrontmatter.tags.length > 0 ? <><dt>Tags</dt><dd>{printFrontmatter.tags.join(", ")}</dd></> : null}
        </dl>
      </header>
      {printOutline.length > 0 ? (
        <nav className="print-toc" aria-label="Table of contents">
          <h2>Contents</h2>
          {printOutline.map((item) => (
            <a key={`${item.line}-${item.id}`} href={`#${item.id}`} style={{ marginLeft: (item.level - 1) * 12 }}>{item.text}</a>
          ))}
        </nav>
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </article>
  );
}

async function hydrateMathAndDiagrams(
  host: HTMLElement,
  theme: ThemeName,
  onHydrationError: (failure: unknown) => void,
  isCurrentHydration: () => boolean
): Promise<void> {
  await hydrateCode(host, onHydrationError, isCurrentHydration);
  if (!isCurrentHydration()) return;
  const mathNodes = [...host.querySelectorAll<HTMLElement>("code.language-math, code.language-katex")];
  if (mathNodes.length > 0) {
    await import("katex/dist/katex.min.css");
    const katex = await import("katex");
    if (!isCurrentHydration()) return;
    for (const node of mathNodes) {
      if (!isCurrentHydration()) return;
      try {
        katex.default.render(node.textContent ?? "", node.parentElement ?? node, { throwOnError: false });
      } catch (failure) {
        onHydrationError(failure);
        const wrapper = document.createElement("span");
        wrapper.className = "katex-error";
        wrapper.setAttribute("role", "alert");
        wrapper.textContent = "Math failed to render.";
        node.replaceWith(wrapper);
      }
    }
  }

  const diagramNodes = [...host.querySelectorAll<HTMLElement>("code.language-mermaid")];
  if (diagramNodes.length > 0) {
    const mermaid = await import("mermaid");
    if (!isCurrentHydration()) return;
    mermaid.default.initialize({ startOnLoad: false, theme: mermaidTheme(theme), securityLevel: "strict" });
    for (const [index, node] of diagramNodes.entries()) {
      if (!isCurrentHydration()) return;
      const id = `markdrive-mermaid-${index}-${Date.now()}`;
      const source = node.textContent ?? "";
      try {
        const { svg } = await mermaid.default.render(id, source);
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-rendered";
        wrapper.innerHTML = svg;
        node.closest("pre")?.replaceWith(wrapper);
      } catch (failure) {
        onHydrationError(failure);
        const wrapper = document.createElement("div");
        wrapper.className = "mermaid-error";
        wrapper.setAttribute("role", "alert");
        wrapper.textContent = "Mermaid diagram failed to render.";
        node.closest("pre")?.replaceWith(wrapper);
      }
    }
  }
}

function mermaidTheme(theme: ThemeName): "dark" | "default" | "forest" | "neutral" {
  if (theme === "light" || theme === "solarized") return "default";
  if (theme === "nord") return "neutral";
  return "dark";
}

async function hydrateCode(
  host: HTMLElement,
  onHydrationError: (failure: unknown) => void,
  isCurrentHydration: () => boolean
): Promise<void> {
  const codeNodes = [...host.querySelectorAll<HTMLElement>("pre code")];
  if (codeNodes.length === 0) return;
  await import("highlight.js/styles/github-dark.css");
  const hljs = await import("./highlight-languages");
  if (!isCurrentHydration()) return;
  for (const node of codeNodes) {
    if (!isCurrentHydration()) return;
    try {
      hljs.default.highlightElement(node);
    } catch (failure) {
      onHydrationError(failure);
      node.classList.add("highlight-error");
      node.setAttribute("role", "alert");
    }
  }
}
