import React, { useEffect, useMemo, useRef } from "react";
import { renderMarkdown } from "../shared/markdown";

interface Props {
  markdown: string;
  onChange(markdown: string): void;
}

export function PreviewPane({ markdown, onChange }: Props): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const html = useMemo(() => renderMarkdown(markdown), [markdown]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const timer = window.setTimeout(() => {
      void hydrateMathAndDiagrams(host);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [html]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const click = (event: MouseEvent) => {
      const input = (event.target as Element | null)?.closest<HTMLInputElement>("input[type='checkbox']");
      if (!input) return;
      const label = input.closest("li")?.textContent?.trim();
      if (!label) return;
      const next = markdown.replace(/^(\s*[-*]\s+\[)( |x)(\]\s+)(.+)$/gim, (line, start: string, checked: string, end: string, text: string) => {
        if (text.trim() !== label) return line;
        return `${start}${checked.toLowerCase() === "x" ? " " : "x"}${end}${text}`;
      });
      onChange(next);
    };
    host.addEventListener("click", click);
    return () => host.removeEventListener("click", click);
  }, [markdown, onChange]);

  return <article className="preview-pane" ref={hostRef} dangerouslySetInnerHTML={{ __html: html }} />;
}

async function hydrateMathAndDiagrams(host: HTMLElement): Promise<void> {
  await hydrateCode(host);
  const mathNodes = [...host.querySelectorAll<HTMLElement>("code.language-math, code.language-katex")];
  if (mathNodes.length > 0) {
    await import("katex/dist/katex.min.css");
    const katex = await import("katex");
    for (const node of mathNodes) {
      katex.default.render(node.textContent ?? "", node.parentElement ?? node, { throwOnError: false });
    }
  }

  const diagramNodes = [...host.querySelectorAll<HTMLElement>("code.language-mermaid")];
  if (diagramNodes.length > 0) {
    const mermaid = await import("mermaid");
    mermaid.default.initialize({ startOnLoad: false, theme: "dark", securityLevel: "strict" });
    for (const [index, node] of diagramNodes.entries()) {
      const id = `markdrive-mermaid-${index}-${Date.now()}`;
      const source = node.textContent ?? "";
      const { svg } = await mermaid.default.render(id, source);
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-rendered";
      wrapper.innerHTML = svg;
      node.closest("pre")?.replaceWith(wrapper);
    }
  }
}

async function hydrateCode(host: HTMLElement): Promise<void> {
  const codeNodes = [...host.querySelectorAll<HTMLElement>("pre code")];
  if (codeNodes.length === 0) return;
  await import("highlight.js/styles/github-dark.css");
  const hljs = await import("highlight.js");
  for (const node of codeNodes) {
    hljs.default.highlightElement(node);
  }
}
