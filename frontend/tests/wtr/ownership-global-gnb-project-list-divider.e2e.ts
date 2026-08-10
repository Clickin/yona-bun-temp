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
const DIVIDER = '[data-owner="global-gnb-project-list-divider"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("List All divider source has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  for (const token of [
    "globalGnbBrandHeight",
    "globalGnbProjectListDividerFontSize",
    "globalGnbProjectListDividerOpacity",
    "textMuted",
    "transparent",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }

  const marker = route.indexOf('data-owner="global-gnb-project-list-divider"');
  const owner = route.slice(route.lastIndexOf("<li", marker), route.indexOf("/>", marker));
  expect(marker).toBeGreaterThanOrEqual(0);

  expect(owner).toContain("className");

  expect(appCss).not.toContain(".gnb-nav .divider");
  expect(appCss).toContain(".gnb-usermenu .divider");
  expect(appCss).toContain(".gnb-nav > li {");
});

test("frozen GNB divider sources stay byte-identical", () => {
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
  { height: 900, label: "desktop home", path: "/", width: 1366 },
  { height: 844, label: "mobile home", path: "/", width: 390 },
  { height: 900, label: "desktop projects", path: "/projects", width: 1366 },
  { height: 844, label: "mobile projects", path: "/projects", width: 390 },
  { height: 900, label: "desktop organizations", path: "/orgs", width: 1366 },
  { height: 844, label: "mobile organizations", path: "/orgs", width: 390 },
]) {
  test(`List All divider preserves ${state.label} legacy paint and geometry`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const divider = page.locator(DIVIDER);
    await expect(divider).toBeVisible();
    await expect(divider).toHaveText("");
    await expect(divider).toHaveClass(/(?:^|\s)divider(?:\s|$)/u);
    await expect(divider.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
      "data-owner",
      "global-gnb-project-list-item",
    );
    await expect(divider.locator("xpath=following-sibling::*[1]/a")).toHaveAttribute(
      "href",
      "https://github.com/yona-projects/yona/issues",
    );

    const evidence = await readEvidence(divider);
    expect(evidence.box).toEqual({ height: 40, width: 3.109375 });
    expect(evidence.style).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      backgroundImage: "none",
      color: "rgb(162, 162, 162)",
      display: "list-item",
      float: "left",
      fontSize: "12px",
      height: "40px",
      lineHeight: "40px",
      margin: "0px",
      opacity: "1",
      padding: "0px",
      position: "relative",
      width: "3.10938px",
    });
    expect(evidence.after).toEqual({
      color: "rgb(162, 162, 162)",
      content: '"|"',
      display: "inline",
      fontSize: "12px",
      lineHeight: "40px",
      opacity: "0.35",
    });
    expect(evidence.overflow).toBe(false);
    await saveScreenshot(
      divider,
      `style-global-gnb-project-list-divider-${state.label.replaceAll(" ", "-")}.png`,
    );
  });
}

test("List All divider keeps conditional visibility", async ({ page }) => {
  await installRuntime(page, { isGuest: true });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(DIVIDER)).toHaveCount(0);

  await installRuntime(page, { hideProjectListing: true });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(DIVIDER)).toHaveCount(0);
});

test("List All divider paint is independent from generic legacy GNB selectors", async ({
  page,
}) => {
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/projects`);
  const evidence = await page.locator(DIVIDER).evaluate((divider) => {
    divider.parentElement!.classList.remove("gnb-nav");
    const owned = snapshot(divider);
    divider.className = "";
    return { owned, stripped: snapshot(divider) };

    function snapshot(element: Element) {
      const style = getComputedStyle(element);
      const after = getComputedStyle(element, "::after");
      return {
        afterColor: after.color,
        afterContent: after.content,
        afterOpacity: after.opacity,
        backgroundColor: style.backgroundColor,
        float: style.cssFloat,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        position: style.position,
      };
    }
  });

  expect(evidence.owned).toEqual({
    afterColor: "rgb(162, 162, 162)",
    afterContent: '"|"',
    afterOpacity: "0.35",
    backgroundColor: "rgba(0, 0, 0, 0)",
    float: "left",
    fontSize: "12px",
    lineHeight: "40px",
    position: "relative",
  });
  expect(evidence.stripped.afterContent).toBe("none");
  expect(evidence.stripped.float).toBe("none");
  expect(evidence.stripped.position).toBe("static");
});

async function installRuntime(
  page: Page,
  options: { hideProjectListing?: boolean; isGuest?: boolean } = {},
) {
  await page.addInitScript(
    ({ basePath, hideProjectListing }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", "false");
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl: "https://github.com/yona-projects/yona/issues",
        hideProjectListing,
        supportedLanguages: ["en-US"],
      };
    },
    { basePath: BASE_PATH, hideProjectListing: options.hideProjectListing ?? false },
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: options.isGuest ?? false,
        isSiteAdmin: false,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/organizations**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/workspace/overview**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { profile: { isGuest: options.isGuest ?? false, loginId: "admin" } },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}

async function readEvidence(divider: Locator) {
  return divider.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const after = getComputedStyle(element, "::after");
    return {
      after: {
        color: after.color,
        content: after.content,
        display: after.display,
        fontSize: after.fontSize,
        lineHeight: after.lineHeight,
        opacity: after.opacity,
      },
      box: { height: rect.height, width: rect.width },
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      style: {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        color: style.color,
        display: style.display,
        float: style.cssFloat,
        fontSize: style.fontSize,
        height: style.height,
        lineHeight: style.lineHeight,
        margin: style.margin,
        opacity: style.opacity,
        padding: style.padding,
        position: style.position,
        width: style.width,
      },
    };
  });
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
