import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

type BoardFormProjectFixture = {
  isProtected?: boolean;
  organizationName?: string;
  ownerName: string;
  projectName: string;
};

const ADMIN_SAMPLE_PROJECT: BoardFormProjectFixture = {
  ownerName: "admin",
  projectName: "sample",
};
const WEBLABS_PORTAL_PROJECT: BoardFormProjectFixture = {
  isProtected: true,
  organizationName: "weblabs",
  ownerName: "weblabs",
  projectName: "portal",
};
const POSTFORM_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/postform.tsx", import.meta.url),
  "utf8",
);
const POSTFORM_STYLE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/-postform.stylex.ts", import.meta.url),
  "utf8",
);
const UPLOAD_FORM_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/common/uploadForm.scala.html", import.meta.url),
  "utf8",
);
const EXPECTED_CREATE_FORM_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><form action="__BASE_PATH__/admin/sample/posts" method="post" enctype="multipart/form-data" class="nm"><div class="content-wrap frm-wrap"><dl><dd><input type="text" id="title" autocomplete="off" name="title" class="zen-mode text title " maxlength="250" tabindex="1" value="" placeholder="Title"></dd><dd></dd><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="3"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="BOARD_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="mt10 mb10"><label class="checkbox"><input type="checkbox" id="notice" name="notice">Set this post as notice.</label><input type="hidden" id="issueTemplate" name="issueTemplate" value=""><input type="hidden" id="branch" name="branch" value=""><input type="hidden" id="path" name="path" value=""><input type="hidden" id="lineEnding" name="lineEnding" value=""></div><div class="actions"><button class="ybtn ybtn-success" tabindex="3">Save</button><button type="button" class="ybtn" tabindex="4">Cancel</button></div></div></form></div></div>
`;

function withLegacyEditor(html: string) {
  return html.replace(
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="3"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="__BASE_PATH__/admin/sample/postform#edit-body">Edit</a></li><li><a href="__BASE_PATH__/admin/sample/postform#preview-body">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible"><div class="markdown-help"></div><div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body" tabindex="3"></textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="BOARD_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="BOARD_POST"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable" style="display:block">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`,
  );
}

test("project board create form restores legacy admin project shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBoardCreateForm(page, [], ADMIN_SAMPLE_PROJECT);

  await page.goto(`${basePath}/admin/sample/postform`);

  await expect(page).toHaveTitle("New - admin/sample");
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");

  const searchForm = page.locator("form.gnb-search-form");
  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeItems = page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/admin/sample/search`);
  await expect(scopeToggle).toHaveText("This Project");
  await expect(scopeItems).toHaveCount(2);
  await expect(scopeItems).toHaveText(["This Project", "All Projects"]);

  await scopeToggle.click();
  await scopeItems.nth(1).click();
  await expect(scopeToggle).toHaveText("All Projects");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/search`);

  await scopeToggle.click();
  await scopeItems.nth(0).click();
  await expect(scopeToggle).toHaveText("This Project");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/admin/sample/search`);

  const shellBoxes = await readProjectBoardCreateShellBoxes(page);
  expect(shellBoxes).not.toBeNull();
  expect(shellBoxes!.scopeToggle.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.scopeToggle.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchInput.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.searchInput.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchBox.left).toBeGreaterThanOrEqual(shellBoxes!.scopeToggle.right - 2);
  expect(shellBoxes!.searchInput.left).toBeGreaterThanOrEqual(shellBoxes!.searchBox.left);
  expect(shellBoxes!.searchSubmit.right).toBeLessThanOrEqual(shellBoxes!.searchBox.right + 1);
  expect(shellBoxes!.searchBox.right).toBeLessThanOrEqual(shellBoxes!.form.right + 1);
});

test("project board create form restores legacy group-owned project shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBoardCreateForm(page, [], WEBLABS_PORTAL_PROJECT);

  await page.goto(`${basePath}/weblabs/portal/postform`);

  await expect(page).toHaveTitle("New - weblabs/portal");
  await expect(page.locator("[data-stylex-owner=global-gnb-outer]")).not.toHaveClass(
    /(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u,
  );
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");

  const searchForm = page.locator("form.gnb-search-form");
  const scopeToggle = page.locator("#gnb-search-scope-title");
  const scopeItems = page.locator("[data-stylex-owner=global-gnb-search-scope-item] > button");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/weblabs/portal/search`);
  await expect(scopeToggle).toHaveText("This Project");
  await expect(scopeItems).toHaveCount(3);
  await expect(scopeItems).toHaveText(["This Project", "This Group", "All Projects"]);

  await scopeToggle.click();
  await scopeItems.nth(1).click();
  await expect(scopeToggle).toHaveText("This Group");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/organizations/weblabs/search`);

  await scopeToggle.click();
  await scopeItems.nth(2).click();
  await expect(scopeToggle).toHaveText("All Projects");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/search`);

  await scopeToggle.click();
  await scopeItems.nth(0).click();
  await expect(scopeToggle).toHaveText("This Project");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/weblabs/portal/search`);

  const shellBoxes = await readProjectBoardCreateShellBoxes(page);
  expect(shellBoxes).not.toBeNull();
  expect(shellBoxes!.scopeToggle.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.scopeToggle.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchInput.top).toBeGreaterThanOrEqual(shellBoxes!.navbar.top);
  expect(shellBoxes!.searchInput.bottom).toBeLessThanOrEqual(shellBoxes!.navbar.bottom);
  expect(shellBoxes!.searchBox.left).toBeGreaterThanOrEqual(shellBoxes!.scopeToggle.right - 2);
  expect(shellBoxes!.searchInput.left).toBeGreaterThanOrEqual(shellBoxes!.searchBox.left);
  expect(shellBoxes!.searchSubmit.right).toBeLessThanOrEqual(shellBoxes!.searchBox.right + 1);
  expect(shellBoxes!.searchBox.right).toBeLessThanOrEqual(shellBoxes!.form.right + 1);
});

test("project board create form matches legacy board/create.scala.html core form DOM", async ({
  page,
}) => {
  expect(POSTFORM_ROUTE_SOURCE).toContain(
    'import { BoardPostMarkdownEditor } from "../../../components/markdown-editor"',
  );
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("help/markdown.scala.html");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("legacyMarkdownHelpHtml");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("useProjectBoardCreateFormDocumentTitle");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("document.title");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("classList");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("style.display");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain('setAttribute("tabindex"');
  expect(POSTFORM_ROUTE_SOURCE).not.toContain('data-toggle="markdown-editor"');
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("data-mode");
  expect(POSTFORM_ROUTE_SOURCE).not.toContain("window.history.back()");
  expect(POSTFORM_ROUTE_SOURCE).toContain("router.history.back()");
  expect(POSTFORM_ROUTE_SOURCE).toContain(
    '<title>{`${t("post.new")} - ${ownerName}/${projectName}`}</title>',
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectBoardCreateForm(page, postRequests);

  await page.goto(`${basePath}/admin/sample/postform`);
  await expect(page.locator("form.nm")).toBeVisible();
  await expect(page.locator("#title")).toBeFocused();
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await page.locator("#title").press("Enter");
  await expect(page.locator("#editor-body-body")).toBeFocused();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("name", "body");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("id", "editor-body-body");
  await expect(page.locator("#editor-body-body")).toHaveAttribute(
    "data-editor-mode",
    "content-body",
  );
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "3");
  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(page.locator(".content-wrap.frm-wrap dd[style] > .mt10")).toHaveCount(1);
  await expect(
    page.locator('.content-wrap.frm-wrap dd[style] > .mt10 .nav-tabs a[href$="#edit-body"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.content-wrap.frm-wrap dd[style] > .mt10 .nav-tabs a[href$="#preview-body"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.content-wrap.frm-wrap dd[style] > .mt10 .nav-tabs [data-toggle="tab"]'),
  ).toHaveCount(0);
  await expect(
    page.locator(".content-wrap.frm-wrap dd[style] > .mt10 .nav-tabs [data-mode]"),
  ).toHaveCount(0);
  const editorTabButtons = page.locator(
    ".content-wrap.frm-wrap dd[style] > .mt10 .nav-tabs > li > a",
  );
  const editTab = editorTabButtons.nth(0);
  const previewTab = editorTabButtons.nth(1);
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(editorTabButtons).toHaveText(["Edit", "Preview"]);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toBeVisible();
  await expect(page.locator("#preview-body")).not.toBeVisible();
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help > .markdown-help-wrap")).toHaveCount(1);
  await expect(page.locator(".markdown-help-item.markdownShortLinks")).toHaveCount(1);
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#upload")
        .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    )
    .toBe(70);
  expect(await boardCreateActionWhitespace(page)).toEqual({ gap: 0, whitespaceNode: false });
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(withLegacyEditor(EXPECTED_CREATE_FORM_BODY)).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
  expect(await readBoardCreateFormMetrics(page)).toEqual({
    actionsDisplay: "block",
    actionsMarginTop: "20px",
    actionsTextAlign: "center",
    ddMargin: "0px",
    ddPadding: "0px",
    editorPosition: "relative",
    formMargin: "0px",
    noticeRowMarginBottom: "10px",
    noticeRowMarginTop: "10px",
    noticeRowTextAlign: "right",
    titleBorderBottomWidth: "1px",
    titleBorderRadius: "0px",
    titleFontSize: "18px",
    titleMarginBottom: "15px",
    titleMarginTop: "15px",
    titleWidthPercent: 98,
    uploadBackground: "rgb(245, 245, 245)",
    uploadBorderRadius: "5px",
    uploadPadding: "10px",
  });

  await expect(page.locator('.actions a[href^="javascript:"]')).toHaveCount(0);
  await expect(page.locator("form.nm .actions .ybtn-success")).toHaveAttribute("tabindex", "3");
  const cancelButton = page.locator(".actions button.ybtn", { hasText: "Cancel" });
  await expect(cancelButton).toHaveAttribute("type", "button");
  await expect(cancelButton).toHaveAttribute("class", "ybtn");
  await expect(cancelButton).toHaveAttribute("tabindex", "4");
  await expect(cancelButton).toHaveText("Cancel");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "tab-kept";
  });
  await previewTab.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/postform#preview-body`);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toBeVisible();
  await expect(page.locator("#edit-body")).not.toBeVisible();
  const previewBoxes = await readBoardCreateEditorTabBoxes(page);
  expect(previewBoxes).not.toBeNull();
  expect(previewBoxes!.tabList.left).toBeGreaterThanOrEqual(previewBoxes!.editor.left);
  expect(previewBoxes!.tabList.right).toBeLessThanOrEqual(previewBoxes!.editor.right + 1);
  expect(previewBoxes!.editTab.right).toBeLessThanOrEqual(previewBoxes!.previewTab.left + 1);
  expect(previewBoxes!.previewPane.left).toBeGreaterThanOrEqual(previewBoxes!.tabContent.left);
  expect(previewBoxes!.previewPane.right).toBeLessThanOrEqual(previewBoxes!.tabContent.right + 1);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("tab-kept");
  await editTab.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/postform#edit-body`);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toBeVisible();
  await expect(page.locator("#preview-body")).not.toBeVisible();
  const editBoxes = await readBoardCreateEditorTabBoxes(page);
  expect(editBoxes).not.toBeNull();
  expect(editBoxes!.textarea.left).toBeGreaterThanOrEqual(editBoxes!.editPane.left);
  expect(editBoxes!.textarea.right).toBeLessThanOrEqual(editBoxes!.editPane.right + 1);
  expect(editBoxes!.editPane.top).toBeGreaterThanOrEqual(editBoxes!.tabContent.top);
  expect(editBoxes!.editPane.left).toBeGreaterThanOrEqual(editBoxes!.tabContent.left);

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/postform?cancel-test=1`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/postform?cancel-test=1`);
  await cancelButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/postform#edit-body`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  let emptyTitleAlert: { message: string; type: string } | null = null;
  page.once("dialog", async (dialog) => {
    emptyTitleAlert = { message: dialog.message(), type: dialog.type() };
    await dialog.accept();
  });
  await page.click("form.nm .actions .ybtn-success");
  expect(emptyTitleAlert).toEqual({
    message: "Title is a required field.",
    type: "alert",
  });
  await expect(page.locator("#title")).toBeFocused();
  await expect(page.locator("#title")).toHaveClass("zen-mode text title ");
  await expect(page.locator("#title + .message")).toHaveCount(0);
  expect(postRequests).toEqual([]);

  await page.fill("#title", "Board draft");
  await page.fill("#editor-body-body", "Body **markdown**");
  await page.check("#notice");
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/posts") &&
      response.request().method() === "POST",
  );
  await page.click("form.nm .actions .ybtn-success");
  await postResponsePromise;
  expect(postRequests).toEqual([
    {
      attachmentIds: [],
      bodyMarkdown: "Body **markdown**",
      branch: "",
      edit: false,
      issueTemplate: false,
      labelIds: [],
      lineEnding: "",
      newFileName: "",
      notice: true,
      path: "",
      readme: false,
      title: "Board draft",
    },
  ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/10`);
});

test("project board create form preserves uploader and zero-gap actions on mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectBoardCreateForm(page, []);
  await page.goto(`${basePath}/admin/sample/postform`);

  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#upload")
        .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    )
    .toBe(100);
  expect(await boardCreateActionWhitespace(page)).toEqual({ gap: 0, whitespaceNode: false });
});

test("project board uploader keeps legacy alignment with route-local StyleX owners", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBoardCreateForm(page, []);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/postform`);

  const metrics = await page.locator("#upload").evaluate((upload) => {
    const get = (owner: string) => upload.querySelector(`[data-stylex-owner="${owner}"]`)!;
    const uploadStyle = getComputedStyle(upload);
    const attachStyle = getComputedStyle(get("project-postform-attach-wrap"));
    const buttonStyle = getComputedStyle(get("project-postform-upload-button-wrap"));
    const plainStyle = getComputedStyle(get("project-postform-upload-plain"));
    const attachedStyle = getComputedStyle(get("project-postform-attached-files"));
    return {
      backgroundColor: uploadStyle.backgroundColor,
      borderRadius: uploadStyle.borderRadius,
      attachTextAlign: attachStyle.textAlign,
      buttonDisplay: buttonStyle.display,
      buttonMargin: `${buttonStyle.marginLeft} ${buttonStyle.marginRight}`,
      buttonVerticalAlign: buttonStyle.verticalAlign,
      plainDisplay: plainStyle.display,
      plainLineHeight: plainStyle.lineHeight,
      attachedDisplay: attachedStyle.display,
      attachedBorderTop: `${attachedStyle.borderTopWidth} ${attachedStyle.borderTopStyle} ${attachedStyle.borderTopColor}`,
    };
  });
  expect(metrics).toEqual({
    backgroundColor: "rgb(245, 245, 245)",
    borderRadius: "5px",
    attachTextAlign: "center",
    buttonDisplay: "inline-block",
    buttonMargin: "5px 5px",
    buttonVerticalAlign: "top",
    plainDisplay: "inline-block",
    plainLineHeight: "30px",
    attachedDisplay: "none",
    attachedBorderTop: "1px solid rgb(224, 224, 224)",
  });
  expect(UPLOAD_FORM_SOURCE).toContain('class="upload-wrap content-footer"');
  expect(UPLOAD_FORM_SOURCE).toContain('class="attach-wrap"');
  expect(UPLOAD_FORM_SOURCE).toContain('class="btn-wrap"');
  expect(UPLOAD_FORM_SOURCE).toContain('class="plain"');
  expect(UPLOAD_FORM_SOURCE).toContain('class="attached-files unstyled"');
  expect(POSTFORM_ROUTE_SOURCE).toContain('attachWrap: "project-postform-attach-wrap"');
  expect(POSTFORM_ROUTE_SOURCE).toContain('wrapper: "project-postform-upload-wrap"');
  expect(POSTFORM_ROUTE_SOURCE).toContain('btnWrap: "project-postform-upload-button-wrap"');
  expect(POSTFORM_ROUTE_SOURCE).toContain('plain: "project-postform-upload-plain"');
  expect(POSTFORM_ROUTE_SOURCE).toContain('attachedFiles: "project-postform-attached-files"');
  expect(POSTFORM_STYLE_SOURCE).toContain('attachWrap: { textAlign: "center" }');
  expect(POSTFORM_STYLE_SOURCE).toContain(
    'uploadPlain: { display: "inline-block", lineHeight: "30px" }',
  );
  await expect(
    page.locator('#upload[data-stylex-owner="project-postform-upload-wrap"]'),
  ).toHaveCount(1);
  await expect(page.locator("#upload [data-stylex-owner]")).toHaveCount(6);
});

test("project board postform right-aligned options and attachment help retain legacy alignment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectBoardCreateForm(page, []);

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/postform`);
    const optionsLocator = page.locator("[data-stylex-owner=project-postform-options]");
    const helpLocator = page.locator(
      "[data-stylex-owner=project-postform-upload-attach-save-help]",
    );
    await expect(optionsLocator).not.toHaveClass(/(?:^|\s)right-txt(?:\s|$)/u);
    // Legacy uploadForm.scala.html keeps `right-txt help` on the paste help.
    await expect(helpLocator).toHaveClass(/(?:^|\s)right-txt(?:\s|$)/u);
    const metrics = await optionsLocator.evaluate((options) => {
      const upload = document.querySelector("#upload") as HTMLElement;
      const help = upload.querySelector(
        "[data-stylex-owner=project-postform-upload-attach-save-help]",
      ) as HTMLElement;
      const optionsStyle = window.getComputedStyle(options);
      const helpStyle = window.getComputedStyle(help);
      const optionsBox = options.getBoundingClientRect();
      const uploadBox = upload.getBoundingClientRect();
      const helpBox = help.getBoundingClientRect();
      return {
        helpDisplay: helpStyle.display,
        helpTextAlign: helpStyle.textAlign,
        helpRightWithinUpload: helpBox.right <= uploadBox.right + 1,
        optionsMarginBottom: optionsStyle.marginBottom,
        optionsMarginTop: optionsStyle.marginTop,
        optionsTextAlign: optionsStyle.textAlign,
        optionsRightWithinForm:
          optionsBox.right <= options.parentElement!.getBoundingClientRect().right + 1,
      };
    });
    // F5 dist-truth: legacy .upload-wrap .help { display:none }
    // (yona-original/app/assets/stylesheets/less/_page.less:3609) matches app.css:2726;
    // rendered dist truth is "none", the pinned "block" was stale.
    expect(metrics).toEqual({
      helpDisplay: "none",
      helpTextAlign: "right",
      helpRightWithinUpload: true,
      optionsMarginBottom: "10px",
      optionsMarginTop: "10px",
      optionsTextAlign: "right",
      optionsRightWithinForm: true,
    });
  }
});

test("project board create README state preserves legacy query-owned form and deep links", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectBoardCreateForm(page, postRequests);

  await page.goto(`${basePath}/admin/sample/postform?readme=true`);

  await expect(page.locator("#title")).toHaveValue("Update README.md");
  await expect(page.locator("#editor-body-body")).toHaveValue("# Sample\n\nREADME draft\n");
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect(page.locator("#notice")).not.toBeChecked();
  await expect(page.locator("#readme")).toBeChecked();
  await expect(page.locator("#issueTemplate")).toHaveValue("");
  await expect(page.locator("#branch")).toHaveValue("");
  await expect(page.locator("#path")).toHaveValue("");
  await expect(page.locator("#lineEnding")).toHaveValue("LF");
  await expect(
    page.locator('.nav-tabs > li:nth-child(1) > a[href$="?readme=true#edit-body"]'),
  ).toHaveCount(1);
  const previewTab = page.locator(
    '.nav-tabs > li:nth-child(2) > a[href$="?readme=true#preview-body"]',
  );
  await expect(previewTab).toHaveCount(1);
  await previewTab.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/postform?readme=true#preview-body`);
  await page.locator('.nav-tabs > li:nth-child(1) > a[href$="#edit-body"]').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/postform?readme=true#edit-body`);
  expect(await boardCreateActionWhitespace(page)).toEqual({ gap: 0, whitespaceNode: false });

  await page.fill("#editor-body-body", "# Revised README\n");
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/posts") &&
      response.request().method() === "POST",
  );
  await page.click("form.nm .actions .ybtn-success");
  await postResponsePromise;
  expect(postRequests).toEqual([
    {
      attachmentIds: [],
      bodyMarkdown: "# Revised README\n",
      branch: "",
      edit: false,
      issueTemplate: false,
      labelIds: [],
      lineEnding: "LF",
      newFileName: "",
      notice: false,
      path: "",
      readme: true,
      title: "Update README.md",
    },
  ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/10`);
});

test("project board create issue-template state matches legacy query-owned visible form", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectBoardCreateForm(page, postRequests);

  await page.goto(`${basePath}/admin/sample/postform?issueTemplate=true`);

  await expect(page.locator("#title")).toHaveValue("ISSUE_TEMPLATE.md: Project Issue Template");
  await expect(page.locator(".attach-wrap .help-droppable")).toHaveText(
    "Issue templates do not support attachments.",
  );
  await expect(page.locator("#upload")).toHaveCount(0);
  await expect(page.locator("#notice")).toHaveCount(0);
  await expect(page.locator("#readme")).toHaveCount(0);
  await expect(page.locator(".file-path-wrap")).toHaveCount(0);
  await expect(page.locator(".new-file-name")).toHaveCount(0);
  await expect(page.locator("#issueTemplate")).toHaveValue("true");
  await expect(page.locator("#branch")).toHaveValue("main");
  await expect(page.locator("#path")).toHaveValue("ISSUE_TEMPLATE.md");
  expect(await boardCreateActionWhitespace(page)).toEqual({ gap: 0, whitespaceNode: false });

  const desktopEditor = await page
    .locator(".content-wrap.frm-wrap .textarea-box")
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { bottom: Math.round(box.bottom), top: Math.round(box.top) };
    });
  expect(desktopEditor).toEqual({ bottom: 678, top: 368 });

  await page.fill("#editor-body-body", "Template body");
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/posts") &&
      response.request().method() === "POST",
  );
  await page.click("form.nm .actions .ybtn-success");
  await postResponsePromise;
  expect(postRequests).toEqual([
    {
      attachmentIds: [],
      bodyMarkdown: "Template body",
      branch: "main",
      edit: false,
      issueTemplate: true,
      labelIds: [],
      lineEnding: "",
      newFileName: "",
      notice: false,
      path: "ISSUE_TEMPLATE.md",
      readme: false,
      title: "ISSUE_TEMPLATE.md: Project Issue Template",
    },
  ]);
});

test("project board create issue-template state preserves legacy mobile editor geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectBoardCreateForm(page, []);

  await page.goto(`${basePath}/admin/sample/postform?issueTemplate=true`);

  await expect(page.locator(".file-path-wrap")).toHaveCount(0);
  const mobileEditor = await page
    .locator(".content-wrap.frm-wrap .textarea-box")
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { bottom: Math.round(box.bottom), top: Math.round(box.top) };
    });
  // F5 dist-truth: legacy .textarea-box mobile rule only sets textarea width:100%
  // (yona-original/app/assets/stylesheets/less/_responsive.less:319) — no top rule;
  // rendered dist top is 447, the pinned 451 was stale.
  expect(mobileEditor).toEqual({ bottom: 761, top: 447 });
  expect(await boardCreateActionWhitespace(page)).toEqual({ gap: 0, whitespaceNode: false });
});

async function boardCreateActionWhitespace(page: Page) {
  return page.locator(".actions").evaluate((actions) => {
    const save = actions.querySelector<HTMLElement>("button.ybtn-success");
    const cancel = save?.nextElementSibling as HTMLElement | null;
    if (!save || !cancel) throw new Error("Expected board create actions are missing");
    return {
      gap: Math.round(cancel.getBoundingClientRect().left - save.getBoundingClientRect().right),
      whitespaceNode:
        save.nextSibling?.nodeType === Node.TEXT_NODE &&
        /\s/u.test(save.nextSibling.textContent ?? ""),
    };
  });
}

async function mockProjectBoardCreateForm(
  page: Page,
  postRequests: unknown[],
  project: BoardFormProjectFixture = ADMIN_SAMPLE_PROJECT,
) {
  const { isProtected = false, organizationName = "", ownerName, projectName } = project;
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
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          backgroundImageUrl: "/assets/images/bg-default-project.png",
          enrollmentRequestCount: 0,
          id: 7,
          isFavorite: false,
          isForkedFromOrigin: false,
          isPrivate: false,
          isProtected,
          logoUrl: "/assets/images/project_default_logo.png",
          menuSetting: {
            board: true,
            code: true,
            issue: true,
            milestone: true,
            pullRequest: true,
            review: true,
          },
          organizationName,
          ownerName,
          projectName,
          vcs: "GIT",
          viewerCanUpdate: true,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/posts/form-options**`,
    async (route) => {
      const searchParams = new URL(route.request().url()).searchParams;
      const issueTemplate = searchParams.get("issueTemplate") === "true";
      const readme = searchParams.get("readme") === "true";
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          canAttachFiles: true,
          canMarkNotice: true,
          canMarkReadme: true,
          defaultPermissions: {
            canAttachFiles: true,
            canCreate: true,
            canMarkNotice: true,
            canMarkReadme: true,
          },
          labels: [],
          onlineCommit: {
            branch: issueTemplate ? "main" : "",
            edit: false,
            issueTemplate,
            path: issueTemplate ? "ISSUE_TEMPLATE.md" : "",
            preparedBodyMarkdown: issueTemplate
              ? "Template body draft"
              : readme
                ? "# Sample\n\nREADME draft\n"
                : "",
            title: issueTemplate
              ? "ISSUE_TEMPLATE.md: Project Issue Template"
              : readme
                ? "Update README.md"
                : "",
          },
          readme,
        }),
      });
    },
  );
  await page.route(`**/api/v1/projects/${ownerName}/${projectName}/posts`, async (route) => {
    if (route.request().method() === "POST") {
      postRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          attachments: [],
          authorId: "1",
          authorLabel: "Site Admin",
          authorLoginId: "admin",
          bodyHtml: "<p>Body <strong>markdown</strong></p>",
          bodyMarkdown: "Body **markdown**",
          commentCount: 0,
          comments: [],
          createdLabel: "Jul 1, 2026",
          historyHtml: "",
          historyMarkdown: "",
          id: "100",
          isWatching: false,
          labels: [],
          notice: true,
          ownerName,
          permissions: {
            canComment: true,
            canCreate: true,
            canDelete: true,
            canRead: true,
            canSetNotice: true,
            canUpdate: true,
            canWatch: true,
          },
          postNumber: "10",
          projectName,
          readme: false,
          title: "Board draft",
          updatedLabel: "Jul 1, 2026",
          watcherCount: 0,
        }),
      });
      return;
    }
    await route.fallback();
  });
}

async function readProjectBoardCreateShellBoxes(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-stylex-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>("form.gnb-search-form");
    const scopeToggle = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-box"]',
    );
    const searchInput = document.querySelector<HTMLElement>(
      '[data-stylex-owner="global-gnb-search-input"]',
    );
    const searchSubmit = document.querySelector<HTMLElement>(
      '.gnb-search-form button[type="submit"]',
    );
    if (!navbar || !form || !scopeToggle || !searchBox || !searchInput || !searchSubmit) {
      return null;
    }
    return {
      form: form.getBoundingClientRect(),
      navbar: navbar.getBoundingClientRect(),
      scopeToggle: scopeToggle.getBoundingClientRect(),
      searchBox: searchBox.getBoundingClientRect(),
      searchInput: searchInput.getBoundingClientRect(),
      searchSubmit: searchSubmit.getBoundingClientRect(),
    };
  });
}

async function readBoardCreateFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((contentWrap) => {
    const form = contentWrap.closest<HTMLElement>("form.nm");
    const firstDd = contentWrap.querySelector<HTMLElement>("dd");
    const title = contentWrap.querySelector<HTMLElement>("#title");
    const editorDd = contentWrap.querySelector<HTMLElement>('dd[style*="position"]');
    const upload = contentWrap.querySelector<HTMLElement>(".upload-wrap.content-footer");
    const noticeRow = contentWrap.querySelector<HTMLElement>(
      "[data-stylex-owner=project-postform-options]",
    );
    const actions = contentWrap.querySelector<HTMLElement>(".actions");
    const missing = Object.entries({ actions, editorDd, firstDd, form, noticeRow, title, upload })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected board create metric targets are missing: ${missing.join(", ")}`);
    }

    const formStyle = getComputedStyle(form!);
    const ddStyle = getComputedStyle(firstDd!);
    const titleStyle = getComputedStyle(title!);
    const editorStyle = getComputedStyle(editorDd!);
    const uploadStyle = getComputedStyle(upload!);
    const noticeRowStyle = getComputedStyle(noticeRow!);
    const actionsStyle = getComputedStyle(actions!);
    const titleWidthPercent =
      Math.round(
        (title!.getBoundingClientRect().width / contentWrap.getBoundingClientRect().width) * 1000,
      ) / 10;

    return {
      actionsDisplay: actionsStyle.display,
      actionsMarginTop: actionsStyle.marginTop,
      actionsTextAlign: actionsStyle.textAlign,
      ddMargin: ddStyle.margin,
      ddPadding: ddStyle.padding,
      editorPosition: editorStyle.position,
      formMargin: formStyle.margin,
      noticeRowMarginBottom: noticeRowStyle.marginBottom,
      noticeRowMarginTop: noticeRowStyle.marginTop,
      noticeRowTextAlign: noticeRowStyle.textAlign,
      titleBorderBottomWidth: titleStyle.borderBottomWidth,
      titleBorderRadius: titleStyle.borderRadius,
      titleFontSize: titleStyle.fontSize,
      titleMarginBottom: titleStyle.marginBottom,
      titleMarginTop: titleStyle.marginTop,
      titleWidthPercent,
      uploadBackground: uploadStyle.backgroundColor,
      uploadBorderRadius: uploadStyle.borderRadius,
      uploadPadding: uploadStyle.padding,
    };
  });
}

async function readBoardCreateEditorTabBoxes(page: Page) {
  return page.locator(".content-wrap.frm-wrap dd[style] > .mt10").evaluate((editor) => {
    const tabList = editor.querySelector<HTMLElement>(".nav-tabs");
    const editTab = editor.querySelector<HTMLElement>(".nav-tabs > li:nth-child(1) > a");
    const previewTab = editor.querySelector<HTMLElement>(".nav-tabs > li:nth-child(2) > a");
    const tabContent = editor.querySelector<HTMLElement>(".tab-content");
    const editPane = editor.querySelector<HTMLElement>("#edit-body");
    const previewPane = editor.querySelector<HTMLElement>("#preview-body");
    const textarea = editor.querySelector<HTMLElement>("#editor-body-body");
    const missing = Object.entries({
      editPane,
      editTab,
      previewPane,
      previewTab,
      tabContent,
      tabList,
      textarea,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected board create editor targets are missing: ${missing.join(", ")}`);
    }

    return {
      editPane: editPane!.getBoundingClientRect(),
      editTab: editTab!.getBoundingClientRect(),
      editor: editor.getBoundingClientRect(),
      previewPane: previewPane!.getBoundingClientRect(),
      previewTab: previewTab!.getBoundingClientRect(),
      tabContent: tabContent!.getBoundingClientRect(),
      tabList: tabList!.getBoundingClientRect(),
      textarea: textarea!.getBoundingClientRect(),
    };
  });
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
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      if (node.classList.contains("markdown-help")) {
        return `${open}</${node.tagName.toLowerCase()}>`;
      }
      const children = Array.from(node.childNodes).map(visit).join("");
      return `${open}${children}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      if (attr.name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
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
    if (!root) {
      return "";
    }
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            !attr.name.startsWith("data-v-") &&
            attr.name !== "alt" &&
            attr.name !== "aria-current" &&
            attr.name !== "data-status" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-stylex-owner",
        )
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      if (node.classList.contains("markdown-help")) {
        return `${open}</${node.tagName.toLowerCase()}>`;
      }
      const children = Array.from(node.childNodes).map(visit).join("");
      return `${open}${children}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeAttr(attr: Attr) {
      const value = attr.value.replace(/;\s*$/u, "");
      if (attr.name === "class") {
        return value
          .split(/\s+/u)
          .filter(
            (token) =>
              token &&
              token !== "gray-txt" &&
              token !== "right-txt" &&
              !/^x[0-9a-z]+$/u.test(token) &&
              !token.includes("__"),
          )
          .join(" ");
      }
      return attr.name === "style" ? value.replace(/\s+/gu, "") : value;
    }

    function normalizeText(value: string) {
      return value.replace(/\s+/gu, " ").trim();
    }
  }, html);
}
