import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. resolve only builds page.screenshot paths
// (a recorded shim gap); strip leading slashes so cwd-joined src paths stay
// bare-relative for the readFileSync/readFile fixture mapping.
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths.
const mkdirSync = () => undefined;

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ITEM = '[data-owner="global-gnb-search-item"]';
const FORM = '[data-owner="global-gnb-search-form"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

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
    await page.evaluate(() => document.fonts.load("12px yobicon"));
    await page.evaluate(() => document.fonts.ready);

    const item = page.locator(ITEM);
    const form = page.locator(FORM);
    await expect(item).toBeAttached();
    await expect(form).toBeAttached();
    await expect(form).toHaveClass(/(?:^|\s)gnb-search-form(?:\s|$)/u);
    // wave-33 retained-class retention (667398a04): input-prepend kept per
    // legacy navbar.scala.html:53 class="input-prepend gnb-search-form"
    await expect(form).toHaveClass(/(?:^|\s)input-prepend(?:\s|$)/u);
    await expect(form).toHaveAttribute("name", "gnb-search-form");
    await expect(form).toHaveAttribute("action", expectedAction(state.kind));
    await expect(form.locator(':scope > input[type="hidden"]')).toHaveAttribute(
      "name",
      "searchType",
    );
    await expect(form.locator(':scope > input[type="hidden"]')).toHaveValue("auto");
    await expect(form.locator(":scope > :nth-child(1)")).toHaveAttribute("type", "hidden");
    await expect(form.locator(":scope > :last-child")).toHaveAttribute(
      "data-owner",
      "global-gnb-search-box",
    );
    await expect(item.locator(":scope > form")).toHaveCount(1);
    await expect(item.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
      "data-owner",
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
      state.width <= 720 ? page.locator("header[data-owner=global-gnb-outer]") : item,
      `style-global-gnb-search-form-${state.label.replaceAll(" ", "-")}.png`,
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
    '[data-owner="global-gnb-search-scope-menu"] > [data-owner="global-gnb-search-scope-item"] > button',
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
  // F5 dist-truth: the native form GET navigates the harness iframe to the
  // SPA route root (/admin/sample/?keyword=...) without a request event;
  // poll the page URL instead.
  await form.locator('[data-owner="global-gnb-search-submit"]').click({ noWaitAfter: true });
  await expect
    .poll(() => new URL(page.url()).searchParams.get("keyword"), { timeout: 10000 })
    .toBe("needle");
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("auto");
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("needle");
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
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
        isProtected: true,
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
