import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

test("project change-VCS shell keeps legacy watcher and menu counts", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);

  await expect(page.locator(".project-util-wrap")).toBeVisible();
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-menu-gruop .project-menu-count")).toHaveText(["1", "1"]);
});

test("protected weblabs portal change-VCS keeps the legacy group shell from its container projection", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    changeVcsResponse: {
      currentVcs: "GIT",
      nextVcs: "Subversion",
      ownerName: "weblabs",
      projectName: "portal",
      viewerCanChange: true,
    },
    ownerName: "weblabs",
    project: {
      enrolledUsers: [],
      id: 2,
      isProtected: undefined,
      isWatching: true,
      organizationName: "",
      projectScope: "protected",
      viewerCanWatch: true,
      watchCount: 2,
    },
    projectName: "portal",
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/weblabs/portal/changeVCS`);

  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await page.locator("#gnb-search-scope-title").click();
  await expect(
    page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button"),
  ).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(page.locator(".project-breadcrumb .project-protected")).toHaveText("G");
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("2");
  await expect(page.locator(".project-util-wrap .down-arrow")).toHaveText("Unwatch");
  await expect(page.locator(".project-page-wrap > .nav.nav-tabs")).toBeVisible();
  await expect(page.locator("#subMenuProjectChangeVCS")).toHaveClass("active");
  await expect(page.locator(".bubble-wrap.gray.wp h3")).toContainText("GIT");
  await expect(page.locator(".bubble-wrap.gray.wp h3")).toContainText("Subversion");

  await page.locator("#acceptChangeVCS").check();
  await page.locator("#btnChangeVCS").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide in/);
  await page.locator("#alertChangeVCS .close").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide/);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
    if (!menu || !pageWrap) throw new Error("Missing protected Change-VCS shell");
    return {
      menuClientWidth: menu.clientWidth,
      menuScrollWidth: menu.scrollWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      pageWrapWidth: Math.round(pageWrap.getBoundingClientRect().width),
    };
  });
  expect(mobile).toEqual({
    menuClientWidth: 390,
    menuScrollWidth: 390,
    pageScrollWidth: 390,
    pageWrapWidth: 390,
  });
});

test("Alice change-VCS keeps the legacy container shell when the form projection is partial", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    ownerName: "alice",
    projectName: "sample",
    changeVcsProject: {
      enrolledUsers: [],
      isForkedFromOrigin: true,
      menuSetting: { code: false },
      originOwnerName: "admin",
      originProjectName: "sample",
      viewerCanUpdate: true,
      viewerCanWatch: false,
      watchCount: 0,
    },
    project: {
      enrolledUsers: [{ id: 1 }, { id: 2 }],
      isForkedFromOrigin: false,
      menuSetting: {
        board: true,
        code: true,
        issue: true,
        milestone: true,
        pullRequest: true,
        review: true,
      },
      viewerCanUpdate: false,
      viewerCanWatch: true,
      watchCount: 7,
    },
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/alice/sample/changeVCS`);
  await expect(page.locator(".project-breadcrumb-wrap")).not.toHaveClass("fork");
  await expect(page.locator(".project-origin")).toHaveCount(0);
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("7");
  await expect(page.locator(".project-menu-gruop .code-menu")).toHaveCount(1);
  await expect(page.locator(".project-setting")).toHaveCount(0);
  await expect(page.locator("#subMenuProjectChangeVCS")).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
    if (!menu || !pageWrap) throw new Error("Missing legacy change-VCS shell");
    return {
      menuClientWidth: menu.clientWidth,
      menuScrollWidth: menu.scrollWidth,
      pageScrollWidth: document.documentElement.scrollWidth,
      pageWrapWidth: Math.round(pageWrap.getBoundingClientRect().width),
    };
  });
  expect(mobile).toEqual({
    menuClientWidth: 390,
    menuScrollWidth: 390,
    pageScrollWidth: 390,
    pageWrapWidth: 390,
  });
});

test("project change-VCS mobile menu ignores ordinary members for enrollment badges", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectAdmin(page, {
    project: { enrolledUsers: [], memberCount: 1, members: [{ id: 1, loginId: "admin" }] },
  });

  await page.goto(`${basePath}/admin/sample/changeVCS`);

  await expect(page.locator(".project-setting .project-menu-count")).toHaveCount(0);
  const menuWidth = await page.locator(".project-menu-outer").evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(menuWidth.scroll).toBe(menuWidth.client);
});

test("SVN project change-VCS matches the live ko-KR shell without mobile overflow", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectAdmin(page, {
    ownerName: "admin",
    projectName: "svnplayground",
    project: {
      currentVcs: "Subversion",
      enrolledUsers: [],
      isWatching: true,
      nextVcs: "GIT",
      overview: "Parity seed Subversion project for localhost checks",
      vcs: "SVN",
    },
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/svnplayground/changeVCS`);
  await expect(page).toHaveTitle("코드 저장소 타입 변경 - admin/svnplayground");
  await expect(page.locator(".project-util-wrap")).toHaveCount(1);
  await expect(page.locator(".project-menu-gruop .menu-name")).toHaveText([
    "홈",
    "코드",
    "이슈",
    "리뷰",
    "마일스톤",
    "게시판",
  ]);
  await expect(page.locator(".bubble-wrap.gray.wp h3")).toContainText("Subversion");
  await expect(page.locator(".bubble-wrap.gray.wp h3")).toContainText("GIT");
  await expect(page.locator(".cu-desc .notice")).toHaveText([
    "코드 저장소 타입을 GIT으로 변경합니다.",
    "코드 저장소 타입을 변경하면 현재 코드와 변경내역을 삭제합니다.",
  ]);
  await expect(page.locator("label[for='acceptChangeVCS']")).toHaveText(
    "코드 저장소 타입을 변경하는데 동의합니다.",
  );
  await expect(page.locator("#btnChangeVCS")).toHaveText("코드 저장소 타입을 변경합니다.");
  expect(await svnChangeVcsMetrics(page)).toEqual({
    bottomHeight: 63,
    bottomWidth: 1346,
    bubbleHeight: 136,
    bubbleWidth: 1346,
    menuClientWidth: 1366,
    menuScrollWidth: 1366,
    pageWidth: 1366,
    projectPageHeight: 276,
    projectPageWidth: 1346,
    scrollWidth: 1366,
    tabsHeight: 37,
    tabsWidth: 1346,
    utilHeight: 28,
    utilWidth: 147,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await svnChangeVcsMetrics(page)).toEqual({
    bottomHeight: 51,
    bottomWidth: 390,
    bubbleHeight: 136,
    bubbleWidth: 390,
    menuClientWidth: 390,
    menuScrollWidth: 390,
    pageWidth: 390,
    projectPageHeight: 300,
    projectPageWidth: 390,
    scrollWidth: 390,
    tabsHeight: 73,
    tabsWidth: 390,
    utilHeight: 0,
    utilWidth: 15,
  });
});

test("project change-VCS form matches legacy project/change_vcs.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await expect(page).toHaveTitle("Repository Change - admin/sample");
  await expect(page.locator("#btnChangeVCS")).toBeVisible();
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/hide/);
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator(".project-setting .project-menu-count")).toHaveText("2");
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveText("2");
  await expect(
    page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button"),
  ).toHaveText(["This Project", "All Projects"]);

  expect(await readLegacyAnchorStates(page, ".gnb-nav > li > a")).toEqual([
    {
      ariaCurrent: null,
      className: "logo logo-letter",
      dataStatus: null,
      href: `${basePath}/`,
      text: "Y",
    },
    {
      ariaCurrent: null,
      className: "show-progress-bar",
      dataStatus: null,
      href: `${basePath}/projects`,
      text: "List All",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: "https://github.com/yona-projects/yona/issues",
      text: "Feedback",
    },
  ]);
  expect(await readLegacyAnchorStates(page, ".project-menu-outer a")).toEqual([
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample`,
      text: "Project homeH",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/code`,
      text: "CodeC",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/issues`,
      text: "IssueI 1",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/pullRequests`,
      text: "Pull requestP",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/reviews`,
      text: "ReviewR",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/milestones`,
      text: "MilestoneM",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/posts`,
      text: "BoardB 1",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/setting`,
      text: "Project configuration2",
    },
  ]);
  await expect(page.locator(".project-util-wrap")).toBeVisible();
  await expect(page.locator(".project-util-wrap .watcher-count")).toHaveText("1");
  await expect(page.locator(".project-menu-gruop .project-menu-count")).toHaveText(["1", "1"]);
  expect(await readProjectSettingMenuAnchorState(page)).toEqual({
    activeItemClass: "active",
    anchors: [
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/setting`,
        text: "Settings",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/members`,
        text: "Member2",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/issue/labelsform`,
        text: "Issue Label",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/webhooks`,
        text: "Webhooks",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/transfer`,
        text: "Transfer",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/deleteform`,
        text: "Delete project",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/changeVCS`,
        text: "Repository Type Change",
      },
    ],
  });
  const shellMetrics = await readProjectChangeVcsShellMetrics(page);
  expect(shellMetrics.gnbClass).toBe("gnb-outer project-header");
  expect(shellMetrics.searchScopeText).toBe("This Project");
  expect(shellMetrics.searchScopeTop).toBeGreaterThanOrEqual(shellMetrics.navbarTop);
  expect(shellMetrics.searchScopeBottom).toBeLessThanOrEqual(shellMetrics.navbarBottom);
  expect(shellMetrics.searchBoxTop).toBeGreaterThanOrEqual(shellMetrics.navbarTop);
  expect(shellMetrics.searchBoxBottom).toBeLessThanOrEqual(shellMetrics.navbarBottom);
  expect(shellMetrics.searchBoxRight).toBeGreaterThan(shellMetrics.searchScopeRight);
  expect(shellMetrics.projectMenuTop).toBeGreaterThan(shellMetrics.navbarBottom);
  expect(await readDesktopChangeVcsMetrics(page)).toEqual({
    activeTabClass: "active",
    activeTabHeight: "38px",
    agreementLineHeight: "20px",
    agreementMarginLeft: "0px",
    bottomPadding: "20px 0px 12px",
    bubbleBackground: "rgb(247, 247, 247)",
    bubblePadding: "20px 20px 10px",
    bubbleWidth: 1260,
    buttonHeight: "31px",
    buttonLineHeight: "20px",
    buttonPadding: "4px 12px",
    checkboxMargin: "2px",
    descMarginLeft: "0px",
    descWidth: 413,
    headingFontSize: "24.5px",
    headingLineHeight: "40px",
    headingMargin: "0px",
    modalDisplay: "none",
    modalFooterPadding: "14px 15px 15px",
    modalHeaderPadding: "9px 15px",
    modalWidth: "560px",
    pageWrapMinWidth: "1100px",
    projectPageMarginTop: "5px",
    projectPageWidth: 1260,
    tabsMarginBottom: "20px",
  });
});

test("project change-VCS empty header assets use the configured application context", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const mountPrefix = basePath === "/" ? "" : basePath;

  for (const viewport of [
    { width: 1280, height: 720, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await mockProjectAdmin(page, {
      project: { logoUrl: "", backgroundImageUrl: "", backgroundUrl: "" },
    });
    await page.goto(`${mountPrefix}/admin/sample/changeVCS`);

    await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
      "src",
      new RegExp(`^${mountPrefix}/.+/project_default_logo\\.png$`),
    );
    expect(await page.locator(".project-header-outer").getAttribute("style")).toMatch(
      new RegExp(`${mountPrefix}/.+/project_default\\.jpg`),
    );
    expect(await page.locator(".project-header-outer").getAttribute("style")).not.toContain(
      "url('/assets/",
    );

    const metrics = await page.locator(".project-header-outer").evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { width: Math.round(box.width), height: Math.round(box.height) };
    });
    expect(metrics).toEqual({
      width: viewport.width,
      height: 120,
    });
    await page.screenshot({ path: `/tmp/project-change-vcs-${viewport.name}.png`, fullPage: true });
  }
});

test("project change-VCS protected project shell exposes legacy group search scope", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const changeVcsUrl = `${basePath}/admin/sample/changeVCS`;
  await mockProjectAdmin(page, {
    project: { isProtected: true, organizationName: "", projectScope: "protected" },
  });

  await page.goto(changeVcsUrl);
  await expect(page).toHaveTitle("Repository Change - admin/sample");
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-setting li.active a .menu-name")).toHaveText(
    "Project configuration",
  );
  await expect(page.locator("#subMenuProjectChangeVCS")).toHaveClass("active");
  await expect(page.locator("#btnChangeVCS")).toBeVisible();

  const scopeButtons = page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  expect(
    await scopeButtons.evaluateAll((buttons) =>
      buttons.map((button) => [
        button.getAttribute("data-action"),
        button.getAttribute("data-toggle"),
      ]),
    ),
  ).toEqual([
    [null, null],
    [null, null],
    [null, null],
  ]);

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  await expect(page).toHaveURL(changeVcsUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );

  await page.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(2).click();
  await expect(page).toHaveURL(changeVcsUrl);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  const shellMetrics = await readProjectChangeVcsShellMetrics(page);
  expect(shellMetrics.gnbClass).toBe("gnb-outer project-header");
  expect(shellMetrics.searchScopeTop).toBeGreaterThanOrEqual(shellMetrics.navbarTop);
  expect(shellMetrics.searchScopeBottom).toBeLessThanOrEqual(shellMetrics.navbarBottom);
  expect(shellMetrics.searchBoxTop).toBeGreaterThanOrEqual(shellMetrics.navbarTop);
  expect(shellMetrics.searchBoxBottom).toBeLessThanOrEqual(shellMetrics.navbarBottom);
  expect(shellMetrics.searchBoxRight).toBeGreaterThan(shellMetrics.searchScopeRight);
  expect(shellMetrics.projectMenuTop).toBeGreaterThan(shellMetrics.navbarBottom);
});

test("project change-VCS confirmation modal opens, closes, posts, and redirects through SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const changeVcsRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await auditChangeVcsNativeListeners(page);
  await mockProjectAdmin(page, { changeVcsRequests });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await installProjectChangeVcsModalBridgeAudit(page, ["alertChangeVCS"]);
  await rememberSpaMarker(page, "change-vcs-modal");
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide/);
  await expect(page.locator("#alertChangeVCS")).not.toHaveAttribute("aria-hidden", /.*/);
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "none");
  await expect(page.locator('#btnChangeVCS[data-toggle="modal"]')).toHaveCount(0);
  await expect(page.locator('#alertChangeVCS [data-dismiss="modal"]')).toHaveCount(0);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/changeVCS`);
  expect(await spaMarker(page)).toBe("change-vcs-modal");

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("You should agree with changing the repository type.");
    await dialog.accept();
  });
  expect(await dispatchCancelableClick(page.locator("#btnChangeVCS"))).toBe(false);
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/changeVCS`);
  expect(await spaMarker(page)).toBe("change-vcs-modal");
  await expect
    .poll(() => projectChangeVcsModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });

  await page.locator("#acceptChangeVCS").check();
  expect(await dispatchCancelableClick(page.locator("#btnChangeVCS"))).toBe(false);
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide in/);
  await expect(page.locator("#alertChangeVCS")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#alertChangeVCS")).toBeVisible();
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer + .modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".project-page-wrap > .modal-backdrop")).toHaveCount(0);
  await expect(page.locator("#alertChangeVCS .close")).not.toHaveAttribute("data-dismiss", /.*/);
  await expect(
    page.locator("#alertChangeVCS .modal-footer .ybtn").filter({ hasText: "No" }),
  ).not.toHaveAttribute("data-dismiss", /.*/);
  await expect(page).toHaveURL(`${basePath}/admin/sample/changeVCS`);
  expect(await spaMarker(page)).toBe("change-vcs-modal");
  await expect
    .poll(() => projectChangeVcsModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });

  expect(
    await dispatchCancelableClick(
      page.locator("#alertChangeVCS .modal-footer .ybtn").filter({ hasText: "No" }),
    ),
  ).toBe(false);
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide/);
  await expect(page.locator("#alertChangeVCS")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/changeVCS`);
  expect(await spaMarker(page)).toBe("change-vcs-modal");
  await expect
    .poll(() => projectChangeVcsModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });

  expect(await dispatchCancelableClick(page.locator("#btnChangeVCS"))).toBe(false);
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide in/);
  await expect(page.locator("#alertChangeVCS")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer + .modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".project-page-wrap > .modal-backdrop")).toHaveCount(0);
  expect(await dispatchCancelableClick(page.locator("#alertChangeVCS .close"))).toBe(false);
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide/);
  await expect(page.locator("#alertChangeVCS")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/changeVCS`);
  expect(await spaMarker(page)).toBe("change-vcs-modal");
  await expect
    .poll(() => projectChangeVcsModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });

  await rememberSpaMarker(page, "kept");
  expect(await dispatchCancelableClick(page.locator("#btnChangeVCS"))).toBe(false);
  await expect(page.locator("#alertChangeVCS")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/change-vcs") &&
      response.request().method() === "POST",
  );
  await page.locator("#btnChangeVCSExec").click();
  await postResponsePromise;

  expect(changeVcsRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await expect.poll(() => spaMarker(page)).toBe("kept");
  await expect
    .poll(() => projectChangeVcsModalBridgeAuditHits(page))
    .toEqual({
      documentClicks: [],
      getElementById: [],
    });
  expect(await readChangeVcsNativeListenerAudit(page)).toEqual([]);
});

test("project change-VCS POST failure hides modal and alerts the legacy error", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const changeVcsRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, { changeVcsPostStatus: 500, changeVcsRequests });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await page.locator("#acceptChangeVCS").check();
  await page.locator("#btnChangeVCS").click();
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide in/);

  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/change-vcs") &&
      response.request().method() === "POST",
  );
  const dialogPromise = new Promise<void>((resolve) => {
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe("Can't change repository type");
      await dialog.accept();
      resolve();
    });
  });
  await page.locator("#btnChangeVCSExec").click();
  await postResponsePromise;
  await dialogPromise;

  expect(changeVcsRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/modal hide/);
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(`${basePath}/admin/sample/changeVCS`);
});

test("project change-VCS internal project links keep legacy hrefs without route-local native listeners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installProjectChangeVcsInternalLinkNativeAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  const headerLinks = page.locator(".project-header-outer .project-breadcrumb a");
  await expect(headerLinks).toHaveCount(2);
  await expect(headerLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin`);
  await expect(headerLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample`);
  expect(await readLegacyAnchorStates(page, ".project-header-outer .project-breadcrumb a")).toEqual(
    [
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin`,
        text: "admin",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample`,
        text: "sample",
      },
    ],
  );

  const projectMenuLinks = page.locator(".project-menu-outer a");
  await expect(projectMenuLinks).toHaveCount(8);
  await expect(projectMenuLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectMenuLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/code`);
  await expect(projectMenuLinks.nth(2)).toHaveAttribute("href", `${basePath}/admin/sample/issues`);
  await expect(projectMenuLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests`,
  );
  await expect(projectMenuLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/reviews`);
  await expect(projectMenuLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  await expect(projectMenuLinks.nth(6)).toHaveAttribute("href", `${basePath}/admin/sample/posts`);
  await expect(projectMenuLinks.nth(7)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  expect(await readLegacyAnchorStates(page, ".project-menu-outer a")).toEqual([
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample`,
      text: "Project homeH",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/code`,
      text: "CodeC",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/issues`,
      text: "IssueI 1",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/pullRequests`,
      text: "Pull requestP",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/reviews`,
      text: "ReviewR",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/milestones`,
      text: "MilestoneM",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/posts`,
      text: "BoardB 1",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/setting`,
      text: "Project configuration2",
    },
  ]);

  const settingTabLinks = page.locator(".project-page-wrap > .nav.nav-tabs a");
  await expect(settingTabLinks).toHaveCount(7);
  await expect(settingTabLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(settingTabLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/members`);
  await expect(settingTabLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );
  await expect(settingTabLinks.nth(3)).toHaveAttribute("href", `${basePath}/admin/sample/webhooks`);
  await expect(settingTabLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/transfer`);
  await expect(settingTabLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/deleteform`,
  );
  await expect(settingTabLinks.nth(6)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/changeVCS`,
  );
  expect(await readProjectSettingMenuAnchorState(page)).toEqual({
    activeItemClass: "active",
    anchors: [
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/setting`,
        text: "Settings",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/members`,
        text: "Member2",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/issue/labelsform`,
        text: "Issue Label",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/webhooks`,
        text: "Webhooks",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/transfer`,
        text: "Transfer",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/deleteform`,
        text: "Delete project",
      },
      {
        ariaCurrent: null,
        className: "",
        dataStatus: null,
        href: `${basePath}/admin/sample/changeVCS`,
        text: "Repository Type Change",
      },
    ],
  });
  expect(await readProjectChangeVcsInternalLinkNativeAudit(page)).toEqual([]);

  const projectSettingsCogLink = page.locator(".project-setting a");
  await expect(projectSettingsCogLink).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(projectSettingsCogLink.locator(".project-menu-count")).toHaveText("2");
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveText("2");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await projectSettingsCogLink.click();

  await expect(page).toHaveURL(`${basePath}/admin/sample/setting`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect(page.locator("#subMenuProjectSetting")).toHaveClass("active");
  await expect(page.locator("#saveSetting")).toBeVisible();
});

test("project change-VCS shared project menu follows the canonical menu settings", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page, {
    project: {
      codeMemberOnly: true,
      viewerIsOrganizationAdmin: false,
      viewerIsProjectManager: false,
      viewerIsProjectMember: false,
      viewerIsSiteAdmin: false,
    },
  });

  await page.goto(`${basePath}/admin/sample/changeVCS`);

  const projectMenuLinks = page.locator(".project-menu-outer a");
  await expect(projectMenuLinks).toHaveCount(8);
  await expect(projectMenuLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectMenuLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/code`);
  await expect(projectMenuLinks.nth(2)).toHaveAttribute("href", `${basePath}/admin/sample/issues`);
  await expect(projectMenuLinks.nth(3)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/pullRequests`,
  );
  await expect(projectMenuLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/reviews`);
  await expect(projectMenuLinks.nth(5)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  await expect(projectMenuLinks.nth(6)).toHaveAttribute("href", `${basePath}/admin/sample/posts`);
  await expect(projectMenuLinks.nth(7)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
});

test("project change-VCS settings tabs use direct TanStack Link targets", () => {
  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/changeVCS.tsx", import.meta.url),
    "utf8",
  );

  expect(source).not.toContain("LegacyInternalLink");
  expect(source).not.toContain("ProjectSettingLink");
  expect(source).not.toContain("createLink");
  expect(source).not.toContain("setAttribute");
  expect(source).not.toContain("removeAttribute");
  expect(source).not.toContain("to={`/${ownerName}/${projectName}/labels` as never}");
  expect(source).not.toContain("as never");
  expect(source).not.toMatch(/<a\b/);
  expect(source).not.toMatch(/<a\s+href=\{(?:prefixBasePath|projectHref)/);
  expect(source).not.toContain("activeProps={{ className: undefined }}");
  expect(source).toContain("projectSearchScope={projectSearchScope}");
  expect(source).toContain(
    "organizationName: projectSearchScopeOrganizationName(containerQuery.data, ownerName)",
  );
  expect(source).toContain(
    "function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string)",
  );
  expect(source).toContain("return project.isProtected === true ? ownerName : undefined;");
  expect(source).toContain("showLegacyProjectHeaderLinks");
  expect(source).toContain("function ProjectChangeVcsTitle");
  expect(source).toContain(
    '<title>{`${t("title.projectChangeVCS")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(source).not.toContain("useProjectChangeVcsDocumentTitle");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain("globalThis.document");
  expect(source).toContain("ProjectHeader as SharedProjectHeader");
  expect(source).toContain("ProjectMenu as SharedProjectMenu");
  expect(source).toContain(
    "<SharedProjectHeader basePath={runtimeConfig.basePath} project={shellProject} />",
  );
  expect(source).toContain("<SharedProjectMenu");
  expect(source).toContain('active="setting"');
  expect(source).toContain("basePath={runtimeConfig.basePath}");
  expect(source).toContain("project={shellProject}");
  expect(source).toContain("project={changeVcsQuery.data}");
  expect(source).toContain("shellProject={containerQuery.data}");
  expect(source).not.toContain("mergeProjectChangeVcsData");
  expect(source).toContain('to="/$ownerName/$projectName/setting"');
  expect(source).toContain('to="/$ownerName/$projectName/issue/labelsform"');
  expect(source).not.toContain("mask={{ to:");
  expect(source).toContain('to="/$ownerName/$projectName/changeVCS"');
  expect(source).toContain("params={{ ownerName, projectName }}");
  expect(source).not.toContain("onMouseDown=");
  expect(source).toContain("onClick=");
  expect(source).not.toContain('data-dismiss="modal"');
  expect(source).not.toContain('data-toggle="modal"');
  expect(source).not.toContain("/assets/images/project_default_logo.png");
  expect(source).not.toContain("/assets/images/project_default.jpg");
});

test("project change-VCS confirmation modal source stays route-owned", () => {
  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/changeVCS.tsx", import.meta.url),
    "utf8",
  );
  const modalSource = source.slice(
    source.indexOf("const insulateChangeVcsModalButtonClick"),
    source.indexOf("function ProjectHeader"),
  );

  expect(modalSource).toContain("event.preventDefault();");
  expect(modalSource).toContain("event.stopPropagation();");
  expect(modalSource).toContain("setChangeVcsModalOpen(true);");
  expect(modalSource).toContain("setChangeVcsModalOpen(false);");
  expect(modalSource).toContain("onClick={openChangeVcsModal}");
  expect(modalSource).toContain("onClick={dismissChangeVcsModal}");
  expect(modalSource).not.toContain("document.");
  expect(modalSource).not.toContain("classList");
  expect(modalSource).not.toContain("style.display");
  expect(modalSource).not.toContain("addEventListener(");
});

test("project change-VCS header favorite star posts and toggles starred class", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page, { favoriteRequests });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  const favoriteToggle = page.locator(".project-breadcrumb .user-project-list");
  const favoriteStar = favoriteToggle.locator("i");
  await expect(favoriteToggle).toHaveAttribute("data-project-id", "7");
  await expect(favoriteStar).toHaveClass(/(?:^|\s)star(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)material-icons(?:\s|$)/);
  await expect(favoriteStar).toHaveClass(/(?:^|\s)va-text-top(?:\s|$)/);
  await expect(favoriteStar).not.toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await favoriteToggle.click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).toHaveClass(/starred/);
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

test("project change-VCS header favorite star removes starred class when unfavorited", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const favoriteRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectAdmin(page, {
    favoriteRequests,
    favoriteResponseFavorited: false,
    project: { isFavorite: true, isFavorited: true },
  });

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  const favoriteStar = page.locator(".project-breadcrumb .user-project-list i");
  await expect(favoriteStar).toHaveClass(/starred/);

  const favoriteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/favorite") &&
      response.request().method() === "POST",
  );
  await page.locator(".project-breadcrumb .user-project-list").click();
  await favoriteResponsePromise;

  expect(favoriteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(favoriteStar).not.toHaveClass(/starred/);
});

test("project change-VCS header favorite star has no route-local native listener", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await installFavoriteSpanNativeListenerAudit(page);
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);

  await expect(page.locator(".project-breadcrumb .user-project-list")).toHaveAttribute(
    "data-project-id",
    "7",
  );
  await expect.poll(() => favoriteSpanNativeListeners(page)).toEqual([]);
});

async function readProjectChangeVcsShellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = requireElement("[data-stylex-owner=global-gnb-outer]");
    const projectMenu = requireElement(".project-menu-outer");
    const searchBox = requireElement('[data-stylex-owner="global-gnb-search-box"]');
    const searchScope = requireElement("#gnb-search-scope-title");
    const navbarBox = navbar.getBoundingClientRect();
    const projectMenuBox = projectMenu.getBoundingClientRect();
    const searchBoxRect = searchBox.getBoundingClientRect();
    const searchScopeRect = searchScope.getBoundingClientRect();

    return {
      gnbClass: navbar.className,
      navbarBottom: Math.round(navbarBox.bottom),
      navbarTop: Math.round(navbarBox.top),
      projectMenuTop: Math.round(projectMenuBox.top),
      searchBoxBottom: Math.round(searchBoxRect.bottom),
      searchBoxRight: Math.round(searchBoxRect.right),
      searchBoxTop: Math.round(searchBoxRect.top),
      searchScopeBottom: Math.round(searchScopeRect.bottom),
      searchScopeRight: Math.round(searchScopeRect.right),
      searchScopeText: searchScope.textContent?.trim() ?? "",
      searchScopeTop: Math.round(searchScopeRect.top),
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function readDesktopChangeVcsMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = requireElement(".page-wrap-outer");
    const projectPageWrap = requireElement(".project-page-wrap");
    const tabs = requireElement(".project-page-wrap > .nav.nav-tabs");
    const activeTab = requireElement("#subMenuProjectChangeVCS");
    const bubble = requireElement(".bubble-wrap.gray.wp");
    const heading = requireElement(".bubble-wrap.gray.wp h3");
    const desc = requireElement(".bubble-wrap.gray.wp .cu-desc");
    const accept = requireElement("#acceptChangeVCS");
    const agreement = requireElement(".label-agreement");
    const bottom = requireElement(".box-wrap.bottom");
    const changeButton = requireElement("#btnChangeVCS");
    const modal = requireElement("#alertChangeVCS");
    const modalHeader = requireElement("#alertChangeVCS .modal-header");
    const modalFooter = requireElement("#alertChangeVCS .modal-footer");
    const pageWrapStyle = getComputedStyle(pageWrapOuter);
    const projectPageStyle = getComputedStyle(projectPageWrap);
    const tabsStyle = getComputedStyle(tabs);
    const activeTabStyle = getComputedStyle(activeTab);
    const bubbleStyle = getComputedStyle(bubble);
    const headingStyle = getComputedStyle(heading);
    const descStyle = getComputedStyle(desc);
    const acceptStyle = getComputedStyle(accept);
    const agreementStyle = getComputedStyle(agreement);
    const bottomStyle = getComputedStyle(bottom);
    const buttonStyle = getComputedStyle(changeButton);
    const modalStyle = getComputedStyle(modal);
    const modalHeaderStyle = getComputedStyle(modalHeader);
    const modalFooterStyle = getComputedStyle(modalFooter);
    return {
      activeTabClass: activeTab.className,
      activeTabHeight: activeTabStyle.height,
      agreementLineHeight: agreementStyle.lineHeight,
      agreementMarginLeft: agreementStyle.marginLeft,
      bottomPadding: bottomStyle.padding,
      bubbleBackground: bubbleStyle.backgroundColor,
      bubblePadding: bubbleStyle.padding,
      bubbleWidth: Math.round(bubble.getBoundingClientRect().width),
      buttonHeight: buttonStyle.height,
      buttonLineHeight: buttonStyle.lineHeight,
      buttonPadding: buttonStyle.padding,
      checkboxMargin: acceptStyle.margin,
      descMarginLeft: descStyle.marginLeft,
      descWidth: Math.round(desc.getBoundingClientRect().width),
      headingFontSize: headingStyle.fontSize,
      headingLineHeight: headingStyle.lineHeight,
      headingMargin: headingStyle.margin,
      modalDisplay: modalStyle.display,
      modalFooterPadding: modalFooterStyle.padding,
      modalHeaderPadding: modalHeaderStyle.padding,
      modalWidth: modalStyle.width,
      pageWrapMinWidth: pageWrapStyle.minWidth,
      projectPageMarginTop: projectPageStyle.marginTop,
      projectPageWidth: Math.round(projectPageWrap.getBoundingClientRect().width),
      tabsMarginBottom: tabsStyle.marginBottom,
    };

    function requireElement(selector: string): HTMLElement {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}

async function readProjectSettingMenuAnchorState(page: Page) {
  return {
    activeItemClass: await page.locator("#subMenuProjectChangeVCS").getAttribute("class"),
    anchors: await readLegacyAnchorStates(page, ".project-page-wrap > .nav.nav-tabs a"),
  };
}

async function readLegacyAnchorStates(page: Page, selector: string) {
  return page.evaluate(
    (input) =>
      Array.from(document.querySelectorAll<HTMLAnchorElement>(input)).map((anchor) => ({
        ariaCurrent: anchor.getAttribute("aria-current"),
        className: anchor.getAttribute("class") ?? "",
        dataStatus: anchor.getAttribute("data-status"),
        href: anchor.getAttribute("href"),
        text: (anchor.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
    selector,
  );
}

async function mockProjectAdmin(
  page: Page,
  options: {
    changeVcsResponse?: Record<string, unknown>;
    changeVcsPostStatus?: number;
    changeVcsProject?: Record<string, unknown>;
    changeVcsRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    ownerName?: string;
    project?: Partial<ReturnType<typeof projectChangeVcs>> & Record<string, unknown>;
    projectName?: string;
  } = {},
) {
  const ownerName = options.ownerName ?? "admin";
  const projectName = options.projectName ?? "sample";
  const project = { ...projectChangeVcs(), ...options.project, ownerName, projectName };
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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-change-vcs" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/change-vcs`,
    async (route) => {
      if (route.request().method() === "POST") {
        const request = route.request();
        options.changeVcsRequests?.push({
          hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-change-vcs",
          method: request.method(),
        });
        if (options.changeVcsPostStatus && options.changeVcsPostStatus >= 400) {
          await route.fulfill({
            contentType: "application/json",
            status: options.changeVcsPostStatus,
            body: JSON.stringify({ message: "change VCS failed" }),
          });
          return;
        }
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            ...project,
            redirectPath: `/${ownerName}/${projectName}`,
          }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          options.changeVcsResponse ?? { ...project, ...options.changeVcsProject },
        ),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/settings`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ...projectSettings(), ...options.project }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(project),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/branches`, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [
          { isDefault: true, name: "main", shortName: "main" },
          { isDefault: false, name: "develop", shortName: "develop" },
        ],
        defaultBranch: "main",
        noHead: false,
        ownerName: "admin",
        permissions: { canDelete: true, canUpdate: true },
        projectName,
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/favorite`,
    async (route) => {
      const request = route.request();
      options.favoriteRequests?.push({
        hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-change-vcs",
        method: request.method(),
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
      });
    },
  );
}

async function svnChangeVcsMetrics(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const box = element.getBoundingClientRect();
      return { height: Math.round(box.height), width: Math.round(box.width) };
    };
    const bottom = rect(".box-wrap.bottom");
    const bubble = rect(".bubble-wrap.gray.wp");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!menu) throw new Error("Missing .project-menu-outer");
    const pageWrap = rect(".page-wrap-outer");
    const projectPage = rect(".project-page-wrap");
    const tabs = rect(".project-page-wrap > .nav-tabs");
    const util = rect(".project-util-wrap");
    return {
      bottomHeight: bottom.height,
      bottomWidth: bottom.width,
      bubbleHeight: bubble.height,
      bubbleWidth: bubble.width,
      menuClientWidth: menu.clientWidth,
      menuScrollWidth: menu.scrollWidth,
      pageWidth: pageWrap.width,
      projectPageHeight: projectPage.height,
      projectPageWidth: projectPage.width,
      scrollWidth: document.documentElement.scrollWidth,
      tabsHeight: tabs.height,
      tabsWidth: tabs.width,
      utilHeight: util.height,
      utilWidth: util.width,
    };
  });
}

async function auditChangeVcsNativeListeners(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const records: string[] = [];
    EventTarget.prototype.addEventListener = function (
      this: EventTarget,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (
        this instanceof Element &&
        (this.id === "btnChangeVCS" ||
          this.id === "alertChangeVCS" ||
          Boolean(this.closest("#alertChangeVCS")))
      ) {
        records.push(`${this.id || this.className}:${type}`);
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
    (
      window as Window & typeof globalThis & { __changeVcsNativeListenerAudit?: typeof records }
    ).__changeVcsNativeListenerAudit = records;
  });
}

async function readChangeVcsNativeListenerAudit(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __changeVcsNativeListenerAudit?: string[] })
        .__changeVcsNativeListenerAudit ?? [],
  );
}

async function installProjectChangeVcsModalBridgeAudit(page: Page, modalIds: string[]) {
  await page.evaluate((ids) => {
    type GuardedWindow = typeof window & {
      __projectChangeVcsModalBridgeAudit?: {
        documentClicks: string[];
        getElementById: string[];
      };
      __projectChangeVcsModalBridgeAuditArmed?: boolean;
      __projectChangeVcsModalBridgeNativeGetElementById?: typeof Document.prototype.getElementById;
    };
    const guardedWindow = window as GuardedWindow;
    guardedWindow.__projectChangeVcsModalBridgeAudit = {
      documentClicks: [],
      getElementById: [],
    };
    guardedWindow.__projectChangeVcsModalBridgeNativeGetElementById ??=
      Document.prototype.getElementById;
    const nativeGetElementById = guardedWindow.__projectChangeVcsModalBridgeNativeGetElementById;

    Document.prototype.getElementById = function guardedGetElementById(id: string) {
      if (ids.includes(id)) {
        guardedWindow.__projectChangeVcsModalBridgeAudit?.getElementById.push(id);
      }
      return nativeGetElementById.call(this, id);
    };

    if (guardedWindow.__projectChangeVcsModalBridgeAuditArmed) {
      return;
    }

    guardedWindow.__projectChangeVcsModalBridgeAuditArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridgeTarget = target?.closest('[data-toggle="modal"], [data-dismiss="modal"]');
      if (bridgeTarget) {
        guardedWindow.__projectChangeVcsModalBridgeAudit?.documentClicks.push(
          `${bridgeTarget.tagName.toLowerCase()}:${bridgeTarget.getAttribute("data-toggle") ?? ""}:${bridgeTarget.getAttribute("data-dismiss") ?? ""}`,
        );
      }
    });
  }, modalIds);
}

async function projectChangeVcsModalBridgeAuditHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __projectChangeVcsModalBridgeAudit?: {
              documentClicks: string[];
              getElementById: string[];
            };
          }
      ).__projectChangeVcsModalBridgeAudit ?? { documentClicks: [], getElementById: [] },
  );
}

async function dispatchCancelableClick(locator: Locator) {
  return locator.evaluate((element) => {
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    return element.dispatchEvent(clickEvent);
  });
}

async function rememberSpaMarker(page: Page, value: string) {
  await page.evaluate((nextValue) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      nextValue;
  }, value);
}

async function spaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function installProjectChangeVcsInternalLinkNativeAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    Object.defineProperty(window, "__projectChangeVcsInternalLinkListeners", {
      configurable: true,
      value: [],
      writable: true,
    });
    Element.prototype.addEventListener = function addEventListenerWithChangeVcsSettingsTabAudit(
      type,
      listener,
      options,
    ) {
      if (
        this.matches(
          ".project-header-outer a, .project-menu-outer a, .project-page-wrap > .nav.nav-tabs a",
        )
      ) {
        (
          window as Window &
            typeof globalThis & { __projectChangeVcsInternalLinkListeners: string[] }
        ).__projectChangeVcsInternalLinkListeners.push(
          `${this.getAttribute("href") ?? ""}:${String(type)}`,
        );
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function readProjectChangeVcsInternalLinkNativeAudit(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & { __projectChangeVcsInternalLinkListeners?: string[] }
      ).__projectChangeVcsInternalLinkListeners ?? [],
  );
}

async function installFavoriteSpanNativeListenerAudit(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = Element.prototype.addEventListener;
    const favoriteListeners: string[] = [];
    Object.defineProperty(window, "__yonaFavoriteSpanNativeListeners", {
      configurable: true,
      value: favoriteListeners,
    });
    Element.prototype.addEventListener = function addEventListenerWithFavoriteAudit(
      type,
      listener,
      options,
    ) {
      if (this instanceof Element && this.matches(".project-breadcrumb .user-project-list")) {
        favoriteListeners.push(String(type));
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

async function favoriteSpanNativeListeners(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & typeof globalThis & { __yonaFavoriteSpanNativeListeners?: string[] })
        .__yonaFavoriteSpanNativeListeners ?? [],
  );
}

function projectChangeVcs() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    currentVcs: "GIT",
    enrolledUsers: [{ id: 1 }, { id: 2 }],
    enrollmentRequestCount: 5,
    id: 7,
    isFavorite: false,
    isFavorited: false,
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
    boardCount: 1,
    nextVcs: "Subversion",
    openIssueCount: 1,
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanChange: true,
    viewerIsProjectMember: true,
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 1,
  };
}

function projectSettings() {
  return {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    backgroundUrl: "/assets/images/bg-default-project.png",
    codeMemberOnly: false,
    defaultReviewerCount: 2,
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isFavorited: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    isUsingReviewerCount: true,
    logoUrl: "/assets/images/project_default_logo.png",
    maxReviewerCount: 3,
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    organizationName: "",
    overview: "Sample overview",
    ownerName: "admin",
    projectId: 7,
    projectName: "sample",
    projectScope: "PUBLIC",
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanUpdate: true,
    watchCount: 5,
  };
}
