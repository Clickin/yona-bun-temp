import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-issue-list-title-strip"]';
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);

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
            createdTitle: "2026-06-29 13:00",
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

test.describe("StyleX site issue-list title strip", () => {
  test("reuses canonical global title variables through the explicit owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-issue-list-title-strip"');
    expect(route).toContain("styles.titleArea");
    expect(route).toContain("styles.title");
    expect(route).toContain("globalColors.siteDiagnosticNoErrorTitleBorder");
    expect(route).toContain('`title_area ${titleAreaStyleProps.className ?? ""}`');
    expect(route).toContain('`pull-left ${titleStyleProps.className ?? ""}`');
    expect(theme).toContain("siteDiagnosticNoErrorHeadingText");
  });

  test("keeps the legacy title directly before the tab sibling", async ({ page }) => {
    const owner = await openIssueList(page);

    await expect(owner.locator(":scope > h2.pull-left")).toHaveText("Issues");
    expect(
      await page.locator(".span10 > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV", "UL", "UL", "DIV"]);
    await expect(page.locator(`${ownerSelector} + ul.nav.nav-tabs`)).toHaveCount(1);
    await expect(page.locator(`${ownerSelector} + ul.nav.nav-tabs li.active a`)).toHaveText("Open");
  });

  test("composes generated classes with shared legacy title fallbacks", async ({ page }) => {
    const owner = await openIssueList(page);
    const classes = await owner.evaluate((titleArea) => {
      const title = titleArea.querySelector("h2");
      return {
        title: Array.from(title?.classList ?? []),
        titleArea: Array.from(titleArea.classList),
      };
    });

    expect(classes.titleArea).toContain("title_area");
    expect(classes.title).toContain("pull-left");
    expect(classes.titleArea.some((token) => token.startsWith("x"))).toBe(true);
    expect(classes.title.some((token) => token.startsWith("x"))).toBe(true);
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
      const title = owner.locator("h2.pull-left");

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(title).toHaveCSS("font-size", "19.5px");
      await expect(title).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(title).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate((selector) => {
        const owner = document.querySelector<HTMLElement>(selector);
        const title = owner?.querySelector<HTMLElement>("h2.pull-left");
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
        "site-issue-list-container",
        "site-issue-list-row",
        "site-issue-list-project-avatar",
        "site-issue-list-project-avatar-image",
        "site-issue-list-info",
        "site-issue-list-project-link",
        "site-issue-list-separator",
        "site-issue-list-title-link",
      ]);
      return Array.from(document.querySelectorAll(".site-setting-wrap .span10 *"))
        .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
        .map((element) => element.closest<HTMLElement>("[data-stylex-owner]"))
        .filter((owner) => owner === null || !allowedOwners.has(owner.dataset.stylexOwner ?? ""))
        .map((owner) => owner?.dataset.stylexOwner ?? "missing-owner");
    });
    expect(unauthorizedGeneratedOwners).toEqual([]);
  });
});
