import * as React from "react";

type MarkdownInlinePart =
  | { kind: "image"; key: string; label: string; target: string }
  | { kind: "link"; key: string; label: string; target: string }
  | { kind: "text"; key: string; value: string };

type MarkdownBlockRecord = {
  key: string;
  text: string;
};

type MarkdownLineRecord = {
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

function parseInlineMarkdown(line: string): MarkdownInlinePart[] {
  const parts: MarkdownInlinePart[] = [];
  let index = 0;
  const linkPattern = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of line.matchAll(linkPattern)) {
    const start = match.index ?? 0;
    if (start > index) {
      parts.push({ kind: "text", key: `text-${index}`, value: line.slice(index, start) });
    }
    const target = match[3] ?? "";
    if (isSafeUrl(target)) {
      parts.push({
        kind: match[1] === "!" ? "image" : "link",
        key: `link-${start}`,
        label: match[2] ?? "",
        target,
      });
    } else {
      parts.push({ kind: "text", key: `text-${start}`, value: match[0] ?? "" });
    }
    index = start + (match[0]?.length ?? 0);
  }
  if (index < line.length) {
    parts.push({ kind: "text", key: `text-${index}`, value: line.slice(index) });
  }
  return parts;
}

function MarkdownInline(props: { line: string }) {
  return parseInlineMarkdown(props.line).map((part) => {
    if (part.kind === "image") {
      return <img alt={part.label} key={part.key} src={part.target} />;
    }
    if (part.kind === "link") {
      return (
        <a href={part.target} key={part.key}>
          {part.label || part.target}
        </a>
      );
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

function MarkdownBlock(props: { block: MarkdownBlockRecord }) {
  const lines = markdownLines(props.block.text);
  const firstLine = lines[0]?.text ?? "";
  if (firstLine.startsWith("# ")) {
    return (
      <h1>
        <MarkdownInline line={firstLine.slice(2).trim()} />
      </h1>
    );
  }
  if (firstLine.startsWith("## ")) {
    return (
      <h2>
        <MarkdownInline line={firstLine.slice(3).trim()} />
      </h2>
    );
  }
  return (
    <p>
      {lines.map((line) => (
        <React.Fragment key={line.key}>
          {line.key === "line-0" ? null : <br />}
          <MarkdownInline line={line.text} />
        </React.Fragment>
      ))}
    </p>
  );
}

export function MarkdownRenderer(props: {
  className?: string;
  "data-via-email"?: string;
  id?: string;
  markdown: string;
}) {
  const blocks = paragraphBlocks(props.markdown);
  if (blocks.length === 0) {
    return (
      <div className={props.className} data-via-email={props["data-via-email"]} id={props.id} />
    );
  }

  return (
    <div className={props.className} data-via-email={props["data-via-email"]} id={props.id}>
      {blocks.map((block) => (
        <MarkdownBlock block={block} key={block.key} />
      ))}
    </div>
  );
}
