// Use every shipped grammar and alias; unknown languages remain escaped plaintext.
import { defaultHighlighter as markdownHighlighter } from "@tanstack/highlight";
import {
  renderNodesToHtml,
  renderTokens,
  type HighlightRenderNode,
} from "@tanstack/highlight/core";
import { createElement, type ReactNode } from "react";
import { createThemeCss } from "@tanstack/highlight/theme";
import { githubLightTheme } from "@tanstack/highlight/themes/github-light";

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
