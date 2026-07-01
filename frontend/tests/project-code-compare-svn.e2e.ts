import { expect, test, type Page } from "@playwright/test";

const SVN_PATCH = `Index: README.md
===================================================================
--- README.md	(revision 1)
+++ README.md	(revision 2)
@@ -1 +1,2 @@
 # sample
+SVN compare`;

const EXPECTED_COMPARE_SVN_BODY = `
<div class="project-page-wrap"><div class="code-browse-wrap"><p class="commitInfo"><strong class="commitId">@1234567..abcdef1</strong></p><div class="diff-wrap"><div class="diff-body hide" data-commit-origin="true" id="commit">${SVN_PATCH}</div></div></div></div>
`;

test("project svn compare patch state matches legacy code/compare_svn.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const compareRequests: string[] = [];
  await mockProjectSvnCompare(page, compareRequests);

  await page.goto(`${basePath}/admin/sample/compare/1234567..abcdef1`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".commitInfo .commitId")).toHaveText("@1234567..abcdef1");
  await expect(page.locator("#commit.diff-body.hide")).toHaveAttribute(
    "data-commit-origin",
    "true",
  );
  await expect(page.locator(".diff-body.discommentable")).toHaveCount(0);
  expect(compareRequests).toEqual(["1234567..abcdef1"]);
  expect(await canonicalize(page, ".project-page-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_COMPARE_SVN_BODY),
  );
  expect(await readCompareSvnMetrics(page)).toEqual({
    codeBrowseMarginTop: "0px",
    codeBrowsePosition: "relative",
    commitIdColor: "rgb(102, 102, 102)",
    commitIdFontFamily: 'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    commitIdMarginTop: "5px",
    commitInfoBackground: "rgba(0, 0, 0, 0)",
    commitInfoBorderTopWidth: "0px",
    commitInfoMarginBottom: "16px",
    commitInfoPadding: "0px",
    diffBodyDisplay: "none",
    diffWrapMarginBottom: "20px",
    diffWrapOverflowX: "auto",
    diffWrapWidth: 1280,
    projectPageWidth: 1280,
  });
});

async function mockProjectSvnCompare(page: Page, compareRequests: string[]) {
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
        vcs: "SVN",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/compare/**", async (route) => {
    compareRequests.push(route.request().url().split("/compare/")[1] ?? "");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        commitA: { commitId: "1234567" },
        commitB: { commitId: "abcdef1" },
        files: [],
        noHead: false,
        ownerName: "admin",
        patch: SVN_PATCH,
        projectName: "sample",
        revA: "1234567",
        revB: "abcdef1",
      }),
    });
  });
}

async function readCompareSvnMetrics(page: Page) {
  return page.evaluate(() => {
    const projectPage = document.querySelector<HTMLElement>(".project-page-wrap");
    const codeBrowse = document.querySelector<HTMLElement>(".code-browse-wrap");
    const commitInfo = document.querySelector<HTMLElement>(".commitInfo");
    const commitId = document.querySelector<HTMLElement>(".commitInfo .commitId");
    const diffWrap = document.querySelector<HTMLElement>(".diff-wrap");
    const diffBody = document.querySelector<HTMLElement>("#commit.diff-body");
    const missing = Object.entries({
      codeBrowse,
      commitId,
      commitInfo,
      diffBody,
      diffWrap,
      projectPage,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected SVN compare metric targets are missing: ${missing.join(", ")}`);
    }

    const codeBrowseStyle = getComputedStyle(codeBrowse);
    const commitIdStyle = getComputedStyle(commitId);
    const commitInfoStyle = getComputedStyle(commitInfo);
    const diffBodyStyle = getComputedStyle(diffBody);
    const diffWrapStyle = getComputedStyle(diffWrap);
    return {
      codeBrowseMarginTop: codeBrowseStyle.marginTop,
      codeBrowsePosition: codeBrowseStyle.position,
      commitIdColor: commitIdStyle.color,
      commitIdFontFamily: commitIdStyle.fontFamily,
      commitIdMarginTop: commitIdStyle.marginTop,
      commitInfoBackground: commitInfoStyle.backgroundColor,
      commitInfoBorderTopWidth: commitInfoStyle.borderTopWidth,
      commitInfoMarginBottom: commitInfoStyle.marginBottom,
      commitInfoPadding: commitInfoStyle.padding,
      diffBodyDisplay: diffBodyStyle.display,
      diffWrapMarginBottom: diffWrapStyle.marginBottom,
      diffWrapOverflowX: diffWrapStyle.overflowX,
      diffWrapWidth: Math.round(diffWrap.getBoundingClientRect().width),
      projectPageWidth: Math.round(projectPage.getBoundingClientRect().width),
    };
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
