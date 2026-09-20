import { expect, test, type Page } from "../wtr-compat.ts";

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
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator("form.gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator('form.gnb-search-form input[name="searchType"]')).toHaveValue("auto");
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator("[data-owner=global-gnb-search-scope-item]")).toHaveCount(2);
  await expect(page.locator("[data-owner=global-gnb-search-scope-item] > button")).toHaveText([
    "This Project",
    "All Projects",
  ]);
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
  await expect(page.locator("#breadcrumbs a")).toHaveCount(1);
  await expect(page.locator("#breadcrumbs")).toHaveText("sample");
  await expect(page.locator(".select2-chosen .branch-label.branch")).toHaveText("branch");
  await expect(page.locator(".listitem .commitDate")).toHaveText(["2 hours ago", "2 hours ago"]);
  // F5 route-relative (probed 2026-08-13): Vite emits the bundled default
  // background as new URL("project_default-DvNH5PGr.jpg", import.meta.url),
  // which resolves against the code-route chunk URL —
  // /yona/admin/sample/code/assets/project_default-DvNH5PGr.jpg (probed
  // computed backgroundImage). project-issue-form.e2e.ts:1277-1285 pins the
  // sibling /admin/sample/assets/ shape for its route depth.
  await expect
    .poll(() =>
      page
        .locator(".project-header-outer")
        .evaluate((element) => getComputedStyle(element).backgroundImage),
    )
    .toContain(`${basePath}/admin/sample/code/assets/project_default-DvNH5PGr.jpg`);
  const canonicalProjectLogoUrl = await page
    .locator(".project-header-avatar img")
    .getAttribute("src");
  expect(canonicalProjectLogoUrl).toContain(
    `${basePath}/admin/sample/code/assets/project_default_logo-CAWzVokN.png`,
  );
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
  expect(shell!.breadcrumbs.left).toBeCloseTo(shell!.branchSelect.right + 10, 1);
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

test("folder commit authors keep legacy avatar geometry without inventing user links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page, {}, undefined, undefined, true);
  await page.setViewportSize({ width: 1366, height: 900 });

  // partial_view_folder.scala.html:37-39; TemplateHelper.scala:523-535;
  // _yobiUI.less:440-460. Live legacy 1366px: avatar 20x20, then whitespace + .ml5.
  for (const path of ["", "/src"]) {
    await page.goto(`${basePath}/admin/sample/code/main${path}`);
    await expect(page.locator(".listitem .avatar-wrap")).toHaveCount(2);
    const registered = page.locator(".listitem a.avatar-wrap");
    await expect(registered).toHaveAttribute("href", `${basePath}/author`);
    await expect(registered.locator("img")).toHaveAttribute("src", `${basePath}/files/42`);
    const unknown = page.locator(".listitem button.avatar-wrap");
    await expect(unknown).not.toHaveAttribute("href", /.+/u);
    await expect(unknown.locator("img")).toHaveAttribute("src", /default-avatar-128[^/]*\.png/u);
    await expect
      .poll(() =>
        unknown
          .locator("img")
          .evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    await expect(page.locator(".listitem .avatar-wrap[data-toggle]")).toHaveCount(0);
    const rows = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".listitem"), (row) => {
        const avatar = row.querySelector<HTMLElement>(".avatar-wrap")!.getBoundingClientRect();
        const message = row.querySelector<HTMLElement>(".commitMsg .ml5")!.getBoundingClientRect();
        const cell = row.querySelector<HTMLElement>(".commitMsg")!.getBoundingClientRect();
        return { avatar, message, cell };
      }),
    );
    for (const { avatar, message, cell } of rows) {
      expect(avatar.width).toBe(20);
      expect(avatar.height).toBe(20);
      expect(avatar.left).toBeCloseTo(cell.left, 1);
      expect(avatar.top).toBeGreaterThanOrEqual(cell.top);
      expect(avatar.bottom).toBeLessThanOrEqual(cell.bottom);
      expect(message.left - avatar.right).toBeGreaterThanOrEqual(5);
      expect(message.left - avatar.right).toBeLessThanOrEqual(10);
      expect(
        Math.abs((message.top + message.bottom) / 2 - (avatar.top + avatar.bottom) / 2),
      ).toBeLessThanOrEqual(3);
    }
  }
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
});

test("Alice code root reaches the default branch before the folder screen paints", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page, { ownerName: "alice", projectName: "sample" });

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

  await expect(page.locator("#breadcrumbs a")).toHaveText(["sample"]);
  await expect(page.locator(".select2-chosen")).toHaveText("trunk");
  await expect(page.locator(".listitem .filename a")).toHaveText(["src", "README.md"]);
  expect(await folderViewMetrics(page)).toMatchObject({
    headerHeight: "40px",
    headerMarginBottom: "5px",
    listWidth: 1260,
    rowLineHeight: "40px",
  });
  await page.locator(".select2-choice").press("ArrowDown");
  const search = page.locator(".select2-search input");
  await expect(search).toBeFocused();
  await search.press("ArrowDown");
  await expect(page.locator(".select2-highlighted")).toHaveText("branches/release");
  await expect(page.locator(".select2-highlighted .branch-label")).toHaveCount(0);
  await search.press("Enter");
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/branches%2Frelease`);
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
  await expect(folderRow.locator(".filename a")).toHaveClass("dynatree-ico-cf");
  await expect(folderRow.locator(".filename a")).not.toHaveAttribute("data-type", /.+/u);
  await expect(folderRow.locator(".filename a")).not.toHaveAttribute("data-targetpath", /.+/u);
  await expect(folderRow.locator(".filename a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/main/src/main#cb-srcmain`,
  );

  const fileRow = page.locator('[id="cb-srclib.rs"]');
  await expect(fileRow).toHaveClass(/(?:^|\s)listitem(?:\s|$)/u);
  await expect(fileRow).not.toHaveAttribute("data-path", /.+/u);
  await expect(fileRow.locator(".filename a")).toHaveClass("dynatree-ico-c");
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
  await expect(page.locator("#branches")).not.toHaveAttribute("data-format", /.+/u);
  await expect(page.locator("#branches")).not.toHaveAttribute("data-dropdown-css-class", /.+/u);
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
  await expect(container.locator(".select2-results > li")).toHaveCount(0);
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
  await container.locator(".select2-search input").fill("RELEASE");
  await expect(container.locator(".select2-result-label")).toHaveText(["branch feature/release"]);
  await container.locator(".select2-search input").fill("missing-branch");
  await expect(container.locator(".select2-no-results")).toHaveText("No results");
  await container.locator(".select2-search input").press("Escape");
  await expect(container.locator(".select2-drop")).not.toBeVisible();
  await container.locator("button.select2-choice").click();
  await expect(container.locator(".select2-search input")).toHaveValue("");
  await container.locator(".select2-result-label", { hasText: "feature/release" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Frelease`);
  await expect(container.locator(".select2-chosen")).toHaveText("branch feature/release");
  await expect(page.locator("#branches")).toHaveValue(
    `${basePath}/admin/sample/code/feature%2Frelease`,
  );
  await expect(page.locator("#cb-src .filename a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/code/feature%2Frelease/src#cb-src`,
  );
});

test("code branch keyboard picker focuses, highlights, dismisses and selects a slash branch", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCodeFolder(page, {}, [{ name: "main" }, { name: "feature/ui" }]);
  await page.goto(`${basePath}/admin/sample/code/main`);
  const picker = page.locator('[data-owner="project-code-branch-picker"]');
  const trigger = picker.locator(".select2-choice");
  const search = picker.locator(".select2-search input");
  const highlighted = picker.locator(".select2-highlighted");

  await trigger.focus();
  await trigger.press("ArrowDown");
  await expect(search).toBeFocused();
  await expect(highlighted).toHaveText("branch main");
  await search.press("ArrowDown");
  await expect(highlighted).toHaveText("branch feature/ui");
  await search.press("ArrowUp");
  await expect(highlighted).toHaveText("branch main");
  await search.fill("missing-branch");
  await search.press("ArrowDown");
  await search.press("Enter");
  await expect(picker.locator(".select2-no-results")).toBeVisible();
  await expect(highlighted).toHaveCount(0);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main`);
  await search.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(picker.locator(".select2-drop")).not.toBeVisible();

  await trigger.press("Enter");
  await expect(search).toHaveValue("");
  await expect(search).toBeFocused();
  await page.locator("#breadcrumbs a").focus();
  await expect(picker.locator(".select2-drop")).not.toBeVisible();
  await trigger.click();
  await expect(search).toBeFocused();
  await search.fill("feature/ui");
  await search.press("ArrowDown");
  await expect(highlighted).toHaveText("branch feature/ui");
  await search.press("Enter");
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Fui`);
  await expect(picker.locator(".select2-chosen")).toHaveText("branch feature/ui");
});

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
    const navbar = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
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
  withAuthors = false,
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
        entries: folderResponse.entries.map((entry) => ({
          ...entry,
          ...(withAuthors
            ? {
                authorAvatarUrl:
                  entry.kind === "folder"
                    ? `${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/files/42`
                    : `${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/assets/images/default-avatar-128.png`,
                authorLabel: entry.kind === "folder" ? "Registered Author" : "External Author",
                authorLoginId: entry.kind === "folder" ? "author" : "",
              }
            : {}),
        })),
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
