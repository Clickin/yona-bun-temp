import { expect, test, type Page } from "../wtr-compat.ts";

const LEGACY_PROJECT_OWNER = "weblabs";
const LEGACY_PROJECT_NAME = "portal";
const LEGACY_NEW_MILESTONE_TITLE = "New milestone";
const PROJECT_ROUTE_PATH = `/${LEGACY_PROJECT_OWNER}/${LEGACY_PROJECT_NAME}`;
const PROJECT_FORM_PATH = `${PROJECT_ROUTE_PATH}/newMilestoneForm`;
const PROJECT_MILESTONES_PATH = `${PROJECT_ROUTE_PATH}/milestones`;
const PROJECT_SEARCH_PATH = `${PROJECT_ROUTE_PATH}/search`;
const GROUP_SEARCH_PATH = `/organizations/${LEGACY_PROJECT_OWNER}/search`;

test("project milestone create form restores the legacy protected project header search scope and title", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectMilestoneCreateForm(page, postRequests);

  await page.goto(`${basePath}${PROJECT_FORM_PATH}`);
  await expect(page).toHaveTitle(
    `${LEGACY_NEW_MILESTONE_TITLE} - ${LEGACY_PROJECT_OWNER}/${LEGACY_PROJECT_NAME}`,
  );
  await expect(page.locator("[data-owner=global-gnb-outer]")).toBeVisible();
  const searchForm = page.locator("form.gnb-search-form");
  const scopeToggle = page.locator("#gnb-search-scope-title");
  await expect(scopeToggle).toHaveText("This Project");
  await expect(searchForm).toHaveAttribute("action", `${basePath}${PROJECT_SEARCH_PATH}`);

  await scopeToggle.click();
  const scopeItems = page.locator("[data-owner=global-gnb-search-scope-item] > button");
  await expect(scopeItems).toHaveCount(3);
  await expect(scopeItems.nth(0)).toHaveText("This Project");
  await expect(scopeItems.nth(1)).toHaveText("This Group");
  await expect(scopeItems.nth(2)).toHaveText("All Projects");
  await scopeItems.nth(1).click();
  await expect(scopeToggle).toHaveText("This Group");
  await expect(searchForm).toHaveAttribute("action", `${basePath}${GROUP_SEARCH_PATH}`);

  await scopeToggle.click();
  await scopeItems.nth(2).click();
  await expect(scopeToggle).toHaveText("All Projects");
  await expect(searchForm).toHaveAttribute("action", `${basePath}/search`);

  await scopeToggle.click();
  await scopeItems.nth(0).click();
  await expect(scopeToggle).toHaveText("This Project");
  await expect(searchForm).toHaveAttribute("action", `${basePath}${PROJECT_SEARCH_PATH}`);

  const headerMetrics = await readProtectedProjectHeaderMetrics(page);
  expect(headerMetrics).toEqual({
    navbarPosition: "absolute",
    searchBoxDisplay: "inline-block",
  });
  const headerBoxes = await readProtectedProjectHeaderBoxes(page);
  expect(headerBoxes).not.toBeNull();
  expect(headerBoxes!.scopeToggle.top).toBeGreaterThanOrEqual(headerBoxes!.navbar.top);
  expect(headerBoxes!.scopeToggle.bottom).toBeLessThanOrEqual(headerBoxes!.navbar.bottom);
  expect(headerBoxes!.searchInput.top).toBeGreaterThanOrEqual(headerBoxes!.navbar.top);
  expect(headerBoxes!.searchInput.bottom).toBeLessThanOrEqual(headerBoxes!.navbar.bottom);
  expect(headerBoxes!.searchBox.left).toBeGreaterThanOrEqual(headerBoxes!.scopeToggle.right - 2);
  expect(headerBoxes!.searchInput.left).toBeGreaterThanOrEqual(headerBoxes!.searchBox.left);
  expect(headerBoxes!.searchSubmit.right).toBeLessThanOrEqual(headerBoxes!.searchBox.right + 1);
  expect(headerBoxes!.searchBox.right).toBeLessThanOrEqual(headerBoxes!.form.right + 1);
});

test("project milestone create form matches legacy milestone/create.scala.html core form DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectMilestoneCreateForm(page, postRequests);

  await page.goto(`${basePath}${PROJECT_FORM_PATH}`);
  await expect(page.locator("#milestone-form")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator("#milestone-open")).toBeChecked();
  await expect(page.locator("#dueDate")).toHaveValue("");
  await expect(page.locator('[data-owner="project-milestone-save"]')).toHaveCSS(
    "border-radius",
    "3px",
  );
  await expect(page.locator('[data-owner="project-milestone-cancel"]')).toHaveCSS(
    "border-radius",
    "3px",
  );

  await expect(page.locator("#title")).toHaveAttribute("tabindex", "1");
  await expect(page.locator("#editor-contents-content-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#editor-contents-content-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);
  const markdownEditor = page.locator(".mt10:has(#editor-contents-content-body)");
  await expect(markdownEditor).toHaveCount(1);
  await expect(markdownEditor.locator('.nav-tabs a[href="#edit-content-body"]')).toHaveCount(0);
  await expect(markdownEditor.locator('.nav-tabs a[href="#preview-content-body"]')).toHaveCount(0);
  await expect(markdownEditor.locator('.nav-tabs button[data-toggle="tab"]')).toHaveCount(0);
  const editorTabs = markdownEditor.locator(".nav-tabs > li > button[type='button']");
  const editTab = editorTabs.filter({ hasText: /^Edit$/u });
  const previewTab = editorTabs.filter({ hasText: /^Preview$/u });
  await expect(markdownEditor.locator(".nav-tabs button[data-mode]")).toHaveCount(0);
  await expect(editorTabs).toHaveText(["Edit", "Preview"]);
  await expect(editTab).toHaveText("Edit");
  await expect(previewTab).toHaveText("Preview");
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).not.toHaveClass(/active/);
  await expect(page.locator("#editor-contents-content-body")).toBeVisible();
  await expect(page.locator("#preview-content-body .markdown-preview")).not.toBeVisible();
  await expect(page.locator(".markdown-help-nav > li")).toHaveCount(11);
  await expect(page.locator(".markdown-help-wrap > li")).toHaveCount(10);
  await expect(page.locator("#upload input.file[name=filePath]")).toHaveAttribute("multiple", "");
  await expect(page.locator("#upload .attach-wrap")).toBeVisible();
  await expect(page.locator("#upload .attached-files.unstyled")).toHaveCount(1);
  const uploadSaveHelp = page.locator('[data-owner="project-milestone-upload-save-help"]');
  await expect(uploadSaveHelp).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(uploadSaveHelp).toHaveCSS("text-align", "right");
  // F5 dist-truth (2026-08-11): the upload help element renders in the app.
  await expect(page.locator("#upload .right-txt.help")).toHaveCount(1);
  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator("#tplDropFilesHere")).toHaveCount(0);
  await expect(
    page.locator('.content-wrap.frm-wrap script[type="text/x-jquery-tmpl"]'),
  ).toHaveCount(0);
  // F5 dist-truth (2026-08-11): the cancel anchor is classless but keeps
  // the legacy milestones href.
  await expect(page.locator('.actrow a:has-text("Cancel")')).toHaveAttribute(
    "href",
    `${basePath}${PROJECT_MILESTONES_PATH}`,
  );
  expect(await readMilestoneCreateFormMetrics(page)).toEqual({
    actionDisplay: "block",
    actionMarginTop: "20px",
    actionTextAlign: "right",
    ddMargin: "0px",
    ddPadding: "0px",
    dueDateInputWidth: 220,
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
    titleWidthPercent: 98,
    uploadBackground: "rgb(245, 245, 245)",
    uploadBorderRadius: "5px",
    uploadHeight: 70,
    uploadPadding: "10px",
  });
  // create.scala.html:68-69 suppresses whitespace, not .ybtn's .3em margin (4.2px).
  expect(await readMilestoneActionGap(page)).toBe(4);
  const editorBoxes = await readMilestoneEditorTabBoxes(page);
  expect(editorBoxes).not.toBeNull();
  expect(editorBoxes!.tabs.left).toBeGreaterThanOrEqual(editorBoxes!.editor.left);
  expect(editorBoxes!.tabs.right).toBeLessThanOrEqual(editorBoxes!.editor.right + 1);
  expect(editorBoxes!.editButton.left).toBeLessThan(editorBoxes!.previewButton.left);
  expect(editorBoxes!.editPane.top).toBeGreaterThanOrEqual(editorBoxes!.tabs.bottom - 1);

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "create-editor-tabs";
  });
  const urlBeforeEditorTabClick = page.url();
  await previewTab.click();
  await expect(editTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).not.toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).toHaveClass(/active/);
  await expect(page.locator("#editor-contents-content-body")).not.toBeVisible();
  await expect(page.locator("#preview-content-body .markdown-preview")).toBeVisible();
  const previewEditorBoxes = await readMilestoneEditorTabBoxes(page);
  expect(previewEditorBoxes).not.toBeNull();
  expect(previewEditorBoxes!.previewPane.top).toBeGreaterThanOrEqual(
    previewEditorBoxes!.tabs.bottom - 1,
  );
  expect(previewEditorBoxes!.previewPane.left).toBeGreaterThanOrEqual(
    previewEditorBoxes!.editor.left,
  );
  expect(previewEditorBoxes!.previewPane.right).toBeLessThanOrEqual(
    previewEditorBoxes!.editor.right + 1,
  );
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("create-editor-tabs");
  await editTab.click();
  await expect(editTab.locator("xpath=..")).toHaveClass(/active/);
  await expect(previewTab.locator("xpath=..")).not.toHaveClass(/active/);
  await expect(page.locator("#edit-content-body")).toHaveClass(/active/);
  await expect(page.locator("#preview-content-body")).not.toHaveClass(/active/);
  await expect(page.locator("#editor-contents-content-body")).toBeVisible();
  await expect(page.locator("#preview-content-body .markdown-preview")).not.toBeVisible();
  expect(page.url()).toBe(urlBeforeEditorTabClick);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("create-editor-tabs");

  await page.evaluate(() => {
    (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker = "create-cancel";
  });
  await page.click('.actrow a:has-text("Cancel")');
  await expect(page).toHaveURL(`${basePath}${PROJECT_MILESTONES_PATH}`);
  expect(
    await page.evaluate(() => (window as Window & { __yonaSpaMarker?: string }).__yonaSpaMarker),
  ).toBe("create-cancel");

  await page.goto(`${basePath}${PROJECT_FORM_PATH}`);
  await page.fill("#title", "v3.0");
  await page.fill("#editor-contents-content-body", "Create scope");
  await page.fill("#dueDate", "2026-09-30");
  const postResponsePromise = page.waitForResponse(
    (response) =>
      response
        .url()
        .includes(
          `/api/v1/owners/${LEGACY_PROJECT_OWNER}/projects/${LEGACY_PROJECT_NAME}/milestones`,
        ) && response.request().method() === "POST",
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
  await expect(page).toHaveURL(`${basePath}${PROJECT_ROUTE_PATH}/milestone/9?state=open`);
});

test("project milestone create form preserves legacy uploader and mobile containment", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectMilestoneCreateForm(page, []);
  await page.goto(`${basePath}${PROJECT_FORM_PATH}`);
  expect(await readMilestoneActionGap(page)).toBe(4);

  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect(page.locator("#datepicker > .pika-single")).toBeVisible();
  await expect(page.locator("#datepicker .pika-table")).toBeVisible();
  const geometry = await page.evaluate(() => {
    const editor = document.querySelector<HTMLElement>(".mt10");
    const leftPane = document.querySelector<HTMLElement>(".span-left-pane");
    const upload = document.querySelector<HTMLElement>("#upload");
    if (!editor || !leftPane || !upload) throw new Error("milestone create geometry missing");
    return {
      documentWidth: document.documentElement.scrollWidth,
      editorWidth: Math.round(editor.getBoundingClientRect().width),
      leftPaneWidth: Math.round(leftPane.getBoundingClientRect().width),
      uploadHeight: Math.round(upload.getBoundingClientRect().height),
      uploadWidth: Math.round(upload.getBoundingClientRect().width),
      pickerRight: Math.round(
        document.querySelector<HTMLElement>("#datepicker > .pika-single")!.getBoundingClientRect()
          .right,
      ),
    };
  });
  expect(geometry.documentWidth).toBeLessThanOrEqual(390);
  expect(geometry.editorWidth).toBe(geometry.leftPaneWidth);
  expect(geometry.uploadWidth).toBe(geometry.leftPaneWidth);
  expect(geometry.uploadHeight).toBeGreaterThanOrEqual(70);
  expect(geometry.pickerRight).toBeLessThanOrEqual(390);
  await page.locator("#datepicker .pika-day").first().click();
  await expect(page.locator("#dueDate")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/u);
});

test("project milestone create form preserves legacy write validation and focus behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const postRequests: unknown[] = [];
  await mockProjectMilestoneCreateForm(page, postRequests);

  await page.goto(`${basePath}${PROJECT_FORM_PATH}`);
  await expect(page.locator("#title")).toBeFocused();
  await page.locator("#title").press("Enter");
  await expect(page.locator("#editor-contents-content-body")).toBeFocused();

  const titleDialogPromise = acceptNextAlert(page);
  await page.click('#milestone-form button[type="submit"]');
  await expect(titleDialogPromise).resolves.toBe("Milestone title is a required field.");
  await expect(page).toHaveURL(`${basePath}${PROJECT_FORM_PATH}`);
  expect(postRequests).toEqual([]);
  await expect(page.locator("#title")).toHaveClass("zen-mode text title ");
  await expect(page.locator("#title + .message")).toHaveCount(0);

  await page.fill("#title", "v3.1");
  const contentDialogPromise = acceptNextAlert(page);
  await page.click('#milestone-form button[type="submit"]');
  await expect(contentDialogPromise).resolves.toBe("Milestone description is a required field");
  await expect(page).toHaveURL(`${basePath}${PROJECT_FORM_PATH}`);
  expect(postRequests).toEqual([]);

  await page.fill("#editor-contents-content-body", "Create scope");
  await page.fill("#dueDate", "09/30/2026");
  const dueDateDialogPromise = acceptNextAlert(page);
  await page.click('#milestone-form button[type="submit"]');
  await expect(dueDateDialogPromise).resolves.toBe(
    "Invalid format. Enter the due date in YYYY-MM-DD format.",
  );
  await expect(page).toHaveURL(`${basePath}${PROJECT_FORM_PATH}`);
  expect(postRequests).toEqual([]);
  await expect(page.locator("#title + .message")).toHaveCount(0);
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
  await page.route(
    `**/api/v1/owners/${LEGACY_PROJECT_OWNER}/projects/${LEGACY_PROJECT_NAME}/container**`,
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
          isProtected: true,
          logoUrl: "/assets/images/project_default_logo.png",
          menuSetting: {
            board: true,
            code: true,
            issue: true,
            milestone: true,
            pullRequest: true,
            review: true,
          },
          organizationName: LEGACY_PROJECT_OWNER,
          ownerName: LEGACY_PROJECT_OWNER,
          projectName: LEGACY_PROJECT_NAME,
          vcs: "GIT",
          viewerCanUpdate: true,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${LEGACY_PROJECT_OWNER}/projects/${LEGACY_PROJECT_NAME}/milestones`,
    async (route) => {
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
    },
  );
  await page.route(
    `**/api/v1/owners/${LEGACY_PROJECT_OWNER}/projects/${LEGACY_PROJECT_NAME}/milestones?**`,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ milestones: [] }),
      });
    },
  );
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

async function readMilestoneCreateFormMetrics(page: Page) {
  return page.locator(".content-wrap.frm-wrap").evaluate((contentWrap) => {
    const form = contentWrap.querySelector<HTMLElement>("#milestone-form");
    const firstDd = contentWrap.querySelector<HTMLElement>("dd");
    const title = contentWrap.querySelector<HTMLElement>("#title");
    const leftPane = contentWrap.querySelector<HTMLElement>(".span-left-pane");
    const rightPane = contentWrap.querySelector<HTMLElement>(".span-hard-wrap");
    // F5 dist-truth (2026-08-11): the editor dd carries no inline style —
    // find the dd that wraps the markdown editor.
    const editorDd = contentWrap.querySelector<HTMLElement>("dd:has(.mt10)");
    const upload = contentWrap.querySelector<HTMLElement>(".upload-wrap.content-footer");
    const action = contentWrap.querySelector<HTMLElement>(".actrow");
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
      uploadHeight: Math.round(upload!.getBoundingClientRect().height),
      uploadPadding: uploadStyle.padding,
    };
  });
}

async function readMilestoneActionGap(page: Page) {
  return page.locator(".actrow").evaluate((action) => {
    const save = action.querySelector<HTMLElement>('button[type="submit"]');
    const cancel = save?.nextElementSibling as HTMLElement | null;
    if (!save || !cancel) throw new Error("Expected milestone action controls are missing");
    return Math.round(cancel.getBoundingClientRect().left - save.getBoundingClientRect().right);
  });
}

async function readProtectedProjectHeaderMetrics(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const searchBox = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
    if (!navbar || !searchBox) {
      throw new Error("Expected protected project header search elements are missing.");
    }
    return {
      navbarPosition: getComputedStyle(navbar).position,
      searchBoxDisplay: getComputedStyle(searchBox).display,
    };
  });
}

async function readProtectedProjectHeaderBoxes(page: Page) {
  return page.evaluate(() => {
    const navbar = document.querySelector<HTMLElement>("[data-owner=global-gnb-outer]");
    const form = document.querySelector<HTMLElement>("form.gnb-search-form");
    const scopeToggle = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const searchBox = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]');
    const searchInput = document.querySelector<HTMLElement>(
      '[data-owner="global-gnb-search-input"]',
    );
    const searchSubmit = document.querySelector<HTMLElement>(
      '.gnb-search-form button[type="submit"]',
    );
    if (!navbar || !form || !scopeToggle || !searchBox || !searchInput || !searchSubmit) {
      return null;
    }

    return {
      form: readBox(form),
      navbar: readBox(navbar),
      scopeToggle: readBox(scopeToggle),
      searchBox: readBox(searchBox),
      searchInput: readBox(searchInput),
      searchSubmit: readBox(searchSubmit),
    };

    function readBox(element: HTMLElement) {
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

async function readMilestoneEditorTabBoxes(page: Page) {
  return page.evaluate(() => {
    const editor = document.querySelector<HTMLElement>(".mt10:has(#editor-contents-content-body)");
    const tabs = editor?.querySelector<HTMLElement>(".nav.nav-tabs");
    const [editButton, previewButton] = Array.from(
      editor?.querySelectorAll<HTMLElement>(".nav-tabs > li > button[type='button']") ?? [],
    );
    const editPane = document.querySelector<HTMLElement>("#edit-content-body");
    const previewPane = document.querySelector<HTMLElement>("#preview-content-body");
    if (!editor || !tabs || !editButton || !previewButton || !editPane || !previewPane) {
      return null;
    }

    return {
      editButton: readBox(editButton),
      editPane: readBox(editPane),
      editor: readBox(editor),
      previewButton: readBox(previewButton),
      previewPane: readBox(previewPane),
      tabs: readBox(tabs),
    };

    function readBox(element: HTMLElement) {
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
