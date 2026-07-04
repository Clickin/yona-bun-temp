import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_CREATE_FORM = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/pullRequests" enctype="multipart/form-data" class="nm"><div class="pull-request-wrap"><div class="pull-left"><label for="fromProjectId" class="field-title">From</label><select id="fromProjectId" name="fromProjectId" data-toggle="select2" class="mr5"><option></option><option value="7" selected="">admin/sample</option></select><select id="fromBranch" name="fromBranch" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="feature/ui" selected="">feature/ui</option><option value="main">main</option></select></div><div class="arrow"><i class="yobicon-right-2"></i></div><div class="pull-right"><label for="toProjectId" class="field-title">To</label><select id="toProjectId" name="toProjectId" data-toggle="select2" class="mr5"><option></option><option value="7" selected="">admin/sample</option></select><select id="toBranch" name="toBranch" data-toggle="select2" data-format="branch" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="main" selected="">main</option></select></div></div><span id="pullRequestState" data-value="OPEN"></span><div id="status" class="alert mt20 mb20">We are checking if the code is safe. Please wait for a while to complete this process.</div><div><input type="text" id="title" name="title" maxlength="255" class="text" placeholder="Title"><div style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></div><div class="upload-wrap content-footer" data-resource-type="PULL_REQUEST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actions"><button type="submit" class="ybtn ybtn-success">Send pull request</button><button type="button" class="ybtn">Cancel</button></div></div><ul class="nav nav-tabs mt20"><li class="active"><button type="button" data-toggle="tab"><span class="vmiddle-inline">Commits</span><span id="numOfCommits" class="num-badge vmiddle-inline">1</span></button></li></ul><div class="tab-content"><div id="__commits" class="code-browse-wrap tab-pane active"><div id="mergeResult" class="code-browser-wrap" data-commits="1" data-pullrequest-title="" data-pullrequest-body="" data-conflict="false"><div class="commit-wrap"><table class="code-table commits"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="date"><strong>Commit date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890">abcdef1</a></td><td class="messages"><span class="commitMsg short">Add UI</span></td><td class="date" title="Jul 2, 2026">Jul 2, 2026</td><td class="author dev@example.com"><div class="avatar-wrap"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></div></td></tr></tbody></table></div></div></div></div></form></div>
`;
const ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/newPullRequestForm.tsx", import.meta.url),
  "utf8",
);

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="PULL_REQUEST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="PULL_REQUEST"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`,
  );
}

function withLegacyEditor(html: string) {
  return html.replace(
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button" data-toggle="tab" data-mode="edit">Edit</button></li><li><button type="button" data-toggle="tab" data-mode="preview">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible"><div class="markdown-help"></div><div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body"></textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

test("project pull request create form matches legacy git/create.scala.html core DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectPullRequestCreateForm(page, postRequests);

  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/commit/$commitId"');
  expect(ROUTE_SOURCE).not.toContain("<a\n                    href={prefixBasePath");
  expect(ROUTE_SOURCE).not.toContain("window.history.back()");
  expect(ROUTE_SOURCE).toContain("router.history.back()");

  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  const createFormUrl = page.url();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator("#fromBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#toBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
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
  await expect(commitsTab).toHaveText("Commits1");
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help-wrap > .markdown-help-item")).toHaveCount(10);
  await expect(page.locator(".markdown-help .label")).toHaveText("Markdown help");
  await expect(
    page.locator('[data-toggle="markdown-help"][data-target="markdownTables"]'),
  ).toHaveText("Table");
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-type", "PULL_REQUEST");
  await expect(page.locator("#upload")).not.toHaveAttribute("data-resource-id", /.*/u);
  await expect(page.locator("#upload .attach-wrap")).toHaveCount(1);
  await expect(page.locator("#upload .help-droppable")).toHaveText(
    "Drag & Drop files to attach here or",
  );
  await expect(page.locator("#upload .fake-file-wrap")).toContainText("File upload");
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .plain")).toHaveText("Click upload button");
  await expect(page.locator("#upload .help-pastable")).toHaveText("Paste the clipboard image");
  await expect(page.locator("#upload ul.attached-files.unstyled > li")).toHaveCount(0);
  await expect(page.locator("#upload .right-txt.help")).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);
  await expect(page.locator('form.nm > div > script[type="text/x-jquery-tmpl"]')).toHaveCount(0);
  await expect(page.locator("#mergeResult .commit-id a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890`,
  );
  const cancelButton = await expectModernCancelControl(page);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await previewTab.click();
  await expect(page).toHaveURL(createFormUrl);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await editTab.click();
  await expect(page).toHaveURL(createFormUrl);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await commitsTab.click();
  await expect(page).toHaveURL(createFormUrl);
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
      withLegacyFileUploader(withLegacyEditor(EXPECTED_CREATE_FORM)).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
  expect(await createFormMetrics(page)).toEqual({
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
    contentWidth: 1260,
    fieldTitleDisplay: "block",
    fieldTitleFontWeight: "700",
    mergeTableWidth: 1260,
    mergeWrapWidth: 1260,
    titleWidth: 1222,
  });
  expect(await markdownHelpMetrics(page)).toEqual({
    firstItemHeightClosed: "0px",
    navBackground: "rgb(247, 247, 247)",
    navBorderBottomWidth: "0px",
    navBorderTopWidth: "1px",
    navLineHeight: "20px",
    syntaxPreMargin: "0px",
    tableHeaderLineHeight: "30px",
  });
  await page.locator('[data-toggle="markdown-help"][data-target="markdownTables"]').click();
  await expect(page.locator('[data-target="markdownTables"]')).toHaveClass(/active/);
  await expect(page.locator(".markdown-help-wrap > .markdownTables")).toHaveClass(/active/);
  await page.locator('[data-toggle="markdown-help"][data-target="markdownTables"]').click();
  await expect(page.locator('[data-target="markdownTables"]')).not.toHaveClass(/active/);
  await expect(page.locator(".markdown-help-wrap > .markdownTables")).not.toHaveClass(/active/);

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main&cancel-test=1`);
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main&cancel-test=1`,
  );
  await cancelButton.click();
  await expect(page).toHaveURL(createFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.fill("#title", "Improve UI");
  await page.fill("#editor-body-body", "Body text");
  await page.click('form.nm button[type="submit"]');

  await expect
    .poll(() => postRequests)
    .toEqual([
      {
        attachmentIds: [],
        bodyMarkdown: "Body text",
        fromBranch: "feature/ui",
        fromProjectId: 7,
        title: "Improve UI",
        toBranch: "main",
        toProjectId: 7,
      },
    ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequests`);
});

test("pull request create editor and uploader omit legacy local raw injection", () => {
  const editorStart = ROUTE_SOURCE.indexOf("function PullRequestMarkdownEditor");
  const editorEnd = ROUTE_SOURCE.indexOf("function PullRequestFileUploader", editorStart);
  const editorSource = ROUTE_SOURCE.slice(editorStart, editorEnd);
  const uploaderStart = ROUTE_SOURCE.indexOf("function PullRequestFileUploader");
  const uploaderEnd = ROUTE_SOURCE.indexOf("function MergeResult", uploaderStart);
  const uploaderSource = ROUTE_SOURCE.slice(uploaderStart, uploaderEnd);

  expect(editorStart).toBeGreaterThanOrEqual(0);
  expect(editorEnd).toBeGreaterThan(editorStart);
  expect(uploaderStart).toBeGreaterThanOrEqual(0);
  expect(uploaderEnd).toBeGreaterThan(uploaderStart);
  expect(ROUTE_SOURCE).toContain(
    'import { LegacyMarkdownHelp } from "../../-legacy-markdown-help"',
  );
  expect(ROUTE_SOURCE).not.toContain("help/markdown.scala.html");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpTemplate");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpHtml");
  expect(ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(editorSource).toContain("<LegacyMarkdownHelp />");
  expect(uploaderSource).not.toContain("tplAttachedFile");
  expect(uploaderSource).not.toContain("tplDropFilesHere");
  expect(uploaderSource).not.toContain("text/x-jquery-tmpl");
  expect(uploaderSource).not.toContain('className="attached-file"');
  expect(uploaderSource).not.toContain('class="attached-file"');
  expect(uploaderSource).not.toContain("upload-drop-here");
  expect(uploaderSource).not.toContain("${fileId}");
  expect(uploaderSource).not.toContain("${fileName}");
  expect(uploaderSource).not.toContain("${fileHref}");
  expect(uploaderSource).not.toContain("${mimeType}");
  expect(uploaderSource).not.toContain("${fileSizeReadable}");
});

async function createFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((content) => {
    const branchWrap = content.querySelector<HTMLElement>(".pull-request-wrap");
    const arrow = content.querySelector<HTMLElement>(".pull-request-wrap .arrow");
    const fieldTitle = content.querySelector<HTMLElement>(".pull-request-wrap .field-title");
    const title = content.querySelector<HTMLElement>("input#title.text");
    const actions = content.querySelector<HTMLElement>(".actions");
    const mergeWrap = content.querySelector<HTMLElement>("#mergeResult.code-browser-wrap");
    const mergeTable = content.querySelector<HTMLElement>("#mergeResult .code-table.commits");
    const missing = Object.entries({
      actions,
      arrow,
      branchWrap,
      fieldTitle,
      mergeTable,
      mergeWrap,
      title,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected pull request create metric targets are missing: ${missing.join(", ")}`,
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
      contentWidth: Math.round(content.getBoundingClientRect().width),
      fieldTitleDisplay: fieldTitleStyle.display,
      fieldTitleFontWeight: fieldTitleStyle.fontWeight,
      mergeTableWidth: Math.round(mergeTable.getBoundingClientRect().width),
      mergeWrapWidth: Math.round(mergeWrap.getBoundingClientRect().width),
      titleWidth: Math.round(title.getBoundingClientRect().width),
    };
  });
}

async function markdownHelpMetrics(page: Page) {
  return page.locator(".markdown-help").evaluate((root) => {
    const nav = root.querySelector<HTMLElement>(".markdown-help-nav");
    const firstNavItem = root.querySelector<HTMLElement>(".markdown-help-nav li");
    const firstItem = root.querySelector<HTMLElement>(".markdown-help-wrap > .markdown-help-item");
    const thead = root.querySelector<HTMLElement>(".markdown-help-item .thead div");
    const pre = root.querySelector<HTMLElement>(".markdwon-syntax pre");
    if (!nav || !firstNavItem || !firstItem || !thead || !pre) {
      throw new Error("Expected markdown help metric targets are missing.");
    }
    const navStyle = getComputedStyle(nav);
    return {
      firstItemHeightClosed: getComputedStyle(firstItem).height,
      navBackground: navStyle.backgroundColor,
      navBorderBottomWidth: navStyle.borderBottomWidth,
      navBorderTopWidth: navStyle.borderTopWidth,
      navLineHeight: getComputedStyle(firstNavItem).lineHeight,
      syntaxPreMargin: getComputedStyle(pre).margin,
      tableHeaderLineHeight: getComputedStyle(thead).lineHeight,
    };
  });
}

async function mockProjectPullRequestCreateForm(page: Page, postRequests: unknown[]) {
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
    "**/api/v1/owners/admin/projects/sample/pull-requests/form-options?*",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          fromBranches: [
            { name: "feature/ui", selected: true },
            { name: "main", selected: false },
          ],
          fromProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
          mode: "create",
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
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*",
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          commits: [
            {
              authorDateLabel: "Jul 2, 2026",
              authorEmail: "dev@example.com",
              commitId: "abcdef1234567890",
              commitMessage: "Add UI",
              commitShortId: "abcdef1",
              state: "CURRENT",
            },
          ],
          conflict: false,
          noHead: false,
        }),
      });
    },
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests", async (route) => {
    if (route.request().method() === "POST") {
      postRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ pullRequestNumber: 9 }),
      });
      return;
    }
    await route.fallback();
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
      if (node.classList.contains("markdown-help")) {
        return `${open}</${node.tagName.toLowerCase()}>`;
      }
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
      if (node.classList.contains("markdown-help")) {
        return `${open}</${node.tagName.toLowerCase()}>`;
      }
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
