import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records organization issue search and tabs owners", async ({ page }) => {
  const route = readFileSync("src/routes/organizations/$organizationName/issues.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const groupIssues = readFileSync(
    "../yona-original/app/views/organization/group_issue_list_partial.scala.html",
    "utf8",
  );
  const issueList = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  expect(groupIssues).toContain('<ul class="post-list-wrap">');
  expect(issueList).toContain('<ul class="post-list-wrap row-fluid">');
  expect(route).toContain('data-owner="organization-issues-search-input"');
  expect(route).toContain('data-owner="organization-issues-tabs"');
  for (const owner of [
    "organization-issues-items",
    "organization-issues-empty",
    "organization-issues-pagination",
    "organization-issues-row",
    "organization-issues-row-meta",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
  await mockIssues(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/organizations/weblabs/issues`);
    await expect(owner(page, "organization-issues-tabs")).toBeVisible();
    const empty = owner(page, "organization-issues-empty");
    const icon = owner(page, "organization-issues-empty-icon");
    const message = owner(page, "organization-issues-empty-message");
    await expect(empty).toBeVisible();
    await expect(icon).toBeVisible();
    await expect(message).toHaveText("등록된 이슈가 없습니다.");
    const state = await empty.evaluate((element) => {
      const iconElement = element.querySelector('[data-owner="organization-issues-empty-icon"]');
      const messageElement = element.querySelector(
        '[data-owner="organization-issues-empty-message"]',
      );
      if (!iconElement || !messageElement) throw new Error("empty state children missing");
      const iconStyle = getComputedStyle(iconElement);
      const messageStyle = getComputedStyle(messageElement);
      const box = element.getBoundingClientRect();
      const iconBox = iconElement.getBoundingClientRect();
      const messageBox = messageElement.getBoundingClientRect();
      return {
        backgroundImage: iconStyle.backgroundImage,
        backgroundPosition: iconStyle.backgroundPosition,
        iconHeight: iconBox.height,
        iconWidth: iconBox.width,
        messageFontSize: messageStyle.fontSize,
        messageFontWeight: messageStyle.fontWeight,
        messageText: messageElement.textContent,
        paddingTop: getComputedStyle(element).paddingTop,
        boxTop: box.top,
        iconTop: iconBox.top,
        messageTop: messageBox.top,
      };
    });
    // dev serves the un-hashed legacy sprite; the built dist hashes it
    // (/yona/assets/sprite-<hash>.png) — accept both spellings.
    expect(state.backgroundImage).toMatch(/sprite[^)]*\.png/u);
    expect(state.backgroundPosition).toBe("-5px -160px");
    expect(state.iconWidth).toBe(62);
    expect(state.iconHeight).toBe(82);
    expect(state.messageFontSize).toBe("16px");
    expect(state.messageFontWeight).toBe("700");
    expect(state.messageText).toBe("등록된 이슈가 없습니다.");
    expect(state.paddingTop).toBe("100px");
    expect(state.iconTop).toBeGreaterThanOrEqual(state.boxTop + 100);
    expect(state.messageTop).toBeGreaterThan(state.iconTop + 82);
    await expect(owner(page, "organization-issues-search-input")).toHaveAttribute("name", "filter");
    const geometry = await owner(page, "organization-issues-wrap").evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBe(viewport.width);
  }
});

async function mockIssues(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: "1",
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
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { organizationName: "weblabs", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs/issues**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        items: [],
        pageNum: 1,
        pageSize: 20,
        totalCount: 0,
        openIssueCount: 0,
        closedIssueCount: 0,
        visibleProjects: [],
        filter: "",
        orderBy: "createdDate",
        orderDir: "desc",
        state: "open",
        projectNames: [],
      },
    }),
  );
}
