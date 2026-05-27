import * as React from "react";

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

const javascriptKeywords = new Set([
  "async",
  "await",
  "declare",
  "export",
  "from",
  "function",
  "implements",
  "infer",
  "keyof",
  "namespace",
  "of",
  "readonly",
  "satisfies",
  "type",
  "var",
  "yield",
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

const javaKeywords = new Set([
  "abstract",
  "assert",
  "boolean",
  "byte",
  "char",
  "double",
  "extends",
  "final",
  "finally",
  "float",
  "implements",
  "import",
  "instanceof",
  "int",
  "long",
  "native",
  "package",
  "short",
  "strictfp",
  "super",
  "synchronized",
  "throws",
  "transient",
  "volatile",
]);

const scalaKeywords = new Set([
  "abstract",
  "case",
  "catch",
  "class",
  "def",
  "do",
  "else",
  "extends",
  "final",
  "finally",
  "for",
  "forSome",
  "if",
  "implicit",
  "import",
  "lazy",
  "match",
  "new",
  "null",
  "object",
  "override",
  "package",
  "private",
  "protected",
  "return",
  "sealed",
  "super",
  "this",
  "throw",
  "trait",
  "try",
  "type",
  "val",
  "var",
  "while",
  "with",
  "yield",
]);

const cssKeywords = new Set(["charset", "important", "keyframes", "media", "page", "supports"]);

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
  const normalizedLanguage = normalizeCodeLanguage(language);
  if (token.startsWith("//") || token.startsWith("/*")) {
    return "syntax-comment";
  }
  if (token.startsWith('"') || token.startsWith("'")) {
    return "syntax-string";
  }
  if (/^\d/.test(token)) {
    return "syntax-number";
  }
  if (isCodeKeyword(token, normalizedLanguage)) {
    return "syntax-keyword";
  }
  if (/^[{}()[\].,;:+\-*/%=<>!&|?]+$/.test(token)) {
    return "syntax-punctuation";
  }
  return "syntax-identifier";
}

function normalizeCodeLanguage(language: string) {
  const normalized = language.trim().toLowerCase();
  if (normalized === "rs") {
    return "rust";
  }
  if (["js", "jsx", "ts", "tsx", "javascript", "typescript"].includes(normalized)) {
    return "javascript";
  }
  if (normalized === "sc") {
    return "scala";
  }
  if (["less", "scss"].includes(normalized)) {
    return "css";
  }
  return normalized;
}

function isCodeKeyword(token: string, language: string) {
  return (
    commonKeywords.has(token) ||
    (language === "javascript" && javascriptKeywords.has(token)) ||
    (language === "rust" && rustKeywords.has(token)) ||
    (language === "java" && javaKeywords.has(token)) ||
    (language === "scala" && scalaKeywords.has(token)) ||
    (language === "css" && cssKeywords.has(token))
  );
}
