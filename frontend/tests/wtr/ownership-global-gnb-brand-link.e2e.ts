import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts"; // Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");
const OWNER_SELECTOR = '[data-owner="global-gnb-brand-link"]';

test.use({ locale: "en-US" });

test("global GNB brand link has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const restricted = readFileSync("src/routes/restricted.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();

  const marker = route.indexOf('data-owner="global-gnb-brand-link"');
  const ownerStart = route.lastIndexOf("<Link", marker);
  const ownerEnd = route.indexOf("</Link>", marker);
  expect(marker).toBeGreaterThanOrEqual(0);
  const owner = route.slice(ownerStart, ownerEnd);
  expect(owner).toContain('to="/"');

  expect(owner).not.toContain("activeProps={{");

  expect(restricted).toContain('data-owner="restricted-gnb-brand"');
  for (const selector of [
    ".gnb-inner .logo {",
    ".gnb-inner .logo::before",
    ".gnb-inner .logo::after",
    ".gnb-nav .logo-letter {",
    ".gnb-nav a {",
  ]) {
    expect(appCss).toContain(selector);
  }
});

for (const state of [
  {
    height: 900,
    label: "desktop home",
    path: "/",
    project: false,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile home",
    path: "/",
    project: false,
    width: 390,
  },
  {
    height: 900,
    label: "desktop project header",
    path: "/admin/sample",
    project: true,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile project header",
    path: "/admin/sample",
    project: true,
    width: 390,
  },
]) {
  test(`global GNB brand link preserves ${state.label} legacy parity`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.project) await mockProject(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const owner = page.locator(OWNER_SELECTOR);
    await expect(owner).toBeVisible();
    await expect(owner).toHaveText("Y");
    await expect(owner).toHaveAttribute("href", `${BASE_PATH}/`);
    await expect(owner).toHaveClass(/(?:^|\s)(?:logo|logo-letter)(?:\s|$)/u);
    if (state.path === "/") {
      await expect(owner).toHaveAttribute("aria-current", "page");
      await expect(owner).toHaveAttribute("data-status", "active");
    } else {
      await expect(owner).not.toHaveAttribute("aria-current", /.+/u);
      await expect(owner).not.toHaveAttribute("data-status", /.+/u);
    }

    const evidence = await readEvidence(owner);
    expect(evidence.headerOwner).toBe("global-gnb-outer");
    // F5 dist-truth (2026-08-11): the route keeps the legacy gnb-outer
    // class (legacy-positive per the gnb-outer ownership work).
    expect(evidence.headerHasLegacyClass).toBe(true);
    expect(evidence.style).toEqual({
      backgroundColor: "rgb(255, 87, 34)",
      backgroundPosition: "11px 10px",
      backgroundRepeat: "no-repeat",
      borderRadius: "2px",
      color: "rgb(128, 49, 49)",
      display: "inline",
      fontSize: "14px",
      fontWeight: "700",
      height: "40px",
      lineHeight: "40px",
      opacity: "0.7",
      outline: "rgb(128, 49, 49) none 3px",
      padding: "6px 10px",
      textDecoration: "none",
      transition: "color 0.15s",
      width: "44px",
    });
    expect(evidence.before).toEqual({
      content: '" "',
      display: state.project ? "none" : "block",
      float: "left",
      height: "40px",
      marginLeft: "0px",
      width: "1px",
    });
    expect(evidence.after).toEqual({
      content: '" "',
      display: state.project ? "none" : "block",
      float: "left",
      height: "40px",
      marginLeft: state.width === 390 ? "0px" : "40px",
      width: "1px",
    });
    expect(evidence.overflow).toBe(false);

    await saveScreenshot(
      owner,
      `style-global-gnb-brand-link-local-${state.label.replaceAll(" ", "-")}-base.png`,
    );

    await owner.hover();
    await page.waitForTimeout(200);
    await expect(owner).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(owner).toHaveCSS("opacity", "1");
    await page.mouse.move(state.width - 1, state.height - 1);
    await owner.focus();
    await page.waitForTimeout(200);
    await expect(owner).toHaveCSS("color", "rgb(128, 49, 49)");
    await expect(owner).toHaveCSS("opacity", "0.7");

    if (state.project) {
      await page.evaluate(() => {
        (window as Window & { __gnbBrandSpaSentinel?: string }).__gnbBrandSpaSentinel = "alive";
      });
      await owner.click();
      await expect.poll(() => new URL(page.url()).pathname).toBe(`${BASE_PATH}/`);
      expect(
        await page.evaluate(
          () => (window as Window & { __gnbBrandSpaSentinel?: string }).__gnbBrandSpaSentinel,
        ),
      ).toBe("alive");
    }
  });
}

test("global GNB brand link paint and pseudo geometry do not depend on legacy logo classes", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);

  const owner = page.locator(OWNER_SELECTOR);
  await expect(owner).toBeVisible();
  const withoutStyle = await owner.evaluate((element) => {
    element.className = "";
    const style = getComputedStyle(element);
    const before = getComputedStyle(element, "::before");
    const after = getComputedStyle(element, "::after");
    return {
      activeElement: document.activeElement === element,
      className: element.className,
      after: { content: after.content, display: after.display, marginLeft: after.marginLeft },
      before: { content: before.content, display: before.display },
      style: {
        backgroundColor: style.backgroundColor,
        color: style.color,
        height: style.height,
        opacity: style.opacity,
        padding: style.padding,
        width: style.width,
      },
    };
  });
  expect(withoutStyle).toEqual({
    activeElement: false,
    className: "",
    after: { content: "none", display: "inline", marginLeft: "0px" },
    before: { content: "none", display: "inline" },
    style: {
      backgroundColor: "rgba(0, 0, 0, 0)",
      color: "rgb(162, 162, 162)",
      height: "auto",
      opacity: "1",
      padding: "0px",
      width: "auto",
    },
  });
});

async function readEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const header = element.closest("header") as HTMLElement;
    const style = getComputedStyle(element);
    const before = getComputedStyle(element, "::before");
    const after = getComputedStyle(element, "::after");
    const pseudo = (value: CSSStyleDeclaration) => ({
      content: value.content,
      display: value.display,
      float: value.cssFloat,
      height: value.height,
      marginLeft: value.marginLeft,
      width: value.width,
    });
    return {
      after: pseudo(after),
      before: pseudo(before),
      headerHasLegacyClass:
        header.classList.contains("gnb-outer") || header.classList.contains("project-header"),
      headerOwner: header.getAttribute("data-owner"),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      style: {
        backgroundColor: style.backgroundColor,
        backgroundPosition: style.backgroundPosition,
        backgroundRepeat: style.backgroundRepeat,
        borderRadius: style.borderRadius,
        color: style.color,
        display: style.display,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        height: style.height,
        lineHeight: style.lineHeight,
        opacity: style.opacity,
        outline: style.outline,
        padding: style.padding,
        textDecoration: style.textDecorationLine,
        transition: style.transition,
        width: style.width,
      },
    };
  });
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
        actorId: null,
        avatarUrl: "",
        defaultLandingPath: "/",
        isAnonymous: true,
        isConfirmed: false,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "anonymous",
        preferredLanguage: "en-US",
        userLabel: "Anonymous",
      },
    }),
  );
}

async function mockProject(page: Page) {
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

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
