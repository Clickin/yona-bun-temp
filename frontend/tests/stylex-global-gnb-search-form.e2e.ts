import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ITEM = '[data-stylex-owner="global-gnb-search-item"]';
const FORM = '[data-stylex-owner="global-gnb-search-form"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search outer item and form have global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/theme.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbSearchFormStyles");
  const end = route.indexOf("const globalGnbFeedbackStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbNavItemFloat",
    "globalGnbNavItemPosition",
    "globalGnbSearchDisplay",
    "globalGnbSearchFontSize",
    "globalGnbSearchLineHeight",
    "globalGnbSearchMarginTop",
    "globalGnbSearchWhiteSpace",
    "globalGnbSearchVerticalAlign",
    "globalGnbBrandPaddingInline",
    "globalGnbSearchZero",
  ]) {
    expect(styles).toContain(`globalColors.${token}`);
    expect(theme).toContain(`${token}:`);
  }
  expect(styles).not.toMatch(
    /#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b-?\d+(?:\.\d+)?(?:px|s|%)\b|!important/iu,
  );

  const itemMarker = route.indexOf('data-stylex-owner="global-gnb-search-item"');
  const formMarker = route.indexOf('data-stylex-owner="global-gnb-search-form"');
  const item = route.slice(
    route.lastIndexOf("<li", itemMarker),
    route.indexOf("</li>", itemMarker),
  );
  const form = route.slice(
    route.lastIndexOf("<form", formMarker),
    route.indexOf("</form>", formMarker),
  );
  expect(itemMarker).toBeGreaterThanOrEqual(0);
  expect(formMarker).toBeGreaterThanOrEqual(0);
  expect(item).toContain("globalGnbSearchFormStyles.item");
  expect(form).toContain("globalGnbSearchFormStyles.form");
  expect(form).toContain("`input-prepend gnb-search-form ${stylex.props(");
  expect(form).toContain('name="gnb-search-form"');
  expect(form).toContain('name="searchType" value="auto"');

  expect(appCss).not.toMatch(/\.gnb-search-form\s*\{[^}]*\}/u);
  for (const selector of [
    '.gnb-search-form input[type="text"] {',
    ".gnb-search-form .search-box button {",
  ]) {
    expect(appCss).toContain(selector);
  }
  expect(appCss).not.toContain(".gnb-search-form .search-box {");
  expect(appCss).not.toContain(".gnb-search-form .search-box.select {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-toggle {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li > button");
});

test("frozen global GNB search sources stay byte-identical", () => {
  const hashes = new Map([
    [
      "../yona-original/app/assets/stylesheets/yobi.less",
      "b80c78edc2f66b3e14d7087d6c689c387195c06c2e5352d111fb406796d3ca62",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_page.less",
      "2124a6efd122029ff51d26e5b513fbd3945d1020487101a19a5aaa00448d4aa3",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_responsive.less",
      "3b8038e9e3f9fb2067d506794e342bf0aca81071d94128c6cc1a3214c0812105",
    ],
    [
      "../yona-original/public/bootstrap/css/bootstrap.css",
      "a1878fdc8822d0e2419d823bfa1b87276233038857416a31737445502a51e8f9",
    ],
    [
      "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
      "a0baa7fb81cfe06b3bfe4489cb15c998ad3afc7cf7eb77e36f356278d247f440",
    ],
  ]);

  for (const [path, expected] of hashes) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(expected);
  }
});

for (const state of [
  { height: 900, kind: "home", label: "desktop home", path: "/", width: 1366 },
  { height: 844, kind: "home", label: "mobile home", path: "/", width: 390 },
  {
    height: 900,
    kind: "project",
    label: "desktop project",
    path: "/admin/sample",
    width: 1366,
  },
  {
    height: 844,
    kind: "project",
    label: "mobile project",
    path: "/admin/sample",
    width: 390,
  },
  {
    height: 900,
    kind: "organization",
    label: "desktop organization",
    path: "/organizations/weblabs",
    width: 1366,
  },
  {
    height: 844,
    kind: "organization",
    label: "mobile organization",
    path: "/organizations/weblabs",
    width: 390,
  },
] as const) {
  test(`global GNB search preserves ${state.label} outer parity`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.kind === "project") await mockProject(page);
    if (state.kind === "organization") await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const item = page.locator(ITEM);
    const form = page.locator(FORM);
    await expect(item).toBeAttached();
    await expect(form).toBeAttached();
    await expect(form).toHaveClass(/(?:^|\s)input-prepend(?:\s|$)/u);
    await expect(form).toHaveClass(/(?:^|\s)gnb-search-form(?:\s|$)/u);
    await expect(form).toHaveAttribute("name", "gnb-search-form");
    await expect(form).toHaveAttribute("action", expectedAction(state.kind));
    await expect(form.locator(':scope > input[type="hidden"]')).toHaveAttribute(
      "name",
      "searchType",
    );
    await expect(form.locator(':scope > input[type="hidden"]')).toHaveValue("auto");
    await expect(form.locator(":scope > :nth-child(1)")).toHaveAttribute("type", "hidden");
    await expect(form.locator(":scope > :last-child")).toHaveAttribute(
      "data-stylex-owner",
      "global-gnb-search-box",
    );
    await expect(item.locator(":scope > form")).toHaveCount(1);
    await expect(item.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
      "data-stylex-owner",
      "global-gnb-feedback-item",
    );

    const evidence = await readEvidence(item, form);
    expect(evidence.itemStyle).toEqual({
      display: "list-item",
      float: "left",
      position: "relative",
    });
    if (state.width <= 720) {
      expect(evidence.itemBox.height).toBe(0);
      expect(evidence.itemBox.width).toBe(0);
      expect(evidence.formBox.height).toBe(0);
      expect(evidence.formBox.width).toBe(0);
      expect(evidence.formStyle.display).toBe("none");
    } else {
      await expect(item).toBeVisible();
      await expect(form).toBeVisible();
      expect(evidence.itemBox.height).toBe(35);
      expect(evidence.formBox.height).toBe(30);
      expect(evidence.formStyle).toEqual({
        boxSizing: "content-box",
        display: "inline-block",
        fontSize: "0px",
        lineHeight: "30px",
        margin: "5px 0px 0px",
        padding: "0px 10px",
        position: "static",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      });
      if (state.kind === "home") {
        expect(evidence.itemBox.width).toBe(112);
        expect(evidence.formBox.width).toBe(112);
      } else {
        expect(evidence.formBox.width).toBeGreaterThan(112);
        expect(evidence.itemBox.width).toBe(evidence.formBox.width);
      }
      expect(evidence.formBox.left).toBe(evidence.itemBox.left);
      expect(evidence.formBox.top - evidence.itemBox.top).toBe(5);
    }
    await saveScreenshot(
      state.width <= 720 ? page.locator("header.gnb-outer") : item,
      `stylex-global-gnb-search-form-${state.label.replaceAll(" ", "-")}.png`,
    );
  });
}

test("scoped search remains React-owned and submits the legacy GET payload", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page, { organizationName: "weblabs" });
  await page.goto(`${BASE_PATH}/admin/sample`);

  const form = page.locator(FORM);
  await expect(form).toBeAttached();
  const scopeTitle = form.locator("#gnb-search-scope-title");
  await expect(form).not.toHaveAttribute("method");
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/admin/sample/search`);
  await expect(scopeTitle).toHaveText("This Project");
  await scopeTitle.click();
  const scopeButtons = form.locator(
    '[data-stylex-owner="global-gnb-search-scope-menu"] > [data-stylex-owner="global-gnb-search-scope-item"] > button',
  );
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await scopeButtons.nth(1).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/organizations/weblabs/search`);
  await scopeTitle.click();
  await scopeButtons.nth(2).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/search`);
  await scopeTitle.click();
  await scopeButtons.nth(0).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/admin/sample/search`);

  await form.locator('input[name="keyword"]').fill("needle");
  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === `${BASE_PATH}/admin/sample/search` && url.searchParams.has("keyword");
  });
  await form.locator('button[type="submit"]').click({ noWaitAfter: true });
  const requestUrl = new URL((await requestPromise).url());
  expect(requestUrl.searchParams.get("searchType")).toBe("auto");
  expect(requestUrl.searchParams.get("keyword")).toBe("needle");
});

test("global GNB search outer paint is isolated while required legacy classes remain", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);

  await expect(page.locator(ITEM)).toBeAttached();

  const evidence = await page.locator(ITEM).evaluate((item) => {
    const form = item.querySelector("form")!;
    item.parentElement!.classList.remove("gnb-nav");
    const snapshot = () => {
      const itemStyle = getComputedStyle(item);
      const formStyle = getComputedStyle(form);
      return {
        formDisplay: formStyle.display,
        formFontSize: formStyle.fontSize,
        formLineHeight: formStyle.lineHeight,
        formMargin: formStyle.margin,
        formPadding: formStyle.padding,
        formVerticalAlign: formStyle.verticalAlign,
        formWhiteSpace: formStyle.whiteSpace,
        itemFloat: itemStyle.cssFloat,
        itemPosition: itemStyle.position,
      };
    };
    const owned = snapshot();
    const requiredClasses = form.className;
    item.className = "";
    form.className = "";
    return { owned, requiredClasses, stripped: snapshot() };
  });

  expect(evidence.requiredClasses).toContain("input-prepend");
  expect(evidence.requiredClasses).toContain("gnb-search-form");
  expect(evidence.owned).toEqual({
    formDisplay: "inline-block",
    formFontSize: "0px",
    formLineHeight: "30px",
    formMargin: "5px 0px 0px",
    formPadding: "0px 10px",
    formVerticalAlign: "middle",
    formWhiteSpace: "nowrap",
    itemFloat: "left",
    itemPosition: "relative",
  });
  expect(evidence.stripped).toEqual({
    formDisplay: "block",
    formFontSize: "13px",
    formLineHeight: "20px",
    formMargin: "0px",
    formPadding: "0px",
    formVerticalAlign: "baseline",
    formWhiteSpace: "normal",
    itemFloat: "none",
    itemPosition: "static",
  });
});

function expectedAction(kind: "home" | "organization" | "project") {
  if (kind === "project") return `${BASE_PATH}/admin/sample/search`;
  if (kind === "organization") return `${BASE_PATH}/organizations/weblabs/search`;
  return `${BASE_PATH}/search`;
}

async function readEvidence(item: Locator, form: Locator) {
  return item.evaluate(
    (element, formElement) => {
      const itemRect = element.getBoundingClientRect();
      const formRect = (formElement as Element).getBoundingClientRect();
      const itemStyle = getComputedStyle(element);
      const formStyle = getComputedStyle(formElement as Element);
      const box = (rect: DOMRect) => ({
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      });
      return {
        formBox: box(formRect),
        formStyle: {
          boxSizing: formStyle.boxSizing,
          display: formStyle.display,
          fontSize: formStyle.fontSize,
          lineHeight: formStyle.lineHeight,
          margin: formStyle.margin,
          padding: formStyle.padding,
          position: formStyle.position,
          verticalAlign: formStyle.verticalAlign,
          whiteSpace: formStyle.whiteSpace,
        },
        itemBox: box(itemRect),
        itemStyle: {
          display: itemStyle.display,
          float: itemStyle.cssFloat,
          position: itemStyle.position,
        },
      };
    },
    await form.elementHandle(),
  );
}

async function installRuntime(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/workspace/overview**", (route) =>
    route.fulfill({ contentType: "application/json", json: { profile: { loginId: "admin" } } }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/organizations**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}

async function mockProject(page: Page, options: { organizationName?: string } = {}) {
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/legacy-assets/images/bg-default-project.png",
        dashboard: { assignees: [], labels: [], milestones: [], pullRequests: [] },
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/legacy-assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: options.organizationName,
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
      },
    }),
  );
}

async function mockOrganization(page: Page) {
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        enrollmentRequested: false,
        logoUrl: "",
        managers: [],
        memberMembers: [],
        members: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanEnroll: false,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      },
    }),
  );
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
