import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-issue-list-title-strip"]';
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);

async function openIssueList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-title" },
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
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("https://www.gravatar.com/avatar/alice-default?s=16", (route) =>
    route.fulfill({
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"></svg>',
      contentType: "image/svg+xml",
    }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        issues: [
          {
            assigneeLabel: "",
            authorAvatarUrl: "https://www.gravatar.com/avatar/alice-default?s=16",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice",
            commentCount: 5,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29T13:00:00Z",
            issueNumber: "42",
            labels: [],
            milestoneTitle: "",
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state: "open",
            title: "Fix release blocker",
            updatedLabel: "1 day ago",
            voterCount: 0,
            watcherCount: 0,
          },
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/issueList?state=open`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style site issue-list title strip", () => {
  test("reuses canonical global title variables through the explicit owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      Promise.resolve(curatedAppCss()),
    ]);

    expect(route).toContain('data-owner="site-issue-list-title-strip"');
    expect(route).toContain('data-owner="site-issue-list-title-heading"');

    expect(route).not.toContain('`title_area ${titleAreaStyleProps.className ?? ""}`');
    expect(route).not.toContain('`pull-left ${titleStyleProps.className ?? ""}`');
    expect(theme).toContain("titleText");
  });

  test("keeps the legacy title directly before the tab sibling", async ({ page }) => {
    const owner = await openIssueList(page);

    await expect(
      owner.locator(':scope > h2[data-owner="site-issue-list-title-heading"]'),
    ).toHaveText("Issues");
    expect(
      await page
        .locator('[data-owner="site-issue-list-setting-content-column"] > *')
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV", "UL", "UL", "DIV"]);
    await expect(
      page.locator(`${ownerSelector} + ul[data-owner="site-issue-list-state-tabs"]`),
    ).toHaveCount(1);
    await expect(
      page.locator(
        `${ownerSelector} + ul[data-owner="site-issue-list-state-tabs"] [data-selected="true"] [data-owner="site-issue-list-state-tab-link"]`,
      ),
    ).toHaveText("Open");
  });

  test("owns both generated title classes without legacy title fallbacks", async ({ page }) => {
    const owner = await openIssueList(page);
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
    test(`keeps ${viewport.name} title and tab geometry and captures its surface`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const owner = await openIssueList(page);
      const title = owner.locator('[data-owner="site-issue-list-title-heading"]');

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
          '[data-owner="site-issue-list-title-heading"]',
        );
        const tabs = owner?.nextElementSibling;
        if (!owner || !title || !(tabs instanceof HTMLElement)) return null;
        return {
          owner: owner.getBoundingClientRect().toJSON(),
          tabs: tabs.getBoundingClientRect().toJSON(),
          title: title.getBoundingClientRect().toJSON(),
        };
      }, ownerSelector);
      expect(boxes).not.toBeNull();
      expect(boxes!.title.left).toBeGreaterThanOrEqual(boxes!.owner.left);
      expect(boxes!.title.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
      expect(boxes!.tabs.top).toBeGreaterThanOrEqual(boxes!.owner.bottom);
      expect((await owner.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }

  test("keeps generated classes inside the explicit title and row-content owners", async ({
    page,
  }) => {
    await openIssueList(page);
    const unauthorizedGeneratedOwners = await page.evaluate(() => {
      const allowedOwners = new Set([
        "site-issue-list-title-strip",
        "site-issue-list-title-heading",
        "site-issue-list-state-tabs",
        "site-issue-list-state-tab-item",
        "site-issue-list-state-tab-link",
        "site-issue-list-container",
        "site-issue-list-row",
        "site-issue-list-project-avatar",
        "site-issue-list-project-avatar-image",
        "site-issue-list-info",
        "site-issue-list-project-link",
        "site-issue-list-separator",
        "site-issue-list-title-link",
        "site-issue-list-metadata",
        "site-issue-list-author-avatar",
        "site-issue-list-author-avatar-image",
        "site-issue-list-metadata-item",
        "site-issue-list-comments-icon",
        "site-issue-list-pagination",
        "site-issue-list-pagination-list",
        "site-issue-list-pagination-item",
        "site-issue-list-pagination-input",
        "site-issue-list-pagination-label",
        "site-issue-list-pagination-icon",
        "site-issue-list-pagination-prev",
        "site-issue-list-pagination-last",
      ]);
      return Array.from(
        document.querySelectorAll('[data-owner="site-issue-list-setting-content-column"] *'),
      )
        .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
        .map((element) => element.closest<HTMLElement>("[data-owner]"))
        .filter((owner) => owner === null || !allowedOwners.has(owner.dataset.owner ?? ""))
        .map((owner) => owner?.dataset.owner ?? "missing-owner");
    });
    expect(unauthorizedGeneratedOwners).toEqual([]);
  });
});
