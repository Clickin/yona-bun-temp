import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const generatedFallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

test("project pull-request empty state owns the legacy error-wrap geometry", async ({ page }) => {
  const [route, styles, legacy, partial, less, messages, sprite] = await Promise.all([
    readFile(
      new URL("../src/routes/$ownerName/$projectName/pullRequests.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/app.css", import.meta.url), "utf8"),
    readFile(new URL("../../yona-original/app/views/git/list.scala.html", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/git/partial_list.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(new URL("../src/assets/legacy/sprite.png", import.meta.url)),
  ]);

  expect(legacy).toContain("partial_search(project, page, condition, requestType)");
  expect(partial).toContain('<div class="error-wrap">');
  expect(partial).toContain('<i class="ico ico-err1"></i>');
  expect(partial).toContain('Messages("pullRequest.is.empty")');
  expect(less).toContain("padding:100px 0px;");
  expect(less).toContain("font-weight:bold; font-size:16px;");
  expect(messages).toContain("pullRequest.is.empty = No pull requests have been received");
  expect(route).toContain('data-owner="project-pullrequests-empty-error-wrap"');
  expect(route).toContain('data-owner="project-pullrequests-empty-icon"');
  expect(route).toContain('data-owner="project-pullrequests-empty-message"');

  expect(sprite.byteLength).toBeGreaterThan(0);

  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
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
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        acceptedCount: 0,
        category: "open",
        closedCount: 0,
        contributors: [],
        currentUserId: 1,
        items: [],
        openCount: 0,
        pageNum: 1,
        pageSize: 20,
        recentlyPushedBranches: [],
        sentCount: 0,
        totalCount: 0,
      },
    }),
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequests`, { waitUntil: "commit" });
    await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
    );

    const wrapper = page.locator('[data-owner="project-pullrequests-empty-error-wrap"]');
    const icon = page.locator('[data-owner="project-pullrequests-empty-icon"]');
    const message = page.locator('[data-owner="project-pullrequests-empty-message"]');
    await expect(wrapper).toBeVisible();
    await expect(wrapper).toHaveClass(/error-wrap/u);
    await expect(icon).toHaveClass(/ico-err1/u);
    await expect(message).toHaveText("No pull requests have been received");
    await expect(wrapper).toHaveCSS("padding-top", "100px");
    await expect(wrapper).toHaveCSS("padding-bottom", "100px");
    await expect(wrapper).toHaveCSS("text-align", "center");
    await expect(icon).toHaveCSS("display", "inline-block");
    await expect(icon).toHaveCSS("width", "62px");
    await expect(icon).toHaveCSS("height", "82px");
    await expect(icon).toHaveCSS("background-position", "-5px -160px");
    await expect(icon).toHaveCSS("background-repeat", "no-repeat");
    await expect(icon).toHaveCSS("vertical-align", "middle");
    await expect(message).toHaveCSS("font-weight", "700");
    await expect(message).toHaveCSS("font-size", "16px");
    await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
    await expect(message).toHaveCSS("margin-top", "30px");
    await expect(message).toHaveCSS("margin-bottom", "30px");

    const geometry = await wrapper.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, viewport: window.innerWidth };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThanOrEqual(342);
    expect(geometry.viewport).toBe(viewport.width);
  }
});
