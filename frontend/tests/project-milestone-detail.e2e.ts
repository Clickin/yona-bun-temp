import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

test("project milestone detail matches legacy milestone/view.scala.html core DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const stateRequests: unknown[] = [];
  const deleteRequests: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const toggle = target.closest("[data-toggle='dropdown']");
      if (!toggle) {
        return;
      }
      const auditWindow = window as unknown as {
        __massUpdateDropdownShimClicks?: string[];
      };
      auditWindow.__massUpdateDropdownShimClicks = [
        ...(auditWindow.__massUpdateDropdownShimClicks ?? []),
        toggle.closest(".btn-group")?.id ?? "",
      ];
    });
  });
  await mockProjectMilestoneDetail(page, stateRequests, deleteRequests);

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open`);
  await expectMilestoneDetailAssets(page, basePath);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("v1.0");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestone/5`,
  );
  await expect(page.locator(".badge-issue-open")).toHaveText("Open");
  await expect(page.locator(".progress .bar")).toHaveAttribute("style", "width: 50%;");
  await expect(page.locator(".milestone-desc .markdown-wrap")).toContainText("Release scope");
  await expect(page.locator(".milestone-desc .attachments")).toHaveAttribute(
    "data-attachments",
    JSON.stringify([
      {
        id: 501,
        name: "scope.txt",
        url: "/files/501",
      },
    ]),
  );
  await expect(page.locator('.actrow [data-request-uri$="/milestone/5/close"]')).toHaveText(
    "Close milestone",
  );
  await expect(page.locator(".actrow .ybtn.pull-left")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );
  await expect(page.locator('.actrow .ybtn[href$="/milestone/5/editform"]')).toHaveText("Edit");
  await expect(page.locator('.actrow button.ybtn-danger:has-text("Delete")')).toHaveCount(1);
  await expect(page.locator("#issues .nav-tabs li.active a")).toContainText("Open1");
  expect(
    await page
      .locator("#issues .nav-tabs li:not(.active)")
      .evaluateAll((tabs) => tabs.map((tab) => tab.getAttribute("class"))),
  ).toEqual([null, null]);
  await expect(page.locator('#issues .nav-tabs a:has-text("Closed")')).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestone/5?state=closed#issues`,
  );
  await expect(page.locator("#mass-update-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/issues`,
  );
  await expect(page.locator("#mass-update-form .btn-group.check-all #check-all")).toHaveAttribute(
    "data-target",
    "checked-issue",
  );
  await expect(page.locator("#state[data-name='state'] .d-label")).toHaveText("Update status");
  await expect(page.locator('#state .mass-update-list li[data-value="OPEN"] button')).toHaveText(
    "Open",
  );
  await expect(
    page.locator('#state .mass-update-list li[data-value="OPEN"] button'),
  ).toHaveAttribute("type", "button");
  await expect(page.locator('#state .mass-update-list li[data-value="CLOSED"] button')).toHaveText(
    "Closed",
  );
  await expect(
    page.locator('#state .mass-update-list li[data-value="CLOSED"] button'),
  ).toHaveAttribute("type", "button");
  await expect(page.locator("#assignee[data-name='assignee.id'] .d-label")).toHaveText(
    "Update assignee",
  );
  await expect(page.locator('#assignee li[data-value="0"] button')).toHaveText("No assignee");
  await expect(page.locator('#assignee li[data-value="0"] button')).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator('#assignee li[data-value="1"] > button').first()).toHaveText(
    "Assign to me",
  );
  await expect(page.locator('#assignee li[data-value="1"] > button').first()).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator('#assignee li[data-value="2"] .usf-group')).toContainText(
    "Dev Member @dev",
  );
  await expect(page.locator('#assignee li[data-value="2"] .usf-group')).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator('#assignee li[data-value="2"] img')).toHaveAttribute(
    "src",
    "/assets/images/dev-avatar.png",
  );
  await expect(page.locator("#milestone[data-name='milestone.id'] .d-label")).toHaveText(
    "Update milestone",
  );
  await expect(page.locator('#milestone li[data-value="-1"] button')).toHaveText("No milestone");
  await expect(page.locator('#milestone li[data-value="-1"] button')).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator('#milestone li[data-value="5"] button')).toHaveText("v1.0");
  await expect(page.locator('#milestone li[data-value="5"] button')).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#state .mass-update-list a[href='#']")).toHaveCount(0);
  await expect(page.locator("#assignee .mass-update-list a")).toHaveCount(0);
  await expect(page.locator("#milestone .mass-update-list a[href='#']")).toHaveCount(0);
  await expect(page.locator("#attaching-label[data-name='attachingLabelIds'] .d-label")).toHaveText(
    "Attach label",
  );
  await expect(page.locator("#detaching-label[data-name='detachingLabelIds'] .d-label")).toHaveText(
    "Detach label",
  );
  for (const listId of ["attach-label-list", "delete-label-list"]) {
    await expect(page.locator(`#${listId} li.disabled[data-category="3"] span`)).toHaveText("type");
    await expect(
      page.locator(`#${listId} li[data-value="8"][data-category="3"] button span`),
    ).toHaveText("bug");
    await expect(
      page.locator(`#${listId} li[data-value="8"][data-category="3"] button`),
    ).toHaveAttribute("type", "button");
    await expect(page.locator(`#${listId} li.divider[data-category="3"]`)).toHaveCount(1);
    await expect(page.locator(`#${listId} a`)).toHaveCount(0);
  }
  await expect(page.locator("#state > button")).toBeDisabled();
  await page.locator("#state > button").evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await expect(page.locator("#state")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator('.search-bar input[data-toggle="item-search"]')).toHaveAttribute(
    "data-items",
    "issue-item",
  );
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issue-item-41")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/issue/11`,
  );
  await expect(page.locator("#issue-41")).toHaveAttribute("name", "checked-issue");
  await expect(page.locator("#issue-41")).toHaveAttribute("data-issue-id", "41");
  await expect(page.locator("#issue-41")).toHaveAttribute(
    "data-issue-labels",
    "type,8,bug,3,false|",
  );
  await expect(page.locator("#issue-item-41 .issue-item-row")).toHaveAttribute("for", "issue-41");
  await page.check("#issue-41");
  await expect(page.locator("#state > button")).toBeEnabled();
  await page.evaluate(() => {
    window.sessionStorage.setItem("milestone-detail-spa-marker", "kept");
  });
  const beforeMassUpdateOptionUrl = page.url();
  await page.click("#state > button");
  await expect(page.locator("#state")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await page.click("#assignee > button");
  await expect(page.locator("#state")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#assignee")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await page.click("#milestone > button");
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#milestone")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(
    page.evaluate(() => {
      return (
        (
          window as unknown as {
            __massUpdateDropdownShimClicks?: string[];
          }
        ).__massUpdateDropdownShimClicks ?? []
      );
    }),
  ).resolves.toEqual([]);
  await page.click('#milestone .mass-update-list li[data-value="5"] button');
  await expect(page.locator("#milestone")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await page.click("#state > button");
  await page.click('#state .mass-update-list li[data-value="OPEN"] button');
  await expect(page.locator("#state")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await page.click("#assignee > button");
  await page.click('#assignee .mass-update-list li[data-value="0"] button');
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await page.click("#attaching-label > button");
  await page.click('#attach-label-list li[data-value="8"][data-category="3"] button');
  await expect(page.locator("#attaching-label")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page).toHaveURL(beforeMassUpdateOptionUrl);
  await expect(
    page.evaluate(() => window.sessionStorage.getItem("milestone-detail-spa-marker")),
  ).resolves.toBe("kept");
  await expect(page.locator("#issue-item-41")).toContainText("#11[UI]Open milestone issue");
  await expect(page.locator('#issue-item-41 .title[href$="/issue/11"]')).toHaveCount(2);
  await expect(page.locator("#issue-item-41 .weight-up-arrow")).toHaveAttribute(
    "title",
    "Issue weight 2",
  );
  await expect(page.locator("#issue-item-41 .title-prefix")).toHaveText("[UI]");
  await expect(page.locator("#issue-item-41 button.title-prefix")).toHaveAttribute(
    "type",
    "button",
  );
  await expect(page.locator("#issue-item-41 a.title-prefix")).toHaveCount(0);
  await expect(page.locator('#issue-item-41 .title[href$="/issue/11"]').nth(1)).toHaveText(
    "Open milestone issue",
  );
  await expect(page.locator('#issue-item-41 .infos-link-item[href$="/dev"]')).toHaveText(
    "Dev Member",
  );
  await expect(page.locator("#issue-item-41 .infos-link-item")).toHaveAttribute("title", "dev");
  await expect(page.locator("#issue-item-41 .infos > .infos-item").nth(1)).toHaveText("2026-06-01");
  await expect(
    page.locator("#issue-item-41 .subtask-progress.upload-progress.red-outline .bar"),
  ).toHaveAttribute("style", "width: 50%;");
  await expect(page.locator("#issue-item-41 .subtask-progress.completion-ratio")).toHaveText("1/2");
  await expect(page.locator('#issue-item-41 .mileston-tag a[href$="/milestone/5"]')).toHaveText(
    "v1.0",
  );
  await expect(
    page.locator("#issue-item-41 .comments-count[href$='/issue/11#comments'] .item-count"),
  ).toHaveText("2");
  await expect(
    page.locator("#issue-item-41 .vote-count[href$='/issue/11#vote'] .item-count"),
  ).toHaveText("1");
  await expect(page.locator("#issue-item-41 .sharer-color .item-count")).toHaveText("1");
  await expect(page.locator("#issue-item-41 .sharer-color")).toHaveAttribute("type", "button");
  await expect(page.locator("#issue-item-41 .sharer-color")).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator("#issue-item-41 .sharer-color")).toHaveAttribute(
    "data-placement",
    "bottom",
  );
  await expect(page.locator("#issue-item-41 .sharer-color")).toHaveAttribute(
    "title",
    "Issue Sharer",
  );
  await page.locator("#issue-item-41 .sharer-color").dispatchEvent("click");
  await expect(page).toHaveURL(beforeMassUpdateOptionUrl);
  await expect(
    page.evaluate(() => window.sessionStorage.getItem("milestone-detail-spa-marker")),
  ).resolves.toBe("kept");
  await expect(
    page.locator('#issue-item-41 .issue-label[data-category-id="3"][data-label-id="8"]'),
  ).toHaveText("bug");
  await expect(
    page.locator('#issue-item-41 .issue-label[data-category-id="3"][data-label-id="8"]'),
  ).toHaveAttribute("type", "button");
  await expect(
    page.locator('#issue-item-41 a.issue-label[data-category-id="3"][data-label-id="8"]'),
  ).toHaveCount(0);
  await expect(page.locator("#issue-item-41 .avatar-wrap.assinee")).toHaveAttribute(
    "title",
    "Assignee: Dev Member",
  );
  await expect(page.locator("#issue-item-41 .avatar-wrap.assinee img")).toHaveAttribute(
    "alt",
    "Dev Member",
  );
  await expect(page.locator("#issue-item-41 .avatar-wrap.assinee img")).toHaveAttribute(
    "src",
    "/assets/images/dev-avatar.png",
  );
  await expect(page.locator("#issue-item-41 .mr20.mt10.pull-right")).toHaveAttribute(
    "title",
    "2026-06-20",
  );
  await expect(page.locator("#issue-item-41 .mr20.mt10.pull-right span.vmiddle")).toHaveText(
    "3 days left",
  );
  expect(await milestoneDetailMetrics(page)).toEqual({
    descBackgroundColor: "rgb(247, 247, 247)",
    descBorderBottomWidth: "1px",
    descBorderTopWidth: "1px",
    descMarginBottom: "15px",
    descMarginTop: "15px",
    descPaddingLeft: "15px",
    descPaddingTop: "10px",
    filterMinHeight: "30px",
    progressBackgroundColor: "rgb(182, 218, 84)",
    progressBarBackgroundColor: "rgb(94, 185, 94)",
  });
  expect(await issueLabelColorMetrics(page, ".post-list-wrap .issue-label")).toEqual({
    backgroundColor: "rgb(81, 170, 204)",
  });
  await page.click('#issues .nav-tabs a:has-text("Closed")');
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/5?state=closed#issues`);
  await expect(page.locator("#issues .nav-tabs li.active a")).toContainText("Closed1");
  expect(
    await page
      .locator("#issues .nav-tabs li:not(.active)")
      .evaluateAll((tabs) => tabs.map((tab) => tab.getAttribute("class"))),
  ).toEqual([null, null]);
  await expect(page.locator("#issue-item-42")).toContainText("#12Closed milestone issue");
  await page.click('#issues .nav-tabs a:has-text("Open")');
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/5?state=open#issues`);
  await expect(page.locator("#issue-item-41")).toContainText("#11[UI]Open milestone issue");

  await page.click("#issue-item-41 .title-prefix");
  await expect(page.locator('.search-bar input[name="filter"]')).toHaveValue("[UI]");
  await expect(page.locator("#issue-item-41")).toBeVisible();
  await page.fill('.search-bar input[name="filter"]', "bug");
  await expect(page.locator("#issue-item-41")).toBeHidden();
  await page.fill('.search-bar input[name="filter"]', "Dev Member");
  await expect(page.locator("#issue-item-41")).toBeHidden();
  await page.fill('.search-bar input[name="filter"]', "dev");
  await expect(page.locator("#issue-item-41")).toBeVisible();
  await page.fill('.search-bar input[name="filter"]', "no-match");
  await expect(page.locator("#issue-item-41")).toBeHidden();

  const closeResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/milestones/5/state") &&
      response.request().method() === "PATCH",
  );
  await page.click('.actrow [data-request-uri$="/milestone/5/close"]');
  await closeResponse;
  expect(stateRequests).toEqual([{ state: "closed" }]);

  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal hide fade/u);
  await page.click('.actrow button.ybtn-danger:has-text("Delete")');
  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal fade in/u);
  await expect(page.locator("#deleteConfirm .modal-header .close")).toHaveText("×");
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete milestone");
  await expect(page.locator("#deleteConfirm [data-request-method='delete']")).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/milestone/5/delete`,
  );
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/milestones/5") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#deleteConfirm [data-request-method='delete']").evaluate((button) => {
    (button as HTMLButtonElement).click();
  });
  await deleteResponse;
  expect(deleteRequests).toEqual(["DELETE"]);
});

test("project milestone detail issue labels translate legacy href hash navigation to React buttons", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestoneDetail(page, [], []);
  await page.route("**/api/v1/owners/admin/projects/sample/issues**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        issues: [],
        pagination: { currentPage: 1, totalPages: 0 },
      }),
    });
  });

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open`);

  const labelChip = page.locator(
    '#issue-item-41 button.issue-label[data-category-id="3"][data-label-id="8"]',
  );
  await expect(labelChip).toHaveText("bug");
  await expect(labelChip).toHaveAttribute("type", "button");
  await expect(page.locator("#issue-item-41 a.issue-label")).toHaveCount(0);

  await labelChip.click();
  await expect(page).toHaveURL(/\/admin\/sample\/issues/u);
  const url = new URL(page.url());
  expect(url.pathname).toBe(`${basePath}/admin/sample/issues`);
  expect(url.searchParams.get("milestoneId")).toBe("5");
  expect(url.searchParams.getAll("labelIds")).toEqual(["8"]);
});

test("project milestone detail route uses direct Links", () => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );

  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain('declare module "react"');
  expect(routeSource).not.toContain("LiHTMLAttributes");
  expect(routeSource).not.toContain("legacyHref");
  expect(routeSource).not.toContain("legacyFor");
  expect(routeSource).not.toContain("as unknown as");
  expect(routeSource).not.toContain("<div for={`issue-");
  expect(routeSource).toContain(
    "type LegacyIssueListItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(routeSource).toContain("type LegacyIssueItemRowAttrs = {");
  expect(routeSource).toContain("const issueListItemAttrs = {");
  expect(routeSource).toContain("href: issueHref");
  expect(routeSource).toContain("satisfies LegacyIssueListItemAttrs");
  expect(routeSource).toContain("{...issueListItemAttrs}");
  expect(routeSource).toContain("const issueItemRowAttrs = {");
  expect(routeSource).toContain("htmlFor: `issue-${issueId}`");
  expect(routeSource).toContain("satisfies LegacyIssueItemRowAttrs");
  expect(routeSource).toContain('<div {...issueItemRowAttrs} className="issue-item-row">');
  expect(routeSource).toContain('to="/$ownerName/$projectName/milestone/$milestoneId"');
  expect(routeSource).toContain("<button");
  expect(routeSource).toContain('type="button"');
  expect(routeSource).toContain('className="title-prefix"');
  expect(routeSource).toContain('hash="issues"');
});

test("project milestone detail E2E selectors stay anchored to legacy Scala HTML", () => {
  const milestoneViewSource = readFileSync(
    "../yona-original/app/views/milestone/view.scala.html",
    "utf8",
  );
  const issueListSource = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  const massUpdateSource = readFileSync(
    "../yona-original/app/views/issue/partial_massupdate.scala.html",
    "utf8",
  );

  for (const snippet of [
    '<div class="milesion-wrap">',
    '<div class="actrow right-txt row-fluid"',
    '<a href="@routes.MilestoneApp.milestones(project.owner, project.name)" class="ybtn pull-left">',
    '<a href="#deleteConfirm" data-toggle="modal" class="ybtn ybtn-danger">',
    '<a href="@routes.MilestoneApp.editMilestoneForm(project.owner, project.name, milestone.id)" class="ybtn">',
    'data-request-uri="@routes.MilestoneApp.close(project.owner, project.name, milestone.id)" class="ybtn"',
    '<div id="issues">',
    '<ul class="nav nav-tabs">',
    "@for(state <- Array(State.OPEN, State.CLOSED, State.ALL))",
    '<div class="issues">',
    '<div class="filter-wrap">',
    "@issue.partial_massupdate(project, new SearchCondition())",
    'data-toggle="item-search" data-items="issue-item"',
    "issue.partial_list(project, milestone.sortedByNumberOfOpenIssue(), new SearchCondition(),0,0)",
    '<div id="deleteConfirm" class="modal hide fade">',
    '<h3>@Messages("milestone.delete")</h3>',
    'data-request-method="delete" data-request-uri="@routes.MilestoneApp.deleteMilestone(project.owner, project.name, milestone.id)"',
  ]) {
    expect(milestoneViewSource).toContain(snippet);
  }
  expect(milestoneViewSource).not.toContain("milestone-wrap");

  for (const snippet of [
    '<ul class="post-list-wrap row-fluid">',
    '<li class="post-item title" id="issue-item-@issue.id" data-item="issue-item"',
    'name="checked-issue" data-toggle="issue-checkbox"',
    '<div for="issue-@issue.id" class="issue-item-row">',
    '<a href="#" class="label issue-label list-label active"',
    '<div class="child-issue-list hide">',
  ]) {
    expect(issueListSource).toContain(snippet);
  }

  for (const snippet of [
    '<form id="mass-update-form" class="mass-update-form pull-left"',
    '<div id="state" class="btn-group" data-name="state">',
    '<div id="assignee" class="btn-group" data-name="assignee.id">',
    '<div id="milestone" class="btn-group" data-name="milestone.id">',
    '<div id="attaching-label" class="btn-group" data-name="attachingLabelIds">',
    '<div id="detaching-label" class="btn-group" data-name="detachingLabelIds">',
  ]) {
    expect(massUpdateSource).toContain(snippet);
  }
});

async function expectMilestoneDetailAssets(page: Page, basePath: string) {
  const markdownLink = page.locator(
    `link[href="${basePath}/assets/javascripts/lib/highlight/styles/default.css"]`,
  );
  await expect(markdownLink).toHaveAttribute("rel", "stylesheet");
  await expect(markdownLink).toHaveAttribute("type", "text/css");

  const labelLink = page.locator(`link[href="${basePath}/admin/sample/issue/labels.css"]`);
  await expect(labelLink).toHaveAttribute("rel", "stylesheet");
  await expect(labelLink).toHaveAttribute("type", "text/css");

  for (const src of [
    `${basePath}/assets/javascripts/lib/highlight/highlight.pack.js`,
    `${basePath}/assets/javascripts/lib/marked.js`,
  ]) {
    const script = page.locator(`script[src="${src}"]`);
    await expect(script).toHaveAttribute("type", "text/javascript");
    await expect(script).toHaveAttribute("defer", "");
  }

  await expect(page.locator('meta[name="yona-current-user-login-id"]')).toHaveAttribute(
    "content",
    "admin",
  );

  const legacyInlineScript = await page.evaluate(() => {
    return [...document.scripts]
      .filter((script) => script.type === "text/javascript")
      .map((script) => script.textContent ?? "")
      .find(
        (text) =>
          text.includes('$yobi.loadModule("milestone.View"') ||
          text.includes('$(".title-prefix").on') ||
          text.includes(".user-link:contains"),
      );
  });
  expect(legacyInlineScript).toBeUndefined();
}

async function mockProjectMilestoneDetail(
  page: Page,
  stateRequests: unknown[],
  deleteRequests: string[],
) {
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
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
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5", async (route) => {
    if (route.request().method() === "DELETE") {
      deleteRequests.push("DELETE");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ redirectPath: "/admin/sample/milestones" }),
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ milestone: milestoneFixture() }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/5/state", async (route) => {
    stateRequests.push(route.request().postDataJSON());
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestone: {
          ...milestoneFixture(),
          state: "closed",
        },
      }),
    });
  });
}

function milestoneFixture() {
  return {
    attachments: [
      {
        id: 501,
        name: "scope.txt",
        url: "/files/501",
      },
    ],
    closedIssueCount: 1,
    closedIssues: [
      {
        assigneeLabel: "",
        id: 42,
        issueNumber: 12,
        labels: [],
        state: "closed",
        title: "Closed milestone issue",
      },
    ],
    completionPercent: 50,
    contentsHtml: "<p>Server HTML should not render</p>",
    contentsMarkdown: "Release scope",
    dueDateLabel: "2026-06-30",
    dueDateOverdue: true,
    id: 5,
    openIssueCount: 1,
    openMilestones: [
      {
        id: 5,
        title: "v1.0",
      },
    ],
    openIssues: [
      {
        assigneeLabel: "Dev Member",
        assigneeAvatarUrl: "/assets/images/dev-avatar.png",
        authorLoginId: "dev",
        authorLabel: "Dev Member",
        authorUserId: 2,
        assigneeLoginId: "dev",
        assigneeUserId: 2,
        childClosedCount: 1,
        childOpenCount: 1,
        commentCount: 2,
        createdLabel: "2026-06-01",
        dueDateLabel: "2026-06-20",
        dueDateOverdue: false,
        dueDateText: "3 days left",
        id: 41,
        issueNumber: 11,
        labels: [
          {
            categoryId: "3",
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
        milestoneId: 5,
        milestoneTitle: "v1.0",
        sharerCount: 1,
        state: "open",
        title: "[UI] Open milestone issue",
        voterCount: 1,
        weight: 2,
      },
    ],
    projectLabels: [
      {
        categoryId: "3",
        categoryName: "type",
        color: "#51aacc",
        id: "8",
        name: "bug",
      },
    ],
    state: "open",
    title: "v1.0",
    untilLabel: "Overdue",
    assignableUsers: [
      {
        avatarUrl: "/assets/images/admin-avatar.png",
        displayName: "Site Admin",
        loginId: "admin",
        userId: 1,
      },
      {
        avatarUrl: "/assets/images/dev-avatar.png",
        displayName: "Dev Member",
        loginId: "dev",
        userId: 2,
      },
    ],
    viewerCanDelete: true,
    viewerCanUpdate: true,
  };
}

async function issueLabelColorMetrics(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
      };
    });
}

async function milestoneDetailMetrics(page: Page) {
  return page.evaluate(() => {
    const desc = document.querySelector<HTMLElement>(".milestone-desc");
    const filter = document.querySelector<HTMLElement>(".milesion-wrap #issues .filter-wrap");
    const progress = document.querySelector<HTMLElement>(".milesion-wrap .progress");
    const progressBar = document.querySelector<HTMLElement>(".milesion-wrap .progress .bar");
    if (!desc || !filter || !progress || !progressBar) {
      throw new Error("Expected milestone detail metric targets are missing.");
    }
    const descStyle = getComputedStyle(desc);
    return {
      descBackgroundColor: descStyle.backgroundColor,
      descBorderBottomWidth: descStyle.borderBottomWidth,
      descBorderTopWidth: descStyle.borderTopWidth,
      descMarginBottom: descStyle.marginBottom,
      descMarginTop: descStyle.marginTop,
      descPaddingLeft: descStyle.paddingLeft,
      descPaddingTop: descStyle.paddingTop,
      filterMinHeight: getComputedStyle(filter).minHeight,
      progressBackgroundColor: getComputedStyle(progress).backgroundColor,
      progressBarBackgroundColor: getComputedStyle(progressBar).backgroundColor,
    };
  });
}
