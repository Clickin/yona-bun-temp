import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records issue edit form owners and responsive geometry", async ({ page }) => {
  const route = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx",
    "utf8",
  );
  const theme = readFileSync(
    "src/routes/$ownerName/$projectName/issue/$issueNumber/-issue-editform.stylex.ts",
    "utf8",
  );
  const template = readFileSync("../yona-original/app/views/issue/edit.scala.html", "utf8");
  expect(template).toContain('id -> "issue-form"');
  expect(template).toContain('name="title"');
  expect(route).toContain('data-stylex-owner="issue-editform-title"');
  expect(route).toContain('data-stylex-owner="issue-editform-editor"');
  expect(theme).toContain("export const issueEditColors");
  await mockIssue(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/issue/1/editform`);
    await expect(owner(page, "issue-editform-form")).toBeVisible();
    await expect(owner(page, "issue-editform-title")).toHaveValue("Issue title");
    await expect(owner(page, "issue-editform-editor")).toHaveAttribute("name", "body");
    const geometry = await owner(page, "issue-editform-form").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
});

async function mockIssue(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/**/projects/**/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "weblabs",
        projectName: "demo",
        menuSetting: { issue: true, milestone: true },
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/issues/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        issueNumber: 1,
        title: "Issue title",
        bodyMarkdown: "Body",
        state: "open",
        labels: [],
        isDraft: false,
        authorId: "1",
        viewerUserId: "1",
        issueId: "1",
      },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/labels**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/**/projects/**/issues/parent-options**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}
