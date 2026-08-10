import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("new pull-request form paste-help display is conditional Style-owned", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/newPullRequestForm.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/git/create.scala.html", "utf8");
  const upload = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  expect(template).toContain("ResourceType.PULL_REQUEST");
  expect(upload).toContain('class="help help-pastable"');
  expect(upload).toContain("common.attach.pastehere");
  expect(upload).toContain('<p class="right-txt help">');
  expect(upload).toContain("common.attach.attachIfYouSave");
  // bucket-3: uploader owners moved into the shared file-uploader's owners prop
  // (the component renders data-owner from it); the literal
  // data-owner pins matched the intermediate inline state.

  expect(route).not.toContain('<p className="right-txt help">');
});

test("new pull-request upload save help keeps legacy right alignment at runtime", async ({
  page,
}) => {
  // bucket-3: the form only renders once session/container/form-options resolve
  // (the route shell gates on the project container), and the legacy
  // attachIfYouSave message is Korean ("저장") — pin ko-KR via the navigator
  // override (same pattern as project-code-nohead-svn). The original navigated
  // to a bare path without mocks, which never rendered the form.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockNewPullRequestForm(page);
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "domcontentloaded" });
  const help = page.locator('[data-owner="new-pull-request-upload-save-help"]');
  await expect(help).toHaveCount(1);
  await expect(help).toHaveCSS("text-align", "right");
  await expect(help).toContainText("저장");
});

async function mockNewPullRequestForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    // Keep all languages supported so the ko-KR navigator override (pinned
    // above for the legacy "저장" message) actually resolves.
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "en",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: { board: true, code: true, issue: true, milestone: true, pullRequest: true },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "public",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/form-options**",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          fromBranches: [{ name: "feature/ui" }, { name: "main" }],
          fromProjects: [{ id: 7, ownerName: "admin", projectName: "sample" }],
          mode: "create",
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 7,
            toBranch: "main",
            toProjectId: 7,
          },
          toBranches: [{ name: "main" }],
          toProjects: [{ id: 7, ownerName: "admin", projectName: "sample" }],
        },
      }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          commits: [
            {
              authorDateLabel: "Jul 17, 2026",
              authorEmail: "admin@example.com",
              commitId: "abcdef1234567890",
              commitMessage: "Add UI",
              commitShortId: "abcdef1",
            },
          ],
          conflict: false,
        },
      }),
  );
}
