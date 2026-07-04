import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_EDIT_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/issue/1" id="issue-form" enctype="multipart/form-data"><input type="hidden" name="authorId" value="1"><input type="hidden" id="isDraft" name="isDraft" value="false"><input type="hidden" id="isPublish" name="isPublish" value="false"><div class="row-fluid"><div class="span12"><dl><dt><label for="title"><strong class="secondary-txt">#1</strong></label></dt><dd><div class="span12"><div class="span11"><input type="text" id="title" name="title" value="Editable issue" class="text title " maxlength="250" tabindex="1" placeholder="Title" autocomplete="off"></div><div class="span1 subtask-message">Option</div></div><div class="subtask-wrap "><div class="span3"><select id="targetProjectId" name="targetProjectId" data-format="projects" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize" disabled=""><option value="7" data-avatar-url="/assets/images/project_default_logo.png">sample</option></select></div><div class="span6"><select id="parentId" name="parentIssueId" data-format="issues" data-placeholder="Choose projects" data-toggle="select2" data-container-css-class="fullsize" disabled=""><option value="" selected="">??? Select parent issue ???</option><option value="42">#11.Existing parent</option></select></div></div></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2">Editable body</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="ISSUE_POST" data-resource-id="101"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class=" actrow right-txt"><span class="send-notification-check"><label class="checkbox inline"><input type="checkbox" name="notificationMail" id="notificationMail" value="yes" checked=""><strong>Send notification mail</strong></label></span><button type="submit" id="button-save" class="ybtn ybtn-info">Save</button><button type="button" class="ybtn">Cancel</button></div></div><div class="span3 span-hard-wrap right-menu"><dl class="issue-option"><dt>Status</dt><dd><div id="state" class="btn-group auto" data-name="state"><button type="button" class="btn dropdown-toggle auto" data-toggle="dropdown"><span class="d-label">Status</span><span class="d-caret"><span class="caret"></span></span></button><ul class="dropdown-menu"><li data-value="OPEN" data-selected="true" class="active"><button type="button">Open</button></li><li data-value="CLOSED"><button type="button">Closed</button></li></ul></div></dd></dl><dl class="issue-option"><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="dev" style="width:100%" title=""></dd></dl><dl id="milestoneOption" class="issue-option"><dt>Milestone</dt><dd><select id="milestoneId" name="milestoneId" data-toggle="select2" data-format="milestone" data-container-css-class="fullsize"><option value="0">No milestone</option><optgroup label="Open"><option value="5" data-state="open" selected="">v1.0</option></optgroup></select></dd></dl><dl class="issue-option"><dt>Due date</dt><dd><div class="search search-bar"><input type="text" id="issueDueDate" data-toggle="calendar" name="dueDate" class="textbox full" value="2026-08-02"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl class="issue-option"><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-toggle="select2" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false" selected="">bug</option></optgroup></select></dd></dl></div></div></div></form></div>
`;
const ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx", import.meta.url),
  "utf8",
);

function withLegacyEditor(html: string, markdownHelpHtml: string) {
  return html.replace(
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2">Editable body</textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button" data-toggle="tab" data-mode="edit">Edit</button></li><li><button type="button" data-toggle="tab" data-mode="preview">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible">${markdownHelpHtml}<div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body" tabindex="2">Editable body</textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="ISSUE_POST" data-resource-id="101"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="ISSUE_POST" data-resource-id="101"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`,
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
  const labelEditLink = page.locator("dl.issue-option dt .label-edit");
  await expect(labelEditLink).toHaveCount(1);
  await expect(labelEditLink).toHaveAttribute("href", `${basePath}/admin/sample/issue/labelsform`);
  await expect(labelEditLink).toHaveAttribute("target", "_blank");
  await expect(labelEditLink).toHaveClass("label-edit");
  await expect(labelEditLink).toHaveText("[Edit]");
  await expect(labelEditLink).not.toHaveAttribute("data-status", "active");
  expect(ROUTE_SOURCE).toContain("<Link");
  expect(ROUTE_SOURCE).toContain('className="label-edit"');
  expect(ROUTE_SOURCE).not.toMatch(/<a\b[^>]*className="label-edit"/u);
  expect(ROUTE_SOURCE).toContain(
    'import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";',
  );
  expect(ROUTE_SOURCE).toContain("<LegacyMarkdownHelp />");
  expect(ROUTE_SOURCE).not.toMatch(
    /help\/markdown\.scala\.html|legacyMarkdownHelpTemplate|legacyMarkdownHelpHtml|dangerouslySetInnerHTML|__html/u,
  );
  expect(ROUTE_SOURCE).not.toMatch(
    /document\.|addEventListener|classList|style\.display|href="javascript:/u,
  );
  await expect(page.locator("#notificationMail")).toBeChecked();
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#editor-body-body")).toHaveValue("Editable body");
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#edit-body"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#preview-body"]'),
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
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  const markdownHelp = page.locator(
    '[data-toggle="markdown-editor"] > .tab-content > .markdown-help',
  );
  await expect(markdownHelp).toHaveCount(1);
  await expect(markdownHelp.locator("> .markdown-help-nav > li")).toHaveCount(11);
  await expect(markdownHelp.locator("> .markdown-help-nav .label")).toHaveText("Markdown help");
  await expect(markdownHelp.locator("> .markdown-help-wrap > .markdown-help-item")).toHaveCount(10);
  await expect(markdownHelp.locator(".markdownShortLinks")).toHaveCount(1);
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  const uploader = page.locator("#upload.upload-wrap.content-footer");
  await expect(uploader).toHaveAttribute("data-resource-type", "ISSUE_POST");
  await expect(uploader).toHaveAttribute("data-resource-id", "101");
  await expect(uploader.locator(".attach-wrap")).toHaveCount(1);
  await expect(uploader.locator(".help-droppable")).toHaveText(
    "Drag & Drop files to attach here or",
  );
  await expect(uploader.locator(".fake-file-wrap")).toContainText("File upload");
  await expect(uploader.locator('input.file[name="filePath"]')).toHaveAttribute("multiple", "");
  await expect(uploader.locator(".plain")).toHaveText("Click upload button");
  await expect(uploader.locator(".help-pastable")).toHaveText("Paste the clipboard image");
  await expect(uploader.locator("ul.attached-files.unstyled")).toHaveCount(1);
  await expect(uploader.locator("p.right-txt.help")).toHaveText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);
  await expect(
    page.locator('.content-wrap.frm-wrap script[type="text/x-jquery-tmpl"]'),
  ).toHaveCount(0);
  expect(ROUTE_SOURCE).not.toMatch(
    /attachedFileTemplate|dropFilesHereTemplate|tplAttachedFile|tplDropFilesHere|text\/x-jquery-tmpl/u,
  );
  const cancelButton = await expectModernCancelControl(page);
  expect(ROUTE_SOURCE).not.toContain("window.history.back()");
  expect(ROUTE_SOURCE).toContain("router.history.back()");
  const issueEditFormUrl = page.url();

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "tab-kept";
  });
  await previewTab.click();
  await expect(page).toHaveURL(issueEditFormUrl);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("tab-kept");
  await editTab.click();
  await expect(page).toHaveURL(issueEditFormUrl);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(
        withLegacyEditor(
          EXPECTED_EDIT_FORM_BODY,
          await markdownHelp.evaluate((element) => element.outerHTML),
        ),
      ).replaceAll("__BASE_PATH__", basePath),
    ),
  );

  const stateDropdown = page.locator("#state.btn-group.auto[data-name='state']");
  const stateToggle = stateDropdown.locator("button.dropdown-toggle[data-toggle='dropdown']");
  await expect(stateDropdown).toHaveClass("btn-group auto");
  await expect(stateDropdown.locator(".d-label")).toHaveText("Status");
  await expect(stateDropdown.locator("li[data-value='OPEN']")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(stateDropdown.locator("li[data-value='OPEN']")).toHaveClass(/active/);
  await expect(stateDropdown.locator("li[data-value='CLOSED']")).not.toHaveClass(/active/);
  await expect(stateDropdown.locator("li a")).toHaveCount(0);
  await expect(stateDropdown.locator("li button[type='button']")).toHaveCount(2);

  await page.evaluate(() => {
    const testWindow = window as Window &
      typeof globalThis & {
        __yonaIssueStateDropdownDocumentBubble?: boolean;
        __yonaSpaMarker?: string;
      };
    testWindow.__yonaSpaMarker = "issue-state-dropdown";
    testWindow.__yonaIssueStateDropdownDocumentBubble = false;
    document.addEventListener(
      "click",
      (event) => {
        if ((event.target as Element | null)?.closest?.("#state .dropdown-toggle")) {
          testWindow.__yonaIssueStateDropdownDocumentBubble = true;
        }
      },
      { once: true },
    );
  });
  await stateToggle.click();
  await expect(stateDropdown).toHaveClass("btn-group auto open");
  expect(page.url()).toBe(issueEditFormUrl);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("issue-state-dropdown");
  expect(
    await page.evaluate(
      () =>
        (
          window as Window &
            typeof globalThis & { __yonaIssueStateDropdownDocumentBubble?: boolean }
        ).__yonaIssueStateDropdownDocumentBubble,
    ),
  ).toBe(false);

  await stateDropdown.locator("li[data-value='CLOSED'] button[type='button']").click();
  await expect(stateDropdown).toHaveClass("btn-group auto");
  await expect(stateDropdown.locator(".d-label")).toHaveText("Closed");
  await expect(stateDropdown.locator("li[data-value='OPEN']")).not.toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(stateDropdown.locator("li[data-value='OPEN']")).not.toHaveClass(/active/);
  await expect(stateDropdown.locator("li[data-value='CLOSED']")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(stateDropdown.locator("li[data-value='CLOSED']")).toHaveClass(/active/);
  expect(page.url()).toBe(issueEditFormUrl);
  expect(
    await page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).toBe("issue-state-dropdown");

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/issue/1/editform?cancel-test=1`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/1/editform?cancel-test=1`);
  await cancelButton.click();
  await expect(page).toHaveURL(issueEditFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project issue edit form renders legacy title required validation state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  let updateRequests = 0;
  let updateBody: Record<string, unknown> | undefined;
  await mockProjectIssueEditForm(page);
  page.on("request", (request) => {
    if (
      request.method() === "PUT" &&
      request.url().includes("/api/v1/projects/admin/sample/issues/1")
    ) {
      updateRequests += 1;
      updateBody = request.postDataJSON() as Record<string, unknown>;
    }
  });

  await page.goto(`${basePath}/admin/sample/issue/1/editform`);
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator("#title")).toHaveClass(/^text title\s*$/u);
  await expect(page.locator("dd > .message")).toHaveCount(0);

  await page.locator("#title").fill("");
  await page.locator("#button-save").click();

  await expect(page.locator("#title")).toHaveClass("text title error");
  const message = page.locator("dd > .message");
  await expect(message).toHaveCount(1);
  await expect(message.locator("> div")).toHaveText("Required field!");
  expect(
    await message.evaluate((element) =>
      element.nextElementSibling?.classList.contains("subtask-wrap"),
    ),
  ).toBe(true);
  expect(updateRequests).toBe(0);

  await page.locator("#title").fill("Editable issue updated");
  await expect(page.locator("#title")).toHaveClass(/^text title\s*$/u);
  await expect(page.locator("dd > .message")).toHaveCount(0);
  await page.locator("#button-save").click();
  await expect.poll(() => updateRequests).toBe(1);
  expect(updateBody?.isDraft).toBe(false);
  expect(updateBody?.isPublish).toBe(false);
});

test("project issue draft edit form submits legacy draft save and publish flags", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueEditForm(page, { issue: { isDraft: true, title: "Editable draft issue" } });

  await page.goto(`${basePath}/admin/sample/issue/1/editform`);
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator("dt > .draft")).toHaveText("Draft");
  await expect(page.locator("#isDraft")).toHaveValue("false");
  await expect(page.locator("#isPublish")).toHaveValue("false");
  await expect(page.locator("#button-draft-publish")).toHaveClass("ybtn ybtn-info");
  await expect(page.locator("#button-draft-publish")).toHaveText("Publish");
  await expect(page.locator("#draft-save-btn")).toHaveClass("ybtn ybtn-watching draft-save-btn");
  await expect(page.locator("#draft-save-btn")).toHaveText("Draft Save");
  await expect(page.locator("#button-save")).toHaveCount(0);
  await expect(page.locator(".send-notification-check")).toHaveCount(0);

  const draftSaveRequest = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      request.url().includes("/api/v1/projects/admin/sample/issues/1"),
  );
  await page.locator("#draft-save-btn").click();
  const draftSaveBody = (await draftSaveRequest).postDataJSON() as Record<string, unknown>;
  expect(draftSaveBody.isDraft).toBe(true);
  expect(draftSaveBody.isPublish).toBe(false);

  await page.goto(`${basePath}/admin/sample/issue/1/editform`);
  const publishRequest = page.waitForRequest(
    (request) =>
      request.method() === "PUT" &&
      request.url().includes("/api/v1/projects/admin/sample/issues/1"),
  );
  await page.locator("#button-draft-publish").click();
  const publishBody = (await publishRequest).postDataJSON() as Record<string, unknown>;
  expect(publishBody.isDraft).toBe(false);
  expect(publishBody.isPublish).toBe(true);

  expect(ROUTE_SOURCE).not.toMatch(/querySelector<HTMLInputElement>\("#isDraft"\)/u);
  expect(ROUTE_SOURCE).not.toMatch(/setAttribute\("value", "true"\)/u);
  expect(ROUTE_SOURCE).toContain('id="draft-save-btn"');
  expect(ROUTE_SOURCE).toContain("requestSubmit()");
});

async function mockProjectIssueEditForm(
  page: Page,
  options: {
    issue?: Partial<Record<string, unknown>>;
  } = {},
) {
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
    const issue = {
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
      ...options.issue,
    };
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(issue),
    });
  });
}

async function expectModernCancelControl(page: Page) {
  await expect(page.locator('.actrow a[href^="javascript:"]')).toHaveCount(0);
  const cancel = page
    .locator('.actrow > button[type="button"].ybtn')
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
