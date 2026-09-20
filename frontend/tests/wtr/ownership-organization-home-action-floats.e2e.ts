// Post-merge: the full legacy cascade lives in app.css — normal-mode semantics.
const fallbackOff = false;
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/style-organization-home-action-floats",
  "normal",
);

test.use({ locale: "en-US" });

async function mockOrganizationHome(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [{ avatarUrl: "", loginId: "admin", userLabel: "Site Admin" }],
        description: "Web labs group",
        enrollmentRequested: false,
        logoUrl: "",
        memberMembers: [{ avatarUrl: "", loginId: "member", userLabel: "Dev Member" }],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanEnroll: false,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanUpdate: true,
        visibleProjects: [
          {
            createdAt: "2020-01-02T12:00:00Z",
            lastPushedAt: "",
            isWatching: true,
            labels: [],
            memberCount: 3,
            members: [],
            originOwnerName: "",
            originProjectName: "",
            overview: "Sample project",
            ownerName: "weblabs",
            projectName: "sample",
            projectScope: "PUBLIC",
            watchCount: 4,
          },
          {
            createdAt: "2020-01-01T12:00:00Z",
            lastPushedAt: "",
            isWatching: false,
            labels: [],
            memberCount: 1,
            members: [],
            originOwnerName: "",
            originProjectName: "",
            overview: "Other project",
            ownerName: "weblabs",
            projectName: "other",
            projectScope: "PUBLIC",
            watchCount: 2,
          },
        ],
      },
    }),
  );
}

async function assertActionGeometry(page: Page, viewport: { width: number; height: number }) {
  const metrics = await page.evaluate(() => {
    const read = (ownerSelector: string, parentSelector: string) => {
      const owner = document.querySelector<HTMLElement>(ownerSelector);
      const parent = owner?.closest<HTMLElement>(parentSelector);
      if (!owner || !parent) {
        return null;
      }
      const box = owner.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      return {
        bottom: box.bottom,
        float: getComputedStyle(owner).float,
        left: box.left,
        parentBottom: parentBox.bottom,
        parentLeft: parentBox.left,
        parentRight: parentBox.right,
        parentTop: parentBox.top,
        right: box.right,
        top: box.top,
      };
    };

    return {
      create: read(
        '[data-owner="organization-home-create-project-wrapper"]',
        '[data-owner="organization-home-search"]',
      ),
      leave: read(
        '[data-owner="organization-home-group-leave-button"]',
        '[data-owner="organization-home-members"]',
      ),
      stats: read(
        '[data-owner="organization-home-project-card-stats"]',
        '[data-owner="organization-home-project-filter-item"]',
      ),
      bodyScrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      clientWidth: document.documentElement.clientWidth,
    };
  });

  for (const [name, action] of [
    ["create", metrics.create],
    ["stats", metrics.stats],
    ["leave", metrics.leave],
  ] as const) {
    expect(action, `${name} action geometry`).not.toBeNull();
    expect(action!.float).toBe("right");
    expect(action!.left).toBeGreaterThanOrEqual(0);
    expect(action!.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(action!.left).toBeGreaterThanOrEqual(action!.parentLeft - 1);
    expect(action!.right).toBeLessThanOrEqual(action!.parentRight + 1);
    expect(action!.top).toBeGreaterThanOrEqual(action!.parentTop - 1);
    expect(action!.bottom).toBeLessThanOrEqual(action!.parentBottom + 1);
  }
  expect(metrics.clientWidth).toBe(viewport.width);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
}

test(`organization home action floats preserve copy and interaction (${"normal"})`, async ({
  page,
}) => {
  await mockOrganizationHome(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });

    const createWrapper = page.locator('[data-owner="organization-home-create-project-wrapper"]');
    const createLink = createWrapper.getByRole("link", { name: "Create new project" });
    const cards = page.locator('[data-owner="organization-home-project-filter-item"]');
    const stats = page.locator('[data-owner="organization-home-project-card-stats"]');
    const leaveButtons = page.locator('[data-owner="organization-home-group-leave-button"]');
    const panels = page.locator('[data-owner="organization-home-members-panel"]');

    await expect(createWrapper).toHaveCount(1);
    await expect(createWrapper).toBeVisible();
    await expect(createLink).toHaveText("Create new project");
    await expect(createLink).toHaveAttribute("href", `${basePath}/projectform?owner=weblabs`);
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).locator(".header a.black")).toHaveText("sample");
    await expect(cards.nth(1).locator(".header a.black")).toHaveText("other");
    await expect(stats).toHaveCount(2);
    await expect(stats.nth(0)).toContainText("3");
    await expect(stats.nth(0)).toContainText("4");
    await expect(stats.nth(1)).toContainText("1");
    await expect(stats.nth(1)).toContainText("2");
    await expect(panels).toHaveCount(2);
    await expect(panels.first().locator("h3")).toHaveText("Group Manager");
    await expect(panels.last().locator("h3")).toHaveText("Group Member");
    await expect(leaveButtons).toHaveCount(1);

    for (const owner of [createWrapper, leaveButtons]) {
      await expect(owner).not.toHaveAttribute("style");
      await expect(owner).not.toHaveAttribute("data-href");
      await expect(owner).not.toHaveAttribute("data-toggle");
      await expect(owner).not.toHaveAttribute("data-dismiss");
    }
    for (const owner of await stats.all()) {
      await expect(owner).not.toHaveAttribute("style");
      await expect(owner).not.toHaveAttribute("data-href");
      await expect(owner).not.toHaveAttribute("data-toggle");
      await expect(owner).not.toHaveAttribute("data-dismiss");
    }
    await expect(stats.first()).toHaveClass(/(?:^|\s)stats-wrap(?:\s|$)/u);
    await expect(leaveButtons).toHaveAttribute("id", "groupLeaveBtn");
    await expect(leaveButtons).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(leaveButtons).toHaveClass(/(?:^|\s)ybtn-minimum(?:\s|$)/u);
    await expect(leaveButtons).toHaveClass(/(?:^|\s)ybtn-danger(?:\s|$)/u);
    await expect(leaveButtons).toHaveText("Leave the group");
    await assertActionGeometry(page, viewport);

    await leaveButtons.click();
    const modal = page.locator("#alertLeave");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveClass(/(?:^|\s)modal(?:\s|$)/u);
    await expect(modal).toHaveClass(/(?:^|\s)hide(?:\s|$)/u);
    await expect(modal).toHaveClass(/(?:^|\s)in(?:\s|$)/u);
    await expect(modal).toContainText("Leave the group");
    await expect(modal).toContainText("Do you want to leave this group?");
    await expect(modal.locator("#leaveBtn")).toHaveText("Yes");
    const noButton = modal.getByRole("button", { name: "No" });
    await expect(noButton).toBeVisible();
    // Preserve the React event assertion while fallback-off global modal geometry remains outside this owner.
    if (fallbackOff) {
      await noButton.dispatchEvent("click");
    } else {
      await noButton.click();
    }
    await expect(modal).not.toBeVisible();

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});
