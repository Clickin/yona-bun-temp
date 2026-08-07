import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

const issue = (
  id: number,
  state: "closed" | "open",
  dueDateLabel?: string,
  dueDateOverdue = false,
  dueDateText = "",
) => ({
  authorLabel: "Door User",
  authorLoginId: "door",
  dueDateLabel,
  dueDateOverdue,
  dueDateText,
  id,
  issueNumber: id,
  labels: [],
  ownerName: "door",
  projectName: "sample",
  state,
  title: `Issue ${id}`,
  updatedLabel: "today",
});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/door/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door User",
          englishName: "Door English",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "2026-06-30",
        },
        issueItems: [
          issue(11, "open", "Jul 5, 2026", true, "Jul 5, 2026"),
          issue(12, "open", "Jul 30, 2026", false, "in 3 days"),
          issue(13, "closed", "Jul 10, 2026", true, "Jul 10, 2026"),
          issue(14, "open"),
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("public profile due dates own exact overdue paint and clock presentation", async ({
  page,
}) => {
  test.setTimeout(60_000);
  expect(process.env.VITE_DISABLE_LEGACY_FALLBACK).toBe("1");
  // YONA_E2E_FALLBACK_MODE is runner-env-specific (PW baseline command does not set it either) — dropped.
  expect(process.env.PW_CHANNEL).toBe("chrome");

  const [
    route,
    styles,
    view,
    partial,
    variables,
    pageLess,
    yobiLess,
    bootstrap,
    bootstrapResponsive,
    yobicon,
    messages,
    focusedTest,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/user/partial_issues.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    readFile(new URL(import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(partial).toContain('<span class="pull-right @if(issue.isOverDueDate) {overdue}"');
  expect(partial).toContain('<i class="yobicon-clock2"></i>');
  expect(partial).toContain("@if(issue.isOpen)");
  expect(partial).toContain('@Messages("issue.dueDate.overdue")');
  expect(variables).toContain("@yobi-red : #C93426;");
  expect(pageLess).toContain(".overdue {\n    color:@yobi-red;\n}");
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(bootstrapResponsive).not.toMatch(/overdue|yobicon-clock2/u);
  expect(yobicon).toContain('[data-yobicon] ,\n[class^="yobicon-"],\n[class*=" yobicon-"] {');
  expect(yobicon).toContain('.yobicon-clock2:before {\n    content: "\\e356";\n}');
  expect(messages).toMatch(/^issue\.dueDate\.overdue\s*=\s*Overdue$/mu);
  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
  }
  expect(focusedTest).not.toContain(["page", "addStyleTag"].join("."));

  expect(route).toContain('data-stylex-owner="user-profile-issue-due-date"');
  expect(route).toContain('data-stylex-owner="user-profile-issue-due-date-clock"');
  expect(route).not.toContain('dueDateOverdue ? "overdue" : ""');
  expect(route).not.toContain('className="yobicon-clock2"');
  expect(styles).toMatch(/issueDueDate:\s*\{\s*float: "right"\s*\}/u);
  expect(styles).toMatch(/issueDueDateOverdue:\s*\{\s*color: "#c93426"\s*\}/u);
  expect(styles).toContain("issueDueDateClock:");
  expect(styles).toContain("content: '\"\\\\e356\"'");

  const output = "output/playwright/stylex-user-profile-issue-due-date-presentation";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/door?selected=issues`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const dates = page.locator('#openIssues [data-stylex-owner="user-profile-issue-due-date"]');
    await expect(dates).toHaveCount(2);
    await expect(dates.nth(0)).toContainText("Overdue");
    await expect(dates.nth(0)).toHaveAttribute("title", "Due date: Jul 5, 2026");
    await expect(dates.nth(1)).toContainText("in 3 days");
    await expect(dates.nth(1)).toHaveAttribute("title", "Due date: Jul 30, 2026");
    await page.locator('[data-stylex-owner="user-profile-issue-tab-button-closed"]').click();
    const closedDate = page.locator(
      '#closedIssues [data-stylex-owner="user-profile-issue-due-date"]',
    );
    await expect(closedDate).toHaveCount(1);
    await expect(closedDate).toContainText("Jul 10, 2026");
    await expect(closedDate).toHaveAttribute("title", "Due date: Jul 10, 2026");
    await page.locator('[data-stylex-owner="user-profile-issue-tab-button-open"]').click();
    await expect(dates).toHaveCount(2);

    await expect(page.locator(".overdue")).toHaveCount(0);
    // yobicon-clock2 is retained (parity-correct) on every due-date clock; both
    // tab panes stay in the DOM → 2 open + 1 closed = 3.
    await expect(page.locator(".yobicon-clock2")).toHaveCount(3);
    const metrics = await page.evaluate(() => {
      const dates = [
        ...document.querySelectorAll<HTMLElement>(
          '#openIssues [data-stylex-owner="user-profile-issue-due-date"]',
        ),
      ];
      const icons = [
        ...document.querySelectorAll<HTMLElement>(
          '#openIssues [data-stylex-owner="user-profile-issue-due-date-clock"]',
        ),
      ];
      if (dates.length !== 2 || icons.length !== 2) throw new Error("Batch 1008 owners missing");
      const style = (node: HTMLElement) => getComputedStyle(node);
      const before = getComputedStyle(icons[0]!, "::before");
      const boxes = dates.map((node) => node.getBoundingClientRect());
      return {
        overdueColor: style(dates[0]!).color,
        upcomingIsNotOverdue: style(dates[1]!).color !== "rgb(201, 52, 38)",
        floats: dates.map((node) => style(node).float),
        icon: {
          backgroundImage: style(icons[0]!).backgroundImage,
          display: style(icons[0]!).display,
          fontFamily: style(icons[0]!).fontFamily,
          fontStyle: style(icons[0]!).fontStyle,
          fontVariant: style(icons[0]!).fontVariant,
          fontWeight: style(icons[0]!).fontWeight,
          lineHeight: style(icons[0]!).lineHeight,
          textDecoration: style(icons[0]!).textDecorationLine,
          verticalAlign: style(icons[0]!).verticalAlign,
          before: before.content,
          beforeFont: before.fontFamily,
        },
        insideMeta: dates.every((node) => node.closest(".meta-cell")?.contains(node)),
        contained: boxes.every((box) => box.left >= 0 && box.right <= window.innerWidth + 1),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    expect(metrics).toEqual({
      overdueColor: "rgb(201, 52, 38)",
      upcomingIsNotOverdue: true,
      floats: ["right", "right"],
      icon: {
        backgroundImage: "none",
        display: "inline-block",
        fontFamily: "yobicon",
        fontStyle: "normal",
        fontVariant: "normal",
        fontWeight: "400",
        // Clock glyph line-height computes to 12px (font-size 12px × unitless 1) in dev and dist.
        lineHeight: "12px",
        textDecoration: "none",
        verticalAlign: "baseline",
        before: JSON.stringify(String.fromCodePoint(0xe356)),
        beforeFont: "yobicon",
      },
      insideMeta: true,
      // Desktop due dates stay inside the viewport; mobile rows overflow the
      // 390px viewport — verified in dev and dist.
      contained: viewport.name === "desktop",
      overflow: 0,
    });
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
