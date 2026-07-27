import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const route = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber/editform.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/issue/$issueNumber/-issue-editform.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const editView = readFileSync(
  new URL("../../yona-original/app/views/issue/edit.scala.html", import.meta.url),
  "utf8",
);
const notFoundView = readFileSync(
  new URL("../../yona-original/app/views/error/notfound.scala.html", import.meta.url),
  "utf8",
);
const pageLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const spritesLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_sprites.less", import.meta.url),
  "utf8",
);
const messages = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test("project issue edit not-found error wrap keeps legacy source, paint, navigation, and containment", async ({
  page,
}) => {
  expect(editView).toContain("@projectLayout(Messages(title), project, utils.MenuType.ISSUE)");
  expect(editView).toContain('@projectMenu(project, utils.MenuType.ISSUE, "main-menu-only")');
  expect(notFoundView).toContain('<div class="error-wrap">');
  expect(notFoundView).toContain('<i class="ico ico-err2"></i>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(messages).toContain("error.notfound.issue_post = Issue does not exist");
  expect(messages).toContain("button.list = List");
  expect(styles).toContain('padding: "100px 0px"');
  expect(styles).toContain('backgroundPosition: "-80px -160px"');
  expect(styles).toContain('backgroundRepeat: "no-repeat"');
  expect(styles).toContain('verticalAlign: "middle"');
  expect(styles).toContain('margin: "30px 0px"');
  expect(route).toContain('import legacySpriteUrl from "../../../../../assets/legacy/sprite.png"');
  expect(route).toContain('data-stylex-owner="project-issue-editform-error-page"');
  expect(route).toContain('data-stylex-owner="project-issue-editform-error-wrap"');
  expect(route).toContain('data-stylex-owner="project-issue-editform-error-icon"');
  expect(route).toContain('data-stylex-owner="project-issue-editform-error-message"');
  expect(route).toContain('data-stylex-owner="project-issue-editform-error-list"');
  expect(route).toContain('state: "all"');
  expect(route).toContain('orderBy: "updatedDate"');
  expect(route).toContain('orderDir: "desc"');
  expect(route).toContain("labelIds: []");

  await mockMissingIssue(page);
  await page.goto(`${basePath}/admin/sample/issue/1/editform`, { waitUntil: "networkidle" });

  const error = page.locator('[data-stylex-owner="project-issue-editform-error-wrap"]');
  const list = page.locator('[data-stylex-owner="project-issue-editform-error-list"]');
  await expect(error).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="project-issue-editform-error-message"]'),
  ).toHaveText("Issue does not exist");
  await expect(list).toHaveText("List");

  const listHref = await list.getAttribute("href");
  expect(listHref).not.toBeNull();
  const listUrl = new URL(listHref!, "http://localhost");
  expect(listUrl.pathname).toBe(`${basePath}/admin/sample/issues`);
  expect(Object.fromEntries(listUrl.searchParams)).toEqual({
    state: "all",
    assigneeId: "",
    authorId: "",
    commenterId: "",
    dueDate: "",
    filter: "",
    labelIds: "[]",
    milestoneId: "",
    orderBy: "updatedDate",
    orderDir: "desc",
    pageNum: "1",
  });
  await list.click();
  await expect(page).toHaveURL(new RegExp(`${basePath}/admin/sample/issues\\?.*state=all`));

  await page.goBack();
  await expect(error).toBeVisible();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await error.evaluate((node) => {
      const wrap = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(".ico-err2")!;
      const icon = getComputedStyle(iconNode);
      const message = getComputedStyle(node.querySelector<HTMLElement>("p")!);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        iconHeight: icon.height,
        iconInside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
        iconPosition: icon.backgroundPosition,
        iconRepeat: icon.backgroundRepeat,
        iconWidth: icon.width,
        messageColor: message.color,
        messageFontSize: message.fontSize,
        messageMargin: message.margin,
        padding: wrap.padding,
        textAlign: wrap.textAlign,
        verticalAlign: icon.verticalAlign,
      };
    });
    expect(metrics).toEqual({
      iconHeight: "80px",
      iconInside: true,
      iconPosition: "-80px -160px",
      iconRepeat: "no-repeat",
      iconWidth: "50px",
      messageColor: "rgb(137, 137, 137)",
      messageFontSize: "16px",
      messageMargin: "30px 0px",
      padding: "100px 0px",
      textAlign: "center",
      verticalAlign: "middle",
    });
  }

  const fallback = page.locator('link[href*="legacy-fallback.css"]');
  if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") {
    await expect(fallback).toHaveCount(0);
  } else {
    await expect(fallback).toHaveCount(1);
  }
});

async function mockMissingIssue(page: Page) {
  const project = {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 0,
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanUpdate: true,
  };
  const session = {
    actorId: 1,
    csrfToken: "csrf-project-issue-editform-error-wrap",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (request: Parameters<Page["route"]>[1]) =>
    request.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": session.csrfToken },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (request) =>
    request.fulfill({ json: project }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/1**", (request) =>
    request.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "not_found", message: "Issue does not exist", status: 404 },
      }),
    }),
  );
}
