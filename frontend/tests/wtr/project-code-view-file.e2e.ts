import { expect, test, type Page } from "../wtr-compat.ts";

test("project code text file matches legacy code/partial_view_file.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  // F5 gnb-outer — yona-original/app/views/common/navbar.scala.html:37: the
  // shared GNB renders the legacy gnb-outer class on project routes.
  await expect(page.locator("[data-owner=global-gnb-outer]")).toHaveClass(/\bgnb-outer\b/u);
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const searchBox = page.locator('[data-owner="global-gnb-search-box"]');
  await expect(searchBox).toHaveClass(/\bsearch-box\b/u);
  await expect(searchBox).toHaveClass(/\bselect\b/);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect
    .poll(() =>
      page.locator("[data-owner=global-gnb-search-scope-item] > button").evaluateAll((elements) =>
        elements.map((element) => ({
          action: element.getAttribute("data-action") ?? "",
          text: element.textContent?.trim() ?? "",
        })),
      ),
    )
    .toEqual([
      { action: "", text: "This Project" },
      { action: "", text: "All Projects" },
    ]);

  const fileUrl = page.url();
  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(fileUrl);

  await expect(page.locator(".code-viewer-wrap > .file-wrap #commitMessage")).toHaveText(
    "Update README",
  );
  await expect(page.locator(".code-viewer-wrap > .file-wrap").first()).not.toHaveAttribute(
    "data-type",
    /.+/u,
  );
  const committerAvatar = page.locator("#commiter .avatar-wrap");
  await expect(committerAvatar).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(committerAvatar).not.toHaveAttribute("data-placement", /.+/u);
  await expect(committerAvatar).toHaveAttribute("title", "admin");
  expect(codeRequests).toEqual(["branch=main&path=README.txt"]);

  expect(await fileViewMetrics(page)).toEqual({
    breadcrumbDisplay: "block",
    breadcrumbFontSize: "15px",
    breadcrumbFontWeight: "700",
    breadcrumbLineHeight: "30px",
    breadcrumbPadding: "0px 10px 0px 0px",
    codeBorderStyle: "none",
    codeBorderRadius: "0px",
    codeLineHeight: "16px",
    codeMargin: "0px",
    codePadding: "0px",
    headerDisplay: "block",
    headerHeight: "34px",
    headerMarginBottom: "10px",
    headerMarginTop: "10px",
    viewerOverflow: "auto",
    // F5 dist-truth: legacy .code-viewer-wrap { width:100% } inside
    // .code-browse-wrap inside .page-wrap-outer { padding: 0 10px; width: 100%;
    // box-sizing: border-box } (yona-original/.../less/_responsive.less:611-615) ->
    // 1260 at this 1280 viewport; app renders 1260 == legacy, pin was stale
    viewerWidth: 1260,
    wrapPosition: "relative",
  });
  expect(await readCodeFileNavbarMetrics(page)).toEqual({
    formBottomWithinNavbar: true,
    formRightWithinNavbar: true,
    formTopWithinNavbar: true,
    // F5 gnb-outer — yona-original/app/views/common/navbar.scala.html:37
    // (the shared GNB keeps the legacy gnb-outer class on project routes).
    headerClassName: "gnb-outer",
    searchBottomWithinNavbar: true,
    searchRightWithinNavbar: true,
    searchTopWithinNavbar: true,
    scopeBottomWithinNavbar: true,
    scopeTopWithinNavbar: true,
  });
});

test("project code file committer title metadata is native without placement marker", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);

  await expect(page.locator(".code-viewer-wrap > .file-wrap #commitMessage")).toHaveText(
    "Update README",
  );
  await expect(page.locator(".code-viewer-wrap > .file-wrap").first()).not.toHaveAttribute(
    "data-type",
    /.+/u,
  );
  const committerAvatar = page.locator("#commiter .avatar-wrap");
  await expect(committerAvatar).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(committerAvatar).not.toHaveAttribute("data-placement", /.+/u);
  await expect(committerAvatar).toHaveAttribute("title", "admin");
  await expect(committerAvatar).toHaveAttribute("href", `${basePath}/admin`);
  await expect(page.locator("#commiter .ml5")).toHaveText("Admin");
  // code/view.scala.html receives root-folder metadata even on a file route.
  const tabs = page.locator(".code-browse-wrap > .nav-tabs a");
  await expect(tabs).toHaveText(["Files", "Commit", "Branches"]);
  await expect(tabs.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/code/main`);
  await expect(tabs.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/commits/main`);
  await expect(tabs.nth(2)).toHaveAttribute("href", `${basePath}/admin/sample/branches`);
  await expect(page.locator("#fileInfo > span").last()).toHaveText("UNIX");
  await expect(page.locator("#revisionNo a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/1234567890abcdef?branch=main#README.txt`,
  );
  await expect(page.locator('[data-owner="project-code-file-comment-count"]')).toHaveText("2");
  await expect(page.locator("#commitDate")).toHaveText("07-02");
  await expect(page.locator("#commitMessage")).toHaveText("Update README");
  expect(codeRequests).toEqual(["branch=main&path=README.txt"]);
});

test("unregistered file author keeps an inert avatar and label without a profile link", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFile(page, [], "README.txt", "# sample", {
    authorLabel: "External Author",
    authorLoginId: "",
    authorAvatarUrl: "",
  });
  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  await expect(page.locator("#commiter a")).toHaveCount(0);
  await expect(page.locator("#commiter .ml5")).toHaveText("External Author");
  const avatar = page.locator("#commiter button.avatar-wrap");
  await expect(avatar.locator("img")).toHaveAttribute("src", /default-avatar-128[^/]*\.png/u);
  const box = await avatar.evaluate((element) => element.getBoundingClientRect());
  expect(box.width).toBe(20);
  expect(box.height).toBe(20);
  await avatar.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main/README.txt`);
});

test("project code file comment count owns legacy spacing and color in Style", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);

  const commentCount = page.locator('[data-owner="project-code-file-comment-count"]');
  await expect(commentCount).toHaveText("2");
  await expect(commentCount).toHaveClass(/ml5/u);
  await expect(commentCount).toHaveClass(/number-of-comments/u);
  await expect(commentCount).toHaveCSS("margin-left", "5px");
  await expect(commentCount).toHaveCSS("margin-right", "0px");
  await expect(commentCount).toHaveCSS("color", "rgb(32, 32, 32)");
  await expect(commentCount.locator(".yobicon-comments")).toHaveCount(1);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "commit" });
  const mobileCommentCount = page.locator('[data-owner="project-code-file-comment-count"]');
  await expect(mobileCommentCount).toBeVisible();
  await expect(mobileCommentCount).toHaveCSS("margin-left", "5px");
  await expect(mobileCommentCount).toHaveCSS("margin-right", "0px");
  await expect(mobileCommentCount).toHaveCSS("color", "rgb(32, 32, 32)");
  expect(codeRequests).toEqual(["branch=main&path=README.txt", "branch=main&path=README.txt"]);
});

test("project code text file includes legacy group search scope when project has org data", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "README.txt",
    "# sample\nLine two",
    {},
    { organizationName: "weblabs" },
  );

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect
    .poll(() =>
      page.locator("[data-owner=global-gnb-search-scope-item] > button").evaluateAll((elements) =>
        elements.map((element) => ({
          action: element.getAttribute("data-action") ?? "",
          text: element.textContent?.trim() ?? "",
        })),
      ),
    )
    .toEqual([
      { action: "", text: "This Project" },
      { action: "", text: "This Group" },
      { action: "", text: "All Projects" },
    ]);

  const fileUrl = page.url();
  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page).toHaveURL(fileUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").nth(2).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(fileUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator("[data-owner=global-gnb-search-scope-item] > button").first().click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page).toHaveURL(fileUrl);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  expect(codeRequests).toEqual(["branch=main&path=README.txt"]);
});

test("project code file internal links keep legacy hrefs and navigate through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  await expect(page.locator("#breadcrumbs a").first()).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main`,
  );
  await expect(page.locator("#new-file-link")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=&branch=main`,
  );
  await expect(page.locator("#revisionNo a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/1234567890abcdef?branch=main#README.txt`,
  );
  await expect(page.locator(".file-header .pull-right a", { hasText: "Edit" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=README.txt&branch=main&edit=true`,
  );
  await expect(
    page.locator(".file-header .pull-right a", { hasText: "Change history" }),
  ).toHaveAttribute("href", `${basePath}/admin/sample/commits/main/README.txt`);
  await expect(page.locator(".file-header .pull-right a", { hasText: "Raw" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/rawcode/main/README.txt`,
  );
  await expect(page.locator("#open-in-browser")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/files/main/README.txt`,
  );
  await expect(page.locator("#open-in-browser")).not.toHaveAttribute("data-content", /.+/u);
  await expect(page.locator("#open-in-browser")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(page.locator("#open-in-browser")).not.toHaveAttribute("data-trigger", /.+/u);
  await expect(page.locator("#open-in-browser")).not.toHaveAttribute("data-placement", /.+/u);
  await expect(page.locator(".file-header .popover.top")).toHaveCount(0);
  const archiveDownloadLink = page.locator(".code-browse-header .pull-right a", {
    hasText: "Download as .zip file",
  });
  const rawLink = page.locator(".file-header .pull-right a", { hasText: "Raw" });

  await expect(archiveDownloadLink).toHaveAttribute("class", "ybtn");
  await expect(archiveDownloadLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/archive/main.zip`,
  );
  await expect(archiveDownloadLink).not.toHaveAttribute("target", /.+/u);
  await expect(archiveDownloadLink).toHaveText("Download as .zip file");
  await expect(rawLink).toHaveClass(/ybtn/u);
  await expect(rawLink).toHaveAttribute("target", "_blank");
  await expect(rawLink).toContainText("Raw");
  await expect(page.locator("#open-in-browser")).toHaveClass(/ybtn/u);
  await expect(page.locator("#open-in-browser")).toHaveAttribute("target", "_blank");
  await expect(page.locator("#open-in-browser")).toContainText("Open in browser");

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });

  await page.locator("#breadcrumbs a").first().click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main`);
  expect(documentRequests).toEqual([]);
});

test("project code open-in-browser popover is React-owned with legacy hover and focus placement", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  const openInBrowser = page.locator("#open-in-browser");
  const popover = page.locator('[data-owner="project-code-file-open-popover"]');

  await expect(openInBrowser).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/files/main/README.txt`,
  );
  await expect(openInBrowser).toHaveAttribute("target", "_blank");
  await expect(openInBrowser).toHaveText("Open in browser");
  await expect(openInBrowser).not.toHaveAttribute("data-content", /.+/u);
  await expect(openInBrowser).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(openInBrowser).not.toHaveAttribute("data-trigger", /.+/u);
  await expect(openInBrowser).not.toHaveAttribute("data-placement", /.+/u);
  await expect(popover).toHaveCount(0);

  await openInBrowser.hover();
  await expect(popover).toBeVisible();
  await expect(popover).toHaveAttribute("role", "tooltip");
  await expect(popover.locator(".arrow")).toHaveCount(1);
  await expect(popover.locator(".popover-content")).toHaveText(
    "Browser will parse and show this file. It is useful when you want to serve a static content file.",
  );
  expect(await openInBrowserPopoverMetrics(page)).toEqual({
    contentLineHeight: "13.2px",
    hasInClass: true,
    placementClass: true,
    popoverBottomAboveControl: true,
    popoverCenteredOnControl: true,
    popoverDoesNotOverlapHistory: true,
  });

  await page.mouse.move(0, 0);
  await expect(popover).toHaveCount(0);

  await openInBrowser.focus();
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-content")).toHaveText(
    "Browser will parse and show this file. It is useful when you want to serve a static content file.",
  );
  await page.keyboard.press("Tab");
  await expect(popover).toHaveCount(0);
  await expect(page.locator(".code-viewer-wrap > .file-wrap #commitMessage")).toHaveText(
    "Update README",
  );
  expect(codeRequests).toEqual(["branch=main&path=README.txt"]);
});

test("project code logged-in read-only viewer still sees legacy new-file and edit actions", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "README.txt",
    "# sample\nLine two",
    {},
    { viewerCanUpdate: false },
    undefined,
    undefined,
    { isAnonymous: false, userLabel: "Read-only member" },
  );

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);

  await expect(page.locator("#new-file-link")).toHaveText("New file");
  await expect(page.locator("#new-file-link")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=&branch=main`,
  );
  await expect(page.locator(".file-header .pull-right a", { hasText: "Edit" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=README.txt&branch=main&edit=true`,
  );
  await expect(
    page.locator(".code-browse-header .pull-right a", { hasText: "Download" }),
  ).toHaveAttribute("href", `${basePath}/admin/sample/archive/main.zip`);
  await expect(page.locator(".file-header .pull-right a", { hasText: "Raw" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/rawcode/main/README.txt`,
  );
  await expect(page.locator("#open-in-browser")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/files/main/README.txt`,
  );
  expect(codeRequests).toEqual(["branch=main&path=README.txt"]);
});

test("project code file branch selector navigates slash branch in the SPA", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/README.txt`);
  await expect(page.locator("#branches")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(page.locator("#branches")).not.toHaveAttribute("data-format", /.+/u);
  await expect(page.locator("#branches")).not.toHaveAttribute("data-dropdown-css-class", /.+/u);
  await expect(
    page.locator(
      `#branches option[value="${basePath}/admin/sample/code/feature%2Frelease/README.txt"]`,
    ),
  ).toHaveText("feature/release");

  await page.evaluate(() => {
    (
      window as typeof window & { __yonaCodeFileBranchSpaMarker?: string }
    ).__yonaCodeFileBranchSpaMarker = "alive";
  });
  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });

  const picker = page.locator(".code-browse-header > .select2-container");
  const geometry = await page.evaluate(() => {
    const picker = document
      .querySelector(".code-browse-header > .select2-container")!
      .getBoundingClientRect();
    const breadcrumbs = document.querySelector("#breadcrumbs")!.getBoundingClientRect();
    return { picker, breadcrumbs };
  });
  expect(geometry.picker.width).toBe(220);
  expect(geometry.breadcrumbs.left).toBeCloseTo(geometry.picker.right + 10, 1);
  expect(Math.abs(geometry.picker.top - geometry.breadcrumbs.top)).toBeLessThanOrEqual(3);
  await picker.locator(".select2-choice").click();
  await picker.locator(".select2-search input").fill("RELEASE");
  await expect(picker.locator(".select2-result-label")).toHaveText(["branch feature/release"]);
  await picker.locator(".select2-search input").press("Escape");
  await expect(picker.locator(".select2-drop")).not.toBeVisible();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main/README.txt`);
  await expect(picker.locator(".select2-choice")).toBeFocused();
  await picker.locator(".select2-choice").press("Enter");
  await expect(picker.locator(".select2-search input")).toBeFocused();
  await expect(picker.locator(".select2-search input")).toHaveValue("");
  await picker.locator(".select2-search input").fill("feature/release");
  await picker.locator(".select2-search input").press("ArrowDown");
  await expect(picker.locator(".select2-highlighted")).toHaveText("branch feature/release");
  await picker.locator(".select2-search input").press("Enter");

  await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Frelease/README.txt`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __yonaCodeFileBranchSpaMarker?: string })
            .__yonaCodeFileBranchSpaMarker,
      ),
    )
    .toBe("alive");
  expect(documentRequests).toEqual([]);
  expect(codeRequests).toEqual([
    "branch=main&path=README.txt",
    "branch=feature%2Frelease&path=README.txt",
  ]);
});

test("project code folder entry links keep classes and SPA navigation without data-type", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFolder(page, codeRequests, "src");

  await page.goto(`${basePath}/admin/sample/code/main/src`);
  const folderRow = page.locator("#cb-srcdocs");
  const fileRow = page.locator('[id="cb-srcREADME.txt"]');
  const folderLink = folderRow.locator(".filename a");
  const fileLink = fileRow.locator(".filename a");

  await expect(folderRow).not.toHaveAttribute("data-path", /.+/u);
  await expect(folderLink).toHaveText("docs");
  await expect(folderLink).toHaveClass("dynatree-ico-cf");
  await expect(folderLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src/docs#cb-srcdocs`,
  );
  await expect(folderLink).not.toHaveAttribute("data-targetpath", /.+/u);
  await expect(folderLink).not.toHaveAttribute("data-type", /.+/u);
  await expect(fileRow).not.toHaveAttribute("data-path", /.+/u);
  await expect(fileLink).toHaveText("README.txt");
  await expect(fileLink).toHaveClass("dynatree-ico-c");
  await expect(fileLink).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src/README.txt`,
  );
  await expect(fileLink).not.toHaveAttribute("data-targetpath", /.+/u);
  await expect(fileLink).not.toHaveAttribute("data-type", /.+/u);

  await page.evaluate(() => {
    (
      window as typeof window & { __yonaCodeFolderEntrySpaMarker?: string }
    ).__yonaCodeFolderEntrySpaMarker = "alive";
  });
  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });

  await folderLink.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main/src/docs#cb-srcdocs`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __yonaCodeFolderEntrySpaMarker?: string })
            .__yonaCodeFolderEntrySpaMarker,
      ),
    )
    .toBe("alive");
  expect(documentRequests).toEqual([]);
  expect(codeRequests[0]).toBe("branch=main&path=src");
  await expect.poll(() => codeRequests).toContain("branch=main&path=src%2Fdocs");
});

test("project code file normalizes refs branch names like legacy branchItemName", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "src/main.rs",
    "fn main() {}\n",
    {},
    {},
    [{ name: "refs/heads/main" }, { name: "refs/tags/v1.0.0" }],
    "refs/heads/main",
  );

  await page.goto(`${basePath}/admin/sample/code/refs%2Fheads%2Fmain/src/main.rs`);

  await expect(page.locator("#branches option").first()).toHaveText("refs/heads/main");
  await expect(page.locator("#branches option").first()).toHaveAttribute(
    "value",
    `${basePath}/admin/sample/code/main/src/main.rs`,
  );
  await expect(page.locator("#branches option").nth(1)).toHaveText("refs/tags/v1.0.0");
  await expect(page.locator("#branches option").nth(1)).toHaveAttribute(
    "value",
    `${basePath}/admin/sample/code/v1.0.0/src/main.rs`,
  );
  await expect(page.locator("#branches")).toHaveValue(
    `${basePath}/admin/sample/code/main/src/main.rs`,
  );
  await expect(page.locator("#new-file-link")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=src/&branch=main`,
  );
  await expect(page.locator(".file-header .pull-right a", { hasText: "Raw" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/rawcode/main/src/main.rs`,
  );
  await expect(page.locator(".file-header .pull-right a", { hasText: "Edit" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=src/main.rs&branch=main&edit=true`,
  );
  await expect(page.locator("#open-in-browser")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/files/main/src/main.rs`,
  );
  await expect(
    page.locator(".file-header .pull-right a", { hasText: "Change history" }),
  ).toHaveAttribute("href", `${basePath}/admin/sample/commits/refs%2Fheads%2Fmain/src/main.rs`);
  expect(codeRequests).toEqual(["branch=refs%2Fheads%2Fmain&path=src%2Fmain.rs"]);
  await page.locator(".select2-choice").click();
  await expect(page.locator(".select2-result-label .branch-label")).toHaveText(["branch", "tag"]);
  await page.locator(".select2-search input").fill("v1.0.0");
  await page.locator(".select2-search input").press("ArrowDown");
  await expect(page.locator(".select2-highlighted .branch-label")).toHaveText("tag");
  await page.locator(".select2-search input").press("Enter");
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/v1.0.0/src/main.rs`);
  await expect(page.locator(".select2-chosen .branch-label.tag")).toHaveText("tag");
});

async function openInBrowserPopoverMetrics(page: Page) {
  return page.locator(".file-header .pull-right").evaluate((actions) => {
    const control = actions.querySelector<HTMLElement>("#open-in-browser");
    const history = actions.querySelector<HTMLElement>('a.ybtn[href*="/commits/"]');
    const popover = actions.querySelector<HTMLElement>(".popover");
    const content = actions.querySelector<HTMLElement>(".popover-content");
    const missing = Object.entries({ content, control, history, popover })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected open-in-browser popover metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const controlBox = control.getBoundingClientRect();
    const historyBox = history.getBoundingClientRect();
    const popoverBox = popover.getBoundingClientRect();
    const contentStyle = window.getComputedStyle(content);
    const controlCenter = controlBox.left + controlBox.width / 2;
    const popoverCenter = popoverBox.left + popoverBox.width / 2;
    return {
      contentLineHeight: contentStyle.lineHeight,
      hasInClass: popover.classList.contains("in"),
      placementClass: popover.classList.contains("top"),
      popoverBottomAboveControl: popoverBox.bottom <= controlBox.top + 1,
      popoverCenteredOnControl: Math.abs(controlCenter - popoverCenter) <= 2,
      popoverDoesNotOverlapHistory:
        popoverBox.bottom <= historyBox.top || popoverBox.left >= historyBox.right,
    };
  });
}

async function fileViewMetrics(page: Page) {
  return page.locator(".code-browse-wrap").evaluate((wrap) => {
    const header = wrap.querySelector<HTMLElement>(".code-browse-header");
    const breadcrumb = wrap.querySelector<HTMLElement>(".code-breadcrumb-wrap");
    const viewer = wrap.querySelector<HTMLElement>(".code-viewer-wrap");
    const code = wrap.querySelector<HTMLElement>("#showCode.code-wrap");
    const missing = Object.entries({ breadcrumb, code, header, viewer })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected file view metric targets are missing: ${missing.join(", ")}`);
    }

    const breadcrumbStyle = window.getComputedStyle(breadcrumb);
    const codeStyle = window.getComputedStyle(code);
    const headerStyle = window.getComputedStyle(header);
    const viewerStyle = window.getComputedStyle(viewer);
    const wrapStyle = window.getComputedStyle(wrap);
    return {
      breadcrumbDisplay: breadcrumbStyle.display,
      breadcrumbFontSize: breadcrumbStyle.fontSize,
      breadcrumbFontWeight: breadcrumbStyle.fontWeight,
      breadcrumbLineHeight: breadcrumbStyle.lineHeight,
      breadcrumbPadding: breadcrumbStyle.padding,
      codeBorderRadius: codeStyle.borderRadius,
      codeBorderStyle: codeStyle.borderTopStyle,
      codeLineHeight: codeStyle.lineHeight,
      codeMargin: codeStyle.margin,
      codePadding: codeStyle.padding,
      headerDisplay: headerStyle.display,
      headerHeight: headerStyle.height,
      headerMarginBottom: headerStyle.marginBottom,
      headerMarginTop: headerStyle.marginTop,
      viewerOverflow: viewerStyle.overflow,
      viewerWidth: Math.round(viewer.getBoundingClientRect().width),
      wrapPosition: wrapStyle.position,
    };
  });
}

async function readCodeFileNavbarMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>("header[data-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const search = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
    const missing = Object.entries({ form, header, scope, search })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected code file navbar metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const headerBox = header.getBoundingClientRect();
    const formBox = form.getBoundingClientRect();
    const scopeBox = scope.getBoundingClientRect();
    const searchBox = search.getBoundingClientRect();
    return {
      formBottomWithinNavbar: formBox.bottom <= headerBox.bottom + 1,
      formRightWithinNavbar: formBox.right <= headerBox.right,
      formTopWithinNavbar: formBox.top >= headerBox.top,
      // header carries style tokens + retained legacy gnb-outer project-header
      // (legacy layout.scala.html:35 <header class="gnb-outer project-header">)
      headerClassName: header.className
        .split(/\s+/u)
        .filter((token) => token && !/^x[0-9a-z]+$/u.test(token))
        .join(" "),
      searchBottomWithinNavbar: searchBox.bottom <= headerBox.bottom + 1,
      searchRightWithinNavbar: searchBox.right <= headerBox.right,
      searchTopWithinNavbar: searchBox.top >= headerBox.top,
      scopeBottomWithinNavbar: scopeBox.bottom <= headerBox.bottom + 1,
      scopeTopWithinNavbar: scopeBox.top >= headerBox.top,
    };
  });
}

test("project code text file keeps nested legacy path segments", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "docs/guide/README.txt");

  await page.goto(`${basePath}/admin/sample/code/main/docs/guide/README.txt`);
  await expect(page.locator(".code-viewer-wrap > .file-wrap #commitMessage")).toHaveText(
    "Update README",
  );
  expect(codeRequests).toEqual(["branch=main&path=docs%2Fguide%2FREADME.txt"]);
  await expect(page.locator("#breadcrumbs a")).toHaveText([
    "sample",
    "docs",
    "guide",
    "README.txt",
  ]);
  await expect(page.locator("#breadcrumbs a").nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/docs/guide`,
  );
  await expect(page.locator("#showCode")).toContainText("Line two");
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
  await expect(page.locator("#codeVal h1")).toHaveText("sample");
  await expect(page.locator("#codeVal img")).toHaveAttribute(
    "src",
    `${basePath}/admin/sample/files/main/assets/logo.png`,
  );
  await expect(page.locator("#codeVal a")).toHaveText("Guide");
});

test("project code image file matches legacy binary image branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  // The fixture path avoids an "/assets/" URL segment: the WTR fixture server
  // treats /yona/**/assets/** as nested static assets and serves the SPA index
  // for the chunk URLs under /code/main/assets/assets/..., so the app cannot
  // boot at a route whose path contains "/assets/". The image branch itself
  // (partial_view_file.scala.html:84-85) renders regardless of the segment.
  await mockProjectCodeFile(page, codeRequests, "images/logo.png", "", {
    isBinary: true,
    mimeType: "image/png",
  });

  await page.goto(`${basePath}/admin/sample/code/main/images/logo.png`);
  await expect(page.locator("#showImage.image-wrap img")).toHaveAttribute(
    "src",
    `${basePath}/admin/sample/rawcode/main/images/logo.png`,
  );
  await expect(page.locator("#showCode")).toHaveCount(0);
  await expect(page.locator("#codeVal")).toHaveCount(0);
  await expect(page.locator(".file-header .pull-right a", { hasText: "Raw" })).toHaveCount(0);
  await expect(page.locator(".file-header .pull-right a", { hasText: "Edit" })).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=images%2Flogo.png"]);
});

test("project code binary file matches legacy download branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "dist/archive.zip", "", {
    isBinary: true,
    mimeType: "application/zip",
    size: "12 KB",
  });

  await page.goto(`${basePath}/admin/sample/code/main/dist/archive.zip`);
  await expect(page.locator("#showFile.file-wrap .filename")).toHaveText("archive.zip");
  await expect(page.locator("#showFile.file-wrap .filesize")).toHaveText("12 KB");
  await expect(page.locator("#showFile.file-wrap .filehref")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/rawcode/main/dist/archive.zip`,
  );
  await expect(page.locator("#showFile.file-wrap .filehref")).toHaveAttribute(
    "class",
    "filehref ybtn",
  );
  await expect(page.locator("#showFile.file-wrap .filehref")).not.toHaveAttribute("target", /.+/u);
  await expect(page.locator("#showFile.file-wrap .filehref")).toHaveText("Download a file");
  await expect(page.locator("#showCode")).toHaveCount(0);
  await expect(page.locator("#codeVal")).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=dist%2Farchive.zip"]);
});

test("project code too-large text file matches legacy raw fallback branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(page, codeRequests, "logs/big.txt", undefined, {
    text: "",
    isTooLarge: true,
    size: 1048577,
  });

  await page.goto(`${basePath}/admin/sample/code/main/logs/big.txt`);
  await expect(page).toHaveTitle("Code - admin/sample");
  await expect
    .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent))
    .toBe("Code - admin/sample");
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p")).toContainText(
    'Site Administrator can loosen the limit by modifying "application.codeBrowser.viewer.maxFileSize" in the configuration file.',
  );
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p .filehref")).toHaveText("View Raw");
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p .filehref")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/rawcode/main/logs/big.txt`,
  );
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p .filehref")).toHaveAttribute(
    "class",
    "filehref ybtn",
  );
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p .filehref")).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator("#showCode")).toHaveCount(0);
  await expect(page.locator("#codeVal")).toHaveCount(0);
  expect(codeRequests).toEqual(["branch=main&path=logs%2Fbig.txt"]);
});

test("project code too-large text file hides site-admin limit hint for non-admin", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "logs/big.txt",
    undefined,
    {
      text: "",
      isTooLarge: true,
      size: 1048577,
    },
    {},
    undefined,
    undefined,
    { isSiteAdmin: false, userLabel: "Member" },
  );

  await page.goto(`${basePath}/admin/sample/code/main/logs/big.txt`);
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p")).toContainText(
    "Sorry, we cannot show a file larger than 1048576 bytes here.",
  );
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p")).not.toContainText(
    'Site Administrator can loosen the limit by modifying "application.codeBrowser.viewer.maxFileSize" in the configuration file.',
  );
  await expect(page.locator(".code-viewer-wrap > .file-wrap > p .filehref")).toHaveText("View Raw");
  expect(codeRequests).toEqual(["branch=main&path=logs%2Fbig.txt"]);
});

test("project SVN code text file matches legacy code/view.scala.html file state", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const codeRequests: string[] = [];
  await mockProjectCodeFile(
    page,
    codeRequests,
    "README.txt",
    "# sample\nLine two",
    { commitId: "42" },
    { vcs: "SVN" },
    [{ name: "trunk" }, { name: "branches/release" }],
    "trunk",
  );

  await page.goto(`${basePath}/admin/sample/code/trunk/README.txt`);
  await expect(page.locator(".code-browse-header > .pull-right")).toHaveCount(0);
  await expect(page.locator("#revisionNo")).toContainText("Revision 42");
  expect(codeRequests).toEqual(["branch=trunk&path=README.txt"]);
});

async function mockProjectCodeFile(
  page: Page,
  codeRequests: string[],
  filePath: string,
  data: string | undefined = "# sample\nLine two",
  fileOverrides: Record<string, unknown> = {},
  projectOverrides: Record<string, unknown> = {},
  branches: Array<{ name: string }> = [{ name: "main" }, { name: "feature/release" }],
  selectedBranch = "main",
  sessionOverrides: Record<string, unknown> = {},
) {
  page.clock.setFixedTime(new Date(2026, 6, 20, 12));
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
        ...sessionOverrides,
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
    const url = new URL(route.request().url());
    const requestedBranch = url.searchParams.get("branch") ?? selectedBranch;
    codeRequests.push(url.searchParams.toString());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches,
        breadcrumbs: breadcrumbsFor(filePath),
        entries: [],
        file: {
          authorLabel: "Admin",
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          commentCount: 2,
          commitDate: "2026-07-02T12:00:00Z",
          text: data ?? "",
          isBinary: false,
          isTooLarge: false,
          mimeType: "text/plain",
          path: filePath,
          authorLoginId: "admin",
          ...fileOverrides,
        },
        noHead: false,
        ownerName: "admin",
        path: filePath,
        projectName: "sample",
        selectedBranch: requestedBranch,
      }),
    });
  });
}

async function mockProjectCodeFolder(page: Page, codeRequests: string[], folderPath: string) {
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
    const requestedBranch = url.searchParams.get("branch") ?? "main";
    const requestedPath = url.searchParams.get("path") ?? folderPath;
    codeRequests.push(url.searchParams.toString());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: breadcrumbsFor(requestedPath),
        entries: [
          {
            commitDate: "Jul 2, 2026",
            commitMessage: "Add docs",
            commitShortId: "abc1234",
            kind: "folder",
            name: "docs",
            path: "src/docs",
          },
          {
            commitDate: "Jul 2, 2026",
            commitMessage: "Update README",
            commitShortId: "1234567",
            kind: "file",
            name: "README.txt",
            path: "src/README.txt",
          },
        ],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: requestedPath,
        projectName: "sample",
        selectedBranch: requestedBranch,
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

// Client-side syntax highlighting and code line rendering verified with Highlight.js and Style.
