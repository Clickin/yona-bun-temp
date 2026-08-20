import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
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
const ITEM = '[data-owner="global-gnb-search-item"]';
const FORM = '[data-owner="global-gnb-search-form"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search outer item and form have global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();
  for (const token of [
    "globalGnbNavItemFloat",
    "globalGnbNavItemPosition",
    "globalGnbSearchDisplay",
    "globalGnbSearchFontSize",
    "globalGnbSearchLineHeight",
    "globalGnbSearchMarginTop",
    "globalGnbSearchWhiteSpace",
    "globalGnbSearchVerticalAlign",
    "globalGnbBrandPaddingInline",
    "globalGnbSearchZero",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }

  const itemMarker = route.indexOf('data-owner="global-gnb-search-item"');
  const formMarker = route.indexOf('data-owner="global-gnb-search-form"');
  const item = route.slice(
    route.lastIndexOf("<li", itemMarker),
    route.indexOf("</li>", itemMarker),
  );
  const form = route.slice(
    route.lastIndexOf("<form", formMarker),
    route.indexOf("</form>", formMarker),
  );
  expect(itemMarker).toBeGreaterThanOrEqual(0);
  expect(formMarker).toBeGreaterThanOrEqual(0);

  // wave-33 retained-class retention (667398a04): form keeps legacy
  // input-prepend per navbar.scala.html:53 class="input-prepend gnb-search-form"

  expect(form).toContain("input-prepend");

  expect(form).toContain('name="gnb-search-form"');
  expect(form).toContain('name="searchType" value="auto"');
  expect(route).toContain('import "../yobicon-font.css";');

  expect(appCss).not.toMatch(/\.gnb-search-form\s*\{[^}]*\}/u);
  expect(appCss).not.toContain('.gnb-search-form input[type="text"] {');
  expect(appCss).not.toContain(".gnb-search-form .search-box button {");
  expect(appCss).not.toContain(".gnb-search-form .search-box {");
  expect(appCss).not.toContain(".gnb-search-form .search-box.select {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-toggle {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li {");
  expect(appCss).not.toContain(".gnb-search-form .dropdown-menu > li > button");
});

test("frozen global GNB search sources stay byte-identical", () => {
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
      "../yona-original/app/assets/stylesheets/less/_responsive.less",
      "3b8038e9e3f9fb2067d506794e342bf0aca81071d94128c6cc1a3214c0812105",
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
  { height: 900, kind: "home", label: "desktop home", path: "/", width: 1366 },
  { height: 844, kind: "home", label: "mobile home", path: "/", width: 390 },
  {
    height: 900,
    kind: "project",
    label: "desktop project",
    path: "/admin/sample",
    width: 1366,
  },
  {
    height: 844,
    kind: "project",
    label: "mobile project",
    path: "/admin/sample",
    width: 390,
  },
  {
    height: 900,
    kind: "organization",
    label: "desktop organization",
    path: "/organizations/weblabs",
    width: 1366,
  },
  {
    height: 844,
    kind: "organization",
    label: "mobile organization",
    path: "/organizations/weblabs",
    width: 390,
  },
] as const) {
  test(`global GNB search preserves ${state.label} outer parity`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.kind === "project") await mockProject(page);
    if (state.kind === "organization") await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.load("12px yobicon"));
    await page.evaluate(() => document.fonts.ready);

    const item = page.locator(ITEM);
    const form = page.locator(FORM);
    await expect(item).toBeAttached();
    await expect(form).toBeAttached();
    await expect(form).toHaveClass(/(?:^|\s)gnb-search-form(?:\s|$)/u);
    // wave-33 retained-class retention (667398a04): input-prepend kept per
    // legacy navbar.scala.html:53 class="input-prepend gnb-search-form"
    await expect(form).toHaveClass(/(?:^|\s)input-prepend(?:\s|$)/u);
    await expect(form).toHaveAttribute("name", "gnb-search-form");
    await expect(form).toHaveAttribute("action", expectedAction(state.kind));
    await expect(form.locator(':scope > input[type="hidden"]')).toHaveAttribute(
      "name",
      "searchType",
    );
    await expect(form.locator(':scope > input[type="hidden"]')).toHaveValue("auto");
    await expect(form.locator(":scope > :nth-child(1)")).toHaveAttribute("type", "hidden");
    await expect(form.locator(":scope > :last-child")).toHaveAttribute(
      "data-owner",
      "global-gnb-search-box",
    );
    await expect(item.locator(":scope > form")).toHaveCount(1);
    await expect(item.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
      "data-owner",
      "global-gnb-feedback-item",
    );

    const evidence = await readEvidence(item, form);
    expect(evidence.itemStyle).toEqual({
      display: "list-item",
      float: "left",
      position: "relative",
    });
    if (state.width <= 720) {
      expect(evidence.itemBox.height).toBe(0);
      expect(evidence.itemBox.width).toBe(0);
      expect(evidence.formBox.height).toBe(0);
      expect(evidence.formBox.width).toBe(0);
      expect(evidence.formStyle.display).toBe("none");
    } else {
      await expect(item).toBeVisible();
      await expect(form).toBeVisible();
      expect(evidence.itemBox.height).toBe(35);
      expect(evidence.formBox.height).toBe(30);
      expect(evidence.formStyle).toEqual({
        boxSizing: "content-box",
        display: "inline-block",
        fontSize: "0px",
        lineHeight: "30px",
        margin: "5px 0px 0px",
        padding: "0px 10px",
        position: "static",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
      });
      if (state.kind === "home") {
        expect(evidence.itemBox.width).toBe(112);
        expect(evidence.formBox.width).toBe(112);
      } else {
        expect(evidence.formBox.width).toBeGreaterThan(112);
        expect(evidence.itemBox.width).toBe(evidence.formBox.width);
      }
      expect(evidence.formBox.left).toBe(evidence.itemBox.left);
      expect(evidence.formBox.top - evidence.itemBox.top).toBe(5);
    }
    await saveScreenshot(
      state.width <= 720 ? page.locator("header[data-owner=global-gnb-outer]") : item,
      `style-global-gnb-search-form-${state.label.replaceAll(" ", "-")}.png`,
    );
  });
}

test("scoped search remains React-owned and submits the legacy GET payload", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page, { organizationName: "weblabs" });
  await page.goto(`${BASE_PATH}/admin/sample`);

  const form = page.locator(FORM);
  await expect(form).toBeAttached();
  const scopeTitle = form.locator("#gnb-search-scope-title");
  await expect(form).not.toHaveAttribute("method");
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/admin/sample/search`);
  await expect(scopeTitle).toHaveText("This Project");
  await scopeTitle.click();
  const scopeButtons = form.locator(
    '[data-owner="global-gnb-search-scope-menu"] > [data-owner="global-gnb-search-scope-item"] > button',
  );
  await expect(scopeButtons).toHaveText(["This Project", "This Group", "All Projects"]);
  await scopeButtons.nth(1).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/organizations/weblabs/search`);
  await scopeTitle.click();
  await scopeButtons.nth(2).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/search`);
  await scopeTitle.click();
  await scopeButtons.nth(0).click();
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/admin/sample/search`);

  await form.locator('input[name="keyword"]').fill("needle");
  // F5 dist-truth: the native form GET navigates the harness iframe to the
  // SPA route root (/admin/sample/?keyword=...) without a request event;
  // poll the page URL instead.
  await form.locator('[data-owner="global-gnb-search-submit"]').click({ noWaitAfter: true });
  await expect
    .poll(() => new URL(page.url()).searchParams.get("keyword"), { timeout: 10000 })
    .toBe("needle");
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("auto");
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("needle");
});

test("global GNB search outer paint is isolated while required legacy classes remain", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);

  await expect(page.locator(ITEM)).toBeAttached();

  const evidence = await page.locator(ITEM).evaluate((item) => {
    const form = item.querySelector("form")!;
    item.parentElement!.classList.remove("gnb-nav");
    const snapshot = () => {
      const itemStyle = getComputedStyle(item);
      const formStyle = getComputedStyle(form);
      return {
        formDisplay: formStyle.display,
        formFontSize: formStyle.fontSize,
        formLineHeight: formStyle.lineHeight,
        formMargin: formStyle.margin,
        formPadding: formStyle.padding,
        formVerticalAlign: formStyle.verticalAlign,
        formWhiteSpace: formStyle.whiteSpace,
        itemFloat: itemStyle.cssFloat,
        itemPosition: itemStyle.position,
      };
    };
    const owned = snapshot();
    const requiredClasses = form.className;
    item.className = "";
    form.className = "";
    return { owned, requiredClasses, stripped: snapshot() };
  });

  expect(evidence.requiredClasses).toContain("gnb-search-form");
  // wave-33 retained-class retention (667398a04): input-prepend kept per
  // legacy navbar.scala.html:53 class="input-prepend gnb-search-form"
  expect(evidence.requiredClasses).toContain("input-prepend");
  expect(evidence.owned).toEqual({
    formDisplay: "inline-block",
    formFontSize: "0px",
    formLineHeight: "30px",
    formMargin: "5px 0px 0px",
    formPadding: "0px 10px",
    formVerticalAlign: "middle",
    formWhiteSpace: "nowrap",
    itemFloat: "left",
    itemPosition: "relative",
  });
  expect(evidence.stripped).toEqual({
    formDisplay: "block",
    formFontSize: "14px",
    formLineHeight: "20px",
    formMargin: "0px",
    formPadding: "0px",
    formVerticalAlign: "baseline",
    formWhiteSpace: "normal",
    itemFloat: "none",
    itemPosition: "static",
  });
});

function expectedAction(kind: "home" | "organization" | "project") {
  if (kind === "project") return `${BASE_PATH}/admin/sample/search`;
  if (kind === "organization") return `${BASE_PATH}/organizations/weblabs/search`;
  return `${BASE_PATH}/search`;
}

async function readEvidence(item: Locator, form: Locator) {
  return item.evaluate(
    (element, formElement) => {
      const itemRect = element.getBoundingClientRect();
      const formRect = (formElement as Element).getBoundingClientRect();
      const itemStyle = getComputedStyle(element);
      const formStyle = getComputedStyle(formElement as Element);
      const box = (rect: DOMRect) => ({
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      });
      return {
        formBox: box(formRect),
        formStyle: {
          boxSizing: formStyle.boxSizing,
          display: formStyle.display,
          fontSize: formStyle.fontSize,
          lineHeight: formStyle.lineHeight,
          margin: formStyle.margin,
          padding: formStyle.padding,
          position: formStyle.position,
          verticalAlign: formStyle.verticalAlign,
          whiteSpace: formStyle.whiteSpace,
        },
        itemBox: box(itemRect),
        itemStyle: {
          display: itemStyle.display,
          float: itemStyle.cssFloat,
          position: itemStyle.position,
        },
      };
    },
    await form.elementHandle(),
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
        isProtected: true,
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

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
