import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const states = [
  {
    button: /Issue/i,
    message: "recently No issue found",
    owner: "open-issues",
  },
  {
    button: /Pull request/i,
    message: "recently No pull requests have been received",
    owner: "pull-requests",
  },
  { button: /projects/i, message: "Project is non existent", owner: "projects" },
] as const;

test("public profile empty panels own frozen error-wrap paint, order, and geometry", async ({
  page,
}) => {
  const [route, styles, legacy, less, messages] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    Promise.resolve(curatedAppCss()),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(legacy).toContain('<div id="openIssues" class="tab-pane active">');
  expect(legacy).toContain('<div id="closedIssues" class="tab-pane">');
  expect(legacy).toContain('@Messages("userinfo.daysAgo.prefix") @Messages("issue.is.empty")');
  expect(legacy).toContain(
    '@Messages("userinfo.daysAgo.prefix") @Messages("pullRequest.is.empty")',
  );
  expect(legacy).toContain('@Messages("project.is.empty")');
  expect(less).toContain("padding:100px 0px;");
  expect(less).toContain("text-align:center;");
  expect(less).toContain("font-weight:bold; font-size:16px;");
  expect(less).toContain("color:#898989; margin:30px 0;");
  expect(messages).toContain("userinfo.daysAgo.prefix= recently");
  expect(messages).toContain("issue.is.empty = No issue found");
  expect(messages).toContain("pullRequest.is.empty = No pull requests have been received");
  expect(messages).toContain("project.is.empty = Project is non existent");

  for (const owner of [
    "user-profile-open-issues-empty-wrap",
    "user-profile-closed-issues-empty-wrap",
    "user-profile-pull-requests-empty-wrap",
    "user-profile-projects-empty-wrap",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  await mockEmptyProfile(page);
  await page.goto(`${basePath}/empty`, { waitUntil: "networkidle" });

  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  await expect(fallback).toHaveCount(0);
  await assertPanel(page, "open-issues", "recently No issue found");

  await page
    .locator('[data-owner="user-profile-issue-tabs"] button', { hasText: "Closed" })
    .click();
  await assertPanel(page, "closed-issues", "recently No issue found");

  for (const state of states.slice(1)) {
    await page.locator(".user-stream-box > .nav-tabs button", { hasText: state.button }).click();
    await assertPanel(page, state.owner, state.message);
  }

  if (await fallback.count()) await fallback.evaluate((element) => element.remove());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${basePath}/empty`, { waitUntil: "networkidle" });
  await assertPanel(page, "open-issues", "recently No issue found");
  await page
    .locator('[data-owner="user-profile-issue-tabs"] button', { hasText: "Closed" })
    .click();
  await assertPanel(page, "closed-issues", "recently No issue found");
  for (const state of states.slice(1)) {
    await page.locator(".user-stream-box > .nav-tabs button", { hasText: state.button }).click();
    await assertPanel(page, state.owner, state.message);
  }
});

async function assertPanel(page: Page, owner: string, message: string) {
  const wrap = page.locator(`[data-owner="user-profile-${owner}-empty-wrap"]`);
  const text = page.locator(`[data-owner="user-profile-${owner}-empty-message"]`);
  await expect(wrap).toBeVisible();
  await expect(text).toHaveText(message);
  await expect(wrap).toHaveCSS("padding", "100px 0px");
  await expect(wrap).toHaveCSS("text-align", "center");
  await expect(text).toHaveCSS("font-weight", "700");
  await expect(text).toHaveCSS("font-size", "16px");
  await expect(text).toHaveCSS("color", "rgb(137, 137, 137)");
  await expect(text).toHaveCSS("margin", "30px 0px");

  const geometry = await wrap.evaluate((node) => {
    const wrapBox = node.getBoundingClientRect();
    const paneBox = node.parentElement?.getBoundingClientRect();
    return {
      bottom: wrapBox.bottom,
      height: wrapBox.height,
      insidePane: Boolean(
        paneBox && wrapBox.left >= paneBox.left && wrapBox.right <= paneBox.right,
      ),
      left: wrapBox.left,
      right: wrapBox.right,
      top: wrapBox.top,
      viewportWidth: window.innerWidth,
    };
  });
  expect(geometry.height).toBeGreaterThan(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeGreaterThan(geometry.top);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.insidePane).toBe(true);
}

async function mockEmptyProfile(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/empty/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Empty User",
          englishName: "Empty",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "empty",
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
        },
        pullRequestItems: [],
        selected: "issues",
        viewerCanEditProfile: false,
      },
    }),
  );
}
