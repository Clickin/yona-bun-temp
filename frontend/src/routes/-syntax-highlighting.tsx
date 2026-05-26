import * as React from "react";

export function highlightCodeBlock(code: string, language: string | undefined) {
  const lines = code.split("\n");
  return lines.flatMap((line, lineIndex) => {
    const nodes = highlightCodeLine(line, language ?? "");
    return lineIndex === lines.length - 1 ? nodes : [...nodes, "\n"];
  });
}

export function highlightCodeLine(line: string, language: string) {
  const tokenPattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0] ?? "";
    const tokenStart = match.index ?? 0;
    if (tokenStart > cursor) {
      parts.push(line.slice(cursor, tokenStart));
    }
    parts.push(
      <span
        className={`syntax-token ${syntaxTokenClass(token, language)}`}
        key={`${token}-${tokenStart}`}
      >
        {token}
      </span>,
    );
    cursor = tokenStart + token.length;
  }
  if (cursor < line.length) {
    parts.push(line.slice(cursor));
  }
  return parts.length > 0 ? parts : "\u00a0";
}

function syntaxTokenClass(token: string, language: string) {
  if (token.startsWith("//") || token.startsWith("/*")) {
    return "syntax-comment";
  }
  if (token.startsWith('"') || token.startsWith("'")) {
    return "syntax-string";
  }
  if (/^\d/.test(token)) {
    return "syntax-number";
  }
  if (isCodeKeyword(token, language)) {
    return "syntax-keyword";
  }
  if (/^[{}()[\].,;:+\-*/%=<>!&|?]+$/.test(token)) {
    return "syntax-punctuation";
  }
  return "syntax-identifier";
}

function isCodeKeyword(token: string, language: string) {
  const commonKeywords = new Set([
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "default",
    "do",
    "else",
    "enum",
    "false",
    "for",
    "if",
    "import",
    "interface",
    "let",
    "new",
    "null",
    "private",
    "protected",
    "public",
    "return",
    "static",
    "switch",
    "this",
    "throw",
    "true",
    "try",
    "void",
    "while",
  ]);
  const rustKeywords = new Set([
    "as",
    "async",
    "await",
    "crate",
    "dyn",
    "fn",
    "impl",
    "let",
    "match",
    "mod",
    "mut",
    "pub",
    "self",
    "struct",
    "trait",
    "type",
    "use",
    "where",
  ]);
  const cssKeywords = new Set(["important", "media", "supports"]);
  return (
    commonKeywords.has(token) ||
    (language === "rust" && rustKeywords.has(token)) ||
    (language === "css" && cssKeywords.has(token))
  );
}
