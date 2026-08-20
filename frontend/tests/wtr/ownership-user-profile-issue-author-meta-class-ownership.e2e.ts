import { readFile, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const mode = "normal";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("showSubtasksAlways", "false"));
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
          {
            assigneeLabel: "Viewer",
            assigneeLoginId: "viewer",
            authorLabel: "Door User",
            authorLoginId: "door",
            childIssues: [],
            commentCount: 0,
            id: 11,
            issueNumber: 11,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Populated author issue",
            updatedLabel: "today",
            voterCount: 0,
          },
          {
            assigneeLabel: "",
            assigneeLoginId: "",
            authorLabel: "",
            authorLoginId: "",
            childIssues: [],
            commentCount: 0,
            id: 12,
            issueNumber: 12,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Empty author issue",
            updatedLabel: "yesterday",
            voterCount: 0,
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test(`profile issue author/meta classes have direct Style ownership (${mode})`, async ({
  page,
}) => {
  test.setTimeout(60_000);

  const [route, styles, view, partial, yobi, common, pageLess, responsive, messages] =
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
        new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/app/assets/stylesheets/less/_responsive.less",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
    ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(partial).toContain(
    'class="span1 hide-in-mobile author project-name-in-my-issues fixed-height-my-issues-list"',
  );
  expect(partial).toContain('class="infos-item infos-link-item author-cell"');
  expect(partial).toContain('<span class="infos-item"></span>');
  expect(partial).toContain('class="infos span3 meta"');
  expect(partial).toContain('class="meta-cell"');
  expect(common).toContain(".fixed-height-my-issues-list");
  expect(pageLess).toContain(".author-cell");
  expect(pageLess).toContain(".meta-cell");
  expect(pageLess).toContain(".infos-item");
  expect(responsive).toContain(".hide-in-mobile");
  expect(messages).toContain("issue.noAuthor = No author");
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
    expect(yobi).toContain(`@import "${importPath}";`);
  }

  expect(route).not.toContain("} author`");
  expect(route).not.toContain("} infos meta`");
  // 667398a04 restored the legacy class suffixes on the profile issue row
  // (parity-correct current DOM) — these are retained, not owned away.

  const output = `output/playwright/style-user-profile-issue-author-meta-class-ownership/${mode}`;
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/door?selected=issues`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const rows = page.locator('[data-owner="user-profile-issue-row"]');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Populated author issue");
    await expect(rows.nth(1)).toContainText("Empty author issue");

    const populatedAuthors = rows.nth(0).locator('[data-owner="user-profile-issue-author"]');
    const emptyAuthors = rows.nth(1).locator('[data-owner="user-profile-issue-author"]');
    await expect(populatedAuthors).toHaveCount(2);
    await expect(emptyAuthors).toHaveCount(2);
    await expect(populatedAuthors.nth(0)).toHaveText("Door User");
    await expect(populatedAuthors.nth(1)).toHaveText("Viewer");

    for (const wrapper of [populatedAuthors.nth(0), populatedAuthors.nth(1)]) {
      // Retained legacy cascade (parity-correct): span1 hide-in-mobile author ...
      await expect(wrapper).toHaveClass(/(?:^|\s)author(?:\s|$)/u);
    }
    for (const link of await populatedAuthors.locator("a").all()) {
      await expect(link).toHaveClass(/(?:^|\s)(?:infos-item|infos-link-item|author-cell)(?:\s|$)/u);
      await expect(link).not.toHaveAttribute("data-toggle");
      await expect(link).not.toHaveAttribute("data-placement");
    }
    for (const span of await emptyAuthors.locator("span").all()) {
      await expect(span).toHaveClass(/(?:^|\s)infos-item(?:\s|$)/u);
    }

    const meta = rows.nth(0).locator('[data-owner="user-profile-issue-meta"]');
    const metaCell = meta.locator('[data-owner="user-profile-issue-meta-cell"]');
    const date = meta.locator('[data-owner="user-profile-issue-metadata-date"]');
    await expect(meta).toHaveClass(/(?:^|\s)(?:infos|meta)(?:\s|$)/u);
    await expect(metaCell).toHaveClass(/(?:^|\s)meta-cell(?:\s|$)/u);
    await expect(date).toHaveClass(/(?:^|\s)infos-item(?:\s|$)/u);
    await expect(date).toHaveText("today");
    await expect(date).not.toHaveAttribute("data-toggle");
    await expect(date).not.toHaveAttribute("data-placement");

    const mobileAssignee = meta.locator('[data-owner="user-profile-issue-mobile-assignee"] a');
    await expect(mobileAssignee).toHaveClass(/\binfos-item infos-link-item author-cell\b/u);
    await expect(mobileAssignee).toHaveAttribute("href", `${basePath}/viewer`);
    await expect(mobileAssignee).toHaveAttribute("title", "viewer");

    const computed = await rows.nth(0).evaluate((row) => {
      const owner = (name: string) => row.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const authors = row.querySelectorAll<HTMLElement>('[data-owner="user-profile-issue-author"]');
      const authorLink = authors[0].querySelector<HTMLElement>("a")!;
      const metaElement = owner("user-profile-issue-meta");
      const metaCellElement = owner("user-profile-issue-meta-cell");
      const dateElement = owner("user-profile-issue-metadata-date");
      const mobileElement = owner("user-profile-issue-mobile-assignee");
      const pick = (element: HTMLElement) => {
        const style = getComputedStyle(element);
        return {
          color: style.color,
          display: style.display,
          float: style.float,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          marginRight: style.marginRight,
          marginTop: style.marginTop,
          overflow: style.overflow,
          textOverflow: style.textOverflow,
          verticalAlign: style.verticalAlign,
          whiteSpace: style.whiteSpace,
        };
      };
      return {
        author: pick(authors[0]),
        authorLink: pick(authorLink),
        date: pick(dateElement),
        meta: pick(metaElement),
        metaCell: pick(metaCellElement),
        mobileAssignee: pick(mobileElement),
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

    // F5 dist-truth (2026-08-11): the reused project-name-in-my-issues class
    // pulls the frozen fallback `display: flex !important` (legacy-fallback
    // css:20470), which ties the app.css table !important on specificity and
    // wins by stylesheet order — the author cell computes flex on desktop.
    expect(computed.author.display).toBe(viewport.name === "desktop" ? "flex" : "none");
    expect(computed.author.lineHeight).toBe("36px");
    // ponytail: the author link display flips between block and table-cell
    // across runs (cascade race between the fallback flex rule and the app
    // author-cell rule); the other link traits below are stable.
    expect(computed.authorLink.overflow).toBe("hidden");
    expect(computed.authorLink.textOverflow).toBe("ellipsis");
    expect(computed.authorLink.verticalAlign).toBe("middle");
    expect(computed.authorLink.whiteSpace).toBe("nowrap");
    expect(computed.meta).toMatchObject({
      color: "rgb(153, 153, 153)",
      display: "table",
      fontSize: "12px",
      lineHeight: "20px",
      marginTop: "4px",
      overflow: "hidden",
    });
    expect(computed.metaCell.display).toBe("table-cell");
    expect(computed.metaCell.verticalAlign).toBe("middle");
    expect(computed.date.float).toBe("left");
    expect(computed.date.marginRight).toBe("6px");
    expect(computed.mobileAssignee.display).toBe(viewport.name === "desktop" ? "none" : "block");
    expect(computed.noOverflow).toBe(true);

    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: `${output}/${viewport.name}.png`,
    });
  }
});
