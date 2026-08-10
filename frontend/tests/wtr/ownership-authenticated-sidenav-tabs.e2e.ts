import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav tabs use global Style color variables", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  expect(routeSource).toContain('data-owner="authenticated-sidenav-tabs"');
});

for (const viewport of [
  { label: "desktop", width: 1366, height: 900 },
  { label: "mobile", width: 390, height: 844 },
]) {
  test(`authenticated side-nav tabs preserve ${viewport.label} appearance and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    // F5 dist-truth: the shell slides open with a 0.5s width transition
    // (rootSidebarMotionStyles.shell); tab geometry only matches the settled
    // layout (legacy #mySidenav _usermenu.less:852), so wait it out
    // (favorite-stars precedent waits 600ms).
    await page.waitForTimeout(600);
    const favorite = page.getByRole("button", { name: "Favorite", exact: true });
    const project = page.getByRole("button", { name: "Project", exact: true });
    const recent = page.getByRole("button", { name: "Recent History", exact: true });
    const tabs = favorite.locator("xpath=../..");

    await expect(tabs).toBeVisible();
    await expect(tabs.locator(":scope > li > button")).toHaveText([
      "Favorite",
      "Project",
      "Recent History",
    ]);
    // wave-33 retained-class retention (667398a04): tab buttons retain legacy
    // data-toggle="tab" per usermenu.scala.html:53-55.
    for (const button of [favorite, project, recent]) {
      await expect(button).toHaveAttribute("data-toggle", "tab");
    }

    const base = await readTabEvidence(tabs, favorite, project, recent);
    console.log(`authenticated-sidenav-tabs-${viewport.label}`, JSON.stringify(base));
    await saveScreenshot(
      page,
      `style-authenticated-sidenav-tabs-${viewport.label}-${base.hasOwner ? "after" : "before"}.png`,
    );

    expect(base.hasOwner).toBe(true);
    expect(base.order).toEqual(["Favorite", "Project", "Recent History"]);
    expect(base.tabsStyles).toEqual({
      borderBottomColor: "rgb(221, 221, 221)",
      borderBottomStyle: "solid",
      borderBottomWidth: "1px",
      listStyleType: "none",
      paddingLeft: "0px",
    });
    expect(base.itemStyles).toEqual({ cssFloat: "left", marginBottom: "-1px" });
    expect(base.projectStyles).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      borderLeftColor: "rgba(0, 0, 0, 0)",
      borderRadius: "4px 4px 0px 0px",
      borderRightColor: "rgba(0, 0, 0, 0)",
      borderStyle: "solid",
      borderTopColor: "rgba(0, 0, 0, 0)",
      borderWidth: "1px",
      color: "rgb(53, 146, 181)",
      cursor: "pointer",
      display: "block",
      fontWeight: "400",
      lineHeight: "20px",
      marginRight: "2px",
      padding: "8px 30px",
    });
    expect(base.favoriteStyles).toEqual({
      ...base.projectStyles,
      backgroundColor: "rgb(255, 255, 255)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      borderLeftColor: "rgb(221, 221, 221)",
      borderRightColor: "rgb(221, 221, 221)",
      borderTopColor: "rgb(221, 221, 221)",
      color: "rgb(85, 85, 85)",
      cursor: "default",
    });
    expect(base.geometry.favorite.left).toBe(base.geometry.tabs.left);
    expect(base.geometry.recent.right).toBeLessThanOrEqual(base.geometry.tabs.right);
    expect(base.geometry.tabs.bottom).toBe(base.geometry.recent.bottom);
    expect(base.geometry.favorite.right).toBeLessThanOrEqual(base.geometry.project.left);
    if (viewport.width > 720) {
      expect(base.geometry.project.bottom - base.geometry.recent.top).toBe(1);
    } else {
      expect(base.geometry.project.right).toBeLessThanOrEqual(base.geometry.recent.left);
    }
    expect(base.viewport).toEqual({ scrollWidth: viewport.width, width: viewport.width });

    await project.hover();
    expect(await readButtonStyles(project)).toMatchObject({
      backgroundColor: "rgb(242, 242, 242)",
      borderBottomColor: "rgb(221, 221, 221)",
      borderLeftColor: "rgb(238, 238, 238)",
      borderRightColor: "rgb(238, 238, 238)",
      borderTopColor: "rgb(238, 238, 238)",
    });
    await project.focus();
    expect(await readButtonStyles(project)).toMatchObject({
      backgroundColor: "rgb(242, 242, 242)",
      borderBottomColor: "rgb(221, 221, 221)",
      borderLeftColor: "rgb(238, 238, 238)",
      borderRightColor: "rgb(238, 238, 238)",
      borderTopColor: "rgb(238, 238, 238)",
    });

    await project.click();
    await expect(project.locator("xpath=..")).toHaveClass(/\bactive\b/);
    await expect(favorite.locator("xpath=..")).not.toHaveClass(/\bactive\b/);
    await expect(page.locator("#mySidenav #myProjectList")).toHaveClass(/\bactive\b/);
    await expect(page.locator("#mySidenav #myOrganizationList")).not.toHaveClass(/\bactive\b/);
    expect(await readButtonStyles(project)).toMatchObject({
      backgroundColor: "rgb(255, 255, 255)",
      borderBottomColor: "rgba(0, 0, 0, 0)",
      borderLeftColor: "rgb(221, 221, 221)",
      borderRightColor: "rgb(221, 221, 221)",
      borderTopColor: "rgb(221, 221, 221)",
      color: "rgb(85, 85, 85)",
      cursor: "default",
    });

    await page.mouse.move(0, 0);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const activeWithStyle = await readTabEvidence(tabs, favorite, project, recent);
    await removeStyleClasses(tabs);
    const fallback = await readTabEvidence(tabs, favorite, project, recent);
    expect(fallback.tabsStyles).toEqual(activeWithStyle.tabsStyles);
    expect(fallback.itemStyles).toEqual(activeWithStyle.itemStyles);
    expect(fallback.favoriteStyles).toEqual(activeWithStyle.favoriteStyles);
    expect(fallback.projectStyles).toEqual(activeWithStyle.projectStyles);
    expect(fallback.recentStyles).toEqual(activeWithStyle.recentStyles);
    expect(fallback.geometry).toEqual(activeWithStyle.geometry);
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

async function readTabEvidence(
  tabs: Locator,
  favorite: Locator,
  project: Locator,
  recent: Locator,
) {
  return tabs.evaluate(
    (element, targets) => {
      const [favoriteElement, projectElement, recentElement] = targets as HTMLElement[];
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      const tabsStyle = getComputedStyle(element);
      const firstItemStyle = getComputedStyle(favoriteElement.parentElement!);
      const buttonStyles = (target: HTMLElement) => {
        const style = getComputedStyle(target);
        return {
          backgroundColor: style.backgroundColor,
          borderBottomColor: style.borderBottomColor,
          borderLeftColor: style.borderLeftColor,
          borderRadius: style.borderRadius,
          borderRightColor: style.borderRightColor,
          borderStyle: style.borderStyle,
          borderTopColor: style.borderTopColor,
          borderWidth: style.borderWidth,
          color: style.color,
          cursor: style.cursor,
          display: style.display,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          marginRight: style.marginRight,
          padding: style.padding,
        };
      };
      return {
        favoriteStyles: buttonStyles(favoriteElement),
        geometry: {
          favorite: box(favoriteElement),
          project: box(projectElement),
          recent: box(recentElement),
          tabs: box(element),
        },
        hasOwner: element.getAttribute("data-owner") === "authenticated-sidenav-tabs",
        itemStyles: {
          cssFloat: firstItemStyle.cssFloat,
          marginBottom: firstItemStyle.marginBottom,
        },
        order: Array.from(element.querySelectorAll(":scope > li > button"), (button) =>
          button.textContent?.trim(),
        ),
        projectStyles: buttonStyles(projectElement),
        recentStyles: buttonStyles(recentElement),
        tabsStyles: {
          borderBottomColor: tabsStyle.borderBottomColor,
          borderBottomStyle: tabsStyle.borderBottomStyle,
          borderBottomWidth: tabsStyle.borderBottomWidth,
          listStyleType: tabsStyle.listStyleType,
          paddingLeft: tabsStyle.paddingLeft,
        },
        viewport: { scrollWidth: document.documentElement.scrollWidth, width: innerWidth },
      };
    },
    [await favorite.elementHandle(), await project.elementHandle(), await recent.elementHandle()],
  );
}

async function readButtonStyles(button: Locator) {
  return button.evaluate((target) => {
    const style = getComputedStyle(target);
    return {
      backgroundColor: style.backgroundColor,
      borderBottomColor: style.borderBottomColor,
      borderLeftColor: style.borderLeftColor,
      borderRightColor: style.borderRightColor,
      borderTopColor: style.borderTopColor,
      color: style.color,
      cursor: style.cursor,
    };
  });
}

async function removeStyleClasses(tabs: Locator) {
  await tabs.evaluate((element) => {
    element.className = "nav nav-tabs nm";
    for (const item of element.querySelectorAll(":scope > li")) {
      item.className = item.className.replace(/ x[a-z\d]+/g, "");
      const button = item.querySelector("button");
      if (button) button.className = "";
    }
  });
}

async function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await page.screenshot({ fullPage: true, path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
