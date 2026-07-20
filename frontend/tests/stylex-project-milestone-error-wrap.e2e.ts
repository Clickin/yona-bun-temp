import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const route = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/milestone/$milestoneId.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/milestone/-milestone-detail.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const legacy = readFileSync(
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

test("project milestone not-found error wrap keeps legacy paint and containment", async ({
  page,
}) => {
  expect(legacy).toContain('<div class="error-wrap">');
  expect(legacy).toContain('<i class="ico ico-err2"></i>');
  expect(legacy).toContain('@Messages("button.list")');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(spritesLess).toContain("background-position: -80px -160px;");
  expect(spritesLess).toContain("width: 50px;");
  expect(spritesLess).toContain("height: 80px;");
  expect(messages).toContain("error.notfound.milestone = Milestone does not exist");
  expect(styles).toContain('padding: "100px 0px"');
  expect(styles).toContain('backgroundPosition: "-80px -160px"');
  expect(styles).toContain('backgroundRepeat: "no-repeat"');
  expect(styles).toContain('verticalAlign: "middle"');
  expect(styles).toContain('margin: "30px 0px"');
  expect(route).toContain('data-stylex-owner="project-milestone-detail-error-wrap"');
  expect(route).toContain('data-stylex-owner="project-milestone-detail-error-icon"');
  expect(route).toContain('data-stylex-owner="project-milestone-detail-error-message"');

  await mockMissingMilestone(page);
  await page.goto(`${basePath}/admin/sample/milestone/5`, { waitUntil: "commit" });

  const error = page.locator('[data-stylex-owner="project-milestone-detail-error-wrap"]');
  const message = page.locator('[data-stylex-owner="project-milestone-detail-error-message"]');
  await expect(error).toBeVisible();
  await expect(message).toHaveText("Milestone does not exist");
  await expect(error.locator("a.ybtn.ybtn-primary")).toHaveText("List");
  await expect(error.locator("a.ybtn.ybtn-primary")).toHaveAttribute(
    "href",
    `${basePath}/admin/sample/milestones`,
  );

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
        iconHeight: iconStyle.height,
        iconInside: iconBox.left >= wrapBox.left && iconBox.right <= wrapBox.right,
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
  if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") {
    await expect(fallback).toHaveCount(0);
  } else {
    await expect(fallback).toHaveCount(1);
  }
});

async function mockMissingMilestone(page: Page) {
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
    csrfToken: "csrf-project-milestone-error-wrap",
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", (request) =>
    request.fulfill({ json: project }),
  );
  await page.route("**/api/v1/projects/admin/sample/milestones/5**", (request) =>
    request.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "milestone_not_found", message: "Milestone does not exist", status: 404 },
      }),
    }),
  );
}
