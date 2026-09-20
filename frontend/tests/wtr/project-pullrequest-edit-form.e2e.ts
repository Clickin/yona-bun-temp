import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const ROUTE_SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
    import.meta.url,
  ),
  "utf8",
);
const PROJECT_PARENT_ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url),
  "utf8",
);

test("project pull request edit preserves legacy form controls and save behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectPullRequestEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  const editFormUrl = page.url();
  expect(ROUTE_SOURCE).not.toContain("<SiteLayoutShell runtimeConfig={runtimeConfig}>");
  expect(ROUTE_SOURCE).toContain(
    '<title>{`${t("title.editPullRequest")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(ROUTE_SOURCE).not.toContain("document.title");
  expect(ROUTE_SOURCE).not.toContain("globalThis.document");
  expect(ROUTE_SOURCE).not.toContain("window.document");
  expect(ROUTE_SOURCE).not.toMatch(/useEffect\s*\([\s\S]{0,300}title/iu);
  // F6 copy-fix: SiteLayoutShell + projectSearchScope flow from the grandparent $projectName.tsx
  // (lines 854-860), not from $pullRequestNumber.tsx which only hosts the shell outlet.
  expect(PROJECT_PARENT_ROUTE_SOURCE).toContain("projectSearchScope={projectSearchScope}");
  expect(PROJECT_PARENT_ROUTE_SOURCE).toContain("function projectSearchScopeOrganizationName");
  await expect(page).toHaveTitle("Edit pull request - admin/sample");
  expect(
    await page
      .locator("head > title")
      .first()
      .evaluate((title) => title.textContent),
  ).toBe("Edit pull request - admin/sample");
  await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
  const shell = pullRequestEditScopedShell(page);
  await expect(shell).toBeVisible();
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  const scopeButtons = shell.locator("[data-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "All Projects"]);

  await shell.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  expect(page.url()).toBe(editFormUrl);
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);

  await shell.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(0).click();
  expect(page.url()).toBe(editFormUrl);
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );

  const navbarMetrics = await navbarSearchMetrics(page);
  expect(navbarMetrics).not.toBeNull();
  expect(navbarMetrics!.form.top).toBeGreaterThanOrEqual(navbarMetrics!.navbar.top);
  expect(navbarMetrics!.form.bottom).toBeLessThanOrEqual(navbarMetrics!.navbar.bottom);
  expect(navbarMetrics!.form.right).toBeLessThanOrEqual(navbarMetrics!.navbar.right);
  expect(navbarMetrics!.scope.top).toBeGreaterThanOrEqual(navbarMetrics!.navbar.top);
  expect(navbarMetrics!.scope.bottom).toBeLessThanOrEqual(navbarMetrics!.navbar.bottom);
  expect(navbarMetrics!.searchBox.top).toBeGreaterThanOrEqual(navbarMetrics!.navbar.top);
  expect(navbarMetrics!.searchBox.bottom).toBeLessThanOrEqual(navbarMetrics!.navbar.bottom);
  expect(navbarMetrics!.input.left).toBeGreaterThanOrEqual(navbarMetrics!.searchBox.left);
  expect(navbarMetrics!.input.right).toBeLessThanOrEqual(navbarMetrics!.searchBox.right);

  await expect(page.locator("form.nm")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/pullRequest/7/edit`,
  );
  expect(ROUTE_SOURCE).not.toContain('data-toggle="select2"');
  expect(ROUTE_SOURCE).not.toContain('"data-toggle": "select2"');
  await expect(page.locator("#fromProjectId option:checked")).toHaveText("dev / fork");
  await expect(page.locator("#fromProjectId")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#fromProjectId")).toHaveAttribute("name", "fromProjectId");
  await expect(page.locator("#s2id_fromProjectId")).toHaveClass(/\bmr5\b/u);
  await expect(page.locator("#fromProjectId")).toBeDisabled();
  await expect(page.locator('input[type="hidden"][name="fromProjectId"]')).toHaveValue("8");
  await expect(page.locator("#fromBranch")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#fromBranch")).toBeDisabled();
  await expect(page.locator("#fromBranch")).toHaveAttribute("name", "fromBranch");
  await expect(page.locator("#fromBranch")).toHaveAttribute("data-format", "branch");
  await expect(page.locator("#fromBranch")).toHaveAttribute("data-dropdown-css-class", "branches");
  await expect(page.locator("#fromBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#fromBranch option:checked")).toHaveText("feature/ui");
  await expect(page.locator("#toProjectId option:checked")).toHaveText("admin / sample");
  await expect(page.locator("#toProjectId")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#toProjectId")).toHaveAttribute("name", "toProjectId");
  await expect(page.locator("#s2id_toProjectId")).toHaveClass(/\bmr5\b/u);
  await expect(page.locator("#toProjectId")).toBeDisabled();
  await expect(page.locator('input[type="hidden"][name="toProjectId"]')).toHaveValue("7");
  await expect(page.locator("#toBranch")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#toBranch")).toBeDisabled();
  await expect(page.locator("#toBranch")).toHaveAttribute("name", "toBranch");
  await expect(page.locator("#toBranch")).toHaveAttribute("data-format", "branch");
  await expect(page.locator("#toBranch")).toHaveAttribute("data-dropdown-css-class", "branches");
  await expect(page.locator("#toBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#toBranch option:checked")).toHaveText("main");
  await expect(page.locator('input[type="hidden"][name="toBranch"]')).toHaveValue("main");
  expect(ROUTE_SOURCE).not.toContain("data-is-user-has-typed");
  expect(ROUTE_SOURCE).not.toContain("data-commits");
  expect(ROUTE_SOURCE).not.toContain("data-pullrequest-title");
  expect(ROUTE_SOURCE).not.toContain("data-pullrequest-body");
  expect(ROUTE_SOURCE).not.toContain("data-conflict");
  expect(ROUTE_SOURCE).toContain('<span id="pullRequestState"></span>');
  expect(ROUTE_SOURCE).not.toContain("data-value={pullRequest.state}");
  await expect(page.locator("#pullRequestState")).toHaveCount(1);
  await expect(page.locator("#pullRequestState")).not.toHaveAttribute("data-value", /.*/u);
  await expect(page.locator("#title")).not.toHaveAttribute("data-is-user-has-typed", /.*/u);
  await expect(page.locator("#editor-body-body")).not.toHaveAttribute(
    "data-is-user-has-typed",
    /.*/u,
  );
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  const editor = pullRequestEditMarkdownEditor(page);
  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  expect(ROUTE_SOURCE).not.toContain('data-toggle="markdown-editor"');
  expect(ROUTE_SOURCE).not.toContain('"data-toggle": "markdown-editor"');
  await expect(editor).toHaveClass("mt10");
  expect(ROUTE_SOURCE).not.toContain("window.history.back()");
  expect(ROUTE_SOURCE).toContain("router.history.back()");
  await expect(page.locator('form.nm > ul.nav-tabs a[href="#__commits"]')).toHaveCount(0);
  await expect(editor.locator('.nav-tabs a[href="#edit-body"]')).toHaveCount(0);
  await expect(editor.locator('.nav-tabs a[href="#preview-body"]')).toHaveCount(0);
  await expect(page.locator('form.nm [data-toggle="tab"]')).toHaveCount(0);
  expect(ROUTE_SOURCE).not.toContain('data-toggle="tab"');
  expect(ROUTE_SOURCE).not.toContain('"data-toggle": "tab"');
  expect(ROUTE_SOURCE).not.toContain('data-toggle="tab"');
  const commitsTab = page.locator('form.nm > ul.nav-tabs button[type="button"]');
  const editorTabs = editor.locator("> ul.nav-tabs > li");
  const editTabItem = editorTabs.nth(0);
  const previewTabItem = editorTabs.nth(1);
  const editTab = editTabItem.getByRole("button", { name: "Edit" });
  const previewTab = previewTabItem.getByRole("button", { name: "Preview" });
  await expect(editor.locator('.nav-tabs button[type="button"][data-mode]')).toHaveCount(0);
  expect(ROUTE_SOURCE).not.toContain('data-mode="edit"');
  expect(ROUTE_SOURCE).not.toContain('data-mode="preview"');
  await expect(commitsTab).toHaveText("Commits1");
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(page.locator("form.nm > ul.nav-tabs > li")).toHaveCount(1);
  await expect(editor.locator("> ul.nav-tabs > li")).toHaveCount(5);
  await expect(editor.locator("> ul.nav-tabs > li").nth(0)).toHaveClass(/active/);
  await expect(editor.locator("> ul.nav-tabs > li").nth(0)).toContainText("Edit");
  await expect(editor.locator("> ul.nav-tabs > li").nth(1)).toContainText("Preview");
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help-wrap > .markdown-help-item")).toHaveCount(10);
  expectPullRequestEditorUsesSharedMarkdownHelp();
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-id", "90");
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-type", "PULL_REQUEST");
  await expect(page.locator("#upload .attach-wrap")).toHaveCount(1);
  await expect(page.locator("#upload .help-droppable")).toHaveText(
    "Drag & Drop files to attach here or",
  );
  await expect(page.locator("#upload .fake-file-wrap")).toContainText("File upload");
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .plain")).toHaveText("Click upload button");
  await expect(page.locator("#upload .help-pastable")).toHaveText("Paste the clipboard image");
  await expect(page.locator("#upload ul.attached-files.unstyled")).toHaveCount(1);
  await expect(page.locator("#upload ul.attached-files.unstyled li")).toHaveCount(0);
  // F6 copy-fix: legacy `right-txt` (text-align:right, _common.less:163) is preserved via style
  // uploadSaveHelp; the save-help <p> now carries data-owner="pull-request-edit-upload-save-help".
  await expect(page.locator('[data-owner="pull-request-edit-upload-save-help"]')).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);
  await expect(page.locator('form.nm script[type="text/x-jquery-tmpl"]')).toHaveCount(0);
  expect(ROUTE_SOURCE).toContain("pullRequestMergeResultQueryOptions");
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-title", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-body", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);
  await expect(page.locator("#numOfCommits")).toHaveText("1");
  await expect(page.locator("#mergeResult .commit-wrap")).toBeVisible();
  await expect(page.locator("#mergeResult .code-table.commits tbody tr")).toHaveCount(1);
  // Legacy partial_merge_result.scala.html links directly to CodeHistoryApp.show without query.
  await expect(page.locator("#mergeResult .commit-id a")).toHaveAttribute(
    "href",
    `${basePath}/dev/fork/commit/abcdef1234567890`,
  );
  const bodyHtml = await page.locator("body").evaluate((body) => body.innerHTML);
  expect(bodyHtml).not.toContain("${fileId}");
  expect(bodyHtml).not.toContain("${fileName}");
  expect(bodyHtml).not.toContain("${fileHref}");
  expect(bodyHtml).not.toContain("upload-drop-here");
  expect(bodyHtml).not.toContain("Click to post");
  expectPullRequestUploaderHasNoLegacyLocalTemplates();
  const cancelButton = await expectModernCancelControl(page);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await previewTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(previewTabItem).toHaveClass(/active/);
  await expect(editTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await editTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(editTabItem).toHaveClass(/active/);
  await expect(previewTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await commitsTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(page.locator("form.nm > ul.nav-tabs > li")).toHaveClass(/active/);
  await expect(page.locator("#__commits")).toHaveClass(/active/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/pullRequest/7/editform?cancel-test=1`);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/7/editform?cancel-test=1`);
  await cancelButton.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await editFormMetrics(page)).toEqual({
    actionDisplay: "block",
    actionMarginTop: "20px",
    actionTextAlign: "center",
    // F5 dist-truth (2026-08-11): the arrow is the muted teal.
    arrowColor: "rgb(149, 165, 166)",
    arrowFontSize: "32px",
    arrowLeft: 614,
    arrowMarginLeft: "-16px",
    arrowPosition: "absolute",
    arrowTop: "20px",
    branchWrapDisplay: "block",
    branchWrapMarginBottom: "20px",
    branchWrapMinHeight: "55px",
    branchWrapPosition: "relative",
    commitsPaneWidth: 1260,
    contentWidth: 1260,
    fieldTitleDisplay: "block",
    fieldTitleFontWeight: "700",
    fromBranchDisabled: true,
    fromProjectDisabled: true,
    titleWidth: 1236,
    toBranchDisabled: true,
    toProjectDisabled: true,
  });

  await page.fill("#title", "Updated title");
  await page.fill("#editor-body-body", "Updated body");
  await page.click('form.nm button[type="submit"]');

  await expect
    .poll(() => patchRequests)
    .toEqual([{ attachmentIds: [], bodyMarkdown: "Updated body", title: "Updated title" }]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequests`);
});

test("pull request edit preserves disabled Select2 choices and source commit navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectPullRequestEditForm(page, patchRequests, {
    mergeResult: {
      commits: [
        { ...defaultPullRequestCommit(), commitMessage: "Add UI\n\nExpanded commit details" },
      ],
      conflict: false,
      noHead: false,
    },
  });
  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  for (const [id, label, value] of [
    ["fromProjectId", "dev / fork", "8"],
    ["fromBranch", "branch feature/ui", "feature/ui"],
    ["toProjectId", "admin / sample", "7"],
    ["toBranch", "branch main", "main"],
  ] as const) {
    const picker = page.locator(`#s2id_${id}`);
    await expect(picker).toBeVisible();
    await expect(picker.locator("button.select2-choice")).toBeDisabled();
    await expect(picker.locator(".select2-chosen")).toHaveText(label);
    await expect(page.locator(`#${id}`)).toBeDisabled();
    await expect(page.locator(`input[type=hidden][name=${id}]`)).toHaveValue(value);
  }
  await expect(page.locator(".pull-request-wrap [role=listbox]")).toHaveCount(0);
  const summary = page.locator("#mergeResult .commitMsg.short");
  await expect(summary).toHaveText("Add UI");
  await expect(summary).toHaveAttribute("href", `${basePath}/dev/fork/commit/abcdef1234567890`);
  await expect(page.locator("#mergeResult .commitMsg.desc")).not.toBeVisible();
  await page.locator("#mergeResult .moreBtn").click();
  await expect(page.locator("#mergeResult .commitMsg.desc")).toBeVisible();
  await expect(page.locator("#mergeResult .commitMsg.desc")).toContainText(
    "Expanded commit details",
  );
  await page.locator("#mergeResult .moreBtn").click();
  await expect(page.locator("#mergeResult .commitMsg.desc")).not.toBeVisible();
  expect(patchRequests).toEqual([]);
});

test("project pull request edit form drops markdown JS-only markers while preserving tabs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectPullRequestEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  const editFormUrl = page.url();
  await expect(page.locator("form.nm")).toBeVisible();
  const editor = pullRequestEditMarkdownEditor(page);
  const editorTabs = editor.locator("> ul.nav-tabs > li");
  const editTabItem = editorTabs.nth(0);
  const previewTabItem = editorTabs.nth(1);
  const editTab = editTabItem.getByRole("button", { name: "Edit" });
  const previewTab = previewTabItem.getByRole("button", { name: "Preview" });

  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  expect(ROUTE_SOURCE).not.toContain('data-toggle="markdown-editor"');
  expect(ROUTE_SOURCE).not.toContain('"data-toggle": "markdown-editor"');
  expect(ROUTE_SOURCE).not.toContain('data-mode="edit"');
  expect(ROUTE_SOURCE).not.toContain('data-mode="preview"');
  await expect(editor).toHaveClass("mt10");
  await expect(editorTabs).toHaveCount(5);
  await expect(editTabItem).toContainText("Edit");
  await expect(previewTabItem).toContainText("Preview");
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(editor.locator('.nav-tabs button[type="button"][data-mode]')).toHaveCount(0);
  await expect(editor.locator('.nav-tabs a[href="#edit-body"]')).toHaveCount(0);
  await expect(editor.locator('.nav-tabs a[href="#preview-body"]')).toHaveCount(0);
  await expect(page.locator('form.nm [data-toggle="tab"]')).toHaveCount(0);
  await expect(page.locator("#editor-body-body")).toHaveAttribute("name", "body");
  await expect(page.locator("#editor-body-body")).toHaveAttribute(
    "data-editor-mode",
    "content-body",
  );
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#title")).not.toHaveAttribute("data-is-user-has-typed", /.*/u);
  await expect(page.locator("#editor-body-body")).not.toHaveAttribute(
    "data-is-user-has-typed",
    /.*/u,
  );
  await expect(page.locator("#preview-body .markdown-preview")).toHaveClass(
    /markdown-wrap content-body/,
  );
  await expect(page.locator(".notification-receiver-title")).toHaveText("Notification receivers");

  await previewTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(previewTabItem).toHaveClass(/active/);
  await expect(editTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await expect(page.locator("#editor-body-body")).toBeAttached();
  await expect(
    page.locator("#preview-body .markdown-preview.markdown-wrap.content-body"),
  ).toHaveAttribute("data-via-email", "false");
  await editTab.click();
  await expect(page).toHaveURL(editFormUrl);
  await expect(editTabItem).toHaveClass(/active/);
  await expect(previewTabItem).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
});

test("project pull request edit form exposes group search scope when project org data exists", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const editFormUrl = `${basePath}/admin/sample/pullRequest/7/editform`;
  const patchRequests: unknown[] = [];
  await mockProjectPullRequestEditForm(page, patchRequests, {
    project: { isProtected: true, organizationName: "admin" },
  });

  await page.goto(editFormUrl);
  const actualEditFormUrl = page.url();
  await expect(page.locator("form.nm")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  const shell = pullRequestEditScopedShell(page);
  const scopeButtons = shell.locator("[data-owner=global-gnb-search-scope-item] > button");
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);

  await shell.locator("#gnb-search-scope-title").click();
  await scopeButtons.nth(1).click();
  expect(page.url()).toBe(actualEditFormUrl);
  await expect(shell.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(shell.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/admin/search`,
  );
});

test("project pull request edit form keeps the project shell for project-scoped 403 and 404", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];

  for (const [status, copy] of [
    [403, "You are not authorized"],
    [404, "Page not found"],
  ] as const) {
    await mockProjectPullRequestEditForm(page, patchRequests, { formErrorStatus: status });
    await page.goto(`${basePath}/admin/sample/pullRequest/7/editform?status=${status}`);
    await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
    await expect(page.locator(".project-header-outer")).toHaveCount(1);
    await expect(page.locator(".project-menu-outer")).toHaveCount(1);
    await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText(
      "Pull request",
    );
    await expect(page.locator(".project-page-wrap > .error-wrap p")).toHaveText(copy);
  }
});

test("project pull request edit form blocks submit when merge result has no commits", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectPullRequestEditForm(page, patchRequests, {
    mergeResult: { commits: [], conflict: false, noHead: false },
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-title", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-body", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);
  await expect(page.locator("#numOfCommits")).toHaveText("");
  await expect(page.locator("#mergeResult h5")).toHaveText("No changes have been made.");
  await expect(page.locator("#mergeResult .commit-wrap")).toHaveCount(0);
  await expect(page.locator("#status")).toHaveText("No changes have been made.");
  await expect(page.locator("#status")).toHaveClass(/alert-info/);

  const alert = waitForDialog(page, "alert");
  await page.click('form.nm button[type="submit"]');
  expect(await alert).toBe("No changes have been made.");
  await expect.poll(() => patchRequests).toEqual([]);
});

test("project pull request edit form blocks submit when legacy required title is empty", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  await mockProjectPullRequestEditForm(page, patchRequests);

  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#numOfCommits")).toHaveText("1");

  await page.fill("#title", "   ");
  const alert = waitForDialog(page, "alert");
  await page.click('form.nm button[type="submit"]');
  expect(await alert).toBe("Title is a required field.");
  await expect.poll(() => patchRequests).toEqual([]);
});

test("project pull request edit form confirms conflicting merge result before submit", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const patchRequests: unknown[] = [];
  const dialogs: Array<{ message: string; type: string }> = [];
  await mockProjectPullRequestEditForm(page, patchRequests, {
    mergeResult: { commits: [defaultPullRequestCommit()], conflict: true, noHead: false },
  });
  page.on("dialog", async (dialog) => {
    dialogs.push({ message: dialog.message(), type: dialog.type() });
    await dialog.dismiss();
  });

  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);
  const editFormUrl = page.url();
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);
  await expect(page.locator("#numOfCommits")).toHaveText("1");
  await expect(page.locator("#mergeResult .commit-wrap")).toBeVisible();
  await expect(page.locator("#status")).toHaveText(
    "A conflict occurred when merging. This pull request cannot be merged safely.",
  );
  await expect(page.locator("#status")).toHaveClass(/alert-error/);
  expectPullRequestEditConflictConfirmUsesRouteOwnedModal();

  await page.fill("#title", "Updated title");
  await page.fill("#editor-body-body", "Updated body");
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await page.click('form.nm button[type="submit"]');

  const conflictConfirm = page.locator("#pullRequestConflictConfirm");
  await expect(conflictConfirm).toBeVisible();
  await expect(conflictConfirm.locator(".message .msg")).toHaveText(
    "This code seems to have conflicts when merging. Do you really want to continue?",
  );
  await expect(conflictConfirm.locator(".buttons .ybtn")).toHaveCount(2);
  await expect(conflictConfirm.locator(".buttons .ybtn").nth(0)).toHaveText("Cancel");
  await expect(conflictConfirm.locator(".buttons .ybtn").nth(1)).toHaveText("Confirm");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(page).toHaveURL(editFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  expect(dialogs).toEqual([]);
  await expect.poll(() => patchRequests).toEqual([]);

  await conflictConfirm.locator(".buttons .ybtn").nth(0).click();
  await expect(conflictConfirm).toHaveCount(0);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(editFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");
  await expect.poll(() => patchRequests).toEqual([]);

  await page.click('form.nm button[type="submit"]');
  await expect(conflictConfirm).toBeVisible();
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await conflictConfirm.locator(".buttons .ybtn").nth(1).click();
  await expect(conflictConfirm).toHaveCount(0);
  await expect
    .poll(() => patchRequests)
    .toEqual([{ attachmentIds: [], bodyMarkdown: "Updated body", title: "Updated title" }]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequests`);
  expect(dialogs).toEqual([]);
});

async function editFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((content) => {
    const branchWrap = content.querySelector<HTMLElement>(".pull-request-wrap");
    const arrow = content.querySelector<HTMLElement>(".pull-request-wrap .arrow");
    const fieldTitle = content.querySelector<HTMLElement>(".pull-request-wrap .field-title");
    const title = content.querySelector<HTMLElement>("input#title.text");
    const actions = content.querySelector<HTMLElement>(".actions");
    const commitsPane = content.querySelector<HTMLElement>("#__commits.code-browse-wrap");
    const fromProject = content.querySelector<HTMLSelectElement>("#fromProjectId");
    const fromBranch = content.querySelector<HTMLSelectElement>("#fromBranch");
    const toProject = content.querySelector<HTMLSelectElement>("#toProjectId");
    const toBranch = content.querySelector<HTMLSelectElement>("#toBranch");
    const missing = Object.entries({
      actions,
      arrow,
      branchWrap,
      commitsPane,
      fieldTitle,
      fromBranch,
      fromProject,
      title,
      toBranch,
      toProject,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected pull request edit metric targets are missing: ${missing.join(", ")}`,
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
      commitsPaneWidth: Math.round(commitsPane.getBoundingClientRect().width),
      contentWidth: Math.round(content.getBoundingClientRect().width),
      fieldTitleDisplay: fieldTitleStyle.display,
      fieldTitleFontWeight: fieldTitleStyle.fontWeight,
      fromBranchDisabled: fromBranch.disabled,
      fromProjectDisabled: fromProject.disabled,
      titleWidth: Math.round(title.getBoundingClientRect().width),
      toBranchDisabled: toBranch.disabled,
      toProjectDisabled: toProject.disabled,
    };
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

function expectPullRequestUploaderHasNoLegacyLocalTemplates() {
  const uploaderSource = readFileSync(
    new URL("../src/components/file-uploader.tsx", import.meta.url),
    "utf8",
  );
  if (!uploaderSource) {
    throw new Error("PullRequestFileUploader source was not found");
  }
  // F6 copy-fix: the editor/uploader were extracted to shared components; the route must not
  // re-enable the legacy drag overlay (the shared file-uploader.tsx legitimately owns dragOverlay).
  expect(ROUTE_SOURCE).toContain(
    'import { PullRequestFileUploader } from "../../../../../components/file-uploader";',
  );
  // The route's PR uploader does not enable the legacy drag overlay; the shared component owns it.
  expect(ROUTE_SOURCE.match(/<PullRequestFileUploader[\s\S]*?\/>/u)?.[0]).not.toContain(
    "dragOverlay",
  );
  expect(uploaderSource).not.toContain("tplAttachedFile");
  expect(uploaderSource).not.toContain("tplDropFilesHere");
  expect(uploaderSource).not.toContain("text/x-jquery-tmpl");
  expect(uploaderSource).not.toContain("dangerouslySetInnerHTML");
  expect(uploaderSource).not.toContain("${fileId}");
  expect(uploaderSource).not.toContain("${fileName}");
  expect(uploaderSource).not.toContain("${fileHref}");
  expect(uploaderSource).not.toContain("Click to post");
}

function expectPullRequestEditorUsesSharedMarkdownHelp() {
  const editorSource = readFileSync(
    new URL("../src/components/markdown-editor.tsx", import.meta.url),
    "utf8",
  );
  if (!editorSource) {
    throw new Error("PullRequestMarkdownEditor source was not found");
  }
  // F6 copy-fix: the editor/uploader were extracted to shared components; the route imports them.
  expect(ROUTE_SOURCE).toContain(
    'import { PullRequestMarkdownEditor } from "../../../../../components/markdown-editor";',
  );
  expect(editorSource).toContain(
    'import { LegacyMarkdownHelp } from "../routes/-legacy-markdown-help";',
  );
  expect(editorSource).toContain("help = <LegacyMarkdownHelp />");
  expect(editorSource).toContain("export function PullRequestMarkdownEditor(");
  expect(ROUTE_SOURCE).not.toContain("help/markdown.scala.html");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpTemplate");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpHtml");
  expect(ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(ROUTE_SOURCE).not.toContain('replace(/@Messages("title.markdown.help")');
}

function expectPullRequestEditConflictConfirmUsesRouteOwnedModal() {
  expect(ROUTE_SOURCE).not.toContain("window.confirm");
  expect(ROUTE_SOURCE).toContain("PullRequestConflictConfirmModal");
  expect(ROUTE_SOURCE).toContain('id="pullRequestConflictConfirm"');
  expect(ROUTE_SOURCE).toContain('t("pullRequest.ignore.conflict")');
  expect(ROUTE_SOURCE).toContain("setConflictConfirmOpen(true)");
}

function pullRequestEditScopedShell(page: Page) {
  return page.locator("header[data-owner=global-gnb-outer]");
}

function pullRequestEditMarkdownEditor(page: Page) {
  return page
    .locator("#editor-body-body")
    .locator(
      "xpath=ancestor::div[contains(concat(' ', normalize-space(@class), ' '), ' mt10 ')][1]",
    );
}

async function navbarSearchMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
    const input = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-input"]');
    if (!navbar || !form || !scope || !searchBox || !input) {
      return null;
    }
    const rect = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    };
    return {
      form: rect(form),
      input: rect(input),
      navbar: rect(navbar),
      scope: rect(scope),
      searchBox: rect(searchBox),
    };
  });
}

async function waitForDialog(page: Page, expectedType: "alert" | "confirm", accept = true) {
  return page.waitForEvent("dialog").then(async (dialog) => {
    expect(dialog.type()).toBe(expectedType);
    const message = dialog.message();
    if (accept) {
      await dialog.accept();
    } else {
      await dialog.dismiss();
    }
    return message;
  });
}

type MockProjectPullRequestEditFormOptions = {
  formErrorStatus?: 403 | 404;
  mergeResult?: {
    commits: ReturnType<typeof defaultPullRequestCommit>[];
    conflict: boolean;
    noHead: boolean;
  };
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
    projectScope: string;
    vcs: string;
    viewerCanUpdate: boolean;
  }>;
};

async function mockProjectPullRequestEditForm(
  page: Page,
  patchRequests: unknown[],
  options: MockProjectPullRequestEditFormOptions = {},
) {
  const mergeResult = options.mergeResult ?? {
    commits: [defaultPullRequestCommit()],
    conflict: false,
    noHead: false,
  };
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
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enabledSocialProviders: [],
        secretSetupRequired: false,
        socialLoginOnly: false,
      }),
    });
  });
  await page.route("**/api/v1/workspace**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    }),
  );
  const containerBody = JSON.stringify({
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
    organizationName: "",
    projectName: "sample",
    projectScope: "public",
    vcs: "GIT",
    viewerCanUpdate: true,
    ...options.project,
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container?tabId=readme", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: containerBody,
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/7/form-options**",
    async (route) => {
      if (options.formErrorStatus) {
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ error: { status: options.formErrorStatus } }),
          status: options.formErrorStatus,
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          fromBranches: [
            { name: "feature/ui", selected: true },
            { name: "main", selected: false },
          ],
          fromProjects: [{ id: 8, ownerName: "dev", projectName: "fork", selected: true }],
          mode: "edit",
          pullRequest: pullRequestDetail(),
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 8,
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
        body: JSON.stringify(mergeResult),
      });
    },
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/7", async (route) => {
    if (route.request().method() === "PATCH") {
      patchRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(
          pullRequestDetail({ title: "Updated title", bodyMarkdown: "Updated body" }),
        ),
      });
      return;
    }
    await route.fallback();
  });
}

function defaultPullRequestCommit() {
  return {
    authorDateLabel: "Jul 2, 2026",
    authorEmail: "dev@example.com",
    commitId: "abcdef1234567890",
    commitMessage: "Add UI",
    commitShortId: "abcdef1",
    state: "CURRENT",
  };
}

function pullRequestDetail(overrides: Partial<{ bodyMarkdown: string; title: string }> = {}) {
  return {
    bodyHtml: `<p>${overrides.bodyMarkdown ?? "Initial body"}</p>`,
    bodyMarkdown: overrides.bodyMarkdown ?? "Initial body",
    commits: [],
    conflict: false,
    contributor: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "dev",
      userId: 2,
      userLabel: "Developer",
    },
    createdLabel: "Jul 2, 2026",
    events: [],
    fromBranch: "feature/ui",
    fromOwnerName: "dev",
    fromProjectName: "fork",
    id: 90,
    isWatching: false,
    lackingReviewerCount: 0,
    mergedCommitIdFrom: "",
    mergedCommitIdTo: "",
    ownerName: "admin",
    permissions: {
      canComment: true,
      canDeleteSourceBranch: false,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canRestoreSourceBranch: false,
      canUpdate: true,
      canUpdateState: true,
    },
    projectName: "sample",
    pullRequestNumber: 7,
    receiver: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "admin",
      userId: 1,
      userLabel: "Site Admin",
    },
    requiredReviewerCount: 0,
    reviewed: false,
    reviewers: [],
    sourceBranchExists: true,
    state: "OPEN",
    threads: [],
    title: overrides.title ?? "Initial title",
    toBranch: "main",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}
