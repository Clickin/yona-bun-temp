import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { resolveRuntimeConfig } from "./runtime-config";
import {
  CodeBrowserPage,
  CodeCommitDetailPage,
  type CodeCommitDetailViewModel,
} from "./routes/-code-views";
import type { CodeBrowserViewModel, ProjectDetailViewModel } from "./routes/-view-models";

const runtimeConfig = resolveRuntimeConfig({ basePath: "/yona" });
const legacySiteRuntimeConfig = resolveRuntimeConfig({
  basePath: "/yona",
  siteName: "Legacy Yona",
});
const codeViewsSource = readFileSync(
  fileURLToPath(new URL("./routes/-code-views.tsx", import.meta.url)),
  "utf8",
);

const projectDetail: ProjectDetailViewModel = {
  enrollmentRequested: false,
  isFavorited: false,
  organizationName: "",
  overview: "",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
  showCode: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
};

const commitDetail: CodeCommitDetailViewModel = {
  branches: [{ name: "main" }],
  breadcrumbs: [],
  commit: {
    authorDate: "2026-05-25",
    authorEmail: "author@example.com",
    authorName: "Author",
    commentCount: 0,
    commitId: "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2",
    commitShortId: "be6a8cc",
    message: "Update file",
    shortMessage: "Update file",
  },
  files: [
    {
      path: "src/main.rs",
      patch: [
        "diff --git a/src/main.rs b/src/main.rs",
        "index 1111111..2222222 100644",
        "--- a/src/main.rs",
        "+++ b/src/main.rs",
        "@@ -1,2 +1,3 @@",
        " fn main() {",
        '-    println!("old");',
        '+    println!("new");',
        '+    println!("another");',
        " }",
      ].join("\n"),
    },
  ],
  noHead: false,
  ownerName: "owner",
  parentCommit: { commitId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", commitShortId: "aaaaaaa" },
  path: "",
  permissions: {
    canComment: true,
    canUpdateThreadState: true,
  },
  projectName: "projectYobi",
  selectedBranch: "main",
  threads: [],
};

const codeBrowser: CodeBrowserViewModel = {
  branches: [{ name: "main" }],
  breadcrumbs: [],
  entries: [],
  file: {
    authorAvatarUrl: "/yona/files/99",
    authorLabel: "Author",
    authorLoginId: "author",
    commitDate: "2026-05-25",
    commitId: "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2",
    commitMessage: "Update file",
    commitShortId: "be6a8cc",
    commentCount: 2,
    isBinary: false,
    isTooLarge: false,
    mimeType: "text/x-rust",
    name: "main.rs",
    path: "src/main.rs",
    size: 29,
    text: "fn main() {\n  let value = 1;\n}",
  },
  noHead: false,
  ownerName: "owner",
  path: "src/main.rs",
  projectName: "projectYobi",
  selectedBranch: "main",
};

describe("CodeCommitDetailPage", () => {
  it("renders code browser file syntax tokens through the shared highlighter", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage code={codeBrowser} detail={projectDetail} runtimeConfig={runtimeConfig} />,
    );

    expect(html).toContain('id="showCode"');
    expect(html).toContain('class="project-header-outer"');
    expect(html).toContain('class="project-menu-outer"');
    expect(html).toContain(
      '<li class="code-menu active"><a href="/yona/owner/projectYobi/code"><span class="menu-name">Code</span>',
    );
    expect(html).toContain('class="page-wrap-outer"');
    expect(html).toContain('class="project-page-wrap"');
    expect(html).toContain('href="/yona/owner">owner</a>');
    expect(html).toContain('href="/yona/owner/projectYobi">projectYobi</a>');
    expect(html).not.toContain("<h1>menu.code</h1>");
    expect(html).not.toContain("<p>owner/projectYobi</p>");
    expect(html).toContain('data-mime-type="text/x-rust"');
    expect(html).not.toContain('data-mimeType="text/x-rust"');
    expect(html).toContain(
      '<div class="hidden" id="codeVal">fn main() {\n  let value = 1;\n}</div>',
    );
    expect(html).toContain('class="code-viewer-wrap"');
    expect(html).toContain('id="spin"');
    expect(html).toContain('style="left:50%;position:fixed;top:50%"');
    expect(html).toContain(
      '<div aria-label="Breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left" id="breadcrumbs"',
    );
    expect(html).not.toContain('aria-label="Code tabs"');
    expect(html).not.toContain(">code.files</a>");
    expect(html).not.toContain(">code.commits</a>");
    expect(html).not.toContain(">title.branches</a>");
    expect(html).toContain(
      '<select class="pull-left mb10" data-dropdown-css-class="branches" data-format="branch" data-toggle="select2" id="branches"',
    );
    expect(html).toContain(
      '<option value="/yona/owner/projectYobi/code/main/src/main.rs" selected="">main</option>',
    );
    expect(html).not.toContain('<label for="branches">Branch</label>');
    expect(html).toContain('id="new-file-link"');
    expect(html).toContain(
      '<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/code/main/download">Download as .zip file</a></div>',
    );
    expect(html).toContain(
      '<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/postform?path=src%2F&amp;branch=main" id="new-file-link">New file</a></div>',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/postform?path=src%2F&amp;branch=main"');
    expect(html).toContain(">New file</a>");
    expect(html).toContain('id="fileInfo"');
    expect(html).toContain('id="commiter"');
    expect(html).toContain('class="commiter"');
    expect(html).toContain('class="avatar-wrap smaller" href="/yona/author"');
    expect(html).toContain('<img alt="Author" src="/yona/files/99"/>');
    expect(html).toContain('class="ml5"');
    expect(html).toContain('<a class="ml5" href="/yona/author">Author</a>');
    expect(html).toContain('id="commitDate"');
    expect(html).toContain('class="commitDate"');
    expect(html).toContain(">2026-05-25</span>");
    expect(html).toContain('id="revisionNo"');
    expect(html).toContain('class="revision"');
    expect(html).toContain(">be6a8cc");
    expect(html).toContain(
      '<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span>',
    );
    expect(html).toContain('id="commitMessage"');
    expect(html).toContain('class="commitMsg"');
    expect(html).toContain(">Update file</span>");
    expect(html).toContain(">UNIX</span>");
    expect(html).toContain(
      'data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."',
    );
    expect(html).toContain('class="yobicon-download-alt yobicon-white vmiddle"');
    expect(html).toContain(
      'href="/yona/owner/projectYobi/rawcode/be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2/src/main.rs"',
    );
    expect(html).toContain('href="/yona/owner/projectYobi/files/main/src/main.rs"');
    expect(html).toContain("</i> Raw</a>");
    expect(html).toContain(
      'href="/yona/owner/projectYobi/postform?path=src%2Fmain.rs&amp;branch=main&amp;edit=true"',
    );
    expect(html).toContain(">Edit</a>");
    expect(html).toContain("Open in browser</a>");
    expect(html).toContain(">Change history</a>");
    expect(html).toContain('class="syntax-token syntax-keyword">fn</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">let</span>');
    expect(html).toContain('class="syntax-token syntax-number">1</span>');
    expect(html).not.toContain('data-content="Open file in browser"');
    expect(html).not.toContain(">Open</a>");
  });

  it("maps legacy .config files to INI syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/plain",
            name: "application.config",
            path: "conf/application.config",
            text: "[site]\nenabled = true\nhome = ${APP_HOME}",
          },
          path: "conf/application.config",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="ini"');
    expect(html).toContain('class="syntax-token syntax-keyword">[site]</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">enabled</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${APP_HOME}</span>');
  });

  it("maps legacy JavaScript files to JavaScript syntax highlighting in code browser by extension", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "application/octet-stream",
            name: "issue-view.js",
            path: "public/javascripts/issue-view.js",
            text: "class IssueView {\n  render() {\n    const ready = true;\n    return Number(ready);\n  }\n}",
          },
          path: "public/javascripts/issue-view.js",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="javascript"');
    expect(html).toContain('data-mime-type="application/octet-stream"');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueView</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">const</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Number</span>');
  });

  it("maps legacy Java files to Java syntax highlighting in code browser by extension", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "application/octet-stream",
            name: "IssueView.java",
            path: "app/IssueView.java",
            text: "public final class IssueView {\n  private int count = 1;\n  return true;\n}",
          },
          path: "app/IssueView.java",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="java"');
    expect(html).toContain('data-mime-type="application/octet-stream"');
    expect(html).toContain('class="syntax-token syntax-keyword">public</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">final</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueView</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">private</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">int</span>');
    expect(html).toContain('class="syntax-token syntax-number">1</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
  });

  it("maps legacy CSS files to CSS syntax highlighting in code browser by extension", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "application/octet-stream",
            name: "issue.css",
            path: "public/stylesheets/issue.css",
            text: ".issue-item {\n  color: #268bd2;\n  display: block !important;\n}",
          },
          path: "public/stylesheets/issue.css",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="css"');
    expect(html).toContain('data-mime-type="application/octet-stream"');
    expect(html).toContain('class="syntax-token syntax-keyword">.issue-item</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">color</span>');
    expect(html).toContain('class="syntax-token syntax-number">#268bd2</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">display</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">block</span>');
    expect(html).toContain('class="syntax-token syntax-meta">!important</span>');
  });

  it("maps legacy Scala files to Scala syntax highlighting in code browser by extension", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "application/octet-stream",
            name: "IssueView.scala",
            path: "app/IssueView.scala",
            text: "final class IssueView {\n  val ready = true\n  def render(): Int = 1\n}",
          },
          path: "app/IssueView.scala",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="scala"');
    expect(html).toContain('data-mime-type="application/octet-stream"');
    expect(html).toContain('class="syntax-token syntax-keyword">final</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueView</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">val</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">Int</span>');
    expect(html).toContain('class="syntax-token syntax-number">1</span>');
  });

  it("maps legacy INI files to INI syntax highlighting in code browser by extension", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "application/octet-stream",
            name: "application.ini",
            path: "conf/application.ini",
            text: "[site]\nenabled = true\nhome = ${APP_HOME}",
          },
          path: "conf/application.ini",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="ini"');
    expect(html).toContain('data-mime-type="application/octet-stream"');
    expect(html).toContain('class="syntax-token syntax-keyword">[site]</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">enabled</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${APP_HOME}</span>');
  });

  it("maps legacy HTML files to HTML syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/html",
            name: "index.htm",
            path: "public/index.htm",
            text: '<div class="issue" data-state=open>Hello</div>',
          },
          path: "public/index.htm",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="html"');
    expect(html).toContain('class="syntax-token syntax-keyword">div</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;issue&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">data-state</span>');
    expect(html).toContain('class="syntax-token syntax-string">open</span>');
  });

  it("maps legacy SVG files to SVG syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "image/svg+xml",
            name: "logo.svg",
            path: "public/logo.svg",
            text: '<svg viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>',
          },
          path: "public/logo.svg",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="svg"');
    expect(html).toContain('class="syntax-token syntax-keyword">svg</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">viewBox</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">path</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">d</span>');
  });

  it("maps legacy C/C++ files to C++ syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/plain",
            name: "widget.cxx",
            path: "src/widget.cxx",
            text: "#include <vector>\nclass Widget {\n  void render() {}\n};",
          },
          path: "src/widget.cxx",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="c_cpp"');
    expect(html).toContain('class="syntax-token syntax-keyword">#include &lt;vector&gt;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">Widget</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">void</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
  });

  it("maps legacy PHP files to PHP syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/plain",
            name: "helpers.inc",
            path: "app/helpers.inc",
            text: "<?php\nfunction issue_url($id) {\n  return $id;\n}",
          },
          path: "app/helpers.inc",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="php"');
    expect(html).toContain('class="syntax-token syntax-punctuation">&lt;?</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-title">issue_url</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$id</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
  });

  it("maps legacy Makefile files to Makefile syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/plain",
            name: "Makefile",
            path: "Makefile",
            text: ".PHONY: build\nbuild:\n\t$(CC) main.c -o app",
          },
          path: "Makefile",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="makefile"');
    expect(html).toContain('class="syntax-token syntax-keyword">.PHONY:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">build:</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">$(CC)</span>');
  });

  it("renders legacy README and LICENSE filenames through the Markdown code browser path", () => {
    for (const filename of ["README", "LICENSE", "readme", "license"]) {
      const html = renderToStaticMarkup(
        <CodeBrowserPage
          code={{
            ...codeBrowser,
            file: {
              ...codeBrowser.file!,
              mimeType: "application/octet-stream",
              name: filename,
              path: filename,
              text: "# Project\n\nSee **docs**.",
            },
            path: filename,
          }}
          detail={projectDetail}
          runtimeConfig={runtimeConfig}
        />,
      );

      expect(html).toContain('class="markdown-wrap codebrowser-markdown"');
      expect(html).toContain('id="codeVal"');
      expect(html).toContain(
        '<h1 id="project">Project<a class="head-anchor" href="#project">#</a></h1>',
      );
      expect(html).toContain("See <strong>docs</strong>.");
      expect(html).not.toContain('id="showCode"');
      expect(html).not.toContain('data-language="text"');
    }
  });

  it("renders Markdown extension aliases through the Markdown code browser path", () => {
    for (const extension of ["md", "markdown", "mdown", "mkdn", "mkd", "mdwn"]) {
      const path = `docs/guide.${extension}`;
      const html = renderToStaticMarkup(
        <CodeBrowserPage
          code={{
            ...codeBrowser,
            file: {
              ...codeBrowser.file!,
              mimeType: "application/octet-stream",
              name: `guide.${extension}`,
              path,
              text: "# Guide\n\n- **step**",
            },
            path,
          }}
          detail={projectDetail}
          runtimeConfig={runtimeConfig}
        />,
      );

      expect(html).toContain('class="markdown-wrap codebrowser-markdown"');
      expect(html).toContain('id="codeVal"');
      expect(html).toContain('<h1 id="guide">Guide<a class="head-anchor" href="#guide">#</a></h1>');
      expect(html).toContain("<strong>step</strong>");
      expect(html).not.toContain('id="showCode"');
      expect(html).not.toContain('data-language="text"');
    }
  });

  it("keeps GFM footnotes enabled in the Markdown code browser path", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "application/octet-stream",
            name: "README.md",
            path: "README.md",
            text: "# Project\n\nRead this note[^1].\n\n[^1]: Footnote detail",
          },
          path: "README.md",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('class="markdown-wrap codebrowser-markdown"');
    expect(html).toContain('data-footnote-ref="true"');
    expect(html).toContain('class="footnotes"');
    expect(html).toContain("Footnote detail");
    expect(html).not.toContain("[^1]");
    expect(html).not.toContain('id="showCode"');
  });

  it("maps legacy Python files to Python syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-python",
            name: "deploy.py",
            path: "scripts/deploy.py",
            text: "def render(value):\n    return True if value else None",
          },
          path: "scripts/deploy.py",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="python"');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">True</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">None</span>');
  });

  it("maps legacy Ruby files to Ruby syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-ruby",
            name: "issue.rb",
            path: "lib/issue.rb",
            text: "class Issue\n  def state\n    @state || :open\n  end\nend",
          },
          path: "lib/issue.rb",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="ruby"');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">Issue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">def</span>');
    expect(html).toContain('class="syntax-token syntax-title">state</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">@state</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">:open</span>');
  });

  it("maps legacy shell files to shell syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-shellscript",
            name: "deploy.sh",
            path: "scripts/deploy.sh",
            text: '# deploy\nif test -f "$APP_HOME/app"; then\n  echo ${APP_HOME}\nfi',
          },
          path: "scripts/deploy.sh",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="sh"');
    expect(html).toContain('class="syntax-token syntax-comment"># deploy</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">then</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">${APP_HOME}</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">fi</span>');
  });

  it("maps legacy Erlang files to Erlang syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-erlang",
            name: "handler.erl",
            path: "src/handler.erl",
            text: "handle(Message) ->\n  receive after 1 -> false end.",
          },
          path: "src/handler.erl",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="erlang"');
    expect(html).toContain('class="syntax-token syntax-title">handle</span>');
    expect(html).toContain('class="syntax-token syntax-params">(Message)</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">receive</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">false</span>');
  });

  it("maps legacy R files to R syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-r",
            name: "analysis.r",
            path: "stats/analysis.r",
            text: "render <- function(values) {\n  `issue state` <- values\n  if (length(values) == 0) return(NULL)\n}",
          },
          path: "stats/analysis.r",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="r"');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-string">`issue state`</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">NULL</span>');
  });

  it("maps legacy YAML files to YAML syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/yaml",
            name: "deploy.yml",
            path: "config/deploy.yml",
            text: "# deployment settings\n---\ndefaults: &defaults\nenabled: true\n- *defaults",
          },
          path: "config/deploy.yml",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="yaml"');
    expect(html).toContain('class="syntax-token syntax-comment"># deployment settings</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">---</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">defaults</span>');
    expect(html).toContain('class="syntax-token syntax-punctuation">:</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&amp;defaults</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">*defaults</span>');
  });

  it("maps legacy SQL files to SQL syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-sql",
            name: "schema.sql",
            path: "db/schema.sql",
            text: "-- migrate\nSELECT id, title FROM issues WHERE id = 0xFF;",
          },
          path: "db/schema.sql",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="sql"');
    expect(html).toContain('class="syntax-token syntax-comment">-- migrate</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">SELECT</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">FROM</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">WHERE</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xFF</span>');
  });

  it("maps legacy C# files to C# syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-csharp",
            name: "IssueRenderer.cs",
            path: "src/IssueRenderer.cs",
            text: "using System;\npublic async Task<string> RenderAsync() {\n  var ready = await LoadAsync();\n  return null;\n}",
          },
          path: "src/IssueRenderer.cs",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="csharp"');
    expect(html).toContain('class="syntax-token syntax-keyword">using</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">public</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">async</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">string</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">var</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">await</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">null</span>');
  });

  it("maps legacy Dart files to Dart syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-dart",
            name: "issue_state.dart",
            path: "lib/issue_state.dart",
            text: "import 'dart:async';\n@RoutePage()\nfinal class IssueState {\n  Future<bool> load() async {\n    return false;\n  }\n}",
          },
          path: "lib/issue_state.dart",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="dart"');
    expect(html).toContain('class="syntax-token syntax-keyword">import</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@RoutePage()</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">final</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueState</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Future</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">bool</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">async</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">false</span>');
  });

  it("maps legacy TeX and LaTeX files to TeX syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-tex",
            name: "manual.dtx",
            path: "docs/manual.dtx",
            text: "% legacy comment\n\\documentclass{article}\n\\section*{Intro}\n\\textbf{Yona}",
          },
          path: "docs/manual.dtx",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="latex"');
    expect(html).toContain('class="syntax-token syntax-comment">% legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\documentclass</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\section*</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">\\textbf</span>');
  });

  it("maps legacy Diff files to Diff syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-diff",
            name: "changes.diff",
            path: "patches/changes.diff",
            text: "diff --git a/app.js b/app.js\nindex 123abc..456def 100644\n--- a/app.js\n+++ b/app.js\n@@ -1 +1 @@\n+added line\n-removed line",
          },
          path: "patches/changes.diff",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="diff"');
    expect(html).toContain(
      'class="syntax-token syntax-keyword">diff --git a/app.js b/app.js</span>',
    );
    expect(html).toContain(
      'class="syntax-token syntax-keyword">index 123abc..456def 100644</span>',
    );
    expect(html).toContain('class="syntax-token syntax-keyword">--- a/app.js</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">+++ b/app.js</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">@@ -1 +1 @@</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">+</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">-</span>');
  });

  it("maps legacy JSON files to JSON syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/plain",
            name: "package.json",
            path: "package.json",
            text: '{\n  "name": "yona",\n  "private": true,\n  "score": -1.5e+2\n}',
          },
          path: "package.json",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="json"');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;name&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-string">&quot;yona&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">&quot;private&quot;</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-number">-1.5e+2</span>');
  });

  it("maps legacy CoffeeScript files to CoffeeScript syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-coffeescript",
            name: "issue_view.coffee",
            path: "assets/issue_view.coffee",
            text: "class IssueView extends View\n  render: ->\n    return true if @issue.open",
          },
          path: "assets/issue_view.coffee",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="coffee"');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-title">IssueView</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">extends</span>');
    expect(html).toContain('class="syntax-token syntax-title">render</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
  });

  it("maps legacy DOS batch files to DOS syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-msdos-batch",
            name: "deploy.bat",
            path: "scripts/deploy.bat",
            text: "@echo off\nset ROOT=%~dp0\nif exist yona.exe goto done\nrem legacy comment\n:done\nexit",
          },
          path: "scripts/deploy.bat",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="batchfile"');
    expect(html).toContain('class="syntax-token syntax-keyword">echo</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">off</span>');
    expect(html).toContain('class="syntax-token syntax-identifier">%~dp0</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">if</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">exist</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">goto</span>');
    expect(html).toContain('class="syntax-token syntax-comment">rem legacy comment</span>');
    expect(html).toContain('class="syntax-token syntax-title">:done</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">exit</span>');
  });

  it("maps legacy scalar-only code browser modes by extension", () => {
    const scalarFiles = [
      {
        expectedLanguage: "assembly_x86",
        mimeType: "application/octet-stream",
        name: "boot.a",
        path: "asm/boot.a",
      },
      {
        expectedLanguage: "ada",
        mimeType: "application/octet-stream",
        name: "main.ada",
        path: "src/main.ada",
      },
      {
        expectedLanguage: "d",
        mimeType: "application/octet-stream",
        name: "app.d",
        path: "src/app.d",
      },
      {
        expectedLanguage: "jade",
        mimeType: "application/octet-stream",
        name: "layout.jade",
        path: "views/layout.jade",
      },
      {
        expectedLanguage: "vbscript",
        mimeType: "application/octet-stream",
        name: "deploy.vbs",
        path: "scripts/deploy.vbs",
      },
    ];

    for (const file of scalarFiles) {
      const html = renderToStaticMarkup(
        <CodeBrowserPage
          code={{
            ...codeBrowser,
            file: {
              ...codeBrowser.file!,
              mimeType: file.mimeType,
              name: file.name,
              path: file.path,
              text: "legacy mode sample",
            },
            path: file.path,
          }}
          detail={projectDetail}
          runtimeConfig={runtimeConfig}
        />,
      );

      expect(html).toContain(`data-language="${file.expectedLanguage}"`);
      expect(html).toContain('data-mime-type="application/octet-stream"');
      expect(html).toContain("legacy mode sample");
    }
  });

  it("preserves legacy code browser alias synonyms under generic MIME metadata", () => {
    const aliasFiles = [
      { expectedLanguage: "assembly_x86", name: "boot.a86", path: "asm/boot.a86" },
      { expectedLanguage: "actionscript", name: "Badge.as", path: "flash/Badge.as" },
      { expectedLanguage: "batchfile", name: "deploy.bat", path: "scripts/deploy.bat" },
      { expectedLanguage: "c_cpp", name: "widget.c__", path: "src/widget.c__" },
      { expectedLanguage: "c_cpp", name: "widget.c", path: "src/widget.c" },
      { expectedLanguage: "c_cpp", name: "widget.cxx", path: "src/widget.cxx" },
      { expectedLanguage: "c_cpp", name: "widget.cp", path: "src/widget.cp" },
      { expectedLanguage: "c_cpp", name: "widget.cpp", path: "src/widget.cpp" },
      { expectedLanguage: "c_cpp", name: "widget.hpp", path: "include/widget.hpp" },
      { expectedLanguage: "c_cpp", name: "widget.h", path: "include/widget.h" },
      { expectedLanguage: "c_cpp", name: "widget.h++", path: "include/widget.h++" },
      { expectedLanguage: "coffee", name: "issue_view.coffee", path: "assets/issue_view.coffee" },
      { expectedLanguage: "csharp", name: "IssueRenderer.cs", path: "src/IssueRenderer.cs" },
      { expectedLanguage: "dart", name: "issue_state.dart", path: "lib/issue_state.dart" },
      { expectedLanguage: "diff", name: "changes.diff", path: "patches/changes.diff" },
      { expectedLanguage: "erlang", name: "handler.erl", path: "src/handler.erl" },
      { expectedLanguage: "html", name: "index.htm", path: "public/index.htm" },
      { expectedLanguage: "ini", name: "application.config", path: "conf/application.config" },
      { expectedLanguage: "json", name: "package.json", path: "package.json" },
      { expectedLanguage: "jsp", name: "issue.jsp", path: "views/issue.jsp" },
      { expectedLanguage: "latex", name: "manual.dtx", path: "docs/manual.dtx" },
      { expectedLanguage: "latex", name: "manual.tex", path: "docs/manual.tex" },
      { expectedLanguage: "less", name: "theme.less", path: "assets/theme.less" },
      { expectedLanguage: "php", name: "index.php", path: "app/index.php" },
      { expectedLanguage: "php", name: "index.php5", path: "app/index.php5" },
      { expectedLanguage: "php", name: "index.php3", path: "app/index.php3" },
      { expectedLanguage: "php", name: "index.php4", path: "app/index.php4" },
      { expectedLanguage: "php", name: "index.php6", path: "app/index.php6" },
      { expectedLanguage: "php", name: "index.phps", path: "app/index.phps" },
      { expectedLanguage: "php", name: "helpers.inc", path: "app/helpers.inc" },
      { expectedLanguage: "python", name: "deploy.py", path: "scripts/deploy.py" },
      { expectedLanguage: "r", name: "analysis.r", path: "stats/analysis.r" },
      { expectedLanguage: "ruby", name: "issue.rb", path: "lib/issue.rb" },
      { expectedLanguage: "ruby", name: "Gemfile.ruby", path: "lib/Gemfile.ruby" },
      { expectedLanguage: "sh", name: "deploy.sh", path: "scripts/deploy.sh" },
      { expectedLanguage: "sql", name: "schema.sql", path: "db/schema.sql" },
      {
        expectedLanguage: "actionscript",
        name: "Badge.actionscript",
        path: "flash/Badge.actionscript",
      },
      { expectedLanguage: "makefile", name: "Makefile", path: "Makefile" },
      { expectedLanguage: "makefile", name: "build.mk", path: "build.mk" },
      { expectedLanguage: "makefile", name: "build.mak", path: "build.mak" },
      { expectedLanguage: "makefile", name: "emakrfile", path: "emakrfile" },
      { expectedLanguage: "makefile", name: "emakerfile", path: "emakerfile" },
      { expectedLanguage: "text", name: "notes.txt", path: "docs/notes.txt" },
      { expectedLanguage: "text", name: "build.sbt", path: "build.sbt" },
      { expectedLanguage: "yaml", name: "deploy.yaml", path: "config/deploy.yaml" },
      { expectedLanguage: "yaml", name: "deploy.yml", path: "config/deploy.yml" },
      { expectedLanguage: "html", name: "index.html", path: "public/index.html" },
      { expectedLanguage: "svg", name: "logo.svg", path: "public/logo.svg" },
      { expectedLanguage: "xml", name: "application.xml", path: "conf/application.xml" },
      { expectedLanguage: "xml", name: "feed.atom", path: "public/feed.atom" },
      { expectedLanguage: "xml", name: "feed.rss", path: "public/feed.rss" },
      { expectedLanguage: "xml", name: "Info.plist", path: "mac/Info.plist" },
      { expectedLanguage: "xml", name: "page.xhtml", path: "public/page.xhtml" },
      { expectedLanguage: "xml", name: "bindings.xjb", path: "schema/bindings.xjb" },
      { expectedLanguage: "xml", name: "schema.xsd", path: "schema/schema.xsd" },
      { expectedLanguage: "xml", name: "transform.xsl", path: "schema/transform.xsl" },
    ];

    for (const file of aliasFiles) {
      const html = renderToStaticMarkup(
        <CodeBrowserPage
          code={{
            ...codeBrowser,
            file: {
              ...codeBrowser.file!,
              mimeType: "application/octet-stream",
              name: file.name,
              path: file.path,
              text: "legacy alias sample",
            },
            path: file.path,
          }}
          detail={projectDetail}
          runtimeConfig={runtimeConfig}
        />,
      );

      expect(html).toContain(`data-language="${file.expectedLanguage}"`);
      expect(html).toContain('data-mime-type="application/octet-stream"');
      expect(html).toContain("legacy alias sample");
    }
  });

  it("maps legacy text files to text mode in code browser by extension", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "application/octet-stream",
            name: ".gitignore",
            path: ".gitignore",
            text: "target/\n.DS_Store\n",
          },
          path: ".gitignore",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="text"');
    expect(html).toContain('data-mime-type="application/octet-stream"');
    expect(html).toContain("target/");
    expect(html).toContain(".DS_Store");
  });

  it("maps legacy ActionScript files to ActionScript syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-actionscript",
            name: "Badge.as",
            path: "flash/Badge.as",
            text: "package {\n  public class Badge extends Sprite {\n    public function render():void { trace(0xCAFE); }\n  }\n}",
          },
          path: "flash/Badge.as",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="actionscript"');
    expect(html).toContain('class="syntax-token syntax-keyword">package</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">public</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">extends</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">Sprite</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">function</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">trace</span>');
    expect(html).toContain('class="syntax-token syntax-number">0xCAFE</span>');
  });

  it("maps legacy JSP files to JSP syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-jsp",
            name: "issue.jsp",
            path: "views/issue.jsp",
            text: "public final class IssueView {\n  return true;\n}",
          },
          path: "views/issue.jsp",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="jsp"');
    expect(html).toContain('class="syntax-token syntax-keyword">public</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">final</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">class</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">return</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">true</span>');
  });

  it("maps legacy Less files to Less syntax highlighting in code browser", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            mimeType: "text/x-less",
            name: "theme.less",
            path: "assets/theme.less",
            text: "@brand: #268bd2;\n.issue {\n  color: @brand !important;\n}",
          },
          path: "assets/theme.less",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('data-language="less"');
    expect(html).toContain('class="syntax-token syntax-identifier">@brand</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">.issue</span>');
    expect(html).toContain('class="syntax-token syntax-keyword">color</span>');
    expect(html).toContain('class="syntax-token syntax-meta">!important</span>');
  });

  it("renders the legacy new-file link path for root and nested folders", () => {
    const rootHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: undefined,
          path: "",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(rootHtml).toContain('id="new-file-link"');
    expect(rootHtml).toContain(
      '<option value="/yona/owner/projectYobi/code/main" selected="">main</option>',
    );
    expect(rootHtml).toContain(
      '<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/code/main/download">Download as .zip file</a></div>',
    );
    expect(rootHtml).toContain(
      '<div class="pull-right"><a class="ybtn" href="/yona/owner/projectYobi/postform?path=&amp;branch=main" id="new-file-link">New file</a></div>',
    );
    expect(rootHtml).toContain('class="code-viewer-wrap"');
    expect(rootHtml).toContain('id="spin"');
    expect(rootHtml).toContain(
      '<div aria-label="Breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left" id="breadcrumbs"',
    );
    expect(rootHtml).toContain('aria-label="Code tabs"');
    expect(rootHtml).toContain(">Files</a>");
    expect(rootHtml).toContain(">Commit</a>");
    expect(rootHtml).toContain(">Branches</a>");
    expect(rootHtml).toContain('href="/yona/owner/projectYobi/postform?path=&amp;branch=main"');
    expect(rootHtml).toContain(">New file</a>");

    const nestedFolderHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          breadcrumbs: [
            { name: "docs", path: "docs" },
            { name: "guides", path: "docs/guides" },
          ],
          file: undefined,
          path: "docs",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(nestedFolderHtml).toContain(
      'href="/yona/owner/projectYobi/postform?path=docs%2F&amp;branch=main"',
    );
    expect(nestedFolderHtml).toContain(
      '<a href="/yona/owner/projectYobi/code/main/docs">docs</a><a href="/yona/owner/projectYobi/code/main/docs/guides">guides</a>',
    );
    expect(nestedFolderHtml).not.toContain("<span>/</span>");
    expect(nestedFolderHtml).not.toContain("Folder: ");
    expect(nestedFolderHtml).not.toContain("File: ");
  });

  it("renders binary and too-large file states with legacy file-view copy", () => {
    const binaryHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            isBinary: true,
            mimeType: "application/octet-stream",
            name: "artifact.bin",
            path: "artifact.bin",
            text: "",
          },
          path: "artifact.bin",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(binaryHtml).toContain('class="yobicon-download-alt yobicon-white vmiddle"');
    expect(binaryHtml).toContain('<span class="filesize">29 bytes</span>');
    expect(binaryHtml).toContain(
      'href="/yona/owner/projectYobi/rawcode/be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2/artifact.bin"',
    );
    expect(binaryHtml).toContain("Download a file</a>");
    expect(binaryHtml).toContain("Open in browser</a>");
    expect(binaryHtml).toContain(">Change history</a>");
    expect(binaryHtml).not.toContain(">button.download</a>");
    expect(binaryHtml).not.toContain(">Open</a>");
    expect(binaryHtml).not.toContain(
      'class="filehref ybtn" href="/yona/owner/projectYobi/files/main/artifact.bin"',
    );
    expect(binaryHtml).not.toContain(">UNIX</span>");
    expect(binaryHtml).not.toContain(">UNDEFINED</span>");
    expect(binaryHtml).not.toContain("&amp;edit=true");

    const tooLargeHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            isTooLarge: true,
            name: "large.txt",
            path: "large.txt",
            text: "",
          },
          path: "large.txt",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(tooLargeHtml).toContain("Sorry, we cannot show a file larger than");
    expect(tooLargeHtml).toContain(">View Raw</a>");
    expect(tooLargeHtml).toContain(">UNDEFINED</span>");
    expect(tooLargeHtml).not.toContain("code.tooBigFileForCodeBrowser");
    expect(tooLargeHtml).not.toContain(">code.viewRaw</a>");
    expect(tooLargeHtml).not.toContain("&amp;edit=true");

    const imageHtml = renderToStaticMarkup(
      <CodeBrowserPage
        code={{
          ...codeBrowser,
          file: {
            ...codeBrowser.file!,
            isBinary: true,
            mimeType: "image/png",
            name: "logo.png",
            path: "logo.png",
            text: "",
          },
          path: "logo.png",
        }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );
    expect(imageHtml).toContain('<div class="image-wrap" id="showImage">');
    expect(imageHtml).toContain(
      'src="/yona/owner/projectYobi/rawcode/be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2/logo.png"',
    );
  });

  it("renders the legacy Git no-head guidance instead of raw placeholder copy", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{ ...codeBrowser, file: undefined, noHead: true }}
        detail={{ ...projectDetail, cloneUrl: "http://example.test/owner/projectYobi.git" }}
        runtimeConfig={legacySiteRuntimeConfig}
      />,
    );

    expect(html).toContain("The repository is empty!");
    expect(html).toContain("Create a new local repository by cloning");
    expect(html).toContain("git clone http://example.test/owner/projectYobi.git projectYobi");
    expect(html).toContain("git commit -m &quot;Hello Legacy Yona&quot;");
    expect(html).toContain("Or, create a new local repository");
    expect(html).toContain("If you have already created a local git repository");
    expect(html).toContain("git remote add origin http://example.test/owner/projectYobi.git");
    expect(html).toContain("You can keep updating your code");
    expect(html).not.toContain("code.nohead.clone Legacy Yona");
    expect(html).not.toContain("code.nohead.init Legacy Yona");
    expect(html).not.toContain("code.nohead.remote Legacy Yona");
    expect(html).not.toContain("code.nohead");
    expect(html).not.toContain("Clone URL:");
  });

  it("renders the legacy SVN no-head guidance for Subversion projects", () => {
    const html = renderToStaticMarkup(
      <CodeBrowserPage
        code={{ ...codeBrowser, file: undefined, noHead: true }}
        detail={{
          ...projectDetail,
          cloneUrl: "http://example.test/svn/owner/projectYobi",
          vcs: "Subversion",
        }}
        runtimeConfig={legacySiteRuntimeConfig}
      />,
    );

    expect(html).toContain("The repository is empty!");
    expect(html).toContain("You can commit your code to this repository.");
    expect(html).toContain("svn co http://example.test/svn/owner/projectYobi");
    expect(html).toContain("echo &quot;# projectYobi&quot; &gt; README.md");
    expect(html).not.toContain("code.nohead.svn.clone Legacy Yona");
    expect(html).not.toContain("code.nohead.clone");
    expect(html).not.toContain("code.nohead");
  });

  it("renders legacy commit diff file stats and inline comment anchors", () => {
    const html = renderToStaticMarkup(
      <CodeCommitDetailPage
        commitDetail={commitDetail}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("src/main.rs");
    expect(html).toContain(
      '<li class="code-menu active"><a href="/yona/owner/projectYobi/code"><span class="menu-name">Code</span>',
    );
    expect(html).toContain('class="diff-stats"');
    expect(html).toContain('class="num-added">+2</span>');
    expect(html).toContain('class="num-deleted">-1</span>');
    expect(html).toContain("line-comment-trigger");
    expect(html).toContain('data-line="2"');
  });

  it("renders empty commit diff body without non-legacy placeholder copy", () => {
    const html = renderToStaticMarkup(
      <CodeCommitDetailPage
        commitDetail={{ ...commitDetail, files: [] }}
        detail={projectDetail}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain('<div class="diff-body">');
    expect(html).toContain('<div class="btnPop">');
    expect(html).not.toContain("No changed file diff is available.");
  });

  it("renders commit discussion controls with legacy message-key copy", () => {
    const html = renderToStaticMarkup(
      <CodeCommitDetailPage
        commitDetail={{
          ...commitDetail,
          commit: commitDetail.commit
            ? {
                ...commitDetail.commit,
                authorEmail: "",
                authorName: "",
              }
            : null,
          threads: [
            {
              authorId: 1,
              authorLabel: "Author",
              authorLoginId: "author",
              comments: [
                {
                  authorId: 1,
                  authorLabel: "Author",
                  authorLoginId: "author",
                  canDelete: true,
                  contentsHtml: "",
                  contentsMarkdown: "Thread comment",
                  createdLabel: "now",
                  id: 12,
                  threadId: 7,
                  viaEmail: false,
                },
              ],
              commitId: "be6a8cc1c1ecfe9489fb51e4869af15a13fc2cd2",
              createdLabel: "now",
              endLine: 2,
              id: 7,
              path: "src/main.rs",
              prevCommitId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              startLine: 2,
              state: "open",
            },
          ],
        }}
        detail={projectDetail}
        onCloseThread={async () => undefined}
        onCreateComment={async () => undefined}
        onDeleteComment={async () => undefined}
        onUpdateComment={async () => undefined}
        runtimeConfig={runtimeConfig}
      />,
    );

    expect(html).toContain("<strong>User.anonymous.name</strong>");
    expect(html).toContain(">Watch</button>");
    expect(html).toContain(">List</a>");
    expect(html).toContain('class="yobicon-post2"');
    expect(html).toContain(">Edit</button>");
    expect(html).toContain('title="Delete comment"');
    expect(html).toContain('class="yobicon-trash"');
    expect(html).toContain('class="yobicon-restore"');
    expect(html).toContain('class="ybtn ybtn-default btn-show-reviewcards"');
    expect(html).toContain('class="ybtn ybtn-default btn-hide-reviewcards"');
    expect(html).toContain('data-toggle="tab" href="#reviewcards-open"');
    expect(html).toContain(">Open 1</a>");
    expect(html).toContain('data-toggle="tab" href="#reviewcards-closed"');
    expect(html).toContain(">Closed 0</a>");
    expect(html).toContain(">Closed 0</span>");
    expect(html).toContain('class="review-form board-comment-form"');
    expect(html).toContain('href="#edit-commit-comment"');
    expect(html).toContain('href="#preview-commit-comment"');
    expect(html).toContain('data-editor-mode="comment-body"');
    expect(html).toContain('class="markdown-preview markdown-wrap comment-body"');
    expect(html).toContain('class="markdown-help"');
    expect(html).toContain('href="#edit-thread-comment-7"');
    expect(html).toContain('href="#preview-thread-comment-7"');
    expect(html).toContain('data-editor-mode="code-review-body"');
    expect(html).toContain('class="markdown-preview markdown-wrap code-review-body"');
    expect(html).toContain(">Close</button>");
    expect(html).toContain(">Add a comment</button>");
    expect(html).not.toContain("<strong>Anonymous</strong>");
    expect(html).not.toContain(">notification.watch</button>");
    expect(html).not.toContain(">button.list</a>");
    expect(html).not.toContain(">Comments</button>");
    expect(html).not.toContain("Review cards");
    expect(html).not.toContain("Hide review cards");
    expect(html).not.toContain(">issue.state.open 1</a>");
    expect(html).not.toContain(">issue.state.closed 0</a>");
    expect(html).not.toContain(">issue.state.closed 0</span>");
    expect(html).not.toContain(">button.edit</button>");
    expect(html).not.toContain(">button.delete</button>");
    expect(html).not.toContain(">commentThread.close</button>");
    expect(html).not.toContain(">button.comment.new</button>");
  });

  it("keeps state-driven commit discussion editors in legacy common.editor shells", () => {
    expect(codeViewsSource).toContain("<LegacyMarkdownEditorShell");
    expect(codeViewsSource).toContain('editorMode="code-review-body"');
    expect(codeViewsSource).toContain('editorMode="update-comment-body"');
    expect(codeViewsSource).toContain("upload-drop-here");
    expect(codeViewsSource).toContain("editor-contents-");
  });
});
