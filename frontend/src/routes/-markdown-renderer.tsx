import * as React from "react";

type MarkdownInlinePart =
  | { kind: "code"; key: string; value: string }
  | { kind: "delete"; key: string; value: string }
  | { kind: "emphasis"; key: string; value: string }
  | { kind: "escape"; key: string; value: string }
  | { kind: "image"; key: string; label: string; target: string; title?: string }
  | {
      kind: "link";
      className?: string;
      issueState?: string;
      key: string;
      label: string;
      target: string;
      title?: string;
    }
  | { kind: "strong"; key: string; value: string }
  | { kind: "text"; key: string; value: string };

type MarkdownIssueReference = {
  issueNumber: number;
  ownerName: string;
  projectName: string;
  state?: string;
  title?: string;
};

type MarkdownReferenceDefinition = {
  target: string;
  title?: string;
};

type MarkdownContext = {
  basePath?: string;
  breaks?: boolean;
  issueReferenceMap?: Map<string, MarkdownIssueReference>;
  ownerName?: string;
  projectName?: string;
  referenceMap?: Map<string, MarkdownReferenceDefinition>;
};

type MarkdownBlockRecord = {
  key: string;
  text: string;
};

type MarkdownLineRecord = {
  key: string;
  text: string;
};

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
  key: string;
  task: boolean;
  text: string;
};

type MarkdownListRecord = {
  items: MarkdownListItem[];
  ordered: boolean;
  start?: number;
};

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

function isSafeUrl(value: string) {
  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("ftp://") ||
    value.startsWith("mailto:")
  );
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

function normalizeReferenceLabel(label: string) {
  return unescapeMarkdownPunctuation(label).trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeInlineTarget(target: string) {
  const trimmed = target.trim();
  const unwrapped =
    trimmed.startsWith("<") && trimmed.endsWith(">") ? trimmed.slice(1, -1) : trimmed;
  return unescapeMarkdownPunctuation(unwrapped);
}

const referenceLabelPattern = String.raw`(?:\\[\[\]]|[^\[\]])+`;
const escapedMarkdownPunctuationClass = "[!\"#$%&'()*+,\\-./:;<=>?@[\\]\\\\^_`{|}~]";
const referenceTargetPattern = `<[^>\\s]+>|(?:\\\\${escapedMarkdownPunctuationClass}|[^\\s>\\\\])+`;
const referenceLabelOnlyPattern = new RegExp(`^ {0,3}\\[${referenceLabelPattern}\\]:\\s*$`);
const referenceTargetOnlyPattern = new RegExp(
  `^ {0,3}\\[${referenceLabelPattern}\\]:\\s*(?:${referenceTargetPattern})\\s*$`,
);
const referenceTitleOnlyPattern =
  /^\s*(?:"(?:\\"|[^"\\])*"|'(?:\\'|[^'\\])*'|\((?:\\\)|[^)\\])*\))\s*$/;
const referenceDefinitionPattern = new RegExp(
  `^ {0,3}\\[(${referenceLabelPattern})\\]:\\s*(${referenceTargetPattern})(?:\\s+(?:"((?:\\\\"|[^"\\\\])*)"|'((?:\\\\'|[^'\\\\])*)'|\\(((?:\\\\\\)|[^)\\\\])*)\\)))?\\s*$`,
);

const openingFencePattern = /^ {0,3}(`{3,}|~{3,})(?:\s+([A-Za-z0-9_+.-]+)(?:\s+.*)?)?\s*$/;

function openingFenceFromLine(line: string): string {
  return openingFencePattern.exec(line)?.[1] ?? "";
}

function closingFenceFromLine(line: string): string {
  return /^ {0,3}(`+|~+)\s*$/.exec(line)?.[1] ?? "";
}

function closesMarkdownFence(openFence: string, closeFence: string): boolean {
  return closeFence.length >= openFence.length && closeFence.at(0) === openFence.at(0);
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
    const candidateWithTitle =
      index < lines.length - 1 &&
      candidateLine === line &&
      referenceTargetOnlyPattern.test(line) &&
      referenceTitleOnlyPattern.test(nextLine)
        ? `${line} ${nextLine.trim()}`
        : candidateLine;
    const match = referenceDefinitionPattern.exec(candidateWithTitle);
    if (!match) {
      markdownLines.push(line);
      continue;
    }
    const target = normalizeInlineTarget(match[2] ?? "");
    if (!isSafeUrl(target)) {
      markdownLines.push(line);
      continue;
    }
    const label = normalizeReferenceLabel(match[1] ?? "");
    if (referenceMap.has(label)) {
      continue;
    }
    const title = match[3] ?? match[4] ?? match[5];
    referenceMap.set(label, {
      target,
      title: title === undefined ? undefined : unescapeMarkdownPunctuation(title),
    });
    if (candidateWithTitle !== line) {
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

function splitBareAutolinkToken(token: string) {
  let label = token;
  let suffix = "";
  while (/[?!.,:;*_~)]$/.test(label)) {
    const last = label.at(-1) ?? "";
    if (last === ")") {
      const openCount = (label.match(/\(/g) ?? []).length;
      const closeCount = (label.match(/\)/g) ?? []).length;
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
  let text = value.replace(/\n/g, " ");
  if (/[^ ]/.test(text) && text.startsWith(" ") && text.endsWith(" ")) {
    text = text.slice(1, -1);
  }
  return text;
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

function markdownLineTextBeforeBreak(
  line: MarkdownLineRecord,
  index: number,
  lines: MarkdownLineRecord[],
) {
  if (index >= lines.length - 1) {
    return line.text;
  }
  return line.text.replace(/(?: {2,}|\\)$/, "");
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
  return breaks || /(?: {2,}|\\)$/.test(previousLine) ? <br /> : "\n";
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
  const autolinkPattern =
    /(^|[^\w/@#.-])(<(?:https?:\/\/[^\s<>]+|ftp:\/\/[^\s<>]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>|@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+|@[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[0-9]+|[A-Za-z0-9_.-]+#[0-9]+|#[0-9]+|https?:\/\/[^\s<]+|ftp:\/\/[^\s<]+|www\.[^\s<]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
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
    if (/^<.+>$/.test(token)) {
      const label = token.slice(1, -1);
      const target = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(label)
        ? `mailto:${label}`
        : label;
      parts.push({ kind: "link", key, label, target });
    } else if (/^@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(token)) {
      const projectPath = token.slice(1);
      parts.push({
        className: "no-text-decoration project-link",
        kind: "link",
        key,
        label: token,
        target: `${basePath}/${projectPath}`,
      });
    } else if (token.startsWith("@") && token.length > 1) {
      const loginId = token.slice(1);
      parts.push({
        className: "no-text-decoration user-link",
        kind: "link",
        key,
        label: token,
        target: `${basePath}/${loginId}`,
      });
    } else if (token.startsWith("#") && ownerName && projectName) {
      const issueNumber = Number.parseInt(token.slice(1), 10);
      const reference = issueReferenceFor(context, ownerName, projectName, issueNumber);
      parts.push({
        className: "issueLink",
        issueState: reference?.state,
        kind: "link",
        key,
        label: token,
        target: `${basePath}/${ownerName}/${projectName}/issue/${issueNumber}`,
        title: reference?.title,
      });
    } else if (token.startsWith("#")) {
      parts.push({ kind: "text", key, value: token });
    } else if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[0-9]+$/.test(token)) {
      const pathIssueMatch = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#([0-9]+)$/.exec(token);
      const referenceOwner = pathIssueMatch?.[1] ?? "";
      const referenceProject = pathIssueMatch?.[2] ?? "";
      const issueNumber = Number.parseInt(pathIssueMatch?.[3] ?? "", 10);
      if (referenceOwner && referenceProject && Number.isFinite(issueNumber)) {
        const reference = issueReferenceFor(context, referenceOwner, referenceProject, issueNumber);
        parts.push({
          className: "issueLink",
          issueState: reference?.state,
          kind: "link",
          key,
          label: token,
          target: `${basePath}/${referenceOwner}/${referenceProject}/issue/${issueNumber}`,
          title: reference?.title,
        });
      } else {
        parts.push({ kind: "text", key, value: token });
      }
    } else if (/^[A-Za-z0-9_.-]+#[0-9]+$/.test(token) && projectName) {
      const ownerIssueMatch = /^([A-Za-z0-9_.-]+)#([0-9]+)$/.exec(token);
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
      const target = label.startsWith("www.")
        ? `http://${label}`
        : /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(label)
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

function parseInlineMarkdown(line: string, context?: MarkdownContext): MarkdownInlinePart[] {
  const parts: MarkdownInlinePart[] = [];
  let index = 0;
  const inlinePattern =
    /\\([^\w\s])|(!?)\[([^\]]*)\]\((<[^>\s]+>|(?:\\[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]|[^)\\\s])+)(?:\s+(?:"((?:\\"|[^"\\])*)"|'((?:\\'|[^'\\])*)'|\(((?:\\\)|[^)\\])*)\)))?\)|(!?)\[((?:\\(?:\[|\])|[^\]\\[])+)\]\[((?:\\(?:\[|\])|[^\]\\[])*)\]|(!?)\[((?:\\(?:\[|\])|[^\]\\[])+)\](?:\[\])?|\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|(?<codeFence>`+)(?<codeText>[^`]|[^`][\s\S]*?[^`])\k<codeFence>(?!`)|\*([^*\n]+)\*|_([^_\n]+)_/g;
  for (const match of line.matchAll(inlinePattern)) {
    const start = match.index ?? 0;
    if (start > index) {
      parts.push(...parseTextWithAutolinks(line.slice(index, start), `text-${index}`, context));
    }
    const inlineTarget = normalizeInlineTarget(match[4] ?? "");
    const inlineTitle = match[5] ?? match[6] ?? match[7];
    if (match[1] !== undefined) {
      parts.push({ kind: "escape", key: `escape-${start}`, value: match[1] ?? "" });
    } else if (isSafeUrl(inlineTarget)) {
      parts.push({
        kind: match[2] === "!" ? "image" : "link",
        key: `link-${start}`,
        label: match[3] ?? "",
        target: inlineTarget,
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
    } else if (match[13] !== undefined) {
      parts.push({ kind: "strong", key: `strong-${start}`, value: match[13] ?? "" });
    } else if (match[14] !== undefined) {
      parts.push({ kind: "delete", key: `delete-${start}`, value: match[14] ?? "" });
    } else if (match.groups?.codeText !== undefined) {
      parts.push({
        kind: "code",
        key: `code-${start}`,
        value: normalizeCodeSpan(match.groups.codeText),
      });
    } else if (match[17] !== undefined || match[18] !== undefined) {
      parts.push({
        kind: "emphasis",
        key: `emphasis-${start}`,
        value: match[17] ?? match[18] ?? "",
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

function MarkdownInline(props: { context?: MarkdownContext; line: string }) {
  return parseInlineMarkdown(props.line, props.context).map((part) => {
    if (part.kind === "image") {
      return <img alt={part.label} key={part.key} src={part.target} title={part.title} />;
    }
    if (part.kind === "link") {
      return (
        <a
          className={part.className}
          data-issue-state={part.issueState}
          href={part.target}
          key={part.key}
          title={part.title}
        >
          {part.label || part.target}
        </a>
      );
    }
    if (part.kind === "strong") {
      return <strong key={part.key}>{part.value}</strong>;
    }
    if (part.kind === "code") {
      return <code key={part.key}>{part.value}</code>;
    }
    if (part.kind === "delete") {
      return <del key={part.key}>{part.value}</del>;
    }
    if (part.kind === "emphasis") {
      return <em key={part.key}>{part.value}</em>;
    }
    if (part.kind === "escape") {
      return <React.Fragment key={part.key}>{part.value}</React.Fragment>;
    }
    return <React.Fragment key={part.key}>{part.value}</React.Fragment>;
  });
}

function paragraphBlocks(markdown: string): MarkdownBlockRecord[] {
  const normalized = markdown.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, "");
  if (!normalized) {
    return [];
  }
  const blocks: MarkdownBlockRecord[] = [];
  let offset = 0;
  for (const text of normalized.split(/\n{2,}/)) {
    blocks.push({ key: `block-${offset}`, text });
    offset += text.length + 2;
  }
  return blocks;
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

function splitTableRow(line: string): string[] {
  const protectedPipe = "\u0000";
  const protectedLine = line.replace(/\\\|/g, protectedPipe);
  return protectedLine
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.replaceAll(protectedPipe, "|").trim());
}

function tableAlignment(separator: string): MarkdownTableCell["align"] {
  const left = separator.startsWith(":");
  const right = separator.endsWith(":");
  if (left && right) {
    return "center";
  }
  if (left) {
    return "left";
  }
  if (right) {
    return "right";
  }
  return undefined;
}

function parseMarkdownTable(lines: MarkdownLineRecord[]): MarkdownTableRecord | null {
  if (lines.length < 2) {
    return null;
  }
  const header = splitTableRow(lines[0]?.text ?? "");
  const separator = splitTableRow(lines[1]?.text ?? "");
  if (header.length === 0 || separator.length !== header.length) {
    return null;
  }
  if (!separator.every((cell) => /^:?-{3,}:?$/.test(cell))) {
    return null;
  }
  const headers = header.map((text, columnIndex) => ({
    align: tableAlignment(separator[columnIndex] ?? ""),
    key: `${lines[0]?.key ?? "header"}-${columnIndex}-${text}`,
    text,
  }));
  const rows: MarkdownTableRow[] = [];
  for (const line of lines.slice(2)) {
    const cells = splitTableRow(line.text);
    if (cells.length <= 1) {
      continue;
    }
    rows.push({
      cells: headers.map((headerCell, columnIndex) => ({
        align: headerCell.align,
        key: `${line.key}-${headerCell.key}`,
        text: cells[columnIndex] ?? "",
      })),
      key: line.key,
    });
  }
  return { headers, rows };
}

function parseMarkdownList(lines: MarkdownLineRecord[]): MarkdownListRecord | null {
  if (lines.length === 0) {
    return null;
  }
  const unorderedItems: MarkdownListItem[] = [];
  const orderedItems: MarkdownListItem[] = [];
  for (const line of lines) {
    const unorderedMatch = /^\s*[-*+]\s+(.+)$/.exec(line.text);
    if (unorderedMatch) {
      unorderedItems.push(parseMarkdownListItem(line.key, unorderedMatch[1] ?? ""));
      continue;
    }
    const orderedMatch = /^\s*(\d+)[.)]\s+(.+)$/.exec(line.text);
    if (orderedMatch) {
      orderedItems.push(parseMarkdownListItem(line.key, orderedMatch[2] ?? ""));
      continue;
    }
    return null;
  }
  if (unorderedItems.length === lines.length) {
    return { items: unorderedItems, ordered: false };
  }
  if (orderedItems.length === lines.length) {
    const firstOrderedMatch = /^\s*(\d+)[.)]/.exec(lines[0]?.text ?? "");
    const start = Number.parseInt(firstOrderedMatch?.[1] ?? "1", 10);
    return { items: orderedItems, ordered: true, start };
  }
  return null;
}

function parseMarkdownListItem(key: string, rawText: string): MarkdownListItem {
  const taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(rawText);
  if (!taskMatch) {
    return { key, task: false, text: rawText };
  }
  return {
    checked: (taskMatch[1] ?? "").toLowerCase() === "x",
    key,
    task: true,
    text: taskMatch[2] ?? "",
  };
}

function markdownTaskStats(markdown: string): MarkdownTaskStats | null {
  let checked = 0;
  let total = 0;
  for (const match of markdown.matchAll(/^[ ]*[-+*]\s+\[([ xX]?)\][ ]?.+$/gm)) {
    total += 1;
    if ((match[1] ?? "").toLowerCase() === "x") {
      checked += 1;
    }
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

function parseMarkdownBlockquote(lines: MarkdownLineRecord[]): MarkdownBlockquoteRecord[] | null {
  if (lines.length === 0) {
    return null;
  }
  const quoteLines: MarkdownBlockquoteRecord[] = [];
  for (const line of lines) {
    const match = /^\s*>\s?(.*)$/.exec(line.text);
    if (!match) {
      return null;
    }
    quoteLines.push({ key: line.key, text: match[1] ?? "" });
  }
  return quoteLines;
}

function parseFencedCodeBlock(lines: MarkdownLineRecord[]): MarkdownCodeBlockRecord | null {
  if (lines.length < 2) {
    return null;
  }
  const openMatch = openingFencePattern.exec(lines[0]?.text ?? "");
  const fence = openMatch?.[1] ?? "";
  const closeFence = closingFenceFromLine(lines[lines.length - 1]?.text ?? "");
  if (!openMatch || !closesMarkdownFence(fence, closeFence)) {
    return null;
  }
  return {
    code: lines
      .slice(1, -1)
      .map((line) => line.text)
      .join("\n"),
    language: openMatch[2],
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
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^a-z0-9가-힣._ -]+/g, "")
    .replace(/\s+/g, "-");
}

function MarkdownHeading(props: { context?: MarkdownContext; level: number; text: string }) {
  const id = slugifyHeadingId(props.text);
  const children = <MarkdownInline context={props.context} line={props.text} />;
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

function MarkdownBlock(props: { block: MarkdownBlockRecord; context?: MarkdownContext }) {
  const lines = markdownLines(props.block.text);
  const firstLine = lines[0]?.text ?? "";
  const secondLine = lines[1]?.text ?? "";
  if (lines.length === 1 && /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(firstLine)) {
    return <hr />;
  }
  if (lines.length === 2 && /^=+\s*$/.test(secondLine)) {
    return <MarkdownHeading context={props.context} level={1} text={firstLine.trim()} />;
  }
  if (lines.length === 2 && /^-+\s*$/.test(secondLine)) {
    return <MarkdownHeading context={props.context} level={2} text={firstLine.trim()} />;
  }
  const codeBlock = parseFencedCodeBlock(lines);
  if (codeBlock) {
    return (
      <pre>
        <code className={codeBlock.language}>{codeBlock.code}</code>
      </pre>
    );
  }
  const indentedCodeBlock = parseIndentedCodeBlock(lines);
  if (indentedCodeBlock) {
    return (
      <pre>
        <code>{indentedCodeBlock.code}</code>
      </pre>
    );
  }
  const table = parseMarkdownTable(lines);
  if (table) {
    return (
      <table>
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th align={header.align} key={header.key}>
                <MarkdownInline context={props.context} line={header.text} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell) => (
                <td align={cell.align} key={cell.key}>
                  <MarkdownInline context={props.context} line={cell.text} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  const list = parseMarkdownList(lines);
  if (list) {
    const children = list.items.map((item) => (
      <li className={item.task ? "task-list-item" : undefined} key={item.key}>
        {item.task ? (
          <input
            checked={item.checked}
            className="task-list-item-checkbox"
            disabled
            readOnly
            type="checkbox"
          />
        ) : null}
        {item.task ? " " : null}
        <MarkdownInline context={props.context} line={item.text} />
      </li>
    ));
    return list.ordered ? (
      <ol start={list.start && list.start !== 1 ? list.start : undefined}>{children}</ol>
    ) : (
      <ul>{children}</ul>
    );
  }
  const blockquote = parseMarkdownBlockquote(lines);
  if (blockquote) {
    const normalizedBlockquote = markdownLines(
      normalizeCodeSpanNewlines(blockquote.map((line) => line.text).join("\n")),
    );
    return (
      <blockquote>
        <p>
          {normalizedBlockquote.map((line, index) => (
            <React.Fragment key={line.key}>
              {markdownLineBreakBefore(normalizedBlockquote, index, props.context?.breaks ?? true)}
              <MarkdownInline
                context={props.context}
                line={markdownLineTextBeforeBreak(line, index, normalizedBlockquote)}
              />
            </React.Fragment>
          ))}
        </p>
      </blockquote>
    );
  }
  const headingMatch = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(firstLine);
  if (headingMatch) {
    return (
      <MarkdownHeading
        context={props.context}
        level={(headingMatch[1] ?? "").length}
        text={(headingMatch[2] ?? "").trim()}
      />
    );
  }
  const normalizedLines = markdownLines(normalizeCodeSpanNewlines(props.block.text));
  return (
    <p>
      {normalizedLines.map((line, index) => (
        <React.Fragment key={line.key}>
          {markdownLineBreakBefore(normalizedLines, index, props.context?.breaks ?? true)}
          <MarkdownInline
            context={props.context}
            line={markdownLineTextBeforeBreak(line, index, normalizedLines)}
          />
        </React.Fragment>
      ))}
    </p>
  );
}

export function MarkdownRenderer(props: {
  basePath?: string;
  className?: string;
  "data-allowed-update"?: string;
  "data-via-email"?: string;
  id?: string;
  issueReferences?: MarkdownIssueReference[];
  markdown: string;
  ownerName?: string;
  projectName?: string;
  breaks?: boolean;
  showTasklistBar?: boolean;
}) {
  const parsedMarkdown = extractReferenceDefinitions(props.markdown);
  const blocks = paragraphBlocks(parsedMarkdown.markdown);
  const taskStats = props.showTasklistBar ? markdownTaskStats(parsedMarkdown.markdown) : null;
  const breaks = props.breaks ?? !props.className?.split(/\s+/).includes("readme-body");
  const issueReferenceMap = new Map(
    (props.issueReferences ?? []).map((reference) => [
      `${reference.ownerName}/${reference.projectName}#${reference.issueNumber}`,
      reference,
    ]),
  );
  const context = {
    basePath: props.basePath,
    breaks,
    issueReferenceMap,
    ownerName: props.ownerName,
    projectName: props.projectName,
    referenceMap: parsedMarkdown.referenceMap,
  };
  if (blocks.length === 0) {
    return (
      <div
        className={props.className}
        data-allowed-update={props["data-allowed-update"]}
        data-via-email={props["data-via-email"]}
        id={props.id}
      />
    );
  }

  return (
    <>
      {taskStats ? <MarkdownTasklistBar stats={taskStats} /> : null}
      <div
        className={props.className}
        data-allowed-update={props["data-allowed-update"]}
        data-via-email={props["data-via-email"]}
        id={props.id}
      >
        {blocks.map((block) => (
          <MarkdownBlock block={block} context={context} key={block.key} />
        ))}
      </div>
    </>
  );
}
