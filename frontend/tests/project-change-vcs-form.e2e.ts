import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

test("project change-VCS form matches legacy project/change_vcs.scala.html DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectAdmin(page);

  await page.goto(`${basePath}/admin/sample/changeVCS`);
  await expect(page).toHaveTitle("Repository Change - admin/sample");
  await expect(page.locator("#btnChangeVCS")).toBeVisible();
  await expect(page.locator("#alertChangeVCS")).toHaveClass(/hide/);
  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator(".project-setting .project-menu-count")).toHaveText("2");
  await expect(page.locator("#subMenuProjectMember .num-badge")).toHaveText("2");
  await expect(page.locator(".gnb-search-form .dropdown-menu button")).toHaveText([
    "This Project",
    "All Projects",
  ]);

  expect(await readLegacyAnchorStates(page, ".gnb-nav > li > a")).toEqual([
    {
      ariaCurrent: null,
      className: "logo logo-letter",
      dataStatus: null,
      href: `${basePath}`,
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
      text: "IssueI",
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
      text: "BoardB",
    },
    {
      ariaCurrent: null,
      className: "",
      dataStatus: null,
      href: `${basePath}/admin/sample/setting`,
      text: "Project configuration2",
    },
  ]);
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
    projectPageMarginTop: "20px",
    projectPageWidth: 1260,
    tabsMarginBottom: "15px",
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
      `${mountPrefix}/assets/images/project_default_logo.png`,
    );
    expect(await page.locator(".project-header-outer").getAttribute("style")).toContain(
      `${mountPrefix}/assets/images/bg-default-project.png`,
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
      height: viewport.name === "mobile" ? 70 : 120,
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
  await expect(page.locator(".gnb-outer.project-header")).toBeVisible();
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

  const scopeButtons = page.locator('.gnb-search-form [data-toggle="search-scope"]');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(scopeButtons.nth(0)).toHaveAttribute(
    "data-action",
    `${basePath}/admin/sample/search`,
  );
  await expect(scopeButtons.nth(1)).toHaveAttribute(
    "data-action",
    `${basePath}/organizations/admin/search`,
  );
  await expect(scopeButtons.nth(2)).toHaveAttribute("data-action", `${basePath}/search`);

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
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
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
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
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
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide in");
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
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
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
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide in");
  await expect(page.locator("#alertChangeVCS")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#alertChangeVCS")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer + .modal-backdrop.in")).toHaveCount(1);
  await expect(page.locator(".project-page-wrap > .modal-backdrop")).toHaveCount(0);
  expect(await dispatchCancelableClick(page.locator("#alertChangeVCS .close"))).toBe(false);
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
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
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide in");

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
  await expect(page.locator("#alertChangeVCS")).toHaveClass("modal hide");
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
  const headerLinks = page.locator(".project-header-outer a");
  await expect(headerLinks).toHaveCount(2);
  await expect(headerLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin`);
  await expect(headerLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample`);
  expect(await readLegacyAnchorStates(page, ".project-header-outer a")).toEqual([
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
  ]);

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
      text: "IssueI",
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
      text: "BoardB",
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

test("project change-VCS project menu hides code-backed tabs when code is member-only", async ({
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
  await expect(projectMenuLinks).toHaveCount(5);
  await expect(projectMenuLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample`);
  await expect(projectMenuLinks.nth(1)).toHaveAttribute("href", `${basePath}/admin/sample/issues`);
  await expect(projectMenuLinks.nth(2)).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  await expect(projectMenuLinks.nth(3)).toHaveAttribute("href", `${basePath}/admin/sample/posts`);
  await expect(projectMenuLinks.nth(4)).toHaveAttribute("href", `${basePath}/admin/sample/setting`);
  await expect(page.locator(".project-menu-outer .code-menu")).toHaveCount(0);
  await expect(page.locator(".project-menu-outer a[href$='/pullRequests']")).toHaveCount(0);
  await expect(page.locator(".project-menu-outer a[href$='/reviews']")).toHaveCount(0);
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
  expect(source).toContain('to="/$user"');
  expect(source).toContain('to="/$ownerName/$projectName"');
  expect(source).toContain('to="/$ownerName/$projectName/code"');
  expect(source).toContain('to="/$ownerName/$projectName/setting"');
  expect(source).toContain('to="/$ownerName/$projectName/issue/labelsform"');
  expect(source).not.toContain("mask={{ to:");
  expect(source).toContain('to="/$ownerName/$projectName/changeVCS"');
  expect(source).toContain("params={{ ownerName, projectName }}");
  expect(source).not.toContain("onMouseDown=");
  expect(source).toContain("onClick=");
  expect(source).not.toContain('data-dismiss="modal"');
  expect(source).not.toContain('data-toggle="modal"');
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
    const navbar = requireElement(".gnb-outer");
    const projectMenu = requireElement(".project-menu-outer");
    const searchBox = requireElement(".gnb-search-form .search-box");
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
    changeVcsPostStatus?: number;
    changeVcsRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteRequests?: { hasCsrfToken: boolean; method: string }[];
    favoriteResponseFavorited?: boolean;
    project?: Partial<ReturnType<typeof projectChangeVcs>> & Record<string, unknown>;
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
  await page.route("**/api/v1/owners/admin/projects/sample/change-vcs", async (route) => {
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
          ...projectChangeVcs(),
          ...options.project,
          redirectPath: "/admin/sample",
        }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectChangeVcs(), ...options.project }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectSettings(), ...options.project }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectChangeVcs(), ...options.project }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/branches", async (route) => {
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
        projectName: "sample",
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    const request = route.request();
    options.favoriteRequests?.push({
      hasCsrfToken: request.headers()["x-csrf-token"] === "csrf-change-vcs",
      method: request.method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: options.favoriteResponseFavorited ?? true }),
    });
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
    nextVcs: "Subversion",
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanChange: true,
    viewerIsProjectMember: true,
    viewerCanUpdate: true,
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
