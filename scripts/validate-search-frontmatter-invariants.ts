import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { collectSearchMatches, replaceMatches, summarizeSearch } from "../src/shared/search";
import { markdownWithoutFrontmatter, readFrontmatter, writeFrontmatter } from "../src/shared/frontmatter";

const root = resolve(import.meta.dirname, "..");
const searchSource = await readFile(resolve(root, "src/shared/search.ts"), "utf8");
const findBar = await readFile(resolve(root, "src/app/find-replace-bar.tsx"), "utf8");
const editor = await readFile(resolve(root, "src/app/markdown-editor.tsx"), "utf8");
const app = await readFile(resolve(root, "src/app/main.tsx"), "utf8");
const sidebar = await readFile(resolve(root, "src/app/sidebar.tsx"), "utf8");
const frontmatterSource = await readFile(resolve(root, "src/shared/frontmatter.ts"), "utf8");
const failures: string[] = [];

expect(searchSource.includes("caseSensitive: boolean"), "Search options must include case sensitivity.");
expect(searchSource.includes("wholeWord: boolean"), "Search options must include whole-word matching.");
expect(searchSource.includes("regex: boolean"), "Search options must include regex matching.");
expect(searchSource.includes("options.caseSensitive ? \"g\" : \"gi\""), "Search pattern must honor case sensitivity.");
expect(searchSource.includes("options.wholeWord ? `\\\\b(?:${source})\\\\b` : source"), "Search pattern must honor whole-word matching.");
expect(searchSource.includes("options.regex ? options.query : escapeRegExp(options.query)"), "Search pattern must honor regex mode.");
expect(searchSource.includes("catch") && searchSource.includes("return null"), "Invalid regex patterns must be handled safely.");
expect(searchSource.includes("options.regex ? text.replace(pattern, replacement) : text.replace(pattern, () => replacement)"), "Replacement must handle regex and literal modes correctly.");

expect(findBar.includes("role=\"search\""), "Find/replace bar must expose a search role.");
expect(findBar.includes("aria-label=\"Find\""), "Find input must be labelled.");
expect(findBar.includes("aria-label=\"Replace\""), "Replace input must be labelled.");
expect(findBar.includes("title=\"Match case\""), "Find bar must expose match-case toggle.");
expect(findBar.includes("title=\"Whole word\""), "Find bar must expose whole-word toggle.");
expect(findBar.includes("title=\"Regular expression\""), "Find bar must expose regex toggle.");
expect(findBar.includes("summary.invalid ? \"Invalid\""), "Find bar must show invalid regex state.");
expect(findBar.includes("props.onReplaceAll"), "Find bar must expose replace-all.");

expect(editor.includes("find(options, direction)"), "Editor handle must expose find.");
expect(editor.includes("replaceCurrent(options, replacement)"), "Editor handle must expose replace current.");
expect(editor.includes("replaceAll(options, replacement)"), "Editor handle must expose replace all.");
expect(editor.includes("selectSearchMatch(view, options, direction)"), "Editor find must select matches.");
expect(editor.includes("replaceMatches(current, options, replacement)"), "Editor replace-all must use shared replacement logic.");
expect(app.includes("summarizeSearch(document.markdown, findState)"), "App must summarize search results against the current document.");
expect(app.includes("openFindReplace()"), "App must open the find/replace bar from shortcuts.");

expect(sidebar.includes("<h2>Frontmatter</h2>"), "Frontmatter panel must be present.");
for (const field of ["title", "date", "tags", "author", "draft"]) {
  expect(sidebar.includes(`fields.${field}`), `Frontmatter panel must bind ${field}.`);
}
expect(sidebar.includes("type=\"date\""), "Frontmatter date must use a date input.");
expect(sidebar.includes("fields.tags.join(\", \")"), "Frontmatter tags must render as a comma-separated list.");
expect(sidebar.includes("event.target.value.split(\",\").map((tag) => tag.trim()).filter(Boolean)"), "Frontmatter tags must parse comma-separated input.");
expect(app.includes("changeMarkdown(writeFrontmatter(document.markdown, next))"), "Frontmatter edits must update the Markdown document.");
expect(frontmatterSource.includes("function tagsField(value: unknown): string[]"), "Frontmatter tags must be normalized from unknown YAML values.");
expect(frontmatterSource.includes("typeof value === \"string\" ? value.split(\",\") : []"), "Frontmatter tags must support comma-separated string metadata.");
expect(frontmatterSource.includes("function stringField(value: unknown): string"), "Frontmatter string fields must normalize unknown YAML values.");
expect(frontmatterSource.includes("if (typeof value === \"string\") return value.trim();"), "Frontmatter string fields must trim YAML string values.");
expect(frontmatterSource.includes("function normalizeTags(values: unknown[]): string[]"), "Frontmatter tags must be normalized through a shared helper.");
expect(frontmatterSource.includes("Array.from(new Set(values.map((item) => stringField(item)).filter(Boolean)))"), "Frontmatter tags must trim, discard empty values, and deduplicate.");

const sample = `---
title: Alpha
date: 2026-05-19
tags:
  - one
author: Chait
draft: false
---

# Heading

Alpha alpha beta.
`;
expect(summarizeSearch(sample, { query: "alpha", caseSensitive: false, wholeWord: true, regex: false }).matches === 3, "Search summary must count case-insensitive whole-word matches.");
expect(summarizeSearch(sample, { query: "(", caseSensitive: false, wholeWord: false, regex: true }).invalid, "Search summary must flag invalid regex.");
expect(collectSearchMatches(sample, { query: "Alpha", caseSensitive: true, wholeWord: true, regex: false }).length === 2, "Search matching must honor case sensitivity.");
const replaced = replaceMatches("alpha beta alpha", { query: "alpha", caseSensitive: false, wholeWord: true, regex: false }, "omega");
expect(replaced.text === "omega beta omega" && replaced.count === 2, "Literal replace-all must replace all whole-word matches.");
const regexReplaced = replaceMatches("item-1 item-2", { query: "item-(\\d)", caseSensitive: false, wholeWord: false, regex: true }, "id-$1");
expect(regexReplaced.text === "id-1 id-2" && regexReplaced.count === 2, "Regex replace-all must preserve capture groups.");

const next = writeFrontmatter(sample, {
  title: "Beta",
  date: "2026-05-20",
  tags: ["two", "three"],
  author: "MarkDrive",
  draft: true
});
const fields = readFrontmatter(next);
expect(fields.title === "Beta", "Frontmatter title must round-trip.");
expect(fields.date === "2026-05-20", "Frontmatter date must round-trip.");
expect(fields.tags.join(",") === "two,three", "Frontmatter tags must round-trip.");
expect(fields.author === "MarkDrive", "Frontmatter author must round-trip.");
expect(fields.draft, "Frontmatter draft must round-trip.");
expect(markdownWithoutFrontmatter(next).includes("# Heading"), "Frontmatter updates must preserve markdown body.");

const loose = readFrontmatter(`---
tags: one, 2, , three, one
title: "  Loose title  "
date: 2026-05-19
---

# Loose
`);
expect(loose.title === "Loose title", "String frontmatter title must trim surrounding whitespace.");
expect(loose.tags.join(",") === "one,2,three", "Loose frontmatter tags must normalize to trimmed strings.");

const normalized = writeFrontmatter(sample, {
  title: "  Trimmed  ",
  date: " 2026-05-21 ",
  tags: [" two ", "", "three", "two"],
  author: " Author ",
  draft: false
});
const normalizedFields = readFrontmatter(normalized);
expect(normalizedFields.title === "Trimmed", "Written frontmatter title must be trimmed.");
expect(normalizedFields.date === "2026-05-21", "Written frontmatter date must be trimmed.");
expect(normalizedFields.tags.join(",") === "two,three", "Written frontmatter tags must be trimmed, filtered, and deduplicated.");
expect(normalizedFields.author === "Author", "Written frontmatter author must be trimmed.");

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Search and frontmatter invariants passed.");

function expect(condition: boolean | undefined, message: string): void {
  if (!condition) failures.push(message);
}
