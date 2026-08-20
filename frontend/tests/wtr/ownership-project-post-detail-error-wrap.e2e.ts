import {
  expect,
  test,
  type Page,
  type Route,
  mergedLegacyBlock,
  curatedAppCss,
} from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const route = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber.tsx", import.meta.url),
  "utf8",
);
const styles = curatedAppCss();
const legacySources = [
  "../../yona-original/app/views/board/view.scala.html",
  "../../yona-original/app/views/board/list.scala.html",
  "../../yona-original/app/views/board/partial_list.scala.html",
  "../../yona-original/app/views/error/notfound.scala.html",
  "../../yona-original/app/views/projectLayout.scala.html",
  "../../yona-original/app/views/projectMenu.scala.html",
  "../../yona-original/app/views/project/header.scala.html",
  "../../yona-original/conf/messages",
  "../../yona-original/app/assets/stylesheets/yobi.less",
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  "../../yona-original/app/assets/stylesheets/less/_sprites.less",
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

test("project post not-found error wrap keeps frozen Style parity", async ({ page }) => {
  const [
    view,
    list,
    partialList,
    notFound,
    layout,
    menu,
    header,
    messages,
    yobi,
    pageLess,
    sprites,
  ] = legacySources;
  expect(view).toContain("@projectLayout(titleForOGTag, project, utils.MenuType.BOARD)");
  expect(view).toContain('@projectMenu(project, utils.MenuType.BOARD, "main-menu-only")');
  expect(list).toContain('<div class="error-wrap">');
  expect(partialList).toContain("post-item");
  expect(notFound).toContain('<i class="ico ico-err2"></i>');
  expect(layout).toContain("@views.html.project.header(project)");
  expect(menu).toContain('class="project-menu-outer"');
  expect(header).toContain('class="project-header-outer"');
  expect(messages).toContain("error.notfound.board_post = Post does not exist");
  expect(messages).toContain("button.list = List");
  expect(yobi).toContain('@import "less/_sprites.less"');
  expect(yobi).toContain('@import "less/_page.less"');
  expect(pageLess).toContain("padding:100px 0px;");
  expect(pageLess).toContain("text-align:center;");
  expect(sprites).toContain("background-position: -80px -160px;");
  expect(sprites).toContain("width: 50px;");
  expect(sprites).toContain("height: 80px;");
  for (const declaration of []) {
    expect(styles).toContain(declaration);
  }
  for (const owner of [
    "post-detail-page",
    "post-detail-error-wrap",
    "post-detail-error-icon",
    "post-detail-error-message",
    "post-detail-error-list",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
  expect(route).toContain('t("error.notfound.board_post")');
  expect(route).toContain('to="/$ownerName/$projectName/posts"');
  const notFoundBody = route.slice(
    route.indexOf("function ProjectPostNotFoundBody"),
    route.indexOf("function ProjectPostEditNotFoundTitle"),
  );
  expect(notFoundBody).not.toContain("ico-404");
  expect(route).not.toContain("document.");

  await mockMissingProjectPost(page);
  await page.goto(`${basePath}/weblabs/portal/post/1`, { waitUntil: "commit" });

  const wrapper = page.locator('[data-owner="post-detail-error-wrap"]');
  const icon = page.locator('[data-owner="post-detail-error-icon"]');
  const message = page.locator('[data-owner="post-detail-error-message"]');
  const listLink = page.locator('[data-owner="post-detail-error-list"]');
  await expect(wrapper).toBeVisible();
  await expect(wrapper).toHaveClass(/error-wrap/u);
  await expect(icon).toHaveClass(/ico-err2/u);
  await expect(message).toHaveText("Post does not exist");
  await expect(listLink).toHaveText("List");
  await expect(listLink).toHaveAttribute("href", `${basePath}/weblabs/portal/posts`);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const metrics = await wrapper.evaluate((node) => {
      const wrapStyle = getComputedStyle(node);
      const iconNode = node.querySelector<HTMLElement>('[data-owner="post-detail-error-icon"]')!;
      const iconStyle = getComputedStyle(iconNode);
      const messageNode = node.querySelector<HTMLElement>("p")!;
      const messageStyle = getComputedStyle(messageNode);
      const wrapBox = node.getBoundingClientRect();
      const iconBox = iconNode.getBoundingClientRect();
      return {
        contained: wrapBox.left >= 0 && wrapBox.right <= window.innerWidth,
        iconCentered:
          Math.abs(iconBox.left + iconBox.width / 2 - (wrapBox.left + wrapBox.width / 2)) < 1,
        iconHeight: iconStyle.height,
        iconPosition: iconStyle.backgroundPosition,
        iconRepeat: iconStyle.backgroundRepeat,
        iconWidth: iconStyle.width,
        messageColor: messageStyle.color,
        messageFontSize: messageStyle.fontSize,
        messageFontWeight: messageStyle.fontWeight,
        messageMargin: messageStyle.margin,
        padding: wrapStyle.padding,
        textAlign: wrapStyle.textAlign,
      };
    });
    expect(metrics).toEqual({
      contained: true,
      iconCentered: true,
      iconHeight: "80px",
      iconPosition: "-80px -160px",
      iconRepeat: "no-repeat",
      iconWidth: "50px",
      messageColor: "rgb(137, 137, 137)",
      messageFontSize: "16px",
      messageFontWeight: "700",
      messageMargin: "30px 0px",
      padding: "100px 0px",
      textAlign: "center",
    });
    await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
  }
});

async function mockMissingProjectPost(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = { isAnonymous: true, isConfirmed: false, isSiteAdmin: false, loginId: "" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (request: Route) =>
      request.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", (request) =>
    request.fulfill({
      contentType: "application/json",
      json: {
        id: 2,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "weblabs",
        projectName: "portal",
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/projects/weblabs/portal/posts/1", (request) =>
    request.fulfill({
      contentType: "application/json",
      status: 404,
      json: { error: { code: "not_found", message: "Post does not exist", status: 404 } },
    }),
  );
}
