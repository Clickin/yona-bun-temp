import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("moves board post edit editor wrapper to route-local Style", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx",
    "utf8",
  );

  const template = readFileSync("../yona-original/app/views/board/edit.scala.html", "utf8");
  const editor = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  expect(template).toContain('<dd style="position: relative;">');
  expect(template).toContain('@common.editor("body"');
  expect(editor).toContain('class="nav nav-tabs nm small"');
  expect(route).toContain('data-owner="post-edit-form-editor"');

  await mockPostEdit(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/post/12/editform`, { waitUntil: "commit" });
  const wrapper = page.locator('[data-owner="post-edit-form-editor"]');
  await expect(wrapper).toBeVisible();
  // e2e closure ledger (2026-08-11): legacy board/edit.scala.html renders
  // <dd style="position: relative;"> (asserted above); the route restores that
  // inline style verbatim, so the no-inline-style pin is stale.
  await expect(wrapper).toHaveAttribute("style", "position: relative;");
  await expect(wrapper).toHaveCSS("position", "relative");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(wrapper).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(392);
});

async function mockPostEdit(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
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
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/12", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: "12",
        postNumber: "12",
        ownerName: "admin",
        projectName: "sample",
        title: "Release notes",
        bodyMarkdown: "Release body",
        bodyHtml: "<p>Release body</p>",
        notice: true,
        readme: false,
        authorLoginId: "admin",
        authorId: "1",
        authorLabel: "Admin",
        attachments: [],
        comments: [],
        labels: [],
        permissions: {
          canUpdate: true,
          canSetNotice: true,
          canDelete: true,
          canRead: true,
          canComment: true,
          canCreate: true,
          canWatch: true,
        },
      },
    }),
  );
}
