import { expect, test, type Page } from "../wtr-compat.ts";

test("project code file history preserves dates, navigation and commit interactions", async ({
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
  await expect(page.locator("#history .tbody .date")).toHaveText("2001-07-01");
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
  await expect(page.locator('#yobiToasts [data-part="toast-message"]')).toHaveText(
    "Commit ID is copied",
  );
  // the route renders the float via the data-owner CSS (pull-left retired),
  // so the class is plain ybtn while the float rule owns the layout.
  await assertLegacyAnchorNoActiveMarkers(page.locator(".actrow a", { hasText: "Newer" }), {
    className: "ybtn",
    href: `${basePath}/admin/sample/commits/main/README.md?page=1`,
    text: "Newer",
  });
  await assertLegacyAnchorNoActiveMarkers(page.locator(".actrow a", { hasText: "Older" }), {
    className: "ybtn",
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
  await expect(page.locator("#breadcrumbs a")).toHaveText(["sample", "docs", "guide", "README.md"]);
  await expect(page.locator("#history .commit-id a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main&path=docs%2Fguide%2FREADME.md#docs-guide-README-md`,
  );
  await expect(page.locator("#history .browse a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/abcdef1/docs/guide/README.md`,
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
            authorDate: "2001-07-01T12:00:00",
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
  await expect(page.locator("[data-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");

  const currentUrl = `${basePath}/admin/sample/commits/main/README.md?page=2`;
  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeButtons = page.locator('[data-owner="global-gnb-search-scope-item"] > button');
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
    const navbar = document.querySelector("[data-owner=global-gnb-outer]");
    const form = document.querySelector(".gnb-search-form");
    const searchBox = document.querySelector('[data-owner="global-gnb-search-box"]');
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
    const newer = document.querySelector(
      '.actrow a[data-owner="commit-file-history-pagination-newer"]',
    );
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
