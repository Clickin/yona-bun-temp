import { expect, test, type Page } from "@playwright/test";

const EXPECTED_CODE_FOLDER_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><ul class="nav nav-tabs"><li class="active"><a href="__BASE_PATH__/admin/sample/code/main">Files</a></li><li><a href="__BASE_PATH__/admin/sample/commits/main">Commit</a></li><li><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left"><option value="__BASE_PATH__/admin/sample/code/main" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="list-wrap" data-type="folder"><div class="row-fluid listhead"><div class="span6 filename"><strong>File name</strong></div><div class="span4 commitMsg"><strong>Commit message</strong></div><div class="span2 commitDate"><strong>Commit date</strong></div></div><div id="cb-src" class="row-fluid listitem" data-path="src"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/main/src#cb-src" class="folder" title="src" data-type="folder" data-targetpath="src"><span class="dynatree-icon vmiddle"></span>src</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/abcdef1?branch=main">Add source</a></span></div><div class="span1 commitDate">Jul 1, 2026</div></div><div id="cb-README.md" class="row-fluid listitem" data-path="README.md"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/main/README.md" class="file" title="README.md" data-targetpath="README.md"><span class="dynatree-icon vmiddle"></span>README.md</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/1234567?branch=main">Update README</a></span></div><div class="span1 commitDate">Jul 2, 2026</div></div></div></div></div></div></div>
`;

const EXPECTED_SVN_CODE_FOLDER_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><ul class="nav nav-tabs"><li class="active"><a href="__BASE_PATH__/admin/sample/code/trunk">Files</a></li><li><a href="__BASE_PATH__/admin/sample/commits/trunk">Commit</a></li></ul><div class="code-browse-header"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-left"><option value="__BASE_PATH__/admin/sample/code/trunk" selected="">trunk</option><option value="__BASE_PATH__/admin/sample/code/branches%2Frelease">branches/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/trunk">sample</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="list-wrap" data-type="folder"><div class="row-fluid listhead"><div class="span6 filename"><strong>File name</strong></div><div class="span4 commitMsg"><strong>Commit message</strong></div><div class="span2 commitDate"><strong>Commit date</strong></div></div><div id="cb-src" class="row-fluid listitem" data-path="src"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/trunk/src#cb-src" class="folder" title="src" data-type="folder" data-targetpath="src"><span class="dynatree-icon vmiddle"></span>src</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/abcdef1?branch=trunk">Add source</a></span></div><div class="span1 commitDate">Jul 1, 2026</div></div><div id="cb-README.md" class="row-fluid listitem" data-path="README.md"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/trunk/README.md" class="file" title="README.md" data-targetpath="README.md"><span class="dynatree-icon vmiddle"></span>README.md</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/1234567?branch=trunk">Update README</a></span></div><div class="span1 commitDate">Jul 2, 2026</div></div></div></div></div></div></div>
`;

test("project code branch root folder matches legacy code/view.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page);

  await page.goto(`${basePath}/admin/sample/code/main`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".code-viewer-wrap .listitem")).toHaveCount(2);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_CODE_FOLDER_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
});

test("project SVN code branch root folder matches legacy code/view.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(
    page,
    { vcs: "SVN" },
    [{ name: "trunk" }, { name: "branches/release" }],
    "trunk",
  );

  await page.goto(`${basePath}/admin/sample/code/trunk`);
  await expect(page.locator(".code-browse-wrap > .nav.nav-tabs > li")).toHaveCount(2);
  await expect(page.locator(".code-browse-header > .pull-right")).toHaveCount(0);
  await expect(page.locator(".code-viewer-wrap .listitem")).toHaveCount(2);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_SVN_CODE_FOLDER_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockProjectCodeFolder(
  page: Page,
  projectOverrides: Record<string, unknown> = {},
  branches: Array<{ name: string }> = [{ name: "main" }, { name: "feature/release" }],
  selectedBranch = "main",
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
        ...projectOverrides,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/code**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches,
        breadcrumbs: [],
        entries: [
          {
            commitDate: "Jul 1, 2026",
            commitMessage: "Add source",
            commitShortId: "abcdef1",
            kind: "folder",
            name: "src",
            path: "src",
          },
          {
            commitDate: "Jul 2, 2026",
            commitMessage: "Update README",
            commitShortId: "1234567",
            kind: "file",
            name: "README.md",
            path: "README.md",
          },
        ],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch,
      }),
    });
  });
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
