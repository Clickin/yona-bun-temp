import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = "../src/routes/$ownerName/$projectName/issueform.tsx";
const styleSource = "../src/app.css";
const legacyCreateSource = "../yona-original/app/views/issue/create.scala.html";
const legacyEditorSource = "../yona-original/app/views/common/editor.scala.html";
const legacyCommonLessSource = "../yona-original/app/assets/stylesheets/less/_common.less";
const legacyYobiLessSource = "../yona-original/app/assets/stylesheets/yobi.less";
const legacyMessagesSource = "../yona-original/conf/messages";

test.use({ locale: "en-US" });

test("issueform markdown editor keeps legacy mt10 ownership, tabs, and responsive bounds", async ({
  page,
}, _testInfo) => {
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

  expect(route).toContain('wrapperOwner="project-issue-form-markdown-editor"');
  expect(route).toContain("nav nav-tabs nm small");
  expect(route).toContain('editPaneId="edit-body"');
  expect(route).toContain('previewPaneId="preview-body"');

  await mockIssueForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issueform`, { waitUntil: "commit" });

    const wrapper = page.locator('[data-owner="project-issue-form-markdown-editor"]');
    // F5 dist-truth: wrapper can take longer than the harness visibility
    // timeout to paint under shard load — poll paint with an explicit 30s
    // window, tolerating the pre-render absence.
    {
      let wrapperVisible = false;
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        if ((await wrapper.count()) > 0) {
          wrapperVisible = await wrapper.evaluate(
            (element) =>
              getComputedStyle(element).display !== "none" && element.getClientRects().length > 0,
          );
          if (wrapperVisible) break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      expect(wrapperVisible).toBe(true);
    }
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
        '[data-owner="project-issue-form-markdown-editor"]',
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
      path: `/private/tmp/yona-style-project-issueform-markdown-editor-mt10-${viewport.name}.png`,
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
