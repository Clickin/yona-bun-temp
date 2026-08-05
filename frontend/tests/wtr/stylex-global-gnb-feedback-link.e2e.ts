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

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ITEM = '[data-stylex-owner="global-gnb-feedback-item"]';
const LINK = '[data-stylex-owner="global-gnb-feedback-link"]';
const FEEDBACK_URL = "https://github.com/yona-projects/yona/issues";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("Feedback source has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const restricted = readFileSync("src/routes/restricted.tsx", "utf8");
  const start = route.indexOf("const globalGnbFeedbackStyles");
  const end = route.indexOf("const globalGnbProjectListDividerStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  const linkStyleStart = styles.indexOf("link: {");
  const linkStyles = styles.slice(linkStyleStart);
  expect(linkStyles).not.toContain("display:");
  expect(linkStyles).not.toContain("float:");
  for (const token of [
    "globalGnbBrandHeight",
    "globalGnbBrandPaddingInline",
    "globalGnbBrandTransitionDuration",
    "globalGnbNavItemFloat",
    "globalGnbNavItemPosition",
    "globalGnbFeedbackLinkDisplay",
    "globalGnbFeedbackLinkFloat",
    "globalGnbFeedbackTextDecoration",
    "globalGnbFeedbackTransitionProperty",
    "textMuted",
    "textOnAccent",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);

  const itemMarker = route.indexOf('data-stylex-owner="global-gnb-feedback-item"');
  const linkMarker = route.indexOf('data-stylex-owner="global-gnb-feedback-link"');
  const item = route.slice(
    route.lastIndexOf("<li", itemMarker),
    route.indexOf("</li>", itemMarker),
  );
  const link = route.slice(
    route.lastIndexOf("<Link", linkMarker),
    route.indexOf("</Link>", linkMarker),
  );
  expect(itemMarker).toBeGreaterThanOrEqual(0);
  expect(linkMarker).toBeGreaterThanOrEqual(0);
  expect(item).toContain("globalGnbFeedbackStyles.item");
  expect(link).toContain("globalGnbFeedbackStyles.link");
  expect(link).toContain("href={feedbackUrl}");
  expect(link).toContain("to={feedbackUrl}");
  expect(link).toContain('target="_blank"');
  expect(item).not.toContain("className");

  for (const selector of [".gnb-nav > li {", ".gnb-nav a,", ".gnb-nav a {", ".gnb-nav a:hover,"]) {
    expect(appCss).toContain(selector);
  }
  expect(restricted).toContain('data-stylex-owner="restricted-gnb-nav"');
  expect(appCss).not.toMatch(/feedback/iu);
});

test("frozen GNB Feedback sources stay byte-identical", () => {
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
  test(`Feedback preserves ${state.label} legacy paint and geometry`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const item = page.locator(ITEM);
    const link = page.locator(LINK);
    await expect(item).toBeVisible();
    await expect(link).toHaveText("Feedback");
    await expect(link).toHaveAttribute("href", FEEDBACK_URL);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(item.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
      "data-stylex-owner",
      "global-gnb-project-list-divider",
    );
    await expect(item.locator("xpath=following-sibling::*[1]/form")).toHaveClass(
      /(?:^|\s)gnb-search-form(?:\s|$)/u,
    );

    const evidence = await readEvidence(item, link);
    expect(evidence.item).toEqual({ float: "left", position: "relative" });
    expect(evidence.link).toEqual({
      color: "rgb(162, 162, 162)",
      display: "inline",
      float: "none",
      lineHeight: "40px",
      padding: "10px",
      position: "static",
      textDecoration: "none",
      transition: "color 0.15s",
    });
    expect(evidence.box).toEqual({ height: 37, width: 83.171875 });
    expect(evidence.overflow).toBe(false);
    await saveScreenshot(
      link,
      `stylex-global-gnb-feedback-${state.label.replaceAll(" ", "-")}.png`,
    );

    await link.hover();
    await page.waitForTimeout(200);
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(state.width - 1, state.height - 1);
    await link.focus();
    await page.waitForTimeout(200);
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
  });
}

test("Feedback keeps conditional visibility and external navigation contract", async ({ page }) => {
  await installRuntime(page, { feedbackUrl: "  " });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(ITEM)).toHaveCount(0);

  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);
  const link = page.locator(LINK);
  await expect(link).toHaveAttribute("href", FEEDBACK_URL);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).not.toHaveAttribute("data-status");
  await expect(link).not.toHaveAttribute("aria-current");
});

test("Feedback paint is independent from generic legacy GNB selectors", async ({ page }) => {
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/projects`);
  const isolated = await page.locator(ITEM).evaluate((item) => {
    item.parentElement!.classList.remove("gnb-nav");
    const link = item.querySelector("a")!;
    const snapshot = () => ({
      itemFloat: getComputedStyle(item).cssFloat,
      itemPosition: getComputedStyle(item).position,
      linkColor: getComputedStyle(link).color,
      linkDisplay: getComputedStyle(link).display,
      linkLineHeight: getComputedStyle(link).lineHeight,
      linkPadding: getComputedStyle(link).padding,
    });
    const owned = snapshot();
    item.className = "";
    link.className = "";
    return { owned, stripped: snapshot() };
  });
  expect(isolated.owned).toEqual({
    itemFloat: "left",
    itemPosition: "relative",
    linkColor: "rgb(162, 162, 162)",
    linkDisplay: "inline",
    linkLineHeight: "40px",
    linkPadding: "10px",
  });
  expect(isolated.stripped).toEqual({
    itemFloat: "none",
    itemPosition: "static",
    linkColor: "rgb(162, 162, 162)",
    linkDisplay: "inline",
    linkLineHeight: "20px",
    linkPadding: "0px",
  });
});

async function installRuntime(page: Page, options: { feedbackUrl?: string } = {}) {
  await page.addInitScript(
    ({ basePath, feedbackUrl }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", "false");
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl,
        hideProjectListing: false,
        supportedLanguages: ["en-US"],
      };
    },
    { basePath: BASE_PATH, feedbackUrl: options.feedbackUrl ?? FEEDBACK_URL },
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
        isGuest: false,
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
      json: { profile: { isGuest: false, loginId: "admin" } },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}

async function readEvidence(item: Locator, link: Locator) {
  return item.evaluate(
    (element, linkElement) => {
      const itemStyle = getComputedStyle(element);
      const linkStyle = getComputedStyle(linkElement as Element);
      const box = (linkElement as Element).getBoundingClientRect();
      return {
        box: { height: box.height, width: box.width },
        item: { float: itemStyle.cssFloat, position: itemStyle.position },
        link: {
          color: linkStyle.color,
          display: linkStyle.display,
          float: linkStyle.cssFloat,
          lineHeight: linkStyle.lineHeight,
          padding: linkStyle.padding,
          position: linkStyle.position,
          textDecoration: linkStyle.textDecorationLine,
          transition: linkStyle.transition,
        },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    },
    await link.elementHandle(),
  );
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
