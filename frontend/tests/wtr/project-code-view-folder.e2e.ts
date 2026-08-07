import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/code/$branch.tsx", import.meta.url),
  "utf8",
);
const PROJECT_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
  "utf8",
);
const FILE_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
  "utf8",
);

const EXPECTED_CODE_FOLDER_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><ul class="nav nav-tabs"><li class="active"><a href="__BASE_PATH__/admin/sample/code/main">Files</a></li><li><a href="__BASE_PATH__/admin/sample/commits/main">Commit</a></li><li><a href="__BASE_PATH__/admin/sample/branches">Branches</a></li></ul><div class="code-browse-header"><select id="branches" data-format="branch" data-dropdown-css-class="branches" class="pull-left"><option value="__BASE_PATH__/admin/sample/code/main" selected="">main</option><option value="__BASE_PATH__/admin/sample/code/feature%2Frelease">feature/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/main">sample</a><a href="__BASE_PATH__/admin/sample/code/main"></a></div><div class="pull-right"><a href="__BASE_PATH__/admin/sample/archive/main.zip" class="ybtn">Download as .zip file</a></div><div class="pull-right"><a id="new-file-link" href="__BASE_PATH__/admin/sample/postform?path=&amp;branch=main" class="ybtn">New file</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="list-wrap"><div class="row-fluid listhead"><div class="span6 filename"><strong>File name</strong></div><div class="span4 commitMsg"><strong>Commit message</strong></div><div class="span2 commitDate"><strong>Commit date</strong></div></div><div id="cb-src" class="row-fluid listitem"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/main/src#cb-src" class="folder" title="src"><span class="dynatree-icon vmiddle"></span>src</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/abcdef1?branch=main">Add source</a></span></div><div class="span1 commitDate">2 hours ago</div></div><div id="cb-README.md" class="row-fluid listitem"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/main/README.md" class="file" title="README.md"><span class="dynatree-icon vmiddle"></span>README.md</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/1234567?branch=main">Update README</a></span></div><div class="span1 commitDate">2 hours ago</div></div></div></div></div></div></div>
`;

const EXPECTED_SVN_CODE_FOLDER_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="code-browse-wrap"><ul class="nav nav-tabs"><li class="active"><a href="__BASE_PATH__/admin/sample/code/trunk">Files</a></li><li><a href="__BASE_PATH__/admin/sample/commits/trunk">Commit</a></li></ul><div class="code-browse-header"><select id="branches" data-format="branch" data-dropdown-css-class="branches" class="pull-left"><option value="__BASE_PATH__/admin/sample/code/trunk" selected="">trunk</option><option value="__BASE_PATH__/admin/sample/code/branches%2Frelease">branches/release</option></select><div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left"><a href="__BASE_PATH__/admin/sample/code/trunk">sample</a></div></div><div class="code-viewer-wrap"><div id="spin" style="position:fixed;top:50%;left:50%"></div><div class="list-wrap"><div class="row-fluid listhead"><div class="span6 filename"><strong>File name</strong></div><div class="span4 commitMsg"><strong>Commit message</strong></div><div class="span2 commitDate"><strong>Commit date</strong></div></div><div id="cb-src" class="row-fluid listitem"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/trunk/src#cb-src" class="folder" title="src"><span class="dynatree-icon vmiddle"></span>src</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/abcdef1?branch=trunk">Add source</a></span></div><div class="span1 commitDate">Jul 1, 2026</div></div><div id="cb-README.md" class="row-fluid listitem"><div class="span6 filename"><a href="__BASE_PATH__/admin/sample/code/trunk/README.md" class="file" title="README.md"><span class="dynatree-icon vmiddle"></span>README.md</a></div><div class="span5 commitMsg"><span class="ml5"><a href="__BASE_PATH__/admin/sample/commit/1234567?branch=trunk">Update README</a></span></div><div class="span1 commitDate">Jul 2, 2026</div></div></div></div></div></div></div>
`;

test("project code branch root folder matches legacy code/view.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page);

  await page.goto(`${basePath}/admin/sample/code/main`);
  await expect(page).toHaveTitle("Code - admin/sample");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Array.from(document.head.querySelectorAll("title"), (title) => title.textContent ?? ""),
      ),
    )
    .toContain("Code - admin/sample");
  await expect(page.locator("header[data-stylex-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator('form.gnb-search-form input[name="searchType"]')).toHaveValue("auto");
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator("[data-stylex-owner=global-gnb-search-scope-item]")).toHaveCount(2);
  await expect(
    page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button"),
  ).toHaveText(["This Project", "All Projects"]);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".code-browse-wrap > .nav.nav-tabs > li")).toHaveCount(3);
  await expect(page.locator(".code-viewer-wrap .listitem")).toHaveCount(2);
  await expect(page.locator(".code-browse-wrap a[data-status]")).toHaveCount(0);
  const activeFilesLink = page.locator(".code-browse-wrap > .nav.nav-tabs a").first();
  const breadcrumbProjectLink = page.locator(".code-breadcrumb-wrap a").first();
  await expect(activeFilesLink).toHaveAttribute("href", `${basePath}/admin/sample/code/main`);
  await expect(activeFilesLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(activeFilesLink).not.toHaveAttribute("data-status", /.+/u);
  await expect(breadcrumbProjectLink).toHaveAttribute("href", `${basePath}/admin/sample/code/main`);
  await expect(breadcrumbProjectLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(breadcrumbProjectLink).not.toHaveAttribute("data-status", /.+/u);
  await expect(page.locator("#breadcrumbs a")).toHaveCount(2);
  await expect(page.locator("#breadcrumbs")).toHaveText("sample");
  await expect(page.locator(".select2-chosen .branch-label.branch")).toHaveText("branch");
  await expect(page.locator(".listitem .commitDate")).toHaveText(["2 hours ago", "2 hours ago"]);
  await expect
    .poll(() =>
      page
        .locator(".project-header-outer")
        .evaluate((element) => getComputedStyle(element).backgroundImage),
    )
    .toContain("/yona/assets/project_default-DvNH5PGr.jpg");
  const canonicalProjectLogoUrl = await page
    .locator(".project-header-avatar img")
    .getAttribute("src");
  expect(canonicalProjectLogoUrl).toContain("/yona/assets/project_default_logo-CAWzVokN.png");
  const projectLogoResponse = await page.request.get(
    new URL(canonicalProjectLogoUrl!, page.url()).href,
  );
  expect(projectLogoResponse.status()).toBe(200);
  await expect(
    page.locator('.code-browse-header .pull-right a.ybtn:has-text("Download")'),
  ).toHaveAttribute("href", `${basePath}/admin/sample/archive/main.zip`);
  await expect(page.locator("#new-file-link")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=&branch=main`,
  );
  await expect(page.locator("#cb-src .filename a.dynatree-ico-cf")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src#cb-src`,
  );
  await expect(page.locator("#cb-README\\.md .commitMsg a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/1234567?branch=main`,
  );
  await expect(page.locator("#cb-README\\.md .filename a")).toHaveClass("dynatree-ico-c");
  expect(await codeIconMetrics(page)).toEqual({
    file: {
      hasBackgroundImage: true,
      backgroundPosition: "0px 0px",
      height: 16,
      width: 16,
    },
    folder: {
      hasBackgroundImage: true,
      backgroundPosition: "0px -16px",
      height: 16,
      width: 16,
    },
  });

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, expectedCodeFolderBody(EXPECTED_CODE_FOLDER_BODY, basePath)),
  );
  const shell = await shellMetrics(page);
  expect(shell).not.toBeNull();
  expect(shell!.searchForm.top).toBeGreaterThanOrEqual(shell!.navbar.top);
  expect(shell!.searchForm.bottom).toBeLessThanOrEqual(shell!.navbar.bottom);
  expect(shell!.searchForm.right).toBeLessThanOrEqual(shell!.navbar.right);
  expect(shell!.scopeButton.left).toBeGreaterThanOrEqual(shell!.searchForm.left);
  expect(shell!.scopeButton.right).toBeLessThanOrEqual(shell!.searchForm.right);
  expect(shell!.projectHeader.top).toBeLessThanOrEqual(shell!.navbar.bottom);
  expect(shell!.projectHeader.bottom).toBeGreaterThan(shell!.navbar.bottom);
  expect(shell!.projectMenu.top).toBeGreaterThanOrEqual(shell!.projectHeader.bottom - 1);
  expect(shell!.codeTabs.top).toBeGreaterThanOrEqual(shell!.projectMenu.bottom - 1);
  expect(shell!.branchSelect.top).toBeGreaterThanOrEqual(shell!.codeTabs.bottom - 1);
  expect(Math.abs(shell!.branchSelect.top - shell!.breadcrumbs.top)).toBeLessThanOrEqual(3);
  expect(await folderViewMetrics(page)).toEqual({
    commitDateColor: "rgb(126, 126, 126)",
    commitDateFontSize: "10.6667px",
    commitDatePaddingRight: "5px",
    commitDateTextAlign: "right",
    commitDateWhiteSpace: "nowrap",
    commitMsgColor: "rgb(126, 126, 126)",
    commitMsgFontSize: "13.3333px",
    commitMsgOverflow: "hidden",
    commitMsgTextOverflow: "ellipsis",
    filenameFontSize: "13.3333px",
    filenameOverflow: "hidden",
    filenameWhiteSpace: "nowrap",
    headerBackground: "rgb(247, 247, 247)",
    headerBorderBottomWidth: "2px",
    headerFilenamePaddingLeft: "5px",
    headerHeight: "40px",
    headerLineHeight: "40px",
    headerMarginBottom: "5px",
    iconMargin: "0px 3px 1px 5px",
    listWidth: 1260,
    rowBorderBottomWidth: "1px",
    rowLineHeight: "40px",
  });
});

test("project code root redirects non-empty repository to default branch folder", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page);

  await page.goto(`${basePath}/admin/sample/code`);

  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect(page.locator(".code-viewer-wrap .listitem")).toHaveCount(2);
  await expect(page.locator("#cb-src .filename a.dynatree-ico-cf")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src#cb-src`,
  );
  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, expectedCodeFolderBody(EXPECTED_CODE_FOLDER_BODY, basePath)),
  );
});

test("Alice code root reaches the default branch before the folder screen paints", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page, { ownerName: "alice", projectName: "sample" });

  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/code.tsx", import.meta.url),
    "utf8",
  );
  expect(routeSource).toContain(
    'import { useState, useLayoutEffect, type FormEvent } from "react";',
  );
  expect(routeSource).not.toContain('import { useEffect } from "react";');
  expect(routeSource).toContain("useLayoutEffect(() => {");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/alice/sample/code`);
  await expect(page).toHaveURL(`${basePath}/alice/sample/code/main`);
  await expect(page.locator(".code-viewer-wrap .listitem")).toHaveCount(2);
  await expect(page.locator(".project-page-wrap:empty")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => ({
    pageScrollWidth: document.documentElement.scrollWidth,
    pageWrapWidth: Math.round(
      document.querySelector<HTMLElement>(".page-wrap-outer")!.getBoundingClientRect().width,
    ),
  }));
  expect(mobile).toEqual({ pageScrollWidth: 390, pageWrapWidth: 390 });
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
      EXPECTED_SVN_CODE_FOLDER_BODY.replaceAll("__BASE_PATH__", basePath)
        .replace(
          `<a href="${basePath}/admin/sample/code/trunk">sample</a>`,
          `<a href="${basePath}/admin/sample/code/trunk">sample</a><a href="${basePath}/admin/sample/code/trunk"></a>`,
        )
        .replaceAll("Jul 1, 2026", "2 hours ago")
        .replaceAll("Jul 2, 2026", "2 hours ago")
        .replaceAll('class="folder"', 'class="dynatree-ico-cf"')
        .replaceAll('class="file"', 'class="dynatree-ico-c"'),
    ),
  );
  expect(await folderViewMetrics(page)).toMatchObject({
    headerHeight: "40px",
    headerMarginBottom: "5px",
    listWidth: 1260,
    rowLineHeight: "40px",
  });
});

test("project code branch folder links navigate with TanStack Router without document reload", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    (
      window as typeof window & { __yonaCodeFolderDocumentMarker: string }
    ).__yonaCodeFolderDocumentMarker = Math.random().toString(36);
  });
  await mockProjectCodeFolder(page);

  await page.goto(`${basePath}/admin/sample/code/main`);
  const markerBefore = await page.evaluate(
    () =>
      (window as typeof window & { __yonaCodeFolderDocumentMarker: string })
        .__yonaCodeFolderDocumentMarker,
  );
  await page.locator("#cb-src .filename a.dynatree-ico-cf").click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main/src#cb-src`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __yonaCodeFolderDocumentMarker: string })
            .__yonaCodeFolderDocumentMarker,
      ),
    )
    .toBe(markerBefore);
});

test("project code nested folder matches legacy partial_view_folder.scala.html DOM contract", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page);

  await page.goto(`${basePath}/admin/sample/code/main/src`);

  await expect(page.locator(".code-viewer-wrap .file-wrap")).toHaveCount(0);
  const folderList = page.locator(".code-viewer-wrap > .list-wrap");
  await expect(folderList).toBeVisible();
  await expect(folderList).not.toHaveAttribute("data-type", /.+/u);
  await expect(folderList).not.toHaveAttribute("data-listpath", /.+/u);
  await expect(page.locator(".code-browse-wrap > .nav.nav-tabs > li")).toHaveCount(3);
  await expect(page.locator("#branches")).toHaveClass(/pull-left/);
  await expect(page.locator("#new-file-link")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/postform?path=src/&branch=main`,
  );
  await expect(page.locator("#breadcrumbs a")).toHaveText(["sample", "src"]);
  await expect(page.locator("#breadcrumbs a").nth(1)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src`,
  );

  const folderRow = page.locator("#cb-srcmain");
  await expect(folderRow).toHaveClass(/(?:^|\s)listitem(?:\s|$)/u);
  await expect(folderRow).not.toHaveAttribute("data-path", /.+/u);
  await expect(folderRow.locator(".filename a")).toHaveClass("folder");
  await expect(folderRow.locator(".filename a")).not.toHaveAttribute("data-type", /.+/u);
  await expect(folderRow.locator(".filename a")).not.toHaveAttribute("data-targetpath", /.+/u);
  await expect(folderRow.locator(".filename a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src/main#cb-srcmain`,
  );

  const fileRow = page.locator('[id="cb-srclib.rs"]');
  await expect(fileRow).toHaveClass(/(?:^|\s)listitem(?:\s|$)/u);
  await expect(fileRow).not.toHaveAttribute("data-path", /.+/u);
  await expect(fileRow.locator(".filename a")).toHaveClass("file");
  await expect(fileRow.locator(".filename a")).not.toHaveAttribute("data-type", /.+/u);
  await expect(fileRow.locator(".filename a")).not.toHaveAttribute("data-targetpath", /.+/u);
  await expect(fileRow.locator(".filename a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src/lib.rs`,
  );
  await expect(fileRow.locator(".commitMsg a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/7654321?branch=main`,
  );

  expect(await folderViewMetrics(page)).toMatchObject({
    headerHeight: "40px",
    headerMarginBottom: "5px",
    rowLineHeight: "40px",
  });
});

test("project code branch selector navigates slash branch in the SPA", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page);
  await page.addInitScript(() => {
    (
      window as typeof window & { __yonaCodeFolderBranchDocumentMarker: string }
    ).__yonaCodeFolderBranchDocumentMarker = Math.random().toString(36);
  });

  await page.goto(`${basePath}/admin/sample/code/main`);
  const markerBefore = await page.evaluate(
    () =>
      (window as typeof window & { __yonaCodeFolderBranchDocumentMarker: string })
        .__yonaCodeFolderBranchDocumentMarker,
  );
  await expect(page.locator("#branches")).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(page.locator("#branches")).toHaveAttribute("data-format", "branch");
  await expect(page.locator("#branches")).toHaveAttribute("data-dropdown-css-class", "branches");
  await expect(page.locator("#branches")).toHaveValue(`${basePath}/admin/sample/code/main`);
  await expect(
    page.locator('#branches option[value$="/admin/sample/code/feature%2Frelease"]'),
  ).toHaveText("feature/release");

  await page.locator("#branches").selectOption(`${basePath}/admin/sample/code/feature%2Frelease`);

  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/code/feature%2Frelease$`));
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Code");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { __yonaCodeFolderBranchDocumentMarker: string })
            .__yonaCodeFolderBranchDocumentMarker,
      ),
    )
    .toBe(markerBefore);
});

test("project code branch renders React-owned legacy Select2 geometry and navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page);
  await page.goto(`${basePath}/admin/sample/code/main`);
  const container = page.locator("#branches").locator("xpath=preceding-sibling::div[1]");
  await expect(container).toHaveClass(/select2-container/);
  await expect(container).toHaveCSS("width", "220px");
  await expect(container.locator(".select2-chosen")).toHaveText("branch main");
  await expect(page.locator("#branches")).toHaveClass("pull-left select2-offscreen");
  await container.locator("button.select2-choice").click();
  await expect(container).toHaveClass(/select2-container-active/);
  await expect(container.locator(".select2-drop-active")).toBeVisible();
  await expect(container.locator(".select2-result-label")).toHaveText([
    "branch main",
    "branch feature/release",
  ]);
  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await container.evaluate((root) => {
      const choice = root.querySelector<HTMLElement>(".select2-choice")!;
      const chosen = root.querySelector<HTMLElement>(".select2-chosen")!;
      const arrow = root.querySelector<HTMLElement>(".select2-arrow")!;
      const choiceBox = choice.getBoundingClientRect();
      return {
        arrowRight: arrow.getBoundingClientRect().right,
        choiceRight: choiceBox.right,
        choiceWidth: choiceBox.width,
        clientWidth: (root as HTMLElement).clientWidth,
        fontSize: getComputedStyle(choice).fontSize,
        lineHeight: getComputedStyle(choice).lineHeight,
        textAlign: getComputedStyle(chosen).textAlign,
      };
    });
    expect(geometry.choiceWidth).toBeCloseTo(geometry.clientWidth, 1);
    expect(geometry.arrowRight).toBeCloseTo(geometry.choiceRight, 1);
    expect(geometry.fontSize).toBe("13px");
    expect(geometry.lineHeight).toBe("26px");
    expect(geometry.textAlign).toBe("left");
    expect(await codeIconMetrics(page)).toEqual({
      file: {
        hasBackgroundImage: true,
        backgroundPosition: "0px 0px",
        height: 16,
        width: 16,
      },
      folder: {
        hasBackgroundImage: true,
        backgroundPosition: "0px -16px",
        height: 16,
        width: 16,
      },
    });
  }
  await container.locator(".select2-result-label", { hasText: "feature/release" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Frelease`);
});

test("project code branch route source converts internal raw anchors to Link", async () => {
  expect(ROUTE_SOURCE).toContain('import "./legacy-dynatree.css";');
  expect(ROUTE_SOURCE).not.toContain(
    'import "../../../../../../yona-original/public/stylesheets/dynatree/skin/ui.dynatree.css";',
  );
  expect(ROUTE_SOURCE).toContain(
    'import { Link, createFileRoute, useRouter, useParams } from "@tanstack/react-router"',
  );
  expect(ROUTE_SOURCE).toContain(
    '<title>{`${t("menu.code")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(ROUTE_SOURCE).not.toContain("useProjectCodeBranchDocumentTitle");
  // F6 copy-fix: since f70dbbc0b the SiteLayoutShell + projectSearchScope + showLegacyProjectHeaderLinks
  // were hoisted out of code/$branch.tsx; the route is now a thin LastOutletTransition wrapper and the
  // shell/search scope lives in the parent $projectName.tsx route.
  expect(ROUTE_SOURCE).toContain("<LastOutletTransition routeId={Route.id} />");
  expect(PROJECT_ROUTE_SOURCE).toContain("projectSearchScope={projectSearchScope}");
  expect(PROJECT_ROUTE_SOURCE).toContain('showLegacyProjectHeaderLinks={active === "search"}');
  expect(ROUTE_SOURCE).not.toContain("document.title");
  expect(ROUTE_SOURCE).toContain("router.history.push(event.currentTarget.value)");
  expect(ROUTE_SOURCE).not.toContain('data-toggle="select2"');
  expect(ROUTE_SOURCE).not.toContain('data-toggle={"select2"}');
  expect(ROUTE_SOURCE).toContain("activeOptions={{");
  expect(ROUTE_SOURCE).toContain("activeProps={{");
  expect(ROUTE_SOURCE).toContain('"data-status": undefined');
  expect(ROUTE_SOURCE).not.toContain("__legacyInactive");
  expect(ROUTE_SOURCE).toContain("reloadDocument");
  expect(ROUTE_SOURCE).not.toContain("legacyLinkProps");
  expect(ROUTE_SOURCE).not.toContain("FILE_LIST_ITEM_TEMPLATE");
  expect(ROUTE_SOURCE).not.toContain("tplFileListItem");
  expect(ROUTE_SOURCE).not.toContain("text/x-jquery-tmpl");
  expect(ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(ROUTE_SOURCE).not.toContain('data-type="folder"');
  expect(ROUTE_SOURCE).not.toContain("data-targetpath");
  expect(ROUTE_SOURCE).not.toContain("data-path={entry.path}");
  expect(ROUTE_SOURCE).not.toContain("<a");
  expect(ROUTE_SOURCE).not.toContain("function commitHref");
  expect(ROUTE_SOURCE).not.toContain("href={commitHref(");
  expect(ROUTE_SOURCE).not.toContain("href={`${projectHref(");
  expect(ROUTE_SOURCE).not.toContain('id="new-file-link"\n                      href=');
  // F6 copy-fix: the legacy-assets images are now bundled imports resolved through
  // prefixBasePath(basePath, defaultProjectBackgroundUrl / defaultProjectLogoUrl).
  expect(PROJECT_ROUTE_SOURCE).toContain(
    'prefixBasePath(basePath, defaultProjectBackgroundUrl)',
  );
  expect(PROJECT_ROUTE_SOURCE).toContain(
    'prefixBasePath(basePath, defaultProjectLogoUrl)',
  );
});

test("project code file route source keeps nested folder view in React Link state", async () => {
  expect(FILE_ROUTE_SOURCE).toContain("function FolderList(");
  expect(FILE_ROUTE_SOURCE).not.toContain('data-type="folder"');
  expect(FILE_ROUTE_SOURCE).not.toContain("data-listpath={filePath}");
  expect(FILE_ROUTE_SOURCE).not.toContain("data-targetpath");
  expect(FILE_ROUTE_SOURCE).not.toContain("data-path={entry.path}");
  expect(FILE_ROUTE_SOURCE).toContain("const isFolder = code.file === null");
  expect(FILE_ROUTE_SOURCE).toContain("router.history.push(event.currentTarget.value)");
  expect(FILE_ROUTE_SOURCE).not.toContain("document.");
  expect(FILE_ROUTE_SOURCE).not.toContain("classList");
  expect(FILE_ROUTE_SOURCE).not.toContain("style.display");
  expect(FILE_ROUTE_SOURCE).not.toContain("<a");
  expect(FILE_ROUTE_SOURCE).not.toContain("tplFileListItem");
  expect(FILE_ROUTE_SOURCE).not.toContain("text/x-jquery-tmpl");
});

function expectedCodeFolderBody(template: string, basePath: string) {
  return template
    .replaceAll("__BASE_PATH__", basePath)
    .replaceAll('class="folder"', 'class="dynatree-ico-cf"')
    .replaceAll('class="file"', 'class="dynatree-ico-c"');
}

async function codeIconMetrics(page: Page) {
  return page.evaluate(() => {
    const readIcon = (selector: string) => {
      const icon = document.querySelector<HTMLElement>(selector);
      if (!icon) throw new Error(`Missing code browser icon: ${selector}`);
      const style = getComputedStyle(icon);
      const box = icon.getBoundingClientRect();
      return {
        backgroundPosition: style.backgroundPosition,
        hasBackgroundImage: style.backgroundImage !== "none",
        height: box.height,
        width: box.width,
      };
    };
    return {
      file: readIcon("#cb-README\\.md .dynatree-icon"),
      folder: readIcon("#cb-src .dynatree-icon"),
    };
  });
}

async function folderViewMetrics(page: Page) {
  return page.locator(".code-viewer-wrap .list-wrap").evaluate((list) => {
    const header = list.querySelector<HTMLElement>(".listhead");
    const headerFilename = list.querySelector<HTMLElement>(".listhead .filename");
    const row = list.querySelector<HTMLElement>(".listitem");
    const filename = list.querySelector<HTMLElement>(".listitem .filename");
    const commitMsg = list.querySelector<HTMLElement>(".listitem .commitMsg");
    const commitDate = list.querySelector<HTMLElement>(".listitem .commitDate");
    const icon = list.querySelector<HTMLElement>(".listitem .dynatree-icon");
    const missing = Object.entries({
      commitDate,
      commitMsg,
      filename,
      header,
      headerFilename,
      icon,
      row,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected folder view metric targets are missing: ${missing.join(", ")}`);
    }

    const commitDateStyle = window.getComputedStyle(commitDate);
    const commitMsgStyle = window.getComputedStyle(commitMsg);
    const filenameStyle = window.getComputedStyle(filename);
    const headerFilenameStyle = window.getComputedStyle(headerFilename);
    const headerStyle = window.getComputedStyle(header);
    const iconStyle = window.getComputedStyle(icon);
    const rowStyle = window.getComputedStyle(row);
    return {
      commitDateColor: commitDateStyle.color,
      commitDateFontSize: commitDateStyle.fontSize,
      commitDatePaddingRight: commitDateStyle.paddingRight,
      commitDateTextAlign: commitDateStyle.textAlign,
      commitDateWhiteSpace: commitDateStyle.whiteSpace,
      commitMsgColor: commitMsgStyle.color,
      commitMsgFontSize: commitMsgStyle.fontSize,
      commitMsgOverflow: commitMsgStyle.overflow,
      commitMsgTextOverflow: commitMsgStyle.textOverflow,
      filenameFontSize: filenameStyle.fontSize,
      filenameOverflow: filenameStyle.overflow,
      filenameWhiteSpace: filenameStyle.whiteSpace,
      headerBackground: headerStyle.backgroundColor,
      headerBorderBottomWidth: headerStyle.borderBottomWidth,
      headerFilenamePaddingLeft: headerFilenameStyle.paddingLeft,
      headerHeight: headerStyle.height,
      headerLineHeight: headerStyle.lineHeight,
      headerMarginBottom: headerStyle.marginBottom,
      iconMargin: iconStyle.margin,
      listWidth: Math.round(list.getBoundingClientRect().width),
      rowBorderBottomWidth: rowStyle.borderBottomWidth,
      rowLineHeight: rowStyle.lineHeight,
    };
  });
}

async function shellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const searchForm = document.querySelector<HTMLElement>("form.gnb-search-form");
    const scopeButton = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const projectHeader = document.querySelector<HTMLElement>(".project-header-outer");
    const projectMenu = document.querySelector<HTMLElement>(".project-menu-outer");
    const codeTabs = document.querySelector<HTMLElement>(".code-browse-wrap > .nav.nav-tabs");
    const branchSelect = document.querySelector<HTMLElement>(
      ".code-browse-header > .select2-container",
    );
    const breadcrumbs = document.querySelector<HTMLElement>("#breadcrumbs");
    const missing = Object.entries({
      branchSelect,
      breadcrumbs,
      codeTabs,
      navbar,
      projectHeader,
      projectMenu,
      scopeButton,
      searchForm,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(`Expected shell metric targets are missing: ${missing.join(", ")}`);
    }

    return {
      branchSelect: branchSelect.getBoundingClientRect(),
      breadcrumbs: breadcrumbs.getBoundingClientRect(),
      codeTabs: codeTabs.getBoundingClientRect(),
      navbar: navbar.getBoundingClientRect(),
      projectHeader: projectHeader.getBoundingClientRect(),
      projectMenu: projectMenu.getBoundingClientRect(),
      scopeButton: scopeButton.getBoundingClientRect(),
      searchForm: searchForm.getBoundingClientRect(),
    };
  });
}

async function mockProjectCodeFolder(
  page: Page,
  projectOverrides: Record<string, unknown> = {},
  branches: Array<{ name: string }> = [{ name: "main" }, { name: "feature/release" }],
  selectedBranch = "main",
) {
  const ownerName =
    typeof projectOverrides.ownerName === "string" ? projectOverrides.ownerName : "admin";
  const projectName =
    typeof projectOverrides.projectName === "string" ? projectOverrides.projectName : "sample";
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
          backgroundImageUrl: "",
          enrollmentRequestCount: 0,
          id: 7,
          isFavorite: false,
          isForkedFromOrigin: false,
          isPrivate: false,
          isProtected: false,
          logoUrl: "",
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
          ...projectOverrides,
        }),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/code**`, async (route) => {
    const url = new URL(route.request().url());
    const path = url.searchParams.get("path") ?? "";
    const branch = url.searchParams.get("branch") ?? selectedBranch;
    const folderResponse =
      path === "src"
        ? {
            breadcrumbs: [{ name: "src", path: "src" }],
            entries: [
              {
                commitDate: recentCommitTimestamp(),
                commitMessage: "Add main module",
                commitShortId: "fedcba9",
                kind: "folder",
                name: "main",
                path: "src/main",
              },
              {
                commitDate: recentCommitTimestamp(),
                commitMessage: "Add library",
                commitShortId: "7654321",
                kind: "file",
                name: "lib.rs",
                path: "src/lib.rs",
              },
            ],
            path: "src",
          }
        : {
            breadcrumbs: [],
            entries: [
              {
                commitDate: recentCommitTimestamp(),
                commitMessage: "Add source",
                commitShortId: "abcdef1",
                kind: "folder",
                name: "src",
                path: "src",
              },
              {
                commitDate: recentCommitTimestamp(),
                commitMessage: "Update README",
                commitShortId: "1234567",
                kind: "file",
                name: "README.md",
                path: "README.md",
              },
            ],
            path: "",
          };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches,
        breadcrumbs: folderResponse.breadcrumbs,
        entries: folderResponse.entries,
        file: null,
        noHead: false,
        ownerName,
        path: folderResponse.path,
        projectName,
        selectedBranch: branch,
      }),
    });
  });
}

function recentCommitTimestamp() {
  return new Date(Date.now() - (2 * 60 + 5) * 60 * 1_000).toISOString();
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
      if (node.matches(".select2-container")) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "tabindex" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(([name, value]) => !(name === "class" && value === ""))
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      if (attr.name === "style") {
        return attr.value.replace(/\s+/g, "").replace(/;$/u, "");
      }
      return attr.name === "class"
        ? attr.value
            .split(/\s+/u)
            .filter(
              (name) =>
                name &&
                name !== "select2-offscreen" &&
                name !== "gray-txt" &&
                name !== "right-txt" &&
                !/^x[0-9a-z]+$/u.test(name) &&
                !name.includes("__"),
            )
            .join(" ")
        : attr.value;
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
        .map((attr) => [attr.name, normalizeAttr(attr)] as const)
        .filter(([name, value]) => !(name === "class" && value === ""))
        .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
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
