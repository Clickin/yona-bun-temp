import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/style-project-setting-reviewer-note-ml10",
  fallbackOff ? "fallback-off" : "normal",
);

const read = (relativePath: string) => readFileSync(resolve(process.cwd(), relativePath), "utf8");

test.use({ locale: "en-US" });

test("project settings reviewer note owns the legacy ml10 margin", async ({ page }) => {
  const route = read("src/routes/$ownerName/$projectName/setting.tsx");
  const legacyTemplate = read("../yona-original/app/views/project/setting.scala.html");
  const commonLess = read("../yona-original/app/assets/stylesheets/less/_common.less");
  const pageLess = read("../yona-original/app/assets/stylesheets/less/_page.less");

  expect(legacyTemplate).toContain(
    '<span class="note ml10">@Messages("project.reviewer.count.description")</span>',
  );
  expect(commonLess).toContain(".ml10 { margin-left:10px; }");
  expect(pageLess).toContain(".note {");
  expect(pageLess).toContain("color: #777;");
  expect(pageLess).toContain("font-size: 12px;");

  expect(route).toContain('data-owner="project-setting-cu-note-reviewer"');
  expect(route).toContain("project.reviewer.count.description");
  expect(route).toContain('data-owner="project-setting-cu-note-share"');
  expect(route).toContain('data-owner="project-setting-cu-note-code-accessible"');

  expect(route).not.toContain("document.querySelector");
  expect(route).not.toContain("addEventListener");

  await mockSetting(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/setting`, { waitUntil: "commit" });

    const reviewerEnable = page.locator("#reviewerCountEnable");
    await expect(reviewerEnable).toBeChecked();

    const reviewerNote = page.locator('[data-owner="project-setting-cu-note-reviewer"]');
    await expect(reviewerNote).toBeVisible();
    await expect(reviewerNote).toHaveClass(/\bnote\b/u);
    await expect(reviewerNote).toHaveClass(/\bml10\b/u);
    await expect(reviewerNote).toHaveText("of reviewers is required to merge pull request.");
    await expect(reviewerNote).toHaveCSS("margin-left", "10px");
    await expect(reviewerNote).toHaveCSS("color", "rgb(119, 119, 119)");
    await expect(reviewerNote).toHaveCSS("font-size", "12px");
    await expect(reviewerNote).not.toHaveAttribute("style");

    const shareNote = page.locator('[data-owner="project-setting-cu-note-share"]');
    const codeAccessibleNote = page.locator(
      '[data-owner="project-setting-cu-note-code-accessible"]',
    );
    await expect(shareNote).toHaveCount(1);
    await expect(codeAccessibleNote).toHaveCount(1);
    await expect(shareNote).not.toHaveClass(/\bml10\b/u);
    await expect(codeAccessibleNote).not.toHaveClass(/\bml10\b/u);
    await expect(reviewerNote).toHaveAttribute("data-owner", "project-setting-cu-note-reviewer");

    const reviewerControl = page.locator("#welReviewerCount");
    await expect(reviewerControl).toBeVisible();
    const dropdown = page.locator('[data-owner="project-reviewer-count-dropdown"]');
    await dropdown.getByRole("button").first().click();
    await expect(dropdown.locator(".dropdown-menu")).toBeVisible();
    await dropdown.getByRole("button").first().click();
    await expect(dropdown.locator(".dropdown-menu")).toBeHidden();

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockSetting(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }

  const project = {
    ownerName: "weblabs",
    projectName: "demo",
    name: "demo",
    overview: "Demo project",
    vcs: "GIT",
    projectScope: "PUBLIC",
    menuSetting: {
      code: true,
      issue: true,
      pullRequest: true,
      review: true,
      milestone: true,
      board: true,
    },
    isCodeAccessibleMemberOnly: false,
    isUsingReviewerCount: true,
    defaultReviewerCount: 1,
    maxReviewerCount: 3,
    oldPlace: "legacy-place",
  };
  await page.route("**/api/v1/owners/**/projects/**/settings", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/projects/**/branches", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { branches: [{ name: "main" }], defaultBranch: "main" },
    }),
  );
}
