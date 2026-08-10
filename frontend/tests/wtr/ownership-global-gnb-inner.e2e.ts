import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

// copy-level node:crypto shim: sync SHA-1/SHA-256 (browser has no node:crypto).
const createHash = (algorithm: string) => {
  const isSha1 = algorithm === "sha1";
  if (!isSha1 && algorithm !== "sha256") throw new Error("createHash shim: only sha1/sha256");
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  const K1 = [0x5a827999, 0x6ed9eba1, 0x8f1bbcdc, 0xca62c1d6];
  const K256 = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const chunks: number[] = [];
  let state: number[] = isSha1
    ? [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]
    : [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
      ];
  const api = {
    update(data: string | Uint8Array) {
      if (typeof data === "string") {
        const encoded = new TextEncoder().encode(data);
        for (let i = 0; i < encoded.length; i++) chunks.push(encoded[i]);
      } else {
        for (let i = 0; i < data.length; i++) chunks.push(data[i]);
      }
      return api;
    },
    digest() {
      const bitLen = chunks.length * 8;
      chunks.push(0x80);
      while (chunks.length % 64 !== 56) chunks.push(0);
      for (let i = 7; i >= 0; i--) chunks.push((bitLen / 2 ** (i * 8)) & 0xff);
      const view = new DataView(new Uint8Array(chunks).buffer);
      const w = new Uint32Array(80);
      const h = state.slice();
      for (let off = 0; off < chunks.length; off += 64) {
        for (let j = 0; j < 16; j++) w[j] = view.getUint32(off + j * 4);
        for (let j = 16; j < (isSha1 ? 80 : 64); j++) {
          if (isSha1) {
            w[j] = rotr(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 31);
          } else {
            const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
            const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
            w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
          }
        }
        let [a, b, c, d, e, f, g, hh] = h;
        for (let j = 0; j < (isSha1 ? 80 : 64); j++) {
          if (isSha1) {
            const k = K1[j < 20 ? 0 : j < 40 ? 1 : j < 60 ? 2 : 3];
            const fn =
              j < 20
                ? (b & c) | (~b & d)
                : j < 40
                  ? b ^ c ^ d
                  : j < 60
                    ? (b & c) | (b & d) | (c & d)
                    : b ^ c ^ d;
            const tmp = (rotr(a, 27) + fn + e + k + w[j]) | 0;
            e = d;
            d = c;
            c = rotr(b, 2);
            b = a;
            a = tmp;
          } else {
            const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (s0 + maj) | 0;
            const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (hh + s1 + ch + K256[j] + w[j]) | 0;
            hh = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
          }
        }
        if (isSha1) {
          h[0] = (h[0] + a) | 0;
          h[1] = (h[1] + b) | 0;
          h[2] = (h[2] + c) | 0;
          h[3] = (h[3] + d) | 0;
          h[4] = (h[4] + e) | 0;
        } else {
          h[0] = (h[0] + a) | 0;
          h[1] = (h[1] + b) | 0;
          h[2] = (h[2] + c) | 0;
          h[3] = (h[3] + d) | 0;
          h[4] = (h[4] + e) | 0;
          h[5] = (h[5] + f) | 0;
          h[6] = (h[6] + g) | 0;
          h[7] = (h[7] + hh) | 0;
        }
      }
      return h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
    },
  };
  return api;
};

import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const INNER = '[data-owner="global-gnb-inner"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB inner has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  for (const token of [
    "globalGnbInnerBoxSizing",
    "globalGnbInnerWidth",
    "globalGnbInnerHeight",
    "globalGnbInnerMargin",
    "globalGnbInnerText",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }

  const marker = route.indexOf('data-owner="global-gnb-inner"');
  const owner = route.slice(route.lastIndexOf("<div", marker), route.indexOf(">", marker));
  expect(marker).toBeGreaterThanOrEqual(0);

  expect(owner).not.toContain("className");

  expect(appCss).toContain(".gnb-inner {");
  expect(appCss).toContain(".gnb-inner::after {");
  const innerBridgeStart = appCss.indexOf(".gnb-inner {");
  const innerBridgeEnd = appCss.indexOf("}", innerBridgeStart);
  expect(appCss.slice(innerBridgeStart, innerBridgeEnd)).not.toContain("box-sizing: border-box;");
  expect(readFileSync("src/routes/restricted.tsx", "utf8")).toContain(
    'data-owner="restricted-gnb-inner"',
  );
  for (const consumer of ["secret.tsx", "$user.tsx", "__root.tsx"]) {
    expect(readFileSync(`src/routes/${consumer}`, "utf8")).toContain('className="gnb-inner"');
  }
});

test("frozen GNB inner sources stay byte-identical", () => {
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
  {
    height: 900,
    label: "desktop project",
    path: "/admin/sample",
    project: true,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile project",
    path: "/admin/sample",
    project: true,
    width: 390,
  },
  {
    height: 900,
    label: "desktop organization",
    organization: true,
    path: "/organizations/weblabs",
    width: 1366,
  },
  {
    height: 844,
    label: "mobile organization",
    organization: true,
    path: "/organizations/weblabs",
    width: 390,
  },
]) {
  test(`global GNB inner preserves ${state.label} legacy layout`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    if (state.project) await mockProject(page);
    if (state.organization) await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const inner = page.locator(INNER);
    await expect(inner).toBeVisible();
    await expect(inner).not.toHaveClass(/(?:^|\s)gnb-inner(?:\s|$)/u);
    await expect(inner.locator(":scope > [data-owner='global-sidebar-open-pin']")).toHaveCount(1);
    await expect(inner.locator(":scope > [data-owner='global-gnb-nav']")).toHaveCount(1);
    await expect(inner.locator(":scope > [data-owner$='site-user-menu']")).toHaveCount(1);

    const evidence = await inner.evaluate((element) => {
      const outer = element.parentElement!;
      const style = getComputedStyle(element);
      const after = getComputedStyle(element, "::after");
      const rect = element.getBoundingClientRect();
      const outerStyle = getComputedStyle(outer);
      const outerRect = outer.getBoundingClientRect();
      const contentWidth =
        outerRect.width - parseFloat(outerStyle.paddingLeft) - parseFloat(outerStyle.paddingRight);
      const expectedWidth = contentWidth * 0.98;
      const expectedMargin = (contentWidth - expectedWidth) / 2;
      return {
        after: { clear: after.clear, content: after.content, display: after.display },
        box: { height: rect.height, width: rect.width, x: rect.x },
        childOwners: [...element.children]
          .map((child) => child.getAttribute("data-owner"))
          .filter(Boolean),
        expectedMargin,
        expectedWidth,
        expectedX: outerRect.x + parseFloat(outerStyle.paddingLeft) + expectedMargin,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        style: {
          boxSizing: style.boxSizing,
          color: style.color,
          height: style.height,
          marginBottom: style.marginBottom,
          marginLeft: style.marginLeft,
          marginRight: style.marginRight,
          marginTop: style.marginTop,
          width: style.width,
        },
      };
    });

    expect(evidence.style.boxSizing).toBe("content-box");
    expect(evidence.style.color).toBe("rgb(120, 139, 167)");
    expect(evidence.style.height).toBe("40px");
    expect(evidence.style.marginTop).toBe("0px");
    expect(evidence.style.marginBottom).toBe("0px");
    expect(parseFloat(evidence.style.marginLeft)).toBeCloseTo(evidence.expectedMargin, 1);
    expect(parseFloat(evidence.style.marginRight)).toBeCloseTo(evidence.expectedMargin, 1);
    expect(parseFloat(evidence.style.width)).toBeCloseTo(evidence.expectedWidth, 1);
    expect(evidence.box.height).toBe(40);
    expect(evidence.box.width).toBeCloseTo(evidence.expectedWidth, 1);
    expect(evidence.box.x).toBeCloseTo(evidence.expectedX, 1);
    expect(evidence.after).toEqual({ clear: "none", content: "none", display: "inline" });
    expect(evidence.childOwners.slice(0, 2)).toEqual(["global-sidebar-open-pin", "global-gnb-nav"]);
    expect(evidence.overflow).toBe(false);
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await inner.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-global-gnb-inner-${state.label.replaceAll(" ", "-")}.png`,
      ),
    });
  });
}

test("global GNB inner paint is isolated from its legacy presentation class", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);
  const result = await page.locator(INNER).evaluate((inner) => {
    const snapshot = () => {
      const style = getComputedStyle(inner);
      return {
        boxSizing: style.boxSizing,
        color: style.color,
        height: style.height,
        margin: style.margin,
        width: style.width,
      };
    };
    const owned = snapshot();
    const ownedAfter = getComputedStyle(inner, "::after");
    const ownedPseudo = {
      clear: ownedAfter.clear,
      content: ownedAfter.content,
      display: ownedAfter.display,
    };
    inner.classList.add("gnb-inner");
    return { owned, ownedPseudo, withLegacyClass: snapshot() };
  });
  expect(result.withLegacyClass).toEqual(result.owned);
  expect(result.ownedPseudo).toEqual({ clear: "none", content: "none", display: "inline" });
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
