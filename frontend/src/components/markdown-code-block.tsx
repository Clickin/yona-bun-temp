import { isValidElement } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useRef, useState } from "react";
import { highlightCodeToInnerHtml, injectMarkdownHighlightTheme } from "./markdown-highlight";

/**
 * Shared markdown code-block renderer: TanStack Highlight + a floating copy
 * button. This is an intentional modern improvement over legacy Yona's plain
 * <pre> (per design direction, code blocks are not 100% legacy-parity). The
 * outer <pre>/<code> DOM (including the legacy `language-*` class) is
 * preserved from the previous prism renderer; only token spans changed from
 * prism inline styles to `th-*` theme classes.
 */
if (typeof document !== "undefined") {
  injectMarkdownHighlightTheme();
}

export function MarkdownCodeBlock({
  children,
  className,
  language,
}: {
  children: ReactNode;
  className?: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);
  const divRef = useRef<HTMLDivElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const codeText = extractMarkdownCodeText(children);

  const copyCode = async () => {
    // Read the code text from the rendered <pre> (the wrapper div also holds
    // the floating copy button, whose label would leak into innerText).
    const text = (divRef.current?.querySelector("pre") ?? preRef.current)?.innerText ?? codeText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can reject in non-focused iframes; fall back to a
      // textarea selection-based copy.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const codeBlockStyle: CSSProperties = {
    position: "relative",
  };

  if (language) {
    injectMarkdownHighlightTheme();
    return (
      <div ref={divRef} style={codeBlockStyle} data-owner="markdown-code-block">
        <button
          type="button"
          className="markdown-code-copy"
          data-owner="markdown-code-copy"
          aria-label={copied ? "Copied" : "Copy code"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void copyCode();
          }}
        >
          {copied ? "✓" : "Copy"}
        </button>
        <pre>
          <code
            className={className}
            dangerouslySetInnerHTML={{
              __html: highlightCodeToInnerHtml(codeText.replace(/\n$/u, ""), language),
            }}
          />
        </pre>
      </div>
    );
  }

  return (
    <pre ref={preRef} className={className ?? ""} data-owner="markdown-code-block">
      <button
        type="button"
        className="markdown-code-copy"
        data-owner="markdown-code-copy"
        aria-label={copied ? "Copied" : "Copy code"}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void copyCode();
        }}
      >
        {copied ? "✓" : "Copy"}
      </button>
      {children}
    </pre>
  );
}

function extractMarkdownCodeText(children: ReactNode): string {
  const parts: string[] = [];
  const collect = (node: ReactNode): void => {
    if (node == null || typeof node === "boolean") return;
    if (typeof node === "string" || typeof node === "number") {
      parts.push(String(node));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    if (isValidElement<{ children?: ReactNode }>(node)) {
      collect(node.props.children);
    }
  };
  collect(children);
  return parts.join("");
}
