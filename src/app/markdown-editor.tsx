import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { searchKeymap } from "@codemirror/search";
import { Compartment, EditorState, StateEffect, StateField, type Extension } from "@codemirror/state";
import { Decoration, type DecorationSet, drawSelection, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";
import { Vim, vim } from "@replit/codemirror-vim";
import { collectSearchMatches, createSearchPattern, replaceMatches, type SearchOptions } from "../shared/search";

export interface FindResult {
  total: number;
  index: number;
}

export interface MarkdownEditorHandle {
  formatSelection(kind: "bold" | "italic" | "link"): void;
  insertText(text: string): void;
  find(options: SearchOptions, direction: "next" | "previous"): FindResult;
  replaceCurrent(options: SearchOptions, replacement: string): number;
  replaceAll(options: SearchOptions, replacement: string): number;
  goToLine(line: number): void;
}

interface Props {
  markdown: string;
  vimMode: boolean;
  softWrap: boolean;
  searchHighlight: SearchOptions | null;
  onChange(markdown: string): void;
  onSave(): void;
  onVimSave(): void;
  onToggleView(): void;
  onOpenFind(): void;
  onFullscreenError(failure: unknown): void;
  onSmartHtmlPaste(html: string): void;
  onImageFiles(files: File[]): void;
  onCursor(line: number, column: number): void;
}

const wrapCompartment = new Compartment();
const vimCompartment = new Compartment();
const setSearchHighlight = StateEffect.define<SearchOptions | null>();
const searchHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(setSearchHighlight)) {
        const options = effect.value;
        if (!options?.query) return Decoration.none;
        const matches = collectSearchMatches(transaction.state.doc.toString(), options);
        return Decoration.set(
          matches.map((match) => Decoration.mark({ class: "cm-searchMatch" }).range(match.from, match.to)),
          true
        );
      }
    }
    return decorations.map(transaction.changes);
  },
  provide: (field) => EditorView.decorations.from(field)
});
let activeVimSave: (() => void) | null = null;
Vim.defineEx("write", "w", () => activeVimSave?.());

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, Props>(function MarkdownEditor(props, ref) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const syncingFromPropsRef = useRef(false);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    if (!hostRef.current) return;
    const runVimSave = () => propsRef.current.onVimSave();
    activeVimSave = runVimSave;
    const view = new EditorView({
      parent: hostRef.current,
      state: EditorState.create({
        doc: props.markdown,
        extensions: editorExtensions(() => propsRef.current, () => syncingFromPropsRef.current, () => {
          activeVimSave = runVimSave;
        })
      })
    });
    viewRef.current = view;
    return () => {
      if (activeVimSave === runVimSave) activeVimSave = null;
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === props.markdown) return;
    syncingFromPropsRef.current = true;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: props.markdown }
    });
    syncingFromPropsRef.current = false;
  }, [props.markdown]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        wrapCompartment.reconfigure(props.softWrap ? EditorView.lineWrapping : []),
        vimCompartment.reconfigure(props.vimMode ? vim() : [])
      ]
    });
  }, [props.softWrap, props.vimMode]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setSearchHighlight.of(props.searchHighlight) });
  }, [props.searchHighlight]);

  useImperativeHandle(ref, () => ({
    formatSelection(kind) {
      const view = viewRef.current;
      if (!view) return;
      const selection = view.state.selection.main;
      const selected = view.state.sliceDoc(selection.from, selection.to);
      const insert =
        kind === "bold" ? `**${selected || "bold"}**` : kind === "italic" ? `*${selected || "italic"}*` : `[${selected || "link"}](https://)`;
      view.dispatch({ changes: { from: selection.from, to: selection.to, insert }, selection: { anchor: selection.from + insert.length } });
      view.focus();
    },
    insertText(text) {
      const view = viewRef.current;
      if (!view) return;
      const selection = view.state.selection.main;
      view.dispatch({ changes: { from: selection.from, to: selection.to, insert: text } });
      view.focus();
    },
    find(options, direction) {
      const view = viewRef.current;
      if (!view) return { total: 0, index: 0 };
      return selectSearchMatch(view, options, direction);
    },
    replaceCurrent(options, replacement) {
      const view = viewRef.current;
      if (!view) return 0;
      const pattern = createSearchPattern(options);
      if (!pattern) return 0;
      const selection = view.state.selection.main;
      const selected = view.state.sliceDoc(selection.from, selection.to);
      const selectedMatches = collectSearchMatches(selected, options);
      if (selectedMatches.length !== 1 || selectedMatches[0].from !== 0 || selectedMatches[0].to !== selected.length) {
        selectSearchMatch(view, options, "next");
        return 0;
      }
      pattern.lastIndex = 0;
      const next = options.regex ? selected.replace(pattern, replacement) : replacement;
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: next },
        selection: { anchor: selection.from, head: selection.from + next.length }
      });
      view.focus();
      return 1;
    },
    replaceAll(options, replacement) {
      const view = viewRef.current;
      if (!view) return 0;
      const current = view.state.doc.toString();
      const result = replaceMatches(current, options, replacement);
      if (result.count === 0) return 0;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: result.text } });
      view.focus();
      return result.count;
    },
    goToLine(line) {
      const view = viewRef.current;
      if (!view) return;
      const target = view.state.doc.line(Math.min(Math.max(1, line), view.state.doc.lines));
      view.dispatch({ selection: { anchor: target.from }, effects: EditorView.scrollIntoView(target.from, { y: "center" }) });
      view.focus();
    }
  }), []);

  return <div className="editor-host" ref={hostRef} role="textbox" aria-label="Markdown source" aria-multiline="true" />;
});

function editorExtensions(getProps: () => Props, isSyncingFromProps: () => boolean, activateVimSave: () => void): Extension[] {
  return [
    basicSetup,
    lineNumbers(),
    foldGutter(),
    history(),
    drawSelection(),
    highlightActiveLine(),
    searchHighlightField,
    bracketMatching(),
    indentOnInput(),
    syntaxHighlighting(classHighlighter),
    markdown({ base: markdownLanguage }),
    wrapCompartment.of(getProps().softWrap ? EditorView.lineWrapping : []),
    vimCompartment.of(getProps().vimMode ? vim() : []),
    keymap.of([
      {
        key: "Mod-s",
        run() {
          getProps().onSave();
          return true;
        }
      },
      {
        key: "Mod-b",
        run(view) {
          format(view, "**", "bold");
          return true;
        }
      },
      {
        key: "Mod-i",
        run(view) {
          format(view, "*", "italic");
          return true;
        }
      },
      {
        key: "Mod-k",
        run(view) {
          const selection = view.state.selection.main;
          const selected = view.state.sliceDoc(selection.from, selection.to) || "link";
          view.dispatch({ changes: { from: selection.from, to: selection.to, insert: `[${selected}](https://)` } });
          return true;
        }
      },
      {
        key: "Mod-\\",
        run() {
          getProps().onToggleView();
          return true;
        }
      },
      {
        key: "Mod-f",
        run() {
          getProps().onOpenFind();
          return true;
        }
      },
      {
        key: "Mod-g",
        run(view) {
          const line = window.prompt("Go to line:");
          if (!line) return true;
          const parsed = Number.parseInt(line, 10);
          if (!Number.isFinite(parsed) || parsed < 1) return true;
          const target = view.state.doc.line(Math.min(parsed, view.state.doc.lines));
          view.dispatch({ selection: { anchor: target.from }, effects: EditorView.scrollIntoView(target.from, { y: "center" }) });
          return true;
        }
      },
      {
        key: "Mod-Shift-f",
        run() {
          getProps().onOpenFind();
          return true;
        }
      },
      {
        key: "F11",
        run() {
          toggleFullscreen(getProps);
          return true;
        }
      },
      indentWithTab,
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap
    ]),
    EditorView.domEventHandlers({
      focus() {
        activateVimSave();
        return false;
      },
      paste(event) {
        const view = viewRefFromEvent(event);
        const files = [...(event.clipboardData?.files ?? [])].filter((file) => file.type.startsWith("image/"));
        if (files.length > 0) {
          event.preventDefault();
          getProps().onImageFiles(files);
          return true;
        }
        const html = event.clipboardData?.getData("text/html") ?? "";
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const pastedUrl = normalizePastedHttpUrl(text);
        const selection = view?.state.selection.main;
        if (selection && pastedUrl && selection.from !== selection.to) {
          event.preventDefault();
          const label = view.state.sliceDoc(selection.from, selection.to);
          view.dispatch({ changes: { from: selection.from, to: selection.to, insert: `[${label}](${pastedUrl})` } });
          return true;
        }
        if (html) {
          event.preventDefault();
          getProps().onSmartHtmlPaste(html);
          return true;
        }
        return false;
      },
      drop(event) {
        const files = [...(event.dataTransfer?.files ?? [])].filter((file) => file.type.startsWith("image/"));
        if (files.length === 0) return false;
        event.preventDefault();
        getProps().onImageFiles(files);
        return true;
      }
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged && !isSyncingFromProps()) getProps().onChange(update.state.doc.toString());
      if (update.selectionSet || update.docChanged) {
        const head = update.state.selection.main.head;
        const line = update.state.doc.lineAt(head);
        getProps().onCursor(line.number, head - line.from + 1);
      }
    })
  ];
}

function format(view: EditorView, marker: string, fallback: string): void {
  const selection = view.state.selection.main;
  const selected = view.state.sliceDoc(selection.from, selection.to) || fallback;
  const insert = `${marker}${selected}${marker}`;
  view.dispatch({ changes: { from: selection.from, to: selection.to, insert } });
}

function toggleFullscreen(getProps: () => Props): void {
  void (async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (failure) {
      getProps().onFullscreenError(failure);
    }
  })();
}

function normalizePastedHttpUrl(text: string): string | null {
  const value = text.trim();
  if (!/^https?:\/\//i.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function selectSearchMatch(view: EditorView, options: SearchOptions, direction: "next" | "previous"): FindResult {
  const matches = collectSearchMatches(view.state.doc.toString(), options);
  if (matches.length === 0) return { total: 0, index: 0 };
  const selection = view.state.selection.main;
  const position = direction === "next" ? selection.to : selection.from;
  const matchIndex = direction === "next"
    ? matches.findIndex((match) => match.from >= position)
    : findPreviousMatch(matches, position);
  const resolvedIndex = matchIndex === -1 ? direction === "next" ? 0 : matches.length - 1 : matchIndex;
  const target = matches[resolvedIndex];
  view.dispatch({
    selection: { anchor: target.from, head: target.to },
    effects: EditorView.scrollIntoView(target.from, { y: "center" })
  });
  view.focus();
  return { total: matches.length, index: resolvedIndex + 1 };
}

function findPreviousMatch(matches: { to: number }[], position: number): number {
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    if (matches[index].to <= position) return index;
  }
  return -1;
}

function viewRefFromEvent(event: Event): EditorView | null {
  const target = event.currentTarget as HTMLElement | null;
  const editor = target?.closest(".cm-editor") as HTMLElement | null;
  return editor ? EditorView.findFromDOM(editor) : null;
}
