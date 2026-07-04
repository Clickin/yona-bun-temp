import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_BRANCHES_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code/main">Files</a></li><li><a href="__BASE_PATH__/admin/sample/commits/main">Commit</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><table class="table branch-list-wrap"><thead class="thead"><tr><th>Branches</th><th>Latest commit</th><th>Latest pull request</th><th></th></tr></thead><tbody><tr class="head"><td class="branchName"><a href="__BASE_PATH__/admin/sample/code/main">main</a><span class="headBranch ml10">Default branch</span></td><td class="commit"><a href="__BASE_PATH__/admin/sample/commits/main" class="commitId" title="abcdef1234567890">abcdef1</a><span class="date" data-toggle="tooltip" data-placement="top" title="Jul 1, 2026">Jul 1, 2026</span></td><td class="pullRequest"><span class="disabled">No pull request has been sent</span></td><td class="actions"></td></tr><tr><td class="branchName"><a href="__BASE_PATH__/admin/sample/code/feature%2Frelease">release</a></td><td class="commit"><a href="__BASE_PATH__/admin/sample/commits/feature%2Frelease" class="commitId" title="1234567890abcdef">1234567</a><span class="date" data-toggle="tooltip" data-placement="top" title="Jul 2, 2026">Jul 2, 2026</span></td><td class="pullRequest"><a href="__BASE_PATH__/admin/sample/pullRequest/3" class="blue-txt pullrequest-state open" data-toggle="tooltip" data-placement="top" title="Open">pullRequest-3</a></td><td class="actions"><button type="button" class="ybtn ybtn-default ybtn-small" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/code/feature%2Frelease/setAsDefault">Set as default branch</button><button type="button" class="ybtn ybtn-danger ybtn-small" data-request-method="delete">Delete</button></td></tr></tbody></table></div></div></div></div>
`;

const ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/branches.tsx", import.meta.url),
  "utf8",
);

test("project code branches matches legacy code/branches.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const setDefaultRequests: unknown[] = [];
  const deleteRequests: unknown[] = [];
  await mockProjectBranches(page, setDefaultRequests, deleteRequests);

  await page.goto(`${basePath}/admin/sample/branches`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".branch-list-wrap tbody tr")).toHaveCount(2);
  await expect(page.locator(".nav-tabs a").nth(0)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main`,
  );
  await expect(page.locator(".branchName a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/feature%2Frelease`,
  );
  await expect(page.locator(".pullrequest-state")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequest/3`,
  );
  await expect(page.locator(".code-browse-wrap a[data-status]")).toHaveCount(0);
  await expect(page.locator(".code-browse-wrap a[aria-current]")).toHaveCount(0);
  const branchesTabItem = page.locator(".code-browse-wrap > .nav.nav-tabs > li").nth(2);
  const branchesTabAnchor = branchesTabItem.locator("a");
  await expect(branchesTabItem).toHaveAttribute("class", "active");
  await expect(branchesTabAnchor).toHaveAttribute("href", `${basePath}/admin/sample/branches`);
  await expect(branchesTabAnchor).not.toHaveAttribute("class", /./u);
  await expect(branchesTabAnchor).not.toHaveAttribute("aria-current", /./u);
  await expect(branchesTabAnchor).not.toHaveAttribute("data-status", /./u);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_BRANCHES_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readBranchListMetrics(page)).toEqual({
    actionsMinWidth: "220px",
    actionsTextAlign: "right",
    actionsWidth: "220px",
    branchLinkColor: "rgb(81, 170, 204)",
    branchNameMinWidth: "180px",
    branchNamePaddingTop: "13px",
    commitDateColor: "rgb(119, 119, 119)",
    commitDateFontSize: "11px",
    commitDateMarginLeft: "10px",
    commitPaddingTop: "13px",
    commitWidth: "155px",
    defaultBadgeBackground: "rgb(255, 255, 255)",
    defaultBadgeBorderRadius: "3px",
    defaultBadgeBorderTopWidth: "1px",
    defaultBadgeColor: "rgb(0, 136, 204)",
    defaultBadgeDisplay: "inline-block",
    defaultBadgePadding: "3px 5px",
    disabledPullRequestColor: "rgb(205, 205, 205)",
    headRowBackground: "rgb(250, 250, 250)",
    openStateDotBackground: "rgb(182, 218, 84)",
    openStateDotBorderRadius: "10px",
    openStateDotHeight: "10px",
    openStateDotMarginRight: "5px",
    openStateDotWidth: "10px",
    pullRequestPaddingTop: "13px",
    pullRequestWidth: "170px",
    rowBorderBottomWidth: "1px",
    tableHeaderBackground: "rgb(245, 245, 245)",
    tableHeaderBorderBottomWidth: "1px",
    tableHeaderFontSize: "12px",
    tableHeaderLineHeight: "34px",
    tableWidthPercent: 100,
  });

  const setDefaultResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/branches/default") &&
      response.request().method() === "POST",
  );
  await page.click(".branch-list-wrap button[data-request-method='post']");
  await setDefaultResponse;
  expect(setDefaultRequests).toEqual([{ branchName: "feature/release" }]);

  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/branches") &&
      response.request().method() === "DELETE",
  );
  await page.click(".branch-list-wrap button[data-request-method='delete']");
  await deleteResponse;
  expect(deleteRequests).toEqual([{ branchName: "feature/release" }]);
});

test("project code branch links navigate through the SPA router", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBranches(page, [], []);
  await page.route("**/api/v1/projects/admin/sample/code?branch=main*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [],
        breadcrumbs: [],
        canUpload: false,
        entries: [],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      }),
    });
  });

  await page.goto(`${basePath}/admin/sample/branches`);
  await page.evaluate(() => {
    (window as Window & { __branchesSpaMarker?: string }).__branchesSpaMarker = "kept";
  });
  await page.click(".nav-tabs a[href$='/code/main']");
  await page.waitForURL(`${basePath}/admin/sample/code/main`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __branchesSpaMarker?: string }).__branchesSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project code branches route uses Link for internal anchors", () => {
  const branchesTabLink = ROUTE_SOURCE.match(
    /<Link\s+to="\/\$ownerName\/\$projectName\/branches"[\s\S]*?<\/Link>/u,
  )?.[0];

  expect(branchesTabLink).toBeTruthy();
  expect(branchesTabLink).not.toContain("__legacyInactive");
  expect(branchesTabLink).not.toContain("search={{");
  expect(branchesTabLink).toContain('to="/$ownerName/$projectName/branches"');
  expect(branchesTabLink).toContain("params={{ ownerName, projectName }}");
  expect(branchesTabLink).toContain('hash="branches-active-sentinel"');
  expect(branchesTabLink).toContain("mask={{");
  expect(branchesTabLink).toContain("activeOptions={{");
  expect(branchesTabLink).toContain("includeHash: true");
  expect(branchesTabLink).toContain("includeSearch: true");
  expect(branchesTabLink).toContain('"data-status": undefined');
  expect(ROUTE_SOURCE).not.toContain("__legacyInactive");
  expect(ROUTE_SOURCE).toContain("import { Link, createFileRoute }");
  expect(ROUTE_SOURCE).not.toContain("legacyLinkProps");
  expect(ROUTE_SOURCE).not.toContain("legacyInactiveSearch");
  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/code/$branch"');
  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/branches"');
  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/pullRequest/$pullRequestNumber"');
  expect(ROUTE_SOURCE).toContain("params={{ branch: branch.name, ownerName, projectName }}");
  expect(ROUTE_SOURCE).toContain("pullRequestNumber: String(");
  expect(ROUTE_SOURCE).toContain("activeOptions={{");
  expect(ROUTE_SOURCE).toContain("includeSearch: true");
  expect(ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(ROUTE_SOURCE).not.toContain("<a");
  expect(ROUTE_SOURCE).not.toContain("href={prefixBasePath");
  expect(ROUTE_SOURCE).not.toContain('data-request-method="delete"\\n              onClick');
});

async function mockProjectBranches(
  page: Page,
  setDefaultRequests: unknown[],
  deleteRequests: unknown[],
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
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests.push(route.request().postDataJSON());
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(branchesPayload()),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches/default", async (route) => {
    setDefaultRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(branchesPayload()),
    });
  });
}

function branchesPayload() {
  return {
    branches: [
      {
        commitDate: "Jul 1, 2026",
        commitId: "abcdef1234567890",
        commitMessage: "Initial commit",
        commitShortId: "abcdef1",
        isDefault: true,
        name: "main",
        pullRequest: null,
        shortName: "main",
      },
      {
        commitDate: "Jul 2, 2026",
        commitId: "1234567890abcdef",
        commitMessage: "Release branch",
        commitShortId: "1234567",
        isDefault: false,
        name: "feature/release",
        pullRequest: {
          ownerName: "admin",
          projectName: "sample",
          pullRequestNumber: 3,
          state: "open",
        },
        shortName: "release",
      },
    ],
    defaultBranch: "main",
    noHead: false,
    ownerName: "admin",
    permissions: { canDelete: true, canUpdate: true },
    projectName: "sample",
  };
}

async function readBranchListMetrics(page: Page) {
  return page.locator(".branch-list-wrap").evaluate((table) => {
    const tableHeader = table.querySelector<HTMLElement>(".thead");
    const headRow = table.querySelector<HTMLElement>("tr.head");
    const secondRow = table.querySelector<HTMLElement>("tbody tr:not(.head)");
    const branchName = table.querySelector<HTMLElement>("td.branchName");
    const branchLink = branchName?.querySelector<HTMLElement>("a");
    const defaultBadge = table.querySelector<HTMLElement>(".headBranch");
    const commit = table.querySelector<HTMLElement>("td.commit");
    const commitDate = commit?.querySelector<HTMLElement>(".date");
    const pullRequest = table.querySelector<HTMLElement>("td.pullRequest");
    const disabledPullRequest = pullRequest?.querySelector<HTMLElement>(".disabled");
    const openPullRequest = table.querySelector<HTMLElement>(".pullrequest-state.open");
    const actions = secondRow?.querySelector<HTMLElement>("td.actions");
    const missing = Object.entries({
      actions,
      branchLink,
      branchName,
      commit,
      commitDate,
      defaultBadge,
      disabledPullRequest,
      headRow,
      openPullRequest,
      pullRequest,
      secondRow,
      tableHeader,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected branch list metric targets are missing: ${missing.join(", ")}`);
    }

    const headerStyle = getComputedStyle(tableHeader!);
    const headRowStyle = getComputedStyle(headRow!);
    const secondRowStyle = getComputedStyle(secondRow!);
    const branchNameStyle = getComputedStyle(branchName!);
    const branchLinkStyle = getComputedStyle(branchLink!);
    const defaultBadgeStyle = getComputedStyle(defaultBadge!);
    const commitStyle = getComputedStyle(commit!);
    const commitDateStyle = getComputedStyle(commitDate!);
    const pullRequestStyle = getComputedStyle(pullRequest!);
    const disabledPullRequestStyle = getComputedStyle(disabledPullRequest!);
    const actionsStyle = getComputedStyle(actions!);
    const openDotStyle = getComputedStyle(openPullRequest!, "::before");
    const tableWidthPercent =
      Math.round(
        (table.getBoundingClientRect().width /
          table.closest<HTMLElement>(".code-browse-wrap")!.getBoundingClientRect().width) *
          1000,
      ) / 10;

    return {
      actionsMinWidth: actionsStyle.minWidth,
      actionsTextAlign: actionsStyle.textAlign,
      actionsWidth: actionsStyle.width,
      branchLinkColor: branchLinkStyle.color,
      branchNameMinWidth: branchNameStyle.minWidth,
      branchNamePaddingTop: branchNameStyle.paddingTop,
      commitDateColor: commitDateStyle.color,
      commitDateFontSize: commitDateStyle.fontSize,
      commitDateMarginLeft: commitDateStyle.marginLeft,
      commitPaddingTop: commitStyle.paddingTop,
      commitWidth: commitStyle.width,
      defaultBadgeBackground: defaultBadgeStyle.backgroundColor,
      defaultBadgeBorderRadius: defaultBadgeStyle.borderRadius,
      defaultBadgeBorderTopWidth: defaultBadgeStyle.borderTopWidth,
      defaultBadgeColor: defaultBadgeStyle.color,
      defaultBadgeDisplay: defaultBadgeStyle.display,
      defaultBadgePadding: defaultBadgeStyle.padding,
      disabledPullRequestColor: disabledPullRequestStyle.color,
      headRowBackground: headRowStyle.backgroundColor,
      openStateDotBackground: openDotStyle.backgroundColor,
      openStateDotBorderRadius: openDotStyle.borderRadius,
      openStateDotHeight: openDotStyle.height,
      openStateDotMarginRight: openDotStyle.marginRight,
      openStateDotWidth: openDotStyle.width,
      pullRequestPaddingTop: pullRequestStyle.paddingTop,
      pullRequestWidth: pullRequestStyle.width,
      rowBorderBottomWidth: secondRowStyle.borderBottomWidth,
      tableHeaderBackground: headerStyle.backgroundColor,
      tableHeaderBorderBottomWidth: headerStyle.borderBottomWidth,
      tableHeaderFontSize: headerStyle.fontSize,
      tableHeaderLineHeight: headerStyle.lineHeight,
      tableWidthPercent,
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
