import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const legacyCreateSource = new URL(
  "../../yona-original/app/views/issue/create.scala.html",
  import.meta.url,
);
const legacyEditorSource = new URL(
  "../../yona-original/app/views/common/editor.scala.html",
  import.meta.url,
);
const legacyCommonLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const legacyYobiLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/yobi.less",
  import.meta.url,
);
const legacyMessagesSource = new URL("../../yona-original/conf/messages", import.meta.url);

test.use({ locale: "en-US" });

test("issueform markdown editor keeps legacy mt10 ownership, tabs, and responsive bounds", async ({
  page,
}, testInfo) => {
  const [route, style, create, editor, commonLess, yobiLess, messages] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyCreateSource, "utf8"),
    readFile(legacyEditorSource, "utf8"),
    readFile(legacyCommonLessSource, "utf8"),
    readFile(legacyYobiLessSource, "utf8"),
    readFile(legacyMessagesSource, "utf8"),
  ]);

  // Legacy Scala HTML/JS is output DOM/UX evidence; editor behavior remains React state/events.
  expect(create).toContain('@common.editor("body"');
  expect(editor).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(commonLess).toContain(".mt10 { margin-top:10px; }");
  expect(yobiLess).toContain('@import "less/_common.less";');
  expect(messages).toContain("common.editor.edit = Edit");
  expect(messages).toContain("common.editor.preview = Preview");

  expect(route).toContain("className={`mt10 issue-markdown-editor");
  expect(route).toContain('data-stylex-owner="project-issue-form-markdown-editor"');
  expect(route).toContain("nav nav-tabs nm small");
  expect(route).toContain('id="edit-body"');
  expect(route).toContain('id="preview-body"');
  expect(route).not.toContain('style={{ marginTop: "10px" }}');
  expect(style).toMatch(
    /issueMarkdownEditor:\s*\{\s*position:\s*"relative",\s*marginTop:\s*"10px"\s*\}/u,
  );

  await mockIssueForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });

    const wrapper = page.locator('[data-stylex-owner="project-issue-form-markdown-editor"]');
    await expect(wrapper).toBeVisible({ timeout: 15000 });
    await expect(wrapper).toHaveClass(/\bmt10\b/u);
    await expect(wrapper).toHaveCSS("margin-top", "10px");
    await expect(wrapper).not.toHaveAttribute("style", /.+/u);

    const tabs = wrapper.locator(".nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).locator("button")).toHaveText("Edit");
    await expect(tabs.nth(1).locator("button")).toHaveText("Preview");
    await expect(tabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(tabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(wrapper.locator("#edit-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#preview-body")).not.toHaveClass(/\bactive\b/u);

    await tabs.nth(1).locator("button").click();
    await expect(wrapper.locator("#preview-body")).toHaveClass(/\bactive\b/u);
    await expect(wrapper.locator("#edit-body")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).locator("button").click();
    await expect(wrapper.locator("#edit-body")).toHaveClass(/\bactive\b/u);

    const metrics = await page.evaluate(() => {
      const editor = document.querySelector<HTMLElement>(
        '[data-stylex-owner="project-issue-form-markdown-editor"]',
      );
      if (!editor) return null;
      const box = editor.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        editorBottom: box.bottom,
        editorLeft: box.left,
        editorRight: box.right,
        editorTop: box.top,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(metrics).not.toBeNull();
    expect(metrics!.editorTop).toBeGreaterThan(0);
    expect(metrics!.editorBottom).toBeGreaterThan(metrics!.editorTop);
    expect(metrics!.editorLeft).toBeGreaterThanOrEqual(0);
    expect(metrics!.editorRight).toBeLessThanOrEqual(metrics!.viewportWidth + 1);
    expect(metrics!.documentWidth).toBe(metrics!.viewportWidth);

    await page.screenshot({
      fullPage: true,
      path: testInfo.outputPath(`issueform-markdown-editor-mt10-${viewport.name}.png`),
    });
  }
});

async function mockIssueForm(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-issue-form" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-issue-form" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    });
  });
  await page.route("**/api/v1/workspace", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emails: [],
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        session: {
          actorId: 1,
          isAnonymous: false,
          isSiteAdmin: true,
          loginId: "admin",
          userLabel: "Site Admin",
        },
        watchedProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrolledUsers: [],
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
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        ownerName: "admin",
        postCount: 0,
        projectId: 7,
        projectName: "sample",
        projectScope: "PUBLIC",
        showMilestone: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ labels: [] }) });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/form-options", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: false,
        canCreateIssueMilestone: true,
        canManageIssueLabels: false,
        currentProject: { logoUrl: "", ownerName: "admin", projectId: 7, projectName: "sample" },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", async (route) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [] }) });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: [] }),
    });
  });
}
