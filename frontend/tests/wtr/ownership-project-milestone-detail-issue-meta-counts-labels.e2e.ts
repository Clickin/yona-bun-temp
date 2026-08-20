import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const mode = "normal";
const screenshotDirectory = resolve(
  "output/playwright/style-project-milestone-detail-issue-meta-counts-labels",
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

test(`milestone issue metadata counts and labels parity (${mode})`, async ({ page }) => {
  const routeSource = readFileSync(
    "src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx",
    "utf8",
  );
  const styleSource = readFileSync("src/app.css", "utf8");
  const view = readFileSync("../yona-original/app/views/milestone/view.scala.html", "utf8");
  const issuePartial = readFileSync(
    "../yona-original/app/views/issue/partial_list.scala.html",
    "utf8",
  );
  const commentCount = readFileSync(
    "../yona-original/app/views/common/commentCount.scala.html",
    "utf8",
  );
  const voteCount = readFileSync("../yona-original/app/views/common/voteCount.scala.html", "utf8");
  const sharerCount = readFileSync(
    "../yona-original/app/views/common/sharerCount.scala.html",
    "utf8",
  );
  const yobiLess = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
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
  expect(issuePartial).toContain('class="infos"');
  expect(issuePartial).toContain('class="mileston-tag"');
  expect(issuePartial).toContain('class="infos-item item-count-groups"');
  expect(issuePartial).toContain("@views.html.common.commentCount");
  expect(issuePartial).toContain("@views.html.common.voteCount");
  expect(issuePartial).toContain("@views.html.common.sharerCount");
  expect(commentCount).toContain(
    'class="comments-count @if(showColorAlways){comments-count-color}"',
  );
  expect(voteCount).toContain('class="vote-count @if(showColorAlways){vote-color}"');
  expect(sharerCount).toContain('class="@if(showColorAlways){sharer-color}"');
  for (const countPartial of [commentCount, voteCount, sharerCount]) {
    expect(countPartial).toContain('class="count-groups item-icon"');
    expect(countPartial).toContain('class="count-groups item-count');
  }
  for (const imported of legacyImportChain) {
    expect(yobiLess).toContain(`@import "less/${imported}"`);
    expect(
      readFileSync(`../yona-original/app/assets/stylesheets/less/${imported}`, "utf8"),
    ).not.toBe("");
  }
  expect(pageLess).toContain(".item-count-groups {");
  expect(pageLess).toContain("border:1px solid #EEE;");
  expect(pageLess).toContain("line-height: 14px;");
  expect(pageLess).toContain("margin-top:2px;");
  expect(pageLess).toContain("a:nth-child(2)");
  expect(pageLess).toContain("a:nth-child(3)");
  expect(pageLess).toContain("font-size: 9px;");
  expect(bootstrap).toContain(".row-fluid");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const message of ["milestone = Milestone", "issue.sharer = Issue Sharer"]) {
    expect(messages).toContain(message);
  }
  expect(milestoneJs).toContain("yobi.milestone.View");

  expect(routeSource).toContain('data-owner="milestone-detail-issue-count-groups"');
  expect(routeSource).toContain('data-owner="milestone-detail-issue-label"');
  expect(routeSource).toContain('hash="comments"');
  expect(routeSource).toContain('hash="vote"');
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
    await page.goto(`${basePath}/admin/sample/milestone/1`, { waitUntil: "commit" });
    const row = page.locator('[data-owner="milestone-detail-issue-row"]').first();
    const infos = row.locator('[data-owner="milestone-detail-issue-infos"]');
    const counts = row.locator('[data-owner="milestone-detail-issue-count-groups"]');
    const comment = row.locator('[data-owner="milestone-detail-issue-comments-count"]');
    const vote = row.locator('[data-owner="milestone-detail-issue-vote-count"]');
    const sharer = row.locator('[data-owner="milestone-detail-issue-sharer-count"]');
    const label = row.locator('[data-owner="milestone-detail-issue-label"]');
    const milestone = row.locator('[data-owner="milestone-detail-issue-milestone-link"]');
    await expect(counts).toBeVisible();
    await expect(comment).toHaveAttribute("href", `${basePath}/admin/sample/issue/42#comments`);
    await expect(vote).toHaveAttribute("href", `${basePath}/admin/sample/issue/42#vote`);
    await expect(comment).toContainText("3");
    await expect(vote).toContainText("2");
    await expect(sharer).toContainText("1");
    await expect(sharer).toHaveAttribute("title", "Issue Sharer");
    await expect(milestone).toHaveText("Sprint 1");
    await expect(milestone).toHaveAttribute("title", "Milestone");
    await expect(label).toHaveText("Bug");
    await expect(label).toHaveClass(/issue-label/u);
    await expect(label).toHaveCSS("background-color", "rgb(81, 170, 204)");

    const icon = counts.locator('[data-owner="milestone-detail-issue-count-icon"]').first();
    const secondIcon = counts.locator('[data-owner="milestone-detail-issue-count-icon"]').nth(1);
    const value = counts.locator('[data-owner="milestone-detail-issue-count-value"]').first();
    await expect(counts).toHaveCSS("border-width", "1px");
    await expect(counts).toHaveCSS("border-style", "solid");
    await expect(counts).toHaveCSS("border-color", "rgb(238, 238, 238)");
    await expect(counts).toHaveCSS("border", "1px solid rgb(238, 238, 238)");
    await expect(counts).toHaveCSS("border-radius", "3px");
    await expect(counts).toHaveCSS("line-height", "14px");
    await expect(counts).toHaveCSS("margin-top", "2px");
    await expect(comment).toHaveCSS("color", "rgb(139, 0, 139)");
    await expect(vote).toHaveCSS("color", "rgb(255, 165, 0)");
    await expect(sharer).toHaveCSS("color", "rgb(0, 127, 202)");
    await expect(vote).toHaveCSS("margin-left", "-5px");
    await expect(sharer).toHaveCSS("margin-left", "-5px");
    await expect(icon).toHaveCSS("display", "inline-block");
    await expect(icon).toHaveCSS("padding", "2px 5px 0px");
    await expect(icon).toHaveCSS("font-size", "9px");
    await expect(icon).toHaveCSS("line-height", "12px");
    await expect(icon).toHaveCSS("border-left-width", "1px");
    await expect(icon).toHaveCSS("border-left-style", "solid");
    await expect(secondIcon).toHaveCSS("border-left-width", "1px");
    await expect(secondIcon).toHaveCSS("border-left-style", "solid");
    await expect(value).toHaveCSS("display", "inline-block");
    await expect(value).toHaveCSS("padding", "0px 5px 0px 0px");

    const geometry = await page.evaluate(() => {
      const box = (selector: string) => {
        const element = document.querySelector<HTMLElement>(selector)!;
        const rect = element.getBoundingClientRect();
        return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
      };
      return {
        counts: box('[data-owner="milestone-detail-issue-count-groups"]'),
        documentWidth: document.documentElement.scrollWidth,
        infos: box('[data-owner="milestone-detail-issue-infos"]'),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.counts.left).toBeGreaterThanOrEqual(geometry.infos.left - 1);
    expect(geometry.counts.right).toBeLessThanOrEqual(geometry.infos.right + 1);

    await label.click();
    await expect(page).toHaveURL(`${basePath}/admin/sample/issues?labelIds=9&milestoneId=1`);
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
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
          openIssueCount: 1,
          openMilestones: [],
          projectLabels: [],
          state: "open",
          title: "v1.0",
          openIssues: [
            {
              authorLabel: "Admin",
              authorLoginId: "admin",
              commentCount: 3,
              createdLabel: "2026-07-01",
              createdTitle: "2026-07-01",
              id: "42",
              issueNumber: "42",
              labels: [{ categoryId: "4", color: "#51aacc", id: "9", name: "Bug" }],
              milestoneId: "1",
              milestoneTitle: "Sprint 1",
              sharerCount: 1,
              state: "open",
              title: "Counts and labels",
              voterCount: 2,
            },
          ],
          viewerCanDelete: true,
          viewerCanUpdate: true,
        },
      },
    }),
  );
}
