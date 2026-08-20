import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
// Post-merge: the full legacy cascade lives in app.css — normal-mode semantics.
const fallbackOff = false;
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/style-organization-home-action-floats",
  "normal",
);

const routeSource = readFileSync("src/routes/organizations/$organizationName.tsx", "utf8");
const styleSource = readFileSync("src/app.css", "utf8");
const legacyViewSource = readFileSync(
  "../yona-original/app/views/organization/view.scala.html",
  "utf8",
);
const legacyYobiSource = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
const legacyPageSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_page.less",
  "utf8",
);
const legacyCommonSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_common.less",
  "utf8",
);
const legacyResponsiveSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_responsive.less",
  "utf8",
);
const legacyYobiUiSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  "utf8",
);
const legacyVariablesSource = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_variables.less",
  "utf8",
);
const bootstrapSource = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
const bootstrapResponsiveSource = readFileSync(
  "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "utf8",
);
const messagesSource = readFileSync("../yona-original/conf/messages", "utf8");

const yobiImports = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
];

test.use({ locale: "en-US" });

function sourceWindow(source: string, owner: string) {
  const marker = `data-owner="${owner}"`;
  const index = source.indexOf(marker);
  expect(index, `missing source owner ${owner}`).toBeGreaterThanOrEqual(0);
  return source.slice(Math.max(0, index - 240), index + 240);
}

test("organization home action floats preserve exact legacy provenance", () => {
  const legacyLines = legacyViewSource.split(/\r?\n/u);
  const leaveFactory = legacyLines.slice(27, 31).join("\n");
  const createProject = legacyLines.slice(70, 75).join("\n");
  const stats = legacyLines.slice(112, 136).join("\n");
  const memberPanels = legacyLines.slice(145, 176).join("\n");

  expect(leaveFactory).toContain(
    '<button type="button" class="ybtn ybtn-minimum ybtn-danger pull-right" id="groupLeaveBtn"',
  );
  expect(leaveFactory).toContain('Messages("organization.member.leave")');
  expect(createProject).toContain('<div class="pull-right">');
  expect(createProject).toContain('Messages("button.newProject")');
  expect(stats).toContain('<div class="stats-wrap pull-right">');
  expect(stats).toContain('Messages("project.onmember"');
  expect(stats).toContain('Messages("project.onwatching"');
  expect(stats).toContain('class="yobicon-lightbulb ramp-on"');
  expect(stats).toContain('class="yobicon-lightbulb ramp-off"');
  expect(memberPanels).toContain('<h3>@Messages("user.role.org_admin")</h3>');
  expect(memberPanels).toContain('<h3>@Messages("user.role.org_member")</h3>');
  expect(memberPanels).toContain(
    "@makeLeaveBtn(org, OrganizationUser.isAdmin(org.id, UserApp.currentUser().id))",
  );
  expect(memberPanels).toContain(
    "@makeLeaveBtn(org, OrganizationUser.isMember(org.id, UserApp.currentUser().id))",
  );
  expect(memberPanels).toContain('<div class="member-wrap ">');
  expect(memberPanels).toContain('<div class="member-wrap">');
  expect(memberPanels).toContain('<ul class="project-members">');
  expect(memberPanels).toContain('<ul class="unstyled project-members">');

  expect(legacyViewSource).toContain('<div class="project-search-wrap row-fluid mt10">');
  expect(legacyViewSource).toContain('<div class="span9 span-hard-wrap">');
  expect(legacyViewSource).toContain('<div class="span3 span-hard-wrap">');
  expect(legacyCommonSource).toContain(".mt10 { margin-top:10px; }");
  expect(legacyPageSource).toMatch(
    /\.stats-wrap\s*\{[\s\S]*?margin-top: 0px;[\s\S]*?text-align: right;/u,
  );
  expect(legacyPageSource).toContain(".all-projects {");
  expect(legacyPageSource).toContain(".members {");
  expect(legacyPageSource).toContain("width:100%;");
  expect(legacyPageSource).toContain("display:inline-block;");
  expect(legacyPageSource).toContain("padding-left: 50px;");
  expect(legacyPageSource).toContain("strong { color:@secondary; }");
  expect(legacyPageSource).toMatch(
    /\.stats-wrap\s*\{[\s\S]*?\.yobicon-lightbulb[\s\S]*?&\.ramp-on\s*\{[\s\S]*?color: #B6DA54;[\s\S]*?&\.ramp-off\s*\{[\s\S]*?color: #DADADA;/u,
  );
  expect(legacyYobiUiSource).toContain(".ybtn");
  expect(legacyYobiUiSource).toContain("&.ybtn-danger");
  expect(legacyVariablesSource).toContain("@secondary       : @blue2;");
  expect(bootstrapSource).toMatch(/\.pull-right\s*\{\s*float:\s*right;\s*\}/u);
  expect(bootstrapResponsiveSource).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsiveSource).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsiveSource).toContain(".row-fluid .span3 {");
  expect(bootstrapResponsiveSource).toContain(".row-fluid .span9 {");
  expect(legacyResponsiveSource).toContain(".span-hard-wrap {");
  expect(legacyResponsiveSource).toContain("min-width: 95%;");
  expect(legacyResponsiveSource).toContain("width: 100vw;");

  expect(legacyYobiSource.trim().split(/\r?\n/u)).toEqual(
    yobiImports.map((file) => `@import "less/${file}";`),
  );
  for (const imported of yobiImports) {
    const importedSource = readFileSync(
      `../yona-original/app/assets/stylesheets/less/${imported}`,
      "utf8",
    );
    expect(importedSource).not.toMatch(/^\s*@import\b/mu);
  }

  for (const message of [
    "button.newProject = Create new project",
    "button.yes = Yes",
    "button.no = No",
    "organization.member.leave = Leave the group",
    "organization.member.leaveConfirm = Do you want to leave this group?",
    "project.onmember =",
    "project.onwatching =",
    "project.default.group.watching = Watching projects",
    "project.you.are.not.watching = You are not watching the {0} project.",
    "user.role.org_admin = Group Manager",
    "user.role.org_member = Group Member",
  ]) {
    expect(messagesSource).toContain(message);
  }

  for (const owner of [
    "organization-home-create-project-wrapper",
    "organization-home-project-card-stats",
    "organization-home-group-leave-button",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }

  expect(routeSource).toContain("showLeave={showLeaveButton && viewerCanUpdate}");
  expect(routeSource).toContain("showLeave={showLeaveButton && !viewerCanUpdate}");

  const leaveButtonSource = sourceWindow(routeSource, "organization-home-group-leave-button");
  expect(leaveButtonSource).toContain("ybtn ybtn-minimum ybtn-danger");
  expect(leaveButtonSource).toContain('id="groupLeaveBtn"');
  expect(leaveButtonSource).not.toMatch(/data-(?:href|toggle|dismiss)=/u);
  expect(routeSource).not.toContain("document.addEventListener");
  expect(routeSource).not.toContain("classList");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

async function mockOrganizationHome(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [{ avatarUrl: "", loginId: "admin", userLabel: "Site Admin" }],
        description: "Web labs group",
        enrollmentRequested: false,
        logoUrl: "",
        memberMembers: [{ avatarUrl: "", loginId: "member", userLabel: "Dev Member" }],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanEnroll: false,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanUpdate: true,
        visibleProjects: [
          {
            createdLabel: "today",
            isWatching: true,
            labels: [],
            memberCount: 3,
            originOwnerName: "",
            originProjectName: "",
            overview: "Sample project",
            ownerName: "weblabs",
            projectName: "sample",
            projectScope: "PUBLIC",
            watchCount: 4,
          },
          {
            createdLabel: "yesterday",
            isWatching: false,
            labels: [],
            memberCount: 1,
            originOwnerName: "",
            originProjectName: "",
            overview: "Other project",
            ownerName: "weblabs",
            projectName: "other",
            projectScope: "PUBLIC",
            watchCount: 2,
          },
        ],
      },
    }),
  );
}

async function assertActionGeometry(page: Page, viewport: { width: number; height: number }) {
  const metrics = await page.evaluate(() => {
    const read = (ownerSelector: string, parentSelector: string) => {
      const owner = document.querySelector<HTMLElement>(ownerSelector);
      const parent = owner?.closest<HTMLElement>(parentSelector);
      if (!owner || !parent) {
        return null;
      }
      const box = owner.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      return {
        bottom: box.bottom,
        float: getComputedStyle(owner).float,
        left: box.left,
        parentBottom: parentBox.bottom,
        parentLeft: parentBox.left,
        parentRight: parentBox.right,
        parentTop: parentBox.top,
        right: box.right,
        top: box.top,
      };
    };

    return {
      create: read(
        '[data-owner="organization-home-create-project-wrapper"]',
        '[data-owner="organization-home-search"]',
      ),
      leave: read(
        '[data-owner="organization-home-group-leave-button"]',
        '[data-owner="organization-home-members"]',
      ),
      stats: read(
        '[data-owner="organization-home-project-card-stats"]',
        '[data-owner="organization-home-project-filter-item"]',
      ),
      bodyScrollWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      clientWidth: document.documentElement.clientWidth,
    };
  });

  for (const [name, action] of [
    ["create", metrics.create],
    ["stats", metrics.stats],
    ["leave", metrics.leave],
  ] as const) {
    expect(action, `${name} action geometry`).not.toBeNull();
    expect(action!.float).toBe("right");
    expect(action!.left).toBeGreaterThanOrEqual(0);
    expect(action!.right).toBeLessThanOrEqual(viewport.width + 1);
    expect(action!.left).toBeGreaterThanOrEqual(action!.parentLeft - 1);
    expect(action!.right).toBeLessThanOrEqual(action!.parentRight + 1);
    expect(action!.top).toBeGreaterThanOrEqual(action!.parentTop - 1);
    expect(action!.bottom).toBeLessThanOrEqual(action!.parentBottom + 1);
  }
  expect(metrics.clientWidth).toBe(viewport.width);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
}

test(`organization home action floats preserve copy and interaction (${"normal"})`, async ({
  page,
}) => {
  await mockOrganizationHome(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });

    const createWrapper = page.locator('[data-owner="organization-home-create-project-wrapper"]');
    const createLink = createWrapper.getByRole("link", { name: "Create new project" });
    const cards = page.locator('[data-owner="organization-home-project-filter-item"]');
    const stats = page.locator('[data-owner="organization-home-project-card-stats"]');
    const leaveButtons = page.locator('[data-owner="organization-home-group-leave-button"]');
    const panels = page.locator('[data-owner="organization-home-members-panel"]');

    await expect(createWrapper).toHaveCount(1);
    await expect(createWrapper).toBeVisible();
    await expect(createLink).toHaveText("Create new project");
    await expect(createLink).toHaveAttribute("href", `${basePath}/projectform?owner=weblabs`);
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0).locator(".header a.black")).toHaveText("sample");
    await expect(cards.nth(1).locator(".header a.black")).toHaveText("other");
    await expect(stats).toHaveCount(2);
    await expect(stats.nth(0)).toContainText("3");
    await expect(stats.nth(0)).toContainText("4");
    await expect(stats.nth(1)).toContainText("1");
    await expect(stats.nth(1)).toContainText("2");
    await expect(panels).toHaveCount(2);
    await expect(panels.first().locator("h3")).toHaveText("Group Manager");
    await expect(panels.last().locator("h3")).toHaveText("Group Member");
    await expect(leaveButtons).toHaveCount(1);

    for (const owner of [createWrapper, leaveButtons]) {
      await expect(owner).not.toHaveAttribute("style");
      await expect(owner).not.toHaveAttribute("data-href");
      await expect(owner).not.toHaveAttribute("data-toggle");
      await expect(owner).not.toHaveAttribute("data-dismiss");
    }
    for (const owner of await stats.all()) {
      await expect(owner).not.toHaveAttribute("style");
      await expect(owner).not.toHaveAttribute("data-href");
      await expect(owner).not.toHaveAttribute("data-toggle");
      await expect(owner).not.toHaveAttribute("data-dismiss");
    }
    await expect(stats.first()).toHaveClass(/(?:^|\s)stats-wrap(?:\s|$)/u);
    await expect(leaveButtons).toHaveAttribute("id", "groupLeaveBtn");
    await expect(leaveButtons).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(leaveButtons).toHaveClass(/(?:^|\s)ybtn-minimum(?:\s|$)/u);
    await expect(leaveButtons).toHaveClass(/(?:^|\s)ybtn-danger(?:\s|$)/u);
    await expect(leaveButtons).toHaveText("Leave the group");
    await assertActionGeometry(page, viewport);

    await leaveButtons.click();
    const modal = page.locator("#alertLeave");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveClass(/(?:^|\s)modal(?:\s|$)/u);
    await expect(modal).toHaveClass(/(?:^|\s)hide(?:\s|$)/u);
    await expect(modal).toHaveClass(/(?:^|\s)in(?:\s|$)/u);
    await expect(modal).toContainText("Leave the group");
    await expect(modal).toContainText("Do you want to leave this group?");
    await expect(modal.locator("#leaveBtn")).toHaveText("Yes");
    const noButton = modal.getByRole("button", { name: "No" });
    await expect(noButton).toBeVisible();
    // Preserve the React event assertion while fallback-off global modal geometry remains outside this owner.
    if (fallbackOff) {
      await noButton.dispatchEvent("click");
    } else {
      await noButton.click();
    }
    await expect(modal).not.toBeVisible();

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});
