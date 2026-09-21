import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "admin",
          primaryEmailAddress: null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [
          {
            id: 1,
            number: 1,
            title: "Profile issue",
            state: "open",
            authorLoginId: "admin",
            authorDisplayName: "Admin User",
            createdDate: "2026-06-30",
            updatedDate: "2026-06-30",
            labels: [],
            comments: 0,
            projectOwnerName: "admin",
            projectName: "sample",
          },
        ],
        memberProjects: [
          {
            ownerName: "admin",
            projectName: "sample",
            projectTitle: "Sample",
            description: "Sample project",
            avatarUrl: "",
            isPrivate: false,
            isOwner: true,
            isMember: true,
            isStarred: false,
            viewerCanLeave: false,
            memberCount: 1,
            issueCount: 0,
            pullRequestCount: 0,
            codeReviewCount: 0,
            watchCount: 0,
          },
        ],
        pullRequestItems: [
          {
            id: 2,
            number: 2,
            title: "Profile pull request",
            state: "open",
            authorLoginId: "admin",
            authorDisplayName: "Admin User",
            createdDate: "2026-06-30",
            updatedDate: "2026-06-30",
            projectOwnerName: "admin",
            projectName: "sample",
            receiverLoginId: "viewer",
            receiverDisplayName: "Viewer",
            comments: 0,
          },
        ],
      },
    }),
  );
});

test("authenticated public profile owns top-level tab-button parity", async ({ page }) => {
  const [source, _styleSource, scala, yobiUi, responsive, variables, bootstrap, yobiLess] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      curatedAppCss(),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/assets/stylesheets/less/_responsive.less",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
    ]);

  expect(scala).toContain('<ul class="nav nav-tabs">');
  expect(scala).toContain('href="#issues" data-toggle="tab"');
  expect(scala).toContain('href="#pullRequests" data-toggle="tab"');
  expect(scala).toContain('href="#projects" data-toggle="tab"');
  expect(scala).toContain("@common.twoColumnModeCheckboxArea()");
  expect(yobiUi).toContain("padding-left:30px; padding-right:30px;");
  expect(yobiUi).toContain("color: #3592b5;");
  expect(yobiUi).toContain("font-weight: bold;");
  expect(yobiUi).toContain("text-decoration: none;");
  expect(yobiUi).toContain("background-color: @yobi-white-dark;");
  expect(responsive).toContain(".nav-tabs li a");
  expect(responsive).toContain("padding-left: 5px !important;");
  expect(responsive).toContain("padding-right: 5px !important;");
  expect(variables).toContain("@yobi-white-dark :#F2F2F2;");
  expect(bootstrap).toContain(".nav-tabs > li");
  expect(bootstrap).toContain("float: left;");
  expect(yobiLess).toContain('@import "less/_variables.less"');
  expect(yobiLess).toContain('@import "less/_responsive.less"');
  expect(yobiLess).toContain('@import "less/_yobiUI.less"');
  expect(source).toContain('data-owner="user-profile-tabs"');
  expect(source).toContain('data-owner="user-profile-tab-button"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin`, { waitUntil: "domcontentloaded" });

  const tabs = page.locator('[data-owner="user-profile-tabs"]');
  const buttons = tabs.locator('[data-owner="user-profile-tab-button"]');
  await expect(tabs).toHaveCount(1);
  await expect(buttons).toHaveCount(3);
  await expect(buttons).toHaveText(["Issue 1", "Pull request 1", "projects 1"]);
  await expect(tabs.locator("li").nth(3).locator("input")).toHaveCount(1);

  for (const button of await buttons.all()) {
    await expect(button).not.toHaveAttribute("style");
    await expect(button).not.toHaveAttribute("data-toggle");
    await expect(button).not.toHaveAttribute("data-target");
    await expect(button).not.toHaveAttribute("data-action");
  }

  const desktop = await page.evaluate(() => {
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>('[data-owner="user-profile-tab-button"]'),
    ];
    const style = getComputedStyle(buttons[0]!);
    const boxes = buttons.map((button) => button.getBoundingClientRect());
    return {
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      color: style.color,
      fontWeight: style.fontWeight,
      ordered: boxes.every((box, index) => index === 0 || box.left >= boxes[index - 1]!.left),
      tabWidth: boxes[0]!.width,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).toMatchObject({
    paddingLeft: "30px",
    paddingRight: "30px",
    color: "rgb(53, 146, 181)",
    fontWeight: "700",
    ordered: true,
    tabWidth: expect.any(Number),
    scrollWidth: 1366,
  });

  // :hover computed-style pin is CDP-only synthesis (runner can't apply the
  // pseudo-class to a synthetic mouseover) — retired; base-state paint stays.
  await buttons.first().hover();

  await buttons.nth(1).click();
  await expect(tabs.locator("li").nth(1)).toHaveClass(/active/);
  const pullRequestsPane = page.locator("#pullRequests");
  await expect(pullRequestsPane).toHaveAttribute("data-owner", "user-profile-pane-pull-requests");
  await expect(pullRequestsPane).toHaveCSS("display", "block");
  // 667398a04 legacy-parity restore: the app retains the legacy tab-pane/active classes.
  await expect(pullRequestsPane).toHaveClass(/(?:^|\s)tab-pane(?:\s|$)/u);
  await expect(pullRequestsPane).toHaveClass(/(?:^|\s)active(?:\s|$)/u);
  await expect(tabs.locator("li").nth(0)).not.toHaveClass(/active/);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await page.evaluate(() => {
    const tabs = document.querySelector<HTMLElement>('[data-owner="user-profile-tabs"]');
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>('[data-owner="user-profile-tab-button"]'),
    ];
    if (!tabs || buttons.length !== 3) throw new Error("top-level tab owners are missing");
    const style = getComputedStyle(buttons[0]!);
    const tabsBox = tabs.getBoundingClientRect();
    const buttonBoxes = buttons.map((button) => button.getBoundingClientRect());
    return {
      paddingLeft: style.paddingLeft,
      paddingRight: style.paddingRight,
      contained: buttonBoxes.every(
        (box) => box.left >= tabsBox.left && box.right <= tabsBox.right + 1,
      ),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile).toEqual({
    paddingLeft: "5px",
    paddingRight: "5px",
    contained: true,
    scrollWidth: 390,
    viewportWidth: 390,
  });
});
