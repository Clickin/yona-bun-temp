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

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ session: null, user: null }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
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
        daysAgo: 14,
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
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 1,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Project issue parity route",
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: false,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/issues(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            assigneeAvatarUrl: "",
            assigneeLabel: "",
            authorLabel: "Nori",
            authorLoginId: "nori",
            childClosedCount: 0,
            childIssues: [],
            childOpenCount: 0,
            commentCount: 3,
            dueDateLabel: "",
            dueDateOverdue: false,
            id: "101",
            issueNumber: "1",
            labels: [{ categoryId: 4, color: "#ffeb3b", id: "7", name: "bright" }],
            milestoneTitle: "",
            ownerName: "admin",
            projectName: "projectYobi",
            state: "open",
            title: "Pilot issue",
            updatedLabel: "2026-04-15",
            voterCount: 1,
            watcherCount: 2,
            weight: 0,
          },
        ],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "projectYobi",
        totalCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/labels"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ labels: [] }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/milestones(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ milestones: [] }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
});

test("issue list shared partials preserve legacy vote count and checkbox metrics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/admin/projectYobi/issues?pageNum=1");

  const twoColumn = page.locator(".issue-list-page .two-column-icon.mr10.hide-in-mobile");
  await expect(twoColumn).toHaveAttribute("id", "two-column-mode-checkbox");
  await expect(twoColumn).toHaveAttribute("title", "Two Column Mode");
  await expect(twoColumn).toHaveAttribute(
    "data-content",
    "Splits list and body into columns respectively",
  );
  await expect(page.locator("#two-column-mode")).toHaveAttribute("type", "checkbox");
  await expect(page.locator(".issue-list-page .two-column-mode-text")).toHaveText("Column View");

  const showSubtasks = page.locator(".issue-list-page .show-subtasks.mr10");
  await expect(showSubtasks).toHaveAttribute("id", "two-column-mode-checkbox");
  await expect(showSubtasks).toHaveAttribute("data-toggle", "popover");
  await expect(showSubtasks).toHaveAttribute("data-trigger", "hover");
  await expect(showSubtasks).toHaveAttribute("data-placement", "top");
  await expect(showSubtasks).toHaveAttribute("title", "Show subtask");
  await expect(showSubtasks).toHaveAttribute("data-content", "Show subtask always");
  await expect(page.locator("#toggle-show-subtasks")).toHaveAttribute("type", "checkbox");
  await expect(page.locator(".issue-list-page .show-subtasks-text")).toHaveText("Show subtask");

  const issueTabsSelector = ".issue-list-page ul.nav.nav-tabs.nm:has(#toggle-show-subtasks)";
  const tabs = await layoutBox(page, issueTabsSelector);
  const closedTab = await layoutBox(page, `${issueTabsSelector} > li:nth-child(2)`);
  const twoColumnLi = await layoutBox(page, `${issueTabsSelector} > li:nth-child(3)`);
  const twoColumnBox = await layoutBox(page, ".issue-list-page .two-column-icon");
  const twoColumnBorder = await layoutBox(page, ".issue-list-page .two-column-icon-border");
  const twoColumnCheckbox = await layoutBox(page, "#two-column-mode");
  const twoColumnText = await layoutBox(page, ".issue-list-page .two-column-mode-text");
  const showSubtasksLi = await layoutBox(page, `${issueTabsSelector} > li.show-subtasks-li`);
  const showSubtasksBox = await layoutBox(page, ".issue-list-page .show-subtasks.mr10");
  const buttonBorder = await layoutBox(page, ".issue-list-page .show-subtasks-button-border");
  const checkbox = await layoutBox(page, "#toggle-show-subtasks");
  const showSubtasksText = await layoutBox(page, ".issue-list-page .show-subtasks-text");
  const showSubtasksStyles = await page
    .locator(".issue-list-page .show-subtasks.mr10")
    .evaluate((element) => {
      const li = element.closest(".show-subtasks-li") as HTMLElement;
      const label = element.querySelector("label") as HTMLElement;
      const border = element.querySelector(".show-subtasks-button-border") as HTMLElement;
      const checkboxElement = element.querySelector("#toggle-show-subtasks") as HTMLElement;
      const text = element.querySelector(".show-subtasks-text") as HTMLElement;
      const wrapperStyle = window.getComputedStyle(element);
      const liStyle = window.getComputedStyle(li);
      const labelStyle = window.getComputedStyle(label);
      const borderStyle = window.getComputedStyle(border);
      const checkboxStyle = window.getComputedStyle(checkboxElement);
      const textStyle = window.getComputedStyle(text);
      return {
        borderBorderRadius: borderStyle.borderRadius,
        borderColor: borderStyle.borderTopColor,
        borderPadding: `${borderStyle.paddingTop} ${borderStyle.paddingRight} ${borderStyle.paddingBottom} ${borderStyle.paddingLeft}`,
        borderTextColor: borderStyle.color,
        checkboxMargin: `${checkboxStyle.marginTop} ${checkboxStyle.marginRight} ${checkboxStyle.marginBottom} ${checkboxStyle.marginLeft}`,
        checkboxMinHeight: checkboxStyle.minHeight,
        checkboxPadding: checkboxStyle.padding,
        checkboxVerticalAlign: checkboxStyle.verticalAlign,
        labelPaddingLeft: labelStyle.paddingLeft,
        labelPaddingTop: labelStyle.paddingTop,
        liMarginLeft: liStyle.marginLeft,
        textLineHeight: textStyle.lineHeight,
        textPaddingRight: textStyle.paddingRight,
        textVerticalAlign: textStyle.verticalAlign,
        wrapperDisplay: wrapperStyle.display,
        wrapperLineHeight: wrapperStyle.lineHeight,
        wrapperMarginLeft: wrapperStyle.marginLeft,
      };
    });
  const twoColumnStyles = await page
    .locator(".issue-list-page .two-column-icon")
    .evaluate((element) => {
      const label = element.querySelector("label") as HTMLElement;
      const border = element.querySelector(".two-column-icon-border") as HTMLElement;
      const checkboxElement = element.querySelector("#two-column-mode") as HTMLElement;
      const text = element.querySelector(".two-column-mode-text") as HTMLElement;
      const wrapperStyle = window.getComputedStyle(element);
      const labelStyle = window.getComputedStyle(label);
      const borderStyle = window.getComputedStyle(border);
      const checkboxStyle = window.getComputedStyle(checkboxElement);
      const textStyle = window.getComputedStyle(text);
      return {
        borderBorderRadius: borderStyle.borderRadius,
        borderColor: borderStyle.borderTopColor,
        borderPadding: `${borderStyle.paddingTop} ${borderStyle.paddingRight} ${borderStyle.paddingBottom} ${borderStyle.paddingLeft}`,
        borderTextColor: borderStyle.color,
        checkboxMargin: `${checkboxStyle.marginTop} ${checkboxStyle.marginRight} ${checkboxStyle.marginBottom} ${checkboxStyle.marginLeft}`,
        checkboxMinHeight: checkboxStyle.minHeight,
        checkboxPadding: checkboxStyle.padding,
        checkboxVerticalAlign: checkboxStyle.verticalAlign,
        labelPaddingLeft: labelStyle.paddingLeft,
        labelPaddingTop: labelStyle.paddingTop,
        textLineHeight: textStyle.lineHeight,
        textPaddingRight: textStyle.paddingRight,
        textVerticalAlign: textStyle.verticalAlign,
        wrapperDisplay: wrapperStyle.display,
        wrapperLineHeight: wrapperStyle.lineHeight,
        wrapperMarginLeft: wrapperStyle.marginLeft,
        wrapperMarginRight: wrapperStyle.marginRight,
      };
    });

  expect(twoColumnLi.x).toBeGreaterThanOrEqual(closedTab.x + closedTab.width);
  expect(twoColumnBox.x).toBeGreaterThanOrEqual(twoColumnLi.x + 9);
  expect(twoColumnBox.y).toBeGreaterThanOrEqual(tabs.y - 1);
  expect(twoColumnBorder.x).toBeGreaterThanOrEqual(twoColumnBox.x);
  expect(twoColumnCheckbox.x).toBeGreaterThanOrEqual(twoColumnBorder.x + 2);
  expect(twoColumnText.x).toBeGreaterThan(twoColumnCheckbox.x + twoColumnCheckbox.width);
  expect(twoColumnText.y).toBeLessThanOrEqual(twoColumnCheckbox.y + twoColumnCheckbox.height + 2);
  expect(twoColumnCheckbox.y).toBeLessThanOrEqual(twoColumnText.y + twoColumnText.height);
  expect(twoColumnText.x + twoColumnText.width).toBeLessThanOrEqual(
    twoColumnBorder.x + twoColumnBorder.width + 1,
  );
  expect(twoColumnStyles).toEqual({
    borderBorderRadius: "3px",
    borderColor: "rgb(3, 175, 255)",
    borderPadding: "3px 3px 0px 3px",
    borderTextColor: "rgb(3, 169, 244)",
    checkboxMargin: "4px 4px 0px 2px",
    checkboxMinHeight: "0px",
    checkboxPadding: "0px",
    checkboxVerticalAlign: "top",
    labelPaddingLeft: "0px",
    labelPaddingTop: "4px",
    textLineHeight: "20px",
    textPaddingRight: "4px",
    textVerticalAlign: "text-bottom",
    wrapperDisplay: "inline-block",
    wrapperLineHeight: "37px",
    wrapperMarginLeft: "10px",
    wrapperMarginRight: "10px",
  });

  expect(showSubtasksLi.x).toBeGreaterThan(twoColumnLi.x);
  expect(showSubtasksLi.x).toBeLessThanOrEqual(twoColumnLi.x + twoColumnLi.width + 1);
  expect(showSubtasksBox.x).toBeGreaterThanOrEqual(showSubtasksLi.x + 9);
  expect(showSubtasksBox.x).toBeLessThanOrEqual(twoColumnBox.x + twoColumnBox.width + 2);
  expect(showSubtasksBox.y).toBeGreaterThanOrEqual(tabs.y - 1);
  expect(buttonBorder.x).toBeGreaterThanOrEqual(showSubtasksBox.x);
  expect(checkbox.x).toBeGreaterThanOrEqual(buttonBorder.x + 2);
  expect(showSubtasksText.x).toBeGreaterThan(checkbox.x + checkbox.width);
  expect(showSubtasksText.y).toBeLessThanOrEqual(checkbox.y + checkbox.height + 2);
  expect(checkbox.y).toBeLessThanOrEqual(showSubtasksText.y + showSubtasksText.height);
  expect(showSubtasksText.x + showSubtasksText.width).toBeLessThanOrEqual(
    buttonBorder.x + buttonBorder.width + 1,
  );
  expect(showSubtasksStyles).toEqual({
    borderBorderRadius: "3px",
    borderColor: "rgb(3, 175, 255)",
    borderPadding: "3px 3px 0px 3px",
    borderTextColor: "rgb(3, 169, 244)",
    checkboxMargin: "4px 4px 0px 2px",
    checkboxMinHeight: "0px",
    checkboxPadding: "0px",
    checkboxVerticalAlign: "top",
    labelPaddingLeft: "0px",
    labelPaddingTop: "4px",
    liMarginLeft: "-18px",
    textLineHeight: "20px",
    textPaddingRight: "4px",
    textVerticalAlign: "text-bottom",
    wrapperDisplay: "inline-block",
    wrapperLineHeight: "37px",
    wrapperMarginLeft: "10px",
  });

  await expect(page.locator("#issue-item-101")).toContainText("Pilot issue");
  await expect(
    page.locator("#issue-item-101 .comments-count.comments-count-color"),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/issue/1#comments");
  await expect(page.locator("#issue-item-101 .comments-count .count-groups.item-icon")).toHaveCount(
    1,
  );
  await expect(page.locator("#issue-item-101 .comments-count .yobicon-comment2")).toHaveCount(1);
  await expect(page.locator("#issue-item-101 .comments-count .count-groups.item-count")).toHaveText(
    "3",
  );
  await expect(
    page.locator("#issue-item-101 .comments-count .count-groups.item-count.strong"),
  ).toHaveCount(0);
  await expect(page.locator('#issue-item-101 .issue-label[data-label-id="7"]')).toHaveText(
    "bright",
  );
  await expect(page.locator('#issue-item-101 .issue-label[data-label-id="7"]')).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issues?orderBy=updatedDate&orderDir=desc&labelIds=7",
  );
  await expect(page.locator("#issue-item-101 .vote-count.vote-color")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/issue/1#vote",
  );
  await expect(page.locator("#issue-item-101 .vote-count .count-groups.item-icon")).toHaveCount(1);
  await expect(page.locator("#issue-item-101 .vote-count .yobicon-hearts")).toHaveCount(1);
  await expect(
    page.locator("#issue-item-101 .vote-count .count-groups.item-count.strong"),
  ).toHaveText("1");
  await expect(page.locator("#issue-item-101 .sharer-color")).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator("#issue-item-101 .sharer-color")).toHaveAttribute(
    "data-placement",
    "bottom",
  );
  await expect(page.locator("#issue-item-101 .sharer-color")).toHaveAttribute(
    "title",
    "Issue Sharer",
  );
  await expect(page.locator("#issue-item-101 .sharer-color .yobicon-friends")).toHaveCount(1);
  await expect(
    page.locator("#issue-item-101 .sharer-color .count-groups.item-count.strong"),
  ).toHaveText("2");
  await expect(
    page
      .locator("#issue-item-101 .sharer-color")
      .evaluate((element) => element.hasAttribute("href")),
  ).resolves.toBe(false);

  const group = await layoutBox(page, "#issue-item-101 .item-count-groups");
  const issueLabel = await layoutBox(page, '#issue-item-101 .issue-label[data-label-id="7"]');
  const commentLink = await layoutBox(page, "#issue-item-101 .comments-count.comments-count-color");
  const commentIcon = await layoutBox(
    page,
    "#issue-item-101 .comments-count .count-groups.item-icon",
  );
  const commentCount = await layoutBox(
    page,
    "#issue-item-101 .comments-count .count-groups.item-count",
  );
  const voteLink = await layoutBox(page, "#issue-item-101 .vote-count.vote-color");
  const voteIcon = await layoutBox(page, "#issue-item-101 .vote-count .count-groups.item-icon");
  const voteCount = await layoutBox(page, "#issue-item-101 .vote-count .count-groups.item-count");
  const sharerLink = await layoutBox(page, "#issue-item-101 .sharer-color");
  const sharerIcon = await layoutBox(page, "#issue-item-101 .sharer-color .count-groups.item-icon");
  const sharerCount = await layoutBox(
    page,
    "#issue-item-101 .sharer-color .count-groups.item-count",
  );
  const countGroupStyles = await page
    .locator("#issue-item-101 .item-count-groups")
    .evaluate((groupElement) => {
      const groupStyle = window.getComputedStyle(groupElement);
      const commentLinkElement = groupElement.querySelector(".comments-count") as HTMLElement;
      const commentIconElement = commentLinkElement.querySelector(".item-icon") as HTMLElement;
      const commentCountElement = commentLinkElement.querySelector(".item-count") as HTMLElement;
      const voteLinkElement = groupElement.querySelector(".vote-count") as HTMLElement;
      const voteIconElement = voteLinkElement.querySelector(".item-icon") as HTMLElement;
      const voteCountElement = voteLinkElement.querySelector(".item-count") as HTMLElement;
      const sharerLinkElement = groupElement.querySelector(".sharer-color") as HTMLElement;
      const sharerIconElement = sharerLinkElement.querySelector(".item-icon") as HTMLElement;
      const sharerCountElement = sharerLinkElement.querySelector(".item-count") as HTMLElement;
      const commentLinkStyle = window.getComputedStyle(commentLinkElement);
      const commentIconStyle = window.getComputedStyle(commentIconElement);
      const commentCountStyle = window.getComputedStyle(commentCountElement);
      const voteLinkStyle = window.getComputedStyle(voteLinkElement);
      const voteIconStyle = window.getComputedStyle(voteIconElement);
      const voteCountStyle = window.getComputedStyle(voteCountElement);
      const sharerLinkStyle = window.getComputedStyle(sharerLinkElement);
      const sharerIconStyle = window.getComputedStyle(sharerIconElement);
      const sharerCountStyle = window.getComputedStyle(sharerCountElement);
      return {
        commentColor: commentLinkStyle.color,
        commentCountFontWeight: commentCountStyle.fontWeight,
        commentCountPaddingRight: commentCountStyle.paddingRight,
        commentIconFontSize: commentIconStyle.fontSize,
        commentIconLineHeight: commentIconStyle.lineHeight,
        commentIconPaddingTop: commentIconStyle.paddingTop,
        groupBorderTopWidth: groupStyle.borderTopWidth,
        groupLineHeight: groupStyle.lineHeight,
        sharerColor: sharerLinkStyle.color,
        sharerCountPaddingRight: sharerCountStyle.paddingRight,
        sharerIconFontSize: sharerIconStyle.fontSize,
        sharerIconLineHeight: sharerIconStyle.lineHeight,
        sharerIconPaddingTop: sharerIconStyle.paddingTop,
        sharerMarginLeft: sharerLinkStyle.marginLeft,
        voteColor: voteLinkStyle.color,
        voteCountPaddingRight: voteCountStyle.paddingRight,
        voteIconFontSize: voteIconStyle.fontSize,
        voteIconLineHeight: voteIconStyle.lineHeight,
        voteIconPaddingTop: voteIconStyle.paddingTop,
        voteMarginLeft: voteLinkStyle.marginLeft,
      };
    });
  const labelStyles = await page
    .locator('#issue-item-101 .issue-label[data-label-id="7"]')
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        boxShadow: style.boxShadow,
        color: style.color,
      };
    });

  expect(commentLink.x).toBeGreaterThanOrEqual(group.x);
  expect(commentLink.y).toBeGreaterThanOrEqual(group.y);
  expect(commentIcon.x).toBeGreaterThanOrEqual(commentLink.x);
  expect(commentCount.x).toBeGreaterThan(commentIcon.x);
  expect(commentIcon.y).toBeLessThanOrEqual(commentCount.y + commentCount.height);
  expect(commentCount.y).toBeLessThanOrEqual(commentIcon.y + commentIcon.height);
  expect(commentCount.x + commentCount.width).toBeLessThanOrEqual(
    commentLink.x + commentLink.width + 1,
  );
  expect(voteLink.x).toBeGreaterThan(commentLink.x);
  expect(voteLink.x).toBeGreaterThanOrEqual(group.x);
  expect(voteLink.y).toBeGreaterThanOrEqual(group.y);
  expect(voteIcon.x).toBeGreaterThanOrEqual(voteLink.x);
  expect(voteCount.x).toBeGreaterThan(voteIcon.x);
  expect(sharerLink.x).toBeGreaterThan(voteLink.x);
  expect(sharerIcon.x).toBeGreaterThanOrEqual(sharerLink.x);
  expect(sharerCount.x).toBeGreaterThan(sharerIcon.x);
  expect(sharerIcon.y).toBeLessThanOrEqual(sharerCount.y + sharerCount.height);
  expect(sharerCount.y).toBeLessThanOrEqual(sharerIcon.y + sharerIcon.height);
  expect(Math.max(voteIcon.y, voteCount.y)).toBeLessThanOrEqual(
    Math.min(voteIcon.y + voteIcon.height, voteCount.y + voteCount.height),
  );
  expect(voteCount.x + voteCount.width).toBeLessThanOrEqual(voteLink.x + voteLink.width + 1);
  expect(sharerCount.x + sharerCount.width).toBeLessThanOrEqual(
    sharerLink.x + sharerLink.width + 1,
  );
  expect(issueLabel.x).toBeGreaterThan(group.x + group.width - 1);
  expect(issueLabel.y).toBeGreaterThanOrEqual(group.y - 2);
  expect(labelStyles).toEqual({
    backgroundColor: "rgb(255, 235, 59)",
    boxShadow: "rgb(255, 235, 59) 2px 0px 0px 0px inset",
    color: "rgb(105, 105, 105)",
  });
  expect(countGroupStyles).toEqual({
    commentColor: "rgb(139, 0, 139)",
    commentCountFontWeight: "400",
    commentCountPaddingRight: "5px",
    commentIconFontSize: "9px",
    commentIconLineHeight: "12px",
    commentIconPaddingTop: "2px",
    groupBorderTopWidth: "1px",
    groupLineHeight: "14px",
    sharerColor: "rgb(0, 127, 202)",
    sharerCountPaddingRight: "5px",
    sharerIconFontSize: "9px",
    sharerIconLineHeight: "12px",
    sharerIconPaddingTop: "2px",
    sharerMarginLeft: "-5px",
    voteColor: "rgb(243, 108, 34)",
    voteCountPaddingRight: "5px",
    voteIconFontSize: "9px",
    voteIconLineHeight: "12px",
    voteIconPaddingTop: "2px",
    voteMarginLeft: "-5px",
  });
});
