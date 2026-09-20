import { expect, test, type Page } from "../wtr-compat.ts";

test.setTimeout(60_000);

type MockProjectRoute = {
  forkProjectName: string;
  forkProjectOwnerName: string;
  forkedProjectId: number;
  isProtected?: boolean;
  organizationName?: string;
  ownerName: string;
  projectId: number;
  projectName: string;
  vcs?: string;
};

const DEFAULT_PROJECT_ROUTE: MockProjectRoute = {
  forkedProjectId: 8,
  forkProjectName: "fork",
  forkProjectOwnerName: "admin",
  ownerName: "admin",
  projectId: 7,
  projectName: "sample",
  vcs: "GIT",
};

test("SVN pull request create route renders the legacy Git-only bad request", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addInitScript((configuredBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await mockProjectPullRequestCreateForm(page, [], {
    project: {
      ownerName: "admin",
      projectName: "svnplayground",
      projectId: 9,
      vcs: "Subversion",
    },
  });

  await page.goto(`${basePath}/admin/svnplayground/newPullRequestForm`);

  await expect(page).toHaveURL(`${basePath}/admin/svnplayground/newPullRequestForm`);
  await expect(page).toHaveTitle("GIT 프로젝트에서만 지원하는 요청입니다.");
  await expect(page.locator(".project-header-outer, .project-menu-outer")).toHaveCount(0);
  await expect(page.locator(".content-wrap.frm-wrap")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer > .project-page-wrap > .error-wrap")).toHaveCount(1);
  await expect(page.locator(".error-wrap > i.ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p")).toHaveText(
    "GIT 프로젝트에서만 지원하는 요청입니다.",
  );
  await expect(page.locator(".error-wrap > a.ybtn.ybtn-info")).toHaveText("홈");
  await expect(page.locator(".error-wrap > a.ybtn.ybtn-info")).toHaveAttribute(
    "href",
    `${basePath}/`,
  );
  await expect(page.locator('[data-owner="site-admin-affix"]')).toBeVisible();
  const geometry = await page.evaluate(() => {
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer")!;
    const projectPage = document.querySelector<HTMLElement>(".project-page-wrap")!;
    const error = document.querySelector<HTMLElement>(".error-wrap")!;
    const box = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      };
    };
    return {
      documentWidth: document.documentElement.scrollWidth,
      error: box(error),
      page: box(pageWrap),
      projectPage: box(projectPage),
    };
  });
  expect(geometry).toEqual({
    documentWidth: 1366,
    // F5 dist-truth: shared DefaultSearchErrorBody renders the ico-404 sprite
    // visibly (80px, blessed by project-pullrequests.e2e.ts + search-global
    // specs); legacy badrequest_default.scala.html's bare ico-404 has no CSS.
    // F5 dist-truth (2026-08-11 ledger): ko-KR 16px-bold .error-wrap p line-box
    // measures 390px (388 pinned vs 390 measured, font-metric variance)
    // F5 (2026-08-13): y 93 = gnb 40 + admin affix 43 + _page.less:617-620
    // margin-top 10 (SVN Git-only badrequest shell; same as pullrequests pageY).
    error: { height: 390, width: 1346, x: 10, y: 93 },
    page: { height: 450, width: 1366, x: 0, y: 93 },
    projectPage: { height: 390, width: 1346, x: 10, y: 93 },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator(".error-wrap > p")).toHaveText(
    "GIT 프로젝트에서만 지원하는 요청입니다.",
  );
  const mobileGeometry = await page.evaluate(() => {
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer")!;
    const projectPage = document.querySelector<HTMLElement>(".project-page-wrap")!;
    const error = document.querySelector<HTMLElement>(".error-wrap")!;
    const box = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      return {
        height: Math.round(rect.height),
        width: Math.round(rect.width),
        x: Math.round(rect.x),
        y: Math.round(rect.y),
      };
    };
    return {
      documentWidth: document.documentElement.scrollWidth,
      error: box(error),
      page: box(pageWrap),
      projectPage: box(projectPage),
    };
  });
  expect(mobileGeometry).toEqual({
    documentWidth: 390,
    // F5 dist-truth: ko 16px-bold .error-wrap p line-box measures 390px at 390px viewport too (ledger 2026-08-11)
    error: { height: 390, width: 390, x: 0, y: 93 },
    page: { height: 450, width: 390, x: 0, y: 93 },
    projectPage: { height: 390, width: 390, x: 0, y: 93 },
  });
});

test("Alice empty pull-request source renders the legacy project-layout bad request", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockProjectPullRequestCreateForm(page, [], {
    formOptionsStatus: 400,
    project: {
      forkProjectName: "sample",
      forkProjectOwnerName: "admin",
      ownerName: "alice",
      projectId: 3,
      projectName: "sample",
      vcs: "GIT",
    },
  });

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/alice/sample/newPullRequestForm`);
  await expect(page).toHaveTitle("코드를 보내는 프로젝트의 저장소가 없습니다. - alice/sample");
  await expect(page.locator(".project-header-outer")).toHaveCount(1);
  await expect(page.locator(".project-menu-outer")).toHaveCount(1);
  await expect(page.locator(".content-wrap.frm-wrap")).toHaveCount(0);
  await expect(page.locator(".page-wrap-outer > .project-page-wrap > .error-wrap")).toHaveCount(1);
  await expect(page.locator(".error-wrap > i.ico.ico-err2")).toHaveCount(1);
  await expect(page.locator(".error-wrap > p")).toHaveText(
    "코드를 보내는 프로젝트의 저장소가 없습니다.",
  );
  const desktop = await pullRequestCreateErrorGeometry(page);
  expect(desktop.documentWidth).toBe(1366);
  expect(desktop.error.left).toBeGreaterThanOrEqual(desktop.projectPage.left);
  expect(desktop.error.right).toBeLessThanOrEqual(desktop.projectPage.right);
  expect(desktop.projectPage.top).toBeGreaterThanOrEqual(desktop.projectMenu.bottom - 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await pullRequestCreateErrorGeometry(page);
  expect(mobile.documentWidth).toBe(390);
  expect(mobile.error.left).toBeGreaterThanOrEqual(mobile.projectPage.left);
  expect(mobile.error.right).toBeLessThanOrEqual(390);
  expect(mobile.projectPage.width).toBe(390);
});

test("project pull request create form resolves legacy defaults without query parameters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const formOptionRequests: string[] = [];
  await mockProjectPullRequestCreateForm(page, [], { formOptionRequests });

  await page.goto(`${basePath}/admin/sample/newPullRequestForm`);

  await expect(page).toHaveURL(`${basePath}/admin/sample/newPullRequestForm`);
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
  await expect(page.locator("#s2id_fromBranch [role=listbox]")).toBeVisible();
  await expect(page.locator("#s2id_fromBranch [role=option]")).toHaveText([
    "branch feature/ui",
    "branch main",
  ]);
  await page.locator("#s2id_fromBranch .select2-input").press("Escape");
  await expect(page.locator("#s2id_fromBranch .select2-choice")).toBeFocused();
  await expect(page.locator("#s2id_fromBranch [role=listbox]")).toHaveCount(0);
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("#upload")
        .evaluate((element) => Math.round(element.getBoundingClientRect().height)),
    )
    .toBe(70);
  expect(await inlineControlWhitespace(page)).toEqual({
    // git/create.scala.html:99-100 retains whitespace in addition to .ybtn's .3em margin.
    actionGap: 8,
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
  await page.clock.setFixedTime(new Date("2026-07-12T12:00:00Z"));
  await mockProjectPullRequestCreateForm(page, [], {
    authorDateLabel: "2026-07-12T10:00:00Z",
  });
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`);

  const date = page.locator("#mergeResult tbody td.date");
  await expect(date).toHaveText("2시간 전");
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
    await expect(page.locator("header[data-owner=global-gnb-outer]")).toHaveCount(1);
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
        .locator("#gnb-search-scope-title, [data-owner=global-gnb-search-scope-item] > button")
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

  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );

  await expect(page.locator(".pull-request-wrap select[data-toggle='select2']")).toHaveCount(0);
  for (const selector of ["#fromProjectId", "#fromBranch", "#toProjectId", "#toBranch"]) {
    await expect(page.locator(selector)).not.toHaveAttribute("data-toggle", /.*/u);
  }
  for (const selector of ["#fromBranch", "#toBranch"]) {
    await expect(page.locator(selector)).not.toHaveAttribute("data-format", /.*/u);
    await expect(page.locator(selector)).not.toHaveAttribute("data-dropdown-css-class", /.*/u);
    await expect(page.locator(selector)).not.toHaveAttribute("data-placeholder", /.*/u);
  }
  await expect(page.locator("#fromProjectId")).toHaveAttribute("name", "fromProjectId");
  await expect(page.locator("#toProjectId")).toHaveAttribute("name", "toProjectId");
  await expect(page.locator("#fromBranch")).toHaveAttribute("name", "fromBranch");
  await expect(page.locator("#toBranch")).toHaveAttribute("name", "toBranch");
  expect(postRequests).toEqual([]);
});

test("project pull request create preserves legacy form controls and branch navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  const mergeResultRequests: string[] = [];
  await mockProjectPullRequestCreateForm(page, postRequests, { mergeResultRequests });

  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  const createFormUrl = page.url();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText(
    "Pull request",
  );
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
  await expect(page.locator("#upload p.help")).toContainText(
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

  expect(await createFormMetrics(page)).toEqual({
    actionDisplay: "block",
    actionMarginTop: "20px",
    actionTextAlign: "center",
    // F5 dist-truth: legacy _page.less .arrow color @yobi-gray #95A5A6
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
  await page.locator("#s2id_fromBranch .select2-choice").click();
  await page.locator("#s2id_fromBranch .select2-input").fill("main");
  await page.locator("#s2id_fromBranch .select2-input").press("Enter");
  await expect(page).toHaveURL(/fromBranch=main/u);
  expect(mergeResultRequests.some((url) => url.includes("fromBranch=main"))).toBe(true);
  await expect(page.locator("#title")).toHaveValue("Manual title");
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-commits", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-title", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-pullrequest-body", /.*/u);
  await expect(page.locator("#mergeResult")).not.toHaveAttribute("data-conflict", /.*/u);
  await expect(page.locator("#numOfCommits")).toHaveText("1");
  await expect(page.locator("#status")).toHaveText("This pull request can be merged safely.");

  await page.locator("#s2id_fromProjectId .select2-choice").click();
  await page
    .locator("#s2id_fromProjectId [role=option]")
    .filter({ hasText: "admin / fork" })
    .click();
  await expect(page).toHaveURL(/fromProjectId=8/u);
  await expect(page).toHaveURL(/toProjectId=7/u);
  await expect(page.locator("#mergeResult .commit-id a")).toHaveAttribute(
    "href",
    `${basePath}/admin/fork/commit/abcdef1234567890`,
  );
  await expect(page.locator("#mergeResult .commitMsg.short")).toHaveAttribute(
    "href",
    `${basePath}/admin/fork/commit/abcdef1234567890`,
  );

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
  await expect(page.locator("#status")).toHaveText("No changes have been made.");
  const noChangesMessages: string[] = [];
  page.once("dialog", async (dialog) => {
    noChangesMessages.push(dialog.message());
    await dialog.dismiss();
  });
  await page.click('form.nm button[type="submit"]');
  await expect.poll(() => noChangesMessages).toEqual(["No changes have been made."]);
  expect(postRequests).toEqual([]);

  await page.unrouteAll({ behavior: "ignoreErrors" });
  await mockProjectPullRequestCreateForm(page, postRequests, { mergeMode: "normal" });
  await page.goto(
    `${basePath}/admin/sample/newPullRequestForm?fromBranch=feature/ui&toBranch=main`,
  );
  await expect(page.locator("#status")).toHaveText("This pull request can be merged safely.");
  await expect(page.locator("#title")).toHaveValue("Add UI");
  await page.fill("#title", "");
  const titleMessages: string[] = [];
  page.once("dialog", async (dialog) => {
    titleMessages.push(dialog.message());
    await dialog.dismiss();
  });
  await page.click('form.nm button[type="submit"]');
  await expect.poll(() => titleMessages).toEqual(["Title is a required field."]);
  expect(postRequests).toEqual([]);

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
  // legacy PullRequestApp.newPullRequest redirects to the PR list on success
  // (React: router.history.push to /pullRequests); the modal unmounts with the
  // form, so assert the navigation instead of a closed-modal class
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequests`);
  await expect.poll(() => postRequests.length).toBe(1);
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(conflictDialogMessages).toEqual(["Title is a required field."]);
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
    const navbar = document.querySelector<HTMLElement>("header[data-owner=global-gnb-outer]");
    const searchBox = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
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

async function pullRequestCreateErrorGeometry(page: Page) {
  return page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      return element.getBoundingClientRect();
    };
    const projectMenu = required(".project-menu-outer");
    const projectPage = required(".project-page-wrap");
    const error = required(".error-wrap");
    return {
      documentWidth: document.documentElement.scrollWidth,
      error: {
        left: Math.round(error.left),
        right: Math.round(error.right),
      },
      projectMenu: { bottom: Math.round(projectMenu.bottom) },
      projectPage: {
        left: Math.round(projectPage.left),
        right: Math.round(projectPage.right),
        top: Math.round(projectPage.top),
        width: Math.round(projectPage.width),
      },
    };
  });
}

async function mockProjectPullRequestCreateForm(
  page: Page,
  postRequests: unknown[],
  options: {
    authorDateLabel?: string;
    formOptionsStatus?: number;
    formOptionRequests?: string[];
    mergeMode?: "conflict" | "empty" | "normal";
    mergeResultRequests?: string[];
    project?: Partial<MockProjectRoute>;
    suggestedBody?: boolean;
  } = {},
) {
  const project = { ...DEFAULT_PROJECT_ROUTE, ...options.project };
  const containerPath = `**/api/v1/owners/${project.ownerName}/projects/${project.projectName}/container**`;
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
        vcs: project.vcs,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route(formOptionsPath, async (route) => {
    const url = new URL(route.request().url());
    options.formOptionRequests?.push(url.toString());
    if (options.formOptionsStatus) {
      await route.fulfill({
        body: JSON.stringify({ message: "source repository is empty" }),
        contentType: "application/json",
        status: options.formOptionsStatus,
      });
      return;
    }
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
