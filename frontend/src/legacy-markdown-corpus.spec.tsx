// Yona Markdown semantic corpus (plan Phase D3). Each case is grounded in
// legacy evidence:
//  - marked options `{gfm, tables, breaks, headerIds, smartLists}` and the
//    bundled fork's `yb-header-` heading ids / `.head-anchor` anchors
//    (yona-original/public/javascripts/lib/marked.js).
//  - owasp sanitize policy + `transformIssueLink`
//    (yona-original/app/utils/Markdown.java).
// Autolink literals, references, hard breaks and raw-HTML behavior live in the
// same pipelines the routes use (LegacyMarkdown / LegacyMarkdownHtml).
// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  basePathUrlTransform,
  createMarkdownReferenceIndex,
  createYonaReferenceExtension,
  decorateMarkdownReferenceLink,
  defaultUrlTransform,
  gfmAutolinkLiterals,
  LegacyMarkdown,
  LegacyMarkdownHtml,
  legacyHardBreaks,
  legacyHeadingAnchors,
  legacyHeadingSlug,
  LEGACY_SANITIZE_BASE_SCHEMA,
  reactNodeText,
  type MarkdownReferenceReplacement,
} from "./components/legacy-markdown";
import { MarkdownCodeBlock } from "./components/markdown-code-block";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root | null = null;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
});

afterEach(() => {
  root?.unmount();
  container.remove();
  root = null;
});

async function renderMarkdown(node: React.ReactNode): Promise<HTMLDivElement> {
  root = createRoot(container);
  await act(async () => {
    root!.render(node);
  });
  await act(async () => {
    root!.render(node);
  });
  return container;
}

const PLAIN_EXTENSIONS = [gfmAutolinkLiterals];

function plain(children: string, components?: Parameters<typeof LegacyMarkdown>[0]["components"]) {
  return (
    <LegacyMarkdown components={components} extensions={PLAIN_EXTENSIONS}>
      {children}
    </LegacyMarkdown>
  );
}

function withHtml(
  children: string,
  extensions?: Parameters<typeof LegacyMarkdownHtml>[0]["extensions"],
) {
  return (
    <LegacyMarkdownHtml extensions={extensions} sanitize={LEGACY_SANITIZE_BASE_SCHEMA}>
      {children}
    </LegacyMarkdownHtml>
  );
}

/* Headings and paragraphs ------------------------------------------------- */

test("renders ATX headings and paragraphs", async () => {
  await renderMarkdown(plain("# Title\n\nBody text."));
  expect(container.querySelector("h1")?.textContent).toBe("Title");
  expect(container.querySelector("p")?.textContent).toBe("Body text.");
});

test("headings do not get slug ids on plain surfaces", async () => {
  await renderMarkdown(plain("## 한글 제목"));
  expect(container.querySelector("h2")?.getAttribute("id")).toBeNull();
});

/* Hard breaks (legacy marked `breaks: true`) ------------------------------ */

test("single newlines inside a paragraph become hard breaks", async () => {
  await renderMarkdown(
    <LegacyMarkdown extensions={[gfmAutolinkLiterals, legacyHardBreaks]}>
      {"line one\nline two"}
    </LegacyMarkdown>,
  );
  expect(container.querySelector("br")).not.toBeNull();
  expect(container.querySelector("p")?.textContent).toBe("line oneline two");
});

test("soft breaks stay soft without the breaks extension", async () => {
  await renderMarkdown(plain("line one\nline two"));
  expect(container.querySelector("br")).toBeNull();
  expect(container.querySelector("p")?.textContent).toBe("line one\nline two");
});

test("trailing spaces stay literal without the breaks extension", async () => {
  await renderMarkdown(plain("line one  \nline two"));
  expect(container.querySelector("br")).toBeNull();
});

/* Emphasis, strong, strike ------------------------------------------------ */

test("renders emphasis, strong and strikethrough", async () => {
  await renderMarkdown(plain("*em* **strong** ~~gone~~"));
  expect(container.querySelector("em")?.textContent).toBe("em");
  expect(container.querySelector("strong")?.textContent).toBe("strong");
  expect(container.querySelector("del")?.textContent).toBe("gone");
});

/* Lists ------------------------------------------------------------------- */

test("renders nested lists", async () => {
  await renderMarkdown(plain("- Red\n    1. White\n    2. Blue\n- Green"));
  const topLevel = container.querySelectorAll(":scope > ul > li");
  expect(topLevel).toHaveLength(2);
  expect(topLevel[0]?.querySelector("ol")?.children).toHaveLength(2);
});

test("renders task list checkboxes", async () => {
  await renderMarkdown(plain("- [ ] open\n- [x] done"));
  const boxes = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]");
  expect(boxes).toHaveLength(2);
  expect(boxes[0]?.checked).toBe(false);
  expect(boxes[0]?.disabled).toBe(true);
  expect(boxes[1]?.checked).toBe(true);
});

test("renders ordered list start values", async () => {
  await renderMarkdown(plain("3. third\n4. fourth"));
  expect(container.querySelector("ol")?.getAttribute("start")).toBe("3");
});

/* Blockquotes -------------------------------------------------------------- */

test("renders blockquotes", async () => {
  await renderMarkdown(plain("> quoted\n> text"));
  expect(container.querySelector("blockquote")?.textContent).toContain("quoted");
});

/* Code --------------------------------------------------------------------- */

test("renders fenced code with the legacy language class", async () => {
  await renderMarkdown(plain("```javascript\nconst a = 1;\n```"));
  expect(container.querySelector("pre > code")?.getAttribute("class")).toBe("language-javascript");
});

test("highlights TOML in code blocks without interpreting code as HTML", async () => {
  const source = 'title = "<img src=x onerror=alert(1)>"';
  await renderMarkdown(
    <MarkdownCodeBlock language="toml" className="language-toml">
      {source}
    </MarkdownCodeBlock>,
  );
  const code = container.querySelector("pre > code");
  expect(code?.querySelector(".th-property")?.textContent).toBe("title");
  expect(code?.textContent).toBe(source);
  expect(code?.querySelector("img")).toBeNull();
});

test("renders fenced code without a language as plain pre/code", async () => {
  await renderMarkdown(
    <LegacyMarkdown
      components={{
        pre: ({ children }) => {
          const code = Array.isArray(children) ? children[0] : children;
          const element = code as { props?: { className?: string; children?: React.ReactNode } };
          const language = element.props?.className?.match(/(?:^|\s)language-([^\s]+)/u)?.[1];
          if (language && language !== "plaintext") {
            return (
              <MarkdownCodeBlock className={element.props?.className} language={language}>
                {element.props?.children}
              </MarkdownCodeBlock>
            );
          }
          return <pre>{children}</pre>;
        },
      }}
      extensions={PLAIN_EXTENSIONS}
    >
      {"```\nplain text block\n```"}
    </LegacyMarkdown>,
  );
  const code = container.querySelector("pre > code");
  expect(code?.getAttribute("class")).toBe("language-plaintext");
  expect(container.querySelector("div[data-owner=markdown-code-block]")).toBeNull();
});

test("renders inline code", async () => {
  await renderMarkdown(plain("run `npm test` now"));
  expect(container.querySelector("code")?.textContent).toBe("npm test");
});

/* Tables ------------------------------------------------------------------- */

test("renders GFM tables with alignment", async () => {
  await renderMarkdown(plain("| A | B |\n| - | :-: |\n| 1 | 2 |"));
  expect(container.querySelector("table")).not.toBeNull();
  expect(container.querySelectorAll("th")).toHaveLength(2);
  const aligned = container.querySelectorAll("td")[1];
  expect(aligned?.getAttribute("style")).toContain("center");
});

/* Links and images ---------------------------------------------------------- */

test("renders links with titles and images with alt text", async () => {
  await renderMarkdown(
    plain('[Site](https://example.com/ "Example")\n\n![alt](https://example.com/i.png)'),
  );
  const link = container.querySelector("a");
  expect(link?.getAttribute("href")).toBe("https://example.com/");
  expect(link?.getAttribute("title")).toBe("Example");
  const img = container.querySelector("img");
  expect(img?.getAttribute("src")).toBe("https://example.com/i.png");
  expect(img?.getAttribute("alt")).toBe("alt");
});

test("base-path transform prefixes root-relative URLs only", () => {
  expect(basePathUrlTransform("/yona", "/assets/images/x.png")).toBe("/yona/assets/images/x.png");
  expect(basePathUrlTransform("/yona", "https://example.com/")).toBe("https://example.com/");
  expect(basePathUrlTransform("/yona", "//example.com/x")).toBe("//example.com/x");
});

test("unsafe URL schemes are dropped (react-markdown default contract)", () => {
  expect(defaultUrlTransform("javascript:alert(1)")).toBe("");
  expect(defaultUrlTransform("data:text/html,x")).toBe("");
  expect(defaultUrlTransform("mailto:a@b.c")).toBe("mailto:a@b.c");
});

/* Autolink literals (legacy marked GFM) ------------------------------------ */

test("bare http, www and email autolink", async () => {
  await renderMarkdown(plain("see https://example.com/x and www.example.com and a@b.com end"));
  const links = Array.from(container.querySelectorAll("a"));
  expect(links.map((link) => link.getAttribute("href"))).toEqual([
    "https://example.com/x",
    "http://www.example.com",
    "mailto:a@b.com",
  ]);
});

test("trailing punctuation is not part of an autolink", async () => {
  await renderMarkdown(plain("visit https://example.com."));
  expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com");
  expect(container.querySelector("a")?.textContent).toBe("https://example.com");
});

test("angle autolinks become links", async () => {
  await renderMarkdown(plain("<https://example.com/x>"));
  expect(container.querySelector("a")?.getAttribute("href")).toBe("https://example.com/x");
});

/* Escaped punctuation and literal syntax ------------------------------------ */

test("escapes markdown-significant punctuation when escaped", async () => {
  await renderMarkdown(plain("\\*not em\\* and \\#not-heading and 1 \\. 2"));
  expect(container.querySelector("p")?.textContent).toBe("*not em* and #not-heading and 1 . 2");
  expect(container.querySelector("em")).toBeNull();
});

test("unknown XML-style tags render as literal text on plain surfaces", async () => {
  await renderMarkdown(plain("value <foo bar> text"));
  expect(container.querySelector("foo")).toBeNull();
  expect(container.querySelector("p")?.textContent).toContain("<foo bar>");
});

test("Korean text survives inline structure", async () => {
  await renderMarkdown(plain("**한글 강조**와 일반 텍스트"));
  expect(container.querySelector("strong")?.textContent).toBe("한글 강조");
  expect(container.querySelector("p")?.textContent).toContain("일반 텍스트");
});

/* Raw HTML (issue/post contract) -------------------------------------------- */

test("sanitized raw HTML renders through the HTML path", async () => {
  await renderMarkdown(
    withHtml('<div class="alert alert-warning">careful</div>\n\n<b>bold</b> and <del>gone</del>'),
  );
  expect(container.querySelector("div.alert")?.textContent).toBe("careful");
  expect(container.querySelector("b")?.textContent).toBe("bold");
  expect(container.querySelector("del")?.textContent).toBe("gone");
});

test("inline HTML pairs render without wrapper spans", async () => {
  await renderMarkdown(withHtml("text <b>bold</b> tail"));
  const paragraph = container.querySelector("p")!;
  expect(paragraph.innerHTML).toBe("text <b>bold</b> tail");
});

test("paired inline HTML preserves markdown structure around it", async () => {
  await renderMarkdown(withHtml("text **bold** and <em>raw</em> tail"));
  expect(container.querySelector("strong")?.textContent).toBe("bold");
  expect(container.querySelector("em")?.textContent).toBe("raw");
});

test("script content is stripped and event handlers dropped", async () => {
  await renderMarkdown(withHtml('<p onclick="evil()">safe</p><script>window.evil = 1</script>'));
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("p")?.textContent).toBe("safe");
  expect(container.querySelector("p")?.getAttribute("onclick")).toBeNull();
});

test("javascript: hrefs are dropped by the schema protocols", async () => {
  await renderMarkdown(withHtml('[x](javascript:alert(1))\n\n<a href="javascript:alert(1)">y</a>'));
  for (const link of Array.from(container.querySelectorAll("a"))) {
    expect(link.getAttribute("href") ?? "").not.toContain("javascript:");
  }
});

test("legacy video/source embeds survive sanitization", async () => {
  await renderMarkdown(
    withHtml(
      '<video controls="controls"><source src="https://example.com/v.mp4" type="video/mp4" /></video>',
    ),
  );
  expect(container.querySelector("video")).not.toBeNull();
  expect(container.querySelector("source")?.getAttribute("src")).toBe("https://example.com/v.mp4");
});

test("legacy task-list input html survives sanitization", async () => {
  await renderMarkdown(withHtml('<input type="checkbox" disabled checked="checked" />'));
  const box = container.querySelector<HTMLInputElement>("input[type=checkbox]")!;
  expect(box.checked).toBe(true);
  expect(box.disabled).toBe(true);
});

test("iframe embeds keep only allowlisted attributes", async () => {
  await renderMarkdown(
    withHtml(
      '<iframe src="https://example.com/e" width="560" height="315" onload="evil()" allowfullscreen></iframe>',
    ),
  );
  const iframe = container.querySelector("iframe")!;
  expect(iframe.getAttribute("src")).toBe("https://example.com/e");
  expect(iframe.getAttribute("width")).toBe("560");
  expect(iframe.getAttribute("allowfullscreen")).toBe("");
  expect(iframe.getAttribute("onload")).toBeNull();
});

test("XML comments in markdown are dropped by sanitization", async () => {
  await renderMarkdown(withHtml("before <!-- hidden note --> after"));
  expect(container.querySelector("p")?.textContent).not.toContain("hidden note");
});

test("ancestors constraint keeps table internals inside tables", async () => {
  await renderMarkdown(withHtml("<tr><td>orphan</td></tr>"));
  // tr requires a table ancestor (hast-util-sanitize `ancestors`), so it
  // unwraps to its text content.
  expect(container.querySelector("tr")).toBeNull();
  expect(container.textContent).toContain("orphan");
});

test("inline style attribute becomes a React style object when allowed", async () => {
  await renderMarkdown(withHtml('<span style="color: red; text-align: center">x</span>'));
  const span = container.querySelector("span")!;
  expect(span.style.color).toBe("red");
  expect(span.style.textAlign).toBe("center");
});

/* Heading anchors (legacy marked fork) -------------------------------------- */

test("heading anchors extension adds yb-header ids and head-anchor links", async () => {
  await renderMarkdown(
    <LegacyMarkdown
      components={{
        a: ({ href, children, ...props }) => (
          <a
            {...props}
            href={href}
            className={href?.startsWith("#yb-header-") ? "head-anchor" : undefined}
          >
            {children}
          </a>
        ),
      }}
      extensions={[legacyHeadingAnchors()]}
    >
      {"## 한글 제목\n\n## Recap\n\n## Recap"}
    </LegacyMarkdown>,
  );
  const headings = Array.from(container.querySelectorAll("h2"));
  expect(headings[0]?.id).toBe(`yb-header-${legacyHeadingSlug("한글 제목")}`);
  expect(legacyHeadingSlug("한글 제목")).toContain("한글");
  const anchors = headings.map((heading) => heading.querySelector("a.head-anchor"));
  expect(anchors.every((anchor) => anchor?.textContent === "#")).toBe(true);
  expect(anchors[0]?.getAttribute("href")).toBe(headings[0]?.id && `#${headings[0].id}`);
  // Duplicate slugs get the legacy -1 suffix.
  expect(headings[1]?.id).not.toBe(headings[2]?.id);
  expect(headings[2]?.id).toBe(`${headings[1]?.id}-1`);
});

/* Reference autolinks (issue/commit/mention) -------------------------------- */

const REFERENCES: MarkdownReferenceReplacement[] = [
  {
    decoration: {
      className: ["issueLink"],
      stateSpan: { className: "issue-state open", label: "열림" },
    },
    label: "#12.Fix login flow",
    token: "#12",
    url: "/owner/project/issue/12",
  },
  {
    label: "device@abcd123",
    token: "device@abcd1234567890abcd1234567890abcd1234",
    url: "/owner/project/commit/abcd1234567890abcd1234567890abcd1234",
  },
  {
    decoration: { className: ["no-text-decoration", "user-link"] },
    label: "@senghyunjo",
    token: "@senghyunjo",
    url: "/senghyunjo",
  },
  {
    decoration: { childWrapperClass: { className: "project-link" } },
    label: "@owner/project",
    token: "@owner/project",
    url: "/owner/project",
  },
];

async function renderWithReferences(children: string) {
  const index = createMarkdownReferenceIndex(REFERENCES);
  return renderMarkdown(
    <LegacyMarkdown
      components={{
        a: ({ href, children: kids, ...props }) => {
          const decoration = index.replacementFor(href ?? "", reactNodeText(kids))?.decoration;
          const decorated = decorateMarkdownReferenceLink(undefined, kids, decoration);
          return (
            <a {...props} {...decorated} href={href}>
              {decorated.children}
            </a>
          );
        },
      }}
      extensions={[gfmAutolinkLiterals, createYonaReferenceExtension(REFERENCES)]}
    >
      {children}
    </LegacyMarkdown>,
  );
}

test("issue references render with issueLink class and state span", async () => {
  await renderWithReferences("see #12 please");
  const link = container.querySelector("a.issueLink")!;
  expect(link.getAttribute("href")).toBe("/owner/project/issue/12");
  expect(link.textContent).toBe("#12.Fix login flow열림");
  expect(link.querySelector("span.issue-state.open")?.textContent).toBe("열림");
});

test("commit references render as plain links with the short id", async () => {
  await renderWithReferences("commit device@abcd1234567890abcd1234567890abcd1234 done");
  const link = container.querySelector("a")!;
  expect(link.getAttribute("href")).toBe(
    "/owner/project/commit/abcd1234567890abcd1234567890abcd1234",
  );
  expect(link.textContent).toBe("device@abcd123");
  expect(link.getAttribute("class")).toBeNull();
});

test("user mentions carry user-link classes, project mentions wrap the label", async () => {
  await renderWithReferences("cc @senghyunjo at @owner/project");
  const userLink = container.querySelector("a.user-link")!;
  expect(userLink.getAttribute("href")).toBe("/senghyunjo");
  expect(userLink.textContent).toBe("@senghyunjo");
  const projectLink = container.querySelector("a > span.project-link")!;
  expect(projectLink.textContent).toBe("@owner/project");
});

test("reference tokens inside code spans and existing links are untouched", async () => {
  await renderWithReferences("`#12` and [explicit](/owner/project/issue/12)");
  expect(container.querySelector("code")?.textContent).toBe("#12");
  const explicit = container.querySelector("a")!;
  expect(explicit.getAttribute("class")).toBeNull();
  expect(explicit.textContent).toBe("explicit");
});

test("word-adjacent tokens do not autolink (boundary rule)", async () => {
  await renderWithReferences("issue#12 not a reference");
  expect(container.querySelector("a")).toBeNull();
});
