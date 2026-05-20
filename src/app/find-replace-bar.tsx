import React, { useEffect, useRef } from "react";
import { ArrowDown, ArrowUp, Replace, X } from "lucide-react";
import type { SearchOptions, SearchSummary } from "../shared/search";

export interface FindReplaceState extends SearchOptions {
  replacement: string;
}

interface Props {
  state: FindReplaceState;
  summary: SearchSummary;
  onState(state: FindReplaceState): void;
  onFind(direction: "next" | "previous"): void;
  onReplaceCurrent(): void;
  onReplaceAll(): void;
  onClose(): void;
}

export function FindReplaceBar(props: Props): React.ReactElement {
  const { state, summary } = props;
  const findInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    findInputRef.current?.focus();
    findInputRef.current?.select();
  }, []);

  const matchLabel = summary.invalid
    ? "Invalid"
    : summary.matches === 0
      ? "No matches"
      : summary.index > 0
        ? `${summary.index} of ${summary.matches}`
        : `${summary.matches} matches`;

  return (
    <div className="findbar" role="search" aria-label="Find and replace">
      <input
        ref={findInputRef}
        aria-label="Find"
        value={state.query}
        onChange={(event) => props.onState({ ...state, query: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") props.onFind(event.shiftKey ? "previous" : "next");
          if (event.key === "Escape") props.onClose();
        }}
      />
      <input
        aria-label="Replace"
        value={state.replacement}
        onChange={(event) => props.onState({ ...state, replacement: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter") props.onReplaceCurrent();
          if (event.key === "Escape") props.onClose();
        }}
      />
      <div className="findbar-toggles" aria-label="Search options">
        <button aria-label="Match case" aria-pressed={state.caseSensitive} title="Match case" onClick={() => props.onState({ ...state, caseSensitive: !state.caseSensitive })}>Aa</button>
        <button aria-label="Whole word" aria-pressed={state.wholeWord} title="Whole word" onClick={() => props.onState({ ...state, wholeWord: !state.wholeWord })}>W</button>
        <button aria-label="Regular expression" aria-pressed={state.regex} title="Regular expression" onClick={() => props.onState({ ...state, regex: !state.regex })}>.*</button>
      </div>
      <span className={summary.invalid ? "find-count invalid" : "find-count"} aria-live="polite">
        {matchLabel}
      </span>
      <button aria-label="Previous match" title="Previous match" onClick={() => props.onFind("previous")}><ArrowUp size={16} /></button>
      <button aria-label="Next match" title="Next match" onClick={() => props.onFind("next")}><ArrowDown size={16} /></button>
      <button aria-label="Replace match" title="Replace match" onClick={props.onReplaceCurrent}><Replace size={16} /></button>
      <button className="findbar-text-button" aria-label="Replace all matches" onClick={props.onReplaceAll}>All</button>
      <button aria-label="Close find and replace" title="Close find and replace" onClick={props.onClose}><X size={16} /></button>
    </div>
  );
}
