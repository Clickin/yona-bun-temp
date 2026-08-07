import { readFile } from "../wtr-compat.ts";
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
            assigneeLabel: "Viewer",
            assigneeLoginId: "viewer",
            authorLabel: "Door User",
            authorLoginId: "door",
            childIssues: [],
            commentCount: 2,
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
            title: "Parent issue title",
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

test(`profile issue title rail owns exact legacy presentation (${mode})`, async ({ page }) => {
  test.setTimeout(60_000);
  expect(process.env.PW_CHANNEL).toBe("chrome");

  const [
    route,
    styles,
    view,
    issues,
    yobi,
    common,
    pageLess,
    responsive,
    yobiUi,
    variables,
    mixins,
    bootstrap,
    bootstrapResponsive,
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
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_mixins.less", import.meta.url),
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
    readFile(new URL(import.meta.url), "utf8"),
  ]);

  expect(view).toContain("@partial_issues(issue)");
  expect(issues).toContain('class="span2 project-name-in-my-issues fixed-height-my-issues-list"');
  expect(issues).toContain('class="infos-item project-name"');
  expect(issues).toContain('class="title project"');
  expect(issues).toContain('class="infos-item post-id"');
  expect(issues).toContain('class="title-wrap span5"');
  expect(issues).toContain('class="title-cell"');
  expect(issues).toContain('class="title"');
  expect(common).toContain(".fixed-height-my-issues-list");
  expect(pageLess).toContain(".project-name-in-my-issues");
  expect(pageLess).toContain(".my-issues");
  expect(pageLess).toContain(".title-wrap");
  expect(pageLess).toContain(".title-cell");
  expect(pageLess).toContain(".post-id");
  expect(responsive).toContain("&.project");
  expect(yobiUi).toContain(".issue-label");
  expect(variables).toContain("@base-font-family");
  expect(mixins).toContain(".border-radius");
  expect(bootstrap).toContain(".row-fluid .span5");
  expect(bootstrapResponsive).toContain('[class*="span"]');
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
  expect(focusedTest).not.toContain(["page", "addStyleTag"].join("."));

  for (const owner of [
    "user-profile-issue-project-name",
    "user-profile-issue-project-link",
    "user-profile-issue-post-id",
    "user-profile-issue-title-wrap",
    "user-profile-issue-title-cell",
    "user-profile-issue-title-link",
  ]) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(styles).toContain("issueProjectLink:");
  // Bucket-3 (wave 33): the app's legacy-parity restore (667398a04) retains
  // the issue-rail runtime classes — assert retention.
  expect(route).toMatch(/className=.*infos-item project-name/u);
  expect(route).toMatch(/className=.*title project/u);
  expect(route).toMatch(/className=.*infos-item post-id/u);
  expect(route).toMatch(/className=.*title-wrap/u);
  expect(route).toMatch(/className=.*title-cell/u);
  expect(route).toMatch(/data-stylex-owner="user-profile-issue-title-link"/u);
  expect(route).toMatch(/issueTitleLink\)\.className\} title`/u);

  const output = `output/playwright/stylex-user-profile-issue-title-rail-ownership/${mode}`;
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

    const row = page.locator('[data-stylex-owner="user-profile-issue-row"]');
    const projectName = row.locator('[data-stylex-owner="user-profile-issue-project-name"]');
    const projectLink = row.locator('[data-stylex-owner="user-profile-issue-project-link"]');
    const postId = row.locator('[data-stylex-owner="user-profile-issue-post-id"]');
    const titleWrap = row.locator('[data-stylex-owner="user-profile-issue-title-wrap"]');
    const titleCell = row.locator('[data-stylex-owner="user-profile-issue-title-cell"]');
    const titleLink = row.locator('[data-stylex-owner="user-profile-issue-title-link"]');

    await expect(row).toHaveAttribute("id", "issue-item-11");
    await expect(row).toHaveAttribute("href", `${basePath}/door/sample/issue/11`);
    await expect(projectName).toHaveText("sample");
    await expect(postId).toHaveText("#11");
    await expect(titleLink).toHaveText("Parent issue title");
    await expect(projectLink).toHaveAttribute("href", `${basePath}/door/sample`);
    await expect(projectLink).toHaveAttribute("title", "Project name");
    await expect(titleLink).toHaveAttribute("href", `${basePath}/door/sample/issue/11`);
    await expect(projectLink).not.toHaveAttribute("data-toggle");
    await expect(projectLink).not.toHaveAttribute("data-placement");
    // Bucket-3 (wave 33): the rail elements retain their legacy classes
    // (667398a04 parity restore) — assert retention.
    await expect(projectName).toHaveClass(/(?:^|\s)infos-item(?:\s|$)/u);
    await expect(projectName).toHaveClass(/(?:^|\s)project-name(?:\s|$)/u);
    await expect(projectLink).toHaveClass(/(?:^|\s)title(?:\s|$)/u);
    await expect(projectLink).toHaveClass(/(?:^|\s)project(?:\s|$)/u);
    await expect(postId).toHaveClass(/(?:^|\s)infos-item(?:\s|$)/u);
    await expect(postId).toHaveClass(/(?:^|\s)post-id(?:\s|$)/u);
    await expect(titleWrap).toHaveClass(/(?:^|\s)title-wrap(?:\s|$)/u);
    await expect(titleCell).toHaveClass(/(?:^|\s)title-cell(?:\s|$)/u);
    await expect(titleLink).toHaveClass(/(?:^|\s)title(?:\s|$)/u);

    expect(
      await row
        .locator(
          ":scope > [data-stylex-owner='user-profile-issue-grid-content'] > [data-stylex-owner]",
        )
        .evaluateAll((elements) =>
          elements.map((element) => element.getAttribute("data-stylex-owner")),
        ),
    ).toEqual([
      "user-profile-issue-project-name-wrapper",
      "user-profile-issue-title-wrap",
      "user-profile-issue-author",
      "user-profile-issue-author",
      "user-profile-issue-meta",
    ]);
    await expect(row.locator('[data-stylex-owner="user-profile-parent-issue-label"]')).toHaveText(
      "Parent label",
    );
    await expect(row.locator('[data-stylex-owner="user-profile-issue-author"]').first()).toHaveText(
      "Door User",
    );
    await expect(row.locator('[data-stylex-owner="user-profile-issue-meta"]')).toContainText(
      "today",
    );

    const presentation = await page.evaluate(() => {
      const owner = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const result = Object.fromEntries(
        [
          "user-profile-issue-project-name-wrapper",
          "user-profile-issue-project-name",
          "user-profile-issue-project-link",
          "user-profile-issue-post-id",
          "user-profile-issue-title-wrap",
          "user-profile-issue-title-cell",
          "user-profile-issue-title-link",
        ].map((name) => {
          const element = owner(name);
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return [
            name,
            {
              box: {
                bottom: box.bottom,
                height: box.height,
                left: box.left,
                right: box.right,
                top: box.top,
                width: box.width,
              },
              color: style.color,
              display: style.display,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              marginRight: style.marginRight,
              marginTop: style.marginTop,
              overflow: style.overflow,
              padding: style.padding,
              textDecoration: style.textDecorationLine,
              textOverflow: style.textOverflow,
              verticalAlign: style.verticalAlign,
              whiteSpace: style.whiteSpace,
            },
          ];
        }),
      );
      return {
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        result,
      };
    });

    expect(presentation.documentOverflow).toBe(0);
    expect(presentation.result["user-profile-issue-project-name-wrapper"]).toMatchObject({
      display: "flex",
      lineHeight: "36px",
    });
    expect(presentation.result["user-profile-issue-project-name"]).toMatchObject({
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    expect(presentation.result["user-profile-issue-post-id"]).toMatchObject({
      color: "rgb(153, 153, 153)",
      fontSize: "12px",
      fontWeight: "400",
      marginRight: "5px",
    });
    expect(presentation.result["user-profile-issue-title-wrap"]).toMatchObject({
      display: viewport.name === "mobile" ? "block" : "table",
      marginTop: "2px",
      overflow: viewport.name === "mobile" ? "auto" : "visible",
      whiteSpace: "normal",
    });
    expect(presentation.result["user-profile-issue-title-cell"]).toMatchObject({
      display: "table-cell",
      padding: "5px 0px",
      verticalAlign: "middle",
    });
    expect(presentation.result["user-profile-issue-title-link"]).toMatchObject({
      color: "rgb(51, 51, 51)",
      fontSize: viewport.name === "mobile" ? "16px" : "14px",
      fontWeight: "500",
      textDecoration: "none",
    });

    const boxes = presentation.result;
    expect(boxes["user-profile-issue-project-name"].box.left).toBeGreaterThanOrEqual(
      boxes["user-profile-issue-project-name-wrapper"].box.left,
    );
    expect(boxes["user-profile-issue-post-id"].box.right).toBeLessThanOrEqual(
      boxes["user-profile-issue-project-name-wrapper"].box.right,
    );
    expect(boxes["user-profile-issue-title-cell"].box.top).toBe(
      boxes["user-profile-issue-title-wrap"].box.top,
    );
    expect(boxes["user-profile-issue-title-link"].box.left).toBe(
      boxes["user-profile-issue-title-cell"].box.left,
    );
    expect(boxes["user-profile-issue-title-link"].box.bottom).toBeLessThanOrEqual(
      boxes["user-profile-issue-title-cell"].box.bottom,
    );

    await page.screenshot({
      path: `${output}/profile-issue-title-rail-${viewport.name}.png`,
      fullPage: true,
    });

    await titleLink.click();
    await expect(page).toHaveURL(new RegExp(`${basePath}/door/sample/issue/11$`, "u"));
    await page.goBack({ waitUntil: "domcontentloaded" });
  }
});
