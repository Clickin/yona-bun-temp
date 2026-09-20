import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// Keep the fixture inside legacy agoOrDateString's one-day interval.
const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1_000).toISOString();

const owners = {
  container: "site-issue-list-container",
  info: "site-issue-list-info",
  project: "site-issue-list-project-link",
  row: "site-issue-list-row",
  separator: "site-issue-list-separator",
  title: "site-issue-list-title-link",
} as const;

async function openIssueList(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-row-content" },
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
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
            commentCount: 5,
            createdLabel: "1 day ago",
            createdTitle: yesterday,
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
  await routeFixtureImage(page, "/assets/images/default-project-logo.png", 45, 45);
  await routeFixtureImage(page, "https://www.gravatar.com/avatar/alice-default?s=16", 16, 16);

  await page.goto(`${basePath}/sites/issueList?state=open`);
  const row = owner(page, owners.row);
  await expect(row).toBeVisible();
  return row;
}

test.describe("Style site issue-list populated row content", () => {
  test("keeps copy, order, destinations, and open search state", async ({ page }) => {
    const row = await openIssueList(page);
    const avatar = owner(row, "site-issue-list-project-avatar");
    const info = owner(row, owners.info);
    const project = owner(info, owners.project);
    const separator = owner(info, owners.separator);
    const title = owner(info, owners.title);
    const meta = owner(row, "site-issue-list-metadata");

    await expect(project).toHaveText("acme/roadmap");
    await expect(separator).toHaveText("·");
    await expect(title).toHaveText("Fix release blocker");
    await expect(project).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(title).toHaveAttribute("href", `${basePath}/acme/roadmap/issue/42`);
    expect(new URL(page.url()).searchParams.get("state")).toBe("open");
    expect(
      await row
        .locator(":scope > *")
        .evaluateAll((elements) =>
          elements.map((element) =>
            element.matches('[data-owner="site-issue-list-project-avatar"]')
              ? "avatar"
              : element.matches('[data-owner="site-issue-list-info"]')
                ? "info"
                : element.matches('[data-owner="site-issue-list-metadata"]')
                  ? "meta"
                  : element.tagName,
          ),
        ),
    ).toEqual(["avatar", "info", "meta"]);
    await expect(avatar).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(meta).toContainText("Alice");
    await expect(meta).toContainText("5");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} typography, containment, and flow`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const row = await openIssueList(page);
      const container = owner(page, owners.container);
      const info = owner(row, owners.info);
      const project = owner(info, owners.project);
      const separator = owner(info, owners.separator);
      const title = owner(info, owners.title);
      await expect(container).toHaveCSS("list-style-type", "none");
      await expect(row).toHaveCSS("padding-top", "10px");
      await expect(row).toHaveCSS("padding-right", "0px");
      await expect(row).toHaveCSS("padding-bottom", "10px");
      await expect(row).toHaveCSS("padding-left", "0px");
      await expect(info).toHaveCSS("line-height", "20px");
      await expect(info).toHaveCSS("margin-top", "5px");
      await expect(project).toHaveCSS("font-size", "15px");
      await expect(project).toHaveCSS("font-weight", "700");
      await expect(project).toHaveCSS("display", "inline-block");
      await expect(project).toHaveCSS("line-height", "20px");
      await expect(project).toHaveCSS("color", "rgb(0, 136, 204)");
      await expect(separator).toHaveCSS("font-size", "15px");
      await expect(separator).toHaveCSS("font-weight", "700");
      await expect(separator).toHaveCSS("padding-left", "5px");
      await expect(separator).toHaveCSS("padding-right", "5px");
      await expect(title).toHaveCSS("font-size", "15px");
      await expect(title).toHaveCSS("font-weight", "700");

      const boxes = await row.evaluate((element) => {
        const pick = (selector: string, firstInlineFragment = false) => {
          const node = element.querySelector<HTMLElement>(selector);
          if (!node) throw new Error(`Missing ${selector}`);
          const rect = firstInlineFragment
            ? (node.getClientRects().item(0) ?? node.getBoundingClientRect())
            : node.getBoundingClientRect();
          const { bottom, left, right, top } = rect;
          return { bottom, left, right, top };
        };
        const { bottom, left, right, top } = element.getBoundingClientRect();
        return {
          avatar: pick(':scope > [data-owner="site-issue-list-project-avatar"]'),
          info: pick(':scope > [data-owner="site-issue-list-info"]'),
          meta: pick(':scope > [data-owner="site-issue-list-metadata"]'),
          project: pick(
            ':scope > [data-owner="site-issue-list-info"] > [data-owner="site-issue-list-project-link"]',
            true,
          ),
          row: { bottom, left, right, top },
          separator: pick(
            ':scope > [data-owner="site-issue-list-info"] > [data-owner="site-issue-list-separator"]',
            true,
          ),
          title: pick(
            ':scope > [data-owner="site-issue-list-info"] > [data-owner="site-issue-list-title-link"]',
            true,
          ),
        };
      });

      for (const box of [boxes.avatar, boxes.info, boxes.meta]) {
        expect(box.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
        expect(box.right).toBeLessThanOrEqual(boxes.row.right + 1);
        expect(box.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
        expect(box.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
      }
      expect(boxes.project.right).toBeLessThan(boxes.separator.left);
      expect(boxes.separator.right).toBeLessThan(boxes.title.left);
      expect(Math.abs(boxes.project.top - boxes.separator.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes.separator.top - boxes.title.top)).toBeLessThanOrEqual(1);
      expect(boxes.info.top).toBeGreaterThanOrEqual(boxes.avatar.top - 1);
      expect(boxes.meta.top).toBeGreaterThanOrEqual(boxes.info.top);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
});

function owner(root: Page | Locator, ownerName: string) {
  return root.locator(`[data-owner="${ownerName}"]`);
}

async function routeFixtureImage(page: Page, imageUrl: string, width: number, height: number) {
  await page.route(imageUrl, (route) =>
    route.fulfill({
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
      contentType: "image/svg+xml",
    }),
  );
}
