import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const routeSource = "../src/routes/$ownerName/$projectName/issueform.tsx";
const styleSource = "../src/app.css";
const markdownSource = "../src/routes/-legacy-markdown-help.tsx";
const markdownStyleSource = "../src/app.css";
const bootstrapSource = "../yona-original/public/bootstrap/css/bootstrap.css";
const legacyCreateSource = "../yona-original/app/views/issue/create.scala.html";
const legacyPageSource = "../yona-original/app/assets/stylesheets/less/_page.less";
const legacyMarkdownSource = "../yona-original/app/views/help/markdown.scala.html";
const legacyResponsiveSource = "../yona-original/app/assets/stylesheets/less/_responsive.less";

test("issueform editor owns legacy border-box geometry before the upload shell", async () => {
  const [
    route,
    styles,
    markdown,
    markdownStyles,
    bootstrap,
    legacyCreate,
    legacyPage,
    legacyMarkdown,
    legacyResponsive,
    uploaderSource,
  ] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(markdownSource, "utf8"),
    readFile(markdownStyleSource, "utf8"),
    readFile(bootstrapSource, "utf8"),
    readFile(legacyCreateSource, "utf8"),
    readFile(legacyPageSource, "utf8"),
    readFile(legacyMarkdownSource, "utf8"),
    readFile(legacyResponsiveSource, "utf8"),
    readFile("../src/components/file-uploader.tsx", "utf8"),
  ]);

  expect(route).toContain('textareaOwner="project-issue-form-editor-textarea"');
  expect(route).toContain('textareaBoxOwner="project-issue-form-textarea-box"');

  expect(bootstrap).toContain("box-sizing: border-box;");
  expect(legacyCreate).toContain('@common.editor("body"');
  expect(legacyCreate).toContain("@common.fileUploader(ResourceType.ISSUE_POST");
  expect(legacyPage).toContain(".title {");
  expect(legacyPage).toContain("margin-top: 15px;");
  expect(legacyPage).toContain("margin-bottom: 15px;");
  expect(uploaderSource).toContain('owner="project-issue-form-upload-shell"');
  expect(markdown).toContain('data-owner="markdown-help-nav-list"');
  expect(markdown).toContain('data-owner="markdown-help-nav-choice"');
  expect(legacyMarkdown).toContain('<ul class="markdown-help-nav">');
  expect(legacyResponsive).toContain(".markdown-help .markdown-help-nav li");
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
      const editor = page.locator('[data-owner="project-issue-form-textarea-box"]');
      const textarea = page.locator('[data-owner="project-issue-form-editor-textarea"]');
      const upload = page.locator('[data-owner="project-issue-form-upload-shell"]');
      await expect(editor).toBeVisible();
      await expect(textarea).toHaveCSS("box-sizing", "border-box");
      await expect(upload).toBeVisible();

      const geometry = await page.evaluate(() => {
        const editor = document.querySelector<HTMLElement>(
          '[data-owner="project-issue-form-textarea-box"]',
        );
        const textarea = document.querySelector<HTMLElement>(
          '[data-owner="project-issue-form-editor-textarea"]',
        );
        const title = document.querySelector<HTMLInputElement>("#title");
        const upload = document.querySelector<HTMLElement>(
          '[data-owner="project-issue-form-upload-shell"]',
        );
        if (!editor || !textarea || !title || !upload)
          throw new Error("Missing issueform geometry");
        const editorBox = editor.getBoundingClientRect();
        const textareaBox = textarea.getBoundingClientRect();
        const titleBox = title.getBoundingClientRect();
        const titleStyle = getComputedStyle(title);
        const uploadBox = upload.getBoundingClientRect();
        const markdownHelp = document.querySelector<HTMLElement>(".markdown-help");
        const markdownNav = document.querySelector<HTMLElement>(".markdown-help-nav");
        const markdownNavItems = Array.from(
          document.querySelectorAll<HTMLElement>(".markdown-help-nav > li.help-nav"),
        );
        if (!markdownHelp || !markdownNav || markdownNavItems.length === 0) {
          throw new Error("Missing markdown help geometry");
        }
        const markdownRowTops = [
          ...new Set(markdownNavItems.map((item) => Math.round(item.getBoundingClientRect().top))),
        ];
        const markdownNavGeometry = markdownNavItems.map((item) => ({
          label: item.textContent?.trim() ?? "",
          left: Math.round(item.getBoundingClientRect().left),
          top: Math.round(item.getBoundingClientRect().top),
        }));
        return {
          editorHeight: editorBox.height,
          editorTop: editorBox.top,
          editorBottom: editorBox.bottom,
          textareaHeight: textareaBox.height,
          titleBottom: titleBox.bottom,
          titleMarginBottom: titleStyle.marginBottom,
          titleMarginTop: titleStyle.marginTop,
          titleTop: titleBox.top,
          uploadTop: uploadBox.top,
          uploadHeight: uploadBox.height,
          uploadMinHeight: Number.parseFloat(getComputedStyle(upload).minHeight),
          markdownHelpHeight: markdownHelp.getBoundingClientRect().height,
          markdownRowTops,
          markdownNavGeometry,
        };
      });

      expect(geometry.editorHeight).toBeGreaterThanOrEqual(geometry.textareaHeight);
      expect(geometry.textareaHeight).toBeCloseTo(300, 0);
      expect(geometry.titleMarginTop).toBe("15px");
      expect(geometry.titleMarginBottom).toBe("15px");
      expect(geometry.uploadTop).toBeCloseTo(geometry.editorBottom, 0);
      expect(geometry.uploadHeight).toBeGreaterThanOrEqual(geometry.uploadMinHeight);
      if (viewport.width === 390) {
        expect(geometry.markdownHelpHeight).toBeCloseTo(91, 0);
        expect(geometry.markdownRowTops).toHaveLength(3);
        expect(geometry.markdownNavGeometry).toEqual([
          { label: "Header", left: 119, top: geometry.markdownNavGeometry[0].top },
          { label: "Text Style", left: 183, top: geometry.markdownNavGeometry[1].top },
          { label: "Link", left: 262, top: geometry.markdownNavGeometry[2].top },
          { label: "List", left: 307, top: geometry.markdownNavGeometry[3].top },
          { label: "Checklist", left: 1, top: geometry.markdownNavGeometry[4].top },
          { label: "Image", left: 77, top: geometry.markdownNavGeometry[5].top },
          { label: "Blockquote", left: 133, top: geometry.markdownNavGeometry[6].top },
          { label: "Code", left: 221, top: geometry.markdownNavGeometry[7].top },
          { label: "Table", left: 272, top: geometry.markdownNavGeometry[8].top },
          { label: "Short Link", left: 1, top: geometry.markdownNavGeometry[9].top },
        ]);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        viewport.width,
      );
    }
  }
});

async function mockIssueForm(page: Page) {
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
