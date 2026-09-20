import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  icon: '[data-owner="site-issue-list-pagination-prev"], [data-owner="site-issue-list-pagination-next"], [data-owner="site-issue-list-pagination-first"], [data-owner="site-issue-list-pagination-last"]',
  input: '[data-owner="site-issue-list-pagination-input"]',
  item: '[data-owner="site-issue-list-pagination-item"]',
  label: '[data-owner="site-issue-list-pagination-label"]',
  list: '[data-owner="site-issue-list-pagination-list"]',
  wrapper: '[data-owner="site-issue-list-pagination"]',
};

async function openPagination(page: Page, pageNum = 1) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-pagination" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) => {
    const url = new URL(route.request().url());
    const requested = Number(url.searchParams.get("page") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        issues: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29T14:30:00Z",
            issueNumber: String(40 + requested),
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: `Release blocker page ${requested}`,
          },
        ],
        page: requested,
        pageSize: 20,
        state: url.searchParams.get("state") ?? "open",
        total: 60,
        totalPages: 3,
      },
    });
  });

  await page.goto(
    `${basePath}/sites/issueList?state=open&pageNum=${pageNum}&sort=created&filter=mine`,
  );
  const pagination = page.locator(owners.wrapper);
  await expect(pagination).toBeVisible();
  return pagination;
}

test.describe("Style site issue-list pagination", () => {
  test("keeps five-item order, copy, state, SPA links, query params, and number input behavior", async ({
    page,
  }) => {
    const pagination = await openPagination(page);
    await expect(pagination.locator(owners.item)).toHaveCount(5);
    await expect(pagination.locator(owners.label)).toHaveText(["Previous page", "Next page"]);
    await expect(pagination.locator(owners.input)).toHaveValue("1");
    await expect(pagination.locator(owners.item).nth(2)).toHaveText("/");
    await expect(pagination.locator(owners.item).nth(3)).toHaveText("3");
    await expect(pagination.locator("a", { hasText: "Previous page" })).toHaveCount(0);

    await page.evaluate(() => {
      (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker = true;
    });
    await pagination.locator("a", { hasText: "Next page" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
    expect(new URL(page.url()).searchParams.get("state")).toBe("open");
    expect(new URL(page.url()).searchParams.get("sort")).toBe("created");
    expect(new URL(page.url()).searchParams.get("filter")).toBe("mine");
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
        ),
      )
      .toBe(true);
    await expect(page.locator(owners.input)).toHaveValue("2");

    const input = page.locator(owners.input);
    await input.click();
    await input.fill("9");
    await input.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
    await expect(input).toHaveValue("3");
    await input.fill("1.5");
    await input.press("Enter");
    await expect(input).toHaveValue("3");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} legacy paint, pagination alignment, and item containment`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const pagination = await openPagination(page);
      const list = pagination.locator(owners.list);
      const input = pagination.locator(owners.input);
      const labels = pagination.locator(owners.label);
      const icons = pagination.locator(owners.icon);
      await expect(pagination).toHaveCSS("text-align", "center");
      await expect(pagination).toHaveCSS("margin-top", "20px");
      await expect(pagination).toHaveCSS("margin-bottom", "20px");
      await expect(pagination).toHaveCSS("clear", "both");
      await expect(list).toHaveCSS("display", "inline-block");
      await expect(list).toHaveCSS("font-size", "0px");
      await expect(list).toHaveCSS("margin-left", "-120px");
      await expect(input).toHaveCSS("width", "30px");
      await expect(input).toHaveCSS("border-color", "rgb(238, 238, 238)");
      await input.hover();
      await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
      await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
      await input.focus();
      await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
      await expect(labels.first()).toHaveCSS("color", "rgb(142, 144, 148)");
      await expect(labels.last()).toHaveCSS("color", "rgb(243, 108, 34)");
      for (const icon of await icons.all()) {
        await expect(icon).toHaveCSS("background-image", /sprite[^)]*\.png/u);
        await expect(icon).toHaveCSS("width", "6px");
        await expect(icon).toHaveCSS("height", "9px");
        await expect(icon).toHaveCSS("display", "inline-block");
        await expect(icon).toHaveCSS("background-repeat", "no-repeat");
        await expect(icon).toHaveCSS("vertical-align", "middle");
      }
      await expect(icons.nth(0)).toHaveCSS("background-position", "-164px -2px");
      await expect(icons.nth(1)).toHaveCSS("background-position", "-146px -139px");

      const metrics = await pagination.evaluate((wrapper) => {
        const list = wrapper.querySelector<HTMLElement>(
          '[data-owner="site-issue-list-pagination-list"]',
        )!;
        const items = Array.from(
          wrapper.querySelectorAll<HTMLElement>('[data-owner="site-issue-list-pagination-item"]'),
        );
        const w = wrapper.getBoundingClientRect();
        const l = list.getBoundingClientRect();
        return {
          items: items.map((item) => {
            const b = item.getBoundingClientRect();
            return { bottom: b.bottom, left: b.left, right: b.right, top: b.top };
          }),
          list: { bottom: l.bottom, left: l.left, right: l.right, top: l.top },
          wrapper: { bottom: w.bottom, left: w.left, right: w.right, top: w.top },
        };
      });
      for (const item of metrics.items) {
        expect(item.left).toBeGreaterThanOrEqual(metrics.list.left - 1);
        expect(item.right).toBeLessThanOrEqual(metrics.list.right + 1);
        expect(item.top).toBeGreaterThanOrEqual(metrics.list.top - 1);
        expect(item.bottom).toBeLessThanOrEqual(metrics.list.bottom + 1);
      }
      // _page.less .page-nums keeps its important -120px margin at both widths.
      expect(
        Math.abs(
          (metrics.list.left + metrics.list.right) / 2 -
            (metrics.wrapper.left + metrics.wrapper.right) / 2 +
            60,
        ),
      ).toBeLessThanOrEqual(1);
    });
  }
});
