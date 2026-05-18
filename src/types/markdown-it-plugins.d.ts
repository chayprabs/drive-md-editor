declare module "markdown-it-container" {
  import type MarkdownIt from "markdown-it";

  const plugin: MarkdownIt.PluginWithOptions<{
    render?: (tokens: unknown[], index: number) => string;
    validate?: (params: string) => boolean;
  }>;
  export default plugin;
}

declare module "markdown-it-emoji" {
  import type MarkdownIt from "markdown-it";

  export const bare: MarkdownIt.PluginSimple;
  export const light: MarkdownIt.PluginSimple;
  export const full: MarkdownIt.PluginSimple;
}

declare module "markdown-it-footnote" {
  import type MarkdownIt from "markdown-it";

  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module "markdown-it-mark" {
  import type MarkdownIt from "markdown-it";

  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module "markdown-it-sub" {
  import type MarkdownIt from "markdown-it";

  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}

declare module "markdown-it-sup" {
  import type MarkdownIt from "markdown-it";

  const plugin: MarkdownIt.PluginSimple;
  export default plugin;
}
