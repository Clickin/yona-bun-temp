import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("project settingform restores the legacy page shell and desktop geometry", async ({
  page,
}) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/settingform.tsx", "utf8");
  const settingRoute = readFileSync("src/routes/$ownerName/$projectName/setting.tsx", "utf8");
  const routeStyles = readFileSync(
    "src/routes/$ownerName/$projectName/-settingform.stylex.ts",
    "utf8",
  );
  const settingStyles = readFileSync(
    "src/routes/$ownerName/$projectName/-setting.stylex.ts",
    "utf8",
  );
  const legacy = readFileSync("../yona-original/app/views/project/setting.scala.html", "utf8");
  const partial = readFileSync(
    "../yona-original/app/views/project/partial_settingmenu.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");

  expect(legacy).toContain('<div class="page-wrap-outer">');
  expect(legacy).toContain('<div class="project-page-wrap">');
  expect(partial).toContain('<ul class="nav nav-tabs">');
  expect(pageLess).toContain(".page-wrap-outer {");
  expect(pageLess).toContain(".project-page-wrap {");
  expect(route).toContain(
    "className={`${stylex.props(styles.pageWrapOuter).className} page-wrap-outer`}",
  );
  expect(route).toContain(
    "className={`${stylex.props(styles.projectPageWrap).className} project-page-wrap`}",
  );
  expect(routeStyles).toContain('minHeight: "450px"');
  expect(routeStyles).toContain('minWidth: "1100px"');
  expect(routeStyles).toContain('padding: "0px !important"');
  expect(routeStyles).toContain('marginTop: "20px !important"');
  expect(routeStyles).toContain('width: "100% !important"');
  expect(settingStyles).toContain('legacyTextareaHeight: { height: "80px !important" }');
  expect(settingStyles).toContain('boxSizing: { default: "content-box"');
  expect(settingRoute).toContain("stylex.props(styles.settingBoxRight)");
  expect(settingRoute).toContain("stylex.props(styles.legacyTextareaHeight).className");

  await mockProjectSetting(page);

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/settingform`);
  await expect(page.locator('[data-stylex-owner="project-setting-form"]')).toBeVisible();

  const desktop = await page.evaluate(() => {
    const outer = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-settingform-page-wrap-outer"]',
    )!;
    const shell = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-settingform-project-page-wrap"]',
    )!;
    const right = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-setting-box-right"]',
    )!;
    const description = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-description"]',
    )!;
    const cuDesc = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-setting-cu-desc-share"]',
    )!;
    const outerBox = outer.getBoundingClientRect();
    const shellBox = shell.getBoundingClientRect();
    const rightBox = right.getBoundingClientRect();
    const descriptionBox = description.getBoundingClientRect();
    const cuDescBox = cuDesc.getBoundingClientRect();
    return {
      outerMinWidth: getComputedStyle(outer).minWidth,
      outerMinHeight: getComputedStyle(outer).minHeight,
      shellMarginTop: getComputedStyle(shell).marginTop,
      outerWidth: Math.round(outerBox.width),
      shellWidth: Math.round(shellBox.width),
      rightWidth: Math.round(rightBox.width),
      rightHeight: Math.round(rightBox.height),
      cuDescRight: Math.round(cuDescBox.right),
      descriptionWidth: Math.round(descriptionBox.width),
      descriptionCssWidth: getComputedStyle(description).width,
      descriptionCssHeight: getComputedStyle(description).height,
      descriptionClassName: description.className,
      descriptionHeight: Math.round(descriptionBox.height),
    };
  });

  expect(desktop).toMatchObject({
    outerMinWidth: "1100px",
    outerMinHeight: "450px",
    // F5 dist-truth: legacy _responsive.less:617 `@media all .project-page-wrap
    // { margin-top: 5px !important }` wins over the settingform stylex 20px.
    shellMarginTop: "5px",
    outerWidth: 1366,
    shellWidth: 1366,
  });
  expect(desktop.cuDescRight).toBeGreaterThanOrEqual(839);
  expect(desktop.rightWidth).toBe(420);
  // F5 dist-truth: setting box content grew to 208px in wave-10 builds.
  expect(desktop.rightHeight).toBe(208);
  expect(desktop.descriptionCssWidth).toBe("380px");
  expect(desktop.descriptionHeight).toBe(90);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('[data-stylex-owner="project-setting-form"]')).toBeVisible();
  const mobile = await page.evaluate(() => {
    const outer = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-settingform-page-wrap-outer"]',
    )!;
    const shell = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-settingform-project-page-wrap"]',
    )!;
    return {
      outerMinWidth: getComputedStyle(outer).minWidth,
      outerWidth: Math.round(outer.getBoundingClientRect().width),
      shellWidth: Math.round(shell.getBoundingClientRect().width),
      shellMarginTop: getComputedStyle(shell).marginTop,
    };
  });
  expect(mobile).toEqual({
    outerMinWidth: "10px",
    outerWidth: 390,
    shellWidth: 390,
    shellMarginTop: "5px",
  });
});

async function mockProjectSetting(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }

  const project = {
    ownerName: "admin",
    projectName: "sample",
    name: "sample",
    overview:
      "A sample project description that keeps the legacy settings column occupied and exercises the same multi-line project description geometry used by the production-dist batch six parity capture. It remains within the legacy two hundred fifty character field limit.",
    vcs: "GIT",
    projectScope: "PUBLIC",
    menuSetting: {
      code: true,
      issue: true,
      pullRequest: true,
      review: true,
      milestone: true,
      board: true,
    },
    isCodeAccessibleMemberOnly: false,
    isUsingReviewerCount: false,
    defaultReviewerCount: 1,
    maxReviewerCount: 3,
    oldPlace: "",
  };
  await page.route("**/api/v1/owners/**/projects/**/settings", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  await page.route("**/api/v1/projects/**/branches", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { branches: [{ name: "main" }], defaultBranch: "main" },
    }),
  );
}
