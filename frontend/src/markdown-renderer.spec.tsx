import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  insertLegacyTasklistTemplate,
  LegacyMarkdownEditorShell,
  LegacyMarkdownHelp,
  MarkdownRenderer,
} from "./routes/-markdown-renderer";
import { MAX_HIGHLIGHTED_CODE_BLOCK_LENGTH } from "./routes/-syntax-highlighting";

describe("MarkdownRenderer", () => {
  it("renders the legacy embedded Markdown help shell used by common.editor", () => {
    const html = renderToStaticMarkup(<LegacyMarkdownHelp />);

    expect(html).toContain('class="markdown-help"');
    expect(html).toContain('class="markdown-help-nav"');
    expect(html).toContain("title.markdown.help");
    expect(html).toContain('data-toggle="markdown-help"');
    expect(html).toContain('data-target="markdownHeaders"');
    expect(html).toContain('data-target="markdownShortLinks"');
    expect(html).toContain('class="markdown-help-wrap"');
    expect(html).toContain('class="markdown-help-item markdownHeaders"');
    expect(html).toContain('class="markdown-help-item markdownShortLinks"');
    expect(html).toContain('class="markdown-help-item markdownTaskList"');
    expect(html).not.toContain('class="tasklist task-show"');
    expect(html).not.toContain('class="task-list-item"');
    expect(html).not.toContain('class="task-list-item-checkbox"');
    expect(html).toContain('<input type="checkbox"/> Todos');
    expect(html).toContain('<input readOnly="" type="checkbox" checked=""/> To do A');
    expect(html).toContain("Markdown Input");
    expect(html).toContain("Markdown Output");
    expect(html).toContain("- Green.");
    expect(html).toContain(
      "![title](https://repo.yona.io/assets/images/ico-like-small.png &quot;Yobi&quot;)",
    );
    expect(html).toContain('src="/assets/images/ico-like-small.png"');
    expect(html).toContain("Issue no: #2");
    expect(html).toContain("commit: @763575");
  });

  it("opts shared markdown labels into legacy messages while preserving key fallbacks", () => {
    const html = renderToStaticMarkup(
      <LegacyMarkdownEditorShell
        editId="edit-body"
        messages={(key, options) =>
          key === "title.markdown.help" ? "Translated Markdown Help" : (options?.fallback ?? key)
        }
        previewId="preview-body"
      >
        <textarea />
      </LegacyMarkdownEditorShell>,
    );
    const receiverHtml = renderToStaticMarkup(
      <LegacyMarkdownEditorShell
        editId="edit-receiver"
        messages={(key, options) =>
          key === "notification.receiver.list.title"
            ? "Translated receivers"
            : (options?.fallback ?? key)
        }
        previewId="preview-receiver"
      >
        <textarea />
      </LegacyMarkdownEditorShell>,
    );

    expect(html).toContain("Translated Markdown Help");
    expect(html).not.toContain("title.markdown.help");
    expect(receiverHtml).toContain("Translated receivers");
    expect(receiverHtml).not.toContain("notification.receiver.list.title");
  });

  it("inserts the legacy checklist template like common/scripts.scala.html", () => {
    expect(insertLegacyTasklistTemplate("", 0)).toEqual({
      cursorIndex: 39,
      value: "\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C",
    });
    expect(insertLegacyTasklistTemplate("Before", 0)).toEqual({
      cursorIndex: 45,
      value: "Before\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C",
    });
    expect(insertLegacyTasklistTemplate("BeforeAfter", 6)).toEqual({
      cursorIndex: 45,
      value: "Before\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo CAfter",
    });
  });

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

  it("sanitizes raw HTML-like blocks and keeps autolinks inert like legacy MarkdownApp", () => {
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

    expect(html).toContain('<a href="#">#1</a>');
    expect(html).toContain("<code>");
    expect(html).toContain("http://yobi.example.com #1 http://yobi.example.com");
    expect(html).toContain('<div id="#1">Test</div>');
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('href="/yona/owner/projectYobi/issue/1"');
    expect(html).not.toContain('href="http://yobi.example.com"');
  });

  it("collapses dangerous raw HTML hrefs while preserving legacy-safe formatting tags", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '<p><a href="java\nscript:alert(1)" class="danger">bad</a><br><strong>safe</strong><script>alert(1)</script></p>'
        }
      />,
    );

    expect(html).toContain('href="#"');
    expect(html).toContain('class="danger"');
    expect(html).toContain(">bad</a>");
    expect(html).toContain("<br/>");
    expect(html).toContain("<strong>safe</strong>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("alert(1)");
  });

  it("collapses entity-obfuscated javascript targets across Markdown and raw HTML", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[link](jav&#x61;script:alert(1)) ![image](jav&#x61;script:alert(2)) <a href="jav&#x61;script:alert(3)">raw</a> <iframe src="jav&#x61;script:alert(4)"></iframe>'
        }
      />,
    );

    expect(html).toContain('<a href="#">link</a>');
    expect(html).toContain('<img alt="image" src="#"/>');
    expect(html).toContain('<a href="#">raw</a>');
    expect(html).toContain("<iframe></iframe>");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("alert(");
    expect(html).not.toContain("<iframe src=");
  });

  it("strips raw script and style blocks while preserving legacy block boundaries", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            title: "Script issue",
          },
        ]}
        markdown={
          "<script>#1 http://example.com</script> [script](https://example.com/script)\n\n<style>#1 http://example.com</style> [style](https://example.com/style)\n\nbefore\n<script>#1 http://example.com</script>\n[after](https://example.com/after)"
        }
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain(" [script](https://example.com/script)");
    expect(html).toContain(" [style](https://example.com/style)");
    expect(html).toContain('<p>before</p><p><a href="https://example.com/after">after</a></p>');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<style");
    expect(html).not.toContain("#1");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('href="http://example.com"');
    expect(html).not.toContain('href="https://example.com/script"');
    expect(html).not.toContain('href="https://example.com/style"');
  });

  it("preserves legacy sanitizer media and checkbox raw HTML allowlist", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '<input type="checkbox" checked disabled onclick="bad()"> Task\n\n<input type="checkbox">\n[input-line](https://example.com/input-line)\n\n<img src="/a.png">\n[image-line](https://example.com/image-line)\n\n<hr> [hr-line](https://example.com/hr-line)\n\nhello <hr> [hr-inline](https://example.com/hr-inline)\n\n<source src="zpl:movie"> [source-line](https://example.com/source-line)\n\nbefore\n<source src="zpl:movie">\n[source-after](https://example.com/source-after)\n\nhello <source src="zpl:movie"> [source-inline](https://example.com/source-inline)\n\n<iframe src="https://example.com/embed" width="640" height="360" frameborder="0" allowfullscreen></iframe>\n\n<video controls preload="metadata" width="320"><source src="zpl:movie" type="video/mp4"></video> [video](https://example.com/video)\n\nbefore\n<img src="/a.png">\n[inline-image-line](https://example.com/inline-image-line)\n\nbefore\n<video><source src="zpl:movie"></video>\n[video-line](https://example.com/video-line)'
        }
      />,
    );

    expect(html).toContain('<input type="checkbox"');
    expect(html).toContain('readOnly=""');
    expect(html).toContain('disabled=""');
    expect(html).toContain('checked=""');
    expect(html).not.toContain("onclick");
    expect(html).toContain(
      '<input type="checkbox"/>\n[input-line](https://example.com/input-line)',
    );
    expect(html).toContain('<img src="/a.png"/>\n[image-line](https://example.com/image-line)');
    expect(html).toContain("<hr/> [hr-line](https://example.com/hr-line)");
    expect(html).toContain(
      '<p>hello <hr/> <a href="https://example.com/hr-inline">hr-inline</a></p>',
    );
    expect(html).toContain(
      '<source src="zpl:movie"/> [source-line](https://example.com/source-line)',
    );
    expect(html).toContain(
      '<p>before</p><source src="zpl:movie"/>\n[source-after](https://example.com/source-after)',
    );
    expect(html).toContain(
      '<p>hello <source src="zpl:movie"/> <a href="https://example.com/source-inline">source-inline</a></p>',
    );
    expect(html).toContain(
      '<p>before<br/><img src="/a.png"/><br/><a href="https://example.com/inline-image-line">inline-image-line</a></p>',
    );
    expect(html).not.toContain('href="https://example.com/input-line"');
    expect(html).not.toContain('href="https://example.com/image-line"');
    expect(html).not.toContain('href="https://example.com/hr-line"');
    expect(html).not.toContain('href="https://example.com/source-line"');
    expect(html).not.toContain('href="https://example.com/source-after"');
    expect(html).toContain(
      '<iframe src="https://example.com/embed" width="640" height="360" frameBorder="0" allowFullScreen=""></iframe>',
    );
    expect(html).toContain(
      '<video controls="" preload="metadata" width="320"><source src="zpl:movie" type="video/mp4"/></video>',
    );
    expect(html).toContain('<a href="https://example.com/video">video</a>');
    expect(html).toContain(
      '<p>before<br/><video><source src="zpl:movie"/></video><br/><a href="https://example.com/video-line">video-line</a></p>',
    );
  });

  it("drops unsafe raw HTML media URLs", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '<a href="javascript:alert(0)">unsafe</a>\n\n<iframe src="javascript:alert(1)"></iframe>\n\n<video><source src="javascript:alert(2)" type="video/mp4"></video>'
        }
      />,
    );

    expect(html).toContain("unsafe");
    expect(html).toContain("<iframe></iframe>");
    expect(html).toContain('<video><source type="video/mp4"/></video>');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("alert(");
  });

  it("drops unsafe raw video source URLs through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n\n<video controls><source src="javascript:alert(2)" type="video/mp4"></video>\n\nafter'
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain('<video controls=""><source type="video/mp4"/></video>');
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("alert(");
  });

  it("preserves unsafe raw iframe elements through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={'before\n\n<iframe src="javascript:alert(1)"></iframe>\n\nafter'}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<iframe></iframe>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("alert(");
  });

  it("renders single raw void blocks through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n\n<input type="checkbox" checked disabled onclick="bad()">\n\n<img src="/a.png" alt="A">\n\n<hr>\n\n<source src="zpl:movie">\n\nafter'
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain('<input type="checkbox" disabled="" readOnly="" checked=""/>');
    expect(html).not.toContain("onclick");
    expect(html).toContain('<img alt="A" src="/a.png"/>');
    expect(html).toContain("<hr/>");
    expect(html).toContain('<source src="zpl:movie"/>');
    expect(html).toContain("<p>after</p>");
  });

  it("preserves safe legacy raw HTML style declarations and drops unsafe CSS values", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '<span style="color: red; font-weight: bold; background-image: url(javascript:alert(1)); width: 12px">Styled</span>'
        }
      />,
    );

    expect(html).toContain('<span style="color:red;font-weight:bold;width:12px">Styled</span>');
    expect(html).not.toContain("background-image");
    expect(html).not.toContain("javascript:");
  });

  it("preserves legacy raw HTML ordered-list start attributes", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={'<ol start="5"><li>fifth</li></ol><ol start="bad"><li>plain</li></ol>'}
      />,
    );

    expect(html).toContain('<ol start="5"><li>fifth</li></ol>');
    expect(html).toContain("<ol><li>plain</li></ol>");
    expect(html).not.toContain('start="bad"');
  });

  it("parses Markdown around inline raw HTML tags like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            state: "open",
            title: "Raw custom issue",
          },
        ]}
        markdown={
          'hello <em>world</em> [link](https://example.com)\n\nhello <EM>world [link](https://example.com)</EM> outside\n\nhello <em title="A > B">world [quoted](https://example.com/quoted)</em> outside\n\nhello <span title="A < B">world</span> [quoted-left](https://example.com/quoted-left)\n\nhello <em><strong>[nested](https://example.com/nested)</strong></em> outside\n\nhello <SPAN CLASS="x">world</SPAN> http://example.com\n\nhello <BR> [break](https://example.com/break)\n\nhello <IMG SRC="/a.png" ALT="A > B"> [image](https://example.com/image)\n\nhello <sup>#1 http://example.com/raw</sup> [raw](https://example.com/raw-outside)\n\nhello <sup><em>#1</em></sup> [nested-raw](https://example.com/nested-raw)\n\n<a href="#">[inner](https://example.com/inner) **bold** #1 http://example.com/anchor</a> [anchor-outside](https://example.com/anchor-outside)\n\n<code>[code](https://example.com/code) **bold** #1 http://example.com/code-url help@example.com</code> [code-outside](https://example.com/code-outside)\n\n<A HREF="#">#1</A> [outside](https://example.com/outside)'
        }
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain('<p>hello <em>world</em> <a href="https://example.com">link</a></p>');
    expect(html).toContain(
      '<p>hello <em>world <a href="https://example.com">link</a></em> outside</p>',
    );
    expect(html).toContain(
      '<p>hello <em title="A &gt; B">world <a href="https://example.com/quoted">quoted</a></em> outside</p>',
    );
    expect(html).toContain(
      '<p>hello <span title="A &lt; B">world</span> <a href="https://example.com/quoted-left">quoted-left</a></p>',
    );
    expect(html).toContain(
      '<p>hello <em><strong><a href="https://example.com/nested">nested</a></strong></em> outside</p>',
    );
    expect(html).toContain(
      '<p>hello <span class="x">world</span> <a href="http://example.com">http://example.com</a></p>',
    );
    expect(html).toContain('<p>hello <br/> <a href="https://example.com/break">break</a></p>');
    expect(html).toContain(
      '<p>hello <img src="/a.png" alt="A &gt; B"/> <a href="https://example.com/image">image</a></p>',
    );
    expect(html).toContain(
      '<p>hello <a class="issueLink" data-issue-state="open" href="/owner/project/issue/1" title="Raw custom issue">#1</a> <a href="http://example.com/raw">http://example.com/raw</a> <a href="https://example.com/raw-outside">raw</a></p>',
    );
    expect(html).not.toContain("<sup>");
    expect(html).toContain(
      '<p>hello <em><a class="issueLink" data-issue-state="open" href="/owner/project/issue/1" title="Raw custom issue">#1</a></em> <a href="https://example.com/nested-raw">nested-raw</a></p>',
    );
    expect(html).toContain(
      '<p><a href="#"><a href="https://example.com/inner">inner</a> <strong>bold</strong> #1 http://example.com/anchor</a> <a href="https://example.com/anchor-outside">anchor-outside</a></p>',
    );
    expect(html).toContain(
      '<p><code><a href="https://example.com/code">code</a> <strong>bold</strong> #1 <a href="http://example.com/code-url">http://example.com/code-url</a> help@example.com</code> <a href="https://example.com/code-outside">code-outside</a></p>',
    );
    expect(html).toContain(
      '<p><a href="#">#1</a> <a href="https://example.com/outside">outside</a></p>',
    );
  });

  it("renders inline raw formatting with Markdown links through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n\nhello <em title="A > B">world [quoted](https://example.com/quoted)</em> outside\n\nhello <span class="x">world</span> http://example.com\n\nhello <strong>[guide][docs]</strong>\n\nhello <br> [break](https://example.com/break)\n\nhello <em>[titled]( <https://example.com/titled> "Title" ) and ![logo]( /logo.png "Logo" )</em>\n\nhello <em>\\*literal\\* and **strong**</em>\n\nhello <em>See <https://example.com/angle></em>\n\nafter\n\n[docs]: https://example.com/docs "Docs"'
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      '<p>hello <em title="A &gt; B">world <a href="https://example.com/quoted">quoted</a></em> outside</p>',
    );
    expect(html).toContain(
      '<p>hello <span class="x">world</span> <a href="http://example.com">http://example.com</a></p>',
    );
    expect(html).toContain(
      '<p>hello <strong><a href="https://example.com/docs" title="Docs">guide</a></strong></p>',
    );
    expect(html).toContain('<p>hello <br/> <a href="https://example.com/break">break</a></p>');
    expect(html).toContain(
      '<p>hello <em><a href="https://example.com/titled" title="Title">titled</a> and <img alt="logo" src="/logo.png" title="Logo"/></em></p>',
    );
    expect(html).toContain("<p>hello <em>*literal* and <strong>strong</strong></em></p>");
    expect(html).toContain(
      '<p>hello <em>See <a href="https://example.com/angle">https://example.com/angle</a></em></p>',
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("[docs]:");
    expect(html).not.toContain("<em>literal</em>");
  });

  it("renders a mixed compatible post body through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "Document issue",
          },
        ]}
        markdown={
          '# **Summary** [guide][docs]\n\n<span class="state">open</span> owner#7\nNext [guide][docs]\n\n- First [guide][docs]\n+ <em>Second http://example.com</em>\n\nName | Value\n- | -\n<span class="state">open</span> | <strong>[guide][docs]</strong>\n\n> <em>Quote [guide][docs]</em>\n\n[docs]: https://example.com/docs "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(
      '<h1 id="summary-guide"><strong>Summary</strong> <a href="https://example.com/docs" title="Docs">guide</a><a class="head-anchor" href="#summary-guide">#</a></h1>',
    );
    expect(html).toContain('<p><span class="state">open</span> <a class="issueLink"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('Next <a href="https://example.com/docs" title="Docs">guide</a></p>');
    expect(html).toContain(
      '<ul><li>First <a href="https://example.com/docs" title="Docs">guide</a></li></ul><ul><li><em>Second <a href="http://example.com">http://example.com</a></em></li></ul>',
    );
    expect(html).toContain("<table>");
    expect(html).toContain('<td><span class="state">open</span></td>');
    expect(html).toContain(
      '<td><strong><a href="https://example.com/docs" title="Docs">guide</a></strong></td>',
    );
    expect(html).toContain(
      '<blockquote><p><em>Quote <a href="https://example.com/docs" title="Docs">guide</a></em></p></blockquote>',
    );
    expect(html).not.toContain("[docs]:");
  });

  it("keeps block raw HTML opaque while parsing inline raw HTML paragraphs", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n<div>#1</div>\n[interrupted](https://example.com/interrupted)\n\nbefore\n<span>#1</span> [inline](https://example.com/inline)\n\n<div>#1</div> [outside](https://example.com/outside)\n\n<div title="A > B">#1</div> [quoted](https://example.com/quoted)\n\n<p title="A < B">[inside](https://example.com/inside)</p> [paragraph](https://example.com/paragraph)' +
          "\n\n<div>#1</div>\n[multiline](https://example.com/multiline)\n\n<tr><td>#1</td></tr>\n[row](https://example.com/row)"
        }
      />,
    );
    const inlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="hello <td>#1</td> [cell-inline](https://example.com/cell-inline)" />,
    );

    expect(html).toContain(
      "<p>before</p><div>#1</div>\n[interrupted](https://example.com/interrupted)",
    );
    expect(html).toContain(
      '<p>before<br/><span>#1</span> <a href="https://example.com/inline">inline</a></p>',
    );
    expect(html).toContain("<div>#1</div> [outside](https://example.com/outside)");
    expect(html).toContain('<div title="A &gt; B">#1</div> [quoted](https://example.com/quoted)');
    expect(html).toContain(
      '<p title="A &lt; B">[inside](https://example.com/inside)</p> [paragraph](https://example.com/paragraph)',
    );
    expect(html).toContain("<div>#1</div>\n[multiline](https://example.com/multiline)");
    expect(html).toContain("<tr><td>#1</td></tr>\n[row](https://example.com/row)");
    expect(inlineHtml).toContain(
      '<p>hello <td>#1</td> <a href="https://example.com/cell-inline">cell-inline</a></p>',
    );
    expect(html).not.toContain('href="https://example.com/outside"');
    expect(html).not.toContain('href="https://example.com/quoted"');
    expect(html).not.toContain('href="https://example.com/inside"');
    expect(html).not.toContain('href="https://example.com/paragraph"');
    expect(html).not.toContain('href="https://example.com/multiline"');
    expect(html).not.toContain('href="https://example.com/interrupted"');
    expect(html).not.toContain('href="https://example.com/row"');
  });

  it("keeps legacy marked HTML block tag families opaque at line start", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            title: "Raw block issue",
          },
        ]}
        markdown={
          "<section>#1</section>\n[section](https://example.com/section)\n\n<form>#1</form>\n[form](https://example.com/form)\n\n<dl><dt>#1</dt></dl>\n[definition](https://example.com/definition)\n\n<caption>#1</caption>\n[caption](https://example.com/caption)"
        }
        ownerName="owner"
        projectName="project"
      />,
    );
    const inlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="hello <section>#1</section> [inline](https://example.com/inline)" />,
    );

    expect(html).toContain("#1");
    expect(html).toContain("[section](https://example.com/section)");
    expect(html).toContain("[form](https://example.com/form)");
    expect(html).toContain("[definition](https://example.com/definition)");
    expect(html).toContain("[caption](https://example.com/caption)");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('href="https://example.com/section"');
    expect(html).not.toContain('href="https://example.com/form"');
    expect(html).not.toContain('href="https://example.com/definition"');
    expect(html).not.toContain('href="https://example.com/caption"');
    expect(inlineHtml).toContain('<p>hello #1 <a href="https://example.com/inline">inline</a></p>');
  });

  it("stops table bodies at legacy raw HTML block lines", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n<section>x</section>\n3 | 4"} />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).not.toContain("<td>3</td>");
    expect(html).not.toContain("<td>4</td>");
    expect(html).toContain("x");
    expect(html).toContain("3 | 4");
  });

  it("keeps self-closing legacy raw HTML block tags opaque at line start", () => {
    const paragraphHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"text\n<section/>\n[next](https://example.com)"} />,
    );
    const tableHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n<section/>\n3 | 4"} />,
    );
    const inlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"text <section/> [next](https://example.com)"} />,
    );

    expect(paragraphHtml).toContain("<p>text</p>");
    expect(paragraphHtml).toContain("[next](https://example.com)");
    expect(paragraphHtml).not.toContain('href="https://example.com"');
    expect(tableHtml).toContain("<table>");
    expect(tableHtml).toContain("<td>1</td>");
    expect(tableHtml).not.toContain("<td>3</td>");
    expect(tableHtml).toContain("3 | 4");
    expect(inlineHtml).toContain('<p>text  <a href="https://example.com">next</a></p>');
  });

  it("keeps inline block-tag HTML in paragraphs parsing surrounding Markdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"text <section>**raw**</section> [next](https://example.com)"} />,
    );

    expect(html).toContain(
      '<p>text <strong>raw</strong> <a href="https://example.com">next</a></p>',
    );
    expect(html).not.toContain("[next](https://example.com)");
  });

  it("ends lazy blockquotes before legacy raw HTML block lines", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> quoted\n<section>x</section>\nafter"} />,
    );

    expect(html).toContain("<blockquote><p>quoted</p></blockquote>");
    expect(html).not.toContain("<blockquote><p>quoted<br/>");
    expect(html).toContain("x");
    expect(html).toContain("after");
  });

  it("keeps raw pre block contents literal and resumes Markdown after closing tag", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            title: "Pre issue",
          },
        ]}
        markdown={
          "<pre>\n#1 http://example.com [inside](https://example.com/inside)\n</pre>\n[outside](https://example.com/outside)\n\nbefore\n<pre>#1 http://example.com</pre>\n[after](https://example.com/after)"
        }
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain(
      '<pre>\n\n#1 http://example.com [inside](https://example.com/inside)\n</pre><p><a href="https://example.com/outside">outside</a></p>',
    );
    expect(html).toContain(
      '<p>before</p><pre>#1 http://example.com</pre><p><a href="https://example.com/after">after</a></p>',
    );
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('href="http://example.com"');
    expect(html).not.toContain('href="https://example.com/inside"');
  });

  it("renders raw pre and code blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            title: "Raw issue",
          },
        ]}
        markdown={
          "before\n\n<pre>\n#1 http://example.com [inside](https://example.com/inside)\n</pre>\n\nmiddle\n\n<code>\n#1 [code](https://example.com/code)\n</code>\n\nafter"
        }
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      "<pre>\n\n#1 http://example.com [inside](https://example.com/inside)\n</pre>",
    );
    expect(html).toContain("<p>middle</p>");
    expect(html).toContain("<code>\n#1 [code](https://example.com/code)</code>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('href="http://example.com"');
    expect(html).not.toContain('href="https://example.com/inside"');
    expect(html).not.toContain('href="https://example.com/code"');
  });

  it("keeps raw HTML comments opaque to autolinks like legacy marked", () => {
    const inlineHtml = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            title: "Comment issue",
          },
        ]}
        markdown={"hello <!-- #1 http://example.com --> [outside](https://example.com/outside)"}
        ownerName="owner"
        projectName="project"
      />,
    );
    const blockHtml = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"<!-- http://example.com --> [outside](https://example.com/outside)"}
      />,
    );

    expect(inlineHtml).toContain('<p>hello  <a href="https://example.com/outside">outside</a></p>');
    expect(inlineHtml).not.toContain("issueLink");
    expect(inlineHtml).not.toContain('href="/owner/project/issue/1"');
    expect(inlineHtml).not.toContain('href="http://example.com"');
    expect(blockHtml).toContain(" [outside](https://example.com/outside)");
    expect(blockHtml).not.toContain('href="https://example.com/outside"');
    expect(blockHtml).not.toContain('href="http://example.com"');
  });

  it("matches legacy raw directive interruption after normal paragraph lines", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n<!-- #1 --> [comment](https://example.com/comment)\n\nbefore\n<![CDATA[#1]]> [cdata](https://example.com/cdata)\n\nbefore\n<?php echo "#1"; ?> [php](https://example.com/php)\n\nbefore\n<!DOCTYPE html> [doctype](https://example.com/doctype)'
        }
      />,
    );

    expect(html).toContain("<p>before</p><p> [comment](https://example.com/comment)</p>");
    expect(html).not.toContain('href="https://example.com/comment"');
    expect(html).toContain('<p>before<br/> <a href="https://example.com/cdata">cdata</a></p>');
    expect(html).toContain('<p>before<br/> <a href="https://example.com/php">php</a></p>');
    expect(html).toContain('<p>before<br/> <a href="https://example.com/doctype">doctype</a></p>');
    expect(html).not.toContain("#1");
    expect(html).not.toContain("CDATA");
    expect(html).not.toContain("&lt;?php");
    expect(html).not.toContain("&lt;!DOCTYPE");
  });

  it("renders standalone raw directives through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            title: "Directive issue",
          },
        ]}
        markdown={
          'before\n\n<!-- #1 http://example.com -->\n\n<![CDATA[#1 http://example.com]]>\n\n<?php echo "#1"; ?>\n\n<!DOCTYPE html>\n\nafter'
        }
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("#1");
    expect(html).not.toContain("http://example.com");
    expect(html).not.toContain("CDATA");
    expect(html).not.toContain("&lt;?php");
    expect(html).not.toContain("&lt;!DOCTYPE");
  });

  it("strips raw HTML declarations and processing instructions after parsing like legacy Yona sanitizer", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'hello <?php echo "http://example.com"; ?> [php](https://example.com/php)\n\n<!DOCTYPE html> [doctype](https://example.com/doctype)'
        }
      />,
    );

    expect(html).toContain('hello  <a href="https://example.com/php">php</a>');
    expect(html).toContain('<a href="https://example.com/doctype">doctype</a>');
    expect(html).not.toContain("&lt;?php");
    expect(html).not.toContain("&lt;!DOCTYPE");
    expect(html).not.toContain("echo");
    expect(html).not.toContain('href="http://example.com"');
  });

  it("strips raw CDATA sections after parsing like legacy Yona sanitizer", () => {
    const inlineHtml = renderToStaticMarkup(
      <MarkdownRenderer
        issueReferences={[
          {
            issueNumber: 1,
            ownerName: "owner",
            projectName: "project",
            title: "CDATA issue",
          },
        ]}
        markdown={"hello <![CDATA[http://example.com #1]]> [outside](https://example.com/outside)"}
        ownerName="owner"
        projectName="project"
      />,
    );
    const blockHtml = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"<![CDATA[http://example.com #1]]> [outside](https://example.com/outside)"}
      />,
    );

    expect(inlineHtml).toContain('<p>hello  <a href="https://example.com/outside">outside</a></p>');
    expect(inlineHtml).not.toContain("CDATA");
    expect(inlineHtml).not.toContain("issueLink");
    expect(inlineHtml).not.toContain('href="http://example.com"');
    expect(blockHtml).toContain(" [outside](https://example.com/outside)");
    expect(blockHtml).not.toContain("CDATA");
    expect(blockHtml).not.toContain('href="https://example.com/outside"');
  });

  it("decodes marked-compatible HTML entities in text labels but preserves code spans", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'AT&amp;T &#169; &#xA9; &#0; &#xD800; &#x110000; &copy; &colon; &trade; &unknown;\n\n[Tom &amp; Jerry &copy; &#0;](https://example.com "A &amp; B &trade; &#xD800;")\n\n![A &amp; B &reg; &#x110000;](/files/a.png "Image &amp; title &colon; &#0;")\n\n`&amp; &copy; &colon; &#0;`'
        }
      />,
    );

    expect(html).toContain("AT&amp;T © © � � � © : ™ &amp;unknown;");
    expect(html).toContain('title="A &amp; B ™ �"');
    expect(html).toContain(">Tom &amp; Jerry © �</a>");
    expect(html).toContain('alt="A &amp; B ® �"');
    expect(html).toContain('title="Image &amp; title : �"');
    expect(html).toContain("<code>&amp;amp; &amp;copy; &amp;colon; &amp;#0;</code>");
    expect(html).not.toContain("AT&amp;amp;T");
    expect(html).not.toContain("Tom &amp;amp; Jerry");
    expect(html).not.toContain("\u0000");
    expect(html).not.toContain("\ud800");
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

  it("splits setext headings before following paragraph text like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"A | B\n-\n1 | 2"} />);

    expect(html).toContain(
      '<h2 id="a-b">A | B<a class="head-anchor" href="#a-b">#</a></h2><p>1 | 2</p>',
    );
    expect(html).not.toContain("<p>A | B<br/>-<br/>1 | 2</p>");
    expect(html).not.toContain("<table>");
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

  it("uses rendered inline text for heading ids like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "# [Tom &amp; Jerry](https://example.com/a) and `code`\n\n# ![Alt &amp; Text](/a.png)"
        }
      />,
    );

    expect(html).toContain(
      '<h1 id="tom-jerry-and-code"><a href="https://example.com/a">Tom &amp; Jerry</a> and <code>code</code><a class="head-anchor" href="#tom-jerry-and-code">#</a></h1>',
    );
    expect(html).toContain(
      '<h1 id="alt-text"><img alt="Alt &amp; Text" src="/a.png"/><a class="head-anchor" href="#alt-text">#</a></h1>',
    );
    expect(html).not.toContain("https-example-com");
  });

  it("uses rendered inline text for setext heading ids like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"[Tom &amp; Jerry](https://example.com/a) and `code`\n-----"} />,
    );

    expect(html).toContain(
      '<h2 id="tom-jerry-and-code"><a href="https://example.com/a">Tom &amp; Jerry</a> and <code>code</code><a class="head-anchor" href="#tom-jerry-and-code">#</a></h2>',
    );
  });

  it("renders titled heading links and images through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '# [Title]( <https://example.com/title> "Title" ) and ![Logo]( /logo.png "Logo" )'
        }
      />,
    );

    expect(html).toContain(
      '<h1 id="title-and-logo"><a href="https://example.com/title" title="Title">Title</a> and <img alt="Logo" src="/logo.png" title="Logo"/><a class="head-anchor" href="#title-and-logo">#</a></h1>',
    );
  });

  it("renders safe escaped punctuation headings through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"# Keep \\*literal\\* beside **strong**"} />,
    );

    expect(html).toContain(
      '<h1 id="keep-literal-beside-strong">Keep *literal* beside <strong>strong</strong><a class="head-anchor" href="#keep-literal-beside-strong">#</a></h1>',
    );
    expect(html).not.toContain("<em>literal</em>");
  });

  it("renders formatted reference and Yona autolink headings through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Heading issue",
          },
        ]}
        markdown={
          '# **See** [guide][docs]\n\n_Issue_ owner#7\n-----\n\n[docs]: https://example.com/docs "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(
      '<h1 id="see-guide"><strong>See</strong> <a href="https://example.com/docs" title="Docs">guide</a><a class="head-anchor" href="#see-guide">#</a></h1>',
    );
    expect(html).toContain('<h2 id="issue-owner7"><em>Issue</em> <a class="issueLink"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Heading issue"');
    expect(html).toContain('data-issue-state="closed"');
    expect(html).toContain('<a class="head-anchor" href="#issue-owner7">#</a></h2>');
    expect(html).not.toContain("[docs]:");
  });

  it("renders raw inline HTML inside headings like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '# <em>Title</em>\n\n# <span class="x">Title</span> &amp; More\n\n# <img src="/a.png" alt="Alt"> Title'
        }
      />,
    );

    expect(html).toContain(
      '<h1 id="title"><em>Title</em><a class="head-anchor" href="#title">#</a></h1>',
    );
    expect(html).toContain(
      '<h1 id="title-more"><span class="x">Title</span> &amp; More<a class="head-anchor" href="#title-more">#</a></h1>',
    );
    expect(html).toContain(
      '<h1 id="-title"><img src="/a.png" alt="Alt"/> Title<a class="head-anchor" href="#-title">#</a></h1>',
    );
  });

  it("renders raw formatting headings through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={'# <em>Title</em>\n\n<span class="x">Secondary</span> &amp; More\n-----\n\nafter'}
      />,
    );

    expect(html).toContain(
      '<h1 id="title"><em>Title</em><a class="head-anchor" href="#title">#</a></h1>',
    );
    expect(html).toContain(
      '<h2 id="secondary-more"><span class="x">Secondary</span> &amp; More<a class="head-anchor" href="#secondary-more">#</a></h2>',
    );
    expect(html).toContain("<p>after</p>");
  });

  it("uses legacy marked entity unescape behavior for heading ids", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"# AT&amp;T &colon; &#169; &#xA9;"} />,
    );

    expect(html).toContain(
      '<h1 id="att-">AT&amp;T : © ©<a class="head-anchor" href="#att-">#</a></h1>',
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

  it("renders very long SQL fenced blocks as plain source without syntax highlighting", () => {
    const sqlLine = "SELECT body FROM release_candidate_table WHERE body LIKE '%markdown%';";
    const longSql = `${sqlLine}\n`
      .repeat(Math.ceil((MAX_HIGHLIGHTED_CODE_BLOCK_LENGTH + 1) / sqlLine.length))
      .trimEnd();
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={`\`\`\`sql\n${longSql}\n\`\`\``} />,
    );

    expect(html).toContain('class="sql"');
    expect(html).toContain("release_candidate_table");
    expect(html).not.toContain("syntax-token");
  });

  it("renders any very long fenced block as plain source without syntax highlighting", () => {
    const rustLine = "fn release_candidate() { return; }";
    const longRust = `${`${rustLine}\n`.repeat(
      Math.ceil((MAX_HIGHLIGHTED_CODE_BLOCK_LENGTH + 1) / rustLine.length),
    )}fn release_candidate_tail() { return; }`;
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={`\`\`\`rust\n${longRust}\n\`\`\``} />,
    );

    expect(html).toContain('class="rust"');
    expect(html).toContain("release_candidate_tail");
    expect(html).not.toContain("syntax-token");
  });

  it("recognizes legacy Highlight.js Rust numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```rust",
          "#[derive(Debug)]",
          'let raw = r#"legacy"#;',
          "fn borrow<'a>(value: &'a str) -> &'a str { value }",
          "let flags = 0b1010u32;",
          "let mode = 0o755usize;",
          "let color = 0xFF_u8;",
          "let ratio = 1_000.5e-2f64;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="rust">');
    expect(html).toContain('class="syntax-token syntax-keyword">#[derive(Debug)]</span>');
    expect(html).toContain('class="syntax-token syntax-string">r#&quot;legacy&quot;#</span>');
    expect(html).toContain('class="syntax-token syntax-title">borrow</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&#x27;a</span>');
    expect(html).toContain('class="syntax-token syntax-number">0b1010u32</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755usize</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_u8</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.5e-2f64</span>');
  });

  it("recognizes legacy code language aliases and JVM keywords in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```rs",
          "pub fn main() {",
          "  let value = 1;",
          "}",
          "```",
          "",
          "```java",
          "package models;",
          "@Deprecated",
          "public final class Issue {}",
          "public String render() { return true; }",
          "```",
          "",
          "```scala",
          "@deprecated",
          "object Issue {",
          "  def render() = true",
          "  val state = true",
          "}",
          "```",
          "",
          "```ts",
          "export type IssueState = 'open';",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="rs">');
    expect(html).toContain('class="syntax-token syntax-keyword">pub</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">fn</span>');
    expect(html).toContain('<code class="java">');
    expect(html).toContain('class="syntax-token syntax-keyword">package</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@Deprecated</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">final</span>');
    expect(html).toContain('class="syntax-token syntax-title">Issue</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('<code class="scala">');
    expect(html).toContain('class="syntax-token syntax-keyword">@deprecated</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">object</span>');
    expect(html).toContain('class="syntax-token syntax-title">Issue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">val</span>');
    expect(html).toContain('<code class="ts">');
    expect(html).toContain('class="syntax-token syntax-keyword">export</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">type</span>');
  });

  it("recognizes legacy Highlight.js Java numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```java",
          "long flags = 0b1010_0101L;",
          "int color = 0xFF_00AA;",
          "double ratio = 1_000.5e-2F;",
          "float precise = .25f;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="java">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101L</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_00AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.5e-2F</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25f</span>');
  });

  it("recognizes legacy Highlight.js Java JSP aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```jsp", "public final class IssueView {", "  return true;", "}", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="jsp">');
    expect(html).toContain('class="syntax-token syntax-keyword">public</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">final</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
  });

  it("recognizes legacy Highlight.js Scala numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```scala",
          "val color = 0xCAFE_F00D",
          "val ratio = -1.5e-2",
          "val precise = 1_000.25e+3d",
          "val leading = .25e+2",
          "val longValue = 42L",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="scala">');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE_F00D</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3d</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">42L</span>');
  });

  it("recognizes legacy Highlight.js JavaScript and TypeScript built-ins in fenced blocks", () => {
    const tsAny = ["a", "ny"].join("");
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```javascript",
          '"use strict"',
          "function renderIssue(issue) {",
          "  const card = { title: `Issue ${issue.id}` };",
          "}",
          "class IssueCard {}",
          "const values = Array.from([1, 2]);",
          "console.log(Promise.resolve(values));",
          "```",
          "",
          "```ts",
          "export type Loader = (input: string) => Promise<number>;",
          "const active: boolean = true;",
          `const payload: ${tsAny} = {};`,
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="javascript">');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;use strict&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-title">renderIssue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">title</span>');
    expect(html).toContain('class="syntax-token syntax-string">`Issue ${issue.id}`</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueCard</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Array</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">console</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Promise</span>');
    expect(html).toContain('<code class="ts">');
    expect(html).toContain('class="syntax-token syntax-keyword">string</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">number</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">boolean</span>');
    expect(html).toContain(`class="syntax-token syntax-keyword">${tsAny}</span>`);
  });

  it("recognizes legacy Highlight.js JavaScript numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```js",
          "const flags = 0b1010;",
          "const mask = 0o755;",
          "const color = 0xFF00AA;",
          "const ratio = 1.5e-2;",
          "const offset = .25e+2;",
          "const negative = -0xFF;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="js">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF00AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">-0xFF</span>');
  });

  it("recognizes legacy Highlight.js Go language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```golang",
          "package main",
          "func main() {",
          "  defer println(true)",
          "  go func() { select {} }()",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="golang">');
    expect(html).toContain('class="syntax-token syntax-keyword">package</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">func</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">defer</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">go</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">select</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
  });

  it("recognizes legacy Highlight.js Go function titles in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```go", "func main() {", "}", "func (s *Server) Serve() {", "}", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="go">');
    expect(html).toContain('class="syntax-token syntax-title">main</span>');
    expect(html).toContain('class="syntax-token syntax-title">Serve</span>');
  });

  it("recognizes legacy Highlight.js Go numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```go",
          "var binary = 0b1010_0110",
          "var octal = 0o755",
          "var color = 0xFF",
          "var mask = 0xFF_00",
          "var ratio = -1.5e-2",
          "var precise = 1_000.25e+3",
          "var imaginary = 42i",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="go">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0110</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_00</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
    expect(html).toContain('class="syntax-token syntax-number">42i</span>');
  });

  it("recognizes legacy Highlight.js C# language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```csharp",
          "using System;",
          "namespace Yona {",
          "  public async Task<string> RenderAsync() {",
          "    var ready = await LoadAsync();",
          "    return null;",
          "  }",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="csharp">');
    expect(html).toContain('class="syntax-token syntax-keyword">using</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">namespace</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">public</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">async</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">string</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">var</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">await</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">null</span>');
  });

  it("recognizes legacy Highlight.js C# numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```csharp",
          "var flags = 0b1010_0101;",
          "var color = 0xFF_AA;",
          "var ratio = -1.5e-2;",
          "var precise = 1_000.25e+3M;",
          "var leading = .25e+2;",
          "var count = 42UL;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="csharp">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3M</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">42UL</span>');
  });

  it("recognizes legacy Highlight.js C# verbatim and interpolated strings in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```csharp",
          'var path = @"C:\\projects\\yona";',
          'var label = $"Issue {number}";',
          'var query = $@"SELECT ""title"" FROM issues";',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="csharp">');
    expect(html).toContain(
      'class="syntax-token syntax-string">@&quot;C:\\projects\\yona&quot;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-string">$&quot;Issue {number}&quot;</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">$@&quot;SELECT &quot;&quot;title&quot;&quot; FROM issues&quot;</span>',
    );
  });

  it("recognizes legacy Highlight.js C# preprocessor meta lines in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```cs", "#region issue-list", "var ready = true;", "#endif", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="cs">');
    expect(html).toContain('class="syntax-token syntax-keyword">#region issue-list</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">#endif</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">var</span>');
  });

  it("recognizes legacy Highlight.js Elixir language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```elixir",
          "defmodule Yona.Notification do",
          "  def render(value) do",
          "    case value do",
          "      nil -> false",
          "      _ -> true",
          "    end",
          "  end",
          "end",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="elixir">');
    expect(html).toContain('class="syntax-token syntax-keyword">defmodule</span>');
    expect(html).toContain('class="syntax-token syntax-title">Yona</span>');
    expect(html).toContain('class="syntax-token syntax-title">Notification</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">do</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">case</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">nil</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">false</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">end</span>');
  });

  it("recognizes legacy Highlight.js Elixir numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```elixir",
          "flags = 0b1010_0101",
          "mode = 0o755",
          "legacy_mode = 0755",
          "value = 0xFF_AA",
          "count = 1_000.25",
          "ratio = -1.5e-2",
          "leading = .25e+2",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="elixir">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
  });

  it("recognizes legacy Highlight.js Elixir symbols and variables in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```elixir",
          "status = :ok",
          "opts = [visible?: true, retry!: false]",
          "$count = @value + @@total",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="elixir">');
    expect(html).toContain('class="syntax-token syntax-keyword">:ok</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">visible?:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">retry!:</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$count</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@value</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@@total</span>');
  });

  it("recognizes legacy Highlight.js Elixir hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```elixir", "# legacy comment", "def run, do: true", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="elixir">');
    expect(html).toContain('class="syntax-token syntax-comment"># legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
  });

  it("recognizes legacy Highlight.js Haskell aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```hs",
          "{-# LANGUAGE OverloadedStrings #-}",
          "module Yona.Notification where",
          "import qualified Data.Text as Text",
          "data State = Open | Closed deriving Show",
          "render value = case value of",
          '  Open -> let label = Text.pack "open" in label',
          '  Closed -> Text.pack "closed"',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="hs">');
    expect(html).toContain(
      'class="syntax-token syntax-keyword">{-# LANGUAGE OverloadedStrings #-}</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">module</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Yona</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Notification</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">where</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">import</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">qualified</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Data</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Text</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">data</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">State</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Open</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Closed</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Show</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">deriving</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">case</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">of</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">in</span>');
  });

  it("recognizes legacy Highlight.js Haskell numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```hs", "hexValue = 0xFF", "ratio = -1.5e-2", "leading = .25e+2", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="hs">');
    expect(html).toContain('class="syntax-token syntax-number">0xFF</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
  });

  it("recognizes legacy Highlight.js Haskell common number-mode literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```haskell",
          "binaryValue = 0b1010_0101",
          "octalValue = 0o755",
          "hexValue = 0xCAFE_F00D",
          "ratio = 1_000.25e+3",
          "negative = -42",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="haskell">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE_F00D</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
    expect(html).toContain('class="syntax-token syntax-number">-42</span>');
  });

  it("recognizes legacy Highlight.js Lua language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```lua",
          "local function render(value)",
          "  if value == nil then",
          "    return false",
          "  else",
          "    return true",
          "  end",
          "end",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="lua">');
    expect(html).toContain('class="syntax-token syntax-keyword">local</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">nil</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">then</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">false</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">else</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">end</span>');
  });

  it("recognizes legacy Highlight.js Lua comments and numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```lua",
          "-- render count",
          "--[[ legacy long comment ]]",
          "--[=[ legacy equal long comment ]=]",
          "local message = [[legacy long string]]",
          "local literal = [=[legacy equal long string]=]",
          "local value = 0xFF",
          "local ratio = .25e+2",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="lua">');
    expect(html).toContain('class="syntax-token syntax-comment">-- render count</span>');
    expect(html).toContain(
      'class="syntax-token syntax-comment">--[[ legacy long comment ]]</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-comment">--[=[ legacy equal long comment ]=]</span>',
    );
    expect(html).toContain('class="syntax-token syntax-string">[[legacy long string]]</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">[=[legacy equal long string]=]</span>',
    );
    expect(html).toContain('class="syntax-token syntax-number">0xFF</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
  });

  it("recognizes legacy Highlight.js Clojure aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```clj",
          "(def render-state",
          "  (letfn [(open? [^String state] (fn? state))]",
          "    (doseq [item items]",
          '      (println :issue/open "open"))))',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="clj">');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">letfn</span>');
    expect(html).toContain('class="syntax-token syntax-comment">^String</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">fn?</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">doseq</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">:issue/open</span>');
  });

  it("recognizes legacy Highlight.js Clojure REPL prompts in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```clojure-repl",
          'user=> (def state "open")',
          "yona.core=> (println true)",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="clojure-repl">');
    expect(html).toContain('class="syntax-token syntax-keyword">user=&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">yona.core=&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">println</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;open&quot;</span>');
  });

  it("recognizes legacy Highlight.js Markdown aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```mkdown",
          "# Release Notes",
          "> quoted **strong** and *emphasis*",
          "- [docs](https://example.com)",
          "10. ordered item",
          "`code`",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="mkdown">');
    expect(html).toContain('class="syntax-token syntax-keyword">#</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-string">**strong**</span>');
    expect(html).toContain('class="syntax-token syntax-string">*emphasis*</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">-</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">10.</span>');
    expect(html).toContain('class="syntax-token syntax-string">[docs]</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">(https://example.com)</span>');
    expect(html).toContain('class="syntax-token syntax-string">`code`</span>');
  });

  it("recognizes legacy Highlight.js CSS-family selector tokens in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```scss",
          "@media screen { .board #main:hover { color: #fff !important; margin-top: 1px; } }",
          '.item[data-state="open"] { display: none; }',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="scss">');
    expect(html).toContain('class="syntax-token syntax-keyword">@media</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">.board</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">#main</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">:hover</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">color</span>');
    expect(html).toContain('class="syntax-token syntax-number">#fff</span>');
    expect(html).toContain('class="syntax-token syntax-meta">!important</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">margin-top</span>');
    expect(html).toContain('class="syntax-token syntax-number">1px</span>');
    expect(html).toContain(
      'class="syntax-token syntax-keyword">[data-state=&quot;open&quot;]</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">display</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">none</span>');
  });

  it("recognizes legacy Highlight.js SCSS and Less variable tokens in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```scss",
          "$brand-color: #0af;",
          ".button { color: $brand-color; }",
          "```",
          "",
          "```less",
          "@brand-color: #0af;",
          ".button { color: @{brand-color}; border-color: @brand-color; }",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="scss">');
    expect(html).toContain('<code class="less">');
    expect(html).toContain('class="syntax-token syntax-identifier">$brand-color</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@brand-color</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@{brand-color}</span>');
    expect(html).toContain('class="syntax-token syntax-number">#0af</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">color</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">border-color</span>');
  });

  it("recognizes legacy Highlight.js CMake aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```cmake.in",
          "cmake_minimum_required(VERSION 3.20)",
          "PROJECT(YonaPort)",
          "add_executable(yona main.cpp)",
          "if(ON)",
          "  target_link_libraries(yona PRIVATE core)",
          "endif()",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="cmake.in">');
    expect(html).toContain('class="syntax-token syntax-keyword">cmake_minimum_required</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">PROJECT</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">add_executable</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">ON</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">target_link_libraries</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">endif</span>');
  });

  it("recognizes legacy Highlight.js CMake hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```cmake", "# configure target", "project(YonaPort)", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="cmake">');
    expect(html).toContain('class="syntax-token syntax-comment"># configure target</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">project</span>');
  });

  it("recognizes legacy Highlight.js CMake variable tokens in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```cmake",
          "set(SOURCE_DIR ${PROJECT_SOURCE_DIR})",
          "message(STATUS ${SOURCE_DIR})",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="cmake">');
    expect(html).toContain('class="syntax-token syntax-identifier">${PROJECT_SOURCE_DIR}</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${SOURCE_DIR}</span>');
  });

  it("recognizes legacy Highlight.js Gradle language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```gradle",
          "buildscript {",
          "  // legacy comment",
          "  repositories { flatDir { dirs 'libs' } }",
          "}",
          "task copyAssets(type: Copy) {",
          "  maxParallelForks = 1_000",
          "  versionCode = -1.5e+2",
          "  from sourceSets.main.resources",
          "  into destinationDir",
          "  doLast { println true }",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="gradle">');
    expect(html).toContain('class="syntax-token syntax-comment">// legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">buildscript</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">repositories</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">flatDir</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">task</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Copy</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e+2</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">from</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">sourceSets</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">into</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">destinationDir</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">doLast</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">println</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
  });

  it("recognizes legacy Highlight.js Makefile aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```mk",
          "define banner",
          "\t@echo building",
          "endef",
          "ifeq ($(MODE),release)",
          "include config.mk",
          "else",
          "override MODE := debug",
          "endif",
          "export MODE",
          ".PHONY: all",
          "all: build",
          "\t@echo $(MODE) $@",
          "\t@echo 1_000 -1.5e+2 .25e-2",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="mk">');
    expect(html).toContain('class="syntax-token syntax-keyword">define</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">endef</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">ifeq</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">include</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">else</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">override</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">endif</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">export</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">.PHONY:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">all:</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$(MODE)</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$@</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e-2</span>');
  });

  it("recognizes legacy Highlight.js Makefile hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```makefile", "# build target", "include config.mk", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="makefile">');
    expect(html).toContain('class="syntax-token syntax-comment"># build target</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">include</span>');
  });

  it("recognizes legacy Highlight.js Perl aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```pl",
          "use strict;",
          "sub render_issue {",
          "my @items = split /,/, 'a,b';",
          "foreach my $item (@items) {",
          "  if ($item) {",
          "    print $item;",
          "    return $item;",
          "  }",
          "}",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="pl">');
    expect(html).toContain('class="syntax-token syntax-keyword">use</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">sub</span>');
    expect(html).toContain('class="syntax-token syntax-title">render_issue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">my</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">split</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">foreach</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$item</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@items</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">print</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
  });

  it("recognizes legacy Highlight.js Perl hash comments and numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```perl",
          "# render counts",
          "my $mode = 0755;",
          "my $color = 0xFF_AA;",
          "my $total = 1_000.25;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="perl">');
    expect(html).toContain('class="syntax-token syntax-comment"># render counts</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$mode</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$color</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$total</span>');
    expect(html).toContain('class="syntax-token syntax-number">0755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25</span>');
  });

  it("recognizes legacy Highlight.js Basic language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```basic",
          "10 INPUT name$",
          '20 IF name$ = "Yona" THEN GOSUB 100 ELSE GOTO 200',
          "30 PRINT name$",
          "40 END",
          "100 RETURN",
          "200 STOP",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="basic">');
    expect(html).toContain('class="syntax-token syntax-keyword">INPUT</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">IF</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">THEN</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">GOSUB</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">ELSE</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">GOTO</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">PRINT</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">END</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">RETURN</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">STOP</span>');
  });

  it("recognizes legacy Highlight.js Basic comments and numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```basic",
          "10 REM render counts",
          "20 PRINT &HFF",
          "30 PRINT &O755",
          "40 PRINT 123.5#",
          "50 PRINT 1.25D+3",
          "60 ' done",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="basic">');
    expect(html).toContain('class="syntax-token syntax-comment">REM render counts</span>');
    expect(html).toContain('class="syntax-token syntax-number">&amp;HFF</span>');
    expect(html).toContain('class="syntax-token syntax-number">&amp;O755</span>');
    expect(html).toContain('class="syntax-token syntax-number">123.5#</span>');
    expect(html).toContain('class="syntax-token syntax-number">1.25D+3</span>');
    expect(html).toContain('class="syntax-token syntax-comment">&#x27; done</span>');
  });

  it("recognizes legacy Highlight.js AsciiDoc language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```adoc",
          "= Yona Port",
          ".Legacy caption",
          "[source,rust]",
          ":toc:",
          "link:https://example.com/yona[Yona Docs]",
          "image::logo.png[Logo]",
          "NOTE: Keep the legacy screen flow",
          "IMPORTANT: Render Markdown in React",
          "WARNING: Do not redesign the UI",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="adoc">');
    expect(html).toContain('class="syntax-token syntax-keyword">=</span>');
    expect(html).toContain('class="syntax-token syntax-title">.Legacy caption</span>');
    expect(html).toContain('class="syntax-token syntax-meta">[source,rust]</span>');
    expect(html).toContain('class="syntax-token syntax-meta">:toc:</span>');
    expect(html).toContain('class="syntax-token syntax-string">[Yona Docs]</span>');
    expect(html).toContain('class="syntax-token syntax-string">[Logo]</span>');
    expect(html).toContain('class="syntax-token syntax-string">NOTE</span>');
    expect(html).toContain('class="syntax-token syntax-string">IMPORTANT</span>');
    expect(html).toContain('class="syntax-token syntax-string">WARNING</span>');
  });

  it("recognizes legacy Highlight.js AsciiDoc comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```adoc",
          "// keep legacy layout",
          "////",
          "legacy block comment",
          "////",
          "NOTE: Keep the legacy screen flow",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="adoc">');
    expect(html).toContain('class="syntax-token syntax-comment">// keep legacy layout</span>');
    expect(html).toContain('class="syntax-token syntax-comment">legacy block comment</span>');
    expect(html).toContain('class="syntax-token syntax-string">NOTE</span>');
  });

  it("recognizes legacy Highlight.js AsciiDoc quote blocks in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```adoc",
          "____",
          "Keep the legacy quote tone",
          "____",
          "NOTE: Back out",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="adoc">');
    expect(html).toContain('class="syntax-token syntax-quote">____</span>');
    expect(html).toContain('class="syntax-token syntax-quote">Keep the legacy quote tone</span>');
    expect(html).toContain('class="syntax-token syntax-string">NOTE</span>');
  });

  it("recognizes legacy Highlight.js AsciiDoc passthrough XML blocks in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```adoc",
          "++++",
          '<span class="state">open</span>',
          "++++",
          "NOTE: Back out",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="adoc">');
    expect(html).toContain('class="syntax-token syntax-keyword">span</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;state&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-string">NOTE</span>');
  });

  it("recognizes legacy Highlight.js python language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```py", "def render(value):", "  return True if value else None", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="py">');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">True</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">None</span>');
  });

  it("recognizes legacy Highlight.js Python GYP aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```gyp", "def configure(value):", "  return True", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="gyp">');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">True</span>');
  });

  it("recognizes legacy Highlight.js Python hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```python",
          "# legacy comment",
          "def render(value):",
          "  return True",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-comment"># legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
  });

  it("recognizes legacy Highlight.js Python numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```python",
          "flags = 0b1010",
          "legacy_flags = 0b1010L",
          "mask = 0o755",
          "legacy_mask = 0o755J",
          "color = 0xFF",
          "legacy_color = 0xFFl",
          "ratio = 1.5e-2",
          "debt = -1.5e-2",
          "threshold = .5",
          "floor = -.5",
          "offset = -0xFF",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010</span>');
    expect(html).toContain('class="syntax-token syntax-number">0b1010L</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755J</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFFl</span>');
    expect(html).toContain('class="syntax-token syntax-number">1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.5</span>');
    expect(html).toContain('class="syntax-token syntax-number">-.5</span>');
    expect(html).toContain('class="syntax-token syntax-number">-0xFF</span>');
  });

  it("recognizes legacy Highlight.js Python REPL prompts in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```python", ">>> print(1)", "... print(2)", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-keyword">&gt;&gt;&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">...</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">print</span>');
  });

  it("recognizes legacy Highlight.js Python decorator meta lines in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```python",
          "@app.route('/ready')",
          "def ready():",
          "  return True",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-keyword">@app.route</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
  });

  it("recognizes legacy Highlight.js Python triple-quoted strings in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```python", '"""ready"""', "value = '''done'''", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;&quot;&quot;ready&quot;&quot;&quot;</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-string">&#x27;&#x27;&#x27;done&#x27;&#x27;&#x27;</span>',
    );
  });

  it("recognizes legacy Highlight.js Python f-string interpolation in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```python",
          'message = f"ready {value}"',
          'details = f"""ready {value}"""',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-string">f&quot;ready </span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">{</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">value</span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">}</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-string">f&quot;&quot;&quot;ready </span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;&quot;&quot;</span>');
  });

  it("recognizes legacy Highlight.js Python built-ins in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```python", "missing = NotImplemented", "marker = Ellipsis", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-keyword">NotImplemented</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Ellipsis</span>');
  });

  it("recognizes legacy Highlight.js Python prefixed strings in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```python",
          'raw = r"c:\\path"',
          "blob = br'data'",
          "label = u'name'",
          'plain = f"""ready"""',
          "combo = rf'''done'''",
          'raw_block = r"""c:\\path"""',
          "unicode_block = u'''name'''",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-string">r&quot;c:\\path&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-string">br&#x27;data&#x27;</span>');
    expect(html).toContain('class="syntax-token syntax-string">u&#x27;name&#x27;</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">f&quot;&quot;&quot;ready&quot;&quot;&quot;</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-string">rf&#x27;&#x27;&#x27;done&#x27;&#x27;&#x27;</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-string">r&quot;&quot;&quot;c:\\path&quot;&quot;&quot;</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-string">u&#x27;&#x27;&#x27;name&#x27;&#x27;&#x27;</span>',
    );
  });

  it("recognizes legacy Highlight.js Python declaration titles and params in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```python",
          'def render(value, retries=3, marker="ok"):',
          "class Widget(Base):",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="python">');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain(
      'class="syntax-token syntax-params">(value, retries=3, marker=&quot;ok&quot;)</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">Widget</span>');
    expect(html).toContain('class="syntax-token syntax-params">(Base)</span>');
  });

  it("recognizes legacy Highlight.js shell language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```sh", "if test -f build.sh; then", "  echo ready", "fi", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="sh">');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">then</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">fi</span>');
  });

  it("recognizes legacy Highlight.js shell console alias in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```console", "if test -f build.sh; then", "  echo ready", "fi", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="console">');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">then</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">fi</span>');
  });

  it("recognizes legacy Highlight.js shell hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```bash", "# deploy preview", "echo ready", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="bash">');
    expect(html).toContain('class="syntax-token syntax-comment"># deploy preview</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
  });

  it("recognizes legacy Highlight.js shell variable tokens in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```bash",
          "echo $APP_HOME ${BUILD_DIR} $?",
          "test $# -gt 0 && echo $1",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="bash">');
    expect(html).toContain('class="syntax-token syntax-identifier">$APP_HOME</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${BUILD_DIR}</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$?</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$#</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$1</span>');
  });

  it("recognizes legacy Highlight.js SQL keywords in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```sql",
          "select id from issues where state = 'open'",
          "order by created_at desc",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="sql">');
    expect(html).toContain('class="syntax-token syntax-keyword">select</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">from</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">where</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">order</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">by</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">desc</span>');
  });

  it("recognizes legacy Highlight.js SQL comments and numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```sql",
          "-- legacy comment",
          "/* legacy block comment */",
          "select 0xFF_AA, -1_000.25e+3 from issues",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="sql">');
    expect(html).toContain('class="syntax-token syntax-comment">-- legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-comment">/* legacy block comment */</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">select</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1_000.25e+3</span>');
  });

  it("recognizes legacy Highlight.js Ruby language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```rb",
          "class Issue",
          "  def open?",
          "    @issue = $global",
          "    @@count = 1",
          "    status = :open",
          "    options = { legacy: true }",
          "    true",
          "  end",
          "end",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="rb">');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">Issue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-title">open?</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@issue</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$global</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@@count</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">:open</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">legacy:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">end</span>');
  });

  it("recognizes legacy Highlight.js Ruby package aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```gemspec", "Gem::Specification.new do |spec|", "  true", "end", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="gemspec">');
    expect(html).toContain('class="syntax-token syntax-keyword">do</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">end</span>');
  });

  it("recognizes legacy Highlight.js Ruby line comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```rb", "# legacy comment", "class Issue", "end", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="rb">');
    expect(html).toContain('class="syntax-token syntax-comment"># legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
  });

  it("recognizes legacy Highlight.js Ruby numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```rb", "mask = 0xFF", "mode = 0755", "size = 1_024", "empty = 0", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="rb">');
    expect(html).toContain('class="syntax-token syntax-number">0xFF</span>');
    expect(html).toContain('class="syntax-token syntax-number">0755</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_024</span>');
    expect(html).toContain('class="syntax-token syntax-number">0</span>');
  });

  it("recognizes legacy Highlight.js PHP language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```php3",
          "<?php",
          "function render_issue($issue) {",
          "  echo true;",
          "  return null;",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="php3">');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-title">render_issue</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$issue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">null</span>');
  });

  it("recognizes legacy Highlight.js PHP comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```php",
          "<?php",
          "# legacy comment",
          "// slash comment",
          "/* block comment */",
          "echo true;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="php">');
    expect(html).toContain('class="syntax-token syntax-comment"># legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-comment">// slash comment</span>');
    expect(html).toContain('class="syntax-token syntax-comment">/* block comment */</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
  });

  it("recognizes legacy Highlight.js PHP numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```php",
          "<?php",
          "$mask = 0xFF;",
          "$flags = 0b1010;",
          "$ratio = 1.5e-2;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="php">');
    expect(html).toContain('class="syntax-token syntax-identifier">$mask</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$flags</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$ratio</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF</span>');
    expect(html).toContain('class="syntax-token syntax-number">0b1010</span>');
    expect(html).toContain('class="syntax-token syntax-number">1.5e-2</span>');
  });

  it("recognizes legacy Highlight.js C++ language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```hpp",
          "template <typename T>",
          "constexpr T value() noexcept {",
          "  return static_cast<T>(0);",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="hpp">');
    expect(html).toContain('class="syntax-token syntax-keyword">template</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">typename</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">constexpr</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">noexcept</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">static_cast</span>');
    expect(html).toContain('class="syntax-token syntax-title">value</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
  });

  it("recognizes legacy Highlight.js C++ preprocessor and declaration titles in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```cpp",
          "#include <vector>",
          "#define ISSUE_LIMIT 10",
          "class IssueView {",
          "  int render_issue() { return ISSUE_LIMIT; }",
          "};",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="cpp">');
    expect(html).toContain('class="syntax-token syntax-keyword">#include &lt;vector&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">#define ISSUE_LIMIT 10</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueView</span>');
    expect(html).toContain('class="syntax-token syntax-title">render_issue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
  });

  it("recognizes legacy Highlight.js C++ numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```cpp",
          "auto mask = 0b1010'0101;",
          "auto port = 0xFF'00UL;",
          "auto ratio = .25f;",
          "auto distance = -1.5e-2;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="cpp">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010&#x27;0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF&#x27;00</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25f</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
  });

  it("recognizes legacy Highlight.js Objective-C aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```objc",
          "#import <Foundation/Foundation.h>",
          "@interface YonaProject : NSObject",
          "@property (nonatomic, strong) NSString *name;",
          "@implementation YonaProject",
          "- (BOOL)isReady {",
          '  NSString *label = @"ready";',
          "  self.name = label;",
          "  return YES;",
          "}",
          "@end",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="objc">');
    expect(html).toContain(
      'class="syntax-token syntax-keyword">#import &lt;Foundation/Foundation.h&gt;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">@interface</span>');
    expect(html).toContain('class="syntax-token syntax-title">YonaProject</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@property</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">nonatomic</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">strong</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">NSString</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@implementation</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">BOOL</span>');
    expect(html).toContain('class="syntax-token syntax-string">@&quot;ready&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">.name</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">YES</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@end</span>');
  });

  it("recognizes legacy Highlight.js Objective-C numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```objc",
          "NSInteger mask = 0xCAFE_F00D;",
          "CGFloat ratio = -1.5e-2;",
          "CGFloat offset = .25e+2;",
          "CGFloat total = 1_000.25e+3;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="objc">');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE_F00D</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
  });

  it("recognizes legacy Highlight.js CoffeeScript aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```coffee",
          "class IssueView extends View",
          "  render: ->",
          "    return true if @issue.open",
          "    false unless @issue.open",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="coffee">');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueView</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">extends</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">false</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">unless</span>');
  });

  it("recognizes legacy Highlight.js CoffeeScript hash comments and numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```coffee",
          "# render counts",
          "flags = 0b1010_0101",
          "mode = 0o755",
          "mask = 0xFF_AA",
          "ratio = .25e+2",
          "precise = 1_000.25e+3",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="coffee">');
    expect(html).toContain('class="syntax-token syntax-comment"># render counts</span>');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
  });

  it("recognizes legacy Highlight.js CoffeeScript built-ins in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```coffee",
          "npm install",
          "loader = require module",
          "console.log print global window document",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="coffee">');
    expect(html).toContain('class="syntax-token syntax-keyword">npm</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">require</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">module</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">console</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">print</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">global</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">window</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">document</span>');
  });

  it("recognizes legacy Highlight.js Arduino language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```arduino",
          "void setup() {",
          "  pinMode(13, OUTPUT);",
          "}",
          "void loop() {",
          "  digitalWrite(13, HIGH);",
          "  delay(1000);",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="arduino">');
    expect(html).toContain('class="syntax-token syntax-keyword">setup</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">pinMode</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">OUTPUT</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">loop</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">digitalWrite</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">HIGH</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">delay</span>');
  });

  it("recognizes legacy Highlight.js Arduino comments and numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```arduino",
          "// pin mask",
          "int flags = 0b1010_0101;",
          "int mode = 0o755;",
          "int mask = 0xFF_AA;",
          "float ratio = .25e+2;",
          "float precise = 1_000.25e+3;",
          "/* ready */",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="arduino">');
    expect(html).toContain('class="syntax-token syntax-comment">// pin mask</span>');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
    expect(html).toContain('class="syntax-token syntax-comment">/* ready */</span>');
  });

  it("recognizes legacy Highlight.js Dockerfile aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```docker",
          "FROM rust:1.80",
          "ARG APP_HOME=/app",
          "ARG BUILD_COUNT=1_000",
          "ENV RUST_LOG=info",
          "WORKDIR $APP_HOME",
          "RUN mkdir -p ${APP_HOME}/logs",
          "RUN echo -1.5e+2 .25e-2",
          "COPY . .",
          "RUN cargo build --release",
          "EXPOSE 9000",
          'CMD ["./yona"]',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="docker">');
    expect(html).toContain('class="syntax-token syntax-keyword">FROM</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">ARG</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">ENV</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">WORKDIR</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$APP_HOME</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${APP_HOME}</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e-2</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">COPY</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">RUN</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">EXPOSE</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">CMD</span>');
  });

  it("recognizes legacy Highlight.js Dockerfile hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```dockerfile", "# build image", "FROM rust:1.80", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="dockerfile">');
    expect(html).toContain('class="syntax-token syntax-comment"># build image</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">FROM</span>');
  });

  it("recognizes legacy Highlight.js nginx aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```nginxconf",
          "server {",
          "  listen 80;",
          "  listen [::]:443 ssl;",
          "  server_name yona.example;",
          "  gzip on;",
          "  set $backend ${upstream};",
          "  proxy_pass http://127.0.0.1:8080;",
          "  keepalive_timeout 30s;",
          "  rewrite ^ / permanent;",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="nginxconf">');
    expect(html).toContain('class="syntax-token syntax-keyword">server</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">listen</span>');
    expect(html).toContain('class="syntax-token syntax-number">[::]:443</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">server_name</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">gzip</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">on</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">set</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$backend</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${upstream}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">proxy_pass</span>');
    expect(html).toContain('class="syntax-token syntax-number">127.0.0.1:8080</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">keepalive_timeout</span>');
    expect(html).toContain('class="syntax-token syntax-number">30s</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">rewrite</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">permanent</span>');
  });

  it("recognizes legacy Highlight.js nginx hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```nginx",
          "# route legacy traffic",
          "server {",
          "  listen 80;",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="nginx">');
    expect(html).toContain('class="syntax-token syntax-comment"># route legacy traffic</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">server</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">listen</span>');
  });

  it("recognizes legacy Highlight.js Apache aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```apacheconf",
          'ServerRoot "/etc/httpd"',
          "Listen 80",
          '<Directory "/srv/yona">',
          "Options All",
          "</Directory>",
          'DocumentRoot "/srv/yona"',
          "RewriteEngine On",
          "RewriteCond %{HTTP_HOST} ^old.example$",
          "RewriteRule ^/old$ /new [R=301,L]",
          "RewriteRule ^/files/(.*)$ /download/$1 [L]",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="apacheconf">');
    expect(html).toContain('class="syntax-token syntax-keyword">ServerRoot</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Listen</span>');
    expect(html).toContain(
      'class="syntax-token syntax-keyword">&lt;Directory &quot;/srv/yona&quot;&gt;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">Options</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">All</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&lt;/Directory&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">DocumentRoot</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">RewriteEngine</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">On</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">RewriteCond</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">%{HTTP_HOST}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">RewriteRule</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">[R=301,L]</span>');
    expect(html).toContain('class="syntax-token syntax-number">$1</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">[L]</span>');
  });

  it("recognizes legacy Highlight.js Apache hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```apache",
          "# preserve legacy redirects",
          "Listen 80",
          "RewriteEngine On",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="apache">');
    expect(html).toContain(
      'class="syntax-token syntax-comment"># preserve legacy redirects</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">Listen</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">RewriteEngine</span>');
  });

  it("recognizes legacy Highlight.js HTTP aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```https",
          "GET /api/v1/projects HTTP/1.1",
          "POST http://yona.example/api/v1/projects?state=open HTTP/1.1",
          "OPTIONS * HTTP/1.1",
          "Host: yona.example",
          "X-Request-Id: abc123",
          "HTTP/1.1 200 OK",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="https">');
    expect(html).toContain('class="syntax-token syntax-keyword">GET</span>');
    expect(html).toContain('class="syntax-token syntax-string">/api/v1/projects</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">http://yona.example/api/v1/projects?state=open</span>',
    );
    expect(html).toContain('class="syntax-token syntax-string">*</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">HTTP/1.1</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Host:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">X-Request-Id:</span>');
    expect(html).toContain('class="syntax-token syntax-number">200</span>');
  });

  it("recognizes legacy Highlight.js Diff aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```patch",
          "diff --git a/app.js b/app.js",
          "index 123abc..456def 100644",
          "--- a/app.js",
          "+++ b/app.js",
          "@@ -1,2 +1,2 @@",
          "+added line",
          "-removed line",
          "!changed line",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="patch">');
    expect(html).toContain(
      'class="syntax-token syntax-keyword">diff --git a/app.js b/app.js</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-keyword">index 123abc..456def 100644</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">--- a/app.js</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">+++ b/app.js</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@@ -1,2 +1,2 @@</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">+</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">-</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">!</span>');
  });

  it("recognizes legacy Highlight.js JSON language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```json",
          '{ "enabled": true, "owner": null, "count": 3, "ratio": -1.25e+3 }',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="json">');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;enabled&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;owner&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">null</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;count&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-number">3</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;ratio&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.25e+3</span>');
  });

  it("recognizes legacy Highlight.js ini aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```toml",
          "[server]",
          "enabled = true",
          "backup = no",
          'database.url = "sqlite:///yona.db"',
          "home = ${APP_HOME}",
          "path = $APP_HOME",
          "workers = +1_000",
          "mask = 0xCAFE_F00D",
          "ratio = -1_000.25e+3",
          'notes = """legacy"""',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="toml">');
    expect(html).toContain('class="syntax-token syntax-keyword">[server]</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">enabled</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">no</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">database.url</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${APP_HOME}</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$APP_HOME</span>');
    expect(html).toContain('class="syntax-token syntax-number">+1_000</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE_F00D</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1_000.25e+3</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;&quot;&quot;legacy&quot;&quot;&quot;</span>',
    );
  });

  it("recognizes legacy Yona config extension alias as INI in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```config", "[site]", "enabled = true", "home = ${APP_HOME}", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="config">');
    expect(html).toContain('class="syntax-token syntax-keyword">[site]</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">enabled</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${APP_HOME}</span>');
  });

  it("recognizes legacy Highlight.js ini and TOML comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```toml", "; legacy option", "# parity flag", "enabled = on", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="toml">');
    expect(html).toContain('class="syntax-token syntax-comment">; legacy option</span>');
    expect(html).toContain('class="syntax-token syntax-comment"># parity flag</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">on</span>');
  });

  it("recognizes legacy Highlight.js PowerShell aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```ps",
          "function Get-YonaStatus {",
          "  param($Path)",
          "  $script:enabled = $true",
          "  ${env:PATH} = $Path",
          "  foreach ($item in Get-ChildItem $Path) {",
          "    # legacy comment",
          "    return $item",
          "  }",
          '  $message = @"ready"@',
          "  <# block comment #>",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="ps">');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">param</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">foreach</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">in</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Get-ChildItem</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$Path</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$script:enabled</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${env:PATH}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">$true</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$item</span>');
    expect(html).toContain('class="syntax-token syntax-comment"># legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-string">@&quot;ready&quot;@</span>');
    expect(html).toContain('class="syntax-token syntax-comment">&lt;# block comment #&gt;</span>');
  });

  it("recognizes legacy Highlight.js PowerShell numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```powershell",
          "$mask = 0xFF_AA",
          "$ratio = -1.5e+2",
          "$workers = 1_000",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="powershell">');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000</span>');
  });

  it("recognizes legacy Highlight.js DOS aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```bat",
          "@echo off",
          "setlocal",
          "set ROOT=%~dp0",
          "if exist yona.exe goto done",
          "for %%A in (%PATH%) do echo !STATUS! 123",
          "echo ready",
          "rem legacy comment",
          ":done",
          "exit",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="bat">');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">off</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">setlocal</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">%~dp0</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">exist</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">goto</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">for</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">do</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">%%A</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">%PATH%</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">!STATUS!</span>');
    expect(html).toContain('class="syntax-token syntax-number">123</span>');
    expect(html).toContain('class="syntax-token syntax-comment">rem legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-title">:done</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">exit</span>');
  });

  it("recognizes legacy Highlight.js Kotlin language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```kotlin",
          "@file:JvmName",
          "@Test",
          "data class Project(val name: String)",
          "fun status(value: Int): Boolean {",
          "  loop@ for (item in items) { return@loop }",
          "  val greeting = $name",
          "  val detail = ${project.name}",
          '  val raw = """legacy"""',
          "  return when (value) {",
          "    is Int -> true",
          "    else -> false",
          "  }",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="kotlin">');
    expect(html).toContain('class="syntax-token syntax-keyword">data</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@file:JvmName</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@Test</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">val</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">fun</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Int</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Boolean</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">when</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">is</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">loop@</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$name</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${project.name}</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;&quot;&quot;legacy&quot;&quot;&quot;</span>',
    );
  });

  it("recognizes legacy Highlight.js Kotlin numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```kotlin",
          "val flags = 0b1010_0101",
          "val mask = 0xCAFE_F00D",
          "val ratio = -1.5e-2",
          "val offset = .25e+2",
          "val total = 1_000.25e+3",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="kotlin">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE_F00D</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
  });

  it("recognizes legacy Highlight.js Swift language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```swift",
          "@objc",
          "struct Project {",
          "  let name: String?",
          "  let owner: User",
          "  func status(value: Int) -> Bool {",
          "    if #available(iOS 15, *) { return true }",
          "    guard value > 0 else { return false }",
          "    return name != nil",
          "  }",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="swift">');
    expect(html).toContain('class="syntax-token syntax-keyword">@objc</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">struct</span>');
    expect(html).toContain('class="syntax-token syntax-title">Project</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">String</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">User</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">func</span>');
    expect(html).toContain('class="syntax-token syntax-title">status</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">#available(iOS 15, *)</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Int</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Bool</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">guard</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">nil</span>');
  });

  it("recognizes legacy Highlight.js Swift numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```swift",
          "let mask = 0b1010_0101",
          "let mode = 0o755",
          "let color = 0xFF_AA",
          "let ratio = 1_000.5e2",
          "let signed = 1_000.5e-2",
          "let hexFloat = 0xF.Fp+2",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="swift">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.5e2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xF.Fp+2</span>');
  });

  it("recognizes legacy Highlight.js Dart language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```dart",
          "import 'dart:async';",
          "@deprecated",
          "@RoutePage()",
          "final class IssueState {",
          "  final label = r'raw';",
          '  final body = """Hello ${user.name}""";',
          "  Future<bool> load() async {",
          "    await Future.value(true);",
          "    return false;",
          "  }",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="dart">');
    expect(html).toContain('class="syntax-token syntax-keyword">import</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@deprecated</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@RoutePage()</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">final</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueState</span>');
    expect(html).toContain('class="syntax-token syntax-string">r&#x27;raw&#x27;</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;&quot;&quot;Hello ${user.name}&quot;&quot;&quot;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">Future</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">bool</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">async</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">await</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">false</span>');
  });

  it("recognizes legacy Highlight.js Dart numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```dart",
          "final mask = 0xCAFE_F00D;",
          "final ratio = -1.5e-2;",
          "final offset = .25e+2;",
          "final total = 1_000.25e+3;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="dart">');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE_F00D</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
  });

  it("recognizes legacy Highlight.js Elm language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```elm",
          "port module Main exposing (Model, update)",
          "import Html exposing (text)",
          "type alias Model = { name : String }",
          "update model =",
          "  let",
          "    result = case model.name of",
          '      "" -> text "empty"',
          "      _ -> text model.name",
          "  in",
          "  result",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="elm">');
    expect(html).toContain('class="syntax-token syntax-keyword">port</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">module</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">exposing</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">import</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">type</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">alias</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Main</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Model</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">String</span>');
    expect(html).toContain('class="syntax-token syntax-title">update</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">case</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">of</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">in</span>');
  });

  it("recognizes legacy Highlight.js Elm comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```elm",
          "-- legacy comment",
          "{- block comment -}",
          'main = text "done"',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="elm">');
    expect(html).toContain('class="syntax-token syntax-comment">-- legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-comment">{- block comment -}</span>');
  });

  it("recognizes legacy Highlight.js Erlang aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```erl",
          "handle(Message) ->",
          "  receive",
          "    {ok, Value} when Value > 0 -> fun() -> true end;",
          "    after 1000 -> false",
          "  end,",
          "  case Message of",
          "    stop -> ok",
          "  end.",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="erl">');
    expect(html).toContain('class="syntax-token syntax-title">handle</span>');
    expect(html).toContain('class="syntax-token syntax-params">(Message)</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">receive</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">when</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">fun</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">end</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">after</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">false</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">case</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">of</span>');
  });

  it("recognizes legacy Highlight.js Erlang percent comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```erl", "% legacy comment", "receive after 1 -> false end", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="erl">');
    expect(html).toContain('class="syntax-token syntax-comment">% legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">receive</span>');
  });

  it("recognizes legacy Highlight.js Erlang numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```erl",
          "Mask = 16#FF_AA,",
          "Flags = 2#1010_0101,",
          "Ratio = 1_000.25e+3,",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="erl">');
    expect(html).toContain('class="syntax-token syntax-number">16#FF_AA</span>');
    expect(html).toContain('class="syntax-token syntax-number">2#1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">1_000.25e+3</span>');
  });

  it("recognizes legacy Highlight.js R language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```r",
          "library(stats)",
          "render <- function(values) {",
          "  `issue state` <- values",
          "  if (length(values) == 0) return(NULL)",
          "  for (value in values) {",
          "    if (is.na(value)) next",
          "  }",
          "  c(TRUE, FALSE, NA, Inf, NaN)",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="r">');
    expect(html).toContain('class="syntax-token syntax-keyword">library</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-string">`issue state`</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">NULL</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">for</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">in</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">next</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">TRUE</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">FALSE</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">NA</span>');
  });

  it("recognizes legacy Highlight.js R hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```r", "# legacy comment", "if (TRUE) return(NULL)", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="r">');
    expect(html).toContain('class="syntax-token syntax-comment"># legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">TRUE</span>');
  });

  it("recognizes legacy Highlight.js R numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```r", "values <- c(0x10L, 12L, 3., 4i, .5i, 6e-2)", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="r">');
    expect(html).toContain('class="syntax-token syntax-number">0x10L</span>');
    expect(html).toContain('class="syntax-token syntax-number">12L</span>');
    expect(html).toContain('class="syntax-token syntax-number">3.</span>');
    expect(html).toContain('class="syntax-token syntax-number">4i</span>');
    expect(html).toContain('class="syntax-token syntax-number">.5i</span>');
    expect(html).toContain('class="syntax-token syntax-number">6e-2</span>');
  });

  it("recognizes legacy Highlight.js MATLAB language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```matlab",
          "function [values, status] = render(count)",
          "global cache",
          "values = zeros(1, count);",
          "for index = 1:count",
          "  if index == 1",
          "    values(index) = linspace(0, 1, count);",
          "  else",
          "    disp('skip');",
          "  end",
          "end",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="matlab">');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-params">[values, status]</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('class="syntax-token syntax-params">(count)</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">global</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">zeros</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">for</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">linspace</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">else</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">disp</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">end</span>');
  });

  it("recognizes legacy Highlight.js MATLAB percent comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```matlab",
          "% legacy comment",
          "if value > 0",
          "  disp(value);",
          "end",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="matlab">');
    expect(html).toContain('class="syntax-token syntax-comment">% legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">disp</span>');
  });

  it("recognizes legacy Highlight.js MATLAB numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```matlab",
          "offset = .25e+2;",
          "ratio = -1.5e-2;",
          "complex = 3i;",
          "trailing = 4.;",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="matlab">');
    expect(html).toContain('class="syntax-token syntax-number">.25e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e-2</span>');
    expect(html).toContain('class="syntax-token syntax-number">3i</span>');
    expect(html).toContain('class="syntax-token syntax-number">4.</span>');
  });

  it("recognizes legacy Highlight.js AWK language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```awk",
          "BEGIN { count = 0 }",
          '{ if ($1 == "open") { count++; next } else { delete seen[$1] } }',
          "{ owner = ${owner}; total += $NF; fields += $# }",
          "{ ratio = -1.5e+2; offset = .25e-2 }",
          "END { while (count > 0) { exit } }",
          "function render(value) {",
          "  for (index in value) { continue }",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="awk">');
    expect(html).toContain('class="syntax-token syntax-keyword">BEGIN</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">next</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">else</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">delete</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$1</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${owner}</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$NF</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$#</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e+2</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e-2</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">END</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">while</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">exit</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">for</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">in</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">continue</span>');
  });

  it("recognizes legacy Highlight.js AWK hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```awk", "# legacy comment", 'BEGIN { print "ok" }', "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="awk">');
    expect(html).toContain('class="syntax-token syntax-comment"># legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">BEGIN</span>');
  });

  it("recognizes legacy Highlight.js TeX language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```tex",
          "\\documentclass{article}",
          "\\begin{document}",
          "\\section*{Intro}",
          "\\textbf{Yona} $\\alpha + \\beta$",
          "\\end{document}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="tex">');
    expect(html).toContain('class="syntax-token syntax-keyword">\\documentclass</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\begin</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\section*</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\textbf</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\alpha</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\beta</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\end</span>');
  });

  it("recognizes legacy Highlight.js TeX percent comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```tex", "% legacy comment", "\\section{Intro}", "\\textbf{Yona}", "```"].join(
          "\n",
        )}
      />,
    );

    expect(html).toContain('<code class="tex">');
    expect(html).toContain('class="syntax-token syntax-comment">% legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\section</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\textbf</span>');
  });

  it("recognizes legacy Highlight.js Django and Jinja language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```jinja",
          '{% extends "base.html" %}',
          "{% if user.is_active %}",
          '{{ user.name|default_if_none:"Anonymous"|truncatewords:2 }}',
          "{% else %}",
          '{% include "login.html" %}',
          "{% endif %}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="jinja">');
    expect(html).toContain('class="syntax-token syntax-keyword">{%</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">%}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">{{</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">}}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">extends</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">|default_if_none:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">|truncatewords:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">else</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">include</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">endif</span>');
  });

  it("recognizes legacy Highlight.js Django comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```jinja",
          "{# legacy comment #}",
          "{% if user.is_active %}",
          "{{ user.name }}",
          "{% endif %}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="jinja">');
    expect(html).toContain('class="syntax-token syntax-comment">{# legacy comment #}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">endif</span>');
  });

  it("recognizes legacy Highlight.js HTMLBars built-ins in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```htmlbars",
          "{{#each-in users as |id user|}}",
          '{{link-to user.name "users.show" user.id}}',
          "{{input value=user.name}}",
          "{{query-params page=2}}",
          "{{/each-in}}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="htmlbars">');
    expect(html).toContain('class="syntax-token syntax-keyword">{{#</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">{{</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">{{/</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">}}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">each-in</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">as</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">link-to</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">input</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">value=</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">query-params</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">page=</span>');
  });

  it("recognizes legacy Highlight.js Handlebars alias in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```handlebars",
          "{{#each-in users as |id user|}}",
          "{{input value=user.name}}",
          "{{/each-in}}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="handlebars">');
    expect(html).toContain('class="syntax-token syntax-keyword">each-in</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">as</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">input</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">value=</span>');
  });

  it("recognizes legacy Handlebars comments in HTMLBars fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```htmlbars",
          "{{! legacy comment }}",
          "{{!-- block comment --}}",
          "{{#each-in users as |id user|}}",
          "{{/each-in}}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="htmlbars">');
    expect(html).toContain('class="syntax-token syntax-comment">{{! legacy comment }}</span>');
    expect(html).toContain('class="syntax-token syntax-comment">{{!-- block comment --}}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">each-in</span>');
  });

  it("recognizes legacy Highlight.js accesslog language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```accesslog",
          '127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /projects/yona HTTP/1.1" 200 2326',
          '192.168.0.10 - - [10/Oct/2000:13:55:37 -0700] "PATCH /issues/1 HTTP/1.1" 204 0',
          '2001:db8::1 - - [10/Oct/2000:13:55:38 -0700] "GET /ipv6 HTTP/1.1" 304 0',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="accesslog">');
    expect(html).toContain('class="syntax-token syntax-number">127.0.0.1</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;GET /projects/yona HTTP/1.1&quot;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-number">200</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;PATCH /issues/1 HTTP/1.1&quot;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-number">204</span>');
    expect(html).toContain('class="syntax-token syntax-number">2001:db8::1</span>');
    expect(html).toContain('class="syntax-token syntax-number">304</span>');
  });

  it("recognizes legacy Highlight.js Groovy language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```groovy",
          "@Immutable",
          "trait Named { String name }",
          "class Project extends BaseProject implements Serializable {",
          "  def render(user) {",
          "    retry:",
          "    def query = $/issues/user/$",
          "    if (user in members) { return name }",
          "  }",
          "}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="groovy">');
    expect(html).toContain('class="syntax-token syntax-keyword">trait</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">extends</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">implements</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">in</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@Immutable</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">retry:</span>');
    expect(html).toContain('class="syntax-token syntax-string">$/issues/user/$</span>');
  });

  it("recognizes legacy Highlight.js LLVM language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```llvm",
          'target triple = "x86_64-unknown-linux-gnu"',
          "@counter = global i32 0",
          "define i32 @main() attributes #0 {",
          "  %value = load i32, ptr @counter, align 4",
          "  ret i32 %value",
          "}",
          "declare void @abort()",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="llvm">');
    expect(html).toContain('class="syntax-token syntax-keyword">target</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">global</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">define</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">attributes</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">load</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">align</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">ret</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">declare</span>');
    expect(html).toContain('class="syntax-token syntax-title">@counter</span>');
    expect(html).toContain('class="syntax-token syntax-title">@main</span>');
    expect(html).toContain('class="syntax-token syntax-title">@abort</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">#0</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">%value</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">i32</span>');
  });

  it("recognizes legacy Highlight.js Haml language in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```haml",
          "!!! 5",
          '%section#main.board(data-state="open")',
          "  %h1.title= project.name",
          "  %p Project #{project.private?}",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="haml">');
    expect(html).toContain('class="syntax-token syntax-keyword">!!!</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">%section</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">#main</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">.board</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">data-state</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;open&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">%h1</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">.title</span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">#{</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">project</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">private?</span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">}</span>');
  });

  it("recognizes legacy Highlight.js Haml comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```haml",
          "-# legacy comment",
          "/ rendered comment",
          "%p= project.name",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="haml">');
    expect(html).toContain('class="syntax-token syntax-comment">-# legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-comment">/ rendered comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">%p</span>');
  });

  it("recognizes legacy Highlight.js Excel aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```xlsx",
          '=SUM(A1:B2, IF(C3>0, "open", "closed"))',
          '=AVERAGEIF(D1:D4, ">0", E1:E4) + 10%',
          "=SUM(Sheet1!$A$1:$B$2, $C$3)",
          '=N("legacy note")',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="xlsx">');
    expect(html).toContain('class="syntax-token syntax-keyword">SUM</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">IF</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">AVERAGEIF</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">A1:B2</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">C3</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">Sheet1!$A$1:$B$2</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$C$3</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;open&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;&gt;0&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-number">10%</span>');
    expect(html).toContain('class="syntax-token syntax-comment">N(&quot;legacy note&quot;)</span>');
  });

  it("recognizes legacy Highlight.js YAML language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```yml",
          "enabled: yes",
          "archived: no",
          "deleted: null",
          "- service-name: api",
          '"quoted-name": web',
          "'single-name': worker",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="yml">');
    expect(html).toContain('class="syntax-token syntax-keyword">enabled</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">yes</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">archived</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">no</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">deleted</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">null</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">service-name</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;quoted-name&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&#x27;single-name&#x27;</span>');
  });

  it("recognizes legacy Highlight.js YAML hash comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```yaml", "# deployment settings", "enabled: true", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="yaml">');
    expect(html).toContain('class="syntax-token syntax-comment"># deployment settings</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
  });

  it("recognizes legacy Highlight.js YAML structural markers in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```yaml",
          "---",
          "defaults: &defaults",
          "kind: !!str api",
          "- *defaults",
          "...",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('class="syntax-token syntax-keyword">---</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&amp;defaults</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">!!str</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">-</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">*defaults</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">...</span>');
  });

  it("recognizes legacy Highlight.js YAML numeric literals in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```yaml",
          "binary: 0b1010_0101",
          "octal: 0o755",
          "hex: 0xCAFE_F00D",
          "ratio: -1_000.25e+3",
          "offset: .25e-2",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="yaml">');
    expect(html).toContain('class="syntax-token syntax-number">0b1010_0101</span>');
    expect(html).toContain('class="syntax-token syntax-number">0o755</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE_F00D</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1_000.25e+3</span>');
    expect(html).toContain('class="syntax-token syntax-number">.25e-2</span>');
  });

  it("uses legacy Highlight.js Ruby sublanguage inside YAML ERB template blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```yaml",
          "<% if project.private? %>",
          "enabled: true",
          "<% end %>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="yaml">');
    expect(html).toContain('class="syntax-token syntax-punctuation">&lt;%</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">project</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">private?</span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">%&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">enabled</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">end</span>');
  });

  it("recognizes legacy Highlight.js XML and HTML language aliases in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```html", '<div class="issue" data-state="open">Hello</div>', "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;issue&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;open&quot;</span>');
  });

  it("recognizes legacy Highlight.js XML comments in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```xml", "<!-- legacy layout -->", "<project>Yona</project>", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="xml">');
    expect(html).toContain(
      'class="syntax-token syntax-comment">&lt;!-- legacy layout --&gt;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">project</span>');
  });

  it("recognizes legacy Highlight.js XML unquoted attribute values in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```html",
          "<input type=text data-id=issue-1 checked>",
          '<project visibility=public owner="yona">',
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-keyword">input</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">type</span>');
    expect(html).toContain('class="syntax-token syntax-string">text</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">data-id</span>');
    expect(html).toContain('class="syntax-token syntax-string">issue-1</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">checked</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">visibility</span>');
    expect(html).toContain('class="syntax-token syntax-string">public</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;yona&quot;</span>');
  });

  it("recognizes legacy Highlight.js XML meta declarations in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```xml",
          '<?xml version="1.0"?>',
          "<!DOCTYPE project>",
          "<project>Yona</project>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain(
      'class="syntax-token syntax-keyword">&lt;?xml version=&quot;1.0&quot;?&gt;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">&lt;!DOCTYPE project&gt;</span>');
  });

  it("uses legacy Highlight.js PHP sublanguage inside XML processing instructions", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={["```html", "<?php echo $projectName; ?>", "<div>Yona</div>", "```"].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-punctuation">&lt;?</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">php</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$projectName</span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">?&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
  });

  it("keeps legacy Highlight.js XML CDATA blocks opaque in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```xml",
          "<![CDATA[<project>#1</project>]]>",
          "<project>Yona</project>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain(
      'class="syntax-token syntax-string">&lt;![CDATA[&lt;project&gt;#1&lt;/project&gt;]]&gt;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">project</span>');
    expect(html).not.toContain("issueLink");
  });

  it("keeps legacy Highlight.js multiline XML CDATA blocks opaque in fenced blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```xml",
          "<![CDATA[",
          "<project>#1</project>",
          "]]>",
          "<project>Yona</project>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('class="syntax-token syntax-string">&lt;![CDATA[</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&lt;project&gt;#1&lt;/project&gt;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-string">]]&gt;</span>');
    expect(html.match(/class="syntax-token syntax-keyword">project<\/span>/g)).toHaveLength(2);
    expect(html).not.toContain("issueLink");
  });

  it("uses legacy Highlight.js CSS sublanguage inside XML style blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```html",
          "<style>",
          ".board #main:hover { color: #fff; }",
          "</style>",
          "<div>Yona</div>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-keyword">style</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">.board</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">#main</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">:hover</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">color</span>');
    expect(html).toContain('class="syntax-token syntax-number">#fff</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
  });

  it("uses legacy Highlight.js JavaScript sublanguage inside XML script blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```html",
          "<script>",
          "const values = Array.from([0xCAFE]);",
          "console.log(Promise.resolve(values));",
          "</script>",
          "<div>Yona</div>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-keyword">script</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Array</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">console</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Promise</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
  });

  it("uses legacy Highlight.js Handlebars sublanguage inside XML script template blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```html",
          '<script type="text/x-handlebars-template">',
          "{{! legacy template comment }}",
          "{{#each-in users as |id user|}}",
          "{{/each-in}}",
          "</script>",
          "<div>Yona</div>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-keyword">script</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;text/x-handlebars-template&quot;</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-comment">{{! legacy template comment }}</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">each-in</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">as</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
  });

  it("uses legacy Highlight.js XML sublanguage inside XML script data blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```html",
          '<script type="text/xml">',
          '<project name="yona"><issue>#1</issue></project>',
          "</script>",
          "<div>Yona</div>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-keyword">script</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;text/xml&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">project</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">issue</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;yona&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
    expect(html).not.toContain("issueLink");
  });

  it("uses legacy Highlight.js ActionScript sublanguage inside XML script blocks", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={[
          "```html",
          '<script type="text/actionscript">',
          "package {",
          "  public class Badge extends Sprite {",
          "    public function render():void { trace(0xCAFE); }",
          "  }",
          "}",
          "</script>",
          "<div>Yona</div>",
          "```",
        ].join("\n")}
      />,
    );

    expect(html).toContain('<code class="html">');
    expect(html).toContain('class="syntax-token syntax-keyword">script</span>');
    expect(html).toContain(
      'class="syntax-token syntax-string">&quot;text/actionscript&quot;</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">package</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">extends</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Sprite</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">trace</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
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

  it("renders indented fenced code blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n  ``` js\n  const value = '#1';\n    nested();\n  ```\n\nAfter"}
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain('  <span class="syntax-token syntax-identifier">nested</span>');
    expect(html).toContain("<p>After</p>");
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

  it("renders EOF-closed fenced code blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n```js\nconst value = '#1';\n#1 stays text\n"}
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain('<code class="js">');
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

  it("renders tilde fenced code blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n~~~ js\nconst value = '#1';\n~~~\n\nAfter"}
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain('<code class="js">');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("~~~");
  });

  it("uses legacy first-token fenced code info strings", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "```js=bad extra words\nconst value = '#1';\n```\n\n```foo/bar\npath\n```\n\n``` `bad`\nplain\n```"
        }
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain('<code class="js=bad">');
    expect(html).toContain('<code class="foo/bar">');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">path</span>');
    expect(html).not.toContain('class="`bad`"');
    expect(html).not.toContain("issueLink");
  });

  it("renders legacy first-token fenced code info strings through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "Before\n\n```js=bad extra words\nconst value = '#1';\n```\n\n```foo/bar\npath\n```\n\nAfter"
        }
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain('<code class="js=bad">');
    expect(html).toContain('<code class="foo/bar">');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">path</span>');
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("issueLink");
  });

  it("accepts legacy mixed trailing closing-fence characters", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "```js\nbacktick\n```~~\n\n~~~js\ntilde\n~~~``\n\n```js\nwrong\n~~```\n\n~~~js\nshort\n~~"
        }
      />,
    );

    expect(html).toContain(
      '<code class="js"><span class="syntax-token syntax-identifier">backtick</span></code>',
    );
    expect(html).toContain(
      '<code class="js"><span class="syntax-token syntax-identifier">tilde</span></code>',
    );
    expect(html).toContain("<p><code>js wrong ~~</code></p>");
    expect(html).toContain("<p>~~~js<br/>short<br/>~~</p>");
  });

  it("renders legacy mixed trailing closing fences through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n```js\nbacktick\n```~~\n\n~~~js\ntilde\n~~~``\n\nAfter"}
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain(
      '<code class="js"><span class="syntax-token syntax-identifier">backtick</span></code>',
    );
    expect(html).toContain(
      '<code class="js"><span class="syntax-token syntax-identifier">tilde</span></code>',
    );
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("```~~");
    expect(html).not.toContain("~~~``");
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

  it("renders matching long fenced code blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n```` rust\n#1 stays text\n````\n\nAfter"}
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain('<code class="rust">');
    expect(html).toContain('#<span class="syntax-token syntax-number">1</span>');
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("```` rust");
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

  it("renders tab-indented code blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n\tlet value = '#1';\n\t[guide]: https://example.com\n\nAfter"}
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain(
      "<pre><code>let value = &#x27;#1&#x27;;\n[guide]: https://example.com</code></pre>",
    );
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('<a href="https://example.com">');
  });

  it("renders plain fenced code blocks through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n```\n#1 stays text\n[guide]: https://example.com\n```\n\nAfter"}
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<pre><code>#1 stays text\n[guide]: https://example.com</code></pre>");
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain('<a href="https://example.com">');
  });

  it("renders no-space language fenced code blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Before\n\n```js\nconst value = '#1';\n```\n\nAfter"}
        ownerName="owner"
        projectName="project"
      />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<pre><code");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("```js");
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

  it("renders tab-separated horizontal rules like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Before\n\n-\t-\t-\n\n*\t*\t*\n\n_\t_\t_\n\nAfter"} />,
    );

    expect(html.match(/<hr\/>/g)?.length).toBe(3);
    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("-\t-\t-");
  });

  it("splits spaced and tabbed horizontal rules after paragraphs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Before\n- - -\n\nAfter\n-\t-\t-"} />,
    );

    expect(html).toContain("<p>Before</p><hr/>");
    expect(html).toContain("<p>After</p><hr/>");
    expect(html).not.toContain("<p>Before<br/>- - -</p>");
    expect(html).not.toContain("<p>After<br/>-\t-\t-</p>");
  });

  it("keeps invalid horizontal rule boundary forms like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"--\n\n- -\n\n- * -\n\n*** abc\n\n    ---\n\n\t---\n\n-\t- x"} />,
    );

    expect(html).toContain("<p>--</p>");
    expect(html).toContain("<ul><li>-</li></ul>");
    expect(html).toContain("<li><ul><li>-</li></ul></li>");
    expect(html).toContain("<p>*** abc</p>");
    expect(html).toContain("<pre><code>---</code></pre>");
    expect(html).toContain("<li><ul><li>x</li></ul></li>");
    expect(html).not.toContain("<p>--</p><hr/>");
    expect(html).not.toContain("<p>*** abc</p><hr/>");
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

  it("renders resolved issue references and project mentions inside plain paragraphs through ReactMarkdown", () => {
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
        markdown="See owner#7 and @owner/projectYobi"
        mentionReferences={[{ kind: "project", ownerName: "owner", projectName: "projectYobi" }]}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain('<p>See <a class="issueLink"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Owner-scoped reference"');
    expect(html).toContain('data-issue-state="closed"');
    expect(html).toContain(
      '<a class="no-text-decoration project-link" href="/yona/owner/projectYobi">@owner/projectYobi</a>',
    );
  });

  it("renders quoted Yona autolinks inside plain paragraphs through ReactMarkdown", () => {
    const sha = "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2";
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        commitReferences={[
          {
            commitId: sha,
            ownerName: "owner",
            projectName: "projectYobi",
            title: "Quoted commit",
          },
        ]}
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "Quoted issue",
          },
        ]}
        markdown={`"See" owner#7, @owner/projectYobi, @yobi, and ${sha} in user's note`}
        mentionReferences={[
          { kind: "project", ownerName: "owner", projectName: "projectYobi" },
          { kind: "user", loginId: "yobi" },
        ]}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("&quot;See&quot; ");
    expect(html).toContain("user&#x27;s note");
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Quoted issue"');
    expect(html).toContain('href="/yona/owner/projectYobi"');
    expect(html).toContain('class="no-text-decoration user-link" href="/yona/yobi"');
    expect(html).toContain(`href="/yona/owner/projectYobi/commit/${sha}"`);
    expect(html).toContain('title="Quoted commit"');
  });

  it("renders formatted text around Yona autolinks through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Formatted issue",
          },
        ]}
        markdown="**See** owner#7 and ~~project~~ @owner/projectYobi"
        mentionReferences={[{ kind: "project", ownerName: "owner", projectName: "projectYobi" }]}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("<p><strong>See</strong> ");
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Formatted issue"');
    expect(html).toContain("<del>project</del>");
    expect(html).toContain(
      '<a class="no-text-decoration project-link" href="/yona/owner/projectYobi">@owner/projectYobi</a>',
    );
  });

  it("renders Hangul project and user path autolinks like legacy AutoLinkRenderer", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 15,
            ownerName: "한글소유자",
            projectName: "프로젝트",
            state: "open",
            title: "한글 경로 이슈",
          },
          {
            issueNumber: 16,
            ownerName: "한글소유자",
            projectName: "프로젝트",
            state: "closed",
            title: "한글 소유자 이슈",
          },
        ]}
        markdown="See 한글소유자/프로젝트#15 한글소유자#16 @한글소유자/프로젝트 @한글사용자"
        mentionReferences={[
          {
            kind: "project",
            ownerName: "한글소유자",
            projectName: "프로젝트",
          },
          {
            kind: "user",
            loginId: "한글사용자",
          },
        ]}
        ownerName="한글소유자"
        projectName="프로젝트"
      />,
    );

    expect(html).toContain(`href="${encodeURI("/yona/한글소유자/프로젝트/issue/15")}"`);
    expect(html).toContain(`href="${encodeURI("/yona/한글소유자/프로젝트/issue/16")}"`);
    expect(html).toContain(`href="${encodeURI("/yona/한글소유자/프로젝트")}"`);
    expect(html).toContain(`href="${encodeURI("/yona/한글사용자")}"`);
    expect(html).toContain('class="issueLink"');
    expect(html).toContain('title="한글 경로 이슈"');
    expect(html).toContain('data-issue-state="closed"');
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

  it("renders unresolved Yona references through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[]}
        markdown={
          "before\n\nKeep owner#12345 owner/projectYobi#12345 @missing @missing/project as text\n\nafter"
        }
        mentionReferences={[]}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      "<p>Keep owner#12345 owner/projectYobi#12345 @missing @missing/project as text</p>",
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("user-link");
    expect(html).not.toContain("project-link");
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

  it("does not autolink commit SHA references wrapped by trailing word characters", () => {
    const sha = "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2";
    const ownerSha = "ffffffffffffffffffffffffffffffffffffffff";
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        commitReferences={[
          {
            commitId: sha,
            ownerName: "owner",
            projectName: "projectYobi",
          },
          {
            commitId: ownerSha,
            ownerName: "other",
            projectName: "projectYobi",
          },
        ]}
        markdown={`A${sha} ${sha}A @${sha}z other@${ownerSha}Z`}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(`A${sha}`);
    expect(html).toContain(`${sha}A`);
    expect(html).toContain(`@${sha}z`);
    expect(html).toContain(`other@${ownerSha}Z`);
    expect(html).not.toContain(`/commit/${sha}`);
    expect(html).not.toContain(`/commit/${ownerSha}`);
  });

  it("renders GFM strikethrough like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep **strong** and ~~deleted~~ plus ~single~ text" />,
    );

    expect(html).toContain("<strong>strong</strong>");
    expect(html).toContain("<del>deleted</del>");
    expect(html).toContain("<del>single</del>");
  });

  it("renders GFM footnotes as a useful react-markdown extension", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Footnote ref[^1]\n\n[^1]: Useful note"} />,
    );

    expect(html).toContain('data-footnote-ref="true"');
    expect(html).toContain('class="footnotes"');
    expect(html).toContain('class="sr-only"');
    expect(html).not.toContain('class="head-anchor" href="#footnotes"');
    expect(html).toContain("Useful note");
    expect(html).not.toContain("[^1]");
  });

  it("renders GFM footnotes when raw HTML enables the sanitizer path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"<span>raw</span>\n\nFootnote ref[^1]\n\n[^1]: Useful note"} />,
    );

    expect(html).toContain("<span>raw</span>");
    expect(html).toContain('data-footnote-ref=""');
    expect(html).toContain('class="footnotes"');
    expect(html).toContain('class="sr-only"');
    expect(html).not.toContain('class="head-anchor" href="#footnotes"');
    expect(html).toContain("Useful note");
    expect(html).not.toContain("[^1]");
  });

  it("keeps spaced and triple tilde delete delimiters literal like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep ~~ deleted ~~ and ~~deleted ~~ and ~~ deleted~~ plus ~~~triple~~~ literal" />,
    );

    expect(html).toContain("~~ deleted ~~");
    expect(html).toContain("~~deleted ~~");
    expect(html).toContain("~~ deleted~~");
    expect(html).toContain("~~~triple~~~");
    expect(html).not.toContain("<del> deleted </del>");
    expect(html).not.toContain("<del>deleted </del>");
    expect(html).not.toContain("<del> deleted</del>");
    expect(html).not.toContain("<del>triple</del>");
  });

  it("renders literal tilde delimiters through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\nKeep ~~ deleted ~~ and ~~ also literal ~~ as text\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<p>Keep ~~ deleted ~~ and ~~ also literal ~~ as text</p>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<del> deleted </del>");
    expect(html).not.toContain("<del> also literal </del>");
  });

  it("renders line-start triple tilde delimiter text through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n~~~triple~~~\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<p>~~~triple~~~</p>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<pre><code");
    expect(html).not.toContain("<del>triple</del>");
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

  it("does not render intraword underscore emphasis like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep foo_bar_baz and foo__strong__baz plain, but _italic_ and __strong__ work" />,
    );

    expect(html).toContain("foo_bar_baz");
    expect(html).toContain("foo__strong__baz");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<strong>strong</strong>");
    expect(html).not.toContain("foo<em>bar</em>baz");
    expect(html).not.toContain("foo<strong>strong</strong>baz");
  });

  it("does not render emphasis when delimiter contents touch spaces like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep * a * and ** b ** plus _ c _ and __ d __ plain" />,
    );

    expect(html).toContain("* a *");
    expect(html).toContain("** b **");
    expect(html).toContain("_ c _");
    expect(html).toContain("__ d __");
    expect(html).not.toContain("<em> a </em>");
    expect(html).not.toContain("<strong> b </strong>");
    expect(html).not.toContain("<em> c </em>");
    expect(html).not.toContain("<strong> d </strong>");
  });

  it("renders spaced emphasis literals through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\nKeep * a * and ** b ** plus _ c _ and __ d __ plain\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<p>Keep * a * and ** b ** plus _ c _ and __ d __ plain</p>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<em> a </em>");
    expect(html).not.toContain("<strong> b </strong>");
    expect(html).not.toContain("<em> c </em>");
    expect(html).not.toContain("<strong> d </strong>");
  });

  it("renders triple emphasis like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep ***both*** and ___also both___ text" />,
    );

    expect(html).toContain("<strong><em>both</em></strong>");
    expect(html).toContain("<strong><em>also both</em></strong>");
    expect(html).not.toContain("***both***");
    expect(html).not.toContain("___also both___");
  });

  it("renders triple emphasis through the ReactMarkdown document path with legacy DOM order", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\nKeep ***both*** and ___also both___ text\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<strong><em>both</em></strong>");
    expect(html).toContain("<strong><em>also both</em></strong>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<em><strong>both</strong></em>");
  });

  it("renders spaced triple emphasis as outer strong like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Keep *** b *** and ___ c ___ text" />,
    );

    expect(html).toContain("<strong>* b *</strong>");
    expect(html).toContain("<strong>_ c _</strong>");
    expect(html).not.toContain("<strong><em> b </em></strong>");
    expect(html).not.toContain("<strong><em> c </em></strong>");
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

  it("renders inline Markdown inside emphasis tokens through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n**https://example.com** *`code`* ~~www.example.com~~\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      '<strong><a href="https://example.com">https://example.com</a></strong>',
    );
    expect(html).toContain("<em><code>code</code></em>");
    expect(html).toContain('<del><a href="http://www.example.com">www.example.com</a></del>');
    expect(html).toContain("<p>after</p>");
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

  it("renders safe escaped punctuation paragraphs through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "before\n\nKeep \\*literal\\* and \\_plain\\_ beside **strong** and `code`\n\nafter"
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      "<p>Keep *literal* and _plain_ beside <strong>strong</strong> and <code>code</code></p>",
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<em>literal</em>");
    expect(html).not.toContain("<em>plain</em>");
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

  it("expands tabs inside inline code spans like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Keep `a\tb` and ` \ta\t ` text"} />,
    );

    expect(html).toContain("<code>a    b</code>");
    expect(html).toContain("<code>    a    </code>");
    expect(html).not.toContain("<code>a\tb</code>");
  });

  it("preserves legacy inline code span delimiter edge cases", () => {
    const isolatedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"``\n\n````\n\n` `"} />);
    const crossingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Keep `` and ```` but render ` `, `` ` ``, and `a``b`"} />,
    );

    expect(isolatedHtml).toContain("<p>``</p>");
    expect(isolatedHtml).toContain("<p>````</p>");
    expect(isolatedHtml).toContain("<p><code> </code></p>");
    expect(isolatedHtml).not.toContain("<code></code>");
    expect(crossingHtml).toContain("<code>and ```` but render ` `,</code>");
    expect(crossingHtml).toContain("<code>``, and</code>a`<code>b</code>");
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

  it("renders matching backtick-run code spans through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "before\n\nKeep `` `literal` `` beside ``` ``literal`` ``` and `plain` text\n\nafter"
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<code>`literal`</code>");
    expect(html).toContain("<code>``literal``</code>");
    expect(html).toContain("<code>plain</code>");
    expect(html).toContain("<p>after</p>");
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
      <MarkdownRenderer
        markdown={"Backslash\\\nnext\nTwo spaces  \nafter\nTab\t\nend\nSingle space \ntrimmed"}
      />,
    );

    expect(html).toContain(
      "<p>Backslash<br/>next<br/>Two spaces<br/>after<br/>Tab<br/>end<br/>Single space<br/>trimmed</p>",
    );
    expect(html).not.toContain("Backslash\\");
    expect(html).not.toContain("Two spaces  <br/>");
    expect(html).not.toContain("Tab    <br/>");
    expect(html).not.toContain("Single space <br/>");
  });

  it("keeps README soft line breaks disabled like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        className="readme-body markdown-wrap"
        markdown={
          "first line\nsecond line\nsoft space \nnext\nhard tab\t\nnext\nhard break\\\nnext"
        }
      />,
    );

    expect(html).toContain(
      "first line\nsecond line\nsoft space \nnext\nhard tab<br/>next\nhard break<br/>next",
    );
    expect(html).not.toContain("first line<br/>second line");
    expect(html).not.toContain("hard break\\");
    expect(html).not.toContain("hard tab    <br/>");
  });

  it("renders README soft breaks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        className="readme-body markdown-wrap"
        markdown={
          "# README\n\nfirst line\nsecond line\nhard break\\\nnext\n\n- item\n  continuation\n\nfinal line\nsoft next"
        }
      />,
    );

    expect(html).toContain('<div class="readme-body markdown-wrap">');
    expect(html).toContain(
      '<h1 id="readme">README<a class="head-anchor" href="#readme">#</a></h1>',
    );
    expect(html).toContain("<p>first line\nsecond line\nhard break<br/>next</p>");
    expect(html).toContain("<ul><li>item\ncontinuation</li></ul>");
    expect(html).toContain("<p>final line\nsoft next</p>");
    expect(html).not.toContain("first line<br/>second line");
    expect(html).not.toContain("final line<br/>soft next");
  });

  it("renders multi-line simple inline paragraphs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"first **strong**\nsecond ~~deleted~~\nthird `code`"} />,
    );

    expect(html).toContain(
      "<p>first <strong>strong</strong><br/>second <del>deleted</del><br/>third <code>code</code></p>",
    );
  });

  it("renders multi-line inline link, reference, and Yona autolink paragraphs through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Multiline issue",
          },
        ]}
        markdown={
          '**Read** [docs](https://example.com/docs)\nThen [guide][docs]\nTitled [title]( <https://example.com/title> "Title" )\nFinally owner#7\n\n[docs]: https://example.com/ref "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(
      '<p><strong>Read</strong> <a href="https://example.com/docs">docs</a><br/>Then <a href="https://example.com/ref" title="Docs">guide</a><br/>Titled <a href="https://example.com/title" title="Title">title</a><br/>Finally <a class="issueLink"',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Multiline issue"');
    expect(html).toContain('data-issue-state="closed"');
    expect(html).not.toContain("[docs]:");
  });

  it("renders multi-line inline raw formatting paragraphs through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Raw multiline issue",
          },
        ]}
        markdown={
          '<span class="state">open</span> [docs](https://example.com/docs)\nNext <em>See http://example.com</em>\nplain **strong**\nescaped \\*literal\\* text\nThen [guide][docs]\nTitled [title]( <https://example.com/title> "Title" ) and ![logo]( /logo.png "Logo" )\nFinally owner#7\n\n[docs]: https://example.com/ref "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(
      '<p><span class="state">open</span> <a href="https://example.com/docs">docs</a><br/>Next <em>See <a href="http://example.com">http://example.com</a></em><br/>plain <strong>strong</strong><br/>escaped *literal* text<br/>Then <a href="https://example.com/ref" title="Docs">guide</a><br/>Titled <a href="https://example.com/title" title="Title">title</a> and <img alt="logo" src="/logo.png" title="Logo"/><br/>Finally <a class="issueLink"',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Raw multiline issue"');
    expect(html).toContain('data-issue-state="closed"');
    expect(html).not.toContain("[docs]:");
    expect(html).not.toContain("<em>literal</em>");
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

  it("renders simple inline links and images inside plain paragraphs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"See [docs](https://example.com/docs) and ![logo](/files/logo.png) now"}
      />,
    );

    expect(html).toContain(
      '<p>See <a href="https://example.com/docs">docs</a> and <img alt="logo" src="/files/logo.png"/> now</p>',
    );
  });

  it("renders formatted text around inline links and images through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "**Read** [docs](https://example.com/docs) and ~~see~~ ![logo](/files/logo.png) with `code`"
        }
      />,
    );

    expect(html).toContain(
      '<p><strong>Read</strong> <a href="https://example.com/docs">docs</a> and <del>see</del> <img alt="logo" src="/files/logo.png"/> with <code>code</code></p>',
    );
  });

  it("allows whitespace around inline link and image targets like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](   https://example.com/docs   ) [guide]( <https://example.com/guide> "Read guide" ) ![logo]( /files/logo.png "Logo title" ) [bad]( javascript:alert(1) )'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs">docs</a>');
    expect(html).toContain('<a href="https://example.com/guide" title="Read guide">guide</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).toContain('<a href="#">bad</a>');
    expect(html).not.toContain('href="javascript:alert(1)"');
  });

  it("renders empty inline link targets like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={'[empty]() [space](   ) [angle](<> "Title")'} />,
    );

    expect(html).toContain('<a href="">empty</a>');
    expect(html).toContain('<a href="">space</a>');
    expect(html).toContain('<a href="" title="Title">angle</a>');
  });

  it("renders empty inline link labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"[](https://example.com) [ ](https://example.com/space)"} />,
    );

    expect(html).toContain('<a href="https://example.com"></a>');
    expect(html).toContain('<a href="https://example.com/space"> </a>');
    expect(html).not.toContain('<a href="https://example.com">https://example.com</a>');
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

  it("renders inline titles split onto the next line like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](https://example.com/docs\n"Read docs") [single](https://example.com/single\n  \'Single title\') [paren](https://example.com/paren\n(Read paren)) ![logo](/files/logo.png\n"Logo title")'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<a href="https://example.com/single" title="Single title">single</a>');
    expect(html).toContain('<a href="https://example.com/paren" title="Read paren">paren</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).not.toContain("<br/>");
  });

  it("renders tab-separated inline titles like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](https://example.com/docs\t"Tab title") [split](https://example.com/split\n\t"Split tab title") ![logo](/files/logo.png\t"Logo tab title")'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Tab title">docs</a>');
    expect(html).toContain('<a href="https://example.com/split" title="Split tab title">split</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo tab title"/>');
  });

  it("does not resolve blank-line inline titles like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={'[docs](https://example.com/docs\n\n"Read docs")'} />,
    );

    expect(html).toContain(
      '[docs](<a href="https://example.com/docs">https://example.com/docs</a>',
    );
    expect(html).toContain("<p>&quot;Read docs&quot;)</p>");
    expect(html).not.toContain('title="Read docs"');
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

  it("decodes HTML entities in inline targets before React escaping like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="[docs](https://example.com?a=1&amp;b=2) ![logo](/files/logo&amp;1.png) [bad](javascript&#58;alert(1))" />,
    );

    expect(html).toContain('<a href="https://example.com?a=1&amp;b=2">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo&amp;1.png"/>');
    expect(html).toContain('<a href="#">bad</a>');
    expect(html).not.toContain("&amp;amp;");
    expect(html).not.toContain('href="javascript');
  });

  it("renders inline link and image targets with balanced parentheses like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="[docs](https://example.com/a(b)) ![logo](/files/logo(1).png)" />,
    );

    expect(html).toContain('<a href="https://example.com/a(b)">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo(1).png"/>');
    expect(html).not.toContain("[docs](");
    expect(html).not.toContain("![logo](");
  });

  it("encodes unsafe characters in link and image targets like legacy marked", () => {
    const bracketInlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="[docs](https://example.com/a[b])" />,
    );
    const bracesInlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="[braces](https://example.com/a{b})" />,
    );
    const pipeInlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="[pipe](https://example.com/a|b)" />,
    );
    const caretInlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="[caret](https://example.com/a^b)" />,
    );
    const tickInlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="[tick](https://example.com/a`b)" />,
    );
    const imageHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="![logo](/files/logo[1].png)" />,
    );
    const bareHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="See https://example.com/raw[b] and https://example.com/raw{b} and https://example.com/raw|b and https://example.com/raw^b and https://example.com/raw`b" />,
    );
    const angleHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown="<https://example.com/angle[b]>" />,
    );

    expect(bracketInlineHtml).toContain('<a href="https://example.com/a%5Bb%5D">docs</a>');
    expect(bracesInlineHtml).toContain('<a href="https://example.com/a%7Bb%7D">braces</a>');
    expect(pipeInlineHtml).toContain('<a href="https://example.com/a%7Cb">pipe</a>');
    expect(caretInlineHtml).toContain('<a href="https://example.com/a%5Eb">caret</a>');
    expect(tickInlineHtml).toContain('<a href="https://example.com/a%60b">tick</a>');
    expect(imageHtml).toContain('<img alt="logo" src="/files/logo%5B1%5D.png"/>');
    expect(bareHtml).toContain(
      '<a href="https://example.com/raw%5Bb%5D">https://example.com/raw[b]</a>',
    );
    expect(bareHtml).toContain(
      '<a href="https://example.com/raw%7Bb%7D">https://example.com/raw{b}</a>',
    );
    expect(bareHtml).toContain(
      '<a href="https://example.com/raw%7Cb">https://example.com/raw|b</a>',
    );
    expect(bareHtml).toContain(
      '<a href="https://example.com/raw%5Eb">https://example.com/raw^b</a>',
    );
    expect(bareHtml).toContain(
      '<a href="https://example.com/raw%60b">https://example.com/raw`b</a>',
    );
    expect(angleHtml).toContain(
      '<a href="https://example.com/angle%5Bb%5D">https://example.com/angle[b]</a>',
    );
  });

  it("percent-encodes non-ASCII href and src targets like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](<https://example.com/한글 path>) ![logo](/files/한글.png) [ref][guide]\n\n[guide]: https://example.com/한글 "Title"\n\nhttps://example.com/한글'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/%ED%95%9C%EA%B8%80%20path">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/%ED%95%9C%EA%B8%80.png"/>');
    expect(html).toContain(
      '<a href="https://example.com/%ED%95%9C%EA%B8%80" title="Title">ref</a>',
    );
    expect(html).toContain(
      '<a href="https://example.com/%ED%95%9C%EA%B8%80">https://example.com/한글</a>',
    );
    expect(html).not.toContain('href="https://example.com/한글');
    expect(html).not.toContain('src="/files/한글');
  });

  it("accepts angle-wrapped inline targets with spaces like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs](<https://example.com/a b> "title") ![logo](</files/logo 1.png>) [mail](<mailto:user name@example.com>) [leading](< https://example.com/a b >) ![spaced](< /files/a b.png >) [blank](< >) [bad](<javascript:alert(1)>)'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/a%20b" title="title">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo%201.png"/>');
    expect(html).toContain('<a href="mailto:user%20name@example.com">mail</a>');
    expect(html).toContain('<a href="%20https://example.com/a%20b%20">leading</a>');
    expect(html).toContain('<img alt="spaced" src="%20/files/a%20b.png%20"/>');
    expect(html).toContain('<a href="%20">blank</a>');
    expect(html).toContain('<a href="#">bad</a>');
    expect(html).not.toContain('href="javascript:alert(1)"');
  });

  it("renders one-level nested link and image labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="[[docs]](https://example.com) [a [b] c](https://example.com/nested) ![a [b] c](/files/logo.png)" />,
    );

    expect(html).toContain('<a href="https://example.com">[docs]</a>');
    expect(html).toContain('<a href="https://example.com/nested">a [b] c</a>');
    expect(html).toContain('<img alt="a [b] c" src="/files/logo.png"/>');
  });

  it("unescapes link and image label punctuation like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "[a\\]b](https://example.com) [a\\[b][ref] ![a\\*b a\\[c\\] a\\!d a\\`e](/files/logo.png)\n\n[ref]: https://example.com/ref"
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com">a]b</a>');
    expect(html).toContain('<a href="https://example.com/ref">a[b</a>');
    expect(html).toContain('<img alt="a\\*b a[c] a\\!d a\\`e" src="/files/logo.png"/>');
    expect(html).not.toContain("a\\]b");
    expect(html).not.toContain("a\\[b");
  });

  it("renders code spans inside link labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "[`code`](https://example.com) [a `co]de` b](https://example.com/bracket) [`ref`][ref] ![`code`](/files/logo.png)\n\n[ref]: https://example.com/ref"
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com"><code>code</code></a>');
    expect(html).toContain('<a href="https://example.com/bracket">a <code>co]de</code> b</a>');
    expect(html).toContain('<a href="https://example.com/ref"><code>ref</code></a>');
    expect(html).toContain('<img alt="`code`" src="/files/logo.png"/>');
  });

  it("expands tabs in link-label code spans like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"[`a\tb`](https://example.com) ![`a\tb`](img.png) ![` a `](space.png)"}
      />,
    );

    expect(html).toContain('<a href="https://example.com"><code>a    b</code></a>');
    expect(html).toContain('<img alt="`a    b`" src="img.png"/>');
    expect(html).toContain('<img alt="` a `" src="space.png"/>');
    expect(html).not.toContain("a\tb");
  });

  it("expands tabs in inline text and image labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"a\tb [a\tb](https://example.com) ![a\tb](img.png)"} />,
    );

    expect(html).toContain("a    b ");
    expect(html).toContain('<a href="https://example.com">a    b</a>');
    expect(html).toContain('<img alt="a    b" src="img.png"/>');
    expect(html).not.toContain("a\tb");
  });

  it("renders inline markdown inside link labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[**bold** *em* ~~del~~](https://example.com) [plain <em>html</em> tail](https://example.com/html) [<span data-x="1">label</span>](https://example.com/span) [a [b](https://inner.com) c](https://outer.com) [![alt](img.png)](https://image-link.com) [http://example.com user@example.com @user #1](https://outer.com/literal) [<user@example.com>](https://outer.com/email) [<http://example.com>](https://outer.com/angle) ![<em>alt</em>](img.png)'
        }
      />,
    );

    expect(html).toContain(
      '<a href="https://example.com"><strong>bold</strong> <em>em</em> <del>del</del></a>',
    );
    expect(html).toContain('<a href="https://example.com/html">plain <em>html</em> tail</a>');
    expect(html).toContain('<a href="https://example.com/span"><span data-x="1">label</span></a>');
    expect(html).toContain('<a href="https://outer.com">a <a href="https://inner.com">b</a> c</a>');
    expect(html).toContain('<a href="https://image-link.com"><img alt="alt" src="img.png"/></a>');
    expect(html).toContain(
      '<a href="https://outer.com/literal">http://example.com user@example.com @user #1</a>',
    );
    expect(html).toContain(
      '<a href="https://outer.com/email"><a href="mailto:user@example.com">user@example.com</a></a>',
    );
    expect(html).toContain(
      '<a href="https://outer.com/angle"><a href="http://example.com">http://example.com</a></a>',
    );
    expect(html).toContain('<img alt="&lt;em&gt;alt&lt;/em&gt;" src="img.png"/>');
    expect(html).not.toContain('<a href="https://outer.com/literal"><a href="http://example.com">');
    expect(html).not.toContain(
      '<a href="https://outer.com/literal"><a href="mailto:user@example.com">',
    );
    expect(html).not.toContain('href="/@user"');
    expect(html).not.toContain('href="/issue/1"');
  });

  it("renders multi-backtick code spans inside link labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "[``code``](https://example.com/double) [a ``code`` b](https://example.com/mixed) [```co]de```](https://example.com/bracket) ![``code``](/files/logo.png)"
        }
      />,
    );
    const referenceHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"[``ref``][ref]\n\n[ref]: https://example.com/ref"} />,
    );

    expect(html).toContain('<a href="https://example.com/double"><code>code</code></a>');
    expect(html).toContain('<a href="https://example.com/mixed">a <code>code</code> b</a>');
    expect(html).toContain('<a href="https://example.com/bracket"><code>co]de</code></a>');
    expect(referenceHtml).toContain('<a href="https://example.com/ref"><code>ref</code></a>');
    expect(html).toContain('<img alt="``code``" src="/files/logo.png"/>');
  });

  it("tokenizes adjacent reference links and images like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "[ref][r] ![img](/files/logo.png) [``code``][r][next](https://example.com/next) [ref][r]![tight](/files/tight.png)\n\n[r]: https://example.com/ref"
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/ref">ref</a> <img alt="img"');
    expect(html).toContain('<a href="https://example.com/ref"><code>code</code></a>');
    expect(html).toContain('<a href="https://example.com/next">next</a>');
    expect(html).toContain('<a href="https://example.com/ref">ref</a><img alt="tight"');
    expect(html).not.toContain('href="/files/logo.png">ref');
    expect(html).not.toContain("][r] !");
  });

  it("keeps shorter inner-backtick code label forms literal like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="[``co`de``](https://example.com/double)" />,
    );

    expect(html).toContain("[<code>co`de</code>](");
    expect(html).toContain('<a href="https://example.com/double">https://example.com/double</a>');
    expect(html).not.toContain('href="https://example.com/double"><code>co`de</code></a>');
  });

  it("keeps deeper nested inline labels literal like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="[a [b [c]] d](https://example.com)" />,
    );

    expect(html).toContain("[a [b [c]] d](");
    expect(html).toContain('<a href="https://example.com">https://example.com</a>');
    expect(html).not.toContain('href="https://example.com">a [b [c]] d</a>');
  });

  it("accepts uppercase safe inline link and image schemes like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="[Docs](HTTP://EXAMPLE.COM) ![Logo](HTTPS://EXAMPLE.COM/logo.png) [Mail](MAILTO:HELP@EXAMPLE.COM) [Bad](javascript:alert(1))" />,
    );

    expect(html).toContain('<a href="HTTP://EXAMPLE.COM">Docs</a>');
    expect(html).toContain('<img alt="Logo" src="HTTPS://EXAMPLE.COM/logo.png"/>');
    expect(html).toContain('<a href="MAILTO:HELP@EXAMPLE.COM">Mail</a>');
    expect(html).toContain('<a href="#">Bad</a>');
    expect(html).not.toContain('href="javascript:alert(1)"');
  });

  it("accepts legacy sanitizer file and zpl Markdown targets", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "[file](file:///tmp/report.txt) ![movie](zpl:movie) [ref][file-ref] ![ref-img][zpl-ref]\n\n[file-ref]: file:///tmp/from-ref.txt\n[zpl-ref]: zpl:from-ref"
        }
      />,
    );

    expect(html).toContain('<a href="file:///tmp/report.txt">file</a>');
    expect(html).toContain('<img alt="movie" src="zpl:movie"/>');
    expect(html).toContain('<a href="file:///tmp/from-ref.txt">ref</a>');
    expect(html).toContain('<img alt="ref-img" src="zpl:from-ref"/>');
    expect(html).not.toContain("[file-ref]:");
    expect(html).not.toContain("[zpl-ref]:");
  });

  it("accepts scheme-less relative Markdown targets like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[rel](docs/guide.md) ![logo](images/logo.png) [hash](section#part) [query](?page=2) [ref][guide] [bad](tel:123) [data](data:text/plain,hi)\n\n[guide]: docs/reference.md "Guide"'
        }
      />,
    );

    expect(html).toContain('<a href="docs/guide.md">rel</a>');
    expect(html).toContain('<img alt="logo" src="images/logo.png"/>');
    expect(html).toContain('<a href="section#part">hash</a>');
    expect(html).toContain('<a href="?page=2">query</a>');
    expect(html).toContain('<a href="docs/reference.md" title="Guide">ref</a>');
    expect(html).toContain("<a>bad</a>");
    expect(html).toContain("<a>data</a>");
    expect(html).not.toContain("[bad](tel:123)");
    expect(html).not.toContain("[data](data:text/plain,hi)");
    expect(html).not.toContain('href="tel:123"');
    expect(html).not.toContain('href="data:text/plain,hi"');
    expect(html).not.toContain("[guide]:");
  });

  it("renders reference-style links and images like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide] ![logo][asset] [shortcut] [a [b] c][nested]\n\n[guide]: https://example.com/docs "Read docs"\n[asset]: /files/logo.png "Logo title"\n[shortcut]: ./shortcut\n[nested]: https://example.com/nested'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).toContain('<a href="./shortcut">shortcut</a>');
    expect(html).toContain('<a href="https://example.com/nested">a [b] c</a>');
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
    expect(html).not.toContain("[shortcut]:");
    expect(html).not.toContain("[nested]:");
  });

  it("renders reference-style links and images inside plain paragraphs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "Reference paragraph issue",
          },
        ]}
        markdown={
          'See \\*literal\\* and [home](https://example.com/home) and http://example.com then owner#7 and [docs][guide] and ![logo][asset] now\n\n[guide]: https://example.com/docs "Read docs"\n[asset]: /files/logo.png "Logo title"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(
      '<p>See *literal* and <a href="https://example.com/home">home</a> and <a href="http://example.com">http://example.com</a> then <a class="issueLink"',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Reference paragraph issue"');
    expect(html).toContain(
      '<a href="https://example.com/docs" title="Read docs">docs</a> and <img alt="logo" src="/files/logo.png" title="Logo title"/> now</p>',
    );
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
    expect(html).not.toContain("<em>literal</em>");
  });

  it("renders formatted text around reference-style links through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Formatted reference issue",
          },
        ]}
        markdown={
          '**See** [home](https://example.com/home) and ~~url~~ http://example.com then _issue_ owner#7 and [docs][guide] and ~~asset~~ ![logo][asset] now\n\n[guide]: https://example.com/docs "Read docs"\n[asset]: /files/logo.png "Logo title"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain(
      '<p><strong>See</strong> <a href="https://example.com/home">home</a> and <del>url</del> <a href="http://example.com">http://example.com</a> then <em>issue</em> <a class="issueLink"',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Formatted reference issue"');
    expect(html).toContain(
      '<a href="https://example.com/docs" title="Read docs">docs</a> and <del>asset</del> <img alt="logo" src="/files/logo.png" title="Logo title"/> now</p>',
    );
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
  });

  it("resolves collapsed reference-style links and images like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][] ![logo][]\n\n[docs]: https://example.com/docs "Read docs"\n[logo]: /files/logo.png "Logo title"'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).not.toContain("[docs][]");
    expect(html).not.toContain("![logo][]");
  });

  it("keeps the first duplicate reference definition like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide]\n\n[guide]: https://example.com/first "First title"\n[guide]: https://example.com/second "Second title"'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/first" title="First title">docs</a>');
    expect(html).not.toContain("https://example.com/second");
    expect(html).not.toContain("Second title");
    expect(html).not.toContain("[guide]:");
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

  it("decodes HTML entities in reference targets before React escaping like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide] ![logo][asset] [bad][bad]\n\n[guide]: https://example.com?a=1&amp;b=2 "T &amp; C"\n[asset]: /files/logo&amp;1.png\n[bad]: javascript&#58;alert(1)'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com?a=1&amp;b=2" title="T &amp; C">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo&amp;1.png"/>');
    expect(html).toContain('<a href="#">bad</a>');
    expect(html).not.toContain("[bad]:");
    expect(html).not.toContain("&amp;amp;");
    expect(html).not.toContain('href="javascript');
  });

  it("resolves newline-split reference definitions like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '[docs][guide] ![logo][asset] [split][split-guide] ![split-logo][split-asset]\n\n[guide]:\n  https://example.com/docs "Read docs"\n[asset]:\n  /files/logo.png "Logo title"\n[split-guide]:\n  https://example.com/split\n  "Split docs"\n[split-asset]:\n  /files/split-logo.png\n  "Split logo"'
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs" title="Read docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png" title="Logo title"/>');
    expect(html).toContain('<a href="https://example.com/split" title="Split docs">split</a>');
    expect(html).toContain(
      '<img alt="split-logo" src="/files/split-logo.png" title="Split logo"/>',
    );
    expect(html).not.toContain("[guide]:");
    expect(html).not.toContain("[asset]:");
    expect(html).not.toContain("[split-guide]:");
    expect(html).not.toContain("[split-asset]:");
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

  it("resolves empty angle reference targets like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'See [guide][ref] and ![logo][img] before [split][next]\n\n[ref]: <> "Read docs"\n[img]: <>\n[next]: <>\n  "Split title"'
        }
      />,
    );

    expect(html).toContain("<p>See ");
    expect(html).toContain('<a href="%3C" title="Read docs">guide</a>');
    expect(html).toContain('<img alt="logo" src="%3C"/>');
    expect(html).toContain('<a href="%3C" title="Split title">split</a>');
    expect(html).not.toContain("[ref]:");
    expect(html).not.toContain("[img]:");
    expect(html).not.toContain("[next]:");
  });

  it("resolves escaped reference labels like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "See [docs][guide\\]] and ![logo][asset\\]] now\n\n[guide\\]]: https://example.com/docs\n[asset\\]]: /files/logo.png"
        }
      />,
    );

    expect(html).toContain("<p>See ");
    expect(html).toContain('<a href="https://example.com/docs">docs</a>');
    expect(html).toContain('<img alt="logo" src="/files/logo.png"/>');
    expect(html).toContain(" now</p>");
    expect(html).not.toContain("[guide\\]]:");
    expect(html).not.toContain("[asset\\]]:");
  });

  it("renders angle-bracket autolinks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See <https://example.com/docs> and <help@example.com> plus <mailto:help@example.com> and <MAILTO:ADMIN@EXAMPLE.COM>" />,
    );

    expect(html).toContain(
      'See <a href="https://example.com/docs">https://example.com/docs</a> and ',
    );
    expect(html).toContain('<a href="mailto:help@example.com">help@example.com</a>');
    expect(html).toContain('<a href="mailto:help@example.com">mailto:help@example.com</a>');
    expect(html).toContain('<a href="MAILTO:ADMIN@EXAMPLE.COM">MAILTO:ADMIN@EXAMPLE.COM</a>');
    expect(html).not.toContain("https://example.com/docs&gt;");
    expect(html).not.toContain("&lt;help@example.com&gt;");
    expect(html).not.toContain("&lt;mailto:help@example.com&gt;");
  });

  it("renders extended angle-bracket email local parts like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "Mail <foo!bar@example.com> <foo#bar@example.com> <foo'bar@example.com> <foo/bar@example.com> <foo=bar@example.com> <foo`bar@example.com> <foo{bar@example.com> <foo|bar@example.com> <foo}bar@example.com> <foo~bar@example.com> but not <foo^bar@example.com>"
        }
      />,
    );

    expect(html).toContain('<a href="mailto:foo!bar@example.com">foo!bar@example.com</a>');
    expect(html).toContain('<a href="mailto:foo#bar@example.com">foo#bar@example.com</a>');
    expect(html).toContain(
      '<a href="mailto:foo&#x27;bar@example.com">foo&#x27;bar@example.com</a>',
    );
    expect(html).toContain('<a href="mailto:foo/bar@example.com">foo/bar@example.com</a>');
    expect(html).toContain('<a href="mailto:foo=bar@example.com">foo=bar@example.com</a>');
    expect(html).toContain('<a href="mailto:foo%60bar@example.com">foo`bar@example.com</a>');
    expect(html).toContain('<a href="mailto:foo%7Bbar@example.com">foo{bar@example.com</a>');
    expect(html).toContain('<a href="mailto:foo%7Cbar@example.com">foo|bar@example.com</a>');
    expect(html).toContain('<a href="mailto:foo%7Dbar@example.com">foo}bar@example.com</a>');
    expect(html).toContain('<a href="mailto:foo~bar@example.com">foo~bar@example.com</a>');
    expect(html).toContain("&lt;foo^");
    expect(html).toContain('<a href="mailto:bar@example.com">bar@example.com</a>&gt;');
    expect(html).not.toContain('href="mailto:foo^bar@example.com"');
  });

  it("renders mixed extended angle email autolinks through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"Mail <foo#bar@example.com> and <foo'bar@example.com> plus <foo|bar@example.com>"}
      />,
    );

    expect(html).toContain(
      '<p>Mail <a href="mailto:foo#bar@example.com">foo#bar@example.com</a> and <a href="mailto:foo&#x27;bar@example.com">foo&#x27;bar@example.com</a> plus <a href="mailto:foo%7Cbar@example.com">foo|bar@example.com</a></p>',
    );
  });

  it("uses legacy angle-bracket email domain validation", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "Mail <foo@example.c> <foo@example.12> <foo@example-domain.com> but keep <foo@example_domain.com> <foo@example.com-> <foo@-example.com> <foo@example..com>"
        }
      />,
    );

    expect(html).toContain('<a href="mailto:foo@example.c">foo@example.c</a>');
    expect(html).toContain('<a href="mailto:foo@example.12">foo@example.12</a>');
    expect(html).toContain('<a href="mailto:foo@example-domain.com">foo@example-domain.com</a>');
    expect(html).toContain("&lt;foo@example_domain.com&gt;");
    expect(html).toContain("&lt;foo@example.com-&gt;");
    expect(html).toContain("&lt;foo@-example.com&gt;");
    expect(html).toContain("&lt;foo@example..com&gt;");
    expect(html).not.toContain('href="mailto:foo@example_domain.com"');
    expect(html).not.toContain('href="mailto:foo@example.com-"');
  });

  it("renders legacy sanitizer file and zpl angle autolinks like marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See <file:///tmp/report.txt> and <zpl:movie> but keep <tel:123>" />,
    );

    expect(html).toContain('<a href="file:///tmp/report.txt">file:///tmp/report.txt</a>');
    expect(html).toContain('<a href="zpl:movie">zpl:movie</a>');
    expect(html).toContain("&lt;tel:123&gt;");
    expect(html).not.toContain('href="tel:123"');
  });

  it("renders mixed file and zpl angle autolinks through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "- File <file:///tmp/report.txt>\n- ZPL <zpl:movie>\n\nKind | Link\n- | -\nfile | <file:///tmp/report.txt>\nzpl | <zpl:movie>\n\n> File <file:///tmp/report.txt>\n> ZPL <zpl:movie>"
        }
      />,
    );

    expect(html).toContain(
      '<li>File <a href="file:///tmp/report.txt">file:///tmp/report.txt</a></li>',
    );
    expect(html).toContain('<li>ZPL <a href="zpl:movie">zpl:movie</a></li>');
    expect(html).toContain('<td><a href="file:///tmp/report.txt">file:///tmp/report.txt</a></td>');
    expect(html).toContain('<td><a href="zpl:movie">zpl:movie</a></td>');
    expect(html).toContain(
      '<blockquote><p>File <a href="file:///tmp/report.txt">file:///tmp/report.txt</a><br/>ZPL <a href="zpl:movie">zpl:movie</a></p></blockquote>',
    );
  });

  it("renders uppercase URL autolinks like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See <HTTP://EXAMPLE.COM> and plain HTTP://EXAMPLE.COM" />,
    );

    expect(html).toContain('<a href="HTTP://EXAMPLE.COM">HTTP://EXAMPLE.COM</a>');
    expect(html).toContain('plain <a href="HTTP://EXAMPLE.COM">HTTP://EXAMPLE.COM</a>');
  });

  it("renders uppercase bare URL schemes like legacy marked GFM", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See HTTP://EXAMPLE.COM and FTP://FILES.EXAMPLE.COM/archive.zip" />,
    );

    expect(html).toContain('<a href="HTTP://EXAMPLE.COM">HTTP://EXAMPLE.COM</a>');
    expect(html).toContain(
      '<a href="FTP://FILES.EXAMPLE.COM/archive.zip">FTP://FILES.EXAMPLE.COM/archive.zip</a>',
    );
  });

  it("renders bare URLs inside plain paragraphs through the ReactMarkdown path like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See https://example.com/docs and www.example.com/end." />,
    );

    expect(html).toContain(
      '<p>See <a href="https://example.com/docs">https://example.com/docs</a> and <a href="http://www.example.com/end">www.example.com/end</a>.</p>',
    );
  });

  it("renders formatted text around bare URLs through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="**See** https://example.com/docs and ~~mail~~ support@example.com" />,
    );

    expect(html).toContain(
      '<p><strong>See</strong> <a href="https://example.com/docs">https://example.com/docs</a> and <del>mail</del> <a href="mailto:support@example.com">support@example.com</a></p>',
    );
  });

  it("renders unquoted bare emails inside plain paragraphs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Mail support@example.com for help" />,
    );

    expect(html).toContain(
      '<p>Mail <a href="mailto:support@example.com">support@example.com</a> for help</p>',
    );
  });

  it("normalizes lowercase www bare autolink hrefs like legacy marked GFM", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See www.example.com/end. and (www.example.com/docs)," />,
    );

    expect(html).toContain('<a href="http://www.example.com/end">www.example.com/end</a>.');
    expect(html).toContain('(<a href="http://www.example.com/docs">www.example.com/docs</a>),');
    expect(html).not.toContain('href="www.example.com/end"');
    expect(html).not.toContain('href="http://www.example.com/end."');
  });

  it("preserves uppercase WWW bare autolink hrefs like legacy marked GFM", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="See WWW.EXAMPLE.COM/path and www.example_domain.com" />,
    );

    expect(html).toContain('<a href="WWW.EXAMPLE.COM/path">WWW.EXAMPLE.COM/path</a>');
    expect(html).toContain('<a href="http://www.example_domain.com">www.example_domain.com</a>');
    expect(html).not.toContain('href="http://WWW.EXAMPLE.COM/path"');
  });

  it("renders extended bare email autolinks like legacy marked GFM", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown="Mail support@example_domain.com and keep support@example_domain." />,
    );

    expect(html).toContain(
      '<a href="mailto:support@example_domain.com">support@example_domain.com</a>',
    );
    expect(html).toContain("support@example_domain.");
    expect(html).not.toContain('href="mailto:support@example_domain."');
  });

  it("handles quoted bare email autolinks like legacy marked GFM", () => {
    const markdown =
      "Mail \"user@example.com\" but keep 'user@example.com' while linking 'https://example.com/a'";
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={markdown} />);

    expect(html).toContain('&quot;<a href="mailto:user@example.com">user@example.com</a>&quot;');
    expect(html).toContain("&#x27;user@example.com&#x27;");
    expect(html).toContain(
      '&#x27;<a href="https://example.com/a&#x27;">https://example.com/a&#x27;</a>',
    );
    expect(html).not.toContain("mailto:user@example.com&#x27;");
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

  it("backpedals unmatched closing brackets from bare URLs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "See https://example.com/docs] and {https://example.com/a(b)} but keep https://example.com/a[b] and https://example.com/a{b}"
        }
      />,
    );

    expect(html).toContain('<a href="https://example.com/docs">https://example.com/docs</a>]');
    expect(html).toContain("</a>]");
    expect(html).toContain('{<a href="https://example.com/a(b)">https://example.com/a(b)</a>}');
    expect(html).toContain('<a href="https://example.com/a%5Bb%5D">https://example.com/a[b]</a>');
    expect(html).toContain('<a href="https://example.com/a%7Bb%7D">https://example.com/a{b}</a>');
    expect(html).not.toContain('href="https://example.com/docs]"');
    expect(html).not.toContain('href="https://example.com/a(b)}"');
  });

  it("backpedals entity-like suffixes from bare URLs like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"See https://example.com/a&copy; and https://example.com/a&amp;copy;"}
      />,
    );

    expect(html).toContain('<a href="https://example.com/a">https://example.com/a</a>©');
    expect(html).toContain(
      '<a href="https://example.com/a&amp;amp;copy">https://example.com/a&amp;copy</a>;',
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

  it("accepts up-to-three-space indented GFM tables like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"   A | B\n  - | -\n  1 | 2"} />);
    const indentedCodeHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"    A | B\n    - | -\n    1 | 2"} />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<th>B</th>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).not.toContain("<pre><code>A | B");
    expect(indentedCodeHtml).toContain("<pre><code>A | B\n- | -\n1 | 2</code></pre>");
    expect(indentedCodeHtml).not.toContain("<table>");
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

  it("splits even-backslash table pipes like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"A \\\\| B\n- | -\n1 | 2"} />);

    expect(html).toContain("<table>");
    expect(html).toContain("<th>A \\</th>");
    expect(html).toContain("<th>B</th>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).not.toContain("<p>A \\| B</p>");
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

  it("renders inline links and images in GFM table cells through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "Name | Link | Image\n- | - | -\nDocs | [Guide](https://example.com/guide) | ![Logo](/files/logo.png)"
        }
      />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<td>Docs</td>");
    expect(html).toContain('<td><a href="https://example.com/guide">Guide</a></td>');
    expect(html).toContain('<td><img alt="Logo" src="/files/logo.png"/></td>');
  });

  it("renders reference links and Yona autolinks in GFM table cells through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Table issue",
          },
        ]}
        markdown={
          'Kind | Value\n- | -\nRef | See [guide][docs]\nIssue | owner#7\n\n[docs]: https://example.com/docs "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain(
      '<td>See <a href="https://example.com/docs" title="Docs">guide</a></td>',
    );
    expect(html).toContain('<td><a class="issueLink"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Table issue"');
    expect(html).toContain('data-issue-state="closed"');
    expect(html).not.toContain("[docs]:");
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

  it("accepts colon-only table separators without alignment like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B | C\n: | :: | :-:\n1 | 2 | 3"} />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<th>B</th>");
    expect(html).toContain('<th align="center">C</th>');
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain('<td align="center">3</td>');
    expect(html).not.toContain('<th align="left">A</th>');
    expect(html).not.toContain('<th align="center">B</th>');
    expect(html).not.toContain("<p>A | B | C");
  });

  it("requires a real pipe before accepting colon-only one-column tables like legacy marked", () => {
    const paragraphHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"A\n:\n1"} />);
    const escapedPipeHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"A \\| B\n-\n1"} />);
    const tableHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"A |\n: |\n1 |"} />);

    expect(paragraphHtml).toContain("<p>A<br/>:<br/>1</p>");
    expect(paragraphHtml).not.toContain("<table>");
    expect(escapedPipeHtml).toContain(
      '<h2 id="a-b">A | B<a class="head-anchor" href="#a-b">#</a></h2>',
    );
    expect(escapedPipeHtml).toContain("<p>1</p>");
    expect(escapedPipeHtml).not.toContain("<table>");
    expect(tableHtml).toContain("<table>");
    expect(tableHtml).toContain("<th>A</th>");
    expect(tableHtml).toContain("<td>1</td>");
  });

  it("omits empty table bodies like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"A | B\n- | -:"} />);

    expect(html).toContain("<table>");
    expect(html).toContain("<thead>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain('<th align="right">B</th>');
    expect(html).not.toContain("<tbody>");
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
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n# Next\n\nA | B\n- | -\n1 | 2\n-\t-\t-"} />,
    );

    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain('<h1 id="next">Next<a class="head-anchor" href="#next">#</a></h1>');
    expect(html).not.toContain("<td># Next</td>");
    expect(html).toContain("<hr/>");
    expect(html).not.toContain("<td>-\t-\t-</td>");
  });

  it("keeps line-start inline raw HTML in GFM table cells like legacy marked", () => {
    const inlineHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n<span>x</span> | 2\n3 | 4"} />,
    );
    const blockHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n<div>x</div> | 2\n3 | 4"} />,
    );

    expect(inlineHtml).toContain("<table>");
    expect(inlineHtml).toContain("<td><span>x</span></td>");
    expect(inlineHtml).toContain("<td>2</td>");
    expect(inlineHtml).toContain("<td>3</td>");
    expect(inlineHtml).toContain("<td>4</td>");
    expect(blockHtml).toContain("<table>");
    expect(blockHtml).not.toContain("<td><div>x</div></td>");
    expect(blockHtml).toContain("<div>x</div> | 2");
    expect(blockHtml).toContain("3 | 4");
  });

  it("renders safe inline raw formatting in GFM table cells through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n\nState | Link\n- | -\n<span class="state">open</span> | <em>[docs](https://example.com/docs)</em>\n<strong>[guide][docs]</strong> | <em>[titled]( <https://example.com/titled> "Title" )</em>\nKeep \\*literal\\* beside **strong** | See <https://example.com/docs>\n\nafter\n\n[docs]: https://example.com/ref "Docs"'
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<table>");
    expect(html).toContain('<td><span class="state">open</span></td>');
    expect(html).toContain('<td><em><a href="https://example.com/docs">docs</a></em></td>');
    expect(html).toContain(
      '<td><strong><a href="https://example.com/ref" title="Docs">guide</a></strong></td>',
    );
    expect(html).toContain(
      '<td><em><a href="https://example.com/titled" title="Title">titled</a></em></td>',
    );
    expect(html).toContain("<td>Keep *literal* beside <strong>strong</strong></td>");
    expect(html).toContain(
      '<td>See <a href="https://example.com/docs">https://example.com/docs</a></td>',
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("[docs]:");
    expect(html).not.toContain("<em>literal</em>");
  });

  it("only lets ordered list item 1 interrupt GFM table rows like legacy marked", () => {
    const nonInterruptingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n2. not interrupt"} />,
    );
    const zeroPaddedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n01. not interrupt"} />,
    );
    const interruptingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n1. interrupt"} />,
    );
    const interruptingParenHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"A | B\n- | -\n1 | 2\n1) interrupt"} />,
    );

    expect(nonInterruptingHtml).toContain("<table>");
    expect(nonInterruptingHtml).toContain("<td>2. not interrupt</td>");
    expect(nonInterruptingHtml).not.toContain("<ol");
    expect(zeroPaddedHtml).toContain("<table>");
    expect(zeroPaddedHtml).toContain("<td>01. not interrupt</td>");
    expect(zeroPaddedHtml).not.toContain("<ol");
    expect(interruptingHtml).toContain("<table>");
    expect(interruptingHtml).toContain("<ol>");
    expect(interruptingHtml).toContain("<li>interrupt</li>");
    expect(interruptingHtml).not.toContain("<td>1. interrupt</td>");
    expect(interruptingParenHtml).toContain("<table>");
    expect(interruptingParenHtml).toContain("<ol>");
    expect(interruptingParenHtml).toContain("<li>interrupt</li>");
    expect(interruptingParenHtml).not.toContain("<td>1) interrupt</td>");
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

  it("keeps an EOF empty list marker as a paragraph like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown="- " />);

    expect(html).toContain("<p>- </p>");
    expect(html).not.toContain("<ul>");
    expect(html).not.toContain("<li>");
  });

  it("renders terminal-newline empty list markers like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"- \n"} />);
    const orderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"1. \n"} />);

    expect(unorderedHtml).toContain("<ul><li></li></ul>");
    expect(unorderedHtml).not.toContain("<p>- </p>");
    expect(orderedHtml).toContain("<ol><li></li></ol>");
    expect(orderedHtml).not.toContain("<p>1. </p>");
  });

  it("renders terminal-newline empty list markers through the ReactMarkdown document path", () => {
    const unorderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"before\n\n- \n"} />);
    const orderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"before\n\n1. \n"} />);

    expect(unorderedHtml).toContain("<p>before</p><ul><li></li></ul>");
    expect(unorderedHtml).not.toContain("<p>- </p>");
    expect(orderedHtml).toContain("<p>before</p><ol><li></li></ol>");
    expect(orderedHtml).not.toContain("<p>1. </p>");
  });

  it("renders empty list items before following items like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"- \n- second"} />);
    const orderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"1. \n2. second"} />);

    expect(unorderedHtml).toContain("<ul><li></li><li>second</li></ul>");
    expect(unorderedHtml).not.toContain("<p>- </p>");
    expect(orderedHtml).toContain("<ol><li></li><li>second</li></ol>");
    expect(orderedHtml).not.toContain("<p>1. </p>");
  });

  it("renders leading empty list items through the ReactMarkdown document path", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- \n- second\n\nafter"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n1. \n2. second\n\nafter"} />,
    );

    expect(unorderedHtml).toContain("<p>before</p><ul><li></li><li>second</li></ul><p>after</p>");
    expect(unorderedHtml).not.toContain("<p>- </p>");
    expect(orderedHtml).toContain("<p>before</p><ol><li></li><li>second</li></ol><p>after</p>");
    expect(orderedHtml).not.toContain("<p>1. </p>");
  });

  it("keeps blank-line separated same-marker list items together like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n\n- second"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. first\n\n2. second"} />,
    );

    expect(unorderedHtml).toContain("<ul><li><p>first</p></li><li><p>second</p></li></ul>");
    expect(unorderedHtml).not.toContain("</ul><ul>");
    expect(orderedHtml).toContain("<ol><li><p>first</p></li><li><p>second</p></li></ol>");
    expect(orderedHtml).not.toContain("</ol><ol");
  });

  it("renders blank-line separated same-marker lists through the ReactMarkdown document path", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- first\n\n- second\n\nafter"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n1. first\n\n2. second\n\nafter"} />,
    );

    expect(unorderedHtml).toContain(
      "<p>before</p><ul><li><p>first</p></li><li><p>second</p></li></ul><p>after</p>",
    );
    expect(unorderedHtml).not.toContain("</ul><ul>");
    expect(orderedHtml).toContain(
      "<p>before</p><ol><li><p>first</p></li><li><p>second</p></li></ol><p>after</p>",
    );
    expect(orderedHtml).not.toContain("</ol><ol");
  });

  it("terminates list continuation after two blank lines like legacy marked", () => {
    const followingListHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n\n\n- second"} />,
    );
    const followingContinuationHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n\n\n  continuation"} />,
    );

    expect(followingListHtml).toContain("<ul><li>first</li></ul><ul><li>second</li></ul>");
    expect(followingListHtml).not.toContain("<ul><li><p>first</p></li><li><p>second</p></li></ul>");
    expect(followingContinuationHtml).toContain("<ul><li>first</li></ul>");
    expect(followingContinuationHtml).toContain("<p>  continuation</p>");
    expect(followingContinuationHtml).not.toContain("<p>continuation</p></li>");
  });

  it("splits blank-line separated marker changes like legacy marked smartLists", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n\n+ second"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. first\n\n2) second"} />,
    );

    expect(unorderedHtml).toContain("<ul><li>first</li></ul><ul><li>second</li></ul>");
    expect(unorderedHtml).not.toContain("<ul><li><p>first</p></li><li><p>second</p></li></ul>");
    expect(orderedHtml).toContain('<ol><li>first</li></ol><ol start="2"><li>second</li></ol>');
    expect(orderedHtml).not.toContain("<ol><li><p>first</p></li><li><p>second</p></li></ol>");
  });

  it("renders blank-line separated marker-change lists through the ReactMarkdown document path", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- first\n\n+ second\n\nafter"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n1. first\n\n2) second\n\nafter"} />,
    );

    expect(unorderedHtml).toContain(
      "<p>before</p><ul><li>first</li></ul><ul><li>second</li></ul><p>after</p>",
    );
    expect(unorderedHtml).not.toContain("<ul><li><p>first</p></li><li><p>second</p></li></ul>");
    expect(orderedHtml).toContain("<p>before</p>");
    expect(orderedHtml).toContain('<ol><li>first</li></ol><ol start="2"><li>second</li></ol>');
    expect(orderedHtml).toContain("<p>after</p>");
    expect(orderedHtml).not.toContain("<ol><li><p>first</p></li><li><p>second</p></li></ol>");
  });

  it("renders non-adjacent simple list blocks through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n\nmiddle paragraph\n\n- second"} />,
    );

    expect(html).toContain(
      "<ul><li>first</li></ul><p>middle paragraph</p><ul><li>second</li></ul>",
    );
    expect(html).not.toContain("<ul><li><p>first</p></li><li><p>second</p></li></ul>");
  });

  it("renders list item inline links, images, references, and Yona autolinks through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "List issue",
          },
        ]}
        markdown={
          '- See [guide](https://example.com/guide)\n- Logo ![logo](/files/logo.png)\n- Ref [docs][guide]\n- Angle <https://example.com/docs>\n- Issue owner#7\n\n[guide]: https://example.com/docs "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("<ul>");
    expect(html).toContain('<li>See <a href="https://example.com/guide">guide</a></li>');
    expect(html).toContain('<li>Logo <img alt="logo" src="/files/logo.png"/></li>');
    expect(html).toContain('<li>Ref <a href="https://example.com/docs" title="Docs">docs</a></li>');
    expect(html).toContain(
      '<li>Angle <a href="https://example.com/docs">https://example.com/docs</a></li>',
    );
    expect(html).toContain('<li>Issue <a class="issueLink"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="List issue"');
    expect(html).not.toContain("[guide]:");
  });

  it("renders list item safe escaped punctuation through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- Keep \\*literal\\* beside **strong**\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<ul><li>Keep *literal* beside <strong>strong</strong></li></ul>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<em>literal</em>");
  });

  it("renders list item inline raw formatting through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '- <span class="state">open</span> [docs](https://example.com/docs)\n- <em>See http://example.com</em>\n- <strong>[guide][docs]</strong>\n- <em>[titled]( <https://example.com/titled> "Title" )</em>\n\n[docs]: https://example.com/ref "Docs"'
        }
      />,
    );

    expect(html).toContain("<ul>");
    expect(html).toContain(
      '<li><span class="state">open</span> <a href="https://example.com/docs">docs</a></li>',
    );
    expect(html).toContain(
      '<li><em>See <a href="http://example.com">http://example.com</a></em></li>',
    );
    expect(html).toContain(
      '<li><strong><a href="https://example.com/ref" title="Docs">guide</a></strong></li>',
    );
    expect(html).toContain(
      '<li><em><a href="https://example.com/titled" title="Title">titled</a></em></li>',
    );
    expect(html).not.toContain("[docs]:");
  });

  it("renders task list item references and Yona autolinks through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Task issue",
          },
        ]}
        markdown={
          '- [ ] Read [docs][guide]\n- [x] Close owner#7\n\n[guide]: https://example.com/docs "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
        showTasklistBar
      />,
    );

    expect(html).toContain('Tasks<span class="done-counter">(1/2)</span>');
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> Read <a href="https://example.com/docs" title="Docs">docs</a></li>',
    );
    expect(html).toContain('<li class="task-list-item"><input class="task-list-item-checkbox"');
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Task issue"');
    expect(html).not.toContain("[guide]:");
  });

  it("renders task list item safe escaped punctuation through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n- [ ] Keep \\*literal\\* beside **strong**\n\nafter"}
        showTasklistBar
      />,
    );

    expect(html).toContain('Tasks<span class="done-counter">(0/1)</span>');
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> Keep *literal* beside <strong>strong</strong></li>',
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<em>literal</em>");
  });

  it("renders task list item inline raw formatting through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '- [ ] <span class="state">open</span> [docs](https://example.com/docs)\n- [x] <em>done</em>'
        }
        showTasklistBar
      />,
    );

    expect(html).toContain('Tasks<span class="done-counter">(1/2)</span>');
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> <span class="state">open</span> <a href="https://example.com/docs">docs</a></li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> <em>done</em></li>',
    );
  });

  it("preserves empty loose list items like legacy marked", () => {
    const leadingEmptyHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"- \n\n- second"} />);
    const trailingEmptyHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"- first\n\n- "} />);

    expect(leadingEmptyHtml).toContain("<ul><li></li><li><p>second</p></li></ul>");
    expect(leadingEmptyHtml).not.toContain("<p>- </p>");
    expect(trailingEmptyHtml).toContain("<ul><li><p>first</p></li><li></li></ul>");
    expect(trailingEmptyHtml).not.toContain("<p>- </p>");
  });

  it("preserves ordered list start numbers like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"3. third\n4. fourth"} />);

    expect(html).toContain('<ol start="3">');
    expect(html).toContain("<li>third</li>");
    expect(html).toContain("<li>fourth</li>");
  });

  it("preserves zero ordered list starts like legacy marked", () => {
    const zeroHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"0. zero"} />);
    const paddedZeroHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"00. zero"} />);
    const paddedOneHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"01. one"} />);

    expect(zeroHtml).toContain('<ol start="0"><li>zero</li></ol>');
    expect(paddedZeroHtml).toContain('<ol start="0"><li>zero</li></ol>');
    expect(paddedOneHtml).toContain("<ol><li>one</li></ol>");
    expect(paddedOneHtml).not.toContain('start="1"');
  });

  it("rejects oversized ordered list markers like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"1234567890. too large"} />);

    expect(html).toContain("<p>1234567890. too large</p>");
    expect(html).not.toContain("<ol");
  });

  it("preserves direct tab marker padding like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"-\titem"} />);
    const orderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"1.\titem"} />);

    expect(unorderedHtml).toContain("<ul><li>   item</li></ul>");
    expect(orderedHtml).toContain("<ol><li>   item</li></ol>");
    expect(unorderedHtml).not.toContain("<li>item</li>");
    expect(orderedHtml).not.toContain("<li>item</li>");
  });

  it("renders direct-tab list marker padding through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"Before\n\n-\titem\n-\tsecond\n\nAfter"} />,
    );

    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<ul><li>   item</li><li>   second</li></ul>");
    expect(html).toContain("<p>After</p>");
    expect(html).not.toContain("<li>item</li>");
  });

  it("renders space-tab list item padding as indented code like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"- \titem"} />);
    const orderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"1. \titem"} />);
    const paddedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"-  \titem"} />);

    expect(unorderedHtml).toContain("<ul><li><pre><code>item\n</code></pre></li></ul>");
    expect(orderedHtml).toContain("<ol><li><pre><code>item\n</code></pre></li></ol>");
    expect(paddedHtml).toContain("<ul><li><pre><code> item\n</code></pre></li></ul>");
    expect(unorderedHtml).not.toContain("<li>  item</li>");
    expect(orderedHtml).not.toContain("<li> item</li>");
  });

  it("expands space-tab list padding with tight continuations like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- \titem\n  continuation"} />,
    );
    const paddedUnorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"-  \titem\n  continuation"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. \titem\n   continuation"} />,
    );
    const wideOrderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"12. \titem\n    continuation"} />,
    );

    expect(unorderedHtml).toContain("<ul><li>  item<br/>continuation</li></ul>");
    expect(paddedUnorderedHtml).toContain("<ul><li>   item<br/>continuation</li></ul>");
    expect(orderedHtml).toContain("<ol><li> item<br/>continuation</li></ol>");
    expect(wideOrderedHtml).toContain('<ol start="12"><li>item<br/>continuation</li></ol>');
    expect(unorderedHtml).not.toContain("<pre><code>item");
    expect(orderedHtml).not.toContain("<pre><code>item");
  });

  it("renders small space-tab tight continuations through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n\n- \t**item**\n  continuation\n-  \tsecond\n  [guide][docs]\n\nmiddle\n\n1. \tordered\n   continuation\n\nafter\n\n[docs]: https://example.com/docs "Docs"'
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      '<ul><li>  <strong>item</strong><br/>continuation</li><li>   second<br/><a href="https://example.com/docs" title="Docs">guide</a></li></ul>',
    );
    expect(html).toContain("<p>middle</p>");
    expect(html).toContain("<ol><li> ordered<br/>continuation</li></ol>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("yona-space-tab-list-item-padding");
    expect(html).not.toContain("[docs]:");
  });

  it("keeps large space-tab list continuations as leading code blocks like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"-   \titem\n  continuation"} />,
    );
    const paddedUnorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"-    \titem\n  continuation"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1.    \titem\n   continuation"} />,
    );

    expect(unorderedHtml).toContain("<ul><li><pre><code>item\n</code></pre>continuation</li></ul>");
    expect(paddedUnorderedHtml).toContain(
      "<ul><li><pre><code> item\n</code></pre>continuation</li></ul>",
    );
    expect(orderedHtml).toContain("<ol><li><pre><code>item\n</code></pre>continuation</li></ol>");
  });

  it("renders large space-tab continuations through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "before\n\n-   \titem\n  continuation\n\n1.    \tordered\n   continuation\n\nafter"
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<ul><li><pre><code>item\n</code></pre>continuation</li></ul>");
    expect(html).toContain("<ol><li><pre><code>ordered\n</code></pre>continuation</li></ol>");
    expect(html).toContain("<p>after</p>");
  });

  it("preserves loose space-tab list continuations like legacy marked", () => {
    const looseTextHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- \titem\n\n  continuation"} />,
    );
    const looseCodeHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"-   \titem\n\n  continuation"} />,
    );

    expect(looseTextHtml).toContain("<ul><li><p>  item</p><p>continuation</p></li></ul>");
    expect(looseCodeHtml).toContain(
      "<ul><li><pre><code>item\n</code></pre><p>continuation</p></li></ul>",
    );
  });

  it("only lets ordered list item 1 interrupt paragraphs like legacy marked", () => {
    const nonInterruptingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"text\n2. second"} />,
    );
    const interruptingHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"text\n1. first"} />);

    expect(nonInterruptingHtml).toContain("<p>text<br/>2. second</p>");
    expect(nonInterruptingHtml).not.toContain("<ol");
    expect(interruptingHtml).toContain("<p>text</p><ol><li>first</li></ol>");
    expect(interruptingHtml).not.toContain("<p>text<br/>1. first</p>");
  });

  it("splits same-indent smart lists when unordered markers change like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"- first\n+ second\n- third"} />);

    expect(html).toContain(
      "<ul><li>first</li></ul><ul><li>second</li></ul><ul><li>third</li></ul>",
    );
    expect(html).not.toContain("<ul><li>first</li><li>second</li><li>third</li></ul>");
  });

  it("renders same-indent unordered smart-list splits through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- first\n+ second\n- third\n\nafter"} />,
    );

    expect(html).toContain(
      "<p>before</p><ul><li>first</li></ul><ul><li>second</li></ul><ul><li>third</li></ul><p>after</p>",
    );
    expect(html).not.toContain("<ul><li>first</li><li>second</li><li>third</li></ul>");
  });

  it("splits same-indent ordered lists when delimiters change like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. first\n2) second\n3. third"} />,
    );

    expect(html).toContain('<ol><li>first</li></ol><ol start="2"><li>second</li></ol>');
    expect(html).toContain('<ol start="3"><li>third</li></ol>');
    expect(html).not.toContain("<ol><li>first</li><li>second</li><li>third</li></ol>");
  });

  it("renders same-indent ordered delimiter smart-list splits through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n1. first\n2) second\n3. third\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain('<ol><li>first</li></ol><ol start="2"><li>second</li></ol>');
    expect(html).toContain('<ol start="3"><li>third</li></ol><p>after</p>');
    expect(html).not.toContain("<ol><li>first</li><li>second</li><li>third</li></ol>");
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

  it("renders simple nested lists through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- parent\n  - **child**\n- next\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      "<ul><li>parent<ul><li><strong>child</strong></li></ul></li><li>next</li></ul>",
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<li>parent</li><li><strong>child</strong></li>");
  });

  it("keeps one-space-indented bullet markers at the same list level like legacy marked", () => {
    const tightHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- parent\n - child\n- next"} />,
    );
    const looseHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"- parent\n\n - child"} />);

    expect(tightHtml).toContain("<ul><li>parent</li><li>child</li><li>next</li></ul>");
    expect(tightHtml).not.toContain("<li>parent<ul><li>child</li></ul>");
    expect(looseHtml).toContain("<ul><li><p>parent</p></li><li><p>child</p></li></ul>");
    expect(looseHtml).not.toContain("<li><p>parent</p><ul>");
  });

  it("renders root-indented same-level lists through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "before\n\n- parent\n - **child**\n- next\n\nmiddle\n\n   1. first\n  2. second\n3. third\n\nafter"
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<ul><li>parent</li><li><strong>child</strong></li><li>next</li></ul>");
    expect(html).toContain("<p>middle</p>");
    expect(html).toContain("<ol><li>first</li><li>second</li><li>third</li></ol>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<li>parent<ul>");
    expect(html).not.toContain("<li>first<ol");
  });

  it("keeps two- and three-space root list markers at the same level like legacy marked", () => {
    const bulletHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"   - first\n  - second\n- third"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"   1. first\n  2. second\n3. third"} />,
    );
    const markerChangeHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"   - first\n  + second"} />,
    );
    const delimiterChangeHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"   1. first\n  2) second"} />,
    );

    expect(bulletHtml).toContain("<ul><li>first</li><li>second</li><li>third</li></ul>");
    expect(bulletHtml).not.toContain("<li>first<ul>");
    expect(orderedHtml).toContain("<ol><li>first</li><li>second</li><li>third</li></ol>");
    expect(orderedHtml).not.toContain("<li>first<ol");
    expect(markerChangeHtml).toContain("<ul><li>first</li></ul><ul><li>second</li></ul>");
    expect(markerChangeHtml).not.toContain("<ul><li>first</li><li>second</li></ul>");
    expect(delimiterChangeHtml).toContain(
      '<ol><li>first</li></ol><ol start="2"><li>second</li></ol>',
    );
    expect(delimiterChangeHtml).not.toContain("<ol><li>first</li><li>second</li></ol>");
  });

  it("renders root-indented marker changes through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n   - first\n  + second\n\n   1. first\n  2) second\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<ul><li>first</li></ul><ul><li>second</li></ul>");
    expect(html).toContain('<ol><li>first</li></ol><ol start="2"><li>second</li></ol>');
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<ul><li>first</li><li>second</li></ul>");
    expect(html).not.toContain("<ol><li>first</li><li>second</li></ol>");
  });

  it("keeps four-space list-looking lines as indented code before root lists like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"    - code\n- list"} />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"    1. code\n1. list"} />,
    );

    expect(unorderedHtml).toContain("<pre><code>- code</code></pre><ul><li>list</li></ul>");
    expect(unorderedHtml).not.toContain("<ul><li>code</li><li>list</li></ul>");
    expect(orderedHtml).toContain("<pre><code>1. code</code></pre><ol><li>list</li></ol>");
    expect(orderedHtml).not.toContain("<ol><li>code</li><li>list</li></ol>");
  });

  it("uses parent marker padding for ordered nested-list indentation like legacy marked", () => {
    const sameLevelHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. parent\n  2. child\n3. next"} />,
    );
    const nestedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"1. parent\n   2. child\n3. next"} />,
    );
    const wideSameLevelHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"12. parent\n   13. child\n14. next"} />,
    );
    const wideNestedHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"12. parent\n    13. child\n14. next"} />,
    );

    expect(sameLevelHtml).toContain("<ol><li>parent</li><li>child</li><li>next</li></ol>");
    expect(sameLevelHtml).not.toContain("<li>parent<ol");
    expect(nestedHtml).toContain(
      '<ol><li>parent<ol start="2"><li>child</li></ol></li><li>next</li></ol>',
    );
    expect(wideSameLevelHtml).toContain(
      '<ol start="12"><li>parent</li><li>child</li><li>next</li></ol>',
    );
    expect(wideSameLevelHtml).not.toContain("<li>parent<ol");
    expect(wideNestedHtml).toContain(
      '<ol start="12"><li>parent<ol start="13"><li>child</li></ol></li><li>next</li></ol>',
    );
  });

  it("splits nested smart lists when unordered markers change like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- parent\n  + first child\n  - second child"} />,
    );

    expect(html).toContain(
      "<ul><li>parent<ul><li>first child</li></ul><ul><li>second child</li></ul></li></ul>",
    );
    expect(html).not.toContain("<ul><li>first child</li><li>second child</li></ul>");
  });

  it("renders nested unordered smart-list splits through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n- parent\n  + first child\n  - second child\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      "<ul><li>parent<ul><li>first child</li></ul><ul><li>second child</li></ul></li></ul>",
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<ul><li>first child</li><li>second child</li></ul>");
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

  it("renders tight list continuation lines through the ReactMarkdown document path", () => {
    const unorderedHtml = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n- first\n  continuation with **style**\n- second\n\nafter"}
      />,
    );
    const orderedHtml = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n12. first\n    continuation with **style**\n13. second\n\nafter"}
      />,
    );

    expect(unorderedHtml).toContain("<p>before</p>");
    expect(unorderedHtml).toContain(
      "<ul><li>first<br/>continuation with <strong>style</strong></li><li>second</li></ul>",
    );
    expect(unorderedHtml).toContain("<p>after</p>");
    expect(unorderedHtml).not.toContain("<p>continuation with");
    expect(orderedHtml).toContain("<p>before</p>");
    expect(orderedHtml).toContain(
      '<ol start="12"><li>first<br/>continuation with <strong>style</strong></li><li>second</li></ol>',
    );
    expect(orderedHtml).toContain("<p>after</p>");
  });

  it("preserves extra continuation indentation inside list items like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n    code\n- second"} />,
    );

    expect(html).toContain("<ul><li>first<br/>  code</li><li>second</li></ul>");
    expect(html).not.toContain("<li>first<br/>code</li>");
    expect(html).not.toContain("<pre><code>code</code></pre>");
  });

  it("renders extra-indented list continuations through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- first\n    code\n- second\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<ul><li>first<br/>  code</li><li>second</li></ul>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<li>first<br/>code</li>");
    expect(html).not.toContain("<pre><code>code</code></pre>");
  });

  it("keeps lazy continuation lines inside list items like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\ncontinued with **style**\nmore\n- second"} />,
    );

    expect(html).toContain("<ul>");
    expect(html).toContain(
      "<li>first<br/>continued with <strong>style</strong><br/>more</li><li>second</li>",
    );
    expect(html).not.toContain("</ul><p>continued");
    expect(html).not.toContain("<p>more</p>");
  });

  it("renders lazy list continuation lines through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n- first\ncontinued with **style**\nmore\n- second\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      "<ul><li>first<br/>continued with <strong>style</strong><br/>more</li><li>second</li></ul>",
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("</ul><p>continued");
    expect(html).not.toContain("<p>more</p>");
  });

  it("renders list continuation references and raw formatting through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          'before\n\n- first\n  <em>[guide][docs]</em>\n- second\n\nafter\n\n[docs]: https://example.com/docs "Docs"'
        }
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      '<ul><li>first<br/><em><a href="https://example.com/docs" title="Docs">guide</a></em></li><li>second</li></ul>',
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("[docs]:");
  });

  it("keeps lazy nested blocks inside list items like legacy marked", () => {
    const headingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n# heading\n- second"} />,
    );
    const quoteHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n> quote\n- second"} />,
    );
    const fenceHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- first\n```js\nconst value = 1\n```\n- second"} />,
    );

    expect(headingHtml).toContain(
      '<li>first<h1 id="heading">heading<a class="head-anchor" href="#heading">#</a></h1></li><li>second</li>',
    );
    expect(headingHtml).not.toContain("first<br/># heading");
    expect(quoteHtml).toContain("<li>first<blockquote><p>quote</p></blockquote></li>");
    expect(quoteHtml).not.toContain("first<br/>&gt; quote");
    expect(fenceHtml).toContain('<li>first<pre><code class="js">');
    expect(fenceHtml).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(fenceHtml).not.toContain("first<br/>```js");
  });

  it("falls back from invalid tables to legacy lazy list parsing", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={" | B\n- | -\n1 | 2"} />);

    expect(html).toContain("<p> | B</p>");
    expect(html).toContain("<ul><li>| -<br/>1 | 2</li></ul>");
    expect(html).not.toContain("<table>");
    expect(html).not.toContain("<p>1 | 2</p>");
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

  it("renders loose task-list paragraphs through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n- [x] done\n\n  more detail\n- [ ] open\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> done</p><p>more detail</p></li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> open</p></li>',
    );
    expect(html).toContain("</ul><p>after</p>");
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

  it("renders nested loose task-list paragraphs through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n- [x] parent\n  - [ ] child\n\n    child detail\n- [ ] next\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> parent</p><ul><li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> child</p><p>child detail</p></li></ul></li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><p><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> next</p></li>',
    );
    expect(html).toContain("</ul><p>after</p>");
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

  it("keeps no-trailing-space empty task markers literal like legacy marked", () => {
    const unorderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"- [ ]\n- [x]"} />);
    const orderedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"1. [ ]\n2. [x]"} />);

    expect(unorderedHtml).toContain("<ul><li>[ ]</li><li>[x]</li></ul>");
    expect(orderedHtml).toContain("<ol><li>[ ]</li><li>[x]</li></ol>");
    expect(unorderedHtml).not.toContain('class="task-list-item"');
    expect(orderedHtml).not.toContain('class="task-list-item"');
    expect(unorderedHtml).not.toContain('type="checkbox"');
    expect(orderedHtml).not.toContain('type="checkbox"');
  });

  it("renders and counts trailing-space empty task items like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- [ ] \n- [x] \n- [X] done"} showTasklistBar />,
    );

    expect(html).toContain('class="tasklist task-show"');
    expect(html).toContain('Tasks<span class="done-counter">(2/3)</span>');
    expect(html).toContain('class="bar red" style="width:66.66666666666666%" title="Tasklist"');
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> </li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> </li>',
    );
    expect(html).not.toContain("yona-empty-task-item-placeholder");
  });

  it("renders trailing-space empty task items through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n- [ ] \n- [x] \n- [X] done\n\nafter"}
        showTasklistBar
      />,
    );

    expect(html).toContain('Tasks<span class="done-counter">(2/3)</span>');
    expect(html).toContain("<p>before</p>");
    expect(html).toContain(
      '<ul><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> </li><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> </li><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> done</li></ul>',
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("yona-empty-task-item-placeholder");
  });

  it("renders and counts tab-separated task items like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- [ ]\topen\n- [x]\t\n1. [X]\tdone"} showTasklistBar />,
    );

    expect(html).toContain('class="tasklist task-show"');
    expect(html).toContain("Tasks<span");
    expect(html).toContain("(2/3)");
    expect(html).toContain('class="bar red" style="width:66.66666666666666%" title="Tasklist"');
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> open</li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> </li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> done</li>',
    );
  });

  it("renders same-marker tab-separated task lists through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"- [ ]\topen\n- [x]\t"} showTasklistBar />,
    );

    expect(html).toContain('Tasks<span class="done-counter">(1/2)</span>');
    expect(html).toContain(
      '<ul><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> open</li><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> </li></ul>',
    );
    expect(html).not.toContain("yona-empty-task-item-placeholder");
  });

  it("counts legacy task items across unordered markers and ordered paren markers", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"+ [ ] plus\n* [x] star\n1) [X] paren"} showTasklistBar />,
    );

    expect(html).toContain('class="tasklist task-show"');
    expect(html).toContain('Tasks<span class="done-counter">(2/3)</span>');
    expect(html).toContain('class="bar red" style="width:66.66666666666666%" title="Tasklist"');
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> plus</li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> star</li>',
    );
    expect(html).toContain(
      '<li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> paren</li>',
    );
  });

  it("counts only task items that legacy marked renders as list items", () => {
    const nonInterruptingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"text\n2. [x] not a list"} showTasklistBar />,
    );
    const zeroPaddedNonInterruptingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"text\n01. [x] not a list"} showTasklistBar />,
    );
    const zeroPaddedBlockStartHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"01. [x] block start"} showTasklistBar />,
    );
    const mixedHtml = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"   - [ ] three spaces\ntext\n1. [x] interrupts"}
        showTasklistBar
      />,
    );

    expect(nonInterruptingHtml).toContain("<p>text<br/>2. [x] not a list</p>");
    expect(nonInterruptingHtml).not.toContain('class="tasklist task-show"');
    expect(zeroPaddedNonInterruptingHtml).toContain("<p>text<br/>01. [x] not a list</p>");
    expect(zeroPaddedNonInterruptingHtml).not.toContain('class="tasklist task-show"');
    expect(zeroPaddedBlockStartHtml).toContain('class="tasklist task-show"');
    expect(zeroPaddedBlockStartHtml).toContain('Tasks<span class="done-counter">(1/1)</span>');
    expect(zeroPaddedBlockStartHtml).toContain(
      '<ol><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> block start</li></ol>',
    );
    expect(mixedHtml).toContain('class="tasklist task-show"');
    expect(mixedHtml).toContain('Tasks<span class="done-counter">(1/2)</span>');
    expect(mixedHtml).toContain('class="bar red" style="width:50%" title="Tasklist"');
    expect(mixedHtml).toContain(
      '<ul><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox"/> three spaces<br/>text</li></ul>',
    );
    expect(mixedHtml).toContain(
      '<ol><li class="task-list-item"><input class="task-list-item-checkbox" disabled="" readOnly="" type="checkbox" checked=""/> interrupts</li></ol>',
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

  it("renders blockquote links and bare URLs through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          "> See [docs](https://example.com/docs)\n> and <https://example.com/angle>\n> and www.example.com/end."
        }
      />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<p>See <a href="https://example.com/docs">docs</a><br/>and <a href="https://example.com/angle">https://example.com/angle</a><br/>and <a href="http://www.example.com/end">www.example.com/end</a>.</p>',
    );
    expect(html).not.toContain("<p>&gt;");
  });

  it("renders blockquote Yona autolinks through the ReactMarkdown path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "open",
            title: "Quoted issue",
          },
        ]}
        markdown={"> See owner#7 and @owner/projectYobi"}
        mentionReferences={[{ kind: "project", ownerName: "owner", projectName: "projectYobi" }]}
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Quoted issue"');
    expect(html).toContain('data-issue-state="open"');
    expect(html).toContain(
      '<a class="no-text-decoration project-link" href="/yona/owner/projectYobi">@owner/projectYobi</a>',
    );
    expect(html).not.toContain("<p>&gt;");
  });

  it("renders formatted blockquote links, references, and Yona autolinks through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        basePath="/yona"
        issueReferences={[
          {
            issueNumber: 7,
            ownerName: "owner",
            projectName: "projectYobi",
            state: "closed",
            title: "Formatted quote issue",
          },
        ]}
        markdown={
          '> **See** [docs](https://example.com/docs)\n> ~~Ref~~ [guide][docs]\n> _Issue_ owner#7\n\n[docs]: https://example.com/ref "Docs"'
        }
        ownerName="owner"
        projectName="projectYobi"
      />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<p><strong>See</strong> <a href="https://example.com/docs">docs</a><br/><del>Ref</del> <a href="https://example.com/ref" title="Docs">guide</a><br/><em>Issue</em> <a class="issueLink"',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/issue/7"');
    expect(html).toContain('title="Formatted quote issue"');
    expect(html).not.toContain("[docs]:");
    expect(html).not.toContain("<p>&gt;");
  });

  it("renders blockquote inline raw formatting through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={
          '> <span class="state">open</span> [docs](https://example.com/docs)\n> <em>See http://example.com</em>\n> <strong>[guide][docs]</strong>\n> <em>[titled]( <https://example.com/titled> "Title" )</em>\n\n[docs]: https://example.com/ref "Docs"'
        }
      />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<p><span class="state">open</span> <a href="https://example.com/docs">docs</a><br/><em>See <a href="http://example.com">http://example.com</a></em><br/><strong><a href="https://example.com/ref" title="Docs">guide</a></strong><br/><em><a href="https://example.com/titled" title="Title">titled</a></em></p>',
    );
    expect(html).not.toContain("<p>&gt;");
    expect(html).not.toContain("[docs]:");
  });

  it("renders blockquote safe escaped punctuation through ReactMarkdown", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> Keep \\*literal\\* beside **strong**"} />,
    );

    expect(html).toContain(
      "<blockquote><p>Keep *literal* beside <strong>strong</strong></p></blockquote>",
    );
    expect(html).not.toContain("<em>literal</em>");
    expect(html).not.toContain("<p>&gt;");
  });

  it("renders blockquote headings through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n> # Quoted **Heading**\n> ## Child\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<h1 id="quoted-heading">Quoted <strong>Heading</strong><a class="head-anchor" href="#quoted-heading">#</a></h1>',
    );
    expect(html).toContain('<h2 id="child">Child<a class="head-anchor" href="#child">#</a></h2>');
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<p>&gt;");
  });

  it("renders blockquote horizontal rules through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n> ---\n> ***\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote><hr/><hr/></blockquote>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<p>&gt;");
  });

  it("keeps lazy blockquote continuations inside the quote like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> quoted\ncontinued with **style**"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<p>quoted<br/>continued with <strong>style</strong></p>");
    expect(html).not.toContain("<p>&gt; quoted");
    expect(html).not.toContain("</blockquote><p>continued");
  });

  it("renders lazy blockquote continuations through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n> quoted\ncontinued with **style**\nmore `code`\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      "<p>quoted<br/>continued with <strong>style</strong><br/>more <code>code</code></p>",
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<p>&gt; quoted");
    expect(html).not.toContain("</blockquote><p>continued");
  });

  it("ends lazy blockquotes after quoted blank lines like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={"> one\n>\ntwo"} />);
    const quotedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"> one\n>\n> two"} />);

    expect(html).toContain("<blockquote><p>one</p></blockquote><p>two</p>");
    expect(html).not.toContain("<blockquote><p>one</p><p>two</p></blockquote>");
    expect(quotedHtml).toContain("<blockquote><p>one</p><p>two</p></blockquote>");
  });

  it("matches legacy blockquote indentation and tab marker handling", () => {
    const indentedHtml = renderToStaticMarkup(<MarkdownRenderer markdown={"   > three"} />);
    const codeHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"    > code\n\t> tab-code"} />,
    );
    const tabMarkerHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={">\tone\n> \tcode\n>\t- item"} />,
    );

    expect(indentedHtml).toContain("<blockquote><p>three</p></blockquote>");
    expect(codeHtml).toContain("<pre><code>&gt; code\n&gt; tab-code</code></pre>");
    expect(codeHtml).not.toContain("<blockquote>");
    expect(tabMarkerHtml).toContain("<blockquote>");
    expect(tabMarkerHtml).toContain("<p>   one</p>");
    expect(tabMarkerHtml).toContain("<pre><code>code</code></pre>");
    expect(tabMarkerHtml).toContain("<ul><li>item</li></ul>");
  });

  it("only lets ordered list item 1 interrupt lazy blockquotes like legacy marked", () => {
    const nonInterruptingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> text\n2. second"} />,
    );
    const interruptingHtml = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> text\n1. first"} />,
    );

    expect(nonInterruptingHtml).toContain("<blockquote>");
    expect(nonInterruptingHtml).toContain("<p>text<br/>2. second</p>");
    expect(nonInterruptingHtml).not.toContain("</blockquote><ol");
    expect(interruptingHtml).toContain(
      "<blockquote><p>text</p></blockquote><ol><li>first</li></ol>",
    );
    expect(interruptingHtml).not.toContain("<p>text<br/>1. first</p>");
  });

  it("keeps lazy blockquote list continuations inside the quoted item like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> - first\ncontinued with **style**\n> - second"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      "<ul><li>first<br/>continued with <strong>style</strong></li><li>second</li></ul>",
    );
    expect(html).not.toContain("</ul><p>continued");
  });

  it("renders lazy blockquote list continuations through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n> - first\ncontinued with **style**\n> - second\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      "<ul><li>first<br/>continued with <strong>style</strong></li><li>second</li></ul>",
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("</ul><p>continued");
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

  it("renders blockquote fenced code through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n> ```js\n> const value = '#1';\n> ```\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote><pre><code");
    expect(html).toContain('class="js"');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-string">&#x27;#1&#x27;</span>');
    expect(html).toContain("</code></pre></blockquote>");
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("issueLink");
    expect(html).not.toContain("<p>&gt;");
  });

  it("stops blockquote tables at blank lines like legacy marked", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"> A | B\n> - | -\n> 1 | 2\n>\n> 3 | 4"} />,
    );

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain("<p>3 | 4</p>");
    expect(html).not.toContain("<td>3</td>");
    expect(html).not.toContain("<td>4</td>");
  });

  it("renders blockquote tables through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n> A | B\n> - | -\n> 1 | 2\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote><table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<th>B</th>");
    expect(html).toContain("<td>1</td>");
    expect(html).toContain("<td>2</td>");
    expect(html).toContain("</table></blockquote>");
    expect(html).toContain("<p>after</p>");
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

  it("renders blockquote loose-list continuations through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer
        markdown={"before\n\n> - first\n>\n>   continuation with **style**\n> - second\n\nafter"}
      />,
    );

    expect(html).toContain("<p>before</p><blockquote>");
    expect(html).toContain(
      "<ul><li><p>first</p><p>continuation with <strong>style</strong></p></li><li><p>second</p></li></ul>",
    );
    expect(html).toContain("</blockquote><p>after</p>");
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

  it("renders blockquote setext headings through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n> Primary **Heading**\n> ===\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain(
      '<h1 id="primary-heading">Primary <strong>Heading</strong><a class="head-anchor" href="#primary-heading">#</a></h1>',
    );
    expect(html).toContain("<p>after</p>");
    expect(html).not.toContain("<p>Primary");
  });

  it("parses indented code blocks inside blockquotes like legacy marked", () => {
    const html = renderToStaticMarkup(<MarkdownRenderer markdown={">     const value = 1;"} />);

    expect(html).toContain("<blockquote>");
    expect(html).toContain("<pre><code>const value = 1;</code></pre>");
    expect(html).not.toContain("<p>    const value = 1;");
  });

  it("renders blockquote indented code through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n>     const value = 1;\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote><pre><code>const value = 1;</code></pre></blockquote>");
    expect(html).toContain("<p>after</p>");
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

  it("renders blank-line blockquote paragraphs through the ReactMarkdown document path", () => {
    const html = renderToStaticMarkup(
      <MarkdownRenderer markdown={"before\n\n> first\n>\n> second with **style**\n\nafter"} />,
    );

    expect(html).toContain("<p>before</p>");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<p>first</p>");
    expect(html).toContain("<p>second with <strong>style</strong></p>");
    expect(html).toContain("</blockquote><p>after</p>");
    expect(html).not.toContain("<p>first<br/><br/>second");
  });
});
