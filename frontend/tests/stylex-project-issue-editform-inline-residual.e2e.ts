import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("issue editform owns static editor, assignee, and paste-help declarations", async ({
  page,
}) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx",
    "utf8",
  );
  const stylexSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber/-issue-editform.stylex.ts",
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/issue/edit.scala.html", "utf8");
  const editor = readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8");
  const uploader = readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8");
  const assignee = readFileSync(
    "../yona-original/app/views/issue/partial_assignee.scala.html",
    "utf8",
  );

  expect(legacy).toContain('<dd style="position: relative;">');
  expect(assignee).toContain('id="assignee"');
  expect(editor).toContain('style="position:relative;overflow: visible;"');
  expect(uploader).toContain('class="help help-pastable"');
  expect(route).not.toContain('style={{ position: "relative" }}');
  expect(route).not.toContain('style={{ width: "100%" }}');
  expect(route).not.toContain('style={{ position: "relative", overflow: "visible" }}');
  expect(route).not.toContain('style={{ display: "block" }}');
  expect(stylexSource).toContain('editorTabContent: { position: "relative", overflow: "visible" }');
  expect(stylexSource).toContain('assigneeInput: { width: "100%" }');
  expect(stylexSource).toContain('pasteHelp: { display: "block" }');

  await mockIssueEditForm(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/issue/1/editform`, { waitUntil: "commit" });

    await expect(page.locator('[data-stylex-owner="issue-editform-editor-wrapper"]')).toHaveCSS(
      "position",
      "relative",
    );
    await expect(page.locator('[data-stylex-owner="issue-editform-editor-tab-content"]')).toHaveCSS(
      "overflow",
      "visible",
    );
    await expect(page.locator('[data-stylex-owner="issue-editform-assignee-input"]')).toHaveClass(
      /issue-editform/u,
    );
    const pickerWidth = await page
      .locator('[data-stylex-owner="issue-editform-assignee-picker"]')
      .evaluate((element) => ({
        computed: element.getBoundingClientRect().width,
        parent: element.parentElement?.getBoundingClientRect().width,
      }));
    expect(pickerWidth.computed).toBeCloseTo(pickerWidth.parent ?? 0, 0);
    await expect(page.locator('[data-stylex-owner="issue-editform-paste-help"]')).toHaveCSS(
      "display",
      "block",
    );
    const editorBox = await page
      .locator('[data-stylex-owner="issue-editform-editor-wrapper"]')
      .boundingBox();
    expect(editorBox).not.toBeNull();
    expect(editorBox!.x + editorBox!.width).toBeLessThanOrEqual(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width + 2,
    );
  }
});

async function mockIssueEditForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: "7",
        menuSetting: { issue: true, milestone: true },
        movableIssueProjects: [],
        ownerName: "weblabs",
        projectName: "demo",
        projectScope: "PUBLIC",
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/labels", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/projects/**/issues/parent-options**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects/**/issues/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        authorId: "1",
        bodyMarkdown: "Body",
        issueId: "1",
        issueNumber: 1,
        isDraft: false,
        labels: [],
        state: "open",
        title: "Issue title",
        viewerUserId: "1",
      },
    }),
  );
}
