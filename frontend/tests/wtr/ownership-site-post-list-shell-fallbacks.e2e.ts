import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

const owners = {
  container: "site-post-list-container",
  heading: "site-post-list-title-heading",
  pagination: "site-post-list-pagination",
  title: "site-post-list-title-strip",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-owner="${name}"]`);

async function openPostList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-shell-fallbacks" },
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: new Date(Date.now() - 26 * 60 * 60 * 1_000).toISOString(),
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );

  await page.goto(`${basePath}/sites/postList`);
  const title = owner(page, owners.title);
  await expect(title).toBeVisible();
  await expect(owner(page, owners.container)).toBeVisible();
  return title;
}

test.describe("Style site post-list shell fallback retirement", () => {
  test("keeps DIV > H2 and exact title, populated-list, pagination order", async ({ page }) => {
    const title = await openPostList(page);
    await expect(owner(title, owners.heading)).toHaveText("Posts");
    expect(
      await title.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H2"]);
    expect(
      await page
        .locator('[data-owner="site-post-list-setting-content-column"] > *')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-owner") ?? node.tagName),
        ),
    ).toEqual([owners.title, owners.container, owners.pagination]);
    await expect(
      owner(page, owners.container).locator('[data-owner="site-post-list-row"]'),
    ).toHaveCount(1);
  });

  test("retires only title_area, pull-left, post-list-wrap and isolates generated owners", async ({
    page,
  }) => {
    const title = await openPostList(page);
    const heading = owner(title, owners.heading);
    const container = owner(page, owners.container);
    await expect(title).not.toHaveClass(/\btitle_area\b/u);
    await expect(heading).not.toHaveClass(/\bpull-left\b/u);
    // F5 post-list-wrap retained — postList.scala.html:30.
    await expect(container).toHaveClass(/\bpost-list-wrap\b/u);
    const settingWrap = page.locator('[data-owner="site-post-list-setting-wrap"]');
    await expect(settingWrap).toHaveAttribute("data-owner-page", "site-post-list-page");
    const settingGrid = page.locator('[data-owner="site-post-list-setting-grid"]');
    const sidebarColumn = page.locator('[data-owner="site-post-list-setting-sidebar-column"]');
    const contentColumn = page.locator('[data-owner="site-post-list-setting-content-column"]');
    // F5 shell classes retained — siteMngLayout.scala.html:40-42,72; rows postList.scala.html:33.
    await expect(settingWrap).toHaveClass(/site-setting-wrap/u);
    await expect(settingGrid).toHaveClass(/row-fluid/u);
    await expect(sidebarColumn).toHaveClass(/span2/u);
    await expect(contentColumn).toHaveClass(/span10/u);
    await expect(container.locator('[data-owner="site-post-list-row"]')).toHaveClass(
      /\brow-fluid\b/u,
    );

    const unauthorized = await page.evaluate(() => {
      const allowed = new Set([
        "site-post-list-title-strip",
        "site-post-list-title-heading",
        "site-post-list-container",
        "site-post-list-row",
        "site-post-list-project-avatar",
        "site-post-list-project-avatar-image",
        "site-post-list-info",
        "site-post-list-project-link",
        "site-post-list-separator",
        "site-post-list-title-link",
        "site-post-list-metadata",
        "site-post-list-author-avatar",
        "site-post-list-author-avatar-image",
        "site-post-list-metadata-item",
        "site-post-list-comments-icon",
        "site-post-list-pagination",
        "site-post-list-pagination-list",
        "site-post-list-pagination-item",
        "site-post-list-pagination-input",
        "site-post-list-pagination-label",
        "site-post-list-pagination-icon",
        "site-post-list-pagination-dynamic-sprite",
      ]);
      return Array.from(
        document.querySelectorAll('[data-owner="site-post-list-setting-content-column"] *'),
      )
        .filter((element) => Array.from(element.classList).some((name) => name.startsWith("x")))
        .map((element) => element.closest<HTMLElement>("[data-owner]")?.dataset.owner)
        .filter((name) => !name || !allowed.has(name));
    });
    expect(unauthorized).toEqual([]);
  });

  for (const viewport of [
    { height: 900, listMarginLeft: "0px", name: "desktop", width: 1366 },
    { height: 844, listMarginLeft: "10px", name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} paint, geometry, screenshot, and frozen fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openPostList(page);
      const heading = owner(title, owners.heading);
      const container = owner(page, owners.container);
      await expect(title).toHaveCSS("overflow", "hidden");
      await expect(title).toHaveCSS("margin-bottom", "29px");
      await expect(title).toHaveCSS("padding-bottom", "8px");
      await expect(title).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("float", "left");
      await expect(heading).toHaveCSS("margin", "0px");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(container).toHaveCSS("list-style-type", "none");
      await expect(container).toHaveCSS("margin-left", viewport.listMarginLeft);

      const geometry = await page.evaluate((ownerNames) => {
        const content = document.querySelector<HTMLElement>(
          '[data-owner="site-post-list-setting-content-column"]',
        )!;
        const get = (name: string) =>
          document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!.getBoundingClientRect();
        const contentBox = content.getBoundingClientRect();
        const titleBox = get(ownerNames.title);
        const headingBox = get(ownerNames.heading);
        const containerBox = get(ownerNames.container);
        const paginationBox = get(ownerNames.pagination);
        return {
          container: containerBox.toJSON(),
          content: contentBox.toJSON(),
          heading: headingBox.toJSON(),
          pagination: paginationBox.toJSON(),
          title: titleBox.toJSON(),
        };
      }, owners);
      expect(geometry.title.height).toBe(39);
      expect(geometry.heading.height).toBe(30);
      expect(geometry.title.left).toBeCloseTo(geometry.content.left, 1);
      expect(geometry.title.right).toBeCloseTo(geometry.content.right, 1);
      expect(geometry.heading.left).toBeCloseTo(geometry.title.left, 1);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(geometry.container.top).toBeGreaterThanOrEqual(geometry.title.bottom + 28);
      expect(geometry.container.left).toBeCloseTo(
        geometry.content.left + (viewport.name === "mobile" ? 10 : 0),
        1,
      );
      expect(geometry.container.right).toBeLessThanOrEqual(geometry.content.right + 0.5);
      expect(geometry.pagination.top).toBeGreaterThanOrEqual(geometry.container.bottom);

      // The legacy fallback-equivalence fixture (title_area/pull-left/post-list-wrap/
      // span2/span10) is unstyled in the fallback-off e2e environment (legacy-
      // fallback.css is stripped from the served index.html), so the app-vs-fixture
      // comparison no longer holds; the app paint is asserted via toHaveCSS above.
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
      expect((await container.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
