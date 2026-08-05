import { expect, test, type Locator, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const ROUTE_SOURCE_PATH = "src/routes/$ownerName/$projectName/commits/$branch.tsx";
const BARE_ROUTE_SOURCE_PATH = "src/routes/$ownerName/$projectName/commits.tsx";
const LEGACY_HISTORY_SOURCE_PATH = "../yona-original/app/views/code/history.scala.html";
const LEGACY_SELECT2_SOURCE_PATH = "../yona-original/app/views/common/select2.scala.html";
const LEGACY_MESSAGES_SOURCE_PATH = "../yona-original/conf/messages";
const LEGACY_ROUTES_SOURCE_PATH = "../yona-original/conf/routes";
const LEGACY_CONTROLLER_SOURCE_PATH = "../yona-original/app/controllers/CodeHistoryApp.java";

const EXPECTED_HISTORY_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><select id="branches" data-format="branch" data-dropdown-css-class="branches" class="pull-right"><option value="__BASE_PATH__/admin/sample/commits/main" selected="">main</option><option value="__BASE_PATH__/admin/sample/commits/feature%2Frelease">feature/release</option></select><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code/main">Files</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/commits/main">Commit</a></li><li><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><div id="history" class="commit-wrap"><table class="code-table commits"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="date"><strong>Author Date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="abcdef1234567890"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main" title="View commit">abcdef1</a></td><td class="messages"><span class="number-of-comments"><i class="yobicon-comments"></i> 2</span><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main" class="commitMsg short">Initial commit</a><button type="button" class="commitMsg moreBtn"><span>…</span></button><pre class="commitMsg desc hidden">Add README</pre></td><td class="date">Jul 1, 2026</td><td class="author"><a href="__BASE_PATH__/admin" class="avatar-wrap" title="admin"><img src="/assets/images/default-avatar-32.png"></a></td></tr><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="1234567890abcdef"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main" title="View commit">1234567</a></td><td class="messages"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main" class="commitMsg short">Second commit</a></td><td class="date">Jul 2, 2026</td><td class="author"><span class="avatar-wrap" title="dev@example.com"><img src="/assets/images/default-avatar-32.png"></span></td></tr></tbody></table></div></div><div class="actrow margin-top-20"><a href="__BASE_PATH__/admin/sample/commits/main?page=2" class="ybtn pull-left">Older</a></div></div></div></div>
`;

test("project code history matches legacy code/history.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeHistory(page);

  await page.goto(`${basePath}/admin/sample/commits/main`);
  await expect(page).toHaveTitle("Commit history - admin/sample");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator("#history .code-table.commits tbody tr")).toHaveCount(2);
  const filesTabLink = page.locator(".nav-tabs a", { hasText: "Files" });
  const commitsTabLink = page.locator(".nav-tabs a", { hasText: "Commit" });
  const branchesTabLink = page.locator(".nav-tabs a", { hasText: "Branches" });
  const commitIdLink = page.locator(".commit-id a", { hasText: "abcdef1" });
  const commitMessageLink = page.locator(".messages a.commitMsg.short", {
    hasText: "Initial commit",
  });
  const authorAvatarLink = page.locator(".author a.avatar-wrap");
  const olderPagerLink = page.locator(".actrow a.ybtn", { hasText: "Older" });
  const branchSelector = page.locator("#branches");
  await expect(branchSelector).not.toHaveAttribute("data-toggle", "select2");
  await expect(branchSelector).toHaveAttribute("data-format", "branch");
  await expect(branchSelector).toHaveAttribute("data-dropdown-css-class", "branches");
  await expect(branchSelector).toHaveClass("pull-right");
  await expect(branchSelector.locator("option")).toHaveCount(2);
  await expect(branchSelector.locator("option").nth(0)).toHaveAttribute(
    "value",
    `${basePath}/admin/sample/commits/main`,
  );
  await expect(branchSelector.locator("option").nth(1)).toHaveAttribute(
    "value",
    `${basePath}/admin/sample/commits/feature%2Frelease`,
  );
  await expect(filesTabLink).toHaveText("Files");
  await expect(filesTabLink).toHaveAttribute("href", `${basePath}/admin/sample/code/main`);
  await expect(filesTabLink).not.toHaveAttribute("class", /.*/u);
  await expect(filesTabLink).not.toHaveAttribute("title", /.*/u);
  await expectNoTanStackActiveMarkers(filesTabLink);
  await expect(commitsTabLink).toHaveText("Commit");
  await expect(commitsTabLink).toHaveAttribute("href", `${basePath}/admin/sample/commits/main`);
  await expect(commitsTabLink).not.toHaveAttribute("class", /.*/u);
  await expect(commitsTabLink).not.toHaveAttribute("title", /.*/u);
  await expectNoTanStackActiveMarkers(commitsTabLink);
  await expect(branchesTabLink).toHaveText("Branches");
  await expect(branchesTabLink).toHaveAttribute("href", `${basePath}/admin/sample/branches`);
  await expect(branchesTabLink).not.toHaveAttribute("class", /.*/u);
  await expect(branchesTabLink).not.toHaveAttribute("title", /.*/u);
  await expectNoTanStackActiveMarkers(branchesTabLink);
  await expect(commitIdLink).toHaveText("abcdef1");
  await expect(commitIdLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main`,
  );
  await expect(commitIdLink).not.toHaveAttribute("class", /.*/u);
  await expect(commitIdLink).toHaveAttribute("title", "View commit");
  await expectNoTanStackActiveMarkers(commitIdLink);
  await expect(commitMessageLink).toHaveText("Initial commit");
  await expect(commitMessageLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890?branch=main`,
  );
  await expect(commitMessageLink).toHaveClass("commitMsg short");
  await expect(commitMessageLink).not.toHaveAttribute("title", /.*/u);
  await expectNoTanStackActiveMarkers(commitMessageLink);
  await expect(authorAvatarLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(authorAvatarLink).toHaveClass("avatar-wrap");
  await expect(page.locator('#history [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator("#history [data-placement]")).toHaveCount(0);
  await expect(authorAvatarLink).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(authorAvatarLink).not.toHaveAttribute("data-placement", /.*/u);
  await expect(authorAvatarLink).toHaveAttribute("title", "admin");
  await expectNoTanStackActiveMarkers(authorAvatarLink);
  await expect(page.locator(".author span.avatar-wrap")).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(page.locator(".author span.avatar-wrap")).not.toHaveAttribute(
    "data-placement",
    /.*/u,
  );
  await expect(page.locator(".author span.avatar-wrap")).toHaveAttribute(
    "title",
    "dev@example.com",
  );
  await expect(page.locator("#history tbody tr").nth(0).locator(".date")).toHaveText("Jul 1, 2026");
  await expect(page.locator("#history tbody tr").nth(1).locator(".date")).toHaveText("Jul 2, 2026");
  await expect(page.locator(".author .avatar-wrap img").first()).not.toHaveAttribute("width");
  await expect(page.locator(".author .avatar-wrap img").first()).not.toHaveAttribute("height");
  await expect(page.locator(".author .avatar-wrap img").first()).not.toHaveAttribute("alt");
  await expect(olderPagerLink).toHaveText("Older");
  await expect(olderPagerLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits/main?page=2`,
  );
  await expect(olderPagerLink).toHaveClass("ybtn pull-left");
  await expect(olderPagerLink).not.toHaveAttribute("title", /.*/u);
  await expectNoTanStackActiveMarkers(olderPagerLink);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_HISTORY_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await historyLayoutMetrics(page)).toEqual({
    authorLineHeight: "13.3333px",
    authorTextAlign: "right",
    authorWidth: 62,
    bodyCellPadding: "10px 15px 10px 5px",
    commitIdFontFamily: 'Consolas, Menlo, Monaco, "Ubuntu Mono", source-code-pro, monospace',
    commitIdFontSize: "12px",
    commitIdPadding: "12px 3px",
    commitIdPosition: "relative",
    commitIdTextAlign: "center",
    commitIdVerticalAlign: "top",
    commitIdWidth: 77,
    commitLinkColor: "rgb(81, 170, 204)",
    copyButtonDisplay: "none",
    dateFontSize: "12px",
    dateWidth: 120,
    descBackground: "rgba(0, 0, 0, 0)",
    descBorderLeftWidth: "3px",
    descBorderRadius: "0px",
    descColor: "rgb(102, 102, 102)",
    descFontSize: "12px",
    historyBackground: "rgb(255, 255, 255)",
    messagesVerticalAlign: "top",
    moreButtonBackground: "rgba(0, 0, 0, 0)",
    moreButtonBorderWidth: "0px",
    moreButtonLineHeight: "0px",
    moreButtonMarginLeft: "3px",
    moreButtonTop: "-1px",
    moreSpanBackground: "rgb(187, 187, 187)",
    moreSpanBorderRadius: "2px",
    moreSpanHeight: "12px",
    moreSpanLineHeight: "6px",
    moreSpanPadding: "2px 7px",
    shortFontSize: "14px",
    shortPadding: "5px",
    shortWhiteSpace: "pre-line",
    tableWidth: 1260,
  });
});

test("project code history uses legacy project-scoped GNB search shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyPageUrl = `${basePath}/admin/sample/commits/main`;
  await mockProjectCodeHistory(page, {
    project: { isProtected: true, organizationName: "admin" },
  });

  await page.goto(historyPageUrl);
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");

  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeButtons = page.locator('[data-stylex-owner="global-gnb-search-scope-item"] > button');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(1).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expectHistoryRoutePath(page, historyPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(2).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expectHistoryRoutePath(page, historyPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(0).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expectHistoryRoutePath(page, historyPageUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");

  const metrics = await historyNavbarMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.form.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.form.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.form.right).toBeLessThanOrEqual(metrics!.navbar.right);
  expect(metrics!.scope.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.scope.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.searchBox.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.searchBox.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.input.left).toBeGreaterThanOrEqual(metrics!.searchBox.left);
  expect(metrics!.input.right).toBeLessThanOrEqual(metrics!.searchBox.right);
  expect(metrics!.menu.top).toBeGreaterThanOrEqual(metrics!.projectHeader.bottom - 1);
});

test("project code history branch route uses legacy anonymous author message", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeHistory(page, {
    includeAnonymousCommit: true,
  });

  await page.goto(`${basePath}/admin/sample/commits/main`);

  await expect(page.locator("#history .code-table.commits tbody tr")).toHaveCount(3);
  await expect(
    page.locator("#history .code-table.commits tbody tr").nth(2).locator(".author"),
  ).toHaveText("Anonymous");
});

test("project file code history keeps legacy breadcrumbs and file-history table structure", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeHistory(page);

  await page.goto(`${basePath}/admin/sample/commits/main/docs/README.md`);

  await expect(page).toHaveTitle("Commit history - admin/sample");
  await expect(page.locator(".project-menu-gruop > .code-menu .menu-name").first()).toHaveText(
    "Code",
  );
  await expect(page.locator("#breadcrumbs.code-breadcrumb-wrap a")).toHaveText([
    "sample",
    "docs",
    "README.md",
  ]);
  await expect(page.locator(".code-browse-wrap > .nav-tabs")).toHaveCount(0);
  await expect(page.locator("#history .code-table.commits")).toHaveClass(/mt10/);
  await expect(page.locator("#history .code-table.commits thead .browse")).toHaveCount(1);
  await expect(page.locator("#history tbody tr .browse .ybtn").first()).toHaveText("Browse code");
  await expect(page.locator("#history tbody tr .browse .ybtn").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/abcdef1/docs/README.md`,
  );
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer")).toHaveCount(1);
});

test("project bare code history renders default branch on the legacy commits URL", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequestUrls: string[] = [];
  await mockProjectCodeHistory(page, {
    includeAnonymousCommit: true,
    onHistoryRequest: (requestUrl) => historyRequestUrls.push(requestUrl.href),
  });

  await page.goto(`${basePath}/admin/sample/commits`);

  await expect(page).toHaveURL(`${basePath}/admin/sample/commits`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator("#history .code-table.commits tbody tr")).toHaveCount(3);
  await expect(
    page.locator("#history .code-table.commits tbody tr").nth(2).locator(".author"),
  ).toHaveText("Anonymous");
  expect(historyRequestUrls).toHaveLength(1);
  const historyRequest = new URL(historyRequestUrls[0]);
  expect(historyRequest.searchParams.get("branch")).toBeNull();
  expect(historyRequest.searchParams.get("path")).toBeNull();
  const branchSelector = page.locator("#branches");
  await expect(branchSelector).not.toHaveAttribute("data-toggle", "select2");
  await expect(branchSelector).toHaveAttribute("data-format", "branch");
  await expect(branchSelector).toHaveAttribute("data-dropdown-css-class", "branches");
  await expect(branchSelector).toHaveClass(/pull-right/);
  await expect(branchSelector.locator("option")).toHaveCount(2);
  await expect(branchSelector.locator("option").nth(0)).toHaveAttribute(
    "value",
    `${basePath}/admin/sample/commits/main/`,
  );
  await expect(branchSelector.locator("option").nth(1)).toHaveAttribute(
    "value",
    `${basePath}/admin/sample/commits/feature%2Frelease/`,
  );
  await expect(branchSelector).toHaveValue(`${basePath}/admin/sample/commits/main/`);
  await expect(page.locator(".nav-tabs a", { hasText: "Files" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/HEAD`,
  );
  await expect(page.locator(".nav-tabs a", { hasText: "Commit" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits`,
  );
  await expect(page.locator(".commit-id a", { hasText: "abcdef1" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890`,
  );
  await expect(page.locator("#history tbody tr").nth(0).locator(".date")).toHaveText("Jul 1, 2026");
  await expect(page.locator("#history tbody tr").nth(1).locator(".date")).toHaveText("Jul 2, 2026");
  await expect(page.locator('#history [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator("#history [data-placement]")).toHaveCount(0);
  const authorAvatarLink = page.locator(".author a.avatar-wrap");
  const emailAuthorAvatar = page.locator(".author span.avatar-wrap");
  await expect(authorAvatarLink).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(authorAvatarLink).not.toHaveAttribute("data-placement", /.*/u);
  await expect(authorAvatarLink).toHaveAttribute("href", `${basePath}/admin`);
  await expect(authorAvatarLink).toHaveAttribute("title", "admin");
  await expect(authorAvatarLink.locator("img")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-32.png",
  );
  await expect(emailAuthorAvatar).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(emailAuthorAvatar).not.toHaveAttribute("data-placement", /.*/u);
  await expect(emailAuthorAvatar).toHaveAttribute("title", "dev@example.com");
  await expect(emailAuthorAvatar.locator("img")).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-32.png",
  );
  await expect(
    page.locator(".messages a.commitMsg.short", { hasText: "Initial commit" }),
  ).toHaveAttribute("href", `${basePath}/admin/sample/commit/abcdef1234567890`);
  await expect(page.locator(".actrow a.ybtn", { hasText: "Older" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commits?page=2`,
  );

  const boxes = await page.evaluate(() => {
    const tabs = document.querySelector<HTMLElement>(".code-browse-wrap .nav-tabs");
    const history = document.querySelector<HTMLElement>("#history.commit-wrap");
    const table = document.querySelector<HTMLElement>("#history .code-table.commits");
    const older = document.querySelector<HTMLElement>(".actrow .ybtn");
    if (!tabs || !history || !table || !older) return null;
    const tabBox = tabs.getBoundingClientRect();
    const historyBox = history.getBoundingClientRect();
    const tableBox = table.getBoundingClientRect();
    const olderBox = older.getBoundingClientRect();
    return {
      historyLeft: Math.round(historyBox.left),
      historyTop: Math.round(historyBox.top),
      olderTop: Math.round(olderBox.top),
      tableLeft: Math.round(tableBox.left),
      tabBottom: Math.round(tabBox.bottom),
    };
  });
  expect(boxes).not.toBeNull();
  expect(boxes!.historyLeft).toBe(boxes!.tableLeft);
  expect(boxes!.historyTop - boxes!.tabBottom).toBe(20);
  expect(boxes!.olderTop).toBeGreaterThan(boxes!.historyTop);
});

test("project trailing-slash history replaces to the canonical legacy commits URL", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequestUrls: string[] = [];
  await mockProjectCodeHistory(page, {
    onHistoryRequest: (requestUrl) => historyRequestUrls.push(requestUrl.href),
  });

  await page.goto(`${basePath}/admin/sample/commits/?page=2`);

  await expect(page).toHaveURL(`${basePath}/admin/sample/commits?page=2`);
  await expect(page.locator("#history .code-table.commits tbody tr")).toHaveCount(2);
  expect(historyRequestUrls).toHaveLength(1);
  const historyRequest = new URL(historyRequestUrls[0]);
  expect(historyRequest.searchParams.get("branch")).toBeNull();
  expect(historyRequest.searchParams.get("path")).toBeNull();
});

test("project bare code history uses legacy project-scoped GNB search shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyPageUrl = `${basePath}/admin/sample/commits`;
  await mockProjectCodeHistory(page, {
    project: { isProtected: true, organizationName: "admin" },
  });

  await page.goto(historyPageUrl);
  await expect(page).toHaveURL(historyPageUrl);
  await expect(page.locator("#history .code-table.commits tbody tr")).toHaveCount(2);
  await assertProjectCodeHistorySearchShell(page, {
    basePath,
    expectedPath: historyPageUrl,
    groupName: "admin",
    ownerName: "admin",
    projectName: "sample",
  });
});

test("org-owned project bare code history uses legacy group search scope", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyPageUrl = `${basePath}/weblabs/portal/commits`;
  await mockProjectCodeHistory(page, {
    ownerName: "weblabs",
    project: { isProtected: true, organizationName: "weblabs" },
    projectName: "portal",
  });

  await page.goto(historyPageUrl);
  await expect(page).toHaveURL(historyPageUrl);
  await expect(page.locator("#history .code-table.commits tbody tr")).toHaveCount(2);
  await assertProjectCodeHistorySearchShell(page, {
    basePath,
    expectedPath: historyPageUrl,
    groupName: "weblabs",
    ownerName: "weblabs",
    projectName: "portal",
  });
});

test("project code history multiline commit message disclosure toggles per row", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeHistory(page, {
    secondMessage: "Second commit\nKeep row scoped",
  });

  await page.goto(`${basePath}/admin/sample/commits/main`);
  const rows = page.locator("#history .code-table.commits tbody tr");
  const firstDesc = rows.nth(0).locator("pre.commitMsg.desc");
  const secondDesc = rows.nth(1).locator("pre.commitMsg.desc");

  await expect(rows.nth(0).locator("button.commitMsg.moreBtn")).toHaveCount(1);
  await expect(rows.nth(1).locator("button.commitMsg.moreBtn")).toHaveCount(1);
  await expect(firstDesc).toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
  await expect(secondDesc).toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
  await expect(rows.nth(0).locator("button.commitMsg.moreBtn span")).toHaveText("…");
  await expect(rows.nth(1).locator("button.commitMsg.moreBtn span")).toHaveText("…");

  await rows.nth(0).locator("button.commitMsg.moreBtn").click();
  await expect(firstDesc).not.toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
  await expect(secondDesc).toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);

  await rows.nth(0).locator("button.commitMsg.moreBtn").click();
  await expect(firstDesc).toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
  await expect(secondDesc).toHaveClass(/(?:^|\s)hidden(?:\s|$)/u);
});

test("project code history converted links navigate in the SPA", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeHistory(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("project-code-history-spa-marker", "alive");
  });

  await page.goto(`${basePath}/admin/sample/commits/main`);
  await page.locator(".actrow a.ybtn", { hasText: "Older" }).click();

  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/commits/main\\?page=2$`));
  await expect
    .poll(() =>
      page.evaluate(() => window.sessionStorage.getItem("project-code-history-spa-marker")),
    )
    .toBe("alive");
});

test("project code history branch selector navigates slash branch in the SPA", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeHistory(page);
  await page.addInitScript(() => {
    window.sessionStorage.setItem("project-code-history-branch-spa-marker", "alive");
  });

  await page.goto(`${basePath}/admin/sample/commits/main`);
  await page
    .locator("#branches")
    .selectOption(`${basePath}/admin/sample/commits/feature%2Frelease/`);

  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/commits/feature%2Frelease/$`));
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".nav-tabs a", { hasText: "Branches" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/branches`,
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.sessionStorage.getItem("project-code-history-branch-spa-marker")),
    )
    .toBe("alive");
});

test("project code history route source has no internal raw anchor patterns", () => {
  const source = readFileSync(ROUTE_SOURCE_PATH, "utf8");
  const bareSource = readFileSync(BARE_ROUTE_SOURCE_PATH, "utf8");
  const legacySource = readFileSync(LEGACY_HISTORY_SOURCE_PATH, "utf8");
  const legacySelect2Source = readFileSync(LEGACY_SELECT2_SOURCE_PATH, "utf8");
  const legacyMessagesSource = readFileSync(LEGACY_MESSAGES_SOURCE_PATH, "utf8");
  const legacyRoutesSource = readFileSync(LEGACY_ROUTES_SOURCE_PATH, "utf8");
  const legacyControllerSource = readFileSync(LEGACY_CONTROLLER_SOURCE_PATH, "utf8");

  expect(legacyMessagesSource).toContain("title.commitHistory = Commit history");
  expect(legacyMessagesSource).toContain("user.role.anonymous = Anonymous");
  expect(legacySource).toContain('@projectLayout(Messages("title.commitHistory"), project');
  expect(legacySource).toContain("<span>@User.anonymous.name</span>");
  expect(legacyRoutesSource).toContain(
    "GET            /:user/:project/commits                                                controllers.CodeHistoryApp.historyUntilHead(user, project)",
  );
  expect(legacyControllerSource).toContain("return history(ownerName, projectName, null, null);");
  expect(legacySource).toContain("@getHistoryURL(path)?page=@(page + 1)");
  expect(legacySource).toContain('queryString += "&path=" + path + "#"');
  expect(legacySource).toContain("routes.CodeHistoryApp.show");
  expect(legacySource).toContain(
    '<select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-right">',
  );
  expect(legacySelect2Source).toContain("javascripts/common/yobi.ui.Select2.js");
  expect(source).toContain("validateSearch(search): ProjectCodeHistorySearch");
  expect(source).toContain("return Number.isFinite(page) && page > 0 ? { page } : {};");
  expect(bareSource).toContain('id="branches"');
  expect(bareSource).not.toContain('id="branches"\n              data-toggle="select2"');
  expect(bareSource).toContain('data-format="branch"');
  expect(bareSource).toContain('data-dropdown-css-class="branches"');
  expect(bareSource).toContain("<ProjectCodeHistoryScreen project={projectQuery.data}");
  expect(bareSource).toMatch(/projectRoutePath\(\s*ownerName,\s*projectName,\s*"commit",/u);
  expect(bareSource).not.toContain('data-toggle="tooltip"');
  expect(bareSource).not.toContain("data-placement");
  expect(bareSource).toContain("title={commit.authorLoginId}");
  expect(bareSource).toContain("title={commit.authorEmail}");
  expect(bareSource).toContain('t("user.role.anonymous")');
  expect(bareSource).not.toContain('|| "Anonymous"');
  expect(bareSource).not.toContain("'Anonymous'");
  expect(bareSource).not.toContain("createLink");
  expect(bareSource).not.toMatch(/<a(?:\s|>)/u);
  expect(bareSource).not.toContain("</a>");
  expect(bareSource).not.toContain("href={projectHref");
  expect(bareSource).not.toContain("href={commitHref");
  expect(bareSource).not.toContain("setAttribute");
  expect(bareSource).not.toContain("removeAttribute");
  expect(bareSource).not.toContain("legacyInactiveLinkOptions");
  expect(bareSource).not.toMatch(/\bdocument\./u);
  expect(bareSource).not.toContain("addEventListener");
  expect(bareSource).not.toContain("classList");
  expect(bareSource).not.toContain("style.display");
  expect(bareSource).toContain("const legacyCodeHistoryLinkActiveOptions = {");
  expect(bareSource).toContain("explicitUndefined: true");
  expect(bareSource).toContain("const legacyCodeHistoryLinkActiveProps = {");
  expect(bareSource).toContain('"aria-current": undefined');
  expect(bareSource).toContain("className: undefined");
  expect(bareSource).toContain('"data-status": undefined');
  expect(bareSource.match(/activeOptions=\{legacyCodeHistoryLinkActiveOptions\}/gu)).toHaveLength(
    11,
  );
  expect(bareSource.match(/activeProps=\{legacyCodeHistoryLinkActiveProps\}/gu)).toHaveLength(11);
  expect(bareSource).not.toContain("activeProps={{ className: undefined }}");

  expect(bareSource).toContain('createFileRoute("/$ownerName/$projectName/commits")');
  expect(bareSource).toContain("<ProjectCodeHistoryTitle />");
  expect(bareSource).toContain("<Outlet />");
  expect(bareSource).toContain(
    '<title>{`${t("title.commitHistory")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(bareSource).toContain("<ProjectCodeHistoryScreen project={projectQuery.data}");
  expect(bareSource).toContain(
    'codeHistoryQueryOptions(runtimeConfig, { ownerName, page, path: "", projectName })',
  );
  expect(bareSource).toContain('id="branches"');
  expect(bareSource).not.toContain('data-toggle="select2"');
  expect(bareSource).not.toContain('data-toggle="tooltip"');
  expect(bareSource).not.toContain("data-placement");
  expect(bareSource).toContain('data-format="branch"');
  expect(bareSource).toContain('data-dropdown-css-class="branches"');
  expect(bareSource).toContain("title={commit.authorLoginId}");
  expect(bareSource).toContain("title={commit.authorEmail}");
  expect(bareSource).toContain('t("user.role.anonymous")');
  expect(bareSource).not.toContain('|| "Anonymous"');
  expect(bareSource).not.toContain("'Anonymous'");
  expect(bareSource).toContain('to="/$ownerName/$projectName/commits"');
  expect(bareSource).toContain(
    'params={{ branch: requestedBranch || "HEAD", ownerName, projectName }}',
  );
  expect(bareSource).not.toContain("historyUntilHead");
  expect(bareSource).not.toMatch(/<a(?:\s|>)/u);
  expect(bareSource).not.toContain("</a>");
  expect(bareSource).not.toMatch(/\bdocument\./u);
  expect(bareSource).not.toContain("globalThis.document");
  expect(bareSource).not.toMatch(/useEffect[\s\S]*document\.title/u);
  expect(bareSource).not.toMatch(/document\.title[\s\S]*=/u);
  expect(bareSource).not.toContain("addEventListener");
  expect(bareSource).not.toContain("classList");
  expect(bareSource).not.toContain("style.display");
  expect(bareSource).not.toContain("dangerouslySetInnerHTML");
  expect(bareSource.match(/activeOptions=\{legacyCodeHistoryLinkActiveOptions\}/gu)).toHaveLength(
    11,
  );
  expect(bareSource.match(/activeProps=\{legacyCodeHistoryLinkActiveProps\}/gu)).toHaveLength(11);
});

async function expectNoTanStackActiveMarkers(locator: Locator) {
  await expect(locator).not.toHaveAttribute("aria-current", /.*/u);
  await expect(locator).not.toHaveAttribute("data-status", /.*/u);
}

async function expectHistoryRoutePath(page: Page, expectedPath: string) {
  await expect.poll(() => new URL(page.url()).pathname).toBe(expectedPath);
}

async function assertProjectCodeHistorySearchShell(
  page: Page,
  input: {
    basePath: string;
    expectedPath: string;
    groupName: string;
    ownerName: string;
    projectName: string;
  },
) {
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toHaveCount(1);
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${input.basePath}/${input.ownerName}/${input.projectName}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");

  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeButtons = page.locator('[data-stylex-owner="global-gnb-search-scope-item"] > button');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(1).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expectHistoryRoutePath(page, input.expectedPath);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${input.basePath}/organizations/${input.groupName}/search`,
  );

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(2).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expectHistoryRoutePath(page, input.expectedPath);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${input.basePath}/search`,
  );

  await scopeToggle.click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "true");
  await scopeButtons.nth(0).click();
  await expect(scopeToggle).toHaveAttribute("aria-expanded", "false");
  await expectHistoryRoutePath(page, input.expectedPath);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${input.basePath}/${input.ownerName}/${input.projectName}/search`,
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");

  const metrics = await historyNavbarMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.form.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.form.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.form.right).toBeLessThanOrEqual(metrics!.navbar.right);
  expect(metrics!.scope.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.scope.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.searchBox.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.searchBox.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.input.left).toBeGreaterThanOrEqual(metrics!.searchBox.left);
  expect(metrics!.input.right).toBeLessThanOrEqual(metrics!.searchBox.right);
  expect(metrics!.menu.top).toBeGreaterThanOrEqual(metrics!.projectHeader.bottom - 1);
}

async function historyLayoutMetrics(page: Page) {
  return page.locator("#history.commit-wrap").evaluate((history) => {
    const table = history.querySelector<HTMLElement>(".code-table.commits");
    const bodyCell = history.querySelector<HTMLElement>(".tbody .messages");
    const commitId = history.querySelector<HTMLElement>(".tbody .commit-id");
    const commitLink = history.querySelector<HTMLElement>(".tbody .commit-id a");
    const copyButton = history.querySelector<HTMLElement>(".tbody .btn-copy-commitId");
    const messages = history.querySelector<HTMLElement>(".tbody .messages");
    const date = history.querySelector<HTMLElement>(".tbody .date");
    const author = history.querySelector<HTMLElement>(".tbody .author");
    const short = history.querySelector<HTMLElement>(".commitMsg.short");
    const moreButton = history.querySelector<HTMLElement>(".commitMsg.moreBtn");
    const moreSpan = history.querySelector<HTMLElement>(".commitMsg.moreBtn span");
    const desc = history.querySelector<HTMLElement>(".commitMsg.desc");
    const missing = Object.entries({
      author,
      bodyCell,
      commitId,
      commitLink,
      copyButton,
      date,
      desc,
      messages,
      moreButton,
      moreSpan,
      short,
      table,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected code history metric targets are missing: ${missing.join(", ")}`);
    }

    const authorStyle = window.getComputedStyle(author);
    const bodyCellStyle = window.getComputedStyle(bodyCell);
    const commitIdStyle = window.getComputedStyle(commitId);
    const dateStyle = window.getComputedStyle(date);
    const descStyle = window.getComputedStyle(desc);
    const moreButtonStyle = window.getComputedStyle(moreButton);
    const moreSpanStyle = window.getComputedStyle(moreSpan);
    const shortStyle = window.getComputedStyle(short);
    return {
      authorLineHeight: authorStyle.lineHeight,
      authorTextAlign: authorStyle.textAlign,
      authorWidth: Math.round(author.getBoundingClientRect().width),
      bodyCellPadding: bodyCellStyle.padding,
      commitIdFontFamily: commitIdStyle.fontFamily,
      commitIdFontSize: commitIdStyle.fontSize,
      commitIdPadding: commitIdStyle.padding,
      commitIdPosition: commitIdStyle.position,
      commitIdTextAlign: commitIdStyle.textAlign,
      commitIdVerticalAlign: commitIdStyle.verticalAlign,
      commitIdWidth: Math.round(commitId.getBoundingClientRect().width),
      commitLinkColor: window.getComputedStyle(commitLink).color,
      copyButtonDisplay: window.getComputedStyle(copyButton).display,
      dateFontSize: dateStyle.fontSize,
      dateWidth: Math.round(date.getBoundingClientRect().width),
      descBackground: descStyle.backgroundColor,
      descBorderLeftWidth: descStyle.borderLeftWidth,
      descBorderRadius: descStyle.borderRadius,
      descColor: descStyle.color,
      descFontSize: descStyle.fontSize,
      historyBackground: window.getComputedStyle(history).backgroundColor,
      messagesVerticalAlign: window.getComputedStyle(messages).verticalAlign,
      moreButtonBackground: moreButtonStyle.backgroundColor,
      moreButtonBorderWidth: moreButtonStyle.borderTopWidth,
      moreButtonLineHeight: moreButtonStyle.lineHeight,
      moreButtonMarginLeft: moreButtonStyle.marginLeft,
      moreButtonTop: moreButtonStyle.top,
      moreSpanBackground: moreSpanStyle.backgroundColor,
      moreSpanBorderRadius: moreSpanStyle.borderRadius,
      moreSpanHeight: moreSpanStyle.height,
      moreSpanLineHeight: moreSpanStyle.lineHeight,
      moreSpanPadding: moreSpanStyle.padding,
      shortFontSize: shortStyle.fontSize,
      shortPadding: shortStyle.padding,
      shortWhiteSpace: shortStyle.whiteSpace,
      tableWidth: Math.round(table.getBoundingClientRect().width),
    };
  });
}

async function historyNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-box"]',
    );
    const input = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-input"]',
    );
    const projectHeader = document.querySelector<HTMLElement>(".project-header-outer");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!navbar || !form || !scope || !searchBox || !input || !projectHeader || !menu) {
      return null;
    }
    return {
      form: rect(form),
      input: rect(input),
      menu: rect(menu),
      navbar: rect(navbar),
      projectHeader: rect(projectHeader),
      scope: rect(scope),
      searchBox: rect(searchBox),
    };

    function rect(element: HTMLElement) {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }
  });
}

async function mockProjectCodeHistory(
  page: Page,
  options: {
    onHistoryRequest?: (requestUrl: URL) => void;
    includeAnonymousCommit?: boolean;
    ownerName?: string;
    project?: Record<string, unknown>;
    projectName?: string;
    secondMessage?: string;
  } = {},
) {
  const ownerName = options.ownerName ?? "admin";
  const projectName = options.projectName ?? "sample";
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
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container**`,
    async (route) => {
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
          ownerName,
          projectName,
          vcs: "GIT",
          viewerCanUpdate: true,
          ...options.project,
        }),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/commits**`, async (route) => {
    const requestUrl = new URL(route.request().url());
    options.onHistoryRequest?.(requestUrl);
    const selectedBranch = requestUrl.searchParams.get("branch") || "main";
    const path = requestUrl.searchParams.get("path") || "";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: path
          ? path.split("/").map((name, index, parts) => ({
              name,
              path: parts.slice(0, index + 1).join("/"),
            }))
          : [],
        commits: [
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
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorDate: "Jul 2, 2026",
            authorEmail: "dev@example.com",
            authorLoginId: "",
            authorName: "",
            commentCount: 0,
            commitId: "1234567890abcdef",
            commitShortId: "1234567",
            message: options.secondMessage ?? "Second commit",
            shortMessage: "Second commit",
          },
          ...(options.includeAnonymousCommit
            ? [
                {
                  authorAvatarUrl: "/assets/images/default-avatar-32.png",
                  authorDate: "Jul 3, 2026",
                  authorEmail: "",
                  authorLoginId: "",
                  authorName: "",
                  commentCount: 0,
                  commitId: "fedcba0987654321",
                  commitShortId: "fedcba0",
                  message: "Anonymous commit",
                  shortMessage: "Anonymous commit",
                },
              ]
            : []),
        ],
        hasNewer: false,
        hasOlder: true,
        noHead: false,
        ownerName,
        page: 1,
        path,
        projectName,
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner",
        )
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner",
        )
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
      if (attr.name === "class") {
        return attr.value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
