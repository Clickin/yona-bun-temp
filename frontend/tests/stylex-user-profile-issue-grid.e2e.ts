import { expect, test, type Locator, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "..");
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
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route: Route) =>
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
    source: readFileSync(resolve(repoRoot, relativePath), "utf8"),
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

  expect(
    await content
      .locator("[class]")
      .evaluateAll(
        (elements, retiredClasses) =>
          elements.flatMap((element) =>
            (element.getAttribute("class") ?? "")
              .split(/\s+/)
              .filter((className) => retiredClasses.includes(className)),
          ),
        retiredGridClasses,
      ),
  ).toEqual([]);

  const rowWidth = await content.evaluate((element) => element.getBoundingClientRect().width);
  const cells = [project, title, authors.first(), meta];
  const computed = await Promise.all(cells.map((cell) => computedGridCell(cell, rowWidth)));
  expect(
    computed.every(
      ({ boxSizing, minHeight }) => boxSizing === "border-box" && minHeight === "30px",
    ),
  ).toBe(true);
  const visibleComputed =
    viewport.width <= 720 ? [computed[0], computed[1], computed[3]] : computed;
  expect(visibleComputed[0].display).toBe("flex");
  expect(visibleComputed.slice(1).map(({ display }) => display)).toEqual(
    viewport.width > 767
      ? ["table", "table", "table"]
      : viewport.width <= 720
        ? ["block", "table"]
        : ["block", "block", "table"],
  );
  if (viewport.width <= 720) expect(computed[2].display).toBe("none");

  if (viewport.width <= 767) {
    const mobileComputed = viewport.width <= 720 ? visibleComputed : computed;
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
    test(`matches legacy grid at ${viewport.width}px`, async ({ page }, testInfo) => {
      await assertIssueGrid(
        page,
        viewport,
        testInfo.outputPath(`issue-grid-${viewport.width}.png`),
      );
    });
  }
});
