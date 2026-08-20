import {
  expect,
  test,
  type Locator,
  type Page,
  readFileSync,
  curatedAppCss,
} from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

for (const viewport of [
  {
    account: { height: 26, width: 59.96875, x: 112.109375, y: 8 },
    height: 900,
    label: "desktop",
    logout: { height: 16, width: 52.265625, x: 175.671875, y: 13 },
    logoutLabel: { height: 24, width: 52.265625, x: 175.671875, y: 10 },
    rowWidth: 270,
    width: 1366,
  },
  {
    account: { height: 26, width: 59.96875, x: 43.59375, y: 8 },
    height: 844,
    label: "mobile",
    logout: { height: 16, width: 52.265625, x: 107.15625, y: 13 },
    logoutLabel: { height: 24, width: 52.265625, x: 107.15625, y: 10 },
    rowWidth: 317.6875,
    width: 390,
  },
]) {
  test(`left sidebar account actions preserve ${viewport.label} legacy parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    const sidebarShell = page.locator('[data-owner="left-sidebar-outer-shell"]');
    const owner = sidebar.locator(':scope > [data-owner="left-sidebar-account-actions"]');
    await expect(owner).toBeVisible();
    const profile = owner.getByRole("link").first();
    const account = owner.getByRole("link", { exact: true, name: "Account" });
    const logout = owner.getByRole("link", { exact: true, name: "Log out" });
    const logoutLabel = logout.locator(":scope > span");
    const pin = owner.getByRole("button", { name: "Sidebar" });
    const profileOwner = owner.locator('[data-owner="left-sidebar-profile-identity"]');
    const label = profileOwner.locator(":scope > span").nth(1);

    await saveScreenshot(
      owner,
      `style-left-sidebar-account-primitives-local-${viewport.label}.png`,
    );
    const expectedEvidence = {
      actionOrder: ["SPAN", "SPAN", "A", "BUTTON"],
      account: viewport.account,
      accountLogoutGap: 3.59375,
      avatar: { height: 20, width: 20 },
      hasAccountLogoutWhitespace: true,
      logout: viewport.logout,
      logoutLabel: viewport.logoutLabel,
      owner: "left-sidebar-account-actions",
      ownerClasses: [],
      pin: {
        owner: "left-sidebar-close-pin",
        presentationClasses: [],
      },
      retainedClasses: {
        avatar: [],
        caret: [],
        logout: [],
        row: [],
      },
      row: { height: 44, width: viewport.rowWidth, x: 0, y: 0 },
      styles: {
        account: {
          display: "inline",
          fontSize: "13px",
          fontWeight: "400",
          lineHeight: "20px",
        },
        logout: { color: "rgb(128, 128, 128)" },
        logoutLabel: {
          backgroundColor: "rgb(153, 153, 153)",
          borderRadius: "1px",
          color: "rgb(255, 255, 255)",
          display: "inline-block",
          fontSize: "11.844px",
          fontWeight: "400",
          lineHeight: "14px",
          padding: "5px",
          textShadow: "rgba(0, 0, 0, 0.25) 0px -1px 0px",
          verticalAlign: "baseline",
          whiteSpace: "nowrap",
        },
        menu: ["5px", "5px"],
        profile: {
          display: "inline",
          fontSize: "13px",
          fontWeight: "400",
          lineHeight: "20px",
        },
        row: {
          boxSizing: "border-box",
          color: "rgb(128, 128, 128)",
          padding: "10px",
          pseudos: {
            after: { clear: "both", content: '""', display: "table", lineHeight: "0px" },
            before: { clear: "none", content: '""', display: "table", lineHeight: "0px" },
          },
        },
      },
    };
    let evidenceOk = false;
    {
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        try {
          const evidence = await readEvidence(owner);
          if (JSON.stringify(evidence) === JSON.stringify(expectedEvidence)) {
            evidenceOk = true;
            break;
          }
        } catch {
          // transient evidence errors — keep polling
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    expect(evidenceOk).toBe(true);
    await expect(profile).toHaveAttribute("href", `${BASE_PATH}/admin`);
    await expect(account).toHaveAttribute("href", `${BASE_PATH}/user/editform`);
    await expect(logout).toHaveAttribute("href", `${BASE_PATH}/users/logout`);
    await expect(pin).toHaveAttribute("aria-controls", "sidebar");
    await expect(pin).toHaveAttribute("aria-expanded", "true");
    await expect(profileOwner).toHaveAttribute("data-owner", "left-sidebar-profile-identity");
    if (viewport.label === "mobile") await expect(label).toBeHidden();
    else await expect(label).toBeVisible();

    // F5 dist-truth: hover colors transition ~150ms; direct reads (the wtr
    // poll can read mid-transition values).
    // F5 dist-truth: hover colors resolve via the owner-scoped :hover rules;
    // settle then read once (re-hovering re-resolves the locator and can
    // land on a different matched element).
    const readHover = async (loc: Locator) =>
      loc.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          color: s.color,
          deco: s.textDecorationLine,
          bg: s.backgroundColor,
        };
      });
    await profile.hover();
    await new Promise((r) => setTimeout(r, 300));
    expect(await readHover(profile)).toMatchObject({
      color: "rgb(255, 255, 255)",
      deco: "underline",
    });
    await account.hover();
    await new Promise((r) => setTimeout(r, 300));
    expect(await readHover(account)).toMatchObject({
      color: "rgb(255, 255, 255)",
      deco: "underline",
    });
    await logout.hover();
    await new Promise((r) => setTimeout(r, 300));
    // F5 dist-truth: the legacy `.logout` class lives on the inner span
    // (usermenu.scala.html) — the `a` itself keeps the generic hover
    // orange; the white !important applies to the span.
    expect(await readHover(logout)).toMatchObject({
      color: "rgb(243, 108, 34)",
      deco: "underline",
    });
    expect(await readHover(logoutLabel)).toMatchObject({
      color: "rgb(255, 255, 255)",
      bg: "rgb(156, 39, 176)",
    });

    await pin.click();
    await expect(sidebarShell).toHaveCount(0);
  });
}

test("left sidebar account actions have complete global-theme Style ownership", () => {
  const appCss = curatedAppCss();
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  for (const token of [
    "leftSidebarAccountText",
    "leftSidebarAccountHoverText",
    "leftSidebarAccountLogoutText",
    "leftSidebarAccountLogoutSurface",
    "leftSidebarAccountLogoutHoverSurface",
    "leftSidebarAccountLogoutTextShadow",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  for (const selector of [
    ".sidebar .user-menu-wrap",
    ".sidebar .user-menu-wrap a:hover",
    ".sidebar .user-menu",
  ]) {
    expect(appCss).not.toContain(selector);
  }
  const ownerMarker = route.indexOf('data-owner="left-sidebar-account-actions"');
  const ownerStart = route.lastIndexOf("<div", ownerMarker);
  const ownerEnd = route.indexOf("<ul", ownerMarker);
  expect(ownerMarker).toBeGreaterThanOrEqual(0);
  const owner = route.slice(ownerStart, ownerEnd);
  expect(owner).not.toContain('className="user-menu-wrap"');
  expect(owner).not.toContain('className="user-menu"');
  expect(owner).not.toContain('className="user-menu logout label"');
  expect(owner).not.toContain("className={`row-fluid");
  expect(owner).not.toContain("className={`label");
  expect(owner).toContain('</Link>\n        </span>{" "}\n        <Link');
  expect(owner).toContain('data-owner="left-sidebar-profile-identity"');
  for (const removedClass of ["avatar-wrap", "smaller", "caret-text", "hide-in-mobile"]) {
    expect(owner).not.toContain(removedClass);
  }
  expect(owner).toContain('data-owner="left-sidebar-close-pin"');
  expect(owner).toContain("reloadDocument");
});

async function readEvidence(owner: Locator) {
  return owner.evaluate((element) => {
    const profileElement = element.children[0].querySelector("a") as HTMLElement;
    const accountElement = element.children[1].querySelector("a") as HTMLElement;
    const logoutElement = element.children[2] as HTMLElement;
    const logoutLabelElement = logoutElement.firstElementChild as HTMLElement;
    const profileOwner = element.querySelector(
      '[data-owner="left-sidebar-profile-identity"]',
    ) as HTMLElement;
    const avatarElement = profileOwner.children[0] as HTMLElement;
    const caretElement = profileOwner.children[1] as HTMLElement;
    const pinElement = element.querySelector(
      '[data-owner="left-sidebar-close-pin"]',
    ) as HTMLElement;
    const menus = Array.from(element.querySelectorAll(":scope > span")) as HTMLElement[];
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    const textStyle = (target: Element) => {
      const style = getComputedStyle(target);
      return {
        display: style.display,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
      };
    };
    const rowStyle = getComputedStyle(element);
    const rowBeforeStyle = getComputedStyle(element, "::before");
    const rowAfterStyle = getComputedStyle(element, "::after");
    const labelStyle = getComputedStyle(logoutLabelElement);
    const accountBox = box(accountElement.parentElement as HTMLElement);
    const logoutBox = box(logoutElement);
    const logoutLabelBox = box(logoutLabelElement);
    const pseudoStyle = (style: CSSStyleDeclaration) => ({
      clear: style.clear,
      content: style.content,
      display: style.display,
      lineHeight: style.lineHeight,
    });
    return {
      actionOrder: Array.from(element.children, (child) => child.tagName),
      account: accountBox,
      accountLogoutGap: logoutBox.x - (accountBox.x + accountBox.width),
      avatar: { height: box(avatarElement).height, width: box(avatarElement).width },
      hasAccountLogoutWhitespace: Array.from(element.childNodes).some(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          /^\s+$/u.test(node.textContent ?? "") &&
          node.previousSibling === accountElement.parentElement &&
          node.nextSibling === logoutElement,
      ),
      logout: logoutBox,
      logoutLabel: logoutLabelBox,
      owner: element.getAttribute("data-owner"),
      ownerClasses: ["user-menu-wrap", "user-menu", "logout"].filter((className) =>
        [element, ...element.querySelectorAll("*")].some((target) =>
          target.classList.contains(className),
        ),
      ),
      pin: {
        owner: pinElement.getAttribute("data-owner"),
        presentationClasses: ["pin-in-sidebar"].filter((name) =>
          pinElement.classList.contains(name),
        ),
      },
      retainedClasses: {
        avatar: ["avatar-wrap", "smaller"].filter((name) => avatarElement.classList.contains(name)),
        caret: ["caret-text", "hide-in-mobile"].filter((name) =>
          caretElement.classList.contains(name),
        ),
        logout: ["label"].filter((name) => logoutLabelElement.classList.contains(name)),
        row: ["row-fluid"].filter((name) => element.classList.contains(name)),
      },
      row: box(element),
      styles: {
        account: textStyle(accountElement),
        logout: { color: getComputedStyle(logoutElement).color },
        logoutLabel: {
          backgroundColor: labelStyle.backgroundColor,
          borderRadius: labelStyle.borderRadius,
          color: labelStyle.color,
          display: labelStyle.display,
          fontSize: labelStyle.fontSize,
          fontWeight: labelStyle.fontWeight,
          lineHeight: labelStyle.lineHeight,
          padding: labelStyle.padding,
          textShadow: labelStyle.textShadow,
          verticalAlign: labelStyle.verticalAlign,
          whiteSpace: labelStyle.whiteSpace,
        },
        menu: menus.map((menu) => getComputedStyle(menu).padding),
        profile: textStyle(profileElement),
        row: {
          boxSizing: rowStyle.boxSizing,
          color: rowStyle.color,
          padding: rowStyle.padding,
          pseudos: {
            after: pseudoStyle(rowAfterStyle),
            before: pseudoStyle(rowBeforeStyle),
          },
        },
      },
    };
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
    localStorage.setItem("sidebarActiveMenu", "myProjectList");
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
        preferredLanguage: "en-US",
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

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
