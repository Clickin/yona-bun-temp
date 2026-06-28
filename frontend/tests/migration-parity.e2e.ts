import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, `${selector} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

async function expectNoVisibleRawLegacyKeys(page: Page): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  const rawKeys =
    bodyText.match(
      /\b(?:app|button|error|issue|menu|migration|notification|search|site|title|user|validation)\.[A-Za-z0-9_.-]+/g,
    ) ?? [];
  expect(rawKeys, `visible raw legacy message keys in:\n${bodyText}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "siteboss" },
        user: { isSiteAdmin: true, loginId: "siteboss" },
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 0,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("migration page keeps the legacy standalone migration panel layout", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1280 });
  await page.goto("/yona/migration");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page).toHaveTitle("Yona");
  await expect(page.locator(".gnb-outer")).toBeVisible();
  await expect(page.locator("main.yobi-migration")).toBeVisible();
  await expect(page.locator(".header-pannel .comeback-text")).toContainText("Yona to Github");
  await expect(page.locator("#system-msg.well.board .messages")).toContainText(
    "Request forbidden or not allowed",
  );
  await expect(page.locator(".source-title .project-name.warn")).toHaveText(
    "Source 프로젝트를 선택해 주세요",
  );
  await expect(page.locator(".destination-title .project-name.warn")).toHaveText(
    "Destination 프로젝트를 선택해 주세요",
  );
  await expect(page.locator(".source-project .header")).toHaveText("Source 0 개");
  await expect(page.locator(".destination-project .header")).toHaveText("Destination 0 개");
  await expect(page.locator(".source-project input[name='target-filter']")).toBeDisabled();
  await expect(page.locator(".destination-project input[name='target-filter']")).toBeDisabled();
  await expect(page.locator(".span6.status table.table")).toContainText("Migration 대상");
  await expect(page.locator(".span6.status table.table")).toContainText("마일스톤 옮기기");
  await expect(page.locator(".span6.status table.table")).toContainText("이슈 옮기기");
  await expect(page.locator(".span6.status table.table")).toContainText("게시글 옮기기");
  await expect(page.locator(".span6.status button.btn-danger")).toHaveCount(3);
  for (const buttonLabel of ["마일스톤 옮기기", "이슈 옮기기", "게시글 옮기기"]) {
    await expect(page.getByRole("button", { name: buttonLabel })).toBeDisabled();
  }
  await expect(page.locator("main.yobi-migration form")).toHaveCount(0);

  const navbar = await layoutBox(page, ".gnb-outer");
  const migration = await layoutBox(page, "main.yobi-migration");
  const headerPanel = await layoutBox(page, ".header-pannel");
  const comeback = await layoutBox(page, ".header-pannel .comeback-text");
  const titleText = await layoutBox(page, ".title-text-bg");
  const systemMessage = await layoutBox(page, "#system-msg");
  const headTitle = await layoutBox(page, ".head-title");
  const sourceTitle = await layoutBox(page, ".source-title");
  const arrow = await layoutBox(page, ".head-title .arrow");
  const destinationTitle = await layoutBox(page, ".destination-title");
  const sourceDestination = await layoutBox(page, ".source-destination");
  const sourceProject = await layoutBox(page, ".source-project");
  const destinationProject = await layoutBox(page, ".destination-project");
  const statusPanel = await layoutBox(page, ".source-destination > .span6.status");
  const progress = await layoutBox(page, ".span6.status .progress");
  const table = await layoutBox(page, ".span6.status table.table");
  const footer = await layoutBox(page, ".page-footer-outer");

  expect(navbar.height).toBeGreaterThanOrEqual(38);
  expect(navbar.height).toBeLessThanOrEqual(44);
  expect(migration.y).toBeGreaterThanOrEqual(navbar.y + navbar.height);
  expect(headerPanel.y).toBeGreaterThanOrEqual(migration.y);
  expect(comeback.y).toBeGreaterThanOrEqual(headerPanel.y);
  expect(titleText.y).toBeGreaterThanOrEqual(comeback.y);
  expect(systemMessage.x).toBeGreaterThanOrEqual(titleText.x);
  expect(systemMessage.width).toBeLessThanOrEqual(titleText.width);
  expect(headTitle.y).toBeGreaterThan(titleText.y + titleText.height - 1);
  expect(sourceTitle.x).toBeLessThan(arrow.x);
  expect(arrow.x).toBeLessThan(destinationTitle.x);
  expect(sourceDestination.y).toBeGreaterThan(headTitle.y + headTitle.height - 1);
  expect(sourceProject.x).toBeLessThan(destinationProject.x);
  expect(destinationProject.x).toBeLessThan(statusPanel.x);
  expect(sourceProject.y).toBeCloseTo(destinationProject.y, 0);
  expect(destinationProject.y).toBeCloseTo(statusPanel.y, 0);
  expect(progress.y).toBeGreaterThanOrEqual(statusPanel.y);
  expect(table.y).toBeGreaterThan(progress.y + progress.height - 1);
  expect(footer.y).toBeGreaterThan(migration.y + migration.height - 1);
});
