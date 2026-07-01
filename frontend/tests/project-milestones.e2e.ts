import { expect, test, type Page } from "@playwright/test";

const BUG_LABEL_STYLE = "background:rgb(81,170,204)";

const EXPECTED_MILESTONES_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="tab-wrap"><div class="pull-right btns"><a href="__BASE_PATH__/admin/sample/newMilestoneForm" class="ybtn ybtn-success">New milestone</a></div><ul class="nav nav-tabs"><li class="active"><a href="__BASE_PATH__/admin/sample/milestones?state=open">Open</a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=closed">Closed</a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=all">All</a></li></ul></div><div class="filter-wrap milestone"><div class="filters"><a href="__BASE_PATH__/admin/sample/milestones?orderBy=dueDate&amp;orderDir=desc&amp;state=open" class="filter active"><i class="ico btn-gray-arrow "></i>Due Date</a><a href="__BASE_PATH__/admin/sample/milestones?orderBy=completionRate&amp;orderDir=asc&amp;state=open" class="filter"><i class="ico btn-gray-arrow"></i>Completion Rate</a></div><div class="pull-left search search-bar"><input name="filter" class="textbox" type="text" placeholder="Search" value=""><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div><div class="row-fluid"><div><ul class="milestones"><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/5" class="milestone-name">v1.0</a><span class="sp">|</span><span class="issue-item">1 / 2</span><span class="sp">|</span><span class="due-date over">Due Date<strong>2026-06-30</strong><span class="date">(Overdue)</span></span><div class="pull-right"><span class="number completion-rate">50 %</span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:50%"></div></div></div></div><div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/11" target="_blank"><div class="issue-item"><span class="state-label open"></span><span class="item-name"><span class="number">#11</span>Open milestone issue - Dev Member<a href="#" class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</a></span></div></a></div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/12" target="_blank"><div class="issue-item"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><span class="item-name"><span class="number">#12</span>Closed milestone issue<a href="#" class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</a></span></div></a></div></div></li><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/6" class="milestone-name">v2.0</a><span class="sp">|</span><span class="issue-item">0 / 0</span><span class="sp">|</span><span class="due-date ">Due Date<strong>2026-08-31</strong><span class="date">(D-61)</span></span><div class="pull-right"><span class="number completion-rate"></span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:0%"></div></div></div></div><div><div></div><div></div><div></div><div></div></div></li></ul></div></div></div></div>
`;

const EXPECTED_MILESTONES_ALL_BODY = `
<div class="page-wrap-outer"><div class="project-page-wrap"><div class="tab-wrap"><div class="pull-right btns"><a href="__BASE_PATH__/admin/sample/newMilestoneForm" class="ybtn ybtn-success">New milestone</a></div><ul class="nav nav-tabs"><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=open">Open</a></li><li class=""><a href="__BASE_PATH__/admin/sample/milestones?state=closed">Closed</a></li><li class="active"><a href="__BASE_PATH__/admin/sample/milestones?state=all">All</a></li></ul></div><div class="filter-wrap milestone"><div class="filters"><a href="__BASE_PATH__/admin/sample/milestones?orderBy=dueDate&amp;orderDir=desc&amp;state=all" class="filter active"><i class="ico btn-gray-arrow "></i>Due Date</a><a href="__BASE_PATH__/admin/sample/milestones?orderBy=completionRate&amp;orderDir=asc&amp;state=all" class="filter"><i class="ico btn-gray-arrow"></i>Completion Rate</a></div><div class="pull-left search search-bar"><input name="filter" class="textbox" type="text" placeholder="Search" value=""><button type="submit" class="search-btn"><i class="yobicon-search"></i></button></div></div><div class="row-fluid"><div><ul class="milestones"><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/5" class="milestone-name">v1.0</a><span class="sp">|</span><span class="issue-item">1 / 2</span><span class="sp">|</span><span class="state nm open">Open</span><span class="sp">|</span><span class="due-date over">Due Date<strong>2026-06-30</strong><span class="date">(Overdue)</span></span><div class="pull-right"><span class="number completion-rate">50 %</span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:50%"></div></div></div></div><div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/11" target="_blank"><div class="issue-item"><span class="state-label open"></span><span class="item-name"><span class="number">#11</span>Open milestone issue - Dev Member<a href="#" class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</a></span></div></a></div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/12" target="_blank"><div class="issue-item"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><span class="item-name"><span class="number">#12</span>Closed milestone issue<a href="#" class="label issue-label list-label active" data-category-id="3" data-label-id="8" style="${BUG_LABEL_STYLE}">bug</a></span></div></a></div></div></li><li class="milestone"><div class="infos"><div class="meta-info"><strong class="version"></strong><a href="__BASE_PATH__/admin/sample/milestone/7" class="milestone-name">v0.9</a><span class="sp">|</span><span class="issue-item">1 / 1</span><span class="sp">|</span><span class="state nm closed">Closed</span><span class="sp">|</span><span class="due-date ml5">Due Date<strong>2026-05-31</strong></span><div class="pull-right"><span class="number completion-rate">100 %</span></div></div><div class="progress-wrap"><div class="progress progress-success"><div class="bar" style="width:100%"></div></div></div></div><div><div></div><div></div><div></div><div><a class="issue-link" href="__BASE_PATH__/admin/sample/issue/13" target="_blank"><div class="issue-item"><span class="state-label closed"><i class=" yobicon-checkmark"></i></span><span class="item-name"><span class="number">#13</span>Closed all-state issue</span></div></a></div></div></li></ul></div></div></div></div>
`;

test("project milestones list matches legacy milestone/list.scala.html populated DOM", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestones(page);

  await page.goto(`${basePath}/admin/sample/milestones?state=open&orderBy=dueDate&orderDir=asc`);
  await expect(page.locator(".project-menu-gruop li.active a .menu-name")).toHaveText("Milestone");
  await expect(page.locator("ul.milestones > li.milestone")).toHaveCount(2);
  await expect(page.locator('.issue-label[data-category-id="3"][data-label-id="8"]')).toHaveCount(
    2,
  );

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(page, EXPECTED_MILESTONES_BODY.replaceAll("__BASE_PATH__", basePath)),
  );

  await page.fill('.filter-wrap.milestone input[name="filter"]', "closed");
  await expect(
    page.locator('.issue-link[href$="/issue/11"]').filter({ hasText: "#11" }),
  ).toBeHidden();
  await expect(
    page.locator('.issue-link[href$="/issue/12"]').filter({ hasText: "#12" }),
  ).toBeVisible();
});

test("project milestones all-state list renders legacy open and closed state metadata", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectMilestones(page, "all");

  await page.goto(`${basePath}/admin/sample/milestones?state=all&orderBy=dueDate&orderDir=asc`);
  await expect(page.locator(".page-wrap-outer .nav-tabs li.active a")).toHaveText("All");
  await expect(page.locator(".state.nm.open")).toHaveText("Open");
  await expect(page.locator(".state.nm.closed")).toHaveText("Closed");
  await expect(
    page.locator(".milestone").filter({ hasText: "v0.9" }).locator(".due-date"),
  ).toHaveClass("due-date ml5");

  expect(await canonicalize(page, ".page-wrap-outer")).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_MILESTONES_ALL_BODY.replaceAll("__BASE_PATH__", basePath),
    ),
  );
});

async function mockProjectMilestones(page: Page, state: "all" | "open" = "open") {
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
  await page.route("**/api/v1/owners/admin/projects/sample/milestones?**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        milestones: state === "all" ? allStateMilestones() : openStateMilestones(),
      }),
    });
  });
}

function openStateMilestones() {
  return [
    {
      closedIssueCount: 1,
      completionPercent: 50,
      dueDateLabel: "2026-06-30",
      dueDateOverdue: true,
      id: 5,
      openIssueCount: 1,
      openIssues: [
        {
          assigneeLabel: "Dev Member",
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
          state: "open",
          title: "Open milestone issue",
        },
      ],
      closedIssues: [
        {
          assigneeLabel: "",
          issueNumber: 12,
          labels: [
            {
              categoryId: "3",
              categoryName: "type",
              color: "#51aacc",
              id: "8",
              name: "bug",
            },
          ],
          state: "closed",
          title: "Closed milestone issue",
        },
      ],
      state: "open",
      title: "v1.0",
      untilLabel: "Overdue",
      viewerCanUpdate: true,
    },
    {
      closedIssueCount: 0,
      completionPercent: 0,
      dueDateLabel: "2026-08-31",
      dueDateOverdue: false,
      id: 6,
      openIssueCount: 0,
      openIssues: [],
      closedIssues: [],
      state: "open",
      title: "v2.0",
      untilLabel: "D-61",
      viewerCanUpdate: true,
    },
  ];
}

function allStateMilestones() {
  return [
    openStateMilestones()[0],
    {
      closedIssueCount: 1,
      completionPercent: 100,
      dueDateLabel: "2026-05-31",
      dueDateOverdue: false,
      id: 7,
      openIssueCount: 0,
      openIssues: [],
      closedIssues: [
        {
          assigneeLabel: "",
          issueNumber: 13,
          labels: [],
          state: "closed",
          title: "Closed all-state issue",
        },
      ],
      state: "closed",
      title: "v0.9",
      untilLabel: "",
      viewerCanUpdate: true,
    },
  ];
}

async function canonicalize(page: Page, selector: string) {
  return page.locator(selector).evaluate((root) => {
    return visit(root);

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
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
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
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
        .filter((attr) => !attr.name.startsWith("data-v-") && attr.name !== "alt")
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
      return attr.name === "style" ? attr.value.replace(/\s+/g, "").replace(/;$/u, "") : attr.value;
    }
  }, html);
}
