import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_ISSUE_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/issues" id="issue-form" enctype="multipart/form-data"><div class="row-fluid"><div class="span12"><dl><dd><div class="span12"><div class="span11"><input type="text" id="title" name="title" value="" class="text title " maxlength="250" tabindex="1" placeholder="Title" autocomplete="off" title="press Tab or Enter to move cursor to content area"></div><div class="span1 subtask-message">Option</div></div><div class="subtask-wrap "><div class="span3"><select id="targetProjectId" name="targetProjectId" data-format="projects" data-placeholder="Choose projects" data-container-css-class="fullsize" disabled=""><option value="7" data-avatar-url="/assets/images/project_default_logo.png">sample</option></select></div><div class="span6"><select id="parentId" name="parentIssueId" data-format="issues" data-placeholder="Choose projects" data-container-css-class="fullsize" disabled=""><option value="" selected="">??? Select parent issue ???</option><option value="42">#11.Existing parent</option></select></div></div></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="ISSUE_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actrow right-txt"><button type="submit" id="button-save" class="ybtn ybtn-success">Save</button><button type="button" id="draft-save-btn" class="ybtn ybtn-watching draft-save-btn" title="Only you can see it until you publish">Draft Save</button><button type="button" class="ybtn">Cancel</button></div></div><div class="span3 span-hard-wrap right-menu"><dl class="issue-option"><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="" style="width:100%" title=""></dd></dl><dl id="milestoneOption" class="issue-option"><dt>Milestone</dt><dd><select id="milestoneId" name="milestoneId" data-format="milestone" data-container-css-class="fullsize"><option value="-1" selected="">No milestone</option><option value="5" data-state="open">Sprint 1</option></select></dd></dl><dl class="issue-option"><dt>Due date</dt><dd><div class="search search-bar"><input type="text" id="issueDueDate" name="dueDate" class="textbox full"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl class="issue-option"><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false">bug</option></optgroup></select></dd></dl><input type="hidden" name="referCommentId" value=""><input type="hidden" id="isDraft" name="isDraft" value="false"></div></div></div></form></div>
`;

const EXPECTED_PARENT_ISSUE_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/issues" id="issue-form" enctype="multipart/form-data"><div class="row-fluid"><div class="span12"><dl><dd><div class="span12"><div class="span11"><input type="text" id="title" name="title" value="" class="text title " maxlength="250" tabindex="1" placeholder="Title" autocomplete="off" title="press Tab or Enter to move cursor to content area"></div><div class="span1 subtask-message">Option</div></div><div class="subtask-wrap show"><div class="span3"><select id="targetProjectId" name="targetProjectId" data-format="projects" data-placeholder="Choose projects" data-container-css-class="fullsize"><option value="7" data-avatar-url="/assets/images/project_default_logo.png">sample</option></select></div><div class="span6"><select id="parentId" name="parentIssueId" data-format="issues" data-placeholder="Choose projects" data-container-css-class="fullsize"><option value="">??? Select parent issue ???</option><option value="42" selected="">#11.Existing parent</option></select></div></div></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></dd></dl><div class="upload-wrap content-footer" data-resource-type="ISSUE_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actrow right-txt"><button type="submit" id="button-save" class="ybtn ybtn-success">Save</button><button type="button" id="draft-save-btn" class="ybtn ybtn-watching draft-save-btn" title="Only you can see it until you publish">Draft Save</button><button type="button" class="ybtn">Cancel</button></div></div><div class="span3 span-hard-wrap right-menu"><dl class="issue-option"><dt>Assignee</dt><dd><input type="hidden" class="bigdrop" id="assignee" name="assigneeLoginId" placeholder="No assignee" value="" style="width:100%" title=""></dd></dl><dl id="milestoneOption" class="issue-option"><dt>Milestone</dt><dd><select id="milestoneId" name="milestoneId" data-format="milestone" data-container-css-class="fullsize"><option value="-1" selected="">No milestone</option><option value="5" data-state="open">Sprint 1</option></select></dd></dl><dl class="issue-option"><dt>Due date</dt><dd><div class="search search-bar"><input type="text" id="issueDueDate" name="dueDate" class="textbox full"><button type="button" class="search-btn btn-calendar"><i class="yobicon-calendar2"></i></button></div></dd></dl><dl class="issue-option"><dt>Label <a href="__BASE_PATH__/admin/sample/issue/labelsform" target="_blank" class="label-edit">[Edit]</a></dt><dd><select id="labelIds" name="labelIds" multiple="" data-search="labelIds" data-format="issuelabel" data-allow-clear="true" data-dropdown-css-class="issue-labels" data-container-css-class="issue-labels bordered fullsize" data-placeholder="Select label" data-close-on-select="false" class="hide"><option></option><optgroup label="type" data-category-id="3" data-category-is-exclusive="false"><option value="8" data-category-id="3" data-category-is-exclusive="false">bug</option></optgroup></select></dd></dl><input type="hidden" name="referCommentId" value="55"><input type="hidden" id="isDraft" name="isDraft" value="false"></div></div></div></form></div>
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

const EXPECTED_MARKDOWN_HEADER_SAMPLE = `
# This is an H1
## This is an H2
### This is an H3
`;

const EXPECTED_MARKDOWN_LIST_SAMPLE = `
- Red
    1. White
    2. Blue
- Green.
`;

const EXPECTED_MARKDOWN_CODE_SAMPLE = `
\`function test() {console.log("hello world");}\`

\`\`\`javascript
function test() {
  console.log("hello world");
}
\`\`\`
`;

const EXPECTED_MARKDOWN_TABLE_SAMPLE = `
| Default      | Align center | Align right |
| ------------ | :----------: | ------: |
| Carrot       | Red          | 1,000   |
| Banana       | Yellow       | 32,000  |
`;

function withLegacyEditor(html: string) {
  return html.replace(
    `<div data-toggle="markdown-editor" class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body" tabindex="2"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div data-toggle="markdown-editor" class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button" data-mode="edit">Edit</button></li><li><button type="button" data-mode="preview">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible">${LEGACY_MARKDOWN_HELP}<div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body" tabindex="2"></textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="ISSUE_POST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="ISSUE_POST"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`,
  );
}

test("project issue create form matches legacy issue/create.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);

  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator("#title")).toBeFocused();
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await page.locator("#title").press("Enter");
  await expect(page.locator("#editor-body-body")).toBeFocused();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Issue");
  const labelEdit = page.locator("dt .label-edit");
  await expect(labelEdit).toHaveAttribute("href", `${basePath}/admin/sample/issue/labelsform`);
  await expect(labelEdit).toHaveAttribute("target", "_blank");
  await expect(labelEdit).toHaveAttribute("class", "label-edit");
  await expect(labelEdit).toHaveText("[Edit]");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
  await expect(page.locator("#labelIds optgroup")).toHaveAttribute(
    "data-category-is-exclusive",
    "false",
  );
  await expectIssueFormSelect2InitializerHooksDropped(page);
  await expect(page.locator("input#assignee.bigdrop[name=assigneeLoginId]")).toHaveAttribute(
    "placeholder",
    "No assignee",
  );
  await expect(page.locator("input#assignee.bigdrop[name=assigneeLoginId]")).toHaveAttribute(
    "style",
    "width: 100%;",
  );
  await expect(page.locator("#milestoneOption > dt")).toHaveText("Milestone");
  await expect(page.locator("#milestoneId")).toHaveAttribute("data-format", "milestone");
  await expect(page.locator("#milestoneId")).toHaveAttribute(
    "data-container-css-class",
    "fullsize",
  );
  await expect(page.locator("#milestoneId")).toHaveValue("-1");
  await expect(page.locator("#milestoneId option").first()).toHaveText("No milestone");
  await expect(page.locator('#milestoneId option[value="5"]')).toHaveAttribute(
    "data-state",
    "open",
  );
  await expect(page.locator('#milestoneId option[value="5"]')).toHaveText("Sprint 1");
  const dueDateInput = page.locator("#issueDueDate");
  await expect(dueDateInput).toHaveAttribute("name", "dueDate");
  await expect(dueDateInput).toHaveClass("textbox full");
  await expect(dueDateInput).not.toHaveAttribute("data-toggle", "calendar");
  await expect(page.locator("#issueDueDate[data-toggle='calendar']")).toHaveCount(0);
  await expect(page.locator(".issue-option .search.search-bar #issueDueDate")).toHaveCount(1);
  await expect(
    page.locator(".issue-option .search.search-bar .search-btn.btn-calendar"),
  ).toHaveCount(1);
  const dueDateMetrics = await issueDueDateSearchBarMetrics(page);
  expect(dueDateMetrics.buttonInsideSearchBar).toBe(true);
  expect(dueDateMetrics.searchBarHasStableBox).toBe(true);
  expect(dueDateMetrics.searchBarLeftAlignedWithOption).toBe(true);
  expect(dueDateMetrics.searchBarBelowLabel).toBe(true);
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#edit-body"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs a[href="#preview-body"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-toggle="markdown-editor"] .nav-tabs [data-toggle="tab"]'),
  ).toHaveCount(0);
  const editTab = page.locator(
    '[data-toggle="markdown-editor"] .nav-tabs button[type="button"][data-mode="edit"]',
  );
  const previewTab = page.locator(
    '[data-toggle="markdown-editor"] .nav-tabs button[type="button"][data-mode="preview"]',
  );
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect
    .poll(() =>
      page
        .locator('[data-toggle="markdown-editor"] .nav-tabs > li')
        .evaluateAll((items) =>
          items.map((item) => item.textContent?.replace(/\s+/g, " ").trim() ?? ""),
        ),
    )
    .toEqual(["Edit", "Preview", "Add checklist", "Clear Temporary", ""]);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toBeVisible();
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toBeVisible();
  const initialEditorMetrics = await issueEditorTabMetrics(page);
  expect(initialEditorMetrics.tabCount).toBe(5);
  expect(initialEditorMetrics.editBeforePreview).toBe(true);
  expect(initialEditorMetrics.tabsContainedByWrap).toBe(true);
  expect(initialEditorMetrics.panesContainedByWrap).toBe(true);
  expect(initialEditorMetrics.textareaContainedByEditPane).toBe(true);
  expect(initialEditorMetrics.previewContainedByPreviewPane).toBe(true);
  expect(initialEditorMetrics.contentStartsBelowTabs).toBe(true);
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help-wrap > li")).toHaveCount(10);
  await expectMarkdownHelpPreText(page, ".markdownHeaders", EXPECTED_MARKDOWN_HEADER_SAMPLE);
  await expectMarkdownHelpPreText(page, ".markdownLists", EXPECTED_MARKDOWN_LIST_SAMPLE);
  await expectMarkdownHelpPreText(page, ".markdownCodes", EXPECTED_MARKDOWN_CODE_SAMPLE);
  await expectMarkdownHelpPreText(page, ".markdownTables", EXPECTED_MARKDOWN_TABLE_SAMPLE);
  const markdownHelp = page.locator(".markdown-help");
  await expect(markdownHelp.locator(".markdown-help-wrap > .active")).toHaveCount(0);
  await markdownHelp.locator('[data-toggle="markdown-help"][data-target="markdownLinks"]').click();
  await expect(
    markdownHelp.locator('.markdown-help-nav [data-target="markdownLinks"]'),
  ).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).toBeVisible();
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownHeaders")).not.toHaveClass(
    /active/,
  );
  await markdownHelp.locator('[data-toggle="markdown-help"][data-target="markdownLists"]').click();
  await expect(
    markdownHelp.locator('.markdown-help-nav [data-target="markdownLinks"]'),
  ).not.toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLinks")).not.toHaveClass(
    /active/,
  );
  await expect(
    markdownHelp.locator('.markdown-help-nav [data-target="markdownLists"]'),
  ).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).toBeVisible();
  await markdownHelp.locator('[data-toggle="markdown-help"][data-target="markdownLists"]').click();
  await expect(
    markdownHelp.locator('.markdown-help-nav [data-target="markdownLists"]'),
  ).not.toHaveClass(/active/);
  await expect(markdownHelp.locator(".markdown-help-wrap > .markdownLists")).not.toHaveClass(
    /active/,
  );
  const uploader = page.locator("#upload.upload-wrap.content-footer");
  await expect(uploader).toHaveAttribute("data-resource-type", "ISSUE_POST");
  await expect(uploader.locator(".attach-wrap")).toBeVisible();
  await expect(uploader.locator(".help.help-droppable")).toHaveText(
    "Drag & Drop files to attach here or",
  );
  await expect(uploader.locator(".fake-file-wrap")).toContainText("File upload");
  await expect(uploader.locator('input.file[name="filePath"]')).toHaveAttribute("multiple", "");
  await expect(uploader.locator("ul.attached-files.unstyled")).toHaveCount(1);
  await expect(uploader.locator(".help.help-pastable")).toHaveText("Paste the clipboard image");
  await expect(uploader.locator("p.right-txt.help")).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator('#issue-form script[type="text/x-jquery-tmpl"]')).toHaveCount(0);
  await expect(
    page.locator("#issue-form #tplAttachedFile, #issue-form #tplDropFilesHere"),
  ).toHaveCount(0);
  const cancelButton = await expectModernCancelControl(page);
  const issueFormUrl = page.url();

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "tab-kept";
  });
  await previewTab.click();
  await expect(page).toHaveURL(issueFormUrl);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toBeVisible();
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toBeVisible();
  const previewEditorMetrics = await issueEditorTabMetrics(page);
  expect(previewEditorMetrics.tabsContainedByWrap).toBe(true);
  expect(previewEditorMetrics.panesContainedByWrap).toBe(true);
  expect(previewEditorMetrics.previewContainedByPreviewPane).toBe(true);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("tab-kept");
  await editTab.click();
  await expect(page).toHaveURL(issueFormUrl);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toBeVisible();
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toBeVisible();

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(withLegacyEditor(EXPECTED_ISSUE_FORM_BODY)).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/issueform?cancel-test=1`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/issueform?cancel-test=1`);
  await cancelButton.click();
  await expect(page).toHaveURL(issueFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
});

test("project issue create form drops the legacy calendar hook while keeping due-date layout", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);

  await page.goto(`${basePath}/admin/sample/issueform`);
  const dueDateInput = page.locator("#issueDueDate");
  await expect(dueDateInput).toHaveAttribute("name", "dueDate");
  await expect(dueDateInput).toHaveClass("textbox full");
  await expect(dueDateInput).not.toHaveAttribute("data-toggle", "calendar");
  await expect(page.locator("#issueDueDate[data-toggle='calendar']")).toHaveCount(0);
  await expect(page.locator(".issue-option .search.search-bar #issueDueDate")).toHaveCount(1);
  await expect(
    page.locator(".issue-option .search.search-bar .search-btn.btn-calendar"),
  ).toHaveCount(1);

  const dueDateMetrics = await issueDueDateSearchBarMetrics(page);
  expect(dueDateMetrics.buttonInsideSearchBar).toBe(true);
  expect(dueDateMetrics.searchBarHasStableBox).toBe(true);
  expect(dueDateMetrics.searchBarLeftAlignedWithOption).toBe(true);
  expect(dueDateMetrics.searchBarBelowLabel).toBe(true);
});

test("project issue create form drops legacy select2 initializer hooks while keeping selector metadata", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);

  await page.goto(`${basePath}/admin/sample/issueform`);
  await expectIssueFormSelect2InitializerHooksDropped(page);

  await expect(page.locator("#milestoneId")).toHaveValue("-1");
  await expect(page.locator("#targetProjectId")).toBeDisabled();
  await expect(page.locator("#parentId")).toBeDisabled();
  await expect(page.locator("#labelIds optgroup")).toHaveAttribute(
    "data-category-is-exclusive",
    "false",
  );

  await page.locator(".subtask-message").click();
  await expect(page.locator("#targetProjectId")).toBeEnabled();
  await expect(page.locator("#parentId")).toBeEnabled();
  await expectIssueFormSelect2InitializerHooksDropped(page);
});

test("project issue create form parent state matches legacy partial_select_subtask.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);

  await page.goto(`${basePath}/admin/sample/issueform?parentIssueId=42&commentId=55`);
  await expect(page.locator(".subtask-wrap")).toHaveClass("subtask-wrap show");
  await expect(page.locator("#targetProjectId")).toBeEnabled();
  await expect(page.locator("#parentId")).toHaveValue("42");
  await expect(page.locator("#targetProjectId option")).toHaveAttribute(
    "data-avatar-url",
    "/assets/images/project_default_logo.png",
  );
  await expectIssueFormSelect2InitializerHooksDropped(page);
  await expectModernCancelControl(page);

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(withLegacyEditor(EXPECTED_PARENT_ISSUE_FORM_BODY)).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

test("project issue create form keeps the legacy protected project title and group search scope", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const ownerName = "weblabs";
  const projectName = "portal";
  await mockProjectIssueForm(page, {
    ownerName,
    project: {
      isProtected: true,
      organizationName: ownerName,
      projectScope: "protected",
    },
    projectName,
  });

  await page.goto(`${basePath}/${ownerName}/${projectName}/issueform`);
  await expect(page).toHaveTitle("New issue - weblabs/portal");

  await expect(page.locator(".gnb-outer")).toHaveClass("gnb-outer project-header");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/${ownerName}/${projectName}/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect
    .poll(() =>
      page
        .locator(".gnb-search-form [data-toggle='search-scope']")
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-action") ?? ""),
        ),
    )
    .toEqual([
      `${basePath}/${ownerName}/${projectName}/search`,
      `${basePath}/organizations/${ownerName}/search`,
      `${basePath}/search`,
    ]);

  const headerMetrics = await protectedIssueFormHeaderSearchScopeMetrics(page);
  expect(headerMetrics.gnbClassName).toBe("gnb-outer project-header");
  expect(headerMetrics.pageWrapTopAtOrBelowMenu).toBe(true);
  expect(headerMetrics.scopeTopWithinNavbar).toBe(true);
  expect(headerMetrics.scopeBottomWithinNavbar).toBe(true);
  expect(headerMetrics.searchTopWithinNavbar).toBe(true);
  expect(headerMetrics.searchBottomWithinNavbar).toBe(true);
  expect(headerMetrics.searchLeftWithinNavbar).toBe(true);
  expect(headerMetrics.searchRightWithinNavbar).toBe(true);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator(".gnb-search-form [data-toggle='search-scope']").nth(1).click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/${ownerName}/search`,
  );
});

test("project issue create form empty title submit uses legacy alert and refocus behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);
  let createRequestCount = 0;
  await page.route("**/api/v1/owners/admin/projects/sample/issues", async (route) => {
    createRequestCount += 1;
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      body: JSON.stringify({ message: "unexpected create request" }),
    });
  });

  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator("#title")).toHaveClass("text title ");
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#issue-form dd > div.message")).toHaveCount(0);

  const dialogMessages: string[] = [];
  page.once("dialog", async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.accept();
  });
  await page.locator("#button-save").click();

  expect(dialogMessages).toEqual(["Issue title is a required field."]);
  await expect(page.locator("#title")).toHaveClass("text title ");
  await expect(page.locator("#title")).toBeFocused();
  await expect(page.locator("#issue-form dd > div.message")).toHaveCount(0);
  expect(createRequestCount).toBe(0);

  await page.locator("#title").fill("Legacy title");
  await expect(page.locator("#title")).toHaveClass("text title ");
  await expect(page.locator("#issue-form dd > div.message")).toHaveCount(0);
});

test("project issue create form invalid due date uses legacy notification and refocus behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);
  let createRequestCount = 0;
  await page.route("**/api/v1/projects/admin/sample/issues", async (route) => {
    createRequestCount += 1;
    await route.fulfill({
      contentType: "application/json",
      status: 500,
      body: JSON.stringify({ message: "unexpected create request" }),
    });
  });

  await page.goto(`${basePath}/admin/sample/issueform`);
  await page.locator("#title").fill("Legacy title");
  await page.locator("#issueDueDate").fill("not-a-date");
  await page.locator("#button-save").click();

  await expect(page.locator(".yobiToasts .toast .msg")).toHaveText(
    "Issue due date is not valid date type.",
  );
  await expect(page.locator("#issueDueDate")).toBeFocused();
  expect(createRequestCount).toBe(0);
});

test("project issue create form submits draft intent without mutating legacy hidden input DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page);
  const createPayloads: Array<Record<string, unknown>> = [];
  await page.route("**/api/v1/projects/admin/sample/issues", async (route) => {
    createPayloads.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ issueNumber: 101 }),
    });
  });

  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator('input#isDraft[name="isDraft"]')).toHaveAttribute("value", "false");
  await expect(page.locator("#draft-save-btn")).toHaveAttribute(
    "title",
    "Only you can see it until you publish",
  );
  await page.locator("#title").fill("Normal save");
  await page.locator("#issueDueDate").fill("2026-07-09");
  await page.locator("#button-save").click();
  await expect.poll(() => createPayloads.length).toBe(1);
  expect(createPayloads[0]?.isDraft).toBe(false);
  expect(createPayloads[0]?.dueDate).toBe("2026-07-09");

  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator('input#isDraft[name="isDraft"]')).toHaveAttribute("value", "false");
  await page.locator("#title").fill("Draft save");
  await page.locator("#issueDueDate").fill("2026-07-10");
  await page.locator("#draft-save-btn").click();
  await expect.poll(() => createPayloads.length).toBe(2);
  expect(createPayloads[1]?.isDraft).toBe(true);
  expect(createPayloads[1]?.dueDate).toBe("2026-07-10");
});

test("project issue create form renders legacy new milestone button when no open milestones exist", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueForm(page, { milestones: [] });

  await page.goto(`${basePath}/admin/sample/issueform`);

  await expect(page.locator("#milestoneOption > dt")).toHaveText("Milestone");
  await expect(page.locator("#milestoneId")).toHaveCount(0);
  const newMilestone = page.locator("#milestoneOption .ybtn.ybtn-small.ybtn-fullsize");
  await expect(newMilestone).toHaveText("New milestone");
  await expect(newMilestone).toHaveAttribute("href", `${basePath}/admin/sample/newMilestoneForm`);
  await expect(newMilestone).toHaveAttribute("target", "_blank");
});

test("project issue create form falls back to the legacy default logo when project logo is blank", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await mockProjectIssueForm(page, { project: { logoUrl: "" } });

  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute(
    "src",
    "/assets/images/project_default_logo.png",
  );
  await expect(page.locator('.project-header-avatar img[src=""]')).toHaveCount(0);
  await expect(page.locator("#targetProjectId option")).toHaveAttribute(
    "data-avatar-url",
    "/assets/images/project_default_logo.png",
  );
  expect(
    consoleErrors.find((message) =>
      message.includes('An empty string ("") was passed to the src attribute'),
    ),
  ).toBeUndefined();
});

test("project issue create form source uses TanStack Link and no uploader template remnants", () => {
  const source = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/issueform.tsx", import.meta.url),
    "utf8",
  );
  const sharedMarkdownHelpSource = readFileSync(
    new URL("../src/routes/-legacy-markdown-help.tsx", import.meta.url),
    "utf8",
  );

  expect(source).toContain("<Link");
  expect(source).toContain(
    '<title>{`${t("issue.menu.new")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(source).toContain('className="label-edit"');
  expect(source).toContain('import { LegacyMarkdownHelp } from "../../-legacy-markdown-help";');
  expect(source).toContain("router.history.back()");
  expect(source).toContain('t("issue.error.emptyTitle")');
  expect(source).toContain('t("issue.error.invalid.duedate")');
  expect(source).not.toContain("useProjectIssueFormDocumentTitle");
  expect(source).not.toContain("document.title");
  expect(source).not.toContain('globalThis["document"]');
  expect(source).not.toContain("window.history.back()");
  expect(source).not.toContain('t("validation.required")');
  expect(source).not.toContain('querySelector<HTMLInputElement>("#isDraft")');
  expect(source).not.toContain('setAttribute("value", "true")');
  expect(source).not.toMatch(/setAttribute\(["']tabindex["']/u);
  expect(source).toContain("tabIndex={1}");
  expect(source).toContain("tabIndex={2}");
  expect(source).toContain('data-toggle="markdown-editor"');
  expect(source).not.toContain('data-toggle="select2"');
  expect(source).not.toContain('data-toggle="tab"');
  expect(source).not.toMatch(/<a\b[^>]*className="label-edit"/u);
  expect(source).not.toContain("dangerouslySetInnerHTML");
  expect(source).not.toContain("legacyMarkdownHelpHtml");
  expect(source).not.toContain("legacyMarkdownHelpTemplate");
  expect(source).not.toContain("markdown.scala.html?raw");
  expect(source).not.toContain("__html");
  expect(source).not.toContain("document.");
  expect(source).not.toContain("addEventListener");
  expect(source).not.toContain("classList");
  expect(source).not.toContain("style.display");
  expect(source).not.toContain("tippy(");
  expect(source).not.toContain(".replace(/@Messages");
  expect(source).not.toContain(".replace(/<script");
  expect(source).not.toContain("attachedFileTemplate");
  expect(source).not.toContain("dropFilesHereTemplate");
  expect(source).not.toContain("text/x-jquery-tmpl");
  expect(source).not.toContain("tplAttachedFile");
  expect(source).not.toContain("tplDropFilesHere");
  expect(sharedMarkdownHelpSource).not.toMatch(/<a\b/u);
  expect(sharedMarkdownHelpSource).not.toContain("document.");
  expect(sharedMarkdownHelpSource).not.toContain("addEventListener");
  expect(sharedMarkdownHelpSource).not.toContain("classList");
  expect(sharedMarkdownHelpSource).not.toContain("style.display");
  expect(sharedMarkdownHelpSource).toContain('<Link to="http://demo.yobi.io/yobi/yobi/issue/2">');
});

async function mockProjectIssueForm(
  page: Page,
  options: {
    ownerName?: string;
    milestones?: Array<Record<string, unknown>>;
    project?: Record<string, unknown>;
    projectName?: string;
  } = {},
) {
  const ownerName = options.ownerName ?? "admin";
  const projectName = options.projectName ?? "sample";
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
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container`,
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
          ownerName,
          projectName,
          vcs: "GIT",
          viewerCanUpdate: true,
          ...options.project,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/labels`,
    async (route) => {
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
    },
  );
  await page.route(
    `**/api/v1/projects/${ownerName}/${projectName}/issues/parent-options**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          items: [{ id: 42, issueNumber: 11, selected: false, title: "Existing parent" }],
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/milestones**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          milestones: options.milestones ?? [
            {
              attachments: [],
              closedIssueCount: 0,
              closedIssues: [],
              completionPercent: 0,
              contentsHtml: "",
              contentsMarkdown: "",
              dueDateLabel: "",
              id: "5",
              openIssueCount: 0,
              openIssues: [],
              state: "open",
              title: "Sprint 1",
              viewerCanDelete: true,
              viewerCanUpdate: true,
            },
          ],
        }),
      });
    },
  );
}

async function protectedIssueFormHeaderSearchScopeMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>(".gnb-outer.project-header");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const search = document.querySelector<HTMLElement>(".gnb-search-form .search-box.select");
    if (!navbar || !menu || !pageWrap || !scope || !search) {
      throw new Error("Missing protected issue form shell elements");
    }

    const navbarRect = navbar.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const pageWrapRect = pageWrap.getBoundingClientRect();
    const scopeRect = scope.getBoundingClientRect();
    const searchRect = search.getBoundingClientRect();
    return {
      gnbClassName: navbar.className,
      pageWrapTopAtOrBelowMenu: Math.round(pageWrapRect.top) >= Math.round(menuRect.bottom),
      scopeBottomWithinNavbar: Math.round(scopeRect.bottom) <= Math.round(navbarRect.bottom),
      scopeTopWithinNavbar: Math.round(scopeRect.top) >= Math.round(navbarRect.top),
      searchBottomWithinNavbar: Math.round(searchRect.bottom) <= Math.round(navbarRect.bottom),
      searchLeftWithinNavbar: Math.round(searchRect.left) >= Math.round(navbarRect.left),
      searchRightWithinNavbar: Math.round(searchRect.right) <= Math.round(navbarRect.right),
      searchTopWithinNavbar: Math.round(searchRect.top) >= Math.round(navbarRect.top),
    };
  });
}

async function issueDueDateSearchBarMetrics(page: Page) {
  return page.evaluate(() => {
    const option = document.querySelector<HTMLElement>(".issue-option:has(#issueDueDate)");
    const label = document.querySelector<HTMLElement>(".issue-option:has(#issueDueDate) > dt");
    const searchBar = document.querySelector<HTMLElement>(
      ".issue-option .search.search-bar:has(#issueDueDate)",
    );
    const button = document.querySelector<HTMLElement>(
      ".issue-option .search.search-bar .search-btn.btn-calendar",
    );
    if (!option || !label || !searchBar || !button) {
      throw new Error("Missing issue due-date search-bar elements");
    }

    const optionRect = option.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const searchBarRect = searchBar.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      buttonInsideSearchBar:
        Math.round(buttonRect.top) >= Math.round(searchBarRect.top) &&
        Math.round(buttonRect.bottom) <= Math.round(searchBarRect.bottom) &&
        Math.round(buttonRect.right) <= Math.round(searchBarRect.right),
      searchBarBelowLabel: Math.round(searchBarRect.top) >= Math.round(labelRect.bottom),
      searchBarHasStableBox:
        Math.round(searchBarRect.width) >= 100 && Math.round(searchBarRect.height) >= 20,
      searchBarLeftAlignedWithOption: Math.round(searchBarRect.left) >= Math.round(optionRect.left),
    };
  });
}

async function issueEditorTabMetrics(page: Page) {
  return page.evaluate(() => {
    const wrap = document.querySelector<HTMLElement>('[data-toggle="markdown-editor"]');
    const tabs = document.querySelector<HTMLElement>('[data-toggle="markdown-editor"] .nav-tabs');
    const tabItems = Array.from(
      document.querySelectorAll<HTMLElement>('[data-toggle="markdown-editor"] .nav-tabs > li'),
    );
    const editButton = document.querySelector<HTMLElement>(
      '[data-toggle="markdown-editor"] .nav-tabs button[data-mode="edit"]',
    );
    const previewButton = document.querySelector<HTMLElement>(
      '[data-toggle="markdown-editor"] .nav-tabs button[data-mode="preview"]',
    );
    const tabContent = document.querySelector<HTMLElement>(
      '[data-toggle="markdown-editor"] .tab-content',
    );
    const editPane = document.querySelector<HTMLElement>("#edit-body");
    const previewPane = document.querySelector<HTMLElement>("#preview-body");
    const textarea = document.querySelector<HTMLElement>("#editor-body-body");
    const preview = document.querySelector<HTMLElement>("#preview-body .markdown-preview");
    if (
      !wrap ||
      !tabs ||
      !editButton ||
      !previewButton ||
      !tabContent ||
      !editPane ||
      !previewPane ||
      !textarea ||
      !preview
    ) {
      throw new Error("Missing issue form editor elements");
    }

    const wrapRect = wrap.getBoundingClientRect();
    const tabsRect = tabs.getBoundingClientRect();
    const editButtonRect = editButton.getBoundingClientRect();
    const previewButtonRect = previewButton.getBoundingClientRect();
    const tabContentRect = tabContent.getBoundingClientRect();
    const editPaneRect = editPane.getBoundingClientRect();
    const previewPaneRect = previewPane.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    return {
      contentStartsBelowTabs: Math.round(tabContentRect.top) >= Math.round(tabsRect.bottom),
      editBeforePreview: Math.round(editButtonRect.right) <= Math.round(previewButtonRect.left),
      panesContainedByWrap:
        Math.round(tabContentRect.left) >= Math.round(wrapRect.left) &&
        Math.round(tabContentRect.right) <= Math.round(wrapRect.right),
      previewContainedByPreviewPane:
        Math.round(previewRect.left) >= Math.round(previewPaneRect.left) &&
        Math.round(previewRect.right) <= Math.round(previewPaneRect.right),
      tabCount: tabItems.length,
      tabsContainedByWrap:
        Math.round(tabsRect.left) >= Math.round(wrapRect.left) &&
        Math.round(tabsRect.right) <= Math.round(wrapRect.right),
      textareaContainedByEditPane:
        Math.round(textareaRect.left) >= Math.round(editPaneRect.left) &&
        Math.round(textareaRect.right) <= Math.round(editPaneRect.right),
    };
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

async function expectIssueFormSelect2InitializerHooksDropped(page: Page) {
  const selectors = ["#milestoneId", "#targetProjectId", "#parentId", "#labelIds"] as const;
  for (const selector of selectors) {
    const control = page.locator(selector);
    await expect(control).not.toHaveAttribute("data-toggle", "select2");
  }

  await expect(page.locator("#milestoneId")).toHaveAttribute("name", "milestoneId");
  await expect(page.locator("#milestoneId")).toHaveAttribute("data-format", "milestone");
  await expect(page.locator("#milestoneId")).toHaveAttribute(
    "data-container-css-class",
    "fullsize",
  );
  await expect(page.locator("#targetProjectId")).toHaveAttribute("name", "targetProjectId");
  await expect(page.locator("#targetProjectId")).toHaveAttribute("data-format", "projects");
  await expect(page.locator("#targetProjectId")).toHaveAttribute(
    "data-placeholder",
    "Choose projects",
  );
  await expect(page.locator("#targetProjectId")).toHaveAttribute(
    "data-container-css-class",
    "fullsize",
  );
  await expect(page.locator("#parentId")).toHaveAttribute("name", "parentIssueId");
  await expect(page.locator("#parentId")).toHaveAttribute("data-format", "issues");
  await expect(page.locator("#parentId")).toHaveAttribute("data-placeholder", "Choose projects");
  await expect(page.locator("#parentId")).toHaveAttribute("data-container-css-class", "fullsize");
  await expect(page.locator("#labelIds")).toHaveAttribute("name", "labelIds");
  await expect(page.locator("#labelIds")).toHaveAttribute("multiple", "");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-search", "labelIds");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-format", "issuelabel");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-allow-clear", "true");
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-dropdown-css-class",
    "issue-labels",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute(
    "data-container-css-class",
    "issue-labels bordered fullsize",
  );
  await expect(page.locator("#labelIds")).toHaveAttribute("data-placeholder", "Select label");
  await expect(page.locator("#labelIds")).toHaveAttribute("data-close-on-select", "false");
}

async function expectMarkdownHelpPreText(page: Page, sectionSelector: string, expected: string) {
  await expect
    .poll(() =>
      page
        .locator(`.markdown-help-item${sectionSelector} .markdwon-syntax pre`)
        .evaluate((node) => node.textContent ?? ""),
    )
    .toBe(expected);
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
