import * as React from "react";

import { highlightCodeBlock } from "./-syntax-highlighting";

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

type MarkdownCommitReference = {
  commitId: string;
  ownerName: string;
  projectName: string;
  title?: string;
};

type MarkdownMentionReference = {
  kind: string;
  label?: string;
  loginId?: string;
  ownerName?: string;
  projectName?: string;
};

type MarkdownReferenceDefinition = {
  target: string;
  title?: string;
};

type MarkdownContext = {
  basePath?: string;
  breaks?: boolean;
  commitReferenceMap?: Map<string, MarkdownCommitReference>;
  issueReferenceMap?: Map<string, MarkdownIssueReference>;
  mentionReferenceMap?: Map<string, MarkdownMentionReference>;
  ownerName?: string;
  projectName?: string;
  referenceMap?: Map<string, MarkdownReferenceDefinition>;
};

type MarkdownBlockRecord = {
  key: string;
  terminalNewline?: boolean;
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
  children?: MarkdownListRecord[];
  key: string;
  loose?: boolean;
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
  kind: "item";
  indent: number;
  key: string;
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

function isSafeUrl(value: string) {
  const normalized = value.toLowerCase();
  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("ftp://") ||
    normalized.startsWith("mailto:")
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

const openingFencePattern = /^( {0,3})(`{3,}|~{3,})(?:[ \t]*([A-Za-z0-9_+.-]+)(?:[ \t]+.*)?)?\s*$/;
const looseListBreakMarker = "\u0000loose-list-break\u0000";

function openingFenceFromLine(line: string): string {
  return openingFencePattern.exec(line)?.[2] ?? "";
}

function closingFenceFromLine(line: string): string {
  return /^ {0,3}(`+|~+)\s*$/.exec(line)?.[1] ?? "";
}

function closesMarkdownFence(openFence: string, closeFence: string): boolean {
  return closeFence.length >= openFence.length && closeFence.at(0) === openFence.at(0);
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
    /(^|[^\w/@#.-])(<(?:(?:[Hh][Tt][Tt][Pp][Ss]?|[Ff][Tt][Pp]):\/\/[^\s<>]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})>|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9A-Fa-f]{40}|[A-Za-z0-9_.-]+@[0-9A-Fa-f]{40}|@[0-9A-Fa-f]{40}|[0-9A-Fa-f]{40}|@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+|@[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[0-9]+|[A-Za-z0-9_.-]+#[0-9]+|#[0-9]+|https?:\/\/[^\s<]+|ftp:\/\/[^\s<]+|www\.[^\s<]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
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
    } else if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/i.test(token)) {
      const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)@([0-9a-f]{40})$/i.exec(token);
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
    } else if (/^[A-Za-z0-9_.-]+@[0-9a-f]{40}$/i.test(token)) {
      const match = /^([A-Za-z0-9_.-]+)@([0-9a-f]{40})$/i.exec(token);
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
    } else if (/^@[0-9a-f]{40}$/i.test(token) && ownerName && projectName) {
      parts.push(
        commitAutolinkPart(token, key, basePath, ownerName, projectName, token.slice(1), context),
      );
    } else if (/^[0-9a-f]{40}$/i.test(token) && ownerName && projectName) {
      parts.push(commitAutolinkPart(token, key, basePath, ownerName, projectName, token, context));
    } else if (/^@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(token)) {
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
        parts.push({
          className: "no-text-decoration user-link",
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
    } else if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[0-9]+$/.test(token)) {
      const pathIssueMatch = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)#([0-9]+)$/.exec(token);
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
    /\\([^\w\s])|(!?)\[([^\]]*)\]\((<[^>\s]+>|(?:\\[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]|[^)\\\s])+)(?:\s+(?:"((?:\\"|[^"\\])*)"|'((?:\\'|[^'\\])*)'|\(((?:\\\)|[^)\\])*)\)))?\)|(!?)\[((?:\\(?:\[|\])|[^\]\\[])+)\]\[((?:\\(?:\[|\])|[^\]\\[])*)\]|(!?)\[((?:\\(?:\[|\])|[^\]\\[])+)\](?:\[\])?|\*\*(?<strongAst>[^*\n]+)\*\*|__(?<strongUnd>[^_\n]+)__|~~(?<deleteText>[^~\n]+)~~|(?<codeFence>`+)(?<codeText>[^`]|[^`][\s\S]*?[^`])\k<codeFence>(?!`)|\*(?<emphasisAst>[^*\n]+)\*|_(?<emphasisUnd>[^_\n]+)_/g;
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
    } else if (match.groups?.strongAst !== undefined || match.groups?.strongUnd !== undefined) {
      parts.push({
        kind: "strong",
        key: `strong-${start}`,
        value: match.groups.strongAst ?? match.groups.strongUnd ?? "",
      });
    } else if (match.groups?.deleteText !== undefined) {
      parts.push({ kind: "delete", key: `delete-${start}`, value: match.groups.deleteText });
    } else if (match.groups?.codeText !== undefined) {
      parts.push({
        kind: "code",
        key: `code-${start}`,
        value: normalizeCodeSpan(match.groups.codeText),
      });
    } else if (match.groups?.emphasisAst !== undefined || match.groups?.emphasisUnd !== undefined) {
      parts.push({
        kind: "emphasis",
        key: `emphasis-${start}`,
        value: match.groups.emphasisAst ?? match.groups.emphasisUnd ?? "",
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
    return <React.Fragment key={part.key}>{part.value}</React.Fragment>;
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
  let activeListIndent: number | null = null;
  for (const [index, line] of lines.entries()) {
    const listLine = parseMarkdownListLine({ key: `normalize-${index}`, text: line });
    if (listLine) {
      activeListIndent = listLine.indent;
      normalized.push(line);
      continue;
    }
    if (/^\s*$/.test(line)) {
      const nextLine = lines[index + 1] ?? "";
      const nextIndentMatch = /^(\s+)\S/.exec(nextLine);
      const nextIndent = nextIndentMatch
        ? (nextIndentMatch[1] ?? "").replace(/\t/g, "    ").length
        : null;
      if (activeListIndent !== null && nextIndent !== null && nextIndent > activeListIndent) {
        normalized.push(`${" ".repeat(activeListIndent + 1)}${looseListBreakMarker}`);
        continue;
      }
      normalized.push(line);
      continue;
    }
    const continuationMatch = /^(\s+)\S/.exec(line);
    if (activeListIndent !== null && continuationMatch) {
      normalized.push(line);
      continue;
    }
    activeListIndent = null;
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
  const protectedPipe = "\u0000";
  const protectedLine = line.replace(/\\\|/g, protectedPipe);
  const cells = protectedLine
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.replaceAll(protectedPipe, "|").trim());
  if (count === undefined) {
    return cells;
  }
  if (cells.length > count) {
    return cells.slice(0, count);
  }
  return [...cells, ...Array.from({ length: count - cells.length }, () => "")];
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

function gfmTableBodyInterruption(line: string): boolean {
  return (
    /^ {0,3}(?:(?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})$/.test(line) ||
    /^ {0,3}#{1,6} /.test(line) ||
    /^ {0,3}>/.test(line) ||
    /^ {4}[^\n]/.test(line) ||
    /^ {0,3}(?:`{3,}(?=[^`\n]*$)|~{3,})/.test(line) ||
    /^ {0,3}(?:[*+-]|1[.)]) /.test(line) ||
    /^ {0,3}<(?:\/?[A-Za-z][\w:-]*(?:\s|>|\/>)|(?:script|pre|style|!--))/.test(line)
  );
}

function parseMarkdownTableSpan(
  lines: MarkdownLineRecord[],
): { consumedLineCount: number; table: MarkdownTableRecord } | null {
  if (lines.length < 2) {
    return null;
  }
  const header = splitTableRow(lines[0]?.text ?? "");
  const separator = splitTableRow(lines[1]?.text ?? "");
  if (header.length === 0 || separator.length !== header.length) {
    return null;
  }
  if (!separator.every((cell) => /^:?-+:?$/.test(cell))) {
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
    if (gfmTableBodyInterruption(line.text)) {
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
    </table>
  );
}

function parseMarkdownList(lines: MarkdownLineRecord[]): MarkdownListRecord | null {
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
  const span = parseMarkdownListAt(parsedLines as ParsedMarkdownListEntry[], 0, firstLine.indent);
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
  const match = /^(\s*)([-*+]|\d+[.)])\s+(.+)$/.exec(line.text);
  if (!match) {
    return null;
  }
  const marker = match[2] ?? "";
  const ordered = /^\d/.test(marker);
  return {
    indent: (match[1] ?? "").replace(/\t/g, "    ").length,
    key: line.key,
    kind: "item",
    ordered,
    start: ordered ? Number.parseInt(marker, 10) : undefined,
    text: match[3] ?? "",
  };
}

function parseMarkdownListAt(
  lines: ParsedMarkdownListEntry[],
  startIndex: number,
  indent: number,
): { list: MarkdownListRecord; nextIndex: number } | null {
  const firstLine = lines[startIndex];
  if (!firstLine || firstLine.kind !== "item" || firstLine.indent !== indent) {
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
        index += 1;
        continue;
      }
      parent.text = `${parent.text}\n${line.text}`;
      index += 1;
      continue;
    }
    if (line.indent > indent) {
      const parent = items.at(-1);
      if (!parent) {
        return null;
      }
      const nested = parseMarkdownListAt(lines, index, line.indent);
      if (!nested) {
        return null;
      }
      parent.children = [...(parent.children ?? []), nested.list];
      index = nested.nextIndex;
      continue;
    }
    if (line.ordered !== firstLine.ordered) {
      break;
    }
    items.push(parseMarkdownListItem(line.key, line.text));
    index += 1;
  }
  if (items.length === 0) {
    return null;
  }
  return {
    list: {
      items,
      loose: items.some((item) => item.loose),
      ordered: firstLine.ordered,
      start: firstLine.start,
    },
    nextIndex: index,
  };
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
  for (const match of markdown.matchAll(/^[ ]*(?:[-+*]|\d+[.)])\s+\[([ xX]?)\][ ]?.+$/gm)) {
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

function MarkdownList(props: { context?: MarkdownContext; list: MarkdownListRecord }) {
  const children = props.list.items.map((item) => (
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
      {props.list.loose ? (
        <MarkdownLooseListItem context={props.context} item={item} />
      ) : (
        <MarkdownInlineLines context={props.context} text={item.text} />
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
    <ol start={props.list.start && props.list.start !== 1 ? props.list.start : undefined}>
      {children}
    </ol>
  ) : (
    <ul>{children}</ul>
  );
}

function MarkdownLooseListItem(props: { context?: MarkdownContext; item: MarkdownListItem }) {
  const paragraphs: { key: string; text: string }[] = [];
  let offset = 0;
  for (const rawParagraph of props.item.text.split(`\n${looseListBreakMarker}\n`)) {
    const text = rawParagraph.replaceAll(looseListBreakMarker, "").trim();
    if (text) {
      paragraphs.push({ key: `${props.item.key}-loose-${offset}-${text}`, text });
    }
    offset += rawParagraph.length + looseListBreakMarker.length + 2;
  }
  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph.key}>
          <MarkdownInlineLines context={props.context} text={paragraph.text} />
        </p>
      ))}
    </>
  );
}

function MarkdownInlineLines(props: { context?: MarkdownContext; text: string }) {
  const lines = markdownLines(normalizeCodeSpanNewlines(props.text));
  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={line.key}>
          {markdownLineBreakBefore(lines, index, props.context?.breaks ?? true)}
          <MarkdownInline
            context={props.context}
            line={markdownLineTextBeforeBreak(line, index, lines)}
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
  for (const line of lines) {
    const match = /^\s*>\s?(.*)$/.exec(line.text);
    if (!match) {
      return null;
    }
    quoteLines.push({ key: line.key, text: match[1] ?? "" });
  }
  return quoteLines;
}

function markdownLineStartsBlock(line: string): boolean {
  return (
    markdownLineIsHorizontalRule(line) ||
    markdownLineIsIndentedCode(line) ||
    openingFencePattern.test(line) ||
    /^ {0,3}#{1,6}(?=\s|$)/.test(line) ||
    /^\s*(?:[*+-]|\d+[.)])\s+/.test(line)
  );
}

function markdownLineIsHorizontalRule(line: string): boolean {
  return /^ {0,3}(?:(?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})$/.test(line);
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
    if (/^\s*(?:[*+-]|\d+[.)])\s+/.test(line.text)) {
      const listLines = [line];
      index += 1;
      while (index < lineCount) {
        const nextLine = props.lines[index];
        if (!nextLine || !/^\s*(?:[*+-]|\d+[.)])\s+/.test(nextLine.text)) {
          break;
        }
        listLines.push(nextLine);
        index += 1;
      }
      children.push(
        <MarkdownBlock
          block={{
            key: `sequence-${line.key}`,
            text: listLines.map((item) => item.text).join("\n"),
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
      if (!nextLine || /^\s*$/.test(nextLine.text) || markdownLineStartsBlock(nextLine.text)) {
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
    .trim()
    .toLowerCase()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^a-z0-9가-힣._ -]+/g, "")
    .replace(/\s+/g, "-");
}

function MarkdownHeading(props: { context?: MarkdownContext; level: number; text: string }) {
  const id = slugifyHeadingId(props.text);
  const children = (
    <>
      <MarkdownInline context={props.context} line={props.text} />
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

function markdownBlockContainsRawHtmlTag(lines: MarkdownLineRecord[]) {
  return lines.some((line) => /<\/?[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?>/.test(line.text));
}

function MarkdownPlainParagraph(props: { breaks: boolean; lines: MarkdownLineRecord[] }) {
  return (
    <p>
      {props.lines.map((line, index) => (
        <React.Fragment key={line.key}>
          {index === 0 ? null : props.breaks ? <br /> : "\n"}
          {line.text}
        </React.Fragment>
      ))}
    </p>
  );
}

function MarkdownBlock(props: { block: MarkdownBlockRecord; context?: MarkdownContext }) {
  const lines = markdownLines(props.block.text);
  const firstLine = lines[0]?.text ?? "";
  const secondLine = lines[1]?.text ?? "";
  if (lines.length === 1 && /^ {0,3}(?:(?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})$/.test(firstLine)) {
    return <hr />;
  }
  if (lines.length === 2 && /^ {0,3}=+\s*$/.test(secondLine)) {
    return <MarkdownHeading context={props.context} level={1} text={firstLine.trim()} />;
  }
  if (lines.length === 2 && /^ {0,3}-+\s*$/.test(secondLine)) {
    return <MarkdownHeading context={props.context} level={2} text={firstLine.trim()} />;
  }
  const codeBlock = parseFencedCodeBlock(lines, props.block.terminalNewline ?? false);
  if (codeBlock) {
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
    return (
      <pre>
        <code>{indentedCodeBlock.code}</code>
      </pre>
    );
  }
  const tableSpan = parseMarkdownTableSpan(lines);
  if (tableSpan) {
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
  const list = parseMarkdownList(lines);
  if (list) {
    return <MarkdownList context={props.context} list={list} />;
  }
  const blockquote = parseMarkdownBlockquote(lines);
  if (blockquote) {
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
    const normalizedBlockquote = markdownLines(normalizeCodeSpanNewlines(rawBlockquoteText));
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
  if (markdownBlockContainsRawHtmlTag(lines)) {
    return <MarkdownPlainParagraph breaks={props.context?.breaks ?? true} lines={lines} />;
  }
  const headingMatch = /^ {0,3}(#{1,6})(?=\s|$)(.*)$/.exec(firstLine);
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
  commitReferences?: MarkdownCommitReference[];
  "data-allowed-update"?: string;
  "data-via-email"?: string;
  id?: string;
  issueReferences?: MarkdownIssueReference[];
  markdown: string;
  mentionReferences?: MarkdownMentionReference[];
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
    issueReferenceMap,
    mentionReferenceMap,
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
