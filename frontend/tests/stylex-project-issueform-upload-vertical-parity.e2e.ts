import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const routeSource = new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/$ownerName/$projectName/-issueform.stylex.ts",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

test("issueform editor owns legacy border-box geometry before the upload shell", async () => {
  const [route, styles, bootstrap] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(bootstrapSource, "utf8"),
  ]);

  expect(route).toContain('data-stylex-owner="project-issue-form-editor-textarea"');
  expect(route).toContain('data-stylex-owner="project-issue-form-textarea-box"');
  expect(route).toContain("issueFormStyles.editorTextareaHeight");
  expect(styles).toContain('boxSizing: "border-box"');
  expect(styles).toContain("editorTextarea:");
  expect(bootstrap).toContain("box-sizing: border-box;");
  expect(route).toContain('data-stylex-owner="project-issue-form-upload-shell"');
});

test("issueform upload shell stays immediately after the border-box editor on both direct routes", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockIssueForm(page);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const path of ["/user/issues/new", "/user/issues/new/mine"]) {
      await page.goto(`${basePath}${path}`, { waitUntil: "commit" });
      const editor = page.locator('[data-stylex-owner="project-issue-form-textarea-box"]');
      const textarea = page.locator('[data-stylex-owner="project-issue-form-editor-textarea"]');
      const upload = page.locator('[data-stylex-owner="project-issue-form-upload-shell"]');
      await expect(editor).toBeVisible();
      await expect(textarea).toHaveCSS("box-sizing", "border-box");
      await expect(upload).toBeVisible();

      const geometry = await page.evaluate(() => {
        const editor = document.querySelector<HTMLElement>(
          '[data-stylex-owner="project-issue-form-textarea-box"]',
        );
        const textarea = document.querySelector<HTMLElement>(
          '[data-stylex-owner="project-issue-form-editor-textarea"]',
        );
        const upload = document.querySelector<HTMLElement>(
          '[data-stylex-owner="project-issue-form-upload-shell"]',
        );
        if (!editor || !textarea || !upload) throw new Error("Missing issueform geometry");
        const editorBox = editor.getBoundingClientRect();
        const textareaBox = textarea.getBoundingClientRect();
        const uploadBox = upload.getBoundingClientRect();
        return {
          editorHeight: editorBox.height,
          editorBottom: editorBox.bottom,
          textareaHeight: textareaBox.height,
          uploadTop: uploadBox.top,
          uploadHeight: uploadBox.height,
          uploadMinHeight: Number.parseFloat(getComputedStyle(upload).minHeight),
        };
      });

      expect(geometry.editorHeight).toBeGreaterThanOrEqual(geometry.textareaHeight);
      expect(geometry.textareaHeight).toBeCloseTo(300, 0);
      expect(geometry.uploadTop).toBeCloseTo(geometry.editorBottom, 0);
      expect(geometry.uploadHeight).toBeGreaterThanOrEqual(geometry.uploadMinHeight);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );
    }
  }
});

async function mockIssueForm(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-issue-form" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-issue-form" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
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
    }),
  );
  await page.route("**/api/v1/user/issues/new-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        bodyMarkdown: "",
        referCommentId: "",
        selectedProject: { ownerName: "admin", projectName: "sample" },
      }),
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/*/container", (route) => {
    const projectName = new URL(route.request().url()).pathname.split("/").at(-2) ?? "sample";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(projectPayload(projectName)),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/*/labels", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ labels: [] }) }),
  );
  await page.route("**/api/v1/projects/admin/*/issues/form-options", (route) => {
    const projectName = new URL(route.request().url()).pathname.split("/").at(-3) ?? "sample";
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: false,
        canCreateIssueMilestone: true,
        canManageIssueLabels: false,
        currentProject: {
          logoUrl: "",
          ownerName: "admin",
          projectId: 7,
          projectName,
        },
        issueTemplateMarkdown: "",
        movableIssueProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/*/issues/parent-options**", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ items: [] }) }),
  );
  await page.route("**/api/v1/owners/admin/projects/*/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ milestones: [] }) }),
  );
}

function projectPayload(projectName: string) {
  return {
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
    projectName,
    projectScope: "PUBLIC",
    showMilestone: true,
    vcs: "GIT",
    viewerCanUpdate: true,
  };
}
