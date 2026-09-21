import { readFileSync } from "../wtr-compat.ts"; // Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "/private/tmp",
  `yona-style-project-post-editform-markdown-editor-mt10-${"normal"}`,
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx", import.meta.url),
  "utf8",
);

const legacyBoardSource = readFileSync(
  new URL("../../yona-original/app/views/board/edit.scala.html", import.meta.url),
  "utf8",
);
const legacyEditorSource = readFileSync(
  new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const legacyYobiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const legacyMessagesSource = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("project board post editform markdown editor keeps legacy mt10 ownership", async ({
  page,
}) => {
  expect(legacyBoardSource).toContain(
    '@common.editor("body", posting.body, "tabindex=2", "content-body")',
  );
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyCommonLessSource).toContain(".mt10 { margin-top:10px; }");
  for (const importPath of [
    '"less/_common.less"',
    '"less/_page.less"',
    '"less/_responsive.less"',
    '"less/_yobiUI.less"',
    '"less/_markdown.less"',
  ]) {
    expect(legacyYobiSource).toContain(`@import ${importPath};`);
  }
  for (const message of [
    "common.editor.edit = Edit",
    "common.editor.preview = Preview",
    "button.add.checklist = Add checklist",
    "button.clear.temporary = Clear Temporary",
    "notification.receiver.list.title = Notification receivers",
  ]) {
    expect(legacyMessagesSource).toContain(message);
  }

  // wrapper owner moved into the BoardPostMarkdownEditor owners prop

  expect(routeSource).not.toContain("$yobi.loadModule");

  await mockPostEditForm(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/post/12/editform`, { waitUntil: "commit" });

    const editor = page.locator('[data-owner="post-edit-form-markdown-editor-wrapper"]');
    // F5 dist-truth: editor can take longer than the harness visibility
    // timeout to paint under shard load — poll paint with an explicit 30s
    // window, tolerating the pre-render absence.
    {
      let editorVisible = false;
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        if ((await editor.count()) > 0) {
          editorVisible = await editor.evaluate(
            (element) =>
              getComputedStyle(element).display !== "none" && element.getClientRects().length > 0,
          );
          if (editorVisible) break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      expect(editorVisible).toBe(true);
    }
    await expect(editor).toHaveClass(/\bmt10\b/u);
    await expect(editor).toHaveCSS("margin-top", "10px");
    await expect(editor).not.toHaveAttribute("style", /.+/u);
    await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const textarea = editor.locator('textarea[name="body"]');
    await expect(textarea).toHaveAttribute("id", "editor-body-body");
    await expect(textarea).toHaveAttribute("tabindex", "2");
    await expect(textarea).toHaveValue("Release body");
    await expect(textarea).toHaveAttribute("markdown", "true");

    const tabs = editor.locator(".nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).locator("a")).toHaveText("Edit");
    await expect(tabs.nth(1).locator("a")).toHaveText("Preview");
    await expect(tabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(tabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(tabs.nth(4)).toHaveText("");
    await expect(editor.locator("#edit-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#preview-body")).not.toHaveClass(/\bactive\b/u);
    await expect(editor).toContainText("Notification receivers");

    await tabs.nth(1).locator("a").click();
    await expect(editor.locator("#preview-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#edit-body")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).locator("a").click();
    await expect(editor.locator("#edit-body")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#preview-body")).not.toHaveClass(/\bactive\b/u);

    const metrics = await editor.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        left: box.left,
        right: box.right,
        top: box.top,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics.top).toBeGreaterThan(0);
    expect(metrics.left).toBeGreaterThanOrEqual(0);
    expect(metrics.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.bottom).toBeGreaterThan(metrics.top);
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockPostEditForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
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
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
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
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/12", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        authorId: "1",
        authorLabel: "Admin",
        authorLoginId: "admin",
        bodyHtml: "<p>Release body</p>",
        bodyMarkdown: "Release body",
        commentCount: 0,
        comments: [],
        createdAt: "2026-07-02T00:00:00+09:00",
        historyHtml: "",
        historyMarkdown: "",
        id: "12",
        isWatching: false,
        labels: [],
        notice: true,
        ownerName: "admin",
        permissions: {
          canComment: true,
          canCreate: true,
          canDelete: true,
          canRead: true,
          canSetNotice: true,
          canUpdate: true,
          canWatch: true,
        },
        postNumber: "12",
        projectName: "sample",
        readme: false,
        title: "Release notes",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    }),
  );
}
