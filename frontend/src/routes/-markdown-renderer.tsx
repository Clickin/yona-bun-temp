import * as React from "react";

type MarkdownInlinePart =
  | { kind: "code"; key: string; value: string }
  | { kind: "delete"; key: string; value: string }
  | { kind: "image"; key: string; label: string; target: string }
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

type MarkdownContext = {
  basePath?: string;
  issueReferenceMap?: Map<string, MarkdownIssueReference>;
  ownerName?: string;
  projectName?: string;
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
  key: string;
  text: string;
};

type MarkdownListRecord = {
  items: MarkdownListItem[];
  ordered: boolean;
};

type MarkdownBlockquoteRecord = {
  key: string;
  text: string;
};

function isSafeUrl(value: string) {
  return (
    value.startsWith("/") ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("#") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:")
  );
}

function normalizeBasePath(basePath?: string) {
  if (!basePath || basePath === "/") {
    return "";
  }
  return basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
}

function issueReferenceFor(
  context: MarkdownContext | undefined,
  ownerName: string,
  projectName: string,
  issueNumber: number,
) {
  return context?.issueReferenceMap?.get(`${ownerName}/${projectName}#${issueNumber}`);
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
    /(^|[^\w/@#.-])(@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+|@[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[0-9]+|[A-Za-z0-9_.-]+#[0-9]+|#[0-9]+|https?:\/\/[^\s<]+|ftp:\/\/[^\s<]+|www\.[^\s<]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
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
    if (/^@[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(token)) {
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
      const target = token.startsWith("www.")
        ? `http://${token}`
        : /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(token)
          ? `mailto:${token}`
          : token;
      parts.push({ kind: "link", key, label: token, target });
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
    /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)|\*\*([^*\n]+)\*\*|~~([^~\n]+)~~|`([^`\n]+)`/g;
  for (const match of line.matchAll(inlinePattern)) {
    const start = match.index ?? 0;
    if (start > index) {
      parts.push(...parseTextWithAutolinks(line.slice(index, start), `text-${index}`, context));
    }
    if (match[4] !== undefined) {
      parts.push({ kind: "strong", key: `strong-${start}`, value: match[4] ?? "" });
    } else if (match[5] !== undefined) {
      parts.push({ kind: "delete", key: `delete-${start}`, value: match[5] ?? "" });
    } else if (match[6] !== undefined) {
      parts.push({ kind: "code", key: `code-${start}`, value: match[6] ?? "" });
    } else if (isSafeUrl(match[3] ?? "")) {
      parts.push({
        kind: match[1] === "!" ? "image" : "link",
        key: `link-${start}`,
        label: match[2] ?? "",
        target: match[3] ?? "",
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
      return <img alt={part.label} key={part.key} src={part.target} />;
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
    return <React.Fragment key={part.key}>{part.value}</React.Fragment>;
  });
}

function paragraphBlocks(markdown: string): MarkdownBlockRecord[] {
  const normalized = markdown.replace(/\r\n?/g, "\n").trim();
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
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
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
      unorderedItems.push({ key: line.key, text: unorderedMatch[1] ?? "" });
      continue;
    }
    const orderedMatch = /^\s*\d+[.)]\s+(.+)$/.exec(line.text);
    if (orderedMatch) {
      orderedItems.push({ key: line.key, text: orderedMatch[1] ?? "" });
      continue;
    }
    return null;
  }
  if (unorderedItems.length === lines.length) {
    return { items: unorderedItems, ordered: false };
  }
  if (orderedItems.length === lines.length) {
    return { items: orderedItems, ordered: true };
  }
  return null;
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

function MarkdownBlock(props: { block: MarkdownBlockRecord; context?: MarkdownContext }) {
  const lines = markdownLines(props.block.text);
  const firstLine = lines[0]?.text ?? "";
  const table = parseMarkdownTable(lines);
  if (table) {
    return (
      <table>
        <thead>
          <tr>
            {table.headers.map((header) => (
              <th key={header.key}>
                <MarkdownInline context={props.context} line={header.text} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={row.key}>
              {row.cells.map((cell) => (
                <td key={cell.key}>
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
      <li key={item.key}>
        <MarkdownInline context={props.context} line={item.text} />
      </li>
    ));
    return list.ordered ? <ol>{children}</ol> : <ul>{children}</ul>;
  }
  const blockquote = parseMarkdownBlockquote(lines);
  if (blockquote) {
    return (
      <blockquote>
        <p>
          {blockquote.map((line) => (
            <React.Fragment key={line.key}>
              {line.key === "line-0" ? null : <br />}
              <MarkdownInline context={props.context} line={line.text} />
            </React.Fragment>
          ))}
        </p>
      </blockquote>
    );
  }
  if (firstLine.startsWith("# ")) {
    return (
      <h1>
        <MarkdownInline context={props.context} line={firstLine.slice(2).trim()} />
      </h1>
    );
  }
  if (firstLine.startsWith("## ")) {
    return (
      <h2>
        <MarkdownInline context={props.context} line={firstLine.slice(3).trim()} />
      </h2>
    );
  }
  return (
    <p>
      {lines.map((line) => (
        <React.Fragment key={line.key}>
          {line.key === "line-0" ? null : <br />}
          <MarkdownInline context={props.context} line={line.text} />
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
}) {
  const blocks = paragraphBlocks(props.markdown);
  const issueReferenceMap = new Map(
    (props.issueReferences ?? []).map((reference) => [
      `${reference.ownerName}/${reference.projectName}#${reference.issueNumber}`,
      reference,
    ]),
  );
  const context = {
    basePath: props.basePath,
    issueReferenceMap,
    ownerName: props.ownerName,
    projectName: props.projectName,
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
  );
}
