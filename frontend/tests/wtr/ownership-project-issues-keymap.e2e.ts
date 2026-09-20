const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = "normal";
const screenshotDirectory = resolve("output/playwright/style-project-issues-keymap", fallbackMode);
const owner = "project-issues-keymap";

async function openIssueList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-issues-keymap" },
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        vcs: "GIT",
        viewerCanUpdate: true,
        showIssue: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        visibleProjects: [],
        state: "open",
        orderBy: "updatedDate",
        orderDir: "desc",
        totalCount: 0,
        pageNum: 1,
        totalPages: 1,
        openIssueCount: 0,
        closedIssueCount: 0,
      },
    }),
  );
  for (const suffix of ["milestones", "labels", "assignable-users", "issue-search-users"]) {
    await page.route(`**/api/v1/owners/admin/projects/sample/${suffix}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { items: [], milestones: [], labels: [], users: [] },
      }),
    );
  }
  await page.goto(`${basePath}/admin/sample/issues`, { waitUntil: "commit" });
  const keymap = page.locator(`[data-owner="${owner}"]`);
  await expect(keymap).toBeVisible();
  return keymap;
}

test(`project issues keymap preserves float geometry and interaction (${fallbackMode})`, async ({
  page,
}) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    const keymap = await openIssueList(page);
    await expect(keymap).not.toHaveAttribute("style");
    await expect(keymap).toHaveCSS("float", "left");
    await expect(keymap).toHaveCSS("margin-left", "55px");
    await expect(keymap).toHaveCSS("padding-top", "10px");
    await expect(keymap).toHaveCSS("padding-bottom", "10px");
    const keymapButton = keymap.locator(":scope > button");
    await expect(keymapButton).toHaveText("Keyboard shortcuts");

    const geometry = await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>('[data-owner="project-issues-keymap"]');
      const parent = element?.closest<HTMLElement>(".project-page-wrap");
      if (!element || !parent) throw new Error("Keymap geometry anchors are missing.");
      const box = element.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      return {
        contained: box.left >= parentBox.left - 0.5 && box.right <= parentBox.right + 0.5,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        leftOffset: box.left - parentBox.left,
        top: box.top,
        width: box.width,
      };
    });
    expect(geometry.contained).toBe(true);
    expect(geometry.leftOffset).toBeGreaterThanOrEqual(55);
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.top).toBeGreaterThanOrEqual(0);
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(viewport.width);

    await keymapButton.click();
    await expect(page.locator('[data-owner="project-issues-keymap-modal"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-owner="project-issues-keymap-modal"]')).toBeHidden();
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});
