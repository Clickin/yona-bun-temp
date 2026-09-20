import { Link } from "@tanstack/react-router";
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";
import {
  gfmAutolinkLiterals,
  LegacyMarkdown,
  type MarkdownComponents,
} from "../components/legacy-markdown";
import { useLegacyMessages } from "../i18n";
import markdownSampleImageUrl from "../assets/legacy/ico-like-small.png";
const MARKDOWN_HELP_TARGETS = [
  "markdownHeaders",
  "markdownStyling",
  "markdownLinks",
  "markdownLists",
  "markdownTaskList",
  "markdownImages",
  "markdownBlockquotes",
  "markdownCodes",
  "markdownTables",
  "markdownShortLinks",
] as const;

type MarkdownHelpTarget = (typeof MARKDOWN_HELP_TARGETS)[number];

const MARKDOWN_HELP_NAV_ITEMS: ReadonlyArray<{
  label: string;
  target: MarkdownHelpTarget;
}> = [
  { label: "Header", target: "markdownHeaders" },
  { label: "Text Style", target: "markdownStyling" },
  { label: "Link", target: "markdownLinks" },
  { label: "List", target: "markdownLists" },
  { label: "Checklist", target: "markdownTaskList" },
  { label: "Image", target: "markdownImages" },
  { label: "Blockquote", target: "markdownBlockquotes" },
  { label: "Code", target: "markdownCodes" },
  { label: "Table", target: "markdownTables" },
  { label: "Short Link", target: "markdownShortLinks" },
];

const MARKDOWN_HEADER_SAMPLE = `
# This is an H1
## This is an H2
### This is an H3
`;

const MARKDOWN_STYLING_SAMPLE = `
*This is an italic*
**This is an bold**
~~This is an strike~~
`;

const MARKDOWN_LINK_SAMPLE = `
[Site](https://example.com/ "Yoram Site")

https://example.com/
`;

const MARKDOWN_LINK_OUTPUT_SAMPLE = `

[Site](https://example.com/ "Yoram Site")

https://example.com/
`;

const MARKDOWN_LIST_INPUT_SAMPLE = `
- Red
    1. White
    2. Blue
- Green.
`;

const MARKDOWN_LIST_OUTPUT_SAMPLE = `
- Red
    1. White
    2. Blue
- Green
`;

const MARKDOWN_TASK_LIST_SAMPLE = `
- [ ] Todos
    - [x] To do A
    - [ ] To do B
    - [ ] To do C
`;

const MARKDOWN_IMAGE_INPUT_SAMPLE = `
![title](https://example.com/assets/images/ico-like-small.png "Yoram")
`;

const MARKDOWN_IMAGE_OUTPUT_SAMPLE = `
![title](/assets/images/ico-like-small.png "Yoram")
`;

const MARKDOWN_BLOCKQUOTE_SAMPLE = `
> Lorem ipsum dolor sit amet, consectetuer adipiscing elit.
>
> Aenean commodo ligula eget dolor.
`;

const MARKDOWN_CODE_SAMPLE = `
\`function test() {console.log("hello world");}\`

\`\`\`javascript
function test() {
  console.log("hello world");
}
\`\`\`
`;

const MARKDOWN_TABLE_INPUT_SAMPLE = `
| Default      | Align center | Align right |
| ------------ | :----------: | ------: |
| Carrot       | Red          | 1,000   |
| Banana       | Yellow       | 32,000  |
`;

const MARKDOWN_TABLE_OUTPUT_SAMPLE = `
| Default      | Align center | Align right |
| ------------ | :----------: | ------: |
| Carrot       | Red          | 1,000   |
| Banana       | Yellow       | 32,000  |

Also, you can copy & paste table from excel sheet
`;

const MARKDOWN_SHORT_LINK_SAMPLE = `
Issue no: #2
Mention: @example
commit: @763575 or @763575f177a4ce8b9370954de3ea1a1410205593
`;

const MARKDOWN_HELP_INPUT_SAMPLES: Record<MarkdownHelpTarget, string> = {
  markdownHeaders: MARKDOWN_HEADER_SAMPLE,
  markdownStyling: MARKDOWN_STYLING_SAMPLE,
  markdownLinks: MARKDOWN_LINK_SAMPLE,
  markdownLists: MARKDOWN_LIST_INPUT_SAMPLE,
  markdownTaskList: MARKDOWN_TASK_LIST_SAMPLE,
  markdownImages: MARKDOWN_IMAGE_INPUT_SAMPLE,
  markdownBlockquotes: MARKDOWN_BLOCKQUOTE_SAMPLE,
  markdownCodes: MARKDOWN_CODE_SAMPLE,
  markdownTables: MARKDOWN_TABLE_INPUT_SAMPLE,
  markdownShortLinks: MARKDOWN_SHORT_LINK_SAMPLE,
};

const MARKDOWN_HELP_OUTPUT_SAMPLES: Partial<Record<MarkdownHelpTarget, string>> = {
  markdownHeaders: MARKDOWN_HEADER_SAMPLE,
  markdownStyling: MARKDOWN_STYLING_SAMPLE,
  markdownLinks: MARKDOWN_LINK_OUTPUT_SAMPLE,
  markdownLists: MARKDOWN_LIST_OUTPUT_SAMPLE,
  markdownImages: MARKDOWN_IMAGE_OUTPUT_SAMPLE,
  markdownBlockquotes: MARKDOWN_BLOCKQUOTE_SAMPLE,
  markdownCodes: MARKDOWN_CODE_SAMPLE,
  markdownTables: MARKDOWN_TABLE_OUTPUT_SAMPLE,
};

type MarkdownSampleLinkProps = ComponentPropsWithoutRef<"a">;
type MarkdownSampleImageProps = ComponentPropsWithoutRef<"img">;
type MarkdownSampleCodeProps = ComponentPropsWithoutRef<"code">;
type MarkdownSampleHeadingRendererProps = ComponentPropsWithoutRef<"h1">;

function MarkdownSampleLink({ children, href, ...props }: MarkdownSampleLinkProps) {
  return href ? (
    <Link to={href} {...props}>
      {children}
    </Link>
  ) : (
    <>{children}</>
  );
}

function MarkdownSampleImage({ alt, ...props }: MarkdownSampleImageProps) {
  return <img {...props} alt={alt ?? ""} src={markdownSampleImageUrl} />;
}

function MarkdownSampleHeading({
  children,
  headingId,
  level,
  ...props
}: ComponentPropsWithoutRef<"h1"> & { headingId: string; level: 1 | 2 | 3 }) {
  const Heading = `h${level}` as "h1" | "h2" | "h3";

  return (
    <Heading {...props} id={headingId}>
      {children}
    </Heading>
  );
}

function MarkdownSampleH1(props: MarkdownSampleHeadingRendererProps) {
  return <MarkdownSampleHeading {...props} headingId="yb-header-this-is-an-h1" level={1} />;
}

function MarkdownSampleH2(props: MarkdownSampleHeadingRendererProps) {
  return <MarkdownSampleHeading {...props} headingId="yb-header-this-is-an-h2" level={2} />;
}

function MarkdownSampleH3(props: MarkdownSampleHeadingRendererProps) {
  return <MarkdownSampleHeading {...props} headingId="yb-header-this-is-an-h3" level={3} />;
}

function MarkdownSampleCode({ children, className, ...props }: MarkdownSampleCodeProps) {
  if (className !== "language-javascript") {
    return (
      <code {...props} className={`${className ?? ""}`} data-owner="markdown-help-output-code">
        {children}
      </code>
    );
  }

  return (
    <code {...props} className="javascript hljs" data-owner="markdown-help-output-pre-code">
      <span className="hljs-function">
        <span className="hljs-keyword">function</span> <span className="hljs-title">test</span>(
        <span className="hljs-params" />){" "}
      </span>
      {"{\n  "}
      <span className="hljs-built_in">console</span>
      {".log("}
      <span className="hljs-string">&quot;hello world&quot;</span>
      {");\n}\n"}
    </code>
  );
}

function MarkdownSamplePre({ children }: ComponentPropsWithoutRef<"pre">) {
  return <pre data-owner="markdown-help-output-pre">{children}</pre>;
}

function MarkdownSampleTable(props: ComponentPropsWithoutRef<"table">) {
  return <table {...props} data-owner="markdown-help-table" />;
}

function MarkdownSampleTableHeader(props: ComponentPropsWithoutRef<"th">) {
  return <th {...props} />;
}

function MarkdownSampleTableCell(props: ComponentPropsWithoutRef<"td">) {
  return <td {...props} />;
}

const MARKDOWN_SAMPLE_COMPONENTS = {
  a: MarkdownSampleLink,
  code: MarkdownSampleCode,
  h1: MarkdownSampleH1,
  h2: MarkdownSampleH2,
  h3: MarkdownSampleH3,
  img: MarkdownSampleImage,
  pre: MarkdownSamplePre,
  table: MarkdownSampleTable,
  td: MarkdownSampleTableCell,
  th: MarkdownSampleTableHeader,
} satisfies MarkdownComponents;

function markdownHelpContentId(target: MarkdownHelpTarget) {
  return `markdown-help-${target}`;
}

function MarkdownSampleOutput({ sample }: { sample: string }) {
  return (
    <div className={"markdown-wrap"} data-owner="markdown-help-output">
      <LegacyMarkdown components={MARKDOWN_SAMPLE_COMPONENTS} extensions={[gfmAutolinkLiterals]}>
        {sample}
      </LegacyMarkdown>
    </div>
  );
}

function MarkdownHelpPaneOutput({ target }: { target: MarkdownHelpTarget }) {
  if (target === "markdownTaskList") {
    return <MarkdownHelpTaskListOutput />;
  }
  if (target === "markdownShortLinks") {
    return <MarkdownHelpShortLinksOutput />;
  }
  return <MarkdownSampleOutput sample={MARKDOWN_HELP_OUTPUT_SAMPLES[target] ?? ""} />;
}

function MarkdownHelpTaskListOutput() {
  return (
    <div className={"markdown-wrap"} data-owner="markdown-help-output">
      <ul data-owner="markdown-help-task-list">
        <li>
          <input type="checkbox" /> Todos
          <ul>
            <li>
              <input type="checkbox" defaultChecked /> To do A
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
  );
}

function MarkdownHelpShortLinksOutput() {
  return (
    <div className={"markdown-wrap"} data-owner="markdown-help-output">
      <p>
        Issue no: <MarkdownSampleLink href="/example/example/issue/2">#2</MarkdownSampleLink>
      </p>
      <p></p>
      <p>
        Mention: <MarkdownSampleLink href="/example">@example</MarkdownSampleLink>
      </p>
      <p>
        commit:{" "}
        <MarkdownSampleLink href="/example/example/commit/763575">@763575</MarkdownSampleLink> or{" "}
        <MarkdownSampleLink href="/example/example/commit/763575f177a4ce8b9370954de3ea1a1410205593">
          @763575
        </MarkdownSampleLink>
      </p>
    </div>
  );
}

function MarkdownHelpPane({ target, active }: { target: MarkdownHelpTarget; active: boolean }) {
  return (
    <li
      id={markdownHelpContentId(target)}
      className={`markdown-help-item ${target}${active ? " active" : ""}`}
      data-owner="markdown-help-pane"
    >
      <div className="row-fluid thead">
        <div className="span6">Markdown Input</div>
        <div className="span6">Markdown Output</div>
      </div>
      <div className="row-fluid markdwon-syntax-wrap">
        <div className="span6 markdwon-syntax">
          <pre data-owner="markdown-help-input-pre">
            {MARKDOWN_HELP_INPUT_SAMPLES[target].replace(/^\r?\n/u, "")}
          </pre>
        </div>
        <div className="span6">
          <MarkdownHelpPaneOutput target={target} />
        </div>
      </div>
    </li>
  );
}

function MarkdownHelpNav({
  activeTarget,
  toggleActiveTarget,
}: {
  activeTarget: MarkdownHelpTarget | null;
  toggleActiveTarget: (target: MarkdownHelpTarget) => void;
}) {
  const { t } = useLegacyMessages();
  return (
    <ul className={"markdown-help-nav"} data-owner="markdown-help-nav-list">
      <li data-owner="markdown-help-nav-item">
        <span className={"label"} data-owner="markdown-help-nav-label">
          {t("title.markdown.help")}
        </span>
      </li>{" "}
      {MARKDOWN_HELP_NAV_ITEMS.map(({ label, target }, index) => {
        const active = activeTarget === target;
        const navClassName = `help-nav${active ? " active" : ""}`;
        const item = (
          <li
            className={navClassName}
            data-owner="markdown-help-nav-choice"
            key={target}
          >
            <button
              type="button"
              className="markdown-help-nav-button"
              data-owner="markdown-help-nav-button"
              aria-controls={markdownHelpContentId(target)}
              aria-expanded={active}
              onClick={() => toggleActiveTarget(target)}
            >
              {label}
            </button>
          </li>
        );
        return index === 0 ? item : [" ", item];
      })}
    </ul>
  );
}

export function LegacyMarkdownHelp() {
  const [activeTarget, setActiveTarget] = useState<MarkdownHelpTarget | null>(null);
  const toggleActiveTarget = (target: MarkdownHelpTarget) => {
    setActiveTarget((current) => (current === target ? null : target));
  };
  return (
    <div className={"markdown-help"} data-owner="markdown-help-nav-root">
      <MarkdownHelpNav activeTarget={activeTarget} toggleActiveTarget={toggleActiveTarget} />
      <ul className={"markdown-help-wrap"} data-owner="markdown-help-pane-list">
        {MARKDOWN_HELP_TARGETS.map((target) => (
          <MarkdownHelpPane key={target} target={target} active={activeTarget === target} />
        ))}
      </ul>
    </div>
  );
}
