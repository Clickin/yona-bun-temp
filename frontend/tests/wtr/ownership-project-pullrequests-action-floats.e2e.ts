import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem; mkdirSync only feeds page.screenshot paths (no-op).
const mkdirSync = () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// Post-merge the full legacy cascade lives in app.css — the "normal" (merged)
// mode is the only runtime mode.
const testMode = "normal";
const screenshotDirectory = `output/playwright/style-project-pullrequests-action-floats/${testMode}`;

test.use({ locale: "en-US" });

test("records the three project pull-request float owners and frozen legacy evidence", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8");

  const legacyRoot = readFileSync("../yona-original/app/views/git/list.scala.html", "utf8");
  const partialSearch = readFileSync(
    "../yona-original/app/views/git/partial_search.scala.html",
    "utf8",
  );
  const partialList = readFileSync(
    "../yona-original/app/views/git/partial_list.scala.html",
    "utf8",
  );
  const recentlyPushedBranches = readFileSync(
    "../yona-original/app/views/git/partial_recently_pushed_branches.scala.html",
    "utf8",
  );
  const twoColumn = readFileSync(
    "../yona-original/app/views/common/twoColumnModeCheckboxArea.scala.html",
    "utf8",
  );
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(legacyRoot).toContain("views.html.git.partial_search");
  expect(partialSearch).toContain('<div class="pull-right">');
  expect(partialSearch).toContain('class="nav nav-tabs nm pullrequeset-tab-menu"');
  expect(partialSearch).toContain("partial_recently_pushed_branches");
  expect(partialSearch).toContain("twoColumnModeCheckboxArea");
  expect(partialList).toContain('class="mt5 pull-right hide-in-mobile"');
  expect(partialList).toContain(
    'class="state @if(req.isConflict == true) {conflict} else { @req.state.toString.toLowerCase} pull-right"',
  );
  expect(partialList).toContain('class="empty-avatar-wrap">&nbsp;</div>');
  expect(recentlyPushedBranches).toContain('class="alert alert-info"');
  expect(twoColumn).toContain('id="two-column-mode-checkbox"');

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
    expect(yobi).toContain(`@import "${importPath}";`);
    expect(readFileSync(`../yona-original/app/assets/stylesheets/${importPath}`, "utf8")).not.toBe(
      "",
    );
  }
  expect(bootstrap).toContain(".pull-right {\n  float: right;\n}");
  expect(bootstrapResponsive).toContain(".row-fluid .span10");
  expect(responsiveLess).toContain(".hide-in-mobile");
  for (const key of [
    "pullRequest.new",
    "pullRequest.is.empty",
    "pullRequest.review.closed",
    "pullRequest.review.total",
    "pullRequest.state.conflict",
    "pullRequest.state.open",
    "pullRequest.state.closed",
    "pullRequest.sent",
  ]) {
    expect(messages).toMatch(new RegExp(`^${key.replaceAll(".", "\\.")}\\s*=`, "m"));
  }

  for (const owner of [
    "project-pullrequests-new-action",
    "project-pullrequests-row-receiver-rail",
    "project-pullrequests-row-state",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
  for (const pluginAttribute of [
    "data-toggle=",
    "data-placement=",
    "data-url=",
    "data-request-",
    "data-dismiss=",
    "data-target=",
    "data-trigger=",
    "data-backdrop=",
    "data-spy=",
    "data-provider=",
    "data-loading-text=",
    "style=",
  ]) {
    expect(route).not.toContain(pluginAttribute);
  }
  expect(route).toContain('to="/$ownerName/$projectName/newPullRequestForm"');
  expect(route).toContain('to="/$ownerName/$projectName/closedPullRequests"');
  expect(route).toContain('to="/$ownerName/$projectName/sentPullRequests"');
  expect(route).toContain('localStorage.getItem("useTwoColumnMode")');
  expect(route).toContain('localStorage.setItem("useTwoColumnMode", String(checked))');
});

test("preserves populated project pull-request actions, interaction, and responsive geometry", async ({
  page,
}) => {
  await mockProjectPullRequests(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequests?filter=batch915`);
    await expect(page.locator('[data-owner="project-pullrequests-tabs"]')).toBeVisible();
    await expect(page.locator('[data-owner="project-pullrequests-rows"]')).toBeVisible();
    await expect(page.locator(".post-list-wrap .post-item")).toHaveCount(2);

    const screenOrder = await page
      .locator("#span10 > *")
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("data-owner") ?? element.tagName),
      );
    expect(screenOrder.slice(0, 3)).toEqual([
      "project-pullrequests-new-action",
      "project-pullrequests-tabs",
      "project-pullrequests-content",
    ]);

    const newAction = page.locator('[data-owner="project-pullrequests-new-action"]');
    await expect(newAction.locator("a")).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/newPullRequestForm`,
    );
    await expect(newAction.locator("a")).toHaveText("pull request");
    await expect(page.locator('[data-owner="project-pullrequests-tabs"]')).toContainText("Open");
    await expect(page.locator('[data-owner="project-pullrequests-tabs"]')).toContainText("Closed");
    await expect(page.locator('[data-owner="project-pullrequests-tabs"]')).toContainText(
      "Sent code",
    );

    const receivers = page.locator('[data-owner="project-pullrequests-row-receiver-rail"]');
    const states = page.locator('[data-owner="project-pullrequests-row-state"]');
    await expect(receivers).toHaveCount(2);
    await expect(states).toHaveCount(2);
    await expect(receivers.nth(0)).toHaveClass(/\bmt5\b/u);
    await expect(receivers.nth(0)).toHaveClass(/\bhide-in-mobile\b/u);
    await expect(receivers.nth(0).locator("a.avatar-wrap.assinee")).toHaveAttribute(
      "href",
      `${basePath}/admin`,
    );
    await expect(receivers.nth(1).locator(".empty-avatar-wrap")).toHaveText(" ");
    await expect(states.nth(0)).toHaveClass(/\bstate\b/u);
    await expect(states.nth(0)).toHaveClass(/\bopen\b/u);
    await expect(states.nth(0)).toHaveText("Open");
    await expect(states.nth(1)).toHaveClass(/\bstate\b/u);
    await expect(states.nth(1)).toHaveClass(/\bconflict\b/u);
    await expect(states.nth(1)).toHaveText("Conflict");

    await expect(page.locator(".post-list-wrap .title-wrap .title").nth(0)).toHaveText(
      "Assigned open row",
    );
    await expect(page.locator(".post-list-wrap .title-wrap .title").nth(1)).toHaveText(
      "Resolve conflict row",
    );
    await expect(page.locator(".post-list-wrap .title-wrap .title").nth(0)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/pullRequest/7`,
    );
    await expect(page.locator(".post-list-wrap .title-wrap .title").nth(1)).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/pullRequest/8`,
    );
    for (const ownerSelector of [
      '[data-owner="project-pullrequests-new-action"]',
      '[data-owner="project-pullrequests-row-receiver-rail"]',
      '[data-owner="project-pullrequests-row-state"]',
    ]) {
      await expect(
        page
          .locator(ownerSelector)
          .locator(
            "[data-toggle], [data-placement], [data-url], [data-request-method], [data-dismiss], [style]",
          ),
      ).toHaveCount(0);
    }

    const geometry = await page.evaluate(() => {
      const rect = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        const box = element.getBoundingClientRect();
        const computed = getComputedStyle(element);
        return {
          bottom: box.bottom,
          display: computed.display,
          float: computed.float,
          left: box.left,
          right: box.right,
          top: box.top,
        };
      };
      const all = (selector: string) =>
        [...document.querySelectorAll<HTMLElement>(selector)].map((element) => {
          const box = element.getBoundingClientRect();
          const computed = getComputedStyle(element);
          const parent = element.parentElement;
          return {
            bottom: box.bottom,
            display: computed.display,
            float: computed.float,
            left: box.left,
            parentDisplay: parent ? getComputedStyle(parent).display : "",
            right: box.right,
            top: box.top,
          };
        });
      return {
        content: rect('[data-owner="project-pullrequests-content"]'),
        documentScrollWidth: document.documentElement.scrollWidth,
        newAction: rect('[data-owner="project-pullrequests-new-action"]'),
        receiverRails: all('[data-owner="project-pullrequests-row-receiver-rail"]'),
        states: all('[data-owner="project-pullrequests-row-state"]'),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.documentScrollWidth).toBe(geometry.viewportWidth);
    expect(geometry.newAction.float).toBe("right");
    expect(geometry.receiverRails.map((item) => item.float)).toEqual(["right", "right"]);
    expect(geometry.states.map((item) => item.float)).toEqual(["right", "right"]);
    expect(geometry.newAction.right).toBeLessThanOrEqual(geometry.content.right + 1);
    for (const [index, state] of geometry.states.entries()) {
      expect(state.right).toBeLessThanOrEqual(geometry.content.right + 1);
      expect(state.right).toBeLessThanOrEqual(geometry.receiverRails[index].left + 1);
    }
    if (viewport.width === 1366) {
      expect(geometry.receiverRails.every((item) => item.display !== "none")).toBe(true);
      expect(geometry.states.every((item) => item.display !== "none")).toBe(true);
    } else {
      expect(geometry.receiverRails.every((item) => item.display === "none")).toBe(true);
      expect(geometry.states.every((item) => item.parentDisplay === "none")).toBe(true);
    }

    await page.screenshot({
      path: `${screenshotDirectory}/${viewport.width === 1366 ? "desktop" : "mobile"}.png`,
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/pullRequests?filter=batch915`);
  await page.locator('[data-owner="project-pullrequests-tabs"] li').nth(1).locator("a").click();
  await expect(page).toHaveURL(
    new RegExp(`${basePath}/admin/sample/closedPullRequests\\?filter=batch915`),
  );
  await expect(
    page.locator('[data-owner="project-pullrequests-tabs"] li.active').first(),
  ).toContainText("Closed");

  await page.goto(`${basePath}/admin/sample/pullRequests?filter=batch915`);
  await page.locator('[data-owner="project-pullrequests-new-action"] a').click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/newPullRequestForm`);
});

async function mockProjectPullRequests(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session }),
  );
  await page.route("**/api/auth/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-batch-915" },
      json: { csrfToken: "csrf-batch-915" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        defaultBranch: "main",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: true,
        isPrivate: false,
        isProtected: false,
        isUsingReviewerCount: true,
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
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests**", (route: Route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.get("category") ?? "open";
    const items = category === "open" ? populatedRows : [];
    route.fulfill({
      contentType: "application/json",
      json: {
        acceptedCount: 1,
        category,
        closedCount: 1,
        contributors: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "dev",
            userId: 2,
            userLabel: "Dev Member",
          },
        ],
        currentUserId: 1,
        items,
        openCount: 2,
        pageNum: 1,
        pageSize: 20,
        recentlyPushedBranches: [],
        sentCount: 2,
        totalCount: items.length,
      },
    });
  });
}

const populatedRows = [
  {
    closedCommentThreadCount: 1,
    commentThreadCount: 2,
    conflict: false,
    contributorLabel: "Dev Member",
    contributorLoginId: "dev",
    createdLabel: "Jul 1, 2026",
    fromBranch: "feature/api",
    fromOwnerName: "dev",
    fromProjectName: "sample",
    id: 77,
    ownerName: "admin",
    projectName: "sample",
    pullRequestNumber: 7,
    receiverLabel: "Site Admin",
    receiverLoginId: "admin",
    reviewerCount: 0,
    reviewerNames: [],
    state: "open",
    title: "Assigned open row",
    toBranch: "main",
    updatedLabel: "Jul 1, 2026",
  },
  {
    closedCommentThreadCount: 0,
    commentThreadCount: 0,
    conflict: true,
    contributorLabel: "Dev Member",
    contributorLoginId: "dev",
    createdLabel: "Jul 2, 2026",
    fromBranch: "feature/release",
    fromOwnerName: "dev",
    fromProjectName: "sample",
    id: 78,
    ownerName: "admin",
    projectName: "sample",
    pullRequestNumber: 8,
    receiverLabel: "",
    receiverLoginId: "",
    reviewerCount: 0,
    reviewerNames: [],
    state: "open",
    title: "Resolve conflict row",
    toBranch: "release/1.0",
    updatedLabel: "Jul 2, 2026",
  },
];
