import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

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
      json: profileResponse(),
    }),
  );
});

test("authenticated public profile owns outer and nested tab-content visibility", async ({
  page,
}) => {
  const [routeSource, styleSource, scala, bootstrap, responsive, yobiLess, appCss, ...lessChain] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      curatedAppCss(),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
      Promise.resolve(curatedAppCss()),
      ...[
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
      ].map((file) =>
        readFile(
          new URL(`../../yona-original/app/assets/stylesheets/less/${file}`, import.meta.url),
          "utf8",
        ),
      ),
    ]);

  expect(scala).toContain('<div class="tab-content">');
  expect(scala).toContain('<div id="issues" class="tab-pane @isActiveTab("issues")">');
  expect(scala).toContain('<div id="openIssues" class="tab-pane active">');
  expect(scala).toContain('<div id="closedIssues" class="tab-pane">');
  expect(scala).toContain('<div id="pullRequests" class="tab-pane @isActiveTab("pullRequests")">');
  expect(scala).toContain('<div id="projects" class="tab-pane @isActiveTab("projects")">');
  expect(bootstrap).toContain(".tab-content {\n  overflow: hidden;\n}");
  expect(bootstrap).toContain(
    ".tab-content > .tab-pane,\n.pill-content > .pill-pane {\n  display: none;\n}",
  );
  expect(bootstrap).toContain(
    ".tab-content > .active,\n.pill-content > .active {\n  display: block;\n}",
  );
  expect(responsive).not.toMatch(/\.tab-(?:content|pane)\b/u);
  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
  }
  for (const less of lessChain) {
    expect(less).not.toMatch(/\.tab-(?:content|pane)\b/u);
  }
  expect(appCss).toContain("  .tab-content {\n    overflow: hidden;\n  }");
  expect(appCss).toContain(".tab-content > .tab-pane,");
  expect(appCss).toContain(".tab-content > .active,");
  for (const owner of [
    "user-profile-tab-content",
    "user-profile-issue-tab-content",
    "user-profile-pane-issues",
    "user-profile-pane-open-issues",
    "user-profile-pane-closed-issues",
    "user-profile-pane-pull-requests",
    "user-profile-pane-projects",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  expect(routeSource).toContain('<div id="usermenu-tab-content-list" className="tab-content">');

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });
    await assertProfileVisibility(page, {
      outer: "issues",
      nested: "openIssues",
      viewportWidth: viewport.width,
    });

    const outerTabs = page.locator('[data-owner="user-profile-tab-button"]');
    await expect(outerTabs).toHaveText(["Issue 2", "Pull request 1", "projects 1"]);
    await page.locator('[data-owner="user-profile-issue-tab-button-closed"]').click();
    await assertProfileVisibility(page, {
      outer: "issues",
      nested: "closedIssues",
      viewportWidth: viewport.width,
    });

    await outerTabs.nth(1).click();
    await assertProfileVisibility(page, {
      outer: "pullRequests",
      nested: "closedIssues",
      viewportWidth: viewport.width,
    });
    await expect(page.getByText("Distinct pull request content")).toBeVisible();

    await outerTabs.nth(2).click();
    await assertProfileVisibility(page, {
      outer: "projects",
      nested: "closedIssues",
      viewportWidth: viewport.width,
    });
    await expect(page.getByText("Distinct project content")).toBeVisible();

    await outerTabs.nth(0).click();
    await page.locator('[data-owner="user-profile-issue-tab-button-open"]').click();
    await assertProfileVisibility(page, {
      outer: "issues",
      nested: "openIssues",
      viewportWidth: viewport.width,
    });
    await expect(page.getByText("Distinct open issue content")).toBeVisible();
    await expect(page.getByText("Distinct closed issue content")).toBeHidden();
  }
});

test("guest profile omits owned tab content and unrelated usermenu fallback consumer stays intact", async ({
  page,
}) => {
  await page.unroute("**/api/v1/session");
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: true, loginId: "guest-viewer" },
    }),
  );
  await page.goto(`${basePath}/admin`, { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-owner="user-profile-tab-content"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="user-profile-issue-tab-content"]')).toHaveCount(0);

  await page.goto(`${basePath}/ghost`, { waitUntil: "domcontentloaded" });
  const usermenu = page.locator("#usermenu-tab-content-list");
  await expect(usermenu).toHaveClass(/(?:^|\s)tab-content(?:\s|$)/u);
  await expect(usermenu.locator("xpath=..")).toHaveClass(/(?:^|\s)tab-content(?:\s|$)/u);
});

async function assertProfileVisibility(
  page: Page,
  expected: {
    outer: "issues" | "projects" | "pullRequests";
    nested: "closedIssues" | "openIssues";
    viewportWidth: number;
  },
) {
  await expect(page.locator('[data-owner="user-profile-tab-content"]')).toHaveCount(1);
  await expect(page.locator('[data-owner="user-profile-issue-tab-content"]')).toHaveCount(1);
  const result = await page.evaluate(({ nested, outer }) => {
    const wrapper = document.querySelector<HTMLElement>('[data-owner="user-profile-tab-content"]');
    const issueWrapper = document.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-tab-content"]',
    );
    const paneIds = ["issues", "pullRequests", "projects", "openIssues", "closedIssues"] as const;
    if (!wrapper || !issueWrapper) throw new Error("profile tab-content owners are missing");

    const geometry = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        width: box.width,
      };
    };
    const panes = Object.fromEntries(
      paneIds.map((id) => {
        const pane = document.getElementById(id);
        if (!pane) throw new Error(`profile pane #${id} is missing`);
        return [
          id,
          {
            classes: [...pane.classList],
            display: getComputedStyle(pane).display,
            geometry: geometry(pane),
            pluginAttrs: ["data-toggle", "data-target", "data-action"].filter((name) =>
              pane.hasAttribute(name),
            ),
          },
        ];
      }),
    ) as Record<
      (typeof paneIds)[number],
      {
        classes: string[];
        display: string;
        geometry: ReturnType<typeof geometry>;
        pluginAttrs: string[];
      }
    >;

    const wrapperBox = geometry(wrapper);
    const issueWrapperBox = geometry(issueWrapper);
    const activeOuterBox = panes[outer].geometry;
    const activeNestedBox = panes[nested].geometry;
    return {
      ids: [...wrapper.children].map((node) => node.id),
      nestedIds: [...issueWrapper.children].map((node) => node.id),
      wrappers: {
        outerOverflow: getComputedStyle(wrapper).overflow,
        nestedOverflow: getComputedStyle(issueWrapper).overflow,
      },
      panes,
      activeContained:
        activeOuterBox.left >= wrapperBox.left &&
        activeOuterBox.right <= wrapperBox.right + 1 &&
        activeOuterBox.top >= wrapperBox.top &&
        activeOuterBox.bottom <= wrapperBox.bottom + 1 &&
        activeNestedBox.left >= issueWrapperBox.left &&
        activeNestedBox.right <= issueWrapperBox.right + 1 &&
        activeNestedBox.top >= issueWrapperBox.top &&
        activeNestedBox.bottom <= issueWrapperBox.bottom + 1,
      scrollWidth: document.documentElement.scrollWidth,
    };
  }, expected);

  expect(result.ids).toEqual(["issues", "pullRequests", "projects"]);
  expect(result.nestedIds).toEqual(["openIssues", "closedIssues"]);
  expect(result.wrappers).toEqual({ outerOverflow: "hidden", nestedOverflow: "hidden" });
  expect(result.activeContained).toBe(true);
  expect(result.scrollWidth).toBe(expected.viewportWidth);

  for (const [id, pane] of Object.entries(result.panes)) {
    const active = id === expected.outer || id === expected.nested;
    const visible =
      id === expected.outer || (expected.outer === "issues" && id === expected.nested);
    expect(pane.display, id).toBe(active ? "block" : "none");
    // 667398a04 legacy-parity restore: the app retains the legacy tab-pane/active classes.
    expect(pane.classes, id).toContain("tab-pane");
    if (active) {
      expect(pane.classes, id).toContain("active");
    } else {
      expect(pane.classes, id).not.toContain("active");
    }
    expect(pane.pluginAttrs, id).toEqual([]);
    if (!visible) {
      expect(pane.geometry.width, id).toBe(0);
      expect(pane.geometry.height, id).toBe(0);
    }
  }
}

function profileResponse() {
  return {
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
        authorLabel: "Admin",
        authorLoginId: "admin",
        id: 1,
        issueNumber: 1,
        ownerName: "admin",
        projectName: "sample",
        state: "open",
        title: "Distinct open issue content",
        updatedLabel: "today",
      },
      {
        authorLabel: "Admin",
        authorLoginId: "admin",
        id: 2,
        issueNumber: 2,
        ownerName: "admin",
        projectName: "sample",
        state: "closed",
        title: "Distinct closed issue content",
        updatedLabel: "today",
      },
    ],
    memberProjects: [
      {
        createdAt: "2020-01-02T12:00:00Z",
        lastPushedAt: "",
        isWatching: false,
        logoUrl: "/assets/images/project_default_logo.png",
        memberCount: 1,
        overview: "Distinct project content",
        ownerName: "admin",
        projectName: "project-content",
        projectScope: "public",
        viewerCanLeave: false,
        viewerCanWatch: false,
        watchCount: 0,
      },
    ],
    pullRequestItems: [
      {
        contributorLabel: "Admin",
        contributorLoginId: "admin",
        ownerName: "admin",
        projectName: "sample",
        pullRequestNumber: 3,
        receiverLoginId: "viewer",
        state: "open",
        title: "Distinct pull request content",
        updatedLabel: "today",
      },
    ],
  };
}
