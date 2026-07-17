import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records project pull request list owners and responsive containment", async ({ page }) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/pullRequests.tsx", "utf8");
  const theme = readFileSync("src/routes/$ownerName/$projectName/-pull-requests.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/git/partial_list.scala.html", "utf8");
  expect(template).toContain('class="post-list-wrap"');
  expect(template).toContain('class="avatar-wrap mlarge"');
  expect(route).toContain('data-stylex-owner="project-pullrequests-tabs"');
  expect(theme).toContain("export const pullRequestColors");
  await mockPullRequests(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/pullRequests`);
    await expect(owner(page, "project-pullrequests-tabs")).toBeVisible();
    await expect(owner(page, "project-pullrequests-list")).toBeVisible();
    await expect(owner(page, "project-pullrequests-search-input")).toHaveAttribute(
      "name",
      "filter",
    );
    const geometry = await owner(page, "project-pullrequests-content").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
});

async function mockPullRequests(page: Page) {
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
      json: { ownerName: "weblabs", projectName: "demo", vcs: "GIT" },
    }),
  );
  await page.route("**/api/v1/owners/**/projects/**/pull-requests**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        openCount: 0,
        closedCount: 0,
        sentCount: 0,
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
      },
    }),
  );
}
