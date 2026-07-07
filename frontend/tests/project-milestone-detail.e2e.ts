import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const MILESTONE_DETAIL_CHILD_ISSUES = `
<div class="child-issues">
  <div class="issue-item child-issue">
    <span class="state-label open"></span>
    <a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/21">
      <span class="item-name">
        <span class="subtask-number">#21</span>
        <span>Open child issue</span>
        <span> - Dev Member</span>
      </span>
    </a>
    <span class="font12 no-border-at-child">
      <span class="item-count-groups">
        <a class="comments-count comments-count-color" href="__BASE_PATH__/admin/sample/issue/21#comments">
          <span class="count-groups item-icon"><i class="yobicon-comment2"></i></span>
          <span class="count-groups item-count">1</span>
        </a>
        <a class="vote-count vote-color" href="__BASE_PATH__/admin/sample/issue/21#vote">
          <span class="count-groups item-icon"><i class="yobicon-hearts"></i></span>
          <span class="count-groups item-count strong">2</span>
        </a>
      </span>
    </span>
    <a class="label issue-label list-label active twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issues?state=open&amp;labelIds=8" style="background:rgb(81,170,204)">bug</a>
    <span class="child-issue-date" title="2026-06-02">2026-06-02</span>
  </div>
  <div class="issue-item child-issue">
    <span class="state-label closed"><i class=" yobicon-checkmark"></i></span>
    <a class="twoColumeModeTarget" href="__BASE_PATH__/admin/sample/issue/22">
      <span class="item-name">
        <span class="subtask-number">#22</span>
        <span>Closed child issue</span>
        <span></span>
      </span>
    </a>
    <span class="font12 no-border-at-child"></span>
    <span class="child-issue-date" title="2026-06-03">2026-06-03</span>
  </div>
</div>`;

const EXPECTED_PROJECT_MILESTONE_DETAIL_OPEN = `
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="milesion-wrap">
      <h4>
        <a class="title active" href="__BASE_PATH__/admin/sample/milestone/5">v1.0</a>
        <small class="ml10">
          <span class="due-date">Due Date <strong>2026-06-30</strong></span>
          <span class="date">(Overdue)</span>
          <span class="badge badge-issue-open margin-left-5">Open</span>
        </small>
      </h4>
      <div class="progress progress-success"><div class="bar" style="width:50%"></div></div>
      <div class="milestone-desc">
        <div class="markdown-wrap"><p>Release scope</p></div>
        <div class="attachments" data-attachments='[{"id":501,"name":"scope.txt","url":"/files/501"}]'></div>
      </div>
      <div class="actrow right-txt row-fluid" style="clear:both;padding:15px 0px">
        <a class="ybtn pull-left" href="__BASE_PATH__/admin/sample/milestones">List</a>
        <button class="ybtn ybtn-danger" data-target="#deleteConfirm" data-toggle="modal" type="button">Delete</button>
        <a class="ybtn" href="__BASE_PATH__/admin/sample/milestone/5/editform">Edit</a>
        <button class="ybtn" data-request-method="post" data-request-uri="__BASE_PATH__/admin/sample/milestone/5/close" type="button">Close milestone</button>
      </div>
      <div id="issues">
        <ul class="nav nav-tabs">
          <li class="active"><a class="active" href="__BASE_PATH__/admin/sample/milestone/5?state=open#issues">Open<span class="num-badge">1</span></a></li>
          <li><a href="__BASE_PATH__/admin/sample/milestone/5?state=closed#issues">Closed<span class="num-badge">1</span></a></li>
          <li><a href="__BASE_PATH__/admin/sample/milestone/5?state=all#issues">All<span class="num-badge">2</span></a></li>
        </ul>
        <div class="issues">
          <div class="filter-wrap">
            <div class="mass-update-wrap hide-in-mobile">
              <form action="__BASE_PATH__/admin/sample/issues" class="mass-update-form pull-left" id="mass-update-form" method="post">
                <div class="btn-group check-all">
                  <label aria-label="check-all" for="check-all"><input data-target="checked-issue" id="check-all" type="checkbox"></label>
                </div>
                <div class="btn-group" data-name="state" id="state">
                  <button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled="" type="button"><span class="d-label">Update status</span><span class="d-caret"><span class="caret"></span></span></button>
                  <ul class="dropdown-menu mass-update-list">
                    <li data-value="OPEN"><button type="button">Open</button></li>
                    <li data-value="CLOSED"><button type="button">Closed</button></li>
                  </ul>
                </div>
                <div class="btn-group" data-name="assignee.id" id="assignee">
                  <button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled="" type="button"><span class="d-label">Update assignee</span><span class="d-caret"><span class="caret"></span></span></button>
                  <ul class="dropdown-menu mass-update-list">
                    <li data-value="0"><button type="button">No assignee</button></li>
                    <li data-value="1"><button type="button">Assign to me</button></li>
                    <li class="divider"></li>
                    <li data-value="1"><button class="usf-group" type="button"><span class="avatar-wrap smaller"><img height="20" src="/assets/images/default-avatar-32.png" width="20"></span><strong class="name">Site Admin</strong><span class="loginid"> <strong>@</strong>admin</span></button></li>
                    <li data-value="2"><button class="usf-group" type="button"><span class="avatar-wrap smaller"><img height="20" src="/assets/images/dev-avatar.png" width="20"></span><strong class="name">Dev Member</strong><span class="loginid"> <strong>@</strong>dev</span></button></li>
                  </ul>
                </div>
                <div class="btn-group" data-name="milestone.id" id="milestone">
                  <button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled="" type="button"><span class="d-label">Update milestone</span><span class="d-caret"><span class="caret"></span></span></button>
                  <ul class="dropdown-menu mass-update-list">
                    <li data-value="-1"><button type="button">No milestone</button></li>
                    <li class="divider"></li>
                    <li data-value="5"><button type="button">v1.0</button></li>
                  </ul>
                </div>
                <div class="btn-group" data-name="attachingLabelIds" id="attaching-label">
                  <button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled="" type="button"><span class="d-label">Attach label</span><span class="d-caret"><span class="caret"></span></span></button>
                  <ul class="dropdown-menu mass-update-list" id="attach-label-list">
                    <li class="disabled" data-category="3"><span>type</span></li>
                    <li data-category="3" data-value="8"><button type="button"><span class="issue-label active list-label" data-label-id="8">bug</span></button></li>
                    <li class="divider" data-category="3"></li>
                  </ul>
                </div>
                <div class="btn-group" data-name="detachingLabelIds" id="detaching-label">
                  <button class="btn dropdown-toggle medium" data-toggle="dropdown" disabled="" type="button"><span class="d-label">Detach label</span><span class="d-caret"><span class="caret"></span></span></button>
                  <ul class="dropdown-menu mass-update-list" id="delete-label-list">
                    <li class="disabled" data-category="3"><span>type</span></li>
                    <li data-category="3" data-value="8"><button type="button"><span class="issue-label active list-label" data-label-id="8">bug</span></button></li>
                    <li class="divider" data-category="3"></li>
                  </ul>
                </div>
              </form>
            </div>
            <div class="pull-right search search-bar">
              <input class="textbox" data-items="issue-item" data-toggle="item-search" name="filter" placeholder="search at current milestone" type="text" value="">
              <button class="search-btn" type="submit"><i class="yobicon-search"></i></button>
            </div>
          </div>
          <ul class="post-list-wrap row-fluid">
            <li class="post-item title" data-item="issue-item" data-value="dev 11 [UI] Open milestone issue" href="__BASE_PATH__/admin/sample/issue/11" id="issue-item-41">
              <div class="span9 span-hard-wrap">
                <label aria-label="issue-41" class="mass-update-check hide-in-mobile" for="issue-41"><input data-issue-id="41" data-issue-labels="type,8,bug,3,false|" data-toggle="issue-checkbox" id="issue-41" name="checked-issue" type="checkbox"></label>
                <div class="issue-item-row" for="issue-41">
                  <div class="title-wrap">
                    <a class="title" href="__BASE_PATH__/admin/sample/issue/11"><span class="post-id">#11</span></a>
                    <span class="weight-up-arrow" data-placement="right" data-toggle="tooltip" title="Issue weight 2"><i class="yobicon-angle-circled-up"></i></span>
                    <button class="title-prefix" type="button">[UI]</button>
                    <a class="title" href="__BASE_PATH__/admin/sample/issue/11">Open milestone issue</a>
                  </div>
                  <div class="infos">
                    <a class="infos-item infos-link-item" href="__BASE_PATH__/dev" title="dev">Dev Member</a>
                    <span class="infos-item" data-placement="bottom" data-toggle="tooltip" title="2026-06-01">2026-06-01</span>
                    <div class="subtask-progress upload-progress red-outline"><div class="bar red" style="width:50%" title="Subtask"></div></div>
                    <span class="subtask-progress completion-ratio">1/2</span>
                    <span class="mileston-tag"><a class="active" href="__BASE_PATH__/admin/sample/milestone/5" title="Milestone">v1.0</a></span>
                    <span class="infos-item item-count-groups">
                      <a class="comments-count comments-count-color" href="__BASE_PATH__/admin/sample/issue/11#comments"><span class="count-groups item-icon"><i class="yobicon-comment2"></i></span><span class="count-groups item-count">2</span></a>
                      <a class="vote-count vote-color" href="__BASE_PATH__/admin/sample/issue/11#vote"><span class="count-groups item-icon"><i class="yobicon-hearts"></i></span><span class="count-groups item-count strong">1</span></a>
                      <button class="sharer-color" data-placement="bottom" data-toggle="tooltip" title="Issue Sharer" type="button"><span class="count-groups item-icon"><i class="yobicon-friends"></i></span><span class="count-groups item-count strong">1</span></button>
                    </span>
                    <button class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="background:rgb(81,170,204)" type="button">bug</button>
                    <div class="child-issue-list hide">${MILESTONE_DETAIL_CHILD_ISSUES}</div>
                  </div>
                </div>
              </div>
              <div class="span3 hide-in-mobile">
                <div class="mt5 pull-right"><a class="avatar-wrap assinee" href="__BASE_PATH__/dev" title="Assignee: Dev Member"><img height="32" src="/assets/images/dev-avatar.png" width="32"></a></div>
                <div class="mr20 mt10 pull-right" data-placement="top" data-toggle="tooltip" title="2026-06-20"><i class="yobicon-clock2 mr3 vmiddle"></i><span class="vmiddle">3 days left</span></div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="modal hide fade" id="deleteConfirm">
  <div class="modal-header">
    <button class="close" data-dismiss="modal" type="button">×</button>
    <h3>Delete milestone</h3>
  </div>
  <div class="modal-body"><p>Once you delete the post, you won't be able to recover it. Do you still want to delete this post?</p></div>
  <div class="modal-footer">
    <button class="ybtn ybtn-danger" data-request-method="delete" data-request-uri="__BASE_PATH__/admin/sample/milestone/5/delete" type="button">Yes</button>
    <button class="ybtn" data-dismiss="modal" type="button">No</button>
  </div>
</div>`;

const EXPECTED_PROJECT_MILESTONE_DETAIL_NOT_FOUND_ERROR_WRAP = `
<div class="error-wrap">
  <i class="ico ico-err2"></i>
  <p>Milestone does not exist</p>
  <a class="ybtn ybtn-primary" href="__BASE_PATH__/admin/sample/milestones">List</a>
</div>`;

test("project milestone detail keeps the legacy project shell and title for /admin/sample/milestone/1 when session data is unavailable", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestoneDetail(page, [], [], {
    milestoneId: 1,
    milestone: parityLaunchMilestoneFixture(),
    sessionUnavailable: true,
  });

  await page.goto(`${basePath}/admin/sample/milestone/1?state=open`);

  await expect(page).toHaveTitle("Parity launch - admin/sample");
  await expectHeadTitle(page, "Parity launch - admin/sample");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("Parity launch");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestone/1`,
  );
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/admin/sample/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  const shellMetrics = await milestoneDetailShellMetrics(page);
  expect(shellMetrics.headerHeight).toBeGreaterThanOrEqual(120);
  expect(shellMetrics.menuHeight).toBeGreaterThanOrEqual(39);
  expect(shellMetrics.menuBelowHeader).toBe(true);
  expect(shellMetrics.pageWrapBelowMenu).toBe(true);
  expect(shellMetrics.titleBelowMenu).toBe(true);
  expect(shellMetrics.titleWithinPage).toBe(true);
});

test("project milestone detail exposes legacy group search scope for org-owned projects", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestoneDetail(page, [], [], {
    ownerName: "weblabs",
    projectName: "portal",
    project: {
      isProtected: true,
      organizationName: "weblabs",
    },
  });

  await page.goto(`${basePath}/weblabs/portal/milestone/5?state=open`);

  await expect(page).toHaveTitle("v1.0 - weblabs/portal");
  await expectHeadTitle(page, "v1.0 - weblabs/portal");
  await expect(page).toHaveURL(`${basePath}/weblabs/portal/milestone/5?state=open`);
  await expect(page.locator(".gnb-outer.project-header")).toBeVisible();
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveText("v1.0");
  await expect(page.locator(".milesion-wrap h4 .title")).toHaveAttribute(
    "href",
    `${basePath}/weblabs/portal/milestone/5`,
  );
  await expect(page.locator("#issues .nav-tabs li.active a")).toContainText("Open1");
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  expect(
    await page.locator('[data-toggle="search-scope"]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        action: node.getAttribute("data-action"),
        text: node.textContent?.replace(/\s+/g, " ").trim(),
      })),
    ),
  ).toEqual([
    { action: `${basePath}/weblabs/portal/search`, text: "This Project" },
    { action: `${basePath}/organizations/weblabs/search`, text: "This Group" },
    { action: `${basePath}/search`, text: "All Projects" },
  ]);

  const stableUrl = page.url();
  await page.locator("#gnb-search-scope-title").click();
  await page
    .locator('[data-toggle="search-scope"][data-action$="/organizations/weblabs/search"]')
    .click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Group");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/organizations/weblabs/search`,
  );
  await expect(page).toHaveURL(stableUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator('[data-toggle="search-scope"][data-action$="/search"]').last().click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("All Projects");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute("action", `${basePath}/search`);
  await expect(page).toHaveURL(stableUrl);

  await page.locator("#gnb-search-scope-title").click();
  await page.locator('[data-toggle="search-scope"][data-action$="/weblabs/portal/search"]').click();
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator(".gnb-search-form")).toHaveAttribute(
    "action",
    `${basePath}/weblabs/portal/search`,
  );
  await expect(page).toHaveURL(stableUrl);

  const shellMetrics = await milestoneDetailShellMetrics(page);
  expect(shellMetrics.headerHeight).toBeGreaterThanOrEqual(120);
  expect(shellMetrics.menuHeight).toBeGreaterThanOrEqual(39);
  expect(shellMetrics.menuBelowHeader).toBe(true);
  expect(shellMetrics.pageWrapBelowMenu).toBe(true);
  expect(shellMetrics.titleBelowMenu).toBe(true);
  expect(shellMetrics.titleWithinPage).toBe(true);
  expect(await milestoneDetailGnbSearchMetrics(page)).toEqual({
    formInsideHeader: true,
    inputInsideForm: true,
    scopeInsideForm: true,
  });
});

test("project milestone detail open state matches legacy milestone/view.scala.html whole route DOM", async ({
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
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const optionButton = target.closest(".mass-update-wrap .mass-update-list button");
      if (!optionButton) {
        return;
      }
      const auditWindow = window as unknown as {
        __massUpdateDropdownOptionShimClicks?: string[];
      };
      auditWindow.__massUpdateDropdownOptionShimClicks = [
        ...(auditWindow.__massUpdateDropdownOptionShimClicks ?? []),
        optionButton.closest("li")?.getAttribute("data-value") ?? "",
      ];
    });
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const modalToggle = target.closest("[data-toggle='modal']");
      const modalDismiss = target.closest("[data-dismiss='modal']");
      if (!modalToggle && !modalDismiss) {
        return;
      }
      const auditWindow = window as unknown as {
        __milestoneModalDelegatedClicks?: string[];
      };
      auditWindow.__milestoneModalDelegatedClicks = [
        ...(auditWindow.__milestoneModalDelegatedClicks ?? []),
        modalToggle?.getAttribute("data-target") ??
          modalToggle?.getAttribute("href") ??
          modalDismiss?.closest(".modal")?.id ??
          "",
      ];
    });
  });
  await mockProjectMilestoneDetail(page, stateRequests, deleteRequests);

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open`);
  await expect(page).toHaveTitle("v1.0 - admin/sample");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
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
  const actionRowMetrics = await milestoneDetailActionRowMetrics(page);
  expect(actionRowMetrics.actionRowDisplay).toBe("block");
  expect(actionRowMetrics.listLeft).toBeLessThanOrEqual(actionRowMetrics.actionRowLeft + 10);
  expect(actionRowMetrics.listRight).toBeLessThan(actionRowMetrics.deleteLeft);
  expect(actionRowMetrics.deleteLeft).toBeGreaterThan(
    actionRowMetrics.actionRowLeft +
      (actionRowMetrics.actionRowRight - actionRowMetrics.actionRowLeft) / 2,
  );
  expect(actionRowMetrics.deleteLeft).toBeLessThan(actionRowMetrics.editLeft);
  expect(actionRowMetrics.editLeft).toBeLessThan(actionRowMetrics.closeLeft);
  expect(actionRowMetrics.closeRight).toBeGreaterThanOrEqual(actionRowMetrics.actionRowRight - 2);
  const deleteTrigger = page.locator(
    '.actrow button.ybtn-danger[data-toggle="modal"][data-target="#deleteConfirm"]:has-text("Delete")',
  );
  await expect(deleteTrigger).toHaveCount(1);
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
  expect(await canonicalizeMilestoneRouteRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_MILESTONE_DETAIL_OPEN.replaceAll("__BASE_PATH__", basePath),
    ),
  );
  await page.check("#issue-41");
  await expect(page.locator("#state > button")).toBeEnabled();
  await page.evaluate(() => {
    window.sessionStorage.setItem("milestone-detail-spa-marker", "kept");
  });
  const beforeMassUpdateOptionUrl = page.url();
  const expectMassUpdateDropdownRouteOwnership = async () => {
    await expect(page).toHaveURL(beforeMassUpdateOptionUrl);
    await expect(
      page.evaluate(() => window.sessionStorage.getItem("milestone-detail-spa-marker")),
    ).resolves.toBe("kept");
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
    await expect(
      page.evaluate(() => {
        return (
          (
            window as unknown as {
              __massUpdateDropdownOptionShimClicks?: string[];
            }
          ).__massUpdateDropdownOptionShimClicks ?? []
        );
      }),
    ).resolves.toEqual([]);
  };
  await page.click("#state > button");
  await expect(page.locator("#state")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expectMassUpdateDropdownRouteOwnership();
  await page.click("#assignee > button");
  await expect(page.locator("#state")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#assignee")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expectMassUpdateDropdownRouteOwnership();
  await page.click("#milestone > button");
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#milestone")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expectMassUpdateDropdownRouteOwnership();
  await page.click('#milestone .mass-update-list li[data-value="5"] button');
  await expect(page.locator("#milestone")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expectMassUpdateDropdownRouteOwnership();
  await page.click("#state > button");
  await page.click('#state .mass-update-list li[data-value="OPEN"] button');
  await expect(page.locator("#state")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expectMassUpdateDropdownRouteOwnership();
  await page.click("#assignee > button");
  await page.click('#assignee .mass-update-list li[data-value="0"] button');
  await expect(page.locator("#assignee")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expectMassUpdateDropdownRouteOwnership();
  await page.click("#attaching-label > button");
  await page.click('#attach-label-list li[data-value="8"][data-category="3"] button');
  await expect(page.locator("#attaching-label")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expectMassUpdateDropdownRouteOwnership();
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
  const shellMetrics = await milestoneDetailShellMetrics(page);
  expect(shellMetrics.headerHeight).toBeGreaterThanOrEqual(120);
  expect(shellMetrics.menuHeight).toBeGreaterThanOrEqual(39);
  expect(shellMetrics.menuBelowHeader).toBe(true);
  expect(shellMetrics.pageWrapBelowMenu).toBe(true);
  expect(shellMetrics.titleBelowMenu).toBe(true);
  expect(shellMetrics.titleWithinPage).toBe(true);
  expect(await milestoneDetailMetrics(page)).toEqual({
    descBackgroundColor: "rgb(247, 247, 247)",
    descBorderBottomWidth: "1px",
    descBorderTopWidth: "1px",
    descMarginBottom: "15px",
    descMarginTop: "15px",
    descPaddingLeft: "15px",
    descPaddingTop: "10px",
    filterMinHeight: "30px",
    markdownInsideDesc: true,
    markdownScriptBootstrapCount: 0,
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
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  const beforeDeleteModalUrl = page.url();
  await deleteTrigger.click();
  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal fade in/u);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
  await expect(page).toHaveURL(beforeDeleteModalUrl);
  await expect(
    page.evaluate(() => {
      return (
        (
          window as unknown as {
            __milestoneModalDelegatedClicks?: string[];
          }
        ).__milestoneModalDelegatedClicks ?? []
      );
    }),
  ).resolves.toEqual([]);
  await expect(page.locator("#deleteConfirm .modal-header .close")).toHaveText("×");
  await expect(page.locator("#deleteConfirm .modal-header .close")).toHaveAttribute(
    "data-dismiss",
    "modal",
  );
  await expect(page.locator("#deleteConfirm .modal-header h3")).toHaveText("Delete milestone");
  await expect(page.locator("#deleteConfirm [data-request-method='delete']")).toHaveAttribute(
    "data-request-uri",
    `${basePath}/admin/sample/milestone/5/delete`,
  );
  await page.locator('#deleteConfirm [data-dismiss="modal"]').last().click();
  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal hide fade/u);
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  await expect(page).toHaveURL(beforeDeleteModalUrl);
  await expect(
    page.evaluate(() => {
      return (
        (
          window as unknown as {
            __milestoneModalDelegatedClicks?: string[];
          }
        ).__milestoneModalDelegatedClicks ?? []
      );
    }),
  ).resolves.toEqual([]);
  await deleteTrigger.click();
  await expect(page.locator("#deleteConfirm")).toHaveClass(/modal fade in/u);
  await expect(page.locator(".modal-backdrop.fade.in")).toHaveCount(1);
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

test("project milestone detail 404 milestone API preserves the legacy project-scoped not-found shell", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestoneDetail(page, [], [], {
    milestoneNotFound: true,
  });

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open#issues`);

  await expect(page).toHaveTitle("Page not found - admin/sample");
  await expectHeadTitle(page, "Page not found - admin/sample");
  await expect(page.locator(".page-wrap-outer > .project-page-wrap > .error-wrap")).toBeVisible();
  await expect(page.locator(".milesion-wrap")).toHaveCount(0);
  await expect(page.locator(".gnb-nav a[href$='/projects']")).toHaveText("List All");
  await expect(
    page.locator('.gnb-nav a[href="https://github.com/yona-projects/yona/issues"]'),
  ).toHaveText("Feedback");
  await expect(
    page.locator('.gnb-nav a[href="https://github.com/yona-projects/yona/issues"]'),
  ).toHaveAttribute("target", "_blank");
  await expect(page.locator('.gnb-nav form[action$="/admin/sample/search"]')).toHaveCount(1);
  await expect(page.locator("#gnb-search-scope-title")).toHaveText("This Project");
  await expect(page.locator('[data-toggle="search-scope"]')).toHaveCount(2);
  expect(
    await page
      .locator('[data-toggle="search-scope"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim())),
  ).toEqual(["This Project", "All Projects"]);
  expect(
    await page.locator(".project-menu-gruop > li").evaluateAll((items) =>
      items.map((item) => ({
        active: item.classList.contains("active"),
        count: item.querySelector(".project-menu-count")?.textContent?.trim() ?? "",
        name: item.querySelector(".menu-name")?.textContent?.trim() ?? "",
      })),
    ),
  ).toEqual(
    expect.arrayContaining([
      { active: false, count: "1", name: "Issue" },
      { active: false, count: "1", name: "Pull request" },
      { active: false, count: "2", name: "Review" },
      { active: true, count: "", name: "Milestone" },
      { active: false, count: "1", name: "Board" },
    ]),
  );
  const errorWrapHtml = await page.locator(".error-wrap").evaluate((element) => element.outerHTML);
  expect(await canonicalizeHtml(page, errorWrapHtml)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_PROJECT_MILESTONE_DETAIL_NOT_FOUND_ERROR_WRAP.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

test("project milestone detail mass-update assignee avatar falls back for empty avatar URLs", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const consoleMessages: string[] = [];
  page.on("console", (message) => {
    consoleMessages.push(message.text());
  });

  await mockProjectMilestoneDetail(page, [], [], {
    milestone: {
      assignableUsers: [
        {
          avatarUrl: "/assets/images/admin-avatar.png",
          displayName: "Site Admin",
          loginId: "admin",
          userId: 1,
        },
        {
          avatarUrl: "",
          displayName: "Dev Member",
          loginId: "dev",
          userId: 2,
        },
      ],
    },
  });

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open`);
  await page.check("#issue-41");
  await page.click("#assignee > button");
  await expect(page.locator('#assignee li[data-value="2"] img')).toHaveAttribute(
    "src",
    "/assets/images/default-avatar-32.png",
  );
  await expect(page.locator('#assignee li[data-value="2"] img[src=""]')).toHaveCount(0);
  expect(
    consoleMessages.filter((message) =>
      message.includes('An empty string ("") was passed to the src attribute'),
    ),
  ).toEqual([]);
});

test("project milestone detail mass update closes the checked issue through REST", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const massUpdateRequests: unknown[] = [];
  await mockProjectMilestoneDetail(page, [], [], {
    massUpdateRequests,
  });

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open#issues`);
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await page.check("#issue-41");
  await page.evaluate(() => {
    window.sessionStorage.setItem("milestone-detail-mass-update-marker", "kept");
  });

  const massUpdateRequest = page.waitForRequest((request) => {
    return request.method() === "POST" && request.url().includes("/issues/mass-update");
  });

  await page.click("#state > button");
  await expect(page.locator("#state")).toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await page.click('#state .mass-update-list li[data-value="CLOSED"] button');

  const request = await massUpdateRequest;
  expect(request.postDataJSON()).toMatchObject({
    issueNumbers: [11],
    state: "CLOSED",
  });
  await expect.poll(() => massUpdateRequests.length).toBe(1);
  expect(massUpdateRequests).toEqual([
    expect.objectContaining({
      issueNumbers: [11],
      state: "CLOSED",
    }),
  ]);
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/5?state=open#issues`);
  await expect(
    page.evaluate(() => window.sessionStorage.getItem("milestone-detail-mass-update-marker")),
  ).resolves.toBe("kept");
  await expect(page.locator("#state")).not.toHaveClass(/(?:^|\s)open(?:\s|$)/u);
  await expect(page.locator("#state > button")).toBeDisabled();
  await expect(page.locator("#issue-item-41")).toHaveCount(0);
  await expect(
    page.locator('#issues .nav-tabs a[href$="?state=open#issues"] .num-badge'),
  ).toHaveText("0");
  await expect(
    page.locator('#issues .nav-tabs a[href$="?state=closed#issues"] .num-badge'),
  ).toHaveText("2");

  await page.click('#issues .nav-tabs a:has-text("Closed")');
  await expect(page).toHaveURL(`${basePath}/admin/sample/milestone/5?state=closed#issues`);
  await expect(page.locator("#issue-item-41")).toContainText("#11[UI]Open milestone issue");
  await expect(page.locator("#issue-item-42")).toContainText("#12Closed milestone issue");
});

test("project milestone detail keeps mass-update shell visible but inert for readable outsiders", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const massUpdateRequests: unknown[] = [];
  await mockProjectMilestoneDetail(page, [], [], {
    massUpdateRequests,
    milestone: {
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
      viewerCanDelete: false,
      viewerCanUpdate: false,
    },
    project: {
      members: [
        {
          avatarUrl: "/assets/images/admin-avatar.png",
          loginId: "admin",
          role: "manager",
          userId: 1,
          userLabel: "Site Admin",
        },
        {
          avatarUrl: "/assets/images/dev-avatar.png",
          loginId: "dev",
          role: "member",
          userId: 2,
          userLabel: "Dev Member",
        },
      ],
      viewerCanUpdate: false,
    },
    session: {
      actorId: 99,
      avatarUrl: "/assets/images/default-avatar-32.png",
      isSiteAdmin: false,
      loginId: "outsider",
      userLabel: "Readable Outsider",
    },
  });

  await page.goto(`${basePath}/admin/sample/milestone/5?state=open#issues`);

  await expect(page.locator("#mass-update-form")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issue-item-41 .mass-update-check")).toHaveCount(0);
  await expect(page.locator('#issue-item-41 input[name="checked-issue"]')).toHaveCount(0);
  await expect(page.locator("#state > button")).toBeDisabled();
  await expect(
    page.locator('.actrow [data-toggle="modal"][data-target="#deleteConfirm"]'),
  ).toHaveCount(0);
  await expect(page.locator('.actrow [href$="/milestone/5/editform"]')).toHaveCount(0);
  await expect(page.locator('.actrow [data-request-uri$="/milestone/5/close"]')).toHaveCount(0);
  await expect(page.locator("#assignee")).not.toContainText("Assign to me");
  await expect(page.locator('#assignee li[data-value="99"]')).toHaveCount(0);
  await expect(page.locator('#assignee li[data-value="1"] .usf-group')).toContainText(
    "Site Admin @admin",
  );
  await expect(page.locator('#assignee li[data-value="2"] .usf-group')).toContainText(
    "Dev Member @dev",
  );
  await expect(page.locator("#assignee")).not.toContainText("outsider");

  await page.click("#check-all");

  await expect(page.locator("#check-all")).not.toBeChecked();
  await expect(page.locator("#state > button")).toBeDisabled();
  await expect.poll(() => massUpdateRequests.length).toBe(0);
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
  await expect(
    page.locator('#issue-item-41 .infos > a.issue-label[data-category-id="3"][data-label-id="8"]'),
  ).toHaveCount(0);

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
  const massUpdateSection = routeSource.slice(
    routeSource.indexOf("function MassUpdateShell"),
    routeSource.indexOf("function MilestoneIssueRow"),
  );
  const massUpdatePreventDefaultCount = (
    massUpdateSection.match(/event\.preventDefault\(\);/g) ?? []
  ).length;
  const massUpdateStopPropagationCount = (
    massUpdateSection.match(/event\.stopPropagation\(\);/g) ?? []
  ).length;

  expect(routeSource).not.toContain("LegacyInternalLink");
  expect(routeSource).not.toContain("AnchorHTMLAttributes");
  expect(routeSource).not.toContain("ComponentType");
  expect(routeSource).not.toContain('declare module "react"');
  expect(routeSource).not.toContain("LiHTMLAttributes");
  expect(routeSource).not.toContain("legacyHref");
  expect(routeSource).not.toContain("legacyFor");
  expect(routeSource).not.toContain("as unknown as");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("classList");
  expect(routeSource).not.toContain("style.display");
  expect(routeSource).not.toContain("<script");
  expect(routeSource).not.toContain("highlight.pack.js");
  expect(routeSource).not.toContain("marked.js");
  expect(routeSource).not.toContain("<div for={`issue-");
  expect(routeSource).not.toContain(
    "!projectQuery.data || !sessionQuery.data || milestoneQuery.isPending",
  );
  expect(routeSource).not.toContain("projectSearchScope={{ ownerName, projectName }}");
  expect(routeSource).toContain(
    "organizationName: projectSearchScopeOrganizationName(projectQuery.data, ownerName)",
  );
  expect(routeSource).toContain(
    "function projectSearchScopeOrganizationName(project: ProjectContainer, ownerName: string)",
  );
  expect(routeSource).toContain(
    "return booleanField(project.isProtected) ? ownerName : undefined;",
  );
  expect(routeSource).toContain("projectSearchScope={projectSearchScope}");
  expect(routeSource).not.toContain("document.title");
  expect(routeSource).toContain(
    "type LegacyIssueListItemAttrs = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(routeSource).toContain(
    "return milestoneTitle ? <title>{`${milestoneTitle} - ${ownerName}/${projectName}`}</title> : null;",
  );
  expect(routeSource).toContain(
    '<title>{`${t("error.notfound")} - ${ownerName}/${projectName}`}</title>',
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
  expect(routeSource).toContain(
    "const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)",
  );
  expect(routeSource).toContain('data-toggle="modal"');
  expect(routeSource).toContain('data-target="#deleteConfirm"');
  expect(routeSource).toContain('data-dismiss="modal"');
  expect(routeSource).toContain("event.stopPropagation();");
  expect(massUpdateSection).not.toContain("document.addEventListener");
  expect(massUpdateStopPropagationCount).toBeGreaterThan(0);
  expect(massUpdatePreventDefaultCount).toBe(massUpdateStopPropagationCount);
  expect(routeSource).toContain('<div className="modal-backdrop fade in"></div>');
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
  const childIssueListSource = readFileSync(
    "../yona-original/app/views/issue/partial_view_childIssueListOnly.scala.html",
    "utf8",
  );
  const childIssueSource = readFileSync(
    "../yona-original/app/views/issue/partial_view_child.scala.html",
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

  for (const snippet of [
    '<div class="child-issues">',
    '@partial_view_child("open", childIssue, issue)',
    '@partial_view_child("closed", childIssue, issue)',
  ]) {
    expect(childIssueListSource).toContain(snippet);
  }

  for (const snippet of [
    '<div class="issue-item @if(childIssue.id == parentIssue.id){selected-child} child-issue">',
    '<span class="state-label @state">',
    '<a class="twoColumeModeTarget" href="@routes.IssueApp.issue(childIssue.project.owner, childIssue.project.name, childIssue.getNumber)">',
    '<span class="font12 no-border-at-child">@common.commentAndVoterPairDisplay(childIssue, parentIssue.project)</span>',
    '<span class="child-issue-date" title="@JodaDateUtil.getDateString(childIssue.createdDate)">',
  ]) {
    expect(childIssueSource).toContain(snippet);
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

  await expect(
    page.locator(`script[src="${basePath}/assets/javascripts/lib/highlight/highlight.pack.js"]`),
  ).toHaveCount(0);
  await expect(
    page.locator(`script[src="${basePath}/assets/javascripts/lib/marked.js"]`),
  ).toHaveCount(0);
  await expect(page.locator('meta[name="yona-current-user-login-id"]')).toHaveCount(0);

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

async function expectHeadTitle(page: Page, expectedTitle: string) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        return document.head.querySelector("title")?.textContent ?? "";
      }),
    )
    .toBe(expectedTitle);
}

async function mockProjectMilestoneDetail(
  page: Page,
  stateRequests: unknown[],
  deleteRequests: string[],
  overrides?: {
    massUpdateRequests?: unknown[];
    milestoneId?: number;
    milestoneNotFound?: boolean;
    ownerName?: string;
    projectName?: string;
    milestone?: Record<string, unknown>;
    project?: Record<string, unknown>;
    session?: Record<string, unknown>;
    sessionUnavailable?: boolean;
  },
) {
  const ownerName = overrides?.ownerName ?? "admin";
  const projectName = overrides?.projectName ?? "sample";
  const milestoneId = overrides?.milestoneId ?? 5;
  let milestone = {
    ...(milestoneId === 1 ? parityLaunchMilestoneFixture() : milestoneFixture()),
    ...overrides?.milestone,
  };
  await page.route("**/api/v1/session", async (route) => {
    if (overrides?.sessionUnavailable) {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "session_unavailable",
            message: "Session unavailable",
            status: 503,
          },
        }),
      });
      return;
    }
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
        ...overrides?.session,
      }),
    });
  });
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/container`,
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
          members: [
            {
              avatarUrl: "/assets/images/admin-avatar.png",
              loginId: "admin",
              role: "manager",
              userId: 1,
              userLabel: "Site Admin",
            },
            {
              avatarUrl: "/assets/images/dev-avatar.png",
              loginId: "dev",
              role: "member",
              userId: 2,
              userLabel: "Dev Member",
            },
          ],
          openIssueCount: 1,
          openPullRequestCount: 1,
          ownerName,
          postCount: 1,
          projectName,
          reviewCount: 2,
          vcs: "GIT",
          viewerCanUpdate: true,
          ...overrides?.project,
        }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/milestones/${milestoneId}`,
    async (route) => {
      if (route.request().method() === "DELETE") {
        deleteRequests.push("DELETE");
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ redirectPath: "/admin/sample/milestones" }),
        });
        return;
      }
      if (overrides?.milestoneNotFound) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "milestone_not_found",
              message: "Milestone does not exist",
              status: 404,
            },
          }),
        });
        return;
      }
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ milestone }),
      });
    },
  );
  await page.route(
    `**/api/v1/owners/${ownerName}/projects/${projectName}/milestones/${milestoneId}/state`,
    async (route) => {
      stateRequests.push(route.request().postDataJSON());
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          milestone: {
            ...milestone,
            state: "closed",
          },
        }),
      });
    },
  );
  await page.route("**/issues/mass-update", async (route) => {
    const requestBody = route.request().postDataJSON() as {
      issueNumbers?: unknown;
      state?: unknown;
    };
    overrides?.massUpdateRequests?.push(requestBody);

    if (
      requestBody.state === "CLOSED" &&
      Array.isArray(requestBody.issueNumbers) &&
      requestBody.issueNumbers.some((issueNumber) => Number(issueNumber) === 11)
    ) {
      const openIssues = Array.isArray(milestone.openIssues)
        ? [...(milestone.openIssues as Array<Record<string, unknown>>)]
        : [];
      const closedIssues = Array.isArray(milestone.closedIssues)
        ? [...(milestone.closedIssues as Array<Record<string, unknown>>)]
        : [];
      const movedIssues: Array<Record<string, unknown>> = [];
      const remainingOpenIssues: Array<Record<string, unknown>> = [];

      for (const issue of openIssues) {
        if (Number(issue.issueNumber) === 11) {
          movedIssues.push({
            ...issue,
            state: "closed",
          });
        } else {
          remainingOpenIssues.push(issue);
        }
      }

      milestone = {
        ...milestone,
        closedIssueCount: closedIssues.length + movedIssues.length,
        closedIssues: [...closedIssues, ...movedIssues],
        completionPercent: 100,
        openIssueCount: remainingOpenIssues.length,
        openIssues: remainingOpenIssues,
      };
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({}),
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
        childIssues: [
          {
            assigneeLabel: "Dev Member",
            commentCount: 1,
            createdLabel: "2026-06-02",
            id: 61,
            issueNumber: 21,
            labels: [
              {
                categoryId: "3",
                categoryName: "type",
                color: "#51aacc",
                id: "8",
                name: "bug",
              },
            ],
            state: "open",
            title: "Open child issue",
            voterCount: 2,
          },
          {
            createdLabel: "2026-06-03",
            id: 62,
            issueNumber: 22,
            labels: [],
            state: "closed",
            title: "Closed child issue",
          },
        ],
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

function parityLaunchMilestoneFixture() {
  const base = milestoneFixture();
  return {
    ...base,
    closedIssueCount: 0,
    closedIssues: [],
    completionPercent: 0,
    dueDateLabel: "2026-07-31",
    id: 1,
    openIssueCount: 1,
    openMilestones: [
      {
        id: 1,
        title: "Parity launch",
      },
    ],
    openIssues: [
      {
        ...(base.openIssues[0] as Record<string, unknown>),
        id: 1,
        issueNumber: 1,
        milestoneId: 1,
        milestoneTitle: "Parity launch",
        title: "Sample issue",
      },
    ],
    title: "Parity launch",
    untilLabel: "24 days left",
  };
}

async function milestoneDetailShellMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".project-header-outer");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
    const title = document.querySelector<HTMLElement>(".milesion-wrap h4 .title");
    if (!header || !menu || !pageWrap || !title) {
      throw new Error("Expected project shell metric targets are missing.");
    }
    const headerBox = header.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    const pageWrapBox = pageWrap.getBoundingClientRect();
    const titleBox = title.getBoundingClientRect();
    return {
      headerHeight: Math.round(headerBox.height),
      menuHeight: Math.round(menuBox.height),
      menuBelowHeader: menuBox.top >= headerBox.bottom - 1,
      pageWrapBelowMenu: pageWrapBox.top >= menuBox.bottom - 1,
      titleBelowMenu: titleBox.top >= menuBox.bottom - 1,
      titleWithinPage: titleBox.left >= pageWrapBox.left && titleBox.right <= pageWrapBox.right,
    };
  });
}

async function milestoneDetailGnbSearchMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".gnb-outer.project-header");
    const form = document.querySelector<HTMLElement>(".gnb-search-form");
    const scope = document.querySelector<HTMLElement>("#gnb-search-scope-title");
    const input = document.querySelector<HTMLElement>(".gnb-search-form input[name='keyword']");
    if (!header || !form || !scope || !input) {
      throw new Error("Expected GNB search metric targets are missing.");
    }
    const headerBox = header.getBoundingClientRect();
    const formBox = form.getBoundingClientRect();
    const scopeBox = scope.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();
    return {
      formInsideHeader:
        formBox.top >= headerBox.top &&
        formBox.bottom <= headerBox.bottom &&
        formBox.left >= headerBox.left &&
        formBox.right <= headerBox.right,
      inputInsideForm:
        inputBox.top >= formBox.top &&
        inputBox.bottom <= formBox.bottom &&
        inputBox.left >= formBox.left &&
        inputBox.right <= formBox.right,
      scopeInsideForm:
        scopeBox.top >= formBox.top &&
        scopeBox.bottom <= formBox.bottom &&
        scopeBox.left >= formBox.left &&
        scopeBox.right <= formBox.right,
    };
  });
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
    const markdown = document.querySelector<HTMLElement>(".milestone-desc .markdown-wrap");
    const filter = document.querySelector<HTMLElement>(".milesion-wrap #issues .filter-wrap");
    const progress = document.querySelector<HTMLElement>(".milesion-wrap .progress");
    const progressBar = document.querySelector<HTMLElement>(".milesion-wrap .progress .bar");
    if (!desc || !markdown || !filter || !progress || !progressBar) {
      throw new Error("Expected milestone detail metric targets are missing.");
    }
    const descStyle = getComputedStyle(desc);
    const descBox = desc.getBoundingClientRect();
    const markdownBox = markdown.getBoundingClientRect();
    return {
      descBackgroundColor: descStyle.backgroundColor,
      descBorderBottomWidth: descStyle.borderBottomWidth,
      descBorderTopWidth: descStyle.borderTopWidth,
      descMarginBottom: descStyle.marginBottom,
      descMarginTop: descStyle.marginTop,
      descPaddingLeft: descStyle.paddingLeft,
      descPaddingTop: descStyle.paddingTop,
      filterMinHeight: getComputedStyle(filter).minHeight,
      markdownInsideDesc:
        markdownBox.top >= descBox.top &&
        markdownBox.bottom <= descBox.bottom &&
        markdownBox.left >= descBox.left &&
        markdownBox.right <= descBox.right,
      markdownScriptBootstrapCount: document.querySelectorAll(
        'script[src*="highlight.pack.js"], script[src*="marked.js"]',
      ).length,
      progressBackgroundColor: getComputedStyle(progress).backgroundColor,
      progressBarBackgroundColor: getComputedStyle(progressBar).backgroundColor,
    };
  });
}

async function milestoneDetailActionRowMetrics(page: Page) {
  return page.evaluate(() => {
    const actionRow = document.querySelector<HTMLElement>(".actrow.right-txt.row-fluid");
    const listButton = document.querySelector<HTMLElement>(".actrow .ybtn.pull-left");
    const deleteButton = document.querySelector<HTMLElement>(".actrow .ybtn.ybtn-danger");
    const editButton = document.querySelector<HTMLElement>(
      '.actrow .ybtn[href$="/milestone/5/editform"]',
    );
    const closeButton = document.querySelector<HTMLElement>(
      '.actrow [data-request-uri$="/milestone/5/close"]',
    );
    if (!actionRow || !listButton || !deleteButton || !editButton || !closeButton) {
      throw new Error("Expected milestone detail action row controls are missing.");
    }
    return {
      actionRowDisplay: getComputedStyle(actionRow).display,
      actionRowLeft: Math.round(actionRow.getBoundingClientRect().left),
      actionRowRight: Math.round(actionRow.getBoundingClientRect().right),
      closeLeft: Math.round(closeButton.getBoundingClientRect().left),
      closeRight: Math.round(closeButton.getBoundingClientRect().right),
      deleteLeft: Math.round(deleteButton.getBoundingClientRect().left),
      editLeft: Math.round(editButton.getBoundingClientRect().left),
      listLeft: Math.round(listButton.getBoundingClientRect().left),
      listRight: Math.round(listButton.getBoundingClientRect().right),
    };
  });
}

async function canonicalizeMilestoneRouteRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".page-wrap-outer, #deleteConfirm"));
    const routeRoots = Array.from(new Set(roots));
    const routeRootSet = new Set(routeRoots);
    return routeRoots.map((root) => visit(root, root)).join("");

    function visit(node: Node, currentRoot: Element): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      if (node !== currentRoot && routeRootSet.has(node)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => shouldKeepAttr(node, attr))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(node, attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child, currentRoot))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(element: Element, attr: Attr) {
      return attr.name === "style" ? normalizeStyleAttr(element, attr.value) : attr.value;
    }

    function normalizeStyleAttr(element: Element, value: string) {
      const normalized = value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
      if (element.matches(".actrow.right-txt.row-fluid") && normalized.includes("display:block")) {
        return normalized
          .replace("display:block;", "")
          .replace(";display:block", "")
          .replace("display:block", "");
      }
      return normalized;
    }

    function shouldKeepAttr(node: Element, attr: Attr) {
      if (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "aria-current" ||
        attr.name === "data-status" ||
        (node.tagName === "A" && attr.name.startsWith("data-"))
      ) {
        return false;
      }
      return attr.name !== "class" || normalizeAttr(node, attr) !== "";
    }
  });
}

async function canonicalizeHtml(page: Page, html: string) {
  return page.evaluate((input) => {
    const template = document.createElement("template");
    template.innerHTML = input;
    return Array.from(template.content.children)
      .map((root) => visit(root))
      .join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => shouldKeepAttr(node, attr))
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((attr) => `${attr.name}=${JSON.stringify(normalizeAttr(attr))}`)
        .join(" ");
      const open = attrs
        ? `<${node.tagName.toLowerCase()} ${attrs}>`
        : `<${node.tagName.toLowerCase()}>`;
      return `${open}${Array.from(node.childNodes)
        .map((child) => visit(child))
        .join("")}</${node.tagName.toLowerCase()}>`;
    }

    function normalizeText(text: string) {
      return text.replace(/\s+/g, " ").trim();
    }

    function normalizeAttr(attr: Attr) {
      return attr.name === "style" ? normalizeStyleAttr(attr.value) : attr.value;
    }

    function normalizeStyleAttr(value: string) {
      return value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'");
    }

    function shouldKeepAttr(node: Element, attr: Attr) {
      if (
        attr.name.startsWith("data-v-") ||
        attr.name === "alt" ||
        attr.name === "aria-current" ||
        attr.name === "data-status" ||
        (node.tagName === "A" && attr.name.startsWith("data-"))
      ) {
        return false;
      }
      return attr.name !== "class" || normalizeAttr(attr) !== "";
    }
  }, html);
}
