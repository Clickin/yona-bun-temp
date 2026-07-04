import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_EDIT_FORM = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/pullRequest/9" enctype="multipart/form-data" class="nm"><div class="pull-request-wrap"><div class="pull-left"><label for="fromProjectId" class="field-title">From</label><select id="fromProjectId" name="fromProjectId" data-toggle="select2" class="mr5" disabled=""><option value="7" selected="">admin/sample</option></select><select id="fromBranch" name="fromBranch" data-toggle="select2" data-format="branch" disabled="" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="feature/ui" selected="">feature/ui</option><option value="main">main</option></select><input type="hidden" name="fromProjectId" value="7"><input type="hidden" name="fromBranch" value="feature/ui"></div><div class="arrow"><i class="yobicon-right-2"></i></div><div class="pull-right"><label for="toProjectId" class="field-title">To</label><select id="toProjectId" name="toProjectId" data-toggle="select2" class="mr5" disabled=""><option value="7" selected="">admin/sample</option></select><select id="toBranch" name="toBranch" data-toggle="select2" data-format="branch" disabled="" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="main" selected="">main</option></select><input type="hidden" name="toProjectId" value="7"><input type="hidden" name="toBranch" value="main"></div></div><span id="pullRequestState" data-value="OPEN"></span><div id="status" class="alert mt20 mb20">We are checking if the code is safe. Please wait for a while to complete this process.</div><div><input type="text" id="title" name="title" maxlength="255" class="text" value="Initial title" placeholder="Title" data-is-user-has-typed="true"><div style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" data-is-user-has-typed="true">Initial body</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></div><div class="upload-wrap content-footer" data-resource-type="PULL_REQUEST" data-resource-id="90"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actions"><button type="submit" class="ybtn ybtn-success">Save</button><button type="button" class="ybtn">Cancel</button></div></div><ul class="nav nav-tabs mt20"><li class="active"><button type="button" data-toggle="tab"><span class="vmiddle-inline">Commits</span><span id="numOfCommits" class="num-badge vmiddle-inline"></span></button></li></ul><div class="tab-content"><div id="__commits" class="code-browse-wrap tab-pane active"></div></div></form></div>
`;
const LEGACY_MARKDOWN_HELP = readFileSync(
  new URL("../../yona-original/app/views/help/markdown.scala.html", import.meta.url),
  "utf8",
)
  .replace(/@Messages\("title\.markdown\.help"\)/g, "Markdown help")
  .replace(/@\{"@"\}/g, "@")
  .replace(/<script[\s\S]*$/u, "")
  .replace(/^[\s\S]*?<div class="markdown-help">/u, '<div class="markdown-help">')
  .replace(/<\/div>\s*$/u, "</div>");
const ROUTE_SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
    import.meta.url,
  ),
  "utf8",
);

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="PULL_REQUEST" data-resource-id="90"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="PULL_REQUEST" data-resource-id="90"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`,
  );
}

function withLegacyEditor(html: string) {
  return html.replace(
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" data-is-user-has-typed="true">Initial body</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button" data-toggle="tab" data-mode="edit">Edit</button></li><li><button type="button" data-toggle="tab" data-mode="preview">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible">${LEGACY_MARKDOWN_HELP}<div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body" data-is-user-has-typed="true">Initial body</textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

test("project pull request edit form matches legacy git/edit.scala.html core DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectPullRequestEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/pullRequest/9/editform`);
  const editFormUrl = page.url();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator("#fromBranch")).toBeDisabled();
  await expect(page.locator("#toBranch")).toBeDisabled();
  await expect(page.locator("#fromBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#toBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#title")).toHaveAttribute("data-is-user-has-typed", "true");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("data-is-user-has-typed", "true");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  expect(ROUTE_SOURCE).not.toContain("window.history.back()");
  expect(ROUTE_SOURCE).toContain("router.history.back()");
  await expect(page.locator('form.nm > ul.nav-tabs a[href="#__commits"]')).toHaveCount(0);
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#edit-body"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#preview-body"]'),
  ).toHaveCount(0);
  const commitsTab = page.locator('form.nm > ul.nav-tabs button[type="button"][data-toggle="tab"]');
  const editTab = page.locator(
    '[data-toggle="markdown-editor"] .nav-tabs button[type="button"][data-toggle="tab"][data-mode="edit"]',
  );
  const previewTab = page.locator(
    '[data-toggle="markdown-editor"] .nav-tabs button[type="button"][data-toggle="tab"][data-mode="preview"]',
  );
  await expect(commitsTab).toHaveText("Commits");
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help-wrap > .markdown-help-item")).toHaveCount(10);
  expectPullRequestEditorUsesSharedMarkdownHelp();
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-id", "90");
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-type", "PULL_REQUEST");
  await expect(page.locator("#upload .attach-wrap")).toHaveCount(1);
  await expect(page.locator("#upload .help-droppable")).toHaveText(
    "Drag & Drop files to attach here or",
  );
  await expect(page.locator("#upload .fake-file-wrap")).toContainText("File upload");
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .plain")).toHaveText("Click upload button");
  await expect(page.locator("#upload .help-pastable")).toHaveText("Paste the clipboard image");
  await expect(page.locator("#upload ul.attached-files.unstyled")).toHaveCount(1);
  await expect(page.locator("#upload ul.attached-files.unstyled li")).toHaveCount(0);
  await expect(page.locator("#upload .right-txt.help")).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);
  await expect(page.locator('form.nm script[type="text/x-jquery-tmpl"]')).toHaveCount(0);
  const bodyHtml = await page.locator("body").evaluate((body) => body.innerHTML);
  expect(bodyHtml).not.toContain("${fileId}");
  expect(bodyHtml).not.toContain("${fileName}");
  expect(bodyHtml).not.toContain("${fileHref}");
  expect(bodyHtml).not.toContain("upload-drop-here");
  expect(bodyHtml).not.toContain("Click to post");
  expectPullRequestUploaderHasNoLegacyLocalTemplates();
  const cancelButton = await expectModernCancelControl(page);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await previewTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await editTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await commitsTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(page.locator("form.nm > ul.nav-tabs > li")).toHaveClass(/active/);
  await expect(page.locator("#__commits")).toHaveClass(/active/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(withLegacyEditor(EXPECTED_EDIT_FORM)).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/pullRequest/9/editform?cancel-test=1`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/9/editform?cancel-test=1`);
  await cancelButton.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await editFormMetrics(page)).toEqual({
    actionDisplay: "block",
    actionMarginTop: "20px",
    actionTextAlign: "center",
    arrowColor: "rgb(126, 126, 126)",
    arrowFontSize: "32px",
    arrowLeft: 614,
    arrowMarginLeft: "-16px",
    arrowPosition: "absolute",
    arrowTop: "20px",
    branchWrapDisplay: "block",
    branchWrapMarginBottom: "20px",
    branchWrapMinHeight: "55px",
    branchWrapPosition: "relative",
    commitsPaneWidth: 1260,
    contentWidth: 1260,
    fieldTitleDisplay: "block",
    fieldTitleFontWeight: "700",
    fromBranchDisabled: true,
    fromProjectDisabled: true,
    titleWidth: 1222,
    toBranchDisabled: true,
    toProjectDisabled: true,
  });

  await page.fill("#title", "Updated title");
  await page.fill("#editor-body-body", "Updated body");
  await page.click('form.nm button[type="submit"]');

  await expect
    .poll(() => patchRequests)
    .toEqual([{ attachmentIds: [], bodyMarkdown: "Updated body", title: "Updated title" }]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequests`);
});

async function editFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((content) => {
    const branchWrap = content.querySelector<HTMLElement>(".pull-request-wrap");
    const arrow = content.querySelector<HTMLElement>(".pull-request-wrap .arrow");
    const fieldTitle = content.querySelector<HTMLElement>(".pull-request-wrap .field-title");
    const title = content.querySelector<HTMLElement>("input#title.text");
    const actions = content.querySelector<HTMLElement>(".actions");
    const commitsPane = content.querySelector<HTMLElement>("#__commits.code-browse-wrap");
    const fromProject = content.querySelector<HTMLSelectElement>("#fromProjectId");
    const fromBranch = content.querySelector<HTMLSelectElement>("#fromBranch");
    const toProject = content.querySelector<HTMLSelectElement>("#toProjectId");
    const toBranch = content.querySelector<HTMLSelectElement>("#toBranch");
    const missing = Object.entries({
      actions,
      arrow,
      branchWrap,
      commitsPane,
      fieldTitle,
      fromBranch,
      fromProject,
      title,
      toBranch,
      toProject,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected pull request edit metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const actionStyle = window.getComputedStyle(actions);
    const arrowStyle = window.getComputedStyle(arrow);
    const branchWrapStyle = window.getComputedStyle(branchWrap);
    const fieldTitleStyle = window.getComputedStyle(fieldTitle);
    return {
      actionDisplay: actionStyle.display,
      actionMarginTop: actionStyle.marginTop,
      actionTextAlign: actionStyle.textAlign,
      arrowColor: arrowStyle.color,
      arrowFontSize: arrowStyle.fontSize,
      arrowLeft: Math.round(
        arrow.getBoundingClientRect().left - branchWrap.getBoundingClientRect().left,
      ),
      arrowMarginLeft: arrowStyle.marginLeft,
      arrowPosition: arrowStyle.position,
      arrowTop: arrowStyle.top,
      branchWrapDisplay: branchWrapStyle.display,
      branchWrapMarginBottom: branchWrapStyle.marginBottom,
      branchWrapMinHeight: branchWrapStyle.minHeight,
      branchWrapPosition: branchWrapStyle.position,
      commitsPaneWidth: Math.round(commitsPane.getBoundingClientRect().width),
      contentWidth: Math.round(content.getBoundingClientRect().width),
      fieldTitleDisplay: fieldTitleStyle.display,
      fieldTitleFontWeight: fieldTitleStyle.fontWeight,
      fromBranchDisabled: fromBranch.disabled,
      fromProjectDisabled: fromProject.disabled,
      titleWidth: Math.round(title.getBoundingClientRect().width),
      toBranchDisabled: toBranch.disabled,
      toProjectDisabled: toProject.disabled,
    };
  });
}

async function expectModernCancelControl(page: Page) {
  await expect(page.locator('.actions a[href^="javascript:"]')).toHaveCount(0);
  const cancel = page
    .locator('.actions > button[type="button"].ybtn')
    .filter({ hasText: /^Cancel$/u });
  await expect(cancel).toHaveCount(1);
  await expect(cancel).toHaveText("Cancel");
  return cancel;
}

function expectPullRequestUploaderHasNoLegacyLocalTemplates() {
  const uploaderSource = ROUTE_SOURCE.match(
    /function PullRequestFileUploader[\s\S]*?\n\}\n\nfunction stringFormValue/u,
  )?.[0];
  if (!uploaderSource) {
    throw new Error("PullRequestFileUploader source was not found");
  }
  expect(uploaderSource).not.toContain("tplAttachedFile");
  expect(uploaderSource).not.toContain("tplDropFilesHere");
  expect(uploaderSource).not.toContain("text/x-jquery-tmpl");
  expect(uploaderSource).not.toContain("dangerouslySetInnerHTML");
  expect(uploaderSource).not.toContain("${fileId}");
  expect(uploaderSource).not.toContain("${fileName}");
  expect(uploaderSource).not.toContain("${fileHref}");
  expect(uploaderSource).not.toContain("upload-drop-here");
  expect(uploaderSource).not.toContain("Click to post");
}

function expectPullRequestEditorUsesSharedMarkdownHelp() {
  const editorSource = ROUTE_SOURCE.match(
    /function PullRequestMarkdownEditor[\s\S]*?\n\}\n\nfunction PullRequestFileUploader/u,
  )?.[0];
  if (!editorSource) {
    throw new Error("PullRequestMarkdownEditor source was not found");
  }
  expect(ROUTE_SOURCE).toContain(
    'import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";',
  );
  expect(editorSource).toContain("<LegacyMarkdownHelp />");
  expect(ROUTE_SOURCE).not.toContain("help/markdown.scala.html");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpTemplate");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpHtml");
  expect(ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(ROUTE_SOURCE).not.toContain('replace(/@Messages("title.markdown.help")');
}

async function mockProjectPullRequestEditForm(page: Page, patchRequests: unknown[]) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
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
    });
  });
  await page.route("**/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify({ user: { loginId: "admin" } }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
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
    });
  });
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/form-options",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          fromBranches: [
            { name: "feature/ui", selected: true },
            { name: "main", selected: false },
          ],
          fromProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
          mode: "edit",
          pullRequest: pullRequestDetail(),
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 7,
            toBranch: "main",
            toProjectId: 7,
          },
          toBranches: [{ name: "main", selected: true }],
          toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
        }),
      });
    },
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/9", async (route) => {
    if (route.request().method() === "PATCH") {
      patchRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          pullRequestDetail({ title: "Updated title", bodyMarkdown: "Updated body" }),
        ),
      });
      return;
    }
    await route.fallback();
  });
}

function pullRequestDetail(overrides: Partial<{ bodyMarkdown: string; title: string }> = {}) {
  return {
    bodyHtml: `<p>${overrides.bodyMarkdown ?? "Initial body"}</p>`,
    bodyMarkdown: overrides.bodyMarkdown ?? "Initial body",
    commits: [],
    conflict: false,
    contributor: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "dev",
      userId: 2,
      userLabel: "Developer",
    },
    createdLabel: "Jul 2, 2026",
    events: [],
    fromBranch: "feature/ui",
    fromOwnerName: "admin",
    fromProjectName: "sample",
    id: 90,
    isWatching: false,
    lackingReviewerCount: 0,
    mergedCommitIdFrom: "",
    mergedCommitIdTo: "",
    ownerName: "admin",
    permissions: {
      canComment: true,
      canDeleteSourceBranch: false,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canRestoreSourceBranch: false,
      canUpdate: true,
      canUpdateState: true,
    },
    projectName: "sample",
    pullRequestNumber: 9,
    receiver: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "admin",
      userId: 1,
      userLabel: "Site Admin",
    },
    requiredReviewerCount: 0,
    reviewed: false,
    reviewers: [],
    sourceBranchExists: true,
    state: "OPEN",
    threads: [],
    title: overrides.title ?? "Initial title",
    toBranch: "main",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      return attr.name === "style" ? value.replace(/\s+/gu, "") : value;
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((markup) => {
    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    const root = template.content.firstElementChild;
    return root ? visit(root) : "";

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      return attr.name === "style" ? value.replace(/\s+/gu, "") : value;
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  }, html);
}
