import hljs from "../src/app/highlight-languages";
import { markdownWithoutFrontmatter, readFrontmatter, writeFrontmatter } from "../src/shared/frontmatter";
import { extractOutline, renderMarkdown, rewriteDriveImageUrls } from "../src/shared/markdown";

const failures: string[] = [];

const markdown = `---
title: Metadata Title
date: 2026-05-19
tags:
  - alpha
  - beta
author: Chait
draft: true
---

# Visible Title

- [ ] One task

:::note
Callout body
:::

<script>alert("nope")</script>

![diagram](https://drive.google.com/file/d/drive-file-123/view?usp=sharing)

[external](https://example.com/docs)

[local](#visible-title)

\`\`\`ts
const value: string = "ok";
\`\`\`
`;

const frontmatter = readFrontmatter(markdown);
expect(frontmatter.title === "Metadata Title", "Frontmatter title must parse.");
expect(frontmatter.date === "2026-05-19", "Frontmatter date must parse.");
expect(frontmatter.author === "Chait", "Frontmatter author must parse.");
expect(frontmatter.draft, "Frontmatter draft flag must parse.");
expect(frontmatter.tags.join(",") === "alpha,beta", "Frontmatter tags must parse.");

const body = markdownWithoutFrontmatter(markdown);
expect(!body.includes("Metadata Title"), "Frontmatter must be stripped from markdown body.");
expect(body.includes("# Visible Title"), "Markdown body must preserve document content.");

const outline = extractOutline(markdown);
expect(outline.length === 1, "Outline must ignore headings in frontmatter.");
expect(outline[0]?.text === "Visible Title", "Outline must include visible heading text.");
expect(outline[0]?.line === 11, `Outline line number must point to the source line; got ${outline[0]?.line ?? "none"}.`);

const html = renderMarkdown(markdown, hljs);
expect(!html.includes("Metadata Title"), "Rendered markdown must not leak frontmatter content.");
expect(html.includes("callout callout-note"), "Rendered markdown must include note callout container.");
expect(html.includes("type=\"checkbox\""), "Rendered markdown must include task checkboxes.");
expect(html.includes("https://drive.google.com/uc?export=view&amp;id=drive-file-123"), "Rendered markdown must rewrite Drive image share URLs.");
expect(html.includes("hljs-keyword"), "Rendered markdown must include static syntax highlighting when a highlighter is provided.");
expect(!html.includes("<script>"), "Rendered markdown must not emit raw script tags.");
expect(html.includes("&lt;script&gt;alert(") && html.includes("nope") && html.includes(")&lt;/script&gt;"), "Rendered markdown must escape raw HTML.");
expect(html.includes("href=\"https://example.com/docs\"") && html.includes("target=\"_blank\"") && html.includes("rel=\"noopener noreferrer\""), "Rendered external links must open safely outside the extension tab.");
expect(html.includes("href=\"#visible-title\"") && !html.includes("href=\"#visible-title\" target=\"_blank\""), "Rendered local anchors must stay in the extension tab.");

const rewritten = writeFrontmatter(markdown, {
  title: "Updated",
  date: "2026-05-20",
  tags: ["release"],
  author: "MarkDrive",
  draft: false
});
const updated = readFrontmatter(rewritten);
expect(updated.title === "Updated", "Updated frontmatter title must round-trip.");
expect(updated.date === "2026-05-20", "Updated frontmatter date must round-trip.");
expect(updated.tags.join(",") === "release", "Updated frontmatter tags must round-trip.");
expect(markdownWithoutFrontmatter(rewritten).includes("# Visible Title"), "Frontmatter updates must preserve markdown body.");

const queryImage = rewriteDriveImageUrls("![alt](https://drive.google.com/open?id=query-file-456)");
expect(queryImage.includes("https://drive.google.com/uc?export=view&id=query-file-456"), "Drive image query URLs must rewrite to direct embeds.");
const encodedImage = rewriteDriveImageUrls("![alt](https://drive.google.com/open?id=file%20id%2Fwith%20chars)");
expect(encodedImage.includes("https://drive.google.com/uc?export=view&id=file%20id%2Fwith%20chars"), "Drive image direct embeds must URL-encode rewritten file IDs.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Markdown rendering invariants passed.");

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message);
}
