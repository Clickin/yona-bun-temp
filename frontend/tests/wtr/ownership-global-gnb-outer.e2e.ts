import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

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
const OUTER = '[data-owner="global-gnb-outer"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB outer has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");

  const marker = route.indexOf('data-owner="global-gnb-outer"');
  const owner = route.slice(route.lastIndexOf("<header", marker), route.indexOf(">", marker));
  expect(marker).toBeGreaterThanOrEqual(0);

  expect(owner).not.toContain("className");

  expect(appCss).toContain(".gnb-outer {");
  expect(appCss).toContain("@media (max-width: 900px) {");
  expect(appCss).not.toContain(".gnb-outer.project-header {");
  expect(appCss).not.toContain(".gnb-outer.project-header .gnb-inner .logo::before");
  expect(appCss).not.toContain(".gnb-outer.project-header .gnb-inner .logo::after");
  expect(readFileSync("src/routes/restricted.tsx", "utf8")).toContain(
    'data-owner="restricted-gnb-outer"',
  );
  for (const consumer of ["secret.tsx", "$user.tsx", "__root.tsx", "[_]UIKit.tsx"]) {
    const source = readFileSync(`src/routes/${consumer}`, "utf8");
    // __root.tsx carries the legacy class inside a style className template;
    // the other shell consumers use the plain attribute form (stale-pin fix,
    // PW-verified via tests/__wtrfix temp copy).
    expect(source).toMatch(/className=(?:"gnb-outer"|\{`[^`]*\bgnb-outer`\})/);
  }
});

test("frozen GNB outer sources stay byte-identical", () => {
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
  { height: 900, label: "desktop home", path: "/", width: 1366 },
  { height: 844, label: "mobile home", path: "/", width: 390 },
  { height: 900, label: "desktop project", path: "/admin/sample", scoped: true, width: 1366 },
  { height: 844, label: "mobile project", path: "/admin/sample", scoped: true, width: 390 },
  {
    height: 900,
    label: "desktop organization",
    organization: true,
    path: "/organizations/weblabs",
    scoped: true,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile organization",
    organization: true,
    path: "/organizations/weblabs",
    scoped: true,
    width: 390,
  },
]) {
  test(`global GNB outer preserves ${state.label} legacy layout`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.path === "/admin/sample") await mockProject(page);
    if (state.organization) await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const outer = page.locator(OUTER);
    await expect(outer).toBeVisible();
    await expect(outer).not.toHaveClass(/(?:^|\s)(?:gnb-outer|project-header)(?:\s|$)/u);
    await expect(outer.locator(":scope > [data-owner='global-gnb-inner']")).toHaveCount(1);

    const evidence = await outer.evaluate((element) => {
      const inner = element.firstElementChild!;
      const rect = element.getBoundingClientRect();
      const innerRect = inner.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        box: {
          bottom: rect.bottom,
          height: rect.height,
          top: rect.top,
          width: rect.width,
          x: rect.x,
        },
        innerColor: getComputedStyle(inner).color,
        innerContained:
          innerRect.left >= rect.left &&
          innerRect.right <= rect.right &&
          innerRect.top >= rect.top &&
          innerRect.bottom <= rect.bottom,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        style: {
          backgroundColor: style.backgroundColor,
          boxSizing: style.boxSizing,
          color: style.color,
          height: style.height,
          minWidth: style.minWidth,
          padding: style.padding,
          position: style.position,
          width: style.width,
          zIndex: style.zIndex,
        },
      };
    });
    expect(evidence.style).toEqual({
      backgroundColor: state.scoped ? "rgba(0, 0, 0, 0.35)" : "rgb(27, 27, 27)",
      boxSizing: "border-box",
      color: "rgb(51, 51, 51)",
      height: "40px",
      minWidth: state.width <= 720 ? "10px" : "0px",
      padding: state.scoped ? "0px" : "0px 10px",
      position: state.scoped ? "absolute" : "static",
      width: `${state.width}px`,
      zIndex: state.scoped ? "1000" : "auto",
    });
    expect(evidence.box).toEqual({ bottom: 40, height: 40, top: 0, width: state.width, x: 0 });
    expect(evidence.innerColor).toBe("rgb(120, 139, 167)");
    expect(evidence.innerContained).toBe(true);
    expect(evidence.overflow).toBe(false);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await outer.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-global-gnb-outer-${state.label.replaceAll(" ", "-")}.png`,
      ),
    });
  });
}

test("global GNB outer paint is isolated from legacy presentation classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const result = await page.locator(OUTER).evaluate((outer) => {
    const snapshot = () => {
      const style = getComputedStyle(outer);
      return {
        backgroundColor: style.backgroundColor,
        boxSizing: style.boxSizing,
        height: style.height,
        minWidth: style.minWidth,
        padding: style.padding,
        position: style.position,
        width: style.width,
        zIndex: style.zIndex,
      };
    };
    const owned = snapshot();
    outer.classList.add("gnb-outer", "project-header");
    return { owned, withLegacyClasses: snapshot() };
  });
  expect(result.withLegacyClasses).toEqual(result.owned);
});

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
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}

async function mockProject(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        dashboard: { assignees: [], labels: [], milestones: [], pullRequests: [] },
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
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
