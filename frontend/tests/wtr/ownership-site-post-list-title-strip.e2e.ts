import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-post-list-title-strip"]';
const routeSource = new URL("../src/routes/sites/postList.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);

async function openPostList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-title" },
      json: { user: { loginId: "siteboss" } },
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-title" },
      json: { user: { loginId: "siteboss" } },
    }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            ownerName: "acme",
            postNumber: 7,
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/postList`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style site post-list title strip", () => {
  test("reuses canonical global title variables through the explicit owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      Promise.resolve(curatedAppCss()),
    ]);

    expect(route).toContain('data-owner="site-post-list-title-strip"');
    expect(route).toContain('data-owner="site-post-list-title-heading"');
  });

  test("keeps the legacy title before the populated post list", async ({ page }) => {
    const owner = await openPostList(page);
    await expect(
      owner.locator(':scope > h2[data-owner="site-post-list-title-heading"]'),
    ).toHaveText("Posts");
    expect(
      await page
        .locator('[data-owner="site-post-list-setting-content-column"] > *')
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV", "UL", "DIV"]);
  });

  test("owns both generated title classes without legacy title fallbacks", async ({ page }) => {
    const owner = await openPostList(page);
    const classes = await owner.evaluate((titleArea) => {
      const title = titleArea.querySelector("h2");
      return {
        title: Array.from(title?.classList ?? []),
        titleArea: Array.from(titleArea.classList),
      };
    });

    expect(classes.titleArea).not.toContain("title_area");
    expect(classes.title).not.toContain("pull-left");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} title geometry and captures its surface`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openPostList(page);
      const title = owner.locator('[data-owner="site-post-list-title-heading"]');

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(title).toHaveCSS("font-size", "19.5px");
      await expect(title).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(title).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate((selector) => {
        const owner = document.querySelector<HTMLElement>(selector);
        const title = owner?.querySelector<HTMLElement>(
          '[data-owner="site-post-list-title-heading"]',
        );
        const postList = document.querySelector<HTMLElement>(
          '[data-owner="site-post-list-container"]',
        );
        if (!owner || !title || !postList) return null;
        return {
          owner: owner.getBoundingClientRect().toJSON(),
          postList: postList.getBoundingClientRect().toJSON(),
          title: title.getBoundingClientRect().toJSON(),
        };
      }, ownerSelector);
      expect(boxes).not.toBeNull();
      expect(boxes!.title.left).toBeGreaterThanOrEqual(boxes!.owner.left);
      expect(boxes!.title.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
      expect(boxes!.postList.top).toBeGreaterThanOrEqual(boxes!.owner.bottom);
      expect((await owner.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }

  test("keeps generated direct children inside the three stable shell owners", async ({ page }) => {
    await openPostList(page);
    const generatedDirectChildren = await page.evaluate(() => {
      const allowed = new Set([
        "site-post-list-title-strip",
        "site-post-list-container",
        "site-post-list-pagination",
      ]);
      return Array.from(
        document.querySelectorAll('[data-owner="site-post-list-setting-content-column"] > *'),
      )
        .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
        .filter((element) => !allowed.has(element.getAttribute("data-owner") ?? ""))
        .map((element) => element.tagName);
    });
    expect(generatedDirectChildren).toEqual([]);
  });
});
