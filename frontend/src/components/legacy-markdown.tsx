/* Canonical legacy-Yona Markdown rendering on TanStack Markdown (plan Phase D).
 *
 * Two rendering paths share one extension/component model:
 *  - `LegacyMarkdown`: TanStack Markdown React adapter for plain surfaces
 *    (no raw HTML — project home/README, milestone, commit, pull request,
 *    board file-as-markdown, editor previews, markdown help).
 *  - `LegacyMarkdownHtml`: TanStack Markdown parse + HTML render, then a
 *    DOMParser-based schema walker that rebuilds React elements for the
 *    surfaces legacy renders with raw HTML (issue body/comments, issue-form
 *    preview, board post body/history/comments). The React adapter cannot
 *    express paired inline HTML (`<b>x</b>` is three AST nodes), so the HTML
 *    path is required to preserve legacy raw-HTML semantics.
 *
 * Legacy semantics ported here (evidence: `yona-original/app/utils/Markdown.java`
 * — marked `{gfm, tables, breaks, headerIds, smartLists}`, owasp sanitizer,
 * `transformIssueLink`; `yona-original/public/javascripts/lib/marked.js` —
 * `headerPrefix: 'yb-header-'`, `head-anchor` links, GFM autolink literals):
 *  - hard breaks (`breaks: true`: single newline → <br>),
 *  - GFM autolink literals (bare ftp/http/https/www/email),
 *  - `yb-header-*` heading ids + `.head-anchor` `#` links,
 *  - issue/commit/mention reference links (`issueLink`, `issue-state`,
 *    `user-link`, `project-link`, `org-link`),
 *  - sanitized raw HTML constrained by the legacy allowlist (ported from
 *    hast-util-sanitize `defaultSchema` + the legacy owasp policy deltas).
 *
 * Extension order matters when combining: gfmAutolinkLiterals →
 * yona references → legacyHardBreaks → (document transforms).
 */
import {
  parseMarkdown,
  type InlineNode,
  type MarkdownDocument,
  type MarkdownExtension,
  type TextNode,
} from "@tanstack/markdown";
import { renderHtml } from "@tanstack/markdown/html";
import { Markdown as TanStackMarkdown } from "@tanstack/markdown/react";
import { highlightCodeToReactNodes } from "./markdown-highlight";
import {
  Fragment,
  createElement,
  isValidElement,
  useMemo,
  type ComponentType,
  type ReactNode,
} from "react";
import { prefixBasePath } from "../runtime-config";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches the
// TanStack adapter's ComponentMap (`string | ComponentType<any>` per tag).
export type MarkdownComponents = Record<string, ComponentType<any> | undefined>;

/* ---------------------------------------------------------------------------
 * URL safety (ports react-markdown `defaultUrlTransform`, which the previous
 * pipeline applied; TanStack's parser-level sanitizeUrl already neutralizes
 * executable schemes before this runs).
 * ------------------------------------------------------------------------- */

const SAFE_PROTOCOL = /^(https?|ircs?|mailto|xmpp)$/iu;

export function defaultUrlTransform(value: string): string {
  const colon = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash = value.indexOf("/");
  if (
    colon === -1 ||
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    SAFE_PROTOCOL.test(value.slice(0, colon))
  ) {
    return value;
  }
  return "";
}

/** Root-relative app URLs get the runtime base path; protocol-relative and
 * external URLs pass through. (Previous `project/issueMarkdownUrlTransform`.) */
export function basePathUrlTransform(basePath: string, url: string): string {
  const safeUrl = defaultUrlTransform(url);
  return url.startsWith("/") && !url.startsWith("//") ? prefixBasePath(basePath, safeUrl) : safeUrl;
}

/* ---------------------------------------------------------------------------
 * Sanitize schema. DOM-attribute-form port of hast-util-sanitize
 * `defaultSchema@5` plus the legacy owasp deltas; the previous pipeline fed
 * exactly this schema to rehype-sanitize. Attribute names are lowercase
 * because this schema filters DOMParser attributes (HTML path).
 * ------------------------------------------------------------------------- */

type AttributeDefinition = string | readonly [name: string, ...allowed: Array<string | RegExp>];

export type LegacySanitizeSchema = {
  ancestors: Record<string, string[]>;
  attributes: Record<string, AttributeDefinition[]>;
  clobber: string[];
  clobberPrefix: string;
  protocols: Record<string, string[]>;
  required: Record<string, Record<string, unknown>>;
  strip: string[];
  tagNames: string[];
};

const ARIA = ["aria-describedby", "aria-label", "aria-labelledby"] as const;

export const LEGACY_SANITIZE_BASE_SCHEMA: LegacySanitizeSchema = {
  ancestors: {
    tbody: ["table"],
    td: ["table"],
    th: ["table"],
    thead: ["table"],
    tfoot: ["table"],
    tr: ["table"],
  },
  attributes: {
    a: [
      ...ARIA,
      "data-footnote-backref",
      "data-footnote-ref",
      ["class", "data-footnote-backref"],
      "href",
    ],
    blockquote: ["cite"],
    code: [["class", /^language-./u]],
    del: ["cite"],
    div: ["itemscope", "itemtype"],
    dl: [...ARIA],
    h2: [["class", "sr-only"]],
    img: [...ARIA, "longdesc", "src"],
    input: [
      ["disabled", "true"],
      ["type", "checkbox"],
    ],
    ins: ["cite"],
    li: [["class", "task-list-item"]],
    ol: [...ARIA, ["class", "contains-task-list"]],
    q: ["cite"],
    section: ["data-footnotes", ["class", "footnotes"]],
    source: ["src", "srcset"],
    iframe: ["src", "width", "height", "allowfullscreen"],
    video: ["controls", "width", "height"],
    summary: [...ARIA],
    table: [...ARIA],
    ul: [...ARIA, ["class", "contains-task-list"]],
    "*": [
      "abbr",
      "accept",
      "accept-charset",
      "accesskey",
      "action",
      "align",
      "alt",
      "axis",
      "border",
      "cellpadding",
      "cellspacing",
      "char",
      "charoff",
      "charset",
      "checked",
      "clear",
      "colspan",
      "color",
      "cols",
      "compact",
      "coords",
      "datetime",
      "dir",
      "enctype",
      "frame",
      "hspace",
      "headers",
      "height",
      "hreflang",
      "for",
      "id",
      "ismap",
      "itemprop",
      "label",
      "lang",
      "maxlength",
      "media",
      "method",
      "multiple",
      "name",
      "nohref",
      "noshade",
      "nowrap",
      "open",
      "prompt",
      "readonly",
      "rev",
      "rowspan",
      "rows",
      "rules",
      "scope",
      "selected",
      "shape",
      "size",
      "span",
      "style",
      "start",
      "summary",
      "tabindex",
      "title",
      "usemap",
      "valign",
      "value",
      "width",
      ["class"],
    ],
  },
  clobber: [],
  clobberPrefix: "user-content-",
  protocols: {
    cite: ["http", "https"],
    href: ["http", "https", "irc", "ircs", "mailto", "xmpp"],
    longdesc: ["http", "https"],
    src: ["http", "https"],
  },
  required: {
    iframe: { allowfullscreen: true },
    input: { disabled: true, type: "checkbox" },
  },
  strip: ["script"],
  tagNames: [
    "a",
    "b",
    "blockquote",
    "br",
    "code",
    "dd",
    "del",
    "details",
    "div",
    "dl",
    "dt",
    "em",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "hr",
    "i",
    "img",
    "input",
    "ins",
    "kbd",
    "li",
    "ol",
    "p",
    "picture",
    "pre",
    "q",
    "rp",
    "rt",
    "ruby",
    "s",
    "samp",
    "section",
    "source",
    "span",
    "strike",
    "strong",
    "sub",
    "summary",
    "sup",
    "table",
    "tbody",
    "iframe",
    "video",
    "td",
    "tfoot",
    "th",
    "thead",
    "tr",
    "tt",
    "ul",
    "var",
  ],
};

const BOOLEAN_HTML_ATTRIBUTES: Record<string, true> = {
  allowfullscreen: true,
  async: true,
  autofocus: true,
  autoplay: true,
  checked: true,
  controls: true,
  default: true,
  defer: true,
  disabled: true,
  ismap: true,
  loop: true,
  multiple: true,
  muted: true,
  nohref: true,
  noshade: true,
  novalidate: true,
  nowrap: true,
  open: true,
  playsinline: true,
  readonly: true,
  required: true,
  reversed: true,
  selected: true,
  itemscope: true,
};

/* ---------------------------------------------------------------------------
 * Raw-HTML path: parse → render → sanitize walk → React elements.
 * ------------------------------------------------------------------------- */

type WalkerOptions = {
  schema: LegacySanitizeSchema;
  components: MarkdownComponents;
  styleFilter?: (style: string) => string | undefined;
  urlTransform?: (url: string) => string;
  urlAttributes?: ReadonlyArray<string>;
};

export function renderSanitizedHtmlToReact(html: string, options: WalkerOptions): ReactNode {
  html = html.replace(/<pre class="tm-code" data-lang="[^"]+">/gu, "<pre>");
  // DOMParser documents are inert: markup is parsed, never executed or loaded.
  const parsed = new DOMParser().parseFromString(
    `<!doctype html><body>${html}</body>`,
    "text/html",
  );
  const fragment = document.createDocumentFragment();
  fragment.append(...Array.from(parsed.body.childNodes));
  const [nodes] = walkContainerNodes(
    fragment,
    {
      options,
      stack: [],
      urlAttributes: options.urlAttributes ? new Set(options.urlAttributes) : undefined,
    },
    "",
  );
  return nodes.length === 1 ? nodes[0] : nodes.length === 0 ? null : nodes;
}

type WalkerState = {
  options: WalkerOptions;
  stack: string[];
  urlAttributes?: ReadonlySet<string>;
};

function walkContainerNodes(
  container: Node,
  state: WalkerState,
  keyPrefix: string,
): [ReactNode[], number] {
  const nodes: ReactNode[] = [];
  let index = 0;
  for (const child of Array.from(container.childNodes)) {
    if (child.nodeType === child.TEXT_NODE) {
      nodes.push(child.textContent ?? "");
    } else if (child.nodeType === child.ELEMENT_NODE) {
      const element = walkSanitizedElement(child as Element, state, `${keyPrefix}:${index}`);
      if (element !== null) nodes.push(element);
    }
    // Comment/doctype/processing-instruction nodes are dropped (allowComments
    // was never enabled by the previous rehype-sanitize pipeline).
    index += 1;
  }
  return [nodes, index];
}

function walkSanitizedElement(element: Element, state: WalkerState, key: string): ReactNode | null {
  const { options } = state;
  const name = element.tagName.toLowerCase();
  if (name === "pre") {
    const code = element.querySelector("code");
    if (!code) {
      state.stack.push(name);
      const [children] = walkContainerNodes(element, state, key);
      state.stack.pop();
      return <pre key={key}>{children}</pre>;
    }
    const language =
      code.getAttribute("data-lang") ??
      element.getAttribute("data-lang") ??
      code.className.match(/(?:^|\s)language-([^\s]+)/u)?.[1] ??
      element.className.match(/(?:^|\s)language-([^\s]+)/u)?.[1];
    const className = language ? `hljs language-${language}` : code.className || undefined;
    return (
      <pre key={key}>
        <code className={className}>
          {language
            ? highlightCodeToReactNodes(code.textContent ?? "", language)
            : code.textContent}
        </code>
      </pre>
    );
  }
  state.stack.push(name);

  const [children] = walkContainerNodes(element, state, key);
  const properties = sanitizeAttributes(element, name, state);

  const safeElement =
    name !== "*" && options.schema.tagNames.includes(name) && ancestorsAllow(name, state);
  state.stack.pop();

  if (options.schema.strip.includes(name)) {
    return null;
  }
  if (!safeElement) {
    // Unsafe elements are replaced by what they contain (hast-util-sanitize).
    return children.length === 0 ? null : <Fragment key={key}>{children}</Fragment>;
  }

  const component = options.components[name];
  if (component) {
    return createElement(component, { key, ...properties }, ...children);
  }
  return createElement(name, { key, ...properties }, ...children);
}

function ancestorsAllow(name: string, state: WalkerState): boolean {
  const required = state.options.schema.ancestors[name];
  if (!required) return true;
  return required.some((ancestor) => state.stack.includes(ancestor));
}

function sanitizeAttributes(
  element: Element,
  tagName: string,
  state: WalkerState,
): Record<string, unknown> {
  const { schema, urlTransform, styleFilter } = state.options;
  const { urlAttributes } = state;
  const result: Record<string, unknown> = {};

  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const definition =
      findAttributeDefinition(schema.attributes[tagName], name) ??
      findAttributeDefinition(schema.attributes["*"], name);
    if (!definition) continue;

    let value = attribute.value;
    if (name === "style") {
      // Style text survives only when the schema allows `style`, and the
      // optional policy (legacy issue-form style filter) runs first.
      const filtered = styleFilter ? styleFilter(value) : value;
      if (!filtered) continue;
      result.style = styleStringToObject(filtered);
      continue;
    }
    if (!attributeValueAllowed(definition, value)) continue;
    const isUrlAttribute = urlAttributes?.has(name) ?? false;
    if (isUrlAttribute) {
      if (!protocolAllowed(schema, name, value)) continue;
      if (urlTransform) {
        value = urlTransform(value);
        if (!value) continue;
      }
    }
    result[reactAttributeName(name)] = BOOLEAN_HTML_ATTRIBUTES[name] === true ? true : value;
  }

  const required = schema.required[tagName];
  if (required) {
    for (const [key, value] of Object.entries(required)) {
      const reactKey = reactAttributeName(key);
      if (!(reactKey in result)) result[reactKey] = value;
    }
  }
  return result;
}

function findAttributeDefinition(
  definitions: AttributeDefinition[] | undefined,
  name: string,
): AttributeDefinition | undefined {
  if (!definitions) return undefined;
  return definitions.find((definition) =>
    typeof definition === "string" ? definition === name : definition[0] === name,
  );
}

function attributeValueAllowed(definition: AttributeDefinition, value: string): boolean {
  if (typeof definition === "string" || definition.length === 1) return true;
  for (const allowed of definition.slice(1)) {
    if (allowed instanceof RegExp ? allowed.test(value) : allowed === value) return true;
  }
  return false;
}

function protocolAllowed(schema: LegacySanitizeSchema, name: string, value: string): boolean {
  const protocols = schema.protocols[name];
  if (!protocols || protocols.length === 0) return true;
  const colon = value.indexOf(":");
  const questionMark = value.indexOf("?");
  const numberSign = value.indexOf("#");
  const slash = value.indexOf("/");
  if (
    colon < 0 ||
    (slash > -1 && colon > slash) ||
    (questionMark > -1 && colon > questionMark) ||
    (numberSign > -1 && colon > numberSign)
  ) {
    return true;
  }
  return protocols.some(
    (protocol) => colon === protocol.length && value.slice(0, protocol.length) === protocol,
  );
}

function reactAttributeName(name: string): string {
  if (name === "class") return "className";
  if (name === "for") return "htmlFor";
  if (name === "allowfullscreen") return "allowFullScreen";
  return name;
}

function styleStringToObject(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const declaration of style.split(";")) {
    const separator = declaration.search(":");
    if (separator <= 0) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const value = declaration.slice(separator + 1).trim();
    if (!property || !value) continue;
    const camel = property.replace(/-([a-z])/gu, (_, character: string) => character.toUpperCase());
    result[camel] = value;
  }
  return result;
}

/* ---------------------------------------------------------------------------
 * Reference autolinks (issue/commit/mention) — port of the remark autolink
 * plugins. The AST can only express the link + label text, so the
 * class/state-span decorations are re-applied by the route's `a` component
 * through the index below (lookup by resolved URL + exact label text).
 * ------------------------------------------------------------------------- */

export type MarkdownReferenceDecoration = {
  className?: string[];
  /** Extra trailing inline element rendered inside the link (issue refs). */
  stateSpan?: { className: string; dataOwner?: string; label: string };
  /** Wrapper span rendered around the link label (project/org mentions). */
  childWrapperClass?: { className: string; dataOwner?: string };
};

export type MarkdownReferenceReplacement = {
  token: string;
  url: string;
  label: string;
  decoration?: MarkdownReferenceDecoration;
};

type SearchableMarkdownReferenceReplacement = MarkdownReferenceReplacement & {
  searchPattern: RegExp;
};

export type MarkdownReferenceIndex = {
  replacementFor: (href: string, labelText: string) => MarkdownReferenceReplacement | undefined;
};

export function createMarkdownReferenceIndex(
  replacements: ReadonlyArray<MarkdownReferenceReplacement>,
): MarkdownReferenceIndex {
  const byKey = new Map<string, MarkdownReferenceReplacement>();
  for (const replacement of replacements) {
    byKey.set(`${replacement.url}\n${replacement.label}`, replacement);
  }
  return {
    replacementFor: (href, labelText) => byKey.get(`${href}\n${labelText}`),
  };
}

/** Re-applies the reference decoration that cannot ride the TanStack AST
 * (link class, issue-state span, project/org mention wrapper). Routes call
 * this from their `a` component with the looked-up decoration. */
export function decorateMarkdownReferenceLink(
  className: string | undefined,
  children: ReactNode,
  decoration: MarkdownReferenceDecoration | undefined,
): { className?: string; children: ReactNode } {
  if (!decoration) {
    return { className, children };
  }
  const mergedClassName = [...(className?.split(" ") ?? []), ...(decoration.className ?? [])]
    .filter(Boolean)
    .join(" ");
  let decoratedChildren: ReactNode = decoration.childWrapperClass ? (
    <span
      className={decoration.childWrapperClass.className}
      data-owner={decoration.childWrapperClass.dataOwner}
    >
      {children}
    </span>
  ) : (
    children
  );
  if (decoration.stateSpan) {
    decoratedChildren = (
      <>
        {decoratedChildren}
        <span
          className={decoration.stateSpan.className}
          data-owner={decoration.stateSpan.dataOwner}
        >
          {decoration.stateSpan.label}
        </span>
      </>
    );
  }
  return {
    className: mergedClassName === "" ? undefined : mergedClassName,
    children: decoratedChildren,
  };
}

/** Flattens rendered link children back to text (decoration lookup key). */
export function reactNodeText(children: ReactNode): string {
  if (children === null || children === undefined || typeof children === "boolean") return "";
  if (typeof children !== "object") return String(children);
  if (Array.isArray(children)) return children.map(reactNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return reactNodeText(children.props.children);
  }
  return "";
}

export function createYonaReferenceExtension(
  replacements: ReadonlyArray<MarkdownReferenceReplacement>,
): MarkdownExtension {
  const unique = dedupeReplacements(replacements);
  return {
    name: "yona-references",
    transformInline: (nodes) => nodes.flatMap((node) => transformReferenceAutoLinks(node, unique)),
  };
}

function dedupeReplacements(
  replacements: ReadonlyArray<MarkdownReferenceReplacement>,
): SearchableMarkdownReferenceReplacement[] {
  const seen = new Set<string>();
  const unique: SearchableMarkdownReferenceReplacement[] = [];
  for (const replacement of replacements) {
    if (!replacement.token || seen.has(replacement.token)) continue;
    seen.add(replacement.token);
    unique.push(searchableReplacement(replacement));
  }
  return unique;
}

const REFERENCE_EXCLUDED_NODE_TYPES: Record<string, true> = {
  code: true,
  definition: true,
  html: true,
  image: true,
  inlineCode: true,
  link: true,
  linkReference: true,
};

function transformReferenceAutoLinks(
  node: InlineNode,
  replacements: ReadonlyArray<SearchableMarkdownReferenceReplacement>,
): InlineNode[] {
  if (replacements.length === 0 || REFERENCE_EXCLUDED_NODE_TYPES[node.type] === true) {
    return [node];
  }
  if (node.type === "text") {
    return referenceTextNodes(node.value, replacements);
  }
  return [node];
}

function referenceTextNodes(
  value: string,
  replacements: ReadonlyArray<SearchableMarkdownReferenceReplacement>,
): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    const match = nextReferenceMatch(value, cursor, replacements);
    if (!match) {
      nodes.push({ type: "text", value: value.slice(cursor) });
      break;
    }
    if (match.index > cursor) {
      nodes.push({ type: "text", value: value.slice(cursor, match.index) });
    }
    nodes.push({
      type: "link",
      href: match.replacement.url,
      children: [{ type: "text", value: match.replacement.label }],
    });
    cursor = match.index + match.replacement.token.length;
  }
  return nodes.length > 0 ? nodes : [{ type: "text", value }];
}

function nextReferenceMatch(
  value: string,
  cursor: number,
  replacements: ReadonlyArray<SearchableMarkdownReferenceReplacement>,
): { index: number; replacement: MarkdownReferenceReplacement } | undefined {
  let best: { index: number; replacement: MarkdownReferenceReplacement } | undefined;
  for (const replacement of replacements) {
    const relativeIndex = value.slice(cursor).search(replacement.searchPattern);
    const index = relativeIndex < 0 ? -1 : cursor + relativeIndex;
    if (
      index >= 0 &&
      referenceBoundaryIsValid(value, index, replacement.token) &&
      (!best ||
        index < best.index ||
        (index === best.index && replacement.token.length > best.replacement.token.length))
    ) {
      best = { index, replacement };
    }
  }
  return best;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function searchableReplacement(
  replacement: MarkdownReferenceReplacement,
): SearchableMarkdownReferenceReplacement {
  return {
    ...replacement,
    searchPattern: new RegExp(escapeRegExp(replacement.token), "u"),
  };
}

function referenceBoundaryIsValid(value: string, index: number, token: string): boolean {
  const previousCharacter = value.slice(0, index).match(/.$/u)?.[0] ?? "";
  const nextCharacter = value.slice(index + token.length).match(/^./u)?.[0] ?? "";
  const wordCharacter = /[A-Za-z0-9_]/u;
  return !wordCharacter.test(previousCharacter) && !wordCharacter.test(nextCharacter);
}

/* ---------------------------------------------------------------------------
 * GFM autolink literals — port of the legacy bundled marked.js GFM rules
 * (bare ftp/http/https/www URLs with backpedaled trailing punctuation, plus
 * `<scheme:…>` / `<email>` angle autolinks). Emails become `mailto:` links.
 * ------------------------------------------------------------------------- */

const BARE_URL = /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9-]+\.?)+[^\s<]*/iu;
const EXTENDED_EMAIL =
  /^[a-zA-Z0-9._+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/u;
const ANGLE_SCHEME_AUTOLINK = /^<([a-zA-Z][a-zA-Z\d+.-]*:[^\s\x00-\x1f<>]*)>/u;
const ANGLE_CONTENT = /^<([^<>\s]*)>/u;
const BACKPEDAL = /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/u;

export const gfmAutolinkLiterals: MarkdownExtension = {
  name: "gfm-autolink-literals",
  transformInline: (nodes) => nodes.flatMap(transformAutolinkNode),
};

function transformAutolinkNode(node: InlineNode): InlineNode[] {
  if (node.type !== "text") return [node];
  const nodes: InlineNode[] = [];
  let text = "";
  let index = 0;
  const value = node.value;
  const flush = () => {
    if (text) {
      nodes.push({ type: "text", value: text });
      text = "";
    }
  };
  while (index < value.length) {
    const rest = value.slice(index);
    const angle = angleAutolink(rest);
    if (angle) {
      flush();
      nodes.push({
        type: "link",
        href: angle.href,
        children: [{ type: "text", value: angle.inner }],
      });
      index += angle.length;
      continue;
    }
    const boundaryOk = index === 0 || !/[A-Za-z0-9]/u.test(value[index - 1] ?? "");
    const bare = boundaryOk ? findBareAutolink(rest) : undefined;
    if (bare) {
      flush();
      nodes.push(bare.node);
      index += bare.length;
      continue;
    }
    text += value[index];
    index += 1;
  }
  flush();
  return nodes;
}

function angleAutolink(rest: string): { inner: string; href: string; length: number } | undefined {
  const scheme = rest.match(ANGLE_SCHEME_AUTOLINK);
  if (scheme) return { inner: scheme[1], href: scheme[1], length: scheme[0].length };
  const content = rest.match(ANGLE_CONTENT)?.[1];
  if (content && EXTENDED_EMAIL.test(content)) {
    return { inner: content, href: `mailto:${content}`, length: content.length + 2 };
  }
  return undefined;
}

function findBareAutolink(rest: string): { node: InlineNode; length: number } | undefined {
  const email = rest.match(EXTENDED_EMAIL);
  if (email && !/[A-Za-z0-9_-]/u.test(rest[email[0].length] ?? "")) {
    return {
      node: {
        type: "link",
        href: `mailto:${email[0]}`,
        children: [{ type: "text", value: email[0] }],
      },
      length: email[0].length,
    };
  }
  const url = rest.match(BARE_URL);
  if (!url) return undefined;
  // Backpedal trailing punctuation like marked's `_backpedal`.
  const trimmed = url[0].match(BACKPEDAL)?.[0] ?? url[0];
  if (!trimmed || trimmed.length === 0) return undefined;
  const href = /^www\./iu.test(trimmed) ? `http://${trimmed}` : trimmed;
  return {
    node: { type: "link", href, children: [{ type: "text", value: trimmed }] },
    length: trimmed.length,
  };
}

/* ---------------------------------------------------------------------------
 * Hard breaks — legacy marked ran with `breaks: true` (single newline → <br>),
 * previously provided by remark-breaks.
 * ------------------------------------------------------------------------- */

export const legacyHardBreaks: MarkdownExtension = {
  name: "legacy-hard-breaks",
  transformInline: (nodes) => nodes.flatMap(splitTextAtNewlines),
};

function splitTextAtNewlines(node: InlineNode): InlineNode[] {
  if (node.type !== "text" || !node.value.includes("\n")) return [node];
  const result: InlineNode[] = [];
  for (const part of node.value.split("\n")) {
    if (part) result.push({ type: "text", value: part } satisfies TextNode);
    result.push({ type: "break" });
  }
  result.pop();
  return result;
}

/* ---------------------------------------------------------------------------
 * Legacy heading anchors — `yb-header-` ids (marked `headerPrefix`) plus the
 * bundled marked fork's `<a class="head-anchor" href="#…">#</a>` anchor.
 * ------------------------------------------------------------------------- */

export function legacyHeadingAnchors(): MarkdownExtension {
  return {
    name: "legacy-heading-anchors",
    transformDocument: (document) => {
      const seen = new Map<string, number>();
      appendLegacyHeadingAnchors(document as unknown as WalkableNode, seen);
    },
  };
}

type WalkableNode = { children?: Array<Record<string, unknown>> };

function appendLegacyHeadingAnchors(node: WalkableNode, seen: Map<string, number>): void {
  const children = node.children;
  if (!children) return;
  for (const child of children) {
    if (child.type === "heading") {
      const heading = child as unknown as { id?: string; children: InlineNode[] };
      const id = `yb-header-${nextLegacyHeadingSlug(inlineNodesText(heading.children), seen)}`;
      heading.id = id;
      heading.children = [
        ...heading.children,
        { type: "link", href: `#${id}`, children: [{ type: "text", value: "#" }] } as InlineNode,
      ];
      continue;
    }
    if (child.children) {
      appendLegacyHeadingAnchors(child as WalkableNode, seen);
    }
  }
}

function inlineNodesText(nodes: InlineNode[]): string {
  return nodes
    .map((child) => (child.type === "text" ? child.value : headingInlineLinkText(child)))
    .join("");
}

function headingInlineLinkText(node: InlineNode): string {
  const text = inlineNodesText((node as { children?: InlineNode[] }).children ?? []);
  const href = (node as { href?: string }).href ?? "";
  const issueNumber = href.match(/\/issue\/(\d+)(?:[?#].*)?$/u)?.[1];
  if (node.type !== "link" || !issueNumber) {
    return text;
  }
  return `#${issueNumber}`;
}

function nextLegacyHeadingSlug(value: string, seen: Map<string, number>): string {
  const originalSlug = legacyHeadingSlug(value);
  let slug = originalSlug;
  let occurrence = seen.get(originalSlug) ?? 0;
  if (seen.has(slug)) {
    do {
      occurrence += 1;
      slug = `${originalSlug}-${occurrence}`;
    } while (seen.has(slug));
  }
  seen.set(originalSlug, occurrence);
  seen.set(slug, 0);
  return slug;
}

/** Port of the legacy marked headerId slug (Korean text preserved). */
export function legacyHeadingSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/<[!/a-z].*?>/giu, "")
    .replace(/[\u2000-\u206f\u2e00-\u2e7f\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/gu, "")
    .replace(/[^\w|ㄱ-ㅎ|ㅏ-ㅣ|가-힣]+/gu, "-")
    .replace(/\s/gu, "-");
}

/** The `head-anchor` class is applied to generated `#yb-header-*` links by the
 * route `a` component through this decoration entry. */
export const HEAD_ANCHOR_DECORATION: MarkdownReferenceDecoration = { className: ["head-anchor"] };

/* ---------------------------------------------------------------------------
 * Child-comment paragraph markers — the previous remark plugin tagged the
 * blockquote/last paragraphs with data attributes; TanStack AST nodes cannot
 * carry attributes, so the same facts are marked with private-use sentinels
 * that the route `p` component strips (ponytail: sentinel-in-children keeps
 * the placement logic deterministic and render-order free; replace with a
 * container inline node if TanStack adds one).
 * ------------------------------------------------------------------------- */

// Private-use codepoints: guaranteed absent from user content in practice.
export const CHILD_COMMENT_BLOCKQUOTE_MARKER = "";
export const CHILD_COMMENT_METADATA_MARKER = "";

export function childCommentParagraphMarkers(): MarkdownExtension {
  return {
    name: "child-comment-paragraph-markers",
    transformDocument: (document: MarkdownDocument) => {
      let lastParagraph: { children?: InlineNode[] } | undefined;
      const visit = (node: WalkableNode, insideBlockquote: boolean): void => {
        const children = node.children;
        if (!children) return;
        for (const child of children) {
          if (child.type === "paragraph") {
            const paragraph = child as unknown as { children: InlineNode[] };
            lastParagraph = paragraph;
            if (insideBlockquote) {
              paragraph.children = [
                { type: "text", value: CHILD_COMMENT_BLOCKQUOTE_MARKER },
                ...paragraph.children,
              ];
            }
          }
          visit(child as WalkableNode, insideBlockquote || child.type === "blockquote");
        }
      };
      visit(document as unknown as WalkableNode, false);
      if (lastParagraph) {
        lastParagraph.children = [
          ...(lastParagraph.children ?? []),
          { type: "text", value: CHILD_COMMENT_METADATA_MARKER },
        ];
        return;
      }
      document.children.push({
        type: "paragraph",
        children: [{ type: "text", value: CHILD_COMMENT_METADATA_MARKER }],
      });
    },
  };
}

/* ---------------------------------------------------------------------------
 * Surface components.
 * ------------------------------------------------------------------------- */

export function LegacyMarkdown({
  children,
  components,
  extensions,
  urlTransform = defaultUrlTransform,
}: {
  children: string;
  components?: MarkdownComponents;
  extensions?: MarkdownExtension[];
  urlTransform?: (url: string) => string;
}): ReactNode {
  // react-markdown applied urlTransform to hrefs/srcs before any custom
  // component saw them; keep that contract for the adapter path too.
  const mergedComponents = useMemo<MarkdownComponents>(
    () => ({
      ...urlTransformedDefaults(urlTransform),
      pre: LegacyMarkdownPre,
      ...components,
    }),
    [components, urlTransform],
  );
  return (
    <TanStackMarkdown
      allowHtml={false}
      components={mergedComponents as never}
      extensions={extensions}
      frontmatter={false}
      headingIds={false}
    >
      {children}
    </TanStackMarkdown>
  );
}

function LegacyMarkdownPre(props: { children?: ReactNode }) {
  return <pre>{props.children}</pre>;
}

function urlTransformedDefaults(urlTransform: (url: string) => string): MarkdownComponents {
  const a: MarkdownComponents["a"] = (props) => {
    const { href, title, children } = props as {
      href?: string;
      title?: string;
      children?: ReactNode;
    };
    return (
      <a href={href ? urlTransform(href) : href} title={title}>
        {children}
      </a>
    );
  };
  const img: MarkdownComponents["img"] = (props) => {
    const { alt, src, title } = props as { alt?: string; src?: string; title?: string };
    return <img alt={alt ?? ""} src={src ? urlTransform(src) : src} title={title} />;
  };
  return { a, img };
}

export function LegacyMarkdownHtml({
  children,
  components,
  extensions,
  sanitize,
  styleFilter,
  urlTransform,
}: {
  children: string;
  components?: MarkdownComponents;
  extensions?: MarkdownExtension[];
  sanitize: LegacySanitizeSchema;
  styleFilter?: (style: string) => string | undefined;
  urlTransform?: (url: string) => string;
}): ReactNode {
  const html = useMemo(
    () =>
      renderHtml(
        parseMarkdown(children, {
          allowHtml: true,
          extensions,
          frontmatter: false,
          headingIds: false,
        }),
        { allowHtml: true },
      ),
    [children, extensions],
  );
  return renderSanitizedHtmlToReact(html, {
    schema: sanitize,
    components: components ?? {},
    styleFilter,
    urlAttributes: ["href", "src", "cite", "longdesc", "srcset"],
    urlTransform,
  });
}
