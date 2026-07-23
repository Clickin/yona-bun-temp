import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-pull-request-editform-markdown-editor-mt10",
  fallbackOff ? "fallback-off" : "normal",
);
const routeSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
    import.meta.url,
  ),
  "utf8",
);
const styleSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-editform.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const legacyEditorSource = readFileSync(
  new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
  "utf8",
);
const legacyPullRequestSource = readFileSync(
  new URL("../../yona-original/app/views/git/edit.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("pull-request editform markdown editor keeps legacy mt10 ownership and tabs", async ({
  page,
}) => {
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyPullRequestSource).toContain('@common.editor("body",');
  expect(legacyCommonLessSource).toContain(".mt10 { margin-top:10px; }");

  expect(routeSource).toContain(
    'data-stylex-owner="pull-request-editform-markdown-editor-wrapper"',
  );
  expect(routeSource).toContain(
    "className={`${stylex.props(sx.markdownEditorWrapper).className} mt10`.trim()}",
  );
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(styleSource).toContain('markdownEditorWrapper: { marginTop: "10px" }');

  await mockPullRequestEditForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`, {
      waitUntil: "commit",
    });

    const wrapper = page.locator(
      '[data-stylex-owner="pull-request-editform-markdown-editor-wrapper"]',
    );
    await expect(wrapper).toBeVisible();
    await expect(wrapper).toHaveClass(/\bmt10\b/u);
    await expect(wrapper).toHaveCSS("margin-top", "10px");
    await expect(wrapper).not.toHaveAttribute("style", /.+/u);
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const tabs = wrapper.locator("> ul.nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0)).toContainText("Edit");
    await expect(tabs.nth(1)).toContainText("Preview");
    await expect(tabs.nth(2)).toContainText("Add checklist");
    await expect(tabs.nth(3)).toContainText("Clear Temporary");
    await expect(tabs.nth(4)).toHaveText("");
    await expect(wrapper.locator("#editor-body-body")).toHaveValue("Initial body");
    await expect(wrapper.locator(".notification-receiver-title")).toHaveText(
      "Notification receivers",
    );
    await expect(wrapper.locator("#edit-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#preview-body")).not.toHaveClass(/\bactive\b/u);

    await tabs.nth(1).getByRole("button", { name: "Preview" }).click();
    await expect(wrapper.locator("#preview-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#edit-body")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).getByRole("button", { name: "Edit" }).click();
    await expect(wrapper.locator("#edit-body")).toHaveClass(/\bactive\b/u);

    const metrics = await wrapper.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics.top).toBeGreaterThan(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.bottom).toBeGreaterThan(metrics.top);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockPullRequestEditForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: { board: true, code: true, issue: true, pullRequest: true },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/7/form-options",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          fromBranches: [
            { name: "feature/ui", selected: true },
            { name: "main", selected: false },
          ],
          fromProjects: [{ id: 8, ownerName: "dev", projectName: "fork", selected: true }],
          mode: "edit",
          pullRequest: {
            bodyMarkdown: "Initial body",
            id: 90,
            permissions: { canUpdate: true },
            state: "OPEN",
            title: "Initial title",
          },
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 8,
            toBranch: "main",
            toProjectId: 7,
          },
          toBranches: [{ name: "main", selected: true }],
          toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
        },
      }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: { commits: [], conflict: false, noHead: false },
      }),
  );
}
