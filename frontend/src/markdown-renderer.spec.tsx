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

  it("renders legacy marked heading ids and levels", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"# Title\n\n### Third Heading\n\n###### Final Heading"} />,
    );

    expect(html).toContain('<h1 id="title">Title</h1>');
    expect(html).toContain('<h3 id="third-heading">Third Heading</h3>');
    expect(html).toContain('<h6 id="final-heading">Final Heading</h6>');
  });

  it("renders setext headings like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Primary Title\n=====\n\nSecondary Title\n-----"} />,
    );

    expect(html).toContain('<h1 id="primary-title">Primary Title</h1>');
    expect(html).toContain('<h2 id="secondary-title">Secondary Title</h2>');
  });

  it("renders fenced code blocks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"``` rust\nlet value = 1;\n#1 stays text\n```"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="rust"');
    expect(html).toContain("let value = 1;");
    expect(html).toContain("#1 stays text");
    expect(html).not.toContain("issueLink");
  });

  it("renders horizontal rules like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"Before\n\n---\n\nAfter"} />);

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<hr/>");
    expect(html).toContain("<p>After</p>");
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

  it("renders inline emphasis like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep *italic* and _also italic_ beside **strong**" />,
    );

    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<em>also italic</em>");
    expect(html).toContain("<strong>strong</strong>");
  });

  it("honors legacy marked backslash escapes before inline parsing", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "projectYobi",
          },
        ]}
        markdown={"Keep \\*literal\\* \\@owner \\#1 \\[label\\]\\(target\\) and real **strong** #1"}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("Keep *literal* @owner #1 [label](target) and real ");
    expect(html).toContain("<strong>strong</strong>");
    expect(html).toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(html).not.toContain("<em>literal</em>");
    expect(html).not.toContain('href="/yona/owner"');
    expect(html).not.toContain('href="target"');
  });

  it("normalizes inline code spans like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Keep ` code sample ` and `  spaced  ` text"} />,
    );

    expect(html).toContain("<code>code sample</code>");
    expect(html).toContain("<code> spaced </code>");
    expect(html).not.toContain("<code> code sample </code>");
    expect(html).not.toContain("<code>  spaced  </code>");
  });

  it("renders matching backtick-run code spans like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Keep `` `literal` `` beside ``` ``literal`` ``` and `plain` text"}
      />,
    );

    expect(html).toContain("<code>`literal`</code>");
    expect(html).toContain("<code>``literal``</code>");
    expect(html).toContain("<code>plain</code>");
    expect(html).not.toContain("```");
  });

  it("normalizes newlines inside inline code spans like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Keep ` line\nbreak ` beside\nplain text"} />,
    );

    expect(html).toContain("<code>line break</code>");
    expect(html).toContain(" beside<br/>plain text");
    expect(html).not.toContain("<code> line");
    expect(html).not.toContain("break </code>");
  });

  it("consumes legacy hard-break markers before line breaks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Backslash\\\nnext\nTwo spaces  \nafter"} />,
    );

    expect(html).toContain("<p>Backslash<br/>next<br/>Two spaces<br/>after</p>");
    expect(html).not.toContain("Backslash\\");
    expect(html).not.toContain("Two spaces  <br/>");
  });

  it("renders inline link and image titles like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](https://example.com/docs "Read docs") ![logo](https://example.com/logo.png "Logo title")'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain(
      '<img alt="logo" src="https://example.com/logo.png" title="Logo title"/>',
    );
  });

  it("renders single-quoted and parenthesized inline titles like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "[docs](https://example.com/docs 'Read docs') ![logo](https://example.com/logo.png (Logo title))"
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain(
      '<img alt="logo" src="https://example.com/logo.png" title="Logo title"/>',
    );
  });

  it("strips angle-wrapped inline link and image targets like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](<https://example.com/docs> "Read docs") ![logo](</files/logo.png> "Logo title")'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).not.toContain("href=&quot;&lt;");
    expect(html).not.toContain('src="&lt;');
  });

  it("unescapes inline link and image targets and titles like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](https://example.com/a\\(b\\) "Read \\\"docs\\\"") ![logo](/files/logo\\(1\\).png "Logo \\\"title\\\"")'
        }
      />,
    );

    expect(html).toContain(
      '<a href="https://example.com/a(b)" title="Read &quot;docs&quot;">docs</a>',
    );
    expect(html).toContain(
      '<img alt="logo" src="/files/logo(1).png" title="Logo &quot;title&quot;"/>',
    );
    expect(html).not.toContain("\\(");
    expect(html).not.toContain('\\"');
  });

  it("renders reference-style links and images like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide] ![logo][asset] [shortcut]\n\n[guide]: https://example.com/docs "Read docs"\n[asset]: /files/logo.png "Logo title"\n[shortcut]: ./shortcut'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).toContain('<a href="./shortcut">shortcut</a>');
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
    expect(html).not.toContain("[shortcut]:");
  });

  it("unescapes reference-style link and image definitions like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide] ![logo][asset]\n\n[guide]: https://example.com/a\\(b\\) "Read \\\"docs\\\""\n[asset]: /files/logo\\(1\\).png "Logo \\\"title\\\""'
        }
      />,
    );

    expect(html).toContain(
      '<a href="https://example.com/a(b)" title="Read &quot;docs&quot;">docs</a>',
    );
    expect(html).toContain(
      '<img alt="logo" src="/files/logo(1).png" title="Logo &quot;title&quot;"/>',
    );
    expect(html).not.toContain("\\(");
    expect(html).not.toContain('\\"');
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
  });

  it("resolves newline-split reference definitions like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide] ![logo][asset]\n\n[guide]:\n  https://example.com/docs "Read docs"\n[asset]:\n  /files/logo.png "Logo title"'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
  });

  it("resolves reference definition titles on the next line like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide] ![logo][asset]\n\n[guide]: https://example.com/docs\n  "Read docs"\n[asset]: /files/logo.png\n  "Logo title"'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
  });

  it("renders angle-bracket autolinks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See <https://example.com/docs> and <help@example.com>" />,
    );

    expect(html).toContain(
      'See <a href="https://example.com/docs">https://example.com/docs</a> and ',
    );
    expect(html).toContain('<a href="mailto:help@example.com">help@example.com</a>');
    expect(html).not.toContain("https://example.com/docs&gt;");
    expect(html).not.toContain("&lt;help@example.com&gt;");
  });

  it("trims trailing punctuation from bare URLs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See (https://example.com/docs), then https://example.com/end." />,
    );

    expect(html).toContain('(<a href="https://example.com/docs">https://example.com/docs</a>),');
    expect(html).toContain('<a href="https://example.com/end">https://example.com/end</a>.');
    expect(html).not.toContain('href="https://example.com/docs),"');
    expect(html).not.toContain('href="https://example.com/end."');
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

  it("keeps escaped table pipes inside cells like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"| Name | State |\n| --- | --- |\n| a \\| b | **open** |"} />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<td>a | b</td>");
    expect(html).toContain("<td><strong>open</strong></td>");
    expect(html).not.toContain("<td>b</td>");
  });

  it("renders GFM table alignment like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"| Left | Center | Right |\n| :--- | :---: | ---: |\n| L | C | R |"}
      />,
    );

    expect(html).toContain('<th align="left">Left</th>');
    expect(html).toContain('<th align="center">Center</th>');
    expect(html).toContain('<th align="right">Right</th>');
    expect(html).toContain('<td align="left">L</td>');
    expect(html).toContain('<td align="center">C</td>');
    expect(html).toContain('<td align="right">R</td>');
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

  it("renders task-list checkboxes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- [ ] open\n- [x] **done**\n- [X] done upper"} />,
    );

    expect(html).toContain("<ul>");
    expect(html).toContain('class="task-list-item"');
    expect(html).toContain(
      '<input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> open',
    );
    expect(html).toContain(
      '<input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> <strong>done</strong>',
    );
    expect(html).toContain(
      '<input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> done upper',
    );
  });

  it("renders the legacy tasklist progress bar when enabled", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        className="content markdown-wrap"
        markdown={"- [ ] open\n- [x] **done**\n- [X] done upper"}
        showTasklistBar
      />,
    );

    expect(html).toContain('class="tasklist task-show"');
    expect(html).toContain('class="task-title" style="width:66.66666666666666%"');
    expect(html).toContain('Tasks<span class="done-counter">(2/3)</span>');
    expect(html).toContain('class="bar red" style="width:66.66666666666666%" title="Tasklist"');
    expect(html).toContain('<div class="content markdown-wrap"><ul>');
  });

  it("renders a complete tasklist progress bar as green like legacy", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- [x] done\n- [X] done upper"} showTasklistBar />,
    );

    expect(html).toContain('Tasks<span class="done-counter">(2/2)</span>');
    expect(html).toContain('class="bar green" style="width:100%" title="Tasklist"');
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
