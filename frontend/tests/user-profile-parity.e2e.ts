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

function profilePayload(input: {
  issueItems?: unknown[];
  loginId?: string;
  memberProjects?: unknown[];
  pullRequestItems?: unknown[];
  selected?: string;
}) {
  const loginId = input.loginId ?? "door";
  return {
    daysAgo: 7,
    issueItems: input.issueItems ?? [],
    memberProjects: input.memberProjects ?? [],
    profile: {
      avatarUrl: "",
      connectedSocialProviders: [],
      displayName: loginId === "door" ? "Door" : "Admin",
      englishName: loginId === "door" ? "Door English" : "Admin English",
      isBlocked: false,
      isSiteAdmin: false,
      loginId,
      primaryEmailAddress: "",
      sinceLabel: "May 16, 2026",
    },
    pullRequestItems: input.pullRequestItems ?? [],
    selected: input.selected ?? "projects",
    viewerCanEditProfile: loginId === "admin",
  };
}

function profileProject() {
  return {
    createdLabel: "May 16, 2026",
    lastPushedLabel: "May 16, 2026",
    memberCount: 2,
    ownerName: "owner",
    overview: "Visible member project",
    projectName: "publicYobi",
    projectScope: "public",
    watchCount: 3,
  };
}

function profileIssue() {
  return {
    assigneeLabel: "Door",
    assigneeLoginId: "door",
    authorLabel: "Door",
    authorLoginId: "door",
    commentCount: 1,
    id: 101,
    issueNumber: 11,
    ownerName: "owner",
    projectName: "publicYobi",
    state: "open",
    title: "Visible issue",
    updatedLabel: "Jun 26, 2026",
  };
}

async function authenticateAsDoor(page: Page) {
  await page.unroute("**/api/auth/session");
  await page.unroute(apiV1Route("/session"));
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "admin" },
        user: { isSiteAdmin: false, loginId: "admin" },
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
        isSiteAdmin: false,
        loginId: "admin",
        userLabel: "Admin",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [profileIssue()],
        memberProjects: [profileProject()],
        profile: profilePayload({ loginId: "admin", selected: "issues" }).profile,
        pullRequestItems: [],
        recentProjects: [],
        selected: "issues",
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
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
      body: JSON.stringify({
        session: null,
        user: null,
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
});

test("public user profile route preserves the legacy user view shell", async ({ page }) => {
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 7,
        issueItems: [],
        memberProjects: [
          {
            createdLabel: "May 16, 2026",
            lastPushedLabel: "May 16, 2026",
            memberCount: 2,
            ownerName: "owner",
            overview: "Visible member project",
            projectName: "publicYobi",
            projectScope: "public",
            watchCount: 3,
          },
        ],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door",
          englishName: "Door English",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "May 16, 2026",
        },
        pullRequestItems: [],
        selected: "projects",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/door?daysAgo=7&selected=projects");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer .user-box")).toBeVisible();
  await expect(page.locator(".user-info-box .loginid")).toHaveText("@door");
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator(".user-streams.all-projects .project")).toHaveCount(1);
  await expect(page.locator('a.project-name[href="/yona/owner/publicYobi"]')).toBeVisible();
  await expect(page.getByText("Default landing")).toHaveCount(0);
  await expect(page.getByText("Sign out")).toHaveCount(0);
  await expect(page.getByText("Edit Profile")).toHaveCount(0);

  const breadcrumb = await layoutBox(page, ".site-breadcrumb-outer");
  const pageWrapOuter = await layoutBox(page, ".page-wrap-outer");
  const pageWrap = await layoutBox(page, ".page-wrap");
  const userBox = await layoutBox(page, ".user-box");
  const infoBox = await layoutBox(page, ".user-info-box");
  const avatarBox = await layoutBox(page, ".whoami-wrap");
  const whoami = await layoutBox(page, ".whoami.usf-group");
  const streamBox = await layoutBox(page, ".user-stream-box");
  const daysAgoControl = await layoutBox(page, "#daysAgoBtn");
  const mainTabs = await layoutBox(page, ".user-stream-box > .nav.nav-tabs");
  const activeProjectsTab = await layoutBox(page, ".user-stream-box > .nav.nav-tabs > li.active");
  const tabContent = await layoutBox(page, ".user-stream-box > .tab-content");
  const projectsPane = await layoutBox(page, "#projects");
  const projectsList = await layoutBox(page, "#projects .user-streams.all-projects");
  const projectRow = await layoutBox(page, "#projects .user-streams.all-projects .project");

  expect(pageWrapOuter.y).toBeGreaterThan(breadcrumb.y + breadcrumb.height - 1);
  expect(pageWrap.x).toBeGreaterThanOrEqual(pageWrapOuter.x);
  expect(userBox.y).toBeGreaterThanOrEqual(pageWrap.y);
  expect(infoBox.x).toBeCloseTo(userBox.x, 0);
  expect(streamBox.x).toBeGreaterThanOrEqual(userBox.x);
  expect(streamBox.y).toBeGreaterThan(infoBox.y);
  expect(avatarBox.y).toBeGreaterThanOrEqual(infoBox.y);
  expect(whoami.y).toBeGreaterThan(avatarBox.y + avatarBox.height - 1);
  expect(daysAgoControl.y).toBeGreaterThanOrEqual(streamBox.y);
  expect(mainTabs.y).toBeGreaterThanOrEqual(streamBox.y);
  expect(activeProjectsTab.y).toBeGreaterThanOrEqual(mainTabs.y);
  expect(tabContent.y).toBeGreaterThan(mainTabs.y + mainTabs.height - 1);
  expect(projectsPane.y).toBeGreaterThanOrEqual(tabContent.y);
  expect(projectsList.y).toBeGreaterThanOrEqual(projectsPane.y);
  expect(projectRow.y).toBeGreaterThanOrEqual(projectsList.y);
});

test("public user profile issue and project partials preserve legacy row anchors and metrics", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify(
        profilePayload({
          issueItems: [profileIssue()],
          memberProjects: [
            {
              ...profileProject(),
              isWatching: false,
              originOwnerName: "origin",
              originProjectName: "upstream",
              projectScope: "private",
              viewerCanLeave: true,
              viewerCanWatch: true,
            },
          ],
          selected: "issues",
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/door?daysAgo=7&selected=issues");
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#issues']")).toBeVisible();
  await expect(page.locator("#issues .post-list-wrap.my-issues .post-item")).toHaveCount(1);
  await expect(page.locator("#issue-item-101")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi/issue/11",
  );
  await expect(page.locator("#issue-item-101 .title.project")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi",
  );
  await expect(page.locator("#issue-item-101 .title.project")).toHaveAttribute(
    "data-toggle",
    "tooltip",
  );
  await expect(page.locator("#issue-item-101 .title.project")).toHaveAttribute(
    "data-placement",
    "bottom",
  );
  await expect(page.locator("#issue-item-101 .infos-item.post-id")).toHaveText("#11");
  await expect(page.locator("#issue-item-101 .title-cell > a.title")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi/issue/11",
  );
  await expect(page.locator("#issue-item-101 .item-count-groups .num-comments")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi/issue/11#comments",
  );
  await expect(page.locator("#issue-item-101 .for-subtask-progressbar")).toBeAttached();
  await expect(page.locator("#issue-item-101 .child-issue-list.hide")).toBeAttached();
  await expect(page.locator("#issue-item-101 .author-cell").first()).toHaveAttribute(
    "href",
    "/yona/door",
  );
  await expect(page.locator("#issue-item-101 .author-cell").first()).toHaveAttribute(
    "title",
    "door",
  );

  const issueList = await layoutBox(page, "#issues .post-list-wrap.my-issues");
  const issueRow = await layoutBox(page, "#issue-item-101");
  const issueProjectCell = await layoutBox(page, "#issue-item-101 .project-name-in-my-issues");
  const issueTitleWrap = await layoutBox(page, "#issue-item-101 .title-wrap.span5");
  const issueAuthorCell = await layoutBox(
    page,
    "#issue-item-101 .author.project-name-in-my-issues",
  );
  const issueMetaCell = await layoutBox(page, "#issue-item-101 .infos.meta");
  const issueStyles = await page.locator("#issues").evaluate((element) => {
    const list = element.querySelector(".post-list-wrap.my-issues") as HTMLElement;
    const row = element.querySelector("#issue-item-101") as HTMLElement;
    return {
      listDisplay: window.getComputedStyle(list).display,
      rowDisplay: window.getComputedStyle(row).display,
    };
  });

  expect(issueRow.y).toBeGreaterThanOrEqual(issueList.y);
  expect(issueProjectCell.x).toBeGreaterThanOrEqual(issueRow.x);
  expect(issueTitleWrap.x).toBeGreaterThan(issueProjectCell.x + issueProjectCell.width - 1);
  expect(issueAuthorCell.x).toBeGreaterThan(issueTitleWrap.x + issueTitleWrap.width - 1);
  expect(issueMetaCell.x).toBeGreaterThan(issueAuthorCell.x + issueAuthorCell.width - 1);
  expect(issueStyles).toEqual({ listDisplay: "block", rowDisplay: "block" });

  await page.locator(".nav.nav-tabs > li a[href='#projects']").click();
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#projects']")).toBeVisible();
  await expect(page.locator(".user-streams.all-projects .project")).toHaveCount(1);
  await expect(page.locator(".user-streams.all-projects .avatar-wrap.small")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi",
  );
  await expect(page.locator(".user-streams.all-projects .project-name")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi",
  );
  await expect(page.locator(".user-streams.all-projects .yobicon-split.vmiddle")).toBeAttached();
  await expect(
    page.locator(".user-streams.all-projects .yobicon-lock.yobicon-small"),
  ).toBeAttached();
  await expect(page.locator(".user-streams.all-projects .owner-name-small")).toHaveAttribute(
    "href",
    "/yona/owner",
  );
  await expect(page.locator(".user-streams.all-projects .ybtn.watchBtn")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi/watch",
  );
  await expect(page.locator(".user-streams.all-projects .ybtn.watchBtn .num-badge")).toHaveText(
    "3",
  );
  await expect(page.locator(".user-streams.all-projects .leaveProject")).toHaveAttribute(
    "data-projectname",
    "publicYobi",
  );
  await expect(page.locator(".user-streams.all-projects .leaveProject")).toHaveAttribute(
    "href",
    "/yona/info/leave/owner/publicYobi",
  );

  const projectList = await layoutBox(page, ".user-streams.all-projects");
  const projectRow = await layoutBox(page, ".user-streams.all-projects .project");
  const projectInfo = await layoutBox(page, ".user-streams.all-projects .info-wrap");
  const projectAvatar = await layoutBox(page, ".user-streams.all-projects .avatar-wrap.small");
  const projectText = await layoutBox(
    page,
    ".user-streams.all-projects .info-wrap > .pull-left:nth-child(2)",
  );
  const projectStats = await layoutBox(page, ".user-streams.all-projects .stats-wrap.pull-right");
  const projectStyles = await page.locator(".user-streams.all-projects").evaluate((element) => {
    const row = element.querySelector(".project") as HTMLElement;
    const avatarRail = element.querySelector(".info-wrap > .pull-left") as HTMLElement;
    const stats = element.querySelector(".stats-wrap") as HTMLElement;
    return {
      avatarFloat: window.getComputedStyle(avatarRail).float,
      rowDisplay: window.getComputedStyle(row).display,
      statsFloat: window.getComputedStyle(stats).float,
    };
  });

  expect(projectRow.y).toBeGreaterThanOrEqual(projectList.y);
  expect(projectInfo.x).toBeGreaterThanOrEqual(projectRow.x);
  expect(projectAvatar.x).toBeGreaterThanOrEqual(projectInfo.x);
  expect(projectText.x).toBeGreaterThan(projectAvatar.x + projectAvatar.width - 1);
  expect(projectStats.x).toBeGreaterThan(projectText.x);
  expect(projectStats.x + projectStats.width).toBeLessThanOrEqual(
    projectRow.x + projectRow.width + 1,
  );
  expect(projectStyles).toEqual({
    avatarFloat: "left",
    rowDisplay: "list-item",
    statsFloat: "right",
  });
});

test("public user profile tabs preserve the legacy selected query state on click", async ({
  page,
}) => {
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 7,
        issueItems: [
          {
            assigneeLabel: "Door",
            assigneeLoginId: "door",
            authorLabel: "Door",
            authorLoginId: "door",
            commentCount: 0,
            issueNumber: 11,
            ownerName: "owner",
            projectName: "publicYobi",
            state: "open",
            title: "Visible issue",
            updatedLabel: "Jun 26, 2026",
          },
        ],
        memberProjects: [
          {
            createdLabel: "May 16, 2026",
            lastPushedLabel: "May 16, 2026",
            memberCount: 2,
            ownerName: "owner",
            overview: "Visible member project",
            projectName: "publicYobi",
            projectScope: "public",
            watchCount: 3,
          },
        ],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door",
          englishName: "Door English",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "May 16, 2026",
        },
        pullRequestItems: [
          {
            commentCount: 0,
            contributorLabel: "Door",
            contributorLoginId: "door",
            ownerName: "owner",
            projectName: "publicYobi",
            pullRequestNumber: 3,
            receiverLabel: "Owner",
            receiverLoginId: "owner",
            state: "open",
            title: "Visible pull request",
            updatedLabel: "Jun 26, 2026",
          },
        ],
        selected: "projects",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/door?daysAgo=7&selected=projects");
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#projects']")).toBeVisible();
  await expect(page.locator("#projects")).toHaveClass(/active/);
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");

  await page.locator(".nav.nav-tabs > li a[href='#pullRequests']").click();
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#pullRequests']")).toBeVisible();
  await expect(page.locator("#pullRequests")).toHaveClass(/active/);
  await expect(page.locator("#pullRequests .post-list-wrap > .post-item")).toHaveCount(1);
  await expect(page.locator("#pullRequests .title.project")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi",
  );
  await expect(page.locator("#pullRequests .title-wrap > a.title").nth(1)).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi/pullRequest/3",
  );
  await expect(page.locator("#pullRequests .infos-icon-link")).toHaveCount(0);

  const pullRequestPane = await layoutBox(page, "#pullRequests");
  const pullRequestList = await layoutBox(page, "#pullRequests .post-list-wrap.row-fluid");
  const pullRequestRow = await layoutBox(page, "#pullRequests .post-item");
  const pullRequestLeft = await layoutBox(page, "#pullRequests .post-item > .span10");
  const pullRequestAvatar = await layoutBox(page, "#pullRequests .avatar-wrap.mlarge");
  const pullRequestTitleWrap = await layoutBox(page, "#pullRequests .title-wrap");
  const pullRequestInfos = await layoutBox(page, "#pullRequests .infos");
  const pullRequestRight = await layoutBox(page, "#pullRequests .post-item > .span2");
  const pullRequestAssignee = await layoutBox(page, "#pullRequests .avatar-wrap.assinee");
  const pullRequestState = await layoutBox(page, "#pullRequests .state.pull-right");

  expect(pullRequestList.y).toBeGreaterThanOrEqual(pullRequestPane.y);
  expect(pullRequestRow.y).toBeGreaterThanOrEqual(pullRequestList.y);
  expect(pullRequestLeft.x).toBeGreaterThanOrEqual(pullRequestRow.x);
  expect(pullRequestRight.x).toBeGreaterThan(pullRequestLeft.x + pullRequestLeft.width - 1);
  expect(pullRequestAvatar.x).toBeGreaterThanOrEqual(pullRequestLeft.x);
  expect(pullRequestTitleWrap.x).toBeGreaterThan(pullRequestAvatar.x + pullRequestAvatar.width - 1);
  expect(pullRequestInfos.y).toBeGreaterThan(pullRequestTitleWrap.y);
  expect(pullRequestAssignee.x).toBeGreaterThanOrEqual(pullRequestRight.x);
  expect(pullRequestState.x).toBeGreaterThanOrEqual(pullRequestRight.x);
  expect(pullRequestState.y).toBeGreaterThanOrEqual(pullRequestRight.y);
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");
  await expect(page).toHaveURL(/\/yona\/door\?daysAgo=7&selected=projects$/);

  await page.locator(".nav.nav-tabs > li a[href='#issues']").click();
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#issues']")).toBeVisible();
  await expect(page.locator("#issues")).toHaveClass(/active/);
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");
  await expect(page).toHaveURL(/\/yona\/door\?daysAgo=7&selected=projects$/);
});

test("organization names on the user profile endpoint redirect to the organization route", async ({
  page,
}) => {
  await page.route(apiV1Route("/users/weblabs/profile"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        redirectPath: "/organizations/weblabs",
        selected: "issues",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/organizations/weblabs/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "web labs",
        enrollmentRequested: false,
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanEnroll: true,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/weblabs");
  await expect(page).toHaveURL(/\/yona\/organizations\/weblabs$/);
});

test("profile, user issues, and user files preserve legacy mobile shells", async ({ page }) => {
  const apiRequests: string[] = [];
  await authenticateAsDoor(page);
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    apiRequests.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      body: JSON.stringify(
        profilePayload({
          issueItems: [profileIssue()],
          memberProjects: [profileProject()],
          selected: "projects",
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/user/issues**"), async (route) => {
    const url = new URL(route.request().url());
    apiRequests.push(`${url.pathname}${url.search}`);
    await route.fulfill({
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: url.searchParams.get("filter") ?? "assigned",
        items: [
          {
            assigneeLabel: "Admin",
            assigneeLoginId: "admin",
            authorLabel: "Door",
            authorLoginId: "door",
            commentCount: 1,
            dueDateLabel: "Jun 30, 2026",
            dueDateOverdue: false,
            id: 101,
            issueNumber: 11,
            labels: [{ color: "#f2c94c", id: 7, name: "bug" }],
            milestoneTitle: "RC",
            ownerName: "owner",
            projectName: "publicYobi",
            state: "open",
            title: "Visible issue",
            updatedLabel: "Jun 26, 2026",
            voterCount: 0,
            watcherCount: 1,
          },
        ],
        openIssueCount: 1,
        pageNum: Number(url.searchParams.get("pageNum") ?? "1"),
        pageSize: 15,
        sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
        state: url.searchParams.get("state") ?? "open",
        totalCount: 1,
        viewerUserId: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace/files**"), async (route) => {
    const url = new URL(route.request().url());
    apiRequests.push(`${url.pathname}${url.search}`);
    await route.fulfill({
      body: JSON.stringify({
        files: [
          {
            containerId: 11,
            containerType: "ISSUE_POST",
            createdLabel: "Jun 26, 2026",
            downloadUrl: "/yona/files/501/download",
            id: 501,
            locationHref: "/yona/owner/publicYobi/issue/11",
            locationLabel: "owner / publicYobi #11",
            mimeType: "image/png",
            name: "screen.png",
            previewUrl: "/yona/files/501",
            size: 2048,
            sizeLabel: "2 KB",
            url: "/yona/files/501",
          },
        ],
        filter: "screen",
        page: 1,
        pageSize: 30,
        total: 1,
        totalPages: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.setViewportSize({ height: 844, width: 390 });

  await page.goto("/yona/me?selected=issues");
  await expect(page.locator(".page-wrap-outer .user-box")).toBeVisible();
  await expect(page.locator(".user-info-box .loginid")).toHaveText("@admin");
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#issues']")).toBeVisible();
  await expect(page.locator("#issues .post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issues")).toContainText("Visible issue");
  await expect(page.locator("body")).not.toContainText("userinfo.");

  await page.goto("/yona/door?daysAgo=7&selected=projects");
  await expect(page.locator(".page-wrap-outer .user-box")).toBeVisible();
  await expect(page.locator(".user-info-box .loginid")).toHaveText("@door");
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#projects']")).toBeVisible();
  await expect(page.locator(".user-streams.all-projects .project")).toHaveCount(1);
  await expect(page.locator("a.project-name[href='/yona/owner/publicYobi']")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("project.is.empty");

  await page.goto("/yona/user/issues?filter=assigned&state=open");
  await expect(
    page.locator(".page-wrap-outer .nav.nav-tabs a[href='/yona/user/issues']"),
  ).toBeVisible();
  await expect(page.locator(".row-fluid.issue-list-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap.my-issues .post-item")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap.my-issues")).toContainText("Visible issue");
  await expect(page.locator("body")).not.toContainText("issue.list.assignedToMe");
  await expect
    .poll(() => apiRequests.some((request) => request.includes("/api/v1/user/issues")))
    .toBe(true);

  await page.goto("/yona/user/files?filter=screen");
  await expect(
    page.locator(".page-wrap-outer .nav.nav-tabs a[href='/yona/user/files']"),
  ).toBeVisible();
  await expect(page.locator(".attachment-files")).toBeVisible();
  await expect(page.locator(".attachment-file-detail")).toHaveCount(1);
  await expect(page.locator(".attachment-file-detail .file-name")).toContainText("screen.png");
  await expect(page.locator(".attachment-file-detail .file-location")).toContainText(
    "owner / publicYobi #11",
  );
  await expect(page.locator("body")).not.toContainText("user.files");

  const filesPageWrapOuter = await layoutBox(page, ".user-files-page > .page-wrap-outer");
  const filesPageWrap = await layoutBox(page, ".user-files-page .page-wrap");
  const filesTabs = await layoutBox(page, ".user-files-page .page-wrap > .nav.nav-tabs");
  const filesSearch = await layoutBox(page, ".user-file-search.search.search-bar");
  const filesSearchInput = await layoutBox(page, ".user-file-search input[name='filter']");
  const filesSearchButton = await layoutBox(page, ".user-file-search .search-btn");
  const filesTable = await layoutBox(page, ".attachment-files");
  const filesHeader = await layoutBox(page, ".attachment-files-header.row");
  const fileRow = await layoutBox(page, ".attachment-file-detail.row");
  const filePreview = await layoutBox(page, ".attachment-file-detail .file-preview");
  const fileName = await layoutBox(page, ".attachment-file-detail .file-name");
  const fileSize = await layoutBox(page, ".attachment-file-detail .file-size");
  const fileDownload = await layoutBox(page, ".attachment-file-detail .file-download");
  const fileDate = await layoutBox(page, ".attachment-file-detail .file-date");
  const fileLocation = await layoutBox(page, ".attachment-file-detail .file-location");
  const filesPagination = await layoutBox(page, ".user-files-page #pagination");

  expect(filesPageWrap.y).toBeGreaterThanOrEqual(filesPageWrapOuter.y);
  expect(filesTabs.y).toBeGreaterThanOrEqual(filesPageWrap.y);
  expect(filesSearch.y).toBeGreaterThan(filesTabs.y + filesTabs.height - 1);
  expect(filesSearchButton.x).toBeGreaterThan(filesSearchInput.x + filesSearchInput.width - 1);
  expect(filesTable.y).toBeGreaterThan(filesSearch.y + filesSearch.height - 1);
  expect(filesHeader.y).toBeGreaterThanOrEqual(filesTable.y);
  expect(fileRow.y).toBeGreaterThan(filesHeader.y + filesHeader.height - 1);
  expect(filePreview.x).toBeGreaterThanOrEqual(fileRow.x);
  expect(fileName.y).toBeGreaterThanOrEqual(filePreview.y);
  expect(fileSize.y).toBeGreaterThanOrEqual(fileName.y);
  expect(fileDownload.y).toBeGreaterThanOrEqual(fileSize.y);
  expect(fileDate.y).toBeGreaterThanOrEqual(fileDownload.y);
  expect(fileLocation.y).toBeGreaterThanOrEqual(fileDate.y);
  expect(filesPagination.y).toBeGreaterThan(filesTable.y + filesTable.height - 1);
  await expect
    .poll(() => apiRequests.some((request) => request.includes("/api/v1/workspace/files")))
    .toBe(true);
});

test("user issue list preserves legacy my issue template metrics", async ({ page }) => {
  await authenticateAsDoor(page);
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.route(apiV1Route("/user/issues**"), async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      body: JSON.stringify({
        closedIssueCount: 1,
        filter: url.searchParams.get("filter") ?? "assigned",
        items: [
          {
            assigneeAvatarUrl: "/yona/assets/images/default-avatar-32.png",
            assigneeLabel: "Admin",
            assigneeLoginId: "admin",
            authorLabel: "Door",
            authorLoginId: "door",
            commentCount: 2,
            dueDateLabel: "Jun 30, 2026",
            dueDateOverdue: false,
            id: 101,
            issueNumber: 11,
            labels: [{ color: "#f2c94c", id: 7, name: "bug" }],
            milestoneTitle: "RC",
            ownerName: "owner",
            projectName: "publicYobi",
            state: "open",
            title: "Visible issue",
            updatedLabel: "Jun 26, 2026",
            voterCount: 1,
            watcherCount: 1,
            weight: 2,
          },
          {
            assigneeAvatarUrl: "",
            assigneeLabel: "",
            assigneeLoginId: "",
            authorLabel: "Admin",
            authorLoginId: "admin",
            commentCount: 0,
            dueDateLabel: "",
            dueDateOverdue: false,
            id: 102,
            issueNumber: 12,
            labels: [],
            milestoneTitle: "",
            ownerName: "admin",
            projectName: "projectYobi",
            state: "open",
            title: "Second issue",
            updatedLabel: "Jun 27, 2026",
            voterCount: 0,
            watcherCount: 0,
            weight: 0,
          },
        ],
        openIssueCount: 2,
        pageNum: 1,
        pageSize: 15,
        query: url.searchParams.get("query") ?? "",
        sideFilterCounts: {
          favorite: 5,
          mentioned: 4,
          shared: 3,
        },
        totalCount: 2,
        viewerUserId: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto(
    "/yona/user/issues?filter=commented&state=open&orderBy=updatedDate&orderDir=desc",
  );
  await expect(page.locator("main.app-shell.user-issue-list-page")).toBeVisible();
  await expect(page.locator(".post-list-wrap.my-issues .post-item")).toHaveCount(2);

  const appShell = await layoutBox(page, "main.app-shell.user-issue-list-page");
  const pageWrapOuter = await layoutBox(page, ".user-issue-list-page > .page-wrap-outer");
  const pageWrap = await layoutBox(page, ".user-issue-list-page .page-wrap");
  const mySeriesTabs = await layoutBox(
    page,
    ".user-issue-list-page > .page-wrap-outer .nav.nav-tabs",
  );
  const issueWrap = await layoutBox(page, ".user-issue-list-page .row-fluid.issue-list-wrap");
  const leftMenu = await layoutBox(page, ".user-issue-list-page .left-menu.span2.span-hard-wrap");
  const quickSearch = await layoutBox(page, ".user-issue-list-page .lst-stacked.unstyled");
  const searchForm = await layoutBox(page, ".user-issue-list-page form#search[name='search']");
  const searchBox = await layoutBox(
    page,
    ".user-issue-list-page .myissues-search-input .search-bar",
  );
  const contentPane = await layoutBox(page, ".user-issue-list-page #span10.span10.span-hard-wrap");
  const stateTabs = await layoutBox(page, ".user-issue-list-page #span10 > .nav.nav-tabs.nm");
  const filterWrap = await layoutBox(page, ".user-issue-list-page .filter-wrap.small-heights");
  const postList = await layoutBox(page, ".user-issue-list-page .post-list-wrap.my-issues");
  const firstItem = await layoutBox(page, ".user-issue-list-page .post-list-wrap.my-issues > li");
  const projectCell = await layoutBox(
    page,
    ".user-issue-list-page #issue-item-101 .project-name-in-my-issues",
  );
  const titleWrap = await layoutBox(
    page,
    ".user-issue-list-page #issue-item-101 .title-wrap.span6",
  );
  const authorCell = await layoutBox(
    page,
    ".user-issue-list-page #issue-item-101 .author.project-name-in-my-issues",
  );
  const metaCell = await layoutBox(page, ".user-issue-list-page #issue-item-101 .infos.meta");
  const assigneeRail = await layoutBox(
    page,
    ".user-issue-list-page #issue-item-101 .avatar-wrap.assinee",
  );
  const pagination = await layoutBox(page, ".user-issue-list-page #pagination");
  const styles = await page.locator(".user-issue-list-page").evaluate((element) => {
    const wrap = element.querySelector(".issue-list-wrap") as HTMLElement;
    const left = element.querySelector(".left-menu") as HTMLElement;
    const content = element.querySelector("#span10") as HTMLElement;
    const list = element.querySelector(".post-list-wrap.my-issues") as HTMLElement;
    const firstRow = element.querySelector(".post-list-wrap.my-issues > li") as HTMLElement;
    return {
      contentFloat: window.getComputedStyle(content).float,
      firstRowDisplay: window.getComputedStyle(firstRow).display,
      leftFloat: window.getComputedStyle(left).float,
      listDisplay: window.getComputedStyle(list).display,
      wrapDisplay: window.getComputedStyle(wrap).display,
    };
  });

  await expect(page.locator(".user-issue-list-page .row-fluid.issue-list-wrap")).toHaveAttribute(
    "pjax-container",
    "",
  );
  await expect(
    page.locator(
      ".user-issue-list-page > .page-wrap-outer .page-wrap > .nav.nav-tabs > li.active a",
    ),
  ).toHaveAttribute("href", "/yona/user/issues");
  await expect(page.locator("#setDefaultLoginPage")).toHaveAttribute("data-url", "user/issues");
  await expect(page.locator(".user-issue-list-page .lst-stacked.unstyled > li")).toHaveCount(6);
  await expect(
    page.locator(".user-issue-list-page .lst-stacked.unstyled > li.active .commented-by-me"),
  ).toBeVisible();
  await expect(page.locator(".user-issue-list-page .mentioned-of-me + span")).toHaveText(" (4)");
  await expect(page.locator(".user-issue-list-page .shared-with-me + span")).toHaveText(" (3)");
  await expect(page.locator(".user-issue-list-page .favorite-issue + span")).toHaveText(" (5)");
  await expect(page.locator(".user-issue-list-page form#search")).toHaveAttribute(
    "action",
    "/yona/user/issues",
  );
  await expect(page.locator(".user-issue-list-page form#search")).toHaveAttribute("method", "get");
  await expect(page.locator(".user-issue-list-page form#search input[type='hidden']")).toHaveCount(
    9,
  );
  await expect(
    page.locator(".user-issue-list-page form#search input[name='filter'][type='hidden']"),
  ).toHaveCount(0);
  await expect(
    page.locator(".user-issue-list-page .myissues-search-input input.textbox.full"),
  ).toHaveAttribute("name", "filter");
  await expect(page.locator(".user-issue-list-page #span10 > .nav.nav-tabs.nm > li")).toHaveCount(
    4,
  );
  await expect(
    page.locator(".user-issue-list-page #span10 > .nav.nav-tabs.nm > li.active a"),
  ).toHaveAttribute("state", "open");
  await expect(page.locator(".user-issue-list-page .filter-wrap .filter")).toHaveCount(4);
  await expect(page.locator(".user-issue-list-page #issue-item-101")).toHaveAttribute(
    "href",
    "/yona/owner/publicYobi/issue/11",
  );
  await expect(
    page.locator(".user-issue-list-page #issue-item-101 .title.project"),
  ).toHaveAttribute("href", "/yona/owner/publicYobi");
  await expect(
    page.locator(".user-issue-list-page #issue-item-101 .title-cell > a.title"),
  ).toHaveAttribute("href", "/yona/owner/publicYobi/issue/11");
  await expect(page.locator(".user-issue-list-page #pagination")).toHaveAttribute(
    "data-total",
    "1",
  );

  expect(pageWrapOuter.y).toBeGreaterThanOrEqual(appShell.y);
  expect(pageWrap.x).toBeGreaterThanOrEqual(pageWrapOuter.x);
  expect(pageWrap.width).toBeLessThanOrEqual(pageWrapOuter.width + 1);
  expect(mySeriesTabs.y).toBeGreaterThanOrEqual(pageWrap.y);
  expect(issueWrap.y).toBeGreaterThan(mySeriesTabs.y + mySeriesTabs.height - 1);
  expect(leftMenu.x).toBeGreaterThanOrEqual(issueWrap.x);
  expect(contentPane.x).toBeGreaterThan(leftMenu.x + leftMenu.width - 1);
  expect(contentPane.width).toBeGreaterThan(leftMenu.width);
  expect(Math.abs(contentPane.y - leftMenu.y)).toBeLessThanOrEqual(2);
  expect(quickSearch.x).toBeGreaterThanOrEqual(leftMenu.x);
  expect(searchForm.y).toBeGreaterThan(quickSearch.y + quickSearch.height - 1);
  expect(searchBox.width).toBeLessThanOrEqual(leftMenu.width + 1);
  expect(stateTabs.y).toBeGreaterThanOrEqual(contentPane.y);
  expect(filterWrap.y).toBeGreaterThan(stateTabs.y + stateTabs.height - 1);
  expect(postList.y).toBeGreaterThan(filterWrap.y + filterWrap.height - 1);
  expect(firstItem.y).toBeGreaterThanOrEqual(postList.y);
  expect(projectCell.x).toBeGreaterThanOrEqual(firstItem.x);
  expect(titleWrap.x).toBeGreaterThan(projectCell.x + projectCell.width - 1);
  expect(authorCell.x).toBeGreaterThan(titleWrap.x + titleWrap.width - 1);
  expect(metaCell.x).toBeGreaterThan(authorCell.x + authorCell.width - 1);
  expect(assigneeRail.x).toBeGreaterThan(metaCell.x + metaCell.width - 1);
  expect(pagination.y).toBeGreaterThan(postList.y + postList.height - 1);
  expect(styles).toEqual({
    contentFloat: "left",
    firstRowDisplay: "block",
    leftFloat: "left",
    listDisplay: "block",
    wrapDisplay: "block",
  });
});
