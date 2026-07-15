import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav account actions have complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const styleStart = route.indexOf("const authenticatedSidenavAccountActionStyles");
  const styleEnd = route.indexOf("const authenticatedSidenavShellStyles", styleStart);
  const styles = route.slice(styleStart, styleEnd);

  expect(styles).toContain("stylex.create");
  expect(styles).toContain("homeColors.sidenavText");
  expect(styles).toContain("homeColors.sidenavLogoutHover");
  for (const token of [
    "sidenavAccountLogoutText",
    "sidenavAccountLogoutSurface",
    "sidenavAccountLogoutTextShadow",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i);

  const ownerMarker = route.indexOf('data-stylex-owner="authenticated-sidenav-account-actions"');
  const ownerStart = route.lastIndexOf("<div", ownerMarker);
  const ownerEnd = route.indexOf("<ul", ownerMarker);
  const owner = route.slice(ownerStart, ownerEnd);
  expect(owner.match(/\{" "\}/gu)).toHaveLength(2);
  expect(owner).not.toContain("row-fluid user-menu-wrap");
  expect(owner).not.toContain("className={`user-menu");
  expect(owner).not.toContain("user-menu logout label");
  expect(owner).toContain("reloadDocument");
});

for (const viewport of [
  {
    geometry: {
      account: { left: 230.03125, width: 52.625 },
      logout: { left: 296.25, rightInset: 5, width: 48.75 },
      profile: { left: 174.125, width: 42.3125 },
      row: { height: 21, width: 350 },
    },
    height: 900,
    label: "desktop",
    width: 1366,
  },
  {
    geometry: {
      account: { left: 270.03125, width: 52.625 },
      logout: { left: 336.25, rightInset: 5, width: 48.75 },
      profile: { left: 214.125, width: 42.3125 },
      row: { height: 21, width: 390 },
    },
    height: 844,
    label: "mobile",
    width: 390,
  },
]) {
  test(`authenticated side-nav account actions preserve ${viewport.label} legacy parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const toggle = page.getByRole("button", { name: "User menu, Shortcut (F)" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const owner = page.locator(
      '#mySidenav [data-stylex-owner="authenticated-sidenav-account-actions"]',
    );
    await expect(owner).toBeVisible();
    const profile = owner.getByRole("link", { name: "Profile", exact: true });
    const account = owner.getByRole("link", { name: "Account", exact: true });
    const logout = owner.getByRole("link", { name: "Log out", exact: true });

    await expect(profile).toHaveAttribute("href", `${BASE_PATH}/admin`);
    await expect(account).toHaveAttribute("href", `${BASE_PATH}/user/editform`);
    await expect(logout).toHaveAttribute("href", `${BASE_PATH}/users/logout`);

    const evidence = await readAccountActionEvidence(owner);
    await saveScreenshot(
      owner,
      `stylex-authenticated-sidenav-account-primitives-local-${viewport.label}.png`,
    );
    expect(evidence).toEqual({
      actionOrder: ["SPAN", "SPAN", "A"],
      geometry: viewport.geometry,
      legacyClasses: [],
      order: ["Profile", "Account", "Log out"],
      owner: "authenticated-sidenav-account-actions",
      styles: {
        account: {
          color: "rgb(0, 0, 0)",
          display: "inline",
          fontSize: "12px",
          lineHeight: "20px",
          marginLeft: "5px",
          marginRight: "5px",
          padding: "3px",
        },
        logout: {
          backgroundColor: "rgb(153, 153, 153)",
          borderRadius: "1px",
          color: "rgb(255, 255, 255)",
          display: "inline-block",
          fontSize: "12px",
          fontWeight: "400",
          lineHeight: "14px",
          marginLeft: "5px",
          marginRight: "5px",
          padding: "3px",
          textShadow: "rgba(0, 0, 0, 0.25) 0px -1px 0px",
          verticalAlign: "baseline",
          whiteSpace: "nowrap",
        },
        profile: {
          color: "rgb(0, 0, 0)",
          display: "inline",
          fontSize: "12px",
          lineHeight: "20px",
          marginLeft: "5px",
          marginRight: "5px",
          padding: "3px",
        },
        row: {
          boxSizing: "content-box",
          color: "rgb(0, 0, 0)",
          padding: "0px",
          pseudos: {
            after: { clear: "both", content: '""', display: "table", lineHeight: "0px" },
            before: { clear: "none", content: '""', display: "table", lineHeight: "0px" },
          },
          textAlign: "right",
        },
      },
      whitespacePairs: ["profile-account", "account-logout"],
    });

    expect(
      await forceHoverAndReadBackground(
        page,
        '#mySidenav [data-stylex-owner="authenticated-sidenav-account-actions"] > a > span',
      ),
    ).toBe("rgb(156, 39, 176)");
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
        favoriteOrganizations: [],
        favoriteProjects: [],
        organizations: [],
        profile: { avatarUrl: "/legacy-assets/images/default-avatar-34.png", isGuest: false },
        recentIssues: [],
      },
    }),
  );
}

async function readAccountActionEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const profileElement = element.children[0] as HTMLElement;
    const accountElement = element.children[1] as HTMLElement;
    const logoutAnchor = element.children[2] as HTMLElement;
    const logoutElement = logoutAnchor.firstElementChild as HTMLElement;
    const styleValues = (target: HTMLElement) => {
      const style = getComputedStyle(target);
      return {
        color: style.color,
        display: style.display,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        marginLeft: style.marginLeft,
        marginRight: style.marginRight,
        padding: style.padding,
      };
    };
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return { height: rect.height, left: rect.left, right: rect.right, width: rect.width };
    };
    const rowStyle = getComputedStyle(element);
    const rowBeforeStyle = getComputedStyle(element, "::before");
    const rowAfterStyle = getComputedStyle(element, "::after");
    const logoutStyle = getComputedStyle(logoutElement);
    const rowBox = box(element);
    const relativeBox = (target: Element) => {
      const targetBox = box(target);
      return { left: targetBox.left - rowBox.left, width: targetBox.width };
    };
    const pseudoStyle = (style: CSSStyleDeclaration) => ({
      clear: style.clear,
      content: style.content,
      display: style.display,
      lineHeight: style.lineHeight,
    });
    const whitespacePairs = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE && /^\s+$/u.test(node.textContent ?? ""))
      .map((node) => {
        if (node.previousSibling === profileElement && node.nextSibling === accountElement) {
          return "profile-account";
        }
        if (node.previousSibling === accountElement && node.nextSibling === logoutAnchor) {
          return "account-logout";
        }
        return "unexpected";
      });
    return {
      actionOrder: Array.from(element.children, (child) => child.tagName),
      geometry: {
        account: relativeBox(accountElement),
        logout: {
          ...relativeBox(logoutElement),
          rightInset: rowBox.right - box(logoutElement).right,
        },
        profile: relativeBox(profileElement),
        row: { height: rowBox.height, width: rowBox.width },
      },
      legacyClasses: ["row-fluid", "user-menu-wrap", "user-menu", "logout", "label"].filter(
        (className) =>
          [element, ...element.querySelectorAll("*")].some((target) =>
            target.classList.contains(className),
          ),
      ),
      order: Array.from(element.querySelectorAll("a")).map((link) => link.textContent?.trim()),
      owner: element.getAttribute("data-stylex-owner"),
      styles: {
        account: styleValues(accountElement),
        logout: {
          ...styleValues(logoutElement),
          backgroundColor: logoutStyle.backgroundColor,
          borderRadius: logoutStyle.borderRadius,
          fontWeight: logoutStyle.fontWeight,
          textShadow: logoutStyle.textShadow,
          verticalAlign: logoutStyle.verticalAlign,
          whiteSpace: logoutStyle.whiteSpace,
        },
        profile: styleValues(profileElement),
        row: {
          boxSizing: rowStyle.boxSizing,
          color: rowStyle.color,
          padding: rowStyle.padding,
          pseudos: {
            after: pseudoStyle(rowAfterStyle),
            before: pseudoStyle(rowBeforeStyle),
          },
          textAlign: rowStyle.textAlign,
        },
      },
      whitespacePairs,
    };
  });
}

async function saveScreenshot(owner: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  await owner.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}

async function forceHoverAndReadBackground(page: Page, selector: string) {
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const { root } = await session.send("DOM.getDocument");
  const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector });
  await session.send("CSS.forcePseudoState", { forcedPseudoClasses: ["hover"], nodeId });
  const background = await page
    .locator(selector)
    .evaluate((element) => getComputedStyle(element).backgroundColor);
  await session.detach();
  return background;
}
