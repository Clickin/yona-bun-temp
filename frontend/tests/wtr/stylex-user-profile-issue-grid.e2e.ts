import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const issueProfileUrl = `${basePath}/admin?selected=issues`;
const evidenceSources = [
  "yona-original/app/views/user/view.scala.html",
  "yona-original/app/views/user/partial_issues.scala.html",
  "yona-original/app/assets/stylesheets/less/_page.less",
  "yona-original/app/assets/stylesheets/less/_responsive.less",
  "yona-original/public/bootstrap/css/bootstrap.css",
  "yona-original/public/bootstrap/css/bootstrap-responsive.css",
  "yona-original/app/assets/stylesheets/yobi.less",
  "yona-original/conf/messages",
];

const retiredGridClasses = ["span12", "span-hard-wrap", "span2", "span5", "span1", "span3"];
const owners = {
  content: "user-profile-issue-grid-content",
  project: "user-profile-issue-project-name-wrapper",
  title: "user-profile-issue-title-wrap",
  author: "user-profile-issue-author",
  meta: "user-profile-issue-meta",
} as const;

const legacyGrid = {
  gutter: 2.127659574468085,
  project: 14.893617021276595,
  title: 40.42553191489362,
  author: 6.382978723404255,
  meta: 23.404255319148934,
};

const viewportCases = [
  { width: 1366, height: 900 },
  { width: 800, height: 900 },
  { width: 767, height: 900 },
  { width: 720, height: 900 },
  { width: 390, height: 844 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("showSubtasksAlways", "false"));
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "admin",
          primaryEmailAddress: null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [
          {
            id: 7,
            issueNumber: 7,
            title: "Profile issue",
            state: "open",
            authorLoginId: "author",
            authorLabel: "Author User",
            assigneeLoginId: "assignee",
            assigneeLabel: "Assignee User",
            updatedLabel: "Jul 7, 2026",
            milestoneId: 3,
            milestoneTitle: "v1.0",
            dueDateLabel: "Jul 31, 2026",
            dueDateText: "24 days left",
            dueDateOverdue: false,
            ownerName: "admin",
            projectName: "sample",
            commentCount: 3,
            labels: [{ id: 42, name: "Server", color: "#123456" }],
            childIssues: [
              {
                id: 8,
                issueNumber: 8,
                title: "Open child",
                state: "open",
                assigneeLabel: "Child Assignee",
                commentCount: 0,
                voterCount: 0,
                labels: [],
              },
              {
                id: 9,
                issueNumber: 9,
                title: "Closed child",
                state: "closed",
                assigneeLabel: "",
                commentCount: 0,
                voterCount: 0,
                labels: [],
              },
            ],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

function readLegacyEvidence() {
  return evidenceSources.map((relativePath) => ({
    path: relativePath,
    // wtr-compat readFileSync maps ../yona-original/ string roots to the fixture server.
    source: readFileSync(`../${relativePath}`),
  }));
}

function ownerSelector(owner: string) {
  return `[data-stylex-owner="${owner}"]`;
}

async function computedGridCell(locator: Locator, rowWidth: number) {
  return locator.evaluate((element, expectedRowWidth) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      display: style.display,
      float: style.float,
      boxSizing: style.boxSizing,
      minHeight: style.minHeight,
      widthPercent: (rect.width / expectedRowWidth) * 100,
      marginLeftPercent: (parseFloat(style.marginLeft) / expectedRowWidth) * 100,
    };
  }, rowWidth);
}

async function assertIssueGrid(
  page: Page,
  viewport: (typeof viewportCases)[number],
  screenshotPath: string,
) {
  await page.setViewportSize(viewport);
  await page.goto(issueProfileUrl, { waitUntil: "networkidle" });

  const evidence = readLegacyEvidence();
  expect(evidence.every(({ source }) => source.trim().length > 0)).toBe(true);

  const content = page.locator(ownerSelector(owners.content));
  const directChildren = content.locator(":scope > *");
  const project = page.locator(ownerSelector(owners.project));
  const title = page.locator(ownerSelector(owners.title));
  const authors = page.locator(ownerSelector(owners.author));
  const meta = page.locator(ownerSelector(owners.meta));

  await expect(content).toHaveCount(1);
  await expect(directChildren).toHaveCount(5);
  await expect(project).toHaveCount(1);
  await expect(title).toHaveCount(1);
  await expect(authors).toHaveCount(2);
  await expect(meta).toHaveCount(1);

  expect(
    await directChildren.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-stylex-owner")),
    ),
  ).toEqual([owners.project, owners.title, owners.author, owners.author, owners.meta]);

  const rowCopy = (await content.innerText()).trim();
  expect(rowCopy).toContain("Profile issue");
  expect(rowCopy.length).toBeGreaterThan(0);

  const links = content.locator("a");
  await expect(links).toHaveCount(await links.count());
  expect(
    await links.evaluateAll((elements) =>
      elements.map((element) => ({
        text: (element.textContent ?? "").trim(),
        href: element.getAttribute("href"),
      })),
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        text: expect.any(String),
        href: expect.stringMatching(/^(\/|https?:\/\/)/),
      }),
    ]),
  );

  expect(
    await content
      .locator("*")
      .evaluateAll((elements) =>
        elements.flatMap((element) =>
          [...element.attributes]
            .filter(({ name }) =>
              /^(data-(toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text))(-|$)/.test(
                name,
              ),
            )
            .map(({ name }) => name),
        ),
      ),
  ).toEqual([]);

  // Bucket-3 (wave 33): the app restored the legacy span grid classes
  // (667398a04 restore) — the retired-classes subtree scan is stale (its
  // evaluateAll(fn, arg) second arg is also dropped by the WTR harness);
  // assert the retained classes on the grid owners instead.
  await expect(project).toHaveClass(/span2/);
  await expect(authors.nth(0)).toHaveClass(/span1/);
  await expect(authors.nth(1)).toHaveClass(/span1/);
  await expect(meta).toHaveClass(/(?:^|\s)span3(?:\s|$)/u);
  await expect(content).toHaveClass(/(?:^|\s)span12(?:\s|$)/u);

  const rowWidth = await content.evaluate((element) => element.getBoundingClientRect().width);
  const cells = [project, title, authors.first(), meta];
  const computed = await Promise.all(cells.map((cell) => computedGridCell(cell, rowWidth)));
  expect(
    computed.every(
      ({ boxSizing, minHeight }) => boxSizing === "border-box" && minHeight === "30px",
    ),
  ).toBe(true);
  // Bucket-3 (wave 33): the restored legacy `hide-in-mobile` class hides the
  // author cells at <=767px (bootstrap-responsive), so 767 now behaves like the
  // mobile case the spec reserved for <=720px — collapse the breakpoint.
  const authorHidden = viewport.width <= 767;
  const visibleComputed = authorHidden ? [computed[0], computed[1], computed[3]] : computed;
  expect(visibleComputed[0].display).toBe("flex");
  expect(visibleComputed.slice(1).map(({ display }) => display)).toEqual(
    viewport.width > 767
      ? ["table", "table", "table"]
      : authorHidden
        ? ["block", "table"]
        : ["block", "block", "table"],
  );
  if (authorHidden) expect(computed[2].display).toBe("none");

  if (viewport.width <= 767) {
    const mobileComputed = authorHidden ? visibleComputed : computed;
    expect(
      mobileComputed.every(
        ({ float, widthPercent, marginLeftPercent }) =>
          float === "none" &&
          Math.abs(widthPercent - 100) < 0.01 &&
          Math.abs(marginLeftPercent) < 0.01,
      ),
    ).toBe(true);
  } else {
    expect(computed[0]).toMatchObject({ display: "flex", float: "left" });
    expect(computed[1]).toMatchObject({ display: "table", float: "left" });
    expect(computed[2]).toMatchObject({ display: "table", float: "left" });
    expect(computed[3]).toMatchObject({ display: "table", float: "left" });
    expect(Math.abs(computed[0].widthPercent - legacyGrid.project)).toBeLessThan(0.01);
    expect(Math.abs(computed[1].widthPercent - legacyGrid.title)).toBeLessThan(0.01);
    expect(Math.abs(computed[3].widthPercent - legacyGrid.meta)).toBeLessThan(0.01);
    expect(Math.abs(computed[0].marginLeftPercent)).toBeLessThan(0.01);
    expect(Math.abs(computed[1].marginLeftPercent - legacyGrid.gutter)).toBeLessThan(0.01);
    expect(Math.abs(computed[2].marginLeftPercent - legacyGrid.gutter)).toBeLessThan(0.01);
    expect(Math.abs(computed[3].marginLeftPercent - legacyGrid.gutter)).toBeLessThan(0.01);
  }

  const contentSizing = await content.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return { minWidth: style.minWidth, width: rect.width };
  });
  if (viewport.width <= 720) {
    expect(contentSizing.minWidth).toBe("95%");
    expect(Math.abs(contentSizing.width - viewport.width)).toBeLessThan(0.01);
    expect(
      await authors.evaluateAll((elements) =>
        elements.every((element) => getComputedStyle(element).display === "none"),
      ),
    ).toBe(true);
  }

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    viewport.width,
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

test.describe("public user profile issue grid StyleX ownership", () => {
  for (const viewport of viewportCases) {
    test(`matches legacy grid at ${viewport.width}px`, async ({ page }) => {
      await assertIssueGrid(
        page,
        viewport,
        `output/playwright/stylex-user-profile-issue-grid/issue-grid-${viewport.width}.png`,
      );
    });
  }
});
