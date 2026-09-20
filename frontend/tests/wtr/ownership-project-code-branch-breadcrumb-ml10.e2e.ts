import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("project code branch breadcrumb preserves root navigation and spacing", async ({ page }) => {
  await mockCodeBranch(page);

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/code/main`, { waitUntil: "commit" });

    const breadcrumbs = page.locator('[data-owner="project-code-branch-breadcrumbs"]');
    await expect(breadcrumbs).toBeVisible();
    await expect(breadcrumbs).toHaveCSS("margin-left", "10px");
    await expect(breadcrumbs.locator("a")).toHaveCount(1);
    await expect(breadcrumbs).toHaveText("sample");
    await expect(breadcrumbs.locator("a").first()).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/code/main`,
    );
    await expect(page.locator("#branches option")).toHaveText(["main"]);
    await expect(page.locator(".select2-chosen .branch-label.branch")).toHaveText("branch");
    await expect(page.locator(".select2-chosen")).toContainText("main");
    await expect(page.locator(".code-viewer-wrap .listitem")).toHaveCount(1);

    const pluginAttributes = await breadcrumbs.evaluate((element) =>
      Array.from(element.attributes)
        .map((attribute) => attribute.name)
        .filter((name) =>
          /^data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u.test(
            name,
          ),
        ),
    );
    expect(pluginAttributes).toEqual([]);

    const geometry = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(
        '[data-owner="project-code-branch-header"]',
      );
      const breadcrumbs = document.querySelector<HTMLElement>(
        '[data-owner="project-code-branch-breadcrumbs"]',
      );
      const viewer = document.querySelector<HTMLElement>(
        '[data-owner="project-code-branch-viewer"]',
      );
      if (!header || !breadcrumbs || !viewer) return null;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return {
        breadcrumbs: box(breadcrumbs),
        documentContained:
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <=
          window.innerWidth + 1,
        header: box(header),
        viewer: box(viewer),
        viewport: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.documentContained).toBe(true);
    expect(geometry!.header.left).toBeGreaterThanOrEqual(0);
    expect(geometry!.header.right).toBeLessThanOrEqual(geometry!.viewport + 1);
    expect(geometry!.breadcrumbs.left).toBeGreaterThanOrEqual(geometry!.header.left - 1);
    expect(geometry!.breadcrumbs.right).toBeLessThanOrEqual(geometry!.header.right + 1);
    expect(geometry!.viewer.right).toBeLessThanOrEqual(geometry!.viewport + 1);
  }
});

async function mockCodeBranch(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [{ name: "sample", path: "" }],
        entries: [
          {
            commitDate: "2026-07-20T10:00:00Z",
            commitMessage: "Initial README",
            commitShortId: "abcdef1",
            kind: "file",
            name: "README.md",
            path: "README.md",
          },
        ],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );
}
