import { expect, test, type Page } from "@playwright/test";

const EXPECTED_PROFILE_SCREEN = `
<div class="site-breadcrumb-outer">
  <div class="site-breadcrumb-inner"><h3>Door User</h3></div>
</div>
<div class="page-wrap-outer">
  <div class="page-wrap">
    <section class="user-box">
      <div class="user-info-box">
        <div class="whoami-wrap" style="background-image:url('/assets/images/default-avatar-256.png')"></div>
        <div class="whoami usf-group">
          <span class="name">Door English</span>
          <span class="loginid">@door</span>
          <span class="email">door@example.com</span>
        </div>
        <div class="user-status"><span class="badge label-success">SITE ADMIN</span></div>
        <div class="user-status"></div>
        <div class="user-since"><strong>Member since</strong><span class="since">2026-06-30</span></div>
        <div class="user-since"><div><strong>Connected Social Login</strong></div><div class="auth-provider-logo"></div></div>
      </div>
      <div class="user-stream-box">
        <div class="pull-right">recently<input id="daysAgoBtn" name="daysAgo" type="number" min="1" max="99" class="input-mini-min" value="14" style="margin:0px 5px; vertical-align:bottom;">days ago</div>
        <ul class="nav nav-tabs">
          <li class="active"><a href="#issues" data-toggle="tab">Issue <span class="num-badge">2</span></a></li>
          <li class=""><a href="#pullRequests" data-toggle="tab">Pull request <span class="num-badge">1</span></a></li>
          <li class=""><a href="#projects" data-toggle="tab">projects <span class="num-badge">1</span></a></li>
          <li><div class="two-column-icon mr10 hide-in-mobile" id="two-column-mode-checkbox" title="Two Column Mode" data-content="Splits list and body into columns respectively"><label class="checkbox"><div class="two-column-icon-border"><input id="two-column-mode" type="checkbox"><span class="two-column-mode-text">Column View</span></div></label></div></li>
        </ul>
        <div class="tab-content">
          <div id="issues" class="tab-pane active">
            <ul class="nav nav-tabs nm">
              <li class="active"><a href="#openIssues" data-toggle="tab">Open<span class="num-badge">1</span></a></li>
              <li><a href="#closedIssues" data-toggle="tab">Closed<span class="num-badge">1</span></a></li>
              <li><div class="show-subtask-icon mr10 hide-in-mobile" id="show-subtasks-checkbox" title="Show subtask" data-content="Show subtask always"><label class="checkbox"><input id="show-subtasks" type="checkbox"></label></div></li>
            </ul>
            <div class="tab-content">
              <div id="openIssues" class="tab-pane active">
                <ul class="post-list-wrap my-issues row-fluid">
                  <li class="post-item title" id="issue-item-11" href="__BASE_PATH__/door/sample/issue/7">
                    <div class="span12 span-hard-wrap">
                      <div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/door/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a></span><span class="infos-item post-id">#7</span></div>
                      <div class="title-wrap span5"><span class="title-cell"><a href="__BASE_PATH__/door/sample/issue/7" class="title">Open profile issue</a><span class="item-count-groups"><a href="__BASE_PATH__/door/sample/issue/7#comments"><span class="count-groups item-icon "><i class="yobicon-comments"></i></span><span class="count-groups item-count ">3</span></a></span><span class="for-subtask-progressbar"></span><div class="child-issue-list hide"></div></span></div>
                      <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/door" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="door">Door User</a></div>
                      <div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="alice">Alice</a></div>
                      <div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><a href="__BASE_PATH__/alice" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="alice">Alice</a></span><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="2026-07-01">2026-07-01</span></span></div>
                    </div>
                  </li>
                </ul>
              </div>
              <div id="closedIssues" class="tab-pane"><ul class="post-list-wrap my-issues row-fluid"><li class="post-item title" id="issue-item-12" href="__BASE_PATH__/door/sample/issue/8"><div class="span12 span-hard-wrap"><div class="span2 project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item project-name"><a href="__BASE_PATH__/door/sample" class="title project" data-toggle="tooltip" data-placement="bottom" title="Project name">sample</a></span><span class="infos-item post-id">#8</span></div><div class="title-wrap span5"><span class="title-cell"><a href="__BASE_PATH__/door/sample/issue/8" class="title">Closed profile issue</a><span class="for-subtask-progressbar"></span><div class="child-issue-list hide"></div></span></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><a href="__BASE_PATH__/door" class="infos-item infos-link-item author-cell" data-toggle="tooltip" data-placement="bottom" title="door">Door User</a></div><div class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"><span class="infos-item"></span></div><div class="infos span3 meta"><span class="meta-cell"><span class="hide show-in-mobile"><span class="infos-item"></span></span><span class="infos-item" data-toggle="tooltip" data-placement="bottom" title="2026-06-29">2026-06-29</span></span></div></div></li></ul></div>
            </div>
          </div>
          <div id="pullRequests" class="tab-pane ">
            <ul class="post-list-wrap  row-fluid"><li class="post-item"><div class="span10"><a href="__BASE_PATH__/door/sample" class="avatar-wrap mlarge"><img src="/assets/images/project_default_logo.png"></a><div class="title-wrap"><a href="__BASE_PATH__/door/sample" class="title project">sample</a><span class="post-id">4</span><a href="__BASE_PATH__/door/sample/pullRequest/4" class="title ">Profile pull request</a></div><div class="infos"><a href="__BASE_PATH__/door" class="infos-item infos-link-item" data-toggle="tooltip" data-placement="top" title="door">Door User</a><span class="infos-item" title="2026-07-02">2026-07-02</span><a href="__BASE_PATH__/door/sample/pullRequest/4#comments" class="infos-item infos-icon-link"><i class="yobicon-comments"></i><span class="size">2</span></a></div></div><div class="span2"><div class="mt5 pull-right"><a href="__BASE_PATH__/alice" class="avatar-wrap assinee" data-toggle="tooltip" data-placement="top" title="Alice"><img src="/assets/images/default-avatar-32.png" width="32" height="32"></a></div><div class="state open pull-right">Open</div></div></li></ul>
          </div>
          <div id="projects" class="tab-pane ">
            <ul class="user-streams all-projects"><li class="project"><div class="info-wrap"><div class="pull-left"><a href="__BASE_PATH__/door/sample" class="avatar-wrap small"><img src="/assets/images/project_default_logo.png"></a></div><div class="pull-left" style="margin-left: 10px;"><div class="header"><a href="__BASE_PATH__/door/sample" class="project-name">sample</a></div><div class="desc">Profile project</div><div class="name-tag"><i class="yobicon-friends yobicon-middle"></i><strong>3</strong> <a href="__BASE_PATH__/door" class="owner-name-small">door</a> <span title="2026-06-01">2026-06-01</span>,Latest code update<span title="2026-06-30">2026-06-30</span></div></div></div><div class="stats-wrap pull-right"><div class="stats"><a href="__BASE_PATH__/door/sample/watch" class="ybtn watchBtn"><i class="yobicon-eye-close yobicon-middle yobicon-white"></i>Watch<span class="num-badge">5</span></a></div></div></li></ul>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
`;

test("public user profile matches legacy user/view.scala.html issues screen", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator("#openIssues .post-item")).toHaveCount(1);

  expect(await canonicalizeProfileRoots(page)).toEqual(
    await canonicalizeHtml(page, EXPECTED_PROFILE_SCREEN.replaceAll("__BASE_PATH__", basePath)),
  );
  expect(await readProfileMetrics(page)).toEqual({
    issueListDisplay: "block",
    pageWrapMarginTop: "10px",
    userBoxDisplay: "block",
    userInfoWidth: 200,
    userStreamWidth: 880,
  });
});

test("public user profile matches legacy selected projects tab and click switching", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door?daysAgo=7&selected=projects`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(2)).toHaveClass("active");

  expect(await canonicalizeProfileRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      expectedProfileScreen({
        basePath,
        daysAgo: 7,
        selected: "projects",
      }),
    ),
  );

  await page.locator('.user-stream-box > .nav-tabs a[href="#pullRequests"]').click();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(1)).toHaveClass("active");
  await expect(page.locator("#pullRequests")).toHaveClass(/active/u);
  await expect(page.locator("#projects")).not.toHaveClass(/active/u);
  expect(new URL(page.url()).searchParams.get("daysAgo")).toBe("7");
  expect(new URL(page.url()).searchParams.get("selected")).toBe("projects");

  await page.locator('.user-stream-box > .nav-tabs a[href="#issues"]').click();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").first()).toHaveClass("active");
  await expect(page.locator("#issues")).toHaveClass(/active/u);
});

async function mockPublicProfile(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: true,
        loginId: "anonymous",
      }),
    });
  });
  await page.route("**/api/v1/users/door/profile**", async (route) => {
    const url = new URL(route.request().url());
    const daysAgo = Number(url.searchParams.get("daysAgo") ?? "14");
    const selected = url.searchParams.get("selected") ?? "issues";
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        daysAgo,
        issueItems: [
          {
            assigneeLabel: "Alice",
            assigneeLoginId: "alice",
            authorLabel: "Door User",
            authorLoginId: "door",
            commentCount: 3,
            id: 11,
            issueNumber: 7,
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Open profile issue",
            updatedLabel: "2026-07-01",
          },
          {
            assigneeLabel: "",
            assigneeLoginId: "",
            authorLabel: "Door User",
            authorLoginId: "door",
            commentCount: 0,
            id: 12,
            issueNumber: 8,
            ownerName: "door",
            projectName: "sample",
            state: "closed",
            title: "Closed profile issue",
            updatedLabel: "2026-06-29",
          },
        ],
        memberProjects: [
          {
            createdLabel: "2026-06-01",
            isWatching: false,
            lastPushedLabel: "2026-06-30",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 3,
            originOwnerName: "",
            originProjectName: "",
            overview: "Profile project",
            ownerName: "door",
            projectName: "sample",
            projectScope: "public",
            viewerCanLeave: false,
            viewerCanWatch: true,
            watchCount: 5,
          },
        ],
        profile: {
          avatarUrl: "/assets/images/default-avatar-256.png",
          connectedSocialProviders: [],
          displayName: "Door User",
          englishName: "Door English",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "door",
          primaryEmailAddress: "door@example.com",
          sinceLabel: "2026-06-30",
        },
        pullRequestItems: [
          {
            commentCount: 2,
            contributorLabel: "Door User",
            contributorLoginId: "door",
            ownerName: "door",
            projectName: "sample",
            pullRequestNumber: 4,
            receiverAvatarUrl: "/assets/images/default-avatar-32.png",
            receiverLabel: "Alice",
            receiverLoginId: "alice",
            state: "open",
            title: "Profile pull request",
            updatedLabel: "2026-07-02",
          },
        ],
        selected,
        viewerCanEditProfile: false,
      }),
    });
  });
}

async function readProfileMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const userBox = document.querySelector<HTMLElement>(".user-box");
    const userInfo = document.querySelector<HTMLElement>(".user-info-box");
    const userStream = document.querySelector<HTMLElement>(".user-stream-box");
    const issueList = document.querySelector<HTMLElement>(".post-list-wrap.my-issues");
    if (!pageWrapOuter || !userBox || !userInfo || !userStream || !issueList) {
      throw new Error("Expected profile metric targets are missing.");
    }
    return {
      issueListDisplay: getComputedStyle(issueList).display,
      pageWrapMarginTop: getComputedStyle(pageWrapOuter).marginTop,
      userBoxDisplay: getComputedStyle(userBox).display,
      userInfoWidth: Math.round(userInfo.getBoundingClientRect().width),
      userStreamWidth: Math.round(userStream.getBoundingClientRect().width),
    };
  });
}

async function canonicalizeProfileRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(document.querySelectorAll(".site-breadcrumb-outer, .page-wrap-outer"));
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter((attr) => attr.name !== "alt")
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
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
        .filter((attr) => attr.name !== "alt")
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
      return attr.name === "style"
        ? attr.value.replace(/\s+/g, "").replace(/;$/u, "").replaceAll('"', "'")
        : attr.value;
    }
  }, html);
}

function expectedProfileScreen({
  basePath,
  daysAgo,
  selected,
}: {
  basePath: string;
  daysAgo: number;
  selected: "issues" | "projects" | "pullRequests";
}) {
  return EXPECTED_PROFILE_SCREEN.replaceAll("__BASE_PATH__", basePath)
    .replace('value="14"', `value="${daysAgo}"`)
    .replace(
      '<li class="active"><a href="#issues" data-toggle="tab">Issue',
      `<li class="${selected === "issues" ? "active" : ""}"><a href="#issues" data-toggle="tab">Issue`,
    )
    .replace(
      '<li class=""><a href="#pullRequests" data-toggle="tab">Pull request',
      `<li class="${selected === "pullRequests" ? "active" : ""}"><a href="#pullRequests" data-toggle="tab">Pull request`,
    )
    .replace(
      '<li class=""><a href="#projects" data-toggle="tab">projects',
      `<li class="${selected === "projects" ? "active" : ""}"><a href="#projects" data-toggle="tab">projects`,
    )
    .replace(
      '<div id="issues" class="tab-pane active">',
      `<div id="issues" class="tab-pane ${selected === "issues" ? "active" : ""}">`,
    )
    .replace(
      '<div id="pullRequests" class="tab-pane ">',
      `<div id="pullRequests" class="tab-pane ${selected === "pullRequests" ? "active" : ""}">`,
    )
    .replace(
      '<div id="projects" class="tab-pane ">',
      `<div id="projects" class="tab-pane ${selected === "projects" ? "active" : ""}">`,
    );
}
