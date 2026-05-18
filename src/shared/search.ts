export interface SearchOptions {
  query: string;
  caseSensitive: boolean;
  wholeWord: boolean;
  regex: boolean;
}

export interface SearchMatch {
  from: number;
  to: number;
  text: string;
}

export interface SearchSummary {
  matches: number;
  invalid: boolean;
}

export function summarizeSearch(text: string, options: SearchOptions): SearchSummary {
  const pattern = createSearchPattern(options);
  if (!pattern) return { matches: 0, invalid: options.regex && options.query.length > 0 };
  return { matches: collectMatches(text, pattern).length, invalid: false };
}

export function collectSearchMatches(text: string, options: SearchOptions): SearchMatch[] {
  const pattern = createSearchPattern(options);
  return pattern ? collectMatches(text, pattern) : [];
}

export function createSearchPattern(options: SearchOptions): RegExp | null {
  if (!options.query) return null;
  try {
    const source = options.regex ? options.query : escapeRegExp(options.query);
    const bounded = options.wholeWord ? `\\b(?:${source})\\b` : source;
    return new RegExp(bounded, options.caseSensitive ? "g" : "gi");
  } catch {
    return null;
  }
}

export function replaceMatches(text: string, options: SearchOptions, replacement: string): { text: string; count: number } {
  const pattern = createSearchPattern(options);
  if (!pattern) return { text, count: 0 };
  const count = collectMatches(text, pattern).length;
  pattern.lastIndex = 0;
  const next = options.regex ? text.replace(pattern, replacement) : text.replace(pattern, () => replacement);
  return { text: next, count };
}

function collectMatches(text: string, pattern: RegExp): SearchMatch[] {
  const matches: SearchMatch[] = [];
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    matches.push({ from: match.index, to: match.index + match[0].length, text: match[0] });
    if (match[0].length === 0) pattern.lastIndex += 1;
  }
  return matches;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
