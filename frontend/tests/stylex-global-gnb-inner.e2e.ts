import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const INNER = '[data-stylex-owner="global-gnb-inner"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB inner has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbInnerStyles");
  const end = route.indexOf("const globalGnbNavStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbInnerBoxSizing",
    "globalGnbInnerWidth",
    "globalGnbInnerHeight",
    "globalGnbInnerMargin",
    "globalGnbInnerText",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);

  const marker = route.indexOf('data-stylex-owner="global-gnb-inner"');
  const owner = route.slice(route.lastIndexOf("<div", marker), route.indexOf(">", marker));
  expect(marker).toBeGreaterThanOrEqual(0);
  expect(owner).toContain("...stylex.props(globalGnbInnerStyles.root)");
  expect(owner).not.toContain("className");

  expect(appCss).toContain(".gnb-inner {");
  expect(appCss).toContain(".gnb-inner::after {");
  for (const consumer of ["restricted.tsx", "secret.tsx", "$user.tsx", "__root.tsx"]) {
    expect(readFileSync(`src/routes/${consumer}`, "utf8")).toContain('className="gnb-inner"');
  }
});

test("frozen GNB inner sources stay byte-identical", () => {
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
  { height: 900, label: "desktop home", path: "/", width: 1366 },
  { height: 844, label: "mobile home", path: "/", width: 390 },
  {
    height: 900,
    label: "desktop project",
    path: "/admin/sample",
    project: true,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile project",
    path: "/admin/sample",
    project: true,
    width: 390,
  },
  {
    height: 900,
    label: "desktop organization",
    organization: true,
    path: "/organizations/weblabs",
    width: 1366,
  },
  {
    height: 844,
    label: "mobile organization",
    organization: true,
    path: "/organizations/weblabs",
    width: 390,
  },
]) {
  test(`global GNB inner preserves ${state.label} legacy layout`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.project) await mockProject(page);
    if (state.organization) await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const inner = page.locator(INNER);
    await expect(inner).toBeVisible();
    await expect(inner).not.toHaveClass(/(?:^|\s)gnb-inner(?:\s|$)/u);
    await expect(
      inner.locator(":scope > [data-stylex-owner='global-sidebar-open-pin']"),
    ).toHaveCount(1);
    await expect(inner.locator(":scope > [data-stylex-owner='global-gnb-nav']")).toHaveCount(1);
    await expect(inner.locator(":scope > [data-stylex-owner$='site-user-menu']")).toHaveCount(1);

    const evidence = await inner.evaluate((element) => {
      const outer = element.parentElement!;
      const style = getComputedStyle(element);
      const after = getComputedStyle(element, "::after");
      const rect = element.getBoundingClientRect();
      const outerStyle = getComputedStyle(outer);
      const outerRect = outer.getBoundingClientRect();
      const contentWidth =
        outerRect.width - parseFloat(outerStyle.paddingLeft) - parseFloat(outerStyle.paddingRight);
      const expectedWidth = contentWidth * 0.98;
      const expectedMargin = (contentWidth - expectedWidth) / 2;
      return {
        after: { clear: after.clear, content: after.content, display: after.display },
        box: { height: rect.height, width: rect.width, x: rect.x },
        childOwners: [...element.children]
          .map((child) => child.getAttribute("data-stylex-owner"))
          .filter(Boolean),
        expectedMargin,
        expectedWidth,
        expectedX: outerRect.x + parseFloat(outerStyle.paddingLeft) + expectedMargin,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        style: {
          boxSizing: style.boxSizing,
          color: style.color,
          height: style.height,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          marginTop: style.marginTop,
          width: style.width,
        },
      };
    });

    expect(evidence.style.boxSizing).toBe("content-box");
    expect(evidence.style.color).toBe("rgb(120, 139, 167)");
    expect(evidence.style.height).toBe("40px");
    expect(evidence.style.marginTop).toBe("0px");
    expect(evidence.style.marginBottom).toBe("0px");
    expect(parseFloat(evidence.style.marginLeft)).toBeCloseTo(evidence.expectedMargin, 1);
    expect(parseFloat(evidence.style.marginRight)).toBeCloseTo(evidence.expectedMargin, 1);
    expect(parseFloat(evidence.style.width)).toBeCloseTo(evidence.expectedWidth, 1);
    expect(evidence.box.height).toBe(40);
    expect(evidence.box.width).toBeCloseTo(evidence.expectedWidth, 1);
    expect(evidence.box.x).toBeCloseTo(evidence.expectedX, 1);
    expect(evidence.after).toEqual({ clear: "none", content: "none", display: "inline" });
    expect(evidence.childOwners.slice(0, 2)).toEqual(["global-sidebar-open-pin", "global-gnb-nav"]);
    expect(evidence.overflow).toBe(false);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await inner.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-global-gnb-inner-${state.label.replaceAll(" ", "-")}.png`,
      ),
    });
  });
}

test("global GNB inner paint is isolated from its legacy presentation class", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);
  const result = await page.locator(INNER).evaluate((inner) => {
    const snapshot = () => {
      const style = getComputedStyle(inner);
      return {
        boxSizing: style.boxSizing,
        color: style.color,
        height: style.height,
        margin: style.margin,
        width: style.width,
      };
    };
    const owned = snapshot();
    const ownedAfter = getComputedStyle(inner, "::after");
    const ownedPseudo = {
      clear: ownedAfter.clear,
      content: ownedAfter.content,
      display: ownedAfter.display,
    };
    inner.classList.add("gnb-inner");
    return { owned, ownedPseudo, withLegacyClass: snapshot() };
  });
  expect(result.withLegacyClass).toEqual(result.owned);
  expect(result.ownedPseudo).toEqual({ clear: "none", content: "none", display: "inline" });
});

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
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}

async function mockProject(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        dashboard: { assignees: [], labels: [], milestones: [], pullRequests: [] },
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
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
        vcs: "GIT",
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
