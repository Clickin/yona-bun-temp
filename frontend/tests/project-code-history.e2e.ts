import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const ROUTE_SOURCE_PATH = "src/routes/$ownerName/$projectName/commits/$branch.tsx";
const BARE_ROUTE_SOURCE_PATH = "src/routes/$ownerName/$projectName/commits.tsx";
const LEGACY_HISTORY_SOURCE_PATH = "../yona-original/app/views/code/history.scala.html";
const LEGACY_ROUTES_SOURCE_PATH = "../yona-original/conf/routes";
const LEGACY_CONTROLLER_SOURCE_PATH = "../yona-original/app/controllers/CodeHistoryApp.java";

const EXPECTED_HISTORY_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="bubble-wrap dark-gray repo-wrap"><div class="code-browse-wrap"><select id="branches" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" class="pull-right"><option value="__BASE_PATH__/admin/sample/commits/main" selected="">main</option><option value="__BASE_PATH__/admin/sample/commits/feature%2Frelease">feature/release</option></select><ul class="nav nav-tabs" style="margin-bottom:20px"><li><a href="__BASE_PATH__/admin/sample/code/main">Files</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/commits/main">Commit</a></li><li><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><div id="history" class="commit-wrap"><table class="code-table commits"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="date"><strong>Author Date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="abcdef1234567890"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main" title="View commit">abcdef1</a></td><td class="messages"><span class="number-of-comments"><i class="yobicon-comments"></i> 2</span><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890?branch=main" class="commitMsg short">Initial commit</a><button type="button" class="commitMsg moreBtn"><span>…</span></button><pre class="commitMsg desc hidden">Add README</pre></td><td class="date">Jul 1, 2026</td><td class="author"><a href="__BASE_PATH__/admin" class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="admin"><img src="/assets/images/default-avatar-32.png"></a></td></tr><tr><td class="commit-id"><button type="button" class="ybtn ybtn-mini btn-copy-commitId" title="Copy commit ID" data-commitid="1234567890abcdef"><i class="yobicon-copy"></i></button><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main" title="View commit">1234567</a></td><td class="messages"><a href="__BASE_PATH__/admin/sample/commit/1234567890abcdef?branch=main" class="commitMsg short">Second commit</a></td><td class="date">Jul 2, 2026</td><td class="author"><span class="avatar-wrap" data-toggle="tooltip" data-placement="top" title="dev@example.com"><img src="/assets/images/default-avatar-32.png"></span></td></tr></tbody></table></div></div><div class="actrow margin-top-20"><a href="__BASE_PATH__/admin/sample/commits/main?page=2" class="ybtn pull-left">Older</a></div></div></div></div>
`;

test("project code history matches legacy code/history.scala.html DOM", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeHistory(page);

  await page.goto(`${basePath}/admin/sample/commits/main`);
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
  await expect(authorAvatarLink).toHaveAttribute("title", "admin");
  await expectNoTanStackActiveMarkers(authorAvatarLink);
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

test("project bare code history renders default branch on the legacy commits URL", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const historyRequestUrls: string[] = [];
  await mockProjectCodeHistory(page, {
    onHistoryRequest: (requestUrl) => historyRequestUrls.push(requestUrl.href),
  });

  await page.goto(`${basePath}/admin/sample/commits`);

  await expect(page).toHaveURL(`${basePath}/admin/sample/commits`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator("#history .code-table.commits tbody tr")).toHaveCount(2);
  expect(historyRequestUrls).toHaveLength(1);
  const historyRequest = new URL(historyRequestUrls[0]);
  expect(historyRequest.searchParams.get("branch")).toBeNull();
  expect(historyRequest.searchParams.get("path")).toBeNull();
  expect(page.locator("#branches")).toHaveValue(`${basePath}/admin/sample/commits/main`);
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
    .selectOption(`${basePath}/admin/sample/commits/feature%2Frelease`);

  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/commits/feature%2Frelease$`));
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
  const legacyRoutesSource = readFileSync(LEGACY_ROUTES_SOURCE_PATH, "utf8");
  const legacyControllerSource = readFileSync(LEGACY_CONTROLLER_SOURCE_PATH, "utf8");

  expect(legacyRoutesSource).toContain(
    "GET            /:user/:project/commits                                                controllers.CodeHistoryApp.historyUntilHead(user, project)",
  );
  expect(legacyControllerSource).toContain("return history(ownerName, projectName, null, null);");
  expect(legacySource).toContain("@getHistoryURL(path)?page=@(page + 1)");
  expect(legacySource).toContain('queryString += "&path=" + path + "#"');
  expect(legacySource).toContain("routes.CodeHistoryApp.show");
  expect(source).toContain("validateSearch(search): ProjectCodeHistorySearch");
  expect(source).toContain("return Number.isFinite(page) && page > 0 ? { page } : {};");
  expect(source).toContain("const showCommitSearch = commitDetailSearch(selectedBranch);");
  expect(source).toContain("return { branch };");
  expect(source).toMatch(/projectRoutePath\(\s*ownerName,\s*projectName,\s*"commit",/u);
  expect(source).not.toContain("createLink");
  expect(source).not.toMatch(/<a(?:\s|>)/u);
  expect(source).not.toContain("</a>");
  expect(source).not.toContain("href={projectHref");
  expect(source).not.toContain("href={commitHref");
  expect(source).not.toContain("setAttribute");
  expect(source).not.toContain("removeAttribute");
  expect(source).not.toContain("as never");
  expect(source).not.toContain("legacyInactiveLinkOptions");
  expect(source).not.toMatch(/\bdocument\./u);
  expect(source).not.toContain("addEventListener");
  expect(source).not.toContain("classList");
  expect(source).not.toContain("style.display");
  expect(source).toContain("const legacyCodeHistoryLinkActiveOptions = {");
  expect(source).toContain("explicitUndefined: true");
  expect(source).toContain("const legacyCodeHistoryLinkActiveProps = {");
  expect(source).toContain('"aria-current": undefined');
  expect(source).toContain("className: undefined");
  expect(source).toContain('"data-status": undefined');
  expect(source.match(/activeOptions=\{legacyCodeHistoryLinkActiveOptions\}/gu)).toHaveLength(8);
  expect(source.match(/activeProps=\{legacyCodeHistoryLinkActiveProps\}/gu)).toHaveLength(8);
  expect(source).not.toContain("activeProps={{ className: undefined }}");

  expect(bareSource).toContain('createFileRoute("/$ownerName/$projectName/commits")');
  expect(bareSource).toContain(
    'codeHistoryQueryOptions(runtimeConfig, { ownerName, page, path: "", projectName })',
  );
  expect(bareSource).toContain('to="/$ownerName/$projectName/commits"');
  expect(bareSource).toContain('params={{ branch: "HEAD", ownerName, projectName }}');
  expect(bareSource).not.toContain("historyUntilHead");
  expect(bareSource).not.toMatch(/<a(?:\s|>)/u);
  expect(bareSource).not.toContain("</a>");
  expect(bareSource).not.toMatch(/\bdocument\./u);
  expect(bareSource).not.toContain("addEventListener");
  expect(bareSource).not.toContain("classList");
  expect(bareSource).not.toContain("style.display");
  expect(bareSource).not.toContain("dangerouslySetInnerHTML");
  expect(bareSource.match(/activeOptions=\{legacyCodeHistoryLinkActiveOptions\}/gu)).toHaveLength(
    8,
  );
  expect(bareSource.match(/activeProps=\{legacyCodeHistoryLinkActiveProps\}/gu)).toHaveLength(8);
});

async function expectNoTanStackActiveMarkers(locator: Locator) {
  await expect(locator).not.toHaveAttribute("aria-current", /.*/u);
  await expect(locator).not.toHaveAttribute("data-status", /.*/u);
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

async function mockProjectCodeHistory(
  page: Page,
  options: { onHistoryRequest?: (requestUrl: URL) => void; secondMessage?: string } = {},
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
  await page.route("**/api/v1/projects/admin/sample/commits**", async (route) => {
    const requestUrl = new URL(route.request().url());
    options.onHistoryRequest?.(requestUrl);
    const selectedBranch = requestUrl.searchParams.get("branch") || "main";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [],
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
        ],
        hasNewer: false,
        hasOlder: true,
        noHead: false,
        ownerName: "admin",
        page: 1,
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
