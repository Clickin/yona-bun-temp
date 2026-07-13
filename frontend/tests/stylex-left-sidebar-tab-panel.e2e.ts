import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("framed left sidebar tab panel has complete StyleX ownership", () => {
  const source = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const componentStart = source.indexOf("function LegacyFramedSidebar");
  const componentEnd = source.indexOf("const leftSidebarTabStyles", componentStart);
  const contentStart = source.indexOf("function SidebarTabContent");
  const contentEnd = source.indexOf("type SidebarFavoriteTarget", contentStart);
  const styleStart = source.indexOf("const leftSidebarTabPanelStyles");
  const styleEnd = source.indexOf("const leftSidebarTabStyles", styleStart);

  expect(componentStart).toBeGreaterThanOrEqual(0);
  expect(componentEnd).toBeGreaterThan(componentStart);
  expect(contentStart).toBeGreaterThanOrEqual(0);
  expect(contentEnd).toBeGreaterThan(contentStart);
  expect(styleStart).toBeGreaterThanOrEqual(0);
  expect(styleEnd).toBeGreaterThan(styleStart);

  const componentSource = source.slice(componentStart, componentEnd);
  const contentSource = source.slice(contentStart, contentEnd);
  const ownerSource = source.slice(styleStart, styleEnd);
  expect(componentSource).toContain('data-stylex-owner="left-sidebar-tab-panel"');
  expect(componentSource).not.toMatch(/className="tab-content(?: tab-box)?"/);
  expect(contentSource).toContain("leftSidebarTabPanelStyles.pane");
  expect(contentSource).toContain("leftSidebarTabPanelStyles.activePane");
  expect(ownerSource).toContain("stylex.create");
  expect(ownerSource).not.toMatch(/globalColors|#[\da-f]{3,8}\b|rgba?\(|hsla?\(|!important/i);
});

for (const viewport of [
  { height: 900, label: "desktop", panelTop: 105, width: 1366 },
  { height: 844, label: "mobile", panelTop: 78, width: 390 },
] as const) {
  test(`framed left sidebar tab panel preserves ${viewport.label} legacy parity and React state`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const inner = page.locator("#left-sidebar-tab-content-list");
    const panel = inner.locator("..");
    const tabs = page.locator('[data-stylex-owner="left-sidebar-tabs"]');
    const favorite = tabs.getByRole("button", { exact: true, name: "Favorite" });
    const project = tabs.getByRole("button", { exact: true, name: "Project" });
    const recent = tabs.getByRole("button", { exact: true, name: "Recent History" });

    await expect(inner).toBeVisible();
    await expect(recent).toHaveAttribute("aria-pressed", "true");
    await saveScreenshot(
      page,
      `stylex-left-sidebar-tab-panel-local-${viewport.label}-${(await panel.getAttribute("data-stylex-owner")) === "left-sidebar-tab-panel" ? "after" : "before"}.png`,
    );

    const initial = await readPanelEvidence(panel);
    expect(initial.owner).toBe("left-sidebar-tab-panel");
    expect(initial.geometry.panel).toEqual({
      height: 106,
      left: 0,
      top: viewport.panelTop,
      width: 270,
    });
    expect(initial.geometry.inner).toEqual(initial.geometry.panel);
    expect(initial.paneIds).toEqual([
      "left-sidebar-myOrganizationList",
      "left-sidebar-myProjectList",
      "left-sidebar-myRecentIssueList",
    ]);
    expect(initial.geometry.panes).toEqual([
      { height: 0, left: 0, top: 0, width: 0 },
      { height: 0, left: 0, top: 0, width: 0 },
      initial.geometry.panel,
    ]);
    expect(initial.styles).toEqual({
      inner: { borderRadius: "0px", overflowX: "hidden", overflowY: "hidden" },
      panel: {
        borderRadius: "0px 0px 4px 4px",
        borderTopStyle: "none",
        overflowX: "hidden",
        overflowY: "hidden",
      },
      paneDisplays: ["none", "none", "block"],
    });
    expect(initial.pluginAttributes).toEqual([]);
    expect(initial.retainedUserProjectList).toEqual([false, true, true]);
    expect(initial.removedPresentationClasses).toEqual([]);

    await assertSingleVisiblePane(panel, "left-sidebar-myRecentIssueList");
    await favorite.click();
    await assertSingleVisiblePane(panel, "left-sidebar-myOrganizationList");
    expect(await page.evaluate(() => localStorage.getItem("sidebarActiveMenu"))).toBe(
      "myOrganizationList",
    );
    await assertActivePaneFitsPanel(panel);

    await project.click();
    await assertSingleVisiblePane(panel, "left-sidebar-myProjectList");
    expect(await page.evaluate(() => localStorage.getItem("sidebarActiveMenu"))).toBe(
      "myProjectList",
    );
    await assertActivePaneFitsPanel(panel);

    await recent.click();
    await assertSingleVisiblePane(panel, "left-sidebar-myRecentIssueList");
    expect(await page.evaluate(() => localStorage.getItem("sidebarActiveMenu"))).toBe(
      "myRecentIssueList",
    );
    await assertActivePaneFitsPanel(panel);

    await expect(page.locator('[data-stylex-owner="authenticated-sidenav-tab-panel"]')).toHaveCount(
      1,
    );
    await expect(
      page.locator('[data-stylex-owner="authenticated-sidenav-tab-panel"].tab-content.tab-box'),
    ).toHaveCount(1);
    await expect(
      page.locator(
        '[data-stylex-owner="authenticated-sidenav-tab-panel"] > #usermenu-tab-content-list.tab-content',
      ),
    ).toHaveCount(1);
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myRecentIssueList");
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
        avatarUrl: "",
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
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [
          { issueNumber: 11, ownerName: "outside", projectName: "project", title: "needle issue" },
          { issueNumber: 12, ownerName: "outside", projectName: "project", title: "other issue" },
        ],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}

async function readPanelEvidence(panel: Locator) {
  return panel.evaluate((element) => {
    const inner = element.firstElementChild as HTMLElement | null;
    const panes = inner ? Array.from(inner.children) : [];
    if (!inner || panes.length !== 3) {
      throw new Error("Left sidebar tab panel is incomplete.");
    }
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
    };
    const panelStyle = getComputedStyle(element);
    const innerStyle = getComputedStyle(inner);
    return {
      geometry: { inner: box(inner), panel: box(element), panes: panes.map(box) },
      owner: element.getAttribute("data-stylex-owner"),
      paneIds: panes.map((pane) => pane.id),
      retainedUserProjectList: panes.map((pane) => pane.classList.contains("user-project-list")),
      pluginAttributes: Array.from(
        element.querySelectorAll(
          "[data-toggle], [data-placement], [data-action], [data-href], [data-url], [data-request-method], [data-dismiss], [data-target], [data-trigger], [data-backdrop], [data-spy], [data-provider], [data-loading-text]",
        ),
        (node) => node.tagName.toLowerCase(),
      ),
      removedPresentationClasses: Array.from(
        element.querySelectorAll(
          ":scope.tab-content, :scope.tab-box, :scope > .tab-content, :scope > * > .tab-pane, :scope > * > .active",
        ),
        (node) => node.className,
      ),
      styles: {
        inner: {
          borderRadius: innerStyle.borderRadius,
          overflowX: innerStyle.overflowX,
          overflowY: innerStyle.overflowY,
        },
        panel: {
          borderRadius: panelStyle.borderRadius,
          borderTopStyle: panelStyle.borderTopStyle,
          overflowX: panelStyle.overflowX,
          overflowY: panelStyle.overflowY,
        },
        paneDisplays: panes.map((pane) => getComputedStyle(pane).display),
      },
    };
  });
}

async function assertSingleVisiblePane(panel: Locator, expectedId: string) {
  const panes = panel.locator(
    ":scope > * > #left-sidebar-myOrganizationList, :scope > * > #left-sidebar-myProjectList, :scope > * > #left-sidebar-myRecentIssueList",
  );
  await expect(panes).toHaveCount(3);
  await expect(panes.filter({ visible: true })).toHaveCount(1);
  await expect(panes.filter({ visible: true })).toHaveAttribute("id", expectedId);
}

async function assertActivePaneFitsPanel(panel: Locator) {
  const geometry = await panel.evaluate((element) => {
    const inner = element.firstElementChild as HTMLElement;
    const active = Array.from(inner.children).find(
      (pane) => getComputedStyle(pane).display === "block",
    );
    const hidden = Array.from(inner.children).filter(
      (pane) => getComputedStyle(pane).display === "none",
    );
    if (!active) throw new Error("Expected one active left sidebar pane.");
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      };
    };
    return { active: box(active), hidden: hidden.map(box), inner: box(inner), panel: box(element) };
  });
  expect(geometry.inner).toEqual(geometry.panel);
  expect(geometry.active).toMatchObject({
    left: geometry.panel.left,
    top: geometry.panel.top,
    width: geometry.panel.width,
  });
  expect(geometry.active.height).toBeGreaterThan(0);
  expect(geometry.active.bottom).toBeLessThanOrEqual(geometry.panel.bottom);
  expect(geometry.hidden).toEqual([
    { bottom: 0, height: 0, left: 0, top: 0, width: 0 },
    { bottom: 0, height: 0, left: 0, top: 0, width: 0 },
  ]);
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
