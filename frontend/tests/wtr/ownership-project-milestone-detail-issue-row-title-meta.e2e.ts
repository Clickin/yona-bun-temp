import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const mode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-milestone-detail-issue-row-title-meta",
  mode,
);
const legacyImportChain = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
] as const;

test.use({ locale: "en-US" });

test(`authenticated milestone issue row title/meta parity (${mode})`, async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const styleSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const view = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const issuePartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const bootstrapResponsive = readFileSync(
    "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");
  const milestoneJs = readFileSync(
    "../yona-original/public/javascripts/service/yobi.milestone.View.js",
    "utf8",
  );

  expect(view).toMatch(/issue\.partial_list\(project,\s*milestone/su);
  expect(view).toContain('data-toggle="item-search"');
  expect(issuePartial).toContain('<ul class="post-list-wrap row-fluid">');
  expect(issuePartial).toContain('class="post-item title"');
  expect(issuePartial).toContain('class="issue-item-row"');
  expect(issuePartial).toContain('class="title-wrap"');
  expect(issuePartial).toContain('class="post-id"');
  expect(issuePartial).toContain('class="infos"');
  expect(issuePartial).toContain('class="infos-item"');
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  expect(pageLess).toContain(".post-item {");
  expect(pageLess).toContain(".title-wrap {");
  expect(pageLess).toContain(".infos {");
  expect(pageLess).toContain(".issue-item-row {");
  expect(responsiveLess).toContain(".post-item {\n      padding: 10px 0 !important;");
  expect(bootstrap).toContain(".row-fluid");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const message of [
    "milestone.searchPlaceholder = search at current milestone",
    "issue.noAuthor = No author",
    "issue.dueDate.overdue = Overdue",
  ])
    expect(messages).toContain(message);
  expect(milestoneJs).toContain("yobi.milestone.View");

  expect(routeSource).toContain('data-owner="milestone-detail-issue-title-wrap"');
  expect(routeSource).toContain('data-owner="milestone-detail-issue-post-id"');
  expect(routeSource).toContain('data-owner="milestone-detail-issue-infos"');
  expect(routeSource).toContain("onTitlePrefixSearch");

  expect(routeSource).not.toMatch(
    /data-(?:toggle|placement|action|href|url|request-|dismiss|target|trigger|backdrop|spy|provider|loading-text)/u,
  );

  await mockMilestone(page);
  mkdirSync(screenshotDirectory, { recursive: true });
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/milestone/1`, {
      waitUntil: "commit",
    });
    const rows = page.locator('[data-owner="milestone-detail-issue-row"]');
    await expect(rows).toHaveCount(2);
    const first = rows.nth(0);
    const titleWrap = first.locator('[data-owner="milestone-detail-issue-title-wrap"]');
    const postId = first.locator('[data-owner="milestone-detail-issue-post-id"]');
    const titleLinks = first.locator('[data-owner="milestone-detail-issue-title-link"]');
    const infos = first.locator('[data-owner="milestone-detail-issue-infos"]');
    await expect(titleLinks).toHaveCount(2);
    await expect(titleLinks.nth(0)).toHaveAttribute("href", `${basePath}/admin/sample/issue/42`);
    await expect(titleLinks.nth(1)).toHaveText("Fix populated issue");
    await expect(first).toContainText("Admin");
    await expect(
      first.locator('[data-owner="milestone-detail-issue-infos-item"]').nth(1),
    ).toHaveAttribute("title", "2026-07-01");
    await expect(first).toContainText("v1.0");
    await expect(first).toContainText("Release");
    await expect(first).toContainText("2");
    await expect(rows.nth(1)).toContainText("No author");
    await expect(first.locator(".title-prefix")).toHaveText("[Bug]");
    await expect(first).toContainText("8 days left");
    const assigneeRail = first.locator('[data-owner="milestone-detail-issue-assignee-rail"]');
    if (viewport.width === 390) {
      await expect(assigneeRail).toBeHidden();
    } else {
      await expect(assigneeRail).toBeVisible();
    }

    const expectedHorizontalPadding =
      mode === "fallback-off" || viewport.width > 720 ? "10px" : "0px";
    await expect(first).toHaveCSS("padding-right", expectedHorizontalPadding);
    await expect(first).toHaveCSS("padding-left", expectedHorizontalPadding);
    const computed = await page.evaluate(() => {
      const get = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector)!;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          marginRight: style.marginRight,
          paddingBottom: style.paddingBottom,
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          paddingTop: style.paddingTop,
          right: rect.right,
          top: rect.top,
          width: rect.width,
          color: style.color,
          display: style.display,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          overflow: style.overflow,
          position: style.position,
          textOverflow: style.textOverflow,
          whiteSpace: style.whiteSpace,
        };
      };
      return {
        documentWidth: document.documentElement.scrollWidth,
        infos: get('[data-owner="milestone-detail-issue-infos"]'),
        item: get('[data-owner="milestone-detail-issue-row"]'),
        postId: get('[data-owner="milestone-detail-issue-post-id"]'),
        title: get('[data-owner="milestone-detail-issue-title-link"]'),
        titleWrap: get('[data-owner="milestone-detail-issue-title-wrap"]'),
        viewportWidth: window.innerWidth,
      };
    });
    expect(computed.item.paddingTop).toBe("10px");
    expect(computed.item.paddingBottom).toBe("10px");
    expect(computed.item.paddingRight).toBe(expectedHorizontalPadding);
    expect(computed.item.paddingLeft).toBe(expectedHorizontalPadding);
    expect(computed.titleWrap.display).toBe("block");
    expect(computed.titleWrap.lineHeight).toBe("20px");
    expect(computed.titleWrap.textOverflow).toBe("ellipsis");
    expect(computed.titleWrap.whiteSpace).toBe("nowrap");
    expect(computed.postId.color).toBe("rgb(153, 153, 153)");
    expect(computed.postId.marginRight).toBe("5px");
    expect(computed.postId.fontSize).toBe("13px");
    expect(computed.postId.fontWeight).toBe("700");
    expect(computed.title.fontSize).toBe("15px");
    expect(computed.title.fontWeight).toBe("600");
    expect(computed.infos.display).toBe("block");
    expect(computed.infos.fontSize).toBe("12px");
    expect(computed.infos.color).toBe("rgb(153, 153, 153)");
    expect(computed.infos.overflow).toBe("hidden");
    expect(computed.documentWidth).toBeLessThanOrEqual(computed.viewportWidth);
    expect(computed.item.right).toBeLessThanOrEqual(computed.viewportWidth + 1);

    await first.locator(".title-prefix").click();
    await expect(page.locator('input[name="filter"]')).toHaveValue("[Bug]");
    await expect(first).toBeVisible();
    await expect(rows.nth(1)).toBeHidden();
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockMilestone(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        members: [{ loginId: "admin" }],
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        milestone: {
          assignableUsers: [],
          attachments: [],
          closedIssues: [],
          closedIssueCount: 0,
          completionPercent: 50,
          contentsMarkdown: "Details",
          id: "1",
          openIssueCount: 2,
          openMilestones: [],
          projectLabels: [],
          state: "open",
          title: "v1.0",
          openIssues: [
            {
              authorLabel: "Admin",
              authorLoginId: "admin",
              commentCount: 2,
              createdLabel: "2026-07-01",
              createdTitle: "2026-07-01",
              dueDateLabel: "2026-07-30",
              dueDateText: "8 days left",
              dueDateOverdue: false,
              id: "42",
              issueNumber: "42",
              labels: [
                {
                  id: "7",
                  name: "Release",
                  categoryId: "1",
                  color: "#51aacc",
                },
              ],
              milestoneId: "1",
              milestoneTitle: "v1.0",
              state: "open",
              title: "[Bug] Fix populated issue",
            },
            {
              authorLabel: "",
              authorLoginId: "",
              createdLabel: "2026-07-02",
              createdTitle: "2026-07-02",
              id: "43",
              issueNumber: "43",
              labels: [],
              state: "open",
              title: "[Docs] No-author issue",
            },
          ],
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      },
    }),
  );
}
