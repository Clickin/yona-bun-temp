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
const SHELL = '[data-owner="framed-site-shell"]';
const MAIN = '[data-owner="framed-site-main"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("framed SiteLayout shell has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");

  expect(route).toContain('data-owner="framed-site-shell"');
  expect(route).toContain('data-owner="framed-site-main"');
  expect(route).toContain('data-sidebar-open={showLeftSidebar ? "true" : "false"}');
  expect(route).not.toContain("legacy-framed-shell");
  expect(route).not.toContain("legacy-framed-main");
  expect(appCss).not.toContain(".legacy-framed-shell");
  expect(appCss).not.toContain(".legacy-framed-main");
  expect(appCss).toContain('body:has([data-owner="framed-site-shell"][data-sidebar-open="true"])');
  expect(appCss).toContain("open frame must lock its global body scroll container");
  expect(appCss.match(/body:has\(\[data-owner="framed-site-shell"\]/gu)).toHaveLength(1);
});

test("frozen framed SiteLayout sources and generated fallback stay byte-identical", () => {
  for (const [path, hash] of [
    [
      "../yona-original/app/views/layout_framed.scala.html",
      "2ce473f736ddc366996962fcd3e3bb51810369f85a6d7447ea2b38459d827872",
    ],
    [
      "../yona-original/app/views/siteLayout_framed.scala.html",
      "a109e051762a425c8a491ba42d080487f19b3aadbf02f554ff9ee695d052db13",
    ],
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
      "public/legacy-assets/stylesheets/legacy-fallback.css",
      "754ff3b616156208c215c1ff49503d4afc450977ac9206d01297fe9217bd14cd",
    ],
  ]) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(hash);
  }

  const manifest = JSON.parse(
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.manifest.json", "utf8"),
  ) as {
    layeredViteInputs: Array<{
      input: string;
      sourceFiles: Array<{ path: string; sha256: string }>;
    }>;
  };
  const appCssSource = manifest.layeredViteInputs
    .find(({ input }) => input === "frontend/src/app.css")
    ?.sourceFiles.find(({ path }) => path === "frontend/src/app.css");
  expect(appCssSource?.sha256).toBe(
    createHash("sha256").update(readFileSync("src/app.css")).digest("hex"),
  );
});

for (const viewport of [
  { height: 900, label: "desktop", openMainWidth: 1095, sidebarWidth: 271, width: 1366 },
  { height: 844, label: "mobile", openMainWidth: 390, sidebarWidth: 318.6875, width: 390 },
]) {
  test(`framed SiteLayout shell preserves ${viewport.label} closed and open states`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page, false);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const shell = page.locator(SHELL);
    const main = shell.locator(`:scope > ${MAIN}`);
    await expect(shell).toHaveAttribute("data-sidebar-open", "false");
    await expect(main).toBeVisible();
    expect(await readShell(page)).toEqual({
      bodyOverflow: "auto scroll",
      horizontalOverflow: false,
      main: {
        backgroundColor: "rgb(255, 255, 255)",
        height: await main.evaluate((element) => element.getBoundingClientRect().height),
        overflowY: "visible",
        width: viewport.width,
        x: 0,
        y: 0,
      },
      shell: {
        display: "block",
        height: await shell.evaluate((element) => element.getBoundingClientRect().height),
        minWidth: "0px",
        overflow: "visible",
        width: viewport.width,
        x: 0,
        y: 0,
      },
      sidebar: null,
    });

    await shell.getByRole("button", { name: "Sidebar" }).click();
    await expect(shell).toHaveAttribute("data-sidebar-open", "true");
    const motionProbe = await page.evaluate(() => {
      const aside = document.querySelector('[data-owner="left-sidebar-outer-shell"]');
      return aside
        ? {
            motion: aside.getAttribute("data-sidebar-motion"),
            expanded: aside.getAttribute("data-sidebar-expanded"),
            rect: aside.getBoundingClientRect().width,
          }
        : null;
    });
    // F5 dist-truth: the open state animates with a 0.5s width transition
    // (leftSidebarOuterShellStyles.motion, -home-route-screen.tsx:2969-2975);
    // the sidebar/main geometry only matches the settled layout, so wait it out
    // (favorite-stars precedent waits 600ms).
    await page.waitForTimeout(600);
    const open = await readShell(page);
    expect(open).toEqual({
      bodyOverflow: "hidden",
      horizontalOverflow: false,
      main: {
        backgroundColor: "rgb(255, 255, 255)",
        height: viewport.height,
        overflowY: "auto",
        width: viewport.openMainWidth,
        x: viewport.label === "desktop" ? viewport.sidebarWidth : 0,
        y: 0,
      },
      shell: {
        display: viewport.label === "desktop" ? "flex" : "block",
        height: viewport.height,
        minWidth: "0px",
        overflow: "hidden",
        width: viewport.width,
        x: 0,
        y: 0,
      },
      sidebar: {
        contained: true,
        height: viewport.height,
        width: viewport.sidebarWidth,
        x: 0,
        y: 0,
      },
    });

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await page.screenshot({
      fullPage: false,
      path: resolve(SCREENSHOT_DIRECTORY, `style-framed-site-shell-${viewport.label}-open.png`),
    });

    await page
      .getByRole("complementary", { name: "Sidebar" })
      .getByRole("button", { name: "Sidebar" })
      .click();
    await expect(shell).toHaveAttribute("data-sidebar-open", "false");
    await expect(page.getByRole("complementary", { name: "Sidebar" })).toHaveCount(0);
  });
}

test("framed SiteLayout paint is isolated from removed presentation classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page, true);
  await page.goto(`${BASE_PATH}/`);
  const result = await page.locator(SHELL).evaluate((shell) => {
    const main = shell.firstElementChild?.matches("#sidebar")
      ? (shell.children[1] as HTMLElement)
      : (shell.firstElementChild as HTMLElement);
    const snapshot = () => {
      const shellStyle = getComputedStyle(shell);
      const mainStyle = getComputedStyle(main);
      return {
        main: [
          mainStyle.backgroundColor,
          mainStyle.flex,
          mainStyle.height,
          mainStyle.overflowY,
          mainStyle.width,
        ],
        shell: [
          shellStyle.display,
          shellStyle.height,
          shellStyle.minWidth,
          shellStyle.overflow,
          shellStyle.width,
        ],
      };
    };
    const before = snapshot();
    const shellOwner = shell.getAttribute("data-owner");
    const mainOwner = main.getAttribute("data-owner");
    shell.classList.add("legacy-framed-shell", "is-open");
    main.classList.add("legacy-framed-main");
    const withRemovedPresentationClasses = snapshot();
    shell.className = "legacy-framed-shell is-open";
    main.className = "legacy-framed-main";
    const stripped = snapshot();
    return {
      before,
      mainOwner,
      shellOwner,
      stripped,
      withRemovedPresentationClasses,
    };
  });
  expect(result.shellOwner).toBe("framed-site-shell");
  expect(result.mainOwner).toBe("framed-site-main");
  expect(result.withRemovedPresentationClasses).toEqual(result.before);
  // Removed presentation classes (legacy-framed-shell/is-open/legacy-framed-main)
  // no longer drive paint: the framed shell is fully data-owner-owned, so
  // stripping all classes leaves the same computed paint (premise of the old
  // `not.toEqual` assertion is obsolete).
  expect(result.stripped).toEqual(result.before);
});

async function readShell(page: Page) {
  return page.evaluate(
    ({ mainSelector, shellSelector }) => {
      const shell = document.querySelector<HTMLElement>(shellSelector);
      const main = document.querySelector<HTMLElement>(mainSelector);
      const sidebar = document.querySelector<HTMLElement>("#sidebar");
      if (!shell || !main) throw new Error("Expected framed SiteLayout owners are missing.");
      const shellBox = shell.getBoundingClientRect();
      const mainBox = main.getBoundingClientRect();
      const shellStyle = getComputedStyle(shell);
      const mainStyle = getComputedStyle(main);
      const sidebarBox = sidebar?.getBoundingClientRect();
      return {
        bodyOverflow: getComputedStyle(document.body).overflow,
        horizontalOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth,
        main: {
          backgroundColor: mainStyle.backgroundColor,
          height: mainBox.height,
          overflowY: mainStyle.overflowY,
          width: mainBox.width,
          x: mainBox.x,
          y: mainBox.y,
        },
        shell: {
          display: shellStyle.display,
          height: shellBox.height,
          minWidth: shellStyle.minWidth,
          overflow: shellStyle.overflow,
          width: shellBox.width,
          x: shellBox.x,
          y: shellBox.y,
        },
        sidebar: sidebarBox
          ? {
              contained:
                sidebarBox.left >= shellBox.left &&
                sidebarBox.right <= shellBox.right &&
                sidebarBox.top >= shellBox.top &&
                sidebarBox.bottom <= shellBox.bottom,
              height: sidebarBox.height,
              width: sidebarBox.width,
              x: sidebarBox.x,
              y: sidebarBox.y,
            }
          : null,
      };
    },
    { mainSelector: MAIN, shellSelector: SHELL },
  );
}

async function installAuthenticatedHome(page: Page, sidebarOpen: boolean) {
  await page.addInitScript(
    ({ basePath, open }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", String(open));
      localStorage.setItem("sidebarActiveMenu", "myProjectList");
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl: "",
        hideProjectListing: false,
        supportedLanguages: ["en-US"],
      };
    },
    { basePath: BASE_PATH, open: sidebarOpen },
  );
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
