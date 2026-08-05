import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

for (const state of ["populated", "empty"] as const) {
  for (const viewport of [
    { height: 900, label: "desktop", shellTop: 105, width: 1366 },
    { height: 844, label: "mobile", shellTop: 78, width: 390 },
  ]) {
    test(`left sidebar Favorite ${state} shell preserves ${viewport.label} legacy parity`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installAuthenticatedHome(page, state);
      await page.goto(`${BASE_PATH}/`);
      await page.evaluate(() => document.fonts.ready);

      const pane = page.locator("#left-sidebar-myOrganizationList");
      const shell = pane.locator(":scope > div");
      const input = shell.getByRole("textbox", { name: "Type name" });
      const result = shell.locator("#left-sidebar-organizations");
      await expect(pane).toBeVisible();
      await expect(pane).not.toHaveClass(/user-project-list/);
      await expect(shell).toBeVisible();
      await expect(input).toHaveAttribute("placeholder", "Type name");

      const initial = await readEvidence(shell);
      await saveScreenshot(
        page,
        `stylex-left-sidebar-favorite-shell-${state}-${viewport.label}-${initial.hasOwner ? "after" : "before"}.png`,
      );
      await shell.screenshot({
        path: resolve(
          SCREENSHOT_DIRECTORY,
          `stylex-left-sidebar-favorite-shell-element-${state}-${viewport.label}-${initial.hasOwner ? "after" : "before"}.png`,
        ),
      });

      expect(initial.hasOwner).toBe(true);
      expect(initial.hasLegacyAncestorClass).toBe(false);
      expect(initial.pluginAttributes).toEqual([]);
      expect(initial.ownedPresentationClasses).toEqual([]);
      expect(initial.geometry.root).toMatchObject({
        left: 0,
        top: viewport.shellTop,
        width: 270,
      });
      expect(initial.geometry.group).toMatchObject({
        height: 42,
        left: 0,
        top: viewport.shellTop,
        width: 270,
      });
      expect(initial.geometry.input).toMatchObject({
        height: 42,
        left: 0,
        top: viewport.shellTop,
        width: 279.296875,
      });
      expect(initial.geometry.result).toMatchObject({
        left: 0,
        top: viewport.shellTop + (state === "empty" ? 52 : 42),
        width: 270,
      });
      expect(initial.geometry.root.height).toBe(state === "empty" ? 70 : 69);
      expect(initial.geometry.result.height).toBe(state === "empty" ? 18 : 27);
      expect(initial.geometry.group.bottom).toBe(viewport.shellTop + 42);
      expect(initial.geometry.result.bottom).toBeLessThanOrEqual(initial.geometry.panel.bottom);
      expect(initial.styles.groupPosition).toBe("relative");
      expect(initial.styles.input).toEqual({
        backgroundColor: "rgb(0, 0, 0)",
        borderRadius: "0px",
        borderStyle: "none",
        borderWidth: "0px",
        boxSizing: "content-box",
        color: "rgb(255, 255, 255)",
        display: "block",
        fontSize: viewport.label === "mobile" ? "16px" : "14px",
        height: "34px",
        marginBottom: "0px",
        outlineStyle: "none",
        padding: "4px 6px",
        width: "267.297px",
      });
      expect(initial.styles.bar).toEqual({ display: "block", position: "relative" });
      expect(initial.styles.before).toEqual({
        backgroundColor: "rgb(233, 30, 99)",
        bottom: "1px",
        height: "1px",
        left: "135px",
        position: "absolute",
        transitionDuration: "0.2s",
        width: "0px",
      });
      expect(initial.styles.after).toEqual({
        backgroundColor: "rgb(233, 30, 99)",
        bottom: "1px",
        height: "1px",
        position: "absolute",
        right: "135px",
        transitionDuration: "0.2s",
        width: "0px",
      });
      expect(initial.styles.result).toMatchObject({
        display: "block",
        listStyleType: "none",
        margin: state === "empty" ? "10px 0px 25px" : "0px 0px 10px",
        maxHeight: `${viewport.height * 0.8}px`,
        overflowX: "auto",
        overflowY: "auto",
        padding: "0px",
        scrollbarBackground: "rgb(211, 211, 211)",
        scrollbarHeight: "10px",
        scrollbarThumbBackground: "rgb(39, 136, 186)",
        scrollbarWidth: "5px",
      });
      expect(initial.divider).toEqual(
        state === "populated"
          ? {
              borderTopColor: "rgb(128, 128, 128)",
              borderTopStyle: "dashed",
              borderTopWidth: "1px",
              height: 1,
            }
          : null,
      );

      if (state === "empty") {
        expect(initial.styles.result).toMatchObject({
          color: "rgb(199, 21, 133)",
          fontSize: "16px",
          textAlign: "center",
        });
        await expect(result).toHaveText("No results");
      } else {
        await expect(result.getByText("direct-favorite", { exact: true })).toBeVisible();
        await input.fill("missing");
        await expect(result.getByText("direct-favorite", { exact: true })).toHaveCount(0);
        await input.fill("direct");
        await expect(result.getByText("direct-favorite", { exact: true })).toBeVisible();
        await page
          .locator("#sidebar")
          .getByRole("button", { exact: true, name: "Project" })
          .click();
        await expect(
          page.locator("#left-sidebar-myProjectList").getByRole("textbox", { name: "Type name" }),
        ).toHaveValue("direct");
        await page
          .locator("#sidebar")
          .getByRole("button", { exact: true, name: "Favorite" })
          .click();
        await input.fill("");
      }

      await input.focus();
      await expect
        .poll(() =>
          shell.evaluate((element) => {
            const bar = element.firstElementChild?.lastElementChild;
            return bar ? Number.parseFloat(getComputedStyle(bar, "::before").width) : -1;
          }),
        )
        .toBe(135);
      const focused = await readEvidence(shell);
      expect(focused.styles.before.width).toBe("135px");
      expect(focused.styles.after.width).toBe("135px");
      expect(focused.styles.input.borderStyle).toBe("none");
      expect(focused.styles.input.outlineStyle).toBe("none");

      await input.blur();
      await page.waitForTimeout(250);
      const blurred = await readEvidence(shell);
      expect(blurred.styles.before.width).toBe("0px");
      expect(blurred.styles.after.width).toBe("0px");

      await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
      const rightShell = page.locator('[data-stylex-owner="authenticated-sidenav-favorite-shell"]');
      await expect(rightShell).toBeVisible();
      await expect(rightShell).toHaveClass(/search-result/);
      await expect(
        rightShell.locator(":scope > .group > input.search-input.org-search"),
      ).toHaveCount(1);
      await expect(rightShell.locator(":scope > .group > .bar")).toHaveCount(1);
      await expect(rightShell.locator(":scope > .user-ul, :scope > .no-result")).toHaveCount(1);
      await expect(
        page.locator(
          '#left-sidebar-myOrganizationList [data-stylex-owner="authenticated-sidenav-favorite-shell"]',
        ),
      ).toHaveCount(0);
      await expect(
        page.locator('#myOrganizationList [data-stylex-owner="left-sidebar-favorite-shell"]'),
      ).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    });
  }
}

test("left sidebar Favorite shell has complete global-theme StyleX ownership", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const styleStart = routeSource.indexOf("const leftSidebarFavoriteShellStyles");
  const styleEnd = routeSource.indexOf("const authenticatedSidenavFavoriteShellStyles", styleStart);
  const componentStart = routeSource.indexOf("function SidebarOrganizationList");
  const componentEnd = routeSource.indexOf("function SidebarProjectList", componentStart);

  expect(styleStart).toBeGreaterThanOrEqual(0);
  expect(styleEnd).toBeGreaterThan(styleStart);
  expect(componentStart).toBeGreaterThanOrEqual(0);
  expect(componentEnd).toBeGreaterThan(componentStart);
  const ownerSource = routeSource.slice(styleStart, styleEnd);
  const componentSource = routeSource.slice(componentStart, componentEnd);
  for (const token of [
    "leftSidebarFavoriteSearchSurface",
    "leftSidebarFavoriteSearchText",
    "leftSidebarFavoriteDividerBorder",
    "sidenavNoResultText",
    "sidenavSearchFocusAccent",
    "sidenavScrollbarTrack",
    "sidenavScrollbarThumb",
  ]) {
    expect(ownerSource).toContain(`homeColors.${token}`);
  }
  expect(ownerSource).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|!important/i);
  expect(themeSource).toContain('leftSidebarFavoriteSearchSurface: "#000000"');
  expect(themeSource).toContain('leftSidebarFavoriteSearchText: "#ffffff"');
  expect(themeSource).toContain('leftSidebarFavoriteDividerBorder: "#808080"');
  expect(componentSource).toContain('idPrefix === "left-sidebar"');
  expect(componentSource).toContain('"left-sidebar-favorite-shell"');
  expect(componentSource).toContain("leftSidebarFavoriteShellStyles");
  expect(componentSource).toContain('"authenticated-sidenav-favorite-shell"');
});

async function installAuthenticatedHome(page: Page, state: "populated" | "empty") {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myOrganizationList");
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
        favoriteProjects:
          state === "populated"
            ? [
                {
                  isFavorited: true,
                  ownerName: "outsider",
                  projectId: 41,
                  projectName: "direct-favorite",
                },
              ]
            : [],
        issueItems: [],
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

async function readEvidence(shell: Locator) {
  return shell.evaluate((element) => {
    const group = element.firstElementChild;
    const input = group?.querySelector("input");
    const bar = group?.querySelector("span");
    const result = element.lastElementChild;
    const panel = element.closest('[data-stylex-owner="left-sidebar-tab-panel"]');
    if (!group || !input || !bar || !result || !panel) {
      throw new Error("Left sidebar Favorite shell is incomplete");
    }
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
    const inputStyle = getComputedStyle(input);
    const barStyle = getComputedStyle(bar);
    const before = getComputedStyle(bar, "::before");
    const after = getComputedStyle(bar, "::after");
    const resultStyle = getComputedStyle(result);
    const divider = result.firstElementChild?.matches("ul") ? result.firstElementChild : null;
    const dividerStyle = divider ? getComputedStyle(divider) : null;
    const scrollbar = getComputedStyle(result, "::-webkit-scrollbar");
    const thumb = getComputedStyle(result, "::-webkit-scrollbar-thumb");
    const ownedClasses = [
      "search-result",
      "group",
      "search-input",
      "org-search",
      "bar",
      "tab-pane",
      "user-ul",
      "no-result",
      "etc-favorites",
    ];
    return {
      divider:
        divider && dividerStyle
          ? {
              borderTopColor: dividerStyle.borderTopColor,
              borderTopStyle: dividerStyle.borderTopStyle,
              borderTopWidth: dividerStyle.borderTopWidth,
              height: divider.getBoundingClientRect().height,
            }
          : null,
      geometry: {
        group: box(group),
        input: box(input),
        panel: box(panel),
        result: box(result),
        root: box(element),
      },
      hasOwner: element.getAttribute("data-stylex-owner") === "left-sidebar-favorite-shell",
      hasLegacyAncestorClass:
        element.parentElement?.classList.contains("user-project-list") ?? false,
      ownedPresentationClasses: [element, group, input, bar, result].flatMap((target) =>
        ownedClasses.filter((className) => target.classList.contains(className)),
      ),
      pluginAttributes: Array.from(
        element.querySelectorAll(
          "[data-toggle], [data-target], [data-action], [data-href], [data-url], [data-request-method]",
        ),
        (node) => node.tagName.toLowerCase(),
      ),
      styles: {
        after: {
          backgroundColor: after.backgroundColor,
          bottom: after.bottom,
          height: after.height,
          position: after.position,
          right: after.right,
          transitionDuration: after.transitionDuration,
          width: after.width,
        },
        bar: { display: barStyle.display, position: barStyle.position },
        before: {
          backgroundColor: before.backgroundColor,
          bottom: before.bottom,
          height: before.height,
          left: before.left,
          position: before.position,
          transitionDuration: before.transitionDuration,
          width: before.width,
        },
        groupPosition: getComputedStyle(group).position,
        input: {
          backgroundColor: inputStyle.backgroundColor,
          borderRadius: inputStyle.borderRadius,
          borderStyle: inputStyle.borderStyle,
          borderWidth: inputStyle.borderWidth,
          boxSizing: inputStyle.boxSizing,
          color: inputStyle.color,
          display: inputStyle.display,
          fontSize: inputStyle.fontSize,
          height: inputStyle.height,
          marginBottom: inputStyle.marginBottom,
          outlineStyle: inputStyle.outlineStyle,
          padding: inputStyle.padding,
          width: inputStyle.width,
        },
        result: {
          color: resultStyle.color,
          display: resultStyle.display,
          fontSize: resultStyle.fontSize,
          listStyleType: resultStyle.listStyleType,
          margin: resultStyle.margin,
          maxHeight: resultStyle.maxHeight,
          overflowX: resultStyle.overflowX,
          overflowY: resultStyle.overflowY,
          padding: resultStyle.padding,
          scrollbarBackground: scrollbar.backgroundColor,
          scrollbarHeight: scrollbar.height,
          scrollbarThumbBackground: thumb.backgroundColor,
          scrollbarWidth: scrollbar.width,
          textAlign: resultStyle.textAlign,
        },
      },
    };
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
