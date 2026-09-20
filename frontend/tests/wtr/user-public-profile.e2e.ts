import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

test("profile member projects format timestamps without changing enrollment or leave permissions", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.clock.setFixedTime(new Date(2026, 8, 19, 12));
  const options = {
    memberProjectCreatedAt: new Date(2025, 5, 1, 13, 4, 5).toISOString(),
    memberProjectLastPushedAt: new Date(2026, 8, 19, 11, 58).toISOString(),
    viewerCanLeave: false,
  };
  await mockPublicProfile(page, options);
  await page.goto(`${basePath}/door?selected=projects`);

  const dateSpans = page.locator('[data-owner="user-profile-project-name-tag"] > span');
  await expect(dateSpans).toHaveText(["2025-06-01", "2 minutes ago"]);
  await expect(dateSpans.nth(0)).toHaveAttribute("title", "2025-06-01 1:04:05 PM");
  await expect(dateSpans.nth(1)).toHaveAttribute("title", "2026-09-19 11:58:00 AM");
  await expect(page.locator(".user-since .since")).toHaveText("Jun 30, 2026");
  await expect(page.locator("#projects .leaveProject")).toHaveCount(0);

  options.memberProjectCreatedAt = "";
  options.memberProjectLastPushedAt = "";
  await page.goto(`${basePath}/door?selected=projects&daysAgo=7`);
  await expect(dateSpans).toHaveCount(1);
  await expect(dateSpans).toHaveText("");
  await expect(dateSpans).toHaveAttribute("title", "");
  await expect(page.locator('[data-owner="user-profile-project-name-tag"]')).not.toContainText(
    "Latest code update",
  );
});

const EXPECTED_MISSING_USER_SCREEN = `
<header class="gnb-outer">
  <div class="gnb-inner">
    <a href="__BASE_ROOT_HREF__" class="logo"><h1 class="blind">Yoram</h1></a>
    <ul class="gnb-nav">
      <li><a href="__BASE_PATH__/projects">Project list</a></li>
      <li><a href="__BASE_PATH__/_help">Help</a></li>
      <li><a href="https://github.com/yona-projects/yona/issues" target="_blank">Feedback</a></li>
    </ul>
    <div id="mySidenav" class="sidenav">
      <div class="span5 right-menu span-hard-wrap">
        <div class="row-fluid user-menu-wrap">
          <span class="user-menu"><a href="__BASE_PATH__/anonymous">Profile</a></span>
          <span class="user-menu"><a href="__BASE_PATH__/user/editform">Account</a></span>
          <a href="__BASE_PATH__/logout"><span class="user-menu logout label">Log out</span></a>
        </div>
        <ul class="nav nav-tabs nm">
          <li class="myOrganizationList active"><button type="button">Favorite</button></li>
          <li class="myProjectList"><button type="button">Project</button></li>
          <li class="myRecentIssueList"><button type="button">Recent History</button></li>
        </ul>
        <div class="tab-content tab-box">
          <div id="usermenu-tab-content-list" class="tab-content">Loading...</div>
        </div>
      </div>
    </div>
    <ul class="gnb-usermenu">
      <li class="gnb-usermenu-item" id="required-logged-in"><a href="__BASE_PATH__/users/loginform" class="user-item-btn" data-login="required">Log in</a></li>
      <li class="divider"></li>
      <li><a href="__BASE_PATH__/users/signupform" class="ybtn ybtn-success">Sign up</a></li>
    </ul>
  </div>
</header>
<div class="page-wrap-outer">
  <div class="project-page-wrap">
    <div class="error-wrap">
      <i class="ico ico-err2"></i>
      <p>User exists not</p>
      <a href="__BASE_ROOT_HREF__" class="ybtn ybtn-info">Home</a>
    </div>
  </div>
</div>
<footer class="page-footer-outer">
  <div class="page-footer">
    <span class="provider">Copyright <a href="https://github.com/yona-projects/yona/blob/master/AUTHORS" rel="noreferrer" target="_blank" class="yona-author">Yona authors</a>
      & © <a href="https://navercorp.com" rel="noreferrer" target="_blank">NAVER Corp.</a>
      & <a href="https://naverlabs.com/" rel="noreferrer" target="_blank" class="naver-labs">NAVER LABS</a>
      Supported by <a href="https://www.ncloud.com/?referer=yona" rel="noreferrer" target="_blank" class="naver-cloud-platform">NAVER CLOUD PLATFORM</a></span>
  </div>
</footer>
`;

test("public user profile route source keeps navigation on TanStack Link", async () => {
  const source = readFileSync(new URL("../src/routes/$user.tsx", import.meta.url), "utf8");
  const sharedTwoColumnSource = readFileSync(
    new URL("../src/components/two-column-mode-checkbox.tsx", import.meta.url),
    "utf8",
  );

  expect(source).not.toContain("<a ");
  expect(source).not.toContain("</a>");
  expect(source).not.toContain('declare module "react"');
  expect(source).not.toContain("interface LiHTMLAttributes");
  expect(source).not.toContain("as unknown as LiHTMLAttributes");
  expect(source).not.toContain("createLink");
  expect(source).not.toContain("runtimeJsx");
  expect(source).not.toContain("react/jsx-runtime");
  expect(source).not.toContain("useLinkProps");
  expect(source).not.toContain("useRouter");
  expect(source).not.toContain("router.history");
  expect(source).not.toContain('ComponentPropsWithoutRef<"a">');
  expect(source).not.toContain("HTMLAnchorElement");
  expect(source).not.toContain("legacyRootHref");
  expect(source).not.toContain("MountedRootLink");
  expect(source).not.toContain("MountedRootHrefLink");
  expect(source).not.toContain("legacyMissingUserLogoLinkProps");
  expect(source).not.toContain("legacyMissingUserHomeButtonLinkProps");
  expect(source).not.toContain("React.createElement");
  expect(source).not.toContain("forwardRef");
  expect(source).not.toContain("function LegacyHrefAnchor({");
  expect(source).not.toContain("<LegacyHrefAnchor");
  expect(source).not.toContain("href={legacyMissingUserHomeHref}");
  expect(source).not.toContain("legacyMissingUserHomeHref");
  expect(source).toContain("import { createFileRoute, Link, Navigate, redirect }");
  expect(source).toContain('className="logo"');
  expect(source).toContain(
    "type LegacyIssueRowAttributes = HTMLAttributes<HTMLLIElement> & { href: string };",
  );
  expect(source).toContain("} satisfies LegacyIssueRowAttributes;");
  expect(source).toContain("LEGACY_LINK_PROPS");
  expect(source).toContain('to="/"');
  expect(source).toContain("Link,");
  expect(source).toContain("Navigate,");
  expect(source).not.toContain('data-toggle="tab"');
  expect(source).toContain('hash="comments"');
  expect(source).toContain('hash="vote"');
  expect(source).toContain("<title>{profile.loginId}</title>");
  expect(source).not.toContain("document.title");
  expect(source).not.toMatch(/\b(?:document|window\.document|globalThis\.document)\s*\./u);
  expect(source).toContain("function ConnectedSocialProviderLogo({");
  expect(source).toContain('normalized === "github"');
  expect(source).toContain('normalized === "google"');
  expect(source).toContain(
    'import googleProviderLogoUrl from "../assets/legacy/provider-logo/btn_google_light_normal_ios.svg?no-inline";',
  );
  expect(source).toContain("src={googleProviderLogoUrl}");
  expect(source).not.toContain('"/assets/images/provider-logo/btn_google_light_normal_ios.svg"');
  expect(source).not.toContain('data-toggle="tooltip"');
  expect(source).not.toContain("data-placement");

  expect(sharedTwoColumnSource).toContain("two-column-icon mr10 hide-in-mobile");
  expect(source).toContain("show-subtasks mr10");
  expect(source).toContain("post-list-wrap my-issues row-fluid");
  expect(source).toContain("post-item title");
  expect(source).toContain("popover top");
  expect(source).toContain('role="tooltip"');
  expect(sharedTwoColumnSource).toContain(
    'typeof localStorage !== "undefined" && localStorage.getItem("useTwoColumnMode") === "true"',
  );
  expect(sharedTwoColumnSource).toContain(
    'globalThis.localStorage?.setItem("useTwoColumnMode", String(nextChecked))',
  );
  expect(source).not.toContain('data-toggle="popover"');
  expect(source).not.toContain('data-trigger="hover"');
  expect(source).not.toContain('data-content={t("common.two.column.mode.desc")}');
  expect(source).not.toContain('data-content={t("common.show.subtasks.desc")}');
  expect(source).not.toContain("dangerouslySetInnerHTML");
});

test("public user profile matches legacy user/view.scala.html issues screen", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page).toHaveTitle("door");
  await expect(page.locator("#openIssues .post-item")).toHaveCount(1);
  await expect(page.locator('.user-stream-box > .nav-tabs a[href^="#"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="user-profile-issue-tabs"] a[href^="#"]')).toHaveCount(0);
  await expect(page.locator("#issue-item-11 .title-cell > a.title")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/issue/7`,
  );
  await expect(page.locator("#issue-item-11 .comments-count")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/issue/7#comments`,
  );
  await expect(page.locator("#issue-item-11 .label.issue-label")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/issues?state=open&labelIds=17`,
  );
  await expect(page.locator("#pullRequests .infos-icon-link")).toHaveAttribute(
    "href",
    `${basePath}/door/sample/pullRequest/4#comments`,
  );
  await expect(page.locator('.user-box [data-toggle="tooltip"]')).toHaveCount(0);
  await expect(page.locator(".user-box [data-placement]")).toHaveCount(0);
  await expect(page.locator("#issue-item-11 .title.project")).toHaveAttribute(
    "title",
    "Project name",
  );
  await expect(page.locator("#issue-item-11 .title.project")).toHaveText("sample");
  await expect(page.locator("#issue-item-11 .author-cell").first()).toHaveAttribute(
    "title",
    "door",
  );
  await expect(page.locator("#issue-item-11 .author-cell").first()).toHaveText("Door User");
  await expect(page.locator("#issue-item-11 .meta-cell > .infos-item")).toHaveAttribute(
    "title",
    "2026-07-01",
  );
  await expect(page.locator("#issue-item-11 .meta-cell > .pull-right")).toHaveAttribute(
    "title",
    "Due date: 2026-08-01",
  );
  await expect(page.locator("#issue-item-11 .meta-cell > .pull-right")).toContainText("31 days");
  await expect(page.locator("#issue-item-12 .mileston-tag a")).toHaveAttribute(
    "title",
    "Milestone",
  );
  await expect(page.locator("#issue-item-12 .mileston-tag a")).toHaveText("v1.0");
  await expect(page.locator("#pullRequests .infos-link-item")).toHaveAttribute("title", "door");
  await expect(page.locator("#pullRequests .infos-link-item")).toHaveText("Door User");
  await expect(page.locator("#pullRequests .avatar-wrap.assinee")).toHaveAttribute(
    "title",
    "Alice",
  );
  await expect(page.locator('[data-owner="user-profile-provider-logo"]')).toBeEmpty();
  await expect(page.locator('.user-stream-box > .nav-tabs button[type="button"]')).toHaveText([
    "Issue 2",
    "Pull request 1",
    "projects 1",
  ]);
  await expect(
    page.locator('[data-owner="user-profile-issue-tabs"] button[type="button"]'),
  ).toHaveText(["Open1", "Closed1"]);
  await expect(page.locator('.user-stream-box > .nav-tabs button[data-toggle="tab"]')).toHaveCount(
    0,
  );
  await expect(
    page.locator('[data-owner="user-profile-issue-tabs"] button[data-toggle="tab"]'),
  ).toHaveCount(0);
  const showSubtasks = page.locator(".show-subtasks");
  await expect(showSubtasks).toHaveAttribute("title", "Show subtask");
  await expect(showSubtasks).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(showSubtasks).not.toHaveAttribute("data-trigger", /.+/u);
  await expect(showSubtasks).not.toHaveAttribute("data-placement", /.+/u);
  await expect(showSubtasks).not.toHaveAttribute("data-content", /.+/u);
  const twoColumnMode = page.locator(".two-column-icon");
  await expect(twoColumnMode).toHaveAttribute("id", "two-column-mode-checkbox");
  await expect(twoColumnMode).toHaveAttribute("title", "Two Column Mode");
  await expect(twoColumnMode).not.toHaveAttribute("data-content", /.+/u);
  await expect(page.locator(".two-column-icon .popover.top")).toHaveCount(0);
  await expect(page.locator(".show-subtasks .popover.top")).toHaveCount(0);

  expect(await readProfileMetrics(page)).toEqual({
    issueListDisplay: "block",
    pageWrapMarginTop: "10px",
    userBoxDisplay: "block",
    userInfoWidth: 200,
    userStreamWidth: 1060,
  });
});

test("public user profile show-subtasks popover is React-owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();

  const showSubtasks = page.locator(".show-subtasks");
  const checkbox = page.locator("#toggle-show-subtasks");
  const popover = showSubtasks.locator(".popover.top");

  await expect(popover).toHaveCount(0);
  expect(
    await showSubtasks.evaluate(async (element) => {
      element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      return element.querySelector(".popover.top") === null;
    }),
  ).toBe(true);
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Show subtask");
  await expect(popover.locator(".popover-content")).toHaveText("Show subtask always");

  await showSubtasks.evaluate((element) => {
    element.dispatchEvent(
      new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
    );
  });
  await expect(popover).toHaveCount(0);

  await checkbox.focus();
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Show subtask");

  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
});

test("public user profile two-column popover and storage are React-owned", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript(() => {
    localStorage.setItem("useTwoColumnMode", "true");
  });
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();

  const twoColumnMode = page.locator(".two-column-icon");
  const checkbox = page.locator("#two-column-mode");
  const popover = twoColumnMode.locator(".popover.top");

  await expect(twoColumnMode).toHaveAttribute("title", "Two Column Mode");
  await expect(twoColumnMode).not.toHaveAttribute("data-content", /.+/u);
  await expect(popover).toHaveCount(0);
  await expect(checkbox).toBeChecked();
  await expect.poll(() => readTwoColumnStorage(page)).toBe("true");

  expect(
    await twoColumnMode.evaluate(async (element) => {
      element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 50));
      return element.querySelector(".popover.top") === null;
    }),
  ).toBe(true);
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");
  await expect(popover.locator(".popover-content")).toHaveText(
    "Splits list and body into columns respectively",
  );
  expect(await readTwoColumnPopoverMetrics(page)).toEqual({
    centeredAboveControl: true,
    popoverTopPlacement: true,
  });

  await twoColumnMode.evaluate((element) => {
    element.dispatchEvent(
      new MouseEvent("mouseout", { bubbles: true, relatedTarget: document.body }),
    );
  });
  await expect(popover).toHaveCount(0);

  await checkbox.focus();
  await expect(popover).toBeVisible();
  await expect(popover.locator(".popover-title")).toHaveText("Two Column Mode");

  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  await expect.poll(() => readTwoColumnStorage(page)).toBe("false");

  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await expect.poll(() => readTwoColumnStorage(page)).toBe("true");
});

test("public user profile renders legacy connected social provider logos", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, {
    connectedSocialProviders: ["github", "google", "unsupported"],
  });

  const profileResponse = page.waitForResponse((response) =>
    response.url().includes("/api/v1/users/door/profile"),
  );
  await page.goto(`${basePath}/door`);
  await profileResponse;
  await expect(page.locator(".user-box")).toBeVisible();

  expect(
    await page.evaluate(() => document.querySelectorAll("div.auth-provider-logo").length),
  ).toBe(1);
  expect(
    await page.evaluate(() => {
      const logo = document.querySelector("div.auth-provider-logo");
      const github = logo?.querySelector('[data-owner="user-profile-provider-github"]');
      const svg = github?.querySelector("svg");
      const google = logo?.querySelector('[data-owner="user-profile-provider-google-image"]');
      return {
        children: logo?.children.length,
        github: Boolean(github),
        google: Boolean(google),
        viewBox: svg?.getAttribute("viewBox"),
        height: svg?.getAttribute("height"),
        width: svg?.getAttribute("width"),
        paths: svg?.querySelectorAll("path").length,
        googleSrc: google?.getAttribute("src"),
      };
    }),
  ).toEqual({
    children: 2,
    github: true,
    google: true,
    viewBox: "0 0 16 16",
    height: "24",
    width: "19",
    paths: 1,
    googleSrc: expect.stringMatching(/btn_google_light_normal_ios(-[A-Za-z0-9_-]+)?\.svg/u),
  });
  expect(await page.locator(".provider-name")).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      document
        .querySelector('[data-owner="user-profile-provider-google-image"]')
        ?.getAttribute("src"),
    ),
  ).not.toContain("/assets/images/provider-logo/");

  expect(await readConnectedSocialProviderMetrics(page)).toEqual({
    authProviderFontFamily: expect.stringContaining("Roboto"),
    githubDisplay: "inline-block",
    githubMarginBottom: "3px",
    githubMarginLeft: "-4px",
    githubMarginTop: "3px",
    githubWidth: "30px",
    svgVerticalAlign: "middle",
  });
});

test("anonymous public user profile hides legacy activity stream controls", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, { anonymousViewer: true });

  await page.goto(`${basePath}/door`);
  await expect(page.locator(".user-box")).toBeVisible();
  const guestStream = page.locator('[data-owner="user-profile-guest-stream-shell"]');
  await expect(guestStream).toHaveCount(1);
  await expect(guestStream).toBeEmpty();
  await expect(page.locator("#daysAgoBtn")).toHaveCount(0);
  await expect(page.locator("#issues")).toHaveCount(0);
  await expect(page.locator("#pullRequests")).toHaveCount(0);
  await expect(page.locator("#projects")).toHaveCount(0);
});

test("public user profile matches legacy selected projects tab and click switching", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door?daysAgo=7&selected=projects`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(2)).toHaveClass("active");

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const beforeTabClickUrl = page.url();

  await page.locator(".user-stream-box > .nav-tabs button", { hasText: "Pull request" }).click();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(1)).toHaveClass("active");
  await expect(page.locator("#pullRequests")).toHaveClass(/active/u);
  await expect(page.locator("#projects")).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");
  expect(new URL(page.url()).searchParams.get("daysAgo")).toBe("7");
  expect(new URL(page.url()).searchParams.get("selected")).toBe("projects");

  await page.locator(".user-stream-box > .nav-tabs button", { hasText: "Issue" }).click();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").first()).toHaveClass("active");
  await expect(page.locator("#issues")).toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);

  await page
    .locator('[data-owner="user-profile-issue-tabs"] button', { hasText: "Closed" })
    .click();
  await expect(page.locator('[data-owner="user-profile-issue-tabs"] > li').nth(1)).toHaveClass(
    "active",
  );
  await expect(page.locator("#closedIssues")).toHaveClass(/active/u);
  await expect(page.locator("#openIssues")).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);

  await page.locator('[data-owner="user-profile-issue-tabs"] button', { hasText: "Open" }).click();
  await expect(page.locator('[data-owner="user-profile-issue-tabs"] > li').first()).toHaveClass(
    "active",
  );
  await expect(page.locator("#openIssues")).toHaveClass(/active/u);
  await expect(page.locator("#closedIssues")).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");
});

test("public user profile matches legacy selected pull-request tab", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page);

  await page.goto(`${basePath}/door?daysAgo=7&selected=pullRequests`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator(".user-stream-box > .nav-tabs > li").nth(1)).toHaveClass("active");
  await expect(page.locator("#pullRequests")).toHaveClass(/active/u);
});

test("public user profile matches legacy empty pull-request tab", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, { pullRequestsEmpty: true });

  await page.goto(`${basePath}/door?daysAgo=7&selected=pullRequests`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator("#pullRequests .error-wrap p")).toHaveText(
    "recently No pull requests have been received",
  );
  await expect(page.locator("#pullRequests .post-list-wrap .post-item")).toHaveCount(0);
});

test("current user profile projects tab renders legacy leave-project branch", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPublicProfile(page, {
    currentUser: true,
    memberProjectOwnerName: "alice",
    viewerCanLeave: true,
    viewerCanWatch: false,
  });

  await page.goto(`${basePath}/door?daysAgo=7&selected=projects`);
  await expect(page.locator(".user-box")).toBeVisible();
  await expect(page.locator("#projects")).toHaveClass(/active/u);

  const leaveProject = page.locator("#projects .leaveProject");
  await expect(leaveProject).toHaveAttribute("href", `${basePath}/info/leave/alice/sample`);
  await expect(leaveProject).toHaveAttribute("data-projectname", "sample");
});

test("missing public user renders legacy user.notExists.name not-found screen", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const rootHref = `${basePath}/`;
  await mockMissingPublicProfile(page);

  await page.goto(`${basePath}/ghost`);
  await expect(page.locator(".error-wrap")).toBeVisible();
  await expect(page.locator(".error-wrap p")).toHaveText("User exists not");
  await expect(page.locator('#mySidenav .right-menu > .nav-tabs.nm a[href^="#"]')).toHaveCount(0);
  await expect(
    page.locator('#mySidenav .right-menu > .nav-tabs.nm button[type="button"]'),
  ).toHaveText(["Favorite", "Project", "Recent History"]);
  await expect(
    page.locator('#mySidenav .right-menu > .nav-tabs.nm button[data-toggle="tab"]'),
  ).toHaveCount(0);
  await expect(page.locator(".gnb-nav a", { hasText: "Project list" })).toHaveAttribute(
    "href",
    `${basePath}/projects`,
  );
  await expect(page.locator(".gnb-nav a", { hasText: "Feedback" })).toHaveAttribute(
    "href",
    "https://github.com/yona-projects/yona/issues",
  );
  await expect(page.locator(".gnb-nav a", { hasText: "Feedback" })).toHaveAttribute(
    "target",
    "_blank",
  );
  await expect(page.locator(".gnb-usermenu a", { hasText: "Log in" })).toHaveAttribute(
    "href",
    `${basePath}/users/loginform`,
  );
  await expect(page.locator(".gnb-inner > .logo")).toHaveAttribute("href", rootHref);
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute("href", rootHref);
  await expect(page.locator(".gnb-inner > .logo")).not.toHaveAttribute("aria-current", /.+/u);
  await expect(page.locator(".gnb-inner > .logo")).not.toHaveAttribute("data-status", /.+/u);
  await expect(page.locator(".gnb-inner > .logo")).toHaveAttribute("class", "logo");
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).not.toHaveAttribute(
    "aria-current",
    /.+/u,
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).not.toHaveAttribute(
    "data-status",
    /.+/u,
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toHaveAttribute(
    "class",
    /(?:^| )ybtn ybtn-info(?: |$)/u,
  );
  expect(await readMissingUserLinkMetrics(page)).toEqual({
    homeInsideErrorWrap: true,
    homeVisibleBelowMessage: true,
    logoInsideHeader: true,
  });

  await page.evaluate(() => {
    (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker = "kept";
  });
  const beforeHomeClickUrl = page.url();

  await page.locator(".error-wrap .ybtn.ybtn-info").click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(rootHref);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");

  await page.goBack();
  await expect.poll(() => page.url()).toBe(beforeHomeClickUrl);
  await expect(page.locator(".error-wrap")).toBeVisible();

  const beforeUsermenuTabClickUrl = page.url();

  await page
    .locator("#mySidenav .right-menu > .nav-tabs.nm button", { hasText: "Project" })
    .dispatchEvent("click");
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myProjectList"),
  ).toHaveClass(/active/u);
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myOrganizationList"),
  ).not.toHaveClass(/active/u);
  expect(page.url()).toBe(beforeUsermenuTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");

  await page
    .locator("#mySidenav .right-menu > .nav-tabs.nm button", { hasText: "Recent History" })
    .dispatchEvent("click");
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myRecentIssueList"),
  ).toHaveClass(/active/u);
  expect(page.url()).toBe(beforeUsermenuTabClickUrl);

  await page
    .locator("#mySidenav .right-menu > .nav-tabs.nm button", { hasText: "Favorite" })
    .dispatchEvent("click");
  await expect(
    page.locator("#mySidenav .right-menu > .nav-tabs.nm > li.myOrganizationList"),
  ).toHaveClass(/active/u);
  expect(page.url()).toBe(beforeUsermenuTabClickUrl);
  await expect.poll(() => readSpaMarker(page)).toBe("kept");

  expect(await canonicalizeScreenRoots(page)).toEqual(
    await canonicalizeHtml(
      page,
      EXPECTED_MISSING_USER_SCREEN.replaceAll("__BASE_ROOT_HREF__", rootHref).replaceAll(
        "__BASE_PATH__",
        basePath,
      ),
    ),
  );
});

type MockPublicProfileOptions = {
  anonymousViewer?: boolean;
  connectedSocialProviders?: string[];
  currentUser?: boolean;
  memberProjectOwnerName?: string;
  memberProjectCreatedAt?: string;
  memberProjectLastPushedAt?: string;
  pullRequestsEmpty?: boolean;
  viewerCanLeave?: boolean;
  viewerCanWatch?: boolean;
};

async function mockPublicProfile(page: Page, options: MockPublicProfileOptions = {}) {
  const anonymousViewer = options.anonymousViewer ?? false;
  const connectedSocialProviders = options.connectedSocialProviders ?? [];
  const currentUser = options.currentUser ?? false;
  const memberProjectOwnerName = options.memberProjectOwnerName ?? "door";
  const pullRequestsEmpty = options.pullRequestsEmpty ?? false;
  const viewerCanLeave = options.viewerCanLeave ?? false;
  const viewerCanWatch = options.viewerCanWatch ?? true;

  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
    };
  }, process.env.YONA_DEV_BASE_PATH ?? "/yona");

  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: anonymousViewer,
        loginId: anonymousViewer ? "anonymous" : currentUser ? "door" : "alice",
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
            childClosedCount: 1,
            childIssues: [
              {
                assigneeLabel: "Alice",
                commentCount: 0,
                createdLabel: "2026-07-03",
                isDraft: false,
                issueNumber: 13,
                labels: [],
                state: "open",
                title: "Open profile child",
                voterCount: 0,
              },
              {
                assigneeLabel: "",
                commentCount: 0,
                createdLabel: "2026-07-04",
                isDraft: false,
                issueNumber: 14,
                labels: [],
                state: "closed",
                title: "Closed profile child",
                voterCount: 0,
              },
            ],
            childOpenCount: 1,
            commentCount: 3,
            dueDateLabel: "2026-08-01",
            dueDateOverdue: false,
            dueDateText: "31 days",
            id: 11,
            issueNumber: 7,
            labels: [
              {
                categoryName: "Type",
                color: "#f44336",
                id: 17,
                name: "Bug",
              },
            ],
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
            dueDateLabel: "2026-08-01",
            dueDateOverdue: false,
            id: 12,
            issueNumber: 8,
            milestoneId: 3,
            milestoneTitle: "v1.0",
            ownerName: "door",
            projectName: "sample",
            state: "closed",
            title: "Closed profile issue",
            updatedLabel: "2026-06-29",
          },
        ],
        memberProjects: [
          {
            createdAt: options.memberProjectCreatedAt ?? "2020-06-01T12:34:56Z",
            isWatching: false,
            lastPushedAt: options.memberProjectLastPushedAt ?? "2020-06-30T12:34:56Z",
            logoUrl: "/assets/images/project_default_logo.png",
            memberCount: 3,
            originOwnerName: "",
            originProjectName: "",
            overview: "Profile project",
            ownerName: memberProjectOwnerName,
            projectName: "sample",
            projectScope: "public",
            viewerCanLeave,
            viewerCanWatch,
            watchCount: 5,
          },
        ],
        profile: {
          avatarUrl: "/assets/images/default-avatar-256.png",
          connectedSocialProviders,
          displayName: "Door User",
          englishName: "Door English",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: true,
          loginId: "door",
          primaryEmailAddress: "door@example.com",
          sinceLabel: "Jun 30, 2026",
        },
        pullRequestItems: pullRequestsEmpty
          ? []
          : [
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
        viewerCanEditProfile: currentUser,
      }),
    });
  });
}

async function mockMissingPublicProfile(page: Page) {
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
  await page.route("**/api/v1/users/ghost/profile**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 404,
      body: JSON.stringify({
        error: {
          code: "not_found",
          message: "User exists not",
          status: 404,
        },
      }),
    });
  });
}

async function readProfileMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrapOuter = document.querySelector<HTMLElement>(".page-wrap-outer");
    const userBox = document.querySelector<HTMLElement>(".user-box");
    const userInfo = document.querySelector<HTMLElement>('[data-owner="user-profile-info"]');
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

async function readConnectedSocialProviderMetrics(page: Page) {
  return page.evaluate(() => {
    const providerLogo = document.querySelector<HTMLElement>(
      '[data-owner="user-profile-user-since"] [data-owner="user-profile-provider-logo"]',
    );
    const github = providerLogo?.querySelector<HTMLElement>(
      '[data-owner="user-profile-provider-github"]',
    );
    const svg = github?.querySelector<SVGElement>("svg");
    if (!providerLogo || !github || !svg) {
      throw new Error("Expected connected social provider metric targets are missing.");
    }

    const providerLogoStyle = getComputedStyle(providerLogo);
    const githubStyle = getComputedStyle(github);
    const svgStyle = getComputedStyle(svg);

    return {
      authProviderFontFamily: providerLogoStyle.fontFamily,
      githubDisplay: githubStyle.display,
      githubMarginBottom: githubStyle.marginBottom,
      githubMarginLeft: githubStyle.marginLeft,
      githubMarginTop: githubStyle.marginTop,
      githubWidth: githubStyle.width,
      svgVerticalAlign: svgStyle.verticalAlign,
    };
  });
}

async function readTwoColumnStorage(page: Page) {
  return page.evaluate(() => localStorage.getItem("useTwoColumnMode"));
}

async function readTwoColumnPopoverMetrics(page: Page) {
  return page.evaluate(() => {
    const control = document.querySelector<HTMLElement>(".two-column-icon");
    const popover = document.querySelector<HTMLElement>(".two-column-icon .popover.top");
    if (!control || !popover) {
      throw new Error("Expected two-column popover metric targets are missing.");
    }

    const controlBox = control.getBoundingClientRect();
    const popoverBox = popover.getBoundingClientRect();
    const controlCenter = controlBox.left + controlBox.width / 2;
    const popoverCenter = popoverBox.left + popoverBox.width / 2;

    return {
      centeredAboveControl: Math.abs(controlCenter - popoverCenter) <= 2,
      popoverTopPlacement: popoverBox.bottom <= controlBox.top + 1,
    };
  });
}

async function readMissingUserLinkMetrics(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".gnb-outer");
    const logo = document.querySelector<HTMLElement>(".gnb-inner > .logo");
    const errorWrap = document.querySelector<HTMLElement>(".error-wrap");
    const message = document.querySelector<HTMLElement>(".error-wrap p");
    const home = document.querySelector<HTMLElement>(".error-wrap .ybtn.ybtn-info");
    if (!header || !logo || !errorWrap || !message || !home) {
      throw new Error("Expected missing-user metric targets are missing.");
    }
    const headerBox = header.getBoundingClientRect();
    const logoBox = logo.getBoundingClientRect();
    const errorBox = errorWrap.getBoundingClientRect();
    const messageBox = message.getBoundingClientRect();
    const homeBox = home.getBoundingClientRect();
    return {
      homeInsideErrorWrap:
        homeBox.left >= errorBox.left &&
        homeBox.right <= errorBox.right &&
        homeBox.top >= errorBox.top &&
        homeBox.bottom <= errorBox.bottom,
      homeVisibleBelowMessage: homeBox.top >= messageBox.bottom,
      logoInsideHeader:
        logoBox.left >= headerBox.left &&
        logoBox.right <= headerBox.right &&
        logoBox.top >= headerBox.top &&
        logoBox.bottom <= headerBox.bottom,
    };
  });
}

async function readSpaMarker(page: Page) {
  return page.evaluate(
    () => (window as Window & typeof globalThis & { __yonaSpaMarker?: string }).__yonaSpaMarker,
  );
}

async function canonicalizeScreenRoots(page: Page) {
  return page.evaluate(() => {
    const roots = Array.from(
      document.querySelectorAll(".gnb-outer, .page-wrap-outer, .page-footer-outer"),
    );
    return roots.map((root) => visit(root)).join("");

    function visit(node: Node): string {
      if (node.nodeType === Node.TEXT_NODE) {
        return normalizeText(node.textContent ?? "");
      }
      if (!(node instanceof Element)) {
        return "";
      }
      const attrs = Array.from(node.attributes)
        .filter(
          (attr) =>
            attr.name !== "alt" &&
            attr.name !== "style" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-overdue" &&
            (attr.name !== "class" || normalizeAttr(attr) !== ""),
        )
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
      if (attr.name !== "class") {
        return attr.value;
      }
      return attr.value
        .split(/\s+/u)
        .filter(Boolean)
        .filter(
          (token) =>
            token &&
            token !== "gray-txt" &&
            token !== "right-txt" &&
            !/^x[0-9a-z]+$/u.test(token) &&
            !token.includes("__"),
        )
        .join(" ");
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
        .filter(
          (attr) =>
            attr.name !== "alt" &&
            attr.name !== "style" &&
            attr.name !== "data-owner" &&
            attr.name !== "data-style-src" &&
            attr.name !== "data-overdue" &&
            (attr.name !== "class" || normalizeAttr(attr) !== ""),
        )
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
      if (attr.name !== "class") {
        return attr.value;
      }
      return attr.value
        .split(/\s+/u)
        .filter(Boolean)
        .filter(
          (token) =>
            token &&
            token !== "gray-txt" &&
            token !== "right-txt" &&
            !/^x[0-9a-z]+$/u.test(token) &&
            !token.includes("__"),
        )
        .join(" ");
    }
  }, html);
}
