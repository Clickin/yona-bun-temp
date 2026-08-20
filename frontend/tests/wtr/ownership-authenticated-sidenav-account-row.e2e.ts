import {
  expect,
  test,
  type Locator,
  type Page,
  readFileSync,
  mergedLegacyBlock,
} from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated side-nav account actions have complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const ownerMarker = route.indexOf('data-owner="authenticated-sidenav-account-actions"');
  const ownerStart = route.lastIndexOf("<div", ownerMarker);
  const ownerEnd = route.indexOf("<ul", ownerMarker);
  const owner = route.slice(ownerStart, ownerEnd);
  expect(owner.match(/\{" "\}/gu)).toHaveLength(2);
  // wave-33 retained-class retention (667398a04, restore f54b9a330): the route
  // retains row-fluid/user-menu-wrap/user-menu/logout/label (route
  // -home-route-screen.tsx:5255-5297 == legacy usermenu.scala.html:42-49).
  expect(owner).toContain("row-fluid user-menu-wrap");
  expect(owner).toContain("user-menu logout label");
  expect(owner).toContain("reloadDocument");
});

for (const viewport of [
  {
    geometry: {
      account: { left: 220, width: 53 },
      logout: { left: 286, rightInset: 15, width: 49 },
      profile: { left: 164, width: 42 },
      row: { height: 41, width: 350 },
    },
    height: 900,
    label: "desktop",
    width: 1366,
  },
  {
    geometry: {
      account: { left: 260, width: 53 },
      logout: { left: 326, rightInset: 15, width: 49 },
      profile: { left: 204, width: 42 },
      row: { height: 41, width: 390 },
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

    // The sidenav shell animates width 0 -> open (rootSidebarMotionStyles,
    // 0.5s ease); wait for it to settle so the geometry is the stable
    // post-transition state the wave-6 pins were measured against.
    {
      let widthOk = false;
      const deadline = Date.now() + 60000;
      while (Date.now() < deadline) {
        const width = await page.evaluate(() => {
          const shell = document.querySelector<HTMLElement>("#mySidenav");
          return shell ? Math.round(shell.getBoundingClientRect().width) : 0;
        });
        if (width === (viewport.width > 720 ? 362 : 392)) {
          widthOk = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(widthOk).toBe(true);
    }

    const owner = page.locator('#mySidenav [data-owner="authenticated-sidenav-account-actions"]');
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
      `style-authenticated-sidenav-account-primitives-local-${viewport.label}.png`,
    );
    expect(evidence).toEqual({
      actionOrder: ["SPAN", "SPAN", "A"],
      geometry: viewport.geometry,
      // wave-33 retained-class retention (667398a04, restore f54b9a330): the route
      // retains row-fluid/user-menu-wrap/user-menu/logout/label (route
      // -home-route-screen.tsx:5255-5297 == legacy usermenu.scala.html:42-49).
      legacyClasses: ["row-fluid", "user-menu-wrap", "user-menu", "logout", "label"],
      order: ["Profile", "Account", "Log out"],
      owner: "authenticated-sidenav-account-actions",
      styles: {
        account: {
          color: "rgb(0, 0, 0)",
          display: "inline",
          fontSize: "12px",
          // F6 dist-truth: retained legacy .user-menu (app.css .sidenav span.user-menu)
          // applies 12px/18px line-height vs the wave-6 pre-retention 20px.
          lineHeight: "20px",
          marginLeft: "5px",
          marginRight: "5px",
          padding: "3px",
        },
        logout: {
          backgroundColor: "rgb(153, 153, 153)",
          borderRadius: "3px",
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
          // F6 dist-truth: retained legacy .sidenav .user-menu-wrap (app.css:1359-1362,
          // legacy _page.less:52-66) applies border-box/gray/10px padding.
          boxSizing: "border-box",
          color: "rgb(128, 128, 128)",
          padding: "10px",
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
        '#mySidenav [data-owner="authenticated-sidenav-account-actions"] > a > span',
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
      // Whole-pixel canonicalization: the parent viewport resize can leave the
      // iframe at fractional widths (0.0625px jitter run-to-run).
      return {
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
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
      owner: element.getAttribute("data-owner"),
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
  // F6 copy-fix: CDP forcePseudoState is unavailable in the WTR harness; the
  // C1 real-mouse bridge (Phase B) applies real CSS :hover instead.
  await page.locator(selector).hover();
  return page.locator(selector).evaluate((element) => getComputedStyle(element).backgroundColor);
}
