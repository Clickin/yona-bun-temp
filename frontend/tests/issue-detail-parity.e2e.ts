import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

async function assertLegacyIssueCommentsShellMetrics(page: Page) {
  const section = await layoutBox(page, "section#comments.board-comment-wrap");
  const timeline = await layoutBox(page, "section#comments #timeline");
  const timelineList = await layoutBox(page, "section#comments #timeline > .timeline-list");
  const header = await layoutBox(page, "section#comments .timeline-list > .comment-header");
  const headerIcon = await layoutBox(page, "section#comments .comment-header > i");
  const headerLabel = await layoutBox(
    page,
    "section#comments .comment-header > strong:first-of-type",
  );
  const headerCount = await layoutBox(page, "section#comments .comment-header > strong.num");
  const divider = await layoutBox(page, "section#comments .timeline-list > hr.nm");
  const list = await layoutBox(page, "section#comments .timeline-list > ul.comments");
  const firstComment = await layoutBox(
    page,
    "section#comments .timeline-list > ul.comments > li#comment-10",
  );
  const secondComment = await layoutBox(
    page,
    "section#comments .timeline-list > ul.comments > li#comment-30",
  );
  const event = await layoutBox(
    page,
    "section#comments .timeline-list > ul.comments > li#event-17",
  );
  const styles = await page.locator("section#comments").evaluate((element) => {
    const headerStyle = window.getComputedStyle(
      element.querySelector(".comment-header") as HTMLElement,
    );
    const iconStyle = window.getComputedStyle(
      element.querySelector(".comment-header > i") as HTMLElement,
    );
    const dividerStyle = window.getComputedStyle(element.querySelector("hr.nm") as HTMLElement);
    const listStyle = window.getComputedStyle(element.querySelector("ul.comments") as HTMLElement);
    const sectionStyle = window.getComputedStyle(element);
    return {
      dividerDisplay: dividerStyle.display,
      headerDisplay: headerStyle.display,
      iconDisplay: iconStyle.display,
      listDisplay: listStyle.display,
      listStyleType: listStyle.listStyleType,
      sectionDisplay: sectionStyle.display,
    };
  });

  await expect(page.locator("section#comments.board-comment-wrap")).toHaveCount(1);
  await expect(
    page.locator("section#comments .comment-header > strong:first-of-type"),
  ).toContainText("Comment");
  await expect(page.locator("section#comments .comment-header > strong.num")).toContainText("2");
  await expect(page.locator("section#comments .timeline-list > ul.comments")).toHaveCount(1);
  await expect(
    page.locator("section#comments .timeline-list > ul.comments > li#comment-10"),
  ).toHaveCount(1);
  await expect(
    page.locator("section#comments .timeline-list > ul.comments > li#comment-30"),
  ).toHaveCount(1);
  await expect(
    page.locator("section#comments .timeline-list > ul.comments > li#event-17"),
  ).toHaveCount(1);

  expect(timeline.x).toBeGreaterThanOrEqual(section.x);
  expect(timeline.width).toBeLessThanOrEqual(section.width + 1);
  expect(timelineList.x).toBeGreaterThanOrEqual(timeline.x);
  expect(header.y).toBeGreaterThanOrEqual(timelineList.y);
  expect(headerIcon.x).toBeGreaterThanOrEqual(header.x);
  expect(headerLabel.x).toBeGreaterThan(headerIcon.x + headerIcon.width - 1);
  expect(headerCount.x).toBeGreaterThan(headerLabel.x + headerLabel.width - 1);
  expect(divider.y).toBeGreaterThan(header.y + header.height - 1);
  expect(list.y).toBeGreaterThan(divider.y);
  expect(firstComment.y).toBeGreaterThanOrEqual(list.y);
  expect(secondComment.y).toBeGreaterThan(firstComment.y + firstComment.height - 1);
  expect(event.y).toBeGreaterThan(secondComment.y + secondComment.height - 1);
  expect(styles).toEqual({
    dividerDisplay: "block",
    headerDisplay: "block",
    iconDisplay: "inline",
    listDisplay: "block",
    listStyleType: "none",
    sectionDisplay: "block",
  });
}

async function assertLegacyIssueEventTimelineMetrics(page: Page) {
  const closedEvent = await layoutBox(page, "section#comments li#event-17.event");
  const closedState = await layoutBox(page, "#event-17 > .state.closed");
  const closedMessage = await layoutBox(page, "#event-17 > .event-message");
  const closedSender = await layoutBox(page, "#event-17 .event-message a.usf-group");
  const closedDate = await layoutBox(page, "#event-17 > .date");
  const labelEvent = await layoutBox(page, "section#comments li#event-18.event");
  const labelState = await layoutBox(page, "#event-18 > .state.label-added");
  const labelMessage = await layoutBox(page, "#event-18 > .event-message");
  const issueLabel = await layoutBox(page, "#event-18 .issue-label");
  const assigneeEvent = await layoutBox(page, "section#comments li#event-20.event");
  const assigneeState = await layoutBox(page, "#event-20 > .state.changed");
  const assigneeSender = await layoutBox(
    page,
    "#event-20 .event-message a.usf-group:first-of-type",
  );
  const assigneeTarget = await layoutBox(
    page,
    "#event-20 .event-message a.usf-group:nth-of-type(2)",
  );
  const assigneeDate = await layoutBox(page, "#event-20 > .date");
  const styles = await page.locator("#event-17").evaluate((element) => {
    const eventStyle = window.getComputedStyle(element);
    const stateStyle = window.getComputedStyle(element.querySelector(".state") as HTMLElement);
    const messageStyle = window.getComputedStyle(
      element.querySelector(".event-message") as HTMLElement,
    );
    const senderStyle = window.getComputedStyle(
      element.querySelector("a.usf-group") as HTMLElement,
    );
    const dateStyle = window.getComputedStyle(element.querySelector(".date") as HTMLElement);
    return {
      dateDisplay: dateStyle.display,
      eventDisplay: eventStyle.display,
      messageDisplay: messageStyle.display,
      senderDisplay: senderStyle.display,
      stateDisplay: stateStyle.display,
    };
  });

  await expect(page.locator("#event-17.event")).toHaveCount(1);
  await expect(page.locator("#event-17 > .state.closed")).toContainText("Closed");
  await expect(page.locator("#event-17 .event-message")).toContainText("owner closed this issue");
  await expect(page.locator("#event-17 .event-message a.usf-group")).toHaveAttribute(
    "href",
    "/yona/owner",
  );
  await expect(page.locator("#event-17 .event-message a.usf-group")).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator('#event-17 > .date > a[href="#event-17"]')).toContainText(
    "1 minute ago",
  );
  await expect(page.locator("#event-18 > .state.label-added")).toContainText("Added");
  await expect(page.locator("#event-18 .event-message a.usf-group")).toHaveAttribute(
    "href",
    "/yona/owner",
  );
  await expect(page.locator("#event-18 .issue-label")).toContainText("bug");
  await expect(page.locator("#event-20 > .state.changed")).toContainText("Assigned");
  await expect(page.locator("#event-20 .event-message a.usf-group").nth(0)).toHaveAttribute(
    "href",
    "/yona/owner",
  );
  await expect(page.locator("#event-20 .event-message a.usf-group").nth(1)).toHaveAttribute(
    "href",
    "/yona/assignee",
  );
  await expect(page.locator("#event-19")).toHaveCount(0);

  expect(closedState.x).toBeGreaterThanOrEqual(closedEvent.x);
  expect(closedMessage.x).toBeGreaterThan(closedState.x + closedState.width - 1);
  expect(closedSender.x).toBeGreaterThanOrEqual(closedMessage.x);
  expect(closedDate.x).toBeGreaterThan(closedMessage.x + closedMessage.width - 1);
  expect(labelEvent.y).toBeGreaterThan(closedEvent.y + closedEvent.height - 1);
  expect(labelState.x).toBeCloseTo(closedState.x, 0);
  expect(labelMessage.x).toBeGreaterThan(labelState.x + labelState.width - 1);
  expect(issueLabel.x).toBeGreaterThan(labelMessage.x);
  expect(assigneeEvent.y).toBeGreaterThan(labelEvent.y + labelEvent.height - 1);
  expect(assigneeState.x).toBeCloseTo(labelState.x, 0);
  expect(assigneeSender.x).toBeGreaterThanOrEqual(labelMessage.x);
  expect(assigneeTarget.x).toBeGreaterThan(assigneeSender.x + assigneeSender.width - 1);
  expect(assigneeDate.x).toBeGreaterThan(assigneeTarget.x + assigneeTarget.width - 1);
  expect(styles).toEqual({
    dateDisplay: "inline",
    eventDisplay: "list-item",
    messageDisplay: "inline",
    senderDisplay: "inline",
    stateDisplay: "inline-block",
  });
}

async function assertLegacyIssueIndexCommentsShellMetrics(page: Page) {
  const shell = await layoutBox(page, "aside.span-right-pane #comments.board-comment-wrap");
  const timeline = await layoutBox(page, "aside.span-right-pane #comments > #timeline");
  const timelineList = await layoutBox(
    page,
    "aside.span-right-pane #comments > #timeline > .timeline-list",
  );
  const header = await layoutBox(
    page,
    "aside.span-right-pane #comments .timeline-list > .comment-header",
  );
  const headerLabel = await layoutBox(
    page,
    "aside.span-right-pane #comments .comment-header > strong:first-of-type",
  );
  const headerCount = await layoutBox(
    page,
    "aside.span-right-pane #comments .comment-header > strong.num",
  );
  const list = await layoutBox(
    page,
    "aside.span-right-pane #comments .timeline-list > ul.comments",
  );
  const firstComment = await layoutBox(
    page,
    "aside.span-right-pane #comments .timeline-list > ul.comments > li#comment-10.index-comment",
  );
  const styles = await page.locator("aside.span-right-pane #comments").evaluate((element) => {
    const shellStyle = window.getComputedStyle(element);
    const headerStyle = window.getComputedStyle(
      element.querySelector(".comment-header") as HTMLElement,
    );
    const listStyle = window.getComputedStyle(element.querySelector("ul.comments") as HTMLElement);
    const firstCommentStyle = window.getComputedStyle(
      element.querySelector("li.index-comment") as HTMLElement,
    );
    return {
      firstCommentDisplay: firstCommentStyle.display,
      headerDisplay: headerStyle.display,
      listDisplay: listStyle.display,
      listStyleType: listStyle.listStyleType,
      shellDisplay: shellStyle.display,
    };
  });

  await expect(page.locator("aside.span-right-pane #comments.board-comment-wrap")).toHaveCount(1);
  await expect(
    page.locator("aside.span-right-pane #comments .comment-header > strong:first-of-type"),
  ).toContainText("Comment");
  await expect(
    page.locator("aside.span-right-pane #comments .comment-header > strong.num"),
  ).toContainText("2");
  await expect(page.locator("aside.span-right-pane #comments ul.comments")).toHaveCount(1);
  await expect(page.locator("aside.span-right-pane #comments li.event")).toHaveCount(0);
  await expect(page.locator("aside.span-right-pane #comments li.index-comment")).toHaveCount(1);

  expect(timeline.x).toBeGreaterThanOrEqual(shell.x);
  expect(timeline.width).toBeLessThanOrEqual(shell.width + 1);
  expect(timelineList.x).toBeGreaterThanOrEqual(timeline.x);
  expect(header.y).toBeGreaterThanOrEqual(timelineList.y);
  expect(headerLabel.x).toBeGreaterThanOrEqual(header.x);
  expect(headerCount.x).toBeGreaterThan(headerLabel.x + headerLabel.width - 1);
  expect(list.y).toBeGreaterThanOrEqual(timelineList.y);
  expect(firstComment.y).toBeGreaterThanOrEqual(list.y);
  expect(styles).toEqual({
    firstCommentDisplay: "list-item",
    headerDisplay: "block",
    listDisplay: "block",
    listStyleType: "none",
    shellDisplay: "block",
  });
}

async function assertLegacyIssueIndexCommentMetrics(page: Page) {
  const indexRowSelector =
    "aside.span-right-pane #comments .timeline-list > ul.comments > li#comment-10.comment.index-comment";
  const shell = await layoutBox(page, "aside.span-right-pane #comments.board-comment-wrap");
  const timeline = await layoutBox(page, "aside.span-right-pane #comments #timeline");
  const header = await layoutBox(page, "aside.span-right-pane #comments .comment-header");
  const list = await layoutBox(page, "aside.span-right-pane #comments ul.comments");
  const row = await layoutBox(page, indexRowSelector);
  const bodyWrap = await layoutBox(page, `${indexRowSelector} #comment-body-10`);
  const body = await layoutBox(page, `${indexRowSelector} .comment-body`);
  const bodyLink = await layoutBox(page, `${indexRowSelector} .comment-body > a`);
  const authorRow = await layoutBox(page, `${indexRowSelector} .index-comment-author`);
  const author = await layoutBox(page, `${indexRowSelector} .comment_author`);
  const authorLink = await layoutBox(page, `${indexRowSelector} .comment_author > a`);
  const agoDate = await layoutBox(page, `${indexRowSelector} .ago-date`);
  const styles = await page.locator(indexRowSelector).evaluate((element) => {
    const rowStyle = window.getComputedStyle(element);
    const bodyStyle = window.getComputedStyle(
      element.querySelector(".comment-body") as HTMLElement,
    );
    const authorRowStyle = window.getComputedStyle(
      element.querySelector(".index-comment-author") as HTMLElement,
    );
    const authorStyle = window.getComputedStyle(
      element.querySelector(".comment_author") as HTMLElement,
    );
    const agoStyle = window.getComputedStyle(element.querySelector(".ago-date") as HTMLElement);
    const shareStyle = window.getComputedStyle(element.querySelector(".share-link") as HTMLElement);
    return {
      agoDisplay: agoStyle.display,
      authorDisplay: authorStyle.display,
      authorRowDisplay: authorRowStyle.display,
      bodyDisplay: bodyStyle.display,
      rowDisplay: rowStyle.display,
      shareDisplay: shareStyle.display,
    };
  });

  await expect(page.locator(indexRowSelector)).toHaveAttribute("data-location", "#comment-10");
  await expect(page.locator(`${indexRowSelector} .comment-body > a`)).toHaveAttribute(
    "href",
    "#comment-10",
  );
  await expect(page.locator(`${indexRowSelector} .comment-body > a`)).toContainText(
    "Editable comment",
  );
  await expect(page.locator(`${indexRowSelector} .comment-exists`)).toHaveCount(0);
  await expect(page.locator(`${indexRowSelector} .comment_author > a`)).toHaveAttribute(
    "href",
    "/yona/admin",
  );
  await expect(page.locator(`${indexRowSelector} .comment_author > a`)).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator(`${indexRowSelector} .comment_author strong`)).toContainText("Admin");
  await expect(page.locator(`${indexRowSelector} .ago-date a.ago`)).toHaveAttribute(
    "href",
    "#comment-10",
  );
  await expect(page.locator(`${indexRowSelector} .ago-date a.ago`)).toContainText("just now");
  await expect(page.locator(`${indexRowSelector} .ago-date a.share-link`)).toHaveCSS(
    "display",
    "none",
  );

  expect(timeline.x).toBeGreaterThanOrEqual(shell.x);
  expect(header.y).toBeGreaterThanOrEqual(timeline.y);
  expect(list.y).toBeGreaterThan(header.y + header.height - 1);
  expect(row.y).toBeGreaterThanOrEqual(list.y);
  expect(bodyWrap.y).toBeGreaterThanOrEqual(row.y);
  expect(body.y).toBeGreaterThanOrEqual(bodyWrap.y);
  expect(bodyLink.x).toBeGreaterThanOrEqual(body.x);
  expect(authorRow.y).toBeGreaterThanOrEqual(row.y);
  expect(author.x).toBeGreaterThanOrEqual(authorRow.x);
  expect(authorLink.x).toBeGreaterThanOrEqual(author.x);
  expect(agoDate.x).toBeGreaterThan(author.x + author.width - 1);
  expect(styles).toEqual({
    agoDisplay: "inline",
    authorDisplay: "inline",
    authorRowDisplay: "block",
    bodyDisplay: "block",
    rowDisplay: "list-item",
    shareDisplay: "none",
  });
}

async function assertLegacyIssueCommentRowMetrics(page: Page) {
  const commentRow =
    "section#comments #timeline .timeline-list > ul.comments > li#comment-10.comment:not(.index-comment)";
  const row = await layoutBox(page, commentRow);
  const avatar = await layoutBox(page, `${commentRow} > .comment-avatar`);
  const avatarWrap = await layoutBox(page, `${commentRow} > .comment-avatar .avatar-wrap`);
  const mediaBody = await layoutBox(page, `${commentRow} > .media-body`);
  const metaInfo = await layoutBox(page, `${commentRow} .media-body > .meta-info`);
  const author = await layoutBox(page, `${commentRow} .meta-info > .comment_author`);
  const responsiveAvatar = await layoutBox(page, `${commentRow} .resp-comment-avatar`);
  const agoDate = await layoutBox(page, `${commentRow} .meta-info > .ago-date`);
  const actionRow = await layoutBox(page, `${commentRow} .meta-info > .act-row.pull-right`);
  const newIssueBy = await layoutBox(page, `${commentRow} .act-row .new-issue-by`);
  const voteButton = await layoutBox(page, `${commentRow} .act-row .comment-vote`);
  const translateButton = await layoutBox(page, `${commentRow} .act-row .comment-translate`);
  const editButton = await layoutBox(page, `${commentRow} [data-toggle="comment-edit"]`);
  const bodyWrap = await layoutBox(page, `${commentRow} #comment-body-10`);
  const body = await layoutBox(page, `${commentRow} #comment-body-10 .comment-body.markdown-wrap`);
  const attachments = await layoutBox(
    page,
    `${commentRow} #comment-body-10 .attachments.pull-left`,
  );
  const attachedFile = await layoutBox(
    page,
    `${commentRow} #comment-body-10 .attached-file-marker`,
  );
  const styles = await page.locator(commentRow).evaluate((element) => {
    const rowStyle = window.getComputedStyle(element);
    const avatarStyle = window.getComputedStyle(
      element.querySelector(":scope > .comment-avatar") as HTMLElement,
    );
    const mediaBodyStyle = window.getComputedStyle(
      element.querySelector(":scope > .media-body") as HTMLElement,
    );
    const metaInfoStyle = window.getComputedStyle(
      element.querySelector(".media-body > .meta-info") as HTMLElement,
    );
    const actionRowStyle = window.getComputedStyle(
      element.querySelector(".act-row.pull-right") as HTMLElement,
    );
    const bodyStyle = window.getComputedStyle(
      element.querySelector(".comment-body.markdown-wrap") as HTMLElement,
    );
    const attachmentsStyle = window.getComputedStyle(
      element.querySelector(".attachments.pull-left") as HTMLElement,
    );
    const attachedFileStyle = window.getComputedStyle(
      element.querySelector("#comment-body-10 .attached-file-marker") as HTMLElement,
    );
    return {
      actionRowFloat: actionRowStyle.float,
      attachedFileDisplay: attachedFileStyle.display,
      attachmentsDisplay: attachmentsStyle.display,
      avatarDisplay: avatarStyle.display,
      bodyDisplay: bodyStyle.display,
      mediaBodyDisplay: mediaBodyStyle.display,
      metaInfoDisplay: metaInfoStyle.display,
      rowDisplay: rowStyle.display,
    };
  });

  await expect(page.locator(commentRow)).toHaveCount(1);
  await expect(page.locator(`${commentRow} > .comment-avatar .avatar-wrap`)).toHaveAttribute(
    "href",
    "/yona/admin",
  );
  await expect(page.locator(`${commentRow} > .comment-avatar .avatar-wrap`)).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator(`${commentRow} .comment_author .resp-comment-avatar`)).toHaveCount(1);
  await expect(page.locator(`${commentRow} .comment_author > a`)).toHaveAttribute(
    "href",
    "/yona/admin",
  );
  await expect(page.locator(`${commentRow} .comment_author > a strong`)).toContainText("Admin");
  await expect(page.locator(`${commentRow} .ago-date a.ago[href="#comment-10"]`)).toContainText(
    "just now",
  );
  await expect(page.locator(`${commentRow} .ago-date a.share-link[href="#comment-10"]`)).toHaveCSS(
    "display",
    "none",
  );
  await expect(page.locator(`${commentRow} .new-issue-by a`)).toHaveAttribute(
    "href",
    "/yona/user/issues/new?commentId=10",
  );
  await expect(page.locator(`${commentRow} .comment-vote`)).toHaveAttribute(
    "data-request-type",
    "comment-vote",
  );
  await expect(page.locator(`${commentRow} .comment-vote`)).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/issue/1/comment/10/vote",
  );
  await expect(page.locator(`${commentRow} .comment-vote .vote-heart-off`)).toHaveCount(1);
  await expect(page.locator(`${commentRow} .comment-translate`)).toHaveAttribute(
    "data-comment-id",
    "10",
  );
  await expect(page.locator(`${commentRow} [data-toggle="comment-edit"]`)).toHaveAttribute(
    "data-comment-id",
    "10",
  );
  await expect(page.locator(`${commentRow} [data-toggle="comment-delete"]`)).toHaveCount(0);
  await expect(page.locator(`${commentRow} #comment-body-10 .comment-body`)).toHaveAttribute(
    "data-allowed-update",
    "true",
  );
  await expect(page.locator(`${commentRow} #comment-body-10 .comment-body`)).toContainText(
    "Editable comment",
  );
  await expect(
    page.locator(`${commentRow} #comment-body-10 .attachments.pull-left`),
  ).toHaveAttribute(
    "data-attachments",
    JSON.stringify([
      {
        fileHref: "/yona/files/710",
        fileId: 710,
        fileName: "legacy-comment.txt",
        fileSize: "2 KB",
        mimeType: "text/plain",
      },
    ]),
  );
  await expect(
    page.locator(`${commentRow} #comment-body-10 .attached-file-marker`),
  ).toHaveAttribute("data-name", "legacy-comment.txt");
  await expect(
    page.locator(`${commentRow} #comment-body-10 .attached-file-marker`),
  ).toHaveAttribute("data-href", "/yona/files/710");
  await expect(
    page.locator(`${commentRow} #comment-body-10 .attached-file-marker .name`),
  ).toContainText("legacy-comment.txt");
  await expect(
    page.locator(`${commentRow} #comment-body-10 .attached-file-marker .size`),
  ).toContainText("2 KB");

  expect(avatar.x).toBeGreaterThanOrEqual(row.x);
  expect(avatarWrap.x).toBeGreaterThanOrEqual(avatar.x);
  expect(mediaBody.x).toBeGreaterThan(avatar.x + avatar.width - 1);
  expect(metaInfo.y).toBeGreaterThanOrEqual(mediaBody.y);
  expect(author.x).toBeGreaterThanOrEqual(metaInfo.x);
  expect(responsiveAvatar.x).toBeGreaterThanOrEqual(author.x);
  expect(agoDate.x).toBeGreaterThan(author.x + author.width - 1);
  expect(actionRow.x).toBeGreaterThan(agoDate.x + agoDate.width - 1);
  expect(newIssueBy.x).toBeGreaterThanOrEqual(actionRow.x);
  expect(voteButton.x).toBeGreaterThan(newIssueBy.x + newIssueBy.width - 1);
  expect(translateButton.x).toBeGreaterThan(voteButton.x + voteButton.width - 1);
  expect(editButton.x).toBeGreaterThan(translateButton.x + translateButton.width - 1);
  expect(bodyWrap.y).toBeGreaterThan(metaInfo.y + metaInfo.height - 1);
  expect(body.y).toBeGreaterThanOrEqual(bodyWrap.y);
  expect(attachments.y).toBeGreaterThan(body.y + body.height - 1);
  expect(attachedFile.x).toBeGreaterThanOrEqual(attachments.x);
  expect(styles).toEqual({
    actionRowFloat: "right",
    attachedFileDisplay: "inline-block",
    attachmentsDisplay: "block",
    avatarDisplay: "block",
    bodyDisplay: "block",
    mediaBodyDisplay: "block",
    metaInfoDisplay: "block",
    rowDisplay: "list-item",
  });
}

const projectContainer = {
  cloneUrl: "https://example.com/admin/projectYobi.git",
  dashboard: {
    labels: [
      {
        categoryId: 4,
        categoryIsExclusive: false,
        categoryName: "Type",
        color: "#f44336",
        id: 5,
        name: "bug",
        openIssueCount: 1,
      },
      {
        categoryId: 4,
        categoryIsExclusive: false,
        categoryName: "Type",
        color: "#2196f3",
        id: 6,
        name: "feature",
        openIssueCount: 0,
      },
    ],
  },
  enrollmentRequested: false,
  isFavorited: false,
  isWatching: false,
  logoUrl: "",
  memberCount: 1,
  members: [],
  openIssueCount: 1,
  openPullRequestCount: 0,
  organizationName: "",
  overview: "Issue detail parity",
  ownerName: "admin",
  projectName: "projectYobi",
  projectScope: "public",
  reviewCount: 0,
  showAdmin: true,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  viewerCanEnroll: false,
  viewerCanUpdate: true,
  viewerCanWatch: true,
  watchCount: 1,
};

const milestones = [
  {
    closedIssueCount: 0,
    completionPercent: 0,
    contentsHtml: "",
    contentsMarkdown: "",
    dueDateLabel: "2026-07-01",
    id: "7",
    openIssueCount: 1,
    state: "open",
    title: "Next",
    viewerCanDelete: true,
    viewerCanUpdate: true,
    attachments: [],
    closedIssues: [],
    openIssues: [],
  },
  {
    closedIssueCount: 1,
    completionPercent: 100,
    contentsHtml: "",
    contentsMarkdown: "",
    dueDateLabel: "2026-06-01",
    id: "8",
    openIssueCount: 0,
    state: "closed",
    title: "Done",
    viewerCanDelete: true,
    viewerCanUpdate: true,
    attachments: [],
    closedIssues: [],
    openIssues: [],
  },
];

function issueDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    assigneeAvatarUrl: "",
    assigneeLabel: "Nori",
    assigneeLoginId: "nori",
    attachments: [],
    authorAvatarUrl: "",
    authorId: "1",
    authorLabel: "Admin",
    authorLoginId: "admin",
    bodyMarkdown: "Issue body",
    childClosedCount: 0,
    childIssues: [],
    childOpenCount: 0,
    commentCount: 0,
    comments: [],
    createdLabel: "just now",
    dueDateLabel: "2026-07-03",
    hasVoted: false,
    historyMarkdown: "",
    isDraft: false,
    isFavorited: false,
    isWatching: false,
    issueId: "101",
    issueNumber: "1",
    issueReferences: [],
    issueVoters: [],
    labels: [{ color: "#f44336", id: "5", name: "bug" }],
    mentionReferences: [],
    milestoneId: "7",
    milestoneTitle: "Next",
    ownerName: "admin",
    parentIssueId: null,
    parentIssueNumber: null,
    parentIssueState: "",
    parentIssueTitle: "",
    projectName: "projectYobi",
    sharers: [],
    state: "open",
    timeline: [],
    title: "Pilot issue",
    viewerCanComment: true,
    viewerCanDelete: true,
    viewerCanManageSharers: true,
    viewerCanUpdate: true,
    viewerHasInheritedShare: false,
    viewerIsDirectSharer: false,
    voterCount: 0,
    watcherCount: 0,
    weight: 0,
    ...overrides,
  };
}

async function installRuntime(page: Page) {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "admin" },
        user: { isSiteAdmin: true, loginId: "admin" },
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 0,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainer),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/milestones?*"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ milestones }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

test.beforeEach(async ({ page }) => {
  await installRuntime(page);
});

test("issue detail actions, metadata sidebar, and delete modal mutate through REST", async ({
  page,
}) => {
  let currentIssue = issueDetail({
    bodyMarkdown: "- [ ] issue open\n- [x] issue done",
    childIssues: [
      {
        assigneeLabel: "Door",
        commentCount: 2,
        createdLabel: "2026-06-28",
        isDraft: false,
        issueNumber: 2,
        labels: [{ color: "#2196f3", id: "6", name: "feature" }],
        state: "open",
        title: "Child pair display issue",
        voterCount: 1,
      },
    ],
    childOpenCount: 1,
    commentParentLinks: [{ id: 31, parentCommentId: 30 }],
    viewerUserId: 1,
    issueVoters: [
      {
        avatarUrl: "/avatars/admin.png",
        emailAddress: "admin@example.com",
        loginId: "admin",
        userId: 1,
        userLabel: "Admin",
      },
      {
        avatarUrl: "/avatars/door.png",
        emailAddress: "door@example.com",
        loginId: "door",
        userId: 2,
        userLabel: "Door",
      },
      {
        avatarUrl: "/avatars/nori.png",
        emailAddress: "nori@example.com",
        loginId: "nori",
        userId: 3,
        userLabel: "Nori",
      },
      {
        avatarUrl: "/avatars/owner.png",
        emailAddress: "owner@example.com",
        loginId: "owner",
        userId: 4,
        userLabel: "Owner",
      },
    ],
    voterCount: 4,
    comments: [
      {
        attachments: [
          {
            id: 710,
            mimeType: "text/plain",
            name: "legacy-comment.txt",
            size: "2 KB",
            url: "/files/710",
          },
        ],
        authorAvatarUrl: "",
        authorId: 1,
        authorLabel: "Admin",
        authorLoginId: "admin",
        contentsMarkdown: "Editable **comment**",
        createdLabel: "just now",
        id: 10,
        viewerCanDelete: false,
        viewerCanUpdate: true,
        viewerHasVoted: false,
        voterCount: 0,
        voters: [],
      },
      {
        authorAvatarUrl: "",
        authorLabel: "Admin",
        authorLoginId: "admin",
        contentsMarkdown: "Child anchor target",
        createdLabel: "just now",
        id: 31,
        parentCommentId: 30,
        viewerCanDelete: true,
        viewerCanUpdate: false,
        viewerHasVoted: false,
        voterCount: 0,
        voters: [],
      },
    ],
    timeline: [
      {
        comment: {
          attachments: [
            {
              id: 710,
              mimeType: "text/plain",
              name: "legacy-comment.txt",
              size: "2 KB",
              url: "/files/710",
            },
          ],
          authorAvatarUrl: "",
          authorId: 1,
          authorLabel: "Admin",
          authorLoginId: "admin",
          contentsMarkdown: "Editable **comment**",
          createdLabel: "just now",
          id: 10,
          viewerCanDelete: false,
          viewerCanUpdate: true,
          viewerHasVoted: false,
          voterCount: 0,
          voters: [],
        },
        createdLabel: "just now",
        eventType: "",
        id: 10,
        kind: "comment",
        newValue: "",
        oldValue: "",
        senderLoginId: "admin",
      },
      {
        comment: {
          authorAvatarUrl: "",
          authorLabel: "Admin",
          authorLoginId: "admin",
          contentsMarkdown: "Delete target comment",
          createdLabel: "just now",
          id: 30,
          viewerCanDelete: true,
          viewerCanUpdate: false,
          viewerHasVoted: false,
          voterCount: 0,
          voters: [],
        },
        createdLabel: "just now",
        eventType: "",
        id: 30,
        kind: "comment",
        newValue: "",
        oldValue: "",
        senderLoginId: "admin",
      },
      {
        createdLabel: "1 minute ago",
        eventType: "ISSUE_STATE_CHANGED",
        id: 17,
        kind: "event",
        newValue: "closed",
        oldValue: "open",
        senderLoginId: "owner",
      },
      {
        createdLabel: "now",
        eventType: "ISSUE_LABEL_CHANGED",
        id: 18,
        kind: "event",
        newValue: "bug",
        oldValue: "",
        senderLoginId: "owner",
      },
      {
        createdLabel: "now",
        eventType: "ISSUE_ASSIGNEE_CHANGED",
        id: 20,
        kind: "event",
        newValue: "2",
        oldValue: "",
        senderLabel: "Owner User",
        senderLoginId: "owner",
        targetLabel: "Assignee User",
        targetLoginId: "assignee",
      },
      {
        createdLabel: "now",
        eventType: "ISSUE_BODY_CHANGED",
        id: 19,
        kind: "event",
        newValue: "new body",
        oldValue: "old body",
        senderLoginId: "owner",
      },
    ],
  });
  const requests: Array<{ body: unknown; csrfToken: string; method: string; path: string }> = [];

  const record = (
    request: Parameters<Page["route"]>[1] extends (route: infer R) => unknown
      ? R extends { request: () => infer Request }
        ? Request
        : never
      : never,
  ) => {
    const url = new URL(request.url());
    requests.push({
      body: ["POST", "PUT"].includes(request.method()) ? request.postDataJSON() : null,
      csrfToken: request.headers()["x-csrf-token"] ?? "",
      method: request.method(),
      path: url.pathname.replace("/yona/api/v1", ""),
    });
  };

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1"), async (route) => {
    const request = route.request();
    if (request.method() === "DELETE") {
      record(request);
      await route.fulfill({ body: "{}", headers: restJsonHeaders, status: 200 });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/favorite"),
    async (route) => {
      record(route.request());
      currentIssue = { ...currentIssue, isFavorited: true };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/watch"),
    async (route) => {
      record(route.request());
      currentIssue = { ...currentIssue, isWatching: route.request().method() === "POST" };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/vote"),
    async (route) => {
      record(route.request());
      currentIssue = {
        ...currentIssue,
        hasVoted: route.request().method() === "POST",
        voterCount: route.request().method() === "POST" ? 1 : 0,
      };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/sharable-users?*"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [{ loginId: "door", type: "user", userId: "9", userLabel: "Door" }],
          truncated: false,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/issues/1/sharers"),
    async (route) => {
      record(route.request());
      currentIssue = {
        ...currentIssue,
        sharers: [{ loginId: "door", userId: "9", userLabel: "Door" }],
      };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/mass-update"), async (route) => {
    record(route.request());
    const body = route.request().postDataJSON() as {
      dueDate?: string;
      milestoneId?: string;
    };
    currentIssue = {
      ...currentIssue,
      dueDateLabel: body.dueDate ?? currentIssue.dueDateLabel,
      milestoneId: body.milestoneId ?? currentIssue.milestoneId,
      milestoneTitle: body.milestoneId === "8" ? "Done" : currentIssue.milestoneTitle,
    };
    await route.fulfill({
      body: JSON.stringify({ items: [] }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1/comments"), async (route) => {
    record(route.request());
    const body = route.request().postDataJSON() as {
      attachmentIds?: string[];
      contentsMarkdown?: string;
      parentCommentId?: number;
    };
    currentIssue = {
      ...currentIssue,
      commentParentLinks: [
        ...(currentIssue.commentParentLinks as Array<{ id: number; parentCommentId: number }>),
        { id: 32, parentCommentId: Number(body.parentCommentId ?? 0) },
      ],
      comments: [
        ...(currentIssue.comments as Array<Record<string, unknown>>),
        {
          authorAvatarUrl: "",
          authorLabel: "Admin",
          authorLoginId: "admin",
          contentsMarkdown: body.contentsMarkdown ?? "",
          createdLabel: "just now",
          id: 32,
          viewerCanDelete: false,
          viewerCanUpdate: false,
          viewerHasVoted: false,
          voterCount: 0,
          voters: [],
        },
      ],
    };
    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/1/comments/30"),
    async (route) => {
      record(route.request());
      currentIssue = {
        ...currentIssue,
        timeline: currentIssue.timeline.filter((item) => item.id !== 30),
      };
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/1/comments/10"),
    async (route) => {
      record(route.request());
      const request = route.request();
      if (request.method() === "PUT") {
        const body = request.postDataJSON() as {
          attachmentIds?: string[];
          contentsMarkdown?: string;
        };
        currentIssue = {
          ...currentIssue,
          timeline: currentIssue.timeline.map((item) =>
            item.id === 10 && "comment" in item
              ? {
                  ...item,
                  comment: {
                    ...item.comment,
                    contentsMarkdown: body.contentsMarkdown ?? item.comment.contentsMarkdown,
                  },
                }
              : item,
          ),
        };
      }
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.locator("#helpKeys.modal.hide.fade.keymap-help")).toHaveCount(1);
  await expect(page.locator("#comment-delete-modal.modal.hide.fade")).toHaveCount(1);
  await expect(page.locator(".voter-list-wrap .voter-list > li")).toHaveCount(4);
  await expect(page.locator(".voter-list-wrap .avatar-wrap.smaller")).toHaveCount(3);
  await expect(page.locator('.voter-list-wrap a[href="#voters"][data-toggle="modal"]')).toHaveText(
    "and 1 others",
  );
  await expect(page.locator("#voters.modal.hide.voters-dialog")).toHaveCount(1);
  await expect(page.locator("#voters .modal-header .close")).toHaveAttribute(
    "data-dismiss",
    "modal",
  );
  await expect(page.locator("#voters .modal-header h5.nm")).toHaveText(
    "People who agree with this",
  );
  await expect(page.locator("#voters .modal-body ul.unstyled > li")).toHaveCount(4);
  await expect(page.locator("#voters .modal-body .usf-group").first()).toHaveAttribute(
    "href",
    "/yona/admin",
  );
  await expect(page.locator("#voters .modal-body .usf-group").first()).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator("#voters .modal-body .name").first()).toHaveText("Admin");
  await expect(page.locator("#voters .modal-body .loginid").first()).toContainText("@admin");
  await expect(page.locator('#voters .modal-footer .ybtn[data-dismiss="modal"]')).toHaveText(
    "Close",
  );

  const voterListWrap = await layoutBox(page, ".voter-list-wrap");
  const voterList = await layoutBox(page, ".voter-list-wrap .voter-list");
  const firstVoterAvatar = await layoutBox(page, ".voter-list-wrap .avatar-wrap.smaller");
  const secondVoterAvatar = await layoutBox(
    page,
    ".voter-list-wrap .voter-list > li:nth-child(2) .avatar-wrap.smaller",
  );
  const voterMore = await layoutBox(page, '.voter-list-wrap a[href="#voters"]');
  const voterStripStyles = await page.locator(".voter-list-wrap").evaluate((element) => {
    const list = element.querySelector(".voter-list") as HTMLElement;
    const item = list.querySelector("li") as HTMLElement;
    const avatar = list.querySelector(".avatar-wrap.smaller") as HTMLElement;
    const more = list.querySelector('a[href="#voters"]') as HTMLElement;
    const wrapStyle = window.getComputedStyle(element);
    const listStyle = window.getComputedStyle(list);
    const itemStyle = window.getComputedStyle(item);
    const avatarStyle = window.getComputedStyle(avatar);
    const moreStyle = window.getComputedStyle(more);
    return {
      avatarDisplay: avatarStyle.display,
      avatarHeight: avatarStyle.height,
      avatarWidth: avatarStyle.width,
      itemDisplay: itemStyle.display,
      listDisplay: listStyle.display,
      listMarginBottom: listStyle.marginBottom,
      moreDisplay: moreStyle.display,
      moreFontSize: moreStyle.fontSize,
      wrapDisplay: wrapStyle.display,
    };
  });

  expect(voterList.x).toBeGreaterThanOrEqual(voterListWrap.x);
  expect(firstVoterAvatar.x).toBeGreaterThanOrEqual(voterList.x);
  expect(secondVoterAvatar.x).toBeCloseTo(firstVoterAvatar.x, 0);
  expect(secondVoterAvatar.y).toBeGreaterThan(firstVoterAvatar.y + firstVoterAvatar.height - 1);
  expect(voterMore.x).toBeGreaterThanOrEqual(voterList.x);
  expect(voterMore.x + voterMore.width).toBeLessThanOrEqual(voterList.x + voterList.width + 1);
  expect(voterMore.y).toBeGreaterThan(secondVoterAvatar.y);
  expect(voterStripStyles).toEqual({
    avatarDisplay: "inline-block",
    avatarHeight: "20px",
    avatarWidth: "20px",
    itemDisplay: "list-item",
    listDisplay: "block",
    listMarginBottom: "13px",
    moreDisplay: "inline",
    moreFontSize: "13px",
    wrapDisplay: "block",
  });

  await page.locator("#voters").evaluate((element) => {
    element.classList.remove("hide");
    element.classList.add("in");
  });
  await expect(page.locator("#voters.modal.voters-dialog.in")).toBeVisible();
  const votersModal = await layoutBox(page, "#voters");
  const votersHeader = await layoutBox(page, "#voters .modal-header");
  const votersTitle = await layoutBox(page, "#voters .modal-header h5");
  const votersClose = await layoutBox(page, "#voters .modal-header .close");
  const votersBody = await layoutBox(page, "#voters .modal-body");
  const votersFirstRow = await layoutBox(page, "#voters .modal-body li:nth-child(1)");
  const votersFirstLink = await layoutBox(page, "#voters .modal-body li:nth-child(1) .usf-group");
  const votersFirstAvatar = await layoutBox(
    page,
    "#voters .modal-body li:nth-child(1) .avatar-wrap.mlarge",
  );
  const votersFirstName = await layoutBox(page, "#voters .modal-body li:nth-child(1) .name");
  const votersFirstLogin = await layoutBox(page, "#voters .modal-body li:nth-child(1) .loginid");
  const votersSecondRow = await layoutBox(page, "#voters .modal-body li:nth-child(2)");
  const votersFooter = await layoutBox(page, "#voters .modal-footer");
  const votersFooterClose = await layoutBox(
    page,
    '#voters .modal-footer .ybtn[data-dismiss="modal"]',
  );
  const votersViewportCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);
  const votersModalStyles = await page.locator("#voters").evaluate((element) => {
    const modalStyle = window.getComputedStyle(element);
    const header = element.querySelector(".modal-header") as HTMLElement;
    const body = element.querySelector(".modal-body") as HTMLElement;
    const footer = element.querySelector(".modal-footer") as HTMLElement;
    const row = element.querySelector(".modal-body li") as HTMLElement;
    const avatar = element.querySelector(".avatar-wrap.mlarge") as HTMLElement;
    const headerStyle = window.getComputedStyle(header);
    const bodyStyle = window.getComputedStyle(body);
    const footerStyle = window.getComputedStyle(footer);
    const rowStyle = window.getComputedStyle(row);
    const avatarStyle = window.getComputedStyle(avatar);
    return {
      avatarDisplay: avatarStyle.display,
      avatarHeight: avatarStyle.height,
      avatarWidth: avatarStyle.width,
      backgroundColor: modalStyle.backgroundColor,
      bodyPaddingLeft: bodyStyle.paddingLeft,
      footerDisplay: footerStyle.display,
      footerJustifyContent: footerStyle.justifyContent,
      headerBorderBottomWidth: headerStyle.borderBottomWidth,
      headerDisplay: headerStyle.display,
      position: modalStyle.position,
      rowDisplay: rowStyle.display,
      zIndex: modalStyle.zIndex,
    };
  });

  expect(votersModal.width).toBeGreaterThanOrEqual(470);
  expect(votersModal.width).toBeLessThanOrEqual(490);
  expect(
    Math.abs(votersModal.x + votersModal.width / 2 - votersViewportCenter),
  ).toBeLessThanOrEqual(2);
  expect(votersHeader.y).toBeCloseTo(votersModal.y + 1, 0);
  expect(votersClose.x).toBeGreaterThan(votersTitle.x + votersTitle.width);
  expect(votersBody.y).toBeGreaterThan(votersHeader.y + votersHeader.height - 1);
  expect(votersFirstRow.y).toBeGreaterThanOrEqual(votersBody.y);
  expect(votersFirstLink.x).toBeGreaterThanOrEqual(votersFirstRow.x);
  expect(votersFirstAvatar.x).toBeGreaterThanOrEqual(votersFirstLink.x);
  expect(votersFirstName.x).toBeGreaterThan(votersFirstAvatar.x + votersFirstAvatar.width - 1);
  expect(votersFirstLogin.x).toBeGreaterThan(votersFirstName.x + votersFirstName.width - 1);
  expect(votersSecondRow.y).toBeGreaterThan(votersFirstRow.y + votersFirstRow.height - 1);
  expect(votersFooter.y).toBeGreaterThan(votersBody.y + votersBody.height - 1);
  expect(votersFooterClose.x).toBeGreaterThan(votersFooter.x + votersFooter.width / 2);
  expect(votersModalStyles).toEqual({
    avatarDisplay: "inline-block",
    avatarHeight: "32px",
    avatarWidth: "32px",
    backgroundColor: "rgb(255, 255, 255)",
    bodyPaddingLeft: "16px",
    footerDisplay: "flex",
    footerJustifyContent: "flex-end",
    headerBorderBottomWidth: "1px",
    headerDisplay: "flex",
    position: "fixed",
    rowDisplay: "list-item",
    zIndex: "1000",
  });
  await page.locator("#voters").evaluate((element) => {
    element.classList.add("hide");
    element.classList.remove("in");
  });

  await expect(page.locator("#issue-body-1 .tasklist.task-show")).toBeVisible();
  await expect(page.locator("#issue-body-1 .task-title")).toContainText("Tasks(1/2)");
  await expect(page.locator("#issue-body-1 .task-progress .bar.red")).toHaveAttribute(
    "title",
    "Tasklist",
  );
  await expect(page.locator("#issue-body-1 .task-progress .bar.red")).toHaveAttribute(
    "style",
    "width: 50%;",
  );
  const tasklist = await layoutBox(page, "#issue-body-1 .tasklist.task-show");
  const taskTitle = await layoutBox(page, "#issue-body-1 .task-title");
  const doneCounter = await layoutBox(page, "#issue-body-1 .done-counter");
  const taskProgress = await layoutBox(page, "#issue-body-1 .task-progress");
  const taskProgressBar = await layoutBox(page, "#issue-body-1 .task-progress .bar");
  const taskStyles = await page.locator("#issue-body-1 .tasklist.task-show").evaluate((element) => {
    const tasklistStyle = window.getComputedStyle(element);
    const title = window.getComputedStyle(element.querySelector(".task-title") as HTMLElement);
    const counter = window.getComputedStyle(element.querySelector(".done-counter") as HTMLElement);
    const progress = window.getComputedStyle(
      element.querySelector(".task-progress") as HTMLElement,
    );
    const bar = window.getComputedStyle(
      element.querySelector(".task-progress .bar") as HTMLElement,
    );
    return {
      barBackgroundColor: bar.backgroundColor,
      barHeight: bar.height,
      counterMarginLeft: counter.marginLeft,
      display: tasklistStyle.display,
      paddingLeft: tasklistStyle.paddingLeft,
      paddingRight: tasklistStyle.paddingRight,
      paddingTop: tasklistStyle.paddingTop,
      progressBackgroundColor: progress.backgroundColor,
      titleFontWeight: title.fontWeight,
    };
  });
  expect(taskTitle.x).toBeCloseTo(tasklist.x + 20, 0);
  expect(taskProgress.x).toBeCloseTo(taskTitle.x, 0);
  expect(taskProgress.y).toBeGreaterThan(taskTitle.y + taskTitle.height - 1);
  expect(doneCounter.x).toBeGreaterThan(taskTitle.x);
  expect(taskProgressBar.x).toBeCloseTo(taskProgress.x, 0);
  expect(taskProgressBar.width).toBeCloseTo(taskProgress.width * 0.5, 0);
  expect(taskStyles).toEqual({
    barBackgroundColor: "rgb(255, 0, 0)",
    barHeight: "2px",
    counterMarginLeft: "5px",
    display: "block",
    paddingLeft: "20px",
    paddingRight: "20px",
    paddingTop: "10px",
    progressBackgroundColor: "rgb(212, 212, 212)",
    titleFontWeight: "500",
  });

  await expect(page.locator(".subtasks .parent-issue")).toContainText("#1 Pilot issue - Nori");
  await expect(
    page.locator(".subtasks .child-issue .twoColumeModeTarget:has(.item-name)"),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/2");
  await expect(page.locator(".subtasks .child-issue .item-name")).toContainText(
    "#2 Child pair display issue - Door",
  );
  await expect(page.locator(".subtasks .child-issue .font12.no-border-at-child")).toHaveCount(1);
  await expect(
    page.locator(".subtasks .child-issue .comments-count.comments-count-color"),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/2#comments");
  await expect(
    page.locator(".subtasks .child-issue .comments-count .yobicon-comment2"),
  ).toHaveCount(1);
  await expect(
    page.locator(".subtasks .child-issue .comments-count .count-groups.item-count"),
  ).toHaveText("2");
  await expect(page.locator(".subtasks .child-issue .vote-count.vote-color")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/2#vote",
  );
  await expect(page.locator(".subtasks .child-issue .vote-count .yobicon-hearts")).toHaveCount(1);
  await expect(
    page.locator(".subtasks .child-issue .vote-count .count-groups.item-count.strong"),
  ).toHaveText("1");
  await expect(page.locator('.subtasks .child-issue .issue-label[data-label-id="6"]')).toHaveText(
    "feature",
  );
  await expect(
    page.locator('.subtasks .child-issue .issue-label[data-label-id="6"]'),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issues?state=open&labelIds=6");

  const subtasks = await layoutBox(page, ".subtasks");
  const content = await layoutBox(page, ".issue-detail-page .board-body .content");
  const parentIssue = await layoutBox(page, ".subtasks .parent-issue");
  const delimiter = await layoutBox(page, ".subtasks .parent-issue-delimeter");
  const childIssue = await layoutBox(page, ".subtasks .child-issue");
  const childPairWrap = await layoutBox(page, ".subtasks .child-issue .font12.no-border-at-child");
  const childGroup = await layoutBox(page, ".subtasks .child-issue .item-count-groups");
  const childComment = await layoutBox(page, ".subtasks .child-issue .comments-count");
  const childCommentIcon = await layoutBox(
    page,
    ".subtasks .child-issue .comments-count .count-groups.item-icon",
  );
  const childCommentCount = await layoutBox(
    page,
    ".subtasks .child-issue .comments-count .count-groups.item-count",
  );
  const childVote = await layoutBox(page, ".subtasks .child-issue .vote-count");
  const childVoteIcon = await layoutBox(
    page,
    ".subtasks .child-issue .vote-count .count-groups.item-icon",
  );
  const childVoteCount = await layoutBox(
    page,
    ".subtasks .child-issue .vote-count .count-groups.item-count",
  );
  const childLabel = await layoutBox(
    page,
    '.subtasks .child-issue .issue-label[data-label-id="6"]',
  );
  const childPairStyles = await page
    .locator(".subtasks .child-issue .font12.no-border-at-child")
    .evaluate((element) => {
      const group = element.querySelector(".item-count-groups") as HTMLElement;
      const comment = group.querySelector(".comments-count") as HTMLElement;
      const commentIcon = comment.querySelector(".item-icon") as HTMLElement;
      const commentCount = comment.querySelector(".item-count") as HTMLElement;
      const vote = group.querySelector(".vote-count") as HTMLElement;
      const voteIcon = vote.querySelector(".item-icon") as HTMLElement;
      const voteCount = vote.querySelector(".item-count") as HTMLElement;
      const subtasksElement = element.closest(".subtasks") as HTMLElement;
      const parent = subtasksElement.querySelector(".parent-issue") as HTMLElement;
      const delimiterElement = subtasksElement.querySelector(
        ".parent-issue-delimeter",
      ) as HTMLElement;
      const child = element.closest(".child-issue") as HTMLElement;
      const wrapperStyle = window.getComputedStyle(element);
      const groupStyle = window.getComputedStyle(group);
      const commentStyle = window.getComputedStyle(comment);
      const commentIconStyle = window.getComputedStyle(commentIcon);
      const commentCountStyle = window.getComputedStyle(commentCount);
      const voteStyle = window.getComputedStyle(vote);
      const voteIconStyle = window.getComputedStyle(voteIcon);
      const voteCountStyle = window.getComputedStyle(voteCount);
      const subtasksStyle = window.getComputedStyle(subtasksElement);
      const parentStyle = window.getComputedStyle(parent);
      const delimiterStyle = window.getComputedStyle(delimiterElement);
      const childStyle = window.getComputedStyle(child);
      return {
        childPaddingLeft: childStyle.paddingLeft,
        childPaddingRight: childStyle.paddingRight,
        commentColor: commentStyle.color,
        commentCountFontWeight: commentCountStyle.fontWeight,
        commentCountPaddingRight: commentCountStyle.paddingRight,
        commentIconBorderLeftWidth: commentIconStyle.borderLeftWidth,
        commentIconFontSize: commentIconStyle.fontSize,
        commentIconLineHeight: commentIconStyle.lineHeight,
        commentIconPaddingTop: commentIconStyle.paddingTop,
        delimiterBorderTopStyle: delimiterStyle.borderTopStyle,
        delimiterBorderTopWidth: delimiterStyle.borderTopWidth,
        delimiterMarginTop: delimiterStyle.marginTop,
        groupBorderTopWidth: groupStyle.borderTopWidth,
        groupLineHeight: groupStyle.lineHeight,
        parentFontSize: parentStyle.fontSize,
        subtasksMarginBottom: subtasksStyle.marginBottom,
        subtasksMarginTop: subtasksStyle.marginTop,
        voteColor: voteStyle.color,
        voteCountPaddingRight: voteCountStyle.paddingRight,
        voteIconFontSize: voteIconStyle.fontSize,
        voteIconLineHeight: voteIconStyle.lineHeight,
        voteIconPaddingTop: voteIconStyle.paddingTop,
        voteMarginLeft: voteStyle.marginLeft,
        wrapperFontSize: wrapperStyle.fontSize,
      };
    });
  const childLabelStyles = await page
    .locator('.subtasks .child-issue .issue-label[data-label-id="6"]')
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
      };
    });

  expect(subtasks.y).toBeGreaterThanOrEqual(content.y + content.height + 38);
  expect(parentIssue.x).toBeGreaterThanOrEqual(subtasks.x);
  expect(delimiter.y).toBeGreaterThan(parentIssue.y + parentIssue.height - 1);
  expect(childIssue.y).toBeGreaterThan(delimiter.y);
  expect(childPairWrap.x).toBeGreaterThan(childIssue.x);
  expect(childGroup.x).toBeGreaterThanOrEqual(childPairWrap.x);
  expect(childComment.x).toBeGreaterThanOrEqual(childGroup.x);
  expect(childCommentIcon.x).toBeGreaterThanOrEqual(childComment.x);
  expect(childCommentCount.x).toBeGreaterThan(childCommentIcon.x);
  expect(childVote.x).toBeGreaterThan(childComment.x);
  expect(childVoteIcon.x).toBeGreaterThanOrEqual(childVote.x);
  expect(childVoteCount.x).toBeGreaterThan(childVoteIcon.x);
  expect(childLabel.x).toBeGreaterThan(childPairWrap.x + childPairWrap.width - 1);
  expect(childLabel.y).toBeGreaterThanOrEqual(childIssue.y - 1);
  expect(childCommentIcon.y).toBeLessThanOrEqual(childCommentCount.y + childCommentCount.height);
  expect(childVoteIcon.y).toBeLessThanOrEqual(childVoteCount.y + childVoteCount.height);
  expect(childLabelStyles).toEqual({
    backgroundColor: "rgb(33, 150, 243)",
    boxShadow: "rgb(33, 150, 243) 2px 0px 0px 0px inset",
    color: "rgb(255, 255, 255)",
  });
  expect(childPairStyles).toEqual({
    childPaddingLeft: "3px",
    childPaddingRight: "3px",
    commentColor: "rgb(139, 0, 139)",
    commentCountFontWeight: "400",
    commentCountPaddingRight: "5px",
    commentIconBorderLeftWidth: "0px",
    commentIconFontSize: "9px",
    commentIconLineHeight: "12px",
    commentIconPaddingTop: "2px",
    delimiterBorderTopStyle: "dashed",
    delimiterBorderTopWidth: "1px",
    delimiterMarginTop: "5px",
    groupBorderTopWidth: "0px",
    groupLineHeight: "14px",
    parentFontSize: "16px",
    subtasksMarginBottom: "15px",
    subtasksMarginTop: "40px",
    voteColor: "rgb(243, 108, 34)",
    voteCountPaddingRight: "5px",
    voteIconFontSize: "9px",
    voteIconLineHeight: "12px",
    voteIconPaddingTop: "2px",
    voteMarginLeft: "-5px",
    wrapperFontSize: "12px",
  });

  const keymapTrigger = await layoutBox(page, 'a[href="#helpKeys"][data-toggle="modal"]');
  await page.locator('a[href="#helpKeys"][data-toggle="modal"]').click();
  await expect(page.locator("#helpKeys.modal.fade.keymap-help.in")).toBeVisible();

  const keymapModal = await layoutBox(page, "#helpKeys.keymap-help");
  const keymapRow = await layoutBox(page, "#helpKeys > .row-fluid");
  const projectColumn = await layoutBox(page, "#helpKeys > .row-fluid > .span3");
  const rightColumn = await layoutBox(page, "#helpKeys > .row-fluid > .span9");
  const sectionColumn = await layoutBox(page, "#helpKeys .span9 > .row-fluid > .span5");
  const siteColumn = await layoutBox(page, "#helpKeys .span9 > .row-fluid > .span7");
  const commentShortcut = await layoutBox(page, "#helpKeys .span9 > .row-fluid.mt20 .span12");
  const firstKey = await layoutBox(page, "#helpKeys .span3 .ybtn.ybtn-small");
  const firstLabel = await layoutBox(page, "#helpKeys .span3 .help-inline");
  const actionRow = await layoutBox(page, "#helpKeys .actrow");
  const confirm = await layoutBox(page, "#helpKeys .actrow .ybtn-info");
  const viewportCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);

  expect(keymapTrigger.x).toBeGreaterThanOrEqual(55);
  expect(keymapModal.width).toBeGreaterThanOrEqual(680);
  expect(keymapModal.width).toBeLessThanOrEqual(690);
  expect(Math.abs(keymapModal.x + keymapModal.width / 2 - viewportCenter)).toBeLessThanOrEqual(24);
  expect(keymapRow.x).toBeGreaterThanOrEqual(keymapModal.x + 20);
  expect(projectColumn.x).toBeCloseTo(keymapRow.x, 0);
  expect(rightColumn.x).toBeGreaterThan(projectColumn.x + projectColumn.width - 1);
  expect(sectionColumn.x).toBeCloseTo(rightColumn.x, 0);
  expect(siteColumn.x).toBeGreaterThan(sectionColumn.x + sectionColumn.width - 1);
  expect(commentShortcut.y).toBeGreaterThan(sectionColumn.y + sectionColumn.height - 1);
  expect(firstLabel.x).toBeGreaterThan(firstKey.x + firstKey.width - 1);
  expect(firstKey.width).toBeGreaterThanOrEqual(20);
  expect(actionRow.y).toBeGreaterThan(keymapRow.y + keymapRow.height - 1);
  expect(
    Math.abs(confirm.x + confirm.width / 2 - (keymapModal.x + keymapModal.width / 2)),
  ).toBeLessThanOrEqual(2);

  await page.locator("#helpKeys .actrow .ybtn-info").click();
  await expect(page.locator("#helpKeys.modal.hide.fade.keymap-help")).toHaveCount(1);

  const fullTimeline = page.locator("section#comments #timeline");
  await expect(fullTimeline.locator("#event-17")).toContainText("Closed");
  await expect(fullTimeline.locator("#event-17")).toContainText("owner closed this issue");
  await expect(fullTimeline.locator("#event-17 a.usf-group")).toHaveAttribute(
    "href",
    "/yona/owner",
  );
  await expect(fullTimeline.locator("#event-18")).toContainText("Added");
  await expect(fullTimeline.locator("#event-18 .issue-label")).toContainText("bug");
  await expect(fullTimeline.locator("#event-20")).toContainText(
    "Owner User assigned this issue to",
  );
  await expect(fullTimeline.locator("#event-20 a.usf-group").nth(1)).toHaveAttribute(
    "href",
    "/yona/assignee",
  );
  await expect(fullTimeline.locator("#event-19")).toHaveCount(0);
  await expect(fullTimeline).not.toContainText("issue.event.");

  await assertLegacyIssueIndexCommentsShellMetrics(page);
  await assertLegacyIssueIndexCommentMetrics(page);
  await assertLegacyIssueCommentsShellMetrics(page);
  await assertLegacyIssueEventTimelineMetrics(page);
  await expect(fullTimeline.locator("#comment-10")).toContainText("Editable comment");
  await assertLegacyIssueCommentRowMetrics(page);
  await fullTimeline.locator("#comment-10").hover();
  await fullTimeline.locator("#comment-10 button:has(.yobicon-edit-2)").click();
  const commentUpdateForm = fullTimeline.locator("#comment-editform-10.comment-update-form");
  await expect(commentUpdateForm).toBeVisible();
  await expect(commentUpdateForm.locator("form")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issue/1/comments/10",
  );
  await expect(commentUpdateForm.locator("form")).toHaveAttribute("method", "post");
  await expect(commentUpdateForm.locator("form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(commentUpdateForm.locator('input[type="hidden"][name="id"]')).toHaveValue("10");
  await expect(commentUpdateForm.locator('[data-toggle="markdown-editor"].mt10')).toHaveCount(1);
  await expect(commentUpdateForm.locator('a[href="#edit-10"][data-mode="edit"]')).toHaveAttribute(
    "data-toggle",
    "tab",
  );
  await expect(
    commentUpdateForm.locator('a[href="#preview-10"][data-mode="preview"]'),
  ).toHaveAttribute("data-toggle", "tab");
  await expect(commentUpdateForm.locator("#edit-10.tab-pane.active")).toHaveCount(1);
  await expect(commentUpdateForm.locator("#preview-10.tab-pane")).toHaveCount(1);
  await expect(commentUpdateForm.locator("#editor-contents-10")).toHaveAttribute(
    "name",
    "contents",
  );
  await expect(commentUpdateForm.locator("#editor-contents-10")).toHaveAttribute(
    "data-editor-mode",
    "update-comment-body",
  );
  await expect(commentUpdateForm.locator("#editor-contents-10")).toHaveAttribute(
    "markdown",
    "true",
  );
  await expect(
    commentUpdateForm.locator(".markdown-preview.markdown-wrap.update-comment-body"),
  ).toHaveCount(1);
  await expect(commentUpdateForm.locator(".upload-drop-here .msg")).toContainText(
    "Drag & Drop files here to upload.",
  );
  await expect(commentUpdateForm.locator(".file-upload__label.ybtn")).toContainText("File upload");
  await expect(
    commentUpdateForm.locator("input.file-upload__input[name=filePath]"),
  ).toHaveAttribute("multiple", "");
  await expect(commentUpdateForm.locator(".send-notification-check")).toHaveAttribute(
    "data-toggle",
    "popover",
  );
  await expect(commentUpdateForm.locator('input[name="notificationMail"]')).toBeChecked();
  await expect(commentUpdateForm.locator(".ybtn.ybtn-cancel")).toHaveAttribute(
    "data-comment-id",
    "10",
  );
  await expect(commentUpdateForm.locator(".ybtn.ybtn-info[type=submit]")).toContainText("Save");
  await expect(commentUpdateForm.locator('input[name="temporaryUploadFiles"]')).toHaveValue("");
  await expect(commentUpdateForm.locator(".preview-10")).toHaveCount(1);
  await expect(commentUpdateForm.locator(".attachment-files")).toHaveCount(1);
  const commentUpdateAttachment = commentUpdateForm.locator(
    ".attachment-files .attached-file.attached-file-marker",
  );
  await expect(commentUpdateAttachment).toHaveCount(1);
  await expect(commentUpdateAttachment).toHaveAttribute("data-name", "legacy-comment.txt");
  await expect(commentUpdateAttachment).toHaveAttribute("data-href", "/yona/files/710");
  await expect(commentUpdateAttachment).toHaveAttribute("data-mime", "text/plain");
  await expect(commentUpdateAttachment.locator("i.mimetype")).toHaveCount(1);
  await expect(commentUpdateAttachment.locator("strong.name")).toHaveText("legacy-comment.txt");
  await expect(commentUpdateAttachment.locator("span.size")).toHaveText("2 KB");
  await expect(
    commentUpdateAttachment.locator("button.btn-transparent.btn-delete"),
  ).toHaveAttribute("data-id", "710");
  await expect(commentUpdateForm.locator("div#upload-10")).toHaveAttribute(
    "data-resourcetype",
    "ISSUE_COMMENT",
  );
  await expect(commentUpdateForm.locator("div#upload-10")).toHaveAttribute("data-resourceid", "10");

  const commentUpdateBox = await layoutBox(page, "#comment-editform-10 .write-comment-box");
  const commentUpdateWrap = await layoutBox(page, "#comment-editform-10 .write-comment-wrap");
  const commentUpdateEditor = await layoutBox(page, "#comment-editform-10 #editor-contents-10");
  const commentUpdateActionRow = await layoutBox(
    page,
    "#comment-editform-10 .comment-update-button.upload-button-line",
  );
  const commentUpdateUploadLabel = await layoutBox(
    page,
    "#comment-editform-10 .file-upload__label",
  );
  const commentUpdateCancel = await layoutBox(page, "#comment-editform-10 .ybtn-cancel");
  const commentUpdateSave = await layoutBox(page, "#comment-editform-10 .ybtn-info");
  const commentUpdateAttachmentFiles = await layoutBox(
    page,
    "#comment-editform-10 .attachment-files",
  );
  const commentUpdateAttachedFile = await layoutBox(
    page,
    "#comment-editform-10 .attached-file-marker",
  );
  const commentUpdateAttachedName = await layoutBox(
    page,
    "#comment-editform-10 .attached-file-marker .name",
  );
  const commentUpdateAttachedSize = await layoutBox(
    page,
    "#comment-editform-10 .attached-file-marker .size",
  );
  const commentUpdateAttachedDelete = await layoutBox(
    page,
    "#comment-editform-10 .attached-file-marker .btn-delete",
  );
  const commentUpdateStyles = await commentUpdateForm.evaluate((element) => {
    const formStyle = window.getComputedStyle(element);
    const attachedFile = window.getComputedStyle(
      element.querySelector(".attached-file-marker") as HTMLElement,
    );
    const attachmentFiles = window.getComputedStyle(
      element.querySelector(".attachment-files") as HTMLElement,
    );
    const textareaBox = window.getComputedStyle(
      element.querySelector(".textarea-box") as HTMLElement,
    );
    const textarea = window.getComputedStyle(element.querySelector("textarea") as HTMLElement);
    const actionRow = window.getComputedStyle(
      element.querySelector(".comment-update-button") as HTMLElement,
    );
    const dropOverlay = window.getComputedStyle(
      element.querySelector(".upload-drop-here") as HTMLElement,
    );
    return {
      actionRowTextAlign: actionRow.textAlign,
      attachedFileBackgroundColor: attachedFile.backgroundColor,
      attachedFileBorderTopColor: attachedFile.borderTopColor,
      attachedFileDisplay: attachedFile.display,
      attachedFileHeight: attachedFile.height,
      attachedFileLineHeight: attachedFile.lineHeight,
      attachedFileMarginLeft: attachedFile.marginLeft,
      attachedFilePaddingLeft: attachedFile.paddingLeft,
      attachmentFilesBorderTopColor: attachmentFiles.borderTopColor,
      display: formStyle.display,
      dropOverlayDisplay: dropOverlay.display,
      textareaBoxMarginBottom: textareaBox.marginBottom,
      textareaBoxPaddingRight: textareaBox.paddingRight,
      textareaHeight: textarea.height,
      textareaResize: textarea.resize,
    };
  });
  expect(commentUpdateWrap.x).toBeGreaterThanOrEqual(commentUpdateBox.x);
  expect(commentUpdateEditor.y).toBeGreaterThan(commentUpdateWrap.y);
  expect(commentUpdateActionRow.y).toBeGreaterThan(
    commentUpdateEditor.y + commentUpdateEditor.height - 1,
  );
  expect(commentUpdateUploadLabel.x).toBeGreaterThanOrEqual(commentUpdateActionRow.x);
  expect(commentUpdateCancel.x).toBeGreaterThan(commentUpdateUploadLabel.x);
  expect(commentUpdateSave.x).toBeGreaterThan(commentUpdateCancel.x);
  expect(commentUpdateAttachmentFiles.y).toBeGreaterThan(commentUpdateActionRow.y);
  expect(commentUpdateAttachedFile.x).toBeGreaterThanOrEqual(commentUpdateAttachmentFiles.x);
  expect(commentUpdateAttachedName.x).toBeGreaterThan(commentUpdateAttachedFile.x);
  expect(commentUpdateAttachedSize.x).toBeGreaterThan(commentUpdateAttachedName.x);
  expect(commentUpdateAttachedDelete.x).toBeGreaterThan(commentUpdateAttachedSize.x);
  expect(commentUpdateStyles).toEqual({
    actionRowTextAlign: "right",
    attachedFileBackgroundColor: "rgb(250, 250, 250)",
    attachedFileBorderTopColor: "rgb(204, 204, 204)",
    attachedFileDisplay: "inline-block",
    attachedFileHeight: "30px",
    attachedFileLineHeight: "30px",
    attachedFileMarginLeft: "4px",
    attachedFilePaddingLeft: "10px",
    attachmentFilesBorderTopColor: "rgb(221, 221, 221)",
    display: "block",
    dropOverlayDisplay: "none",
    textareaBoxMarginBottom: "10px",
    textareaBoxPaddingRight: "2px",
    textareaHeight: "160px",
    textareaResize: "vertical",
  });

  await commentUpdateForm.locator("#editor-contents-10").fill("Edited **comment**");
  await commentUpdateForm.locator("form").evaluate((element) => {
    (element as HTMLFormElement).requestSubmit();
  });
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/1/comments/10" &&
          request.method === "PUT" &&
          (request.body as { contentsMarkdown?: string }).contentsMarkdown === "Edited **comment**",
      ),
    )
    .toBe(true);

  await expect(fullTimeline.locator("#comment-30")).toContainText("Delete target comment");
  await expect(fullTimeline.locator("#comment-30 .child-comments > #comment-31")).toHaveCount(1);
  await expect(fullTimeline.locator("#comment-30 .child-comments .one-line-comment")).toContainText(
    "Child anchor target",
  );
  await expect(
    fullTimeline.locator('#comment-30 .child-comments a.ago[href="#comment-31"]'),
  ).toHaveAttribute("title", "just now");
  await expect(
    fullTimeline.locator(
      '#comment-30 .child-comments .deleteButtonX[data-toggle="comment-delete"]',
    ),
  ).toHaveAttribute("data-request-uri", "/yona/admin/projectYobi/issue/1/comment/31/delete");
  await expect(fullTimeline.locator("#comment-30 .add-a-comment.pull-right")).toContainText(
    "Reply",
  );
  await expect(fullTimeline.locator("#comment-30 .child-comment-input-form form")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issue/1/comments",
  );
  await expect(fullTimeline.locator("#comment-30 .child-comment-input-form form")).toHaveAttribute(
    "method",
    "post",
  );
  await expect(fullTimeline.locator("#comment-30 .child-comment-input-form form")).toHaveAttribute(
    "enctype",
    "multipart/form-data",
  );
  await expect(
    fullTimeline.locator('#comment-30 .child-comment-input-form input[name="parentCommentId"]'),
  ).toHaveValue("30");
  await expect(
    fullTimeline.locator('#comment-30 .child-comment-input-form textarea[name="contents"]'),
  ).toHaveAttribute("placeholder", "Reply (CTRL + ENTER)");
  await expect(
    fullTimeline.locator('#comment-30 .child-comment-input-form textarea[name="contents"]'),
  ).toHaveAttribute("markdown", "true");
  await expect(
    fullTimeline.locator("#comment-30 .child-comment-input-form .ybtn.ybtn-success"),
  ).toHaveAttribute("data-legacy-label", "OK");
  await expect(
    fullTimeline.locator(
      '#comment-30 .child-comment-input-form .ybtn.ybtn-success span[aria-hidden="true"]',
    ),
  ).toHaveText("OK");
  await expect(
    fullTimeline.locator("#comment-30 .child-comment-input-form .notification-receiver-title"),
  ).toContainText("Notification receivers");

  const subcommentBody = await layoutBox(page, "#comment-30 .subcomment-media-body");
  const childComments = await layoutBox(page, "#comment-30 .child-comments");
  const childAnchor = await layoutBox(page, "#comment-30 .child-comments > #comment-31");
  const childOneLine = await layoutBox(page, "#comment-30 .child-comments .one-line-comment");
  const childContents = await layoutBox(
    page,
    "#comment-30 .child-comments .one-line-comment .contents",
  );
  const childForm = await page.locator("#comment-30 .child-comment-input-form").boundingBox();
  expect(childForm, "hidden child comment form should not reserve visible layout").toBeNull();
  const childCommentStyles = await page
    .locator("#comment-30 .subcomment-media-body")
    .evaluate((element) => {
      const bodyStyle = window.getComputedStyle(element);
      const addCommentElement = element.previousElementSibling as HTMLElement;
      const addCommentStyle = window.getComputedStyle(addCommentElement);
      const contents = element.querySelector(".one-line-comment .contents") as HTMLElement;
      const contentsStyle = window.getComputedStyle(contents);
      const deleteButton = element.querySelector(".deleteButtonX") as HTMLElement;
      const deleteStyle = window.getComputedStyle(deleteButton);
      const inputForm = element.querySelector(".child-comment-input-form") as HTMLElement;
      const inputFormStyle = window.getComputedStyle(inputForm);
      const oneLineBox = inputForm.querySelector(".oneline-comment-box") as HTMLElement;
      const oneLineBoxStyle = window.getComputedStyle(oneLineBox);
      const textarea = element.querySelector("textarea") as HTMLElement;
      const textareaStyle = window.getComputedStyle(textarea);
      const notificationReceiver = inputForm.querySelector(".notification-receiver") as HTMLElement;
      const notificationStyle = window.getComputedStyle(notificationReceiver);
      return {
        addBorderColor: addCommentStyle.borderTopColor,
        addColor: addCommentStyle.color,
        addDisplay: addCommentStyle.display,
        addFontSize: addCommentStyle.fontSize,
        addMarginTop: addCommentStyle.marginTop,
        bodyMarginLeft: bodyStyle.marginLeft,
        bodyTextAlign: bodyStyle.textAlign,
        contentsBorderBottomStyle: contentsStyle.borderBottomStyle,
        contentsBorderBottomWidth: contentsStyle.borderBottomWidth,
        contentsMarginLeft: contentsStyle.marginLeft,
        contentsPaddingBottom: contentsStyle.paddingBottom,
        contentsPaddingLeft: contentsStyle.paddingLeft,
        contentsPaddingTop: contentsStyle.paddingTop,
        deleteAlignItems: deleteStyle.alignItems,
        deleteColor: deleteStyle.color,
        deleteDisplay: deleteStyle.display,
        formDisplay: inputFormStyle.display,
        notificationBackgroundColor: notificationStyle.backgroundColor,
        notificationDisplay: notificationStyle.display,
        notificationMarginLeft: notificationStyle.marginLeft,
        notificationPaddingLeft: notificationStyle.paddingLeft,
        oneLineBoxDisplay: oneLineBoxStyle.display,
        oneLineBoxMarginLeft: oneLineBoxStyle.marginLeft,
        textareaBorderBottomWidth: textareaStyle.borderBottomWidth,
        textareaMarginTop: textareaStyle.marginTop,
        textareaPaddingLeft: textareaStyle.paddingLeft,
        textareaWidth: textareaStyle.width,
      };
    });
  const childAnchorDisplay = await page
    .locator("#comment-30 .child-comments > #comment-31")
    .evaluate((element) => window.getComputedStyle(element).display);
  expect(subcommentBody.x).toBeGreaterThan(childComments.x - 1);
  expect(childAnchorDisplay).toBe("block");
  expect(childAnchor.x).toBeCloseTo(childComments.x, 0);
  expect(childAnchor.width).toBeCloseTo(childComments.width, 0);
  expect(childAnchor.height).toBe(0);
  expect(childAnchor.y).toBeLessThanOrEqual(childOneLine.y);
  expect(childOneLine.y).toBeGreaterThanOrEqual(childAnchor.y);
  expect(childContents.x).toBeGreaterThanOrEqual(childOneLine.x);
  expect(childContents.y).toBeGreaterThanOrEqual(childOneLine.y);
  expect(childCommentStyles).toEqual({
    addBorderColor: "rgb(0, 176, 232)",
    addColor: "rgb(0, 176, 232)",
    addDisplay: "none",
    addFontSize: "12px",
    addMarginTop: "-32px",
    bodyMarginLeft: "60px",
    bodyTextAlign: "right",
    contentsBorderBottomStyle: "dashed",
    contentsBorderBottomWidth: "1px",
    contentsMarginLeft: "12px",
    contentsPaddingBottom: "4px",
    contentsPaddingLeft: "10px",
    contentsPaddingTop: "5px",
    deleteAlignItems: "center",
    deleteColor: "rgb(255, 0, 0)",
    deleteDisplay: "inline-flex",
    formDisplay: "none",
    notificationBackgroundColor: "rgb(247, 247, 247)",
    notificationDisplay: "none",
    notificationMarginLeft: "12px",
    notificationPaddingLeft: "10px",
    oneLineBoxDisplay: "flex",
    oneLineBoxMarginLeft: "12px",
    textareaBorderBottomWidth: "1px",
    textareaMarginTop: "5px",
    textareaPaddingLeft: "10px",
    textareaWidth: "100%",
  });

  await page
    .locator('#comment-30 .child-comment-input-form textarea[name="contents"]')
    .evaluate((element) => {
      const textarea = element as HTMLTextAreaElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
      setter?.call(textarea, "Nested **reply**");
      textarea.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
    });
  await page
    .locator("#comment-30 .child-comment-input-form form")
    .evaluate((element) => (element as HTMLFormElement).requestSubmit());
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/1/comments" &&
          (request.body as { contentsMarkdown?: string; parentCommentId?: number })
            .contentsMarkdown === "Nested **reply**" &&
          Number(
            (request.body as { contentsMarkdown?: string; parentCommentId?: number })
              .parentCommentId,
          ) === 30,
      ),
    )
    .toBe(true);

  const commentDeleteTrigger = fullTimeline.locator(
    '#comment-30 [data-toggle="comment-delete"][data-request-uri="/yona/admin/projectYobi/issue/1/comment/30/delete"]',
  );
  await expect(commentDeleteTrigger).toHaveAttribute("title", "Delete comment");
  await expect(commentDeleteTrigger.locator(".yobicon-trash")).toHaveCount(1);
  const commentDeleteTriggerBox = await layoutBox(
    page,
    '#comment-30 [data-toggle="comment-delete"][data-request-uri="/yona/admin/projectYobi/issue/1/comment/30/delete"]',
  );
  await commentDeleteTrigger.click();
  await expect(page.locator("#comment-delete-modal.modal.hide.fade.in")).toBeVisible();
  await expect(page.locator("#comment-delete-modal .modal-header h3")).toContainText(
    "Delete comment",
  );
  await expect(page.locator("#comment-delete-modal .modal-body p")).toContainText("won't");
  await expect(page.locator("#comment-delete-confirm")).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/issue/1/comment/30/delete",
  );

  const commentDeleteModal = await layoutBox(page, "#comment-delete-modal");
  const commentDeleteHeader = await layoutBox(page, "#comment-delete-modal .modal-header");
  const commentDeleteTitle = await layoutBox(page, "#comment-delete-modal .modal-header h3");
  const commentDeleteClose = await layoutBox(page, "#comment-delete-modal .modal-header .close");
  const commentDeleteBody = await layoutBox(page, "#comment-delete-modal .modal-body");
  const commentDeleteFooter = await layoutBox(page, "#comment-delete-modal .modal-footer");
  const commentDeleteYes = await layoutBox(page, "#comment-delete-confirm");
  const commentDeleteNo = await layoutBox(
    page,
    '#comment-delete-modal .modal-footer .ybtn[data-dismiss="modal"]',
  );
  const commentDeleteViewportCenter = await page.evaluate(
    () => document.documentElement.clientWidth / 2,
  );
  const commentDeleteStyles = await page.locator("#comment-delete-modal").evaluate((element) => {
    const modalStyle = window.getComputedStyle(element);
    const headerStyle = window.getComputedStyle(
      element.querySelector(".modal-header") as HTMLElement,
    );
    const bodyStyle = window.getComputedStyle(element.querySelector(".modal-body") as HTMLElement);
    const footerStyle = window.getComputedStyle(
      element.querySelector(".modal-footer") as HTMLElement,
    );
    return {
      backgroundColor: modalStyle.backgroundColor,
      bodyPaddingLeft: bodyStyle.paddingLeft,
      borderTopColor: footerStyle.borderTopColor,
      footerDisplay: footerStyle.display,
      footerJustifyContent: footerStyle.justifyContent,
      footerPaddingLeft: footerStyle.paddingLeft,
      headerBorderBottomWidth: headerStyle.borderBottomWidth,
      headerPaddingLeft: headerStyle.paddingLeft,
      position: modalStyle.position,
      zIndex: modalStyle.zIndex,
    };
  });

  expect(commentDeleteModal.width).toBeGreaterThanOrEqual(470);
  expect(commentDeleteModal.width).toBeLessThanOrEqual(490);
  expect(
    Math.abs(commentDeleteModal.x + commentDeleteModal.width / 2 - commentDeleteViewportCenter),
  ).toBeLessThanOrEqual(2);
  expect(commentDeleteModal.y).toBeGreaterThanOrEqual(120);
  expect(commentDeleteModal.y).toBeLessThanOrEqual(150);
  expect(commentDeleteHeader.y).toBeCloseTo(commentDeleteModal.y + 1, 0);
  expect(commentDeleteBody.y).toBeGreaterThan(
    commentDeleteHeader.y + commentDeleteHeader.height - 1,
  );
  expect(commentDeleteFooter.y).toBeGreaterThan(commentDeleteBody.y + commentDeleteBody.height - 1);
  expect(commentDeleteClose.x).toBeGreaterThan(commentDeleteTitle.x + commentDeleteTitle.width);
  expect(commentDeleteYes.x).toBeGreaterThan(commentDeleteFooter.x + 300);
  expect(commentDeleteNo.x).toBeGreaterThan(commentDeleteYes.x + commentDeleteYes.width - 1);
  expect(commentDeleteTriggerBox.y).toBeGreaterThan(commentDeleteModal.y);
  expect(commentDeleteStyles).toEqual({
    backgroundColor: "rgb(255, 255, 255)",
    bodyPaddingLeft: "16px",
    borderTopColor: "rgb(221, 221, 221)",
    footerDisplay: "flex",
    footerJustifyContent: "flex-end",
    footerPaddingLeft: "16px",
    headerBorderBottomWidth: "1px",
    headerPaddingLeft: "16px",
    position: "fixed",
    zIndex: "1000",
  });

  await page.locator('#comment-delete-modal .modal-footer .ybtn[data-dismiss="modal"]').click();
  await expect(page.locator("#comment-delete-modal")).toBeHidden();
  await commentDeleteTrigger.click();
  await page.locator("#comment-delete-confirm").click();
  await expect(fullTimeline.locator("#comment-30")).toHaveCount(0);

  await page.locator(".favorite-issue").click();
  await expect(page.locator(".favorite-issue .star")).toHaveClass(/starred/);
  await page.locator("#watch-button").click();
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "true");
  await page.locator("#vote > a.ybtn").click();
  await expect(page.locator("#vote")).toHaveClass(/voter-exists/);

  await page.locator("#issue-share-button").click();
  await expect(page.locator(".sharer-list")).toBeVisible();
  await page.locator('.sharer-list form input[name="issueSharer"]').fill("door");
  await page.locator(".sharer-list button", { hasText: "Issue Sharing" }).click();
  await expect(page.locator("#sharer-list")).toContainText("Door");

  await page.locator("#milestone").selectOption("8");
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/mass-update" &&
          String((request.body as { milestoneId?: string }).milestoneId) === "8",
      ),
    )
    .toBe(true);
  await page.locator('#issueUpdateForm input[name="dueDate"]').fill("2026-07-08");
  await page.locator('#issueUpdateForm input[name="dueDate"]').blur();
  await expect
    .poll(() =>
      requests.some(
        (request) =>
          request.path === "/projects/admin/projectYobi/issues/mass-update" &&
          (request.body as { dueDate?: string }).dueDate === "2026-07-08",
      ),
    )
    .toBe(true);
  await expect(page.locator("#labelIds")).toBeAttached();
  await expect(page.locator('#labelIds option[value="5"]')).toHaveJSProperty("selected", true);
  await expect(page.locator('#labelIds option[value="6"]')).toHaveText("feature");

  await page.locator('a[href="#deleteConfirm"]').click();
  await expect(page.locator("#deleteConfirm")).toBeVisible();
  await page.locator("#deleteConfirm").getByRole("button", { name: "No" }).click();
  await expect(page.locator("#deleteConfirm")).toBeHidden();
  await page.locator('a[href="#deleteConfirm"]').click();
  await page.locator("#deleteConfirm").getByRole("button", { name: "Yes" }).click();
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/issues$/);

  expect(requests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/favorite",
      }),
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/watch",
      }),
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/vote",
      }),
      expect.objectContaining({
        body: { loginId: "door", targetType: "user" },
        csrfToken: "csrf-123",
        method: "POST",
        path: "/owners/admin/projects/projectYobi/issues/1/sharers",
      }),
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "DELETE",
        path: "/projects/admin/projectYobi/issues/1/comments/30",
      }),
      expect.objectContaining({
        csrfToken: "csrf-123",
        method: "DELETE",
        path: "/projects/admin/projectYobi/issues/1",
      }),
    ]),
  );
});

test("issue comment editor inserts pasted and dropped image uploads before REST submit", async ({
  page,
}) => {
  let currentIssue = issueDetail();
  const uploadedHeaders: string[] = [];
  let submittedComment: null | { attachmentIds?: string[]; contentsMarkdown?: string } = null;

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedHeaders.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    await route.fulfill({
      body: JSON.stringify({
        id: 930 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "issue-paste.png" : "issue-drop.png",
        size: 8,
        url: `/yona/files/${930 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.route(apiV1Route("/projects/admin/projectYobi/issues/1/comments"), async (route) => {
    submittedComment = route.request().postDataJSON() as {
      attachmentIds?: string[];
      contentsMarkdown?: string;
    };
    currentIssue = issueDetail({
      commentCount: 1,
      timeline: [
        {
          comment: {
            authorAvatarUrl: "",
            authorLabel: "Admin",
            authorLoginId: "admin",
            contentsMarkdown: submittedComment.contentsMarkdown ?? "",
            createdLabel: "now",
            id: 99,
            viewerCanDelete: false,
            viewerCanUpdate: false,
            viewerHasVoted: false,
            voterCount: 0,
            voters: [],
          },
          createdLabel: "now",
          eventType: "",
          id: 99,
          kind: "comment",
          newValue: "",
          oldValue: "",
          senderLoginId: "admin",
        },
      ],
    });
    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.locator("#comment-form")).toHaveAttribute(
    "action",
    "/yona/admin/projectYobi/issue/1/comments",
  );
  await expect(page.locator("#comment-form")).toHaveAttribute("method", "post");
  await expect(page.locator("#comment-form")).toHaveAttribute("enctype", "multipart/form-data");
  await expect(page.locator("#comment-form .write-comment-box")).toHaveCount(1);
  await expect(page.locator('#comment-form [data-toggle="markdown-editor"].mt10')).toHaveCount(1);
  await expect(page.locator('#comment-form a[href="#edit-comment-body"]')).toHaveAttribute(
    "data-toggle",
    "tab",
  );
  await expect(page.locator('#comment-form a[href="#edit-comment-body"]')).toHaveAttribute(
    "data-mode",
    "edit",
  );
  await expect(page.locator('#comment-form a[href="#preview-comment-body"]')).toHaveAttribute(
    "data-toggle",
    "tab",
  );
  await expect(page.locator('#comment-form a[href="#preview-comment-body"]')).toHaveAttribute(
    "data-mode",
    "preview",
  );
  await expect(page.locator("#comment-form .add-task-list-button")).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#comment-form .add-task-list-button .task-list-icon")).toHaveCount(1);
  await expect(page.locator("#comment-form #button-clear-temporary.ybtn-warning")).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#comment-form .editor-notice-label")).toHaveCount(1);
  await expect(page.locator("#comment-form .textarea-box")).toHaveCount(1);
  await expect(page.locator("#comment-form #edit-comment-body.tab-pane.active")).toHaveCount(1);
  await expect(page.locator("#comment-form #preview-comment-body.tab-pane")).toHaveCount(1);
  await expect(page.locator("#editor-contents-comment-body")).toHaveAttribute("name", "contents");
  await expect(page.locator("#editor-contents-comment-body")).toHaveClass(
    /editorSeries content comment nm/,
  );
  await expect(page.locator("#editor-contents-comment-body")).toHaveAttribute(
    "data-editor-mode",
    "comment-body",
  );
  await expect(page.locator("#editor-contents-comment-body")).toHaveAttribute("markdown", "true");
  await expect(page.locator("#preview-comment-body .markdown-preview")).toHaveAttribute(
    "class",
    /markdown-preview markdown-wrap comment-body/,
  );
  await expect(page.locator("#comment-form .temporaryUploadFiles")).toHaveAttribute(
    "name",
    "temporaryUploadFiles",
  );
  await expect(page.locator("#comment-form #upload.upload-wrap.content-footer")).toHaveAttribute(
    "data-resource-type",
    "ISSUE_COMMENT",
  );
  await expect(page.locator("#comment-form #upload .help.help-droppable")).toContainText(
    "Drag & Drop files to attach here or",
  );
  await expect(
    page.locator("#comment-form #upload .nbtn.medium.white.fake-file-wrap"),
  ).toContainText("File upload");
  await expect(page.locator("#comment-form #upload .yobicon-upload")).toHaveCount(1);
  await expect(page.locator("#comment-form #upload input.file[name=filePath]")).toHaveAttribute(
    "multiple",
    "",
  );
  await expect(page.locator("#comment-form #upload .plain")).toContainText("Click upload button");
  await expect(page.locator("#comment-form #upload .help.help-pastable")).toContainText(
    "Paste the clipboard image",
  );
  await expect(page.locator("#comment-form #upload .attached-files.unstyled")).toHaveCount(1);
  await expect(page.locator("#comment-form #upload .right-txt.help")).toContainText(
    "Selected file will be attached when your comment is saved.",
  );
  await expect(page.locator("script#tplAttachedFile")).toHaveAttribute(
    "type",
    "text/x-jquery-tmpl",
  );
  const attachedFileTemplate = await page
    .locator("script#tplAttachedFile")
    .evaluate((element) => element.textContent ?? "");
  expect(attachedFileTemplate).toContain('class="attached-file"');
  expect(attachedFileTemplate).toContain('data-id="${fileId}"');
  expect(attachedFileTemplate).toContain('class="progress upload-progress"');
  expect(attachedFileTemplate).toContain('class="bar orange"');
  expect(attachedFileTemplate).toContain('class="btn-transparent btn-delete pull-right"');
  expect(attachedFileTemplate).toContain('class="pull-right nbtn small white btn-insert"');
  expect(attachedFileTemplate).toContain("Click to post");
  await expect(page.locator("script#tplDropFilesHere")).toHaveAttribute(
    "type",
    "text/x-jquery-tmpl",
  );
  const dropFilesTemplate = await page
    .locator("script#tplDropFilesHere")
    .evaluate((element) => element.textContent ?? "");
  expect(dropFilesTemplate).toContain('class="upload-drop-here"');
  expect(dropFilesTemplate).toContain("Drag & Drop files here to upload.");
  await expect(page.locator("#comment-form #dynamic-comment-btn.ybtn.hidden")).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#comment-form .notification-receiver-title")).toContainText(
    "Notification receivers",
  );

  const commentForm = await layoutBox(page, "#comment-form");
  const writeCommentBox = await layoutBox(page, "#comment-form .write-comment-box");
  const editorTabs = await layoutBox(page, "#comment-form .nav.nav-tabs.nm.small");
  const editorTabContent = await layoutBox(page, "#comment-form .tab-content");
  const editTab = await layoutBox(page, "#comment-form #edit-comment-body");
  const textareaBox = await layoutBox(page, "#comment-form .textarea-box");
  const commentEditor = await layoutBox(page, "#editor-contents-comment-body");
  const uploadWrap = await layoutBox(page, "#comment-form .upload-wrap");
  const uploadAttachWrap = await layoutBox(page, "#comment-form .upload-wrap .attach-wrap");
  const uploadButtonWrap = await layoutBox(page, "#comment-form .upload-wrap .btn-wrap");
  const uploadFakeButton = await layoutBox(page, "#comment-form .fake-file-wrap");
  const uploadPlainText = await layoutBox(page, "#comment-form .upload-wrap .plain");
  const writeCommentWrap = await layoutBox(page, "#comment-form .write-comment-wrap");
  const submitButton = await layoutBox(page, "#comment-form .ybtn.ybtn-success[type=submit]");
  const commentFormStyles = await page.locator("#comment-form").evaluate((element) => {
    const writeBox = element.querySelector(".write-comment-box") as HTMLElement;
    const writeBoxStyle = window.getComputedStyle(writeBox);
    const textareaBoxElement = element.querySelector(".textarea-box") as HTMLElement;
    const textareaBoxStyle = window.getComputedStyle(textareaBoxElement);
    const textarea = element.querySelector("textarea.comment") as HTMLElement;
    const textareaStyle = window.getComputedStyle(textarea);
    const tabContent = element.querySelector(".tab-content") as HTMLElement;
    const tabContentStyle = window.getComputedStyle(tabContent);
    const editTab = element.querySelector("#edit-comment-body") as HTMLElement;
    const editTabStyle = window.getComputedStyle(editTab);
    const previewTab = element.querySelector("#preview-comment-body") as HTMLElement;
    const previewTabStyle = window.getComputedStyle(previewTab);
    const upload = element.querySelector(".upload-wrap") as HTMLElement;
    const uploadStyle = window.getComputedStyle(upload);
    const helpDroppable = element.querySelector(".help-droppable") as HTMLElement;
    const helpDroppableStyle = window.getComputedStyle(helpDroppable);
    const helpPastable = element.querySelector(".help-pastable") as HTMLElement;
    const helpPastableStyle = window.getComputedStyle(helpPastable);
    const attachWrap = element.querySelector(".attach-wrap") as HTMLElement;
    const attachWrapStyle = window.getComputedStyle(attachWrap);
    const buttonWrap = element.querySelector(".btn-wrap") as HTMLElement;
    const buttonWrapStyle = window.getComputedStyle(buttonWrap);
    const plain = element.querySelector(".upload-wrap .plain") as HTMLElement;
    const plainStyle = window.getComputedStyle(plain);
    const attachedFiles = element.querySelector(".attached-files") as HTMLElement;
    const attachedFilesStyle = window.getComputedStyle(attachedFiles);
    const dynamicButton = element.querySelector("#dynamic-comment-btn") as HTMLElement;
    const dynamicButtonStyle = window.getComputedStyle(dynamicButton);
    const notification = element.querySelector(".notification-receiver") as HTMLElement;
    const notificationStyle = window.getComputedStyle(notification);
    const notificationTitle = element.querySelector(".notification-receiver-title") as HTMLElement;
    const notificationTitleStyle = window.getComputedStyle(notificationTitle);
    return {
      dynamicButtonDisplay: dynamicButtonStyle.display,
      notificationBackgroundColor: notificationStyle.backgroundColor,
      notificationDisplay: notificationStyle.display,
      notificationPaddingLeft: notificationStyle.paddingLeft,
      notificationTitleColor: notificationTitleStyle.color,
      editTabDisplay: editTabStyle.display,
      previewTabDisplay: previewTabStyle.display,
      tabContentOverflow: tabContentStyle.overflow,
      tabContentPosition: tabContentStyle.position,
      textareaBorderBottomLeftRadius: textareaStyle.borderBottomLeftRadius,
      textareaBorderBottomRightRadius: textareaStyle.borderBottomRightRadius,
      textareaBoxPaddingRight: textareaBoxStyle.paddingRight,
      textareaFontSize: textareaStyle.fontSize,
      textareaHeight: textareaStyle.height,
      textareaMarginTop: textareaStyle.marginTop,
      textareaResize: textareaStyle.resize,
      uploadBackgroundColor: uploadStyle.backgroundColor,
      uploadBorderBottomLeftRadius: uploadStyle.borderBottomLeftRadius,
      uploadHelpDroppableDisplay: helpDroppableStyle.display,
      uploadHelpPastableDisplay: helpPastableStyle.display,
      uploadMarginBottom: uploadStyle.marginBottom,
      uploadPaddingTop: uploadStyle.paddingTop,
      uploadAttachedFilesBorderTopWidth: attachedFilesStyle.borderTopWidth,
      uploadAttachedFilesDisplay: attachedFilesStyle.display,
      uploadAttachTextAlign: attachWrapStyle.textAlign,
      uploadButtonWrapDisplay: buttonWrapStyle.display,
      uploadButtonWrapMarginLeft: buttonWrapStyle.marginLeft,
      uploadPlainDisplay: plainStyle.display,
      uploadPlainLineHeight: plainStyle.lineHeight,
      writeBoxPaddingBottom: writeBoxStyle.paddingBottom,
      writeBoxPaddingLeft: writeBoxStyle.paddingLeft,
    };
  });
  const uploaderTemplateStyles = await page.evaluate(() => {
    const host = document.createElement("div");
    host.className = "dragover";
    host.style.position = "relative";
    host.style.width = "320px";
    host.style.height = "120px";
    host.innerHTML =
      '<div class="upload-drop-here"><div class="msg-wrap"><div class="msg">Drop files here to attach them</div></div></div>';
    document.body.append(host);
    const overlay = host.querySelector(".upload-drop-here") as HTMLElement;
    const overlayStyle = window.getComputedStyle(overlay);
    const message = host.querySelector(".msg") as HTMLElement;
    const messageStyle = window.getComputedStyle(message);
    const result = {
      borderTopStyle: overlayStyle.borderTopStyle,
      borderTopWidth: overlayStyle.borderTopWidth,
      bottom: overlayStyle.bottom,
      display: overlayStyle.display,
      left: overlayStyle.left,
      messageColor: messageStyle.color,
      messageFontSize: messageStyle.fontSize,
      messageMarginTop: messageStyle.marginTop,
      pointerEvents: overlayStyle.pointerEvents,
      position: overlayStyle.position,
      right: overlayStyle.right,
      top: overlayStyle.top,
      zIndex: overlayStyle.zIndex,
    };
    host.remove();
    return result;
  });

  expect(writeCommentBox.x).toBeCloseTo(commentForm.x, 0);
  expect(writeCommentBox.y).toBeGreaterThanOrEqual(commentForm.y);
  expect(editorTabs.x).toBeGreaterThanOrEqual(writeCommentBox.x);
  expect(editorTabContent.y).toBeGreaterThan(editorTabs.y + editorTabs.height - 1);
  expect(editTab.y).toBeGreaterThanOrEqual(editorTabContent.y);
  expect(textareaBox.x).toBeCloseTo(editorTabs.x, 0);
  expect(commentEditor.x).toBeGreaterThanOrEqual(textareaBox.x);
  expect(commentEditor.y).toBeGreaterThan(editorTabs.y + editorTabs.height - 1);
  expect(uploadWrap.y).toBeGreaterThan(commentEditor.y + commentEditor.height - 1);
  expect(uploadAttachWrap.x).toBeGreaterThanOrEqual(uploadWrap.x);
  expect(uploadButtonWrap.x).toBeGreaterThan(uploadAttachWrap.x);
  expect(uploadFakeButton.x).toBeCloseTo(uploadButtonWrap.x, 0);
  expect(uploadPlainText.x).toBeGreaterThan(uploadFakeButton.x + uploadFakeButton.width - 1);
  expect(writeCommentWrap.y).toBeGreaterThan(uploadWrap.y + uploadWrap.height - 1);
  expect(submitButton.x).toBeGreaterThan(writeCommentWrap.x);
  expect(submitButton.y).toBeGreaterThanOrEqual(writeCommentWrap.y);
  expect(commentFormStyles).toEqual({
    dynamicButtonDisplay: "none",
    notificationBackgroundColor: "rgb(247, 247, 247)",
    notificationDisplay: "none",
    notificationPaddingLeft: "10px",
    notificationTitleColor: "rgb(153, 153, 153)",
    editTabDisplay: "block",
    previewTabDisplay: "none",
    tabContentOverflow: "visible",
    tabContentPosition: "relative",
    textareaBorderBottomLeftRadius: "3px",
    textareaBorderBottomRightRadius: "3px",
    textareaBoxPaddingRight: "14px",
    textareaFontSize: "13px",
    textareaHeight: "160px",
    textareaMarginTop: "0px",
    textareaResize: "vertical",
    uploadBackgroundColor: "rgb(239, 239, 239)",
    uploadBorderBottomLeftRadius: "5px",
    uploadHelpDroppableDisplay: "inline",
    uploadHelpPastableDisplay: "none",
    uploadMarginBottom: "10px",
    uploadPaddingTop: "10px",
    uploadAttachedFilesBorderTopWidth: "1px",
    uploadAttachedFilesDisplay: "none",
    uploadAttachTextAlign: "center",
    uploadButtonWrapDisplay: "inline-block",
    uploadButtonWrapMarginLeft: "5px",
    uploadPlainDisplay: "inline-block",
    uploadPlainLineHeight: "30px",
    writeBoxPaddingBottom: "15px",
    writeBoxPaddingLeft: "54px",
  });
  expect(uploaderTemplateStyles).toEqual({
    borderTopStyle: "dashed",
    borderTopWidth: "3px",
    bottom: "2px",
    display: "block",
    left: "2px",
    messageColor: "rgb(153, 153, 153)",
    messageFontSize: "26px",
    messageMarginTop: "-13px",
    pointerEvents: "none",
    position: "absolute",
    right: "2px",
    top: "2px",
    zIndex: "9999",
  });

  await expect(page.locator(".markdown-help")).toBeVisible();
  await expect(page.locator(".markdown-help-nav .help-nav")).toHaveCount(10);
  await expect(page.locator(".markdown-help-wrap .markdown-help-item")).toHaveCount(10);

  const markdownHelp = await layoutBox(page, ".markdown-help");
  const markdownNav = await layoutBox(page, ".markdown-help .markdown-help-nav");
  const markdownWrap = await layoutBox(page, ".markdown-help .markdown-help-wrap");
  const headerNav = await layoutBox(
    page,
    '.markdown-help .markdown-help-nav [data-target="markdownHeaders"]',
  );

  expect(markdownNav.y).toBeGreaterThanOrEqual(markdownHelp.y);
  expect(markdownNav.width).toBeCloseTo(markdownHelp.width, 0);
  expect(headerNav.x).toBeGreaterThan(markdownNav.x);
  expect(markdownWrap.y).toBeGreaterThan(markdownNav.y + markdownNav.height - 1);
  await expect(page.locator(".markdown-help-item.markdownHeaders")).not.toHaveClass(/active/);

  await page.locator('.markdown-help .help-nav[data-target="markdownHeaders"] button').click();
  await expect(page.locator(".markdown-help-item.markdownHeaders")).toHaveClass(/active/);
  const activeMarkdownNav = await layoutBox(page, ".markdown-help .markdown-help-nav");
  const activeMarkdownWrap = await layoutBox(page, ".markdown-help .markdown-help-wrap");
  const activeNav = await layoutBox(
    page,
    '.markdown-help .help-nav[data-target="markdownHeaders"]',
  );
  const activeItem = await layoutBox(page, ".markdown-help-item.markdownHeaders.active");
  const inputHeader = await layoutBox(page, ".markdown-help-item.markdownHeaders .thead .span6");
  const outputHeader = await layoutBox(
    page,
    ".markdown-help-item.markdownHeaders .thead .span6:nth-child(2)",
  );
  const inputColumn = await layoutBox(
    page,
    ".markdown-help-item.markdownHeaders .markdwon-syntax-wrap .span6.markdwon-syntax",
  );
  const outputColumn = await layoutBox(
    page,
    ".markdown-help-item.markdownHeaders .markdwon-syntax-wrap > .span6:nth-child(2)",
  );
  const syntaxPre = await layoutBox(page, ".markdown-help-item.markdownHeaders pre");

  expect(activeMarkdownNav.width).toBeCloseTo(markdownNav.width, 0);
  expect(activeMarkdownWrap.width).toBeCloseTo(markdownWrap.width, 0);
  expect(activeNav.x).toBeGreaterThanOrEqual(activeMarkdownNav.x);
  expect(activeNav.x + activeNav.width).toBeLessThanOrEqual(
    activeMarkdownNav.x + activeMarkdownNav.width + 1,
  );
  expect(activeNav.y).toBeGreaterThanOrEqual(activeMarkdownNav.y);
  expect(activeNav.y + activeNav.height).toBeLessThanOrEqual(
    activeMarkdownNav.y + activeMarkdownNav.height + 1,
  );
  expect(activeItem.y).toBeGreaterThanOrEqual(activeMarkdownWrap.y);
  expect(inputHeader.x).toBeCloseTo(inputColumn.x, 0);
  expect(outputHeader.x).toBeCloseTo(outputColumn.x, 0);
  expect(outputHeader.x).toBeGreaterThan(inputHeader.x + inputHeader.width - 1);
  expect(outputColumn.x).toBeGreaterThan(inputColumn.x + inputColumn.width - 1);
  expect(inputColumn.width).toBeCloseTo(outputColumn.width, -1);
  expect(syntaxPre.x).toBeGreaterThanOrEqual(inputColumn.x);
  expect(syntaxPre.width).toBeLessThanOrEqual(inputColumn.width);

  await page.locator('.markdown-help .help-nav[data-target="markdownHeaders"] button').click();
  await expect(page.locator(".markdown-help-item.markdownHeaders")).not.toHaveClass(/active/);

  const editor = page.locator("#editor-contents-comment-body");

  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "issue-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(editor).toHaveValue("![issue-paste.png](/yona/files/931) ");

  await editor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "issue-drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(editor).toHaveValue(
    "![issue-paste.png](/yona/files/931) ![issue-drop.png](/yona/files/932) ",
  );

  await editor.fill("Preview **markdown**");
  await page.locator('a[href="#preview-comment-body"][data-mode="preview"]').click();
  await expect(page.locator("#preview-comment-body .markdown-preview")).toContainText(
    "Preview markdown",
  );
  await expect(page.locator("#preview-comment-body strong")).toHaveText("markdown");

  await page.locator("#comment-form").getByRole("button", { name: "Add a comment" }).click();

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedComment).toEqual({
    attachmentIds: ["931", "932"],
    contentsMarkdown: "Preview **markdown**",
  });
});
