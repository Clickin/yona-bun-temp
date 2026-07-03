import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const LEGACY_MARKDOWN_HELP = readFileSync(
  new URL("../../yona-original/app/views/help/markdown.scala.html", import.meta.url),
  "utf8",
)
  .replace(/@Messages\("title\.markdown\.help"\)/g, "Markdown help")
  .replace(/@\{"@"\}/g, "@")
  .replace(/<script[\s\S]*$/u, "")
  .replace(/^[\s\S]*?<div class="markdown-help">/u, "")
  .replace(/<\/div>\s*$/u, "");

const EXPECTED_CREATE_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/milestones" id="milestone-form" enctype="multipart/form-data"><div class="row-fluid"><div class="span12"><dl><dd><input type="text" id="title" name="title" value="" class="zen-mode text title " maxlength="250" tabindex="1" placeholder="Title"></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button" data-toggle="tab" data-mode="edit">Edit</button></li><li><button type="button" data-toggle="tab" data-mode="preview">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible"><div class="markdown-help">${LEGACY_MARKDOWN_HELP}</div><div id="edit-content-body" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-contents-content-body" tabindex="2"></textarea></div></div><div id="preview-content-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div></dd></dl><div id="upload" class="upload-wrap content-footer" data-resource-type="MILESTONE"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><script type="text/x-jquery-tmpl" id="tplAttachedFile"><li class="attached-file" data-id="\${fileId}" data-name="\${fileName}" data-href="\${fileHref}" data-mime="\${mimeType}" data-size="\${fileSize}"><i class="yobicon-supportrequest"></i><i class="mimetype"></i><strong class="name">\${fileName}</strong><span class="size">\${fileSizeReadable}</span><div class="pull-right"><div class="progress upload-progress"><div class="bar orange"></div></div></div><button type="button" class="btn-transparent btn-delete pull-right">×</button><span class="pull-right nbtn small white btn-insert">Click to post</span></li></script><script type="text/x-jquery-tmpl" id="tplDropFilesHere"><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div></script><div class=" actrow right-txt"><button type="submit" class="ybtn ybtn-info">Save</button><a href="__BASE_PATH__/admin/sample/milestones" class="ybtn">Cancel</a></div></div><div class="span3 span-hard-wrap"><dl class="issue-option"><dt>Milestone status</dt><dd><div><input type="radio" name="state" value="OPEN" id="milestone-open" class="radio-btn" checked=""><label for="milestone-open" class="bold">Open</label>&nbsp;<input type="radio" name="state" value="CLOSED" id="milestone-close" class="radio-btn"><label for="milestone-close" class="bold">Closed</label></div></dd></dl><dl class="issue-option"><dt>Choose due date</dt><dd><div><label for="dueDate"><input type="text" name="dueDate" id="dueDate" class="validate due-date" autocomplete="off" value=""></label><div id="datepicker" class="date-picker"></div></div></dd></dl></div></div></div></form></div>
`;

test("project milestone create form matches legacy milestone/create.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectMilestoneCreateForm(page, postRequests);

  await page.goto(`${basePath}/admin/sample/newMilestoneForm`);
  await expect(page.locator("#milestone-form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator("#milestone-open")).toBeChecked();
  await expect(page.locator("#dueDate")).toHaveValue("");

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_CREATE_FORM_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  await expect(page.locator("#editor-contents-content-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#editor-contents-content-body")).toHaveAttribute("tabindex", "2");
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#edit-content-body"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#preview-content-body"]'),
  ).toHaveCount(0);
  const editTab = page.locator(
    '[data-toggle="markdown-editor"] .nav-tabs button[type="button"][data-toggle="tab"][data-mode="edit"]',
  );
  const previewTab = page.locator(
    '[data-toggle="markdown-editor"] .nav-tabs button[type="button"][data-toggle="tab"][data-mode="preview"]',
  );
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).not.toHaveClass(/active/);
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#tplAttachedFile")).toHaveAttribute("type", "text/x-jquery-tmpl");
  await expect(page.locator('.actrow a.ybtn:has-text("Cancel")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  expect(await readMilestoneCreateFormMetrics(page)).toEqual({
    actionDisplay: "block",
    actionMarginTop: "20px",
    actionTextAlign: "right",
    ddMargin: "0px",
    ddPadding: "0px",
    dueDateInputWidth: 206,
    editorPosition: "relative",
    formMargin: "0px 0px 2px",
    issueOptionDdMargin: "0px",
    issueOptionDtMarginBottom: "5px",
    issueOptionMarginBottom: "16px",
    issueOptionWidthPercent: 100,
    leftPaneWidthPercent: 74.5,
    rightPaneMarginLeftPercent: 2.1,
    rightPaneWidthPercent: 23.4,
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

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "create-editor-tabs";
  });
  const urlBeforeEditorTabClick = page.url();
  await previewTab.click();
  await expect(editTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).toHaveClass(/active/);
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("create-editor-tabs");
  await editTab.click();
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).not.toHaveClass(/active/);
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("create-editor-tabs");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "create-cancel";
  });
  await page.click('.actrow a.ybtn:has-text("Cancel")');
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/milestones?orderBy=dueDate&orderDir=asc&state=open`,
  );
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("create-cancel");

  await page.goto(`${basePath}/admin/sample/newMilestoneForm`);
  await page.fill("#title", "v3.0");
  await page.fill("#editor-contents-content-body", "Create scope");
  await page.fill("#dueDate", "2026-09-30");
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/milestones") &&
      response.request().method() === "POST",
  );
  await page.click('#milestone-form button[type="submit"]');
  await postResponsePromise;
  expect(postRequests).toEqual([
    {
      attachmentIds: [],
      contentsMarkdown: "Create scope",
      dueDate: "2026-09-30",
      state: "OPEN",
      title: "v3.0",
    },
  ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/9?state=open`);
});

async function mockProjectMilestoneCreateForm(page: Page, postRequests: unknown[]) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/milestones", async (route) => {
    if (route.request().method() === "POST") {
      postRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          milestone: {
            attachments: [],
            closedIssueCount: 0,
            closedIssues: [],
            completionPercent: 0,
            contentsHtml: "<p>Create scope</p>",
            contentsMarkdown: "Create scope",
            dueDateLabel: "2026-09-30",
            id: 9,
            openIssueCount: 0,
            openIssues: [],
            state: "open",
            title: "v3.0",
            viewerCanDelete: true,
            viewerCanUpdate: true,
          },
        }),
      });
      return;
    }
    await route.fallback();
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestones: [] }),
    });
  });
}

async function readMilestoneCreateFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((contentWrap) => {
    const form = contentWrap.querySelector<HTMLElement>("#milestone-form");
    const firstDd = contentWrap.querySelector<HTMLElement>("dd");
    const title = contentWrap.querySelector<HTMLElement>("#title");
    const leftPane = contentWrap.querySelector<HTMLElement>(".span-left-pane");
    const rightPane = contentWrap.querySelector<HTMLElement>(".span-hard-wrap");
    const editorDd = contentWrap.querySelector<HTMLElement>('dd[style*="position"]');
    const upload = contentWrap.querySelector<HTMLElement>(".upload-wrap.content-footer");
    const action = contentWrap.querySelector<HTMLElement>(".actrow.right-txt");
    const issueOption = contentWrap.querySelector<HTMLElement>(".issue-option");
    const issueOptionDt = issueOption?.querySelector<HTMLElement>("dt");
    const issueOptionDd = issueOption?.querySelector<HTMLElement>("dd");
    const dueDateInput = contentWrap.querySelector<HTMLElement>("#dueDate");
    const missing = Object.entries({
      action,
      dueDateInput,
      editorDd,
      firstDd,
      form,
      issueOption,
      issueOptionDd,
      issueOptionDt,
      leftPane,
      rightPane,
      title,
      upload,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected milestone create metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const formStyle = getComputedStyle(form!);
    const ddStyle = getComputedStyle(firstDd!);
    const titleStyle = getComputedStyle(title!);
    const editorStyle = getComputedStyle(editorDd!);
    const uploadStyle = getComputedStyle(upload!);
    const actionStyle = getComputedStyle(action!);
    const rightPaneStyle = getComputedStyle(rightPane!);
    const issueOptionStyle = getComputedStyle(issueOption!);
    const issueOptionDtStyle = getComputedStyle(issueOptionDt!);
    const issueOptionDdStyle = getComputedStyle(issueOptionDd!);
    const contentWidth = contentWrap.getBoundingClientRect().width;
    const titleWidthPercent =
      Math.round((title!.getBoundingClientRect().width / contentWidth) * 1000) / 10;
    const leftPaneWidthPercent =
      Math.round((leftPane!.getBoundingClientRect().width / contentWidth) * 1000) / 10;
    const rightPaneWidthPercent =
      Math.round((rightPane!.getBoundingClientRect().width / contentWidth) * 1000) / 10;
    const rightPaneMarginLeftPercent =
      Math.round((parseFloat(rightPaneStyle.marginLeft) / contentWidth) * 1000) / 10;
    const issueOptionWidthPercent =
      Math.round(
        (issueOption!.getBoundingClientRect().width / rightPane!.getBoundingClientRect().width) *
          1000,
      ) / 10;

    return {
      actionDisplay: actionStyle.display,
      actionMarginTop: actionStyle.marginTop,
      actionTextAlign: actionStyle.textAlign,
      ddMargin: ddStyle.margin,
      ddPadding: ddStyle.padding,
      dueDateInputWidth: Math.round(dueDateInput!.getBoundingClientRect().width),
      editorPosition: editorStyle.position,
      formMargin: formStyle.margin,
      issueOptionDdMargin: issueOptionDdStyle.margin,
      issueOptionDtMarginBottom: issueOptionDtStyle.marginBottom,
      issueOptionMarginBottom: issueOptionStyle.marginBottom,
      issueOptionWidthPercent,
      leftPaneWidthPercent,
      rightPaneMarginLeftPercent,
      rightPaneWidthPercent,
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
