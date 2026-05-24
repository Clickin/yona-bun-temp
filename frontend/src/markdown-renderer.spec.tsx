import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./routes/-markdown-renderer";

describe("MarkdownRenderer", () => {
  it("renders legacy preview autolinks on the React side", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "Markdown preview target",
          },
        ]}
        markdown="Hello @owner #1 owner/projectYobi#1 ftp://files.example.com www.example.com help@example.com"
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain('href="/yona/owner"');
    expect(html).toContain('class="no-text-decoration user-link"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(html).toContain('class="issueLink"');
    expect(html).toContain('title="Markdown preview target"');
    expect(html).toContain('data-issue-state="open"');
    expect(html).toContain('href="ftp://files.example.com"');
    expect(html).toContain('href="http://www.example.com"');
    expect(html).toContain('href="mailto:help@example.com"');
  });

  it("renders legacy owner issue references and project mentions", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Owner-scoped reference",
          },
        ]}
        markdown="See owner#7 and @owner/projectYobi, but leave missing#99 as text"
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Owner-scoped reference"');
    expect(html).toContain('data-issue-state="closed"');
    expect(html).toContain('href="/yona/owner/projectYobi"');
    expect(html).toContain('class="no-text-decoration project-link"');
    expect(html).toContain("missing#99");
    expect(html).not.toContain('href="/yona/missing/projectYobi/issue/99"');
  });

  it("renders GFM strikethrough like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep **strong** and ~~deleted~~ text" />,
    );

    expect(html).toContain("<strong>strong</strong>");
    expect(html).toContain("<del>deleted</del>");
  });

  it("renders basic GFM pipe tables like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"| Name | State |\n| --- | --- |\n| #1 | ~~closed~~ |"} />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<th>Name</th>");
    expect(html).toContain("<td>#1</td>");
    expect(html).toContain("<td><del>closed</del></td>");
  });

  it("renders basic smart lists like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- **first**\n- ~~second~~"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. first\n2. `second`"} />,
    );

    expect(unorderedHtml).toContain("<ul>");
    expect(unorderedHtml).toContain("<li><strong>first</strong></li>");
    expect(unorderedHtml).toContain("<li><del>second</del></li>");
    expect(orderedHtml).toContain("<ol>");
    expect(orderedHtml).toContain("<li>first</li>");
    expect(orderedHtml).toContain("<li><code>second</code></li>");
  });

  it("renders basic blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> **quoted**\n> with ~~style~~"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<p><strong>quoted</strong><br/>with ");
    expect(html).not.toContain("<p>&gt;");
    expect(html).toContain("<del>style</del>");
  });
});
