/* Canonical code highlighting (plan Phase E): TanStack Highlight replaces
 * react-syntax-highlighter. One isomorphic highlighter instance; registered
 * languages are the intersection of Yoram's language needs and
 * @tanstack/highlight's shipped grammars. Languages without a grammar
 * (java, kotlin, rust, go, c, cpp, csharp, …) deterministically fall back to
 * escaped plaintext — the package's own fallback (ponytail: no per-language
 * fallback stack; if a grammar ships upstream, add it to this array).
 */
import {
  createHighlighter,
  renderNodesToHtml,
  renderTokens,
  type HighlightRenderNode,
} from "@tanstack/highlight/core";
import { createElement, type ReactNode } from "react";
import { css } from "@tanstack/highlight/languages/css";
import { diff } from "@tanstack/highlight/languages/diff";
import { dockerfile } from "@tanstack/highlight/languages/dockerfile";
import { html } from "@tanstack/highlight/languages/html";
import { js as javascript } from "@tanstack/highlight/languages/js";
import { json } from "@tanstack/highlight/languages/json";
import { jsx } from "@tanstack/highlight/languages/jsx";
import { markdown } from "@tanstack/highlight/languages/markdown";
import { plaintext } from "@tanstack/highlight/languages/plaintext";
import { python } from "@tanstack/highlight/languages/python";
import { shell } from "@tanstack/highlight/languages/shell";
import { sql } from "@tanstack/highlight/languages/sql";
import { tsx } from "@tanstack/highlight/languages/tsx";
import { ts as typescript } from "@tanstack/highlight/languages/ts";
import { yaml } from "@tanstack/highlight/languages/yaml";
import { createThemeCss } from "@tanstack/highlight/theme";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";

const markdownHighlighter = createHighlighter({
  languages: [
    css,
    diff,
    dockerfile,
    html,
    javascript,
    json,
    jsx,
    markdown,
    plaintext,
    python,
    shell,
    sql,
    tsx,
    typescript,
    yaml,
  ],
});

/** Token-class inner HTML (no <pre>/<code> wrapper) for a code fence body.
 * All text is escaped by the highlighter, so the result is injection-safe. */
export function highlightCodeToInnerHtml(code: string, lang?: string): string {
  const result = markdownHighlighter.tokenize(code, { lang });
  return renderNodesToHtml(renderTokens(result.tokens));
}

export function highlightCodeToReactNodes(code: string, lang?: string): ReactNode[] {
  return renderTokensToReactNodes(
    renderTokens(markdownHighlighter.tokenize(code, { lang }).tokens),
  );
}

function renderTokensToReactNodes(nodes: ReadonlyArray<HighlightRenderNode>): ReactNode[] {
  return nodes.map((node, index) =>
    node.type === "text"
      ? node.value
      : createElement(
          "span",
          { className: node.classNames.join(" "), key: `${index}-${node.classNames.join("-")}` },
          renderTokensToReactNodes(node.children),
        ),
  );
}

export function highlightLanguageSupported(lang?: string): boolean {
  const normalized = markdownHighlighter.normalizeLanguage(lang);
  return normalized !== "plaintext" || Boolean(lang && /^(plaintext|text|txt)$/iu.test(lang));
}

/* The legacy code-fence look was prism "ghcolors" (GitHub light). The TanStack
 * github-light theme is the equivalent class-based palette; its `pre.th-code`
 * base rule never applies because our fences keep the legacy `language-*`
 * <pre>/<code> DOM. Injected once, SPA-only (no SSR). */
const THEME_CSS = createThemeCss({ light: githubLightTheme });

let themeInjected = false;
export function injectMarkdownHighlightTheme() {
  if (themeInjected || typeof document === "undefined") return;
  themeInjected = true;
  const style = document.createElement("style");
  style.dataset.owner = "markdown-highlight-theme";
  style.textContent = THEME_CSS;
  document.head.append(style);
}
