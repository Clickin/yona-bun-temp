import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

test.setTimeout(60_000);

const EXPECTED_CREATE_FORM = `
<div class="content-wrap frm-wrap"><form action="__BASE_PATH__/admin/sample/pullRequests" enctype="multipart/form-data" class="nm"><div class="pull-request-wrap"><div class="pull-left"><label for="fromProjectId" class="field-title">From</label><select id="fromProjectId" name="fromProjectId" class="mr5"><option></option><option value="7" selected="">admin / sample</option><option value="8">admin / fork</option></select><select id="fromBranch" name="fromBranch" data-format="branch" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="feature/ui" selected="">feature/ui</option><option value="main">main</option></select></div><div class="arrow"><i class="yobicon-right-2"></i></div><div class="pull-right"><label for="toProjectId" class="field-title">To</label><select id="toProjectId" name="toProjectId" class="mr5"><option></option><option value="7" selected="">admin / sample</option><option value="8">admin / fork</option></select><select id="toBranch" name="toBranch" data-format="branch" data-dropdown-css-class="branches" data-placeholder="Select branch"><option></option><option value="main" selected="">main</option></select></div></div><span id="pullRequestState"></span><div id="status" class="alert mt20 mb20 alert-success">This pull request can be merged safely.</div><div><input type="text" id="title" name="title" maxlength="255" class="text" placeholder="Title"><div style="position:relative"><div class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div></div><div class="upload-wrap content-footer" data-resource-type="PULL_REQUEST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div><div class="actions"><button type="submit" class="ybtn ybtn-success">Send pull request</button><button type="button" class="ybtn">Cancel</button></div></div><ul class="nav nav-tabs mt20"><li class="active"><button type="button"><span class="vmiddle-inline">Commits</span><span id="numOfCommits" class="num-badge vmiddle-inline">1</span></button></li></ul><div class="tab-content"><div id="__commits" class="code-browse-wrap tab-pane active"><div id="mergeResult" class="code-browser-wrap"><div class="commit-wrap"><table class="code-table commits"><thead class="thead"><tr><td class="commit-id"><strong>@</strong></td><td class="messages"><strong>Commit message</strong></td><td class="date"><strong>Commit date</strong></td><td class="author"><strong>Author</strong></td></tr></thead><tbody class="tbody"><tr><td class="commit-id"><a href="__BASE_PATH__/admin/sample/commit/abcdef1234567890">abcdef1</a></td><td class="messages"><span class="commitMsg short">Add UI</span></td><td class="date" title="Jul 2, 2026">Jul 2, 2026</td><td class="author dev@example.com"><div class="avatar-wrap"><img src="__BASE_PATH__/assets/images/default-avatar-32.png" width="32" height="32"></div></td></tr></tbody></table></div></div></div></div></form></div>
`;
const ROUTE_SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/newPullRequestForm.tsx", import.meta.url),
  "utf8",
);

type MockProjectRoute = {
  forkProjectName: string;
  forkProjectOwnerName: string;
  forkedProjectId: number;
  isProtected?: boolean;
  organizationName?: string;
  ownerName: string;
  projectId: number;
  projectName: string;
};

const DEFAULT_PROJECT_ROUTE: MockProjectRoute = {
  forkedProjectId: 8,
  forkProjectName: "fork",
  forkProjectOwnerName: "admin",
  ownerName: "admin",
  projectId: 7,
  projectName: "sample",
};

test("project pull request create form resolves legacy defaults without query parameters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const formOptionRequests: string[] = [];
  await mockProjectPullRequestCreateForm(page, [], { formOptionRequests });

  await page.goto(`${basePath}/admin/sample/newPullRequestForm`);

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".content-wrap.frm-wrap form.nm")).toBeVisible();
  await expect(page.locator("#fromProjectId")).toHaveValue("7");
  await expect(page.locator("#toProjectId")).toHaveValue("7");
  await expect(page.locator("#fromBranch")).toHaveValue("feature/ui");
  await expect(page.locator("#toBranch")).toHaveValue("main");
  await expect(page.locator("#status")).toHaveClass(/alert-success/u);
  await expect(page.locator("#title")).toHaveValue("Add UI");
  await expect(page.locator("#editor-body-body")).toHaveValue("");
  await expect(page.locator("#mergeResult .code-table.commits tbody tr")).toHaveCount(1);
  for (const [id, text] of [
    ["fromProjectId", "admin / sample"],
    ["fromBranch", "branch feature/ui"],
    ["toProjectId", "admin / sample"],
    ["toBranch", "branch main"],
  ] as const) {
    await expect(page.locator(`#s2id_${id} .select2-chosen`)).toHaveText(text);
    await expect(page.locator(`#s2id_${id} + #${id}.select2-offscreen`)).toHaveCount(1);
  }
  expect(await select2ChoiceGeometry(page)).toEqual([
    { height: 28, id: "fromProjectId", width: 218 },
    { height: 28, id: "fromBranch", width: 218 },
    { height: 28, id: "toProjectId", width: 218 },
    { height: 28, id: "toBranch", width: 218 },
  ]);
  expect(await select2ContainerGeometry(page)).toEqual([
    { height: 30, id: "fromProjectId", width: 220 },
    { height: 30, id: "fromBranch", width: 220 },
    { height: 30, id: "toProjectId", width: 220 },
    { height: 30, id: "toBranch", width: 220 },
  ]);
  await page.locator("#s2id_fromBranch .select2-choice").click();
  await expect(page.locator("#fromBranch")).toBeFocused();
  await expect(page.locator("#fromBranch")).toHaveValue("feature/ui");
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#upload")
        .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    )
    .toBe(70);
  expect(await inlineControlWhitespace(page)).toEqual({
    actionGap: 4,
    actionWhitespace: true,
    fromSelectorWhitespace: true,
    toSelectorWhitespace: true,
  });
  expect(formOptionRequests).toHaveLength(1);
  expect(new URL(formOptionRequests[0]).search).toBe("");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#upload")
        .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    )
    .toBe(100);
  const mobileY = await page.evaluate(() => ({
    editor: Math.round(document.querySelector<HTMLElement>(".mt10")!.getBoundingClientRect().top),
    status: Math.round(
      document.querySelector<HTMLElement>("#status")!.getBoundingClientRect().bottom,
    ),
    upload: Math.round(document.querySelector<HTMLElement>("#upload")!.getBoundingClientRect().top),
  }));
  expect(mobileY.editor).toBeGreaterThanOrEqual(mobileY.status);
  expect(mobileY.upload).toBeGreaterThan(mobileY.editor);
  const select2Boxes = await page.evaluate(() =>
    ["fromProjectId", "fromBranch", "toProjectId", "toBranch"].map((id) => {
      const box = document.querySelector<HTMLElement>(`#s2id_${id}`)!.getBoundingClientRect();
      return {
        bottom: Math.round(box.bottom),
        height: Math.round(box.height),
        id,
        top: Math.round(box.top),
        width: Math.round(box.width),
      };
    }),
  );
  expect(select2Boxes.map((box) => box.width)).toEqual([220, 220, 220, 220]);
  expect(select2Boxes.map((box) => box.height)).toEqual([30, 30, 30, 30]);
  expect(select2Boxes[1].top).toBeGreaterThanOrEqual(select2Boxes[0].bottom);
  expect(select2Boxes[3].top).toBeGreaterThanOrEqual(select2Boxes[2].bottom);
  expect(await select2ChoiceGeometry(page)).toEqual([
    { height: 28, id: "fromProjectId", width: 218 },
    { height: 28, id: "fromBranch", width: 218 },
    { height: 28, id: "toProjectId", width: 218 },
    { height: 28, id: "toBranch", width: 218 },
  ]);
  expect(await commitTabBadgeMetrics(page)).toEqual({
    badgeBackground: "rgba(0, 0, 0, 0)",
    badgePadding: "2px 4px",
    tabWidth: 85,
  });
});

test("project pull request commit row uses ko-KR relative time and runtime avatar asset", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await page.clock.install({ time: new Date("2026-07-12T12:00:00Z") });
  await mockProjectPullRequestCreateForm(page, [], {
    authorDateLabel: "2026-07-12T10:00:00Z",
  });
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`);

  const date = page.locator("#mergeResult tbody td.date");
  await expect(date).toHaveText("2시간 전");
  await expect(date).toHaveAttribute("title", "2026-07-12T10:00:00Z");
  await expect(page.locator("#mergeResult .avatar-wrap img")).toHaveAttribute(
    "src",
    `${basePath}/legacy-assets/images/default-avatar-128.png`,
  );
  const avatar = page.locator("#mergeResult .avatar-wrap img");
  await expect(avatar).toHaveAttribute("width", "32");
  await expect(avatar).toHaveAttribute("height", "32");
  const avatarResponse = await page.request.get(
    `${new URL(page.url()).origin}${basePath}/legacy-assets/images/default-avatar-128.png`,
  );
  expect(avatarResponse.ok()).toBe(true);
  expect(avatarResponse.headers()["content-type"]).toMatch(/^image\//u);
});

function withLegacyFileUploader(html: string) {
  return html.replace(
    `<div class="upload-wrap content-footer" data-resource-type="PULL_REQUEST"><div class="attach-wrap"><div class="attachments" id="attachments"></div></div></div>`,
    `<div id="upload" class="upload-wrap content-footer" data-resource-type="PULL_REQUEST"><div class="attach-wrap"><span class="help help-droppable">Drag &amp; Drop files to attach here or</span><div class="btn-wrap"><div class="nbtn medium white fake-file-wrap"><i class="yobicon-upload"></i> File upload<input type="file" class="file" name="filePath" multiple=""></div></div><span class="plain">Click upload button</span><span class="help help-pastable" style="display:block">Paste the clipboard image</span></div><ul class="attached-files unstyled"></ul><p class="right-txt help"><i class="yobicon-supportrequest"></i> Selected file will be attached when your comment is saved.</p></div>`,
  );
}

function withLegacyEditor(html: string) {
  return html.replace(
    `<div class="markdown-editor-wrap"><textarea id="editor-body-content-body" name="body" data-editor-mode="content-body"></textarea><div id="preview-content-body" class="preview markdown-wrap"></div></div>`,
    `<div class="mt10"><ul class="nav nav-tabs nm small"><li class="active"><button type="button">Edit</button></li><li><button type="button">Preview</button></li><li><div class="task-list-button"><button type="button" class="add-task-list-button ybtn ybtn-small ybtn-danger-no-outline"><i class="yobicon-list task-list-icon"></i> Add checklist</button></div></li><li><div class="editor-clear-temporary"><div class="editor-clear-temporary-button"><button type="button" id="button-clear-temporary" class="ybtn ybtn-small ybtn-warning">Clear Temporary</button></div></div></li><li><div class="editor-notice-label"></div></li></ul><div class="tab-content" style="position:relative;overflow: visible"><div class="markdown-help"></div><div id="edit-body" class="tab-pane active"><div class="textarea-box"><textarea name="body" class="editorSeries content comment nm" data-editor-mode="content-body" markdown="true" id="editor-body-body"></textarea></div></div><div id="preview-body" class="tab-pane"><div class="markdown-preview markdown-wrap content-body" data-via-email="false"></div></div><div class="notification-receiver"><span class="notification-receiver-title">Notification receivers </span><span class="notification-receiver-list"></span></div></div></div>`,
  );
}

test("project pull request create form restores legacy shell parity for project and group-owned routes", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const scenarios = [
    {
      route: DEFAULT_PROJECT_ROUTE,
      scopeTexts: ["This Project", "This Project", "All Projects"],
      title: "Send pull request - admin/sample",
    },
    {
      route: {
        ...DEFAULT_PROJECT_ROUTE,
        forkProjectName: "portal-fork",
        forkProjectOwnerName: "weblabs",
        isProtected: true,
        organizationName: "weblabs",
        ownerName: "weblabs",
        projectName: "portal",
      },
      scopeTexts: ["This Project", "This Project", "This Group", "All Projects"],
      title: "Send pull request - weblabs/portal",
    },
  ] satisfies Array<{ route: MockProjectRoute; scopeTexts: string[]; title: string }>;

  expect(ROUTE_SOURCE).toContain("<ProjectNewPullRequestRouteShell");
  expect(ROUTE_SOURCE).toContain("projectSearchScope={projectSearchScope}");
  expect(ROUTE_SOURCE).toContain(
    '<title>{`${t("title.newPullRequest")} - ${ownerName}/${projectName}`}</title>',
  );
  expect(ROUTE_SOURCE).not.toContain("document.title");
  expect(ROUTE_SOURCE).not.toContain("globalThis.document");

  for (const scenario of scenarios) {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await mockProjectPullRequestCreateForm(page, [], { project: scenario.route });
    await page.goto(
      `${basePath}/${scenario.route.ownerName}/${scenario.route.projectName}/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
    );

    await expect(page).toHaveTitle(scenario.title);
    await expect
      .poll(() => page.evaluate(() => document.head.querySelector("title")?.textContent ?? ""))
      .toBe(scenario.title);
    await expect(page.locator("header.gnb-outer.project-header")).toHaveCount(1);
    await expect(page.locator(".project-header-outer")).toHaveCount(1);
    await expect(page.locator(".project-menu-outer")).toHaveCount(1);
    await expect(page.locator(".project-breadcrumb .project-author")).toContainText(
      scenario.route.ownerName,
    );
    await expect(page.locator(".project-breadcrumb .project-name")).toContainText(
      scenario.route.projectName,
    );
    await expect(page.locator('form[name="gnb-search-form"]')).toHaveAttribute(
      "action",
      `${basePath}/${scenario.route.ownerName}/${scenario.route.projectName}/search`,
    );

    const searchScopeTexts = (
      await page
        .locator("#gnb-search-scope-title, .gnb-search-form .dropdown-menu > li > button")
        .allTextContents()
    )
      .map((value) => value.replace(/\s+/gu, " ").trim())
      .filter(Boolean);
    expect(searchScopeTexts).toEqual(scenario.scopeTexts);

    const metrics = await projectShellMetrics(page);
    expect(metrics.searchBox.top).toBeGreaterThanOrEqual(metrics.navbar.top);
    expect(metrics.searchBox.bottom).toBeLessThanOrEqual(metrics.navbar.bottom);
    expect(metrics.searchBox.right).toBeLessThanOrEqual(metrics.navbar.right);
    expect(metrics.projectHeader.bottom).toBeGreaterThan(metrics.navbar.bottom);
    expect(metrics.projectMenu.top).toBeGreaterThanOrEqual(metrics.projectHeader.bottom - 1);
  }
});

test("project pull request create form omits select2 initializer markers on selector controls", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectPullRequestCreateForm(page, postRequests);

  expect(ROUTE_SOURCE).not.toContain('data-toggle="select2"');
  expect(ROUTE_SOURCE).toContain('data-format="branch"');
  expect(ROUTE_SOURCE).toContain('data-dropdown-css-class="branches"');
  expect(ROUTE_SOURCE).toContain('data-placeholder={t("pullRequest.select.branch")}');

  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );

  await expect(page.locator(".pull-request-wrap select[data-toggle='select2']")).toHaveCount(0);
  for (const selector of ["#fromProjectId", "#fromBranch", "#toProjectId", "#toBranch"]) {
    await expect(page.locator(selector)).not.toHaveAttribute("data-toggle", /.*/u);
  }
  for (const selector of ["#fromBranch", "#toBranch"]) {
    await expect(page.locator(selector)).toHaveAttribute("data-format", "branch");
    await expect(page.locator(selector)).toHaveAttribute("data-dropdown-css-class", "branches");
    await expect(page.locator(selector)).toHaveAttribute("data-placeholder", "Select branch");
  }
  await expect(page.locator("#fromProjectId")).toHaveAttribute("name", "fromProjectId");
  await expect(page.locator("#toProjectId")).toHaveAttribute("name", "toProjectId");
  await expect(page.locator("#fromBranch")).toHaveAttribute("name", "fromBranch");
  await expect(page.locator("#toBranch")).toHaveAttribute("name", "toBranch");
  expect(postRequests).toEqual([]);
});

test("project pull request create merge result route source uses legacy message keys", () => {
  const mergeResultStart = ROUTE_SOURCE.indexOf("function MergeResult(");
  const mergeResultEnd = ROUTE_SOURCE.indexOf("function legacyUrlSearch", mergeResultStart);
  const mergeResultSource = ROUTE_SOURCE.slice(mergeResultStart, mergeResultEnd);

  expect(mergeResultStart).toBeGreaterThanOrEqual(0);
  expect(mergeResultEnd).toBeGreaterThan(mergeResultStart);
  expect(ROUTE_SOURCE).toContain('commitMessageLabel={t("code.commitMsg")}');
  expect(ROUTE_SOURCE).toContain('commitDateLabel={t("code.commitDate")}');
  expect(ROUTE_SOURCE).toContain('authorLabel={t("code.author")}');
  expect(mergeResultSource).toContain("<strong>{commitMessageLabel}</strong>");
  expect(mergeResultSource).toContain("<strong>{commitDateLabel}</strong>");
  expect(mergeResultSource).toContain("<strong>{authorLabel}</strong>");
  expect(mergeResultSource).not.toContain("<strong>Commit message</strong>");
  expect(mergeResultSource).not.toContain("<strong>Commit date</strong>");
  expect(mergeResultSource).not.toContain("<strong>Author</strong>");
});

test("project pull request create form matches legacy git/create.scala.html core DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  const mergeResultRequests: string[] = [];
  await mockProjectPullRequestCreateForm(page, postRequests, { mergeResultRequests });

  expect(ROUTE_SOURCE).toContain('to="/$ownerName/$projectName/commit/$commitId"');
  expect(ROUTE_SOURCE).not.toContain("<a\n                    href={prefixBasePath");
  expect(ROUTE_SOURCE).not.toContain("window.history.back()");
  expect(ROUTE_SOURCE).toContain('<span id="pullRequestState"></span>');
  expect(ROUTE_SOURCE).not.toContain('id="pullRequestState" data-value="OPEN"');
  expect(ROUTE_SOURCE).not.toContain('data-value="OPEN"');
  expect(ROUTE_SOURCE).toContain("router.history.back()");

  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  const createFormUrl = page.url();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
  await expect(page.locator("#fromBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#toBranch")).toHaveAttribute("data-placeholder", "Select branch");
  await expect(page.locator("#fromProjectId option").nth(1)).toHaveText("admin / sample");
  await expect(page.locator("#fromProjectId option").nth(2)).toHaveText("admin / fork");
  await expect(page.locator("#toProjectId option").nth(1)).toHaveText("admin / sample");
  await expect(page.locator("#toProjectId option").nth(2)).toHaveText("admin / fork");
  await expect(page.locator("#pullRequestState")).toHaveCount(1);
  await expect(page.locator("#pullRequestState")).not.toHaveAttribute("data-value", /.*/u);
  await expect(page.locator("#status")).toHaveText("This pull request can be merged safely.");
  await expect(page.locator("#status")).toHaveClass(/alert-success/);
  await expect(page.locator("#title")).toHaveValue("Add UI");
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-title", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-body", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);
  await expect(page.locator("#mergeResult thead .messages strong")).toHaveText("Commit message");
  await expect(page.locator("#mergeResult thead .date strong")).toHaveText("Commit date");
  await expect(page.locator("#mergeResult thead .author strong")).toHaveText("Author");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("name", "body");
  await expect(page.locator("#editor-body-body")).toHaveAttribute(
    "data-editor-mode",
    "content-body",
  );
  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  await expect(page.locator('form.nm > ul.nav-tabs a[href="#__commits"]')).toHaveCount(0);
  const editorRoot = page.locator(".mt10").filter({ has: page.locator("#editor-body-body") });
  await expect(editorRoot).toHaveCount(1);
  await expect(editorRoot).not.toHaveAttribute("data-toggle", /.*/u);
  await expect(editorRoot.locator('.nav-tabs a[href="#edit-body"]')).toHaveCount(0);
  await expect(editorRoot.locator('.nav-tabs a[href="#preview-body"]')).toHaveCount(0);
  await expect(page.locator('form.nm > ul.nav-tabs [data-toggle="tab"]')).toHaveCount(0);
  await expect(editorRoot.locator('.nav-tabs [data-toggle="tab"]')).toHaveCount(0);
  const commitsTab = page.locator('form.nm > ul.nav-tabs button[type="button"]');
  const markdownTabButtons = editorRoot.locator('.nav-tabs > li > button[type="button"]');
  const editTab = editorRoot
    .locator('.nav-tabs > li > button[type="button"]')
    .filter({ hasText: /^Edit$/u });
  const previewTab = editorRoot
    .locator('.nav-tabs > li > button[type="button"]')
    .filter({ hasText: /^Preview$/u });
  await expect(commitsTab).toHaveCount(1);
  await expect(markdownTabButtons).toHaveText(["Edit", "Preview"]);
  await expect(editorRoot.locator(".add-task-list-button")).toHaveText(/Add checklist/u);
  await expect(editorRoot.locator("#button-clear-temporary")).toHaveText("Clear Temporary");
  await expect(editTab).toHaveCount(1);
  await expect(previewTab).toHaveCount(1);
  await expect(commitsTab).toHaveText("Commits1");
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(editTab).not.toHaveAttribute("data-mode", /.*/u);
  await expect(previewTab).not.toHaveAttribute("data-mode", /.*/u);
  await expect(editorRoot.locator('.nav-tabs button[type="button"][data-mode]')).toHaveCount(0);
  await expect(editorRoot.locator("#edit-body.tab-pane .textarea-box")).toHaveCount(1);
  await expect(editorRoot.locator("#preview-body.tab-pane .markdown-preview")).toHaveClass(
    /markdown-wrap/,
  );
  await expect(editorRoot.locator(".notification-receiver-title")).toHaveText(
    "Notification receivers",
  );
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help-wrap > .markdown-help-item")).toHaveCount(10);
  await expect(page.locator(".markdown-help .label")).toHaveText("Markdown help");
  const tableNav = page
    .locator(".markdown-help .markdown-help-nav > .help-nav")
    .filter({ hasText: /^Table$/u });
  await expect(page.locator(".markdown-help .help-nav[data-target]")).toHaveCount(0);
  await expect(tableNav).toHaveText("Table");
  await expect(page.locator("#upload")).toHaveAttribute("data-resource-type", "PULL_REQUEST");
  await expect(page.locator("#upload")).not.toHaveAttribute("data-resource-id", /.*/u);
  await expect(page.locator("#upload .attach-wrap")).toHaveCount(1);
  await expect(page.locator("#upload .help-droppable")).toHaveText(
    "Drag & Drop files to attach here or",
  );
  await expect(page.locator("#upload .fake-file-wrap")).toContainText("File upload");
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .plain")).toHaveText("Click upload button");
  await expect(page.locator("#upload .help-pastable")).toHaveText("Paste the clipboard image");
  await expect(page.locator("#upload ul.attached-files.unstyled > li")).toHaveCount(0);
  await expect(page.locator("#upload .right-txt.help")).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);
  await expect(page.locator('form.nm > div > script[type="text/x-jquery-tmpl"]')).toHaveCount(0);
  await expect(page.locator("#mergeResult .commit-id a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef1234567890`,
  );
  const cancelButton = await expectModernCancelControl(page);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  await previewTab.click();
  await expect(page).toHaveURL(createFormUrl);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).not.toHaveClass(/active/);
  await expect(
    page.locator("#preview-body .markdown-preview.markdown-wrap.content-body"),
  ).toHaveCount(1);
  await editTab.click();
  await expect(page).toHaveURL(createFormUrl);
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-body")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-body .textarea-box > #editor-body-body")).toHaveCount(1);
  await commitsTab.click();
  await expect(page).toHaveURL(createFormUrl);
  await expect(page.locator("form.nm > ul.nav-tabs > li")).toHaveClass(/active/);
  await expect(page.locator("#__commits")).toHaveClass(/active/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  expect(await canonicalize(page, ".content-wrap.frm-wrap")).toEqual(
    await canonicalizeHtml(
      page,
      withLegacyFileUploader(withLegacyEditor(EXPECTED_CREATE_FORM))
        .replaceAll("__BASE_PATH__", basePath)
        .replace(
          `${basePath}/assets/images/default-avatar-32.png`,
          `${basePath}/legacy-assets/images/default-avatar-128.png`,
        ),
    ),
  );
  expect(await createFormMetrics(page)).toEqual({
    actionDisplay: "block",
    actionMarginTop: "20px",
    actionTextAlign: "center",
    arrowColor: "rgb(126, 126, 126)",
    arrowFontSize: "32px",
    arrowLeft: 614,
    arrowMarginLeft: "-16px",
    arrowPosition: "absolute",
    arrowTop: "20px",
    branchWrapDisplay: "block",
    branchWrapMarginBottom: "20px",
    branchWrapMinHeight: "55px",
    branchWrapPosition: "relative",
    contentWidth: 1260,
    fieldTitleDisplay: "block",
    fieldTitleFontWeight: "700",
    mergeTableWidth: 1260,
    mergeWrapWidth: 1260,
    titleWidth: 1236,
  });
  expect(await commitTabBadgeMetrics(page)).toEqual({
    badgeBackground: "rgba(0, 0, 0, 0)",
    badgePadding: "2px 4px",
    tabWidth: 135,
  });
  expect(await markdownHelpMetrics(page)).toEqual({
    firstItemHeightClosed: "0px",
    navBackground: "rgb(247, 247, 247)",
    navBorderBottomWidth: "0px",
    navBorderTopWidth: "1px",
    navLineHeight: "20px",
    syntaxPreMargin: "0px",
    tableHeaderLineHeight: "30px",
  });
  await tableNav.click();
  await expect(tableNav).toHaveClass(/active/);
  await expect(page.locator(".markdown-help-wrap > .markdownTables")).toHaveClass(/active/);
  await tableNav.click();
  await expect(tableNav).not.toHaveClass(/active/);
  await expect(page.locator(".markdown-help-wrap > .markdownTables")).not.toHaveClass(/active/);

  await page.evaluate((url) => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
    window.history.pushState({ cancelTest: true }, "", url);
  }, `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main&cancel-test=1`);
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main&cancel-test=1`,
  );
  await cancelButton.click();
  await expect(page).toHaveURL(createFormUrl);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
      ),
    )
    .toBe("kept");

  await page.locator("#title").dispatchEvent("keyup", { key: "Enter", keyCode: 13, which: 13 });
  await expect(page.locator("#title")).toHaveValue("Add UI");
  await page.locator("#title").clear();
  await page.locator("#title").pressSequentially("Manual title");
  await selectLegacyOption(page, "#fromBranch", "main");
  await expect(page).toHaveURL(/fromBranch=main/u);
  expect(mergeResultRequests.some((url) => url.includes("fromBranch=main"))).toBe(true);
  await expect(page.locator("#title")).toHaveValue("Manual title");
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-title", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-body", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);
  await expect(page.locator("#numOfCommits")).toHaveText("1");
  await expect(page.locator("#status")).toHaveText("This pull request can be merged safely.");

  await selectLegacyOption(page, "#fromProjectId", "8");
  await expect(page).toHaveURL(/fromProjectId=8/u);
  await expect(page).toHaveURL(/toProjectId=7/u);

  await page.fill("#title", "Improve UI");
  await page.fill("#editor-body-body", "Body text");
  await page.click('form.nm button[type="submit"]');

  await expect
    .poll(() => postRequests)
    .toEqual([
      {
        attachmentIds: [],
        bodyMarkdown: "Body text",
        fromBranch: "feature/ui",
        fromProjectId: 8,
        title: "Improve UI",
        toBranch: "main",
        toProjectId: 7,
      },
    ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequests`);
});

test("pull request merge result suggestions are state-owned until the user types", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  const mergeResultRequests: string[] = [];
  await mockProjectPullRequestCreateForm(page, postRequests, {
    mergeResultRequests,
    suggestedBody: true,
  });

  expect(ROUTE_SOURCE).not.toContain(".current.value = mergeResultTitle");
  expect(ROUTE_SOURCE).not.toContain(".current.value = mergeResultBody");
  expect(ROUTE_SOURCE).not.toContain("titleRef.current");
  expect(ROUTE_SOURCE).not.toContain("bodyRef.current");
  expect(ROUTE_SOURCE).not.toContain("document.querySelector");
  expect(ROUTE_SOURCE).not.toContain("document.getElementById");
  expect(ROUTE_SOURCE).not.toContain("addEventListener(");
  expect(ROUTE_SOURCE).not.toContain("classList.");
  expect(ROUTE_SOURCE).not.toContain("innerHTML");
  expect(ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(ROUTE_SOURCE).toContain('const [titleValue, setTitleValue] = useState("");');
  expect(ROUTE_SOURCE).toContain('const [bodyValue, setBodyValue] = useState("");');
  expect(ROUTE_SOURCE).toContain("setTitleValue(mergeResultTitle)");
  expect(ROUTE_SOURCE).toContain("setBodyValue(mergeResultBody)");
  expect(ROUTE_SOURCE).toContain("defaultValue={titleValue}");
  expect(ROUTE_SOURCE).toContain("defaultValue={bodyValue}");
  expect(ROUTE_SOURCE).not.toContain("data-is-user-has-typed");
  expect(ROUTE_SOURCE).not.toContain("data-commits");
  expect(ROUTE_SOURCE).not.toContain("data-pullrequest-title");
  expect(ROUTE_SOURCE).not.toContain("data-pullrequest-body");
  expect(ROUTE_SOURCE).not.toContain("data-conflict");

  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );

  await expect(page.locator("#title")).toHaveValue("Add UI");
  await expect(page.locator("#editor-body-body")).toHaveValue("Suggested body");
  await expect(page.locator("#title")).not.toHaveAttribute("data-is-user-has-typed", /.*/u);
  await expect(page.locator("#editor-body-body")).not.toHaveAttribute(
    "data-is-user-has-typed",
    /.*/u,
  );
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-title", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-body", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);

  await page.fill("#title", "Manual title");
  await page.fill("#editor-body-body", "Manual body");
  await expect(page.locator("#title")).not.toHaveAttribute("data-is-user-has-typed", /.*/u);
  await expect(page.locator("#editor-body-body")).not.toHaveAttribute(
    "data-is-user-has-typed",
    /.*/u,
  );

  await selectLegacyOption(page, "#fromBranch", "main");
  await expect(page).toHaveURL(/fromBranch=main/u);
  expect(mergeResultRequests.some((url) => url.includes("fromBranch=main"))).toBe(true);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-title", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-body", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);
  await expect(page.locator("#title")).toHaveValue("Manual title");
  await expect(page.locator("#editor-body-body")).toHaveValue("Manual body");
  expect(postRequests).toEqual([]);
});

test("pull request create form preserves legacy yobi.git.Write submit validation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectPullRequestCreateForm(page, postRequests, { mergeMode: "empty" });
  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  const noChangesDialog = nextDialogMessage(page);
  await page.click('form.nm button[type="submit"]');
  await expect(noChangesDialog).resolves.toBe("No changes have been made.");
  expect(postRequests).toEqual([]);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockProjectPullRequestCreateForm(page, postRequests, { mergeMode: "normal" });
  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  await page.fill("#title", "");
  const titleDialog = nextDialogMessage(page);
  await page.click('form.nm button[type="submit"]');
  await expect(titleDialog).resolves.toBe("Title is a required field.");
  expect(postRequests).toEqual([]);

  expect(ROUTE_SOURCE).not.toContain("window.confirm(");
  expect(ROUTE_SOURCE).toContain("function PullRequestConflictConfirmModal(");
  expect(ROUTE_SOURCE).toContain(
    'className={isOpen ? "modal hide yobiDialog in" : "modal hide yobiDialog"}',
  );
  expect(ROUTE_SOURCE).toContain('style={{ display: isOpen ? "block" : "none" }}');
  expect(ROUTE_SOURCE).not.toContain('data-dismiss="modal"');
  expect(ROUTE_SOURCE).not.toContain("dismissPullRequestConflictConfirmButtonClick");
  expect(ROUTE_SOURCE).toContain('{isOpen ? <div className="modal-backdrop in"></div> : null}');
  expect(ROUTE_SOURCE).toContain("setForceSubmit(true)");

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockProjectPullRequestCreateForm(page, postRequests, { mergeMode: "conflict" });
  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  const createFormUrl = page.url();
  const conflictDialogMessages: string[] = [];
  page.on("dialog", async (dialog) => {
    conflictDialogMessages.push(dialog.message());
    await dialog.dismiss();
  });
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveClass(/hide/u);
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveClass("modal hide yobiDialog");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker =
      "pull-request-conflict-confirm";
  });
  await armRootModalBridgeTrap(page);
  await page.click('form.nm button[type="submit"]');
  await expect(page).toHaveURL(createFormUrl);
  await expect(page.locator("#pullRequestConflictConfirm")).toBeVisible();
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveClass("modal hide yobiDialog in");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveCSS("display", "block");
  await expect(page.locator("#pullRequestConflictConfirm .message .msg")).toHaveText(
    "This code seems to have conflicts when merging. Do you really want to continue?",
  );
  await expect(
    page.locator('#pullRequestConflictConfirm .center-txt.buttons button[type="button"]'),
  ).toHaveText(["Cancel", "Confirm"]);
  await expect(page.locator('#pullRequestConflictConfirm [data-dismiss="modal"]')).toHaveCount(0);
  await expect(page.locator('#pullRequestConflictConfirm [data-toggle="modal"]')).toHaveCount(0);
  await expect(
    page.locator("#pullRequestConflictConfirm .btn-dismiss .btn-transparent"),
  ).not.toHaveAttribute("data-dismiss", /.*/u);
  await expect(
    page
      .locator('#pullRequestConflictConfirm .center-txt.buttons button[type="button"]')
      .filter({ hasText: /^Cancel$/u }),
  ).not.toHaveAttribute("data-dismiss", /.*/u);
  await expect(page.locator("#pullRequestConflictConfirm .ybtn.ybtn-primary")).not.toHaveAttribute(
    "data-dismiss",
    /.*/u,
  );
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(
    page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).resolves.toBe("pull-request-conflict-confirm");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(postRequests).toEqual([]);
  expect(conflictDialogMessages).toEqual([]);

  await armRootModalBridgeTrap(page);
  await page
    .locator('#pullRequestConflictConfirm .center-txt.buttons button[type="button"]')
    .filter({ hasText: /^Cancel$/u })
    .click();
  await expect(page).toHaveURL(createFormUrl);
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveClass("modal hide yobiDialog");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(
      () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
    ),
  ).resolves.toBe("pull-request-conflict-confirm");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(postRequests).toEqual([]);
  expect(conflictDialogMessages).toEqual([]);

  await page.fill("#title", "");
  await page.click('form.nm button[type="submit"]');
  await expect(page.locator("#pullRequestConflictConfirm")).toBeVisible();
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveClass("modal hide yobiDialog in");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  expect(postRequests).toEqual([]);

  await armRootModalBridgeTrap(page);
  await page.locator("#pullRequestConflictConfirm .ybtn.ybtn-primary").click();
  await expect.poll(() => conflictDialogMessages).toEqual(["Title is a required field."]);
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveClass("modal hide yobiDialog");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveCSS("display", "none");
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(postRequests).toEqual([]);
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await page.fill("#title", "Conflict accepted title");
  await page.click('form.nm button[type="submit"]');
  await expect(page.locator("#pullRequestConflictConfirm")).toHaveClass(/hide/u);
  await expect.poll(() => postRequests.length).toBe(1);
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(conflictDialogMessages).toEqual(["Title is a required field."]);
});

test("project pull request create form markdown editor and uploader omit legacy local raw injection", () => {
  const editorStart = ROUTE_SOURCE.indexOf("function PullRequestMarkdownEditor");
  const editorEnd = ROUTE_SOURCE.indexOf("function PullRequestFileUploader", editorStart);
  const editorSource = ROUTE_SOURCE.slice(editorStart, editorEnd);
  const uploaderStart = ROUTE_SOURCE.indexOf("function PullRequestFileUploader");
  const uploaderEnd = ROUTE_SOURCE.indexOf("function MergeResult", uploaderStart);
  const uploaderSource = ROUTE_SOURCE.slice(uploaderStart, uploaderEnd);

  expect(editorStart).toBeGreaterThanOrEqual(0);
  expect(editorEnd).toBeGreaterThan(editorStart);
  expect(uploaderStart).toBeGreaterThanOrEqual(0);
  expect(uploaderEnd).toBeGreaterThan(uploaderStart);
  expect(ROUTE_SOURCE).toContain(
    'import { LegacyMarkdownHelp } from "../../-legacy-markdown-help"',
  );
  expect(ROUTE_SOURCE).not.toContain("help/markdown.scala.html");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpTemplate");
  expect(ROUTE_SOURCE).not.toContain("legacyMarkdownHelpHtml");
  expect(ROUTE_SOURCE).not.toContain('data-toggle="markdown-editor"');
  expect(editorSource).not.toContain("markdown-editor");
  expect(ROUTE_SOURCE).not.toContain("dangerouslySetInnerHTML");
  expect(editorSource).toContain("<LegacyMarkdownHelp />");
  expect(editorSource).toContain('className="mt10"');
  expect(editorSource).not.toContain('data-mode="edit"');
  expect(editorSource).not.toContain('data-mode="preview"');
  expect(editorSource).not.toContain("data-mode");
  expect(editorSource).toContain('name="body"');
  expect(editorSource).toContain('data-editor-mode="content-body"');
  expect(editorSource).toContain('id="editor-body-body"');
  expect(editorSource).toContain('id="preview-body"');
  expect(uploaderSource).not.toContain("tplAttachedFile");
  expect(uploaderSource).not.toContain("tplDropFilesHere");
  expect(uploaderSource).not.toContain("text/x-jquery-tmpl");
  expect(uploaderSource).not.toContain('className="attached-file"');
  expect(uploaderSource).not.toContain('class="attached-file"');
  expect(uploaderSource).not.toContain("upload-drop-here");
  expect(uploaderSource).not.toContain("${fileId}");
  expect(uploaderSource).not.toContain("${fileName}");
  expect(uploaderSource).not.toContain("${fileHref}");
  expect(uploaderSource).not.toContain("${mimeType}");
  expect(uploaderSource).not.toContain("${fileSizeReadable}");
});

async function createFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((content) => {
    const branchWrap = content.querySelector<HTMLElement>(".pull-request-wrap");
    const arrow = content.querySelector<HTMLElement>(".pull-request-wrap .arrow");
    const fieldTitle = content.querySelector<HTMLElement>(".pull-request-wrap .field-title");
    const title = content.querySelector<HTMLElement>("input#title.text");
    const actions = content.querySelector<HTMLElement>(".actions");
    const mergeWrap = content.querySelector<HTMLElement>("#mergeResult.code-browser-wrap");
    const mergeTable = content.querySelector<HTMLElement>("#mergeResult .code-table.commits");
    const missing = Object.entries({
      actions,
      arrow,
      branchWrap,
      fieldTitle,
      mergeTable,
      mergeWrap,
      title,
    })
      .filter(([, element]) => !element)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Expected pull request create metric targets are missing: ${missing.join(", ")}`,
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
      contentWidth: Math.round(content.getBoundingClientRect().width),
      fieldTitleDisplay: fieldTitleStyle.display,
      fieldTitleFontWeight: fieldTitleStyle.fontWeight,
      mergeTableWidth: Math.round(mergeTable.getBoundingClientRect().width),
      mergeWrapWidth: Math.round(mergeWrap.getBoundingClientRect().width),
      titleWidth: Math.round(title.getBoundingClientRect().width),
    };
  });
}

async function commitTabBadgeMetrics(page: Page) {
  return page.locator("form.nm > ul.nav-tabs.mt20 > li.active").evaluate((tab) => {
    const badge = tab.querySelector<HTMLElement>("#numOfCommits");
    if (!badge) throw new Error("Expected pull request commit badge is missing");
    const badgeStyle = getComputedStyle(badge);
    return {
      badgeBackground: badgeStyle.backgroundColor,
      badgePadding: badgeStyle.padding,
      tabWidth: Math.round(tab.getBoundingClientRect().width),
    };
  });
}

async function inlineControlWhitespace(page: Page) {
  return page.evaluate(() => {
    const save = document.querySelector<HTMLElement>('.actions button[type="submit"]');
    const cancel = save?.nextElementSibling as HTMLElement | null;
    const fromProject = document.querySelector<HTMLElement>("#fromProjectId");
    const toProject = document.querySelector<HTMLElement>("#toProjectId");
    if (!save || !cancel || !fromProject || !toProject) {
      throw new Error("Expected pull request inline controls are missing");
    }
    const hasWhitespaceAfter = (element: HTMLElement) =>
      element.nextSibling?.nodeType === Node.TEXT_NODE &&
      /\s/u.test(element.nextSibling.textContent ?? "");
    return {
      actionGap: Math.round(
        cancel.getBoundingClientRect().left - save.getBoundingClientRect().right,
      ),
      actionWhitespace: hasWhitespaceAfter(save),
      fromSelectorWhitespace: hasWhitespaceAfter(fromProject),
      toSelectorWhitespace: hasWhitespaceAfter(toProject),
    };
  });
}

async function select2ChoiceGeometry(page: Page) {
  return page.evaluate(() =>
    ["fromProjectId", "fromBranch", "toProjectId", "toBranch"].map((id) => {
      const box = document
        .querySelector<HTMLElement>(`#s2id_${id} .select2-choice`)!
        .getBoundingClientRect();
      return { height: Math.round(box.height), id, width: Math.round(box.width) };
    }),
  );
}

async function select2ContainerGeometry(page: Page) {
  return page.evaluate(() =>
    ["fromProjectId", "fromBranch", "toProjectId", "toBranch"].map((id) => {
      const box = document.querySelector<HTMLElement>(`#s2id_${id}`)!.getBoundingClientRect();
      return { height: Math.round(box.height), id, width: Math.round(box.width) };
    }),
  );
}

async function markdownHelpMetrics(page: Page) {
  return page.locator(".markdown-help").evaluate((root) => {
    const nav = root.querySelector<HTMLElement>(".markdown-help-nav");
    const firstNavItem = root.querySelector<HTMLElement>(".markdown-help-nav li");
    const firstItem = root.querySelector<HTMLElement>(".markdown-help-wrap > .markdown-help-item");
    const thead = root.querySelector<HTMLElement>(".markdown-help-item .thead div");
    const pre = root.querySelector<HTMLElement>(".markdwon-syntax pre");
    if (!nav || !firstNavItem || !firstItem || !thead || !pre) {
      throw new Error("Expected markdown help metric targets are missing.");
    }
    const navStyle = getComputedStyle(nav);
    return {
      firstItemHeightClosed: getComputedStyle(firstItem).height,
      navBackground: navStyle.backgroundColor,
      navBorderBottomWidth: navStyle.borderBottomWidth,
      navBorderTopWidth: navStyle.borderTopWidth,
      navLineHeight: getComputedStyle(firstNavItem).lineHeight,
      syntaxPreMargin: getComputedStyle(pre).margin,
      tableHeaderLineHeight: getComputedStyle(thead).lineHeight,
    };
  });
}

async function projectShellMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("header.gnb-outer.project-header");
    const searchBox = document.querySelector<HTMLElement>(".gnb-search-form .search-box");
    const projectHeader = document.querySelector<HTMLElement>(".project-header-outer");
    const projectMenu = document.querySelector<HTMLElement>(".project-menu-outer");
    if (!navbar || !searchBox || !projectHeader || !projectMenu) {
      throw new Error("Expected project shell metric targets are missing.");
    }

    const navbarBox = navbar.getBoundingClientRect();
    const searchBoxBox = searchBox.getBoundingClientRect();
    const projectHeaderBox = projectHeader.getBoundingClientRect();
    const projectMenuBox = projectMenu.getBoundingClientRect();
    return {
      navbar: {
        bottom: navbarBox.bottom,
        right: navbarBox.right,
        top: navbarBox.top,
      },
      projectHeader: {
        bottom: projectHeaderBox.bottom,
        top: projectHeaderBox.top,
      },
      projectMenu: {
        top: projectMenuBox.top,
      },
      searchBox: {
        bottom: searchBoxBox.bottom,
        right: searchBoxBox.right,
        top: searchBoxBox.top,
      },
    };
  });
}

async function mockProjectPullRequestCreateForm(
  page: Page,
  postRequests: unknown[],
  options: {
    authorDateLabel?: string;
    formOptionRequests?: string[];
    mergeMode?: "conflict" | "empty" | "normal";
    mergeResultRequests?: string[];
    project?: Partial<MockProjectRoute>;
    suggestedBody?: boolean;
  } = {},
) {
  const project = { ...DEFAULT_PROJECT_ROUTE, ...options.project };
  const containerPath = `**/api/v1/owners/${project.ownerName}/projects/${project.projectName}/container`;
  const formOptionsPath = `**/api/v1/owners/${project.ownerName}/projects/${project.projectName}/pull-requests/form-options**`;
  const mergeResultPath = `**/api/v1/owners/${project.ownerName}/projects/${project.projectName}/pull-requests/merge-result?*`;
  const pullRequestsPath = `**/api/v1/owners/${project.ownerName}/projects/${project.projectName}/pull-requests`;

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
  await page.route(containerPath, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: project.projectId,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: project.isProtected ?? false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: project.organizationName,
        ownerName: project.ownerName,
        projectName: project.projectName,
        projectScope: project.isProtected ? "protected" : "public",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route(formOptionsPath, async (route) => {
    const url = new URL(route.request().url());
    options.formOptionRequests?.push(url.toString());
    const fromBranch = url.searchParams.get("fromBranch") || "feature/ui";
    const fromProjectId = Number(url.searchParams.get("fromProjectId")) || project.projectId;
    const toProjectId = Number(url.searchParams.get("toProjectId")) || project.projectId;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        fromBranches: [
          { name: "feature/ui", selected: fromBranch === "feature/ui" },
          { name: "main", selected: fromBranch === "main" },
        ],
        fromProjects: [
          {
            id: project.projectId,
            ownerName: project.ownerName,
            projectName: project.projectName,
            selected: fromProjectId === project.projectId,
          },
          {
            id: project.forkedProjectId,
            ownerName: project.forkProjectOwnerName,
            projectName: project.forkProjectName,
            selected: fromProjectId === project.forkedProjectId,
          },
        ],
        mode: "create",
        selected: {
          fromBranch,
          fromProjectId,
          toBranch: "main",
          toProjectId,
        },
        toBranches: [{ name: "main", selected: true }],
        toProjects: [
          {
            id: project.projectId,
            ownerName: project.ownerName,
            projectName: project.projectName,
            selected: toProjectId === project.projectId,
          },
          {
            id: project.forkedProjectId,
            ownerName: project.forkProjectOwnerName,
            projectName: project.forkProjectName,
            selected: toProjectId === project.forkedProjectId,
          },
        ],
      }),
    });
  });
  await page.route(mergeResultPath, async (route) => {
    const url = new URL(route.request().url());
    options.mergeResultRequests?.push(url.toString());
    const fromBranch = url.searchParams.get("fromBranch") || "feature/ui";
    const commitMessage =
      fromBranch === "main"
        ? options.suggestedBody
          ? "Main branch change\n\nUpdated body"
          : "Main branch change"
        : options.suggestedBody
          ? "Add UI\n\nSuggested body"
          : "Add UI";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        commits:
          options.mergeMode === "empty"
            ? []
            : [
                {
                  authorDateLabel: options.authorDateLabel ?? "Jul 2, 2026",
                  authorEmail: "dev@example.com",
                  commitId: "abcdef1234567890",
                  commitMessage,
                  commitShortId: "abcdef1",
                  state: "CURRENT",
                },
              ],
        conflict: options.mergeMode === "conflict",
        noHead: false,
      }),
    });
  });
  await page.route(pullRequestsPath, async (route) => {
    if (route.request().method() === "POST") {
      postRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ pullRequestNumber: 9 }),
      });
      return;
    }
    await route.fallback();
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

function nextDialogMessage(page: Page) {
  return page.waitForEvent("dialog").then(async (dialog) => {
    const message = dialog.message();
    await dialog.dismiss();
    return message;
  });
}

async function armRootModalBridgeTrap(page: Page) {
  await page.evaluate(() => {
    const win = window as Window &
      typeof globalThis & {
        __yonaRootModalBridgeHits?: string[];
        __yonaRootModalBridgeTrapArmed?: boolean;
      };
    win.__yonaRootModalBridgeHits = [];
    if (win.__yonaRootModalBridgeTrapArmed) {
      return;
    }
    win.__yonaRootModalBridgeTrapArmed = true;
    document.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const bridged = target?.closest('[data-toggle="modal"], [data-dismiss="modal"]');
      if (bridged) {
        win.__yonaRootModalBridgeHits?.push(
          `${bridged.tagName.toLowerCase()}#${bridged.id}.${bridged.className}`,
        );
      }
    });
  });
}

async function rootModalBridgeHits(page: Page) {
  return page.evaluate(
    () =>
      (
        window as Window &
          typeof globalThis & {
            __yonaRootModalBridgeHits?: string[];
          }
      ).__yonaRootModalBridgeHits ?? [],
  );
}

async function selectLegacyOption(page: Page, selector: string, value: string) {
  await page.locator(selector).evaluate(
    (select, args) => {
      if (!(select instanceof HTMLSelectElement)) {
        throw new Error(`${args.selector} is not a select element`);
      }
      select.value = args.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { selector, value },
  );
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    const clone = root.cloneNode(true) as Element;
    clone.querySelectorAll(".select2-container").forEach((element) => element.remove());
    clone.querySelectorAll("select.select2-offscreen").forEach((element) => {
      element.classList.remove("select2-offscreen");
      if (element.getAttribute("class") === "") element.removeAttribute("class");
      element.removeAttribute("tabindex");
    });
    return visit(clone);

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
            !(node instanceof HTMLInputElement && node.id === "title" && attr.name === "value"),
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
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
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
    return root ? visit(root) : "";

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
            !(node instanceof HTMLInputElement && node.id === "title" && attr.name === "value"),
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
      return `${open}${Array.from(node.childNodes).map(visit).join("")}</${node.tagName.toLowerCase()}>`;
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
