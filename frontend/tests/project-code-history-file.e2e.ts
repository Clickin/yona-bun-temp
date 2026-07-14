import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_HISTORY_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><div id="breadcrumbs" class="code-breadcrumb-wrap"><a href="__BASE_PATH__/admin/sample/commits/main">sample</a><a href="__BASE_PATH__/admin/sample/commits/main/README.md">README.md</a></div><div id="history" class="commit-wrap"><table class="code-table commits mt10"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="browse"></td><td class="date"><strong>Author Date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="abcdef1234567890"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=README.md#README-md" title="View commit">abcdef1</a></td><td class="messages"><span class="number-of-comments"><i class="yobicon-comments"></i> 2</span><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=README.md#README-md" class="commitMsg short">Initial commit</a><button type="button" class="commitMsg moreBtn"><span>…</span></button><pre class="commitMsg desc hidden">Add README</pre></td><td class="browse"><a href="__BASE_PATH__/admin/sample/code/abcdef1/README.md" title="Browse code at this point" class="ybtn">Browse code</a></td><td class="date">Jul 1, 2026</td><td class="author"><a href="__BASE_PATH__/admin" class="avatar-wrap" title="admin"><img src="/assets/images/default-avatar-32.png"></a></td></tr></tbody></table></div></div><div class="actrow margin-top-20"><a href="__BASE_PATH__/admin/sample/commits/main/README.md?page=1" class="ybtn pull-left">Newer</a><a href="__BASE_PATH__/admin/sample/commits/main/README.md?page=3" class="ybtn pull-left">Older</a></div></div></div></div>
`;

const EXPECTED_HISTORY_NESTED_FILE_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><div id="breadcrumbs" class="code-breadcrumb-wrap"><a href="__BASE_PATH__/admin/sample/commits/main">sample</a><a href="__BASE_PATH__/admin/sample/commits/main/docs">docs</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide">guide</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.md">README.md</a></div><div id="history" class="commit-wrap"><table class="code-table commits mt10"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="browse"></td><td class="date"><strong>Author Date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="abcdef1234567890"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=docs%2Fguide%2FREADME.md#docs-guide-README-md" title="View commit">abcdef1</a></td><td class="messages"><span class="number-of-comments"><i class="yobicon-comments"></i> 2</span><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main&amp;path=docs%2Fguide%2FREADME.md#docs-guide-README-md" class="commitMsg short">Initial commit</a><button type="button" class="commitMsg moreBtn"><span>…</span></button><pre class="commitMsg desc hidden">Add README</pre></td><td class="browse"><a href="__BASE_PATH__/admin/sample/code/abcdef1/docs/guide/README.md" title="Browse code at this point" class="ybtn">Browse code</a></td><td class="date">Jul 1, 2026</td><td class="author"><a href="__BASE_PATH__/admin" class="avatar-wrap" title="admin"><img src="/assets/images/default-avatar-32.png"></a></td></tr></tbody></table></div></div><div class="actrow margin-top-20"><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.md?page=1" class="ybtn pull-left">Newer</a><a href="__BASE_PATH__/admin/sample/commits/main/docs/guide/README.md?page=3" class="ybtn pull-left">Older</a></div></div></div></div>
`;

test("project code file history matches legacy code/history.scala.html path DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequests: string[] = [];
  await mockProjectCodeFileHistory(page, historyRequests, "README.md");

  await page.goto(`${basePath}/admin/sample/commits/main/README.md?page=2`);
  await assertProjectSearchShell(page, basePath);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator("#history .code-table.commits.mt10 tbody tr")).toHaveCount(1);
  expect(historyRequests).toEqual(["branch=main&page=2&path=README.md"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_HISTORY_FILE_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  await assertLegacyHistoryFileLayout(page);

  await expect(page.locator("#breadcrumbs a").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/main`,
  );
  await assertLegacyAnchorNoActiveMarkers(page.locator("#breadcrumbs a").first(), {
    href: `${basePath}/admin/sample/commits/main`,
    text: "sample",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#breadcrumbs a").nth(1), {
    href: `${basePath}/admin/sample/commits/main/README.md`,
    text: "README.md",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .commit-id a"), {
    href: `${basePath}/admin/sample/commit/abcdef1234567890?branch=main&path=README.md#README-md`,
    text: "abcdef1",
    title: "View commit",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .messages a.commitMsg.short"), {
    className: "commitMsg short",
    href: `${basePath}/admin/sample/commit/abcdef1234567890?branch=main&path=README.md#README-md`,
    text: "Initial commit",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .browse a"), {
    className: "ybtn",
    href: `${basePath}/admin/sample/code/abcdef1/README.md`,
    text: "Browse code",
    title: "Browse code at this point",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator("#history .author a.avatar-wrap"), {
    className: "avatar-wrap",
    href: `${basePath}/admin`,
    title: "admin",
  });
  await expect(page.locator("#history [data-placement]")).toHaveCount(0);
  await expect(page.locator("#history .author a.avatar-wrap")).not.toHaveAttribute(
    "data-toggle",
    /.*/u,
  );
  const commitMessageDesc = page.locator("#history .messages pre.commitMsg.desc");
  await expect(page.locator("#history .messages button.commitMsg.moreBtn")).toHaveCount(1);
  await expect(commitMessageDesc).toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
  const beforeExpansionUrl = page.url();
  await page.locator("#history .messages button.commitMsg.moreBtn").click();
  await expect(commitMessageDesc).not.toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
  await expect(commitMessageDesc).toHaveText("Add README");
  await expect(page).toHaveURL(beforeExpansionUrl);
  await page.locator("#history .messages button.commitMsg.moreBtn").click();
  await expect(commitMessageDesc).toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
  await expect(page).toHaveURL(beforeExpansionUrl);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(text: string) {
          (window as typeof window & { __copiedCommitId?: string }).__copiedCommitId = text;
          return Promise.resolve();
        },
      },
    });
  });
  await page.locator("#history .tbody .commit-id").hover();
  await page.locator("#history .btn-copy-commitId").click();
  await expect(
    page.evaluate(() => (window as typeof window & { __copiedCommitId?: string }).__copiedCommitId),
  ).resolves.toBe("abcdef1234567890");
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText("Commit ID is copied");
  await assertLegacyAnchorNoActiveMarkers(page.locator(".actrow a", { hasText: "Newer" }), {
    className: "ybtn pull-left",
    href: `${basePath}/admin/sample/commits/main/README.md?page=1`,
    text: "Newer",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator(".actrow a", { hasText: "Older" }), {
    className: "ybtn pull-left",
    href: `${basePath}/admin/sample/commits/main/README.md?page=3`,
    text: "Older",
  });

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "code-history-file";
  });
  await page.locator(".actrow a", { hasText: "Older" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/commits/main/README.md?page=3`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("code-history-file");
  expect(historyRequests).toEqual([
    "branch=main&page=2&path=README.md",
    "branch=main&page=3&path=README.md",
  ]);
});

test("project code file history keeps nested legacy path segments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequests: string[] = [];
  await mockProjectCodeFileHistory(page, historyRequests, "docs/guide/README.md");

  await page.goto(`${basePath}/admin/sample/commits/main/docs/guide/README.md?page=2`);
  await expect(page.locator("#history .code-table.commits.mt10 tbody tr")).toHaveCount(1);
  expect(historyRequests).toEqual(["branch=main&page=2&path=docs%2Fguide%2FREADME.md"]);
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_HISTORY_NESTED_FILE_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project code file history omits author tooltip placement marker but keeps metadata", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequests: string[] = [];
  await mockProjectCodeFileHistory(page, historyRequests, "README.md");

  await page.goto(`${basePath}/admin/sample/commits/main/README.md?page=2`);

  await expect(page.locator("#history .code-table.commits.mt10 tbody tr")).toHaveCount(1);
  expect(historyRequests).toEqual(["branch=main&page=2&path=README.md"]);
  await expect(page.locator("#history .commit-id a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main&path=README.md#README-md`,
  );
  await expect(page.locator("#history .browse a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/abcdef1/README.md`,
  );
  await expect(page.locator("#history .browse a")).toHaveAttribute(
    "title",
    "Browse code at this point",
  );
  await expect(page.locator("#history .browse a")).toHaveText("Browse code");

  const authorAvatar = page.locator("#history .author a.avatar-wrap");
  await expect(authorAvatar).toHaveAttribute("href", `${basePath}/admin`);
  await expect(authorAvatar).toHaveAttribute("class", "avatar-wrap");
  await expect(authorAvatar).toHaveAttribute("title", "admin");
  await expect(authorAvatar).not.toHaveAttribute("data-placement", /.*/u);
  await expect(authorAvatar).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(page.locator("#history [data-placement]")).toHaveCount(0);
});

test("project code file history uses legacy anonymous author message", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequests: string[] = [];
  await mockProjectCodeFileHistory(page, historyRequests, "README.md", {
    commits: [
      {
        authorAvatarUrl: null,
        authorDate: "Jul 2, 2026",
        authorEmail: null,
        authorLoginId: null,
        authorName: null,
        commentCount: 0,
        commitId: "1234567890abcdef",
        commitShortId: "1234567",
        message: "Anonymous update",
        shortMessage: "Anonymous update",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/commits/main/README.md?page=2`);

  await expect(page.locator("#history .code-table.commits.mt10 tbody tr")).toHaveCount(1);
  expect(historyRequests).toEqual(["branch=main&page=2&path=README.md"]);
  await expect(page.locator("#history .author span")).toHaveText("Anonymous");
  await expect(page.locator("#history .author .avatar-wrap")).toHaveCount(0);
});

test("project code file history route uses TanStack Link for internal anchors", () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/commits/$branch/$filePath.tsx",
    "utf8",
  );
  const legacyMessages = readFileSync("../yona-original/conf/messages", "utf8");
  const removedAdapterName = ["legacy", "Inactive", "Link", "Options"].join("");

  expect(routeSource).not.toMatch(/<a\b/u);
  expect(routeSource).not.toContain("commitHref(");
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).not.toContain("projectHref(");
  expect(routeSource).not.toContain(removedAdapterName);
  expect(routeSource).not.toContain("setAttribute");
  expect(routeSource).not.toContain("removeAttribute");
  expect(routeSource).not.toMatch(/\$\s*\(/u);
  expect(routeSource).not.toContain("document.");
  expect(routeSource).not.toContain("querySelector");
  expect(routeSource).not.toContain("classList");
  expect(routeSource).not.toContain("style.display");
  expect(routeSource).not.toContain("toggleClass");
  expect(routeSource).not.toContain('data-toggle="tooltip"');
  expect(routeSource).not.toContain("data-placement");
  expect(routeSource).not.toContain("activeProps={{ className: undefined }}");
  expect(routeSource).toContain('t("user.role.anonymous")');
  expect(routeSource).not.toContain('commit.authorName || "Anonymous"');
  expect(routeSource).not.toContain("commit.authorName || 'Anonymous'");
  expect(legacyMessages).toMatch(/^user\.role\.anonymous = Anonymous$/mu);
  expect(routeSource).toContain('import { useRef, useState } from "react"');
  expect(routeSource).toContain('import { useRootToast } from "../../../../__root"');
  expect(routeSource).toContain("const [isExpanded, setIsExpanded] = useState(false)");
  expect(routeSource).toContain("onClick={() => setIsExpanded((current) => !current)}");
  expect(routeSource).toContain("await navigator.clipboard?.writeText(commit.commitId)");
  expect(routeSource).toContain("copyToastCounterRef.current += 1");
  expect(routeSource).toContain('message: t("code.copyCommitId.copied")');
  expect(routeSource).toContain("<span>…</span>");
  expect(routeSource).toContain('className={`commitMsg desc${isExpanded ? "" : " hidden"}`}');
  expect(routeSource).toContain("legacy default avatar branch renders no alt/size attributes");
  expect(routeSource).toContain(
    "legacy email-only default avatar branch renders no alt/size attributes",
  );
  expect(routeSource).toContain("projectSearchScope={projectSearchScope}");
  expect(routeSource).toContain("projectSearchScopeOrganizationName(projectQuery.data, ownerName)");
  expect(routeSource).toContain('import { Link, createFileRoute } from "@tanstack/react-router"');
  expect(
    routeSource.match(
      /activeOptions=\{\{\s*exact: true,\s*includeHash: true,\s*includeSearch: true,?\s*\}\}/gu,
    ),
  ).toHaveLength(8);
  expect(routeSource.match(/activeProps=\{legacyActiveMarkerSuppressionProps\}/gu)).toHaveLength(8);
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('"data-status": undefined');
});

async function mockProjectCodeFileHistory(
  page: Page,
  historyRequests: string[],
  filePath: string,
  options: {
    commits?: Array<{
      authorAvatarUrl: string | null;
      authorDate: string;
      authorEmail: string | null;
      authorLoginId: string | null;
      authorName: string | null;
      commentCount: number;
      commitId: string;
      commitShortId: string;
      message: string;
      shortMessage: string;
    }>;
  } = {},
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
        isProtected: true,
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
        organizationName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/commits**", async (route) => {
    const url = new URL(route.request().url());
    historyRequests.push(url.searchParams.toString());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: breadcrumbsFor(filePath),
        commits: options.commits ?? [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorDate: "Jul 1, 2026",
            authorEmail: "admin@example.com",
            authorLoginId: "admin",
            authorName: "Site Admin",
            commentCount: 2,
            commitId: "abcdef1234567890",
            commitShortId: "abcdef1",
            message: "Initial commit\nAdd README",
            shortMessage: "Initial commit",
          },
        ],
        hasNewer: true,
        hasOlder: true,
        noHead: false,
        ownerName: "admin",
        page: 2,
        path: filePath,
        projectName: "sample",
        selectedBranch: "main",
      }),
    });
  });
}

async function assertProjectSearchShell(page: Page, basePath: string) {
  await expect(page.locator(".gnb-outer.project-header")).toHaveCount(1);
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");

  const currentUrl = `${basePath}/admin/sample/commits/main/README.md?page=2`;
  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeButtons = page.locator('[data-stylex-owner="global-gnb-search-scope-item"] > button');
  const projectScope = scopeButtons.filter({ hasText: "This Project" });
  const groupScope = scopeButtons.filter({ hasText: "This Group" });
  const allScope = scopeButtons.filter({ hasText: "All Projects" });
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await groupScope.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expect(scopeToggle).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );
  await expect(page).toHaveURL(currentUrl);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await allScope.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expect(scopeToggle).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(currentUrl);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await projectScope.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expect(scopeToggle).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page).toHaveURL(currentUrl);

  const boxes = await page.evaluate(() => {
    const navbar = document.querySelector(".gnb-outer.project-header");
    const form = document.querySelector(".gnb-search-form");
    const searchBox = document.querySelector('[data-stylex-owner="global-gnb-search-box"]');
    const scopeButton = document.querySelector("#gnb-search-scope-title");
    if (!navbar || !form || !searchBox || !scopeButton) {
      return null;
    }
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    };
    return {
      form: rect(form),
      navbar: rect(navbar),
      scopeButton: rect(scopeButton),
      searchBox: rect(searchBox),
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.form.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.form.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.form.right).toBeLessThanOrEqual(boxes!.navbar.right);
  expect(boxes!.scopeButton.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.scopeButton.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.searchBox.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
  expect(boxes!.searchBox.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
  expect(boxes!.scopeButton.right).toBeLessThanOrEqual(boxes!.searchBox.left + 1);
  expect(boxes!.searchBox.right).toBeLessThanOrEqual(boxes!.form.right);
}

async function assertLegacyHistoryFileLayout(page: Page) {
  const boxes = await page.evaluate(() => {
    const codeWrap = document.querySelector(".code-browse-wrap");
    const breadcrumbs = document.querySelector("#breadcrumbs.code-breadcrumb-wrap");
    const history = document.querySelector("#history.commit-wrap");
    const table = document.querySelector("#history table.code-table.commits.mt10");
    const headerCommitId = document.querySelector("#history .thead .commit-id");
    const headerMessages = document.querySelector("#history .thead .messages");
    const headerBrowse = document.querySelector("#history .thead .browse");
    const headerDate = document.querySelector("#history .thead .date");
    const headerAuthor = document.querySelector("#history .thead .author");
    const commitId = document.querySelector("#history .tbody .commit-id");
    const messages = document.querySelector("#history .tbody .messages");
    const commentCount = document.querySelector("#history .number-of-comments");
    const browse = document.querySelector("#history .tbody .browse");
    const date = document.querySelector("#history .tbody .date");
    const author = document.querySelector("#history .tbody .author");
    const avatar = document.querySelector("#history .author .avatar-wrap");
    const actrow = document.querySelector(".bubble-wrap.repo-wrap > .actrow.margin-top-20");
    const newer = document.querySelector(".actrow a.ybtn.pull-left");
    const required = {
      actrow,
      author,
      avatar,
      breadcrumbs,
      browse,
      codeWrap,
      commentCount,
      commitId,
      date,
      headerAuthor,
      headerBrowse,
      headerCommitId,
      headerDate,
      headerMessages,
      history,
      messages,
      newer,
      table,
    };
    const missing = Object.entries(required)
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected history file layout targets are missing: ${missing.join(", ")}`);
    }
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    };
    return Object.fromEntries(
      Object.entries(required).map(([name, element]) => [name, rect(element as Element)]),
    );
  });

  expect(boxes.breadcrumbs.left).toBeGreaterThanOrEqual(boxes.codeWrap.left);
  expect(boxes.breadcrumbs.top).toBeGreaterThanOrEqual(boxes.codeWrap.top);
  expect(boxes.table.top).toBeGreaterThanOrEqual(boxes.breadcrumbs.bottom - 1);
  expect(boxes.table.left).toBeCloseTo(boxes.codeWrap.left, 0);
  expect(boxes.table.right).toBeLessThanOrEqual(boxes.codeWrap.right + 1);
  expect(boxes.headerCommitId.left).toBeCloseTo(boxes.commitId.left, 0);
  expect(boxes.headerMessages.left).toBeCloseTo(boxes.messages.left, 0);
  expect(boxes.headerBrowse.left).toBeCloseTo(boxes.browse.left, 0);
  expect(boxes.headerDate.left).toBeCloseTo(boxes.date.left, 0);
  expect(boxes.headerAuthor.left).toBeCloseTo(boxes.author.left, 0);
  expect(boxes.commitId.right).toBeLessThanOrEqual(boxes.messages.left + 1);
  expect(boxes.messages.right).toBeLessThanOrEqual(boxes.browse.left + 1);
  expect(boxes.commentCount.left).toBeGreaterThanOrEqual(boxes.messages.left);
  expect(boxes.commentCount.right).toBeLessThanOrEqual(boxes.messages.right);
  expect(boxes.browse.right).toBeLessThanOrEqual(boxes.date.left + 1);
  expect(boxes.date.right).toBeLessThanOrEqual(boxes.author.left + 1);
  expect(boxes.avatar.right).toBeLessThanOrEqual(boxes.author.right);
  expect(boxes.actrow.top).toBeGreaterThanOrEqual(boxes.history.bottom);
  expect(boxes.newer.left).toBeCloseTo(boxes.actrow.left, 0);
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

async function assertLegacyAnchorNoActiveMarkers(
  locator: ReturnType<Page["locator"]>,
  expected: {
    className?: string;
    href: string;
    text?: string;
    title?: string;
  },
) {
  await expect(locator).toHaveAttribute("href", expected.href);
  if (expected.text !== undefined) {
    await expect(locator).toHaveText(expected.text);
  }
  if (expected.className !== undefined) {
    await expect(locator).toHaveAttribute("class", expected.className);
  } else {
    await expect(locator).not.toHaveAttribute("class", /.*/u);
  }
  if (expected.title !== undefined) {
    await expect(locator).toHaveAttribute("title", expected.title);
  } else {
    await expect(locator).not.toHaveAttribute("title", /.*/u);
  }
  await expect(locator).not.toHaveAttribute("aria-current", /.*/u);
  await expect(locator).not.toHaveAttribute("data-status", /.*/u);
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
