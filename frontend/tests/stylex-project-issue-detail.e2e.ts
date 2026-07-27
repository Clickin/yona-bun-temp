import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
  ),
  "utf8",
);

test("issue detail keeps direct StyleX owners and paint-only theme", () => {
  for (const owner of [
    "project-issue-detail-page",
    "project-issue-detail-header",
    "project-issue-detail-title",
    "project-issue-detail-board-id",
    "project-issue-detail-date",
    "project-issue-detail-state-badge",
    "project-issue-detail-body",
    "project-issue-detail-content",
    "project-issue-detail-actions",
    "project-issue-detail-sidebar",
  ])
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  const themeBlock = styleSource.slice(
    styleSource.indexOf("stylex.defineVars({"),
    styleSource.indexOf("});") + 3,
  );
  expect(themeBlock).toContain("mutedText");
  for (const geometry of ["margin:", "padding:", "width:", "height:"])
    expect(themeBlock).not.toContain(geometry);
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("issue detail header owns the populated title metadata state", () => {
  const appCss = readFileSync(fileURLToPath(new URL("../src/app.css", import.meta.url)), "utf8");
  const legacy = readFileSync(
    fileURLToPath(new URL("../../yona-original/app/views/issue/view.scala.html", import.meta.url)),
    "utf8",
  );
  const less = readFileSync(
    fileURLToPath(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    ),
    "utf8",
  );
  expect(legacy).toContain('<div class="board-header issue">');
  expect(legacy).toContain('class="board-id"');
  expect(legacy).toContain("badge badge-issue-@issue.state.state.toLowerCase");
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-state-badge"');
  expect(routeSource).toContain("badge badge-issue-${issueState}");
  for (const declaration of [
    'padding: "10px 20px"',
    'wordBreak: "break-all"',
    'fontSize: "18px"',
    'lineHeight: "30px"',
    'paddingRight: "10px"',
    'marginRight: "20px"',
    'verticalAlign: "top"',
    'padding: "5px 15px"',
    'backgroundColor: "#777"',
  ])
    expect(styleSource).toContain(declaration);
  expect(less).toContain(".board-header {");
  expect(less).toContain(".board-id {");
  expect(less).toContain(".date {");
  expect(less).toContain("&.badge-issue-open");
  expect(appCss).not.toContain(".issue-detail-page .board-header {");
  expect(appCss).not.toContain(".issue-detail-page .board-header .title {");
  expect(appCss).not.toContain(".issue-detail-page .board-id {");
  expect(appCss).not.toContain(".issue-detail-page .board-header .date {");
  expect(appCss).toContain(".board-header .title {");
});

test("issue detail renders legacy header, markdown body, and action owners", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const session = {
    isAnonymous: false,
    isSiteAdmin: true,
    isConfirmed: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 42,
        number: 11,
        title: "Fix flaky issue",
        state: "OPEN",
        bodyMarkdown: "Body **markdown**",
        authorLoginId: "admin",
        authorLabel: "Site Admin",
        authorAvatarUrl: "",
        createdLabel: "Jul 1, 2026",
        createdDate: "Jul 1, 2026",
        canUpdate: true,
        canWatch: true,
        isWatching: false,
        isFavorited: false,
        isDraft: false,
        weight: 2,
        voters: [],
        sharers: [],
        comments: [],
        childIssues: [],
        attachments: [],
        labels: [],
        milestone: null,
        assigneeLoginId: null,
        commentCount: 0,
      },
    }),
  );
  await page.goto("/yona/admin/sample/issue/11");
  await expect(page.locator('[data-stylex-owner="project-issue-detail-header"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-issue-detail-title"]')).toHaveCSS(
    "font-size",
    "18px",
  );
  await expect(page.locator('[data-stylex-owner="project-issue-detail-board-id"]')).toHaveCSS(
    "padding-right",
    "10px",
  );
  await expect(page.locator('[data-stylex-owner="project-issue-detail-date"]').first()).toHaveCSS(
    "line-height",
    "29px",
  );
  await expect(
    page.locator('[data-stylex-owner="project-issue-detail-state-badge"]').first(),
  ).toHaveCSS("background-color", "rgb(182, 218, 84)");
  await expect(page.locator('[data-stylex-owner="project-issue-detail-content"]')).toContainText(
    "Body markdown",
  );
  await expect(page.locator('[data-stylex-owner="project-issue-detail-actions"]')).toBeVisible();
});
