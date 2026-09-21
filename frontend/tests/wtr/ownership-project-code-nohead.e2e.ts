import { expect, test } from "../wtr-compat.ts";

test("project no-head code preserves runtime owners", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        cloneUrl: "https://git.example/sample.git",
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({ contentType: "application/json", json: { noHead: true } }),
  );
  await page.goto(`${basePath}/admin/sample/code`, { waitUntil: "commit" });
  const pageShell = page.locator('[data-owner="project-code-nohead-page"]');

  const alert = page.locator('[data-owner="project-code-nohead-alert"]');
  await expect(pageShell).toBeVisible();
  await expect(alert).toBeVisible();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const shell = document.querySelector<HTMLElement>(
          '[data-owner="project-code-nohead-page"]',
        );
        const noHeadColumn = document.querySelector<HTMLElement>(
          '[data-owner="project-code-nohead-column"]',
        );
        const noHeadAlert = document.querySelector<HTMLElement>(
          '[data-owner="project-code-nohead-alert"]',
        );
        if (!shell || !noHeadColumn || !noHeadAlert) return null;
        const shellStyle = getComputedStyle(shell);
        const columnStyle = getComputedStyle(noHeadColumn);
        const alertStyle = getComputedStyle(noHeadAlert);
        return {
          alertBackground: alertStyle.backgroundColor,
          alertBorderTopColor: alertStyle.borderTopColor,
          alertColor: alertStyle.color,
          columnPaddingLeft: columnStyle.paddingLeft,
          columnPaddingRight: columnStyle.paddingRight,
          pageMarginTop: shellStyle.marginTop,
        };
      }),
    )
    .toEqual({
      alertBackground: "rgb(252, 248, 227)",
      alertBorderTopColor: "rgb(251, 238, 213)",
      alertColor: "rgb(192, 152, 83)",
      // F5 (2026-08-13): legacy — frozen .page-wrap-outer margin-top 10px
      // (_page.less:617-620) and nohead_svn.scala.html:28-31 has no column
      // padding (the 20px/10px pins measured the pre-fix deviated state).
      columnPaddingLeft: "0px",
      columnPaddingRight: "0px",
      pageMarginTop: "10px",
    });
});
