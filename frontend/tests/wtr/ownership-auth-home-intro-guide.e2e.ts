import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const GUIDE = '[data-owner="authenticated-home-intro-guide"]';
const TOGGLE = '[data-owner="authenticated-home-intro-guide-toggle"]';

test.use({ locale: "ko-KR" });

test("authenticated Home intro guide restores the Legacy role, copy, order, and desktop geometry", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const guide = page.locator(GUIDE);
  const table = guide.locator("table");
  const rows = table.locator("tr");
  const ctas = table.getByRole("link");
  const toggle = page.locator(TOGGLE);

  await expect(guide).toBeVisible();
  await expect(guide).toHaveClass(/\bsite-guide-outer\b/u);
  await expect(guide).not.toHaveClass(/\bhide\b/u);
  await expect(guide.locator("h3 > span")).toHaveText("Yoram - 21세기 소프트웨어 개발 플랫폼");
  await expect(table).toHaveClass(/\bwelcome-table\b/u);
  await expect(table).toHaveClass(/\btable\b/u);
  await expect(table).toHaveClass(/\bborderless\b/u);
  await expect(rows).toHaveCount(3);
  await expect(table.locator("td")).toHaveText([
    "새 프로젝트 만들기",
    "당신만의 프로젝트를 만들어 보세요",
    "새 그룹 만들기",
    "다른 멤버들과 함께 그룹으로 작업을 하고싶으시면, 그룹을 생성하여 여러 프로젝트를 공동으로 관리해보세요.",
    "프로젝트 목록",
    "관심있는 프로젝트를 찾아보세요",
  ]);
  await expect(ctas).toHaveText(["새 프로젝트 만들기", "새 그룹 만들기", "프로젝트 목록"]);
  for (const [index, href] of ["/projectform", "/organizations/new", "/projects"].entries()) {
    await expect(ctas.nth(index)).toHaveAttribute("href", `${BASE_PATH}${href}`);
    await expect(ctas.nth(index)).toHaveClass(/\bybtn\b/u);
    await expect(ctas.nth(index)).toHaveClass(/\bybtn-success\b/u);
  }
  await expect(toggle).toHaveClass(/\bguide-toggle\b/u);
  await expect(toggle.locator("button#toggleIntro")).toHaveClass(/\bbtn-transparent\b/u);
  await expect(toggle.locator("i.yobicon-resizev")).toHaveCount(1);

  const geometry = await guide.evaluate((guideElement) => {
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const heading = guideElement.querySelector("h3")!;
    const tableElement = guideElement.querySelector("table")!;
    const rowElements = [...tableElement.querySelectorAll("tr")];
    const toggleElement = guideElement.nextElementSibling!;
    return {
      guide: box(guideElement),
      guideMarginTop: getComputedStyle(guideElement).marginTop,
      heading: box(heading),
      links: rowElements.map((row) => box(row.querySelector("a")!)),
      rows: rowElements.map((row) => box(row)),
      table: box(tableElement),
      toggle: box(toggleElement),
      toggleIsNextSibling: toggleElement.matches(".guide-toggle"),
    };
  });

  expect(geometry.guideMarginTop).toBe("30px");
  expect(geometry.table.left).toBeCloseTo(geometry.guide.left, 1);
  expect(geometry.table.width).toBeCloseTo(geometry.guide.width, 1);
  expect(geometry.heading.top).toBeGreaterThanOrEqual(geometry.guide.top);
  expect(geometry.table.top).toBeGreaterThanOrEqual(geometry.heading.bottom);
  expect(geometry.toggle.top).toBeGreaterThanOrEqual(geometry.table.bottom - 1);
  expect(geometry.toggle.width).toBeCloseTo(geometry.guide.width, 1);
  expect(geometry.toggleIsNextSibling).toBe(true);
  for (const [index, row] of geometry.rows.entries()) {
    const link = geometry.links[index]!;
    expect(link.top).toBeGreaterThanOrEqual(row.top);
    expect(link.bottom).toBeLessThanOrEqual(row.bottom);
    expect(link.left).toBeGreaterThanOrEqual(row.left);
    if (index > 0) {
      expect(geometry.rows[index - 1]!.bottom).toBeLessThanOrEqual(row.top);
    }
  }
});

test("authenticated Home intro toggle preserves the Legacy class and persists React-owned state", async ({
  page,
}) => {
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);

  const guide = page.locator(GUIDE);
  const toggle = page.locator(`${TOGGLE} #toggleIntro`);
  await expect(guide).toBeVisible();
  await toggle.click();
  await expect(guide).toBeHidden();
  await expect(guide).toHaveClass(/\bsite-guide-outer\b/u);
  await expect(guide).toHaveClass(/\bhide\b/u);
  expect(await page.evaluate(() => localStorage.getItem("yobi-intro"))).toBe("false");

  await page.reload();
  await expect(guide).toBeHidden();
  await expect(guide).toHaveClass(/\bhide\b/u);
  await toggle.click();
  await expect(guide).toBeVisible();
  await expect(guide).not.toHaveClass(/\bhide\b/u);
  expect(await page.evaluate(() => localStorage.getItem("yobi-intro"))).toBe("true");
});

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "admin",
        preferredLanguage: "ko-KR",
        userLabel: "Site Admin",
      },
    }),
  );
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}
