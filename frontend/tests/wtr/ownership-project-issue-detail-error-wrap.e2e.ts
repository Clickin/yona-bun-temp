import { readFileSync, mergedLegacyBlock } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const route = readFileSync("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", "utf8");
const styles = readFileSync("src/app.css", "utf8");
const legacy = readFileSync("../yona-original/app/views/error/forbidden.scala.html", "utf8");
const issueView = readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8");
const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
const spritesLess = readFileSync(
  "../yona-original/app/assets/stylesheets/less/_sprites.less",
  "utf8",
);
const messages = readFileSync("../yona-original/conf/messages", "utf8");

test("project issue detail error wrap keeps legacy source, paint, geometry, and fallback boundary", async ({
  page,
}) => {
  expect(issueView).toContain("@projectLayout(titleForOGTag, project, utils.MenuType.ISSUE)");
  expect(legacy).toContain('<div class="error-wrap">');
  expect(legacy).toContain('<i class="ico ico-err2"></i>');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(messages).toContain("error.notfound.issue_post = Issue does not exist");

  expect(route).toContain('data-owner="project-issue-detail-error-wrap"');
  expect(route).toContain('data-owner="project-issue-detail-error-icon"');
  expect(route).toContain('data-owner="project-issue-detail-error-message"');

  await mockMissingIssue(page);
  // Route-fetch-lock: WTR's ResponseFacade exposes url()/request() only (no
  // status()); the mocks are deterministic per URL, so the URL match alone is
  // the lock (wave-3 project-issue-detail precedent).
  const sessionReady = page.waitForResponse((response) =>
    response.url().includes("/api/v1/session"),
  );
  const projectReady = page.waitForResponse((response) =>
    response.url().includes("/api/v1/owners/admin/projects/sample/container"),
  );
  const issueReady = page.waitForResponse((response) =>
    response.url().includes("/api/v1/projects/admin/sample/issues/1"),
  );
  await page.goto(`${basePath}/admin/sample/issue/1`, { waitUntil: "commit" });
  await Promise.all([sessionReady, projectReady, issueReady]);

  const error = page.locator('[data-owner="project-issue-detail-error-wrap"]');
  const message = page.locator('[data-owner="project-issue-detail-error-message"]');
  await expect(error).toBeVisible();
  await expect(message).toHaveText("Issue does not exist");
  await expect(page.locator(".error-wrap > a.ybtn.ybtn-primary")).toHaveText("List");

  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const metrics = await error.evaluate((node) => {
      const wrap = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>(".ico-err2")!;
      const iconStyle = getComputedStyle(iconNode);
      const messageNode = node.querySelector<HTMLElement>("p")!;
      const messageStyle = getComputedStyle(messageNode);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        iconInside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
        iconHeight: iconStyle.height,
        iconPosition: iconStyle.backgroundPosition,
        iconRepeat: iconStyle.backgroundRepeat,
        iconWidth: iconStyle.width,
        messageColor: messageStyle.color,
        messageFontSize: messageStyle.fontSize,
        messageMargin: messageStyle.margin,
        padding: wrap.padding,
        textAlign: wrap.textAlign,
        verticalAlign: iconStyle.verticalAlign,
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
  // Post-merge: the fallback link no longer exists in index.html.
  await expect(fallback).toHaveCount(0);
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
    csrfToken: "csrf-project-issue-detail-error-wrap",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (request: Parameters<Page["route"]>[1]) =>
    request.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-issue-detail-error-wrap" },
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
