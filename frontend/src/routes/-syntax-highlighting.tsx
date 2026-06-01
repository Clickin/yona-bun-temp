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

const typeScriptAnyBuiltIn = ["a", "ny"].join("");

const javascriptBuiltIns = new Set([
  "Array",
  "ArrayBuffer",
  "Boolean",
  "DataView",
  "Date",
  "Error",
  "EvalError",
  "Float32Array",
  "Float64Array",
  "Function",
  "Infinity",
  "Int16Array",
  "Int32Array",
  "Int8Array",
  "Intl",
  "InternalError",
  "JSON",
  "Map",
  "Math",
  "NaN",
  "Number",
  "Object",
  "Promise",
  "Proxy",
  "RangeError",
  "ReferenceError",
  "Reflect",
  "RegExp",
  "Set",
  "StopIteration",
  "String",
  "Symbol",
  "SyntaxError",
  "TypeError",
  "URIError",
  "Uint16Array",
  "Uint32Array",
  "Uint8Array",
  "Uint8ClampedArray",
  "WeakMap",
  "WeakSet",
  "arguments",
  typeScriptAnyBuiltIn,
  "boolean",
  "console",
  "decodeURI",
  "decodeURIComponent",
  "document",
  "encodeURI",
  "encodeURIComponent",
  "escape",
  "eval",
  "isFinite",
  "isNaN",
  "module",
  "number",
  "parseFloat",
  "parseInt",
  "require",
  "string",
  "undefined",
  "unescape",
  "window",
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

const groovyKeywords = new Set([
  "abstract",
  "as",
  "assert",
  "break",
  "case",
  "catch",
  "class",
  "continue",
  "def",
  "default",
  "else",
  "enum",
  "extends",
  "final",
  "finally",
  "for",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "new",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "trait",
  "transient",
  "try",
  "volatile",
  "while",
]);

const llvmKeywords = new Set([
  "addrspace",
  "addrspacecast",
  "align",
  "alias",
  "alloca",
  "alwaysinline",
  "and",
  "appending",
  "argmemonly",
  "asm",
  "ashr",
  "attributes",
  "available_externally",
  "begin",
  "bitcast",
  "blockaddress",
  "br",
  "byval",
  "call",
  "catch",
  "ccc",
  "cleanup",
  "cold",
  "common",
  "constant",
  "datalayout",
  "declare",
  "define",
  "dllexport",
  "dllimport",
  "external",
  "fadd",
  "fcmp",
  "fdiv",
  "fence",
  "fmul",
  "fpext",
  "fptrunc",
  "free",
  "frem",
  "fsub",
  "global",
  "icmp",
  "inbounds",
  "internal",
  "invoke",
  "load",
  "module",
  "noreturn",
  "nounwind",
  "null",
  "private",
  "readnone",
  "readonly",
  "ret",
  "select",
  "store",
  "target",
  "thread_local",
  "to",
  "triple",
  "undef",
  "volatile",
  "zeroinitializer",
]);

const excelKeywords = new Set([
  "AND",
  "AVERAGE",
  "AVERAGEIF",
  "AVERAGEIFS",
  "COUNT",
  "COUNTIF",
  "COUNTIFS",
  "FALSE",
  "IF",
  "MAX",
  "MIN",
  "NOT",
  "OR",
  "SUM",
  "SUMIF",
  "SUMIFS",
  "SUMPRODUCT",
  "TRUE",
  "VLOOKUP",
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
  "Ellipsis",
  "False",
  "None",
  "NotImplemented",
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
  "print",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield",
  "exec",
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

const objectivecKeywords = new Set([
  "BOOL",
  "FALSE",
  "IBAction",
  "IBOutlet",
  "NO",
  "NULL",
  "TRUE",
  "YES",
  "assign",
  "autoreleasepool",
  "bycopy",
  "byref",
  "class",
  "copy",
  "dynamic",
  "encode",
  "end",
  "id",
  "implementation",
  "in",
  "inout",
  "instancetype",
  "interface",
  "nil",
  "nonatomic",
  "oneway",
  "optional",
  "out",
  "private",
  "property",
  "protected",
  "protocol",
  "public",
  "readonly",
  "readwrite",
  "required",
  "retain",
  "selector",
  "self",
  "strong",
  "super",
  "synthesize",
  "throw",
  "try",
  "weak",
]);

const objectivecBuiltInPrefixes = [
  "AV",
  "CA",
  "CF",
  "CG",
  "CI",
  "CL",
  "CM",
  "CN",
  "CT",
  "MK",
  "MP",
  "MTK",
  "MTL",
  "NS",
  "SCN",
  "SK",
  "UI",
  "WK",
  "XC",
];

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
  "console",
  "document",
  "extends",
  "from",
  "global",
  "is",
  "isnt",
  "loop",
  "module",
  "no",
  "not",
  "npm",
  "of",
  "off",
  "on",
  "or",
  "print",
  "require",
  "then",
  "unless",
  "until",
  "when",
  "window",
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

const apacheKeywords = new Set([
  "all",
  "allow",
  "deny",
  "documentroot",
  "errordocument",
  "header",
  "listen",
  "loadmodule",
  "off",
  "on",
  "options",
  "order",
  "rewritecond",
  "rewriteengine",
  "rewriterule",
  "servername",
  "serverroot",
  "setenv",
  "sethandler",
]);

const httpKeywords = new Set([
  "CONNECT",
  "DELETE",
  "GET",
  "HEAD",
  "Host",
  "HTTP",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
  "TRACE",
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

const dartKeywords = new Set([
  "Future",
  "String",
  "abstract",
  "as",
  "async",
  "await",
  "bool",
  "class",
  "const",
  "dynamic",
  "enum",
  "export",
  "extends",
  "external",
  "factory",
  "false",
  "final",
  "import",
  "in",
  "is",
  "library",
  "new",
  "null",
  "part",
  "required",
  "return",
  "static",
  "super",
  "this",
  "true",
  "var",
  "void",
]);

const elmKeywords = new Set([
  "alias",
  "as",
  "case",
  "command",
  "effect",
  "else",
  "exposing",
  "if",
  "import",
  "in",
  "infix",
  "infixl",
  "infixr",
  "let",
  "module",
  "of",
  "port",
  "subscription",
  "then",
  "type",
  "where",
]);

const erlangKeywords = new Set([
  "after",
  "and",
  "andalso",
  "band",
  "begin",
  "bnot",
  "bor",
  "bsl",
  "bxor",
  "case",
  "catch",
  "cond",
  "div",
  "end",
  "false",
  "fun",
  "if",
  "let",
  "not",
  "of",
  "orelse",
  "query",
  "receive",
  "rem",
  "true",
  "try",
  "when",
  "xor",
]);

const rKeywords = new Set([
  "...",
  "F",
  "FALSE",
  "Inf",
  "NA",
  "NULL",
  "NaN",
  "T",
  "TRUE",
  "attach",
  "break",
  "detach",
  "else",
  "for",
  "function",
  "if",
  "in",
  "library",
  "next",
  "repeat",
  "require",
  "return",
  "setClass",
  "setGeneric",
  "setGroupGeneric",
  "setMethod",
  "source",
  "stop",
  "switch",
  "try",
  "tryCatch",
  "warning",
  "while",
]);

const matlabKeywords = new Set([
  "abs",
  "break",
  "case",
  "catch",
  "ceil",
  "classdef",
  "continue",
  "cos",
  "disp",
  "else",
  "elseif",
  "end",
  "enumerated",
  "events",
  "eye",
  "floor",
  "for",
  "function",
  "global",
  "if",
  "length",
  "linspace",
  "log",
  "methods",
  "ones",
  "otherwise",
  "parfor",
  "persistent",
  "properties",
  "rand",
  "return",
  "sin",
  "sqrt",
  "switch",
  "try",
  "while",
  "zeros",
]);

const awkKeywords = new Set([
  "BEGIN",
  "END",
  "break",
  "continue",
  "delete",
  "do",
  "else",
  "exit",
  "for",
  "func",
  "function",
  "if",
  "in",
  "next",
  "nextfile",
  "while",
]);

const texKeywords = new Set([
  "alpha",
  "begin",
  "beta",
  "chapter",
  "documentclass",
  "emph",
  "end",
  "frac",
  "gamma",
  "item",
  "itemize",
  "label",
  "maketitle",
  "paragraph",
  "ref",
  "section",
  "subsection",
  "subsubsection",
  "textbf",
  "textit",
  "title",
]);

const djangoKeywords = new Set([
  "add",
  "as",
  "block",
  "blocktrans",
  "capfirst",
  "comment",
  "csrf_token",
  "date",
  "debug",
  "default",
  "default_if_none",
  "dictsort",
  "dictsortreversed",
  "divisibleby",
  "elif",
  "else",
  "empty",
  "endautoescape",
  "endblock",
  "endblocktrans",
  "endcomment",
  "endfilter",
  "endfor",
  "endif",
  "endifchanged",
  "endifequal",
  "endifnotequal",
  "endlocalize",
  "endlocaltime",
  "endspaceless",
  "endtimezone",
  "endverbatim",
  "endwith",
  "escape",
  "escapejs",
  "extends",
  "filesizeformat",
  "filter",
  "first",
  "firstof",
  "floatformat",
  "force_escape",
  "for",
  "get_current_language",
  "get_current_language_bidi",
  "get_current_timezone",
  "get_digit",
  "get_language_info",
  "get_language_info_list",
  "get_media_prefix",
  "get_static_prefix",
  "if",
  "ifchanged",
  "ifequal",
  "ifnotequal",
  "include",
  "iriencode",
  "join",
  "language",
  "last",
  "length",
  "length_is",
  "linebreaks",
  "linebreaksbr",
  "linenumbers",
  "ljust",
  "load",
  "localize",
  "localtime",
  "lower",
  "make_list",
  "now",
  "phone2numeric",
  "plural",
  "pluralize",
  "pprint",
  "random",
  "regroup",
  "removetags",
  "rjust",
  "safe",
  "safeseq",
  "slice",
  "slugify",
  "spaceless",
  "ssi",
  "static",
  "stringformat",
  "striptags",
  "templatetag",
  "time",
  "timesince",
  "timezone",
  "timeuntil",
  "title",
  "trans",
  "truncatechars",
  "truncatewords",
  "truncatewords_html",
  "unordered_list",
  "unlocalize",
  "upper",
  "url",
  "urlencode",
  "urlize",
  "urlizetrunc",
  "utc",
  "verbatim",
  "widthratio",
  "with",
  "wordcount",
  "wordwrap",
  "yesno",
]);

const htmlbarsKeywords = new Set([
  "action",
  "as",
  "collection",
  "component",
  "concat",
  "debugger",
  "each",
  "each-in",
  "else",
  "get",
  "hash",
  "if",
  "input",
  "link-to",
  "loc",
  "log",
  "mut",
  "outlet",
  "partial",
  "query-params",
  "render",
  "textarea",
  "unbound",
  "unless",
  "with",
  "yield",
  "view",
]);

const accesslogKeywords = new Set([
  "CONNECT",
  "DELETE",
  "GET",
  "HEAD",
  "OPTIONS",
  "PATCH",
  "POST",
  "PUT",
  "TRACE",
]);

const yamlKeywords = new Set(["false", "no", "null", "true", "yes"]);

const cssKeywords = new Set([
  "charset",
  "important",
  "keyframes",
  "media",
  "none",
  "page",
  "supports",
]);

const clojureKeywords = new Set([
  "->",
  "->>",
  "apply",
  "case",
  "cond",
  "def",
  "defn",
  "do",
  "doseq",
  "false",
  "fn",
  "fn?",
  "if",
  "if-let",
  "if-not",
  "let",
  "letfn",
  "map",
  "nil",
  "println",
  "true",
  "when",
]);

export function highlightCodeBlock(code: string, language: string | undefined) {
  const lines = code.split("\n");
  const normalizedLanguage = normalizeCodeLanguage(language ?? "");
  if (normalizedLanguage === "asciidoc") {
    let inCommentBlock = false;
    return lines.flatMap((line, lineIndex) => {
      const isCommentBoundary = /^\/{4,}\s*$/.test(line);
      const isCommentLine = inCommentBlock || isCommentBoundary;
      const nodes = isCommentLine
        ? [
            <span className="syntax-token syntax-comment" key={`asciidoc-comment-${lineIndex}`}>
              {line.length > 0 ? line : "\u00a0"}
            </span>,
          ]
        : highlightCodeLine(line, language ?? "");
      if (isCommentBoundary) {
        inCommentBlock = !inCommentBlock;
      }
      return lineIndex === lines.length - 1 ? nodes : [...nodes, "\n"];
    });
  }
  return lines.flatMap((line, lineIndex) => {
    const nodes = highlightCodeLine(line, language ?? "");
    return lineIndex === lines.length - 1 ? nodes : [...nodes, "\n"];
  });
}

export function highlightCodeLine(line: string, language: string) {
  const normalizedLanguage = normalizeCodeLanguage(language);
  const tokenPattern =
    normalizedLanguage === "powershell"
      ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z_][A-Za-z0-9_]*)*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
      : normalizedLanguage === "htmlbars"
        ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\{\{!--.*?--\}\}|\{\{![^}\n]*\}\}|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z_][A-Za-z0-9_]*)*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
        : normalizedLanguage === "xml"
          ? /("(?:(?:\\.|[^"\\])*)"|'(?:\\.|[^'\\])*'|<!--.*?-->|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_:-]*\b|<\/?|\/?>|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
          : normalizedLanguage === "django"
            ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\{#[^}\n]*#\}|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
            : normalizedLanguage === "python"
              ? /((?:fr|rf|f)"""(?:\\.|[\s\S])*?"""|(?:fr|rf|f)'''(?:\\.|[\s\S])*?'''|(?:fr|rf|f)"(?:\\.|[^"\\])*"|(?:fr|rf|f)'(?:\\.|[^'\\])*'|(?:u|r|ur|b|br)"""(?:\\.|[\s\S])*?"""|(?:u|r|ur|b|br)'''(?:\\.|[\s\S])*?'''|"""(?:\\.|[\s\S])*?"""|'''(?:\\.|[\s\S])*?'''|(?:u|r|ur|b|br)"(?:\\.|[^"\\])*"|(?:u|r|ur|b|br)'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\([^)\n]*\)(?=\s*(?:->|:))|^(?:>>>|\.\.\.)|^[\t ]*@[A-Za-z_][A-Za-z0-9_.]*|#.*$|\b0[bB][01]+[lLjJ]?\b|\b0[oO][0-7]+[lLjJ]?\b|-?\b0[xX][0-9A-Fa-f]+[lLjJ]?\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?[lLjJ]?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
              : normalizedLanguage === "shell"
                ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z_][A-Za-z0-9_]*)*\b|[{}()[\].,;:+\-*/%=<>!&|?#$]+)/g
                : normalizedLanguage === "accesslog"
                  ? /(\b\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?\b|\b\d+\b|\b(?:GET|POST|HEAD|PUT|DELETE|CONNECT|OPTIONS|PATCH|TRACE)\b|\[[^\]\n]*\]|[A-Za-z][A-Za-z0-9._/-]*|[{}()[\].,;:"+\-*/%=<>!&|?]+)/g
                  : normalizedLanguage === "clojure"
                    ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|;.*$|\b\d+(?:\.\d+)?\b|[A-Za-z_*+\-<>=!?][A-Za-z0-9_*+\-<>=!?]*|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                    : normalizedLanguage === "clojure-repl"
                      ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|^([\w.-]+|\s*#_)=>|;.*$|\b\d+(?:\.\d+)?\b|[A-Za-z_*+\-<>=!?][A-Za-z0-9_*+\-<>=!?]*|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                      : normalizedLanguage === "haml"
                        ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|^\s*(?:!=#|=#|-#|\/).*$|!!!|%[A-Za-z][A-Za-z0-9_-]*|#[A-Za-z0-9_-]+|\.[A-Za-z0-9_-]+|[A-Za-z_][A-Za-z0-9_-]*|\b\d+(?:\.\d+)?\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                        : normalizedLanguage === "cmake"
                          ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
                          : normalizedLanguage === "excel"
                            ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b[A-Z]{0,2}\d*:[A-Z]{0,2}\d*\b|\b[A-Z]{1,2}\d+\b|\b\d+(?:\.\d+)?%?|\b[A-Za-z][A-Za-z0-9_.]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                            : normalizedLanguage === "makefile"
                              ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_-]*\b|[{}()[\].,;:+\-*/%=<>!&|?#$@]+)/g
                              : normalizedLanguage === "markdown"
                                ? /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]|\([^)\n]+\)|^#{1,6}|^>|^[-*+]|\d+\.|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
                                : normalizedLanguage === "ruby"
                                  ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*[!?=]?\b|[{}()[\].,;:+\-*/%=<>!&|?#$@]+)/g
                                  : normalizedLanguage === "php"
                                    ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\$[A-Za-z_][A-Za-z0-9_]*\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#$]+)/g
                                    : normalizedLanguage === "lua"
                                      ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--.*$|-?\b0[xX][0-9A-Fa-f]+\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                      : normalizedLanguage === "yaml"
                                        ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_-]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
                                        : normalizedLanguage === "sql"
                                          ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_.]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                          : normalizedLanguage === "perl"
                                            ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|#.*$|\b0[0-7_]+\b|\b0[xX][0-9A-Fa-f_]+\b|\b[1-9][0-9_]*(?:\.[0-9_]+)?\b|\b[0_]\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#$@]+)/g
                                            : normalizedLanguage === "basic"
                                              ? /("(?:\\.|[^"\\])*"|[Rr][Ee][Mm]\b.*$|'.*$|\b[0-9]+[0-9edED.]*[#!]?|&[hH][0-9A-Fa-f]{1,4}|&[oO][0-7]{1,6}|\b[A-Za-z][A-Za-z0-9_$%!#]*\b|[{}()[\].,;:+\-*/%=<>!&|?&'])/g
                                              : normalizedLanguage === "arduino"
                                                ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|-?\b0[xX][0-9A-Fa-f]+\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                : normalizedLanguage === "coffeescript"
                                                  ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|-?\b0[xX][0-9A-Fa-f]+\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?\b|@[A-Za-z_$][A-Za-z0-9_$]*\b|\b[A-Za-z_$][A-Za-z0-9_$]*\b|[{}()[\].,;:+\-*/%=<>!&|?@#]+)/g
                                                  : normalizedLanguage === "dockerfile"
                                                    ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#$]+)/g
                                                    : normalizedLanguage === "nginx"
                                                      ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_/-]*\b|[{}()[\].,;:+\-*/%=<>!&|?#$@]+)/g
                                                      : normalizedLanguage === "apache"
                                                        ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#$%]+)/g
                                                        : normalizedLanguage === "ini"
                                                          ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|;.*$|#.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_-]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
                                                          : normalizedLanguage === "css"
                                                            ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\*.*?\*\/|\[[^\]\n]+\]|@[A-Za-z-]+|#[A-Za-z0-9_-]+|\.[A-Za-z0-9_-]+|::?[A-Za-z0-9_-]+(?:\([^)\n]*\))?|\b\d+(?:\.\d+)?(?:%|[A-Za-z]+)?\b|\b[A-Za-z-][A-Za-z0-9_-]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                            : normalizedLanguage === "rust"
                                                              ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b0[bB][01_]+(?:[iu](?:8|16|32|64|128|size))?\b|\b0[oO][0-7_]+(?:[iu](?:8|16|32|64|128|size))?\b|\b0[xX][0-9A-Fa-f_]+(?:[iu](?:8|16|32|64|128|size))?\b|\b\d[\d_]*(?:\.[0-9_]+)?(?:[eE][-+]?[0-9_]+)?(?:[iu](?:8|16|32|64|128|size)|f(?:32|64))?\b|\b[A-Za-z_][A-Za-z0-9_]*!?\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                              : normalizedLanguage === "java"
                                                                ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b0[bB][01][01_]*(?:[lLfF])?\b|\b0[xX][0-9A-Fa-f][0-9A-Fa-f_]*(?:[lLfF])?\b|(?:\b\d[\d_]*(?:\.[\d_]+)?|\.\d[\d_]*)(?:[eE][-+]?\d+)?[lLfF]?\b|\b[A-Za-z_$][A-Za-z0-9_$]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                : normalizedLanguage === "scala"
                                                                  ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|-?\b0[xX][0-9A-Fa-f]+\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                  : normalizedLanguage === "go"
                                                                    ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\/\/.*$|\/\*.*?\*\/|-?\b0[xX][0-9A-Fa-f]+[dflsi]?\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?[dflsi]?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|:=|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                    : normalizedLanguage ===
                                                                        "csharp"
                                                                      ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|-?\b0[xX][0-9A-Fa-f]+\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                      : normalizedLanguage ===
                                                                          "elixir"
                                                                        ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\b0[0-7_]+\b|\b0[xX][0-9A-Fa-f_]+\b|\b[1-9][0-9_]*(?:\.[0-9_]+)?\b|\b[0_]\b|\b[A-Za-z_][A-Za-z0-9_]*[!?]?\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                        : normalizedLanguage ===
                                                                            "haskell"
                                                                          ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--.*$|\{-[\s\S]*?-\}|-?\b0[xX][0-9A-Fa-f]+\b|-?(?:\b\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_']*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                          : normalizedLanguage ===
                                                                              "erlang"
                                                                            ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|%.*$|\b\d+#[A-Fa-f0-9]+\b|\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_']*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
                                                                            : normalizedLanguage ===
                                                                                "r"
                                                                              ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|#.*$|\b0[xX][0-9A-Fa-f]+[Li]?\b|\b\d+(?:\.\d*)?(?:[eE][+-]?\d*)?[Li]?\b|\.\d+(?:[eE][+-]?\d*)?\b|\b[A-Za-z.][A-Za-z0-9._]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
                                                                              : normalizedLanguage ===
                                                                                  "matlab"
                                                                                ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|%.*$|\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#]+)/g
                                                                                : normalizedLanguage ===
                                                                                    "tex"
                                                                                  ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|%.*$|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#\\]+)/g
                                                                                  : normalizedLanguage ===
                                                                                      "elm"
                                                                                    ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|--.*$|\{-[\s\S]*?-\}|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_']*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                                    : normalizedLanguage ===
                                                                                        "awk"
                                                                                      ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#.*$|\$[A-Za-z0-9_#@]+|\$\{[^}\n]*\}|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?#$]+)/g
                                                                                      : normalizedLanguage ===
                                                                                          "javascript"
                                                                                        ? /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b0[bB][01]+\b|\b0[oO][0-7]+\b|\b0[xX][0-9A-Fa-f]+\b|\b\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g
                                                                                        : /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/.*$|\/\*.*?\*\/|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[{}()[\].,;:+\-*/%=<>!&|?]+)/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of line.matchAll(tokenPattern)) {
    const token = match[0] ?? "";
    const tokenStart = match.index ?? 0;
    if (tokenStart > cursor) {
      parts.push(line.slice(cursor, tokenStart));
    }
    if (normalizedLanguage === "python" && pythonFStringIsInterpolated(token)) {
      parts.push(...pythonFStringTokenParts(token, line, tokenStart));
      cursor = tokenStart + token.length;
      continue;
    }
    parts.push(
      <span
        className={`syntax-token ${syntaxTokenClass(token, language, line, tokenStart)}`}
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

function syntaxTokenClass(token: string, language: string, line: string, tokenStart: number) {
  const normalizedLanguage = normalizeCodeLanguage(language);
  if (
    token.startsWith("//") ||
    token.startsWith("/*") ||
    (normalizedLanguage === "xml" && token.startsWith("<!--")) ||
    (normalizedLanguage === "lua" && token.startsWith("--")) ||
    (normalizedLanguage === "elixir" && token.startsWith("#")) ||
    (normalizedLanguage === "cmake" && token.startsWith("#")) ||
    (normalizedLanguage === "makefile" && token.startsWith("#")) ||
    (normalizedLanguage === "shell" && token.startsWith("#")) ||
    (normalizedLanguage === "python" && token.startsWith("#")) ||
    (normalizedLanguage === "yaml" && token.startsWith("#")) ||
    (normalizedLanguage === "r" && token.startsWith("#")) ||
    (normalizedLanguage === "awk" && token.startsWith("#")) ||
    (normalizedLanguage === "django" && token.startsWith("{#")) ||
    (normalizedLanguage === "htmlbars" && token.startsWith("{{!")) ||
    (normalizedLanguage === "erlang" && token.startsWith("%")) ||
    (normalizedLanguage === "matlab" && token.startsWith("%")) ||
    (normalizedLanguage === "tex" && token.startsWith("%")) ||
    (normalizedLanguage === "elm" && (token.startsWith("--") || token.startsWith("{-"))) ||
    (normalizedLanguage === "perl" && token.startsWith("#")) ||
    (normalizedLanguage === "coffeescript" && token.startsWith("#")) ||
    (normalizedLanguage === "dockerfile" && token.startsWith("#")) ||
    (normalizedLanguage === "nginx" && token.startsWith("#")) ||
    (normalizedLanguage === "apache" && token.startsWith("#")) ||
    (normalizedLanguage === "sql" && token.startsWith("--")) ||
    (normalizedLanguage === "ruby" && token.startsWith("#")) ||
    (normalizedLanguage === "php" && token.startsWith("#")) ||
    (normalizedLanguage === "ini" && (token.startsWith(";") || token.startsWith("#"))) ||
    (normalizedLanguage === "basic" && (/^rem\b/i.test(token) || token.startsWith("'")))
  ) {
    return "syntax-comment";
  }
  if (normalizedLanguage === "xml" && isXmlNameToken(token)) {
    return "syntax-keyword";
  }
  if (
    normalizedLanguage === "json" &&
    token.startsWith('"') &&
    jsonStringTokenIsObjectKey(line, tokenStart, token)
  ) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "diff" && diffLineMarkerIsChange(token, line, tokenStart)) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "accesslog" && /^\[.*\]$/.test(token)) {
    return "syntax-string";
  }
  if (normalizedLanguage === "haml" && isHamlStructuralToken(token, line, tokenStart)) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "haml" && /^(?:!=#|=#|-#|\/)/.test(token.trimStart())) {
    return "syntax-comment";
  }
  if (normalizedLanguage === "clojure-repl" && clojureReplPromptIsMeta(token, tokenStart)) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "python" && pythonReplPromptIsMeta(token, tokenStart)) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "python" && pythonDecoratorIsMeta(token, tokenStart)) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "python" && pythonDeclarationTitleIsTitle(token, line, tokenStart)) {
    return "syntax-title";
  }
  if (normalizedLanguage === "python" && pythonDeclarationParamsIsParams(token, line, tokenStart)) {
    return "syntax-params";
  }
  if (normalizedLanguage === "excel" && excelKeywords.has(token.toUpperCase())) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "markdown") {
    return markdownTokenClass(token);
  }
  if (normalizedLanguage === "css" && /^#[0-9A-Fa-f]{3,8}$/.test(token)) {
    return "syntax-number";
  }
  if (normalizedLanguage === "css" && isCssStructuralToken(token, line, tokenStart)) {
    return "syntax-keyword";
  }
  if (normalizedLanguage === "python" && pythonPrefixedStringIsString(token)) {
    return "syntax-string";
  }
  if (token.startsWith('"') || token.startsWith("'")) {
    return "syntax-string";
  }
  if (
    /^\d/.test(token) ||
    (normalizedLanguage === "basic" && /^&[hHoO]/.test(token)) ||
    (normalizedLanguage === "lua" && /^-?(?:\d|\.\d)/.test(token)) ||
    (normalizedLanguage === "python" && /^-?(?:\d|\.\d)/.test(token)) ||
    ((normalizedLanguage === "java" || normalizedLanguage === "python") && /^\.\d/.test(token)) ||
    (normalizedLanguage === "scala" && /^-?(?:\d|\.\d)/.test(token)) ||
    (normalizedLanguage === "go" && /^-?(?:\d|\.\d)/.test(token)) ||
    (normalizedLanguage === "csharp" && /^-?(?:\d|\.\d)/.test(token)) ||
    (normalizedLanguage === "haskell" && /^-?(?:\d|\.\d)/.test(token)) ||
    (normalizedLanguage === "arduino" && /^-?(?:\d|\.\d)/.test(token)) ||
    (normalizedLanguage === "coffeescript" && /^-?(?:\d|\.\d)/.test(token)) ||
    (normalizedLanguage === "accesslog" && isAccesslogAddressToken(token))
  ) {
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
  if (normalized === "jsp") {
    return "java";
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
  if (["clj", "clojure"].includes(normalized)) {
    return "clojure";
  }
  if (normalized === "clojure-repl") {
    return "clojure-repl";
  }
  if (["markdown", "md", "mkdown", "mkd"].includes(normalized)) {
    return "markdown";
  }
  if (["cmake", "cmake.in"].includes(normalized)) {
    return "cmake";
  }
  if (normalized === "gradle") {
    return "gradle";
  }
  if (normalized === "groovy") {
    return "groovy";
  }
  if (normalized === "llvm") {
    return "llvm";
  }
  if (normalized === "haml") {
    return "haml";
  }
  if (["excel", "xls", "xlsx"].includes(normalized)) {
    return "excel";
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
  if (["gyp", "py"].includes(normalized)) {
    return "python";
  }
  if (["bash", "console", "sh", "shell", "zsh"].includes(normalized)) {
    return "shell";
  }
  if (["mysql", "pgsql", "postgresql", "sql"].includes(normalized)) {
    return "sql";
  }
  if (["gemspec", "irb", "podspec", "rb", "thor"].includes(normalized)) {
    return "ruby";
  }
  if (["php", "php3", "php4", "php5", "php6"].includes(normalized)) {
    return "php";
  }
  if (["c", "cc", "cpp", "c++", "h", "h++", "hpp"].includes(normalized)) {
    return "cpp";
  }
  if (["mm", "obj-c", "objc", "objectivec"].includes(normalized)) {
    return "objectivec";
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
  if (["apache", "apacheconf"].includes(normalized)) {
    return "apache";
  }
  if (["http", "https"].includes(normalized)) {
    return "http";
  }
  if (["diff", "patch"].includes(normalized)) {
    return "diff";
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
  if (normalized === "dart") {
    return "dart";
  }
  if (normalized === "elm") {
    return "elm";
  }
  if (["erl", "erlang"].includes(normalized)) {
    return "erlang";
  }
  if (normalized === "r") {
    return "r";
  }
  if (normalized === "matlab") {
    return "matlab";
  }
  if (normalized === "awk") {
    return "awk";
  }
  if (["tex", "latex"].includes(normalized)) {
    return "tex";
  }
  if (["django", "jinja"].includes(normalized)) {
    return "django";
  }
  if (normalized === "htmlbars") {
    return "htmlbars";
  }
  if (normalized === "accesslog") {
    return "accesslog";
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

function jsonStringTokenIsObjectKey(line: string, tokenStart: number, token: string) {
  const afterToken = line.slice(tokenStart + token.length);
  return /^\s*:/.test(afterToken);
}

function diffLineMarkerIsChange(token: string, line: string, tokenStart: number) {
  const marker = token[0];
  return tokenStart === 0 && ["+", "-", "!"].includes(marker) && line.startsWith(marker);
}

function isHamlStructuralToken(token: string, line: string, tokenStart: number) {
  if (token === "!!!" || /^%[A-Za-z][A-Za-z0-9_-]*$/.test(token)) {
    return true;
  }
  if (/^[.#][A-Za-z0-9_-]+$/.test(token)) {
    return true;
  }
  const before = line.slice(0, tokenStart);
  const after = line.slice(tokenStart + token.length);
  return /[(\s]$/.test(before) && /^\s*=/.test(after);
}

function clojureReplPromptIsMeta(token: string, tokenStart: number) {
  return tokenStart === 0 && /^([\w.-]+|\s*#_)=>$/.test(token);
}

function pythonReplPromptIsMeta(token: string, tokenStart: number) {
  return tokenStart === 0 && /^(>>>|\.\.\.)$/.test(token);
}

function pythonDecoratorIsMeta(token: string, tokenStart: number) {
  return tokenStart === 0 && /^[\t ]*@[A-Za-z_][A-Za-z0-9_.]*$/.test(token);
}

function pythonDeclarationTitleIsTitle(token: string, line: string, tokenStart: number) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
    return false;
  }
  return /\b(?:def|class)\s+$/.test(line.slice(0, tokenStart));
}

function pythonDeclarationParamsIsParams(token: string, line: string, tokenStart: number) {
  if (!/^\([^)\n]*\)$/.test(token)) {
    return false;
  }
  return /\b(?:def|class)\s+[A-Za-z_][A-Za-z0-9_]*\s*$/.test(line.slice(0, tokenStart));
}

function pythonFStringIsInterpolated(token: string) {
  return /^(?:fr|rf|f)("""|'''|["'])[\s\S]*\{[^}\n]+\}[\s\S]*\1$/i.test(token);
}

function pythonPrefixedStringIsString(token: string) {
  return /^(?:fr|rf|f|u|r|ur|b|br)("""|'''|["'])[\s\S]*\1$/i.test(token);
}

function pythonFStringTokenParts(token: string, line: string, tokenStart: number) {
  const match = token.match(/^((?:fr|rf|f)("""|'''|["']))([\s\S]*)\2$/i);
  if (!match) {
    return [];
  }
  const prefix = match[1] ?? "";
  const quote = match[2] ?? "";
  const body = match[3] ?? "";
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let stringPrefix = prefix;
  for (const substitution of body.matchAll(/\{([^}\n]+)\}/g)) {
    const substitutionToken = substitution[0] ?? "";
    const substitutionStart = substitution.index ?? 0;
    const before = body.slice(cursor, substitutionStart);
    if (before || stringPrefix) {
      parts.push(
        <span className="syntax-token syntax-string" key={`${tokenStart}-fstring-${parts.length}`}>
          {stringPrefix + before}
        </span>,
      );
    }
    parts.push(
      <span
        className="syntax-token syntax-punctuation"
        key={`${tokenStart}-fstring-open-${parts.length}`}
      >
        {"{"}
      </span>,
    );
    const expression = substitution[1] ?? "";
    if (expression) {
      parts.push(
        <span
          className={`syntax-token ${syntaxTokenClass(expression, "python", line, tokenStart + substitutionStart + 1)}`}
          key={`${tokenStart}-fstring-expression-${parts.length}`}
        >
          {expression}
        </span>,
      );
    }
    parts.push(
      <span
        className="syntax-token syntax-punctuation"
        key={`${tokenStart}-fstring-close-${parts.length}`}
      >
        {"}"}
      </span>,
    );
    stringPrefix = "";
    cursor = substitutionStart + substitutionToken.length;
  }
  parts.push(
    <span className="syntax-token syntax-string" key={`${tokenStart}-fstring-tail`}>
      {body.slice(cursor) + quote}
    </span>,
  );
  return parts;
}

function markdownTokenClass(token: string) {
  if (/^(#{1,6}|>|[-*+]|\d+\.)$/.test(token)) {
    return "syntax-keyword";
  }
  if (/^(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\])$/.test(token)) {
    return "syntax-string";
  }
  if (/^\([^)\n]+\)$/.test(token)) {
    return "syntax-identifier";
  }
  if (/^\d/.test(token)) {
    return "syntax-number";
  }
  if (/^[{}()[\].,;:+\-*/%=<>!&|?#]+$/.test(token)) {
    return "syntax-punctuation";
  }
  return "syntax-identifier";
}

function isCssStructuralToken(token: string, line: string, tokenStart: number) {
  if (/^(@[A-Za-z-]+|[#.][A-Za-z0-9_-]+|\[[^\]\n]+\]|::?[A-Za-z0-9_-]+)/.test(token)) {
    return true;
  }
  if (cssKeywords.has(token.toLowerCase())) {
    return true;
  }
  const after = line.slice(tokenStart + token.length);
  return /^[A-Za-z-][A-Za-z0-9_-]*$/.test(token) && /^\s*:/.test(after);
}

function isCodeKeyword(token: string, language: string) {
  return (
    commonKeywords.has(token) ||
    (language === "javascript" &&
      (javascriptKeywords.has(token) || javascriptBuiltIns.has(token))) ||
    (language === "rust" && rustKeywords.has(token)) ||
    (language === "java" && javaKeywords.has(token)) ||
    (language === "scala" && scalaKeywords.has(token)) ||
    (language === "go" && goKeywords.has(token)) ||
    (language === "csharp" && csharpKeywords.has(token)) ||
    (language === "elixir" && elixirKeywords.has(token)) ||
    (language === "haskell" && haskellKeywords.has(token)) ||
    (language === "lua" && luaKeywords.has(token)) ||
    ((language === "clojure" || language === "clojure-repl") && clojureKeywords.has(token)) ||
    (language === "cmake" && cmakeKeywords.has(token.toLowerCase())) ||
    (language === "gradle" && gradleKeywords.has(token.toLowerCase())) ||
    (language === "groovy" && groovyKeywords.has(token)) ||
    (language === "llvm" && llvmKeywords.has(token)) ||
    (language === "excel" && excelKeywords.has(token.toUpperCase())) ||
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
    (language === "objectivec" &&
      (objectivecKeywords.has(token) ||
        objectivecBuiltInPrefixes.some((prefix) => token.startsWith(prefix)))) ||
    (language === "arduino" && (cppKeywords.has(token) || arduinoKeywords.has(token))) ||
    (language === "coffeescript" && coffeescriptKeywords.has(token)) ||
    (language === "dockerfile" && dockerfileKeywords.has(token.toUpperCase())) ||
    (language === "nginx" && nginxKeywords.has(token.toLowerCase())) ||
    (language === "apache" && apacheKeywords.has(token.toLowerCase())) ||
    (language === "http" && httpKeywords.has(token)) ||
    (language === "ini" && iniKeywords.has(token.toLowerCase())) ||
    (language === "powershell" && powershellKeywords.has(token.toLowerCase())) ||
    (language === "dos" && dosKeywords.has(token.toLowerCase())) ||
    (language === "kotlin" && kotlinKeywords.has(token)) ||
    (language === "swift" && swiftKeywords.has(token)) ||
    (language === "dart" && dartKeywords.has(token)) ||
    (language === "elm" && elmKeywords.has(token)) ||
    (language === "erlang" && erlangKeywords.has(token)) ||
    (language === "r" && rKeywords.has(token)) ||
    (language === "matlab" && matlabKeywords.has(token)) ||
    (language === "awk" && awkKeywords.has(token)) ||
    (language === "tex" && texKeywords.has(token)) ||
    (language === "django" && djangoKeywords.has(token)) ||
    (language === "htmlbars" && htmlbarsKeywords.has(token)) ||
    (language === "accesslog" && accesslogKeywords.has(token)) ||
    (language === "yaml" && yamlKeywords.has(token.toLowerCase())) ||
    (language === "css" && cssKeywords.has(token))
  );
}

function isAccesslogAddressToken(token: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}(?::\d{1,5})?$/.test(token);
}
