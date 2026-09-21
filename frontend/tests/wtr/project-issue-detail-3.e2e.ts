import { expect, test } from "../wtr-compat.ts";
// Post-merge: the full legacy cascade lives in app.css — normal-mode semantics.
const fallbackOff = false;
import {
  LEFT_COMMENT_TIMELINE as _LEFT_COMMENT_TIMELINE,
  LEFT_MILESTONE_EVENT_TIMELINE as _LEFT_MILESTONE_EVENT_TIMELINE,
  LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE as _LEFT_PULL_REQUEST_REFERRED_EVENT_TIMELINE,
  LEFT_LABEL_DELETED_EVENT_TIMELINE as _LEFT_LABEL_DELETED_EVENT_TIMELINE,
  mockProjectIssueDetail,
  commentDeleteModalMetrics,
  canonicalize,
  canonicalizeHtml,
  setBrowserLanguage,
  armRootModalBridgeTrap,
  rootModalBridgeHits,
  installClipboardSpy,
  lastCopiedText,
  expectIssueDetailSelect2Partial as _expectIssueDetailSelect2Partial,
  dedupeRequests as _dedupeRequests,
  assertContained as _assertContained,
  child_commentForm as _child_commentForm,
  commentVoters,
  issueVoterAvatarOrderMetrics,
  issueDetailShellMetrics as _issueDetailShellMetrics,
  childIssueMetrics as _childIssueMetrics,
  selectedLabelMetrics,
  dueDateInlineUpdateMetrics,
} from "./project-issue-detail-shared.ts";

test("project issue detail renders legacy translation button when translation API is configured", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const translationRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
  }> = [];
  await page.route("**/api/v1/translation", async (route) => {
    translationRequests.push({
      body: JSON.parse(route.request().postData() ?? "{}") as unknown,
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        translated: "<p>Translated <strong>issue</strong></p>",
        translatedMarkdown: "Translated **issue**",
      }),
    });
  });
  await mockProjectIssueDetail(page, { translationApiEnabled: true });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const translateButton = page.locator(".board-actrow > #translate");
  await expect(translateButton).toHaveClass(/(?:^|\s)icon(?:\s|$)/u);
  await expect(translateButton).toHaveClass(
    /(?:^|\s)btn-transparent-with-fontsize-lineheight(?:\s|$)/u,
  );
  await expect(translateButton).not.toHaveClass(/\bml10\b/u);
  await expect(translateButton).not.toHaveAttribute("style", /.+/u);
  await expect(translateButton).toHaveCSS("margin-left", "10px");
  await expect(translateButton).toBeVisible();
  await expect(translateButton).not.toBeDisabled();
  await expect(translateButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(translateButton).toHaveAttribute("title", "Translation");
  await expect(translateButton.locator("i.yobicon-lang")).toHaveCount(1);

  await translateButton.click();

  await expect(page.locator("#issue-body-11 .markdown-wrap")).toContainText("Translated issue");
  await expect(page.locator("#issue-body-11 .markdown-wrap strong")).toHaveText("issue");
  await expect(translateButton).toBeDisabled();
  expect(translationRequests[0]?.csrfToken).toBeTruthy();
  expect(translationRequests).toEqual([
    {
      body: {
        number: 11,
        owner: "admin",
        projectName: "sample",
        type: "issue",
      },
      csrfToken: translationRequests[0]?.csrfToken,
      method: "POST",
    },
  ]);
});

test("project issue detail renders legacy comment translation button when translation API is configured", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const translationRequests: Array<{
    body: unknown;
    csrfToken: string | null;
    method: string;
  }> = [];
  await page.route("**/api/v1/translation", async (route) => {
    translationRequests.push({
      body: JSON.parse(route.request().postData() ?? "{}") as unknown,
      csrfToken: route.request().headers()["x-csrf-token"] ?? null,
      method: route.request().method(),
    });
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        translated: "<p>Translated <strong>comment</strong></p>",
        translatedMarkdown: "Translated **comment**",
      }),
    });
  });
  await mockProjectIssueDetail(page, { translationApiEnabled: true });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const translateButton = page.locator("#comment-77 .comment-translate");
  await expect(translateButton).toHaveAttribute(
    "data-owner",
    "project-issue-detail-comment-translation-button",
  );
  await expect(translateButton).toHaveClass(/(?:^|\s)icon(?:\s|$)/u);
  await expect(translateButton).toHaveClass(
    /(?:^|\s)btn-transparent-with-fontsize-lineheight(?:\s|$)/u,
  );
  await expect(translateButton).not.toHaveClass(/(?:^|\s)ml10(?:\s|$)/u);
  await expect(translateButton).toHaveCSS("margin-left", "10px");
  await expect(translateButton).not.toHaveAttribute("style", /.+/u);
  await expect(translateButton).toBeVisible();
  await expect(translateButton).not.toBeDisabled();
  await expect(translateButton).not.toHaveAttribute("data-toggle", "tooltip");
  await expect(translateButton).toHaveAttribute("data-comment-id", "77");
  await expect(translateButton).toHaveAttribute("title", "Translation");
  await expect(translateButton.locator("i.yobicon-lang")).toHaveCount(1);
  await expect(page.locator(".board-actrow > #translate")).toHaveAttribute(
    "data-owner",
    "project-issue-detail-translation-button",
  );
  await expect(
    page.locator(
      '#comment-77 > .media-body > .meta-info > .act-row [data-owner="project-issue-detail-comment-action-edit"]',
    ),
  ).toHaveCSS("margin-left", "10px");
  await expect(
    page.locator(
      '#comment-77 > .media-body > .meta-info > .act-row [data-owner="project-issue-detail-comment-action-delete"]',
    ),
  ).toHaveCSS("margin-left", "6px");

  await translateButton.click();

  await expect(page.locator("#issue-body-11 .markdown-wrap")).toContainText("Body markdown");
  await expect(page.locator(".span-left-pane #comment-body-77 .comment-body")).toContainText(
    "Translated comment",
  );
  await expect(page.locator(".span-left-pane #comment-body-77 .comment-body strong")).toHaveText(
    "comment",
  );
  await expect(translateButton).toBeDisabled();
  expect(translationRequests[0]?.csrfToken).toBeTruthy();
  expect(translationRequests).toEqual([
    {
      body: {
        number: 77,
        owner: "admin",
        projectName: "sample",
        type: "issue-comment",
      },
      csrfToken: translationRequests[0]?.csrfToken,
      method: "POST",
    },
  ]);
});

test("project issue detail renders legacy read-only selected labels", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#labelIds")).toHaveCount(0);
  await expect(page.locator(".issue-info .label.issue-label.active.static")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issues?state=open&labelIds=8`,
  );

  const expected =
    `<dl><dt>Issue Label</dt><dd><a href="__BASE_PATH__/admin/sample/issues?state=open&labelIds=8" class="issue-label active label static" data-label-id="8" style="background-color:rgb(81, 170, 204);box-shadow:rgb(81, 170, 204) 2px 0px 0px inset;color:white;border:0px">bug</a></dd></dl>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalize(page, ".issue-info form dl:has(a.label.issue-label.active.static)"),
  ).toEqual(await canonicalizeHtml(page, expected));
  expect(await selectedLabelMetrics(page)).toEqual({
    ddPadding: "5px 0px",
    dlMarginBottom: "20px",
    dtText: "Issue Label",
    labelBackground: "rgb(81, 170, 204)",
    labelBorderRadius: "1px",
    labelDisplay: "inline-block",
    labelFontSize: "11px",
    labelLineHeight: "12px",
    labelMargin: "0px",
    labelPadding: "2px 4px",
  });
});

test("project issue detail preserves milestone state tooltips when selecting and clearing", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);
  await page.goto(`${basePath}/admin/sample/issue/11`);

  const milestone = page.getByRole("combobox", { name: "Milestone", exact: true });
  const choice = milestone.locator(".select2-choice");
  await expect(choice).toContainText("v1.0");
  await expect(choice.locator("[title]")).toHaveAttribute("title", "[Open] v1.0");

  await choice.click();
  expect(
    await milestone.evaluate((control) => {
      const container = control.getBoundingClientRect();
      const dropdown = control.querySelector(".select2-drop")!.getBoundingClientRect();
      return {
        left: dropdown.left - container.left,
        width: dropdown.width - container.width,
        overlap: container.bottom - dropdown.top,
      };
    }),
  ).toEqual({ left: 0, width: 0, overlap: 1 });
  await expect(
    milestone.locator(".select2-result-with-children > .select2-result-label"),
  ).toHaveText(["Open", "Closed"]);
  const search = milestone.getByRole("searchbox", { name: "Milestone", exact: true });
  await search.fill("missing milestone");
  await expect(milestone.locator(".select2-no-results")).toHaveText("No matches found");
  await expect(milestone.getByRole("option")).toHaveCount(0);
  await search.fill("v0.9");
  await expect(
    milestone.locator(".select2-result-with-children > .select2-result-label"),
  ).toHaveText(["Closed"]);
  const closedMilestone = milestone.getByRole("option", { name: "v0.9", exact: true });
  await expect(closedMilestone.locator("[title]")).toHaveAttribute("title", "[Closed] v0.9");
  await search.press("Enter");
  await expect(choice).toContainText("v0.9");
  await expect(choice.locator("[title]")).toHaveAttribute("title", "[Closed] v0.9");

  await choice.click();
  await milestone.getByRole("option", { name: "No milestone", exact: true }).click();
  await expect(choice).toContainText("No milestone");
  await expect(choice.locator("[title]")).toHaveCount(0);
});

test("project issue detail renders legacy updateable labels without manager edit link", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __projectOverrides: { viewerCanUpdate: false },
    viewerCanUpdate: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".issue-info form dl:has(#labelIds) .label-edit")).toHaveCount(0);
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-toggle", "select2");
  await expect(page.locator("#labelIds")).not.toHaveAttribute("data-search", /.+/);
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
  await expect(
    page.locator("#issueUpdateForm .select2-container-multi.issue-labels"),
  ).not.toHaveClass(/\bhide\b/u);
});

test("project issue detail renders legacy read-only metadata fields", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const assigneeAvatar = page.locator(
    ".issue-info form dl:has(dt:text('Assignee')) > dd:nth-of-type(2) img",
  );
  await expect.poll(() => assigneeAvatar.evaluate((image) => image.naturalWidth)).toBe(128);
  expect(
    await assigneeAvatar.evaluate(async (image) => {
      const bytes = await (await fetch(image.currentSrc)).arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
    }),
  ).toBe("781a764b1f86352b2c23acd7e7807feb39b45aac11b905cf731bd764859aa891");
  const bundledDefaultAvatarUrl = await assigneeAvatar.getAttribute("src");
  const expectedAssignee =
    `<dd><a href="__BASE_PATH__/admin" class="usf-group"><span class="avatar-wrap smaller"><img src="${bundledDefaultAvatarUrl}" width="20" height="20"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></a></dd>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalize(page, ".issue-info form dl:has(dt:text('Assignee')) > dd:nth-of-type(2)"),
  ).toEqual(await canonicalizeHtml(page, expectedAssignee));

  const expectedMilestone =
    `<dd><a href="__BASE_PATH__/admin/sample/milestone/5">v1.0</a></dd>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  await expect(
    page.locator(".issue-info form dl:has(dt:text('Milestone')) > dd a"),
  ).toHaveAttribute("href", `${basePath}/admin/sample/milestone/5`);
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Milestone')) > dd")).toEqual(
    await canonicalizeHtml(page, expectedMilestone),
  );

  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Due date')) > dd")).toEqual(
    await canonicalizeHtml(page, `<dd>Jul 5, 2026</dd>`),
  );
});

test("project issue detail localizes the legacy overdue status", async ({ page }) => {
  await setBrowserLanguage(page, "ko-KR");
  await mockProjectIssueDetail(page, {
    dueDateOverdue: true,
    dueDateUntilLabel: "1 days",
  });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expect(page.locator(".issue-info .duedate-status.overdue")).toHaveText("(기한지남)");
});

test("project issue detail renders legacy due date until status", async ({ page }) => {
  await mockProjectIssueDetail(page, {
    dueDateOverdue: false,
    dueDateUntilLabel: "3 days",
  });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Due date')) > dt")).toEqual(
    await canonicalizeHtml(page, `<dt>Due date<span class="duedate-status ">(3 days)</span></dt>`),
  );
});

test("issue due-date calendar preserves selection, navigation, dismissal, and blur-driven updates", async ({
  page,
}) => {
  // yobi.ui.Calendar.js:36–50; pikaday.js:385–480, 842–886.
  const { massUpdateRequests } = await mockProjectIssueDetail(page, {
    dueDateLabel: "2026-07-05",
  });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  const input = page.locator('.span-right-pane input[name="dueDate"]');
  const button = page.locator(".span-right-pane .btn-calendar");
  const calendar = page.getByRole("dialog", { name: "Due date", exact: true });

  await input.focus();
  await expect(calendar).toBeVisible();
  await expect(calendar.getByRole("button", { name: "2026-07-05", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await input.press("ArrowDown");
  await expect(calendar.getByRole("button", { name: "2026-07-05", exact: true })).toBeFocused();
  await calendar.getByRole("button", { name: "2026-07-05", exact: true }).press("Escape");
  await expect(calendar).toHaveCount(0);
  await expect(input).toBeFocused();
  await input.click();
  await expect(calendar).toBeVisible();
  await page.locator(".board-header .title").click();
  await expect(calendar).toHaveCount(0);
  expect(massUpdateRequests).toHaveLength(0);

  await button.click();
  await calendar.getByRole("button", { name: "Next Month", exact: true }).click();
  await expect(calendar.getByRole("combobox", { name: "Month", exact: true })).toHaveValue("7");
  await calendar.getByRole("button", { name: "Previous Month", exact: true }).click();
  await expect(calendar.getByRole("combobox", { name: "Month", exact: true })).toHaveValue("6");
  await calendar.getByRole("combobox", { name: "Year", exact: true }).focus();
  await calendar.getByRole("combobox", { name: "Year", exact: true }).selectOption("2027");
  await expect(calendar).toBeVisible();
  await expect(input).toBeFocused();
  await calendar.getByRole("combobox", { name: "Month", exact: true }).focus();
  await calendar.getByRole("combobox", { name: "Month", exact: true }).selectOption("1");
  await expect(calendar).toBeVisible();
  await expect(input).toBeFocused();
  expect(massUpdateRequests).toHaveLength(0);
  const day = calendar.getByRole("button", { name: "2027-02-28", exact: true });
  await day.focus();
  await day.press("Enter");
  await expect(calendar).toHaveCount(0);
  await expect(input).toHaveValue("2027-02-28");
  await expect.poll(() => massUpdateRequests.length).toBe(1);
  expect(massUpdateRequests[0]?.body).toMatchObject({
    dueDate: "2027-02-28",
    isDueDateChanged: true,
    issueNumbers: [11],
  });
});

test("project issue detail updates due date without legacy calendar data hook", async ({
  page,
}) => {
  const { massUpdateRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const dueDateInput = page.locator('.span-right-pane input[name="dueDate"]');
  const dueDateButton = page.locator(".span-right-pane .search.search-bar .btn-calendar");
  await expect(dueDateInput).toHaveClass("textbox full");
  await expect(dueDateInput).toHaveValue("Jul 5, 2026");
  await expect(dueDateInput).not.toHaveAttribute("data-toggle", "calendar");
  await expect(dueDateButton).toBeVisible();
  expect(await dueDateInlineUpdateMetrics(page)).toEqual({
    buttonInsideDueDateRow: true,
    inputInsideDueDateRow: true,
    inputName: "dueDate",
    searchBarInsideRightPane: true,
    searchBarClassName: "search search-bar",
  });

  await dueDateButton.click();
  await expect(dueDateInput).toBeFocused();
  expect(massUpdateRequests).toHaveLength(0);

  await dueDateInput.blur();
  expect(massUpdateRequests).toHaveLength(0);

  await dueDateInput.fill("Jul 12, 2026");
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(0);
  await dueDateInput.blur();
  await expect
    .poll(() =>
      massUpdateRequests.map((request) => ({
        body: request.body,
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([
      {
        body: {
          addLabelIds: [],
          assigneeLoginId: "",
          assigneeUpdate: false,
          delete: false,
          dueDate: "Jul 12, 2026",
          isDueDateChanged: true,
          issueNumbers: [11],
          milestoneUpdate: false,
          removeLabelIds: [],
          state: "",
        },
        hasCsrfToken: true,
        method: "POST",
      },
    ]);

  await dueDateInput.focus();
  await dueDateInput.blur();
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(1);

  await dueDateInput.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(1);
  await dueDateInput.blur();
  await expect
    .poll(() => massUpdateRequests.map((request) => request.body))
    .toEqual([
      {
        addLabelIds: [],
        assigneeLoginId: "",
        assigneeUpdate: false,
        delete: false,
        dueDate: "Jul 12, 2026",
        isDueDateChanged: true,
        issueNumbers: [11],
        milestoneUpdate: false,
        removeLabelIds: [],
        state: "",
      },
      {
        addLabelIds: [],
        assigneeLoginId: "",
        assigneeUpdate: false,
        delete: false,
        dueDate: "",
        isDueDateChanged: true,
        issueNumbers: [11],
        milestoneUpdate: false,
        removeLabelIds: [],
        state: "",
      },
    ]);

  await dueDateInput.fill("not a date");
  await dueDateInput.blur();
  await expect
    .poll(() =>
      dueDateButton.evaluate((button) => {
        (button as HTMLButtonElement).click();
        return document.activeElement?.matches('.span-right-pane input[name="dueDate"]') ?? false;
      }),
    )
    .toBe(true);
  await expect.poll(() => massUpdateRequests.length, { timeout: 250 }).toBe(2);
});

test("project issue detail renders legacy empty read-only metadata fields", async ({ page }) => {
  await mockProjectIssueDetail(page, {
    assigneeLoginId: null,
    dueDateLabel: "",
    milestoneId: null,
    milestoneTitle: "",
    viewerCanUpdate: false,
  });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  expect(
    await canonicalize(page, ".issue-info form dl:has(dt:text('Assignee')) > dd:nth-of-type(2)"),
  ).toEqual(await canonicalizeHtml(page, `<dd><div>No assignee</div></dd>`));
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Milestone')) > dd")).toEqual(
    await canonicalizeHtml(page, `<dd>No milestone</dd>`),
  );
  expect(await canonicalize(page, ".issue-info form dl:has(dt:text('Due date')) > dd")).toEqual(
    await canonicalizeHtml(page, `<dd>No due date</dd>`),
  );
});

test("project issue detail renders legacy read-only sharer list", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    sharers: [
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "qa1",
        role: "member",
        userId: 31,
        userLabel: "QA One",
      },
      {
        avatarUrl: "/assets/images/default-avatar-32.png",
        loginId: "qa2",
        role: "member",
        userId: 32,
        userLabel: "QA Two",
      },
    ],
    viewerCanUpdate: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#issueSharer")).toHaveCount(0);

  const sharerList = page.locator(".span-left-pane > .sharer-list");
  const title = sharerList.locator(":scope > dt");
  const content = sharerList.locator(":scope > #sharer-list");
  await expect(sharerList).toHaveClass(/sharer-list/);
  await expect(title).toHaveClass(/issue-share-title/);
  await expect(title).toHaveText("Issue Sharer 2");
  await expect(title.locator(".issue-sharer-count")).toHaveText("2");
  await expect(content).toBeVisible();
  await expect(content.locator(".sharer-item .name")).toHaveText(["QA One", "QA Two"]);
  const expectedSharerHrefs = [`${basePath}/qa1`, `${basePath}/qa2`];
  for (const [index, link] of (await content.locator(".sharer-item a").all()).entries()) {
    await expect(link).toHaveAttribute("href", expectedSharerHrefs[index]);
  }
});

test("project issue detail renders legacy read-only action buttons", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, { viewerCanUpdate: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<span class="act-row"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="See text"><i class="yobicon-edit-2"></i></button></a><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="Delete"><i class="yobicon-trash"></i></button></span>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > .board-actrow > .act-row")).toEqual(
    await canonicalizeHtml(page, expected),
  );

  const expectedRight =
    `<div class="act-row right-menu-icons"><a href="__BASE_PATH__/admin/sample/issue/11/editform"><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="See text"><i class="yobicon-edit-2"></i></button></a><button type="button" class="icon btn-transparent-with-fontsize-lineheight" title="Delete"><i class="yobicon-trash"></i></button></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".issue-info .act-row.right-menu-icons")).toEqual(
    await canonicalizeHtml(page, expectedRight),
  );
});

test("project issue detail edit buttons navigate to legacy edit form route", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.locator('.span-left-pane > .board-actrow button[title="Edit"]').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);
  // The popLayout exit animation briefly keeps the outgoing outlet; wait for it to unmount.
  await expect(page.locator("#issue-form")).toHaveCount(1);
  await expect(page.locator("#issue-form")).toBeVisible();

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.locator('.issue-info .right-menu-icons button[title="Edit"]').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11/editform`);
  await expect(page.locator("#issue-form")).toHaveCount(1);
  await expect(page.locator("#issue-form")).toBeVisible();
});

test("project issue detail deletes through legacy confirmation modal", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { deleteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator('a[href="#deleteConfirm"][data-toggle="modal"]')).toHaveCount(0);
  await expect(
    page.locator(
      '[data-toggle="modal"][data-target="#deleteConfirm"], #deleteConfirm [data-dismiss="modal"]',
    ),
  ).toHaveCount(0);
  const trigger = page.locator('button[type="button"][title="Delete"]:has(i.yobicon-trash)');
  await expect(trigger.first().locator("i.yobicon-trash")).toHaveCount(1);
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "delete-issue-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.first().click();
  await expect(page.locator("#deleteConfirm")).not.toHaveClass(/hide/);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal fade in/);
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete issue");
  await expect(page.locator("#deleteConfirm .modal-body p")).toHaveText(
    "Once you delete the post, you won't be able to recover it. Do you still want to delete this post?",
  );
  await expect(page.locator("#deleteConfirm .modal-footer .ybtn-danger")).toHaveText("Yes");
  await expect(page.locator("#deleteConfirm .modal-footer .ybtn").last()).toHaveText("No");
  await expect(page.locator("#deleteConfirm .ybtn-danger")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#deleteConfirm .ybtn-danger")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("delete-issue-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(deleteRequests).toEqual([]);

  await page.locator('#deleteConfirm .modal-footer button:has-text("No")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("delete-issue-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page.locator("#deleteConfirm")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(deleteRequests).toEqual([]);

  await trigger.first().click();
  const issueDeleteConfirmHitTarget = await page
    .locator("#deleteConfirm .ybtn-danger")
    .evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === button || (hit instanceof Element && button.contains(hit));
    });
  expect(issueDeleteConfirmHitTarget).toBe(true);
  await page.locator("#deleteConfirm .ybtn-danger").click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issues`);
  await expect.poll(() => deleteRequests).toEqual(["DELETE"]);
});

test("project issue detail deletes comments through legacy confirmation modal", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentDeleteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator('#comment-delete-modal [data-dismiss="modal"]')).toHaveCount(0);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-delete-modal";
  });
  await armRootModalBridgeTrap(page);
  const commentDeleteButton = page.locator(
    '#comments[data-owner="project-issue-detail-timeline"] #comment-77 > .media-body > .meta-info > .act-row [data-owner="project-issue-detail-comment-action-delete"]',
  );
  await expect(commentDeleteButton).not.toHaveAttribute("data-toggle", "comment-delete");
  await commentDeleteButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toHaveText("Delete comment");
  await expect(page.locator("#comment-delete-modal .modal-body p")).toHaveText(
    "Once you delete this comment, you won't be able to recover it. Are you sure you want to delete this comment?",
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  expect(await commentDeleteModalMetrics(page)).toEqual({
    backdropDisplay: "block",
    bodyDisplay: "block",
    confirmMethod: null,
    confirmText: "Yes",
    confirmUri: null,
    display: "block",
    dismissCount: 0,
    footerTextAlign: "right",
    headerDisplay: "flex",
    left: 0,
    noText: "No",
    title: "Delete comment",
    top: 18,
    width: 482,
  });
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(commentDeleteRequests).toEqual([]);

  await page.locator('#comment-delete-modal .modal-footer button:has-text("No")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(commentDeleteRequests).toEqual([]);

  const childAuthor = page.locator("#comment-77 .subcomment-author");
  await expect(childAuthor.locator('a[href^="javascript:"]')).toHaveCount(0);
  const childDeleteButton = childAuthor.locator('button[type="button"].deleteButtonX');
  await expect(childDeleteButton).toHaveText("x");
  await expect(childDeleteButton).toHaveClass(/btn-transparent deleteButtonX/);
  await expect(childDeleteButton).toHaveAttribute("title", "Delete comment");
  await expect(childDeleteButton).not.toHaveAttribute("data-toggle", "comment-delete");
  await expect(childDeleteButton).not.toHaveAttribute("data-request-uri", /.+/);

  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-delete-modal-child";
  });
  await childDeleteButton.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/in/);
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-uri",
    /.+/,
  );
  await expect(page.locator("#comment-delete-confirm")).not.toHaveAttribute(
    "data-request-method",
    /.+/,
  );
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal-child");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  expect(commentDeleteRequests).toEqual([]);

  await childDeleteButton.click();
  await expect(page.locator("#comment-delete-modal")).not.toHaveClass(/hide/);
  await page.locator(".modal-backdrop.fade.in").dispatchEvent("click");
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-delete-modal-child");
  expect(commentDeleteRequests).toEqual([]);

  await commentDeleteButton.click();
  const commentDeleteConfirmHitTarget = await page
    .locator("#comment-delete-confirm")
    .evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit === button || (hit instanceof Element && button.contains(hit));
    });
  expect(commentDeleteConfirmHitTarget).toBe(true);
  await page.locator("#comment-delete-confirm").click();
  await expect.poll(() => commentDeleteRequests).toEqual(["DELETE"]);
  await expect(page.locator("#comment-delete-modal")).toHaveClass(/hide/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail votes comments through legacy agree action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const commentVoteButton = page.locator('#comment-77 button[title="Agree"]');
  await expect(commentVoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await commentVoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "POST" }]);
});

test("project issue detail keeps legacy active comment vote for authenticated read-only viewer", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      isAnonymous: false,
      isSiteAdmin: false,
      loginId: "readonly",
      userLabel: "Read Only",
    },
    viewerCanComment: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane #comment-body-77 > .comment-body")).toContainText(
    "Comment markdown",
  );
  const commentVoteButton = page.locator('#comment-77 button[title="Agree"]');
  await expect(commentVoteButton).toHaveCount(1);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentVoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(
    page.locator("#comment-77 .act-row > i.yobicon-hearts.vote-heart-off.vote-heart-disable-hover"),
  ).toHaveCount(0);

  await commentVoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "POST" }]);
});

test("project issue detail renders legacy disabled comment vote icon for anonymous viewer", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    __sessionOverrides: {
      isAnonymous: true,
      isSiteAdmin: false,
      loginId: "anonymous",
      userLabel: "Anonymous",
    },
    viewerCanComment: false,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator('#comment-77 button[title="Agree"]')).toHaveCount(0);
  await expect(page.locator("#comment-77 [data-request-type]")).toHaveCount(0);
  await expect(
    page.locator("#comment-77 .act-row > i.yobicon-hearts.vote-heart-off.vote-heart-disable-hover"),
  ).toHaveCount(1);
  expect(commentVoteRequests).toEqual([]);
});

test("project issue detail updates issue weight through React mutation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueWeightRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator(".weight-number")).toHaveText("2");

  await page.locator("#upvote-issue-weight").click();
  await expect(page.locator(".weight-number")).toHaveText("3");
  await page.locator("#down-vote-issue-weight").click();
  await expect(page.locator(".weight-number")).toHaveText("2");
  expect(issueWeightRequests.map((request) => request.method)).toEqual(["POST", "POST"]);
  expect(issueWeightRequests.every((request) => Boolean(request.csrfToken))).toBe(true);
});

test("project issue detail unvotes comments through legacy agree action", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentVoteRequests } = await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        childComments: [],
        contentsHtml: "<p>Comment <strong>markdown</strong></p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerHasVoted: true,
        viaEmail: false,
        voterCount: 1,
        voters: [commentVoters()[0]],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const commentUnvoteButton = page.locator('#comment-77 button[title="Withdraw"]');
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await commentUnvoteButton.click();

  await expect
    .poll(() =>
      commentVoteRequests.map((request) => ({
        hasCsrfToken: Boolean(request.csrfToken),
        method: request.method,
      })),
    )
    .toEqual([{ hasCsrfToken: true, method: "DELETE" }]);
});

test("project issue detail renders legacy unavailable delete action", async ({ page }) => {
  await mockProjectIssueDetail(page, { canBeDeleted: false, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const expected = `<button type="button" class="icon disabled btn-transparent-with-fontsize-lineheight"><i class="yobicon-trash"></i></button>`;
  expect(
    await canonicalize(page, ".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).toEqual(await canonicalizeHtml(page, expected));
  expect(await canonicalize(page, ".issue-info .right-menu-icons > button.disabled")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-toggle", "popover");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-trigger", "hover");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-placement", "top");
  await expect(
    page.locator(".span-left-pane > .board-actrow .act-row > button.disabled"),
  ).not.toHaveAttribute("data-content", /./u);
});

test("project issue detail hides unauthorized delete when issue itself can be deleted", async ({
  page,
}) => {
  await mockProjectIssueDetail(page, { canBeDeleted: true, viewerCanDelete: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  await expect(page.locator('.span-left-pane > .board-actrow button[title="Delete"]')).toHaveCount(
    0,
  );
  await expect(page.locator(".span-left-pane > .board-actrow button.disabled")).toHaveCount(0);
  await expect(page.locator('.issue-info .right-menu-icons button[title="Delete"]')).toHaveCount(0);
  await expect(page.locator(".issue-info .right-menu-icons button.disabled")).toHaveCount(0);
});

test("project issue detail renders legacy disabled vote action", async ({ page }) => {
  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);

  const disabledVote = page.locator("#vote > .ybtn-disabled");
  await expect(disabledVote).toHaveClass(/ybtn-disabled/);
  await expect(disabledVote).toHaveAttribute("title", "Please log in.");
  await expect(disabledVote).toHaveAttribute("data-login", "required");
  await expect(disabledVote.locator(":scope > .heart > i")).toHaveClass(/yobicon-hearts/);
  const disabledIcon = page.locator(
    '[data-owner="project-issue-detail-vote-heart-icon"][data-owner-instance="disabled"]',
  );
  await expect(disabledIcon).toBeVisible();
  await expect(disabledIcon).not.toHaveAttribute("style", /./u);
  await expect
    .poll(() => disabledIcon.evaluate((node) => getComputedStyle(node).fontFamily))
    .toBe("yobicon");
  await expect(disabledIcon.evaluate((node) => getComputedStyle(node).display)).resolves.toBe(
    "inline-block",
  );
  const disabledIconContent = await disabledIcon.evaluate(
    (node) => getComputedStyle(node, "::before").content,
  );
  expect(disabledIconContent).toContain(String.fromCodePoint(0xe4b0));
});

test("project issue detail renders active vote controls and voter list geometry", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  // issue/view.scala.html:210–225 and _page.less:.vote-wrap/.voter-list
  // own the visible inline heart and avatar layout, not source spellings.

  await mockProjectIssueDetail(page, { issueVoters: commentVoters(), voterCount: 6 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.setViewportSize({ width: fallbackOff ? 390 : 1366, height: 900 });

  const vote = page.locator('[data-owner="project-issue-detail-vote-wrap"]');
  const heart = vote.locator('[data-owner="project-issue-detail-vote-heart"]');
  const heartIcon = vote.locator(
    '[data-owner="project-issue-detail-vote-heart-icon"][data-owner-instance="active"]',
  );
  const listWrap = vote.locator('[data-owner="project-issue-detail-voter-list-wrap"]');
  const list = listWrap.locator('[data-owner="project-issue-detail-voter-list"]');
  const items = list.locator('[data-owner="project-issue-detail-voter-list-item"]');
  const avatars = list.locator('[data-owner="project-issue-detail-voter-avatar"]');
  const overflow = list.locator('[data-owner="project-issue-detail-voter-overflow"]');

  await expect(vote).toBeVisible();
  await expect(heart).toBeVisible();
  await expect(heartIcon).toBeVisible();
  await expect(heartIcon).not.toHaveAttribute("style", /./u);
  await expect(avatars).toHaveCount(3);
  await expect(overflow).toBeVisible();
  await expect(overflow).toHaveText("and 3 others");
  await expect(vote.locator(".voter-list-wrap")).toHaveCount(1);
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
  await expect(page.locator("#voters [data-owner^='project-issue-detail-voter-']")).toHaveCount(0);

  const metrics = await vote.evaluate((node) => {
    const style = getComputedStyle(node);
    const heartNode = node.querySelector<HTMLElement>(".heart");
    const wrapNode = node.querySelector<HTMLElement>(".voter-list-wrap");
    const listNode = node.querySelector<HTMLElement>(".voter-list");
    const itemNode = node.querySelector<HTMLElement>(".voter-list-item");
    const avatarNode = node.querySelector<HTMLElement>(".voter-list-item a.avatar-wrap");
    const boardActions = node.closest<HTMLElement>(".board-actrow");
    const heartStyle = heartNode ? getComputedStyle(heartNode) : null;
    const wrapStyle = wrapNode ? getComputedStyle(wrapNode) : null;
    const listStyle = listNode ? getComputedStyle(listNode) : null;
    const itemStyle = itemNode ? getComputedStyle(itemNode) : null;
    const avatarStyle = avatarNode ? getComputedStyle(avatarNode) : null;
    const voteBox = node.getBoundingClientRect();
    const actionBox = boardActions?.getBoundingClientRect();
    const listBox = wrapNode?.getBoundingClientRect();
    return {
      avatarMarginRight: avatarStyle?.marginRight ?? null,
      boardActionDirectParent: node.parentElement?.className ?? null,
      boardActionContainsVote: Boolean(
        actionBox && voteBox.left >= actionBox.left && voteBox.right <= actionBox.right,
      ),
      heartColor: heartStyle?.color ?? null,
      heartDisplay: heartStyle?.display ?? null,
      heartFontSize: heartStyle?.fontSize ?? null,
      heartMarginRight: heartStyle?.marginRight ?? null,
      heartMarginTop: heartStyle?.marginTop ?? null,
      heartVerticalAlign: heartStyle?.verticalAlign ?? null,
      icon: (() => {
        const iconNode = node.querySelector<HTMLElement>(
          '[data-owner="project-issue-detail-vote-heart-icon"][data-owner-instance="active"]',
        );
        if (!iconNode) return null;
        const iconStyle = getComputedStyle(iconNode);
        return {
          display: iconStyle.display,
          fontFamily: iconStyle.fontFamily,
          fontStyle: iconStyle.fontStyle,
          fontVariant: iconStyle.fontVariant,
          fontWeight: iconStyle.fontWeight,
          lineHeight: iconStyle.lineHeight,
          pseudoContent: getComputedStyle(iconNode, "::before").content,
          inlineStyle: iconNode.getAttribute("style"),
        };
      })(),
      itemFloat: itemStyle?.float ?? null,
      itemLineHeight: itemStyle?.lineHeight ?? null,
      itemMarginRight: itemStyle?.marginRight ?? null,
      itemMarginTop: itemStyle?.marginTop ?? null,
      listDisplay: listStyle?.display ?? null,
      listListStyle: listStyle?.listStyleType ?? null,
      listWrapDisplay: wrapStyle?.display ?? null,
      listWrapMarginLeft: wrapStyle?.marginLeft ?? null,
      listWrapMarginRight: wrapStyle?.marginRight ?? null,
      listWrapOverflow: wrapStyle?.overflow ?? null,
      listWrapVerticalAlign: wrapStyle?.verticalAlign ?? null,
      voteDirection: style.direction,
      voteDisplay: style.display,
      voteFontSize: style.fontSize,
      voteInlineStyle: node.getAttribute("style"),
      voteMarginRight: style.marginRight,
      voteVerticalAlign: style.verticalAlign,
      listBoxWidth: listBox?.width ?? 0,
      voteBoxWidth: voteBox.width,
    };
  });
  expect(metrics).toMatchObject({
    avatarMarginRight: "0px",
    boardActionDirectParent: expect.stringContaining("board-actrow"),
    boardActionContainsVote: true,
    heartColor: "rgb(221, 221, 221)",
    heartDisplay: "inline-block",
    heartFontSize: "17px",
    heartMarginRight: "2px",
    heartMarginTop: "3px",
    heartVerticalAlign: "middle",
    itemFloat: "left",
    itemLineHeight: "25px",
    itemMarginRight: "3px",
    itemMarginTop: "-4px",
    icon: {
      display: "inline-block",
      fontFamily: "yobicon",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "400",
      // CSSOM exposes the used pixel value for the unitless frozen line-height: 1 in both modes.
      lineHeight: "17px",
      inlineStyle: null,
    },
    listDisplay: "block",
    listListStyle: "none",
    listWrapDisplay: "inline-block",
    listWrapMarginRight: "5px",
    listWrapOverflow: "hidden",
    listWrapVerticalAlign: "middle",
    voteDirection: "rtl",
    voteDisplay: "inline-block",
    voteFontSize: "13px",
    voteInlineStyle: null,
    voteMarginRight: "-3px",
    voteVerticalAlign: "middle",
  });
  expect(metrics.icon?.pseudoContent).toContain(String.fromCodePoint(0xe4b0));
  expect(metrics.listWrapMarginLeft).toBe("3.9px");
  await expect(vote).not.toHaveAttribute("style", /./u);
  await expect(heart).not.toHaveAttribute("style", /./u);
  await expect(items.first()).not.toHaveAttribute("style", /./u);
  await expect(avatars.first()).not.toHaveAttribute("style", /./u);

  const geometry = await page.evaluate(() => {
    const voteBox = document.querySelector<HTMLElement>("#vote")?.getBoundingClientRect();
    const listBox = document
      .querySelector<HTMLElement>('#vote [data-owner="project-issue-detail-voter-list-wrap"]')
      ?.getBoundingClientRect();
    const avatarBoxes = Array.from(document.querySelectorAll<HTMLElement>("#vote .voter-list a"))
      .map((avatar) => avatar.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0);
    return {
      avatarCount: avatarBoxes.length,
      firstAvatarBeforeSecond: avatarBoxes[0]?.left < avatarBoxes[1]?.left,
      listContainedInVote: Boolean(
        voteBox && listBox && listBox.left >= voteBox.left && listBox.right <= voteBox.right,
      ),
      viewportWidth: window.innerWidth,
      voteHeight: voteBox?.height ?? 0,
      voteWidth: voteBox?.width ?? 0,
    };
  });
  expect(geometry.avatarCount).toBe(3);
  expect(geometry.firstAvatarBeforeSecond).toBe(true);
  expect(geometry.listContainedInVote).toBe(true);
  expect(geometry.voteWidth).toBeGreaterThan(0);
  expect(geometry.voteHeight).toBeGreaterThan(0);
  expect(geometry.viewportWidth).toBe(fallbackOff ? 390 : 1366);
});

test("project issue detail vote action posts and toggles legacy voted state", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueVoteRequests } = await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const voteButton = page.locator("#vote > button").first();
  await expect(voteButton).toHaveAttribute("title", "Click here if you agree with this issue.");
  await expect(voteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(voteButton).not.toHaveAttribute("data-request-method", /.+/);
  await expect(voteButton).not.toHaveClass(/ybtn-watching/);
  await expect(page.locator("#vote > a")).toHaveCount(0);

  const voteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/vote") &&
      response.request().method() === "POST",
  );
  await voteButton.focus();
  await page.keyboard.press("Enter");
  await voteResponsePromise;

  expect(issueVoteRequests).toEqual([{ hasCsrfToken: true, method: "POST" }]);
  await expect(voteButton).toHaveAttribute(
    "title",
    "Click here if you no longer agree with this issue.",
  );
  await expect(voteButton).not.toHaveAttribute("data-request-uri", /.+/);
  await expect(voteButton).not.toHaveAttribute("data-request-method", /.+/);
  await expect(page.locator("#vote > button")).toHaveClass(/ybtn-watching/);
});

test("project issue detail vote action refreshes legacy voter list branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __issueVoteResponseOverrides: {
      issueVoters: [
        {
          avatarUrl: "/assets/images/default-avatar-32.png",
          emailAddress: "admin@example.com",
          loginId: "admin",
          userId: 1,
          userLabel: "Site Admin",
        },
      ],
      voterCount: 1,
    },
    issueVoters: [],
    voterCount: 0,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#vote")).not.toHaveClass(/voter-exists/);
  await expect(page.locator("#vote > .voter-list-wrap")).toHaveCount(0);
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(0);

  const voteResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/issues/11/vote") &&
      response.request().method() === "POST",
  );
  await page.locator("#vote > button").first().click();
  await voteResponsePromise;

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  await expect(page.locator("#vote")).toHaveClass(/voter-exists/);
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator("#voters.voters-dialog")).toHaveCount(1);
});

test("project issue detail renders current voter first like legacy partial_voters", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { issueDetailRequests } = await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [commentVoters()[1], commentVoters()[0], commentVoters()[2], commentVoters()[3]],
    voterCount: 4,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  expect(await issueVoterAvatarOrderMetrics(page)).toEqual({
    firstHref: `${basePath}/admin`,
    firstLeftBeforeSecond: true,
    secondHref: `${basePath}/dev`,
  });
  expect(issueDetailRequests).toEqual([`GET ${basePath}/api/v1/projects/admin/sample/issues/11`]);
});

test("project issue detail overflows non-current voters after current plus three avatars", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [
      commentVoters()[1],
      commentVoters()[0],
      commentVoters()[2],
      commentVoters()[3],
      commentVoters()[4],
    ],
    voterCount: 5,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li><li class="voter-list-item" data-html="true" title="QA Three &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 1 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail does not invent current voter when voted payload omits current user", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    hasVoted: true,
    issueVoters: [commentVoters()[1], commentVoters()[2], commentVoters()[3], commentVoters()[4]],
    voterCount: 4,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa2" class="avatar-wrap smaller" data-placement="top" title="QA Two"><img src="/assets/images/default-avatar-32.png"></a></li><li class="voter-list-item" data-html="true" title="QA Three &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 1 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
});

test("project issue detail renders legacy voter overflow link", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    issueVoters: commentVoters(),
    voterCount: 6,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const expected =
    `<div class="voter-list-wrap"><ul class="voter-list"><li class="voter-list-item"><a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a></li><li><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a></li><li class="voter-list-item" data-html="true" title="QA Two &lt;br&gt;QA Three &lt;br&gt;QA Four &lt;br&gt;"><button type="button" data-toggle="modal" data-target="#voters">and 3 others</button></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#vote > .voter-list-wrap")).toEqual(
    await canonicalizeHtml(page, expected),
  );
  await expect(page.locator('#vote a[href="#voters"][data-toggle="modal"]')).toHaveCount(0);
  await expect(
    page.locator('#vote [data-toggle="modal"], #vote [data-target="#voters"]'),
  ).toHaveCount(0);
  const trigger = page.locator('#vote button[type="button"]:has-text("and 3 others")');
  await expect(trigger).toHaveText("and 3 others");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "issue-voters-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters")).toBeVisible();
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog in/);
  await expect(page.locator("#voters")).toHaveCSS("display", "block");
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  await installClipboardSpy(page);
  await expect(page.locator("#voters #copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#voters #copyEmailBtn")).toHaveClass("ybtn ybtn-info ybtn-small");
  await expect(page.locator("#voters #copyEmailBtn")).not.toHaveAttribute(
    "data-clipboard-text",
    /.+/,
  );
  await page.locator("#voters #copyEmailBtn").click();
  await expect(lastCopiedText(page)).resolves.toBe(
    "Site Admin <admin@example.com>;Dev Member <dev@example.com>;QA One <qa1@example.com>;QA Two <qa2@example.com>;QA Three <qa3@example.com>;QA Four <qa4@example.com>;",
  );
  // F6 copy-fix-current-dom: RootYoramToast renders style-only (root-yoram-toast /
  // toast-message parts, __root.tsx:530-558; style-root-toast.e2e.ts pins
  // `not.toHaveClass(/\btoast\b/)`); the legacy #yobiToasts .toast .msg DOM is
  // never rendered. Pin the message part of the root toast container instead.
  await expect(page.locator('#yobiToasts [data-part="toast-message"]')).toHaveText(
    "Copying email was successful.",
  );

  await page.locator('#voters .modal-footer button:has-text("Close")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("issue-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#voters")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail owns the authenticated parent comment attachment float with Style", async ({
  page,
}) => {
  await mockProjectIssueDetail(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/admin/sample/issue/11`);
  const emptyAttachments = page.locator(
    '#comment-77 > .media-body > #comment-body-77 > [data-owner="project-issue-detail-comment-attachments"]',
  );
  await expect(emptyAttachments).toHaveCount(1);
  await expect(emptyAttachments).toHaveClass(/(?:^|\s)attachments(?:\s|$)/u);
  await expect(emptyAttachments).not.toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
  await expect(emptyAttachments).toHaveCSS("float", "left");
  await expect(emptyAttachments).not.toHaveAttribute("style", /.+/u);
  await expect(emptyAttachments.locator(".attach")).toHaveCount(0);
  await expect(page.locator("#attachments .attach")).toHaveCount(0);
  await expect(page.locator("#comment-editform-77 .attachment-files .attach")).toHaveCount(0);

  const emptyGeometry = await emptyAttachments.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(emptyGeometry).not.toBeNull();
  expect(emptyGeometry!.left).toBeGreaterThanOrEqual(emptyGeometry!.body.left);
  expect(emptyGeometry!.right).toBeLessThanOrEqual(emptyGeometry!.body.right);
  expect(emptyGeometry!.top).toBeGreaterThanOrEqual(emptyGeometry!.body.top);
  expect(emptyGeometry!.bottom - emptyGeometry!.top).toBeGreaterThanOrEqual(0);
});

test("project issue detail preserves parent comment attachment DOM and download behavior", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  const issueAttachments = {
    attachments: [
      {
        id: 501,
        mimeType: "text/plain",
        name: "issue-spec.txt",
        size: 12345,
        sizeLabel: "12.3 kB",
        url: `${basePath}/files/501`,
      },
    ],
  };
  const commentAttachments = {
    attachments: [
      {
        id: 502,
        mimeType: "image/png",
        name: "comment-shot.png",
        size: 4096,
        sizeLabel: "4.1 kB",
        url: `${basePath}/files/502`,
      },
    ],
  };
  await mockProjectIssueDetail(page, {
    attachments: issueAttachments,
    comments: [
      {
        attachments: commentAttachments,
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        contentsHtml: "<p>Comment <strong>markdown</strong></p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viaEmail: false,
        voterCount: 0,
        voters: [],
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > #attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator(".span-left-pane > #attachments > ul.attaches.wm > li.attach"),
  ).toHaveCount(1);
  await expect(page.locator(".span-left-pane > #attachments > .attached-file")).toHaveCount(0);

  const expectedIssueAttachments =
    `<div class="attachments" id="attachments" data-attachments='${JSON.stringify(issueAttachments)}'><ul class="attaches wm"><li class="attach"><a href="__BASE_PATH__/files/501?action=download" class="download ybtn ybtn-mini" title="Download a file issue-spec.txt"><i class="yobicon-download"></i></a><a href="__BASE_PATH__/files/501" class="vmiddle" target="_blank"><i class="yobicon-paperclip"></i><span class="filename">issue-spec.txt</span><span class="filesize">(12.3 kB)</span></a></li></ul></div>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, ".span-left-pane > #attachments")).toEqual(
    await canonicalizeHtml(page, expectedIssueAttachments),
  );

  await expect(page.locator("#comment-body-77 > .attachments > ul.attaches.wm")).toHaveCount(1);
  await expect(
    page.locator("#comment-body-77 > .attachments > ul.attaches.wm > li.attach"),
  ).toHaveCount(1);
  await expect(page.locator("#comment-body-77 > .attachments > .attached-file")).toHaveCount(0);
  const commentAttachmentsOwner = page.locator(
    '#comment-77 > .media-body > #comment-body-77 > [data-owner="project-issue-detail-comment-attachments"]',
  );
  await expect(commentAttachmentsOwner).toHaveCount(1);
  await expect(commentAttachmentsOwner).toHaveClass(/(?:^|\s)attachments(?:\s|$)/u);
  await expect(commentAttachmentsOwner).not.toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
  await expect(commentAttachmentsOwner).toHaveAttribute(
    "data-attachments",
    JSON.stringify(commentAttachments),
  );
  await expect(commentAttachmentsOwner).toHaveCSS("float", "left");
  await expect(commentAttachmentsOwner).not.toHaveAttribute("style", /.+/u);
  await expect(commentAttachmentsOwner.locator(":scope > ul.attaches.wm > li.attach")).toHaveCount(
    1,
  );
  await expect(
    commentAttachmentsOwner.locator(":scope > ul.attaches.wm > li.attach .filename"),
  ).toHaveText("comment-shot.png");
  await expect(
    commentAttachmentsOwner.locator('a.download[title="Download a file comment-shot.png"]'),
  ).toHaveAttribute("href", `${basePath}/files/502?action=download`);
  await expect(page.locator("#attachments .attach")).toHaveCount(1);
  await expect(page.locator("#comment-editform-77 .attachment-files .attach")).toHaveCount(0);
  const attachmentOrder = await commentAttachmentsOwner
    .locator(":scope > *")
    .evaluateAll((nodes) => nodes.map((node) => node.tagName.toLowerCase()));
  expect(attachmentOrder).toEqual(["ul"]);

  const desktopAttachmentGeometry = await commentAttachmentsOwner.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(desktopAttachmentGeometry).not.toBeNull();
  expect(desktopAttachmentGeometry!.left).toBeGreaterThanOrEqual(
    desktopAttachmentGeometry!.body.left,
  );
  expect(desktopAttachmentGeometry!.right).toBeLessThanOrEqual(
    desktopAttachmentGeometry!.body.right,
  );
  expect(desktopAttachmentGeometry!.right - desktopAttachmentGeometry!.left).toBeGreaterThan(0);
  expect(desktopAttachmentGeometry!.bottom - desktopAttachmentGeometry!.top).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(commentAttachmentsOwner).toHaveCSS("float", "left");
  const mobileAttachmentGeometry = await commentAttachmentsOwner.evaluate((element) => {
    const body = element.parentElement?.getBoundingClientRect();
    const box = element.getBoundingClientRect();
    return body
      ? {
          bottom: box.bottom,
          left: box.left,
          right: box.right,
          top: box.top,
          body: { bottom: body.bottom, left: body.left, right: body.right, top: body.top },
        }
      : null;
  });
  expect(mobileAttachmentGeometry).not.toBeNull();
  expect(mobileAttachmentGeometry!.left).toBeGreaterThanOrEqual(
    mobileAttachmentGeometry!.body.left,
  );
  expect(mobileAttachmentGeometry!.right).toBeLessThanOrEqual(mobileAttachmentGeometry!.body.right);
  expect(mobileAttachmentGeometry!.top).toBeGreaterThanOrEqual(mobileAttachmentGeometry!.body.top);
  expect(mobileAttachmentGeometry!.right - mobileAttachmentGeometry!.left).toBeGreaterThan(0);
  expect(mobileAttachmentGeometry!.bottom - mobileAttachmentGeometry!.top).toBeGreaterThan(0);

  const expectedCommentAttachments =
    `<ul class="attaches wm"><li class="attach"><a href="__BASE_PATH__/files/502?action=download" class="download ybtn ybtn-mini" title="Download a file comment-shot.png"><i class="yobicon-download"></i></a><a href="__BASE_PATH__/files/502" class="vmiddle" target="_blank"><i class="yobicon-paperclip"></i><span class="filename">comment-shot.png</span><span class="filesize">(4.1 kB)</span></a></li></ul>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(await canonicalize(page, "#comment-body-77 > .attachments > ul")).toEqual(
    await canonicalizeHtml(page, expectedCommentAttachments),
  );

  await expect(page.locator(".attached-file-marker[data-href]")).toHaveCount(0);
  const expectedCommentUpdateAttachments = `<div class="attachment-files"><div class="attached-file attached-file-marker" data-name="comment-shot.png" data-mime="image/png"><i class="mimetype"></i><strong class="name">comment-shot.png</strong><span class="size">4.1 kB</span><button type="button" class="btn-transparent btn-delete">×</button></div></div>`;
  expect(await canonicalize(page, "#comment-editform-77 > form .attachment-files")).toEqual(
    await canonicalizeHtml(page, expectedCommentUpdateAttachments),
  );
  const updateAttachment = page.locator(
    '#comment-editform-77 > form .attached-file-marker[data-name="comment-shot.png"]',
  );
  await expect(updateAttachment.locator(".name")).toHaveText("comment-shot.png");
  await expect(updateAttachment.locator(".btn-delete")).not.toHaveAttribute("data-id");
  await expect(updateAttachment.locator(".btn-delete")).toHaveAttribute("type", "button");
  expect(
    consoleErrors.some(
      (message) =>
        message.includes("<li> cannot be a descendant of <li>") ||
        message.includes("<li> cannot contain a nested <li>"),
    ),
  ).toBe(false);
});
