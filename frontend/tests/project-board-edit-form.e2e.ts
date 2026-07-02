import { expect, test, type Page } from "@playwright/test";

const EXPECTED_EDIT_FORM_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><form action="__BASE_PATH__/admin/sample/post/3" method="post" enctype="multipart/form-data" class="nm"><div class="content-wrap frm-wrap"><dl><dt><label for="title">Title</label></dt><dd><input type="text" id="title" name="title" value="Release note" class="zen-mode text title " maxlength="250" tabindex="1" autocomplete="off"></dd><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2">Post **markdown**</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="BOARD_POST" data-resource-id="103"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="right-txt mt10 mb10"><label class="checkbox"><input type="checkbox" id="notice" name="notice">Set this post as notice.</label><label class="checkbox"><input type="checkbox" id="readme" name="readme">make it a README file</label></div><div class="actions"><span class="send-notification-check"><label class="checkbox inline"><input type="checkbox" name="notificationMail" id="notificationMail" value="yes" checked=""><strong>Send notification mail</strong></label></span><button class="ybtn ybtn-info" tabindex="3">Save</button><a href="javascript:history.back();" class="ybtn" tabindex="4">Cancel</a></div></div></form></div></div>
`;

test("project board edit form matches legacy board/edit.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectBoardEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/post/3/editform`);
  await expect(page.locator("form.nm")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Board");

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_EDIT_FORM_BODY.replaceAll("__BASE_PATH__", basePath)),
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
    titleWidthPercent: 97,
    uploadBackground: "rgb(245, 245, 245)",
    uploadBorderRadius: "5px",
    uploadPadding: "10px 20px",
  });

  await page.fill("#title", "Release note patched");
  await page.fill("#editor-body-content-body", "Patched **body**");
  await page.check("#notice");
  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/projects/admin/sample/posts/3") &&
      response.request().method() === "PATCH",
  );
  await page.click("form.nm .actions button");
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
    const noticeRow = contentWrap.querySelector<HTMLElement>(".right-txt.mt10.mb10");
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
