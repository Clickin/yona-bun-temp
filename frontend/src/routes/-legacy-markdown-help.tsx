import { Link, useRouteContext, useRouter } from "@tanstack/react-router";
import * as stylex from "@stylexjs/stylex";
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";
import ReactMarkdown, { type Components, type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import { useLegacyMessages } from "../i18n";
import { prefixBasePath } from "../runtime-config";
import {
  markdownHelpContentStyles as contentStyles,
  markdownHelpNavStyles as navStyles,
} from "./-legacy-markdown-help.stylex";

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
[Site](https://example.com/ "Example Site")

https://example.com/
`;

const MARKDOWN_LINK_OUTPUT_SAMPLE = `

[Site](https://example.com/ "Example Site")

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
![title](https://example.com/images/sample.png "Sample image")
`;

const MARKDOWN_IMAGE_OUTPUT_SAMPLE = `
![title](/assets/images/ico-like-small.png "Sample image")
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

type MarkdownSampleLinkProps = ComponentPropsWithoutRef<"a"> & ExtraProps;
type MarkdownSampleImageProps = ComponentPropsWithoutRef<"img"> & ExtraProps;
type MarkdownSampleCodeProps = ComponentPropsWithoutRef<"code"> & ExtraProps;
type MarkdownSampleHeadingRendererProps = ComponentPropsWithoutRef<"h1"> & ExtraProps;

function MarkdownSampleLink({ children, href, node: _node, ...props }: MarkdownSampleLinkProps) {
  return href ? (
    <Link to={href} {...props}>
      {children}
    </Link>
  ) : (
    <>{children}</>
  );
}

function MarkdownSampleImage({ alt, node: _node, src, ...props }: MarkdownSampleImageProps) {
  const basePath = useRouteContext({
    from: "__root__",
    select: (context) => context.runtimeConfig.basePath,
  });
  const imageSrc =
    src === "/assets/images/ico-like-small.png"
      ? prefixBasePath(basePath, "/legacy-assets/images/ico-like-small.png")
      : src
        ? prefixBasePath(basePath, src)
        : undefined;

  return <img {...props} alt={alt ?? ""} src={imageSrc} />;
}

function MarkdownSampleHeading({
  children,
  headingId,
  level,
  ...props
}: ComponentPropsWithoutRef<"h1"> & { headingId: string; level: 1 | 2 | 3 }) {
  const router = useRouter();
  const Heading = `h${level}` as "h1" | "h2" | "h3";

  return (
    <Heading {...props} id={headingId}>
      {children}
      <Link
        className="head-anchor"
        to="."
        search={true}
        hash={headingId}
        onClick={(event) => {
          // TanStack Router 1.168 re-stringifies validated search during Link click; commit the already-built location.
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
          ) {
            return;
          }
          event.preventDefault();
          void router.commitLocation(
            router.buildLocation({ hash: headingId, search: true, to: "." }),
          );
        }}
      >
        #
      </Link>
    </Heading>
  );
}

function MarkdownSampleH1({ node: _node, ...props }: MarkdownSampleHeadingRendererProps) {
  return <MarkdownSampleHeading {...props} headingId="yb-header-this-is-an-h1" level={1} />;
}

function MarkdownSampleH2({ node: _node, ...props }: MarkdownSampleHeadingRendererProps) {
  return <MarkdownSampleHeading {...props} headingId="yb-header-this-is-an-h2" level={2} />;
}

function MarkdownSampleH3({ node: _node, ...props }: MarkdownSampleHeadingRendererProps) {
  return <MarkdownSampleHeading {...props} headingId="yb-header-this-is-an-h3" level={3} />;
}

function MarkdownSampleCode({
  children,
  className,
  node: _node,
  ...props
}: MarkdownSampleCodeProps) {
  const codeStyle = stylex.props(contentStyles.outputCode);
  if (className !== "language-javascript") {
    return (
      <code
        {...props}
        {...codeStyle}
        className={`${className ?? ""} ${codeStyle.className}`.trim()}
        data-stylex-owner="markdown-help-output-code"
      >
        {children}
      </code>
    );
  }

  return (
    <code
      {...props}
      {...stylex.props(contentStyles.outputPreCode)}
      className={`${className} hljs ${stylex.props(contentStyles.outputPreCode).className}`}
      data-stylex-owner="markdown-help-output-pre-code"
    >
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

function MarkdownSamplePre({
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"pre"> & ExtraProps) {
  return (
    <pre
      {...props}
      {...stylex.props(contentStyles.outputPre)}
      data-stylex-owner="markdown-help-output-pre"
    />
  );
}

function MarkdownSampleTable({
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"table"> & ExtraProps) {
  return (
    <table
      {...props}
      {...stylex.props(contentStyles.table)}
      data-stylex-owner="markdown-help-table"
    />
  );
}

function MarkdownSampleTableHeader({
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"th"> & ExtraProps) {
  return <th {...props} {...stylex.props(contentStyles.tableHeader)} />;
}

function MarkdownSampleTableCell({
  node: _node,
  ...props
}: ComponentPropsWithoutRef<"td"> & ExtraProps) {
  return <td {...props} {...stylex.props(contentStyles.tableCell)} />;
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
} satisfies Components;

function markdownHelpContentId(target: MarkdownHelpTarget) {
  return `markdown-help-${target}`;
}

function MarkdownSampleOutput({ sample }: { sample: string }) {
  return (
    <div
      className={`markdown-wrap ${stylex.props(contentStyles.output).className}`}
      data-stylex-owner="markdown-help-output"
    >
      <ReactMarkdown components={MARKDOWN_SAMPLE_COMPONENTS} remarkPlugins={[remarkGfm]}>
        {sample}
      </ReactMarkdown>
    </div>
  );
}

export function LegacyMarkdownHelp() {
  const { t } = useLegacyMessages();
  const [activeTarget, setActiveTarget] = useState<MarkdownHelpTarget | null>(null);

  const activeClass = (target: MarkdownHelpTarget) => (activeTarget === target ? " active" : "");
  const paneStyle = (target: MarkdownHelpTarget) =>
    stylex.props(contentStyles.pane, activeTarget === target && contentStyles.paneActive);
  const toggleActiveTarget = (target: MarkdownHelpTarget) => {
    setActiveTarget((current) => (current === target ? null : target));
  };

  return (
    <div
      {...stylex.props(navStyles.root)}
      className={`${stylex.props(navStyles.root).className} markdown-help`}
      data-stylex-owner="markdown-help-nav-root"
    >
      <ul
        {...stylex.props(navStyles.nav)}
        className={`${stylex.props(navStyles.nav).className} markdown-help-nav`}
        data-stylex-owner="markdown-help-nav-list"
      >
        <li {...stylex.props(navStyles.navItem)} data-stylex-owner="markdown-help-nav-item">
          <span
            {...stylex.props(navStyles.navLabel)}
            className={`${stylex.props(navStyles.navLabel).className} label`}
            data-stylex-owner="markdown-help-nav-label"
          >
            {t("title.markdown.help")}
          </span>
        </li>{" "}
        {MARKDOWN_HELP_NAV_ITEMS.map(({ label, target }, index) => {
          const active = activeTarget === target;
          const itemStyle = stylex.props(
            navStyles.navItem,
            navStyles.navChoice,
            active && navStyles.navChoiceActive,
          );
          const buttonStyle = stylex.props(navStyles.navButton);
          const navClassName = `${itemStyle.className} help-nav${activeClass(target)}`;
          const buttonClassName = `${buttonStyle.className} markdown-help-nav-button`;
          const item = (
            <li
              {...itemStyle}
              className={navClassName}
              data-stylex-owner="markdown-help-nav-choice"
              key={target}
            >
              <button
                {...buttonStyle}
                type="button"
                className={buttonClassName}
                aria-controls={markdownHelpContentId(target)}
                aria-expanded={active}
                data-stylex-owner="markdown-help-nav-button"
                onClick={() => toggleActiveTarget(target)}
              >
                {label}
              </button>
            </li>
          );
          return index === 0 ? item : [" ", item];
        })}
      </ul>
      <ul
        className={`markdown-help-wrap ${stylex.props(contentStyles.paneList).className}`}
        data-stylex-owner="markdown-help-pane-list"
      >
        <li
          {...paneStyle("markdownHeaders")}
          id={markdownHelpContentId("markdownHeaders")}
          className={`${paneStyle("markdownHeaders").className} markdown-help-item markdownHeaders${activeClass("markdownHeaders")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_HEADER_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_HEADER_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownStyling")}
          id={markdownHelpContentId("markdownStyling")}
          className={`${paneStyle("markdownStyling").className} markdown-help-item markdownStyling${activeClass("markdownStyling")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_STYLING_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_STYLING_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownLinks")}
          id={markdownHelpContentId("markdownLinks")}
          className={`${paneStyle("markdownLinks").className} markdown-help-item markdownLinks${activeClass("markdownLinks")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_LINK_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_LINK_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownLists")}
          id={markdownHelpContentId("markdownLists")}
          className={`${paneStyle("markdownLists").className} markdown-help-item markdownLists${activeClass("markdownLists")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_LIST_INPUT_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_LIST_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownTaskList")}
          id={markdownHelpContentId("markdownTaskList")}
          className={`${paneStyle("markdownTaskList").className} markdown-help-item markdownTaskList${activeClass("markdownTaskList")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_TASK_LIST_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <div
                className={`markdown-wrap ${stylex.props(contentStyles.output).className}`}
                data-stylex-owner="markdown-help-output"
              >
                <ul
                  {...stylex.props(contentStyles.taskList)}
                  data-stylex-owner="markdown-help-task-list"
                >
                  <li>
                    <input {...stylex.props(contentStyles.taskCheckbox)} type="checkbox" /> Todos
                    <ul>
                      <li>
                        <input
                          {...stylex.props(contentStyles.taskCheckbox)}
                          type="checkbox"
                          defaultChecked
                        />{" "}
                        To do A
                      </li>
                      <li>
                        <input {...stylex.props(contentStyles.taskCheckbox)} type="checkbox" /> To
                        do B
                      </li>
                      <li>
                        <input {...stylex.props(contentStyles.taskCheckbox)} type="checkbox" /> To
                        do C
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownImages")}
          id={markdownHelpContentId("markdownImages")}
          className={`${paneStyle("markdownImages").className} markdown-help-item markdownImages${activeClass("markdownImages")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_IMAGE_INPUT_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_IMAGE_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownBlockquotes")}
          id={markdownHelpContentId("markdownBlockquotes")}
          className={`${paneStyle("markdownBlockquotes").className} markdown-help-item markdownBlockquotes${activeClass("markdownBlockquotes")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_BLOCKQUOTE_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_BLOCKQUOTE_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownCodes")}
          id={markdownHelpContentId("markdownCodes")}
          className={`${paneStyle("markdownCodes").className} markdown-help-item markdownCodes${activeClass("markdownCodes")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_CODE_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_CODE_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownTables")}
          id={markdownHelpContentId("markdownTables")}
          className={`${paneStyle("markdownTables").className} markdown-help-item markdownTables${activeClass("markdownTables")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_TABLE_INPUT_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <MarkdownSampleOutput sample={MARKDOWN_TABLE_OUTPUT_SAMPLE} />
            </div>
          </div>
        </li>
        <li
          {...paneStyle("markdownShortLinks")}
          id={markdownHelpContentId("markdownShortLinks")}
          className={`${paneStyle("markdownShortLinks").className} markdown-help-item markdownShortLinks${activeClass("markdownShortLinks")}`}
          data-stylex-owner="markdown-help-pane"
        >
          <div className="row-fluid thead">
            <div className="span6">Markdown Input</div>
            <div className="span6">Markdown Output</div>
          </div>
          <div className="row-fluid markdwon-syntax-wrap">
            <div className="span6 markdwon-syntax">
              <pre
                {...stylex.props(contentStyles.inputPre)}
                data-stylex-owner="markdown-help-input-pre"
              >
                {MARKDOWN_SHORT_LINK_SAMPLE}
              </pre>
            </div>
            <div className="span6">
              <div
                className={`markdown-wrap ${stylex.props(contentStyles.output).className}`}
                data-stylex-owner="markdown-help-output"
              >
                <p>
                  Issue no:{" "}
                  <MarkdownSampleLink href="/example/example/issue/2">#2</MarkdownSampleLink>
                </p>
                <p></p>
                <p>
                  Mention: <MarkdownSampleLink href="/example">@example</MarkdownSampleLink>
                </p>
                <p>
                  commit:{" "}
                  <MarkdownSampleLink href="/example/example/commit/763575">
                    @763575
                  </MarkdownSampleLink>{" "}
                  or{" "}
                  <MarkdownSampleLink href="/example/example/commit/763575f177a4ce8b9370954de3ea1a1410205593">
                    @763575
                  </MarkdownSampleLink>
                </p>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}
