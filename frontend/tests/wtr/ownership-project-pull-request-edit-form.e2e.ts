import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = readFileSync(
  "src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
  "utf8",
);
const styleSource =
  readFileSync("src/app.css", "utf8") +
  readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

test("pull request edit form keeps loaded state and Style owner boundaries", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockEditForm(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);

  expect(readFileSync("../yona-original/app/views/git/edit.scala.html", "utf8")).toContain(
    "pull-request-wrap",
  );
  expect(readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8")).toContain(
    ".pull-request-wrap",
  );
  for (const owner of [
    "pull-request-edit-form",
    "pull-request-edit-selectors",
    "pull-request-edit-editor",
    "pull-request-edit-merge-result",
  ]) {
    await expect(page.locator(`[data-owner="${owner}"]`)).toHaveCount(1);
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  // Bucket-3 fix (wave 22): the uploader owner is passed as a prop to the shared
  // PullRequestFileUploader (owners.wrapper), not a literal attribute in editform.tsx.
  await expect(page.locator('[data-owner="pull-request-edit-uploader"]')).toHaveCount(1);

  await expect(page.locator("#pullRequestState")).toHaveCount(1);
  await expect(page.locator("#status")).toContainText("cannot be merged safely");
  await expect(page.locator("#fromProjectId")).toBeDisabled();
  await expect(page.locator("#toBranch")).toBeDisabled();

  const form = page.locator("form.nm");
  const formBox = await form.boundingBox();
  const contentBox = await page.locator(".content-wrap.frm-wrap").boundingBox();
  expect(formBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(formBox!.x).toBeGreaterThanOrEqual(contentBox!.x);
  expect(formBox!.x + formBox!.width).toBeLessThanOrEqual(contentBox!.x + contentBox!.width + 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1366);

  const editor = page.locator("#editor-body-body");
  await expect(editor).toBeVisible();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(page.locator("#edit-body")).toHaveClass(/active/);

  await page.screenshot({
    path: "/tmp/yona-batch259-pull-request-edit-desktop.png",
    fullPage: true,
  });

  await page.setViewportSize({ width: 390, height: 900 });
  await page.reload();
  await expect(page.locator('[data-owner="pull-request-edit-form"]')).toBeVisible();
  const mobileWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const mobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  // The frozen project shell rounds its 1px borders to a 2px scrollbar delta at 390px.
  expect(mobileScrollWidth - mobileWidth).toBeLessThanOrEqual(2);
  const mobileFormBox = await form.boundingBox();
  expect(mobileFormBox).not.toBeNull();
  expect(mobileFormBox!.x + mobileFormBox!.width).toBeLessThanOrEqual(mobileScrollWidth + 1);

  await page.locator("#title").fill("Updated title");
  await page.locator("#editor-body-body").fill("Updated body");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.locator('[data-owner="pull-request-edit-conflict-modal"]')).toHaveCount(1);
  await expect(page.locator("#pullRequestConflictConfirm")).toBeVisible();
  await expect(page.locator("#pullRequestConflictConfirm .msg")).toContainText("conflicts");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
});

async function mockEditForm(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    }),
  );
  await page.route("**/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify({ user: { loginId: "admin" } }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/7/form-options", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        fromBranches: [{ name: "feature/ui", selected: true }],
        fromProjects: [{ id: 8, ownerName: "dev", projectName: "fork", selected: true }],
        mode: "edit",
        pullRequest: {
          bodyMarkdown: "Initial body",
          fromBranch: "feature/ui",
          fromOwnerName: "dev",
          fromProjectName: "fork",
          id: 90,
          projectName: "sample",
          state: "OPEN",
          title: "Initial title",
        },
        selected: { fromBranch: "feature/ui", fromProjectId: 8, toBranch: "main", toProjectId: 7 },
        toBranches: [{ name: "main", selected: true }],
        toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        commits: [
          {
            authorDateLabel: "Jul 2, 2026",
            authorEmail: "dev@example.com",
            commitId: "abcdef1234567890",
            commitMessage: "Add UI",
            commitShortId: "abcdef1",
          },
        ],
        conflict: true,
      }),
    }),
  );
}
