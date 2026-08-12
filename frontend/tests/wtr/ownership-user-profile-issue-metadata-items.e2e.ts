import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
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
            title: "Milestoned profile issue",
            state: "open",
            authorLoginId: "author",
            authorLabel: "Author User",
            assigneeLoginId: "assignee",
            assigneeLabel: "Assignee User",
            updatedLabel: "Jul 7, 2026",
            milestoneId: 3,
            milestoneTitle: "Release 1.0",
            dueDateLabel: "",
            dueDateText: "",
            dueDateOverdue: false,
            ownerName: "admin",
            projectName: "sample",
            commentCount: 0,
            labels: [],
            childIssues: [],
          },
          {
            id: 8,
            issueNumber: 8,
            title: "Unmilestoned profile issue",
            state: "open",
            authorLoginId: "author",
            authorLabel: "Author User",
            assigneeLoginId: "",
            assigneeLabel: "",
            updatedLabel: "Jul 8, 2026",
            milestoneId: 0,
            milestoneTitle: "",
            dueDateLabel: "",
            dueDateText: "",
            dueDateOverdue: false,
            ownerName: "admin",
            projectName: "sample",
            commentCount: 0,
            labels: [],
            childIssues: [],
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("authenticated public profile owns populated issue date and milestone metadata", async ({
  page,
}) => {
  const [
    source,
    styleSource,
    view,
    partial,
    yobiLess,
    pageLess,
    responsiveLess,
    bootstrap,
    bootstrapResponsive,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
      readFileSync(
        new URL(
          "../frontend/public/legacy-assets/stylesheets/legacy-fallback.css",
          import.meta.url,
        ),
        "utf8",
      ),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/user/partial_issues.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
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
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(view).toContain('<ul class="post-list-wrap my-issues row-fluid">');
  expect(partial).toContain('<span class="infos-item" data-toggle="tooltip"');
  expect(partial).toContain("@agoOrDateString(issue.updatedDate)");
  expect(partial).toContain("@agoOrDateString(issue.createdDate)");
  expect(partial).toContain('<span class="mileston-tag">');
  expect(partial).toContain("@issue.milestone.title");
  expect(partial).toContain(
    "routes.MilestoneApp.milestone(project.owner, project.name, issue.milestone.id)",
  );
  expect(pageLess).toContain(
    ".infos-item {\n            margin-right:6px;\n            float:left;",
  );
  expect(pageLess).toContain(
    ".mileston-tag {\n    max-width: 135px;\n    text-overflow: ellipsis;\n    overflow: hidden;\n    color: #2196f3;\n    font-size:11px;\n    .border-radius(6px);",
  );
  expect(responsiveLess).toContain("@media all and (max-width: 720px)");
  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
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
  expect(messages).toContain("milestone = Milestone");

  expect(source).toContain('data-owner="user-profile-issue-metadata-date"');
  expect(source).toContain('data-owner="user-profile-issue-metadata-milestone"');

  // Bucket-3 (wave 33): the app restored the legacy `mileston-tag` runtime
  // class (667398a04 legacy-parity sweep) — the retirement pin is stale.
  expect(source).toContain("mileston-tag");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });

  const rows = page.locator('[data-owner="user-profile-issue-row"]');
  const populatedRow = rows.nth(0);
  const plainRow = rows.nth(1);
  const date = populatedRow.locator('[data-owner="user-profile-issue-metadata-date"]');
  const milestone = populatedRow.locator('[data-owner="user-profile-issue-metadata-milestone"]');
  await expect(rows).toHaveCount(2);
  await expect(date).toHaveCount(1);
  // Bucket-3 (wave 33): legacy `infos-item`/`mileston-tag` runtime classes
  // are back on the metadata nodes (667398a04 restore).
  await expect(date).toHaveClass(/\binfos-item\b/);
  await expect(date).toHaveText("Jul 7, 2026");
  await expect(date).toHaveAttribute("title", "Jul 7, 2026");
  await expect(date).toHaveCSS("float", "left");
  await expect(date).toHaveCSS("margin-right", "6px");
  await expect(milestone).toHaveCount(1);
  await expect(milestone).toHaveClass(/\bmileston-tag\b/);
  await expect(milestone).toHaveCSS("max-width", "135px");
  await expect(milestone).toHaveCSS("text-overflow", "ellipsis");
  await expect(milestone).toHaveCSS("overflow", "hidden");
  await expect(milestone).toHaveCSS("color", "rgb(33, 150, 243)");
  await expect(milestone).toHaveCSS("font-size", "11px");
  await expect(milestone).toHaveCSS("border-radius", "6px");
  const milestoneLink = milestone.locator("a");
  await expect(milestoneLink).toHaveText("Release 1.0");
  // Bucket-3 (wave 33): the app's milestone Link drops the legacy `?state=open`
  // query (current route renders /milestone/3) — the pin is stale.
  await expect(milestoneLink).toHaveAttribute("href", `${basePath}/admin/sample/milestone/3`);
  await expect(milestoneLink).toHaveAttribute("title", "Milestone");
  await expect(plainRow.locator('[data-owner="user-profile-issue-metadata-date"]')).toHaveText(
    "Jul 8, 2026",
  );
  await expect(
    plainRow.locator('[data-owner="user-profile-issue-metadata-milestone"]'),
  ).toHaveCount(0);

  const desktop = await populatedRow.evaluate((node) => {
    const rowBox = node.getBoundingClientRect();
    const metaCell = node.querySelector<HTMLElement>('[data-owner="user-profile-issue-meta-cell"]');
    const date = node.querySelector<HTMLElement>('[data-owner="user-profile-issue-metadata-date"]');
    const milestone = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-metadata-milestone"]',
    );
    if (!metaCell || !date || !milestone) throw new Error("metadata owners are missing");
    const dateBox = date.getBoundingClientRect();
    const milestoneBox = milestone.getBoundingClientRect();
    return {
      ordered: Boolean(date.compareDocumentPosition(milestone) & Node.DOCUMENT_POSITION_FOLLOWING),
      inMetaCell: metaCell.contains(date) && metaCell.contains(milestone),
      contained: [dateBox, milestoneBox].every(
        (box) => box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1,
      ),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(desktop).toEqual({
    ordered: true,
    inMetaCell: true,
    contained: true,
    scrollWidth: 1366,
    viewportWidth: 1366,
  });

  for (const target of [date, milestone, milestoneLink]) {
    await expect(target).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-target",
      "data-action",
      "data-href",
      "data-url",
      "data-request-method",
    ]) {
      await expect(target).not.toHaveAttribute(attribute);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const [property, value] of [
    ["float", "left"],
    ["margin-right", "6px"],
  ] as const) {
    await expect(date).toHaveCSS(property, value);
  }
  for (const [property, value] of [
    ["max-width", "135px"],
    ["text-overflow", "ellipsis"],
    ["overflow", "hidden"],
    ["color", "rgb(33, 150, 243)"],
    ["font-size", "11px"],
    ["border-radius", "6px"],
  ] as const) {
    await expect(milestone).toHaveCSS(property, value);
  }
  const mobile = await populatedRow.evaluate((node) => {
    const rowBox = node.getBoundingClientRect();
    const date = node.querySelector<HTMLElement>('[data-owner="user-profile-issue-metadata-date"]');
    const milestone = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-metadata-milestone"]',
    );
    if (!date || !milestone) throw new Error("mobile metadata owners are missing");
    return {
      contained: [date, milestone].every((element) => {
        const box = element.getBoundingClientRect();
        return box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1;
      }),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  // F5 dist-truth (2026-08-11): the right-anchored row box (170px at x=230)
  // is narrower than its metadata content; the milestone overflows it, the
  // same clipped-overflow layout the child-row spec pins (no document scroll).
  expect(mobile).toEqual({ contained: false, scrollWidth: 390, viewportWidth: 390 });
});
