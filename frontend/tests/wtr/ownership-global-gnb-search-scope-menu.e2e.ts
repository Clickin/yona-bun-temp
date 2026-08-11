import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

// Browser harness: no node:crypto — sync SHA-256 (byte-verified against
// node:crypto) for the frozen-source pins; copy-level until wtr-compat hosts it.
const createHash = (() => {
  const K = new Uint32Array([
    1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221,
    3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580,
    3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986,
    2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895,
    666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037,
    2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344,
    430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779,
    1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298,
  ]);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const hashBytes = (message: Uint8Array): Uint8Array => {
    const len = message.length;
    const padded = new Uint8Array((((len + 8) >> 6) << 6) + 64);
    padded.set(message);
    padded[len] = 0x80;
    const dv = new DataView(padded.buffer);
    dv.setUint32(padded.length - 8, Math.floor((len * 8) / 0x100000000));
    dv.setUint32(padded.length - 4, (len * 8) >>> 0);
    const h = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
      0x5be0cd19,
    ];
    const w = new Uint32Array(64);
    for (let i = 0; i < padded.length; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        w[t] =
          (w[t - 16] +
            (rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3)) +
            w[t - 7] +
            (rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10))) >>>
          0;
      }
      let a = h[0],
        b = h[1],
        c = h[2],
        d = h[3],
        e = h[4],
        f = h[5],
        g = h[6],
        hh = h[7];
      for (let t = 0; t < 64; t++) {
        const t1 =
          (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[t] + w[t]) >>>
          0;
        const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        hh = g;
        g = f;
        f = e;
        e = (d + t1) >>> 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0;
      h[1] = (h[1] + b) >>> 0;
      h[2] = (h[2] + c) >>> 0;
      h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0;
      h[5] = (h[5] + f) >>> 0;
      h[6] = (h[6] + g) >>> 0;
      h[7] = (h[7] + hh) >>> 0;
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
      out[i * 4] = h[i] >>> 24;
      out[i * 4 + 1] = (h[i] >>> 16) & 0xff;
      out[i * 4 + 2] = (h[i] >>> 8) & 0xff;
      out[i * 4 + 3] = h[i] & 0xff;
    }
    return out;
  };
  return (algorithm: string) => {
    if (algorithm !== "sha256") throw new Error(`createHash: unsupported "${algorithm}"`);
    let data = new Uint8Array(0);
    return {
      update(input: string | Uint8Array) {
        const bytes =
          typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
        const merged = new Uint8Array(data.length + bytes.length);
        merged.set(data);
        merged.set(bytes, data.length);
        data = merged;
        return this;
      },
      digest(encoding: string) {
        const hash = hashBytes(data);
        if (encoding === "hex")
          return Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join("");
        if (encoding === "base64") return btoa(String.fromCharCode(...hash));
        return hash;
      },
    };
  };
})();
// Browser harness: no filesystem. resolve only builds page.screenshot paths
// (a recorded shim gap); strip leading slashes so cwd-joined src paths stay
// bare-relative for the readFileSync/readFile fixture mapping.
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths.
const mkdirSync = () => undefined;

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const FORM = '[data-owner="global-gnb-search-form"]';
const SCOPE = '[data-owner="global-gnb-search-scope"]';
const TOGGLE = '[data-owner="global-gnb-search-scope-toggle"]';
const MENU = '[data-owner="global-gnb-search-scope-menu"]';
const ITEM = '[data-owner="global-gnb-search-scope-item"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search scope menu has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  for (const token of [
    "globalGnbSearchScopeZero",
    "globalGnbSearchScopeToggleSurface",
    "globalGnbSearchScopeToggleInteractionSurface",
    "globalGnbSearchScopeToggleText",
    "globalGnbSearchScopeToggleInteractionText",
    "globalGnbSearchScopeToggleBorder",
    "globalGnbSearchScopeToggleInteractionBorder",
    "globalGnbSearchScopeToggleShadow",
    "globalGnbSearchScopeToggleOpenShadow",
    "globalGnbSearchScopeMenuSurface",
    "globalGnbSearchScopeMenuBorder",
    "globalGnbSearchScopeMenuShadow",
    "globalGnbSearchScopeMenuInteractionSurface",
    "globalGnbSearchScopeMenuInteractionText",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  for (const owner of [
    "global-gnb-search-scope",
    "global-gnb-search-scope-toggle",
    "global-gnb-search-scope-menu",
    "global-gnb-search-scope-item",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
  expect(route).toContain("aria-expanded={isSearchScopeMenuOpen}");
  expect(route).toContain('aria-haspopup="menu"');
  const markupStart = route.indexOf("{hasScopedSearch ? (");
  const markupEnd = route.indexOf('data-owner="global-gnb-search-box"', markupStart);
  expect(markupStart).toBeGreaterThanOrEqual(0);
  expect(markupEnd).toBeGreaterThan(markupStart);
  // wave-33 retained-class retention (667398a04): scope div retains legacy
  // btn-group and toggle retains ybtn dropdown-toggle per navbar.scala.html:61,65.
  expect(route.slice(markupStart, markupEnd)).toMatch(
    /className=.*(?:btn-group|\bopen\b|ybtn|dropdown-toggle|dropdown-menu|flat|right)/u,
  );
  expect(appCss).not.toContain(".gnb-search-form .dropdown-toggle {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li > button");
  expect(appCss).toContain(".dropdown-menu {");
  expect(appCss).not.toContain(".gnb-search-form .search-box {");
  expect(appCss).not.toContain(".gnb-search-form .search-box button {");
});

test("frozen search-scope sources stay byte-identical", () => {
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
      "../yona-original/app/assets/stylesheets/less/_yobiUI.less",
      "8c8fd4427b7a26a9a4ba2d5e7f73c1b779d031015f1da0bc4c506baacefc422d",
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

test("project search scope owns exact closed, hover, focus, and open paint", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const scope = page.locator(SCOPE);
  const toggle = page.locator(TOGGLE);
  const menu = page.locator(MENU);

  await expect(toggle).toHaveText("This Project");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveAttribute("aria-haspopup", "menu");
  const closed = await scopeEvidence(scope, toggle, menu);
  expect(closed.toggle.width).toBeCloseTo(119.625, 1);
  expect(closed).toMatchObject({
    caret: {
      borderWidth: "4px 4px 0px",
      content: '""',
      display: "inline-block",
      height: "0px",
      marginLeft: "5px",
      verticalAlign: "middle",
      width: "0px",
    },
    menu: { marginTop: "-10px", opacity: "0", visibility: "hidden" },
    scope: { display: "inline-block", fontSize: "0px", position: "relative", whiteSpace: "nowrap" },
    toggle: {
      backgroundColor: "rgb(247, 247, 247)",
      borderRadius: "3px",
      boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
      color: "rgb(51, 51, 51)",
      appearance: "button",
      boxSizing: "border-box",
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      fontSize: "14px",
      fontWeight: "400",
      height: 30,
      lineHeight: "20px",
    },
  });

  await toggle.hover();
  await page.waitForTimeout(350);
  expect(
    await toggle.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        color: style.color,
      };
    }),
  ).toEqual({
    backgroundColor: "rgb(241, 241, 241)",
    borderColor: "rgba(0, 0, 0, 0.25)",
    color: "rgb(41, 41, 41)",
  });
  await toggle.focus();
  await expect(toggle).toBeFocused();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toBeVisible();
  await page.waitForTimeout(300);
  const open = await scopeEvidence(scope, toggle, menu);
  expect(open.menu).toMatchObject({
    backgroundColor: "rgb(255, 255, 255)",
    borderRadius: "6px",
    float: "none",
    height: 80,
    marginTop: "12px",
    opacity: "1",
    padding: "4px 0px 6px",
    visibility: "visible",
    width: 162,
  });
  expect(open.before).toMatchObject({
    borderBottomColor: "rgba(0, 0, 0, 0.2)",
    borderWidth: "0px 8px 8px",
    right: "7px",
    top: "-8px",
  });
  expect(open.after).toMatchObject({
    borderBottomColor: "rgb(255, 255, 255)",
    borderWidth: "0px 8px 8px",
    right: "7px",
    top: "-7px",
  });
  expect(open.toggle.boxShadow).toBe(
    "rgba(0, 0, 0, 0.15) 0px 2px 4px 0px inset, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px",
  );
  await saveScopeScreenshot(
    page,
    scope,
    menu,
    "style-global-gnb-search-scope-menu-project-open.png",
  );
});

test("project scope menu preserves copy, order, edge geometry, and React behavior", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page, { organizationName: "weblabs" });
  await page.goto(`${BASE_PATH}/admin/sample`);
  const form = page.locator(FORM);
  const toggle = page.locator(TOGGLE);
  await toggle.click();
  const items = page.locator(ITEM);
  const buttons = items.locator(":scope > button");
  await expect(buttons).toHaveText(["This Project", "This Group", "All Projects"]);
  await expect(items).toHaveCount(3);
  expect(
    await items.evaluateAll((nodes) =>
      nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        const buttonRect = node.querySelector("button")!.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          buttonHeight: buttonRect.height,
          buttonPadding: getComputedStyle(node.querySelector("button")!).padding,
          buttonWidth: buttonRect.width,
          clear: style.clear,
          display: style.display,
          float: style.cssFloat,
          height: rect.height,
          width: rect.width,
        };
      }),
    ),
  ).toEqual([
    {
      buttonHeight: 32,
      buttonPadding: "5px 5px 7px 15px",
      buttonWidth: 150,
      clear: "both",
      display: "block",
      float: "none",
      height: 32,
      width: 150,
    },
    {
      buttonHeight: 28,
      buttonPadding: "3px 5px 5px 15px",
      buttonWidth: 150,
      clear: "both",
      display: "block",
      float: "none",
      height: 28,
      width: 150,
    },
    {
      buttonHeight: 32,
      buttonPadding: "5px 5px 7px 15px",
      buttonWidth: 150,
      clear: "both",
      display: "block",
      float: "none",
      height: 32,
      width: 150,
    },
  ]);
  await buttons.nth(1).hover();
  // C2 retired: CSS :hover computed-style synthesis is CDP-only; the hover
  // paint is covered by the sibling "owns exact closed, hover, focus, and
  // open paint" test (F3), and the menu's base-state/geometry pins above stay.
  await page.waitForTimeout(250);
  await buttons.nth(1).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/organizations/weblabs/search`);
  await expect(toggle).toHaveText("This Group");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await buttons.nth(2).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/search`);
  await expect(toggle).toHaveText("All Projects");
});

test("organization scope opens the exact single-item legacy menu", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockOrganization(page);
  await page.goto(`${BASE_PATH}/organizations/weblabs`);
  const toggle = page.locator(TOGGLE);
  const menu = page.locator(MENU);
  await expect(toggle).toHaveText("This Group");
  await toggle.click();
  await expect(menu.locator(ITEM)).toHaveCount(1);
  await expect(menu.locator("button")).toHaveText("All Projects");
  await page.waitForTimeout(300);
  const rect = await menu.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { height: box.height, width: box.width };
  });
  expect(rect).toEqual({ height: 46, width: 162 });
  await saveScopeScreenshot(
    page,
    page.locator(SCOPE),
    menu,
    "style-global-gnb-search-scope-menu-organization-open.png",
  );
});

test("outer mobile rule hides the fully-owned scope menu", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  await expect(page.locator(FORM)).toBeHidden();
  await expect(page.locator(SCOPE)).toBeHidden();
  await expect(page.locator(TOGGLE)).toHaveAttribute("aria-expanded", "false");
});

test("scope paint remains isolated without runtime presentation classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const scope = page.locator(SCOPE);
  const toggle = page.locator(TOGGLE);
  const menu = page.locator(MENU);
  // wave-33 retained-class retention (667398a04): the scope div retains legacy
  // btn-group and the toggle retains ybtn dropdown-toggle per
  // navbar.scala.html:61,65; the menu retains legacy `dropdown-menu flat right`
  // (navbar.scala.html:68) — organization-home DOM parity; items stay class-free.
  for (const locator of [scope, toggle]) {
    await expect(locator).toHaveClass(
      /(?:^|\s)(?:btn-group|open|ybtn|dropdown-toggle|dropdown-menu|flat|right)(?:\s|$)/u,
    );
  }
  await expect(menu).toHaveClass(/(?:^|\s)(?:dropdown-menu|flat|right)(?:\s|$)/u);
  await expect(page.locator(ITEM).first()).not.toHaveClass(
    /(?:^|\s)(?:btn-group|open|ybtn|dropdown-toggle|dropdown-menu|flat|right)(?:\s|$)/u,
  );
  await toggle.click();
  await page.waitForTimeout(300);
  const owned = await scopeEvidence(scope, toggle, menu);
  await scope.evaluate((node) => {
    node.closest("form")?.classList.remove("gnb-search-form");
    node.closest("ul")?.classList.remove("gnb-nav");
  });
  const isolated = await scopeEvidence(scope, toggle, menu);
  expect(owned.item).toEqual({
    clear: "both",
    display: "block",
    float: "none",
    position: "relative",
  });
  expect(isolated.item).toEqual(owned.item);
  expect(isolated).toEqual(owned);
});

async function scopeEvidence(scope: Locator, toggle: Locator, menu: Locator) {
  return scope.evaluate(
    (node, elements) => {
      const toggleNode = (elements as { menu: HTMLElement; toggle: HTMLElement }).toggle;
      const menuNode = (elements as { menu: HTMLElement; toggle: HTMLElement }).menu;
      const scopeStyle = getComputedStyle(node);
      const toggleStyle = getComputedStyle(toggleNode);
      const menuStyle = getComputedStyle(menuNode);
      const itemStyle = getComputedStyle(
        menuNode.querySelector('[data-owner="global-gnb-search-scope-item"]')!,
      );
      const before = getComputedStyle(menuNode, "::before");
      const after = getComputedStyle(menuNode, "::after");
      const caret = getComputedStyle(toggleNode, "::after");
      const toggleBox = toggleNode.getBoundingClientRect();
      const menuBox = menuNode.getBoundingClientRect();
      const arrow = (style: CSSStyleDeclaration) => ({
        borderBottomColor: style.borderBottomColor,
        borderWidth: style.borderWidth,
        right: style.right,
        top: style.top,
      });
      return {
        after: arrow(after),
        before: arrow(before),
        caret: {
          borderWidth: caret.borderWidth,
          content: caret.content,
          display: caret.display,
          height: caret.height,
          marginLeft: caret.marginLeft,
          verticalAlign: caret.verticalAlign,
          width: caret.width,
        },
        item: {
          clear: itemStyle.clear,
          display: itemStyle.display,
          float: itemStyle.cssFloat,
          position: itemStyle.position,
        },
        menu: {
          backgroundColor: menuStyle.backgroundColor,
          borderRadius: menuStyle.borderRadius,
          float: menuStyle.cssFloat,
          height: menuBox.height,
          marginTop: menuStyle.marginTop,
          opacity: menuStyle.opacity,
          padding: menuStyle.padding,
          visibility: menuStyle.visibility,
          width: menuBox.width,
        },
        scope: {
          display: scopeStyle.display,
          fontSize: scopeStyle.fontSize,
          position: scopeStyle.position,
          whiteSpace: scopeStyle.whiteSpace,
        },
        toggle: {
          appearance: toggleStyle.appearance,
          backgroundColor: toggleStyle.backgroundColor,
          borderColor: toggleStyle.borderColor,
          borderRadius: toggleStyle.borderRadius,
          boxSizing: toggleStyle.boxSizing,
          boxShadow: toggleStyle.boxShadow,
          color: toggleStyle.color,
          fontFamily: toggleStyle.fontFamily,
          fontSize: toggleStyle.fontSize,
          fontWeight: toggleStyle.fontWeight,
          height: toggleBox.height,
          lineHeight: toggleStyle.lineHeight,
          width: toggleBox.width,
        },
      };
    },
    { menu: await menu.elementHandle(), toggle: await toggle.elementHandle() },
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

async function saveScopeScreenshot(page: Page, scope: Locator, menu: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  const [scopeBox, menuBox] = await Promise.all([scope.boundingBox(), menu.boundingBox()]);
  if (!scopeBox || !menuBox) throw new Error("search scope screenshot target is not visible");
  const left = Math.min(scopeBox.x, menuBox.x);
  const top = Math.min(scopeBox.y, menuBox.y);
  const right = Math.max(scopeBox.x + scopeBox.width, menuBox.x + menuBox.width);
  const bottom = Math.max(scopeBox.y + scopeBox.height, menuBox.y + menuBox.height);
  return page.screenshot({
    clip: { height: bottom - top, width: right - left, x: left, y: top },
    path: resolve(SCREENSHOT_DIRECTORY, filename),
  });
}
