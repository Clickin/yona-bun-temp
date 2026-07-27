import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
  ),
  "utf8",
);

test("issue detail keeps the legacy timeline event before the comment uploader", async ({
  page,
}) => {
  const legacyView = readFileSync(
    fileURLToPath(new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url)),
    "utf8",
  );
  const legacyComments = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/views/issue/partial_comments.scala.html", import.meta.url),
    ),
    "utf8",
  );
  const legacyEvent = readFileSync(
    fileURLToPath(
      new URL(
        "../../yona-original/app/views/issue/partial_event_timeline.scala.html",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  const legacyCommentForm = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/views/common/commentForm.scala.html", import.meta.url),
    ),
    "utf8",
  );
  const legacyUploadForm = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/views/common/uploadForm.scala.html", import.meta.url),
    ),
    "utf8",
  );
  const legacyPageLess = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    ),
    "utf8",
  );

  expect(legacyView).toContain("@partial_comments(project, issue)");
  expect(legacyView).toContain(
    "@common.commentForm(issue.asResource(), ResourceType.ISSUE_COMMENT",
  );
  expect(legacyComments).toContain('<hr class="nm">');
  expect(legacyComments).toContain("@partial_event_timeline");
  expect(legacyEvent).toContain("case ISSUE_MILESTONE_CHANGED");
  expect(legacyCommentForm).toContain('@common.editor("contents"');
  expect(legacyCommentForm).toContain("@common.fileUploader(resourceType, null)");
  expect(legacyUploadForm).toContain('class="upload-wrap content-footer"');
  expect(legacyPageLess).toContain(".write-comment-box {");
  expect(legacyPageLess).toContain(".upload-wrap {");
  expect(legacyPageLess).toContain("padding:10px !important;");
  expect(routeSource).toContain("function IssueMainTimeline");
  expect(routeSource).toContain("function IssueEventRow");
  expect(routeSource).toContain("ISSUE_MILESTONE_CHANGED");
  expect(routeSource).toContain('className="upload-wrap content-footer"');

  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        isAnonymous: false,
        isSiteAdmin: true,
        isConfirmed: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        isAnonymous: false,
        isSiteAdmin: true,
        isConfirmed: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        isAnonymous: false,
        isSiteAdmin: true,
        isConfirmed: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/1", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 1,
        number: 1,
        issueNumber: 1,
        ownerName: "admin",
        projectName: "sample",
        title: "Review rail parity check",
        state: "OPEN",
        bodyMarkdown: "Issue body",
        authorLoginId: "admin",
        authorLabel: "Site Admin",
        authorAvatarUrl: "",
        createdLabel: "5 days ago",
        createdDate: "Jul 24, 2026",
        canUpdate: true,
        viewerCanUpdate: true,
        canWatch: true,
        viewerCanWatch: true,
        viewerCanComment: true,
        isWatching: false,
        isFavorited: false,
        isDraft: false,
        weight: 0,
        voters: [],
        issueVoters: [],
        sharers: [],
        childIssues: [],
        attachments: [],
        labels: [],
        comments: [
          {
            id: 2,
            parentCommentId: "",
            authorLoginId: "admin",
            authorLabel: "Site Admin",
            authorAvatarUrl: "",
            contentsMarkdown: "Comment body",
            createdLabel: "5 days ago",
            voters: [],
            childComments: [],
            attachments: [],
            viewerCanUpdate: false,
            viewerCanDelete: false,
          },
        ],
        timeline: [
          {
            id: 3,
            eventType: "ISSUE_MILESTONE_CHANGED",
            senderLoginId: "admin",
            senderLabel: "Site Admin",
            senderAvatarUrl: "",
            milestoneId: "1",
            milestoneTitle: "Parity launch",
            createdLabel: "5 days ago",
            newValue: "1",
            oldValue: "",
          },
          {
            id: 2,
            comment: {
              id: 2,
              parentCommentId: "",
              authorLoginId: "admin",
              authorLabel: "Site Admin",
              authorAvatarUrl: "",
              contentsMarkdown: "Comment body",
              createdLabel: "5 days ago",
              voters: [],
              childComments: [],
              attachments: [],
              viewerCanUpdate: false,
              viewerCanDelete: false,
            },
          },
        ],
        milestone: null,
        assigneeLoginId: null,
        commentCount: 1,
      },
    }),
  );

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 900, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin/sample/issue/1");
    const event = page.locator('[data-stylex-owner="issue-detail-timeline-event"]').first();
    const comment = page.locator("#comments li.comment").first();
    const upload = page.locator("#comments .upload-wrap.content-footer");
    await expect(event).toBeVisible();
    await expect(comment).toBeVisible();
    await expect(upload).toBeVisible();
    await expect(upload.locator('input[type="file"][multiple]')).toBeVisible();
    await expect(upload).toContainText("File upload");
    const boxes = await page.evaluate(() => {
      const event = document.querySelector('[data-stylex-owner="issue-detail-timeline-event"]');
      const comment = document.querySelector("#comments li.comment");
      const upload = document.querySelector("#comments .upload-wrap.content-footer");
      if (!event || !comment || !upload) throw new Error("issue timeline geometry nodes missing");
      const eventBox = event.getBoundingClientRect();
      const commentBox = comment.getBoundingClientRect();
      const uploadBox = upload.getBoundingClientRect();
      return {
        eventBottom: eventBox.bottom,
        eventHeight: eventBox.height,
        commentTop: commentBox.top,
        uploadBottom: uploadBox.bottom,
        uploadHeight: uploadBox.height,
        uploadTop: uploadBox.top,
      };
    });
    expect(boxes.eventHeight).toBeGreaterThanOrEqual(30);
    expect(boxes.commentTop).toBeGreaterThanOrEqual(boxes.eventBottom);
    expect(boxes.uploadTop).toBeGreaterThanOrEqual(boxes.commentTop);
    if (viewport.width === 1366) {
      expect(boxes.uploadHeight).toBe(70);
    } else {
      expect(boxes.uploadHeight).toBeGreaterThanOrEqual(70);
    }
    expect(boxes.uploadBottom).toBeGreaterThan(boxes.uploadTop);
    expect(await upload.getAttribute("style")).toBeNull();
  }
});
