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

const goKeywords = new Set([
  "break",
  "case",
  "chan",
  "const",
  "continue",
  "default",
  "defer",
  "else",
  "fallthrough",
  "for",
  "func",
  "go",
  "goto",
  "if",
  "import",
  "interface",
  "map",
  "package",
  "range",
  "return",
  "select",
  "struct",
  "switch",
  "type",
  "var",
]);

const csharpKeywords = new Set([
  "abstract",
  "as",
  "async",
  "await",
  "base",
  "bool",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "checked",
  "class",
  "const",
  "continue",
  "decimal",
  "default",
  "delegate",
  "do",
  "double",
  "else",
  "enum",
  "event",
  "explicit",
  "extern",
  "false",
  "finally",
  "fixed",
  "float",
  "for",
  "foreach",
  "goto",
  "if",
  "implicit",
  "in",
  "int",
  "interface",
  "internal",
  "is",
  "lock",
  "long",
  "namespace",
  "new",
  "null",
  "object",
  "operator",
  "out",
  "override",
  "params",
  "private",
  "protected",
  "public",
  "readonly",
  "ref",
  "return",
  "sbyte",
  "sealed",
  "short",
  "sizeof",
  "stackalloc",
  "static",
  "string",
  "struct",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "uint",
  "ulong",
  "unchecked",
  "unsafe",
  "ushort",
  "using",
  "var",
  "virtual",
  "void",
  "volatile",
  "while",
  "yield",
]);

const elixirKeywords = new Set([
  "alias",
  "and",
  "begin",
  "break",
  "case",
  "cond",
  "def",
  "defimpl",
  "defmacro",
  "defmodule",
  "defp",
  "defprotocol",
  "defrecord",
  "defined",
  "do",
  "else",
  "end",
  "ensure",
  "false",
  "fn",
  "for",
  "if",
  "in",
  "include",
  "module",
  "next",
  "nil",
  "not",
  "or",
  "quote",
  "redo",
  "rescue",
  "retry",
  "return",
  "self",
  "then",
  "true",
  "unless",
  "until",
  "use",
  "when",
  "while",
]);

const haskellKeywords = new Set([
  "as",
  "case",
  "ccall",
  "cplusplus",
  "class",
  "data",
  "default",
  "deriving",
  "do",
  "dotnet",
  "else",
  "export",
  "family",
  "foreign",
  "forall",
  "hiding",
  "if",
  "import",
  "in",
  "infix",
  "infixl",
  "infixr",
  "instance",
  "jvm",
  "let",
  "mdo",
  "module",
  "newtype",
  "of",
  "proc",
  "qualified",
  "rec",
  "safe",
  "stdcall",
  "then",
  "type",
  "unsafe",
  "where",
]);

const luaKeywords = new Set([
  "and",
  "break",
  "do",
  "else",
  "elseif",
  "end",
  "false",
  "for",
  "function",
  "goto",
  "if",
  "in",
  "local",
  "nil",
  "not",
  "or",
  "repeat",
  "return",
  "then",
  "true",
  "until",
  "while",
]);

const cmakeKeywords = new Set([
  "add_custom_command",
  "add_custom_target",
  "add_definitions",
  "add_dependencies",
  "add_executable",
  "add_library",
  "add_subdirectory",
  "add_test",
  "and",
  "break",
  "cmake_minimum_required",
  "cmake_policy",
  "configure_file",
  "else",
  "elseif",
  "enable_language",
  "enable_testing",
  "endforeach",
  "endfunction",
  "endif",
  "endmacro",
  "endwhile",
  "execute_process",
  "export",
  "false",
  "find_file",
  "find_library",
  "find_package",
  "find_path",
  "find_program",
  "foreach",
  "function",
  "greater",
  "if",
  "include",
  "include_directories",
  "install",
  "less",
  "macro",
  "matches",
  "message",
  "off",
  "on",
  "option",
  "or",
  "project",
  "return",
  "set",
  "set_property",
  "string",
  "strequal",
  "strgreater",
  "strless",
  "target_link_libraries",
  "true",
  "unset",
  "while",
]);

const gradleKeywords = new Set([
  "allprojects",
  "ant",
  "artifacts",
  "buildscript",
  "classpath",
  "configurations",
  "copy",
  "dependencies",
  "description",
  "destinationdir",
  "dir",
  "dirs",
  "dolast",
  "dofirst",
  "exclude",
  "file",
  "filetree",
  "flatdir",
  "from",
  "group",
  "include",
  "into",
  "options",
  "project",
  "println",
  "repositories",
  "sourcesets",
  "subprojects",
  "task",
  "targetcompatibility",
  "type",
]);

const makefileKeywords = new Set([
  "-include",
  "define",
  "else",
  "endef",
  "endif",
  "export",
  "ifdef",
  "ifeq",
  "ifndef",
  "ifneq",
  "include",
  "override",
  "phony",
  "private",
  "sinclude",
  "undefine",
  "unexport",
  "vpath",
]);

const perlKeywords = new Set([
  "and",
  "binmode",
  "bless",
  "break",
  "caller",
  "chomp",
  "close",
  "continue",
  "delete",
  "die",
  "do",
  "each",
  "else",
  "elsif",
  "eval",
  "exists",
  "foreach",
  "format",
  "grep",
  "if",
  "join",
  "last",
  "local",
  "map",
  "my",
  "next",
  "not",
  "open",
  "or",
  "our",
  "package",
  "pop",
  "print",
  "push",
  "qw",
  "read",
  "redo",
  "ref",
  "require",
  "return",
  "shift",
  "sort",
  "split",
  "state",
  "sub",
  "undef",
  "unless",
  "until",
  "use",
  "wantarray",
  "warn",
  "while",
]);

const basicKeywords = new Set([
  "and",
  "call",
  "close",
  "data",
  "dim",
  "else",
  "end",
  "for",
  "gosub",
  "goto",
  "if",
  "input",
  "let",
  "line",
  "load",
  "next",
  "not",
  "on",
  "open",
  "or",
  "print",
  "randomize",
  "read",
  "rem",
  "restore",
  "return",
  "run",
  "save",
  "stop",
  "system",
  "then",
  "to",
  "while",
  "write",
  "xor",
]);

const asciidocKeywords = new Set(["CAUTION", "IMPORTANT", "NOTE", "TIP", "WARNING"]);

const pythonKeywords = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
]);

const shellKeywords = new Set([
  "alias",
  "bg",
  "break",
  "case",
  "cd",
  "command",
  "continue",
  "do",
  "done",
  "echo",
  "elif",
  "else",
  "esac",
  "eval",
  "exec",
  "exit",
  "export",
  "fg",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "local",
  "printf",
  "read",
  "readonly",
  "return",
  "set",
  "shift",
  "source",
  "test",
  "then",
  "trap",
  "until",
  "while",
]);

const sqlKeywords = new Set([
  "alter",
  "and",
  "asc",
  "as",
  "by",
  "create",
  "delete",
  "desc",
  "distinct",
  "drop",
  "exists",
  "from",
  "group",
  "having",
  "in",
  "index",
  "inner",
  "insert",
  "into",
  "is",
  "join",
  "left",
  "like",
  "limit",
  "not",
  "null",
  "offset",
  "on",
  "or",
  "order",
  "outer",
  "right",
  "select",
  "set",
  "table",
  "union",
  "update",
  "values",
  "where",
]);

const rubyKeywords = new Set([
  "alias",
  "and",
  "begin",
  "break",
  "case",
  "class",
  "def",
  "defined",
  "do",
  "else",
  "elsif",
  "end",
  "ensure",
  "false",
  "for",
  "if",
  "in",
  "module",
  "next",
  "nil",
  "not",
  "or",
  "redo",
  "rescue",
  "retry",
  "return",
  "self",
  "super",
  "then",
  "true",
  "undef",
  "unless",
  "until",
  "when",
  "while",
  "yield",
]);

const phpKeywords = new Set([
  "abstract",
  "and",
  "array",
  "as",
  "break",
  "case",
  "catch",
  "class",
  "clone",
  "const",
  "continue",
  "declare",
  "default",
  "die",
  "do",
  "echo",
  "else",
  "elseif",
  "empty",
  "enddeclare",
  "endfor",
  "endforeach",
  "endif",
  "endswitch",
  "endwhile",
  "eval",
  "exit",
  "extends",
  "false",
  "final",
  "finally",
  "for",
  "foreach",
  "function",
  "global",
  "goto",
  "if",
  "implements",
  "include",
  "include_once",
  "instanceof",
  "interface",
  "isset",
  "list",
  "namespace",
  "new",
  "null",
  "or",
  "print",
  "private",
  "protected",
  "public",
  "require",
  "require_once",
  "return",
  "static",
  "switch",
  "throw",
  "trait",
  "true",
  "try",
  "unset",
  "use",
  "var",
  "while",
  "xor",
  "yield",
]);

const cppKeywords = new Set([
  "alignof",
  "asm",
  "auto",
  "bool",
  "char",
  "class",
  "const",
  "constexpr",
  "const_cast",
  "decltype",
  "delete",
  "double",
  "dynamic_cast",
  "enum",
  "explicit",
  "export",
  "extern",
  "false",
  "float",
  "friend",
  "inline",
  "int",
  "long",
  "mutable",
  "namespace",
  "new",
  "noexcept",
  "nullptr",
  "operator",
  "private",
  "protected",
  "public",
  "register",
  "reinterpret_cast",
  "restrict",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "static_assert",
  "static_cast",
  "struct",
  "template",
  "thread_local",
  "throw",
  "true",
  "try",
  "typedef",
  "typename",
  "union",
  "unsigned",
  "using",
  "virtual",
  "void",
  "volatile",
]);

const arduinoKeywords = new Set([
  "HIGH",
  "LOW",
  "OUTPUT",
  "INPUT",
  "INPUT_PULLUP",
  "delay",
  "digitalRead",
  "digitalWrite",
  "loop",
  "pinMode",
  "setup",
]);

const coffeescriptKeywords = new Set([
  "and",
  "as",
  "await",
  "by",
  "extends",
  "from",
  "is",
  "isnt",
  "loop",
  "no",
  "not",
  "of",
  "off",
  "on",
  "or",
  "then",
  "unless",
  "until",
  "when",
  "yes",
]);

const dockerfileKeywords = new Set([
  "ADD",
  "ARG",
  "CMD",
  "COPY",
  "ENTRYPOINT",
  "ENV",
  "EXPOSE",
  "FROM",
  "HEALTHCHECK",
  "LABEL",
  "MAINTAINER",
  "ONBUILD",
  "RUN",
  "SHELL",
  "STOPSIGNAL",
  "USER",
  "VOLUME",
  "WORKDIR",
]);

const nginxKeywords = new Set([
  "access_log",
  "blocked",
  "break",
  "crit",
  "debug",
  "deny",
  "epoll",
  "error",
  "error_log",
  "events",
  "fastcgi_pass",
  "gzip",
  "http",
  "include",
  "info",
  "kqueue",
  "last",
  "listen",
  "location",
  "none",
  "notice",
  "off",
  "on",
  "permanent",
  "poll",
  "proxy_pass",
  "redirect",
  "return",
  "rewrite",
  "root",
  "rtsig",
  "select",
  "server",
  "server_name",
  "upstream",
  "warn",
  "yes",
]);

const iniKeywords = new Set(["no", "off", "on", "yes"]);

const powershellKeywords = new Set([
  "foreach",
  "function",
  "get-childitem",
  "if",
  "in",
  "param",
  "return",
]);

const dosKeywords = new Set([
  "call",
  "echo",
  "errorlevel",
  "exist",
  "exit",
  "for",
  "goto",
  "if",
  "in",
  "not",
  "off",
  "setlocal",
]);

const kotlinKeywords = new Set([
  "Boolean",
  "Byte",
  "Char",
  "Double",
  "Float",
  "Int",
  "Long",
  "Nothing",
  "Short",
  "String",
  "Unit",
  "as",
  "class",
  "data",
  "else",
  "false",
  "fun",
  "if",
  "in",
  "is",
  "null",
  "object",
  "return",
  "sealed",
  "true",
  "val",
  "var",
  "when",
]);

const swiftKeywords = new Set([
  "Bool",
  "Int",
  "String",
  "as",
  "class",
  "else",
  "enum",
  "false",
  "for",
  "func",
  "guard",
  "if",
  "import",
  "in",
  "let",
  "nil",
  "protocol",
  "return",
  "self",
  "static",
  "struct",
  "switch",
  "true",
  "typealias",
  "var",
  "while",
]);

const yamlKeywords = new Set(["false", "no", "null", "true", "yes"]);

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
    normalizeCodeLanguage(language) === "powershell"
      ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z_][A-Za-z0-9_]*)*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
      : /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g;
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
  if (normalizedLanguage === "xml" && isXmlNameToken(token)) {
    return "syntax-keyword";
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
  if (["go", "golang"].includes(normalized)) {
    return "go";
  }
  if (["cs", "csharp"].includes(normalized)) {
    return "csharp";
  }
  if (normalized === "elixir") {
    return "elixir";
  }
  if (["haskell", "hs"].includes(normalized)) {
    return "haskell";
  }
  if (normalized === "lua") {
    return "lua";
  }
  if (["cmake", "cmake.in"].includes(normalized)) {
    return "cmake";
  }
  if (normalized === "gradle") {
    return "gradle";
  }
  if (["makefile", "mk", "mak"].includes(normalized)) {
    return "makefile";
  }
  if (["perl", "pl", "pm"].includes(normalized)) {
    return "perl";
  }
  if (normalized === "basic") {
    return "basic";
  }
  if (["adoc", "asciidoc"].includes(normalized)) {
    return "asciidoc";
  }
  if (["less", "scss"].includes(normalized)) {
    return "css";
  }
  if (normalized === "py") {
    return "python";
  }
  if (["bash", "sh", "shell", "zsh"].includes(normalized)) {
    return "shell";
  }
  if (["mysql", "pgsql", "postgresql", "sql"].includes(normalized)) {
    return "sql";
  }
  if (normalized === "rb") {
    return "ruby";
  }
  if (["php", "php3", "php4", "php5", "php6"].includes(normalized)) {
    return "php";
  }
  if (["c", "cc", "cpp", "c++", "h", "h++", "hpp"].includes(normalized)) {
    return "cpp";
  }
  if (normalized === "arduino") {
    return "arduino";
  }
  if (["coffee", "coffeescript", "cson", "iced"].includes(normalized)) {
    return "coffeescript";
  }
  if (["docker", "dockerfile"].includes(normalized)) {
    return "dockerfile";
  }
  if (["nginx", "nginxconf"].includes(normalized)) {
    return "nginx";
  }
  if (["ini", "toml"].includes(normalized)) {
    return "ini";
  }
  if (["powershell", "ps"].includes(normalized)) {
    return "powershell";
  }
  if (["bat", "cmd", "dos"].includes(normalized)) {
    return "dos";
  }
  if (normalized === "kotlin") {
    return "kotlin";
  }
  if (normalized === "swift") {
    return "swift";
  }
  if (["yaml", "yml"].includes(normalized)) {
    return "yaml";
  }
  if (["atom", "html", "plist", "rss", "xhtml", "xjb", "xml", "xsd", "xsl"].includes(normalized)) {
    return "xml";
  }
  return normalized;
}

function isXmlNameToken(token: string) {
  return /^[A-Za-z][A-Za-z0-9._:-]*$/.test(token);
}

function isCodeKeyword(token: string, language: string) {
  return (
    commonKeywords.has(token) ||
    (language === "javascript" && javascriptKeywords.has(token)) ||
    (language === "rust" && rustKeywords.has(token)) ||
    (language === "java" && javaKeywords.has(token)) ||
    (language === "scala" && scalaKeywords.has(token)) ||
    (language === "go" && goKeywords.has(token)) ||
    (language === "csharp" && csharpKeywords.has(token)) ||
    (language === "elixir" && elixirKeywords.has(token)) ||
    (language === "haskell" && haskellKeywords.has(token)) ||
    (language === "lua" && luaKeywords.has(token)) ||
    (language === "cmake" && cmakeKeywords.has(token.toLowerCase())) ||
    (language === "gradle" && gradleKeywords.has(token.toLowerCase())) ||
    (language === "makefile" && makefileKeywords.has(token.toLowerCase())) ||
    (language === "perl" && perlKeywords.has(token)) ||
    (language === "basic" && basicKeywords.has(token.toLowerCase())) ||
    (language === "asciidoc" && asciidocKeywords.has(token)) ||
    (language === "python" && pythonKeywords.has(token)) ||
    (language === "shell" && shellKeywords.has(token)) ||
    (language === "sql" && sqlKeywords.has(token.toLowerCase())) ||
    (language === "ruby" && rubyKeywords.has(token)) ||
    (language === "php" && phpKeywords.has(token.toLowerCase())) ||
    (language === "cpp" && cppKeywords.has(token)) ||
    (language === "arduino" && (cppKeywords.has(token) || arduinoKeywords.has(token))) ||
    (language === "coffeescript" && coffeescriptKeywords.has(token)) ||
    (language === "dockerfile" && dockerfileKeywords.has(token.toUpperCase())) ||
    (language === "nginx" && nginxKeywords.has(token.toLowerCase())) ||
    (language === "ini" && iniKeywords.has(token.toLowerCase())) ||
    (language === "powershell" && powershellKeywords.has(token.toLowerCase())) ||
    (language === "dos" && dosKeywords.has(token.toLowerCase())) ||
    (language === "kotlin" && kotlinKeywords.has(token)) ||
    (language === "swift" && swiftKeywords.has(token)) ||
    (language === "yaml" && yamlKeywords.has(token.toLowerCase())) ||
    (language === "css" && cssKeywords.has(token))
  );
}
