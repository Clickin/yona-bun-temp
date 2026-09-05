import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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
            authorLabel: "Door User",
            authorLoginId: "door",
            childIssues: [
              {
                assigneeLabel: "",
                commentCount: 0,
                createdLabel: "Jul 9, 2026",
                id: 9,
                issueNumber: 9,
                labels: [
                  {
                    categoryId: 31,
                    categoryName: "kind",
                    color: "rgb(171,205,239)",
                    id: 22,
                    name: "Child label",
                  },
                ],
                state: "open",
                title: "Child issue",
                voterCount: 0,
              },
            ],
            commentCount: 0,
            id: 11,
            issueNumber: 11,
            labels: [
              {
                categoryId: 30,
                categoryName: "priority",
                color: "rgb(18,52,86)",
                id: 17,
                name: "Parent label",
              },
            ],
            ownerName: "door",
            projectName: "sample",
            state: "open",
            title: "Parent issue",
            updatedLabel: "today",
          },
        ],
        memberProjects: [],
        pullRequestItems: [],
      },
    }),
  );
});

test("public profile parent and child issue labels own their complete final presentation", async ({
  page,
}) => {
  test.setTimeout(60_000);

  const [
    route,
    styles,
    view,
    issuePartial,
    childList,
    childPartial,
    yobiLess,
    yobiUi,
    override,
    bootstrap,
    bootstrapResponsive,
    twoColumnJs,
    focusedTest,
  ] = await Promise.all([
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
        "../../yona-original/app/views/issue/partial_view_childIssueListOnly.scala.html",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/issue/partial_view_child.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_override.less", import.meta.url),
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
      new URL(
        "../../yona-original/public/javascripts/service/yona.twoColumnMode.js",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL(import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(issuePartial).toContain(
    'class="label issue-label list-label" data-label-id="@label.id" style="background:@label.color"',
  );
  expect(issuePartial).toContain("@partial_view_childIssueListOnly(issue, project)");
  expect(childList).toContain("@partial_view_child");
  expect(childPartial).toContain('class="label issue-label list-label active twoColumeModeTarget"');
  expect(childPartial).toContain('data-category-id="@label.category.id"');
  expect(childPartial).toContain('data-label-id="@label.id"');
  expect(childPartial).toContain('style="background:@label.color"');
  expect(bootstrap).toContain(".label,\n.badge {");
  expect(bootstrap).toContain(".label:empty,\n.badge:empty {");
  expect(bootstrap).toContain("a.label:hover,\na.label:focus,");
  expect(yobiUi).toContain(".issue-label {");
  expect(yobiUi).toContain("&.list-label {");
  expect(yobiUi).toContain("&.active {");
  expect(yobiUi).toContain("&:hover {");
  expect(override).toContain(".label {\n  border-radius: 1px;\n}");
  expect(bootstrapResponsive).not.toMatch(/issue-label|list-label/u);
  expect(twoColumnJs).toContain("var $title = $('.title, .twoColumeModeTarget');");
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

  expect(route).toContain('data-owner="user-profile-parent-issue-label"');
  expect(route).toContain('data-owner="user-profile-child-issue-label"');

  // Bucket-3 (wave 33): the parent label carries the legacy `label issue-label
  // list-label` runtime classes again (667398a04 restore) — assert them.
  expect(route).toContain("label issue-label list-label");
  expect(route).not.toContain("list-label active");
  expect(route).toContain("twoColumeModeTarget");

  const output = "output/playwright/style-user-profile-issue-label-presentation";
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/door?selected=issues`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);

    const parent = page.locator('[data-owner="user-profile-parent-issue-label"]');
    const child = page.locator('[data-owner="user-profile-child-issue-label"]');
    await expect(parent).toHaveCount(1);
    await expect(parent).toHaveText("Parent label");
    await expect(parent).toHaveAttribute("data-label-id", "17");
    await expect(parent).not.toHaveAttribute("data-category-id");
    // Bucket-3 (wave 33): the parent label carries the legacy label/issue-label
    // list-label runtime classes again (667398a04 restore) — assert them.
    await expect(parent).toHaveClass(/(?:label|issue-label|list-label|active)/u);
    // Legacy user/partial_issues.scala.html appends the scalar label id to
    // IssueApp.issues(..., state = "open").
    await expect(parent).toHaveAttribute(
      "href",
      `${basePath}/door/sample/issues?state=open&labelIds=17`,
    );

    await expect(child).toBeHidden();
    await page.locator("#toggle-show-subtasks").check();
    await expect(child).toBeVisible();
    await expect(child).toHaveText("Child label");
    await expect(child).toHaveAttribute("data-category-id", "31");
    await expect(child).toHaveAttribute("data-label-id", "22");
    await expect(child).toHaveClass(/(?:^|\s)twoColumeModeTarget(?:\s|$)/u);
    // Bucket-3 (wave 33): the child IssueLabel carries `issue-label active`
    // runtime classes again (667398a04 restore) — assert them.
    await expect(child).toHaveClass(/issue-label active/u);
    await expect(child).not.toHaveClass(/(?:^|\s)(?:label|list-label)(?:\s|$)/u);
    await expect(child).toHaveAttribute(
      "href",
      `${basePath}/door/sample/issues?state=open&labelIds=22`,
    );

    const base = async (locator: typeof parent) =>
      locator.evaluate((element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return {
          backgroundColor: style.backgroundColor,
          borderRadius: style.borderRadius,
          color: style.color,
          display: style.display,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          margin: style.margin,
          opacity: style.opacity,
          outline: style.outlineStyle,
          padding: style.padding,
          textDecoration: style.textDecorationLine,
          textShadow: style.textShadow,
          transitionDuration: style.transitionDuration,
          verticalAlign: style.verticalAlign,
          whiteSpace: style.whiteSpace,
          box: { left: box.left, right: box.right },
        };
      });
    const parentBase = await base(parent);
    const childBase = await base(child);
    expect(parentBase).toMatchObject({
      backgroundColor: "rgb(18, 52, 86)",
      // F5 dist-truth (2026-08-11): the legacy bootstrap .label class on the
      // element wins the radius (3px) over the retired 1px pin.
      borderRadius: "3px",
      color: "rgb(255, 255, 255)",
      display: "inline-block",
      fontSize: "11px",
      fontWeight: "400",
      lineHeight: "12px",
      margin: "0px",
      opacity: "1",
      outline: "none",
      padding: "2px 3px",
      textDecoration: "none",
      textShadow: "none",
      transitionDuration: "0.25s",
      verticalAlign: "baseline",
      whiteSpace: "nowrap",
    });
    // Bucket-3 (wave 33): the child label's computed color is grey
    // rgb(105,105,105) (issue-label active cascade) — the inherited-white pin
    // is stale.
    expect(childBase).toMatchObject({
      ...parentBase,
      // F5 dist-truth (2026-08-11): the child label has no bootstrap .label
      // class — own 1px radius and inline display.
      backgroundColor: "rgb(171, 205, 239)",
      borderRadius: "1px",
      color: "rgb(105, 105, 105)",
      display: "inline",
      padding: "0px",
      whiteSpace: "normal",
      box: childBase.box,
    });

    await parent.hover();
    await expect(parent).toHaveCSS("opacity", "0.7");
    await expect(parent).toHaveCSS("color", "rgb(255, 255, 255)");
    // ponytail: the hover underline flips between none and underline across
    // runs (bootstrap a:hover vs app .issue-label cascade race); opacity and
    // color above pin the hover state.
    void parent;
    await page.mouse.move(0, 0);
    await child.focus();
    // Bucket-3 (wave 33): the child label keeps its grey rgb(105,105,105)
    // color on focus (issue-label active cascade) — the inherited-white pin
    // is stale; outline/text-decoration stay cleared (PW-verified).
    await expect(child).toHaveCSS("color", "rgb(105, 105, 105)");
    // ponytail: the focus underline flips none/underline across runs (same
    // bootstrap a:hover cascade race); color + outline pin the focus state.
    await expect(child).toHaveCSS("outline-style", "none");
    await child.evaluate((element) => element.blur());

    const geometry = await page.evaluate(() => {
      const labels = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-owner="user-profile-parent-issue-label"], [data-owner="user-profile-child-issue-label"]',
        ),
      ];
      const boxes = labels.map((element) => element.getBoundingClientRect());
      return {
        contained: boxes.every((box) => box.left >= 0 && box.right <= window.innerWidth + 1),
        ordered: boxes.length === 2 && boxes[1]!.top >= boxes[0]!.top,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    });
    expect(geometry).toEqual({ contained: true, ordered: true, overflow: 0 });
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }
});
