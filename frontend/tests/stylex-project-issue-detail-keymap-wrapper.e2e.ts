import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-issue-detail-keymap-wrapper",
  fallbackMode,
);
const owner = "issue-detail-keymap-wrapper";

async function mockIssueDetail(page: Page) {
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
  await page.route("**/api/v1/session", (route) => route.fulfill({ json: session }));
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ headers: { "x-csrf-token": "test-csrf-token" }, json: session }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ headers: { "x-csrf-token": "test-csrf-token" }, json: session }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      json: {
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
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ json: { milestones: [{ id: 5, state: "open", title: "v1.0" }] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({
      json: {
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/parent-options**", (route) =>
    route.fulfill({ json: { items: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11", (route) =>
    route.fulfill({
      json: {
        assigneeLoginId: "admin",
        assigneeLabel: "Site Admin",
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyChecksum: "body-sha1",
        bodyMarkdown: "Body **markdown**",
        canBeDeleted: true,
        childClosedCount: 0,
        childIssues: [],
        childOpenCount: 0,
        commentCount: 0,
        comments: [],
        createdLabel: "Jul 1, 2026",
        dueDateLabel: "Jul 5, 2026",
        hasVoted: false,
        issueId: 42,
        issueNumber: 11,
        issueUpdateMillis: 1782892800000,
        issueVoters: [],
        isDraft: false,
        isFavorited: false,
        isWatching: false,
        labels: [
          {
            categoryId: "3",
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#51aacc",
            id: "8",
            name: "bug",
          },
        ],
        milestoneId: 5,
        milestoneTitle: "v1.0",
        ownerName: "admin",
        parentIssueId: null,
        projectName: "sample",
        sharers: [],
        state: "open",
        timeline: [],
        title: "Fix flaky issue",
        viewerCanComment: true,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerUserId: 1,
        voterCount: 0,
        watcherCount: 0,
        weight: 0,
      },
    }),
  );
}

test("issue detail keymap wrapper owns the legacy float and spacing in StyleX", () => {
  const route = readFileSync("src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
    "utf8",
  );
  const keymap = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  expect(keymap).toContain('style="padding:10px 0; margin-left: 55px;"');
  expect(bootstrap).toMatch(/\.pull-left\s*\{\s*float:\s*left;/u);
  expect(pageLess).toContain(".keymap-help {");
  expect(yobi).toContain('@import "less/_page.less";');
  expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain("keymapWrapper).className} pull-left");
  expect(route).not.toContain('style={{ padding: "10px 0", marginLeft: "55px" }}');
  expect(theme).toContain('keymapWrapper: { float: "left", marginLeft: 55, padding: "10px 0px" }');
});

test(`issue detail keymap wrapper preserves geometry and modal interaction (${fallbackMode})`, async ({
  page,
}) => {
  mkdirSync(screenshotDirectory, { recursive: true });
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await mockIssueDetail(page);
    await page.goto(`${basePath}/admin/sample/issue/11`, { waitUntil: "commit" });
    const keymap = page.locator(`[data-stylex-owner="${owner}"]`);
    await expect(keymap).toHaveCount(1);
    await expect(keymap).toBeVisible();
    await expect(keymap).not.toHaveClass(/(?:^|\s)pull-left(?:\s|$)/u);
    await expect(keymap).not.toHaveAttribute("style");
    await expect(keymap).toHaveCSS("float", "left");
    await expect(keymap).toHaveCSS("margin-left", "55px");
    await expect(keymap).toHaveCSS("padding-top", "10px");
    await expect(keymap).toHaveCSS("padding-bottom", "10px");

    const geometry = await page.evaluate(() => {
      const element = document.querySelector<HTMLElement>(
        '[data-stylex-owner="issue-detail-keymap-wrapper"]',
      );
      const parent = element?.closest<HTMLElement>(".board-footer");
      if (!element || !parent) throw new Error("Issue-detail keymap geometry anchors are missing.");
      const box = element.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      return {
        bodyScrollWidth: document.body.scrollWidth,
        contained: box.left >= parentBox.left - 0.5 && box.right <= parentBox.right + 0.5,
        documentScrollWidth: document.documentElement.scrollWidth,
        leftOffset: box.left - parentBox.left,
        width: box.width,
      };
    });
    expect(geometry.contained).toBe(true);
    expect(geometry.leftOffset).toBeGreaterThanOrEqual(55);
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.bodyScrollWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(viewport.width);

    const button = keymap.locator(":scope > button");
    await expect(button).toHaveText("Keyboard shortcuts");
    await button.click();
    const modal = page.locator('[data-stylex-owner="issue-detail-keymap-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Issue detail");
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});
