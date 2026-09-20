// e2e closure ledger (2026-08-12): all 8 tests mirror the issue-list API to a
// live legacy backend (YONA_E2E_BACKEND_ORIGIN, admin/WYVE_OCS) and skip when
// the mirror probe fails (HARNESS_ENV live-data dependency). No route/CSS
// change; app behavior is covered by the mocked project-issues parity specs.
import { expect, test, type Page } from "../wtr-compat.ts";

const routePath = "/admin/WYVE_OCS/issues?orderBy=updatedDate&orderDir=desc&pageNum=1&state=closed";
const legacyOrigin = process.env.YONA_LEGACY_ORIGIN ?? "http://192.168.45.20:9000";
const localBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const issueListApiPath = `${localBasePath}/api/v1/projects/admin/WYVE_OCS/issues`;

const mirrorSkipMessage =
  "requires a legacy-data mirror backend containing admin/WYVE_OCS; point YONA_E2E_BACKEND_ORIGIN at a mirror or seed the parity fixture";

// ponytail: one cached probe against the LIVE legacy backend; the WTR proxy
// owns mirror routing. Probing the app API would always succeed against the
// mocked harness, so this must target the legacy origin (unreachable in CI ->
// skip). In the real-instance mirror mode, fetch bypasses page mocks (direct
// network) so a reachable backend yields 200.
const mirrorProbe = (async () => {
  try {
    const response = await fetch(`${legacyOrigin}${routePath}`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.status === 200;
  } catch {
    return false;
  }
})();

test.beforeEach(async ({ page }) => {
  if (!(await mirrorProbe)) {
    test.skip(true, mirrorSkipMessage);
  }
  await page.route(`**${issueListApiPath}?*`, (route) => route.fallback());
});

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
  await expect(page.locator('[data-content-ready="true"]')).toHaveCount(1);
  await expect(page.locator(".issue-list-wrap")).toBeVisible();
  await expect(page.locator("#span10 > .post-list-wrap > .post-item")).toHaveCount(15);
}

function waitForIssueListRequest(page: Page, expectedParams: Record<string, string | null>) {
  return page.waitForRequest((request) => {
    if (!request.url().includes(`${issueListApiPath}?`) || request.method() !== "GET") return false;
    const searchParams = new URL(request.url()).searchParams;
    return Object.entries(expectedParams).every(([name, value]) =>
      value === null ? !searchParams.has(name) : searchParams.get(name) === value,
    );
  });
}

async function openClosedList(page: Page) {
  await page.goto(`${localBasePath}${routePath}`, { waitUntil: "networkidle" });
  await expectScreenLoaded(page);
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

  const closedIssuesRequest = page.waitForRequest((request) => {
    if (!request.url().includes(issueListApiPath) || request.method() !== "GET") return false;
    return new URL(request.url()).searchParams.get("state") === "closed";
  });
  await page.locator("#span10 > .nav-tabs > li").nth(1).getByRole("button").click();
  const request = await closedIssuesRequest;
  expect(request.method()).toBe("GET");

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

test("closed-list rows and every quick filter drive SPA URL and list requests", async ({
  page,
}) => {
  await openClosedList(page);

  const firstIssueLink = page.locator(".post-item .title-wrap a.title").first();
  const firstIssueHref = await firstIssueLink.getAttribute("href");
  expect(firstIssueHref).toMatch(/\/admin\/WYVE_OCS\/issue\/\d+$/u);
  await firstIssueLink.click();
  await expect(page).toHaveURL(
    new RegExp(`${firstIssueHref!.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}$`, "u"),
  );

  await openClosedList(page);
  const quickSearch = page.locator(".left-menu .lst-stacked");
  await expect(quickSearch.locator("button")).toHaveCount(4);
  expect(
    await quickSearch
      .locator(".num-badge")
      .evaluateAll((badges) =>
        badges.every((badge) => /^\d+$/u.test(badge.textContent?.trim() ?? "")),
      ),
  ).toBe(true);

  const quickFilters = [
    { attribute: "data-assignee-id", parameter: "assigneeId" },
    { attribute: "data-author-id", parameter: "authorId" },
    { attribute: "data-commenter-id", parameter: "commenterId" },
  ] as const;

  for (const { attribute, parameter } of quickFilters) {
    const filterButton = quickSearch.locator(`button[${attribute}]:not([${attribute}=""])`);
    const value = await filterButton.getAttribute(attribute);
    expect(value).toMatch(/^\d+$/u);

    const filterRequest = waitForIssueListRequest(page, {
      [parameter]: value!,
      state: "closed",
    });
    await filterButton.click();
    expect(new URL((await filterRequest).url()).searchParams.get(parameter)).toBe(value);
    await expect.poll(() => new URL(page.url()).searchParams.get(parameter)).toBe(value);
    expect(
      await filterButton.evaluate((button) => button.parentElement?.classList.contains("active")),
    ).toBe(true);
    await expect(
      page.locator(
        "#span10 > .post-list-wrap, #span10 > [data-owner='project-issues-empty-error-wrap']",
      ),
    ).toHaveCount(1);

    const resetRequest = waitForIssueListRequest(page, {
      [parameter]: null,
      state: "closed",
    });
    await quickSearch
      .locator('button[data-assignee-id=""][data-author-id=""][data-commenter-id=""]')
      .click();
    await resetRequest;
    await expect.poll(() => new URL(page.url()).searchParams.has(parameter)).toBe(false);
  }
});

test("advanced filters, search, and label controls retain state through same-origin requests", async ({
  page,
}) => {
  const resultSelector =
    "#span10 > .post-list-wrap, #span10 > [data-owner='project-issues-empty-error-wrap']";

  for (const id of ["authorId", "assigneeId"] as const) {
    await openClosedList(page);
    await expect.poll(() => page.locator(`#${id} option`).count()).toBeGreaterThan(2);
    await page.locator(`#s2id_${id} .select2-choice`).click();
    await expect(page.locator(`#${id}-options`)).toBeVisible();
    const value = await page.locator(`#${id} option`).nth(2).getAttribute("value");
    expect(value).not.toBeNull();
    const request = waitForIssueListRequest(page, { [id]: value!, state: "closed" });
    await page.locator(`#${id}-options [role="option"]`).nth(2).click();
    expect(new URL((await request).url()).searchParams.get(id)).toBe(value);
    await expect.poll(() => new URL(page.url()).searchParams.get(id)).toBe(value);
    await expect(page.locator(resultSelector)).toHaveCount(1);
  }

  await openClosedList(page);
  await page.locator("#s2id_milestoneId .select2-choice").click();
  await expect(page.locator("#milestoneId-options")).toBeVisible();
  const milestoneRequest = waitForIssueListRequest(page, {
    milestoneId: "-1",
    state: "closed",
  });
  await page.locator("#milestoneId-options [role=option]").nth(1).click();
  await milestoneRequest;
  await expect.poll(() => new URL(page.url()).searchParams.get("milestoneId")).toBe("-1");
  await expect(page.locator(resultSelector)).toHaveCount(1);

  await openClosedList(page);
  const calendar = page.getByRole("dialog", { name: "Due date", exact: true });
  await page.locator('[data-owner="project-issue-list-due-date-calendar"]').click();
  await expect(calendar).toBeVisible();
  const dueDate = page.locator("#issueDueDate");
  await expect(dueDate).toBeFocused();
  await calendar.getByRole("combobox", { name: "Year", exact: true }).selectOption("2024");
  await calendar.getByRole("combobox", { name: "Month", exact: true }).selectOption("0");
  const dueDateRequest = waitForIssueListRequest(page, {
    dueDate: "2024-01-01",
    state: "closed",
  });
  await calendar.getByRole("button", { name: "2024-01-01", exact: true }).click();
  await expect(calendar).toHaveCount(0);
  await dueDateRequest;
  await expect.poll(() => new URL(page.url()).searchParams.get("dueDate")).toBe("2024-01-01");
  await expect(page.locator(resultSelector)).toHaveCount(1);

  await openClosedList(page);
  const keywordRequest = waitForIssueListRequest(page, { filter: "WYVE", state: "closed" });
  await page.locator("#search input[name='filter']").fill("WYVE");
  await page.locator("#search [data-submit='submit']").click();
  await keywordRequest;
  await expect.poll(() => new URL(page.url()).searchParams.get("filter")).toBe("WYVE");
  await expect.poll(() => new URL(page.url()).searchParams.get("state")).toBe("closed");
  await expect(page.locator(resultSelector)).toHaveCount(1);

  await openClosedList(page);
  const rowLabels = page.locator(".post-item button.issue-label[data-label-id]");
  expect(await rowLabels.count()).toBeGreaterThan(0);
  const rowLabelId = await rowLabels.first().getAttribute("data-label-id");
  const rowLabelRequest = waitForIssueListRequest(page, {
    labelIds: rowLabelId!,
    state: "closed",
  });
  await rowLabels.first().click();
  await rowLabelRequest;
  await expect.poll(() => new URL(page.url()).searchParams.get("labelIds")).toBe(rowLabelId);

  await openClosedList(page);
  await page.locator("#labelIds-search").click();
  await expect(page.locator("#labelIds-options")).toBeVisible();
  const firstLabelOption = page.locator('#labelIds-options [role="option"]').first();
  const selectedLabelId = await firstLabelOption
    .locator(".issue-label")
    .getAttribute("data-label-id");
  expect(selectedLabelId).not.toBeNull();
  const labelRequest = waitForIssueListRequest(page, {
    labelIds: selectedLabelId!,
    state: "closed",
  });
  await firstLabelOption.click();
  await labelRequest;
  await expect(
    page.locator(
      `#s2id_labelIds .select2-search-choice .issue-label[data-label-id="${selectedLabelId}"]`,
    ),
  ).toBeVisible();

  const removeLabelRequest = waitForIssueListRequest(page, {
    labelIds: null,
    state: "closed",
  });
  await page.locator("#s2id_labelIds .select2-search-choice-close").press("Enter");
  await removeLabelRequest;
  await expect.poll(() => new URL(page.url()).searchParams.has("labelIds")).toBe(false);
  await expect(page.locator("#s2id_labelIds .select2-search-choice")).toHaveCount(0);
});

test("every sort control and pagination path update order, direction, page, and results", async ({
  page,
}) => {
  const sortFields = ["dueDate", "updatedDate", "createdDate", "numOfComments"] as const;
  for (const orderBy of sortFields) {
    await openClosedList(page);
    const firstOrderDir = orderBy === "updatedDate" ? "asc" : "desc";
    const firstSortRequest = waitForIssueListRequest(page, {
      orderBy,
      orderDir: firstOrderDir,
      pageNum: "1",
      state: "closed",
    });
    await page.locator(`.filters button[orderBy="${orderBy}"]`).click();
    await firstSortRequest;
    await expect.poll(() => new URL(page.url()).searchParams.get("orderBy")).toBe(orderBy);
    await expect.poll(() => new URL(page.url()).searchParams.get("orderDir")).toBe(firstOrderDir);
    await expect(page.locator(`.filters button[orderBy="${orderBy}"]`)).toHaveClass(/\bactive\b/u);
    await expect(page.locator("#span10 > .post-list-wrap > .post-item")).toHaveCount(15);

    const secondOrderDir = firstOrderDir === "asc" ? "desc" : "asc";
    const secondSortRequest = waitForIssueListRequest(page, {
      orderBy,
      orderDir: secondOrderDir,
      pageNum: "1",
      state: "closed",
    });
    await page.locator(`.filters button[orderBy="${orderBy}"]`).click();
    await secondSortRequest;
    await expect.poll(() => new URL(page.url()).searchParams.get("orderDir")).toBe(secondOrderDir);
  }

  await openClosedList(page);
  const firstPageIds = await page
    .locator("#span10 > .post-list-wrap > .post-item")
    .evaluateAll((rows) => rows.map((row) => row.id));
  const nextRequest = waitForIssueListRequest(page, { pageNum: "2", state: "closed" });
  await page.locator('[data-owner="project-issues-pagination-next-page"] a').click();
  await nextRequest;
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("2");
  await expect(page.locator("#span10 > .post-list-wrap > .post-item")).toHaveCount(15);
  const secondPageIds = await page
    .locator("#span10 > .post-list-wrap > .post-item")
    .evaluateAll((rows) => rows.map((row) => row.id));
  expect(secondPageIds).not.toEqual(firstPageIds);

  const previousRequest = waitForIssueListRequest(page, { pageNum: "1", state: "closed" });
  await page.locator('[data-owner="project-issues-pagination-prev-page"] a').click();
  await previousRequest;
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");

  const numericPageRequest = waitForIssueListRequest(page, { pageNum: "3", state: "closed" });
  const pageInput = page.locator('#pagination input[name="pageNum"]');
  await pageInput.fill("3");
  await pageInput.press("Enter");
  await numericPageRequest;
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(pageInput).toHaveValue("3");
  await expect(page.locator("#span10 > .post-list-wrap > .post-item")).toHaveCount(15);
});

test("visible list actions, view toggles, and keymap expose their observable state", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("showSubtasksAlways", "false");
    localStorage.setItem("useTwoColumnMode", "false");
  });
  await openClosedList(page);

  const newIssueLink = page.locator('#span10 a[href$="/admin/WYVE_OCS/issueform"]');
  await expect(newIssueLink).toBeVisible();
  await newIssueLink.click();
  await expect(page).toHaveURL(/\/admin\/WYVE_OCS\/issueform$/u);

  await openClosedList(page);
  const twoColumnMode = page.locator("#two-column-mode");
  await twoColumnMode.check();
  await expect(twoColumnMode).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("useTwoColumnMode"))).toBe("true");
  await page.locator(".post-item .title-wrap a.title").first().click();
  await expect(page).toHaveURL(/\/admin\/WYVE_OCS\/issue\/\d+$/u);
  await expect(page.locator(".post-item.highlightBg")).toHaveCount(1);

  await openClosedList(page);
  await twoColumnMode.uncheck();
  const showSubtasks = page.locator("#toggle-show-subtasks");
  await showSubtasks.check();
  await expect(showSubtasks).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem("showSubtasksAlways"))).toBe("true");
  await expect(page.locator(".post-item .child-issue-list.hide")).toHaveCount(0);
  await showSubtasks.uncheck();
  await expect(page.locator(".post-item .child-issue-list.hide")).toHaveCount(15);

  const keymapButton = page.locator('[data-owner="project-issues-keymap"] > button[type="button"]');
  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toBeVisible();
  await expect(page.locator("#helpKeys")).toBeFocused();
  await page.locator("#helpKeys .actrow button").click();
  await expect(page.locator("#helpKeys")).toBeHidden();
  await expect(page.locator(".modal-backdrop")).toHaveCount(0);
  const labelEditLink = page.locator("#search .label-edit");
  await expect(labelEditLink).toBeVisible();
  expect(await labelEditLink.getAttribute("href")).toBe(
    `${localBasePath}/admin/WYVE_OCS/issue/labelsform`,
  );
  expect(await labelEditLink.getAttribute("target")).toBe("_blank");

  const labelManageLink = page.locator('[data-owner="project-issues-label-manage-action"]');
  await expect(labelManageLink).toBeVisible();
  await labelManageLink.click();
  await expect(page).toHaveURL(/\/admin\/WYVE_OCS\/issue\/labelsform$/u);

  await openClosedList(page);

  const excelLink = page.locator('[data-owner="project-issues-excel-download"] a');
  const excelHref = await excelLink.getAttribute("href");
  expect(excelHref).toContain("format=xls");
  expect(new URL(excelHref!, page.url()).searchParams.has("pageNum")).toBe(false);
});

test("row and select-all state enable every mass-update menu without mutating the mirror", async ({
  page,
}) => {
  await page.route(`**${issueListApiPath}/mass-update`, (route) =>
    route.fulfill({ contentType: "application/json", json: {}, status: 200 }),
  );
  await openClosedList(page);

  const rowChecks = page.locator('input[name="checked-issue"]');
  await expect(rowChecks).toHaveCount(15);
  await expect(page.locator("#mass-update-form")).toBeVisible();
  await rowChecks.first().check();
  await expect(rowChecks.first()).toBeChecked();
  await expect(page.locator("#check-all")).not.toBeChecked();
  await expect(page.locator("#mass-update-form > .btn-group > button").first()).toBeEnabled();

  await page.locator("#check-all").check();
  await expect(page.locator("#check-all")).toBeChecked();
  expect(
    await rowChecks.evaluateAll((checkboxes) =>
      checkboxes.every((checkbox) => checkbox instanceof HTMLInputElement && checkbox.checked),
    ),
  ).toBe(true);

  for (const id of ["state", "assignee", "milestone", "attaching-label", "detaching-label"]) {
    const dropdown = page.locator(`#${id}`);
    await expect(dropdown).toHaveCount(1);
    await dropdown.locator(":scope > button").click();
    await expect(dropdown).toHaveClass(/\bopen\b/u);
    await expect(dropdown.locator(".mass-update-list")).toBeVisible();
  }
  await page.locator("#state > button").click();
  await expect(page.locator("#state")).toHaveClass(/\bopen\b/u);

  const massUpdateRequest = page.waitForRequest(
    (request) =>
      request.method() === "POST" && request.url().endsWith(`${issueListApiPath}/mass-update`),
  );
  await page.locator('#state .mass-update-list li[data-value="CLOSED"] button').click();
  const request = await massUpdateRequest;
  const requestBody = request.postDataJSON();
  expect(requestBody).toMatchObject({
    issueNumbers: expect.any(Array),
    ownerName: "admin",
    projectName: "WYVE_OCS",
    state: "CLOSED",
  });
  if (
    !requestBody ||
    typeof requestBody !== "object" ||
    !("issueNumbers" in requestBody) ||
    !Array.isArray(requestBody.issueNumbers)
  ) {
    throw new Error("Expected mass-update issueNumbers");
  }
  expect(requestBody.issueNumbers).toHaveLength(15);
  await expect(page.locator("#state")).not.toHaveClass(/\bopen\b/u);

  const otherMassUpdates = [
    { dropdownId: "assignee", option: 'li[data-value="0"]', expected: "assignee" },
    { dropdownId: "milestone", option: 'li[data-value="-1"]', expected: "milestone" },
    { dropdownId: "attaching-label", option: "li[data-value]", expected: "attach-label" },
    { dropdownId: "detaching-label", option: "li[data-value]", expected: "detach-label" },
  ] as const;
  for (const { dropdownId, option, expected } of otherMassUpdates) {
    const dropdown = page.locator(`#${dropdownId}`);
    await dropdown.locator(":scope > button").click();
    await expect(dropdown).toHaveClass(/\bopen\b/u);
    const optionRow = dropdown.locator(`.mass-update-list ${option}`).first();
    const optionValue = await optionRow.getAttribute("data-value");
    expect(optionValue).not.toBeNull();
    const nextRequest = page.waitForRequest(
      (candidate) =>
        candidate.method() === "POST" &&
        candidate.url().endsWith(`${issueListApiPath}/mass-update`),
    );
    await optionRow.locator("button").click();
    const nextRequestBody = (await nextRequest).postDataJSON();
    expect(nextRequestBody).toMatchObject({
      issueNumbers: expect.any(Array),
      ownerName: "admin",
      projectName: "WYVE_OCS",
    });
    if (expected === "assignee") {
      expect(nextRequestBody).toMatchObject({
        assigneeLoginId: "",
        assigneeUpdate: true,
      });
    } else if (expected === "milestone") {
      expect(nextRequestBody).toMatchObject({
        milestoneId: 0,
        milestoneUpdate: true,
      });
    } else if (expected === "attach-label") {
      expect(nextRequestBody).toMatchObject({ addLabelIds: [Number(optionValue)] });
    } else {
      expect(nextRequestBody).toMatchObject({ removeLabelIds: [Number(optionValue)] });
    }
    await expect(dropdown).not.toHaveClass(/\bopen\b/u);
  }
  await expect(page.locator("#check-all")).toBeChecked();
});
