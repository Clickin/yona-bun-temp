import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_EDIT_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/issue/1" id="issue-form" enctype="multipart/form-data"><input type="hidden" name="authorId" value="1"><input type="hidden" id="isDraft" name="isDraft" value="false"><input type="hidden" id="isPublish" name="isPublish" value="false"><div class="row-fluid"><div class="span12"><dl><dt><label for="title"><strong class="secondary-txt">#1</strong></label></dt><dd><div class="span12"><div class="span11"><input type="text" id="title" name="title" value="Editable issue" class="text title " maxlength="250" tabindex="1" placeholder="Title" autocomplete="off"></div><div class="span1 subtask-message">Option</div></div><div class="subtask-wrap "><div class="span3"><select id="targetProjectId" name="targetProjectId" data-format="projects" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize" disabled=""><option value="7" data-avatar-url="/assets/images/project_default_logo.png">sample</option></select></div><div class="span6"><select id="parentId" name="parentIssueId" data-format="issues" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize" disabled=""><option value="" selected="">??? Select parent issue ???</option><option value="42">#11.Existing parent</option></select></div></div></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2">Editable body</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="ISSUE_POST" data-resource-id="101"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class=" actrow right-txt"><span class="send-notification-check"><label class="checkbox inline"><input type="checkbox" name="notificationMail" id="notificationMail" value="yes" checked=""><strong>Send notification mail</strong></label></span><button type="submit" id="button-save" class="ybtn ybtn-info">Save</button><a href="javascript:history.back();" class="ybtn">Cancel</a></div></div><div class="span3 span-hard-wrap right-menu"><dl class="issue-option"><dt>Status</dt><dd><div id="state" class="btn-group auto" data-name="state"><button class="btn dropdown-toggle auto" data-toggle="dropdown"><span class="d-label">Status</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="OPEN" data-selected="true" class="active"><a>Open</a></li><li data-value="CLOSED"><a>Closed</a></li></ul></div></dd></dl><dl class="issue-option"><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="dev" style="width:100%" title=""></dd></dl><dl id="milestoneOption" class="issue-option"><dt>Milestone</dt><dd><select id="milestoneId" name="milestoneId" data-toggle="select2" data-format="milestone" data-container-css-class="fullsize"><option value="0">No milestone</option><optgroup label="Open"><option value="5" data-state="open" selected="">v1.0</option></optgroup></select></dd></dl><dl class="issue-option"><dt>Due date</dt><dd><div class="search search-bar"><input type="text" id="issueDueDate" data-toggle="calendar" name="dueDate" class="textbox full" value="2026-08-02"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl class="issue-option"><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option></optgroup></select></dd></dl></div></div></div></form></div>
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
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2">Editable body</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><a href="#edit-body" data-toggle="tab" data-mode="edit">Edit</a></li><li><a href="#preview-body" data-toggle="tab" data-mode="preview">Preview</a></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible">${LEGACY_MARKDOWN_HELP}<div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body" tabindex="2">Editable body</textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="ISSUE_POST" data-resource-id="101"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="ISSUE_POST" data-resource-id="101"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><script type="text/x-jquery-tmpl" id="tplAttachedFile"><li class="attached-file" data-id="\${fileId}" data-name="\${fileName}" data-href="\${fileHref}" data-mime="\${mimeType}" data-size="\${fileSize}"><i class="yobicon-supportrequest"></i><i class="mimetype"></i><strong class="name">\${fileName}</strong><span class="size">\${fileSizeReadable}</span><div class="pull-right"><div class="progress upload-progress"><div class="bar orange"></div></div></div><button type="button" class="btn-transparent btn-delete pull-right">×</button><span class="pull-right nbtn small white btn-insert">Click to post</span></li></script><script type="text/x-jquery-tmpl" id="tplDropFilesHere"><div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drag &amp; Drop files here to upload.</div></div></div></script>`,
  );
}

test("project issue edit form matches legacy issue/edit.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueEditForm(page);

  await page.goto(`${basePath}/admin/sample/issue/1/editform`);
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
  await expect(page.locator('#labelIds option[value="8"]')).toHaveJSProperty("selected", true);
  await expect(page.locator("#notificationMail")).toBeChecked();
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#tplAttachedFile")).toHaveAttribute("type", "text/x-jquery-tmpl");

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(withLegacyEditor(EXPECTED_EDIT_FORM_BODY)).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

async function mockProjectIssueEditForm(page: Page) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/labels", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/1", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assigneeLoginId: "dev",
        authorId: 1,
        bodyMarkdown: "Editable body",
        dueDateLabel: "2026-08-02",
        isDraft: false,
        issueId: 101,
        issueNumber: 1,
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
        milestoneId: 5,
        milestoneTitle: "v1.0",
        ownerName: "admin",
        parentIssueId: null,
        projectName: "sample",
        state: "open",
        title: "Editable issue",
        viewerCanUpdate: true,
        viewerUserId: 1,
      }),
    });
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
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

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
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
