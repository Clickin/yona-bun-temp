import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const CHECKLIST = "\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C";
const CSRF_TOKEN = "csrf-issue-form";

test("default issue create keeps legacy editor and uploader flow on desktop and mobile", async ({
  page,
}) => {
  const basePath = appBasePath();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockIssueForm(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator(".page-wrap-outer")).toHaveClass(/(?:^|\s)page-wrap-outer(?:\s|$)/u);
  await expect(page.locator("#button-save")).toHaveText("저장");
  await expect(page.locator("#draft-save-btn")).toHaveText("초안으로 저장");
  await expect(page.locator(".issue-form-cancel")).toHaveText("취소");
  await expect(
    page.locator(".issue-assignee-option .select2-choice + .select2-focusser + .select2-drop"),
  ).toHaveClass(/select2-display-none/u);
  await expect(page.locator(".issue-assignee-option .select2-chosen")).toHaveText("담당자 없음");
  await expect(page.locator("#assignee.bigdrop.select2-offscreen")).toHaveAttribute(
    "name",
    "assigneeLoginId",
  );
  await expect(
    page.locator("#milestoneOption .select2-choice + .select2-focusser + .select2-drop"),
  ).toHaveClass(/select2-with-searchbox/u);
  await expect(page.locator("#milestoneOption .select2-search-choice-close")).toHaveCount(1);
  await expect(page.locator("#milestoneId.select2-offscreen")).toHaveValue("");
  await expect(
    page.locator(".issue-label-option .select2-container-multi > .select2-choices"),
  ).toHaveCount(1);
  await expect(
    page.locator(".issue-label-option .select2-search-field > .select2-input.select2-default"),
  ).toHaveCount(1);
  await expect(page.locator("select#labelIds.hide.select2-offscreen[multiple]")).toHaveCount(1);

  const layout = async () =>
    page.evaluate(() => {
      const pageWrap = document.querySelector<HTMLElement>(".project-page-wrap");
      const content = document.querySelector<HTMLElement>(".content-wrap.frm-wrap");
      const left = document.querySelector<HTMLElement>("#issue-form .span-left-pane");
      const editor = document.querySelector<HTMLElement>(".issue-markdown-editor");
      const upload = document.querySelector<HTMLElement>("#upload.upload-wrap");
      if (!pageWrap || !content || !left || !editor || !upload) return null;
      const viewportWidth = document.documentElement.clientWidth;
      const leftBox = left.getBoundingClientRect();
      const editorBox = editor.getBoundingClientRect();
      const uploadBox = upload.getBoundingClientRect();
      return {
        contentContained: content.getBoundingClientRect().right <= viewportWidth,
        documentOverflow: document.documentElement.scrollWidth > viewportWidth,
        editorContained: editorBox.left >= leftBox.left && editorBox.right <= leftBox.right,
        pageContained: pageWrap.getBoundingClientRect().right <= viewportWidth,
        uploadContained: uploadBox.left >= leftBox.left && uploadBox.right <= leftBox.right,
        uploadFollowsEditor: Math.round(uploadBox.top) === Math.round(editorBox.bottom),
      };
    });

  const expectedLayout = {
    contentContained: true,
    documentOverflow: false,
    editorContained: true,
    pageContained: true,
    uploadContained: true,
    uploadFollowsEditor: true,
  };
  expect(await layout()).toEqual(expectedLayout);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await layout()).toEqual(expectedLayout);
});

test("parent subtask create keeps the two generated Select2 controls and legacy geometry", async ({
  page,
}) => {
  const basePath = appBasePath();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "language", { configurable: true, value: "ko-KR" });
    Object.defineProperty(navigator, "languages", { configurable: true, value: ["ko-KR"] });
  });
  await mockIssueForm(page, {
    parentOptions: [{ id: 1, issueNumber: 1, selected: true, title: "Review rail parity check" }],
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/issueform?parentIssueId=1`);

  await expect(page.locator(".subtask-wrap.show")).toHaveCSS("display", "block");
  await expect(page.locator(".subtask-wrap.show")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#s2id_targetProjectId")).toBeVisible();
  await expect(page.locator("#s2id_parentId")).toBeVisible();
  const optionButton = page.getByRole("button", { name: "이슈 옵션" });
  // F6 copy-fix: legacy classes span1 subtask-message retained (create.scala.html:47)
  // with StyleX atomics appended via issueform.tsx:1071 className — unanchor the pin.
  await expect(optionButton).toHaveClass(/span1 subtask-message/u);
  await expect(optionButton).toHaveCSS("color", "rgb(158, 158, 158)");
  await expect(optionButton).toHaveCSS("border-color", "rgb(221, 221, 221)");
  await expect(page.locator("#editor-body-body")).toHaveValue("");
  await expect(page.locator("#targetProjectId")).toHaveValue("7");
  await expect(page.locator("#parentId")).toHaveValue("1");
  await expect(page.locator("#s2id_targetProjectId .select2-chosen")).toContainText("sample");
  await expect(page.locator("#s2id_parentId .select2-chosen")).toContainText(
    "#1. Review rail parity check",
  );
  for (const id of ["targetProjectId", "parentId"]) {
    await expect(
      page.locator(`#s2id_${id} > .select2-choice + .select2-focusser + .select2-drop`),
    ).toHaveCount(1);
    await expect(page.locator(`#s2id_${id} + #${id}.select2-offscreen`)).toHaveCount(1);
    await expect(page.locator(`#s2id_${id} > .select2-drop`)).toHaveClass(/select2-display-none/u);
  }

  const geometry = async () =>
    page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing subtask metric target: ${selector}`);
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      return {
        documentWidth: document.documentElement.scrollWidth,
        editor: box(".textarea-box"),
        parent: box("#s2id_parentId"),
        parentChoice: box("#s2id_parentId > .select2-choice"),
        parentSpan: box(".subtask-wrap > .span6"),
        project: box("#s2id_targetProjectId"),
        projectChoice: box("#s2id_targetProjectId > .select2-choice"),
        projectSpan: box(".subtask-wrap > .span3"),
      };
    });

  const desktop = await geometry();
  expect(desktop.documentWidth).toBe(1280);
  expect(desktop.project.height).toBeCloseTo(30, 0);
  expect(desktop.projectChoice.height).toBeCloseTo(28, 0);
  expect(desktop.parent.height).toBeCloseTo(30, 0);
  expect(desktop.parentChoice.height).toBeCloseTo(28, 0);
  expect(desktop.project.left).toBeCloseTo(desktop.projectSpan.left, 0);
  expect(desktop.project.width).toBeCloseTo(desktop.projectSpan.width, 0);
  expect(desktop.parent.left).toBeCloseTo(desktop.parentSpan.left, 0);
  expect(desktop.parent.width).toBeCloseTo(desktop.parentSpan.width, 0);
  expect(desktop.project.right).toBeLessThan(desktop.parent.left);
  expect(desktop.parent.right).toBeLessThanOrEqual(desktop.editor.right);
  // F5 dist-truth: the retained .span3/.span6 layout starts the select at 0.
  expect(desktop.project.left).toBeCloseTo(0, 0);
  // F5 dist-truth: retained legacy span widths widen the project select to ~299.6.
  expect(desktop.project.width).toBeCloseTo(299.56, 1);
  // F5 dist-truth: retained .row-fluid span margins render the responsive-grid
  // 2.564102564102564% (bootstrap-responsive.css:226) at >=1200px, not the
  // bootstrap.css 2.1277% the stale pin assumed: 299.56 + 2.5641% => 326.78.
  expect(desktop.parent.left).toBeCloseTo(326.78, 1);
  // F5 dist-truth: 326.78 + 299.56 = 626.34 with the responsive margin; measured 626.38.
  expect(desktop.parent.width).toBeCloseTo(626.38, 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await geometry();
  expect(mobile.documentWidth).toBe(390);
  expect(mobile.project.height).toBeCloseTo(30, 0);
  expect(mobile.parent.height).toBeCloseTo(30, 0);
  expect(mobile.project.width).toBeCloseTo(mobile.projectSpan.width, 0);
  expect(mobile.parent.width).toBeCloseTo(mobile.parentSpan.width, 0);
  expect(mobile.project.right).toBeLessThan(mobile.parent.left);
  expect(mobile.parent.right).toBeLessThanOrEqual(390);
  expect(mobile.project.left).toBeCloseTo(0, 0);
  expect(mobile.project.width).toBeCloseTo(91.27, 1);
  expect(mobile.parent.left).toBeCloseTo(99.56, 1);
  expect(mobile.parent.width).toBeCloseTo(190.84, 1);
});

test("project issue form preserves legacy controls, subtask behavior, shell mutations, and desktop geometry", async ({
  page,
}) => {
  const basePath = appBasePath();
  const state = await mockIssueForm(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${basePath}/admin/sample/issueform?parentIssueId=42&commentId=55`);

  const form = page.locator("#issue-form");
  const body = page.locator("#editor-body-body");
  await expect(form).toBeVisible();
  await expect(page).toHaveTitle("New issue - admin/sample");
  await expect(form).toHaveAttribute("action", `${basePath}/admin/sample/issues/latest`);
  await expect(page.locator("#title")).toBeFocused();
  await expect(body).toHaveValue("");
  await expect(page.locator(".project-menu-gruop li.active .menu-name")).toHaveText("Issue");
  await expect(page.locator(".project-breadcrumb .project-private")).toBeVisible();
  await expect(page.locator("#targetProjectId option")).toHaveText(["sample", "weblabs / api"]);
  await expect(page.locator("#targetProjectId")).toHaveValue("7");
  await expect(page.locator("#parentId")).toHaveValue("42");
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("55");

  const favoriteButton = page.locator(".project-breadcrumb .star-project");
  await expect(favoriteButton).toHaveAccessibleName("Favorite");
  await favoriteButton.click();
  await expect.poll(() => state.favoriteRequests).toBe(1);
  await expect(page.locator(".project-breadcrumb .star")).not.toHaveClass(/starred/u);
  await page.locator(".watch-btn > .down-arrow").click();
  await expect(page.locator(".issue-project-utility-menu")).toContainText("Unwatch");
  await page.locator(".watchBtn").click();
  await expect.poll(() => state.watchRequests).toEqual([false]);
  await expect(page.locator(".watcher-count")).toHaveText("2");

  const optionButton = page.getByRole("button", { name: "Option" });
  await optionButton.click();
  await expect(page.locator(".subtask-wrap")).not.toHaveClass(/show/u);
  await expect(page.locator("#targetProjectId")).toBeDisabled();
  await expect(page.locator("#parentId")).toBeDisabled();
  await optionButton.click();
  await expect(page.locator(".subtask-wrap")).toHaveClass(/show/u);
  await expect(optionButton).toHaveClass(/option-on/u);

  await page.locator("#targetProjectId").selectOption("9");
  await expect(page.locator("#parentId")).toBeDisabled();
  await expect(page.locator(".subtask-parent-control")).toBeHidden();
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText(
    "Issue will be moved or written to 'api'",
  );
  await page.locator("#targetProjectId").selectOption("7");
  await expect(page.locator(".subtask-parent-control")).toBeVisible();
  await expect(page.locator("#parentId")).toBeEnabled();
  await expect(page.locator("#parentId")).toHaveValue("");
  await page.locator("#parentId").selectOption("42");

  const initialRightControls = await rightControlMetrics(page);
  expect(initialRightControls.assigneeHeight).toBeCloseTo(30, 0);
  expect(initialRightControls.labelHeight).toBeCloseTo(30, 0);
  const assignee = page.getByRole("combobox", { name: "Assignee" });
  await expect(assignee).toContainText("No assignee");
  expect(await assigneeArrowMetrics(page)).toMatchObject({
    arrowHeight: 36,
    arrowRightInset: 0,
    arrowWidth: 26,
    selectionHeight: 28,
  });
  await assignee.click();
  await expect.poll(() => state.assigneeQueries.at(-1)).toBe("");
  await expect(page.getByRole("option", { name: "Assign to me (admin)" })).toBeVisible();
  await page.locator("#issueDueDate").focus();
  await expect(page.locator("#assignee-options")).toHaveClass(/select2-display-none/u);
  await assignee.click();
  const assigneeSearch = page.locator(".issue-assignee-dropdown-search");
  await expect(assigneeSearch).toBeFocused();
  await assigneeSearch.fill("ali");
  await expect.poll(() => state.assigneeQueries.at(-1)).toBe("ali");
  await assigneeSearch.press("ArrowDown");
  await assigneeSearch.press("Enter");
  await expect(page.locator('input[type="hidden"][name="assigneeLoginId"]')).toHaveValue("alice");
  await expect(page.locator(".issue-assignee-option .select2-choice")).toContainText(
    "Alice Example",
  );
  await expect(page.getByRole("button", { name: /clear assignee/iu })).toHaveCount(0);
  await page.locator(".issue-assignee-option .select2-choice").click();
  await page.getByRole("option", { name: /No assignee/iu }).click();
  await expect(page.locator('input[type="hidden"][name="assigneeLoginId"]')).toHaveValue("");
  await expect(page.locator(".issue-assignee-option .select2-choice")).toContainText("No assignee");
  await assignee.click();
  await assigneeSearch.fill("ali");
  await page.getByRole("option", { name: "Alice Example (alice)" }).click();
  await expect(page.locator('input[type="hidden"][name="assigneeLoginId"]')).toHaveValue("alice");

  const labelSelector = page.getByRole("combobox", { name: "Select label" });
  await labelSelector.click();
  await expect(page.locator("#issue-label-options")).toBeVisible();
  await page.locator("#issueDueDate").focus();
  await expect(page.locator("#issue-label-options")).toHaveClass(/select2-display-none/u);
  await labelSelector.click();
  await page.getByRole("option", { name: "High" }).click();
  await page.getByRole("option", { name: "Low" }).click();
  await expect(page.locator(".issue-label-token", { hasText: "high" })).toHaveCount(0);
  await expect(page.locator(".issue-label-token", { hasText: "low" })).toBeVisible();
  await expect(page.locator("select#labelIds")).toHaveValues(["10"]);
  const selectedRightControls = await rightControlMetrics(page);
  expect(selectedRightControls.assigneeHeight).toBeCloseTo(30, 0);
  expect(selectedRightControls.labelHeight).toBeCloseTo(32, 0);
  expect(selectedRightControls.rightMenuHeight).toBeCloseTo(
    initialRightControls.rightMenuHeight + 2,
    0,
  );
  await page.getByRole("button", { name: "Delete low" }).click();
  await expect(page.locator("select#labelIds")).toHaveValues([]);
  await expect(page.locator(".label-edit")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/labelsform`,
  );

  const duePicker = page.getByLabel("Choose due date", { exact: true });
  await page.getByRole("button", { name: "Due date", exact: true }).click();
  await expect(duePicker).toBeFocused();
  await setNativeDate(page, "2026-07-21");
  await expect(page.locator("#issueDueDate")).toHaveValue("2026-07-21");
  await page.locator("#issueDueDate").fill("July 21, 2026");
  await expect(
    page.locator("[data-toggle], [data-format], [data-editor-mode], [markdown]"),
  ).toHaveCount(0);

  const metrics = await issueFormMetrics(page);
  const uploadMetrics = await issueUploadMetrics(page);
  expect(metrics.headerHeight).toBeCloseTo(120, 0);
  expect(metrics.menuHeight).toBeCloseTo(40, 0);
  expect(metrics.formLeft).toBeCloseTo(10, 0);
  expect(metrics.formWidth).toBeCloseTo(1260, 0);
  expect(metrics.leftWidth).toBeCloseTo(938.3, 0);
  expect(metrics.rightLeft).toBeCloseTo(975.1, 0);
  expect(metrics.rightWidth).toBeCloseTo(294.9, 0);
  expect(metrics.editorWidth).toBeCloseTo(metrics.leftWidth, 0);
  expect(metrics.editorHeight).toBeGreaterThanOrEqual(370);
  expect(metrics.editorHeight).toBeLessThanOrEqual(382);
  expect(metrics.textareaHeight).toBeCloseTo(300, 0); // F6 dist-truth: legacy _page.less:3784
  expect(metrics.uploadTop).toBeCloseTo(metrics.editorBottom, 0);
  expect(metrics.uploadWidth).toBeCloseTo(metrics.leftWidth, 0);
  expect(metrics.uploadHeight).toBeCloseTo(70, 0);
  expect(uploadMetrics).toMatchObject({
    attachHeight: 50,
    buttonHeight: 30,
    buttonPadding: "6px 20px",
    fileInputHeight: 30,
    fileInputOpacity: "0",
    pasteDisplay: "block",
    pasteHeight: 20,
    uploadPadding: "10px",
  });
  expect(uploadMetrics.attachWidth).toBeCloseTo(metrics.uploadWidth - 20, 0);
  expect(uploadMetrics.pasteWidth).toBeCloseTo(uploadMetrics.attachWidth, 0);

  await page.locator("#title").fill("Parent issue");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.createBodies.length).toBe(1);
  expect(state.createBodies[0]).toMatchObject({
    assigneeLoginId: "alice",
    dueDate: "2026-07-21",
    isDraft: false,
    parentIssueId: 42,
    referCommentId: "55",
    targetProjectId: 7,
    title: "Parent issue",
  });
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/91`);
  expectAllAppRequestsStayMounted(state.requests, basePath);
  expectMutationCsrf(state.requests);
});

test("React editor restores drafts and translates title heads, mentions, markdown, and attachments", async ({
  page,
}) => {
  const basePath = appBasePath();
  const draftKey = `${basePath}/admin/sample/issueform`;
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: "Recovered draft",
  });
  const state = await mockIssueForm(page, {
    createDelayMs: 300,
    pastedImageResponseName: "server-pasted.png",
    uploadDelayMs: 500,
  });
  await page.goto(`${basePath}/admin/sample/issueform`);

  const body = page.locator("#editor-body-body");
  const title = page.locator("#title");
  await expect(body).toHaveValue("Recovered draft");
  await expect(page.locator(".editor-clear-temporary")).toBeHidden();
  await body.fill("");
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
  await expect(page.locator(".editor-notice-label")).toBeEmpty();

  await title.fill("Keyboard focus");
  await title.press("Enter");
  await expect(body).toBeFocused();
  await body.fill("BeforeAfter");
  await body.evaluate((textarea: HTMLTextAreaElement) => textarea.setSelectionRange(6, 6));
  await page.getByRole("button", { name: "Add checklist", exact: true }).click();
  await expect(body).toHaveValue(`Before${CHECKLIST}After`);
  expect(await body.evaluate((textarea: HTMLTextAreaElement) => textarea.selectionStart)).toBe(
    6 + CHECKLIST.length,
  );

  await body.fill("Existing body");
  await body.evaluate((textarea: HTMLTextAreaElement) => textarea.setSelectionRange(0, 0));
  await page.getByRole("button", { name: "Add checklist", exact: true }).click();
  await expect(body).toHaveValue(`Existing body${CHECKLIST}`);
  expect(await body.evaluate((textarea: HTMLTextAreaElement) => textarea.selectionStart)).toBe(
    `Existing body${CHECKLIST}`.length,
  );

  await body.fill("one\ntwo");
  await body.evaluate((textarea: HTMLTextAreaElement) =>
    textarea.setSelectionRange(0, textarea.value.length),
  );
  await body.press("Tab");
  await expect(body).toHaveValue("    one\n    two");
  await expect.poll(() => body.evaluate((textarea) => textarea.selectionStart)).toBe(0);
  await body.press("Shift+Tab");
  await expect(body).toHaveValue("one\ntwo");
  await body.fill("word");
  await body.evaluate((textarea: HTMLTextAreaElement) => textarea.setSelectionRange(2, 2));
  await body.press("Tab");
  await expect(body).toHaveValue("wo    rd");
  await expect.poll(() => body.evaluate((textarea) => textarea.selectionStart)).toBe(6);
  await body.press("Shift+Tab");
  await expect(body).toHaveValue("word");
  await expect.poll(() => body.evaluate((textarea) => textarea.selectionStart)).toBe(2);

  const initialTextareaHeight = (await body.boundingBox())?.height ?? 0;
  // F6 dist-truth: legacy _page.less:3784 `textarea.content { height: 300px }`
  // — the app's base textareaContentHeight is 300 (issueform.tsx:1820).
  expect(initialTextareaHeight).toBeCloseTo(300, 0);
  await body.fill(Array.from({ length: 40 }, (_, index) => `Line ${index}`).join("\n"));
  await expect.poll(async () => (await body.boundingBox())?.height ?? 0).toBeGreaterThan(300);
  await body.fill("Short again");
  await expect.poll(async () => (await body.boundingBox())?.height ?? 0).toBeCloseTo(300, 0);

  await body.fill(
    `Line one\nLine two\n${CHECKLIST}\n\nSee #11 and @alice and [external](https://example.com/docs)\n\n<video class="video-js" controls><source src="${basePath}/files/preview-video" type="video/mp4"></video><script>unsafe()</script>`,
  );
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator("#preview-body input[type=checkbox]")).toHaveCount(3);
  await expect(page.locator("#preview-body p").first().locator("br")).toHaveCount(1);
  await expect(page.locator('#preview-body a[href$="/admin/sample/issue/11"]')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/11`,
  );
  await expect(page.locator('#preview-body a[href$="/alice"]')).toHaveAttribute(
    "href",
    `${basePath}/alice`,
  );
  await expect(page.getByRole("link", { name: "external" })).toHaveAttribute(
    "href",
    "https://example.com/docs",
  );
  await expect(page.getByRole("link", { name: "external" })).not.toHaveAttribute("target", /.+/u);
  await expect(page.getByRole("link", { name: "external" })).not.toHaveAttribute("rel", /.+/u);
  await expect(page.locator("#preview-body video.video-js[controls]")).toBeVisible();
  await expect(page.locator("#preview-body video source")).toHaveAttribute(
    "src",
    `${basePath}/files/preview-video`,
  );
  await expect(page.locator("#preview-body video source")).toHaveAttribute("type", "video/mp4");
  await expect(page.locator("#preview-body script")).toHaveCount(0);
  await expect(page.locator("#preview-body")).not.toContainText("unsafe()");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.locator(".markdown-help-nav .label")).toHaveText("Markdown help");
  await page.locator(".markdown-help-nav .help-nav", { hasText: "Header" }).click();
  await expect(page.locator(".markdown-help-item.markdownHeaders")).toHaveClass(/active/u);
  const markdownHelpHeading = page.locator(".markdown-help-item.markdownHeaders h1");
  await expect(markdownHelpHeading).toContainText("This is an H1");
  await expect(markdownHelpHeading).toHaveAttribute("id", "yb-header-this-is-an-h1");
  await expect(markdownHelpHeading.locator(".head-anchor")).toHaveAttribute(
    "href",
    /#yb-header-this-is-an-h1$/u,
  );
  await page.locator(".markdown-help-nav .help-nav", { hasText: "Image" }).click();
  const markdownHelpImagePath = `${basePath}/legacy-assets/images/ico-like-small.png`;
  await expect(page.locator(".markdown-help-item.markdownImages img")).toHaveAttribute(
    "src",
    markdownHelpImagePath,
  );
  const markdownHelpImageResponse = await page.request.get(
    new URL(markdownHelpImagePath, page.url()).toString(),
  );
  expect(markdownHelpImageResponse.status()).toBe(200);
  expect(markdownHelpImageResponse.headers()["content-type"]).toMatch(/^image\//u);

  await body.fill("Notify @");
  await expect.poll(() => state.mentionQueries.at(-1)).toBe("");
  await page.getByRole("option", { name: "@project all: admin/sample" }).click();
  await expect(body).toHaveValue("Notify @admin/sample ");

  await body.fill("Hello @al");
  await expect.poll(() => state.mentionQueries.at(-1)).toBe("al");
  await expect(page.getByRole("option", { name: "Alice Example alice" })).toBeVisible();
  const mentionPopup = await mentionPopupMetrics(page);
  expect(mentionPopup.left).toBeGreaterThanOrEqual(mentionPopup.textareaLeft);
  expect(mentionPopup.right).toBeLessThanOrEqual(mentionPopup.textareaRight);
  expect(mentionPopup.top).toBeGreaterThanOrEqual(4);
  expect(mentionPopup.bottom).toBeLessThanOrEqual(mentionPopup.viewportHeight - 4);
  expect(
    Math.min(
      Math.abs(mentionPopup.top - mentionPopup.markerBottom),
      Math.abs(mentionPopup.bottom - mentionPopup.markerTop),
    ),
  ).toBeLessThanOrEqual(6);
  await title.focus();
  await expect(page.getByRole("option", { name: "Alice Example alice" })).toHaveCount(0);
  await body.focus();
  await body.press("i");
  await expect.poll(() => state.mentionQueries.at(-1)).toBe("ali");
  await expect(page.getByRole("option", { name: "Alice Example alice" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Ali Decoy decoy" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "@project all: admin/sample" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "@group all: team" })).toHaveCount(0);
  await body.press("Escape");
  await expect(body).toHaveValue("Hello @ali");
  await expect(page.getByRole("option", { name: "Alice Example alice" })).toHaveCount(0);
  await page.waitForTimeout(350);
  await expect(page.getByRole("option", { name: "Alice Example alice" })).toHaveCount(0);
  await body.press("c");
  await expect.poll(() => state.mentionQueries.at(-1)).toBe("alic");
  await body.press("ArrowDown");
  await body.press("Enter");
  await expect(body).toHaveValue("Hello @alice ");

  await body.fill("See #11");
  await expect.poll(() => state.issueReferenceQueries.at(-1)).toBe("11");
  await expect(page.getByRole("option", { name: "#11 Existing parent" })).toBeVisible();
  await expect(page.locator("#editor-mention-options [role=option]").first()).toHaveAttribute(
    "aria-label",
    "#11 Existing parent",
  );
  await body.press("Enter");
  await expect(body).toHaveValue("See #11 ");

  await body.fill("Ship :smi");
  await expect(page.getByRole("option", { name: /smile/u }).first()).toBeVisible();
  await body.press("Enter");
  await expect(body).toHaveValue(/Ship 🙂/u);

  await body.fill("Deliver :택배");
  await expect(page.getByRole("option", { name: /택배 parcel/u })).toBeVisible();
  await body.press("Enter");
  await expect(body).toHaveValue(/Deliver 📦 /u);

  await title.fill("Implement [b");
  await expect.poll(() => state.titleQueries.at(-1)).toBe("b");
  await expect(page.locator(".title-head-options")).toBeVisible();
  await page.locator("#issueDueDate").focus();
  await expect(page.locator(".title-head-options")).toHaveCount(0);
  await title.focus();
  await title.press("u");
  await expect.poll(() => state.titleQueries.at(-1)).toBe("bu");
  await title.press("Escape");
  await expect(title).toHaveValue("Implement [bu");
  await expect(page.locator(".title-head-options")).toHaveCount(0);
  await page.waitForTimeout(350);
  await expect(page.locator(".title-head-options")).toHaveCount(0);
  await title.press("g");
  await expect.poll(() => state.titleQueries.at(-1)).toBe("bug");
  await expect(page.getByRole("option", { name: /type.*bug/iu })).toBeVisible();
  await expect(page.locator(".title-head-options [role=option]").first()).toContainText("bug");
  await title.press("ArrowDown");
  await title.press("Enter");
  await expect(title).toHaveValue("Implement ");
  await expect(page.locator(".issue-label-token", { hasText: "bug" })).toBeVisible();
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText("Label: bug");
  await page.getByRole("button", { name: "Delete bug" }).click();
  await title.fill("Implement [Bug");
  await expect.poll(() => state.titleQueries.at(-1)).toBe("Bug");
  await title.press("Enter");
  await expect(title).toHaveValue("Implement [Bugfix]");
  const titleQueryCount = state.titleQueries.length;
  await title.fill(`Implement [${"x".repeat(21)}`);
  await page.waitForTimeout(350);
  expect(state.titleQueries).toHaveLength(titleQueryCount);
  await expect(page.locator(".title-head-options")).toHaveCount(0);

  const fileInput = page.locator('#upload input[type="file"]');
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect(page.locator("#upload .attach-save-help")).toHaveCount(0);
  await body.fill("Files: ");
  await body.evaluate((textarea: HTMLTextAreaElement) => textarea.setSelectionRange(7, 7));
  await fileInput.setInputFiles({
    buffer: Buffer.from("attachment body"),
    mimeType: "text/plain",
    name: "notes.txt",
  });
  await expect(
    page.locator(".attached-file", { hasText: "notes.txt" }).locator(".upload-progress"),
  ).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".attached-file", { hasText: "notes.txt" })
        .locator(".upload-progress .bar")
        .evaluate((bar: HTMLElement) => Number.parseFloat(bar.style.width) || 0),
    )
    .toBeGreaterThan(0);
  await expect(page.locator("#upload .attach-save-help")).toHaveText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator(".attached-file", { hasText: "notes.txt" })).toContainText("15 bytes");
  await expect(page.locator(".attached-file", { hasText: "notes.txt" })).toContainText(
    "Click to post",
  );
  await expect(page.locator(".attached-file", { hasText: "notes.txt" })).toHaveClass(/complete/u);
  await page.locator(".attached-file", { hasText: "notes.txt" }).getByText("notes.txt").click();
  await expect(body).toHaveValue(new RegExp(`Files: \\[notes\\.txt\\]\\(${basePath}/files/501\\)`));

  await fileInput.setInputFiles({
    buffer: Buffer.from("png"),
    mimeType: "image/png",
    name: "diagram.png",
  });
  await page.locator(".attached-file", { hasText: "diagram.png" }).getByText("diagram.png").click();
  await expect(body).toHaveValue(new RegExp(`!\\[diagram\\.png\\]\\(${basePath}/files/502\\)`));
  await page.getByRole("button", { name: "Delete notes.txt" }).click();
  await expect.poll(() => state.deletedAttachmentIds).toEqual([501]);
  await expect(body).not.toHaveValue(/notes\.txt/u);

  await fileInput.setInputFiles({
    buffer: Buffer.alloc(1_024),
    mimeType: "application/octet-stream",
    name: "kilobyte.bin",
  });
  await expect(page.locator(".attached-file", { hasText: "normalized.bin" })).toContainText(
    "1.00 Kb",
  );
  await fileInput.setInputFiles({
    buffer: Buffer.from("video"),
    mimeType: "video/mp4",
    name: "demo.mp4",
  });
  await page.locator(".attached-file", { hasText: "demo.mp4" }).getByText("demo.mp4").click();
  await expect(body).toHaveValue(
    /<video class="video-js" data-setup="\{\}" controls><source src=.*type="video\/mp4"><\/video>\[demo\.mp4\]/u,
  );
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator("#preview-body video.video-js")).toHaveAttribute("data-setup", "{}");
  await expect(page.locator("#preview-body video.video-js source")).toHaveAttribute(
    "src",
    `${basePath}/files/504`,
  );
  await expect(page.locator("#preview-body video.video-js source")).toHaveAttribute(
    "type",
    "video/mp4",
  );
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("button", { name: "Delete demo.mp4" }).click();
  await expect(body).not.toHaveValue(/video-js/u);

  const beforeUploadBoxDrop = await body.inputValue();
  await dispatchDroppedFile(page, "dropped.txt", "dropped");
  await expect(page.locator(".attached-file", { hasText: "dropped.txt" })).toBeVisible();
  await expect(body).toHaveValue(beforeUploadBoxDrop);

  await body.fill("Drop: tail");
  await body.evaluate((textarea: HTMLTextAreaElement) =>
    textarea.setSelectionRange(6, textarea.value.length),
  );
  await dispatchTextareaDroppedFiles(page, [
    { content: "first", mimeType: "text/plain", name: "first.txt" },
    { content: "second", mimeType: "image/png", name: "second.png" },
  ]);
  await expect(body).toHaveValue(/Drop: <!--_upload-\d+_--><!--_upload-\d+_-->tail/u);
  await expect(body).toHaveValue(
    `Drop: [first.txt](${basePath}/files/506) ![second.png](${basePath}/files/507) tail`,
  );
  await expect
    .poll(() => body.evaluate((textarea: HTMLTextAreaElement) => textarea.selectionStart))
    .toBe((await body.inputValue()).indexOf("tail"));
  await body.evaluate((textarea: HTMLTextAreaElement) =>
    textarea.setSelectionRange(textarea.value.indexOf("tail"), textarea.value.length),
  );
  await dispatchPastedFile(page, "pasted.png", "image/png", "paste");
  await expect
    .poll(() => state.uploadedNames.at(-1))
    .toMatch(/^\d{1,5}-\d{4}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}\.png$/u);
  await expect(page.locator(".attached-file", { hasText: "server-pasted.png" })).toBeVisible();
  await expect(body).toHaveValue(
    `Drop: [first.txt](${basePath}/files/506) ![second.png](${basePath}/files/507) ![server-pasted.png](${basePath}/files/508) tail`,
  );

  await body.fill("Debounced local draft");
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key), draftKey), { timeout: 6_500 })
    .toBe("Debounced local draft");
  await expect(page.locator(".editor-notice-label")).toContainText("Draft saved");

  await page.getByRole("button", { name: "Option" }).click();
  await page.locator("#targetProjectId").selectOption("9");
  await title.fill("Move this issue");
  const save = page.getByRole("button", { name: "Save", exact: true });
  await save.click();
  await expect(save).toBeDisabled();
  await expect.poll(() => state.createBodies.length).toBe(1);
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
  expect(state.createBodies[0]).toMatchObject({
    attachmentIds: [502, 503, 505, 506, 507, 508],
    isDraft: false,
    labelIds: [],
    targetProjectId: 9,
    title: "Move this issue",
  });
  expect(state.createBodies[0]).not.toHaveProperty("parentIssueId");
  await expect(page).toHaveURL(`${basePath}/weblabs/api/issue/91`);
  expectAllAppRequestsStayMounted(state.requests, basePath);
  expectMutationCsrf(state.requests);
});

test("closing the option panel submits to the source project after selecting another target", async ({
  page,
}) => {
  const basePath = appBasePath();
  const state = await mockIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform`);

  const optionButton = page.getByRole("button", { name: "Option" });
  await optionButton.click();
  await page.locator("#targetProjectId").selectOption("9");
  await expect(page.locator("#targetProjectId")).toHaveValue("9");
  await optionButton.click();
  await expect(page.locator("#targetProjectId")).toBeDisabled();

  await page.locator("#title").fill("Stay in source project");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.createBodies.length).toBe(1);
  expect(state.createBodies[0]).not.toHaveProperty("targetProjectId");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/91`);
  expectAllAppRequestsStayMounted(state.requests, basePath);
  expectMutationCsrf(state.requests);
});

test("Markdown preview keeps legacy heading anchors, hash-route state, and scheme-relative links", async ({
  page,
}) => {
  const basePath = appBasePath();
  await mockIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform?parentIssueId=42&commentId=55`);
  await page
    .locator("#editor-body-body")
    .fill(
      [
        "# Hello, Yona!",
        "# Hello Yona",
        "# Reference #11",
        "[Jump](#yb-header-hello-yona)",
        "[Protocol relative](//example.com/path)",
      ].join("\n\n"),
    );
  await page.getByRole("button", { name: "Preview", exact: true }).click();

  const preview = page.locator("#preview-body");
  const headings = preview.locator("h1");
  await expect(headings.nth(0)).toHaveAttribute("id", "yb-header-hello-yona");
  await expect(headings.nth(1)).toHaveAttribute("id", "yb-header-hello-yona-1");
  await expect(headings.nth(2)).toHaveAttribute("id", "yb-header-reference-11");
  const headingAnchor = headings.nth(0).locator("a.head-anchor");
  await expect(headingAnchor).toHaveText("#");
  const fragmentLink = preview.getByRole("link", { name: "Jump" });
  const fragmentHref = await fragmentLink.getAttribute("href");
  expect(fragmentHref).not.toBeNull();
  const fragmentUrl = new URL(fragmentHref ?? "", page.url());
  expect(fragmentUrl.pathname).toBe(`${basePath}/admin/sample/issueform`);
  expect(fragmentUrl.searchParams.get("commentId")).toBe("55");
  expect(fragmentUrl.searchParams.get("parentIssueId")).toBe("42");
  expect(fragmentUrl.hash).toBe("#yb-header-hello-yona");
  const schemeRelativeHref = await preview
    .getByRole("link", { name: "Protocol relative" })
    .getAttribute("href");
  expect(schemeRelativeHref).not.toBeNull();
  const schemeRelativeUrl = new URL(schemeRelativeHref ?? "", page.url());
  expect(schemeRelativeUrl.protocol).toBe(new URL(page.url()).protocol);
  expect(schemeRelativeUrl.hostname).toBe("example.com");
  expect(schemeRelativeUrl.pathname).toBe("/path");

  await page.locator("html").evaluate((element) => {
    element.dataset.issueFormSpaSentinel = "alive";
  });
  let confirmCalls = 0;
  page.on("dialog", async (dialog) => {
    confirmCalls += 1;
    await dialog.dismiss();
  });
  await fragmentLink.click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#yb-header-hello-yona");
  expect(confirmCalls).toBe(0);
  await expect.poll(() => new URL(page.url()).searchParams.get("commentId")).toBe("55");
  await expect.poll(() => new URL(page.url()).searchParams.get("parentIssueId")).toBe("42");
  const currentUrl = new URL(page.url());
  expect(currentUrl.pathname).toBe(`${basePath}/admin/sample/issueform`);
  expect(currentUrl.searchParams.get("commentId")).toBe("55");
  expect(currentUrl.searchParams.get("parentIssueId")).toBe("42");
  await expect(page.locator("html")).toHaveAttribute("data-issue-form-spa-sentinel", "alive");

  await page.getByRole("button", { name: "Header", exact: true }).click();
  const helpHeadingLink = page.locator(".markdown-help-item.markdownHeaders h1 a.head-anchor");
  const helpHeadingHref = await helpHeadingLink.getAttribute("href");
  expect(helpHeadingHref).not.toBeNull();
  const helpHeadingUrl = new URL(helpHeadingHref ?? "", page.url());
  expect(helpHeadingUrl.pathname).toBe(`${basePath}/admin/sample/issueform`);
  expect(helpHeadingUrl.searchParams.get("commentId")).toBe("55");
  expect(helpHeadingUrl.searchParams.get("parentIssueId")).toBe("42");
  expect(helpHeadingUrl.hash).toBe("#yb-header-this-is-an-h1");
  await helpHeadingLink.click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#yb-header-this-is-an-h1");
  expect(confirmCalls).toBe(0);
  await expect.poll(() => new URL(page.url()).searchParams.get("commentId")).toBe("55");
  await expect.poll(() => new URL(page.url()).searchParams.get("parentIssueId")).toBe("42");
  await expect(page.locator("html")).toHaveAttribute("data-issue-form-spa-sentinel", "alive");
});

test("Preview resolves only backend-approved issue, commit, and mention references on the mounted API", async ({
  page,
}) => {
  const basePath = appBasePath();
  await setBrowserLanguage(page, "ko-KR");
  const markdownReferences = {
    commitReferences: [
      {
        commitId: "abcdef1234567890",
        ownerName: "admin",
        projectName: "sample",
        shortId: "abcdef1",
        token: "abcdef1",
      },
      {
        commitId: "fedcba9876543210",
        ownerName: "other",
        projectName: "cross",
        shortId: "fedcba9",
        token: "other/cross@fedcba9",
      },
    ],
    issueReferences: [
      {
        issueNumber: 11,
        ownerName: "admin",
        projectName: "sample",
        state: "open",
        title: "Local <img src=x onerror=bad>",
        token: "#11",
      },
      {
        issueNumber: 12,
        ownerName: "other",
        projectName: "sample",
        state: "closed",
        title: "Owner shortcut",
        token: "other#12",
      },
      {
        issueNumber: 13,
        ownerName: "other",
        projectName: "cross",
        state: "open",
        title: "Cross project",
        token: "other/cross#13",
      },
      {
        issueNumber: 14,
        ownerName: "other",
        projectName: "sample",
        state: "open",
        title: "At owner shortcut",
        token: "@other#14",
      },
    ],
    mentionReferences: [
      {
        kind: "user",
        label: "Alice Example",
        loginId: "alice",
        ownerName: "",
        projectName: "",
        token: "@alice",
      },
      {
        kind: "organization",
        label: "Team",
        loginId: "team",
        ownerName: "",
        projectName: "",
        token: "@team",
      },
      {
        kind: "project",
        label: "other/cross",
        loginId: "other/cross",
        ownerName: "other",
        projectName: "cross",
        token: "@other/cross",
      },
      {
        kind: "user",
        label: "Korean Mention",
        loginId: "koreanmention",
        ownerName: "",
        projectName: "",
        token: "@koreanmention",
      },
    ],
  };
  const state = await mockIssueForm(page, { markdownReferences });
  await page.goto(`${basePath}/admin/sample/issueform`);
  const body = page.locator("#editor-body-body");
  const markdown = [
    "Issues #11 other#12 other/cross#13 @other#14 invalid #999.",
    "Commits abcdef1 other/cross@fedcba9 invalid deadbeef.",
    "Mentions @alice @team @other/cross 한@koreanmention invalid @missing.",
    "Wrapped A#11B x@alice zabcdef1y.",
    "`#11 @alice abcdef1` and [#11 @alice](https://example.com/ref)",
  ].join("\n\n");
  await body.fill(markdown);
  expect(state.markdownReferenceBodies).toEqual([]);

  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  await expect.poll(() => state.markdownReferenceBodies).toEqual([markdown]);
  const metadataRequest = state.requests.find((request) =>
    request.pathname.endsWith("/markdown-references"),
  );
  expect(metadataRequest).toMatchObject({
    method: "POST",
    pathname: `${basePath}/api/v1/owners/admin/projects/sample/markdown-references`,
  });

  const preview = page.locator("#preview-body");
  await expect(preview.locator("a.issueLink")).toHaveCount(4);
  const localIssue = preview.locator(`a.issueLink[href="${basePath}/admin/sample/issue/11"]`);
  await expect(localIssue).toContainText("#11.Local <img src=x onerror=bad>");
  await expect(localIssue.locator("img")).toHaveCount(0);
  await expect(localIssue.locator(".issue-state.open")).toHaveText("열림");
  await expect(
    preview.locator(`a.issueLink[href="${basePath}/other/sample/issue/12"]`),
  ).toContainText("other#12.Owner shortcutother#12.Owner shortcut");
  await expect(
    preview.locator(`a.issueLink[href="${basePath}/other/sample/issue/12"] .issue-state.closed`),
  ).toHaveText("닫힘");
  await expect(
    preview.locator(`a.issueLink[href="${basePath}/other/cross/issue/13"]`),
  ).toContainText("other/cross#13.Cross projectother/cross#13.Cross project");
  await expect(
    preview.locator(`a.issueLink[href="${basePath}/other/sample/issue/14"]`),
  ).toContainText("other#14.At owner shortcutother#14.At owner shortcut");
  await expect(
    preview.locator(`a[href="${basePath}/admin/sample/commit/abcdef1234567890"]`),
  ).toHaveText("abcdef1");
  await expect(
    preview.locator(`a[href="${basePath}/other/cross/commit/fedcba9876543210"]`),
  ).toHaveText("other/cross@fedcba9");
  await expect(preview.locator(`a[href="${basePath}/alice"]`)).toHaveText("@Alice Example");
  await expect(preview.locator(`a[href="${basePath}/organizations/team"]`)).toHaveText("@Team");
  await expect(preview.locator(`a[href="${basePath}/other/cross"]`)).toHaveText("@other/cross");
  await expect(preview.locator(`a[href="${basePath}/koreanmention"]`)).toHaveText(
    "@Korean Mention",
  );
  await expect(preview.locator("p", { hasText: "Wrapped" }).locator("a")).toHaveCount(0);
  await expect(preview.locator("code").locator("a")).toHaveCount(0);
  const explicitLink = preview.locator('a[href="https://example.com/ref"]');
  await expect(explicitLink).toHaveText("#11 @alice");
  await expect(explicitLink).not.toHaveAttribute("target", /.+/u);
  await expect(preview).toContainText("invalid #999");
  await expect(preview).toContainText("invalid deadbeef");
  await expect(preview).toContainText("invalid @missing");

  await page.getByRole("button", { name: "편집", exact: true }).click();
  const updatedMarkdown = `${markdown}\n\n#14`;
  await body.fill(updatedMarkdown);
  await page.getByRole("button", { name: "미리보기", exact: true }).click();
  await expect.poll(() => state.markdownReferenceBodies).toEqual([markdown, updatedMarkdown]);
  await expect(preview).toContainText("#14");
});

test("Markdown preview keeps the legacy sanitizer allowlist and blocks scripts and event handlers", async ({
  page,
}) => {
  const basePath = appBasePath();
  await mockIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform`);
  await page
    .locator("#editor-body-body")
    .fill(
      [
        '<a href="https://example.com/explicit" name="legacy-name" target="_self" rel="nofollow">explicit</a>',
        '<a href="https://example.com/rel-only" rel="nofollow">rel only</a>',
        '<a href="zpl://printer/job">zpl link</a>',
        '<video class="video-js" data-setup="{}" controls preload="auto" type="video/mp4" autoplay responsive="true" height="120" width="200" fluid="true" liveui="true" src="file:///tmp/movie.mp4"><source src="zpl://printer/movie" type="video/mp4" target="preview"></video>',
        '<input type="checkbox" disabled checked>',
        '<ol start="3"><li>third</li></ol>',
        `<iframe width="320" height="180" src="${basePath}/safe-frame" frameborder="0" allow="fullscreen" allowfullscreen></iframe>`,
        '<span class="legacy-span" id="legacy-id" style="color:red; position:fixed; inset:0; z-index:999999; background-image:url(javascript:alert(1)); behavior:url(x); width:expression(alert(1))" width="10" height="20">styled</span>',
        "<script>danger()</script>",
        '<a href="javascript:alert(1)" onclick="danger()">blocked link</a>',
        '<img src="javascript:alert(2)" onerror="danger()" alt="blocked image">',
      ].join("\n"),
    );
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  const preview = page.locator("#preview-body");

  const explicit = preview.getByRole("link", { name: "explicit" });
  await expect(explicit).toHaveAttribute("target", "_self");
  await expect(explicit).toHaveAttribute("rel", "noopener noreferrer");
  await expect(explicit).toHaveAttribute("name", "legacy-name");
  await expect(preview.getByRole("link", { name: "rel only" })).not.toHaveAttribute("rel", /.+/u);
  const zplLink = preview.getByRole("link", { name: "zpl link" });
  await expect(zplLink).toHaveAttribute("href", "zpl://printer/job");
  await expect(zplLink).not.toHaveAttribute("target", /.+/u);
  await expect(zplLink).not.toHaveAttribute("rel", /.+/u);
  const video = preview.locator("video.video-js");
  await expect(video).toHaveAttribute("data-setup", "{}");
  await expect(video).toHaveAttribute("preload", "auto");
  await expect(video).toHaveAttribute("src", "file:///tmp/movie.mp4");
  await expect(video).toHaveAttribute("responsive", "true");
  await expect(video.locator("source")).toHaveAttribute("src", "zpl://printer/movie");
  await expect(video.locator("source")).toHaveAttribute("target", "preview");
  await expect(preview.locator('input[type="checkbox"][disabled][checked]')).toHaveCount(1);
  await expect(preview.locator("ol")).toHaveAttribute("start", "3");
  const iframe = preview.locator("iframe");
  await expect(iframe).toHaveAttribute("src", `${basePath}/safe-frame`);
  await expect(iframe).toHaveAttribute("frameborder", "0");
  await expect(iframe).toHaveAttribute("allowfullscreen", "");
  const span = preview.locator("span#legacy-id.legacy-span");
  await expect(span).toHaveCSS("color", "rgb(255, 0, 0)");
  await expect(span).toHaveAttribute("width", "10");
  await expect(span).toHaveAttribute("height", "20");
  const sanitizedStyle = (await span.getAttribute("style")) ?? "";
  expect(sanitizedStyle).toMatch(/color:\s*red/iu);
  expect(sanitizedStyle).not.toMatch(
    /position|inset|z-index|background-image|behavior|expression|javascript/iu,
  );

  await expect(preview.locator("script")).toHaveCount(0);
  await expect(preview).not.toContainText("danger()");
  const blockedLink = preview.getByText("blocked link");
  await expect(blockedLink).not.toHaveAttribute("href", /javascript:/iu);
  await expect(blockedLink).not.toHaveAttribute("onclick", /.+/u);
  const blockedImage = preview.locator('img[alt="blocked image"]');
  await expect(blockedImage).not.toHaveAttribute("src", /javascript:/iu);
  await expect(blockedImage).not.toHaveAttribute("onerror", /.+/u);
});

test("Excel clipboard text plus image inserts the legacy Markdown table without uploading the image", async ({
  page,
}) => {
  const basePath = appBasePath();
  const state = await mockIssueForm(page);
  await page.goto(`${basePath}/admin/sample/issueform`);
  const body = page.locator("#editor-body-body");
  await body.fill("BEGIN selected tail");
  await body.evaluate((textarea: HTMLTextAreaElement) => textarea.setSelectionRange(6, 14));
  const clipboardText = "^lName\t^cRole\t^rScore\r\nAda\nLovelace\tEngineer\t9\r\nBob\tCTO\t100";
  await dispatchPastedTextAndImage(page, clipboardText, "ignored.png", "image/png", "image");

  const table = [
    `| ${"Name".padEnd(12)} | ${"Role".padEnd(8)} | ${"Score".padEnd(5)} |`,
    `|${"-".repeat(14)}|:${"-".repeat(8)}:|${"-".repeat(6)}:|`,
    `| ${"Ada Lovelace".padEnd(12)} | ${"Engineer".padEnd(8)} | ${"9".padEnd(5)} |`,
    `| ${"Bob".padEnd(12)} | ${"CTO".padEnd(8)} | ${"100".padEnd(5)} |`,
  ].join("\n");
  await expect(body).toHaveValue(`BEGIN ${table}selected tail`);
  await expect
    .poll(() => body.evaluate((textarea) => textarea.selectionStart))
    .toBe(6 + table.length);
  await expect(body).toBeFocused();
  expect(state.uploadedNames).toEqual([]);
  await expect(page.locator(".attached-file")).toHaveCount(0);
});

test("draft submit is pending guarded and sends the legacy isDraft payload", async ({ page }) => {
  const basePath = appBasePath();
  const state = await mockIssueForm(page, { createDelayMs: 1_500 });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await page.locator("#title").fill("Private draft");
  await page.locator("#editor-body-body").fill("Only me");

  const draft = page.getByRole("button", { name: "Draft Save", exact: true });
  await expect(draft).toHaveAttribute("title", "Only you can see it until you publish");
  await draft.click();
  await expect(draft).toBeDisabled();
  await expect(page.locator("#button-save")).toBeDisabled();
  await expect.poll(() => state.createBodies.length).toBe(1);
  expect(state.createBodies[0]).toMatchObject({ isDraft: true, title: "Private draft" });
  await expect(page.locator("#isDraft")).toHaveValue("true");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/91`);
  expectAllAppRequestsStayMounted(state.requests, basePath);
  expectMutationCsrf(state.requests);
});

test("legacy validation uses alert and toast, server errors stay in the form, and cancel honors dirty blocking", async ({
  page,
}) => {
  const basePath = appBasePath();
  const state = await mockIssueForm(page, {
    createStatus: 422,
    deleteFailures: 1,
    failUploadNames: ["broken.txt"],
    uploadDelayMs: 300,
  });
  await page.goto(`${basePath}/admin/sample/issueform`);

  await page.locator(".project-name a").click();
  await expect(page).toHaveURL(`${basePath}/admin/sample`);
  await page.goto(`${basePath}/projects`);
  await page.goto(`${basePath}/admin/sample/issueform`);

  const title = page.locator("#title");
  const save = page.getByRole("button", { name: "Save", exact: true });
  const alertMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await save.click();
  await expect(alertMessage).resolves.toBe("Issue title is a required field.");
  await expect(title).toBeFocused();
  expect(state.createBodies).toHaveLength(0);

  await title.fill("Invalid date");
  await page.locator("#issueDueDate").fill("2026-02-30");
  await save.click();
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText(
    "Issue due date is not valid date type.",
  );
  await expect(page.locator("#issueDueDate")).toBeFocused();
  expect(state.createBodies).toHaveLength(0);

  await page.locator("#issueDueDate").fill("");
  await title.fill("Server error");
  await save.click();
  await expect(page.locator(".issue-form-error")).toHaveText("Issue could not be created");
  const errorPosition = await page.evaluate(() => {
    const titleBox = document.querySelector<HTMLElement>("#title")!.getBoundingClientRect();
    const errorBox = document
      .querySelector<HTMLElement>(".issue-form-error")!
      .getBoundingClientRect();
    const editorBox = document
      .querySelector<HTMLElement>(".issue-markdown-editor")!
      .getBoundingClientRect();
    return { editorTop: editorBox.top, errorTop: errorBox.top, titleBottom: titleBox.bottom };
  });
  expect(errorPosition.errorTop).toBeGreaterThanOrEqual(errorPosition.titleBottom);
  expect(errorPosition.errorTop).toBeLessThan(errorPosition.editorTop);

  const body = page.locator("#editor-body-body");
  await body.fill("Keep");
  await body.evaluate((textarea: HTMLTextAreaElement) => textarea.setSelectionRange(4, 4));
  await dispatchTextareaDroppedFiles(page, [
    { content: "broken", mimeType: "text/plain", name: "broken.txt" },
  ]);
  await expect(body).toHaveValue(/Keep<!--_upload-\d+_-->/u);
  await expect(body).toHaveValue("Keep");
  await expect(page.locator(".attached-file", { hasText: "broken.txt" })).toHaveCount(0);

  await page.locator('#upload input[type="file"]').setInputFiles({
    buffer: Buffer.from("broken"),
    mimeType: "text/plain",
    name: "broken.txt",
  });
  await expect(page.locator(".attached-file", { hasText: "broken.txt" })).toHaveCount(0);
  await expect(page.locator("#yobiToasts .toast .msg")).toContainText("Failed to upload");

  await page.locator('#upload input[type="file"]').setInputFiles({
    buffer: Buffer.from("retry"),
    mimeType: "text/plain",
    name: "retry.txt",
  });
  await page.getByRole("button", { name: "Delete retry.txt" }).click();
  await expect(page.locator(".attached-file", { hasText: "retry.txt" })).toBeVisible();
  await expect(page.locator("#yobiToasts .toast .msg")).toContainText("Failed to delete");
  await page.getByRole("button", { name: "Delete retry.txt" }).click();
  await expect(page.locator(".attached-file", { hasText: "retry.txt" })).toHaveCount(0);

  await body.fill("");
  await page.goto(`${basePath}/projects`);
  await page.goto(`${basePath}/admin/sample/issueform`);
  await page.locator("#editor-body-body").fill("Dirty body");
  const beforeUnloadCopy =
    "Issue is not saved yet. Would you like to exit this page without saving?";
  const dismissMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.dismiss();
    });
  });
  await page.locator(".project-name a").click();
  expect(await dismissMessage).toBe(beforeUnloadCopy);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/issueform`);

  const acceptMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.locator(".project-name a").click();
  expect(await acceptMessage).toBe(beforeUnloadCopy);
  await expect(page).toHaveURL(`${basePath}/admin/sample`);

  await page.goto(`${basePath}/projects`);
  await page.goto(`${basePath}/admin/sample/issueform`);
  await page.locator("#editor-body-body").fill("Dirty body");
  const cancelDismissMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.dismiss();
    });
  });
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(await cancelDismissMessage).toBe(beforeUnloadCopy);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/admin/sample/issueform`);

  const cancelAcceptMessage = new Promise<string>((resolve) => {
    page.once("dialog", async (dialog) => {
      resolve(dialog.message());
      await dialog.accept();
    });
  });
  await page.getByRole("button", { name: "Cancel" }).click();
  expect(await cancelAcceptMessage).toBe(beforeUnloadCopy);
  expect(new URL(page.url()).pathname).toBe(`${basePath}/projects`);
});

test("form capability branches preserve empty milestones, label ACL, blank labels, and mounted asset fallbacks", async ({
  page,
}) => {
  const basePath = appBasePath();
  await mockIssueForm(page, {
    formOptions: {
      canCreateIssueAssignee: false,
      canCreateIssueMilestone: true,
      canManageIssueLabels: false,
    },
    milestones: [],
    project: { backgroundUrl: "", logoUrl: "" },
  });
  await page.goto(`${basePath}/admin/sample/issueform`);

  await expect(page.getByRole("combobox", { name: "Assignee" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "New milestone" })).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/newMilestoneForm`,
  );
  await expect(page.locator(".label-edit")).toHaveCount(0);
  // F6 copy-fix: app fallback renders the bundled Vite assets (projectName.tsx:10 import +
  // projectLogoUrl, $projectName.tsx:3530) where legacy falls back to routes.Assets.at
  // (TemplateHelper.scala:192-196) — same image, dist URL replaces the stale legacy-assets pin.
  const fallbackLogoPath = `${basePath}/assets/project_default_logo-CAWzVokN.png`;
  const fallbackBackgroundPath = `${basePath}/assets/project_default-DvNH5PGr.jpg`;
  await expect(page.locator(".project-header-avatar img")).toHaveAttribute("src", fallbackLogoPath);
  await expect(page.locator(".project-header-outer")).toHaveCSS(
    "background-image",
    new RegExp(`${escapeRegex(basePath)}/assets/project_default-DvNH5PGr\\.jpg`),
  );
  expect((await page.request.get(new URL(fallbackLogoPath, page.url()).toString())).status()).toBe(
    200,
  );
  expect(
    (await page.request.get(new URL(fallbackBackgroundPath, page.url()).toString())).status(),
  ).toBe(200);

  await page.unrouteAll({ behavior: "wait" });
  await mockIssueForm(page, {
    formOptions: { canCreateIssueMilestone: false },
    labels: [],
  });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.getByRole("combobox", { name: "Select label" })).toHaveCount(0);
  await expect(page.locator("#milestoneOption")).toHaveCount(0);
});

test("uploader exposes paste help, enforces the configured size limit, and reports XHR progress", async ({
  page,
}) => {
  const basePath = appBasePath();
  await page.addInitScript(
    ({ configuredBasePath, maxUploadedFileSize }) => {
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath: configuredBasePath,
        maxUploadedFileSize,
      };
    },
    { configuredBasePath: basePath, maxUploadedFileSize: 5 },
  );
  const state = await mockIssueForm(page, { uploadDelayMs: 1_000 });
  await page.goto(`${basePath}/admin/sample/issueform`);

  const fileInput = page.locator('#upload input[type="file"]');
  await expect(page.locator("#upload .help-pastable")).toHaveText("Paste the clipboard image");
  await expect(page.locator("#upload .help-pastable")).toBeVisible();
  await expect(page.locator("#upload .attach-save-help")).toHaveCount(0);

  await fileInput.setInputFiles({
    buffer: Buffer.from("123456"),
    mimeType: "text/plain",
    name: "too-large.txt",
  });
  await expect(page.locator("#yobiToasts .toast .msg")).toHaveText(
    "Wow, that's huge! Please submit file smaller than 5 bytes.",
  );
  expect(state.uploadedNames).toEqual([]);
  await expect(page.locator(".attached-file", { hasText: "too-large.txt" })).toHaveCount(0);

  await fileInput.setInputFiles({
    buffer: Buffer.from("1234"),
    mimeType: "text/plain",
    name: "ok.txt",
  });
  const row = page.locator(".attached-file", { hasText: "ok.txt" });
  await expect(row.locator(".upload-progress")).toBeVisible();
  await expect
    .poll(() =>
      row
        .locator(".upload-progress .bar")
        .evaluate((bar: HTMLElement) => Number.parseFloat(bar.style.width) || 0),
    )
    .toBeGreaterThan(0);
  await expect.poll(() => state.uploadedNames).toEqual(["ok.txt"]);
  await expect(row).toHaveClass(/complete/u);
  await expect(page.locator("#upload .attach-save-help")).toBeVisible();
});

test("issue form keeps the legacy responsive stacked columns at 800px", async ({ page }) => {
  const basePath = appBasePath();
  await mockIssueForm(page);
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator("#issue-form")).toBeVisible();

  const metrics = await issueFormMetrics(page);
  expect(metrics.documentWidth).toBe(800);
  expect(metrics.formLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.formRight).toBeLessThanOrEqual(800);
  expect(metrics.leftWidth).toBeCloseTo(metrics.formWidth, 0);
  expect(metrics.rightLeft).toBeGreaterThanOrEqual(metrics.formLeft);
  expect(metrics.rightRight).toBeLessThanOrEqual(metrics.formRight);
  expect(metrics.rightTop).toBeGreaterThanOrEqual(metrics.leftBottom);
});

test("anonymous project form response redirects to the typed mounted login route", async ({
  page,
}) => {
  const basePath = appBasePath();
  await mockIssueForm(page, { formOptionsStatus: 401 });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page).toHaveURL(
    `${basePath}/users/loginform?redirectUrl=%2Fadmin%2Fsample%2Fissueform`,
  );
});

test("issue form matches observed 390px stacking and removes legacy implementation attributes", async ({
  page,
}) => {
  const basePath = appBasePath();
  await setBrowserLanguage(page, "ko-KR");
  await mockIssueForm(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/admin/sample/issueform`);
  await expect(page.locator("#issue-form")).toBeVisible();

  const metrics = await issueFormMetrics(page);
  const markdownHelp = await markdownHelpMetrics(page);
  const uploadMetrics = await issueUploadMetrics(page);
  expect(markdownHelp).toMatchObject({
    rowCount: 3,
    shortLinkRow: 3,
  });
  expect(markdownHelp.height).toBeCloseTo(91, 0);
  expect(metrics.documentWidth).toBe(390);
  expect(metrics.adminTop).toBeCloseTo(0, 0);
  expect(metrics.adminHeight).toBeCloseTo(43, 0);
  expect(metrics.gnbTop).toBeCloseTo(43, 0);
  expect(metrics.gnbHeight).toBeCloseTo(40, 0);
  expect(metrics.headerTop).toBeCloseTo(metrics.gnbTop, 0);
  expect(metrics.headerHeight).toBeCloseTo(120, 0);
  expect(metrics.menuTop).toBeCloseTo(163, 0);
  expect(metrics.menuHeight).toBeCloseTo(40, 0);
  expect(metrics.formTop).toBeCloseTo(213, 0);
  expect(metrics.titleRowTop).toBeCloseTo(metrics.formTop, 0);
  // F5 dist-truth: measured 59px — legacy .content-wrap .title margin 15px top/bottom
  // (yona-original/app/assets/stylesheets/less/page.less:3780-3788) + 30px bootstrap input.
  expect(metrics.titleRowHeight, JSON.stringify(metrics)).toBeCloseTo(59, 0);
  expect(metrics.formLeft).toBeCloseTo(0, 0);
  expect(metrics.formWidth).toBeCloseTo(390, 0);
  expect(metrics.titleWidth).toBeCloseTo(350.953, 2);
  expect(metrics.optionWidth).toBeCloseTo(24.9, 0);
  // F5 dist-truth: the 59px title row shifts every stacked block below it.
  expect(metrics.leftTop).toBeCloseTo(272, 0);
  expect(metrics.leftWidth).toBeCloseTo(390, 0);
  expect(metrics.editorWidth).toBeCloseTo(390, 0);
  // F5 dist-truth: measured 300px (retained legacy textarea rules).
  expect(metrics.textareaHeight).toBeCloseTo(300, 0);
  expect(metrics.textareaTop).toBeCloseTo(408, 0);
  expect(metrics.uploadWidth).toBeCloseTo(390, 0);
  // F5 dist-truth: measured 100px upload box.
  expect(metrics.uploadHeight).toBeCloseTo(100, 0);
  // F5 dist-truth: measured 708px — textareaTop(408) + textareaHeight(300).
  expect(metrics.uploadTop).toBeCloseTo(708, 0);
  // F5 dist-truth: uploadTop(708) + uploadHeight(100) + 30px => 838.
  expect(metrics.leftBottom).toBeCloseTo(838, 0);
  expect(metrics.rightLeft).toBeCloseTo(8.3, 0);
  expect(metrics.rightWidth).toBeCloseTo(370.5, 0);
  // F5 dist-truth: right column shifts with the upload stack (848 measured).
  expect(metrics.rightTop).toBeCloseTo(848, 0);
  expect(metrics.rightTop).toBeGreaterThanOrEqual(metrics.leftBottom + 8);
  expect(metrics.rightTop).toBeLessThanOrEqual(metrics.leftBottom + 12);
  expect(metrics.formRight).toBeLessThanOrEqual(390);
  // F5 dist-truth: measured 390px-stack heights (attach 78 / button 30 /
  // file input 22 / paste 18) on the rebuilt dist.
  expect(uploadMetrics).toMatchObject({
    attachHeight: 78,
    attachWidth: 370,
    buttonHeight: 30,
    buttonPadding: "6px 20px",
    fileInputHeight: 22,
    fileInputOpacity: "0",
    pasteDisplay: "block",
    pasteHeight: 18,
    pasteWidth: 370,
    uploadPadding: "10px",
  });
  // F5 dist-truth: measured 90.5px — legacy .attach-wrap .btn-wrap is
  // display:inline-block (!important, _page.less:3619-3624) so the upload
  // button is content-width on mobile, not row-filling.
  expect(uploadMetrics.buttonWidth).toBeCloseTo(90.5, 0);
  const assignee = page.getByRole("combobox", { name: "담당자" });
  await expect(assignee).toContainText("담당자 없음");
  expect(await assigneeArrowMetrics(page)).toMatchObject({
    arrowHeight: 36,
    arrowRightInset: 0,
    arrowWidth: 26,
    selectionHeight: 28,
  });
  await expect(page.locator("#upload .help-droppable")).toHaveText("첨부할 파일을 끌어다 놓거나");
  await expect(page.locator("#upload .fake-file-wrap")).toContainText("파일 올리기");
  await expect(page.locator("#upload .plain")).toHaveText("버튼을 클릭해서 선택하세요");
  await expect(page.locator("#upload .help-pastable")).toHaveText(
    "클립보드 이미지를 붙여 넣을 수도 있습니다",
  );
  await page.locator('#upload input[type="file"]').setInputFiles({
    name: "ko-accessible.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("ko accessible attachment"),
  });
  await expect(
    page.getByRole("button", { name: "본문에 넣기 ko-accessible.txt", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "삭제 ko-accessible.txt", exact: true }),
  ).toBeVisible();

  await page.getByRole("combobox", { name: "라벨 선택" }).click();
  await page.getByRole("option", { name: "High" }).click();
  await expect(page.getByRole("button", { name: "삭제 high", exact: true })).toBeVisible();

  await page.locator("#editor-body-body").fill("@ali");
  await expect(page.getByRole("option", { name: "Alice Example alice" })).toBeVisible();
  const popup = await mentionPopupMetrics(page);
  expect(popup.left).toBeGreaterThanOrEqual(popup.textareaLeft);
  expect(popup.right).toBeLessThanOrEqual(popup.textareaRight);
  expect(popup.bottom).toBeLessThanOrEqual(popup.viewportHeight - 4);

  await expect(page.locator("[data-attachment-id], [data-label-id]")).toHaveCount(0);

  const routeSource = readFileSync("src/routes/$ownerName/$projectName/issueform.tsx", "utf8");
  const markdownHelpSource = readFileSync("src/routes/-legacy-markdown-help.tsx", "utf8");
  for (const forbidden of [
    "document.",
    "querySelector",
    "addEventListener",
    "classList",
    "style.display",
    "dangerouslySetInnerHTML",
    "<a ",
    "data-toggle",
    "data-format",
    "data-editor-mode",
    "data-resource-type",
    "data-attachment-id",
    "data-label-id",
    'markdown: "true"',
  ]) {
    expect(routeSource, forbidden).not.toContain(forbidden);
  }
  expect(routeSource).toContain('t("title.newIssue")');
  expect(routeSource).not.toContain(".style.setProperty");
  expect(markdownHelpSource).not.toContain('markdown: "true"');
});

type MockOptions = {
  createDelayMs?: number;
  createStatus?: number;
  deleteFailures?: number;
  failUploadNames?: string[];
  formOptions?: Partial<{
    canCreateIssueAssignee: boolean;
    canCreateIssueMilestone: boolean;
    canManageIssueLabels: boolean;
  }>;
  formOptionsStatus?: number;
  labels?: ReturnType<typeof labels>;
  markdownReferences?: {
    commitReferences: Array<Record<string, unknown>>;
    issueReferences: Array<Record<string, unknown>>;
    mentionReferences: Array<Record<string, unknown>>;
  };
  milestones?: Array<Record<string, unknown>>;
  pastedImageResponseName?: string;
  parentOptions?: Array<{ id: number; issueNumber: number; selected: boolean; title: string }>;
  project?: Partial<ReturnType<typeof projectContainer>>;
  uploadDelayMs?: number;
};

type RecordedRequest = {
  csrf: string;
  method: string;
  pathname: string;
};

async function mockIssueForm(page: Page, options: MockOptions = {}) {
  const state = {
    assigneeQueries: [] as string[],
    createBodies: [] as Array<Record<string, unknown>>,
    deletedAttachmentIds: [] as number[],
    favoriteRequests: 0,
    issueReferenceQueries: [] as string[],
    markdownReferenceBodies: [] as string[],
    mentionQueries: [] as string[],
    requests: [] as RecordedRequest[],
    titleQueries: [] as string[],
    uploadedNames: [] as string[],
    watchRequests: [] as boolean[],
  };
  let nextAttachmentId = 501;
  let remainingDeleteFailures = options.deleteFailures ?? 0;
  const record = (route: any) => {
    const request = route.request();
    state.requests.push({
      csrf: request.headers()["x-csrf-token"] ?? "",
      method: request.method(),
      pathname: new URL(request.url()).pathname,
    });
  };

  await page.route("**/api/v1/session", (route) => {
    record(route);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(session()) });
  });
  await page.route("**/api/auth/session", (route) => {
    record(route);
    return route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": CSRF_TOKEN },
      body: JSON.stringify({ session: null, user: null }),
    });
  });
  await page.route("**/api/v1/workspace", (route) => {
    record(route);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emails: [],
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        session: session(),
        watchedProjects: [],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) => {
    record(route);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectContainer(), ...options.project }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) => {
    record(route);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ labels: options.labels ?? labels() }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/form-options", (route) => {
    record(route);
    if (options.formOptionsStatus === 401) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "unauthorized", message: "Login required", status: 401 },
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        canCreateIssueAssignee: true,
        canCreateIssueMilestone: true,
        canManageIssueLabels: true,
        currentProject: {
          logoUrl: `${appBasePath()}/assets/images/project_default_logo.png`,
          ownerName: "admin",
          projectId: 7,
          projectName: "sample",
        },
        issueTemplateMarkdown: "Template body",
        movableIssueProjects: [
          {
            logoUrl: `${appBasePath()}/files/900`,
            ownerName: "weblabs",
            projectId: 9,
            projectName: "api",
          },
        ],
        ...options.formOptions,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", (route) => {
    record(route);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: options.parentOptions ?? [
          { id: 42, issueNumber: 11, selected: false, title: "Existing parent" },
        ],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) => {
    record(route);
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: options.milestones ?? [{ id: 5, state: "open", title: "Sprint 1" }],
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/assignable-users**", async (route) => {
    record(route);
    const query = new URL(route.request().url()).searchParams.get("query") ?? "";
    state.assigneeQueries.push(query);
    const items = query
      ? [
          {
            avatarUrl: `${appBasePath()}/assets/images/default-avatar-32.png`,
            displayName: "Alice Example",
            loginId: "alice",
            pureNameOnly: "Alice Example",
            type: "user",
            userId: "2",
          },
        ]
      : [
          {
            avatarUrl: "",
            displayName: "issue.assignToMe",
            loginId: "admin",
            pureNameOnly: "",
            type: "user",
            userId: "1",
          },
          {
            avatarUrl: "",
            displayName: "issue.noAssignee",
            loginId: "",
            pureNameOnly: "",
            type: "user",
            userId: "",
          },
        ];
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ items, total: items.length, truncated: false }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/title-heads**", async (route) => {
    record(route);
    const query = new URL(route.request().url()).searchParams.get("query") ?? "";
    state.titleQueries.push(query);
    const result =
      query === "Bug"
        ? [{ category: "", frequency: 3, name: "Bugfix", searchText: "Bugfix" }]
        : [
            {
              category: "irrelevant",
              frequency: 99,
              name: "feature",
              searchText: "feature",
            },
            {
              category: "type",
              categoryId: 3,
              frequency: 5,
              id: 8,
              isExclusive: false,
              labelColor: "#51aacc",
              name: "bug",
              searchText: "bug",
            },
            {
              category: "zeta",
              frequency: 5,
              name: "bug later",
              searchText: "bug later",
            },
          ];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ result }) });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/mention-users**", async (route) => {
    record(route);
    const url = new URL(route.request().url());
    const query = url.searchParams.get("query") ?? "";
    state.mentionQueries.push(query);
    expect(url.searchParams.get("context")).toBe("issue-body");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          {
            avatarUrl: `${appBasePath()}/assets/images/default-avatar-32.png`,
            displayName: "Alice Example",
            loginId: "alice",
            searchText: "Alice Example alice",
            type: "user",
          },
          {
            avatarUrl: `${appBasePath()}/assets/images/default-avatar-32.png`,
            displayName: "Ali Decoy",
            loginId: "decoy",
            searchText: "unrelated",
            type: "user",
          },
          {
            avatarUrl: `${appBasePath()}/assets/images/project_default_logo.png`,
            displayName: "@project all:",
            loginId: "admin/sample",
            searchText: "admin/sample/project/member/all",
            type: "project",
          },
          {
            avatarUrl: `${appBasePath()}/assets/images/group_default.png`,
            displayName: "@group all: ",
            loginId: "team",
            searchText: "team/group/org/member/all",
            type: "organization",
          },
        ],
        total: 1,
        truncated: false,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/issue-references**", async (route) => {
    record(route);
    const query = new URL(route.request().url()).searchParams.get("query") ?? "";
    state.issueReferenceQueries.push(query);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [
          { issueNumber: 211, state: "open", title: "Contains 11" },
          { issueNumber: 11, state: "open", title: "Existing parent" },
          { issueNumber: 111, state: "open", title: "Starts with 11" },
        ],
        total: 3,
        truncated: false,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/markdown-references", async (route) => {
    record(route);
    const requestBody = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    state.markdownReferenceBodies.push(String(requestBody.bodyMarkdown ?? ""));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        options.markdownReferences ?? {
          commitReferences: [],
          issueReferences: [
            {
              issueNumber: 11,
              ownerName: "admin",
              projectName: "sample",
              state: "open",
              title: "Existing parent",
              token: "#11",
            },
          ],
          mentionReferences: [
            {
              kind: "user",
              label: "Alice Example",
              loginId: "alice",
              ownerName: "",
              projectName: "",
              token: "@alice",
            },
          ],
        },
      ),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/favorite", async (route) => {
    record(route);
    state.favoriteRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ favorited: false, ownerName: "admin", projectName: "sample" }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/watch", async (route) => {
    record(route);
    state.watchRequests.push(route.request().method() === "POST");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...projectContainer(), isWatching: false, watchCount: 2 }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/enroll", async (route) => {
    record(route);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ enrollmentRequested: route.request().method() === "POST" }),
    });
  });
  await page.route("**/files", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    record(route);
    const body = route.request().postDataBuffer()?.toString("utf8") ?? "";
    const name = body.match(/filename="([^"]+)"/u)?.[1] ?? "upload.bin";
    const mimeType = body.match(/Content-Type: ([^\r\n]+)/u)?.[1] ?? "application/octet-stream";
    state.uploadedNames.push(name);
    const id = nextAttachmentId++;
    if (options.uploadDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.uploadDelayMs));
    }
    if (options.failUploadNames?.includes(name)) {
      await route.fulfill({ status: 500, body: "upload failed" });
      return;
    }
    const isPastedImage = /^\d{1,5}-\d{4}-\d{1,2}-\d{1,2}-\d{1,2}-\d{1,2}\.png$/u.test(name);
    const responseName =
      isPastedImage && options.pastedImageResponseName
        ? options.pastedImageResponseName
        : name === "kilobyte.bin"
          ? "normalized.bin"
          : name;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id,
        mimeType,
        name: responseName,
        size:
          name === "notes.txt" ? 15 : name === "kilobyte.bin" ? 1_024 : Math.max(3, name.length),
        url: `${appBasePath()}/files/${id}`,
      }),
    });
  });
  await page.route("**/files/*", async (route) => {
    if (route.request().method() !== "DELETE") {
      await route.continue();
      return;
    }
    record(route);
    if (remainingDeleteFailures > 0) {
      remainingDeleteFailures -= 1;
      await route.fulfill({ status: 500, body: "delete failed" });
      return;
    }
    state.deletedAttachmentIds.push(
      Number(new URL(route.request().url()).pathname.split("/").at(-1)),
    );
    await route.fulfill({ status: 204 });
  });
  await page.route("**/api/v1/projects/admin/sample/issues", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    record(route);
    const requestBody = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    state.createBodies.push(requestBody);
    if (options.createDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.createDelayMs));
    }
    if (options.createStatus && options.createStatus >= 400) {
      await route.fulfill({
        status: options.createStatus,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "invalid_issue",
            message: "Issue could not be created",
            status: options.createStatus,
          },
        }),
      });
      return;
    }
    const moved = requestBody.targetProjectId === 9;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        issueNumber: 91,
        ownerName: moved ? "weblabs" : "admin",
        projectName: moved ? "api" : "sample",
      }),
    });
  });

  return state;
}

function session() {
  return {
    actorId: 1,
    avatarUrl: `${appBasePath()}/assets/images/default-avatar-32.png`,
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
}

function projectContainer() {
  return {
    backgroundUrl: `${appBasePath()}/assets/images/bg-default-project.png`,
    boardCount: 1,
    cloneUrl: "git@example.com:admin/sample.git",
    codeMemberOnly: false,
    currentMilestone: null,
    defaultTab: "projectHome",
    enrollmentRequestCount: 0,
    enrollmentRequested: false,
    isFavorited: true,
    isForked: false,
    isWatching: true,
    logoUrl: `${appBasePath()}/assets/images/project_default_logo.png`,
    memberCount: 1,
    members: [],
    openIssueCount: 1,
    openPullRequestCount: 0,
    organizationName: "",
    originOwnerName: "",
    originProjectName: "",
    overview: "Sample project",
    overviewEditable: true,
    ownerName: "admin",
    projectId: 7,
    projectName: "sample",
    projectScope: "PRIVATE",
    reviewCount: 0,
    showAdmin: true,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    vcs: "GIT",
    viewerCanEnroll: true,
    viewerCanLeave: false,
    viewerCanUpdate: true,
    viewerCanWatch: true,
    viewerUserId: 1,
    watchCount: 3,
  };
}

function labels() {
  return [
    {
      categoryId: 3,
      categoryIsExclusive: false,
      categoryName: "type",
      color: "#51aacc",
      id: 8,
      name: "bug",
    },
    {
      categoryId: 4,
      categoryIsExclusive: true,
      categoryName: "priority",
      color: "#f36c22",
      id: 9,
      name: "high",
    },
    {
      categoryId: 4,
      categoryIsExclusive: true,
      categoryName: "priority",
      color: "#8bc34a",
      id: 10,
      name: "low",
    },
  ];
}

function appBasePath() {
  return process.env.YONA_DEV_BASE_PATH ?? "/yona";
}

async function setNativeDate(page: Page, value: string) {
  await page.getByLabel("Choose due date", { exact: true }).evaluate((input, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

async function setBrowserLanguage(page: Page, language: string) {
  await page.addInitScript((nextLanguage) => {
    Object.defineProperty(navigator, "language", {
      configurable: true,
      get: () => nextLanguage,
    });
    Object.defineProperty(navigator, "languages", {
      configurable: true,
      get: () => [nextLanguage],
    });
  }, language);
}

async function dispatchDroppedFile(page: Page, name: string, content: string) {
  const dataTransfer = await page.evaluateHandle(
    ({ fileContent, fileName }) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([fileContent], fileName, { type: "text/plain" }));
      return transfer;
    },
    { fileContent: content, fileName: name },
  );
  await page.locator("#upload").dispatchEvent("drop", { dataTransfer });
}

type BrowserFile = {
  content: string;
  mimeType: string;
  name: string;
};

async function dispatchTextareaDroppedFiles(page: Page, files: BrowserFile[]) {
  const dataTransfer = await page.evaluateHandle((droppedFiles) => {
    const transfer = new DataTransfer();
    droppedFiles.forEach((file) => {
      transfer.items.add(new File([file.content], file.name, { type: file.mimeType }));
    });
    return transfer;
  }, files);
  await page.locator("#editor-body-body").dispatchEvent("drop", { dataTransfer });
}

async function dispatchPastedFile(page: Page, name: string, mimeType: string, content: string) {
  await page.locator("#editor-body-body").evaluate(
    (target, file) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([file.content], file.name, { type: file.mimeType }));
      target.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData: transfer }));
    },
    { content, mimeType, name },
  );
}

async function dispatchPastedTextAndImage(
  page: Page,
  text: string,
  name: string,
  mimeType: string,
  content: string,
) {
  await page.locator("#editor-body-body").evaluate(
    (target, clipboard) => {
      const transfer = new DataTransfer();
      transfer.items.add(clipboard.text, "text/plain");
      transfer.items.add(
        new File([clipboard.content], clipboard.name, { type: clipboard.mimeType }),
      );
      target.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData: transfer }));
    },
    { content, mimeType, name, text },
  );
}

async function rightControlMetrics(page: Page) {
  return page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing issue form metric target: ${selector}`);
      }
      return element.getBoundingClientRect();
    };
    const assignee = required(".issue-assignee-control");
    const label = required(".issue-label-control");
    const rightMenu = required("#issue-form .right-menu");
    return {
      assigneeHeight: assignee.height,
      labelHeight: label.height,
      rightMenuHeight: rightMenu.height,
    };
  });
}

async function assigneeArrowMetrics(page: Page) {
  return page.evaluate(() => {
    const selection = document.querySelector<HTMLElement>(".issue-assignee-option .select2-choice");
    const arrow = document.querySelector<HTMLElement>(
      ".issue-assignee-option .select2-choice > .select2-arrow",
    );
    if (!selection || !arrow) {
      throw new Error("Missing assignee arrow metric target.");
    }
    const selectionRect = selection.getBoundingClientRect();
    const arrowRect = arrow.getBoundingClientRect();
    return {
      arrowHeight: arrowRect.height,
      arrowRightInset: selectionRect.right - arrowRect.right,
      arrowWidth: arrowRect.width,
      selectionHeight: selectionRect.height,
    };
  });
}

async function markdownHelpMetrics(page: Page) {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>(".markdown-help-nav");
    const items = Array.from(document.querySelectorAll<HTMLElement>(".markdown-help-nav > li"));
    const shortLink = items.find((item) => item.textContent?.trim() === "Short Link");
    if (!nav || !shortLink) {
      throw new Error("Missing Markdown help metric target.");
    }
    const rowTops = [...new Set(items.map((item) => item.getBoundingClientRect().top))].sort(
      (left, right) => left - right,
    );
    const shortLinkTop = shortLink.getBoundingClientRect().top;
    return {
      height: nav.getBoundingClientRect().height,
      rowCount: rowTops.length,
      shortLinkRow: rowTops.findIndex((top) => Math.abs(top - shortLinkTop) < 0.5) + 1,
    };
  });
}

async function mentionPopupMetrics(page: Page) {
  return page.evaluate(() => {
    const popup = document
      .querySelector<HTMLElement>(".editor-mention-options")!
      .getBoundingClientRect();
    const marker = document
      .querySelector<HTMLElement>(".editor-mention-marker")!
      .getBoundingClientRect();
    const textarea = document
      .querySelector<HTMLElement>("#editor-body-body")!
      .getBoundingClientRect();
    return {
      bottom: popup.bottom,
      left: popup.left,
      markerBottom: marker.bottom,
      markerTop: marker.top,
      right: popup.right,
      textareaLeft: textarea.left,
      textareaRight: textarea.right,
      top: popup.top,
      viewportHeight: innerHeight,
    };
  });
}

function expectAllAppRequestsStayMounted(requests: RecordedRequest[], basePath: string) {
  const applicationRequests = requests.filter(
    (request) => request.pathname.includes("/api/") || request.pathname.includes("/files"),
  );
  expect(applicationRequests.length).toBeGreaterThan(0);
  expect(applicationRequests.every((request) => request.pathname.startsWith(`${basePath}/`))).toBe(
    true,
  );
}

function expectMutationCsrf(requests: RecordedRequest[]) {
  const mutations = requests.filter(
    (request) =>
      ["DELETE", "PATCH", "POST", "PUT"].includes(request.method) &&
      !request.pathname.endsWith("/markdown-references"),
  );
  expect(mutations.length).toBeGreaterThan(0);
  expect(mutations.every((request) => request.csrf === CSRF_TOKEN)).toBe(true);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function issueFormMetrics(page: Page) {
  return page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing issue form metric target: ${selector}`);
      }
      return element.getBoundingClientRect();
    };
    const admin = required('[data-stylex-owner="site-admin-affix"]');
    const gnb = required("[data-stylex-owner=global-gnb-outer]");
    const header = required(".project-header-outer");
    const menu = required(".project-menu-outer");
    const form = required("#issue-form");
    const titleRow = required(".issue-title-row");
    const titleField = required(".issue-title-field");
    const titleWrapper = required(".title-head-combobox");
    const title = required("#title");
    const option = required(".subtask-message");
    const left = required("#issue-form .span-left-pane");
    const right = required("#issue-form .right-menu");
    const editor = required(".issue-markdown-editor");
    const textarea = required("#editor-body-body");
    const upload = required("#upload");
    return {
      adminHeight: admin.height,
      adminTop: admin.top,
      documentWidth: document.documentElement.scrollWidth,
      editorBottom: editor.bottom,
      editorHeight: editor.height,
      editorWidth: editor.width,
      formLeft: form.left,
      formRight: form.right,
      formTop: form.top,
      formWidth: form.width,
      gnbHeight: gnb.height,
      gnbTop: gnb.top,
      headerHeight: header.height,
      headerTop: header.top,
      leftBottom: left.bottom,
      leftRight: left.right,
      leftTop: left.top,
      leftWidth: left.width,
      menuHeight: menu.height,
      menuTop: menu.top,
      optionWidth: option.width,
      rightLeft: right.left,
      rightRight: right.right,
      rightTop: right.top,
      rightWidth: right.width,
      textareaHeight: textarea.height,
      textareaTop: textarea.top,
      titleWidth: title.width,
      titleBottom: title.bottom,
      titleFieldBottom: titleField.bottom,
      titleFieldHeight: titleField.height,
      titleFieldTop: titleField.top,
      titleHeight: title.height,
      titleRowHeight: titleRow.height,
      titleRowTop: titleRow.top,
      titleTop: title.top,
      titleWrapperBottom: titleWrapper.bottom,
      titleWrapperHeight: titleWrapper.height,
      titleWrapperTop: titleWrapper.top,
      uploadHeight: upload.height,
      uploadTop: upload.top,
      uploadWidth: upload.width,
    };
  });
}

async function issueUploadMetrics(page: Page) {
  return page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing upload metric target: ${selector}`);
      }
      return element;
    };
    const upload = required("#upload");
    const attach = required("#upload .attach-wrap");
    const button = required("#upload .fake-file-wrap");
    const fileInput = required('#upload input[type="file"]');
    const pasteHelp = required("#upload .help-pastable");
    const uploadStyle = getComputedStyle(upload);
    const buttonStyle = getComputedStyle(button);
    const fileInputStyle = getComputedStyle(fileInput);
    const pasteStyle = getComputedStyle(pasteHelp);
    return {
      attachHeight: attach.getBoundingClientRect().height,
      attachWidth: attach.getBoundingClientRect().width,
      buttonHeight: button.getBoundingClientRect().height,
      buttonPadding: buttonStyle.padding,
      buttonWidth: button.getBoundingClientRect().width,
      fileInputHeight: fileInput.getBoundingClientRect().height,
      fileInputOpacity: fileInputStyle.opacity,
      pasteDisplay: pasteStyle.display,
      pasteHeight: pasteHelp.getBoundingClientRect().height,
      pasteWidth: pasteHelp.getBoundingClientRect().width,
      uploadPadding: uploadStyle.padding,
    };
  });
}
