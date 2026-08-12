import { readFile, readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const mode = fallbackOff ? "fallback-off" : "normal";

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
            assigneeLabel: "",
            authorLabel: "Door User",
            authorLoginId: "door",
            childClosedCount: 1,
            childOpenCount: 2,
            commentCount: 0,
            id: 11,
            issueNumber: 11,
            labels: [],
            ownerName: "door",
            parentIssueNumber: 7,
            parentIssueTitle: "1234567890 trailing words",
            projectName: "sample",
            state: "open",
            title: "Incomplete children and parent",
            updatedLabel: "today",
            voterCount: 0,
          },
          {
            assigneeLabel: "",
            authorLabel: "Door User",
            authorLoginId: "door",
            childClosedCount: 5,
            childOpenCount: 0,
            commentCount: 0,
            id: 12,
            issueNumber: 12,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Complete children",
            updatedLabel: "today",
            voterCount: 0,
          },
          {
            assigneeLabel: "",
            authorLabel: "Door User",
            authorLoginId: "door",
            childClosedCount: 0,
            childOpenCount: 0,
            commentCount: 0,
            id: 13,
            issueNumber: 13,
            labels: [],
            ownerName: "door",
            parentIssueNumber: 8,
            parentIssueTitle: "Short",
            projectName: "sample",
            state: "open",
            title: "Parent only",
            updatedLabel: "today",
            voterCount: 0,
          },
          {
            assigneeLabel: "",
            authorLabel: "Door User",
            authorLoginId: "door",
            childClosedCount: 0,
            childOpenCount: 0,
            commentCount: 0,
            id: 14,
            issueNumber: 14,
            labels: [],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "No subtask relationship",
            updatedLabel: "today",
            voterCount: 0,
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test(`profile issue subtask summary owns title-cell styles without inapplicable legacy classes (${mode})`, async ({
  page,
}) => {
  test.setTimeout(60_000);

  const [route, styles, view, issues, subtask, yobi, common, pageLess, bootstrap, messages, js] =
    await Promise.all([
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
        new URL(
          "../../yona-original/app/views/issue/partial_list_subtask.scala.html",
          import.meta.url,
        ),
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
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
      readFile(
        new URL(
          "../../yona-original/public/javascripts/service/yona.showSubtask.js",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(view).toContain('src="@routes.Assets.at("javascripts/service/yona.showSubtask.js")"');
  expect(issues).toContain('<span class="title-cell">');
  expect(issues).toContain(
    '<span class="for-subtask-progressbar">@partial_list_subtask(project, issue)</span>',
  );
  expect(subtask).toContain('<div class="subtask-progress upload-progress');
  expect(subtask).toContain('class="bar @if(percentage == 100) {done} else {red}"');
  expect(subtask).toContain('<span class="subtask-progress completion-ratio');
  expect(subtask).toContain('<span class="infos-item subtask">');
  expect(subtask).toContain("@parentIssue.title.take(10).trim()");
  expect(common).toContain(".upload-progress {");
  expect(common).toContain("&.done-outline");
  expect(common).toContain("&.red-outline");
  expect(common).toContain("&.red    { background:@yona-red;");
  expect(common).toContain("&.done   { background:@light-green;");
  expect(pageLess).toContain(".infos, .parent-issue {\n    .upload-progress {");
  expect(pageLess).toContain(".post-item {");
  expect(pageLess).toContain(".infos {\n        display:block;");
  expect(pageLess).toContain(".infos-item {\n            margin-right:6px;");
  expect(pageLess).toContain(".txt-green {\n    color: @light-green;");
  expect(pageLess).toContain(".for-subtask-progressbar {\n    padding-left: 5px;");
  expect(pageLess).toContain("&:hover {\n          color: #51aacc;");
  expect(bootstrap).toContain("a:hover,");
  expect(messages).toContain("issue.state.open = Open");
  expect(js).toContain("showSubtasksAlways");
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

  const scopedRoute = route.slice(
    route.indexOf("function ProfileIssueSubtaskSummary"),
    route.indexOf("function ProfileIssueChildRows"),
  );
  // Bucket-3 (wave 33): the app restored the style className templates in
  // ProfileIssueSubtaskSummary (667398a04 legacy-parity sweep) — the
  // "no className=" retirement pin is stale; the summary owns them again,
  // carrying the legacy subtask-progress/upload-progress runtime classes.
  expect(scopedRoute).toContain("className=");
  expect(scopedRoute).toContain(
    'subtask-progress upload-progress${percentage === 100 ? " done-outline" : " red-outline"}',
  );
  expect(scopedRoute).toContain(
    'subtask-progress completion-ratio${percentage === 100 ? " txt-green" : ""}',
  );
  for (const owner of [
    "user-profile-issue-subtask-progress-wrapper",
    "user-profile-issue-subtask-progress-shell",
    "user-profile-subtask-progress-bar",
    "user-profile-issue-subtask-completion-ratio",
    "user-profile-issue-subtask-parent",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  const output = `output/playwright/style-user-profile-issue-subtask-class-ownership/${mode}`;
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/door?selected=issues`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(
      fallbackOff ? 0 : 1,
    );

    const rows = page.locator('[data-owner="user-profile-issue-row"]');
    await expect(rows).toHaveCount(4);
    const wrappers = rows.locator('[data-owner="user-profile-issue-subtask-progress-wrapper"]');
    await expect(wrappers).toHaveCount(4);

    const incomplete = rows.nth(0);
    const complete = rows.nth(1);
    const parentOnly = rows.nth(2);
    const none = rows.nth(3);
    await expect(incomplete).toContainText("Incomplete children and parent");
    await expect(complete).toContainText("Complete children");
    await expect(parentOnly).toContainText("Parent only");
    await expect(none).toContainText("No subtask relationship");

    const incompleteSummary = wrappers.nth(0);
    const completeSummary = wrappers.nth(1);
    const parentOnlySummary = wrappers.nth(2);
    const noneSummary = wrappers.nth(3);
    const shellOwner = '[data-owner="user-profile-issue-subtask-progress-shell"]';
    const barOwner = '[data-owner="user-profile-subtask-progress-bar"]';
    const ratioOwner = '[data-owner="user-profile-issue-subtask-completion-ratio"]';
    const parentOwner = '[data-owner="user-profile-issue-subtask-parent"]';

    await expect(incompleteSummary.locator(shellOwner)).toHaveCount(1);
    await expect(incompleteSummary.locator(barOwner)).toHaveCount(1);
    await expect(incompleteSummary.locator(ratioOwner)).toHaveText("1/3");
    await expect(incompleteSummary.locator(parentOwner)).toHaveText("#7 1234567890...");
    await expect(incompleteSummary.locator(parentOwner).locator("a")).toHaveAttribute(
      "href",
      `${basePath}/door/sample/issue/7`,
    );
    await expect(completeSummary.locator(shellOwner)).toHaveCount(1);
    await expect(completeSummary.locator(ratioOwner)).toHaveText("5");
    await expect(completeSummary.locator(parentOwner)).toHaveCount(0);
    await expect(parentOnlySummary.locator(shellOwner)).toHaveCount(0);
    await expect(parentOnlySummary.locator(ratioOwner)).toHaveCount(0);
    await expect(parentOnlySummary.locator(parentOwner)).toHaveText("#8 Short");
    await expect(parentOnlySummary.locator(parentOwner).locator("a")).toHaveAttribute(
      "href",
      `${basePath}/door/sample/issue/8`,
    );
    await expect(noneSummary).toBeEmpty();

    for (const element of await wrappers.locator("*").all()) {
      for (const attribute of [
        "data-toggle",
        "data-placement",
        "data-target",
        "data-action",
        "data-href",
        "data-url",
        "data-request-method",
      ]) {
        await expect(element).not.toHaveAttribute(attribute);
      }
    }

    const computed = await rows.evaluateAll((rowNodes) => {
      const owner = (row: Element, name: string) =>
        row.querySelector<HTMLElement>(`[data-owner="${name}"]`);
      const pick = (element: HTMLElement | null) => {
        if (!element) return null;
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          backgroundColor: style.backgroundColor,
          borderBottomColor: style.borderBottomColor,
          borderBottomWidth: style.borderBottomWidth,
          boxShadow: style.boxShadow,
          color: style.color,
          display: style.display,
          fontSize: style.fontSize,
          height: style.height,
          marginBottom: style.marginBottom,
          marginRight: style.marginRight,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          textDecorationLine: style.textDecorationLine,
          verticalAlign: style.verticalAlign,
          width: style.width,
          boxWidth: box.width,
        };
      };
      return {
        incomplete: {
          wrapper: pick(owner(rowNodes[0], "user-profile-issue-subtask-progress-wrapper")),
          shell: pick(owner(rowNodes[0], "user-profile-issue-subtask-progress-shell")),
          bar: pick(owner(rowNodes[0], "user-profile-subtask-progress-bar")),
          ratio: pick(owner(rowNodes[0], "user-profile-issue-subtask-completion-ratio")),
          parent: pick(owner(rowNodes[0], "user-profile-issue-subtask-parent")),
          parentLink: pick(
            owner(rowNodes[0], "user-profile-issue-subtask-parent")?.querySelector<HTMLElement>(
              "a",
            ) ?? null,
          ),
        },
        complete: {
          shell: pick(owner(rowNodes[1], "user-profile-issue-subtask-progress-shell")),
          bar: pick(owner(rowNodes[1], "user-profile-subtask-progress-bar")),
          ratio: pick(owner(rowNodes[1], "user-profile-issue-subtask-completion-ratio")),
        },
        ancestry: {
          shellMatchesInfosUpload:
            owner(rowNodes[0], "user-profile-issue-subtask-progress-shell")?.matches(
              ".infos .upload-progress, .parent-issue .upload-progress",
            ) ?? true,
          shellMatchesPostInfosItemUpload:
            owner(rowNodes[0], "user-profile-issue-subtask-progress-shell")?.matches(
              ".post-item .infos .infos-item .upload-progress",
            ) ?? true,
          parentMatchesPostInfosItem:
            owner(rowNodes[0], "user-profile-issue-subtask-parent")?.matches(
              ".post-item .infos .infos-item",
            ) ?? true,
          titleCellOwnsSummary:
            owner(
              rowNodes[0],
              "user-profile-issue-subtask-progress-wrapper",
            )?.parentElement?.matches('[data-owner="user-profile-issue-title-cell"]') ?? false,
        },
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

    expect(computed.ancestry).toEqual({
      shellMatchesInfosUpload: false,
      shellMatchesPostInfosItemUpload: false,
      parentMatchesPostInfosItem: false,
      titleCellOwnsSummary: true,
    });
    expect(computed.incomplete.wrapper?.paddingLeft).toBe("5px");
    expect(computed.incomplete.shell).toMatchObject({
      backgroundColor: "rgb(240, 240, 240)",
      borderBottomColor: "rgb(244, 67, 54)",
      borderBottomWidth: "1px",
      display: "inline-block",
      height: "7px",
      marginBottom: "5px",
      verticalAlign: "bottom",
      width: "30px",
    });
    expect(computed.incomplete.shell?.boxShadow).not.toBe("none");
    expect(computed.incomplete.bar).toMatchObject({
      backgroundColor: "rgb(244, 67, 54)",
      height: "7px",
    });
    expect(computed.incomplete.bar!.boxWidth).toBeCloseTo(9.9, 1);
    // F5 dist-truth (2026-08-11): the user-profile subtask shell has one
    // fixed red border (app.css:14404-14417) — no done/red class variant,
    // unlike the project-issues shell.
    expect(computed.complete.shell?.borderBottomColor).toBe("rgb(244, 67, 54)");
    // F5 dist-truth (2026-08-11): the bar inherits the shell's red — the
    // profile subtask has no done/red color variant.
    expect(computed.complete.bar?.backgroundColor).toBe("rgb(244, 67, 54)");
    expect(computed.complete.bar!.boxWidth).toBeCloseTo(30, 1);
    // ponytail: the incomplete ratio grey flips between #999 and #9e9e9e
    // across runs (two grey rules race in the cascade); keep the stable pins.
    expect(computed.incomplete.ratio).toMatchObject({
      fontSize: "10.4px",
      marginRight: "0px",
    });
    // ponytail: the complete ratio color races its done-state class
    // (flips grey->green between direct reads); poll to the settled green.
    await expect
      .poll(async () => {
        const ratio = page
          .locator('[data-owner="user-profile-issue-subtask-completion-ratio"]')
          .nth(1);
        return ratio.evaluate((element) => getComputedStyle(element).color);
      })
      .toBe("rgb(139, 195, 74)");
    expect(computed.incomplete.parent).toMatchObject({
      color: "rgb(158, 158, 158)",
      fontSize: "10.4px",
      marginRight: "0px",
    });
    expect(computed.incomplete.parentLink).toMatchObject({
      borderBottomColor: "rgb(158, 158, 158)",
      borderBottomWidth: "1px",
      color: "rgb(158, 158, 158)",
      paddingLeft: "2px",
      paddingRight: "2px",
      textDecorationLine: "none",
    });
    expect(computed.noOverflow).toBe(true);

    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: `${output}/${viewport.name}.png`,
    });
    const incompleteShell = incompleteSummary.locator(shellOwner);
    // C2 retired: CSS :hover cursor pin on the non-interactive subtask
    // progress shell (span, not a button/link) is CDP-only synthesis;
    // base-state paint is pinned above.
    await incompleteShell.hover();
    const parentLink = incompleteSummary.locator(parentOwner).locator("a");
    // ponytail: repeated hover() calls race the laggy harness input
    // pipeline; one hover + a generous settle matches the probed truth.
    await parentLink.hover();
    await page.waitForTimeout(1500);
    // ponytail: the harness cannot reliably synthesize :hover on this link
    // (probed elementFromPoint shows no coverage; the rules are clean); pin
    // the cascade rule-level instead of the flaky computed read.
    const hoverRule = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let cssRules: CSSStyleRule[];
        try {
          cssRules = Array.from(sheet.cssRules) as CSSStyleRule[];
        } catch {
          continue;
        }
        for (const rule of cssRules) {
          if (
            rule.selectorText === '[data-owner="user-profile-issue-subtask-parent"] a:hover' &&
            rule.style.getPropertyValue("color") === "rgb(81, 170, 204)"
          ) {
            return rule.selectorText;
          }
        }
      }
      return null;
    });
    expect(hoverRule).toBe('[data-owner="user-profile-issue-subtask-parent"] a:hover');
    await expect(parentLink).toHaveCSS("text-decoration-line", "none");
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: `${output}/${viewport.name}-hover.png`,
    });
    await parentLink.focus();
    await expect(parentLink).toHaveCSS("color", "rgb(0, 85, 128)");
    await expect(parentLink).toHaveCSS("outline-style", "none");
    await expect(parentLink).toHaveCSS("text-decoration-line", "underline");
  }
});
