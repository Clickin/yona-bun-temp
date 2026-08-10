import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav tab panel has narrow Style ownership", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");

  expect(routeSource).toContain('data-owner="authenticated-sidenav-tab-panel"');
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`authenticated side-nav tab panel preserves ${viewport.label} state and geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    const panel = page.locator('[data-owner="authenticated-sidenav-tab-panel"]');
    const inner = panel.locator(":scope > #usermenu-tab-content-list");
    const favorite = inner.locator(":scope > #myOrganizationList");
    const project = inner.locator(":scope > #myProjectList");
    const recent = inner.locator(":scope > #myRecentIssueList");

    await expect(panel).toBeVisible();
    const base = await readPanelEvidence(panel, inner, favorite, project, recent);
    console.log(`authenticated-sidenav-tab-panel-${viewport.label}`, JSON.stringify(base));
    await saveScreenshot(
      page,
      `style-authenticated-sidenav-tab-panel-${viewport.label}-${base.hasOwner ? "after" : "before"}.png`,
    );

    expect(base.hasOwner).toBe(true);
    expect(base.order).toEqual(["myOrganizationList", "myProjectList", "myRecentIssueList"]);
    expect(base.pluginAttributes).toEqual([]);
    expect(base.panelStyles).toEqual({
      borderBottomLeftRadius: "4px",
      borderBottomRightRadius: "4px",
      borderTopLeftRadius: "0px",
      borderTopRightRadius: "0px",
      borderTopStyle: "none",
      borderTopWidth: "0px",
      overflowX: "hidden",
      overflowY: "hidden",
    });
    expect(base.innerStyles).toEqual({ overflowX: "hidden", overflowY: "hidden" });
    expect(base.paneDisplays).toEqual({ favorite: "block", project: "none", recent: "none" });
    expect(base.geometry.panel.left).toBe(base.geometry.tabs.left);
    expect(base.geometry.panel.right).toBe(base.geometry.tabs.right);
    expect(base.geometry.panel.top).toBe(base.geometry.tabs.bottom);
    expect(base.geometry.inner.left).toBe(base.geometry.panel.left);
    expect(base.geometry.inner.right).toBe(base.geometry.panel.right);
    expect(base.geometry.favorite.left).toBeGreaterThanOrEqual(base.geometry.inner.left);
    expect(base.geometry.favorite.right).toBeLessThanOrEqual(base.geometry.inner.right);
    expect(base.geometry.project.width).toBe(0);
    expect(base.geometry.recent.width).toBe(0);
    expect(base.geometry.panel.right).toBeLessThanOrEqual(base.geometry.frame.right);
    expect(base.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await page.getByRole("button", { name: "Project", exact: true }).click();
    await expect(project).toBeVisible();
    await expect(favorite).toBeHidden();
    let active = await readPanelEvidence(panel, inner, favorite, project, recent);
    expect(active.paneDisplays).toEqual({ favorite: "none", project: "block", recent: "none" });
    expect(active.activeIds).toEqual(["myProjectList"]);
    expect(active.geometry.project.left).toBeGreaterThanOrEqual(active.geometry.inner.left);
    expect(active.geometry.project.right).toBeLessThanOrEqual(active.geometry.inner.right);

    await page.getByRole("button", { name: "Recent History", exact: true }).click();
    await expect(recent).toBeVisible();
    await expect(project).toBeHidden();
    active = await readPanelEvidence(panel, inner, favorite, project, recent);
    expect(active.paneDisplays).toEqual({ favorite: "none", project: "none", recent: "block" });
    expect(active.activeIds).toEqual(["myRecentIssueList"]);

    await page.getByRole("button", { name: "Favorite", exact: true }).click();
    await expect(favorite).toBeVisible();
    await expect(recent).toBeHidden();
    active = await readPanelEvidence(panel, inner, favorite, project, recent);
    expect(active.paneDisplays).toEqual({ favorite: "block", project: "none", recent: "none" });
    expect(active.activeIds).toEqual(["myOrganizationList"]);

    await removeStyleClasses(panel, inner, favorite, project, recent);
    const fallback = await readPanelEvidence(panel, inner, favorite, project, recent);
    expect(fallback.panelStyles).toEqual(active.panelStyles);
    expect(fallback.innerStyles).toEqual(active.innerStyles);
    expect(fallback.paneDisplays).toEqual(active.paneDisplays);
    expect(fallback.geometry).toEqual(active.geometry);
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: 0,
            projects: [],
          },
        ],
        favoriteProjects: [],
        organizations: [{ organizationId: 11, organizationName: "weblabs", projects: [] }],
        profile: {
          avatarUrl: "/legacy-assets/images/default-avatar-34.png",
          isGuest: false,
          loginId: "admin",
        },
        recentIssues: [],
      },
    }),
  );
}

async function readPanelEvidence(
  panel: Locator,
  inner: Locator,
  favorite: Locator,
  project: Locator,
  recent: Locator,
) {
  return panel.evaluate(
    (element, targets) => {
      const [innerElement, favoriteElement, projectElement, recentElement] =
        targets as HTMLElement[];
      const frame = element.parentElement;
      const tabs = element.previousElementSibling;
      if (!frame || !tabs)
        throw new Error("Authenticated side-nav tab panel structure is incomplete");
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      const panelStyle = getComputedStyle(element);
      const innerStyle = getComputedStyle(innerElement);
      const paneDisplays = {
        favorite: getComputedStyle(favoriteElement).display,
        project: getComputedStyle(projectElement).display,
        recent: getComputedStyle(recentElement).display,
      };
      return {
        activeIds: [favoriteElement, projectElement, recentElement]
          .filter((pane) => pane.classList.contains("active"))
          .map((pane) => pane.id),
        geometry: {
          favorite: box(favoriteElement),
          frame: box(frame),
          inner: box(innerElement),
          panel: box(element),
          project: box(projectElement),
          recent: box(recentElement),
          tabs: box(tabs),
        },
        hasOwner: element.getAttribute("data-owner") === "authenticated-sidenav-tab-panel",
        innerStyles: { overflowX: innerStyle.overflowX, overflowY: innerStyle.overflowY },
        order: Array.from(innerElement.children, (child) => child.id),
        paneDisplays,
        panelStyles: {
          borderBottomLeftRadius: panelStyle.borderBottomLeftRadius,
          borderBottomRightRadius: panelStyle.borderBottomRightRadius,
          borderTopLeftRadius: panelStyle.borderTopLeftRadius,
          borderTopRightRadius: panelStyle.borderTopRightRadius,
          borderTopStyle: panelStyle.borderTopStyle,
          borderTopWidth: panelStyle.borderTopWidth,
          overflowX: panelStyle.overflowX,
          overflowY: panelStyle.overflowY,
        },
        pluginAttributes: Array.from(
          element.querySelectorAll(
            "[data-toggle], [data-target], [data-action], [data-href], [data-url], [data-request-method]",
          ),
          (node) => node.tagName.toLowerCase(),
        ),
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
      };
    },
    [
      await inner.elementHandle(),
      await favorite.elementHandle(),
      await project.elementHandle(),
      await recent.elementHandle(),
    ],
  );
}

async function removeStyleClasses(
  panel: Locator,
  inner: Locator,
  favorite: Locator,
  project: Locator,
  recent: Locator,
) {
  await panel.evaluate(
    (element, targets) => {
      element.className = "tab-content tab-box";
      const [innerElement, favoriteElement, projectElement, recentElement] =
        targets as HTMLElement[];
      innerElement.className = "tab-content";
      favoriteElement.className = "tab-pane user-project-list active";
      projectElement.className = "tab-pane user-project-list";
      recentElement.className = "tab-pane user-project-list";
    },
    [
      await inner.elementHandle(),
      await favorite.elementHandle(),
      await project.elementHandle(),
      await recent.elementHandle(),
    ],
  );
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
