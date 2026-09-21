import { expect, test, readFileSync } from "../wtr-compat.ts";
import {
  mockProjectIssueDetail,
  canonicalizeAll,
  canonicalizeHtml,
  setBrowserLanguage,
  armRootModalBridgeTrap,
  rootModalBridgeHits,
  installClipboardSpy,
  lastCopiedText,
  expectIssueDetailSelect2Partial,
  commentVoters,
  commentVoterModalMetrics,
  eventTimelineMetrics,
  childIssueMetrics,
} from "./project-issue-detail-shared.ts";

test("project issue detail tasklist checkbox updates nested markdown through REST", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const original = "- [ ] parent\n  - [ ] child\n- [ ] sibling\n\n```markdown\n- [ ] fenced\n```";
  const { contentUpdateRequests } = await mockProjectIssueDetail(page, {
    bodyMarkdown: original,
    comments: [],
    commentCount: 0,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const checkboxes = page.locator("#issue-body-11 .markdown-wrap input[type='checkbox']");
  await expect(checkboxes).toHaveCount(3);
  await expect(checkboxes.first()).toBeEnabled();
  await checkboxes.first().click();
  await expect.poll(() => contentUpdateRequests.length).toBe(1);
  expect(contentUpdateRequests[0]).toEqual({
    body: {
      content: "- [x] parent\n  - [x] child\n- [ ] sibling\n\n```markdown\n- [ ] fenced\n```",
      original,
    },
    method: "PATCH",
  });
  await page.reload();
  await expect(checkboxes.nth(0)).toBeChecked();
  await expect(checkboxes.nth(1)).toBeChecked();
  await expect(checkboxes.nth(2)).not.toBeChecked();
  await expect(page.locator("#issue-body-11 .done-counter")).toHaveText("(2/3)");
});

test("project issue detail keeps raw tasklist controls inert for authorized viewers", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { contentUpdateRequests } = await mockProjectIssueDetail(page, {
    bodyMarkdown:
      '- [ ] generated\n\n<ul><li><input type="checkbox" data-yona-task-index="0"> forged raw</li></ul>',
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const checkboxes = page.locator("#issue-body-11 .markdown-wrap input[type='checkbox']");
  await expect(checkboxes).toHaveCount(2);
  await expect(checkboxes.nth(0)).toBeEnabled();
  await expect(checkboxes.nth(1)).toBeDisabled();
  await checkboxes.nth(0).click();
  await expect.poll(() => contentUpdateRequests.length).toBe(1);
});

test("project issue detail disables tasklist controls for read-only viewers", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { contentUpdateRequests } = await mockProjectIssueDetail(page, {
    bodyMarkdown: "- [ ] generated",
    viewerCanUpdate: false,
  });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  const checkbox = page.locator("#issue-body-11 .markdown-wrap input[type='checkbox']").first();
  await expect(checkbox).toBeDisabled();
  expect(contentUpdateRequests).toHaveLength(0);
});

test("project issue detail rolls back a stale tasklist update", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { contentUpdateRequests } = await mockProjectIssueDetail(page, {
    __contentUpdateStatus: 409,
    bodyMarkdown: "- [ ] stale",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const checkbox = page.locator("#issue-body-11 .markdown-wrap input[type='checkbox']").first();
  await checkbox.click();
  await expect.poll(() => contentUpdateRequests.length).toBe(1);
  await expect(checkbox).not.toBeChecked();
  await expect(page.locator('[data-owner="issue-tasklist-error"]')).toContainText(
    "Refresh the page!",
  );
});

test("project issue detail sends authored comment notification preference through REST", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentUpdateRequests } = await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Site Admin",
        authorLoginId: "admin",
        childComments: [],
        contentsHtml: "<p>Server HTML should not render</p>",
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
  const comment = page.locator(".span-left-pane #comment-77");
  const editButton = comment.locator('button[title="Edit comment"][data-comment-id="77"]');
  const updateForm = comment.locator("#comment-editform-77");
  await editButton.click();
  await expect(updateForm.locator("input[name='notificationMail']")).toBeChecked();
  await updateForm.locator("textarea[name=contents]").fill("Edited with notification");
  await updateForm.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => commentUpdateRequests.length).toBe(1);
  expect(commentUpdateRequests[0]).toMatchObject({
    body: {
      contentsMarkdown: "Edited with notification",
      notificationMail: "yes",
    },
    method: "PUT",
  });

  await editButton.click();
  const uncheckedForm = comment.locator("#comment-editform-77");
  await uncheckedForm.locator("input[name='notificationMail']").uncheck();
  await uncheckedForm.locator("textarea[name=contents]").fill("Edited without notification");
  await uncheckedForm.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => commentUpdateRequests.length).toBe(2);
  expect(commentUpdateRequests[1]).toMatchObject({
    body: { contentsMarkdown: "Edited without notification" },
    method: "PUT",
  });
  expect(commentUpdateRequests[1].body).not.toHaveProperty("notificationMail");
});

test("project issue detail filters label results by the typed query", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await mockProjectIssueDetail(page, {
    __labelsResponse: [
      {
        categoryId: "3",
        categoryIsExclusive: false,
        categoryName: "type",
        color: "#51aacc",
        id: "8",
        name: "bug",
      },
      {
        categoryId: "3",
        categoryIsExclusive: false,
        categoryName: "type",
        color: "#70b858",
        id: "9",
        name: "backend",
      },
      {
        categoryId: "3",
        categoryIsExclusive: false,
        categoryName: "type",
        color: "#a064c7",
        id: "10",
        name: "frontend",
      },
    ],
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
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const input = page.locator('[data-owner="project-issue-detail-label-search-input"]');
  const control = page.locator('[data-owner="project-issue-detail-label-control"]');
  // Legacy select2.js:2675–2685 uses a collapsed search input when selected
  // labels are idle; editing is a different state with room for the query.
  expect(await control.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(
    30,
    0,
  );
  await input.fill("back");
  expect(await input.evaluate((element) => element.getBoundingClientRect().width)).toBeGreaterThan(
    10,
  );
  await expect(page.getByRole("option", { name: "backend" })).toHaveCount(1);
  await expect(page.getByRole("option", { name: "bug" })).toHaveCount(0);
  await expect(page.getByRole("option", { name: "frontend" })).toHaveCount(0);
  await page.getByRole("option", { name: "backend" }).click();
  await expect(input).toHaveValue("");
  await expect(
    page
      .locator('[data-owner="project-issue-detail-label-control"] .select2-search-choice')
      .filter({ hasText: "backend" }),
  ).toContainText("backend");
  await input.fill("does-not-exist");
  await expect(
    page.locator('[data-owner="project-issue-detail-label-control"] [role="option"]'),
  ).toHaveCount(0);
  await input.fill("");
  await expect(page.getByRole("option", { name: "backend" })).toHaveCount(1);
  await control.getByRole("button", { name: "Close", exact: true }).click();
  await expect(control.getByRole("listbox")).toHaveCount(0);
  expect(await control.evaluate((element) => element.getBoundingClientRect().height)).toBeCloseTo(
    30,
    0,
  );
  await page.reload();
  await expect(
    page
      .locator('[data-owner="project-issue-detail-label-control"] .select2-search-choice')
      .filter({ hasText: "backend" }),
  ).toContainText("backend");
});

test("project issue detail comment edit uploads and removes temporary attachments", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { attachmentDeleteRequests, attachmentUploadRequests, commentUpdateRequests } =
    await mockProjectIssueDetail(page, {
      comments: [
        {
          attachments: [
            {
              id: 101,
              mimeType: "text/plain",
              name: "old.txt",
              size: 3,
              sizeLabel: "3 bytes",
              url: "/yona/files/101",
            },
          ],
          authorAvatarUrl: "/assets/images/default-avatar-32.png",
          authorLabel: "Site Admin",
          authorLoginId: "admin",
          childComments: [],
          contentsHtml: "<p>Server HTML should not render</p>",
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
  const comment = page.locator(".span-left-pane #comment-77");
  await comment.locator('button[title="Edit comment"][data-comment-id="77"]').click();
  const updateForm = comment.locator("#comment-editform-77");
  await updateForm.locator("input[type='file'][name='filePath']").setInputFiles({
    buffer: Buffer.from("new"),
    mimeType: "text/plain",
    name: "new.txt",
  });
  await expect.poll(() => attachmentUploadRequests.length).toBe(1);
  await expect(attachmentUploadRequests[0]).toEqual({
    csrfToken: "test-csrf-token",
    method: "POST",
  });
  await updateForm.locator('.attached-file-marker[data-name="old.txt"] .btn-delete').click();
  await expect(updateForm.locator('.attached-file-marker[data-name="old.txt"]')).toHaveCount(0);
  expect(attachmentDeleteRequests).toHaveLength(0);
  await updateForm.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => commentUpdateRequests.length).toBe(1);
  expect(commentUpdateRequests[0]).toMatchObject({
    body: { attachmentIds: ["202"] },
    method: "PUT",
  });

  await page.reload();
  const reloadedComment = page.locator(".span-left-pane #comment-77");
  await expect(reloadedComment.locator(".attaches .filename")).toHaveText("new.txt");
  await expect(reloadedComment.locator(".attaches a.vmiddle")).toHaveAttribute(
    "href",
    `${basePath}/files/202`,
  );

  await reloadedComment.locator('button[title="Edit comment"][data-comment-id="77"]').click();
  const cancelledForm = reloadedComment.locator("#comment-editform-77");
  await cancelledForm.locator('.attached-file-marker[data-name="new.txt"] .btn-delete').click();
  await cancelledForm.getByRole("button", { name: "Cancel" }).click();
  await expect(reloadedComment.locator(".attaches .filename")).toHaveText("new.txt");
  await reloadedComment.locator('button[title="Edit comment"][data-comment-id="77"]').click();
  await expect(cancelledForm.locator('.attached-file-marker[data-name="new.txt"]')).toHaveCount(1);
  expect(commentUpdateRequests).toHaveLength(1);
});

test("project issue detail omits route-local legacy attachment template", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator("#tplAttachedFile")).toHaveCount(0);
  await expect(page.locator('script#tplAttachedFile[type="text/x-jquery-tmpl"]')).toHaveCount(0);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  expect(routeSource).not.toContain("AttachedFileTemplate");
  expect(routeSource).not.toContain("tplAttachedFile");
  expect(routeSource).not.toContain("${fileName}");
  expect(routeSource).not.toContain("${fileHref}");
  expect(routeSource).not.toContain("${fileSizeReadable}");
});

test("project issue detail omits route-local duplicated Select2 templates", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expectIssueDetailSelect2Partial(page, basePath);

  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );
  const rootSource = readFileSync("src/routes/__root.tsx", "utf8");
  // Select2 templates were consolidated into the shared root partial; the route
  // must no longer host any duplicated template script.
  for (const templateId of [
    "tplSelect2FormatUser",
    "tplSelect2FormatMilestone",
    "tplSelect2Projects",
    "tplSelect2ProjectsWithoutAvatar",
    "tplSelect2FormatIssues",
  ]) {
    expect(routeSource).not.toContain(templateId);
  }
  expect(routeSource).not.toContain("text/x-jquery-tmpl");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
  expect(rootSource).toContain("function LegacySelect2Templates");
  expect(rootSource).toContain('id="tplSelect2FormatUser"');
  expect(rootSource).toContain('id="tplSelect2FormatMilestone"');
  expect(rootSource).toContain('id="tplSelect2Projects"');
  expect(rootSource).toContain('id="tplSelect2ProjectsWithoutAvatar"');
  expect(rootSource).toContain('id="tplSelect2FormatIssues"');
});

test("project issue detail renders legacy child issue list", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        commentCount: 2,
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
        labels: [],
        state: "open",
        title: "Open child",
        voterCount: 1,
      },
      {
        assigneeLabel: "",
        commentCount: 0,
        createdLabel: "Jul 4, 2026",
        issueNumber: 13,
        labels: [],
        state: "closed",
        title: "Closed child",
        voterCount: 0,
      },
    ],
    childOpenCount: 1,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  const subtasks = page.locator(".span-left-pane > .subtasks");
  await expect(subtasks.locator(".parent-issue > a")).toHaveText(
    "#11 Fix flaky issue - Site Admin",
  );
  expect(
    await subtasks
      .locator(".parent-issue .bar")
      .evaluate(
        (bar) =>
          bar.getBoundingClientRect().width / bar.parentElement!.getBoundingClientRect().width,
      ),
  ).toBeCloseTo(0.5, 1);
  const children = subtasks.locator(".child-issue");
  await expect(children).toHaveCount(2);
  await expect(children.nth(0).locator("a.twoColumeModeTarget")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/12`,
  );
  await expect(children.nth(0)).toContainText("Open child");
  await expect(children.nth(0).locator(".state-label")).toHaveClass("state-label open");
  await expect(children.nth(1).locator("a.twoColumeModeTarget")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/13`,
  );
  await expect(children.nth(1)).toContainText("Closed child");
  await expect(children.nth(1).locator(".state-label")).toHaveClass("state-label closed");
  // F5 dist-truth: legacy .page-wrap-outer padding 0 10px (responsive.less:611)
  // + span9 74.468% → 938 at 1280; ported into app.css @layer legacy.
  expect(await childIssueMetrics(page)).toEqual({
    countGroupBorder: expect.stringMatching(/^0px none(?: |$)/u),
    countGroupLineHeight: "14px",
    countGroupMarginTop: "2px",
    dateDisplay: "none",
    firstChildWidth: 938,
    itemIconFontSize: "9px",
    parentFontSize: "16px",
    rowDisplay: "block",
    rowPadding: "0px 3px",
    voteLinkMarginLeft: "-5px",
  });
});

test("project issue detail hides foreign draft child issues like legacy partial_view_child", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childIssues: [
      {
        authorLoginId: "dev",
        createdLabel: "Jul 3, 2026",
        isDraft: true,
        issueNumber: 12,
        labels: [],
        state: "draft",
        title: "Foreign draft child",
      },
      {
        authorLoginId: "admin",
        createdLabel: "Jul 4, 2026",
        isDraft: true,
        issueNumber: 13,
        labels: [],
        state: "draft",
        title: "Own draft child",
      },
    ],
    childClosedCount: 0,
    childOpenCount: 0,
    isDraft: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > .subtasks .issue-item.child-issue")).toHaveCount(1);
  await expect(page.locator(".span-left-pane > .subtasks")).not.toContainText(
    "Foreign draft child",
  );
  const visibleDraft = page.locator(".span-left-pane > .subtasks .issue-item.child-issue").first();
  await expect(visibleDraft).toContainText("#DraftOwn draft child");
  await expect(visibleDraft.locator(".state-label.draft")).toHaveCount(1);
  await expect(visibleDraft.locator(".draft-number")).toHaveText("#Draft");
  await expect(visibleDraft.locator("a.twoColumeModeTarget")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/13`,
  );
});

test("project issue detail hides subtasks for directly shared child issue like legacy view.scala.html", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
        labels: [],
        state: "open",
        title: "Hidden open child",
      },
    ],
    childOpenCount: 1,
    parentIssueId: 99,
    viewerIsDirectSharer: true,
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".span-left-pane > .subtasks")).toHaveCount(1);
  await expect(page.locator(".span-left-pane > .subtasks")).toBeEmpty();
  await expect(page.locator(".span-left-pane > .subtasks .child-issues")).toHaveCount(0);
  await expect(page.locator(".span-left-pane > .subtasks")).not.toContainText("Hidden open child");
});

test("project issue detail renders parent row and selected child on child issue detail", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    __issueNumber: 12,
    childClosedCount: 1,
    childIssues: [
      {
        assigneeLabel: "QA One",
        commentCount: 0,
        createdLabel: "Jul 3, 2026",
        issueNumber: 12,
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
        state: "open",
        title: "Open child",
        voterCount: 0,
      },
      {
        assigneeLabel: "",
        commentCount: 0,
        createdLabel: "Jul 4, 2026",
        issueNumber: 13,
        labels: [],
        state: "closed",
        title: "Closed child",
        voterCount: 0,
      },
    ],
    childOpenCount: 1,
    issueNumber: 12,
    parentIssueId: 42,
    parentIssueNumber: 11,
    parentIssueState: "closed",
    parentIssueTitle: "Parent issue",
    title: "Open child",
  });

  await page.goto(`${basePath}/admin/sample/issue/12`);

  const subtasks = page.locator(".span-left-pane > .subtasks");
  await expect(subtasks.locator(".parent-issue > a")).toHaveText("#11 Parent issue");
  await expect(subtasks.locator(".parent-issue > a")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/11`,
  );
  await expect(subtasks.locator(".parent-issue-state")).toHaveText("Closed");
  expect(
    await subtasks
      .locator(".parent-issue .bar")
      .evaluate((bar) => bar.getBoundingClientRect().width / bar.parentElement!.clientWidth),
  ).toBeCloseTo(0.5, 2);
  await expect(
    subtasks.locator(".selected-child a.twoColumeModeTarget:has(.item-name)"),
  ).toHaveAttribute("href", `${basePath}/admin/sample/issue/12`);
  await expect(subtasks.locator(".child-issue")).toHaveCount(2);
});

test("project issue detail renders legacy unauthorized comment form", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );

  const legacyView = readFileSync(
    "../yona-original/app/views/common/commentForm.scala.html",
    "utf8",
  );
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  const legacyYobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");

  expect(legacyView).toContain('<div class="write-comment-box mt20"');
  expect(legacyView).toContain('<div class="right-txt mt10">');
  expect(legacyView).toContain('data-login="required"');
  expect(legacyCommon).toMatch(/\.mt20\s*\{\s*margin-top:\s*20px;\s*\}/u);
  expect(legacyCommon).toMatch(/\.mt10\s*\{\s*margin-top:\s*10px;\s*\}/u);
  expect(legacyYobi).toContain('@import "less/_common.less";');

  expect(routeSource).not.toContain('className="write-comment-box mt20"');

  await mockProjectIssueDetail(page, { viewerCanComment: false });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const unauthorized = page.locator(
    '.span-left-pane > #comments > [data-owner="project-issue-detail-unauthorized-comment"]',
  );
  await expect(page.locator(".span-left-pane > #comments > #comment-form")).toHaveCount(0);
  await expect(unauthorized).toHaveCount(1);
  await expect(page.locator("#comment-77 .child-comment-input-form")).toHaveCount(0);
  await expect(unauthorized).toHaveClass(/write-comment-box/);
  await expect(unauthorized).not.toHaveClass(/\bmt20\b/);
  await expect(unauthorized).toHaveAttribute("title", "Please log in.");
  await expect(unauthorized).toHaveAttribute("data-login", "required");
  await expect(unauthorized).not.toHaveAttribute("style");
  await expect(unauthorized.locator(".write-comment-wrap > .textarea-box > textarea")).toHaveClass(
    /comment/,
  );
  await expect(unauthorized.locator("textarea")).toHaveClass(/disabled/);
  await expect(unauthorized.locator("textarea")).toBeDisabled();
  await expect(unauthorized.locator("textarea")).not.toHaveAttribute("style");
  const disabledActions = unauthorized.locator(
    "[data-owner='project-issue-detail-disabled-comment-actions']",
  );
  await expect(disabledActions).toHaveClass(/right-txt/);
  await expect(disabledActions).not.toHaveClass(/\bmt10\b/);
  await expect(disabledActions).not.toHaveAttribute("style");
  const disabledActionsMetrics = await disabledActions.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      marginTop: style.marginTop,
      textAlign: style.textAlign,
      top: rect.top,
      height: rect.height,
      right: rect.right,
    };
  });
  expect(disabledActionsMetrics.marginTop).toBe("10px");
  expect(disabledActionsMetrics.textAlign).toBe("right");
  expect(disabledActionsMetrics.height).toBeGreaterThan(0);
  await expect(unauthorized.locator(".ybtn-disabled")).toHaveText("Add a comment");

  const desktopMetrics = await unauthorized.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { marginTop: style.marginTop, top: rect.top, height: rect.height };
  });
  expect(desktopMetrics.marginTop).toBe("20px");
  expect(desktopMetrics.height).toBeGreaterThan(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const mobileMetrics = await page
    .locator('[data-owner="project-issue-detail-unauthorized-comment"]')
    .evaluate((element) => ({
      marginTop: getComputedStyle(element).marginTop,
      top: element.getBoundingClientRect().top,
    }));
  expect(mobileMetrics.marginTop).toBe("20px");
  expect(mobileMetrics.top).toBeGreaterThan(0);
  const mobileDisabledActions = page.locator(
    '[data-owner="project-issue-detail-disabled-comment-actions"]',
  );
  const mobileDisabledActionsMetrics = await mobileDisabledActions.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      marginTop: style.marginTop,
      textAlign: style.textAlign,
      right: rect.right,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobileDisabledActionsMetrics.marginTop).toBe("10px");
  expect(mobileDisabledActionsMetrics.textAlign).toBe("right");
  expect(mobileDisabledActionsMetrics.right).toBeLessThanOrEqual(
    mobileDisabledActionsMetrics.viewportWidth,
  );
  await expect(
    page.locator(`script[src="${basePath}/assets/javascripts/common/yobi.CommentForm.js"]`),
  ).toHaveCount(0);
});

test("project issue detail renders legacy state-change timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 3, 2026",
        eventType: "ISSUE_STATE_CHANGED",
        id: 88,
        kind: "event",
        newValue: "closed",
        oldValue: "open",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-88 .state.closed")).toHaveText("Closed");
  await expect(page.locator(".span-right-pane #comments li.event-index")).toHaveCount(0);
  expect(await eventTimelineMetrics(page, "#event-88")).toEqual({
    avatarHeight: 24,
    avatarWidth: 24,
    dateFontSize: "11px",
    eventDisplay: "list-item",
    lineHeight: "30px",
    paddingLeft: "55px",
    stateBackground: "rgb(253, 105, 86)",
    stateMarginRight: "10px",
    stateWidth: 90,
  });
});

test("project issue detail preserves legacy body-changed-only timeline shell", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_BODY_CHANGED",
        id: 104,
        kind: "event",
        newValue: "new body",
        oldValue: "old body",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-104")).toHaveCount(0);
  await expect(page.locator(".span-left-pane .comment-header .num")).toHaveText("0");
  await expect(page.locator("#comment-form textarea")).toBeVisible();
});

test("project issue detail renders legacy assignee timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_ASSIGNEE_CHANGED",
        id: 90,
        kind: "event",
        newValue: "admin",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "Site Admin",
        targetLoginId: "admin",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-90 .state.changed")).toHaveText("Assigned");
});

test("project issue detail renders legacy milestone timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "en-US");
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 91,
        kind: "event",
        milestoneId: 5,
        milestoneTitle: "v1.0",
        newValue: "5",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-91 .state.milestone-changed")).toHaveText("Update milestone");
});

test("project issue detail matches live legacy Korean milestone event and mobile header", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "ko-KR");
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectIssueDetail(page, {
    __projectOverrides: { boardCount: 1, openIssueCount: 1 },
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "2026-07-04",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 91,
        kind: "event",
        milestoneId: 5,
        milestoneTitle: "v1.0",
        newValue: "5",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "개발자",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);

  await expect(page.locator(".project-header-outer")).toHaveCSS("height", "120px");
  await expect(page.locator("#event-91 .state.milestone-changed")).toHaveText("마일스톤 변경");
  await expect(page.locator("#event-91")).toContainText(
    "개발자님이 마일스톤을 v1.0(으)로 변경했습니다.",
  );
  await expect(page.locator("#event-91 a[title='마일스톤']")).toHaveText("v1.0");
  await expect(page.locator('[data-owner="global-gnb-nav"]')).toContainText("개발팀에게 문의하기");

  const mobileMetrics = await page.evaluate(() => {
    const upload = document.querySelector<HTMLElement>(".write-comment-box .upload-wrap");
    const userMenu = document.querySelector<HTMLElement>(".gnb-usermenu");
    if (!upload || !userMenu) return null;
    const uploadBox = upload.getBoundingClientRect();
    const userMenuBox = userMenu.getBoundingClientRect();
    return {
      uploadHeight: uploadBox.height,
      uploadWidth: uploadBox.width,
      uploadX: uploadBox.x,
      userMenuTop: userMenuBox.top,
    };
  });
  expect(mobileMetrics).not.toBeNull();
  expect(mobileMetrics!.uploadHeight).toBeCloseTo(100, 0);
  expect(mobileMetrics!.uploadWidth).toBeCloseTo(386, 0);
  expect(mobileMetrics!.uploadX).toBeCloseTo(2, 0);
  // Mobile header: the anonymous/authenticated usermenu (218px) + the gnb-nav
  // The live ko-KR shell keeps the user menu on the first 40px nav row.
  expect(mobileMetrics!.userMenuTop).toBe(83);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  const desktopUpload = await page
    .locator(".write-comment-box .upload-wrap")
    .evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x };
    });
  expect(desktopUpload.x).toBeCloseTo(64, 0);
  expect(desktopUpload.width).toBeCloseTo(948, 0);
  expect(desktopUpload.height).toBeCloseTo(70, 0);

  const desktopIssueUpdateForm = await page.locator("#issueUpdateForm").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width, x: box.x };
  });
  expect(desktopIssueUpdateForm.x).toBeCloseTo(1051, 0);
  expect(desktopIssueUpdateForm.width).toBeCloseTo(305, 0);

  const desktopProjectMenu = await page.locator(".project-menu-gruop").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { width: box.width };
  });
  // The mock enables all seven menu items (board/code/issue/milestone/
  // pullRequest/review); live legacy-vs-Yoram parity on admin/WYVE_OCS renders
  // identical menu widths (528.109375 each), so this pins the mock composition.
  expect(desktopProjectMenu.width).toBeCloseTo(573, 0);
  await expect(page.locator("#issueUpdateForm")).toContainText("목표 완료일");
  // Updateable label control dt is @Messages("label") — 라벨 — not 이슈 라벨
  // (that's the read-only dt's issue.label).
  await expect(page.locator("#issueUpdateForm")).toContainText("라벨");
  await expect(page.locator(".comment-header")).toHaveCount(2);
  await expect(page.locator(".comment-header").first()).toContainText("댓글");
  await expect(page.locator(".comment-header").last()).toContainText("댓글");
});

test("project issue detail mobile uploader follows the frozen responsive cascade", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 390, height: 844 });
  await mockProjectIssueDetail(page, { commentCount: 0, comments: [], timeline: [] });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  console.log(
    "PROBE-UP2",
    JSON.stringify(
      await page.evaluate(() => {
        const wrap = document.querySelector("#comment-form .upload-wrap");
        const aw = wrap?.querySelector(".attach-wrap");
        if (!wrap || !aw) return null;
        const r = (el: Element) => {
          const b = el.getBoundingClientRect();
          return {
            h: Math.round(b.height),
            w: Math.round(b.width),
            x: Math.round(b.x),
            disp: getComputedStyle(el as HTMLElement).display,
            lineH: getComputedStyle(el as HTMLElement).lineHeight,
          };
        };
        return {
          wrap: r(wrap),
          aw: r(aw),
          kids: [...aw.children].map((c) => ({
            cls: (c as HTMLElement).className.slice(0, 50),
            ...r(c),
          })),
        };
      }),
    ),
  );
  const geometry = await page.locator("#comment-form .upload-wrap").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { height: box.height, width: box.width, x: box.x };
  });
  expect(geometry).toEqual({ height: 100, width: 386, x: 2 });
});

test("project issue detail renders legacy null milestone timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await setBrowserLanguage(page, "en-US");
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_MILESTONE_CHANGED",
        id: 99,
        kind: "event",
        milestoneId: 0,
        newValue: "0",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-99 .state.milestone-changed")).toHaveText("Update milestone");
});

test("project issue detail renders legacy moved timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
    "utf8",
  );

  expect(routeSource).toContain('to="/$ownerName/$projectName"');
  expect(routeSource).toContain("params={{ ownerName: fromOwner, projectName: fromProject }}");
  expect(routeSource).not.toContain("to={`/${fromProjectName}`}");

  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_MOVED",
        id: 92,
        kind: "event",
        oldValue: "old-owner/old-project",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-92 .state.changed")).toHaveText("moved");
  await expect(page.locator("#event-92 strong .link")).toHaveText("old-owner/old-project");
  await expect(page.locator("#event-92 strong .link")).toHaveAttribute(
    "href",
    `${basePath}/old-owner/old-project`,
  );
});

test("project issue detail renders legacy commit referred timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_REFERRED_FROM_COMMIT",
        id: 93,
        kind: "event",
        newValue: "abcdef0",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-93 .state.changed")).toHaveText("mentioned");
  await expect(page.locator("#event-93 strong .link")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/commit/abcdef0`,
  );
});

test("project issue detail renders legacy pull request referred timeline event", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_REFERRED_FROM_PULL_REQUEST",
        id: 94,
        kind: "event",
        newValue: "3",
        pullRequestNumber: 3,
        pullRequestTitle: "Fix login redirect",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-94 .state.changed")).toHaveText("mentioned");
});

test("project issue detail renders legacy sharer added timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 95,
        kind: "event",
        newValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-95 .state.sharer-added")).toHaveText("Issue Sharer");
});

test("project issue detail renders legacy sharer deleted timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 96,
        kind: "event",
        oldValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-96 .state.sharer-deleted")).toHaveText("Cancelled");
});

test("project issue detail renders legacy consecutive sharer added timeline events", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 100,
        kind: "event",
        newValue: "qa1",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA One",
        targetLoginId: "qa1",
      },
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_SHARER_CHANGED",
        id: 101,
        kind: "event",
        newValue: "qa2",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
        targetAvatarUrl: "/assets/images/default-avatar-32.png",
        targetLabel: "QA Two",
        targetLoginId: "qa2",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-101 > .state")).toHaveText("");
  await expect(page.locator("#event-101 > .state")).toHaveClass(/\bstate\b/);
});

test("project issue detail renders legacy label added timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 97,
        kind: "event",
        newValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-97 .state.label-added")).toHaveText("Added");
});

test("project issue detail renders legacy label deleted timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 98,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-98 .state.label-deleted")).toHaveText("Removed");
});

test("project issue detail renders legacy consecutive label deleted timeline events", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 102,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 103,
        kind: "event",
        oldValue: "type - bug #8",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-103 > .state")).toHaveText("");
  await expect(page.locator("#event-103 > .state")).toHaveClass(/\bstate\b/);
});

test("project issue detail renders legacy default timeline event", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    commentCount: 0,
    comments: [],
    timeline: [
      {
        createdLabel: "Jul 4, 2026",
        eventType: "ISSUE_UNKNOWN_CHANGED",
        id: 89,
        kind: "event",
        newValue: "fallback note",
        senderAvatarUrl: "/assets/images/default-avatar-32.png",
        senderLabel: "Dev Member",
        senderLoginId: "dev",
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#event-89")).toContainText("fallback note by");
});

test("project issue detail renders legacy comment voter overflow", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        contentsHtml: "<p>Comment <strong>markdown</strong></p>",
        contentsMarkdown: "Comment **markdown**",
        createdLabel: "Jul 2, 2026",
        id: 77,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerHasVoted: true,
        viaEmail: false,
        voterCount: 6,
        voters: commentVoters(),
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveText(
    "6 Agreements",
  );
  await expect(
    page.locator('#comment-77 [data-toggle="modal"], #comment-77 [data-target="#voters-77"]'),
  ).toHaveCount(0);
  await expect(page.locator("#voters-77.voters-dialog")).toHaveCount(1);
  const commentUnvoteButton = page.locator('#comment-77 button[title="Withdraw"]');
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-type", /.+/);
  await expect(commentUnvoteButton).not.toHaveAttribute("data-request-uri", /.+/);

  await expect(page.locator('#comment-77 a[href="#voters-77"][data-toggle="modal"]')).toHaveCount(
    0,
  );
  const trigger = page.locator("#comment-77 button[type='button'].vote-description-people");
  await page.evaluate(() => {
    (window as typeof window & { __spaMarker?: string }).__spaMarker = "comment-voters-modal";
  });
  await armRootModalBridgeTrap(page);
  await trigger.click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters-77")).toBeVisible();
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog in/);
  await expect(page.locator(".modal-backdrop.in")).toHaveCount(1);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);
  expect(await commentVoterModalMetrics(page)).toEqual({
    avatarHeight: 40,
    avatarWidth: 40,
    bodyDisplay: "block",
    closeHookCount: 0,
    display: "block",
    footerDisplay: "flex",
    headerDisplay: "flex",
    left: 399,
    rowCount: 6,
    rowDisplay: "list-item",
    width: 482,
  });
  await installClipboardSpy(page);
  await expect(page.locator("#voters-77 #copyEmailBtn")).toHaveText("Copy email list");
  await expect(page.locator("#voters-77 #copyEmailBtn")).toHaveClass("ybtn ybtn-info ybtn-small");
  await expect(page.locator("#voters-77 #copyEmailBtn")).not.toHaveAttribute(
    "data-clipboard-text",
    /.+/,
  );
  await page.locator("#voters-77 #copyEmailBtn").click();
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

  await page.locator('#voters-77 .modal-footer button:has-text("Close")').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#voters-77")).toBeHidden();
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(
    page.evaluate(() => (window as typeof window & { __spaMarker?: string }).__spaMarker),
  ).resolves.toBe("comment-voters-modal");
  await expect(rootModalBridgeHits(page)).resolves.toEqual([]);

  await trigger.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);

  await trigger.click();
  await page.locator(".modal-backdrop.in").dispatchEvent("click");
  await expect(page.locator("#voters-77")).toHaveClass(/modal hide voters-dialog/);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
});

test("project issue detail renders legacy inline comment voter avatars", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    comments: [
      {
        attachments: [],
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
        voterCount: 3,
        voters: commentVoters().slice(0, 3),
      },
    ],
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await expect(page.locator("#comment-77 button.vote-description-people")).toHaveCount(0);
  await expect(page.locator("#voters-77")).toHaveCount(0);

  const expected =
    `<a href="__BASE_PATH__/admin" class="avatar-wrap smaller" data-placement="top" title="Site Admin"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/dev" class="avatar-wrap smaller" data-placement="top" title="Dev Member"><img src="/assets/images/default-avatar-32.png"></a><a href="__BASE_PATH__/qa1" class="avatar-wrap smaller" data-placement="top" title="QA One"><img src="/assets/images/default-avatar-32.png"></a>`.replaceAll(
      "__BASE_PATH__",
      basePath,
    );
  expect(
    await canonicalizeAll(page, "#comment-77 .act-row.pull-right .avatar-wrap.smaller"),
  ).toEqual(await canonicalizeHtml(page, expected));
});

test("project issue detail wires markdown, task, and attachment links to observable navigation", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectIssueDetail(page, {
    attachments: [
      {
        id: 91,
        name: "evidence.txt",
        sizeLabel: "12 KB",
        url: `${basePath}/files/evidence.txt`,
      },
    ],
    bodyMarkdown:
      "[Internal issue](/admin/sample/issue/11#comments)\n\n" +
      "[External docs](https://example.com/docs)\n\n" +
      "- [ ] [Task link](/admin/sample/issue/11#comment-77)",
  });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const body = page.locator("#issue-body-11");
  await body.getByRole("link", { name: "Internal issue" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11#comments`);
  await body.getByRole("link", { name: "Task link" }).click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/issue/11#comment-77`);

  const externalHref = await body
    .getByRole("link", { name: "External docs" })
    .evaluate((link: HTMLAnchorElement) => {
      let activatedHref = "";
      link.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          activatedHref = link.href;
        },
        { once: true },
      );
      link.click();
      return activatedHref;
    });
  expect(externalHref).toBe("https://example.com/docs");

  const download = page.getByRole("link", { name: "Download a file evidence.txt" });
  const downloadHref = await download.evaluate((link: HTMLAnchorElement) => {
    let activatedHref = "";
    link.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        activatedHref = link.href;
      },
      { once: true },
    );
    link.click();
    return activatedHref;
  });
  expect(downloadHref).toContain(`${basePath}/files/evidence.txt?action=download`);
  const attachment = page.getByRole("link", { name: /evidence\.txt/u }).last();
  await expect(attachment).toHaveAttribute("target", "_blank");
  await expect(attachment).toHaveAttribute("href", `${basePath}/files/evidence.txt`);
});

test("project issue detail searches and mutates sharer and assignee controls", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { assignableSearchQueries, massUpdateRequests, sharableSearchQueries, sharerRequests } =
    await mockProjectIssueDetail(page, {
      sharers: [{ loginId: "dev", userLabel: "Dev Member" }],
    });

  await page.goto(`${basePath}/admin/sample/issue/11`);
  await page.getByRole("button", { name: "Issue Sharing" }).click();
  const sharerInput = page.getByRole("textbox", { name: "Select Issue Sharer" });
  await expect(sharerInput).toBeVisible();
  await sharerInput.fill("qa");
  await expect.poll(() => sharableSearchQueries).toContain("qa");
  await page.getByRole("option", { name: "QA Member qa" }).click();
  await expect
    .poll(() => sharerRequests)
    .toContainEqual({
      loginId: "qa",
      method: "POST",
      targetType: null,
    });
  await page.getByRole("button", { name: "Dev Member Delete" }).click();
  await expect
    .poll(() => sharerRequests)
    .toContainEqual({
      loginId: "dev",
      method: "DELETE",
      targetType: null,
    });

  const assignee = page.getByRole("combobox", { name: "Assignee" });
  await assignee.locator(".select2-choice").focus();
  await page.keyboard.press("Enter");
  const assigneeSearch = assignee.locator(".select2-search input");
  await expect(assigneeSearch).toBeFocused();
  await assigneeSearch.fill("qa");
  await expect.poll(() => assignableSearchQueries).toContain("qa");
  await assignee.getByRole("option", { name: "QA Member qa" }).click();
  await expect.poll(() => massUpdateRequests.length).toBe(1);
  expect(massUpdateRequests[0]).toMatchObject({
    body: { assigneeLoginId: "qa" },
    csrfToken: "test-csrf-token",
    method: "POST",
  });
  await expect(assignee.locator(".select2-chosen")).toContainText("QA Member");
});

test("project issue detail creates, replies, edits, and transitions state through REST", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const { commentCreateRequests, commentUpdateRequests, issueStateRequests } =
    await mockProjectIssueDetail(page);

  await page.goto(`${basePath}/admin/sample/issue/11`);
  const mainEditor = page.locator("#comment-form textarea[name=contents]");
  await mainEditor.fill("Main comment");
  await page.getByRole("button", { name: "Add a comment" }).click();
  await expect.poll(() => commentCreateRequests.length).toBe(1);
  expect(commentCreateRequests[0]).toMatchObject({
    body: { contentsMarkdown: "Main comment" },
    method: "POST",
  });
  await expect(mainEditor).toHaveValue("");

  const comment = page.locator(".span-left-pane #comment-77");
  await comment.hover();
  await comment.locator(".add-a-comment").click();
  const replyForm = comment.locator(".child-comment-input-form");
  await replyForm.locator("textarea[name=contents]").fill("Child reply from REST");
  await replyForm.getByRole("button", { name: "OK" }).click();
  await expect.poll(() => commentCreateRequests.length).toBe(2);
  expect(commentCreateRequests[1]).toMatchObject({
    body: { contentsMarkdown: "Child reply from REST", parentCommentId: "77" },
    method: "POST",
  });
  await expect(replyForm).toBeHidden();

  await comment
    .locator(':scope > .media-body > .meta-info > .act-row button[title="Edit comment"]')
    .click();
  const updateForm = comment.locator("#comment-editform-77");
  await updateForm.locator("textarea[name=contents]").fill("Edited comment via REST");
  await updateForm.getByRole("button", { name: "Save" }).click();
  await expect.poll(() => commentUpdateRequests.length).toBe(1);
  expect(commentUpdateRequests[0]).toMatchObject({
    body: { contentsMarkdown: "Edited comment via REST" },
    method: "PUT",
  });
  await expect(updateForm).toBeHidden();

  await page.locator("#dynamic-comment-btn").click();
  await expect
    .poll(() => issueStateRequests)
    .toContainEqual({
      body: { state: "closed" },
      method: "PUT",
    });
  await expect(page.locator(".board-header.issue .badge").first()).toHaveText("Closed");
  expect(commentCreateRequests).toHaveLength(2);

  await mainEditor.fill("Reopening with context");
  await page.locator("#dynamic-comment-btn").click();
  await expect.poll(() => commentCreateRequests.length).toBe(3);
  await expect
    .poll(() => issueStateRequests)
    .toContainEqual({
      body: { state: "open" },
      method: "PUT",
    });
  expect(commentCreateRequests[2]).toMatchObject({
    body: { contentsMarkdown: "Reopening with context" },
    method: "POST",
  });
  await expect(page.locator(".board-header.issue .badge").first()).toHaveText("Open");
});
