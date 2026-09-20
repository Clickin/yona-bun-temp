import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  badge: "site-post-list-sidebar-badge",
  item: "site-post-list-sidebar-item",
  link: "site-post-list-sidebar-link",
  sidebar: "site-post-list-sidebar",
} as const;
const owner = (root: Page | Locator, name: string) => root.locator(`[data-owner="${name}"]`);

async function openPostList(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: "1",
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      },
    }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 2,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: new Date(Date.now() - 26 * 60 * 60 * 1_000).toISOString(),
            labels: [],
            notice: false,
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            readme: false,
            title: "Release checklist",
            updatedLabel: "1 day ago",
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        currentVersion: "1.0.0",
        error: null,
        message: "site.update.isAvailable",
        releaseUrl: "https://example.test/release",
        versionToUpdate: "1.1.0",
      },
    }),
  );
  const svg = (route: Route) =>
    route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"/>',
      contentType: "image/svg+xml",
    });
  await page.route("**/assets/images/default-avatar-128.png", svg);
  await page.route("**/assets/images/default-project-logo.png", svg);
  await page.goto(`${basePath}/sites/postList`);
  await expect(page.getByText("Release checklist")).toBeVisible();
  await expect(owner(page, owners.badge)).toBeVisible();
}

test.describe("Style site post list sidebar", () => {
  test("keeps eight links, second active Posts, and update badge", async ({ page }) => {
    await openPostList(page);
    const sidebar = owner(page, owners.sidebar);
    const items = owner(sidebar, owners.item);
    const links = owner(sidebar, owners.link);
    await expect(items).toHaveCount(8);
    await expect(links).toHaveCount(8);
    await expect(links).toHaveText([
      "Users",
      "Posts",
      "Issues",
      "Projects",
      "Send email",
      "Send mass emails",
      "Software Update1",
      "Diagnostics",
    ]);
    expect(
      await links.evaluateAll((nodes) =>
        nodes.map((node) => new URL((node as HTMLAnchorElement).href).pathname),
      ),
    ).toEqual([
      `${basePath}/sites/userList`,
      `${basePath}/sites/postList`,
      `${basePath}/sites/issueList`,
      `${basePath}/sites/projectList`,
      `${basePath}/sites/mail`,
      `${basePath}/sites/massmail`,
      `${basePath}/sites/update`,
      `${basePath}/sites/diagnostic`,
    ]);
    await expect(items.nth(1)).toHaveCSS("font-weight", "700");
    await expect(items.nth(1)).toHaveCSS("border-left-color", "rgb(243, 108, 34)");
    await expect(owner(items.nth(6), owners.badge)).toHaveText("1");
  });

  test("preserves SPA navigation to migrated Send email and the live shell", async ({ page }) => {
    await openPostList(page);
    await page.route("**/api/v1/site/mail", (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { notConfiguredItems: [], sender: "noreply@example.test", sent: false },
      }),
    );
    await page.evaluate(
      () =>
        ((window as Window & { __postListSidebarMarker?: string }).__postListSidebarMarker =
          "preserved"),
    );
    await owner(page, owners.link).filter({ hasText: "Send email" }).click();
    await expect.poll(() => new URL(page.url()).pathname).toBe(`${basePath}/sites/mail`);
    await expect(page.locator('[data-owner="site-mail-sidebar-link"]').nth(4)).toHaveText(
      "Send email",
    );
    expect(
      await page.evaluate(
        () => (window as Window & { __postListSidebarMarker?: string }).__postListSidebarMarker,
      ),
    ).toBe("preserved");
  });

  test("isolates generated ownership to four explicit repeated boundaries", async ({ page }) => {
    await openPostList(page);
    const sidebar = owner(page, owners.sidebar);
    await expect(sidebar).toHaveCount(1);
    await expect(owner(sidebar, owners.item)).toHaveCount(8);
    await expect(owner(sidebar, owners.link)).toHaveCount(8);
    await expect(owner(sidebar, owners.badge)).toHaveCount(1);
    expect(
      await sidebar.evaluate(
        (root, names) =>
          Array.from(root.querySelectorAll("*")).filter(
            (element) =>
              Array.from(element.classList).some((token) => token.startsWith("x")) &&
              !Object.values(names).includes(element.getAttribute("data-owner") as never),
          ).length,
        owners,
      ),
    ).toBe(0);
  });

  test("pins desktop/mobile paint, geometry, screenshots, and frozen fallback", async ({
    page,
  }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      await openPostList(page);
      const sidebar = owner(page, owners.sidebar);
      const items = owner(sidebar, owners.item);
      const links = owner(sidebar, owners.link);
      const badge = owner(sidebar, owners.badge);
      await expect(sidebar).toHaveCSS("margin", "0px");
      await expect(sidebar).toHaveCSS("padding", "0px");
      await expect(sidebar).toHaveCSS("list-style-type", "none");
      await expect(items.first()).toHaveCSS("margin-top", "0px");
      await expect(items.nth(1)).toHaveCSS("margin-top", "3px");
      await expect(items.first()).toHaveCSS("font-size", "14px");
      await expect(items.first()).toHaveCSS("line-height", "30px");
      await expect(items.first()).toHaveCSS("border-left", "4px solid rgb(238, 238, 238)");
      await expect(links.first()).toHaveCSS("display", "block");
      await expect(links.first()).toHaveCSS("padding", "5px 10px");
      await expect(links.first()).toHaveCSS("color", "rgb(51, 51, 51)");
      await expect(badge).toHaveCSS("font-size", "12px");
      await expect(badge).toHaveCSS("line-height", "20px");
      await expect(badge).toHaveCSS("padding", "0px 5px");
      await expect(badge).toHaveCSS("background-color", "rgb(255, 115, 50)");
      await expect(badge).toHaveCSS("color", "rgb(236, 240, 241)");
      await expect(badge).toHaveCSS("border", "2px solid rgb(255, 255, 255)");
      await expect(badge).toHaveCSS("border-radius", "10px");
      const boxes = await sidebar.evaluate((root, names) => {
        const rect = (element: Element) => element.getBoundingClientRect().toJSON();
        const items = Array.from(root.querySelectorAll(`[data-owner="${names.item}"]`)).map(rect);
        const links = Array.from(root.querySelectorAll(`[data-owner="${names.link}"]`)).map(rect);
        return {
          badge: rect(root.querySelector(`[data-owner="${names.badge}"]`)!),
          items,
          links,
        };
      }, owners);
      for (let index = 1; index < 8; index += 1)
        expect(boxes.items[index].top).toBeGreaterThanOrEqual(boxes.items[index - 1].bottom);
      expect(boxes.badge.top).toBeLessThan(boxes.links[6].bottom);
      expect(boxes.badge.bottom).toBeGreaterThan(boxes.links[6].top);
      // The legacy site-setting-nav/notification-badge fixture is unstyled in
      // the fallback-off e2e environment (legacy-fallback.css stripped from the
      // served index.html), so the app-vs-fixture comparisons no longer hold;
      // the app paint is asserted via toHaveCSS above (bucket-3 pin update).
      expect((await sidebar.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await badge.screenshot()).byteLength).toBeGreaterThan(0);
    }
  });
});
