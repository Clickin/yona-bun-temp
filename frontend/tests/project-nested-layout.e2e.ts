import { expect, test, type Page } from "@playwright/test";

test("project home to issues keeps the legacy project shell DOM nodes mounted", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectHomeAndIssues(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator(".project-home-header")).toBeVisible();
  await captureProjectShellNodes(page);
  await expectProjectShellGeometry(page);

  await page.locator(".project-menu-gruop a[href$='/admin/sample/issues']").click();
  await expect(page).toHaveURL(/\/admin\/sample\/issues(?:\?|$)/);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator(".project-home-header")).toHaveCount(0);
  await expectProjectShellNodesToPersist(page);
  await expectProjectShellGeometry(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expectProjectShellNodesToPersist(page);
  await expectProjectShellGeometry(page);
});

async function captureProjectShellNodes(page: Page) {
  await page.evaluate(() => {
    const shell = {
      gnb: document.querySelector(".gnb-outer"),
      header: document.querySelector(".project-header-outer"),
      menu: document.querySelector(".project-menu-outer"),
    };
    if (!shell.gnb || !shell.header || !shell.menu) throw new Error("Missing project layout shell");
    (window as Window & { __projectLayoutShell?: typeof shell }).__projectLayoutShell = shell;
  });
}

async function expectProjectShellNodesToPersist(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const previous = (
          window as Window & { __projectLayoutShell?: Record<string, Element | null> }
        ).__projectLayoutShell;
        return Boolean(
          previous &&
          previous.gnb === document.querySelector(".gnb-outer") &&
          previous.header === document.querySelector(".project-header-outer") &&
          previous.menu === document.querySelector(".project-menu-outer"),
        );
      }),
    )
    .toBe(true);
}

async function expectProjectShellGeometry(page: Page) {
  const metrics = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const gnb = rect(".gnb-outer");
    const header = rect(".project-header-outer");
    const menu = rect(".project-menu-outer");
    const body = rect(".project-page-wrap");
    return {
      bodyLeft: body.left,
      bodyRight: body.right,
      gnbBottom: gnb.bottom,
      gnbLeft: gnb.left,
      gnbRight: gnb.right,
      gnbTop: gnb.top,
      headerBottom: header.bottom,
      headerLeft: header.left,
      headerRight: header.right,
      headerTop: header.top,
      menuLeft: menu.left,
      menuRight: menu.right,
      menuTop: menu.top,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(metrics.gnbTop).toBeGreaterThanOrEqual(0);
  expect(metrics.gnbBottom).toBeGreaterThan(metrics.gnbTop);
  expect(metrics.headerBottom).toBeGreaterThan(metrics.headerTop);
  expect(metrics.menuTop).toBeGreaterThanOrEqual(metrics.headerTop);
  expect(metrics.gnbLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.headerLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.menuLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.gnbRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.headerRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.menuRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.bodyLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.bodyRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.viewportWidth);
}

async function mockProjectHomeAndIssues(page: Page) {
  await page.route("**/api/auth/session", async (route) =>
    route.fulfill({
      body: JSON.stringify({ session: { csrfToken: "csrf" }, user: { id: 1, loginId: "admin" } }),
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf" },
    }),
  );
  await page.route("**/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body: unknown) =>
      route.fulfill({ body: JSON.stringify(body), contentType: "application/json" });
    if (path.endsWith("/session"))
      return json({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      });
    if (path.endsWith("/workspace")) return json({ profile: {} });
    if (path.endsWith("/container"))
      return json({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/admin/sample.git",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        openIssueCount: 0,
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerIsProjectMember: true,
      });
    if (path.endsWith("/milestones")) return json({ milestones: [] });
    if (path.endsWith("/labels")) return json({ labels: [] });
    if (path.endsWith("/assignable-users") || path.endsWith("/issue-search-users"))
      return json({ items: [], total: 0, truncated: false });
    if (path.endsWith("/projects/admin/sample/issues"))
      return json({
        closedIssueCount: 0,
        draftItems: [],
        items: [],
        openIssueCount: 0,
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        totalCount: 0,
        totalPages: 0,
      });
    return json({});
  });
}
