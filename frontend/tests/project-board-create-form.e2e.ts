import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_CREATE_FORM_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><form action="__BASE_PATH__/admin/sample/posts" method="post" enctype="multipart/form-data" class="nm"><div class="content-wrap frm-wrap"><dl><dd><input type="text" id="title" autocomplete="off" name="title" class="zen-mode text title " maxlength="250" tabindex="1" value="" placeholder="Title"></dd><dd></dd><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="3"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="BOARD_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="right-txt mt10 mb10"><label class="checkbox"><input type="checkbox" id="notice" name="notice">Set this post as notice.</label><input type="hidden" id="issueTemplate" name="issueTemplate" value=""><input type="hidden" id="branch" name="branch" value=""><input type="hidden" id="path" name="path" value=""><input type="hidden" id="lineEnding" name="lineEnding" value=""></div><div class="actions"><button class="ybtn ybtn-success" tabindex="3">Save</button><button type="button" class="ybtn" tabindex="4">Cancel</button></div></div></form></div></div>
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

function withLegacyEditor(html: string) {
  return html.replace(
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="3"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-body" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-body" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible">${LEGACY_MARKDOWN_HELP}<div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body" tabindex="3"></textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="BOARD_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="BOARD_POST"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><script type="text/x-jquery-tmpl" id="tplAttachedFile"><li class="attached-file" data-id="\${fileId}" data-name="\${fileName}" data-href="\${fileHref}" data-mime="\${mimeType}" data-size="\${fileSize}"><i class="yobicon-supportrequest"></i><i class="mimetype"></i><strong class="name">\${fileName}</strong><span class="size">\${fileSizeReadable}</span><div class="pull-right"><div class="progress upload-progress"><div class="bar orange"></div></div></div><button type="button" class="btn-transparent btn-delete pull-right">×</button><span class="pull-right nbtn small white btn-insert">Click to post</span></li></script><script type="text/x-jquery-tmpl" id="tplDropFilesHere"><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div></script>`,
  );
}

test("project board create form matches legacy board/create.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectBoardCreateForm(page, postRequests);

  await page.goto(`${basePath}/admin/sample/postform`);
  await expect(page.locator("form.nm")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#tplAttachedFile")).toHaveAttribute("type", "text/x-jquery-tmpl");

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
    titleWidthPercent: 97,
    uploadBackground: "rgb(245, 245, 245)",
    uploadBorderRadius: "5px",
    uploadPadding: "10px 20px",
  });

  await expect(page.locator('.actions a[href^="javascript:"]')).toHaveCount(0);
  const cancelButton = page.locator(".actions button.ybtn", { hasText: "Cancel" });
  await expect(cancelButton).toHaveAttribute("type", "button");
  await expect(cancelButton).toHaveAttribute("class", "ybtn");
  await expect(cancelButton).toHaveAttribute("tabindex", "4");
  await expect(cancelButton).toHaveText("Cancel");

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/postform?cancel-test=1`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/postform?cancel-test=1`);
  await cancelButton.click();
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/postform?branch=&edit=false&issueTemplate=false&path=&readme=false`,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

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

async function mockProjectBoardCreateForm(page: Page, postRequests: unknown[]) {
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
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", async (route) => {
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
          branch: "",
          edit: false,
          issueTemplate: false,
          path: "",
          preparedBodyMarkdown: "",
          title: "",
        },
        readme: false,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/posts", async (route) => {
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
          postNumber: "10",
          projectName: "sample",
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

async function readBoardCreateFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((contentWrap) => {
    const form = contentWrap.closest<HTMLElement>("form.nm");
    const firstDd = contentWrap.querySelector<HTMLElement>("dd");
    const title = contentWrap.querySelector<HTMLElement>("#title");
    const editorDd = contentWrap.querySelector<HTMLElement>('dd[style*="position"]');
    const upload = contentWrap.querySelector<HTMLElement>(".upload-wrap.content-footer");
    const noticeRow = contentWrap.querySelector<HTMLElement>(".right-txt.mt10.mb10");
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
      const children = Array.from(node.childNodes).map(visit).join("");
      return `${open}${children}</${node.tagName.toLowerCase()}>`;
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      const children = Array.from(node.childNodes).map(visit).join("");
      return `${open}${children}</${node.tagName.toLowerCase()}>`;
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
