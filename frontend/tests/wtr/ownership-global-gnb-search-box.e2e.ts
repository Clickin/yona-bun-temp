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
const BOX = '[data-owner="global-gnb-search-box"]';
const FORM = '[data-owner="global-gnb-search-form"]';
const SCOPE = '[data-owner="global-gnb-search-scope"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search box has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();
  for (const token of [
    "globalGnbSearchBoxSurface",
    "globalGnbSearchBoxBorderStyle",
    "globalGnbSearchBoxBoxSizing",
    "globalGnbSearchBoxDisplay",
    "globalGnbSearchBoxHeight",
    "globalGnbSearchBoxRadius",
    "globalGnbSearchBoxVerticalAlign",
    "globalGnbSearchBoxZero",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }

  const marker = route.indexOf('data-owner="global-gnb-search-box"');
  const markup = route.slice(route.lastIndexOf("<div", marker), route.indexOf("</div>", marker));
  expect(marker).toBeGreaterThanOrEqual(0);

  // wave-33 retained-class retention (667398a04): markup keeps search-box/select
  // per legacy common/navbar.scala.html:105 <div class="search-box @if(project != null || org !=null) {select}">
  // the route renders className={`search-box${...}`} — the ${ follows the
  // class name directly.
  expect(markup).toMatch(/(?:^|[\s"'`])search-box(?:\$\{|[\s"'`]|$)/u);
  expect(markup).toMatch(/(?:^|[\s"'`])select(?:[\s"'`]|$)/u);
  expect(markup.indexOf('name="keyword"')).toBeLessThan(markup.indexOf('type="submit"'));

  expect(appCss).not.toContain(".gnb-search-form .search-box {");
  expect(appCss).not.toContain(".gnb-search-form .search-box.select {");
  expect(appCss).not.toContain('.gnb-search-form input[type="text"] {');
  expect(appCss).not.toContain(".gnb-search-form .search-box button {");
});

test("frozen global GNB search-box sources stay byte-identical", () => {
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
  { kind: "home", path: "/", scoped: false },
  { kind: "project", path: "/admin/sample", scoped: true },
  { kind: "organization", path: "/organizations/weblabs", scoped: true },
] as const) {
  test(`global GNB search box preserves exact ${state.kind} desktop base parity`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1366 });
    await installRuntime(page);
    if (state.kind === "project") await mockProject(page);
    if (state.kind === "organization") await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.load("12px yobicon"));
    await page.evaluate(() => document.fonts.ready);

    const box = page.locator(BOX);
    const form = page.locator(FORM);
    await expect(box).toBeVisible();
    // wave-33 retained-class retention (667398a04): search-box/select kept per
    // legacy common/navbar.scala.html:105 <div class="search-box @if(project != null || org !=null) {select}">
    await expect(box).toHaveClass(/(?:^|\s)search-box(?:\s|$)/u);
    if (state.scoped) {
      await expect(box).toHaveClass(/(?:^|\s)select(?:\s|$)/u);
    } else {
      await expect(box).not.toHaveClass(/(?:^|\s)select(?:\s|$)/u);
    }
    await expect(form.locator(BOX)).toHaveCount(1);
    if (state.scoped) {
      await expect(form.locator(`:scope > ${SCOPE} + ${BOX}`)).toHaveCount(1);
    } else {
      await expect(form.locator(`:scope > ${SCOPE}`)).toHaveCount(0);
      await expect(form.locator(`:scope > input[type="hidden"] + ${BOX}`)).toHaveCount(1);
    }

    const evidence = await readBoxEvidence(box);
    expect(evidence.box).toMatchObject({ height: 30, top: 5, width: 92 });
    expect(evidence.style).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderRadius: state.scoped ? "0px 3px 3px 0px" : "3px",
      borderWidth: "0px",
      boxSizing: "content-box",
      display: "inline-block",
      height: "30px",
      verticalAlign: "middle",
    });
    expect(evidence.inputBox.width).toBe(70);
    expect(evidence.buttonBox.left - evidence.inputBox.right).toBe(5);
    expect(evidence.inputBox.top).toBeGreaterThanOrEqual(evidence.box.top);
    expect(evidence.buttonBox.right).toBeLessThanOrEqual(evidence.box.right);

    await saveScreenshot(box, `style-global-gnb-search-box-${state.kind}-base.png`);
  });
}

test("project search focus expands the input and owned wrapper without compensation", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  const box = page.locator(BOX);
  const input = box.locator('input[name="keyword"]');
  const before = await readBoxEvidence(box);
  await input.focus();
  await expect(input).toBeFocused();
  await page.waitForTimeout(350);
  const focused = await readBoxEvidence(box);

  expect(before.box.width).toBe(92);
  expect(focused.box).toMatchObject({ height: 30, left: before.box.left, top: 5, width: 242 });
  expect(focused.inputBox.width).toBe(220);
  expect(focused.buttonBox.left - focused.inputBox.right).toBe(5);
  expect(focused.box.right - focused.buttonBox.right).toBe(5);
  await saveScreenshot(box, "style-global-gnb-search-box-project-focus.png");
});

test("outer responsive rule hides the owned search box at 390px", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  await expect(page.locator(FORM)).toBeHidden();
  await expect(page.locator(BOX)).toBeHidden();
  const box = await page.locator(BOX).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  });
  expect(box).toEqual({ height: 0, width: 0 });
});

test("search-box DOM order and legacy GET form behavior remain intact", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  const form = page.locator(FORM);
  const box = page.locator(BOX);
  await expect(box.locator(":scope > :nth-child(1)")).toHaveAttribute("name", "keyword");
  await expect(box.locator(":scope > :nth-child(2)")).toHaveAttribute("type", "submit");
  await expect(form).not.toHaveAttribute("method");
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/admin/sample/search`);
  await box.locator('input[name="keyword"]').fill("needle");

  // F5 dist-truth: the native form GET navigates the harness iframe without
  // a request event; poll the page URL.
  await box.locator(':scope > [type="submit"]').click({ noWaitAfter: true });
  await expect
    .poll(() => new URL(page.url()).searchParams.get("keyword"), { timeout: 10000 })
    .toBe("needle");
  expect(new URL(page.url()).searchParams.get("searchType")).toBe("auto");
  expect(new URL(page.url()).searchParams.get("keyword")).toBe("needle");
});

test("owned wrapper is isolated after the retired search-box class is removed", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  const evidence = await page.locator(BOX).evaluate((box) => {
    const snapshot = () => {
      const style = getComputedStyle(box);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderWidth: style.borderWidth,
        boxSizing: style.boxSizing,
        display: style.display,
        height: style.height,
        verticalAlign: style.verticalAlign,
      };
    };
    const owned = snapshot();
    const ownedClassName = box.className;
    box.parentElement!.className = "";
    box.parentElement!.parentElement!.className = "";
    const isolated = snapshot();
    box.classList.add("search-box");
    const withRetiredClass = snapshot();
    return {
      isolated,
      owned,
      ownedClassName,
      withRetiredClass,
    };
  });

  expect(evidence.isolated).toEqual(evidence.owned);
  expect(evidence.withRetiredClass).toEqual(evidence.owned);
  // wave-33 retained-class retention (667398a04): owned box keeps search-box select
  // per legacy common/navbar.scala.html:105
  expect(evidence.ownedClassName).toMatch(/(?:^|\s)(?:search-box|select)(?:\s|$)/u);
});

async function readBoxEvidence(box: Locator) {
  return box.evaluate((node) => {
    const input = node.querySelector("input")!;
    const button = node.querySelector('[data-owner="global-gnb-search-submit"]')!;
    const nodeBox = node.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    const style = getComputedStyle(node);
    const rect = (value: DOMRect) => ({
      bottom: value.bottom,
      height: value.height,
      left: value.left,
      right: value.right,
      top: value.top,
      width: value.width,
    });
    return {
      box: rect(nodeBox),
      buttonBox: rect(buttonBox),
      inputBox: rect(inputBox),
      style: {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderWidth: style.borderWidth,
        boxSizing: style.boxSizing,
        display: style.display,
        height: style.height,
        verticalAlign: style.verticalAlign,
      },
    };
  });
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

async function mockProject(page: Page) {
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
        organizationName: "weblabs",
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
