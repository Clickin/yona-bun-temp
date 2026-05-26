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

  it("links only resolved legacy mentions when mention metadata is present", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        markdown="@testOwner @testOwner/testProject @nforge @nforge/yobi"
        mentionReferences={[
          {
            kind: "user",
            label: "testOwner",
            loginId: "testOwner",
            ownerName: "",
            projectName: "",
          },
          {
            kind: "project",
            label: "testOwner/testProject",
            loginId: "",
            ownerName: "testOwner",
            projectName: "testProject",
          },
        ]}
      />,
    );

    expect(html).toContain('href="/yona/testOwner"');
    expect(html).toContain('href="/yona/testOwner/testProject"');
    expect(html).toContain("@nforge @nforge/yobi");
    expect(html).not.toContain('href="/yona/nforge"');
    expect(html).not.toContain('href="/yona/nforge/yobi"');
  });

  it("ignores autolink patterns inside raw HTML-like blocks like legacy MarkdownApp", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "projectYobi",
            title: "HTML ignored issue",
          },
        ]}
        markdown={
          "<a href='#'>#1</a>\n<code>\nhttp://yobi.example.com #1 http://yobi.example.com\n</code>\n<div id='#1'>Test</div>"
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("&lt;a href=&#x27;#&#x27;&gt;#1&lt;/a&gt;");
    expect(html).toContain("http://yobi.example.com #1 http://yobi.example.com");
    expect(html).toContain("&lt;div id=&#x27;#1&#x27;&gt;Test&lt;/div&gt;");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(html).not.toContain('href="http://yobi.example.com"');
  });

  it("renders legacy marked heading ids, levels, and anchors", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"# Title\n\n### Third Heading\n\n###### Final Heading"} />,
    );

    expect(html).toContain('<h1 id="title">Title<a class="head-anchor" href="#title">#</a></h1>');
    expect(html).toContain(
      '<h3 id="third-heading">Third Heading<a class="head-anchor" href="#third-heading">#</a></h3>',
    );
    expect(html).toContain(
      '<h6 id="final-heading">Final Heading<a class="head-anchor" href="#final-heading">#</a></h6>',
    );
  });

  it("renders leading-space ATX headings like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"  ## Indented Title\n\n   # Three Space"} />,
    );

    expect(html).toContain(
      '<h2 id="indented-title">Indented Title<a class="head-anchor" href="#indented-title">#</a></h2>',
    );
    expect(html).toContain(
      '<h1 id="three-space">Three Space<a class="head-anchor" href="#three-space">#</a></h1>',
    );
    expect(html).not.toContain("<p>## Indented Title</p>");
  });

  it("renders setext headings like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Primary Title\n=====\n\nSecondary Title\n-----"} />,
    );

    expect(html).toContain(
      '<h1 id="primary-title">Primary Title<a class="head-anchor" href="#primary-title">#</a></h1>',
    );
    expect(html).toContain(
      '<h2 id="secondary-title">Secondary Title<a class="head-anchor" href="#secondary-title">#</a></h2>',
    );
  });

  it("renders leading-space setext heading underlines like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Indented Setext\n  ===\n\nSecondary\n   ---"} />,
    );

    expect(html).toContain(
      '<h1 id="indented-setext">Indented Setext<a class="head-anchor" href="#indented-setext">#</a></h1>',
    );
    expect(html).toContain(
      '<h2 id="secondary">Secondary<a class="head-anchor" href="#secondary">#</a></h2>',
    );
    expect(html).not.toContain("<p>Indented Setext");
  });

  it("deduplicates repeated heading ids like legacy marked slugger", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"# Repeat\n\n## Repeat\n\nRepeat\n-----"} />,
    );

    expect(html).toContain(
      '<h1 id="repeat">Repeat<a class="head-anchor" href="#repeat">#</a></h1>',
    );
    expect(html).toContain(
      '<h2 id="repeat-1">Repeat<a class="head-anchor" href="#repeat-1">#</a></h2>',
    );
    expect(html).toContain(
      '<h2 id="repeat-2">Repeat<a class="head-anchor" href="#repeat-2">#</a></h2>',
    );
  });

  it("renders fenced code blocks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"``` rust\nlet value = 1;\n#1 stays text\n```"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="rust"');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-number">1</span>');
    expect(html).toContain('#<span class="syntax-token syntax-number">1</span>');
    expect(html).not.toContain("issueLink");
  });

  it("uses the first fenced code info-string token like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"``` rust linenos\nlet value = '#1';\n```"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="rust"');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).not.toContain("linenos");
    expect(html).not.toContain("issueLink");
  });

  it("token-highlights fenced code blocks on the React side like legacy code views", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"``` rust\nfn main() {\n  let value = 1;\n}\n```"} />,
    );

    expect(html).toContain('class="syntax-token syntax-keyword">fn</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-number">1</span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">{</span>');
  });

  it("accepts fenced code language without a separating space like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"```js\nconst value = '#1';\n```"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("```js");
  });

  it("compensates indented fenced code contents like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"  ``` js\n  const value = '#1';\n    nested();\n  ```"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain('  <span class="syntax-token syntax-identifier">nested</span>');
    expect(html).not.toContain("    nested();");
    expect(html).not.toContain("issueLink");
  });

  it("closes fenced code blocks at EOF like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"```js\nconst value = '#1';\n#1 stays text\n"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain('#<span class="syntax-token syntax-number">1</span>');
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("```js");
  });

  it("renders tilde fenced code blocks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"~~~ js\nconst value = '#1';\n~~~"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("~~~");
  });

  it("does not extract reference definitions from tilde fences like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"~~~\n[guide]: https://example.com/docs\n~~~\n\n[docs][guide]"}
      />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain('class="syntax-token syntax-identifier">guide</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">https</span>');
    expect(html).toContain("[docs][guide]");
    expect(html).not.toContain('<a href="https://example.com/docs">docs</a>');
  });

  it("requires closing fences to match the opening fence length like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"```` rust\n#1 stays text\n```\n\nAfter"}
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).not.toContain("<pre><code");
    expect(html).toContain("After");
  });

  it("renders indented code blocks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"    let value = '#1';\n    [guide]: https://example.com"} />,
    );

    expect(html).toContain("<pre><code");
    expect(html).toContain("let value = &#x27;#1&#x27;;");
    expect(html).toContain("[guide]: https://example.com");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('<a href="https://example.com">');
  });

  it("renders horizontal rules like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"Before\n\n---\n\nAfter"} />);

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<hr/>");
    expect(html).toContain("<p>After</p>");
  });

  it("renders spaced horizontal rules like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"Before\n\n- - -\n\nAfter"} />);

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<hr/>");
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("<p>- - -</p>");
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

  it("keeps missing issue references as text like legacy MarkdownApp", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[]}
        markdown="Keep #12345 owner#12345 owner/projectYobi#12345 as text"
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("#12345");
    expect(html).toContain("owner#12345");
    expect(html).toContain("owner/projectYobi#12345");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("/issue/12345");
  });

  it("does not link wrapped issue references like legacy MarkdownApp", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 77,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "Wrapped issue",
          },
        ]}
        markdown={"_owner#77-\nAowner#77AA\n"}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("_owner#77-");
    expect(html).toContain("Aowner#77AA");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("/issue/77");
  });

  it("renders legacy commit SHA references when commit metadata exists", () => {
    const currentSha = "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2";
    const ownerSha = "ffffffffffffffffffffffffffffffffffffffff";
    const projectSha = "0123456789abcdef0123456789abcdef01234567";
    const missingSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        commitReferences={[
          {
            commitId: currentSha,
            ownerName: "owner",
            projectName: "projectYobi",
            title: "Current project commit",
          },
          {
            commitId: ownerSha,
            ownerName: "other",
            projectName: "projectYobi",
            title: "Owner scoped commit",
          },
          {
            commitId: projectSha,
            ownerName: "other",
            projectName: "project",
            title: "Project scoped commit",
          },
        ]}
        markdown={`See ${currentSha} @${currentSha} other@${ownerSha} other/project@${projectSha} missing@${missingSha}`}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(`href="/yona/owner/projectYobi/commit/${currentSha}"`);
    expect(html).toContain('title="Current project commit"');
    expect(html).toContain(`href="/yona/other/projectYobi/commit/${ownerSha}"`);
    expect(html).toContain(`href="/yona/other/project/commit/${projectSha}"`);
    expect(html).toContain(`missing@${missingSha}`);
    expect(html).not.toContain(`/commit/${missingSha}`);
  });

  it("does not autolink commit SHA references inside code spans or fences", () => {
    const sha = "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2";
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        commitReferences={[
          {
            commitId: sha,
            ownerName: "owner",
            projectName: "projectYobi",
          },
        ]}
        markdown={`Keep \`${sha}\`\n\n\`\`\`\n${sha}\n\`\`\``}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(`<code>${sha}</code>`);
    expect(html).not.toContain(`/commit/${sha}`);
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

  it("renders underscore strong emphasis like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep __strong__ beside _italic_" />,
    );

    expect(html).toContain("<strong>strong</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).not.toContain("__strong__");
  });

  it("parses inline Markdown inside emphasis tokens like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="**https://example.com** *`code`* ~~www.example.com~~" />,
    );

    expect(html).toContain(
      '<strong><a href="https://example.com">https://example.com</a></strong>',
    );
    expect(html).toContain("<em><code>code</code></em>");
    expect(html).toContain('<del><a href="http://www.example.com">www.example.com</a></del>');
    expect(html).not.toContain("<strong>https://example.com</strong>");
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

  it("keeps README soft line breaks disabled like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        className="readme-body markdown-wrap"
        markdown={"first line\nsecond line\nhard break\\\nnext"}
      />,
    );

    expect(html).toContain("first line\nsecond line\nhard break<br/>next");
    expect(html).not.toContain("first line<br/>second line");
    expect(html).not.toContain("hard break\\");
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

  it("accepts uppercase safe inline link and image schemes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="[Docs](HTTP://EXAMPLE.COM) ![Logo](HTTPS://EXAMPLE.COM/logo.png) [Mail](MAILTO:HELP@EXAMPLE.COM) [Bad](javascript:alert(1))" />,
    );

    expect(html).toContain('<a href="HTTP://EXAMPLE.COM">Docs</a>');
    expect(html).toContain('<img alt="Logo" src="HTTPS://EXAMPLE.COM/logo.png"/>');
    expect(html).toContain('<a href="MAILTO:HELP@EXAMPLE.COM">Mail</a>');
    expect(html).toContain("[Bad](javascript:alert(1))");
    expect(html).not.toContain('href="javascript:alert(1)"');
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

  it("resolves escaped reference labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "[docs][guide\\]] ![logo][asset\\]]\n\n[guide\\]]: https://example.com/docs\n[asset\\]]: /files/logo.png"
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png"/>');
    expect(html).not.toContain("[guide\\]]:");
    expect(html).not.toContain("[asset\\]]:");
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

  it("renders uppercase angle-bracket URL autolinks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See <HTTP://EXAMPLE.COM> and plain HTTP://EXAMPLE.COM" />,
    );

    expect(html).toContain('<a href="HTTP://EXAMPLE.COM">HTTP://EXAMPLE.COM</a>');
    expect(html).toContain(" plain HTTP://EXAMPLE.COM");
    expect(html).not.toContain('href="HTTP://EXAMPLE.COM">plain');
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

  it("backpedals entity-like suffixes from bare URLs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"See https://example.com/a&copy; and https://example.com/a&amp;copy;"}
      />,
    );

    expect(html).toContain('<a href="https://example.com/a">https://example.com/a</a>&amp;copy;');
    expect(html).toContain(
      '<a href="https://example.com/a&amp;amp;copy">https://example.com/a&amp;amp;copy</a>;',
    );
    expect(html).not.toContain('href="https://example.com/a&amp;copy"');
    expect(html).not.toContain('href="https://example.com/a&amp;copy;"');
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

  it("accepts one-dash table separators like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"A | B\n- | -:\n1 | 2"} />);

    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain('<th align="right">B</th>');
    expect(html).toContain("<td>1</td>");
    expect(html).toContain('<td align="right">2</td>');
    expect(html).not.toContain("<p>A | B");
  });

  it("pads and truncates table row cells like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"A | B\n- | -\n1\n2 | 3 | 4"} />);

    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td></td>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain("<td>3</td>");
    expect(html).not.toContain("<td>4</td>");
  });

  it("stops GFM table body rows before interrupting blocks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n# Next"} />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain('<h1 id="next">Next<a class="head-anchor" href="#next">#</a></h1>');
    expect(html).not.toContain("<td># Next</td>");
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

  it("preserves ordered list start numbers like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"3. third\n4. fourth"} />);

    expect(html).toContain('<ol start="3">');
    expect(html).toContain("<li>third</li>");
    expect(html).toContain("<li>fourth</li>");
  });

  it("renders nested smart lists like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- parent\n  - **child**\n- next"} />,
    );

    expect(html).toContain(
      "<ul><li>parent<ul><li><strong>child</strong></li></ul></li><li>next</li></ul>",
    );
    expect(html).not.toContain("<li>parent</li><li><strong>child</strong></li>");
  });

  it("keeps indented continuation lines inside list items like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n  continuation with **style**\n- second"} />,
    );

    expect(html).toContain(
      "<ul><li>first<br/>continuation with <strong>style</strong></li><li>second</li></ul>",
    );
    expect(html).not.toContain("<p>continuation with");
  });

  it("keeps blank-line continuations inside list items like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n\n  continuation with **style**\n- second"} />,
    );

    expect(html).toContain("<ul>");
    expect(html).toContain("first");
    expect(html).toContain("continuation with <strong>style</strong>");
    expect(html).toContain("second");
    expect(html).not.toContain("</ul><p>  continuation with");
    expect(html).not.toContain("<p>- second</p>");
  });

  it("wraps loose-list item paragraphs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n\n  continuation with **style**\n- second"} />,
    );

    expect(html).toContain(
      "<ul><li><p>first</p><p>continuation with <strong>style</strong></p></li><li><p>second</p></li></ul>",
    );
    expect(html).not.toContain("first<br/>continuation");
  });

  it("keeps task-list checkboxes inside loose-list first paragraphs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- [x] done\n\n  more detail\n- [ ] open"} />,
    );

    expect(html).toContain('class="task-list-item"');
    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> done</p><p>more detail</p></li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> open</p></li>',
    );
    expect(html).not.toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> <p>',
    );
  });

  it("keeps nested loose task-list checkboxes inside their first paragraphs", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- [x] parent\n  - [ ] child\n\n    child detail\n- [ ] next"} />,
    );

    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> parent</p><ul><li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> child</p><p>child detail</p></li></ul></li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> next</p></li>',
    );
    expect(html).not.toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> <p>child</p>',
    );
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

  it("counts ordered task-list items in the legacy tasklist progress bar", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. [ ] open\n2. [x] done"} showTasklistBar />,
    );

    expect(html).toContain('Tasks<span class="done-counter">(1/2)</span>');
    expect(html).toContain('class="bar red" style="width:50%" title="Tasklist"');
    expect(html).toContain("<ol>");
    expect(html).toContain('class="task-list-item"');
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

  it("parses Markdown blocks inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"> # Quoted\n> - item"} />);

    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<h1 id="quoted">Quoted<a class="head-anchor" href="#quoted">#</a></h1>',
    );
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>item</li>");
    expect(html).not.toContain("<p># Quoted");
    expect(html).not.toContain("<p>- item");
  });

  it("keeps loose-list continuations inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> - first\n>\n>   continuation with **style**\n> - second"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      "<ul><li><p>first</p><p>continuation with <strong>style</strong></p></li><li><p>second</p></li></ul>",
    );
    expect(html).not.toContain("</ul><p>  continuation");
    expect(html).not.toContain("<p>- second</p>");
  });

  it("parses setext headings inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> Primary\n> ===\n> Secondary\n> ---"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<h1 id="primary">Primary<a class="head-anchor" href="#primary">#</a></h1>',
    );
    expect(html).toContain(
      '<h2 id="secondary">Secondary<a class="head-anchor" href="#secondary">#</a></h2>',
    );
    expect(html).not.toContain("<p>Primary<br/>===");
    expect(html).not.toContain("<p>Secondary<br/>---");
  });

  it("parses indented code blocks inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={">     const value = 1;"} />);

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<pre><code>const value = 1;</code></pre>");
    expect(html).not.toContain("<p>    const value = 1;");
  });

  it("parses fenced code blocks inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> ```js\n> const value = '#1';\n> ```"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<pre><code");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).not.toContain("<p>```js");
    expect(html).not.toContain("issueLink");
  });

  it("parses horizontal rules inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> before\n>\n> ---\n> after"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<hr/>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<p>before<br/><br/>---");
  });

  it("splits blank-line paragraphs inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"> first\n>\n> second"} />);

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<p>first</p>");
    expect(html).toContain("<p>second</p>");
    expect(html).not.toContain("<p>first<br/><br/>second</p>");
  });
});
