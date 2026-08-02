import { expect, test, type Page } from "@playwright/test";

const routePath = "/admin/WYVE_OCS/issues?orderBy=updatedDate&orderDir=desc&pageNum=1&state=closed";
const legacyOrigin = process.env.YONA_LEGACY_ORIGIN ?? "http://192.168.45.20:9000";
const localBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function issueListMetrics(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      };
    };
    return {
      project: box(".project-page-wrap"),
      sidebar: box(".left-menu"),
      results: box("#span10"),
      list: box("#span10 > .post-list-wrap"),
      firstRow: box("#span10 > .post-list-wrap > .post-item"),
      rows: [...document.querySelectorAll("#span10 > .post-list-wrap > .post-item")].map((row) => {
        const rect = row.getBoundingClientRect();
        return { left: rect.left, width: rect.width, height: rect.height };
      }),
      bodyWidth: document.body.scrollWidth,
      issueIds: [...document.querySelectorAll("#span10 > .post-list-wrap > .post-item")].map(
        (row) => row.id.replace("issue-item-", ""),
      ),
    };
  });
}

async function pluginOnlyAttributes(page: Page) {
  return page.locator(".issue-list-wrap *").evaluateAll((elements) => {
    const pluginAttribute =
      /^(?:data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)|pjax-)/u;
    return elements.flatMap((element) =>
      [...element.attributes]
        .map((attribute) => attribute.name)
        .filter((name) => pluginAttribute.test(name)),
    );
  });
}

async function expectScreenLoaded(page: Page) {
  await expect(page.locator('[data-stylex-content-ready="true"]')).toHaveCount(1);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator("#span10 > .post-list-wrap > .post-item")).toHaveCount(15);
}

test("closed project issues match the live legacy list structure and geometry", async ({
  browser,
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const legacyPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await Promise.all([
    legacyPage.goto(`${legacyOrigin}${routePath}`, { waitUntil: "networkidle" }),
    page.goto(`${localBasePath}${routePath}`, { waitUntil: "networkidle" }),
  ]);
  await expectScreenLoaded(page);
  await expect(legacyPage.locator(".post-item")).toHaveCount(15);

  const legacyIds = await legacyPage
    .locator(".post-item")
    .evaluateAll((rows) => rows.map((row) => row.id.replace("issue-item-", "")));
  const localMetrics = await issueListMetrics(page);
  const legacyMetrics = await issueListMetrics(legacyPage);
  expect(localMetrics.issueIds).toEqual(legacyIds);
  const titleOrder = async (sourcePage: Page) =>
    sourcePage.locator(".post-item .title-wrap").evaluateAll((rows) =>
      rows.map((row) => {
        const postId = row.querySelector(".post-id")?.textContent?.trim() ?? "";
        const prefixes = [...row.querySelectorAll(".title-prefix")].map(
          (prefix) => prefix.textContent?.trim() ?? "",
        );
        const titleLinks = [...row.querySelectorAll("a.title")];
        const title = titleLinks[titleLinks.length - 1]?.textContent?.trim() ?? "";
        return [postId, ...prefixes, title].filter(Boolean).join(" ");
      }),
    );
  expect(await titleOrder(page)).toEqual(await titleOrder(legacyPage));
  expect(localMetrics.rows.every((row) => row.height >= 60 && row.height <= 90)).toBe(true);
  expect(localMetrics.rows.every((row) => row.left === localMetrics.list?.left)).toBe(true);
  expect(localMetrics.rows.every((row) => row.width === localMetrics.list?.width)).toBe(true);
  for (const key of ["project", "sidebar", "results", "list"] as const) {
    expect(localMetrics[key]).not.toBeNull();
    expect(legacyMetrics[key]).not.toBeNull();
    expect(Math.abs(localMetrics[key]!.left - legacyMetrics[key]!.left)).toBeLessThanOrEqual(3);
    expect(Math.abs(localMetrics[key]!.top - legacyMetrics[key]!.top)).toBeLessThanOrEqual(3);
    expect(Math.abs(localMetrics[key]!.width - legacyMetrics[key]!.width)).toBeLessThanOrEqual(3);
  }
  expect(
    Math.abs(localMetrics.firstRow!.height - legacyMetrics.firstRow!.height),
  ).toBeLessThanOrEqual(3);

  await expect(page.locator(".left-menu .lst-stacked > li")).toHaveCount(1);
  await expect(page.locator(".left-menu .lst-stacked > li").first()).toContainText("Closed");
  await expect(page.locator(".left-menu .lst-stacked > li").first()).toContainText("3560");
  await expect(page.locator("#span10 > .nav-tabs > li").nth(0)).toContainText("Open");
  await expect(page.locator("#span10 > .nav-tabs > li").nth(0)).toContainText("157");
  await expect(page.locator("#span10 > .nav-tabs > li").nth(1)).toContainText("Closed");
  await expect(page.locator("#span10 > .nav-tabs > li").nth(1)).toContainText("3560");
  await expect(page.locator("#span10 > .nav-tabs > li.active")).toContainText("Closed");
  expect(await page.locator(".filter-wrap .filters .filter").allTextContents()).toEqual([
    "Due Date",
    "Updated",
    "Created",
    "Comments",
  ]);
  const sortFilters = page.locator(".filter-wrap .filters .filter");
  await expect(sortFilters.nth(1)).toHaveClass("filter active");
  await expect(sortFilters.nth(1).locator("i")).toHaveClass("ico btn-gray-arrow down");
  await sortFilters.nth(0).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("orderBy") ?? "").toBe("dueDate");
  await expect.poll(() => new URL(page.url()).searchParams.get("orderDir") ?? "").toBe("desc");
  await expect(page.locator(".issue-list-wrap")).toContainText("Download as Excel file");
  await expect(page.locator(".issue-list-wrap")).toContainText("Keyboard shortcuts");
  await expect(page.locator("#pagination")).toContainText("238");
  await expect(page.locator("#pagination")).toContainText("Next page");
  expect(await pluginOnlyAttributes(page)).toEqual([]);
  await expect(page.locator('.issue-list-wrap a[href="#"]')).toHaveCount(0);

  await legacyPage.close();
});

test("closed project issues keep the legacy responsive row ownership", async ({ page }) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(`${localBasePath}${routePath}`, { waitUntil: "networkidle" });
  const mobile = await page.evaluate(() => ({
    viewport: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    rowWidth: document.querySelector(".post-item")?.getBoundingClientRect().width ?? 0,
    contentWidth: document.querySelector("#span10")?.getBoundingClientRect().width ?? 0,
    assigneeDisplay: document.querySelector(".post-item .span3")
      ? getComputedStyle(document.querySelector(".post-item .span3")!).display
      : "missing",
  }));
  expect(mobile.bodyWidth).toBeLessThanOrEqual(mobile.viewport + 1);
  expect(mobile.rowWidth).toBeLessThanOrEqual(mobile.contentWidth + 1);
  expect(mobile.assigneeDisplay).toBe("none");
});

test("switching issue state preserves the fixed shell and replaces only the result data", async ({
  page,
}) => {
  const openRoute = "/admin/WYVE_OCS/issues?orderBy=updatedDate&orderDir=desc&pageNum=1&state=open";
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${localBasePath}${openRoute}`, { waitUntil: "networkidle" });
  await expectScreenLoaded(page);

  const fixedShellSelectors = {
    quickSearch: "#search",
    results: "#span10",
    tabs: "#span10 > .nav-tabs",
    twoColumn: "#two-column-mode",
    subtasks: "#toggle-show-subtasks",
    resultList: "#span10 > .post-list-wrap",
  } as const;
  const fixedShellTokens = await page.evaluate((selectors) => {
    const tokens: Record<string, string> = {};
    for (const [name, selector] of Object.entries(selectors)) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const token = `warm-transition-${name}`;
      element.setAttribute("data-parity-transition-token", token);
      tokens[name] = token;
    }
    return tokens;
  }, fixedShellSelectors);

  const closedIssuesResponse = page.waitForResponse((response) => {
    if (!response.url().includes("/api/v1/projects/admin/WYVE_OCS/issues")) return false;
    if (response.request().method() !== "GET" || response.status() !== 200) return false;
    return new URL(response.url()).searchParams.get("state") === "closed";
  });
  await page.locator("#span10 > .nav-tabs > li").nth(1).locator("a").click();
  const response = await closedIssuesResponse;
  expect(response.status()).toBe(200);

  await expect(page).toHaveURL(/state=closed/u);
  await expect(page.locator("#span10 > .post-list-wrap > .post-item")).toHaveCount(15);
  await expect(page.locator("#span10 > .nav-tabs > li.active")).toContainText("닫힘");
  await expect(page.locator("#span10 > .nav-tabs > li").nth(0)).toContainText("157");
  await expect(page.locator("#span10 > .nav-tabs > li").nth(1)).toContainText("3560");
  await expect(page.locator("[data-wireframe]")).toHaveCount(0);

  for (const [name, token] of Object.entries(fixedShellTokens)) {
    await expect(
      page.locator(fixedShellSelectors[name as keyof typeof fixedShellSelectors]),
    ).toHaveAttribute("data-parity-transition-token", token);
  }
});
