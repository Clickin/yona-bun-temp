import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdir = async () => undefined;
const resolve = (...parts) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-home-action-floats",
  fallbackOff ? "fallback-off" : "normal",
);

test.use({ locale: "en-US" });

test("project home float owners cite the exact legacy evidence", async () => {
  const [route, style, legacyRoot, legacyPartial, bootstrap, pageLess, yobi, messages] =
    await Promise.all([
      readFile(new URL("../src/routes/$ownerName/$projectName.tsx", import.meta.url), "utf8"),
      readFile(
        new URL("../src/routes/$ownerName/$projectName/-project-home.stylex.ts", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/project/home.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/views/milestone/partial_status.scala.html",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    ]);

  expect(legacyRoot).toContain(
    '<button type="button" class="ybtn ybtn-minimum ybtn-danger pull-right" id="projectLeaveBtn" data-href="@routes.ProjectApp.deleteMember(project.owner, project.name, UserApp.currentUser().id)">@Messages("project.member.leave")</button>',
  );
  expect(legacyPartial).toContain(
    '<span class="pull-right">\n                <strong>@milestone.getNumClosedIssues / @(milestone.getNumOpenIssues + milestone.getNumClosedIssues)</strong>\n            </span>',
  );
  expect(bootstrap).toContain(".pull-right {\n  float: right;\n}");
  for (const selector of [
    ".milestone-info {",
    ".progress-info {\n            clear:both;",
    ".project-home {\n    .milestone-info {",
    ".progress-wrap { margin:0 5px; }",
    ".project-btn-wrap",
  ]) {
    expect(pageLess).toContain(selector);
  }
  for (const importedStylesheet of [
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]) {
    expect(yobi).toContain(importedStylesheet);
  }
  for (const message of [
    "button.no = No",
    "button.yes = Yes",
    "label.dueDate = Due Date",
    "project.member.leave = Leave project",
    "project.member.leaveConfirm = Do you want to leave this project?",
    "project.members = Project members",
  ]) {
    expect(messages).toContain(message);
  }

  expect(style).toContain('projectLeaveButton: { float: "right" }');
  expect(style).toContain('milestoneProgressCount: { float: "right" }');
  expect(route).toContain('data-stylex-owner="project-home-leave-button"');
  expect(route).toContain('data-stylex-owner="project-home-milestone-progress-count"');
  expect(route).not.toContain("pull-right");

  const leaveButton = elementSource(route, 'id="projectLeaveBtn"');
  const progressCount = elementSource(
    route,
    'data-stylex-owner="project-home-milestone-progress-count"',
  );
  for (const element of [leaveButton, progressCount]) {
    expect(element).not.toContain("style=");
    expect(element).not.toMatch(/data-(?:action|dismiss|href|request-|toggle|url)=/u);
  }
});

test("project home action and milestone floats preserve populated behavior", async ({ page }) => {
  const leaveRequests: { hasCsrfToken: boolean; method: string }[] = [];
  await mockProjectHome(page, leaveRequests);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator("#projectLeaveBtn")).toBeVisible();
  await expect(page.locator("#projectLeaveBtn")).toHaveText("Leave project");
  await expect(
    page.locator('[data-stylex-owner="project-home-milestone-progress-count"]'),
  ).toHaveText("1 / 2");
  await expect(page.locator("#projectLeaveBtn")).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
  await expect(
    page.locator('[data-stylex-owner="project-home-milestone-progress-count"]'),
  ).not.toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
  await expect(page.locator('[data-stylex-owner="project-home-leave-button"]')).toHaveCSS(
    "float",
    "right",
  );
  await expect(
    page.locator('[data-stylex-owner="project-home-milestone-progress-count"]'),
  ).toHaveCSS("float", "right");
  expect(await sidePanelOrder(page)).toEqual([
    "project-btn-wrap",
    "milestone-info",
    "member-info",
    "projectLeaveBtn",
  ]);
  expect(await boundedFloats(page)).toEqual({
    leaveContained: true,
    milestoneCountContained: true,
    noHorizontalOverflow: true,
  });
  await mkdir(screenshotDirectory, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "desktop.png"),
  });

  await page.locator("#projectLeaveBtn").click();
  await expect(page.locator("#alertLeave")).toHaveAttribute(
    "data-stylex-owner",
    "project-home-leave-modal",
  );
  await expect(page.locator("#alertLeave")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#alertLeave")).toBeVisible();
  await expect(page.locator("#alertLeave")).toContainText("Do you want to leave this project?");
  await page.locator("#alertLeave .modal-footer button").last().dispatchEvent("click");
  await expect(page.locator("#alertLeave")).toHaveAttribute("aria-hidden", "true");
  expect(leaveRequests).toEqual([]);

  await page.locator("#projectLeaveBtn").click();
  const deleteResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/admin/projects/sample/members/1") &&
      response.request().method() === "DELETE",
  );
  await page.locator("#leaveBtn").dispatchEvent("click");
  await deleteResponse;
  await expect(page).toHaveURL(`${basePath}/admin`);
  expect(leaveRequests).toEqual([{ hasCsrfToken: true, method: "DELETE" }]);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/admin/sample`);
  await expect(page.locator('[data-stylex-owner="project-home-leave-button"]')).toHaveCSS(
    "float",
    "right",
  );
  await expect(
    page.locator('[data-stylex-owner="project-home-milestone-progress-count"]'),
  ).toHaveCSS("float", "right");
  expect(await boundedFloats(page)).toEqual({
    leaveContained: true,
    milestoneCountContained: true,
    noHorizontalOverflow: true,
  });
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "mobile.png"),
  });
});

function elementSource(source: string, marker: string) {
  const markerIndex = source.indexOf(marker);
  const start = source.lastIndexOf("<", markerIndex);
  const end = source.indexOf(">", markerIndex);
  return source.slice(start, end + 1);
}

async function sidePanelOrder(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll(".span-right-pane > .bubble-wrap > *")).map((element) => {
      if (element.id) return element.id;
      if (element.classList.contains("milestone-info")) return "milestone-info";
      if (element.classList.contains("member-info")) return "member-info";
      return element.classList.contains("project-btn-wrap") ? "project-btn-wrap" : "unknown";
    }),
  );
}

async function boundedFloats(page: Page) {
  return page.evaluate(() => {
    const leave = document.querySelector<HTMLElement>("#projectLeaveBtn");
    const count = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-home-milestone-progress-count"]',
    );
    const panel = document.querySelector<HTMLElement>(".span-right-pane > .bubble-wrap");
    const progressInfo = count?.parentElement;
    if (!leave || !count || !panel || !progressInfo) throw new Error("Missing float owners");

    const contained = (child: HTMLElement, parent: HTMLElement) => {
      if (child.offsetParent === null) return true;
      const childRect = child.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();
      return childRect.left >= parentRect.left && childRect.right <= parentRect.right + 1;
    };

    return {
      leaveContained: contained(leave, panel),
      milestoneCountContained: contained(count, progressInfo),
      noHorizontalOverflow:
        document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    };
  });
}

async function mockProjectHome(
  page: Page,
  leaveRequests: { hasCsrfToken: boolean; method: string }[],
) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-home" },
      json: {
        session: { csrfToken: "csrf-project-home", projection: {}, userId: 1 },
        user: { id: 1, isConfirmed: true, isSiteAdmin: true, loginId: "admin", name: "Site Admin" },
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/members/1", (route) => {
    leaveRequests.push({
      hasCsrfToken: route.request().headers()["x-csrf-token"] === "csrf-project-home",
      method: route.request().method(),
    });
    return route.fulfill({
      contentType: "application/json",
      json: { redirectPath: "/admin" },
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/admin/sample.git",
        currentMilestone: {
          closedIssueCount: 1,
          completionPercent: 50,
          dueDateLabel: "Jul 5, 2026",
          dueDateOverdue: false,
          id: 1,
          openIssueCount: 1,
          state: "open",
          title: "v1.0",
          untilLabel: "4 days left",
        },
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        enrollmentRequestCount: 0,
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: true,
        viewerCanLeave: true,
        viewerCanUpdate: false,
      },
    }),
  );
}
