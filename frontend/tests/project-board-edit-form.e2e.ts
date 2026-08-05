import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

test.setTimeout(45_000);

const EDITFORM_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx", import.meta.url),
  "utf8",
);
const EXPECTED_EDIT_FORM_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><form action="__BASE_PATH__/admin/sample/post/3" method="post" enctype="multipart/form-data" class="nm"><div class="content-wrap frm-wrap"><dl><dt><label for="title">Title</label></dt><dd><input type="text" id="title" name="title" value="Release note" class="zen-mode text title " maxlength="250" tabindex="1" autocomplete="off"></dd><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2">Post **markdown**</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="BOARD_POST" data-resource-id="103"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="mt10 mb10"><label class="checkbox"><input type="checkbox" id="notice" name="notice">Set this post as notice.</label><label class="checkbox"><input type="checkbox" id="readme" name="readme">make it a README file</label></div><div class="actions"><span class="send-notification-check"><label class="checkbox inline"><input type="checkbox" name="notificationMail" id="notificationMail" value="yes" checked=""><strong>Send notification mail</strong></label></span><button class="ybtn ybtn-info" tabindex="3">Save</button><button type="button" class="ybtn" tabindex="4">Cancel</button></div></div></form></div></div>
`;
const LEGACY_MARKDOWN_HELP = readFileSync(
  new URL("../../yona-original/app/views/help/markdown.scala.html", import.meta.url),
  "utf8",
)
  .replace(/@Messages\("title\.markdown\.help"\)/g, "Markdown help")
  .replace(/@\{"@"\}/g, "@")
  .replace(/\sdata-toggle="markdown-help"/g, "")
  .replace(/\sdata-target="markdown[^"]+"/g, "")
  .replace(/<script[\s\S]*$/u, "")
  .replace(/^[\s\S]*?<div class="markdown-help">/u, '<div class="markdown-help">')
  .replace(/<\/div>\s*$/u, "</div>");

function withLegacyEditor(html: string) {
  return html.replace(
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2">Post **markdown**</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="__BASE_PATH__/admin/sample/post/3/editform#edit-body">Edit</a></li><li><a href="__BASE_PATH__/admin/sample/post/3/editform#preview-body">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible">${LEGACY_MARKDOWN_HELP}<div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body" tabindex="2">Post **markdown**</textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="BOARD_POST" data-resource-id="103"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="BOARD_POST" data-resource-id="103"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable" style="display:block">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`,
  );
}

test("project board edit form matches legacy board/edit.scala.html core form DOM", async ({
  page,
}) => {
  expect(EDITFORM_ROUTE_SOURCE).toContain('window.alert(t("post.error.emptyTitle"))');
  expect(EDITFORM_ROUTE_SOURCE).not.toContain('t("validation.required")');
  expect(EDITFORM_ROUTE_SOURCE).toContain(
    "className={`${stylex.props(styles.options).className} mt10 mb10`}",
  );
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("styles.options).className} right-txt");
  expect(EDITFORM_ROUTE_SOURCE).toContain(
    'import { BoardPostMarkdownEditor } from "../../../../../components/markdown-editor";',
  );
  expect(EDITFORM_ROUTE_SOURCE).toContain(
    'import { BoardPostFileUploader } from "../../../../../components/file-uploader";',
  );
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("document.");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("addEventListener");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("classList");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("style.display");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("data-mode=");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain('setAttribute("tabindex"');
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("setAttribute('tabindex'");
  expect(EDITFORM_ROUTE_SOURCE).toContain("tabIndex={1}");
  expect(EDITFORM_ROUTE_SOURCE).toContain("tabIndex={2}");
  expect(EDITFORM_ROUTE_SOURCE).toContain("tabIndex={3}");
  expect(EDITFORM_ROUTE_SOURCE).toContain("tabIndex={4}");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("window.history.back()");
  expect(EDITFORM_ROUTE_SOURCE).toContain("router.history.back()");
  expect(EDITFORM_ROUTE_SOURCE).toContain(
    '<title>{`${t("post.modify")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("document.title");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(EDITFORM_ROUTE_SOURCE).not.toContain("window.document");
  expect(EDITFORM_ROUTE_SOURCE).not.toMatch(
    /useEffect\s*\([\s\S]{0,300}(?:document|globalThis\.document|window\.document)\.title/u,
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectBoardEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/post/3/editform`);
  await expect(page).toHaveTitle("Edit post - admin/sample");
  expect(
    await page
      .locator("head > title")
      .first()
      .evaluate((title) => title.textContent),
  ).toBe("Edit post - admin/sample");
  await expect(page.locator("form.nm")).toBeVisible();
  await expect(page.locator("#title")).toBeFocused();
  await page.locator("#title").press("Enter");
  await expect(page.locator("#editor-body-body")).toBeFocused();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("form.nm .actions .ybtn-info")).toHaveAttribute("tabindex", "3");
  await expect(page.locator(".actions button.ybtn", { hasText: "Cancel" })).toHaveAttribute(
    "tabindex",
    "4",
  );
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#upload")
        .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    )
    .toBe(70);
  expect(await boardActionWhitespace(page)).toEqual({ gap: 4, whitespaceNode: true });
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(withLegacyEditor(EXPECTED_EDIT_FORM_BODY)).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
  expect(await readBoardEditFormMetrics(page)).toEqual({
    actionsDisplay: "block",
    actionsMarginTop: "20px",
    actionsTextAlign: "center",
    ddMargin: "0px",
    ddPadding: "0px",
    dtLabelFontWeight: "700",
    dtLabelMarginRight: "5px",
    dtMargin: "3px 0px 1px",
    dtPadding: "0px",
    editorPosition: "relative",
    formMargin: "0px",
    notificationCheckboxDisplay: "inline-block",
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

  await expect(
    page.locator('.mt10:has(#editor-body-body) .nav-tabs a[href$="#edit-body"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.mt10:has(#editor-body-body) .nav-tabs a[href$="#preview-body"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('.mt10:has(#editor-body-body) .nav-tabs [data-toggle="tab"]'),
  ).toHaveCount(0);
  await expect(
    page.locator(".mt10:has(#editor-body-body) .nav-tabs button[data-mode]"),
  ).toHaveCount(0);
  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(page.locator(".mt10:has(#editor-body-body)")).toHaveCount(1);
  const editorTabs = page.locator(".mt10:has(#editor-body-body) .nav-tabs > li");
  await expect(editorTabs).toHaveCount(5);
  await expect(editorTabs.nth(0).locator("a")).toHaveText("Edit");
  await expect(editorTabs.nth(1).locator("a")).toHaveText("Preview");
  await expect(editorTabs.nth(2).locator('button[type="button"]')).toHaveText("Add checklist");
  await expect(editorTabs.nth(3).locator('button[type="button"]')).toHaveText("Clear Temporary");
  const editTabButton = editorTabs.nth(0).locator("a");
  const previewTabButton = editorTabs.nth(1).locator("a");
  await expect(editTabButton).toHaveText("Edit");
  await expect(previewTabButton).toHaveText("Preview");
  await expect(editTabButton.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTabButton.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#editor-body-body")).toHaveValue("Post **markdown**");

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.replaceState({ editorTabTest: true }, "", url);
  }, `${basePath}/admin/sample/post/3/editform?tab-test=1`);
  await previewTabButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3/editform?tab-test=1#preview-body`);
  await expect(previewTabButton.locator("xpath=..")).toHaveClass(/active/);
  await expect(editTabButton.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await editTabButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3/editform?tab-test=1#edit-body`);
  await expect(editTabButton.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTabButton.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await page.evaluate((url) => {
    window.history.replaceState({ editorTabTest: false }, "", url);
  }, `${basePath}/admin/sample/post/3/editform`);

  await expect(page.locator('.actions a[href^="javascript:"]')).toHaveCount(0);
  const cancelButton = page.locator(".actions button.ybtn", { hasText: "Cancel" });
  await expect(cancelButton).toHaveAttribute("type", "button");
  await expect(cancelButton).toHaveAttribute("class", "ybtn");
  await expect(cancelButton).toHaveAttribute("tabindex", "4");
  await expect(cancelButton).toHaveText("Cancel");

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/post/3/editform?cancel-test=1`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3/editform?cancel-test=1`);
  await cancelButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3/editform`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.fill("#title", "");
  const alertMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.click("form.nm .actions .ybtn-info");
  await expect(alertMessage).resolves.toBe("Title is a required field.");
  await expect(page.locator("#title")).toBeFocused();
  await expect(page.locator("#title")).toHaveClass("zen-mode text title ");
  await expect(page.locator("#title + .message")).toHaveCount(0);
  expect(patchRequests).toEqual([]);

  await page.fill("#title", "Release note patched");
  await page.fill("#editor-body-body", "Patched **body**");
  await page.check("#notice");
  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/posts/3") &&
      response.request().method() === "PATCH",
  );
  await page.click("form.nm .actions .ybtn-info");
  await patchResponsePromise;
  expect(patchRequests).toEqual([
    {
      attachmentIds: [],
      bodyMarkdown: "Patched **body**",
      branch: "",
      edit: false,
      issueTemplate: false,
      labelIds: [],
      lineEnding: "",
      newFileName: "",
      notice: true,
      path: "",
      readme: false,
      title: "Release note patched",
    },
  ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/post/3`);
});

test("project board edit form preserves uploader and action whitespace on mobile", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectBoardEditForm(page, []);
  await page.goto(`${basePath}/admin/sample/post/3/editform`);

  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#upload")
        .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    )
    .toBe(100);
  expect(await boardActionWhitespace(page)).toEqual({ gap: 4, whitespaceNode: true });
});

async function boardActionWhitespace(page: Page) {
  return page.locator(".actions").evaluate((actions) => {
    const save = actions.querySelector<HTMLElement>("button.ybtn-info");
    const cancel = save?.nextElementSibling as HTMLElement | null;
    if (!save || !cancel) throw new Error("Expected board edit actions are missing");
    return {
      gap: Math.round(cancel.getBoundingClientRect().left - save.getBoundingClientRect().right),
      whitespaceNode:
        save.nextSibling?.nodeType === Node.TEXT_NODE &&
        /\s/u.test(save.nextSibling.textContent ?? ""),
    };
  });
}

async function mockProjectBoardEditForm(page: Page, patchRequests: unknown[]) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 2,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "dev@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "dev",
        userLabel: "Dev Member",
      }),
    });
  });
  await page.route("**/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      body: JSON.stringify({ user: { loginId: "dev" } }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
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
  await page.route("**/api/v1/projects/admin/sample/posts/3", async (route) => {
    if (route.request().method() === "PATCH") {
      patchRequests.push(route.request().postDataJSON());
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(boardPostDetail()),
    });
  });
}

function boardPostDetail() {
  return {
    attachments: [],
    authorId: "2",
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    bodyHtml: "<p>Post <strong>markdown</strong></p>",
    bodyMarkdown: "Post **markdown**",
    commentCount: 0,
    comments: [],
    createdLabel: "Jul 2, 2026",
    historyHtml: "",
    historyMarkdown: "",
    id: "103",
    isWatching: false,
    labels: [],
    notice: false,
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
    postNumber: "3",
    projectName: "sample",
    readme: false,
    title: "Release note",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}

async function readBoardEditFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((contentWrap) => {
    const form = contentWrap.closest<HTMLElement>("form.nm");
    const dt = contentWrap.querySelector<HTMLElement>("dt");
    const dtLabel = contentWrap.querySelector<HTMLElement>("dt label");
    const firstDd = contentWrap.querySelector<HTMLElement>("dd");
    const title = contentWrap.querySelector<HTMLElement>("#title");
    const editorDd = contentWrap.querySelector<HTMLElement>('dd[style*="position"]');
    const upload = contentWrap.querySelector<HTMLElement>(".upload-wrap.content-footer");
    const noticeRow = contentWrap.querySelector<HTMLElement>(
      '[data-stylex-owner="post-edit-form-options"]',
    );
    const actions = contentWrap.querySelector<HTMLElement>(".actions");
    const notificationCheckbox = actions?.querySelector<HTMLElement>(".checkbox.inline");
    const missing = Object.entries({
      actions,
      dt,
      dtLabel,
      editorDd,
      firstDd,
      form,
      noticeRow,
      notificationCheckbox,
      title,
      upload,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(`Expected board edit metric targets are missing: ${missing.join(", ")}`);
    }

    const formStyle = getComputedStyle(form!);
    const dtStyle = getComputedStyle(dt!);
    const dtLabelStyle = getComputedStyle(dtLabel!);
    const ddStyle = getComputedStyle(firstDd!);
    const titleStyle = getComputedStyle(title!);
    const editorStyle = getComputedStyle(editorDd!);
    const uploadStyle = getComputedStyle(upload!);
    const noticeRowStyle = getComputedStyle(noticeRow!);
    const actionsStyle = getComputedStyle(actions!);
    const notificationCheckboxStyle = getComputedStyle(notificationCheckbox!);
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
      dtLabelFontWeight: dtLabelStyle.fontWeight,
      dtLabelMarginRight: dtLabelStyle.marginRight,
      dtMargin: dtStyle.margin,
      dtPadding: dtStyle.padding,
      editorPosition: editorStyle.position,
      formMargin: formStyle.margin,
      notificationCheckboxDisplay: notificationCheckboxStyle.display,
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
      const children =
        node.classList.contains("markdown-help") || node.classList.contains("mt10")
          ? ""
          : Array.from(node.childNodes).map(visit).join("");
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
      const children =
        node.classList.contains("markdown-help") || node.classList.contains("mt10")
          ? ""
          : Array.from(node.childNodes).map(visit).join("");
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
