import { expect, test, type Page } from "@playwright/test";

const EXPECTED_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/README.txt" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/README.txt">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/README.txt">README.txt</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#README.txt">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span>LF</span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/main/README.txt" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=README.txt&amp;branch=main&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/README.txt" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/README.txt" class="ybtn">Change history</a></div></div><div id="codeVal" class="hidden"># sample
Line two</div><pre id="showCode" class="code-wrap" data-mimeType="text/plain"></pre></div></div></div></div></div>
`;

const EXPECTED_NESTED_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/docs/guide/README.txt" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/docs/guide/README.txt">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/docs">docs</a><a href="__BASE_PATH__/admin/sample/code/main/docs/guide">guide</a><a href="__BASE_PATH__/admin/sample/code/main/docs/guide/README.txt">README.txt</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=docs/guide/&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#docs/guide/README.txt">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span>LF</span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/main/docs/guide/README.txt" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=docs/guide/README.txt&amp;branch=main&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/docs/guide/README.txt" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.txt" class="ybtn">Change history</a></div></div><div id="codeVal" class="hidden"># sample
Line two</div><pre id="showCode" class="code-wrap" data-mimeType="text/plain"></pre></div></div></div></div></div>
`;

const EXPECTED_MARKDOWN_CODE_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left mb10"><option value="__BASE_PATH__/admin/sample/code/main/README.md" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease/README.md">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main/README.md">README.md</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="file-wrap" data-type="file"><div class="file-header nm"><div id="fileInfo" class="file-info"><span id="commiter" class="commiter"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a><a href="__BASE_PATH__/admin" class="ml5">Admin</a></span><span id="commitDate" class="commitDate">Jul 2, 2026</span><span id="revisionNo" class="revision"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main#README.md">1234567<span class="number-of-comments ml5"><i class="yobicon-comments"></i> 2</span></a></span><span id="commitMessage" class="commitMsg">Update README</span><span>LF</span></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/rawcode/main/README.md" class="ybtn" target="_blank"><i class="yobicon-download-alt yobicon-white vmiddle"></i> Raw</a><a href="__BASE_PATH__/admin/sample/postform?path=README.md&amp;branch=main&amp;edit=true" class="ybtn">Edit</a><a id="open-in-browser" href="__BASE_PATH__/admin/sample/files/main/README.md" class="ybtn" target="_blank" data-content="Browser will parse and show this file. It is useful when you want to serve a static content file."><i class="yobicon-download-alt yobicon-white vmiddle"></i> Open in browser</a><a href="__BASE_PATH__/admin/sample/commits/main/README.md" class="ybtn">Change history</a></div></div><div id="codeVal" class="markdown-wrap codebrowser-markdown"><h1>sample</h1><p>Line two</p><p><img src="__BASE_PATH__/admin/sample/files/main/assets/logo.png"></p><p><a href="./docs/guide.md">Guide</a></p></div></div></div></div></div></div>
`;

test("project code text file matches legacy code/partial_view_file.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".file-wrap[data-type=file] #commitMessage")).toHaveText(
    "Update README",
  );
  expect(codeRequests).toEqual(["branch=main&path=README.txt"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project code text file keeps nested legacy path segments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "docs/guide/README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/docs/guide/README.txt`);
  await expect(page.locator(".file-wrap[data-type=file] #commitMessage")).toHaveText(
    "Update README",
  );
  expect(codeRequests).toEqual(["branch=main&path=docs%2Fguide%2FREADME.txt"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_NESTED_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project code markdown file matches legacy code browser markdown branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "README.md",
    `# sample

Line two

![logo](${basePath}/admin/sample/files/main/assets/logo.png)

[Guide](./docs/guide.md)`,
  );

  await page.goto(`${basePath}/admin/sample/code/main/README.md`);
  await expect(page.locator("#codeVal.markdown-wrap.codebrowser-markdown")).toBeVisible();
  await expect(page.locator("#showCode")).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=README.md"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_MARKDOWN_CODE_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockProjectCodeFile(
  page: Page,
  codeRequests: string[],
  filePath: string,
  data = "# sample\nLine two",
) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/code**", async (route) => {
    const url = new URL(route.request().url());
    codeRequests.push(url.searchParams.toString());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: breadcrumbsFor(filePath),
        entries: [],
        file: {
          author: "Admin",
          avatarUrl: "/assets/images/default-avatar-32.png",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          commentCount: 2,
          createdDate: "Jul 2, 2026",
          data,
          isBinary: false,
          lineEnding: "LF",
          mimeType: "text/plain",
          path: filePath,
          userLoginId: "admin",
        },
        noHead: false,
        ownerName: "admin",
        path: filePath,
        projectName: "sample",
        selectedBranch: "main",
      }),
    });
  });
}

function breadcrumbsFor(filePath: string) {
  return filePath.split("/").map((name, index, parts) => ({
    name,
    path: parts.slice(0, index + 1).join("/"),
  }));
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
