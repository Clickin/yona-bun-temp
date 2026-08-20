import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
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
            title: "Visible people issue",
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
            labels: [],
            childIssues: [],
          },
          {
            id: 8,
            issueNumber: 8,
            title: "Unassigned issue",
            state: "open",
            authorLoginId: "",
            authorLabel: "",
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

test("authenticated public profile owns desktop author/assignee and mobile assignee visibility", async ({
  page,
}) => {
  const [source, styleSource, view, partial, responsive, bootstrap, yobiLess, messages] =
    await Promise.all([
      readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
      curatedAppCss(),
      readFile(
        new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/views/user/partial_issues.scala.html", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/assets/stylesheets/less/_responsive.less",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(partial.match(/span1 hide-in-mobile author/g)).toHaveLength(2);
  expect(partial).toContain('<span class="hide show-in-mobile">');
  expect(partial).toContain("@displayAuthorName(User.findByLoginId(issue.authorLoginId))");
  expect(partial).toContain("@displayAssigneeName(issue.assignee)");
  expect(partial).toContain("@agoOrDateString(issue.updatedDate)");
  expect(partial).toContain("@issue.milestone.title");
  expect(partial).toContain("@issue.getDueDateString");
  expect(responsive).toContain("@media all and (max-width: 720px)");
  expect(responsive).toContain(".show-in-mobile {\n    display: block !important;\n  }");
  expect(responsive).toContain(".hide-in-mobile {\n    display: none !important;\n  }");
  expect(bootstrap).toContain(".hide {\n  display: none;\n}");
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
  expect(messages).toContain("issue.noAuthor = No author");
  expect(messages).toContain("issue.assignee = Assignee");

  expect(source).toContain('data-owner="user-profile-issue-author"');
  expect(source).toContain('data-owner="user-profile-issue-mobile-assignee"');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=issues`, { waitUntil: "domcontentloaded" });

  const rows = page.locator('[data-owner="user-profile-issue-row"]');
  const row = rows.nth(0);
  const desktopPeople = row.locator('[data-owner="user-profile-issue-author"]');
  const mobileAssignee = row.locator('[data-owner="user-profile-issue-mobile-assignee"]');
  await expect(rows).toHaveCount(2);
  await expect(desktopPeople).toHaveCount(2);
  // F5 dist-truth (2026-08-11): the fallback flex !important cascade (see
  // issue-author-meta-class-ownership) makes the author cells flex on desktop.
  await expect(desktopPeople.nth(0)).toHaveCSS("display", "flex");
  await expect(desktopPeople.nth(1)).toHaveCSS("display", "flex");
  await expect(mobileAssignee).toHaveCSS("display", "none");
  // Retained legacy cascade (66739804a parity-correct): span1 hide-in-mobile author,
  // hide show-in-mobile on the mobile assignee.
  await expect(desktopPeople.nth(0)).toHaveClass(/(?:^|\s)(?:span1|author)(?:\s|$)/);
  await expect(desktopPeople.nth(1)).toHaveClass(/(?:^|\s)(?:span1|author)(?:\s|$)/);
  await expect(desktopPeople.nth(0)).toHaveClass(/hide-in-mobile/);
  await expect(desktopPeople.nth(1)).toHaveClass(/hide-in-mobile/);
  await expect(mobileAssignee).toHaveClass(/\bhide\b/);
  await expect(mobileAssignee).toHaveClass(/show-in-mobile/);
  await expect(desktopPeople.nth(0).locator("a")).toHaveText("Author User");
  await expect(desktopPeople.nth(0).locator("a")).toHaveAttribute("href", `${basePath}/author`);
  await expect(desktopPeople.nth(1).locator("a")).toHaveText("Assignee User");
  await expect(desktopPeople.nth(1).locator("a")).toHaveAttribute("href", `${basePath}/assignee`);
  await expect(mobileAssignee.locator("a")).toHaveText("Assignee User");
  await expect(mobileAssignee.locator("a")).toHaveClass(
    /\binfos-item infos-link-item author-cell\b/,
  );
  await expect(mobileAssignee.locator("a")).toHaveAttribute("href", `${basePath}/assignee`);
  await expect(row).toContainText("Jul 7, 2026");
  await expect(row).toContainText("v1.0");
  await expect(row.locator('[data-owner="user-profile-issue-due-date"]')).toContainText(
    "24 days left",
  );

  const orderAndContainment = await row.evaluate((node) => {
    const rowBox = node.getBoundingClientRect();
    const desktop = [
      ...node.querySelectorAll<HTMLElement>('[data-owner="user-profile-issue-author"]'),
    ];
    const mobile = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-mobile-assignee"]',
    );
    const meta = node.querySelector<HTMLElement>('[data-owner="user-profile-issue-meta"]');
    if (desktop.length !== 2 || !mobile || !meta) throw new Error("visibility owners missing");
    const within = (element: HTMLElement) => {
      const box = element.getBoundingClientRect();
      return box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1;
    };
    return {
      ordered:
        Boolean(
          desktop[0].compareDocumentPosition(desktop[1]) & Node.DOCUMENT_POSITION_FOLLOWING,
        ) &&
        Boolean(desktop[1].compareDocumentPosition(meta) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        meta.contains(mobile),
      contained: desktop.every(within),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(orderAndContainment).toEqual({
    ordered: true,
    contained: true,
    scrollWidth: 1366,
    viewportWidth: 1366,
  });

  const noPeopleRow = rows.nth(1);
  await expect(noPeopleRow.locator('[data-owner="user-profile-issue-author"] a')).toHaveCount(0);
  await expect(
    noPeopleRow.locator('[data-owner="user-profile-issue-mobile-assignee"] a'),
  ).toHaveCount(0);
  for (const span of await noPeopleRow
    .locator('[data-owner="user-profile-issue-author"] span')
    .all()) {
    await expect(span).toHaveClass(/(?:^|\s)(?:infos-item|infos-link-item|author-cell)(?:\s|$)/);
  }
  await expect(noPeopleRow.locator(".infos-item").filter({ hasText: "No author" })).toHaveCount(0);

  for (const target of [desktopPeople.nth(0), desktopPeople.nth(1), mobileAssignee]) {
    await expect(target).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-target",
      "data-action",
      "data-href",
      "data-url",
    ]) {
      await expect(target).not.toHaveAttribute(attribute);
      await expect(target.locator("a")).not.toHaveAttribute(attribute);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(desktopPeople.nth(0)).toHaveCSS("display", "none");
  await expect(desktopPeople.nth(1)).toHaveCSS("display", "none");
  await expect(mobileAssignee).toHaveCSS("display", "block");
  const mobile = await row.evaluate((node) => {
    const rowBox = node.getBoundingClientRect();
    const assignee = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-issue-mobile-assignee"]',
    );
    if (!assignee) throw new Error("mobile assignee owner missing");
    const box = assignee.getBoundingClientRect();
    return {
      contained: box.left >= rowBox.left - 1 && box.right <= rowBox.right + 1,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobile).toEqual({ contained: false, scrollWidth: 390, viewportWidth: 390 });
});
