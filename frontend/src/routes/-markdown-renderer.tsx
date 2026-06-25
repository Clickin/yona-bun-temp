import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

import { useLegacyMessages, type LegacyI18nContextValue } from "../i18n";
import { highlightCodeBlock } from "./-syntax-highlighting";

type LegacyMessageLookup = LegacyI18nContextValue["t"];

function legacyMessage(messages: LegacyMessageLookup | undefined, key: string) {
  return messages ? messages(key, { fallback: key }) : key;
}

type MarkdownInlinePart =
  | { kind: "code"; key: string; value: string }
  | { kind: "delete"; key: string; value: string }
  | { kind: "emphasis"; key: string; value: string }
  | { kind: "escape"; key: string; value: string }
  | { kind: "image"; key: string; label: string; target?: string; title?: string }
  | {
      kind: "link";
      className?: string;
      issueState?: string;
      key: string;
      label: string;
      target?: string;
      title?: string;
    }
  | { kind: "strong"; key: string; value: string }
  | { kind: "rawHtml"; key: string; value: string }
  | { kind: "rawHtmlInlineSpan"; key: string; tag?: string; rawAttributes: string; value: string }
  | { kind: "text"; key: string; value: string };

type MarkdownIssueReference = {
  issueNumber: number;
  ownerName: string;
  projectName: string;
  state?: string;
  title?: string;
};

type MarkdownCommitReference = {
  commitId: string;
  ownerName: string;
  projectName: string;
  title?: string;
};

export type MarkdownMentionReference = {
  kind: string;
  label?: string;
  loginId?: string;
  ownerName?: string;
  projectName?: string;
};

function normalizedLegacyMentionText(value: string | null | undefined) {
  return value?.trim().toLowerCase() || "";
}

function legacyMentionReferenceMatchesCurrentUser(
  reference: MarkdownMentionReference,
  currentUserLabel: string,
  currentUserLoginId: string,
) {
  if (reference.kind !== "user") {
    return false;
  }
  const referenceLabel = normalizedLegacyMentionText(reference.label);
  const referenceLoginId = normalizedLegacyMentionText(reference.loginId);
  return Boolean(
    (currentUserLabel && referenceLabel === currentUserLabel) ||
    (currentUserLoginId && referenceLoginId === currentUserLoginId),
  );
}

export function legacyCommentMentionsCurrentUser(
  markdown: string,
  currentUserLabel?: string,
  currentUserLoginId?: string,
  mentionReferences?: MarkdownMentionReference[],
) {
  const label = normalizedLegacyMentionText(currentUserLabel);
  const loginId = normalizedLegacyMentionText(currentUserLoginId);
  if (!label && !loginId) {
    return false;
  }
  const normalizedMarkdown = markdown.toLowerCase();
  if (
    (label && normalizedMarkdown.includes(label)) ||
    (loginId && normalizedMarkdown.includes(`@${loginId}`))
  ) {
    return true;
  }
  return (mentionReferences ?? []).some((reference) =>
    legacyMentionReferenceMatchesCurrentUser(reference, label, loginId),
  );
}

type MarkdownReferenceDefinition = {
  target?: string;
  title?: string;
};

type MarkdownContext = {
  basePath?: string;
  breaks?: boolean;
  commitReferenceMap?: Map<string, MarkdownCommitReference>;
  currentUserLabel?: string;
  currentUserLoginId?: string;
  suppressBareAutolinks?: boolean;
  suppressBareEmailAutolinks?: boolean;
  suppressProjectAutolinks?: boolean;
  headingSlugCounts?: Map<string, number>;
  issueReferenceMap?: Map<string, MarkdownIssueReference>;
  mentionReferenceMap?: Map<string, MarkdownMentionReference>;
  ownerName?: string;
  projectName?: string;
  reactMarkdownReferenceDefinitions?: string;
  referenceMap?: Map<string, MarkdownReferenceDefinition>;
  taskCheckboxIndex?: { current: number };
  taskCheckboxDisabled?: boolean;
  tasklistSourceMarkdown?: string;
  onTasklistToggle?: MarkdownTasklistToggleHandler;
};

export type MarkdownTasklistToggleInput = {
  checked: boolean;
  checkboxIndex: number;
  nextMarkdown: string;
  originalMarkdown: string;
};

export type MarkdownTasklistToggleHandler = (
  input: MarkdownTasklistToggleInput,
) => Promise<void> | void;

type MarkdownBlockRecord = {
  key: string;
  terminalNewline?: boolean;
  text: string;
};

type MarkdownLineRecord = {
  key: string;
  text: string;
};

function containsBacktick(value: string): boolean {
  return /`/.test(value);
}

function containsInlineLinkClose(value: string): boolean {
  return /\]\(/.test(value);
}

function containsLt(value: string): boolean {
  return /</.test(value);
}

function rawHtmlClosingPattern(tag: string): RegExp {
  return new RegExp(String.raw`<\/${tag}\s*>`, "i");
}

type MarkdownTableCell = {
  align?: "center" | "left" | "right";
  key: string;
  text: string;
};

type MarkdownTableRow = {
  cells: MarkdownTableCell[];
  key: string;
};

type MarkdownTableRecord = {
  headers: MarkdownTableCell[];
  rows: MarkdownTableRow[];
};

type MarkdownListItem = {
  checked?: boolean;
  children?: MarkdownListRecord[];
  continuedLeadingIndentedCode?: boolean;
  continuedText?: string;
  key: string;
  leadingIndentedCode?: boolean;
  loose?: boolean;
  markerWidth: number;
  task: boolean;
  text: string;
};

type MarkdownListRecord = {
  items: MarkdownListItem[];
  loose?: boolean;
  ordered: boolean;
  start?: number;
};

type ParsedMarkdownListLine = {
  continuedLeadingIndentedCode?: boolean;
  continuedText?: string;
  kind: "item";
  indent: number;
  key: string;
  leadingIndentedCode?: boolean;
  markerWidth: number;
  markerKind: string;
  ordered: boolean;
  start?: number;
  text: string;
};

type ParsedMarkdownListContinuation = {
  indent: number;
  key: string;
  kind: "continuation";
  text: string;
};

type ParsedMarkdownListEntry = ParsedMarkdownListLine | ParsedMarkdownListContinuation;

type MarkdownTaskStats = {
  checked: number;
  percentage: number;
  total: number;
};

type MarkdownBlockquoteRecord = {
  key: string;
  text: string;
};

type MarkdownCodeBlockRecord = {
  code: string;
  language?: string;
};

type RawHtmlNode = {
  children: RawHtmlChild[];
  props: Record<string, boolean | React.CSSProperties | string | number | undefined>;
  tag: string;
};

type RawHtmlChild = RawHtmlNode | string | React.ReactElement;

type HastNode = {
  children?: HastNode[];
  properties?: Record<string, unknown>;
  tagName?: string;
  type?: string;
  value?: string;
};

type LegacyMarkedPreprocessResult = {
  markdown: string;
  opaqueRawHtmlBlocks: Map<string, string>;
};

const legacyEmptyTaskItemPlaceholder = "yona-empty-task-item-placeholder";
const legacyDirectTabListItemPlaceholder = "yona-direct-tab-list-item-placeholder";
const legacyExtraListContinuationPaddingPlaceholder = "yona-extra-list-continuation-padding";
const legacyListLeadingCodePaddingPlaceholder = "yona-list-leading-code-padding";
const legacySpaceTabListItemPaddingPlaceholder = "yona-space-tab-list-item-padding";
const legacyExtraListContinuationPaddingRegex = new RegExp(
  `${legacyExtraListContinuationPaddingPlaceholder}:(\\d):`,
  "g",
);
const legacyListLeadingCodePaddingRegex = new RegExp(
  `${legacyListLeadingCodePaddingPlaceholder}:(\\d):`,
  "g",
);
const legacySpaceTabListItemPaddingRegex = new RegExp(
  `${legacySpaceTabListItemPaddingPlaceholder}:(\\d):`,
  "g",
);
const rawHtmlVideoBooleanAttributes = new Set(["autoplay", "controls"]);
const rawHtmlVideoLegacyAttributes = new Set([
  "data-setup",
  "fluid",
  "liveui",
  "preload",
  "responsive",
  "type",
]);
const legacyTasklistTemplate = "\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C";
const legacyTaskCheckboxLinePattern = /^([ ]*[-+*] \[[ xX]?])([ ]?.+)$/gm;

type LegacyTaskCheckboxMatch = {
  indent: number;
  index: number;
};

export function insertLegacyTasklistTemplate(value: string, cursorIndex: number) {
  let cursor = Math.max(0, Math.min(cursorIndex, value.length));
  if (cursor === 0 && value.length > 0) {
    cursor = value.length;
  }
  return {
    cursorIndex: cursor + legacyTasklistTemplate.length,
    value: `${value.slice(0, cursor)}${legacyTasklistTemplate}${value.slice(cursor)}`,
  };
}

export function toggleLegacyTasklistMarkdownItem(
  value: string,
  checkboxIndex: number,
  checked: boolean,
) {
  const matches: LegacyTaskCheckboxMatch[] = Array.from(
    value.matchAll(legacyTaskCheckboxLinePattern),
    (match, index) => ({
      checkbox: match[1] ?? "",
      indent: /^ */u.exec(match[1] ?? "")?.[0].length ?? 0,
      index,
    }),
  );
  const target = matches[checkboxIndex];
  if (!target) {
    return value;
  }

  const indexesToToggle = new Set<number>([target.index]);
  for (const match of matches.slice(checkboxIndex + 1)) {
    if (match.indent <= target.indent) {
      break;
    }
    indexesToToggle.add(match.index);
  }

  let counter = 0;
  return value.replace(legacyTaskCheckboxLinePattern, (match, checkbox: string, text: string) => {
    if (!indexesToToggle.has(counter)) {
      counter += 1;
      return match;
    }
    counter += 1;
    const nextCheckbox = checked
      ? checkbox.replace(/\[[ ]?]/, "[x]")
      : checkbox.replace(/\[[xX]?]/, "[ ]");
    return `${nextCheckbox}${text}`;
  });
}

function updateTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  if (setter) {
    setter.call(textarea, value);
  } else {
    textarea.value = value;
  }
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}

export function addLegacyTasklistTemplateFromButton(button: HTMLButtonElement) {
  const textarea = button.closest("form")?.querySelector("textarea");
  if (!textarea) {
    return;
  }
  const inserted = insertLegacyTasklistTemplate(textarea.value, textarea.selectionStart ?? 0);
  updateTextareaValue(textarea, inserted.value);
  textarea.focus();
  textarea.setSelectionRange(inserted.cursorIndex, inserted.cursorIndex);
}

function isSafeUrl(value: string) {
  const normalized = value.toLowerCase();
  const schemeMatch = /^[A-Za-z][A-Za-z0-9+.-]*:/.exec(value);
  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#") ||
    value.startsWith("?") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("ftp://") ||
    normalized.startsWith("mailto:") ||
    !schemeMatch
  );
}

function isSafeRawHtmlUrl(value: string) {
  return isSafeMarkdownTarget(value);
}

function isSafeMarkdownTarget(value: string) {
  const normalized = value.toLowerCase();
  return isSafeUrl(value) || normalized.startsWith("file:") || normalized.startsWith("zpl:");
}

function sanitizedMarkdownTarget(value: string): string | undefined {
  const compact = value.replace(/[^\w:]/g, "").toLowerCase();
  if (compact.startsWith("javascript:")) {
    return "#";
  }
  return isSafeMarkdownTarget(value) ? value : undefined;
}

function normalizeBasePath(basePath?: string) {
  if (!basePath || basePath === "/") {
    return "";
  }
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

function unescapeMarkdownPunctuation(value: string) {
  return value.replace(/\\([!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~])/g, "$1");
}

function unescapeMarkdownImageAltBrackets(value: string) {
  return value.replace(/\\(\[|\])/g, "$1");
}

function markdownEntityCodePoint(codePoint: number, fallback: string) {
  if (!Number.isInteger(codePoint)) {
    return fallback;
  }
  if (codePoint === 0 || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return "\uFFFD";
  }
  return String.fromCodePoint(codePoint);
}

function decodeMarkdownHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    bull: "•",
    cent: "¢",
    colon: ":",
    copy: "©",
    deg: "°",
    divide: "÷",
    euro: "€",
    frac12: "½",
    frac14: "¼",
    frac34: "¾",
    gt: ">",
    hellip: "…",
    laquo: "«",
    ldquo: "“",
    lsaquo: "‹",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    micro: "µ",
    middot: "·",
    nbsp: "\u00a0",
    ndash: "–",
    para: "¶",
    plusmn: "±",
    pound: "£",
    quot: '"',
    raquo: "»",
    rdquo: "”",
    reg: "®",
    rsaquo: "›",
    rsquo: "’",
    sect: "§",
    times: "×",
    trade: "™",
    yen: "¥",
  };
  return value.replace(/&(#(?:x[0-9a-fA-F]+|\d+)|[A-Za-z][A-Za-z0-9]+);/g, (entity, name) => {
    const entityName = String(name);
    if (entityName.startsWith("#x") || entityName.startsWith("#X")) {
      const codePoint = Number.parseInt(entityName.slice(2), 16);
      return markdownEntityCodePoint(codePoint, entity);
    }
    if (entityName.startsWith("#")) {
      const codePoint = Number.parseInt(entityName.slice(1), 10);
      return markdownEntityCodePoint(codePoint, entity);
    }
    return namedEntities[entityName.toLowerCase()] ?? entity;
  });
}

function normalizeReferenceLabel(label: string) {
  return unescapeMarkdownPunctuation(label).trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeInlineTarget(target: string) {
  const trimmed = target.trim();
  const unwrapped =
    trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed.slice(1, -1) : trimmed;
  return decodeMarkdownHtmlEntities(unescapeMarkdownPunctuation(unwrapped));
}

function encodeMarkdownUrlTarget(target: string) {
  return encodeURI(target).replace(/%25/g, "%");
}

const referenceLabelPattern = String.raw`(?:\\[\[\]]|[^\[\]])+`;
const escapedMarkdownPunctuationClass = "[!\"#$%&'()*+,\\-./:;<=>?@[\\]\\\\^_`{|}~]";
const labelCodeSpanPattern =
  "(?:`[^`]*`|``[^`]*``|```[^`]*```|````[^`]*````|`````[^`]*`````|``````[^`]*``````)";
const simpleInlineLabelPattern = `(?:${labelCodeSpanPattern}|\\\\${escapedMarkdownPunctuationClass}|[^\\[\\]\`])*`;
const inlineLabelPattern = `(?:${simpleInlineLabelPattern}\\[[^\\[\\]]*\\]${simpleInlineLabelPattern}|${simpleInlineLabelPattern})`;
const referenceTargetPattern = `<>|<[^>\\s]+>|(?:\\\\${escapedMarkdownPunctuationClass}|[^\\s>\\\\])+`;
const referenceLabelOnlyPattern = new RegExp(`^ {0,3}\\[${referenceLabelPattern}\\]:\\s*$`);
const referenceTargetOnlyPattern = new RegExp(
  `^ {0,3}\\[${referenceLabelPattern}\\]:\\s*(?:${referenceTargetPattern})\\s*$`,
);
const inlineTargetPattern = `<[^>]*>|(?:\\\\${escapedMarkdownPunctuationClass}|\\([^()\\s]*\\)|[^)\\\\\\s])+`;
const referenceTitleOnlyPattern =
  /^\s*(?:"(?:\\"|[^"\\])*"|'(?:\\'|[^'\\])*'|\((?:\\\)|[^)\\])*\))\s*$/;
const referenceDefinitionPattern = new RegExp(
  `^ {0,3}\\[(${referenceLabelPattern})\\]:\\s*(${referenceTargetPattern})(?:\\s+(?:"((?:\\\\"|[^"\\\\])*)"|'((?:\\\\'|[^'\\\\])*)'|\\(((?:\\\\\\)|[^)\\\\])*)\\)))?\\s*$`,
);
const bareEmailPattern = String.raw`[A-Za-z0-9._+-]+@[A-Za-z0-9-_]+(?:\.[A-Za-z0-9-_]*[A-Za-z0-9])+(?![-_])`;
const bareUrlPattern = String.raw`(?:[Hh][Tt][Tt][Pp][Ss]?|[Ff][Tt][Pp]):\/\/[^\s<]+|[Ww][Ww][Ww]\.[^\s<]+`;
const bareAutolinkPattern = `${bareUrlPattern}|${bareEmailPattern}`;
const bareAutolinkRegex = new RegExp(`^(?:${bareAutolinkPattern})$`);
const angleSafeSchemePattern = String.raw`(?:(?:[Hh][Tt][Tt][Pp][Ss]?|[Ff][Tt][Pp]|[Ff][Ii][Ll][Ee]):\/\/|[Mm][Aa][Ii][Ll][Tt][Oo]:|[Zz][Pp][Ll]:)`;
const angleEmailDomainPattern = String.raw`[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+(?![-_])`;
const angleEmailPattern = String.raw`[A-Za-z0-9.!#$%&'*+/=?_\x60{|}~%-]+@${angleEmailDomainPattern}`;
const angleEmailRegex = new RegExp(`^${angleEmailPattern}$`);
const angleAutolinkPattern = String.raw`<(?:(?:${angleSafeSchemePattern})[^\s<>]+|${angleEmailPattern})>`;
const bareEmailRegex = new RegExp(`^${bareEmailPattern}$`);
const legacyPathSegmentPattern = String.raw`[A-Za-z0-9_.가-힣-]+`;
const legacyProjectPathPattern = String.raw`${legacyPathSegmentPattern}\/${legacyPathSegmentPattern}`;
const legacyProjectCommitRegex = new RegExp(
  `^(${legacyPathSegmentPattern})\\/(${legacyPathSegmentPattern})@([0-9a-f]{40})$`,
  "i",
);
const legacyOwnerCommitRegex = new RegExp(`^(${legacyPathSegmentPattern})@([0-9a-f]{40})$`, "i");
const legacyProjectMentionRegex = new RegExp(`^@${legacyProjectPathPattern}$`);
const legacyUserMentionRegex = new RegExp(`^@${legacyPathSegmentPattern}$`);
const legacyProjectIssueRegex = new RegExp(
  `^(${legacyPathSegmentPattern})\\/(${legacyPathSegmentPattern})#([0-9]+)$`,
);
const legacyOwnerIssueRegex = new RegExp(`^(${legacyPathSegmentPattern})#([0-9]+)$`);
const rawHtmlAttributePattern = String.raw`(?:\s+(?:"[^"]*"|'[^']*'|[^'"<>])*)?`;
const rawInlineHtmlPairedTagPattern = [
  "a",
  "b",
  "code",
  "del",
  "em",
  "i",
  "s",
  "span",
  "strong",
  "u",
]
  .map((tag) => String.raw`${tag}${rawHtmlAttributePattern}>[\s\S]*?<\/${tag}\s*>`)
  .join("|");
const rawInlineHtmlElementPattern = String.raw`(?:<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![A-Za-z][^<>]*>|<(?:(?:${rawInlineHtmlPairedTagPattern})|(?<rawHtmlGenericTag>[A-Za-z][A-Za-z0-9-]*)${rawHtmlAttributePattern}>[\s\S]*?<\/\k<rawHtmlGenericTag>\s*>|[A-Za-z][A-Za-z0-9-]*${rawHtmlAttributePattern}\/>|(?:br|hr|img|input|source)${rawHtmlAttributePattern}\/?>))`;

const openingFencePattern = /^( {0,3})(`{3,}(?=[^`]*$)|~{3,})(?:[ \t]*([^ \t]*)(?:[ \t]+.*)?)?\s*$/;
const looseListBreakMarker = "\u0000loose-list-break\u0000";

function openingFenceFromLine(line: string): string {
  return openingFencePattern.exec(line)?.[2] ?? "";
}

function closingFenceFromLine(line: string): string {
  return /^ {0,3}([`~]+)\s*$/.exec(line)?.[1] ?? "";
}

function closesMarkdownFence(openFence: string, closeFence: string): boolean {
  return closeFence.startsWith(openFence);
}

function compensateIndentedFenceLine(line: string, indent: string) {
  if (!indent) {
    return line;
  }
  const lineIndent = /^\s+/.exec(line)?.[0] ?? "";
  if (lineIndent.length < indent.length) {
    return line;
  }
  return line.slice(indent.length);
}

function extractReferenceDefinitions(markdown: string) {
  const referenceMap = new Map<string, MarkdownReferenceDefinition>();
  const markdownLines: string[] = [];
  let openFence = "";
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (openFence) {
      const closeFence = closingFenceFromLine(line);
      if (closeFence && closesMarkdownFence(openFence, closeFence)) {
        openFence = "";
      }
      markdownLines.push(line);
      continue;
    }
    const nextOpenFence = openingFenceFromLine(line);
    if (nextOpenFence) {
      openFence = nextOpenFence;
      markdownLines.push(line);
      continue;
    }
    const candidateLine =
      referenceLabelOnlyPattern.test(line) && index < lines.length - 1
        ? `${line} ${(lines[index + 1] ?? "").trim()}`
        : line;
    const nextLine = lines[index + 1] ?? "";
    const titleAfterSplitTargetLine = lines[index + 2] ?? "";
    const splitTargetLine = candidateLine !== line;
    const consumesTitleLine =
      splitTargetLine &&
      index < lines.length - 2 &&
      referenceTitleOnlyPattern.test(titleAfterSplitTargetLine);
    const candidateWithTitle =
      index < lines.length - 1 &&
      candidateLine === line &&
      referenceTargetOnlyPattern.test(line) &&
      referenceTitleOnlyPattern.test(nextLine)
        ? `${line} ${nextLine.trim()}`
        : consumesTitleLine
          ? `${candidateLine} ${titleAfterSplitTargetLine.trim()}`
          : candidateLine;
    const match = referenceDefinitionPattern.exec(candidateWithTitle);
    if (!match) {
      markdownLines.push(line);
      continue;
    }
    const rawTarget = match[2] ?? "";
    const legacyEmptyAngleReferenceTarget = rawTarget.trim() === "<>";
    const target = legacyEmptyAngleReferenceTarget
      ? "<"
      : sanitizedMarkdownTarget(normalizeInlineTarget(rawTarget));
    const label = normalizeReferenceLabel(match[1] ?? "");
    if (referenceMap.has(label)) {
      continue;
    }
    const title = match[3] ?? match[4] ?? match[5];
    referenceMap.set(label, {
      target,
      title: title === undefined ? undefined : unescapeMarkdownPunctuation(title),
    });
    if (consumesTitleLine) {
      index += 2;
    } else if (candidateWithTitle !== line) {
      index += 1;
    }
  }
  return { markdown: markdownLines.join("\n"), referenceMap };
}

function issueReferenceFor(
  context: MarkdownContext | undefined,
  ownerName: string,
  projectName: string,
  issueNumber: number,
) {
  return context?.issueReferenceMap?.get(`${ownerName}/${projectName}#${issueNumber}`);
}

function commitReferenceKey(ownerName: string, projectName: string, commitId: string) {
  return `${ownerName}/${projectName}@${commitId.toLowerCase()}`;
}

function commitReferenceFor(
  context: MarkdownContext | undefined,
  ownerName: string,
  projectName: string,
  commitId: string,
) {
  return context?.commitReferenceMap?.get(commitReferenceKey(ownerName, projectName, commitId));
}

function mentionReferenceFor(context: MarkdownContext | undefined, token: string) {
  return context?.mentionReferenceMap?.get(token.toLowerCase());
}

function commitAutolinkPart(
  token: string,
  key: string,
  basePath: string,
  ownerName: string,
  projectName: string,
  commitId: string,
  context?: MarkdownContext,
): MarkdownInlinePart {
  const reference = commitReferenceFor(context, ownerName, projectName, commitId);
  if (!reference) {
    return { kind: "text", key, value: token };
  }
  return {
    className: "commit-link",
    kind: "link",
    key,
    label: token,
    target: `${basePath}/${ownerName}/${projectName}/commit/${reference.commitId}`,
    title: reference.title,
  };
}

function isWrappedByTrailingWordCharacter(text: string, tokenEnd: number) {
  return tokenEnd < text.length && /\w/.test(text.slice(tokenEnd, tokenEnd + 1));
}

function splitBareAutolinkToken(token: string) {
  let label = token;
  let suffix = "";
  const entitySuffix = /&[A-Za-z0-9]+;$/.exec(label)?.[0];
  if (entitySuffix) {
    const entityStart = label.length - entitySuffix.length;
    if (label[entityStart - 1] !== ";") {
      return {
        label: label.slice(0, entityStart),
        suffix: entitySuffix,
      };
    }
  }
  while (/[?!.,:;*_~)\]}]$/.test(label)) {
    const last = label.at(-1) ?? "";
    if (last === ")") {
      const openCount = (label.match(/\(/g) ?? []).length;
      const closeCount = (label.match(/\)/g) ?? []).length;
      if (openCount >= closeCount) {
        break;
      }
    }
    if (last === "]") {
      const openCount = (label.match(/\[/g) ?? []).length;
      const closeCount = (label.match(/\]/g) ?? []).length;
      if (openCount >= closeCount) {
        break;
      }
    }
    if (last === "}") {
      const openCount = (label.match(/\{/g) ?? []).length;
      const closeCount = (label.match(/\}/g) ?? []).length;
      if (openCount >= closeCount) {
        break;
      }
    }
    suffix = last + suffix;
    label = label.slice(0, -1);
  }
  return { label, suffix };
}

function normalizeCodeSpan(value: string) {
  let text = value.replace(/\r\n?/g, " ").replace(/\n/g, " ").replace(/\t/g, "    ");
  if (/[^ ]/.test(text) && text.startsWith(" ") && text.endsWith(" ")) {
    text = text.slice(1, -1);
  }
  return text;
}

function normalizeInlineText(value: string) {
  return value.replace(/\t/g, "    ");
}

function underscoreEmphasisAllowed(line: string, start: number, length: number) {
  const previous = start > 0 ? (line[start - 1] ?? "") : "";
  const next = line[start + length] ?? "";
  return !/\w/.test(previous) && !/\w/.test(next);
}

function emphasisTextAllowed(value: string) {
  return value.length > 0 && !/^\s|\s$/.test(value);
}

function normalizeCodeSpanNewlines(value: string) {
  return value.replace(
    /(?<codeFence>`+)(?<codeText>[^`]|[^`][\s\S]*?[^`])\k<codeFence>(?!`)/g,
    (...args: unknown[]) => {
      const match = args.at(-1) as { codeFence?: string; codeText?: string } | undefined;
      if (!match?.codeFence || match.codeText === undefined) {
        return String(args[0] ?? "");
      }
      return `${match.codeFence}${match.codeText.replace(/\n/g, " ")}${match.codeFence}`;
    },
  );
}

const inlineLinkTitleBreakPattern = new RegExp(
  `(!?\\[[^\\]]*\\]\\(\\s*(?:${inlineTargetPattern})\\s*)\\n([ \\t]*(?:"|'|\\())`,
  "g",
);

function normalizeInlineLinkTitleNewlines(value: string) {
  return value.replace(inlineLinkTitleBreakPattern, "$1 $2");
}

function markdownLineTextBeforeBreak(
  line: MarkdownLineRecord,
  index: number,
  lines: MarkdownLineRecord[],
  breaks: boolean,
) {
  if (index >= lines.length - 1) {
    return line.text;
  }
  if (line.text.endsWith("\\")) {
    return line.text.slice(0, -1);
  }
  if (markdownLineHasTrailingWhitespaceHardBreak(line.text) || breaks) {
    return line.text.replace(/[ \t]+$/, "");
  }
  return line.text;
}

function markdownLineHasTrailingWhitespaceHardBreak(line: string) {
  const trailingWhitespace = /[ \t]+$/.exec(line)?.[0] ?? "";
  return trailingWhitespace.match("\t") !== null || trailingWhitespace.length >= 2;
}

function markdownLineBreakBefore(
  lines: MarkdownLineRecord[],
  index: number,
  breaks: boolean,
): React.ReactNode {
  if (index === 0) {
    return null;
  }
  const previousLine = lines[index - 1]?.text ?? "";
  return breaks ||
    previousLine.endsWith("\\") ||
    markdownLineHasTrailingWhitespaceHardBreak(previousLine) ? (
    <br />
  ) : (
    "\n"
  );
}

function parseTextWithAutolinks(
  text: string,
  keyPrefix: string,
  context?: MarkdownContext,
): MarkdownInlinePart[] {
  const parts: MarkdownInlinePart[] = [];
  const basePath = normalizeBasePath(context?.basePath);
  const ownerName = context?.ownerName ?? "";
  const projectName = context?.projectName ?? "";
  const autolinkPattern = new RegExp(
    `(^|[^\\w/@#.&-])(${angleAutolinkPattern}|${legacyProjectPathPattern}@[0-9A-Fa-f]{40}|${legacyPathSegmentPattern}@[0-9A-Fa-f]{40}|@[0-9A-Fa-f]{40}|[0-9A-Fa-f]{40}|@${legacyProjectPathPattern}|@${legacyPathSegmentPattern}|${legacyProjectPathPattern}#[0-9]+|${legacyPathSegmentPattern}#[0-9]+|#[0-9]+|${bareAutolinkPattern})`,
    "g",
  );
  let index = 0;
  for (const match of text.matchAll(autolinkPattern)) {
    const matchStart = match.index ?? 0;
    const prefix = match[1] ?? "";
    const token = match[2] ?? "";
    const tokenStart = matchStart + prefix.length;
    if (tokenStart > index) {
      parts.push({
        kind: "text",
        key: `${keyPrefix}-text-${index}`,
        value: text.slice(index, tokenStart),
      });
    }
    const key = `${keyPrefix}-autolink-${tokenStart}`;
    if (
      (context?.suppressBareAutolinks && bareAutolinkRegex.test(token)) ||
      (context?.suppressBareEmailAutolinks && bareEmailRegex.test(token)) ||
      (context?.suppressProjectAutolinks && isProjectMarkdownAutolinkToken(token))
    ) {
      parts.push({ kind: "text", key, value: token });
    } else if (/^<.+>$/.test(token)) {
      const label = token.slice(1, -1);
      const target = angleEmailRegex.test(label) ? `mailto:${label}` : label;
      parts.push({ kind: "link", key, label, target });
    } else if (legacyProjectCommitRegex.test(token)) {
      if (isWrappedByTrailingWordCharacter(text, tokenStart + token.length)) {
        parts.push({ kind: "text", key, value: token });
      } else {
        const match = legacyProjectCommitRegex.exec(token);
        parts.push(
          commitAutolinkPart(
            token,
            key,
            basePath,
            match?.[1] ?? "",
            match?.[2] ?? "",
            match?.[3] ?? "",
            context,
          ),
        );
      }
    } else if (legacyOwnerCommitRegex.test(token)) {
      if (isWrappedByTrailingWordCharacter(text, tokenStart + token.length)) {
        parts.push({ kind: "text", key, value: token });
      } else {
        const match = legacyOwnerCommitRegex.exec(token);
        parts.push(
          commitAutolinkPart(
            token,
            key,
            basePath,
            match?.[1] ?? "",
            projectName,
            match?.[2] ?? "",
            context,
          ),
        );
      }
    } else if (/^@[0-9a-f]{40}$/i.test(token) && ownerName && projectName) {
      if (isWrappedByTrailingWordCharacter(text, tokenStart + token.length)) {
        parts.push({ kind: "text", key, value: token });
      } else {
        parts.push(
          commitAutolinkPart(token, key, basePath, ownerName, projectName, token.slice(1), context),
        );
      }
    } else if (/^[0-9a-f]{40}$/i.test(token) && ownerName && projectName) {
      if (isWrappedByTrailingWordCharacter(text, tokenStart + token.length)) {
        parts.push({ kind: "text", key, value: token });
      } else {
        parts.push(
          commitAutolinkPart(token, key, basePath, ownerName, projectName, token, context),
        );
      }
    } else if (legacyProjectMentionRegex.test(token)) {
      const projectPath = token.slice(1);
      const reference = mentionReferenceFor(context, projectPath);
      if (context?.mentionReferenceMap && !reference) {
        parts.push({ kind: "text", key, value: token });
      } else {
        const target =
          reference?.ownerName && reference.projectName
            ? `${basePath}/${reference.ownerName}/${reference.projectName}`
            : `${basePath}/${projectPath}`;
        parts.push({
          className: "no-text-decoration project-link",
          kind: "link",
          key,
          label: token,
          target,
        });
      }
    } else if (token.startsWith("@") && token.length > 1) {
      const loginId = token.slice(1);
      const reference = mentionReferenceFor(context, loginId);
      if (context?.mentionReferenceMap && !reference) {
        parts.push({ kind: "text", key, value: token });
      } else {
        const className = legacyMentionReferenceMatchesCurrentUser(
          reference ?? { kind: "user", loginId },
          normalizedLegacyMentionText(context?.currentUserLabel),
          normalizedLegacyMentionText(context?.currentUserLoginId),
        )
          ? "no-text-decoration user-link me"
          : "no-text-decoration user-link";
        parts.push({
          className,
          kind: "link",
          key,
          label: token,
          target: `${basePath}/${reference?.loginId || loginId}`,
        });
      }
    } else if (token.startsWith("#") && ownerName && projectName) {
      const issueNumber = Number.parseInt(token.slice(1), 10);
      const reference = issueReferenceFor(context, ownerName, projectName, issueNumber);
      if (reference) {
        parts.push({
          className: "issueLink",
          issueState: reference.state,
          kind: "link",
          key,
          label: token,
          target: `${basePath}/${ownerName}/${projectName}/issue/${issueNumber}`,
          title: reference.title,
        });
      } else {
        parts.push({ kind: "text", key, value: token });
      }
    } else if (token.startsWith("#")) {
      parts.push({ kind: "text", key, value: token });
    } else if (legacyProjectIssueRegex.test(token)) {
      const pathIssueMatch = legacyProjectIssueRegex.exec(token);
      const referenceOwner = pathIssueMatch?.[1] ?? "";
      const referenceProject = pathIssueMatch?.[2] ?? "";
      const issueNumber = Number.parseInt(pathIssueMatch?.[3] ?? "", 10);
      if (referenceOwner && referenceProject && Number.isFinite(issueNumber)) {
        const reference = issueReferenceFor(context, referenceOwner, referenceProject, issueNumber);
        if (reference) {
          parts.push({
            className: "issueLink",
            issueState: reference.state,
            kind: "link",
            key,
            label: token,
            target: `${basePath}/${referenceOwner}/${referenceProject}/issue/${issueNumber}`,
            title: reference.title,
          });
        } else {
          parts.push({ kind: "text", key, value: token });
        }
      } else {
        parts.push({ kind: "text", key, value: token });
      }
    } else if (legacyOwnerIssueRegex.test(token) && projectName) {
      const ownerIssueMatch = legacyOwnerIssueRegex.exec(token);
      const referenceOwner = ownerIssueMatch?.[1] ?? "";
      const issueNumber = Number.parseInt(ownerIssueMatch?.[2] ?? "", 10);
      const reference = issueReferenceFor(context, referenceOwner, projectName, issueNumber);
      if (reference) {
        parts.push({
          className: "issueLink",
          issueState: reference.state,
          kind: "link",
          key,
          label: token,
          target: `${basePath}/${referenceOwner}/${projectName}/issue/${issueNumber}`,
          title: reference.title,
        });
      } else {
        parts.push({ kind: "text", key, value: token });
      }
    } else {
      const { label, suffix } = splitBareAutolinkToken(token);
      if (bareEmailRegex.test(label) && (prefix === "'" || prefix === "<")) {
        parts.push({ kind: "text", key, value: token });
        if (suffix) {
          parts.push({ kind: "text", key: `${key}-suffix`, value: suffix });
        }
        index = tokenStart + token.length;
        continue;
      }
      const target = label.startsWith("www.")
        ? `http://${label}`
        : bareEmailRegex.test(label)
          ? `mailto:${label}`
          : label;
      parts.push({ kind: "link", key, label, target });
      if (suffix) {
        parts.push({ kind: "text", key: `${key}-suffix`, value: suffix });
      }
    }
    index = tokenStart + token.length;
  }
  if (index < text.length) {
    parts.push({ kind: "text", key: `${keyPrefix}-text-${index}`, value: text.slice(index) });
  }
  return parts;
}

function isProjectMarkdownAutolinkToken(token: string) {
  return (
    legacyProjectCommitRegex.test(token) ||
    legacyOwnerCommitRegex.test(token) ||
    /^@[0-9a-f]{40}$/i.test(token) ||
    /^[0-9a-f]{40}$/i.test(token) ||
    legacyProjectMentionRegex.test(token) ||
    legacyUserMentionRegex.test(token) ||
    legacyProjectIssueRegex.test(token) ||
    legacyOwnerIssueRegex.test(token) ||
    /^#[0-9]+$/.test(token)
  );
}

function parseInlineMarkdown(line: string, context?: MarkdownContext): MarkdownInlinePart[] {
  const parts: MarkdownInlinePart[] = [];
  let index = 0;
  const inlinePattern = new RegExp(
    `\\\\([^\\w\\s])|(!?)\\[(${inlineLabelPattern})\\]\\(\\s*(${inlineTargetPattern})?(?:\\s+(?:"((?:\\\\"|[^"\\\\])*)"|'((?:\\\\'|[^'\\\\])*)'|\\(((?:\\\\\\)|[^)\\\\])*)\\)))?\\s*\\)|(!?)\\[(${inlineLabelPattern})\\]\\[((?:\\\\(?:\\[|\\])|[^\\]\\\\[])*)\\]|(!?)\\[(${inlineLabelPattern})\\](?:\\[\\])?|\\*\\*\\*(?<strongEmAst>[^*\\n]+)\\*\\*\\*|___(?<strongEmUnd>[^_\\n]+)___|\\*\\*(?<strongAst>[^*\\n]+)\\*\\*|__(?<strongUnd>[^_\\n]+)__|(?<deleteDelimiter>~~?)(?<deleteText>[^\\s~](?:[^~\\n]*?[^\\s~])?)\\k<deleteDelimiter>(?=[^~]|$)|(?<codeFence>\`+)(?<codeText>[^\`]|[^\`][\\s\\S]*?[^\`])\\k<codeFence>(?!\`)|(?<rawHtml>${rawInlineHtmlElementPattern})|(?<angleAutolink>${angleAutolinkPattern})|(?<bareAutolink>${bareAutolinkPattern})|\\*(?<emphasisAst>[^*\\n]+)\\*|_(?<emphasisUnd>[^_\\n]+)_`,
    "gi",
  );
  for (const match of line.matchAll(inlinePattern)) {
    const start = match.index ?? 0;
    const groups = match.groups;
    if (start > index) {
      parts.push(...parseTextWithAutolinks(line.slice(index, start), `text-${index}`, context));
    }
    const inlineLinkMatched = match[3] !== undefined;
    const rawInlineTarget = match[4];
    const inlineTarget = normalizeInlineTarget(rawInlineTarget ?? "");
    const inlineTitle = match[5] ?? match[6] ?? match[7];
    const safeInlineTarget = sanitizedMarkdownTarget(inlineTarget);
    const emptyInlineTargetAllowed =
      inlineLinkMatched &&
      inlineTarget === "" &&
      ((rawInlineTarget === undefined && inlineTitle === undefined) ||
        (rawInlineTarget?.trim() ?? "") === "<>");
    if (match[1] !== undefined) {
      parts.push({ kind: "escape", key: `escape-${start}`, value: match[1] ?? "" });
    } else if (inlineLinkMatched) {
      parts.push({
        kind: match[2] === "!" ? "image" : "link",
        key: `link-${start}`,
        label: match[3] ?? "",
        target: emptyInlineTargetAllowed ? "" : safeInlineTarget,
        title: inlineTitle === undefined ? undefined : unescapeMarkdownPunctuation(inlineTitle),
      });
    } else if (match[9] !== undefined || match[12] !== undefined) {
      const label = match[9] ?? match[12] ?? "";
      const referenceLabel = match[10] ? (match[10] ?? "") : label;
      const reference = context?.referenceMap?.get(normalizeReferenceLabel(referenceLabel));
      if (reference) {
        parts.push({
          kind: (match[8] ?? match[11]) === "!" ? "image" : "link",
          key: `reference-${start}`,
          label,
          target: reference.target,
          title: reference.title,
        });
      } else {
        parts.push({ kind: "text", key: `text-${start}`, value: match[0] ?? "" });
      }
    } else if (groups?.strongEmAst !== undefined || groups?.strongEmUnd !== undefined) {
      const strongEmAst = groups.strongEmAst;
      const strongEmUnd = groups.strongEmUnd;
      if (
        strongEmUnd !== undefined &&
        !underscoreEmphasisAllowed(line, start, match[0]?.length ?? 0)
      ) {
        parts.push({ kind: "text", key: `text-${start}`, value: match[0] ?? "" });
        index = start + (match[0]?.length ?? 0);
        continue;
      }
      const emphasisDelimiter = strongEmAst !== undefined ? "*" : "_";
      parts.push({
        kind: "strong",
        key: `strong-emphasis-${start}`,
        value: `${emphasisDelimiter}${strongEmAst ?? strongEmUnd ?? ""}${emphasisDelimiter}`,
      });
    } else if (groups?.strongAst !== undefined || groups?.strongUnd !== undefined) {
      const strongText = groups.strongAst ?? groups.strongUnd ?? "";
      if (
        !emphasisTextAllowed(strongText) ||
        (groups.strongUnd !== undefined &&
          !underscoreEmphasisAllowed(line, start, match[0]?.length ?? 0))
      ) {
        parts.push({ kind: "text", key: `text-${start}`, value: match[0] ?? "" });
        index = start + (match[0]?.length ?? 0);
        continue;
      }
      parts.push({
        kind: "strong",
        key: `strong-${start}`,
        value: strongText,
      });
    } else if (groups?.deleteText !== undefined) {
      if (start > 0 && line[start - 1] === "~") {
        parts.push({ kind: "text", key: `text-${start}`, value: match[0] ?? "" });
        index = start + (match[0]?.length ?? 0);
        continue;
      }
      parts.push({ kind: "delete", key: `delete-${start}`, value: groups.deleteText });
    } else if (groups?.codeText !== undefined) {
      parts.push({
        kind: "code",
        key: `code-${start}`,
        value: normalizeCodeSpan(groups.codeText),
      });
    } else if (groups?.rawHtml !== undefined) {
      const rawInlineSpan = parseRawHtmlInlineMarkdownSpan(groups.rawHtml);
      if (rawInlineSpan) {
        parts.push({ kind: "rawHtmlInlineSpan", key: `raw-html-span-${start}`, ...rawInlineSpan });
      } else {
        parts.push({ kind: "rawHtml", key: `raw-html-${start}`, value: groups.rawHtml });
      }
    } else if (groups?.angleAutolink !== undefined || groups?.bareAutolink !== undefined) {
      if (
        groups.bareAutolink !== undefined &&
        bareEmailRegex.test(groups.bareAutolink) &&
        start > 0 &&
        (line[start - 1] === "'" || line[start - 1] === "<")
      ) {
        parts.push({ kind: "text", key: `text-${start}`, value: groups.bareAutolink });
        index = start + (match[0]?.length ?? 0);
        continue;
      }
      parts.push(
        ...parseTextWithAutolinks(
          groups.angleAutolink ?? groups.bareAutolink ?? "",
          `autolink-${start}`,
          context,
        ),
      );
    } else if (groups?.emphasisAst !== undefined || groups?.emphasisUnd !== undefined) {
      const emphasisText = groups.emphasisAst ?? groups.emphasisUnd ?? "";
      if (
        !emphasisTextAllowed(emphasisText) ||
        (groups.emphasisUnd !== undefined &&
          !underscoreEmphasisAllowed(line, start, match[0]?.length ?? 0))
      ) {
        parts.push({ kind: "text", key: `text-${start}`, value: match[0] ?? "" });
        index = start + (match[0]?.length ?? 0);
        continue;
      }
      parts.push({
        kind: "emphasis",
        key: `emphasis-${start}`,
        value: emphasisText,
      });
    } else {
      parts.push({ kind: "text", key: `text-${start}`, value: match[0] ?? "" });
    }
    index = start + (match[0]?.length ?? 0);
  }
  if (index < line.length) {
    parts.push(...parseTextWithAutolinks(line.slice(index), `text-${index}`, context));
  }
  return parts;
}

function NestedMarkdownInline(props: { context?: MarkdownContext; line: string }) {
  return <MarkdownInline context={props.context} line={props.line} />;
}

function MarkdownLinkLabel(props: { context?: MarkdownContext; label: string; target?: string }) {
  if (!props.label) {
    return <></>;
  }
  const labelContext = {
    ...props.context,
    suppressBareAutolinks: true,
    suppressBareEmailAutolinks: true,
    suppressProjectAutolinks: true,
  };
  return <MarkdownInline context={labelContext} line={props.label} />;
}

function markdownImageAltLabel(label: string) {
  return normalizeInlineText(
    decodeMarkdownHtmlEntities(unescapeMarkdownImageAltBrackets(label)),
  ).replace(
    /(?<codeFence>`+)(?<codeText>[^`]|[^`][\s\S]*?[^`])\k<codeFence>(?!`)/g,
    (...args: unknown[]) => {
      const match = args.at(-1) as { codeFence?: string; codeText?: string } | undefined;
      if (!match?.codeFence || match.codeText === undefined) {
        return String(args[0] ?? "");
      }
      return `${match.codeFence}${match.codeText.replace(/\t/g, "    ")}${match.codeFence}`;
    },
  );
}

function MarkdownInline(props: { context?: MarkdownContext; line: string }) {
  return parseInlineMarkdown(props.line, props.context).map((part) => {
    if (part.kind === "image") {
      return (
        <img
          alt={markdownImageAltLabel(part.label)}
          key={part.key}
          src={
            part.target === undefined || part.target === ""
              ? undefined
              : encodeMarkdownUrlTarget(part.target)
          }
          title={part.title ? decodeMarkdownHtmlEntities(part.title) : undefined}
        />
      );
    }
    if (part.kind === "link") {
      return (
        <a
          className={part.className}
          data-issue-state={part.issueState}
          href={part.target === undefined ? undefined : encodeMarkdownUrlTarget(part.target)}
          key={part.key}
          title={part.title ? decodeMarkdownHtmlEntities(part.title) : undefined}
        >
          <MarkdownLinkLabel context={props.context} label={part.label} target={part.target} />
        </a>
      );
    }
    if (part.kind === "strong") {
      return (
        <strong key={part.key}>
          <NestedMarkdownInline context={props.context} line={part.value} />
        </strong>
      );
    }
    if (part.kind === "code") {
      return <code key={part.key}>{part.value}</code>;
    }
    if (part.kind === "delete") {
      return (
        <del key={part.key}>
          <NestedMarkdownInline context={props.context} line={part.value} />
        </del>
      );
    }
    if (part.kind === "emphasis") {
      return (
        <em key={part.key}>
          <NestedMarkdownInline context={props.context} line={part.value} />
        </em>
      );
    }
    if (part.kind === "escape") {
      return <React.Fragment key={part.key}>{part.value}</React.Fragment>;
    }
    if (part.kind === "rawHtml") {
      return <MarkdownSanitizedRawHtml key={part.key} keyPrefix={part.key} source={part.value} />;
    }
    if (part.kind === "rawHtmlInlineSpan") {
      const childContext =
        part.tag === "a"
          ? {
              ...props.context,
              suppressBareAutolinks: true,
              suppressProjectAutolinks: true,
            }
          : part.tag === "code"
            ? {
                ...props.context,
                suppressBareEmailAutolinks: true,
                suppressProjectAutolinks: true,
              }
            : props.context;
      const children = <NestedMarkdownInline context={childContext} line={part.value} />;
      if (!part.tag) {
        return <React.Fragment key={part.key}>{children}</React.Fragment>;
      }
      return React.createElement(
        part.tag,
        { ...parseRawHtmlAttributes(part.tag, part.rawAttributes), key: part.key },
        children,
      );
    }
    return (
      <React.Fragment key={part.key}>
        {normalizeInlineText(decodeMarkdownHtmlEntities(part.value))}
      </React.Fragment>
    );
  });
}

function paragraphBlocks(markdown: string): MarkdownBlockRecord[] {
  const source = normalizeLooseListContinuationLines(markdown.replace(/\r\n?/g, "\n")).replace(
    /^\n+/g,
    "",
  );
  const terminalNewline = /\n+$/.test(source);
  const normalized = source.replace(/\n+$/g, "");
  if (!normalized) {
    return [];
  }
  const blocks: MarkdownBlockRecord[] = [];
  let offset = 0;
  const blockTexts = normalized.split(/\n{2,}/);
  for (const [index, text] of blockTexts.entries()) {
    blocks.push({
      key: `block-${offset}`,
      terminalNewline: index === blockTexts.length - 1 ? terminalNewline : undefined,
      text,
    });
    offset += text.length + 2;
  }
  return blocks;
}

function normalizeLooseListContinuationLines(markdown: string): string {
  const lines = markdown.split("\n");
  const normalized: string[] = [];
  let activeListLine: ParsedMarkdownListLine | null = null;
  let activeListIndent = 0;
  for (const [index, line] of lines.entries()) {
    const listLine = parseMarkdownListLine({ key: `normalize-${index}`, text: line });
    if (listLine) {
      activeListLine = listLine;
      activeListIndent = markdownListRootIndent(listLine);
      normalized.push(line);
      continue;
    }
    if (/^\s*$/.test(line)) {
      const nextLine = lines[index + 1] ?? "";
      if (/^\s*$/.test(nextLine)) {
        activeListLine = null;
        normalized.push(line);
        continue;
      }
      const nextListLine = parseMarkdownListLine({ key: `normalize-${index + 1}`, text: nextLine });
      const nextIndentMatch = /^(\s+)\S/.exec(nextLine);
      const nextIndent = nextIndentMatch
        ? (nextIndentMatch[1] ?? "").replace(/\t/g, "    ").length
        : null;
      if (
        activeListLine &&
        (markdownListLinesShareList(activeListLine, nextListLine, activeListIndent) ||
          (nextListLine
            ? !markdownListLineIsAtListLevel(
                activeListIndent,
                activeListLine.markerWidth,
                nextListLine,
              )
            : nextIndent !== null && nextIndent > activeListIndent))
      ) {
        normalized.push(`${" ".repeat(activeListLine.indent + 1)}${looseListBreakMarker}`);
        continue;
      }
      normalized.push(line);
      continue;
    }
    const continuationMatch = /^(\s+)\S/.exec(line);
    if (activeListLine !== null && continuationMatch) {
      normalized.push(line);
      continue;
    }
    activeListLine = null;
    activeListIndent = 0;
    normalized.push(line);
  }
  return normalized.join("\n");
}

function markdownLines(block: string): MarkdownLineRecord[] {
  const lines: MarkdownLineRecord[] = [];
  let offset = 0;
  for (const text of block.split("\n")) {
    lines.push({ key: `line-${offset}`, text });
    offset += text.length + 1;
  }
  return lines;
}

function splitTableRow(line: string, count?: number): string[] {
  const trimmedLine = line.trim();
  const cells: string[] = [];
  let cell = "";
  for (let index = 0; index < trimmedLine.length; index += 1) {
    const character = trimmedLine[index] ?? "";
    if (character !== "|") {
      cell += character;
      continue;
    }
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && trimmedLine[cursor] === "\\"; cursor -= 1) {
      slashCount += 1;
    }
    if (slashCount % 2 === 1) {
      cell = `${cell.slice(0, -1)}|`;
      continue;
    }
    cells.push(cell.trim());
    cell = "";
  }
  cells.push(cell.trim());
  if (cells[0] === "") {
    cells.shift();
  }
  if (cells.at(-1) === "") {
    cells.pop();
  }
  if (count === undefined) {
    return cells;
  }
  if (cells.length > count) {
    return cells.slice(0, count);
  }
  return [...cells, ...Array.from({ length: count - cells.length }, () => "")];
}

function tableAlignment(separator: string): MarkdownTableCell["align"] {
  if (/^:-+:$/.test(separator)) {
    return "center";
  }
  if (/^:-+$/.test(separator)) {
    return "left";
  }
  if (/^-+:$/.test(separator)) {
    return "right";
  }
  return undefined;
}

function markdownTableLineHasUnescapedPipe(line: string) {
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] !== "|") {
      continue;
    }
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && line[cursor] === "\\"; cursor -= 1) {
      slashCount += 1;
    }
    if (slashCount % 2 === 0) {
      return true;
    }
  }
  return false;
}

function gfmTableBodyInterruption(line: string): boolean {
  return (
    /^ {0,3}(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/.test(line) ||
    /^ {0,3}#{1,6} /.test(line) ||
    /^ {0,3}>/.test(line) ||
    /^ {4}[^\n]/.test(line) ||
    /^ {0,3}(?:`{3,}(?=[^`\n]*$)|~{3,})/.test(line) ||
    /^ {0,3}(?:[*+-]|1[.)]) /.test(line) ||
    markdownLineStartsRawHtmlBlock(line)
  );
}

function parseMarkdownTableSpan(
  lines: MarkdownLineRecord[],
): { consumedLineCount: number; table: MarkdownTableRecord } | null {
  if (lines.length < 2) {
    return null;
  }
  if (
    !markdownTableLineHasUnescapedPipe(lines[0]?.text ?? "") &&
    !markdownTableLineHasUnescapedPipe(lines[1]?.text ?? "")
  ) {
    return null;
  }
  const header = splitTableRow(lines[0]?.text ?? "");
  const separator = splitTableRow(lines[1]?.text ?? "");
  if (header.length === 0 || separator.length !== header.length) {
    return null;
  }
  if (!separator.every((cell) => /^[-:]+$/.test(cell))) {
    return null;
  }
  const headers = header.map((text, columnIndex) => ({
    align: tableAlignment(separator[columnIndex] ?? ""),
    key: `${lines[0]?.key ?? "header"}-${columnIndex}-${text}`,
    text,
  }));
  const rows: MarkdownTableRow[] = [];
  let consumedLineCount = 2;
  for (const line of lines.slice(2)) {
    if (line.text.trim() === "" || gfmTableBodyInterruption(line.text)) {
      break;
    }
    const cells = splitTableRow(line.text, headers.length);
    rows.push({
      cells: headers.map((headerCell, columnIndex) => ({
        align: headerCell.align,
        key: `${line.key}-${headerCell.key}`,
        text: cells[columnIndex] ?? "",
      })),
      key: line.key,
    });
    consumedLineCount += 1;
  }
  return { consumedLineCount, table: { headers, rows } };
}

function legacyGfmTableSeparatorCell(cell: string): string | undefined {
  const trimmed = cell.trim();
  if (!/^[-:]+$/.test(trimmed)) {
    return undefined;
  }
  if (/^:-+:$/.test(trimmed)) {
    return ":---:";
  }
  if (/^:-+$/.test(trimmed)) {
    return ":---";
  }
  if (/^-+:$/.test(trimmed)) {
    return "---:";
  }
  return "---";
}

function normalizeLegacyGfmTableSeparatorLine(
  previousLine: string,
  line: string,
): string | undefined {
  if (
    !markdownTableLineHasUnescapedPipe(previousLine) &&
    !markdownTableLineHasUnescapedPipe(line)
  ) {
    return undefined;
  }
  const separator = splitTableRow(line);
  if (separator.length === 0) {
    return undefined;
  }
  const normalized = separator.map(legacyGfmTableSeparatorCell);
  if (normalized.some((cell) => cell === undefined)) {
    return undefined;
  }
  const indent = /^ */.exec(line)?.[0] ?? "";
  const hasLeadingPipe = line.trimStart().startsWith("|");
  const hasTrailingPipe = line.trimEnd().endsWith("|");
  const body = normalized.join(" | ");
  return `${indent}${hasLeadingPipe ? "| " : ""}${body}${hasTrailingPipe ? " |" : ""}`;
}

function normalizeLegacyBlockquoteGfmTableSeparatorLine(
  previousLine: string,
  line: string,
): string | undefined {
  const previousMatch = /^ {0,3}>(.*)$/.exec(previousLine);
  const lineMatch = /^( {0,3})>(.*)$/.exec(line);
  if (!previousMatch || !lineMatch) {
    return undefined;
  }
  const normalized = normalizeLegacyGfmTableSeparatorLine(
    blockquoteTextAfterMarker(previousMatch[1] ?? ""),
    blockquoteTextAfterMarker(lineMatch[2] ?? ""),
  );
  return normalized === undefined ? undefined : `${lineMatch[1] ?? ""}> ${normalized}`;
}

function markdownLineStartsOrderedList(
  line: string,
): { orderedStartsWithOne: boolean } | undefined {
  const match = /^ {0,3}(\d{1,9})[.)][ \t]+/.exec(line);
  if (!match) {
    return undefined;
  }
  return { orderedStartsWithOne: match[1] === "1" };
}

function escapeLegacyNonInterruptingOrderedListLine(line: string): string {
  return line.replace(/^(\s{0,3}\d{1,9})([.)])([ \t]+)/, "$1\\$2$3");
}

function normalizeLegacyEmptyTaskItemLine(line: string) {
  return line.replace(
    /^( {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+\[[ xX]\] )$/,
    `$1${legacyEmptyTaskItemPlaceholder}`,
  );
}

function normalizeLegacyTaskItemLine(line: string) {
  const tabSeparatedTask = /^( {0,3}(?:[-+*]|\d{1,9}[.)]) +\[[ xX]\])\t([^\t]*)$/.exec(line);
  if (tabSeparatedTask) {
    const taskText = tabSeparatedTask[2] ?? "";
    return `${tabSeparatedTask[1] ?? ""} ${taskText || legacyEmptyTaskItemPlaceholder}`;
  }
  return normalizeLegacyEmptyTaskItemLine(line);
}

function normalizeLegacyDirectTabListItemLine(line: string) {
  return line.replace(
    /^( {0,3}(?:[-+*]|\d{1,9}[.)]))\t(?![-+*][ \t]|\d{1,9}[.)][ \t])([^\t]*)$/,
    `$1 ${legacyDirectTabListItemPlaceholder}$2`,
  );
}

function normalizeLegacySpaceTabContinuationListItemLine(line: string) {
  const match = /^( {0,3})([-+*]|\d{1,9}[.)])( +)\t([^\t]*)$/.exec(line);
  if (!match) {
    return line;
  }
  const marker = match[2] ?? "";
  const spaceCount = (match[3] ?? "").length;
  const visiblePadding = spaceCount + 4 - (marker.length + 2);
  if (visiblePadding >= 4) {
    const leadingCodePadding = visiblePadding - 4;
    const placeholder =
      leadingCodePadding === 0
        ? ""
        : `${legacyListLeadingCodePaddingPlaceholder}:${leadingCodePadding}:`;
    return `${match[1] ?? ""}${marker}${match[3] ?? ""}\t${placeholder}${match[4] ?? ""}`;
  }
  if (visiblePadding < 0) {
    return line;
  }
  const placeholder =
    visiblePadding === 0 ? "" : `${legacySpaceTabListItemPaddingPlaceholder}:${visiblePadding}:`;
  return `${match[1] ?? ""}${marker} ${placeholder}${match[4] ?? ""}`;
}

function normalizeLegacyExtraListContinuationLine(line: string, markerPadding: number | null) {
  if (markerPadding === null) {
    return line;
  }
  const match = /^( +)(\S.*)$/.exec(line);
  if (!match) {
    return line;
  }
  const indent = (match[1] ?? "").length;
  const visiblePadding = indent - markerPadding;
  if (visiblePadding <= 0 || visiblePadding >= 4) {
    return line;
  }
  return `${" ".repeat(markerPadding)}${legacyExtraListContinuationPaddingPlaceholder}:${visiblePadding}:${
    match[2] ?? ""
  }`;
}

function normalizeLegacyLineStartTripleTildeText(line: string) {
  if (!/^ {0,3}~~~\S.*~~~\s*$/.test(line)) {
    return line;
  }
  return line.replace(/^( {0,3})~~~(?=\S)/, "$1\\~~~");
}

function normalizeLegacyFenceClosingLine(openFence: string, line: string): string | undefined {
  const closeFence = closingFenceFromLine(line);
  if (!closeFence || !closesMarkdownFence(openFence, closeFence)) {
    return undefined;
  }
  const indent = /^ {0,3}/.exec(line)?.[0] ?? "";
  return `${indent}${openFence}`;
}

function splitYonaRawHtmlOpaqueBlocks(lines: string[]) {
  const output: string[] = [];
  const opaqueRawHtmlBlocks = new Map<string, string>();
  let openFence = "";
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (openFence) {
      output.push(line);
      const closeFence = closingFenceFromLine(line);
      if (closeFence && closesMarkdownFence(openFence, closeFence)) {
        openFence = "";
      }
      continue;
    }
    const nextOpenFence = openingFenceFromLine(line);
    if (nextOpenFence) {
      output.push(line);
      openFence = nextOpenFence;
      continue;
    }
    const boundaryTag = rawBlockTagWithClosingBoundaryFromLine(line);
    if (
      !boundaryTag &&
      !markdownLineIsStandaloneRawHtmlDirectiveBlock(line) &&
      !markdownLineStartsRawHtmlBlock(line) &&
      !markdownLineIsStandaloneRawHtmlVoidBlock(line)
    ) {
      output.push(line);
      continue;
    }

    const rawLines = [line];
    if (boundaryTag) {
      const closingPattern = rawHtmlClosingPattern(boundaryTag);
      while (index < lines.length - 1 && !closingPattern.test(rawLines.at(-1) ?? "")) {
        index += 1;
        rawLines.push(lines[index] ?? "");
      }
    } else if (
      markdownLineStartsRawHtmlBlock(line) ||
      markdownLineIsStandaloneRawHtmlVoidBlock(line)
    ) {
      while (index < lines.length - 1 && (lines[index + 1] ?? "").trim() !== "") {
        index += 1;
        rawLines.push(lines[index] ?? "");
      }
    }

    const id = String(opaqueRawHtmlBlocks.size);
    opaqueRawHtmlBlocks.set(id, rawLines.join("\n"));
    output.push(`<!-- yona-raw-html-block:${id} -->`);
  }
  return { lines: output, opaqueRawHtmlBlocks };
}

function preprocessLegacyMarkedBlockGrammar(markdown: string): LegacyMarkedPreprocessResult {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const rawHtmlSplit = splitYonaRawHtmlOpaqueBlocks(lines);
  const output: string[] = [];
  let openFence = "";
  let activeListMarkerPadding: number | null = null;
  let previousLineCanBeInterrupted = false;
  for (let index = 0; index < rawHtmlSplit.lines.length; index += 1) {
    const line = rawHtmlSplit.lines[index] ?? "";
    if (openFence) {
      const normalizedClosingLine = normalizeLegacyFenceClosingLine(openFence, line);
      output.push(normalizedClosingLine ?? line);
      if (normalizedClosingLine) {
        openFence = "";
      }
      previousLineCanBeInterrupted = false;
      continue;
    }
    const previousLine = output.at(-1) ?? "";
    const normalizedSeparator =
      index > 0 && !/^ {4}/.test(line)
        ? (normalizeLegacyBlockquoteGfmTableSeparatorLine(previousLine, line) ??
          normalizeLegacyGfmTableSeparatorLine(previousLine, line))
        : undefined;
    const candidateLine = normalizedSeparator ?? line;
    const orderedList = markdownLineStartsOrderedList(candidateLine);
    const protectedLine =
      previousLineCanBeInterrupted && orderedList && !orderedList.orderedStartsWithOne
        ? escapeLegacyNonInterruptingOrderedListLine(candidateLine)
        : candidateLine;
    const listLine = parseMarkdownListLine({ key: `preprocess-${index}`, text: protectedLine });
    const normalizedContinuationLine =
      listLine === null
        ? normalizeLegacyExtraListContinuationLine(protectedLine, activeListMarkerPadding)
        : protectedLine;
    const normalizedLineStartTildeText =
      listLine === null
        ? normalizeLegacyLineStartTripleTildeText(normalizedContinuationLine)
        : normalizedContinuationLine;

    output.push(
      normalizeLegacySpaceTabContinuationListItemLine(
        normalizeLegacyDirectTabListItemLine(
          normalizeLegacyTaskItemLine(normalizedLineStartTildeText),
        ),
      ),
    );
    const nextOpenFence = openingFenceFromLine(protectedLine);
    if (nextOpenFence) {
      openFence = nextOpenFence;
      previousLineCanBeInterrupted = false;
      continue;
    }
    if (/^\s*$/.test(line)) {
      activeListMarkerPadding = null;
      previousLineCanBeInterrupted = false;
    } else if (/^\s*(?:[-*+]|\d{1,9}[.)])([ \t]+).*$/.test(line)) {
      activeListMarkerPadding =
        listLine === null ? null : listLine.indent + listLine.markerWidth + 1;
      previousLineCanBeInterrupted = false;
    } else {
      previousLineCanBeInterrupted = !markdownLineStartsBlock(line);
    }
  }
  return {
    markdown: output.join("\n"),
    opaqueRawHtmlBlocks: rawHtmlSplit.opaqueRawHtmlBlocks,
  };
}

function MarkdownTable(props: { context?: MarkdownContext; table: MarkdownTableRecord }) {
  return (
    <table>
      <thead>
        <tr>
          {props.table.headers.map((header) => (
            <th align={header.align} key={header.key}>
              <MarkdownInline context={props.context} line={header.text} />
            </th>
          ))}
        </tr>
      </thead>
      {props.table.rows.length > 0 ? (
        <tbody>
          {props.table.rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell) => (
                <td align={cell.align} key={cell.key}>
                  <MarkdownInline context={props.context} line={cell.text} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ) : null}
    </table>
  );
}

function parseMarkdownList(
  lines: MarkdownLineRecord[],
  terminalNewline?: boolean,
): MarkdownListRecord | null {
  if (lines.length === 0) {
    return null;
  }
  const parsedLines = lines.map(parseMarkdownListEntry);
  if (parsedLines.some((line) => line === null)) {
    return null;
  }
  const firstLine = parsedLines[0];
  if (!firstLine || firstLine.kind !== "item") {
    return null;
  }
  if (firstLine.text === "" && lines.length === 1 && !terminalNewline) {
    return null;
  }
  const span = parseMarkdownListAt(
    parsedLines as ParsedMarkdownListEntry[],
    0,
    markdownListRootIndent(firstLine),
  );
  if (!span || span.nextIndex !== parsedLines.length) {
    return null;
  }
  return span.list;
}

function parseMarkdownListEntry(line: MarkdownLineRecord): ParsedMarkdownListEntry | null {
  const listLine = parseMarkdownListLine(line);
  if (listLine) {
    return listLine;
  }
  const continuationMatch = /^(\s+)(\S.*)$/.exec(line.text);
  if (!continuationMatch) {
    return null;
  }
  return {
    indent: (continuationMatch[1] ?? "").replace(/\t/g, "    ").length,
    key: line.key,
    kind: "continuation",
    text: continuationMatch[2] ?? "",
  };
}

function parseMarkdownListLine(line: MarkdownLineRecord): ParsedMarkdownListLine | null {
  const match = /^(\s*)([-*+]|\d+[.)])([ \t]+)(.*)$/.exec(line.text);
  if (!match) {
    return null;
  }
  const marker = match[2] ?? "";
  const ordered = /^\d/.test(marker);
  const orderedDigits = ordered ? marker.slice(0, -1) : "";
  if (orderedDigits.length > 9) {
    return null;
  }
  return {
    indent: (match[1] ?? "").replace(/\t/g, "    ").length,
    key: line.key,
    kind: "item",
    markerKind: ordered ? marker.slice(-1) : marker,
    markerWidth: marker.length,
    ordered,
    start: ordered ? Number.parseInt(marker, 10) : undefined,
    ...markdownListItemTextAfterMarker(marker, match[3] ?? "", match[4] ?? ""),
  };
}

function markdownListItemTextAfterMarker(marker: string, spacing: string, text: string) {
  if (spacing.startsWith("\t")) {
    return { text: `${" ".repeat(3)}${text}` };
  }
  const spacedTabMatch = /^( +)\t/.exec(spacing);
  if (spacedTabMatch) {
    const spaceCount = (spacedTabMatch[1] ?? "").length;
    const continuedIndent = spaceCount + 4 - (marker.length + 2);
    return {
      continuedLeadingIndentedCode: continuedIndent >= 4,
      continuedText: `${" ".repeat(Math.max(0, continuedIndent))}${text}`,
      leadingIndentedCode: true,
      text: `${" ".repeat(Math.max(0, spaceCount - 1))}${text}`,
    };
  }
  return { text: `${spacing.slice(1)}${text}` };
}

function markdownListLinesShareList(
  firstLine: ParsedMarkdownListLine,
  nextLine: ParsedMarkdownListLine | null,
  listIndent = firstLine.indent,
) {
  return (
    nextLine !== null &&
    markdownListLineIsAtListLevel(listIndent, firstLine.markerWidth, nextLine) &&
    nextLine.ordered === firstLine.ordered &&
    nextLine.markerKind === firstLine.markerKind
  );
}

function markdownListRootIndent(line: ParsedMarkdownListLine) {
  return line.indent <= 3 ? 0 : line.indent;
}

function markdownListLineIsAtListLevel(
  listIndent: number,
  markerWidth: number,
  line: ParsedMarkdownListLine,
) {
  if (listIndent === 0) {
    return line.indent <= 3;
  }
  return line.indent >= listIndent && line.indent < listIndent + markerWidth + 1;
}

function parseMarkdownListAt(
  lines: ParsedMarkdownListEntry[],
  startIndex: number,
  indent: number,
): { list: MarkdownListRecord; nextIndex: number } | null {
  const firstLine = lines[startIndex];
  if (
    !firstLine ||
    firstLine.kind !== "item" ||
    !markdownListLineIsAtListLevel(indent, firstLine.markerWidth, firstLine)
  ) {
    return null;
  }
  const items: MarkdownListItem[] = [];
  let index = startIndex;
  while (index < lines.length) {
    const line = lines[index];
    if (!line || line.indent < indent) {
      break;
    }
    if (line.kind === "continuation") {
      const parent = items.at(-1);
      if (!parent || line.indent <= indent) {
        return null;
      }
      if (line.text === looseListBreakMarker) {
        parent.loose = true;
        parent.text = `${parent.text}\n${looseListBreakMarker}`;
        if (parent.continuedText !== undefined) {
          parent.continuedText = `${parent.continuedText}\n${looseListBreakMarker}`;
        }
        index += 1;
        continue;
      }
      const continuationText = markdownListContinuationText(
        line,
        firstLine.indent,
        parent.markerWidth,
      );
      parent.text = `${parent.text}\n${continuationText}`;
      if (parent.continuedText !== undefined) {
        parent.continuedText = `${parent.continuedText}\n${continuationText}`;
      }
      index += 1;
      continue;
    }
    const nestedIndent = firstLine.indent + firstLine.markerWidth + 1;
    if (line.indent >= nestedIndent) {
      const parent = items.at(-1);
      if (!parent) {
        return null;
      }
      const nested = parseMarkdownListAt(lines, index, line.indent);
      if (!nested) {
        return null;
      }
      parent.children = [...(parent.children ?? []), nested.list];
      if (nested.list.loose) {
        parent.loose = true;
      }
      index = nested.nextIndex;
      continue;
    }
    if (!markdownListLineIsAtListLevel(indent, firstLine.markerWidth, line)) {
      break;
    }
    if (line.ordered !== firstLine.ordered || line.markerKind !== firstLine.markerKind) {
      break;
    }
    items.push(parseMarkdownListItem(line));
    index += 1;
  }
  if (items.length === 0) {
    return null;
  }
  return {
    list: {
      items,
      loose: items.some(
        (item) => item.loose || item.children?.some((child) => child.loose) === true,
      ),
      ordered: firstLine.ordered,
      start: firstLine.start,
    },
    nextIndex: index,
  };
}

function markdownListContinuationText(
  line: ParsedMarkdownListContinuation,
  listIndent: number,
  markerWidth: number,
) {
  const markerPadding = listIndent + markerWidth + 1;
  const visibleIndent = Math.max(0, line.indent - markerPadding);
  return `${" ".repeat(visibleIndent)}${line.text}`;
}

function parseMarkdownListItem(line: ParsedMarkdownListLine): MarkdownListItem {
  const taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(line.text);
  if (!taskMatch) {
    const nestedLine = parseMarkdownListLine({ key: `${line.key}-nested`, text: line.text });
    if (nestedLine) {
      return {
        children: [
          {
            items: [parseMarkdownListItem(nestedLine)],
            ordered: nestedLine.ordered,
            start: nestedLine.start,
          },
        ],
        continuedLeadingIndentedCode: line.continuedLeadingIndentedCode,
        continuedText: line.continuedText,
        key: line.key,
        leadingIndentedCode: line.leadingIndentedCode,
        markerWidth: line.markerWidth,
        task: false,
        text: "",
      };
    }
    return {
      continuedLeadingIndentedCode: line.continuedLeadingIndentedCode,
      continuedText: line.continuedText,
      key: line.key,
      leadingIndentedCode: line.leadingIndentedCode,
      markerWidth: line.markerWidth,
      task: false,
      text: line.text,
    };
  }
  return {
    checked: (taskMatch[1] ?? "").toLowerCase() === "x",
    continuedLeadingIndentedCode: line.continuedLeadingIndentedCode,
    continuedText: line.continuedText,
    key: line.key,
    leadingIndentedCode: line.leadingIndentedCode,
    markerWidth: line.markerWidth,
    task: true,
    text: taskMatch[2] ?? "",
  };
}

function markdownTaskStats(markdown: string): MarkdownTaskStats | null {
  let checked = 0;
  let total = 0;
  let previousLineCanBeInterrupted = false;
  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*$/.test(line)) {
      previousLineCanBeInterrupted = false;
      continue;
    }
    const taskMatch = /^( {0,3})([-+*]|\d{1,9}[.)])([ \t]+)\[([ xX])\](?:[ \t].*)$/.exec(line);
    if (!taskMatch) {
      previousLineCanBeInterrupted = !markdownLineStartsBlock(line);
      continue;
    }
    const marker = taskMatch[2] ?? "";
    const ordered = /^\d/.test(marker);
    const orderedStartsWithOne = /^1[.)]$/.test(marker);
    if (previousLineCanBeInterrupted && ordered && !orderedStartsWithOne) {
      previousLineCanBeInterrupted = true;
      continue;
    }
    total += 1;
    if ((taskMatch[4] ?? "").toLowerCase() === "x") {
      checked += 1;
    }
    previousLineCanBeInterrupted = false;
  }
  if (total === 0) {
    return null;
  }
  return { checked, percentage: (checked / total) * 100, total };
}

function MarkdownTasklistBar(props: { stats: MarkdownTaskStats }) {
  const complete = props.stats.percentage === 100;
  return (
    <div className="tasklist task-show">
      <div className="task-title" style={{ width: `${props.stats.percentage}%` }}>
        Tasks<span className="done-counter">{`(${props.stats.checked}/${props.stats.total})`}</span>
      </div>
      <div className="task-progress">
        <div
          className={`bar ${complete ? "green" : "red"}`}
          style={{ width: `${props.stats.percentage}%` }}
          title="Tasklist"
        />
      </div>
    </div>
  );
}

function MarkdownList(props: { context?: MarkdownContext; list: MarkdownListRecord }) {
  const children = props.list.items.map((item) => (
    <li className={item.task ? "task-list-item" : undefined} key={item.key}>
      {props.list.loose ? (
        <MarkdownLooseListItem context={props.context} item={item} />
      ) : (
        <MarkdownTightListItemContent context={props.context} item={item} />
      )}
      {item.children?.map((child) => (
        <MarkdownList
          context={props.context}
          key={`${item.key}-child-${child.ordered ? "ol" : "ul"}-${child.start ?? 1}-${child.items[0]?.key ?? "empty"}`}
          list={child}
        />
      ))}
    </li>
  ));
  return props.list.ordered ? (
    <ol
      start={
        props.list.start !== undefined && props.list.start !== 1 ? props.list.start : undefined
      }
    >
      {children}
    </ol>
  ) : (
    <ul>{children}</ul>
  );
}

function MarkdownTightListItemContent(props: {
  context?: MarkdownContext;
  item: MarkdownListItem;
}) {
  if (props.item.leadingIndentedCode && !props.item.text.includes("\n")) {
    return (
      <pre>
        <code>{`${props.item.text}\n`}</code>
      </pre>
    );
  }
  const itemText = markdownListItemRenderText(props.item);
  if (props.item.continuedLeadingIndentedCode && props.item.continuedText?.includes("\n")) {
    const lines = markdownLines(itemText);
    const firstLine = lines[0]?.text ?? "";
    const restText = lines
      .slice(1)
      .map((line) => line.text)
      .join("\n");
    return (
      <>
        <pre>
          <code>{`${firstLine.replace(/^ {0,4}/, "")}\n`}</code>
        </pre>
        {restText ? <MarkdownInlineLines context={props.context} text={restText} /> : null}
      </>
    );
  }
  const nestedBlockIndex = markdownListItemNestedBlockIndex(itemText);
  if (nestedBlockIndex === null) {
    return (
      <>
        <MarkdownTaskCheckbox context={props.context} item={props.item} />
        {props.item.task ? " " : null}
        <MarkdownInlineLines context={props.context} text={itemText} />
      </>
    );
  }
  const lines = markdownLines(itemText);
  const inlineText = lines
    .slice(0, nestedBlockIndex)
    .map((line) => line.text)
    .join("\n");
  const nestedLines = lines.slice(nestedBlockIndex);
  return (
    <>
      <MarkdownTaskCheckbox context={props.context} item={props.item} />
      {props.item.task ? " " : null}
      {inlineText ? <MarkdownInlineLines context={props.context} text={inlineText} /> : null}
      <MarkdownBlockSequence context={props.context} lines={nestedLines} />
    </>
  );
}

function markdownListItemRenderText(item: MarkdownListItem) {
  if (item.continuedText !== undefined && item.text.includes("\n")) {
    return item.continuedText;
  }
  return item.text;
}

function markdownListItemNestedBlockIndex(text: string) {
  const lines = markdownLines(text);
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) {
      continue;
    }
    if (
      markdownLineStartsRawHtmlBlock(line.text) ||
      openingFencePattern.test(line.text) ||
      /^ {0,3}#{1,6}(?=\s|$)/.test(line.text) ||
      /^ {0,3}>/.test(line.text)
    ) {
      return index;
    }
  }
  return null;
}

function MarkdownTaskCheckbox(props: { context?: MarkdownContext; item: MarkdownListItem }) {
  if (!props.item.task) {
    return null;
  }
  const checkboxIndex = props.context?.taskCheckboxIndex?.current ?? 0;
  if (props.context?.taskCheckboxIndex) {
    props.context.taskCheckboxIndex.current += 1;
  }
  const disabled = props.context?.taskCheckboxDisabled ?? true;
  const onTasklistToggle = props.context?.onTasklistToggle;
  const originalMarkdown = props.context?.tasklistSourceMarkdown ?? "";
  return (
    <input
      checked={props.item.checked}
      className="task-list-item-checkbox"
      data-task-index={!disabled && onTasklistToggle ? checkboxIndex : undefined}
      disabled={disabled}
      onChange={
        !disabled && onTasklistToggle
          ? (event) => {
              const checked = event.currentTarget.checked;
              void onTasklistToggle({
                checked,
                checkboxIndex,
                nextMarkdown: toggleLegacyTasklistMarkdownItem(
                  originalMarkdown,
                  checkboxIndex,
                  checked,
                ),
                originalMarkdown,
              });
            }
          : undefined
      }
      readOnly={disabled || !onTasklistToggle}
      type="checkbox"
    />
  );
}

function MarkdownLooseListItem(props: { context?: MarkdownContext; item: MarkdownListItem }) {
  const itemText = markdownListItemRenderText(props.item);
  const paragraphs: { key: string; text: string }[] = [];
  let offset = 0;
  const rawParagraphs = itemText.split(`\n${looseListBreakMarker}\n`);
  const leadingCodeParagraph =
    props.item.continuedLeadingIndentedCode && props.item.continuedText?.includes("\n")
      ? rawParagraphs.shift()
      : undefined;
  for (const [paragraphIndex, rawParagraph] of rawParagraphs.entries()) {
    const cleanedParagraph = rawParagraph.replaceAll(looseListBreakMarker, "");
    const text =
      props.item.continuedText !== undefined &&
      !props.item.continuedLeadingIndentedCode &&
      paragraphIndex === 0
        ? cleanedParagraph.replace(/\s+$/g, "")
        : cleanedParagraph.trim();
    if (text) {
      paragraphs.push({ key: `${props.item.key}-loose-${offset}-${text}`, text });
    }
    offset += rawParagraph.length + looseListBreakMarker.length + 2;
  }
  return (
    <>
      {leadingCodeParagraph !== undefined ? (
        <pre>
          <code>{`${leadingCodeParagraph.replace(/^ {0,4}/, "")}\n`}</code>
        </pre>
      ) : null}
      {paragraphs.map((paragraph) => (
        <p key={paragraph.key}>
          {paragraph === paragraphs[0] ? (
            <>
              <MarkdownTaskCheckbox item={props.item} />
              {props.item.task ? " " : null}
            </>
          ) : null}
          <MarkdownInlineLines context={props.context} text={paragraph.text} />
        </p>
      ))}
    </>
  );
}

function MarkdownInlineLines(props: { context?: MarkdownContext; text: string }) {
  const lines = markdownLines(
    normalizeInlineLinkTitleNewlines(normalizeCodeSpanNewlines(props.text)),
  );
  const breaks = props.context?.breaks ?? true;
  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={line.key}>
          {markdownLineBreakBefore(lines, index, breaks)}
          <MarkdownInline
            context={props.context}
            line={markdownLineTextBeforeBreak(line, index, lines, breaks)}
          />
        </React.Fragment>
      ))}
    </>
  );
}

function parseMarkdownBlockquote(lines: MarkdownLineRecord[]): MarkdownBlockquoteRecord[] | null {
  if (lines.length === 0) {
    return null;
  }
  const quoteLines: MarkdownBlockquoteRecord[] = [];
  for (const [index, line] of lines.entries()) {
    const match = /^ {0,3}>(.*)$/.exec(line.text);
    if (!match && index === 0) {
      return null;
    }
    quoteLines.push({
      key: line.key,
      text: match
        ? blockquoteTextAfterMarker(match[1] ?? "")
        : blockquoteLazyContinuationText(line.text, quoteLines),
    });
  }
  return quoteLines;
}

function blockquoteTextAfterMarker(text: string) {
  if (text.startsWith(" ")) {
    return text.slice(1);
  }
  if (text.startsWith("\t")) {
    return `   ${text.slice(1)}`;
  }
  return text;
}

function blockquoteLazyContinuationText(text: string, quoteLines: MarkdownBlockquoteRecord[]) {
  const listIndent = activeBlockquoteListIndent(quoteLines);
  if (listIndent === null) {
    return text;
  }
  return `${" ".repeat(listIndent + 2)}${text}`;
}

function markdownLineStartsLazyBlockquoteInterrupt(line: string): boolean {
  return (
    markdownLineStartsRawHtmlBlock(line) ||
    markdownLineIsHorizontalRule(line) ||
    openingFencePattern.test(line) ||
    /^ {0,3}#{1,6}(?=\s|$)/.test(line) ||
    markdownLineStartsListInterrupt(line)
  );
}

function lazyBlockquoteInterruptIndex(lines: MarkdownLineRecord[]): number | null {
  if (!/^ {0,3}>/.test(lines[0]?.text ?? "")) {
    return null;
  }
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || /^ {0,3}>/.test(line.text)) {
      continue;
    }
    const previousLine = lines[index - 1]?.text ?? "";
    if (/^ {0,3}>[ \t]*$/.test(previousLine)) {
      return index;
    }
    if (markdownLineStartsLazyBlockquoteInterrupt(line.text)) {
      return index;
    }
  }
  return null;
}

function activeBlockquoteListIndent(quoteLines: MarkdownBlockquoteRecord[]) {
  for (let index = quoteLines.length - 1; index >= 0; index -= 1) {
    const line = quoteLines[index];
    if (!line) {
      continue;
    }
    const listLine = parseMarkdownListLine({ key: line.key, text: line.text });
    if (listLine) {
      return listLine.indent;
    }
    if (/^\s+\S/.test(line.text) || line.text.trim() === "") {
      continue;
    }
    return null;
  }
  return null;
}

function markdownLineStartsBlock(line: string): boolean {
  return (
    markdownLineStartsRawHtmlBlock(line) ||
    markdownLineIsHorizontalRule(line) ||
    markdownLineIsIndentedCode(line) ||
    openingFencePattern.test(line) ||
    /^ {0,3}#{1,6}(?=\s|$)/.test(line) ||
    markdownLineStartsListInterrupt(line)
  );
}

function markdownLineStartsListInterrupt(line: string): boolean {
  return /^ {0,3}(?:[*+-]|1[.)])\s+/.test(line);
}

function markdownLineStartsParagraphInterrupt(line: string): boolean {
  return (
    markdownLineStartsRawHtmlBlock(line) ||
    markdownLineIsHorizontalRule(line) ||
    openingFencePattern.test(line) ||
    /^ {0,3}#{1,6}(?=\s|$)/.test(line) ||
    /^ {0,3}>/.test(line) ||
    markdownLineStartsListInterrupt(line)
  );
}

function markdownLineStartsRawHtmlBlock(line: string): boolean {
  if (/^ {0,3}<!--/.test(line) || markdownLineStartsRawLineStartVoidBlock(line)) {
    return true;
  }
  const match = new RegExp(
    String.raw`^ {0,3}<\/?([A-Za-z][A-Za-z0-9-]*)${rawHtmlAttributePattern}\/?>`,
  ).exec(line);
  return rawHtmlBlockTags.has((match?.[1] ?? "").toLowerCase());
}

function markdownLineStartsRawLineStartVoidBlock(line: string) {
  return new RegExp(
    String.raw`^ {0,3}<(?:hr|source)${rawHtmlAttributePattern}\/?(?:>|\s)`,
    "i",
  ).test(line);
}

function markdownLineIsStandaloneRawHtmlDirectiveBlock(line: string) {
  return /^ {0,3}(?:<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<![A-Z][^>]*>)\s*$/i.test(
    line,
  );
}

function rawBlockTagWithClosingBoundaryFromLine(
  line: string,
): "code" | "pre" | "script" | "style" | undefined {
  const match = new RegExp(
    String.raw`^ {0,3}<([A-Za-z][A-Za-z0-9-]*)${rawHtmlAttributePattern}>`,
    "i",
  ).exec(line);
  const tag = (match?.[1] ?? "").toLowerCase();
  if (
    tag === "code" &&
    !new RegExp(String.raw`^ {0,3}<code${rawHtmlAttributePattern}>\s*$`, "i").test(line)
  ) {
    return undefined;
  }
  return tag === "code" || tag === "pre" || tag === "script" || tag === "style" ? tag : undefined;
}

function rawBlockHasTrailingLinesAfterClosingTag(lines: MarkdownLineRecord[]) {
  const firstLine = lines[0];
  const tag = firstLine ? rawBlockTagWithClosingBoundaryFromLine(firstLine.text) : undefined;
  if (!tag) {
    return false;
  }
  const closingPattern = new RegExp(String.raw`<\/${tag}\s*>`, "i");
  const closingIndex = lines.findIndex((line) => closingPattern.test(line.text));
  return closingIndex >= 0 && closingIndex < lines.length - 1;
}

function markdownLineIsHorizontalRule(line: string): boolean {
  return /^ {0,3}(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/.test(line);
}

function markdownLineIsIndentedCode(line: string): boolean {
  return /^ {4}/.test(line) || line.startsWith("\t");
}

function markdownLineIsSetextUnderline(line: string): boolean {
  return /^ {0,3}(?:=+|-+)\s*$/.test(line);
}

function markdownLinesContainTable(lines: MarkdownLineRecord[]): boolean {
  return lines.some((_, index) => Boolean(parseMarkdownTableSpan(lines.slice(index))));
}

function markdownLinesContainSetextHeading(lines: MarkdownLineRecord[]): boolean {
  return lines.some(
    (line, index) =>
      index > 0 &&
      (lines[index - 1]?.text.trim() ?? "") !== "" &&
      markdownLineIsSetextUnderline(line.text),
  );
}

function markdownLinesContainBlankLine(lines: MarkdownLineRecord[]): boolean {
  return lines.some((line) => line.text.trim() === "");
}

function MarkdownBlockSequence(props: {
  context?: MarkdownContext;
  lines: MarkdownLineRecord[];
  terminalNewline?: boolean;
}) {
  const children: React.ReactNode[] = [];
  const lineCount = props.lines.length;
  let index = 0;
  while (index < lineCount) {
    const line = props.lines[index];
    if (!line) {
      break;
    }
    if (/^\s*$/.test(line.text)) {
      index += 1;
      continue;
    }
    if (/^ {0,3}#{1,6}(?=\s|$)/.test(line.text)) {
      children.push(
        <MarkdownBlock
          block={{ key: `sequence-${line.key}`, text: line.text }}
          context={props.context}
          key={`sequence-${line.key}`}
        />,
      );
      index += 1;
      continue;
    }
    const nextLine = props.lines[index + 1];
    if (nextLine && line.text.trim() !== "" && markdownLineIsSetextUnderline(nextLine.text)) {
      children.push(
        <MarkdownBlock
          block={{ key: `sequence-${line.key}`, text: `${line.text}\n${nextLine.text}` }}
          context={props.context}
          key={`sequence-${line.key}`}
        />,
      );
      index += 2;
      continue;
    }
    if (markdownLineIsHorizontalRule(line.text)) {
      children.push(
        <MarkdownBlock
          block={{ key: `sequence-${line.key}`, text: line.text }}
          context={props.context}
          key={`sequence-${line.key}`}
        />,
      );
      index += 1;
      continue;
    }
    const openingFence = openingFencePattern.exec(line.text)?.[2];
    if (openingFence) {
      const codeLines = [line];
      index += 1;
      while (index < lineCount) {
        const nextLine = props.lines[index];
        if (!nextLine) {
          break;
        }
        codeLines.push(nextLine);
        index += 1;
        const closeFence = closingFenceFromLine(nextLine.text);
        if (closeFence && closesMarkdownFence(openingFence, closeFence)) {
          break;
        }
      }
      children.push(
        <MarkdownBlock
          block={{
            key: `sequence-${line.key}`,
            terminalNewline: index >= lineCount ? props.terminalNewline : undefined,
            text: codeLines.map((item) => item.text).join("\n"),
          }}
          context={props.context}
          key={`sequence-${line.key}`}
        />,
      );
      continue;
    }
    if (markdownLineIsIndentedCode(line.text)) {
      const codeLines = [line];
      index += 1;
      while (index < lineCount) {
        const nextLine = props.lines[index];
        if (!nextLine || !markdownLineIsIndentedCode(nextLine.text)) {
          break;
        }
        codeLines.push(nextLine);
        index += 1;
      }
      children.push(
        <MarkdownBlock
          block={{
            key: `sequence-${line.key}`,
            text: codeLines.map((item) => item.text).join("\n"),
          }}
          context={props.context}
          key={`sequence-${line.key}`}
        />,
      );
      continue;
    }
    const tableSpan = parseMarkdownTableSpan(props.lines.slice(index));
    if (tableSpan) {
      children.push(
        <MarkdownTable
          context={props.context}
          key={`sequence-${line.key}-table`}
          table={tableSpan.table}
        />,
      );
      index += tableSpan.consumedLineCount;
      continue;
    }
    if (parseMarkdownListLine(line)) {
      const listSpan = collectMarkdownListLines(props.lines, index);
      index = listSpan.nextIndex;
      children.push(
        <MarkdownBlock
          block={{
            key: `sequence-${line.key}`,
            text: listSpan.lines.map((item) => item.text).join("\n"),
          }}
          context={props.context}
          key={`sequence-${line.key}`}
        />,
      );
      continue;
    }
    const rawTagWithClosingBoundary = rawBlockTagWithClosingBoundaryFromLine(line.text);
    if (rawTagWithClosingBoundary) {
      const rawLines = [line];
      index += 1;
      while (
        index < lineCount &&
        !rawHtmlClosingPattern(rawTagWithClosingBoundary).test(
          rawLines[rawLines.length - 1]?.text ?? "",
        )
      ) {
        const nextLine = props.lines[index];
        if (!nextLine) {
          break;
        }
        rawLines.push(nextLine);
        index += 1;
      }
      children.push(
        <MarkdownBlock
          block={{
            key: `sequence-${line.key}`,
            terminalNewline: index >= lineCount ? props.terminalNewline : undefined,
            text: rawLines.map((item) => item.text).join("\n"),
          }}
          context={props.context}
          key={`sequence-${line.key}`}
        />,
      );
      continue;
    }
    const paragraphLines = [line];
    index += 1;
    while (index < lineCount) {
      const nextLine = props.lines[index];
      if (
        !nextLine ||
        /^\s*$/.test(nextLine.text) ||
        markdownLineStartsBlock(nextLine.text) ||
        (!/^ {0,3}>/.test(paragraphLines[0]?.text ?? "") && /^ {0,3}>/.test(nextLine.text))
      ) {
        break;
      }
      paragraphLines.push(nextLine);
      index += 1;
    }
    children.push(
      <MarkdownBlock
        block={{
          key: `sequence-${line.key}`,
          terminalNewline: index >= lineCount ? props.terminalNewline : undefined,
          text: paragraphLines.map((item) => item.text).join("\n"),
        }}
        context={props.context}
        key={`sequence-${line.key}`}
      />,
    );
  }
  return <>{children}</>;
}

function collectMarkdownListLines(
  lines: MarkdownLineRecord[],
  startIndex: number,
): { lines: MarkdownLineRecord[]; nextIndex: number } {
  const firstLine = lines[startIndex];
  const firstListLine = firstLine ? parseMarkdownListLine(firstLine) : null;
  if (!firstLine || !firstListLine) {
    return { lines: [], nextIndex: startIndex };
  }
  const firstListIndent = markdownListRootIndent(firstListLine);
  const listLines = [firstLine];
  let index = startIndex + 1;
  while (index < lines.length) {
    const nextLine = lines[index];
    if (!nextLine) {
      break;
    }
    const nextListLine = parseMarkdownListLine(nextLine);
    if (nextListLine) {
      if (
        markdownListLineIsAtListLevel(firstListIndent, firstListLine.markerWidth, nextListLine) &&
        (nextListLine.ordered !== firstListLine.ordered ||
          nextListLine.markerKind !== firstListLine.markerKind)
      ) {
        break;
      }
      listLines.push(nextLine);
      index += 1;
      continue;
    }
    if (/^\s*$/.test(nextLine.text)) {
      const followingLine = lines[index + 1];
      if (!followingLine || /^\s*$/.test(followingLine.text)) {
        break;
      }
      const followingListLine = lines[index + 1]
        ? parseMarkdownListLine(lines[index + 1] as MarkdownLineRecord)
        : null;
      const continuationLine = followingLine;
      const continuationMatch = continuationLine ? /^(\s+)\S/.exec(continuationLine.text) : null;
      const continuationIndent = continuationMatch
        ? (continuationMatch[1] ?? "").replace(/\t/g, "    ").length
        : null;
      const followingLineStartsNestedList =
        followingListLine !== null &&
        parseMarkdownListLine({
          key: `${followingListLine.key}-nested-probe`,
          text: followingListLine.text,
        }) !== null;
      if (followingLineStartsNestedList) {
        break;
      }
      if (
        markdownListLinesShareList(firstListLine, followingListLine, firstListIndent) ||
        (followingListLine
          ? !markdownListLineIsAtListLevel(
              firstListIndent,
              firstListLine.markerWidth,
              followingListLine,
            )
          : continuationIndent !== null && continuationIndent > firstListIndent)
      ) {
        listLines.push({
          key: `${nextLine.key}-loose-list-break`,
          text: `${" ".repeat(firstListLine.indent + 1)}${looseListBreakMarker}`,
        });
        index += 1;
        continue;
      }
      break;
    }
    const continuationMatch = /^(\s+)\S/.exec(nextLine.text);
    const continuationIndent = continuationMatch
      ? (continuationMatch[1] ?? "").replace(/\t/g, "    ").length
      : null;
    if (continuationIndent !== null && continuationIndent > firstListLine.indent) {
      listLines.push(nextLine);
      index += 1;
      continue;
    }
    if (!markdownLineIsHorizontalRule(nextLine.text)) {
      listLines.push({
        key: `${nextLine.key}-lazy-list-continuation`,
        text: `${" ".repeat(firstListLine.indent + 2)}${nextLine.text}`,
      });
      index += 1;
      continue;
    }
    break;
  }
  return { lines: listLines, nextIndex: index };
}

function parseFencedCodeBlock(
  lines: MarkdownLineRecord[],
  closesAtEof: boolean,
): MarkdownCodeBlockRecord | null {
  if (lines.length < 2) {
    return null;
  }
  const openMatch = openingFencePattern.exec(lines[0]?.text ?? "");
  const fence = openMatch?.[2] ?? "";
  const indent = fence.startsWith("`") ? (openMatch?.[1] ?? "") : "";
  const closeFence = closingFenceFromLine(lines[lines.length - 1]?.text ?? "");
  if (!openMatch) {
    return null;
  }
  const hasClosingFence = Boolean(closeFence && closesMarkdownFence(fence, closeFence));
  if (!hasClosingFence && !closesAtEof) {
    return null;
  }
  return {
    code: lines
      .slice(1, hasClosingFence ? -1 : undefined)
      .map((line) => compensateIndentedFenceLine(line.text, indent))
      .join("\n"),
    language: openMatch[3],
  };
}

function parseIndentedCodeBlock(lines: MarkdownLineRecord[]): MarkdownCodeBlockRecord | null {
  if (lines.length === 0) {
    return null;
  }
  const codeLines: string[] = [];
  for (const line of lines) {
    if (/^ {4}/.test(line.text)) {
      codeLines.push(line.text.slice(4));
      continue;
    }
    if (line.text.startsWith("\t")) {
      codeLines.push(line.text.slice(1));
      continue;
    }
    return null;
  }
  return { code: codeLines.join("\n") };
}

function slugifyHeadingId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^a-z0-9가-힣._ -]+/g, "")
    .replace(/\s+/g, "-");
}

function legacyMarkedUnescapeHeadingText(value: string) {
  return value.replace(/&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/gi, (_, name) => {
    const entityName = String(name).toLowerCase();
    if (entityName === "colon") {
      return ":";
    }
    if (entityName.startsWith("#x")) {
      return String.fromCharCode(Number.parseInt(entityName.slice(2), 16));
    }
    if (entityName.startsWith("#")) {
      return String.fromCharCode(Number.parseInt(entityName.slice(1), 10));
    }
    return "";
  });
}

function headingInlineText(line: string, context?: MarkdownContext): string {
  return parseInlineMarkdown(line, context)
    .map((part) => {
      if (part.kind === "image" || part.kind === "link") {
        return part.label;
      }
      if (part.kind === "delete" || part.kind === "emphasis" || part.kind === "strong") {
        return headingInlineText(part.value, context);
      }
      return part.value;
    })
    .join("");
}

function headingSlugText(line: string, context?: MarkdownContext): string {
  return headingInlineText(line, context).replace(/<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?>/g, "");
}

function nextHeadingId(context: MarkdownContext | undefined, value: string): string {
  const slug = slugifyHeadingId(legacyMarkedUnescapeHeadingText(headingSlugText(value, context)));
  const slugCounts = context?.headingSlugCounts;
  if (!slugCounts) {
    return slug;
  }
  const currentCount = slugCounts.get(slug) ?? 0;
  slugCounts.set(slug, currentCount + 1);
  return currentCount === 0 ? slug : `${slug}-${currentCount}`;
}

function MarkdownHeading(props: { context?: MarkdownContext; level: number; text: string }) {
  const id = nextHeadingId(props.context, props.text);
  const headingContent = markdownBlockContainsRawHtmlTag([
    { key: "heading-inline-html", text: props.text },
  ]) ? (
    renderSanitizedRawHtml(props.text, "heading-inline-html")
  ) : (
    <MarkdownInline context={props.context} line={props.text} />
  );
  const children = (
    <>
      {headingContent}
      <a className="head-anchor" href={`#${id}`}>
        #
      </a>
    </>
  );
  if (props.level === 1) {
    return <h1 id={id}>{children}</h1>;
  }
  if (props.level === 2) {
    return <h2 id={id}>{children}</h2>;
  }
  if (props.level === 3) {
    return <h3 id={id}>{children}</h3>;
  }
  if (props.level === 4) {
    return <h4 id={id}>{children}</h4>;
  }
  if (props.level === 5) {
    return <h5 id={id}>{children}</h5>;
  }
  return <h6 id={id}>{children}</h6>;
}

function reactMarkdownNodeText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(reactMarkdownNodeText).join("");
  }
  if (React.isValidElement<{ children?: React.ReactNode; alt?: string }>(node)) {
    if (typeof node.props.alt === "string") {
      return node.props.alt ?? "";
    }
    return reactMarkdownNodeText(node.props.children);
  }
  return "";
}

function remarkYonaAutolinks(context: MarkdownContext) {
  return function attacher() {
    return function transformYonaAutolinks(tree: unknown) {
      transformYonaAutolinkNode(tree as { children?: unknown[]; type?: string });
    };
  };

  function transformYonaAutolinkNode(node: { children?: unknown[]; type?: string }) {
    if (!node.children || !Array.isArray(node.children)) {
      return;
    }
    if (
      ["code", "definition", "html", "image", "inlineCode", "link", "linkReference"].includes(
        node.type ?? "",
      )
    ) {
      return;
    }

    const transformedChildren: unknown[] = [];
    for (let index = 0; index < node.children.length; index += 1) {
      const child = node.children[index];
      const childNode = child as { type?: string; value?: string };
      if (childNode.type === "text" && typeof childNode.value === "string") {
        const previousNode = node.children[index - 1] as { type?: string } | undefined;
        const nextNode = node.children[index + 1] as { type?: string } | undefined;
        if (previousNode?.type === "html" || nextNode?.type === "html") {
          transformedChildren.push(child);
          continue;
        }
        transformedChildren.push(...markdownInlinePartsToMdast(childNode.value, context));
      } else {
        transformYonaAutolinkNode(child as { children?: unknown[]; type?: string });
        transformedChildren.push(child);
      }
    }
    node.children = transformedChildren;
  }
}

function markdownInlinePartsToMdast(value: string, context: MarkdownContext): unknown[] {
  return parseTextWithAutolinks(value, "react-markdown", context).map((part) => {
    if (part.kind !== "link") {
      return { type: "text", value: "value" in part ? part.value : part.label };
    }
    return {
      children: [{ type: "text", value: part.label }],
      data: {
        hProperties: {
          className: part.className?.split(/\s+/),
          "data-issue-state": part.issueState,
        },
      },
      title: part.title,
      type: "link",
      url: part.target ?? "",
    };
  });
}

const yonaMarkdownSanitizeSchema = {
  ...defaultSchema,
  allowComments: true,
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      "className",
      "style",
      "dataX",
      ["dataIssueState"],
      ["data-issue-state"],
    ],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      "className",
      "dataIssueState",
      "data-issue-state",
      "href",
      "title",
    ],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    div: [...(defaultSchema.attributes?.div ?? []), "className", "style"],
    iframe: [
      ...(defaultSchema.attributes?.iframe ?? []),
      "allow",
      "allowFullScreen",
      "frameBorder",
      "height",
      "src",
      "width",
    ],
    img: [...(defaultSchema.attributes?.img ?? []), "alt", "src", "title"],
    input: [...(defaultSchema.attributes?.input ?? []), "checked", "disabled", "type"],
    li: [...(defaultSchema.attributes?.li ?? []), "className"],
    ol: [...(defaultSchema.attributes?.ol ?? []), "start"],
    pre: [...(defaultSchema.attributes?.pre ?? []), "className"],
    source: [...(defaultSchema.attributes?.source ?? []), "src", "type"],
    span: [...(defaultSchema.attributes?.span ?? []), "className", "style"],
    table: [...(defaultSchema.attributes?.table ?? []), "className"],
    ul: [...(defaultSchema.attributes?.ul ?? []), "className"],
    video: [
      ...(defaultSchema.attributes?.video ?? []),
      "controls",
      "height",
      "preload",
      "src",
      "width",
    ],
  },
  clobberPrefix: "",
  protocols: {
    ...defaultSchema.protocols,
    href: [...(defaultSchema.protocols?.href ?? []), "file", "ftp", "zpl"],
    src: [...(defaultSchema.protocols?.src ?? []), "file", "zpl"],
  },
  required: {
    ...defaultSchema.required,
    input: {},
  },
  tagNames: [...(defaultSchema.tagNames ?? []), "iframe", "input", "source", "video"],
};

function reactMarkdownUrlTransform(url: string) {
  const target = sanitizedMarkdownTarget(url);
  return target === undefined ? "#" : encodeMarkdownUrlTarget(target);
}

function reactMarkdownClassName(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").join(" ") || undefined;
  }
  return typeof value === "string" && value.trim() ? value : undefined;
}

function reactMarkdownLinkClassName(props: {
  children?: React.ReactNode;
  className?: unknown;
  context?: MarkdownContext;
  href?: string;
  title?: string;
  ["data-issue-state"]?: unknown;
  dataIssueState?: unknown;
}) {
  const className = reactMarkdownClassName(props.className);
  if (className) {
    return className;
  }
  const label = reactMarkdownNodeText(props.children);
  const href = props.href ?? "";
  if (props["data-issue-state"] || props.dataIssueState || /\/issue\/\d+(?:$|[#?])/.test(href)) {
    return "issueLink";
  }
  if (/\/commit\/[0-9a-f]{7,40}(?:$|[#?])/i.test(href)) {
    return "commit-link";
  }
  if (label.startsWith("@") && /^\/?[^/@]+\/[^/@]+$/.test(label.slice(1))) {
    return "no-text-decoration project-link";
  }
  if (label.startsWith("@") && /^@[^/@]+$/.test(label)) {
    const loginId = label.slice(1);
    return legacyMentionReferenceMatchesCurrentUser(
      { kind: "user", loginId },
      normalizedLegacyMentionText(props.context?.currentUserLabel),
      normalizedLegacyMentionText(props.context?.currentUserLoginId),
    )
      ? "no-text-decoration user-link me"
      : "no-text-decoration user-link";
  }
  return undefined;
}

function rawHtmlPropsToHastProperties(
  props: Record<string, boolean | React.CSSProperties | string | number | undefined>,
) {
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value !== undefined) {
      properties[key] =
        key === "style" && typeof value === "object"
          ? rawHtmlStyleToCssText(value as React.CSSProperties)
          : value;
    }
  }
  return properties;
}

function rawHtmlChildToHast(child: RawHtmlChild): HastNode[] {
  if (typeof child === "string") {
    return child.length > 0 ? [{ type: "text", value: child }] : [];
  }
  if (React.isValidElement(child)) {
    return [];
  }
  if (child.tag === "fragment") {
    return child.children.flatMap(rawHtmlChildToHast);
  }
  return [
    {
      children: child.children.flatMap(rawHtmlChildToHast),
      properties: rawHtmlPropsToHastProperties(child.props),
      tagName: child.tag,
      type: "element",
    },
  ];
}

function sanitizedRawHtmlToHast(source: string): HastNode[] {
  return parseSanitizedRawHtmlTree(source).children.flatMap(rawHtmlChildToHast);
}

function normalizeRawHtmlElementProperties(node: HastNode) {
  if (!node.properties || !node.tagName) {
    return;
  }
  const tagName = node.tagName.toLowerCase();
  const href = node.properties.href;
  if (tagName === "a" && typeof href === "string") {
    const compact = href.replace(/[^\w:]/g, "").toLowerCase();
    node.properties.href =
      compact.startsWith("javascript:") || sanitizedMarkdownTarget(href) === undefined ? "#" : href;
  }

  const src = node.properties.src;
  if (
    typeof src === "string" &&
    ["iframe", "img", "source", "video"].includes(tagName) &&
    !isSafeRawHtmlUrl(src)
  ) {
    delete node.properties.src;
  }

  const style = node.properties.style;
  if (typeof style === "string") {
    const parsed = parseRawHtmlStyle(style);
    if (parsed) {
      node.properties.style = rawHtmlStyleToCssText(parsed);
    } else {
      delete node.properties.style;
    }
  }
}

function rehypeYonaRawHtmlCompatibility(opaqueRawHtmlBlocks: Map<string, string>) {
  return function attacher() {
    return function transformYonaRawHtmlCompatibility(tree: unknown) {
      transformRawHtmlNode(tree as HastNode);
    };
  };

  function transformRawHtmlNode(node: HastNode) {
    if (!node) {
      return;
    }
    if (node.children && Array.isArray(node.children)) {
      const children: HastNode[] = [];
      for (const child of node.children) {
        if (child.type === "comment") {
          const id = /^ ?yona-raw-html-block:(\d+) ?$/.exec(child.value ?? "")?.[1];
          const source = id === undefined ? undefined : opaqueRawHtmlBlocks.get(id);
          if (source !== undefined) {
            const sanitizedNodes = sanitizedRawHtmlToHast(source);
            if (
              /^ {0,3}<!--/.test(source) &&
              sanitizedNodes.length > 0 &&
              sanitizedNodes.every((node) => node.type === "text")
            ) {
              children.push({
                children: sanitizedNodes,
                properties: {},
                tagName: "p",
                type: "element",
              });
            } else {
              children.push(...sanitizedNodes);
            }
          }
          continue;
        }
        transformRawHtmlNode(child);
        children.push(child);
      }
      node.children = children;
    }
    normalizeRawHtmlElementProperties(node);
  }
}

function rehypeYonaRenderedDomCompatibility(options?: { normalizeStrongEmphasisOrder?: boolean }) {
  return function transformYonaRenderedDomCompatibility(tree: unknown) {
    transformRenderedDomNode(
      tree as {
        children?: unknown[];
        properties?: Record<string, unknown>;
        tagName?: string;
        type?: string;
        value?: string;
      },
    );
  };

  function transformRenderedDomNode(
    node: {
      children?: unknown[];
      properties?: Record<string, unknown>;
      tagName?: string;
      type?: string;
      value?: string;
    },
    parentHasTaskListClass = false,
    parentTagName = "",
  ) {
    normalizeRawHtmlElementProperties(node as HastNode);
    const nodeClassName = node.properties?.className;
    const nodeClasses = Array.isArray(nodeClassName)
      ? nodeClassName.filter((item): item is string => typeof item === "string")
      : typeof nodeClassName === "string"
        ? nodeClassName.split(/\s+/)
        : [];
    const nodeHasTaskListClass = nodeClasses.includes("task-list-item");

    if (node.children && Array.isArray(node.children)) {
      node.children = node.children.filter((child) => {
        const childNode = child as { type?: string; value?: string };
        return !(childNode.type === "text" && /^\n\s*$/.test(childNode.value ?? ""));
      });
      if (node.tagName === "ul" || node.tagName === "ol") {
        normalizeLooseTaskListItems(node.children);
      }
      if (options?.normalizeStrongEmphasisOrder) {
        node.children = node.children.map((child) => normalizeLegacyStrongEmphasisOrder(child));
      }
      for (let index = 1; index < node.children.length; index += 1) {
        const previousNode = node.children[index - 1] as { tagName?: string } | undefined;
        const childNode = node.children[index] as { type?: string; value?: string };
        if (previousNode?.tagName === "br" && childNode.type === "text") {
          childNode.value = childNode.value?.replace(/^\n/, "");
        }
      }
      if (nodeHasTaskListClass) {
        const firstParagraphIndex = node.children.findIndex(
          (child) => (child as { tagName?: string }).tagName === "p",
        );
        if (
          node.tagName === "li" &&
          firstParagraphIndex > 0 &&
          hastNodesHaveRenderableContent(node.children.slice(0, firstParagraphIndex))
        ) {
          wrapLeadingTaskListItemChildren(node, firstParagraphIndex);
        }
        for (const child of node.children) {
          const childNode = child as { type?: string; value?: string };
          if (childNode.type === "text") {
            childNode.value = childNode.value?.replace(legacyEmptyTaskItemPlaceholder, "");
          }
        }
      }
      if (node.tagName === "li") {
        normalizeLeadingListItemCodeBlock(node);
        for (const child of node.children) {
          const childNode = child as { type?: string; value?: string };
          if (childNode.type === "text") {
            childNode.value = childNode.value
              ?.replace(legacyExtraListContinuationPaddingRegex, (_, count) =>
                " ".repeat(Number.parseInt(String(count), 10)),
              )
              ?.replace(legacyDirectTabListItemPlaceholder, "   ")
              .replace(legacySpaceTabListItemPaddingRegex, (_, count) =>
                " ".repeat(Number.parseInt(String(count), 10)),
              );
          }
        }
      }
      for (const child of node.children) {
        transformRenderedDomNode(
          child as {
            children?: unknown[];
            properties?: Record<string, unknown>;
            tagName?: string;
            type?: string;
            value?: string;
          },
          parentHasTaskListClass || nodeHasTaskListClass,
          node.tagName ?? "",
        );
      }
    }

    if (
      node.tagName === "code" &&
      parentTagName !== "pre" &&
      node.children &&
      Array.isArray(node.children)
    ) {
      const lastChild = node.children.at(-1) as { type?: string; value?: string } | undefined;
      if (lastChild?.type === "text") {
        lastChild.value = lastChild.value?.replace(/\n$/, "");
      }
    }

    if ((node.tagName === "ul" || node.tagName === "ol") && node.properties) {
      const filtered = nodeClasses.filter((item) => item !== "contains-task-list");
      if (filtered.length > 0) {
        node.properties.className = filtered;
      } else {
        delete node.properties.className;
      }
    }

    if (
      node.tagName === "input" &&
      node.properties?.type === "checkbox" &&
      parentHasTaskListClass
    ) {
      node.properties.className = ["task-list-item-checkbox"];
    }
  }

  function normalizeLeadingListItemCodeBlock(node: { children?: unknown[]; tagName?: string }) {
    const firstChild = node.children?.[0] as HastNode | undefined;
    if (!firstChild) {
      return;
    }
    const codeNode = firstChild?.tagName === "pre" ? firstChild.children?.[0] : undefined;
    const textNode = codeNode?.tagName === "code" ? codeNode.children?.[0] : undefined;
    if (textNode?.type !== "text" || typeof textNode.value !== "string") {
      return;
    }
    const hasContinuationText = (node.children ?? []).slice(1).some((child) => {
      const childNode = child as { type?: string; value?: string };
      return childNode.type !== "text" || !/^\s*$/.test(childNode.value ?? "");
    });
    if (!hasContinuationText) {
      return;
    }
    firstChild.properties = {
      ...firstChild.properties,
      dataLegacyListLeadingCode: "true",
    };
    textNode.value = `${textNode.value
      .replace(/^ {1,2}/, "")
      .replace(legacyListLeadingCodePaddingRegex, (_, count) =>
        " ".repeat(Number.parseInt(String(count), 10)),
      )
      .replace(/\n?$/, "")}\n`;
  }

  function normalizeLegacyStrongEmphasisOrder(child: unknown) {
    const node = child as HastNode;
    if (node?.tagName !== "em" || !Array.isArray(node.children) || node.children.length !== 1) {
      return child;
    }
    const strongNode = node.children[0];
    if (strongNode?.tagName !== "strong") {
      return child;
    }
    return {
      ...strongNode,
      children: [
        {
          ...node,
          children: strongNode.children ?? [],
        },
      ],
    };
  }

  function hastNodeClasses(node: { properties?: Record<string, unknown> }) {
    const className = node.properties?.className;
    return Array.isArray(className)
      ? className.filter((item): item is string => typeof item === "string")
      : typeof className === "string"
        ? className.split(/\s+/)
        : [];
  }

  function hastNodeHasClass(node: { properties?: Record<string, unknown> }, className: string) {
    return hastNodeClasses(node).includes(className);
  }

  function hastNodeIsBlockChild(node: { tagName?: string }) {
    return ["blockquote", "ol", "p", "pre", "table", "ul"].includes(node.tagName ?? "");
  }

  function normalizeLooseTaskListItems(children: unknown[]) {
    const listItems = children.filter(
      (
        child,
      ): child is {
        children?: unknown[];
        properties?: Record<string, unknown>;
        tagName?: string;
        type?: string;
      } => (child as { tagName?: string }).tagName === "li",
    );
    const hasLooseTaskItem = listItems.some(
      (item) =>
        hastNodeHasClass(item, "task-list-item") &&
        (item.children ?? []).some((child) => hastNodeIsBlockChild(child as { tagName?: string })),
    );
    if (!hasLooseTaskItem) {
      return;
    }
    for (const item of listItems) {
      if (!hastNodeHasClass(item, "task-list-item") || !item.children) {
        continue;
      }
      let firstBlockIndex = -1;
      for (const [childIndex, child] of item.children.entries()) {
        if (hastNodeIsBlockChild(child as { tagName?: string })) {
          firstBlockIndex = childIndex;
          break;
        }
      }
      if (
        firstBlockIndex > 0 &&
        hastNodesHaveRenderableContent(item.children.slice(0, firstBlockIndex))
      ) {
        wrapLeadingTaskListItemChildren(item, firstBlockIndex);
      } else if (firstBlockIndex === -1 && hastNodesHaveRenderableContent(item.children)) {
        wrapLeadingTaskListItemChildren(item, item.children.length);
      }
    }
  }

  function hastNodesHaveRenderableContent(children: unknown[]) {
    return children.some((child) => {
      const childNode = child as { type?: string; value?: string };
      return childNode.type !== "text" || !/^\s*$/.test(childNode.value ?? "");
    });
  }

  function wrapLeadingTaskListItemChildren(
    node: { children?: unknown[] },
    firstBlockIndex: number,
  ) {
    if (!node.children) {
      return;
    }
    const leadingChildren = node.children.slice(0, firstBlockIndex);
    node.children = [
      {
        children: leadingChildren,
        properties: {},
        tagName: "p",
        type: "element",
      },
      ...node.children.slice(firstBlockIndex),
    ];
  }
}

function reactMarkdownComponents(context: MarkdownContext): Components {
  const headingComponent = (level: 1 | 2 | 3 | 4 | 5 | 6) =>
    function HeadingComponent(
      props: React.HTMLAttributes<HTMLHeadingElement> & { node?: unknown },
    ) {
      const { children: propChildren, node: _node, ...rest } = props;
      if (typeof rest.className === "string" && rest.className.split(/\s+/).includes("sr-only")) {
        return React.createElement(`h${level}`, rest, propChildren);
      }
      const id = nextHeadingId(context, reactMarkdownNodeText(propChildren));
      const children = (
        <>
          {propChildren}
          <a className="head-anchor" href={`#${id}`}>
            #
          </a>
        </>
      );
      return React.createElement(`h${level}`, { ...rest, id }, children);
    };
  const tableCellComponent = (tagName: "td" | "th") =>
    function TableCellComponent(
      props: React.TdHTMLAttributes<HTMLTableCellElement> &
        React.ThHTMLAttributes<HTMLTableCellElement> & { node?: unknown },
    ) {
      const { children, node: _node, style, ...rest } = props;
      const textAlign =
        typeof style?.textAlign === "string" &&
        ["center", "left", "right"].includes(style.textAlign)
          ? (style.textAlign as "center" | "left" | "right")
          : undefined;
      return React.createElement(tagName, { ...rest, align: textAlign }, children);
    };

  return {
    a(props) {
      const { children, className, href, node: _node, ...rest } = props;
      const transformedHref = href === undefined ? undefined : reactMarkdownUrlTransform(href);
      return (
        <a
          className={reactMarkdownLinkClassName({
            ...rest,
            children,
            className,
            context,
            href: transformedHref,
          })}
          href={transformedHref}
          {...rest}
        >
          {children}
        </a>
      );
    },
    code(props) {
      const { children, className, node: _node, ...rest } = props;
      return (
        <code className={reactMarkdownClassName(className)} {...rest}>
          {children}
        </code>
      );
    },
    h1: headingComponent(1),
    h2: headingComponent(2),
    h3: headingComponent(3),
    h4: headingComponent(4),
    h5: headingComponent(5),
    h6: headingComponent(6),
    img(props) {
      const { alt, node: _node, src, ...rest } = props;
      return <img alt={alt} src={src ? reactMarkdownUrlTransform(src) : undefined} {...rest} />;
    },
    input(props) {
      const { checked, className, disabled, node: _node, type, ...rest } = props;
      const normalizedClassName = reactMarkdownClassName(className);
      const isTaskListCheckbox =
        type === "checkbox" &&
        (normalizedClassName === "task-list-item-checkbox" ||
          (checked !== undefined && disabled === true && Object.keys(rest).length === 0));
      if (isTaskListCheckbox) {
        const checkboxIndex = context.taskCheckboxIndex?.current ?? 0;
        if (context.taskCheckboxIndex) {
          context.taskCheckboxIndex.current += 1;
        }
        const taskDisabled = context.taskCheckboxDisabled ?? disabled;
        const onTasklistToggle = context.onTasklistToggle;
        const originalMarkdown = context.tasklistSourceMarkdown ?? "";
        return (
          <input
            className="task-list-item-checkbox"
            data-task-index={!taskDisabled && onTasklistToggle ? checkboxIndex : undefined}
            disabled={taskDisabled}
            onChange={
              !taskDisabled && onTasklistToggle
                ? (event) => {
                    const nextChecked = event.currentTarget.checked;
                    void onTasklistToggle({
                      checked: nextChecked,
                      checkboxIndex,
                      nextMarkdown: toggleLegacyTasklistMarkdownItem(
                        originalMarkdown,
                        checkboxIndex,
                        nextChecked,
                      ),
                      originalMarkdown,
                    });
                  }
                : undefined
            }
            readOnly={taskDisabled || !onTasklistToggle}
            type="checkbox"
            checked={checked}
          />
        );
      }
      return (
        <input
          type={type}
          checked={checked}
          disabled={disabled}
          readOnly={checked !== undefined ? true : undefined}
          className={normalizedClassName}
          {...rest}
        />
      );
    },
    pre(props) {
      const { children, node: _node, ...rest } = props;
      const preserveTrailingNewline =
        (props as Record<string, unknown>).dataLegacyListLeadingCode === "true" ||
        (props as Record<string, unknown>)["data-legacy-list-leading-code"] === "true";
      const child = React.Children.toArray(children)[0];
      if (React.isValidElement<{ children?: React.ReactNode; className?: string }>(child)) {
        const language = /^language-(.+)$/.exec(child.props.className ?? "")?.[1];
        if (!language && child.props.className) {
          return (
            <pre>
              <code className={child.props.className}>{child.props.children}</code>
            </pre>
          );
        }
        const rawCode = reactMarkdownNodeText(child.props.children);
        const code = preserveTrailingNewline ? rawCode : rawCode.replace(/\n$/, "");
        if (!language) {
          return (
            <pre>
              <code>{code}</code>
            </pre>
          );
        }
        return (
          <pre>
            <code className={language}>{highlightCodeBlock(code, language)}</code>
          </pre>
        );
      }
      return <pre {...rest}>{children}</pre>;
    },
    td: tableCellComponent("td"),
    th: tableCellComponent("th"),
  };
}

function ReactMarkdownPlainParagraph(props: { breaks: boolean; markdown: string }) {
  return (
    <ReactMarkdown
      components={{
        p(paragraphProps) {
          const { children, node: _node, ...rest } = paragraphProps;
          return <p {...rest}>{children}</p>;
        },
      }}
      remarkPlugins={props.breaks ? [remarkBreaks] : []}
    >
      {props.markdown}
    </ReactMarkdown>
  );
}

function ReactMarkdownCompatibleBlock(props: {
  allowRawHtml?: boolean;
  context: MarkdownContext;
  markdown: string;
}) {
  const preprocessed = preprocessLegacyMarkedBlockGrammar(props.markdown);
  const markdown = props.context.reactMarkdownReferenceDefinitions
    ? `${preprocessed.markdown}\n\n${props.context.reactMarkdownReferenceDefinitions}`
    : preprocessed.markdown;
  const allowRawHtml = props.allowRawHtml || preprocessed.opaqueRawHtmlBlocks.size > 0;
  const rehypePlugins = (
    allowRawHtml
      ? [
          rehypeRaw,
          [rehypeSanitize, yonaMarkdownSanitizeSchema],
          rehypeYonaRawHtmlCompatibility(preprocessed.opaqueRawHtmlBlocks),
          rehypeYonaRenderedDomCompatibility,
        ]
      : [[rehypeYonaRenderedDomCompatibility, { normalizeStrongEmphasisOrder: true }]]
  ) as React.ComponentProps<typeof ReactMarkdown>["rehypePlugins"];
  return (
    <ReactMarkdown
      components={reactMarkdownComponents(props.context)}
      rehypePlugins={rehypePlugins}
      remarkPlugins={[
        remarkYonaAutolinks(props.context),
        remarkGfm,
        ...(props.context.breaks ? [remarkBreaks] : []),
      ]}
      urlTransform={reactMarkdownUrlTransform}
    >
      {markdown}
    </ReactMarkdown>
  );
}

function reactMarkdownReferenceDefinitions(referenceMap: Map<string, MarkdownReferenceDefinition>) {
  return Array.from(referenceMap.entries())
    .map(([label, definition]) => {
      const escapedLabel = label.replace(/\\/g, "\\\\").replace(/(\[|\])/g, "\\$1");
      const target = definition.target === "<" ? "%3C" : (definition.target ?? "");
      const title =
        definition.title === undefined
          ? ""
          : ` "${definition.title.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
      return `[${escapedLabel}]: <${target.replace(/>/g, "%3E")}>${title}`;
    })
    .join("\n");
}

function headingTextCanUseReactMarkdown(headingText: string, context?: MarkdownContext) {
  if (headingText.length === 0 || headingText.endsWith("#")) {
    return false;
  }
  if (reactMarkdownSafePlainText(headingText)) {
    return true;
  }
  if (markdownBlockContainsRawHtmlTag([{ key: "heading-probe", text: headingText }])) {
    return headingTextCanUseReactMarkdownRawFormatting(headingText);
  }
  if (/[@#]/.test(headingText)) {
    return markdownListItemTextCanUseReactMarkdown(headingText, context);
  }
  return (
    /(?:!?\[[^\]\n]+\]\([^)\n]+\)|`[^`\n]+`)/.test(headingText) ||
    markdownListItemTextCanUseReactMarkdown(headingText, context)
  );
}

function headingTextCanUseReactMarkdownRawFormatting(headingText: string) {
  if (
    markdownLineStartsRawHtmlBlock(headingText) ||
    /<\/?(?:a|code|div|hr|iframe|img|input|li|ol|p|pre|source|sup|table|tbody|td|th|thead|tr|ul|video)\b/i.test(
      headingText,
    )
  ) {
    return false;
  }
  return /<\/?(?:b|br|em|i|s|span|strong|u)\b/i.test(headingText);
}

function markdownBlockCanUseReactMarkdownAtxHeading(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1) {
    return false;
  }
  const line = lines[0]?.text ?? "";
  const match = /^ {0,3}#{1,6} (?<text>.+)$/.exec(line);
  const headingText = match?.groups?.text ?? "";
  return headingTextCanUseReactMarkdown(headingText, context);
}

function markdownBlockCanUseReactMarkdownSetextHeading(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 2) {
    return false;
  }
  const headingText = lines[0]?.text.trim() ?? "";
  const underline = lines[1]?.text ?? "";
  return (
    /^ {0,3}(?:=+|-+)\s*$/.test(underline) && headingTextCanUseReactMarkdown(headingText, context)
  );
}

function markdownBlockReactMarkdownHeadingNeedsRawHtml(lines: MarkdownLineRecord[]) {
  if (lines.length === 1) {
    const match = /^ {0,3}#{1,6} (?<text>.+)$/.exec(lines[0]?.text ?? "");
    const headingText = match?.groups?.text ?? "";
    return headingTextCanUseReactMarkdownRawFormatting(headingText);
  }
  if (lines.length === 2 && /^ {0,3}(?:=+|-+)\s*$/.test(lines[1]?.text ?? "")) {
    return headingTextCanUseReactMarkdownRawFormatting(lines[0]?.text.trim() ?? "");
  }
  return false;
}

function markdownBlockCanUseReactMarkdownSimpleBlockquote(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length === 0) {
    return false;
  }
  return lines.every((line) => {
    const match = /^ {0,3}>(.*)$/.exec(line.text);
    if (!match) {
      return false;
    }
    if ((match[1] ?? "").startsWith("\t")) {
      return false;
    }
    const text = blockquoteTextAfterMarker(match[1] ?? "");
    const textLine = [{ key: `${line.key}-blockquote-text`, text }];
    return (
      text.length > 0 &&
      (markdownListItemTextCanUseReactMarkdown(text, context) ||
        markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(textLine) ||
        markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(textLine) ||
        markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(textLine) ||
        markdownBlockCanUseReactMarkdownMixedReferenceParagraph(textLine, context) ||
        markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(textLine, context) ||
        markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(textLine, context))
    );
  });
}

function markdownBlockCanUseReactMarkdownLazyBlockquote(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length < 2 || !/^ {0,3}>/.test(lines[0]?.text ?? "")) {
    return false;
  }
  const quoteLines = parseMarkdownBlockquote(lines);
  if (!quoteLines || quoteLines.length !== lines.length) {
    return false;
  }
  return lines.every((line, index) => {
    if (index === 0) {
      const match = /^ {0,3}>(.*)$/.exec(line.text);
      if (!match || (match[1] ?? "").startsWith("\t")) {
        return false;
      }
      const text = blockquoteTextAfterMarker(match[1] ?? "");
      const textLine = [{ key: `${line.key}-blockquote-text`, text }];
      return (
        text.length > 0 && markdownLineCanUseReactMarkdownInlineParagraphText(textLine[0], context)
      );
    }
    if (
      /^ {0,3}>/.test(line.text) ||
      line.text.trim() === "" ||
      markdownLineStartsLazyBlockquoteInterrupt(line.text)
    ) {
      return false;
    }
    return markdownLineCanUseReactMarkdownInlineParagraphText(
      { key: `${line.key}-lazy-blockquote`, text: line.text },
      context,
    );
  });
}

function markdownBlockCanUseReactMarkdownLazyBlockquoteList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length < 3 || !/^ {0,3}>/.test(lines[0]?.text ?? "")) {
    return false;
  }
  const quoteLines = parseMarkdownBlockquote(lines);
  if (!quoteLines || quoteLines.length !== lines.length) {
    return false;
  }
  const contentLines = quoteLines.map((line) => ({ key: line.key, text: line.text }));
  if (
    !markdownBlockCanUseReactMarkdownNestedList(contentLines, context) &&
    !markdownBlockCanUseReactMarkdownSimpleList(contentLines, context)
  ) {
    return false;
  }
  return lines.some((line) => !/^ {0,3}>/.test(line.text));
}

function reactMarkdownBlockquoteContentLines(lines: MarkdownLineRecord[]) {
  const contentLines: MarkdownLineRecord[] = [];
  for (const line of lines) {
    const match = /^ {0,3}>(.*)$/.exec(line.text);
    if (!match || (match[1] ?? "").startsWith("\t")) {
      return undefined;
    }
    contentLines.push({
      key: `${line.key}-blockquote-block`,
      text: blockquoteTextAfterMarker(match[1] ?? ""),
    });
  }
  return contentLines;
}

function markdownBlockCanUseReactMarkdownBlockquoteParagraphBlocks(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  const contentLines = reactMarkdownBlockquoteContentLines(lines);
  if (
    !contentLines ||
    contentLines.length === 0 ||
    !contentLines.some((line) => line.text.trim() === "")
  ) {
    return false;
  }
  const paragraphs: MarkdownLineRecord[][] = [];
  let current: MarkdownLineRecord[] = [];
  for (const line of contentLines) {
    if (line.text.trim() === "") {
      if (current.length > 0) {
        paragraphs.push(current);
        current = [];
      }
      continue;
    }
    if (markdownLineStartsBlock(line.text) || markdownLineStartsParagraphInterrupt(line.text)) {
      return false;
    }
    current.push(line);
  }
  if (current.length > 0) {
    paragraphs.push(current);
  }
  return (
    paragraphs.length > 1 &&
    paragraphs.every(
      (paragraph) =>
        markdownBlockCanUseReactMarkdownMultilineInlineParagraph(paragraph, context) ||
        markdownBlockCanUseReactMarkdownPlainParagraph(paragraph),
    )
  );
}

function markdownBlockCanUseReactMarkdownBlockquoteBlocks(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  const contentLines = reactMarkdownBlockquoteContentLines(lines);
  if (!contentLines || contentLines.length === 0) {
    return false;
  }
  if (markdownBlockCanUseReactMarkdownSimpleFencedCode(contentLines)) {
    return true;
  }
  if (markdownBlockCanUseReactMarkdownSimpleTable(contentLines, context)) {
    return true;
  }
  if (markdownBlockCanUseReactMarkdownSetextHeading(contentLines, context)) {
    return true;
  }
  if (markdownBlockCanUseReactMarkdownSimpleIndentedCode(contentLines)) {
    return true;
  }
  if (markdownBlockCanUseReactMarkdownLooseSimpleList(contentLines, context)) {
    return true;
  }
  if (markdownBlockCanUseReactMarkdownBlockquoteParagraphBlocks(lines, context)) {
    return true;
  }
  return contentLines.every((line) => {
    const text = line.text;
    const textLine = [line];
    return (
      text.length > 0 &&
      ((Boolean(/^ {0,3}#{1,6} (?=.+)/.exec(text)) &&
        markdownBlockCanUseReactMarkdownAtxHeading(textLine, context)) ||
        (textLine.length === 1 &&
          /^ {0,3}(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/.test(text)))
    );
  });
}

function markdownBlockReactMarkdownBlockquoteNeedsRawHtml(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (
    !markdownBlockCanUseReactMarkdownSimpleBlockquote(lines, context) &&
    !markdownBlockCanUseReactMarkdownBlockquoteBlocks(lines, context)
  ) {
    return false;
  }
  return lines.some((line) => {
    const match = /^ {0,3}>(.*)$/.exec(line.text);
    const text = blockquoteTextAfterMarker(match?.[1] ?? "");
    return markdownBlockContainsRawHtmlTag([{ key: `${line.key}-blockquote-text`, text }]);
  });
}

function reactMarkdownSafePlainText(value: string) {
  return !/[\\`*_~[\]<>#!|&@]/.test(value) && !/\b(?:https?|ftp):\/\/|www\./i.test(value);
}

function markdownBlockCanUseReactMarkdownPlainParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length === 0) {
    return false;
  }
  if (
    lines.some((line, index) => {
      if (
        line.text.trim() === "" ||
        /^\s/.test(line.text) ||
        markdownBlockContainsRawHtmlTag([line])
      ) {
        return true;
      }
      return index === 0
        ? markdownLineStartsBlock(line.text)
        : markdownLineStartsParagraphInterrupt(line.text);
    })
  ) {
    return false;
  }
  const text = lines.map((line) => line.text).join("\n");
  return reactMarkdownSafePlainText(text);
}

function markdownBlockCanUseReactMarkdownParagraphShape(lines: MarkdownLineRecord[]) {
  return (
    lines.length > 0 &&
    !lines.some((line, index) => {
      if (
        line.text.trim() === "" ||
        /^\s/.test(line.text) ||
        markdownBlockContainsRawHtmlTag([line])
      ) {
        return true;
      }
      return index === 0
        ? markdownLineStartsBlock(line.text)
        : markdownLineStartsParagraphInterrupt(line.text);
    })
  );
}

function markdownBlockCanUseReactMarkdownRawInlineParagraphShape(lines: MarkdownLineRecord[]) {
  return (
    lines.length > 0 &&
    !lines.some((line, index) => {
      if (
        line.text.trim() === "" ||
        /^\s/.test(line.text) ||
        markdownLineStartsRawHtmlBlock(line.text)
      ) {
        return true;
      }
      return index === 0
        ? markdownLineStartsBlock(line.text)
        : markdownLineStartsParagraphInterrupt(line.text);
    })
  );
}

function markdownBlockCanUseReactMarkdownSimpleInlineParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (/[\\`[\]<>#!|&@]/.test(text) || /\b(?:https?|ftp):\/\/|www\./i.test(text)) {
    return false;
  }
  return (
    /^\*[^*\s][^*\n]*[^*\s]\*$/.test(text) ||
    /^_[^_\s][^_\n]*[^_\s]_$/.test(text) ||
    /^\*\*[^*\s][^*\n]*[^*\s]\*\*$/.test(text) ||
    /^__[^_\s][^_\n]*[^_\s]__$/.test(text) ||
    /^`[^`\n]+`$/.test(text) ||
    /^~~[^~\s][^~\n]*[^~\s]~~$/.test(text)
  );
}

function markdownLineCanUseReactMarkdownMixedInline(text: string) {
  if (
    text.trim() === "" ||
    /[\\[\]<>#!|&@]/.test(text) ||
    /\b(?:https?|ftp):\/\/|www\./i.test(text)
  ) {
    return false;
  }
  const tokenPattern =
    /(?:\*\*\*[^*\s][^*\n]*[^*\s]\*\*\*|___[^_\s][^_\n]*[^_\s]___|\*\*[^*\s][^*\n]*[^*\s]\*\*|__[^_\s][^_\n]*[^_\s]__|\*[^*\s][^*\n]*[^*\s]\*|_[^_\s][^_\n]*[^_\s]_|`[^`\n]+`|~~[^~\s][^~\n]*[^~\s]~~|~[^~\s][^~\n]*[^~\s]~)/g;
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (/[*_~`]/.test(text.slice(cursor, start))) {
      return false;
    }
    if ((match[0] ?? "").startsWith("`") && (match[0] ?? "").match("\t") !== null) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && !/[*_~`]/.test(text.slice(cursor));
}

function markdownLineCanUseReactMarkdownEscapedInline(text: string) {
  if (
    text.trim() === "" ||
    text.match("\t") !== null ||
    !/\\[!"$%&'()*+,./:;=?@[\\\]^_`{|}~-]/.test(text) ||
    /\\[@#]/.test(text) ||
    /[<>#!|&@]/.test(text) ||
    /\b(?:https?|ftp):\/\/|www\./i.test(text)
  ) {
    return false;
  }
  const escapedAsPlain = text.replace(/\\[!"$%&'()*+,./:;=?@[\\\]^_`{|}~-]/g, "x");
  return (
    reactMarkdownSafePlainText(escapedAsPlain) ||
    markdownLineCanUseReactMarkdownMixedInline(escapedAsPlain)
  );
}

function markdownBlockCanUseReactMarkdownMixedInlineParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length === 0) {
    return false;
  }
  if (
    lines.some((line, index) => {
      if (
        line.text.trim() === "" ||
        /^\s/.test(line.text) ||
        markdownBlockContainsRawHtmlTag([line])
      ) {
        return true;
      }
      return index === 0
        ? markdownLineStartsBlock(line.text)
        : markdownLineStartsParagraphInterrupt(line.text);
    })
  ) {
    return false;
  }
  return (
    lines.some(
      (line) =>
        markdownLineCanUseReactMarkdownMixedInline(line.text) ||
        markdownLineCanUseReactMarkdownEscapedInline(line.text),
    ) &&
    lines.every(
      (line) =>
        reactMarkdownSafePlainText(line.text) ||
        markdownLineCanUseReactMarkdownMixedInline(line.text) ||
        markdownLineCanUseReactMarkdownEscapedInline(line.text),
    )
  );
}

function markdownBlockCanUseReactMarkdownLiteralTildeParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length === 0) {
    return false;
  }
  return lines.every((line, index) => {
    const text = line.text;
    if (
      text.trim() === "" ||
      text.match("\t") !== null ||
      /^ {0,3}~~~/.test(text) ||
      /^\s/.test(text) ||
      /[\\`*_[\]<>#!|&@]/.test(text) ||
      /\b(?:https?|ftp):\/\/|www\./i.test(text) ||
      markdownBlockContainsRawHtmlTag([line])
    ) {
      return false;
    }
    if (/(?:~~[^~\s]|[^~\s]~~|~~~)/.test(text)) {
      return false;
    }
    if (index === 0 ? markdownLineStartsBlock(text) : markdownLineStartsParagraphInterrupt(text)) {
      return false;
    }
    return /~~\s[^~]*?\s~~/.test(text);
  });
}

function markdownBlockCanUseReactMarkdownLineStartTripleTildeText(lines: MarkdownLineRecord[]) {
  if (lines.length === 0) {
    return false;
  }
  return lines.every((line, index) => {
    const text = line.text;
    if (
      text.trim() === "" ||
      text.match("\t") !== null ||
      /^\s{4,}/.test(text) ||
      /[\\`*_[\]<>#!|&@]/.test(text) ||
      /\b(?:https?|ftp):\/\/|www\./i.test(text) ||
      markdownBlockContainsRawHtmlTag([line])
    ) {
      return false;
    }
    if (
      index === 0
        ? markdownLineStartsBlock(text) && !/^ {0,3}~~~\S/.test(text)
        : markdownLineStartsParagraphInterrupt(text)
    ) {
      return false;
    }
    return /^ {0,3}~~~\S.*~~~\s*$/.test(text);
  });
}

function markdownBlockCanUseReactMarkdownLiteralSpacedEmphasisParagraph(
  lines: MarkdownLineRecord[],
) {
  if (lines.length === 0) {
    return false;
  }
  return lines.every((line, index) => {
    const text = line.text;
    if (
      text.trim() === "" ||
      text.match("\t") !== null ||
      /^\s/.test(text) ||
      /[\\`~[\]<>#!|&@]/.test(text) ||
      /\b(?:https?|ftp):\/\/|www\./i.test(text) ||
      markdownBlockContainsRawHtmlTag([line])
    ) {
      return false;
    }
    if (index === 0 ? markdownLineStartsBlock(text) : markdownLineStartsParagraphInterrupt(text)) {
      return false;
    }
    return (
      /(?:\*\s[^*]*?\s\*|_\s[^_]*?\s_|(?:\*\*)\s[^*]*?\s(?:\*\*)|__\s[^_]*?\s__)/.test(text) &&
      !/(?:\*{3}|_{3})/.test(text)
    );
  });
}

function reactMarkdownSafePlainOrMixedInlineText(text: string) {
  return (
    reactMarkdownSafePlainText(text) ||
    markdownLineCanUseReactMarkdownMixedInline(text) ||
    markdownLineCanUseReactMarkdownEscapedInline(text)
  );
}

function markdownLineCanUseReactMarkdownInlineParagraphText(
  line: MarkdownLineRecord,
  context?: MarkdownContext,
) {
  const lines = [line];
  return (
    reactMarkdownSafePlainText(line.text) ||
    markdownLineCanUseReactMarkdownMixedInline(line.text) ||
    markdownLineCanUseReactMarkdownEscapedInline(line.text) ||
    markdownBlockCanUseReactMarkdownSimpleInlineLinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleInlineImageParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownWhitespaceInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lines) ||
    markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(lines) ||
    markdownBlockCanUseReactMarkdownStructuredLabelInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownSimpleTitledInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownMixedReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(lines, context)
  );
}

function markdownBlockCanUseReactMarkdownMultilineInlineParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (!markdownBlockCanUseReactMarkdownParagraphShape(lines)) {
    return false;
  }
  let hasInlineMarkdown = false;
  for (const line of lines) {
    if (!markdownLineCanUseReactMarkdownInlineParagraphText(line, context)) {
      return false;
    }
    hasInlineMarkdown ||= !reactMarkdownSafePlainText(line.text);
  }
  return hasInlineMarkdown;
}

function markdownBlockCanUseReactMarkdownMultilineRawInlineParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (!markdownBlockCanUseReactMarkdownRawInlineParagraphShape(lines)) {
    return false;
  }
  let hasRawInlineMarkdown = false;
  for (const line of lines) {
    const lineBlock = [line];
    if (markdownBlockCanUseReactMarkdownInlineRawMarkdownParagraph(lineBlock, context)) {
      hasRawInlineMarkdown = true;
      continue;
    }
    if (
      reactMarkdownSafePlainText(line.text) ||
      markdownLineCanUseReactMarkdownMixedInline(line.text) ||
      markdownLineCanUseReactMarkdownEscapedInline(line.text) ||
      markdownBlockCanUseReactMarkdownSimpleInlineLinkParagraph(lineBlock) ||
      markdownBlockCanUseReactMarkdownSimpleInlineImageParagraph(lineBlock) ||
      markdownBlockCanUseReactMarkdownSimpleInlineMediaSequence(lineBlock) ||
      markdownBlockCanUseReactMarkdownWhitespaceInlineMediaSequence(lineBlock) ||
      markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lineBlock) ||
      markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(lineBlock) ||
      markdownBlockCanUseReactMarkdownStructuredLabelInlineMediaSequence(lineBlock) ||
      markdownBlockCanUseReactMarkdownSimpleTitledInlineMediaSequence(lineBlock) ||
      markdownBlockCanUseReactMarkdownMixedReferenceParagraph(lineBlock, context) ||
      markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(lineBlock, context) ||
      markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lineBlock) ||
      markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lineBlock) ||
      markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(lineBlock, context)
    ) {
      continue;
    }
    return false;
  }
  return hasRawInlineMarkdown;
}

function markdownBlockCanUseReactMarkdownSimpleInlineLinkParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match = /^\[([^\][\\`*_~<>#!|&@]+)\]\(([^()\s]+)\)$/.exec(text);
  if (!match) {
    return false;
  }
  const target = match[2] ?? "";
  return sanitizedMarkdownTarget(normalizeInlineTarget(target)) !== undefined;
}

function markdownBlockCanUseReactMarkdownSimpleInlineImageParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match = /^!\[([^\][\\`*_~<>#!|&@]+)\]\(([^()\s]+)\)$/.exec(text);
  if (!match) {
    return false;
  }
  const target = match[2] ?? "";
  return sanitizedMarkdownTarget(normalizeInlineTarget(target)) !== undefined;
}

function markdownBlockCanUseReactMarkdownSimpleInlineMediaSequence(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const tokenPattern = /!?\[([^\][\\`*_~<>#!|&@]+)\]\(([^()\s]+)\)/g;
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text.slice(cursor, start).trim() !== "") {
      return false;
    }
    const target = match[2] ?? "";
    if ((match[0] ?? "").startsWith("!") && normalizeInlineTarget(target) === "") {
      return false;
    }
    if (sanitizedMarkdownTarget(normalizeInlineTarget(target)) === undefined) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && text.slice(cursor).trim() === "";
}

function markdownBlockCanUseReactMarkdownWhitespaceInlineMediaSequence(
  lines: MarkdownLineRecord[],
) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const escapedPunctuation =
    String.raw`\\[!"#$%&'()*+,\-./:;<=>?@[\]\\^_` + "`" + String.raw`{|}~]`;
  const targetPattern = String.raw`(?:<[^<>\n]*>|(?:${escapedPunctuation}|[^()\s\\]|\([^()\s\\]*\))*)`;
  const tokenPattern = new RegExp(
    String.raw`!?\[([^\][\\` +
      "`" +
      String.raw`*_~<>#!|&@]*)\]\(\s*(${targetPattern})\s*(?:(?:"[^"\\&\n]*"|'[^'\\&\n]*'|\([^()\\&\n]*\)))?\s*\)`,
    "g",
  );
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text.slice(cursor, start).trim() !== "") {
      return false;
    }
    const target = match[2] ?? "";
    if (sanitizedMarkdownTarget(normalizeInlineTarget(target)) === undefined) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && text.slice(cursor).trim() === "";
}

const reactMarkdownInlineMediaTargetPattern =
  String.raw`(?:<[^<>\n]*>|(?:\\[!"#$%&'()*+,\-./:;<=>?@[\]\\^_` +
  "`" +
  String.raw`{|}~]|[^()\s\\]|\([^()\s\\]*\))*)`;

function markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    text.trim() === "" ||
    text.match("\t") !== null ||
    markdownLineStartsBlock(text) ||
    markdownBlockContainsRawHtmlTag(lines)
  ) {
    return false;
  }
  const tokenPattern = new RegExp(
    String.raw`!?\[([^\][\\` +
      "`" +
      String.raw`*_~<>#!|&@]+)\]\(\s*(${reactMarkdownInlineMediaTargetPattern})\s*(?:(?:"[^"\\&\n]*"|'[^'\\&\n]*'|\([^()\\&\n]*\)))?\s*\)`,
    "g",
  );
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (!reactMarkdownSafePlainText(text.slice(cursor, start))) {
      return false;
    }
    if ((match[1] ?? "").match("\t") !== null) {
      return false;
    }
    const target = match[2] ?? "";
    if ((match[0] ?? "").startsWith("!") && normalizeInlineTarget(target) === "") {
      return false;
    }
    if (sanitizedMarkdownTarget(normalizeInlineTarget(target)) === undefined) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && reactMarkdownSafePlainText(text.slice(cursor));
}

function markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(
  lines: MarkdownLineRecord[],
) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    text.trim() === "" ||
    text.match("\t") !== null ||
    markdownLineStartsBlock(text) ||
    markdownBlockContainsRawHtmlTag(lines)
  ) {
    return false;
  }
  const tokenPattern = new RegExp(
    String.raw`!?\[([^\][\\` +
      "`" +
      String.raw`*_~<>#!|&@]+)\]\(\s*(${reactMarkdownInlineMediaTargetPattern})\s*(?:(?:"[^"\\&\n]*"|'[^'\\&\n]*'|\([^()\\&\n]*\)))?\s*\)`,
    "g",
  );
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (!reactMarkdownSafePlainOrMixedInlineText(text.slice(cursor, start))) {
      return false;
    }
    if ((match[1] ?? "").match("\t") !== null) {
      return false;
    }
    const target = match[2] ?? "";
    if ((match[0] ?? "").startsWith("!") && normalizeInlineTarget(target) === "") {
      return false;
    }
    if (sanitizedMarkdownTarget(normalizeInlineTarget(target)) === undefined) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && reactMarkdownSafePlainOrMixedInlineText(text.slice(cursor));
}

function markdownBlockCanUseReactMarkdownStructuredLabelInlineMediaSequence(
  lines: MarkdownLineRecord[],
) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const tokenPattern = new RegExp(String.raw`!?\[(${inlineLabelPattern})\]\(([^()\s]+)\)`, "g");
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text.slice(cursor, start).trim() !== "") {
      return false;
    }
    const token = match[0] ?? "";
    const label = match[1] ?? "";
    const target = match[2] ?? "";
    if (
      containsLt(label) ||
      containsInlineLinkClose(label) ||
      (token.startsWith("!") && containsBacktick(label)) ||
      sanitizedMarkdownTarget(normalizeInlineTarget(target)) === undefined
    ) {
      return false;
    }
    cursor = start + token.length;
    matched = true;
  }
  return matched && text.slice(cursor).trim() === "";
}

function markdownBlockCanUseReactMarkdownSimpleTitledInlineMediaSequence(
  lines: MarkdownLineRecord[],
) {
  if (lines.length === 0) {
    return false;
  }
  const text = lines.map((line) => line.text).join("\n");
  if (/\n\s*\n/.test(text)) {
    return false;
  }
  const tokenPattern =
    /!?\[([^\][\\`*_~<>#!|&@]+)\]\((<[^<>\s]+>|[^()\s]+)(?:[ \t]|\n[ \t]*)+(?:"[^"\\&\n]+"|'[^'\\&\n]+'|\([^()\\&\n]+\))\)/g;
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text.slice(cursor, start).trim() !== "") {
      return false;
    }
    const target = match[2] ?? "";
    if (sanitizedMarkdownTarget(normalizeInlineTarget(target)) === undefined) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && text.slice(cursor).trim() === "";
}

function markdownBlockCanUseReactMarkdownSimpleReferenceParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1 || !context?.referenceMap || context.referenceMap.size === 0) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (/[\\`*_~<>#!|&@()]/.test(text)) {
    return false;
  }
  const tokenPattern = /!?\[([^\][]+)\](?:\[([^\][]*)\])?/g;
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text.slice(cursor, start).trim() !== "") {
      return false;
    }
    const label = match[2] === undefined || match[2] === "" ? (match[1] ?? "") : (match[2] ?? "");
    if (!context.referenceMap.has(normalizeReferenceLabel(label))) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && text.slice(cursor).trim() === "";
}

function markdownBlockCanUseReactMarkdownStructuredReferenceParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1 || !context?.referenceMap || context.referenceMap.size === 0) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const tokenPattern = new RegExp(
    String.raw`(!?)\[(${inlineLabelPattern})\](?:\[(${referenceLabelPattern})\]|\[\])?`,
    "g",
  );
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text.slice(cursor, start).trim() !== "") {
      return false;
    }
    const marker = match[1] ?? "";
    const label = match[2] ?? "";
    const explicitLabel = match[3];
    const referenceLabel =
      explicitLabel === undefined || explicitLabel === "" ? label : explicitLabel;
    const normalizedReferenceLabel = normalizeReferenceLabel(referenceLabel);
    const reference = context.referenceMap.get(normalizedReferenceLabel);
    if (
      containsLt(label) ||
      containsInlineLinkClose(label) ||
      (marker === "!" && containsBacktick(label)) ||
      !reference ||
      (reference.target !== "<" && reference.target ? containsLt(reference.target) : false)
    ) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return matched && text.slice(cursor).trim() === "";
}

function reactMarkdownReferenceSurroundingTextCanUseReactMarkdown(
  text: string,
  formatted: boolean,
  context?: MarkdownContext,
) {
  if (
    formatted
      ? reactMarkdownSafePlainOrMixedInlineText(text)
      : reactMarkdownSafePlainText(text) || markdownLineCanUseReactMarkdownEscapedInline(text)
  ) {
    return true;
  }
  const lines = [{ key: "reference-surrounding-text", text }];
  return (
    (formatted
      ? markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(lines)
      : markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lines)) ||
    markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(lines, context)
  );
}

function markdownBlockCanUseReactMarkdownMixedReferenceParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1 || !context?.referenceMap || context.referenceMap.size === 0) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (text.match("\t") !== null || markdownBlockContainsRawHtmlTag(lines)) {
    return false;
  }
  const tokenPattern = new RegExp(
    String.raw`(!?)\[(${inlineLabelPattern})\](?:\[(${referenceLabelPattern})\]|\[\])?`,
    "g",
  );
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text[start + (match[0]?.length ?? 0)] === "(") {
      continue;
    }
    if (
      !reactMarkdownReferenceSurroundingTextCanUseReactMarkdown(
        text.slice(cursor, start),
        false,
        context,
      )
    ) {
      return false;
    }
    const marker = match[1] ?? "";
    const label = match[2] ?? "";
    const explicitLabel = match[3];
    const referenceLabel =
      explicitLabel === undefined || explicitLabel === "" ? label : explicitLabel;
    const normalizedReferenceLabel = normalizeReferenceLabel(referenceLabel);
    const reference = context.referenceMap.get(normalizedReferenceLabel);
    if (
      containsLt(label) ||
      containsInlineLinkClose(label) ||
      (marker === "!" && containsBacktick(label)) ||
      !reference ||
      (reference.target !== "<" && reference.target ? containsLt(reference.target) : false)
    ) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return (
    matched &&
    reactMarkdownReferenceSurroundingTextCanUseReactMarkdown(text.slice(cursor), false, context)
  );
}

function markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1 || !context?.referenceMap || context.referenceMap.size === 0) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (text.match("\t") !== null || markdownBlockContainsRawHtmlTag(lines)) {
    return false;
  }
  const tokenPattern = new RegExp(
    String.raw`(!?)\[(${inlineLabelPattern})\](?:\[(${referenceLabelPattern})\]|\[\])?`,
    "g",
  );
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text[start + (match[0]?.length ?? 0)] === "(") {
      continue;
    }
    if (
      !reactMarkdownReferenceSurroundingTextCanUseReactMarkdown(
        text.slice(cursor, start),
        true,
        context,
      )
    ) {
      return false;
    }
    const marker = match[1] ?? "";
    const label = match[2] ?? "";
    const explicitLabel = match[3];
    const referenceLabel =
      explicitLabel === undefined || explicitLabel === "" ? label : explicitLabel;
    const normalizedReferenceLabel = normalizeReferenceLabel(referenceLabel);
    const reference = context.referenceMap.get(normalizedReferenceLabel);
    if (
      containsLt(label) ||
      containsInlineLinkClose(label) ||
      (marker === "!" && containsBacktick(label)) ||
      !reference ||
      (reference.target !== "<" && reference.target ? containsLt(reference.target) : false)
    ) {
      return false;
    }
    cursor = start + (match[0]?.length ?? 0);
    matched = true;
  }
  return (
    matched &&
    reactMarkdownReferenceSurroundingTextCanUseReactMarkdown(text.slice(cursor), true, context)
  );
}

function markdownInlineMediaTokensCanUseReactMarkdown(text: string) {
  const tokenPattern = new RegExp(
    String.raw`!?\[([^\]\n]+)\]\(\s*(${reactMarkdownInlineMediaTargetPattern})\s*(?:(?:"[^"\\&\n]*"|'[^'\\&\n]*'|\([^()\\&\n]*\)))?\s*\)`,
    "g",
  );
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const token = match[0] ?? "";
    const label = match[1] ?? "";
    const target = match[2] ?? "";
    if (
      label.match("\t") !== null ||
      containsLt(label) ||
      containsInlineLinkClose(label) ||
      (token.startsWith("!") &&
        (containsBacktick(label) || normalizeInlineTarget(target) === "")) ||
      sanitizedMarkdownTarget(normalizeInlineTarget(target)) === undefined
    ) {
      return false;
    }
    matched = true;
  }
  return matched;
}

function markdownBlockCanUseReactMarkdownInlineRawFormattingParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    markdownLineStartsRawHtmlBlock(text) ||
    /!?\[[^\]]/.test(text) ||
    /<\/?(?:a|code|div|hr|img|input|p|source|sup|table|tbody|td|th|thead|tr|video)\b/i.test(text)
  ) {
    return false;
  }
  return /<\/?(?:b|br|em|i|s|span|strong|u)\b/i.test(text);
}

function markdownBlockCanUseReactMarkdownInlineRawMarkdownParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    markdownLineStartsRawHtmlBlock(text) ||
    /<\/?(?:a|code|div|hr|iframe|img|input|li|ol|p|pre|source|sup|table|tbody|td|th|thead|tr|ul|video)\b/i.test(
      text,
    )
  ) {
    return false;
  }
  if (!/<\/?(?:b|br|em|i|s|span|strong|u)\b/i.test(text)) {
    return false;
  }
  if (
    /\[[^\]\n]*[<>][^\]\n]*\]\(/.test(text) ||
    /\[[^\]\n]*\[[^\]\n]+\]\([^)]+\)[^\]\n]*\]\(/.test(text)
  ) {
    return false;
  }
  let matched = markdownInlineMediaTokensCanUseReactMarkdown(text);
  const tokenPattern = new RegExp(
    String.raw`(!?)\[(${inlineLabelPattern})\](?:\[(${referenceLabelPattern})\]|\[\])?`,
    "g",
  );
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (text[start + (match[0]?.length ?? 0)] === "(") {
      continue;
    }
    const marker = match[1] ?? "";
    const label = match[2] ?? "";
    const explicitLabel = match[3];
    const referenceLabel =
      explicitLabel === undefined || explicitLabel === "" ? label : explicitLabel;
    const reference = context?.referenceMap?.get(normalizeReferenceLabel(referenceLabel));
    if (
      containsLt(label) ||
      containsInlineLinkClose(label) ||
      (marker === "!" && containsBacktick(label)) ||
      !reference ||
      (reference.target !== "<" && reference.target ? containsLt(reference.target) : false)
    ) {
      return false;
    }
    matched = true;
  }
  return matched || bareAutolinkRegex.test(text) || new RegExp(angleAutolinkPattern).test(text);
}

function markdownBlockCanUseReactMarkdownSimpleRawAnchorParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match = /^<a\b(?<attributes>[^>]*)>(?<label>[^<>\n]+)<\/a\s*>$/i.exec(text);
  const label = match?.groups?.label ?? "";
  if (!match?.groups?.attributes || !reactMarkdownSafePlainText(label)) {
    return false;
  }
  const props = parseRawHtmlAttributes("a", match.groups.attributes);
  return typeof props.href === "string" && props.href.length > 0;
}

function markdownBlockCanUseReactMarkdownSimpleRawOrderedList(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match = /^<ol\b(?<attributes>[^>]*)><li>(?<label>[^<>\n]+)<\/li><\/ol>$/i.exec(text);
  const label = match?.groups?.label ?? "";
  if (!match || !reactMarkdownSafePlainText(label)) {
    return false;
  }
  const start = /\bstart\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(
    match.groups?.attributes ?? "",
  );
  return !start || /^\d+$/.test(start[1] ?? start[2] ?? start[3] ?? "");
}

function markdownBlockCanUseReactMarkdownSimpleRawIframe(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match = /^<iframe\b(?<attributes>[^>]*)><\/iframe>$/i.exec(text);
  return Boolean(match);
}

function markdownBlockCanUseReactMarkdownSimpleRawVoidBlock(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  return /^<(?:hr|img|input|source)\b[^>]*\/?>$/i.test(text);
}

function markdownBlockCanUseReactMarkdownSimpleRawVideo(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match =
    /^<video\b(?<videoAttributes>[^>]*)><source\b(?<sourceAttributes>[^>]*)><\/video>$/i.exec(text);
  if (!match) {
    return false;
  }
  return true;
}

function markdownBlockCanUseReactMarkdownOpaqueRawPreBlock(lines: MarkdownLineRecord[]) {
  if (lines.length === 0) {
    return false;
  }
  const firstLine = lines[0]?.text ?? "";
  const boundaryTag = rawBlockTagWithClosingBoundaryFromLine(firstLine);
  if (boundaryTag !== "pre" && boundaryTag !== "code") {
    return false;
  }
  const closingPattern = new RegExp(String.raw`<\/${boundaryTag}\s*>`, "i");
  const closingIndex = lines.findIndex((line) => closingPattern.test(line.text));
  return closingIndex === lines.length - 1;
}

function markdownBlockCanUseReactMarkdownOpaqueRawHtmlBlock(lines: MarkdownLineRecord[]) {
  if (lines.length === 0) {
    return false;
  }
  const firstLine = lines[0]?.text ?? "";
  return (
    markdownLineStartsRawHtmlBlock(firstLine) ||
    markdownLineIsStandaloneRawHtmlVoidBlock(firstLine) ||
    markdownLineIsStandaloneRawHtmlDirectiveBlock(firstLine)
  );
}

function markdownBlockCanUseReactMarkdownStandaloneRawDirectiveBlock(lines: MarkdownLineRecord[]) {
  return lines.length === 1 && markdownLineIsStandaloneRawHtmlDirectiveBlock(lines[0]?.text ?? "");
}

function markdownBlockCanUseReactMarkdownRawCheckboxLine(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match = /^<input\b(?<attributes>[^>]*)>\s+(?<label>[^\n<]+)$/i.exec(text);
  const label = match?.groups?.label ?? "";
  if (!match || !reactMarkdownSafePlainText(label)) {
    return false;
  }
  const props = parseRawHtmlAttributes("input", match.groups?.attributes ?? "");
  return props.type === "checkbox";
}

function markdownBlockCanUseReactMarkdownSimpleBareAutolinkParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  return bareAutolinkRegex.test(text) && !/[<>&]/.test(text);
}

function markdownBlockCanUseReactMarkdownSimpleAngleAutolinkParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  const match = /^<([^<>\s]+)>$/.exec(text);
  if (!match) {
    return false;
  }
  const target = match[1] ?? "";
  return (
    sanitizedMarkdownTarget(angleEmailRegex.test(target) ? `mailto:${target}` : target) !==
    undefined
  );
}

function markdownBlockCanUseReactMarkdownYonaAutolinkParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (/[\\`*_~[\]<>!|&']/.test(text) || markdownBlockContainsRawHtmlTag(lines)) {
    return false;
  }
  return parseTextWithAutolinks(text, "react-markdown-probe").some((part) => part.kind === "link");
}

function markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    text.match("\t") !== null ||
    /[\\`[\]<>#!|&"']/.test(text) ||
    markdownBlockContainsRawHtmlTag(lines)
  ) {
    return false;
  }
  const parts = parseTextWithAutolinks(text, "react-markdown-probe");
  return (
    parts.some((part) => part.kind === "link") &&
    parts.every((part) => {
      if (part.kind !== "link") {
        return "value" in part ? reactMarkdownSafePlainOrMixedInlineText(part.value) : true;
      }
      const target = part.target ?? "";
      return (
        /^(?:https?|ftp):\/\//i.test(target) ||
        target.startsWith("http://www.") ||
        /^mailto:/i.test(target)
      );
    })
  );
}

function markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lines: MarkdownLineRecord[]) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    text.match("\t") !== null ||
    /[\\`[\]&"]/.test(text) ||
    markdownBlockContainsRawHtmlTag(lines)
  ) {
    return false;
  }
  const tokenPattern = new RegExp(angleAutolinkPattern, "g");
  let cursor = 0;
  let matched = false;
  for (const match of text.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    const prefix = text.slice(cursor, start);
    if (!reactMarkdownSafePlainOrMixedInlineText(prefix)) {
      return false;
    }
    const token = match[0] ?? "";
    const label = token.slice(1, -1);
    if (
      sanitizedMarkdownTarget(angleEmailRegex.test(label) ? `mailto:${label}` : label) === undefined
    ) {
      return false;
    }
    cursor = start + token.length;
    matched = true;
  }
  return matched && reactMarkdownSafePlainOrMixedInlineText(text.slice(cursor));
}

function markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    text.match("\t") !== null ||
    /[\\`[\]<>!|&]/.test(text) ||
    markdownBlockContainsRawHtmlTag(lines)
  ) {
    return false;
  }
  const parts = parseTextWithAutolinks(text, "react-markdown-probe", context);
  return (
    parts.some((part) => part.kind === "link" && Boolean(part.className || part.issueState)) &&
    parts.every((part) => {
      if (part.kind !== "link") {
        return "value" in part ? reactMarkdownSafePlainOrMixedInlineText(part.value) : true;
      }
      return Boolean(part.className || part.issueState);
    })
  );
}

function markdownBlockCanUseReactMarkdownUnresolvedYonaAutolinkParagraph(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length !== 1) {
    return false;
  }
  const text = lines[0]?.text ?? "";
  if (
    text.trim() === "" ||
    text.match("\t") !== null ||
    markdownLineStartsBlock(text) ||
    /[\\`*_~[\]<>!|&]/.test(text) ||
    /\b(?:https?|ftp):\/\/|www\./i.test(text) ||
    markdownBlockContainsRawHtmlTag(lines)
  ) {
    return false;
  }
  if (
    !/(?:^|[\s(])(?:[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?#\d+|@[^\s@/]+(?:\/[^\s@/]+)?)/.test(text)
  ) {
    return false;
  }
  const parts = parseTextWithAutolinks(text, "react-markdown-probe", context);
  return (
    parts.every((part) => part.kind !== "link") &&
    text
      .split(/(?:[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?#\d+|@[^\s@/]+(?:\/[^\s@/]+)?)/)
      .every((part) => reactMarkdownSafePlainText(part.replace(/[()]/g, "")))
  );
}

function markdownListItemTextCanUseReactMarkdown(text: string, context?: MarkdownContext) {
  const lines = [{ key: "list-item", text }];
  if (reactMarkdownSafePlainText(text)) {
    return true;
  }
  if (text.match("\t") !== null || text.includes("\n")) {
    return false;
  }
  if (markdownBlockContainsRawHtmlTag(lines)) {
    return (
      markdownBlockCanUseReactMarkdownInlineRawMarkdownParagraph(lines, context) ||
      markdownBlockCanUseReactMarkdownInlineRawFormattingParagraph(lines)
    );
  }
  if (/[\\[\]<>#!|&@]/.test(text) || /\b(?:https?|ftp):\/\/|www\./i.test(text)) {
    return (
      markdownLineCanUseReactMarkdownEscapedInline(text) ||
      markdownBlockCanUseReactMarkdownSimpleInlineLinkParagraph(lines) ||
      markdownBlockCanUseReactMarkdownSimpleInlineImageParagraph(lines) ||
      markdownBlockCanUseReactMarkdownSimpleInlineMediaSequence(lines) ||
      markdownBlockCanUseReactMarkdownWhitespaceInlineMediaSequence(lines) ||
      markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lines) ||
      markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(lines) ||
      markdownBlockCanUseReactMarkdownStructuredLabelInlineMediaSequence(lines) ||
      markdownBlockCanUseReactMarkdownSimpleTitledInlineMediaSequence(lines) ||
      markdownBlockCanUseReactMarkdownSimpleReferenceParagraph(lines, context) ||
      markdownBlockCanUseReactMarkdownStructuredReferenceParagraph(lines, context) ||
      markdownBlockCanUseReactMarkdownMixedReferenceParagraph(lines, context) ||
      markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(lines, context) ||
      markdownBlockCanUseReactMarkdownSimpleBareAutolinkParagraph(lines) ||
      markdownBlockCanUseReactMarkdownSimpleAngleAutolinkParagraph(lines) ||
      markdownBlockCanUseReactMarkdownYonaAutolinkParagraph(lines) ||
      markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lines) ||
      markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lines) ||
      markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(lines, context)
    );
  }
  return (
    /^\*[^*\s][^*\n]*[^*\s]\*$/.test(text) ||
    /^_[^_\s][^_\n]*[^_\s]_$/.test(text) ||
    /^\*\*[^*\s][^*\n]*[^*\s]\*\*$/.test(text) ||
    /^__[^_\s][^_\n]*[^_\s]__$/.test(text) ||
    /^`[^`\n]+`$/.test(text) ||
    /^~~[^~\s][^~\n]*[^~\s]~~$/.test(text)
  );
}

function markdownBlockCanUseReactMarkdownSimpleList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
  terminalNewline?: boolean,
) {
  if (lines.length === 0) {
    return false;
  }
  const firstLine = parseMarkdownListLine(lines[0] as MarkdownLineRecord);
  if (
    !firstLine ||
    (firstLine.text === "" && !terminalNewline) ||
    firstLine.text.startsWith("[ ]") ||
    firstLine.text.startsWith("[x]")
  ) {
    return false;
  }
  for (const [index, line] of lines.entries()) {
    if (
      line.text.match("\t") !== null &&
      !/^ {0,3}(?:[-+*]|\d{1,9}[.)])\t(?![-+*][ \t]|\d{1,9}[.)][ \t])[^\t]*$/.test(line.text)
    ) {
      return false;
    }
    const listLine = parseMarkdownListLine(line);
    const isAllowedEmptyItem =
      listLine?.text === "" && (terminalNewline || index < lines.length - 1);
    if (
      !listLine ||
      listLine.indent !== firstLine.indent ||
      listLine.ordered !== firstLine.ordered ||
      listLine.markerKind !== firstLine.markerKind ||
      (listLine.text === "" && !isAllowedEmptyItem) ||
      listLine.text.startsWith("[ ]") ||
      listLine.text.startsWith("[x]") ||
      (!isAllowedEmptyItem && !markdownListItemTextCanUseReactMarkdown(listLine.text, context))
    ) {
      return false;
    }
    if (firstLine.ordered && listLine.start !== (firstLine.start ?? 1) + index) {
      return false;
    }
  }
  return true;
}

function markdownBlockCanUseReactMarkdownSmartList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length < 2) {
    return false;
  }
  const parsedLines = lines.map(parseMarkdownListLine);
  const firstLine = parsedLines[0];
  if (!firstLine || parsedLines.some((line) => line === null)) {
    return false;
  }
  let hasMarkerChange = false;
  for (const [index, parsed] of parsedLines.entries()) {
    const listLine = parsed as ParsedMarkdownListLine;
    if (
      listLine.indent !== firstLine.indent ||
      listLine.ordered !== firstLine.ordered ||
      listLine.text === "" ||
      listLine.text.startsWith("[ ]") ||
      listLine.text.startsWith("[x]") ||
      !markdownListItemTextCanUseReactMarkdown(listLine.text, context)
    ) {
      return false;
    }
    if (listLine.markerKind !== firstLine.markerKind) {
      hasMarkerChange = true;
    }
    if (firstLine.ordered && listLine.start !== (firstLine.start ?? 1) + index) {
      return false;
    }
  }
  return hasMarkerChange;
}

function markdownBlockCanUseReactMarkdownRootIndentedList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length < 2) {
    return false;
  }
  const parsedLines = lines.map(parseMarkdownListLine);
  const firstLine = parsedLines[0];
  if (
    !firstLine ||
    parsedLines.some((line) => line === null) ||
    parsedLines.some((line) => (line?.indent ?? 0) > 3)
  ) {
    return false;
  }
  let hasIndentChange = false;
  let hasMarkerChange = false;
  for (const [index, parsed] of parsedLines.entries()) {
    const listLine = parsed as ParsedMarkdownListLine;
    if (
      listLine.ordered !== firstLine.ordered ||
      (index > 0 && listLine.indent >= firstLine.indent + firstLine.markerWidth + 1) ||
      listLine.text === "" ||
      listLine.text.startsWith("[ ]") ||
      listLine.text.startsWith("[x]") ||
      !markdownListItemTextCanUseReactMarkdown(listLine.text, context)
    ) {
      return false;
    }
    if (listLine.indent !== firstLine.indent) {
      hasIndentChange = true;
    }
    if (listLine.markerKind !== firstLine.markerKind) {
      hasMarkerChange = true;
    }
    if (firstLine.ordered && listLine.start !== (firstLine.start ?? 1) + index) {
      return false;
    }
  }
  return hasIndentChange || hasMarkerChange;
}

function markdownBlockCanUseReactMarkdownNestedList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length < 2) {
    return false;
  }
  const parsedLines = lines.map(parseMarkdownListLine);
  const firstLine = parsedLines[0];
  if (
    !firstLine ||
    parsedLines.some((line) => line === null) ||
    firstLine.indent > 3 ||
    firstLine.ordered
  ) {
    return false;
  }
  let hasNestedLine = false;
  for (const [index, parsed] of parsedLines.entries()) {
    const listLine = parsed as ParsedMarkdownListLine;
    if (
      listLine.text === "" ||
      listLine.text.startsWith("[ ]") ||
      listLine.text.startsWith("[x]") ||
      !markdownListItemTextCanUseReactMarkdown(listLine.text, context)
    ) {
      return false;
    }
    if (index === 0) {
      continue;
    }
    if (listLine.indent <= firstLine.indent + firstLine.markerWidth) {
      if (
        listLine.indent !== firstLine.indent ||
        listLine.ordered !== firstLine.ordered ||
        listLine.markerKind !== firstLine.markerKind
      ) {
        return false;
      }
      continue;
    }
    hasNestedLine = true;
  }
  return hasNestedLine;
}

function markdownBlockCanUseReactMarkdownTightContinuationList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
  terminalNewline?: boolean,
) {
  const list = parseMarkdownList(lines, terminalNewline);
  if (!list || list.loose || list.items.length === 0) {
    return false;
  }
  const firstLine = parseMarkdownListLine(lines[0] as MarkdownLineRecord);
  if (!firstLine || firstLine.indent > 3) {
    return false;
  }
  let itemIndex = 0;
  for (const line of lines) {
    const listLine = parseMarkdownListLine(line);
    if (!listLine) {
      continue;
    }
    if (
      listLine.indent !== firstLine.indent ||
      listLine.ordered !== firstLine.ordered ||
      listLine.markerKind !== firstLine.markerKind
    ) {
      return false;
    }
    if (firstLine.ordered && listLine.start !== (firstLine.start ?? 1) + itemIndex) {
      return false;
    }
    itemIndex += 1;
  }
  return list.items.every((item) =>
    markdownListItemCanUseReactMarkdownTightContinuation(item, context),
  );
}

function markdownListItemCanUseReactMarkdownTightContinuation(
  item: MarkdownListItem,
  context?: MarkdownContext,
): boolean {
  if (item.children || item.task || !item.text.includes("\n")) {
    return false;
  }
  if (item.continuedLeadingIndentedCode && item.continuedText?.includes("\n")) {
    const lines = item.continuedText.split("\n");
    const firstLine = lines[0] ?? "";
    const firstText = firstLine.trimStart();
    return (
      firstLine.length - firstText.length >= 4 &&
      markdownListItemTextCanUseReactMarkdown(firstText, context) &&
      lines
        .slice(1)
        .every((line) => line.length > 0 && markdownListItemTextCanUseReactMarkdown(line, context))
    );
  }
  if (item.leadingIndentedCode && item.continuedText === undefined) {
    return false;
  }
  const lines = markdownListItemRenderText(item).split("\n");
  return lines.every((line, index) => {
    if (line.length === 0) {
      return false;
    }
    if (index === 0 && item.leadingIndentedCode) {
      const text = line.trimStart();
      return (
        line.length - text.length < 4 && markdownListItemTextCanUseReactMarkdown(text, context)
      );
    }
    if (/^ {1,3}\S/.test(line)) {
      return markdownListItemTextCanUseReactMarkdown(line.trimStart(), context);
    }
    return !/^\s/.test(line) && markdownListItemTextCanUseReactMarkdown(line, context);
  });
}

function markdownBlockCanUseReactMarkdownLooseSimpleList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
  terminalNewline?: boolean,
) {
  const list = parseMarkdownList(lines, terminalNewline);
  if (!list?.loose || list.items.length === 0) {
    return false;
  }
  return list.items.every((item) => {
    if (item.children || item.leadingIndentedCode || item.continuedLeadingIndentedCode) {
      return false;
    }
    const paragraphs = markdownListItemRenderText(item)
      .split(`\n${looseListBreakMarker}\n`)
      .flatMap((paragraph) => {
        const trimmed = paragraph.replaceAll(looseListBreakMarker, "").trim();
        return trimmed ? [trimmed] : [];
      });
    return (
      paragraphs.length > 0 &&
      paragraphs.every((paragraph) => markdownListItemTextCanUseReactMarkdown(paragraph, context))
    );
  });
}

function markdownBlockCanUseReactMarkdownLooseNestedTaskList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
  terminalNewline?: boolean,
) {
  const list = parseMarkdownList(lines, terminalNewline);
  return Boolean(
    list?.loose && markdownListRecordCanUseReactMarkdownLooseNestedTaskList(list, context),
  );
}

function markdownListRecordCanUseReactMarkdownLooseNestedTaskList(
  list: MarkdownListRecord,
  context?: MarkdownContext,
): boolean {
  return markdownListRecordReactMarkdownLooseNestedTaskListStatus(list, context).valid;
}

function markdownListRecordReactMarkdownLooseNestedTaskListStatus(
  list: MarkdownListRecord,
  context?: MarkdownContext,
): { hasNestedTask: boolean; valid: boolean } {
  if (list.ordered || list.items.length === 0) {
    return { hasNestedTask: false, valid: false };
  }
  let hasNestedTask = false;
  for (const item of list.items) {
    if (item.leadingIndentedCode || item.continuedLeadingIndentedCode) {
      return { hasNestedTask: false, valid: false };
    }
    hasNestedTask = hasNestedTask || item.task;
    const childLists = item.children ?? [];
    for (const child of childLists) {
      const childStatus = markdownListRecordReactMarkdownLooseNestedTaskListStatus(child, context);
      if (!childStatus.valid) {
        return { hasNestedTask: false, valid: false };
      }
      hasNestedTask =
        hasNestedTask ||
        childStatus.hasNestedTask ||
        child.items.some((childItem) => childItem.task);
    }
    const paragraphs = markdownListItemRenderText(item)
      .split(`\n${looseListBreakMarker}\n`)
      .flatMap((paragraph) => {
        const trimmed = paragraph.replaceAll(looseListBreakMarker, "").trim();
        return trimmed ? [trimmed] : [];
      });
    if (
      paragraphs.length === 0 ||
      !paragraphs.every((paragraph) => markdownListItemTextCanUseReactMarkdown(paragraph, context))
    ) {
      return { hasNestedTask: false, valid: false };
    }
  }
  return { hasNestedTask, valid: hasNestedTask };
}

function markdownBlockCanUseReactMarkdownSimpleTaskList(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  if (lines.length === 0) {
    return false;
  }
  const firstLine = parseMarkdownListLine(lines[0] as MarkdownLineRecord);
  if (!firstLine) {
    return false;
  }
  for (const [index, line] of lines.entries()) {
    const listLine = parseMarkdownListLine(line);
    const taskMatch = /^\[([ xX])\][ \t](?<text>[^\s\t][^\t]*|)$/.exec(listLine?.text ?? "");
    const taskText = taskMatch?.groups?.text ?? "";
    if (
      !listLine ||
      listLine.indent !== firstLine.indent ||
      listLine.ordered !== firstLine.ordered ||
      listLine.markerKind !== firstLine.markerKind ||
      !taskMatch ||
      (taskText !== "" && !markdownListItemTextCanUseReactMarkdown(taskText, context))
    ) {
      return false;
    }
    if (firstLine.ordered && listLine.start !== (firstLine.start ?? 1) + index) {
      return false;
    }
  }
  return true;
}

function markdownBlockReactMarkdownListNeedsRawHtml(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
  terminalNewline?: boolean,
) {
  if (
    !markdownBlockCanUseReactMarkdownSimpleList(lines, context) &&
    !markdownBlockCanUseReactMarkdownSimpleTaskList(lines, context) &&
    !markdownBlockCanUseReactMarkdownSmartList(lines, context) &&
    !markdownBlockCanUseReactMarkdownRootIndentedList(lines, context) &&
    !markdownBlockCanUseReactMarkdownNestedList(lines, context) &&
    !markdownBlockCanUseReactMarkdownTightContinuationList(lines, context, terminalNewline) &&
    !markdownBlockCanUseReactMarkdownLooseSimpleList(lines, context, terminalNewline) &&
    !markdownBlockCanUseReactMarkdownLooseNestedTaskList(lines, context, terminalNewline)
  ) {
    return false;
  }
  return markdownListReactMarkdownTextLines(lines, terminalNewline).some((line) =>
    markdownBlockContainsRawHtmlTag([line]),
  );
}

function markdownListReactMarkdownTextLines(
  lines: MarkdownLineRecord[],
  terminalNewline?: boolean,
) {
  const list = parseMarkdownList(lines, terminalNewline);
  if (!list) {
    return lines.flatMap((line) => {
      const listLine = parseMarkdownListLine(line);
      const taskMatch = /^\[([ xX])\][ \t](?<text>[^\s\t][^\t]*|)$/.exec(listLine?.text ?? "");
      const text = taskMatch?.groups?.text ?? listLine?.text ?? "";
      return [{ key: `${line.key}-item`, text }];
    });
  }
  return list.items.flatMap(markdownListItemReactMarkdownTextLines);
}

function markdownListItemReactMarkdownTextLines(item: MarkdownListItem): MarkdownLineRecord[] {
  const itemText = markdownListItemRenderText(item);
  const ownLines = itemText
    .replaceAll(looseListBreakMarker, "")
    .split("\n")
    .flatMap((text, index) => (text ? [{ key: `${item.key}-item-${index}`, text }] : []));
  const childLines = (item.children ?? []).flatMap((child) =>
    child.items.flatMap(markdownListItemReactMarkdownTextLines),
  );
  return [...ownLines, ...childLines];
}

function markdownTableCellCanUseReactMarkdown(cell: string, context?: MarkdownContext) {
  const line = { key: "table-cell", text: cell };
  const lines = [line];
  if (markdownBlockContainsRawHtmlTag(lines)) {
    return (
      markdownBlockCanUseReactMarkdownInlineRawMarkdownParagraph(lines, context) ||
      markdownBlockCanUseReactMarkdownInlineRawFormattingParagraph(lines)
    );
  }
  if (!/[<>\]&@]|\[/.test(cell)) {
    return true;
  }
  if (cell.match("\t") !== null || cell.match("\n") !== null) {
    return false;
  }
  return (
    markdownLineCanUseReactMarkdownEscapedInline(cell) ||
    markdownBlockCanUseReactMarkdownSimpleInlineLinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleInlineImageParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownWhitespaceInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lines) ||
    markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(lines) ||
    markdownBlockCanUseReactMarkdownStructuredLabelInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownSimpleTitledInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownSimpleReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownStructuredReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownMixedReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownSimpleBareAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleAngleAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownYonaAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(lines, context)
  );
}

function markdownBlockCanUseReactMarkdownSimpleTable(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  const tableSpan = parseMarkdownTableSpan(lines);
  if (!tableSpan || tableSpan.consumedLineCount !== lines.length) {
    return false;
  }
  const cells = [
    ...tableSpan.table.headers.map((cell) => cell.text),
    ...tableSpan.table.rows.flatMap((row) => row.cells.map((cell) => cell.text)),
  ];
  return cells.every((cell) => markdownTableCellCanUseReactMarkdown(cell, context));
}

function markdownBlockReactMarkdownSimpleTableNeedsRawHtml(
  lines: MarkdownLineRecord[],
  context?: MarkdownContext,
) {
  const tableSpan = parseMarkdownTableSpan(lines);
  if (
    !tableSpan ||
    tableSpan.consumedLineCount !== lines.length ||
    !markdownBlockCanUseReactMarkdownSimpleTable(lines, context)
  ) {
    return false;
  }
  const cells = [
    ...tableSpan.table.headers.map((cell) => cell.text),
    ...tableSpan.table.rows.flatMap((row) => row.cells.map((cell) => cell.text)),
  ];
  return cells.some((cell) => markdownBlockContainsRawHtmlTag([{ key: "table-cell", text: cell }]));
}

function markdownBlockCanUseReactMarkdownSimpleFencedCode(lines: MarkdownLineRecord[]) {
  if (lines.length < 2) {
    return false;
  }
  const firstLine = lines[0]?.text ?? "";
  const lastLine = lines.at(-1)?.text ?? "";
  const opening =
    /^(?<indent> {0,3})(?<fence>`{3,}|~{3,})(?:[ \t]*(?<language>[^ \t`]+)(?:[ \t]+.*)?)?[ \t]*$/.exec(
      firstLine,
    );
  if (!opening) {
    return false;
  }
  const fence = opening.groups?.fence ?? "";
  const indent = opening.groups?.indent ?? "";
  const language = opening.groups?.language ?? "";
  if (indent !== "" && !fence.startsWith("`")) {
    return false;
  }
  const hasClosingFence = new RegExp(`^ {0,3}${fence}[ \\t]*$`).test(lastLine);
  if (fence.startsWith("~") && language === "") {
    return false;
  }
  const legacyCloseFence = closingFenceFromLine(lastLine);
  const closesWithLegacyFence = Boolean(
    legacyCloseFence && closesMarkdownFence(fence, legacyCloseFence),
  );
  if (fence.startsWith("~") && !closesWithLegacyFence) {
    return false;
  }
  const contentLines = lines.slice(1, hasClosingFence || closesWithLegacyFence ? -1 : undefined);
  if (markdownBlockContainsRawHtmlBlockTag(contentLines)) {
    return false;
  }
  return contentLines.every((line) => !new RegExp(`^${fence}`).test(line.text));
}

function markdownBlockCanUseReactMarkdownSimpleIndentedCode(lines: MarkdownLineRecord[]) {
  return lines.length > 0 && lines.every((line) => /^(?: {4}|\t).*$/.test(line.text));
}

function markdownBlockCanUseReactMarkdownCompatibleBlock(
  block: MarkdownBlockRecord,
  context?: MarkdownContext,
) {
  const lines = markdownLines(block.text);
  const firstLine = lines[0]?.text ?? "";
  const secondLine = lines[1]?.text ?? "";
  return (
    (lines.length === 1 &&
      /^ {0,3}(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/.test(firstLine)) ||
    markdownBlockCanUseReactMarkdownSetextHeading(lines, context) ||
    (Boolean(parseFencedCodeBlock(lines, block.terminalNewline ?? false)) &&
      markdownBlockCanUseReactMarkdownSimpleFencedCode(lines)) ||
    (Boolean(parseIndentedCodeBlock(lines)) &&
      markdownBlockCanUseReactMarkdownSimpleIndentedCode(lines)) ||
    Boolean(
      parseMarkdownTableSpan(lines) && markdownBlockCanUseReactMarkdownSimpleTable(lines, context),
    ) ||
    markdownBlockCanUseReactMarkdownSimpleTaskList(lines, context) ||
    markdownBlockCanUseReactMarkdownSimpleList(lines, context, block.terminalNewline) ||
    markdownBlockCanUseReactMarkdownSmartList(lines, context) ||
    markdownBlockCanUseReactMarkdownRootIndentedList(lines, context) ||
    markdownBlockCanUseReactMarkdownNestedList(lines, context) ||
    markdownBlockCanUseReactMarkdownTightContinuationList(lines, context, block.terminalNewline) ||
    markdownBlockCanUseReactMarkdownLooseSimpleList(lines, context, block.terminalNewline) ||
    markdownBlockCanUseReactMarkdownLooseNestedTaskList(lines, context, block.terminalNewline) ||
    markdownBlockCanUseReactMarkdownSimpleBlockquote(lines, context) ||
    markdownBlockCanUseReactMarkdownLazyBlockquote(lines, context) ||
    markdownBlockCanUseReactMarkdownLazyBlockquoteList(lines, context) ||
    markdownBlockCanUseReactMarkdownBlockquoteBlocks(lines, context) ||
    (Boolean(/^ {0,3}(#{1,6})(?=\s|$)(.*)$/.exec(firstLine)) &&
      markdownBlockCanUseReactMarkdownAtxHeading(lines, context)) ||
    markdownBlockCanUseReactMarkdownMultilineRawInlineParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownMultilineInlineParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownSimpleInlineParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedInlineParagraph(lines) ||
    markdownBlockCanUseReactMarkdownFootnoteLine(lines) ||
    markdownBlockCanUseReactMarkdownLiteralTildeParagraph(lines) ||
    markdownBlockCanUseReactMarkdownLineStartTripleTildeText(lines) ||
    markdownBlockCanUseReactMarkdownLiteralSpacedEmphasisParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleInlineLinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleInlineImageParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownWhitespaceInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lines) ||
    markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(lines) ||
    markdownBlockCanUseReactMarkdownStructuredLabelInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownSimpleTitledInlineMediaSequence(lines) ||
    markdownBlockCanUseReactMarkdownSimpleReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownStructuredReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownMixedReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownInlineRawFormattingParagraph(lines) ||
    markdownBlockCanUseReactMarkdownInlineRawMarkdownParagraph(lines, context) ||
    markdownBlockReactMarkdownSimpleTableNeedsRawHtml(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawAnchorParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawOrderedList(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawIframe(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawVoidBlock(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawVideo(lines) ||
    markdownBlockCanUseReactMarkdownOpaqueRawPreBlock(lines) ||
    markdownBlockCanUseReactMarkdownStandaloneRawDirectiveBlock(lines) ||
    markdownBlockCanUseReactMarkdownRawCheckboxLine(lines) ||
    markdownBlockCanUseReactMarkdownSimpleBareAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleAngleAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownYonaAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lines) ||
    markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownUnresolvedYonaAutolinkParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownPlainParagraph(lines) ||
    (lines.length === 2 &&
      (/^ {0,3}=+\s*$/.test(secondLine) || /^ {0,3}-+\s*$/.test(secondLine)) &&
      markdownBlockCanUseReactMarkdownSetextHeading(lines, context))
  );
}

function markdownBlockCanUseReactMarkdownFootnoteLine(lines: MarkdownLineRecord[]) {
  return lines.some(
    (line) => /\[\^[^\]\n]+\]/.test(line.text) || /^ {0,3}\[\^[^\]\n]+\]:/.test(line.text),
  );
}

function markdownBlockIsReactMarkdownListBlock(
  block: MarkdownBlockRecord,
  context?: MarkdownContext,
) {
  const lines = markdownLines(block.text);
  return (
    markdownBlockCanUseReactMarkdownSimpleTaskList(lines, context) ||
    markdownBlockCanUseReactMarkdownSimpleList(lines, context, block.terminalNewline) ||
    markdownBlockCanUseReactMarkdownSmartList(lines, context) ||
    markdownBlockCanUseReactMarkdownRootIndentedList(lines, context) ||
    markdownBlockCanUseReactMarkdownNestedList(lines, context) ||
    markdownBlockCanUseReactMarkdownTightContinuationList(lines, context, block.terminalNewline) ||
    markdownBlockCanUseReactMarkdownLooseSimpleList(lines, context, block.terminalNewline) ||
    markdownBlockCanUseReactMarkdownLooseNestedTaskList(lines, context, block.terminalNewline)
  );
}

function markdownBlockReactMarkdownListMarker(
  block: MarkdownBlockRecord,
  context?: MarkdownContext,
) {
  if (!markdownBlockIsReactMarkdownListBlock(block, context)) {
    return undefined;
  }
  const firstLine = parseMarkdownListLine(markdownLines(block.text)[0] as MarkdownLineRecord);
  return firstLine
    ? `${firstLine.ordered ? "ordered" : "unordered"}:${firstLine.markerKind}`
    : undefined;
}

function markdownDocumentHasAdjacentReactMarkdownListBlocks(
  blocks: MarkdownBlockRecord[],
  context?: MarkdownContext,
) {
  let previousListMarker: string | undefined;
  for (const block of blocks) {
    const currentListMarker = markdownBlockReactMarkdownListMarker(block, context);
    if (previousListMarker !== undefined && currentListMarker === previousListMarker) {
      return true;
    }
    previousListMarker = currentListMarker;
  }
  return false;
}

function markdownBlockNeedsReactMarkdownRawHtml(
  block: MarkdownBlockRecord,
  context?: MarkdownContext,
) {
  const lines = markdownLines(block.text);
  return (
    markdownBlockReactMarkdownHeadingNeedsRawHtml(lines) ||
    markdownBlockCanUseReactMarkdownInlineRawFormattingParagraph(lines) ||
    markdownBlockCanUseReactMarkdownInlineRawMarkdownParagraph(lines, context) ||
    markdownBlockCanUseReactMarkdownMultilineRawInlineParagraph(lines, context) ||
    markdownBlockReactMarkdownBlockquoteNeedsRawHtml(lines, context) ||
    markdownBlockReactMarkdownListNeedsRawHtml(lines, context, block.terminalNewline) ||
    markdownBlockReactMarkdownSimpleTableNeedsRawHtml(lines, context) ||
    markdownBlockCanUseReactMarkdownSimpleRawAnchorParagraph(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawOrderedList(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawIframe(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawVoidBlock(lines) ||
    markdownBlockCanUseReactMarkdownSimpleRawVideo(lines) ||
    markdownBlockCanUseReactMarkdownOpaqueRawPreBlock(lines) ||
    markdownBlockCanUseReactMarkdownStandaloneRawDirectiveBlock(lines) ||
    markdownBlockCanUseReactMarkdownRawCheckboxLine(lines)
  );
}

function markdownDocumentCanUseReactMarkdown(
  blocks: MarkdownBlockRecord[],
  context?: MarkdownContext,
) {
  if (!blocks.every((block) => markdownBlockCanUseReactMarkdownCompatibleBlock(block, context))) {
    return false;
  }
  return !markdownDocumentHasAdjacentReactMarkdownListBlocks(blocks, context);
}

function markdownBlockContainsRawHtmlTag(lines: MarkdownLineRecord[]) {
  const tagPattern = new RegExp(String.raw`<\/?[A-Za-z][A-Za-z0-9-]*${rawHtmlAttributePattern}>`);
  return lines.some((line) => tagPattern.test(line.text));
}

function markdownBlockContainsRawHtmlBlockTag(lines: MarkdownLineRecord[]) {
  return lines.some(
    (line, index) =>
      (index === 0 && (/^ {0,3}<!--/.test(line.text) || /^ {0,3}<!\[CDATA\[/.test(line.text))) ||
      (index === 0 && markdownLineIsStandaloneRawHtmlVoidBlock(line.text)) ||
      markdownLineStartsRawHtmlBlock(line.text),
  );
}

const rawHtmlAllowedTags = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "i",
  "iframe",
  "img",
  "input",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "source",
  "span",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "u",
  "ul",
  "video",
]);

const rawHtmlVoidTags = new Set(["br", "hr", "img", "input", "source"]);
const rawHtmlStandaloneBlockVoidTags = new Set(["br", "img", "input", "source"]);
const rawHtmlInlineMarkdownTags = new Set(["b", "del", "em", "i", "s", "span", "strong", "u"]);
const rawHtmlBlockTags = new Set([
  "address",
  "article",
  "aside",
  "base",
  "basefont",
  "blockquote",
  "body",
  "caption",
  "center",
  "col",
  "colgroup",
  "dd",
  "details",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "html",
  "iframe",
  "legend",
  "li",
  "link",
  "main",
  "menu",
  "menuitem",
  "meta",
  "nav",
  "noframes",
  "ol",
  "optgroup",
  "option",
  "p",
  "param",
  "pre",
  "section",
  "source",
  "script",
  "style",
  "summary",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "title",
  "track",
  "tr",
  "ul",
]);

function markdownLineIsStandaloneRawHtmlVoidBlock(line: string) {
  const match = new RegExp(
    String.raw`^ {0,3}<([A-Za-z][A-Za-z0-9-]*)${rawHtmlAttributePattern}\/?>\s*$`,
    "i",
  ).exec(line);
  return rawHtmlStandaloneBlockVoidTags.has((match?.[1] ?? "").toLowerCase());
}

function parseRawHtmlInlineMarkdownSpan(source: string) {
  const match = new RegExp(
    String.raw`^<([A-Za-z][A-Za-z0-9-]*)(${rawHtmlAttributePattern})>([\s\S]*)<\/\1\s*>$`,
    "i",
  ).exec(source);
  if (!match) {
    return undefined;
  }
  const tag = (match[1] ?? "").toLowerCase();
  if (tag === "script" || tag === "style") {
    return undefined;
  }
  return {
    rawAttributes: match[2] ?? "",
    tag: rawHtmlAllowedTags.has(tag) || rawHtmlInlineMarkdownTags.has(tag) ? tag : undefined,
    value: match[3] ?? "",
  };
}

function rawHtmlStylePropertyName(name: string) {
  return name.replace(/-([a-z])/g, (_, letter) => String(letter).toUpperCase());
}

function rawHtmlStyleCssPropertyName(name: string) {
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function parseRawHtmlStyle(value: string): React.CSSProperties | undefined {
  const style: Record<string, string> = {};
  for (const declaration of value.split(";")) {
    const [rawProperty, ...rawValueParts] = declaration.split(":");
    if (!rawProperty || rawValueParts.length === 0) {
      continue;
    }
    const property = rawProperty.trim().toLowerCase();
    const propertyValue = rawValueParts.join(":").trim();
    if (!/^[a-z][a-z0-9-]*$/.test(property) || !propertyValue) {
      continue;
    }
    if (/url\s*\(|expression\s*\(|javascript\s*:/i.test(propertyValue)) {
      continue;
    }
    style[rawHtmlStylePropertyName(property)] = propertyValue;
  }
  return Object.keys(style).length > 0 ? (style as React.CSSProperties) : undefined;
}

function rawHtmlStyleToCssText(style: React.CSSProperties) {
  return Object.entries(style)
    .map(([name, value]) => `${rawHtmlStyleCssPropertyName(name)}:${String(value)}`)
    .join(";");
}

function parseRawHtmlAttributes(tag: string, rawAttributes: string) {
  const props: Record<string, boolean | React.CSSProperties | string | number | undefined> = {};
  for (const match of rawAttributes.matchAll(
    /([A-Za-z_:][A-Za-z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g,
  )) {
    const name = (match[1] ?? "").toLowerCase();
    const value = decodeMarkdownHtmlEntities(match[2] ?? match[3] ?? match[4] ?? "");
    if (name.startsWith("on")) {
      continue;
    }
    if (name === "class") {
      props.className = value;
      continue;
    }
    if (name === "style") {
      props.style = parseRawHtmlStyle(value);
      continue;
    }
    if (name === "id" || name === "title" || name === "name" || name === "target") {
      props[name] = value;
      continue;
    }
    if (/^data-[a-z0-9_.:-]+$/.test(name)) {
      props[name] = value;
      continue;
    }
    if ((name === "width" || name === "height") && /^\d+$/.test(value)) {
      props[name] = Number.parseInt(value, 10);
      continue;
    }
    if (tag === "ol" && name === "start" && /^\d+$/.test(value)) {
      props.start = Number.parseInt(value, 10);
      continue;
    }
    if (tag === "input" && name === "type" && value.toLowerCase() === "checkbox") {
      props.type = "checkbox";
      continue;
    }
    if (tag === "input" && (name === "checked" || name === "disabled")) {
      props[name] = true;
      if (name === "checked") {
        props.readOnly = true;
      }
      continue;
    }
    if (tag === "a" && name === "href") {
      const compact = value.replace(/[^\w:]/g, "").toLowerCase();
      props.href = compact.startsWith("javascript:")
        ? "#"
        : isSafeRawHtmlUrl(value)
          ? value
          : undefined;
      continue;
    }
    if (tag === "img" && (name === "src" || name === "alt")) {
      if (name === "src") {
        props.src = isSafeRawHtmlUrl(value) ? value : undefined;
      } else {
        props.alt = value;
      }
    }
    if (tag === "iframe" && name === "src") {
      props.src = isSafeRawHtmlUrl(value) ? value : undefined;
      continue;
    }
    if (
      tag === "iframe" &&
      (name === "frameborder" || name === "allow" || name === "allowfullscreen")
    ) {
      const propName =
        name === "frameborder"
          ? "frameBorder"
          : name === "allowfullscreen"
            ? "allowFullScreen"
            : name;
      props[propName] = value || true;
      continue;
    }
    if (tag === "video" && rawHtmlVideoLegacyAttributes.has(name)) {
      props[name] = value;
      continue;
    }
    if (tag === "video" && rawHtmlVideoBooleanAttributes.has(name)) {
      props[name === "autoplay" ? "autoPlay" : name] = true;
      continue;
    }
    if ((tag === "video" || tag === "source") && name === "src") {
      props.src = isSafeRawHtmlUrl(value) ? value : undefined;
      continue;
    }
    if (tag === "source" && (name === "type" || name === "target")) {
      props[name] = value;
    }
  }
  return props;
}

function renderRawHtmlChild(child: RawHtmlChild, key: string): React.ReactNode {
  if (typeof child === "string") {
    return child;
  }
  if (React.isValidElement(child)) {
    return React.cloneElement(child, { key });
  }
  return React.createElement(
    child.tag,
    { ...child.props, key },
    ...child.children.map((grandchild, index) => renderRawHtmlChild(grandchild, `${key}-${index}`)),
  );
}

function parseSanitizedRawHtmlTree(source: string) {
  const root: RawHtmlNode = { children: [], props: {}, tag: "fragment" };
  const stack = [root];
  const withoutDangerousBlocks = source
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")
    .replace(/<\?[\s\S]*?\?>/g, "")
    .replace(/<![A-Za-z][^<>]*>/g, "");
  const tagPattern = new RegExp(
    String.raw`<\/?([A-Za-z][A-Za-z0-9-]*)(${rawHtmlAttributePattern})\/?>`,
    "g",
  );
  let index = 0;
  for (const match of withoutDangerousBlocks.matchAll(tagPattern)) {
    const start = match.index ?? 0;
    if (start > index) {
      stack[stack.length - 1]?.children.push(
        decodeMarkdownHtmlEntities(withoutDangerousBlocks.slice(index, start)),
      );
    }
    const fullTag = match[0] ?? "";
    const tag = (match[1] ?? "").toLowerCase();
    const rawAttributes = match[2] ?? "";
    const isClosingTag = fullTag.startsWith("</");
    const isSelfClosing = /\/\s*>$/.test(fullTag) || rawHtmlVoidTags.has(tag);
    if (rawHtmlAllowedTags.has(tag)) {
      if (isClosingTag) {
        let matchingIndex = -1;
        for (let stackIndex = stack.length - 1; stackIndex > 0; stackIndex -= 1) {
          if (stack[stackIndex]?.tag === tag) {
            matchingIndex = stackIndex;
            break;
          }
        }
        if (matchingIndex > 0) {
          stack.splice(matchingIndex);
        }
      } else {
        const node = {
          children: [],
          props: parseRawHtmlAttributes(tag, rawAttributes),
          tag,
        };
        stack[stack.length - 1]?.children.push(node);
        if (!isSelfClosing) {
          stack.push(node);
        }
      }
    }
    index = start + fullTag.length;
  }
  if (index < withoutDangerousBlocks.length) {
    stack[stack.length - 1]?.children.push(
      decodeMarkdownHtmlEntities(withoutDangerousBlocks.slice(index)),
    );
  }
  return root;
}

function renderSanitizedRawHtml(source: string, keyPrefix: string) {
  const root = parseSanitizedRawHtmlTree(source);
  return (
    <>
      {root.children.map((child, childIndex) =>
        renderRawHtmlChild(child, `${keyPrefix}-raw-${childIndex}`),
      )}
    </>
  );
}

function MarkdownSanitizedRawHtml(props: { keyPrefix: string; source: string }) {
  return renderSanitizedRawHtml(props.source, props.keyPrefix);
}

function MarkdownRawHtmlBlock(props: { lines: MarkdownLineRecord[] }) {
  const source = props.lines.map((line) => line.text).join("\n");
  const keyPrefix = props.lines[0]?.key ?? "raw";
  const hasBlockTag =
    Array.from(
      source.matchAll(
        new RegExp(String.raw`<\/?([A-Za-z][A-Za-z0-9-]*)${rawHtmlAttributePattern}\/?>`, "g"),
      ),
    ).some((match) => rawHtmlBlockTags.has((match[1] ?? "").toLowerCase())) ||
    markdownLineStartsRawLineStartVoidBlock(props.lines[0]?.text ?? "") ||
    markdownLineIsStandaloneRawHtmlVoidBlock(props.lines[0]?.text ?? "");
  const children = <MarkdownSanitizedRawHtml keyPrefix={keyPrefix} source={source} />;
  return hasBlockTag ? children : <p>{children}</p>;
}

function MarkdownBlock(props: { block: MarkdownBlockRecord; context?: MarkdownContext }) {
  const lines = markdownLines(props.block.text);
  const firstLine = lines[0]?.text ?? "";
  const secondLine = lines[1]?.text ?? "";
  if (
    lines.length === 1 &&
    /^ {0,3}(?:(?:-[ \t]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})$/.test(firstLine)
  ) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSetextHeading(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownHeadingNeedsRawHtml(lines)}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (lines.length === 2 && /^ {0,3}=+\s*$/.test(secondLine)) {
    return <MarkdownHeading context={props.context} level={1} text={firstLine.trim()} />;
  }
  if (lines.length === 2 && /^ {0,3}-+\s*$/.test(secondLine)) {
    return <MarkdownHeading context={props.context} level={2} text={firstLine.trim()} />;
  }
  const codeBlock = parseFencedCodeBlock(lines, props.block.terminalNewline ?? false);
  if (codeBlock) {
    if (markdownBlockCanUseReactMarkdownSimpleFencedCode(lines)) {
      return (
        <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
      );
    }
    return (
      <pre>
        <code className={codeBlock.language}>
          {highlightCodeBlock(codeBlock.code, codeBlock.language)}
        </code>
      </pre>
    );
  }
  const indentedCodeBlock = parseIndentedCodeBlock(lines);
  if (indentedCodeBlock) {
    if (markdownBlockCanUseReactMarkdownSimpleIndentedCode(lines)) {
      return (
        <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
      );
    }
    return (
      <pre>
        <code>{indentedCodeBlock.code}</code>
      </pre>
    );
  }
  const tableSpan = parseMarkdownTableSpan(lines);
  if (tableSpan) {
    if (markdownBlockCanUseReactMarkdownSimpleTable(lines, props.context)) {
      return (
        <ReactMarkdownCompatibleBlock
          allowRawHtml={markdownBlockReactMarkdownSimpleTableNeedsRawHtml(lines, props.context)}
          context={props.context ?? {}}
          markdown={props.block.text}
        />
      );
    }
    const remainingLines = lines.slice(tableSpan.consumedLineCount);
    return (
      <>
        <MarkdownTable context={props.context} table={tableSpan.table} />
        {remainingLines.length > 0 ? (
          <MarkdownBlock
            block={{
              key: `${props.block.key}-after-table`,
              terminalNewline: props.block.terminalNewline,
              text: remainingLines.map((line) => line.text).join("\n"),
            }}
            context={props.context}
          />
        ) : null}
      </>
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleTaskList(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownListNeedsRawHtml(
          lines,
          props.context,
          props.block.terminalNewline,
        )}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (
    markdownBlockCanUseReactMarkdownSimpleList(lines, props.context, props.block.terminalNewline)
  ) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownListNeedsRawHtml(
          lines,
          props.context,
          props.block.terminalNewline,
        )}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownSmartList(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownListNeedsRawHtml(
          lines,
          props.context,
          props.block.terminalNewline,
        )}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownRootIndentedList(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownListNeedsRawHtml(
          lines,
          props.context,
          props.block.terminalNewline,
        )}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownNestedList(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownListNeedsRawHtml(
          lines,
          props.context,
          props.block.terminalNewline,
        )}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (
    markdownBlockCanUseReactMarkdownTightContinuationList(
      lines,
      props.context,
      props.block.terminalNewline,
    )
  ) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownListNeedsRawHtml(
          lines,
          props.context,
          props.block.terminalNewline,
        )}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (
    markdownBlockCanUseReactMarkdownLooseSimpleList(
      lines,
      props.context,
      props.block.terminalNewline,
    )
  ) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownListNeedsRawHtml(
          lines,
          props.context,
          props.block.terminalNewline,
        )}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  const list = parseMarkdownList(lines, props.block.terminalNewline);
  if (list) {
    return <MarkdownList context={props.context} list={list} />;
  }
  const firstListLine = parseMarkdownListLine(
    lines[0] ?? { key: `${props.block.key}-first`, text: "" },
  );
  if (
    firstListLine &&
    (firstListLine.text !== "" || lines.length > 1 || props.block.terminalNewline)
  ) {
    return (
      <MarkdownBlockSequence
        context={props.context}
        lines={lines}
        terminalNewline={props.block.terminalNewline}
      />
    );
  }
  if (rawBlockHasTrailingLinesAfterClosingTag(lines)) {
    return (
      <MarkdownBlockSequence
        context={props.context}
        lines={lines}
        terminalNewline={props.block.terminalNewline}
      />
    );
  }
  if (
    !markdownBlockContainsRawHtmlTag([lines[0] ?? { key: `${props.block.key}-first`, text: "" }]) &&
    lines.slice(1).some((line) => markdownLineStartsRawHtmlBlock(line.text))
  ) {
    return (
      <MarkdownBlockSequence
        context={props.context}
        lines={lines}
        terminalNewline={props.block.terminalNewline}
      />
    );
  }
  if (!/^ {0,3}>/.test(firstLine) && lines.length > 2 && markdownLinesContainSetextHeading(lines)) {
    return (
      <MarkdownBlockSequence
        context={props.context}
        lines={lines}
        terminalNewline={props.block.terminalNewline}
      />
    );
  }
  if (
    !/^ {0,3}>/.test(firstLine) &&
    !markdownLineStartsParagraphInterrupt(firstLine) &&
    !markdownBlockContainsRawHtmlTag([lines[0] ?? { key: `${props.block.key}-first`, text: "" }]) &&
    lines.slice(1).some((line) => markdownLineStartsParagraphInterrupt(line.text))
  ) {
    return (
      <MarkdownBlockSequence
        context={props.context}
        lines={lines}
        terminalNewline={props.block.terminalNewline}
      />
    );
  }
  const blockquote = parseMarkdownBlockquote(lines);
  if (blockquote) {
    if (
      markdownBlockCanUseReactMarkdownSimpleBlockquote(lines, props.context) ||
      markdownBlockCanUseReactMarkdownLazyBlockquote(lines, props.context) ||
      markdownBlockCanUseReactMarkdownLazyBlockquoteList(lines, props.context) ||
      markdownBlockCanUseReactMarkdownBlockquoteBlocks(lines, props.context)
    ) {
      return (
        <ReactMarkdownCompatibleBlock
          allowRawHtml={markdownBlockReactMarkdownBlockquoteNeedsRawHtml(lines, props.context)}
          context={props.context ?? {}}
          markdown={props.block.text}
        />
      );
    }
    const interruptIndex = lazyBlockquoteInterruptIndex(lines);
    if (interruptIndex !== null) {
      const blockquoteLines = lines.slice(0, interruptIndex);
      const remainingLines = lines.slice(interruptIndex);
      return (
        <>
          <MarkdownBlock
            block={{
              key: `${props.block.key}-blockquote`,
              text: blockquoteLines.map((line) => line.text).join("\n"),
            }}
            context={props.context}
          />
          <MarkdownBlock
            block={{
              key: `${props.block.key}-after-blockquote`,
              terminalNewline: props.block.terminalNewline,
              text: remainingLines.map((line) => line.text).join("\n"),
            }}
            context={props.context}
          />
        </>
      );
    }
    const rawBlockquoteText = blockquote.map((line) => line.text).join("\n");
    const rawBlockquote = markdownLines(rawBlockquoteText);
    const hasNestedBlocks =
      rawBlockquote.some((line) => markdownLineStartsBlock(line.text)) ||
      markdownLinesContainSetextHeading(rawBlockquote) ||
      markdownLinesContainBlankLine(rawBlockquote) ||
      markdownLinesContainTable(rawBlockquote);
    if (hasNestedBlocks) {
      return (
        <blockquote>
          <MarkdownBlockSequence
            context={props.context}
            lines={rawBlockquote}
            terminalNewline={props.block.terminalNewline}
          />
        </blockquote>
      );
    }
    const normalizedBlockquote = markdownLines(
      normalizeInlineLinkTitleNewlines(normalizeCodeSpanNewlines(rawBlockquoteText)),
    );
    return (
      <blockquote>
        <p>
          {normalizedBlockquote.map((line, index) => (
            <React.Fragment key={line.key}>
              {markdownLineBreakBefore(normalizedBlockquote, index, props.context?.breaks ?? true)}
              <MarkdownInline
                context={props.context}
                line={markdownLineTextBeforeBreak(
                  line,
                  index,
                  normalizedBlockquote,
                  props.context?.breaks ?? true,
                )}
              />
            </React.Fragment>
          ))}
        </p>
      </blockquote>
    );
  }
  const headingMatch = /^ {0,3}(#{1,6})(?=\s|$)(.*)$/.exec(firstLine);
  if (headingMatch && markdownBlockCanUseReactMarkdownAtxHeading(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml={markdownBlockReactMarkdownHeadingNeedsRawHtml(lines)}
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (headingMatch) {
    const headingText = (headingMatch[2] ?? "").trim();
    const trailingHashTrimmed = headingText.replace(/#+$/, "");
    const trimmedHeadingText =
      headingText.endsWith("#") && (!trailingHashTrimmed || trailingHashTrimmed.endsWith(" "))
        ? trailingHashTrimmed.trim()
        : headingText;
    return (
      <MarkdownHeading
        context={props.context}
        level={(headingMatch[1] ?? "").length}
        text={trimmedHeadingText}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownOpaqueRawPreBlock(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownStandaloneRawDirectiveBlock(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownOpaqueRawHtmlBlock(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockContainsRawHtmlBlockTag(lines)) {
    return <MarkdownRawHtmlBlock lines={lines} />;
  }
  if (markdownBlockCanUseReactMarkdownMultilineRawInlineParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownMultilineInlineParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleInlineParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownMixedInlineParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownLiteralTildeParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownLineStartTripleTildeText(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownLiteralSpacedEmphasisParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleInlineLinkParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleInlineImageParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleInlineMediaSequence(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownWhitespaceInlineMediaSequence(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownMixedInlineMediaParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownFormattedInlineMediaParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownStructuredLabelInlineMediaSequence(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleTitledInlineMediaSequence(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleReferenceParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownStructuredReferenceParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownMixedReferenceParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownFormattedReferenceParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownInlineRawFormattingParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownInlineRawMarkdownParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleRawAnchorParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleRawOrderedList(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleRawIframe(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleRawVoidBlock(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleRawVideo(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownRawCheckboxLine(lines)) {
    return (
      <ReactMarkdownCompatibleBlock
        allowRawHtml
        context={props.context ?? {}}
        markdown={props.block.text}
      />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleBareAutolinkParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownSimpleAngleAutolinkParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownYonaAutolinkParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownMixedBareUrlParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownMixedAngleAutolinkParagraph(lines)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownMixedYonaAutolinkParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownUnresolvedYonaAutolinkParagraph(lines, props.context)) {
    return (
      <ReactMarkdownCompatibleBlock context={props.context ?? {}} markdown={props.block.text} />
    );
  }
  if (markdownBlockCanUseReactMarkdownPlainParagraph(lines)) {
    return (
      <ReactMarkdownPlainParagraph
        breaks={props.context?.breaks ?? true}
        markdown={props.block.text}
      />
    );
  }
  const normalizedLines = markdownLines(
    normalizeInlineLinkTitleNewlines(normalizeCodeSpanNewlines(props.block.text)),
  );
  return (
    <p>
      {normalizedLines.map((line, index) => (
        <React.Fragment key={line.key}>
          {markdownLineBreakBefore(normalizedLines, index, props.context?.breaks ?? true)}
          <MarkdownInline
            context={props.context}
            line={markdownLineTextBeforeBreak(
              line,
              index,
              normalizedLines,
              props.context?.breaks ?? true,
            )}
          />
        </React.Fragment>
      ))}
    </p>
  );
}

export function MarkdownRenderer(props: {
  basePath?: string;
  className?: string;
  commitReferences?: MarkdownCommitReference[];
  containerElement?: "div" | "fragment" | "span";
  currentUserLabel?: string;
  currentUserLoginId?: string;
  "data-allowed-update"?: string;
  "data-via-email"?: string;
  id?: string;
  issueReferences?: MarkdownIssueReference[];
  markdown: string;
  mentionReferences?: MarkdownMentionReference[];
  ownerName?: string;
  projectName?: string;
  breaks?: boolean;
  onTasklistToggle?: MarkdownTasklistToggleHandler;
  showTasklistBar?: boolean;
  tasklistSourceMarkdown?: string;
}) {
  const parsedMarkdown = extractReferenceDefinitions(props.markdown);
  const blocks = paragraphBlocks(parsedMarkdown.markdown);
  const taskStats = props.showTasklistBar ? markdownTaskStats(parsedMarkdown.markdown) : null;
  const breaks =
    props.breaks ?? !props.className?.split(/\s+/).some((className) => className === "readme-body");
  const issueReferenceMap = new Map(
    (props.issueReferences ?? []).map((reference) => [
      `${reference.ownerName}/${reference.projectName}#${reference.issueNumber}`,
      reference,
    ]),
  );
  const commitReferenceMap = new Map(
    (props.commitReferences ?? []).map((reference) => [
      commitReferenceKey(reference.ownerName, reference.projectName, reference.commitId),
      reference,
    ]),
  );
  const mentionReferenceMap =
    props.mentionReferences === undefined ? undefined : new Map<string, MarkdownMentionReference>();
  if (mentionReferenceMap) {
    for (const reference of props.mentionReferences ?? []) {
      const key =
        reference.kind === "project"
          ? `${reference.ownerName ?? ""}/${reference.projectName ?? ""}`
          : (reference.loginId ?? "");
      if (key) {
        mentionReferenceMap.set(key.toLowerCase(), reference);
      }
    }
  }
  const context = {
    basePath: props.basePath,
    breaks,
    commitReferenceMap,
    currentUserLabel: props.currentUserLabel,
    currentUserLoginId: props.currentUserLoginId,
    headingSlugCounts: new Map<string, number>(),
    issueReferenceMap,
    mentionReferenceMap,
    ownerName: props.ownerName,
    projectName: props.projectName,
    reactMarkdownReferenceDefinitions: reactMarkdownReferenceDefinitions(
      parsedMarkdown.referenceMap,
    ),
    referenceMap: parsedMarkdown.referenceMap,
    taskCheckboxIndex: { current: 0 },
    taskCheckboxDisabled: props["data-allowed-update"] !== "true",
    tasklistSourceMarkdown: props.tasklistSourceMarkdown ?? props.markdown,
    onTasklistToggle: props.onTasklistToggle,
  };
  const Container = props.containerElement ?? "div";
  if (blocks.length === 0) {
    if (Container === "fragment") {
      return null;
    }
    return (
      <Container
        className={props.className}
        data-allowed-update={props["data-allowed-update"]}
        data-via-email={props["data-via-email"]}
        id={props.id}
      />
    );
  }
  const canRenderDocumentWithReactMarkdown = markdownDocumentCanUseReactMarkdown(blocks, context);
  const documentNeedsReactMarkdownRawHtml = blocks.some((block) =>
    markdownBlockNeedsReactMarkdownRawHtml(block, context),
  );

  return (
    <>
      {taskStats ? <MarkdownTasklistBar stats={taskStats} /> : null}
      {Container === "fragment" ? (
        canRenderDocumentWithReactMarkdown ? (
          <ReactMarkdownCompatibleBlock
            allowRawHtml={documentNeedsReactMarkdownRawHtml}
            context={context}
            markdown={parsedMarkdown.markdown}
          />
        ) : (
          blocks.map((block) => <MarkdownBlock block={block} context={context} key={block.key} />)
        )
      ) : (
        <Container
          className={props.className}
          data-allowed-update={props["data-allowed-update"]}
          data-via-email={props["data-via-email"]}
          id={props.id}
        >
          {canRenderDocumentWithReactMarkdown ? (
            <ReactMarkdownCompatibleBlock
              allowRawHtml={documentNeedsReactMarkdownRawHtml}
              context={context}
              markdown={parsedMarkdown.markdown}
            />
          ) : (
            blocks.map((block) => <MarkdownBlock block={block} context={context} key={block.key} />)
          )}
        </Container>
      )}
    </>
  );
}

export function LegacyMarkdownHelp(props: { messages?: LegacyMessageLookup } = {}) {
  const { t: runtimeMessages } = useLegacyMessages();
  const messages = props.messages ?? runtimeMessages;
  const sections = [
    {
      input: "# This is an H1\n## This is an H2\n### This is an H3",
      label: "Header",
      target: "markdownHeaders",
    },
    {
      input: "*This is an italic*\n**This is an bold**\n~~This is an strike~~",
      label: "Text Style",
      target: "markdownStyling",
    },
    {
      input: '[Site](http://yobi.io/ "Yobi Site")\n\nhttp://yobi.io/',
      label: "Link",
      target: "markdownLinks",
    },
    {
      input: "- Red\n    1. White\n    2. Blue\n- Green.",
      outputMarkdown: "- Red\n    1. White\n    2. Blue\n- Green",
      label: "List",
      target: "markdownLists",
    },
    {
      input: "- [ ] Todos\n    - [x] To do A\n    - [ ] To do B\n    - [ ] To do C",
      label: "Checklist",
      outputElement: (
        <div className="markdown-wrap">
          <ul>
            <li>
              <input type="checkbox" /> Todos
              <ul>
                <li>
                  <input checked readOnly type="checkbox" /> To do A
                </li>
                <li>
                  <input type="checkbox" /> To do B
                </li>
                <li>
                  <input type="checkbox" /> To do C
                </li>
              </ul>
            </li>
          </ul>
        </div>
      ),
      target: "markdownTaskList",
    },
    {
      input: '![title](https://repo.yona.io/assets/images/ico-like-small.png "Yobi")',
      outputMarkdown: '![title](/assets/images/ico-like-small.png "Yobi")',
      label: "Image",
      target: "markdownImages",
    },
    {
      input:
        "> Lorem ipsum dolor sit amet, consectetuer adipiscing elit.\n>\n> Aenean commodo ligula eget dolor.",
      label: "Blockquote",
      target: "markdownBlockquotes",
    },
    {
      input:
        '`function test() {console.log("hello world");}`\n\n```javascript\nfunction test() {\n  console.log("hello world");\n}\n```',
      label: "Code",
      target: "markdownCodes",
    },
    {
      input:
        "| Default      | Align center | Align right |\n| ------------ | :----------: | ------: |\n| Carrot       | Red          | 1,000   |\n| Banana       | Yellow       | 32,000  |\n\nAlso, you can copy & paste table from excel sheet",
      label: "Table",
      target: "markdownTables",
    },
  ];
  return (
    <div className="markdown-help">
      <ul className="markdown-help-nav">
        <li>
          <span className="label">{legacyMessage(messages, "title.markdown.help")}</span>
        </li>
        {[...sections, { label: "Short Link", target: "markdownShortLinks" }].map((section) => (
          <li
            className="help-nav"
            data-target={section.target}
            data-toggle="markdown-help"
            key={section.target}
          >
            {section.label}
          </li>
        ))}
      </ul>
      <ul className="markdown-help-wrap">
        {sections.map((section) => (
          <li className={`markdown-help-item ${section.target}`} key={section.target}>
            <div className="row-fluid thead">
              <div className="span6">Markdown Input</div>
              <div className="span6">Markdown Output</div>
            </div>
            <div className="row-fluid markdwon-syntax-wrap">
              <div className="span6 markdwon-syntax">
                <pre>{section.input}</pre>
              </div>
              <div className="span6">
                {section.outputElement ?? (
                  <MarkdownRenderer
                    className="markdown-wrap"
                    markdown={section.outputMarkdown ?? section.input}
                  />
                )}
              </div>
            </div>
          </li>
        ))}
        <li className="markdown-help-item markdownShortLinks">
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre>
                {
                  "Issue no: #2\nMention: @yobi\ncommit: @763575 or @763575f177a4ce8b9370954de3ea1a1410205593"
                }
              </pre>
            </div>
            <div className="span6">
              <div className="markdown-wrap">
                <p>
                  Issue no: <a href="http://demo.yobi.io/yobi/yobi/issue/2">#2</a>
                </p>
                <p>
                  Mention: <a href="http://demo.yobi.io/yobi">@yobi</a>
                </p>
                <p>
                  commit: <a href="http://demo.yobi.io/yobi/yobi/commit/763575">@763575</a> or{" "}
                  <a href="http://demo.yobi.io/yobi/yobi/commit/763575f177a4ce8b9370954de3ea1a1410205593">
                    @763575
                  </a>
                </p>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

export function LegacyMarkdownEditorShell(props: {
  children: React.ReactNode;
  editorMode?: string;
  editId: string;
  messages?: LegacyMessageLookup;
  previewId: string;
  viaEmail?: boolean;
}) {
  const { t: runtimeMessages } = useLegacyMessages();
  const messages = props.messages ?? runtimeMessages;
  const editorMode = props.editorMode ?? "content-body";
  return (
    <div data-toggle="markdown-editor" className="mt10">
      <ul className="nav nav-tabs nm small">
        <li className="active">
          <a href={`#${props.editId}`} data-toggle="tab" data-mode="edit">
            {messages("common.editor.edit", { fallback: "common.editor.edit" })}
          </a>
        </li>
        <li>
          <a href={`#${props.previewId}`} data-toggle="tab" data-mode="preview">
            {messages("common.editor.preview", { fallback: "common.editor.preview" })}
          </a>
        </li>
        <li>
          <div className="task-list-button">
            <button
              className="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"
              onClick={(event) => addLegacyTasklistTemplateFromButton(event.currentTarget)}
              type="button"
            >
              <i className="yobicon-list task-list-icon"></i>{" "}
              {messages("button.add.checklist", { fallback: "button.add.checklist" })}
            </button>
          </div>
        </li>
        <li>
          <div className="editor-clear-temporary">
            <div className="editor-clear-temporary-button">
              <button
                className="ybtn ybtn-small ybtn-warning"
                id="button-clear-temporary"
                type="button"
              >
                {messages("button.clear.temporary", { fallback: "button.clear.temporary" })}
              </button>
            </div>
          </div>
        </li>
        <li>
          <div className="editor-notice-label"></div>
        </li>
      </ul>
      <div className="tab-content" style={{ overflow: "visible", position: "relative" }}>
        <LegacyMarkdownHelp messages={messages} />
        <div className="tab-pane active" id={props.editId}>
          <div className="textarea-box">{props.children}</div>
        </div>
        <div className="tab-pane" id={props.previewId}>
          <div
            className={`markdown-preview markdown-wrap ${editorMode}`}
            data-via-email={props.viaEmail ? "true" : "false"}
          ></div>
        </div>
        <div className="notification-receiver">
          <span className="notification-receiver-title">
            {legacyMessage(messages, "notification.receiver.list.title")}
          </span>
          <span className="notification-receiver-list"></span>
        </div>
      </div>
    </div>
  );
}
