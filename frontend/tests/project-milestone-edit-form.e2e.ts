import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const EXPECTED_EDIT_FORM_BODY = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/milestone/5" id="milestone-form" enctype="multipart/form-data"><div class="row-fluid"><div class="span12"><dl><dd><input type="text" id="title" name="title" value="v1.0" class="zen-mode text title " maxlength="250" tabindex="1" placeholder="Title"></dd></dl></div><div class="row-fluid"><div class="span9 span-left-pane"><dl><dd style="position:relative"><div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible"><div class="markdown-help"></div><div id="edit-content-body" class="tab-pane active"><div class="textarea-box"><textarea name="contents" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-contents-content-body" tabindex="2">Release scope</textarea></div></div><div id="preview-content-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div></dd></dl><div id="upload" class="upload-wrap content-footer" data-resource-type="MILESTONE" data-resource-id="5"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div><div class=" actrow right-txt"><button type="submit" class="ybtn ybtn-info">Save</button><a href="__BASE_PATH__/admin/sample/milestones" class="ybtn">Cancel</a></div></div><div class="span3 span-hard-wrap"><dl class="issue-option"><dt>Milestone status</dt><dd><div><input type="radio" name="state" value="OPEN" id="milestone-open" class="radio-btn" checked=""><label for="milestone-open" class="bold">Open</label>&nbsp;<input type="radio" name="state" value="CLOSED" id="milestone-close" class="radio-btn"><label for="milestone-close" class="bold">Closed</label></div></dd></dl><dl class="issue-option"><dt>Choose due date</dt><dd><div><label for="dueDate"><input type="text" name="dueDate" id="dueDate" class="validate due-date" value="2026-08-31"></label><div id="datepicker" class="date-picker"></div></div></dd></dl></div></div></div></form></div>
`;

test("project milestone edit form matches legacy milestone/edit.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectMilestoneEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/milestone/5/editform`);
  await expect(page.locator("#milestone-form")).toBeVisible();
  await expect(page).toHaveTitle("Edit milestone - admin/sample");
  expect(await page.evaluate(() => document.head.querySelector("title")?.textContent)).toBe(
    "Edit milestone - admin/sample",
  );
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator("#milestone-open")).toBeChecked();
  await expect(page.locator("#dueDate")).toHaveValue("2026-08-31");

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(page, EXPECTED_EDIT_FORM_BODY.replaceAll("__BASE_PATH__", basePath)),
  );
  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#editor-contents-content-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#editor-contents-content-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator("#editor-contents-content-body")).toHaveValue("Release scope");
  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  const editor = milestoneEditMarkdownEditor(page);
  await expect(editor).toHaveClass("mt10");
  await expect(editor.locator('.nav-tabs a[href="#edit-content-body"]')).toHaveCount(0);
  await expect(editor.locator('.nav-tabs a[href="#preview-content-body"]')).toHaveCount(0);
  const editTab = editor.locator(".nav-tabs > li").nth(0).getByRole("button", { name: "Edit" });
  const previewTab = editor
    .locator(".nav-tabs > li")
    .nth(1)
    .getByRole("button", { name: "Preview" });
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(editTab).not.toHaveAttribute("data-mode", /.+/u);
  await expect(previewTab).not.toHaveAttribute("data-mode", /.+/u);
  await expect(editTab).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(previewTab).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveCSS("display", "block");
  await expect(page.locator("#preview-content-body")).toHaveCSS("display", "none");
  const editorTabMetrics = await readMilestoneEditorTabMetrics(page);
  expect(editorTabMetrics).toMatchObject({
    buttonOrder: ["Edit", "Preview", "Add checklist", "Clear Temporary", ""],
    editButtonHref: null,
    editButtonMode: null,
    editButtonToggle: null,
    editButtonType: "button",
    editPaneDisplay: "block",
    previewButtonHref: null,
    previewButtonMode: null,
    previewButtonToggle: null,
    previewButtonType: "button",
    previewPaneDisplay: "none",
  });
  expect(editorTabMetrics.tabContentTop).toBeGreaterThanOrEqual(editorTabMetrics.navBottom);
  expect(editorTabMetrics.textareaTop).toBeGreaterThanOrEqual(editorTabMetrics.tabContentTop);
  expect(editorTabMetrics.textareaLeft).toBeGreaterThanOrEqual(editorTabMetrics.tabContentLeft);
  expect(editorTabMetrics.textareaRight).toBeLessThanOrEqual(editorTabMetrics.tabContentRight);
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help .label")).toHaveText("Markdown help");
  await expect(page.locator(".markdown-help-wrap > .markdown-help-item")).toHaveCount(10);
  await expect(page.locator(".markdown-help-item.markdownShortLinks")).toContainText("Issue no:");
  await expect(page.locator("#upload")).toBeVisible();
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-type", "MILESTONE");
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-id", "5");
  await expect(page.locator("#upload .attach-wrap")).toHaveCount(1);
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .attached-files.unstyled")).toHaveCount(1);
  await expect(page.locator("#upload .right-txt.help")).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(
    page.locator('.content-wrap.frm-wrap script[type="text/x-jquery-tmpl"]'),
  ).toHaveCount(0);
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);
  const cancelLink = page.locator('.actrow a.ybtn:has-text("Cancel")');
  await expect(cancelLink).toHaveCount(1);
  await expect(cancelLink).toHaveAttribute("href", `${basePath}/admin/sample/milestones`);
  await expect(cancelLink).toHaveAttribute("class", "ybtn");
  await expect(cancelLink).toHaveText("Cancel");
  await expect(cancelLink).not.toHaveAttribute("aria-current", /.+/u);
  await expect(cancelLink).not.toHaveAttribute("data-status", /.+/u);
  expect(await readMilestoneEditFormMetrics(page)).toEqual({
    actionRowDisplay: "block",
    actionRowMarginTop: "20px",
    contentFooterBackground: "rgb(245, 245, 245)",
    contentFooterPadding: "10px 20px",
    contentWrapWidth: 1260,
    dueDateMinHeight: "30px",
    issueOptionDdMargin: "0px",
    issueOptionDtMarginBottom: "5px",
    issueOptionMarginBottom: "16px",
    issueOptionWidth: 295,
    leftPaneWidth: 938,
    rightPaneMarginLeft: 27,
    rightPaneWidth: 295,
    titleBorderBottomColor: "rgb(243, 108, 34)",
    titleFontSize: "18px",
    titleMarginBottom: "15px",
    titleMarginTop: "15px",
    titleWidth: 1222,
  });

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "edit-editor-tabs";
  });
  const urlBeforeEditorTabClick = page.url();
  await previewTab.click();
  await expect(editTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveCSS("display", "none");
  await expect(page.locator("#preview-content-body")).toHaveCSS("display", "block");
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("edit-editor-tabs");
  await editTab.click();
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveCSS("display", "block");
  await expect(page.locator("#preview-content-body")).toHaveCSS("display", "none");
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("edit-editor-tabs");

  await page.fill("#title", "v1.0 patched");
  await page.check("#milestone-close");
  const patchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/milestones/5") &&
      response.request().method() === "PATCH",
  );
  await page.click('#milestone-form button[type="submit"]');
  await patchResponsePromise;
  expect(patchRequests).toEqual([
    {
      attachmentIds: [],
      contentsMarkdown: "Release scope",
      dueDate: "2026-08-31",
      state: "CLOSED",
      title: "v1.0 patched",
    },
  ]);
});

test("project milestone edit form uses legacy project-scoped GNB search shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const editFormUrl = `${basePath}/admin/sample/milestone/5/editform`;
  const patchRequests: unknown[] = [];
  await mockProjectMilestoneEditForm(page, patchRequests);

  await page.goto(editFormUrl);
  await expect(page.locator("#milestone-form")).toBeVisible();
  const shell = milestoneEditScopedShell(page);
  await expect(shell).toBeVisible();
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");

  const scopeButtons = shell.locator('.gnb-search-form [data-toggle="search-scope"]');
  await expect(scopeButtons).toHaveText(["This Project", "All Projects"]);
  await expect(scopeButtons.nth(0)).toHaveAttribute(
    "data-action",
    `${basePath}/admin/sample/search`,
  );
  await expect(scopeButtons.nth(1)).toHaveAttribute("data-action", `${basePath}/search`);
  const urlBeforeScopeChange = page.url();

  await shell.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  expect(page.url()).toBe(urlBeforeScopeChange);
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await shell.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(0).click();
  expect(page.url()).toBe(urlBeforeScopeChange);
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );

  const metrics = await navbarSearchMetrics(page);
  expect(metrics).not.toBeNull();
  expect(metrics!.form.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.form.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.form.right).toBeLessThanOrEqual(metrics!.navbar.right);
  expect(metrics!.scope.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.scope.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.searchBox.top).toBeGreaterThanOrEqual(metrics!.navbar.top);
  expect(metrics!.searchBox.bottom).toBeLessThanOrEqual(metrics!.navbar.bottom);
  expect(metrics!.input.left).toBeGreaterThanOrEqual(metrics!.searchBox.left);
  expect(metrics!.input.right).toBeLessThanOrEqual(metrics!.searchBox.right);
});

test("project milestone edit form exposes group search scope when project org data exists", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const editFormUrl = `${basePath}/admin/sample/milestone/5/editform`;
  const patchRequests: unknown[] = [];
  await mockProjectMilestoneEditForm(page, patchRequests, {
    project: { isProtected: true, organizationName: "admin" },
  });

  await page.goto(editFormUrl);
  await expect(page.locator("#milestone-form")).toBeVisible();
  const shell = milestoneEditScopedShell(page);
  const scopeButtons = shell.locator('.gnb-search-form [data-toggle="search-scope"]');
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(scopeButtons.nth(1)).toHaveAttribute(
    "data-action",
    `${basePath}/organizations/admin/search`,
  );
  const urlBeforeScopeChange = page.url();

  await shell.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  expect(page.url()).toBe(urlBeforeScopeChange);
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );
});

test("project milestone edit form preserves legacy write validation and focus behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectMilestoneEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/milestone/5/editform`);
  await expect(page.locator("#milestone-form")).toBeVisible();
  await expect(page.locator("#title")).toBeFocused();
  await page.locator("#title").press("Enter");
  await expect(page.locator("#editor-contents-content-body")).toBeFocused();

  await page.fill("#title", "");
  const titleDialogPromise = acceptNextAlert(page);
  await page.click('#milestone-form button[type="submit"]');
  await expect(titleDialogPromise).resolves.toBe("Milestone title is a required field.");

  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/5/editform?state=open`);
  expect(patchRequests).toEqual([]);
  await expect(page.locator("#title")).toHaveClass("zen-mode text title ");
  await expect(page.locator("#title + .message")).toHaveCount(0);

  await page.fill("#title", "v1.0 patched");
  await page.fill("#editor-contents-content-body", "");
  const contentDialogPromise = acceptNextAlert(page);
  await page.click('#milestone-form button[type="submit"]');
  await expect(contentDialogPromise).resolves.toBe("Milestone description is a required field");
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/5/editform?state=open`);
  expect(patchRequests).toEqual([]);

  await page.fill("#editor-contents-content-body", "Release scope");
  await page.fill("#dueDate", "08/31/2026");
  const dueDateDialogPromise = acceptNextAlert(page);
  await page.click('#milestone-form button[type="submit"]');
  await expect(dueDateDialogPromise).resolves.toBe(
    "Invalid format. Enter the due date in YYYY-MM-DD format.",
  );
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/5/editform?state=open`);
  expect(patchRequests).toEqual([]);
  await expect(page.locator("#title")).toHaveClass("zen-mode text title ");
  await expect(page.locator("#title + .message")).toHaveCount(0);
});

test("project milestone edit form route uses typed Link and no uploader jquery templates", () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId/editform.tsx",
    "utf8",
  );

  expect(routeSource).toContain('to="/$ownerName/$projectName/milestones"');
  expect(routeSource).not.toContain("createLink");
  expect(routeSource).toContain(
    'import { LegacyMarkdownHelp } from "../../../../-legacy-markdown-help";',
  );
  expect(routeSource).toContain("<LegacyMarkdownHelp />");
  expect(routeSource).toContain('"aria-current": undefined');
  expect(routeSource).toContain('className: "ybtn"');
  expect(routeSource).toContain('"data-status": undefined');
  expect(routeSource).not.toContain("<a");
  expect(routeSource).not.toContain("<a\n                      href={prefixBasePath");
  expect(routeSource).not.toContain("help/markdown.scala.html");
  expect(routeSource).not.toContain("legacyMarkdownHelpTemplate");
  expect(routeSource).not.toContain("legacyMarkdownHelpHtml");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(routeSource).not.toContain(".replace(/@Messages");
  expect(routeSource).not.toContain("attachedFileTemplate");
  expect(routeSource).not.toContain("dropFilesHereTemplate");
  expect(routeSource).not.toContain("text/x-jquery-tmpl");
  expect(routeSource).not.toContain("tplAttachedFile");
  expect(routeSource).not.toContain("tplDropFilesHere");
  expect(routeSource).toContain('t("milestone.error.title")');
  expect(routeSource).toContain('t("milestone.error.content")');
  expect(routeSource).toContain('t("milestone.error.duedateFormat")');
  expect(routeSource).toContain('event.key === "Enter"');
  expect(routeSource).toContain("tabIndex={1}");
  expect(routeSource).toContain("tabIndex={2}");
  expect(routeSource).not.toContain('data-toggle="markdown-editor"');
  expect(routeSource).not.toContain('data-toggle="tab"');
  expect(routeSource).not.toContain("data-mode");
  expect(routeSource).toContain("projectSearchScope={projectSearchScope}");
  expect(routeSource).toContain("function projectSearchScopeOrganizationName");
  expect(routeSource).toContain(
    '<title>{`${t("title.editMilestone")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(routeSource).not.toMatch(
    /document\.title|window\.document\.title|window\.parent\.document\.title|globalThis\.document|globalThis\["document"\]\.title/u,
  );
  expect(routeSource).not.toMatch(/useEffect\(\s*\(\)\s*=>\s*\{[^}]*title/u);
  expect(routeSource).not.toContain('setAttribute("tabindex"');
  expect(routeSource).not.toContain("tabIndexValue");
  expect(routeSource).not.toContain('t("validation.required")');
  expect(routeSource).not.toContain("document.");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("classList");
  expect(routeSource).not.toContain("style.display");
});

async function mockProjectMilestoneEditForm(
  page: Page,
  patchRequests: unknown[],
  overrides: {
    project?: Partial<{
      backgroundImageUrl: string;
      enrollmentRequestCount: number;
      id: number;
      isFavorite: boolean;
      isForkedFromOrigin: boolean;
      isPrivate: boolean;
      isProtected: boolean;
      logoUrl: string;
      organizationName: string;
      ownerName: string;
      projectName: string;
      vcs: string;
      viewerCanUpdate: boolean;
    }>;
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
        ...overrides.project,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5", async (route) => {
    if (route.request().method() === "PATCH") {
      patchRequests.push(route.request().postDataJSON());
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestone: {
          attachments: [],
          closedIssueCount: 0,
          closedIssues: [],
          completionPercent: 0,
          contentsHtml: "<p>Release scope</p>",
          contentsMarkdown: "Release scope",
          dueDateLabel: "2026-08-31",
          id: 5,
          openIssueCount: 1,
          openIssues: [],
          state: "open",
          title: "v1.0",
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      }),
    });
  });
}

function acceptNextAlert(page: Page) {
  return new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      const message = dialog.message();
      await dialog.accept();
      resolve(message);
    });
  });
}

function milestoneEditScopedShell(page: Page) {
  return page.locator("header.gnb-outer.project-header").last();
}

async function readMilestoneEditFormMetrics(page: Page) {
  return page.evaluate(() => {
    const contentWrap = document.querySelector<HTMLElement>(".content-wrap.frm-wrap");
    const title = contentWrap?.querySelector<HTMLElement>("#title");
    const leftPane = contentWrap?.querySelector<HTMLElement>(".span-left-pane");
    const rightPane = contentWrap?.querySelector<HTMLElement>(".span-hard-wrap");
    const issueOption = contentWrap?.querySelector<HTMLElement>(".issue-option");
    const issueOptionDt = contentWrap?.querySelector<HTMLElement>(".issue-option dt");
    const issueOptionDd = contentWrap?.querySelector<HTMLElement>(".issue-option dd");
    const dueDate = contentWrap?.querySelector<HTMLElement>("#dueDate");
    const contentFooter = contentWrap?.querySelector<HTMLElement>(".content-footer");
    const actionRow = contentWrap?.querySelector<HTMLElement>(".span-left-pane > .actrow");
    const missing = Object.entries({
      actionRow,
      contentFooter,
      contentWrap,
      dueDate,
      issueOption,
      issueOptionDd,
      issueOptionDt,
      leftPane,
      rightPane,
      title,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected milestone edit form metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const actionRowStyle = getComputedStyle(actionRow);
    const contentFooterStyle = getComputedStyle(contentFooter);
    const issueOptionStyle = getComputedStyle(issueOption);
    const rightPaneStyle = getComputedStyle(rightPane);
    const titleStyle = getComputedStyle(title);
    return {
      actionRowDisplay: actionRowStyle.display,
      actionRowMarginTop: actionRowStyle.marginTop,
      contentFooterBackground: contentFooterStyle.backgroundColor,
      contentFooterPadding: contentFooterStyle.padding,
      contentWrapWidth: Math.round(contentWrap.getBoundingClientRect().width),
      dueDateMinHeight: getComputedStyle(dueDate).minHeight,
      issueOptionDdMargin: getComputedStyle(issueOptionDd).margin,
      issueOptionDtMarginBottom: getComputedStyle(issueOptionDt).marginBottom,
      issueOptionMarginBottom: issueOptionStyle.marginBottom,
      issueOptionWidth: Math.round(issueOption.getBoundingClientRect().width),
      leftPaneWidth: Math.round(leftPane.getBoundingClientRect().width),
      rightPaneMarginLeft: Math.round(Number.parseFloat(rightPaneStyle.marginLeft)),
      rightPaneWidth: Math.round(rightPane.getBoundingClientRect().width),
      titleBorderBottomColor: titleStyle.borderBottomColor,
      titleFontSize: titleStyle.fontSize,
      titleMarginBottom: titleStyle.marginBottom,
      titleMarginTop: titleStyle.marginTop,
      titleWidth: Math.round(title.getBoundingClientRect().width),
    };
  });
}

async function readMilestoneEditorTabMetrics(page: Page) {
  return milestoneEditMarkdownEditor(page).evaluate((editor) => {
    const nav = editor.querySelector<HTMLElement>(".nav-tabs");
    const editButton = editor.querySelector<HTMLButtonElement>(
      ".nav-tabs > li:nth-child(1) button",
    );
    const previewButton = editor.querySelector<HTMLButtonElement>(
      ".nav-tabs > li:nth-child(2) button",
    );
    const tabContent = editor.querySelector<HTMLElement>(".tab-content");
    const editPane = editor.querySelector<HTMLElement>("#edit-content-body");
    const previewPane = editor.querySelector<HTMLElement>("#preview-content-body");
    const textarea = editor.querySelector<HTMLElement>("#editor-contents-content-body");
    const missing = Object.entries({
      editButton,
      editPane,
      nav,
      previewButton,
      previewPane,
      tabContent,
      textarea,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected milestone editor tab metric targets are missing: ${missing.join(", ")}`,
      );
    }

    const navBox = nav.getBoundingClientRect();
    const tabBox = tabContent.getBoundingClientRect();
    const textareaBox = textarea.getBoundingClientRect();
    const editPaneStyle = getComputedStyle(editPane);
    const previewPaneStyle = getComputedStyle(previewPane);
    return {
      buttonOrder: Array.from(nav.querySelectorAll(":scope > li")).map((item) =>
        (item.textContent ?? "").trim(),
      ),
      editButtonHref: editButton.getAttribute("href"),
      editButtonMode: editButton.getAttribute("data-mode"),
      editButtonToggle: editButton.getAttribute("data-toggle"),
      editButtonType: editButton.type,
      editPaneDisplay: editPaneStyle.display,
      navBottom: Math.round(navBox.bottom),
      navLeft: Math.round(navBox.left),
      navRight: Math.round(navBox.right),
      previewButtonHref: previewButton.getAttribute("href"),
      previewButtonMode: previewButton.getAttribute("data-mode"),
      previewButtonToggle: previewButton.getAttribute("data-toggle"),
      previewButtonType: previewButton.type,
      previewPaneDisplay: previewPaneStyle.display,
      tabContentLeft: Math.round(tabBox.left),
      tabContentRight: Math.round(tabBox.right),
      tabContentTop: Math.round(tabBox.top),
      textareaLeft: Math.round(textareaBox.left),
      textareaRight: Math.round(textareaBox.right),
      textareaTop: Math.round(textareaBox.top),
    };
  });
}

function milestoneEditMarkdownEditor(page: Page) {
  return page.locator(
    ".content-wrap.frm-wrap .span-left-pane .mt10:has(#editor-contents-content-body)",
  );
}

async function navbarSearchMetrics(page: Page) {
  return page.evaluate(() => {
    const shells = document.querySelectorAll<HTMLElement>("header.gnb-outer.project-header");
    const navbar = shells.item(shells.length - 1);
    const form = navbar?.querySelector<HTMLElement>(".gnb-search-form");
    const scope = navbar?.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = navbar?.querySelector<HTMLElement>(".gnb-search-form .search-box.select");
    const input = navbar?.querySelector<HTMLElement>('.gnb-search-form input[name="keyword"]');
    if (!navbar || !form || !scope || !searchBox || !input) {
      return null;
    }
    return {
      form: rect(form),
      input: rect(input),
      navbar: rect(navbar),
      scope: rect(scope),
      searchBox: rect(searchBox),
    };

    function rect(element: HTMLElement) {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    }
  });
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    const clone = root.cloneNode(true);
    scrubMarkdownHelp(clone);
    return visit(clone);

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

    function scrubMarkdownHelp(rootNode: Node) {
      if (!(rootNode instanceof Element)) {
        return;
      }
      for (const markdownHelp of rootNode.querySelectorAll(".markdown-help")) {
        markdownHelp.replaceChildren();
      }
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    scrubMarkdownHelp(template.content);
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

    function scrubMarkdownHelp(rootNode: ParentNode) {
      for (const markdownHelp of rootNode.querySelectorAll(".markdown-help")) {
        markdownHelp.replaceChildren();
      }
    }
  }, html);
}
