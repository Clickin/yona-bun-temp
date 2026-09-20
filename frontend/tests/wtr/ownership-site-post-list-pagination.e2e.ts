import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  icon: '[data-owner="site-post-list-pagination-dynamic-sprite"]',
  input: '[data-owner="site-post-list-pagination-input"]',
  item: '[data-owner="site-post-list-pagination-item"]',
  label: '[data-owner="site-post-list-pagination-label"]',
  list: '[data-owner="site-post-list-pagination-list"]',
  wrapper: '[data-owner="site-post-list-pagination"]',
};

async function openPagination(page: Page, pageNum = 1) {
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-pagination" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) => {
    const requested = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        page: requested,
        pageSize: 20,
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
            postNumber: String(70 + requested),
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            readme: false,
            title: `Release checklist page ${requested}`,
            updatedLabel: "1 day ago",
          },
        ],
        total: 60,
        totalPages: 3,
      },
    });
  });

  await page.goto(`${basePath}/sites/postList?pageNum=${pageNum}`);
  const pagination = page.locator(owners.wrapper);
  await expect(pagination).toBeVisible();
  return pagination;
}

test.describe("Style site post-list pagination", () => {
  test("keeps legacy order, copy, first-page state, SPA navigation, and input behavior", async ({
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
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as Window & { __paginationSpaMarker?: boolean }).__paginationSpaMarker,
        ),
      )
      .toBe(true);
    await expect(page.locator(owners.input)).toHaveValue("2");

    const input = page.locator(owners.input);
    await input.fill("9");
    await input.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
    await expect(input).toHaveValue("3");
    await expect(page.locator(owners.icon).first()).toHaveCSS(
      "background-position",
      "-136px -139px",
    );
    await expect(page.locator(owners.icon).last()).toHaveCSS("background-position", "-23px -13px");
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
      await expect(list).toHaveCSS("list-style-type", "none");
      await expect(list).toHaveCSS("margin-left", "-120px");
      await expect(input).toHaveCSS("width", "30px");
      await expect(input).toHaveCSS("font-weight", "700");
      await expect(input).toHaveCSS("border-color", "rgb(238, 238, 238)");
      await input.hover();
      await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
      await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
      await input.focus();
      await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
      await expect(labels.first()).toHaveCSS("font-size", "11px");
      await expect(labels.first()).toHaveCSS("color", "rgb(142, 144, 148)");
      await expect(labels.last()).toHaveCSS("color", "rgb(243, 108, 34)");
      for (const icon of await icons.all()) {
        await expect(icon).toHaveCSS("background-image", /sprite[^)]*\.png/u);
        await expect(icon).toHaveCSS("background-repeat", "no-repeat");
        await expect(icon).toHaveCSS("width", "6px");
        await expect(icon).toHaveCSS("height", "9px");
        await expect(icon).toHaveCSS("display", "inline-block");
        await expect(icon).toHaveCSS("vertical-align", "middle");
      }
      await expect(icons.first()).toHaveCSS("background-position", "-164px -2px");
      await expect(icons.first()).toHaveCSS("margin-right", "10px");
      await expect(icons.last()).toHaveCSS("background-position", "-146px -139px");
      await expect(icons.last()).toHaveCSS("margin-left", "10px");

      const metrics = await pagination.evaluate((wrapper) => {
        const list = wrapper.querySelector<HTMLElement>(
          '[data-owner="site-post-list-pagination-list"]',
        )!;
        const items = Array.from(
          wrapper.querySelectorAll<HTMLElement>('[data-owner="site-post-list-pagination-item"]'),
        );
        const wrapBox = wrapper.getBoundingClientRect();
        const listBox = list.getBoundingClientRect();
        return {
          itemBoxes: items.map((item) => {
            const box = item.getBoundingClientRect();
            return { bottom: box.bottom, left: box.left, right: box.right, top: box.top };
          }),
          list: {
            bottom: listBox.bottom,
            left: listBox.left,
            right: listBox.right,
            top: listBox.top,
          },
          wrapper: {
            bottom: wrapBox.bottom,
            left: wrapBox.left,
            right: wrapBox.right,
            top: wrapBox.top,
          },
        };
      });
      for (const item of metrics.itemBoxes) {
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
