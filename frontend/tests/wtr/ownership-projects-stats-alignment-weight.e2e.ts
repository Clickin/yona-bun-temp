import { readFile } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// wtr-compat readFileSync's binary branch sets responseType=arraybuffer on a
// synchronous XHR, which documents reject (InvalidAccessError) — bucket-1 gap
// reported to main. readFile (async fetch) returns the PNG bytes; btoa keeps
// the original data-URL semantics.
const avatarDataUrl = `data:image/png;base64,${btoa(
  String.fromCharCode(
    ...((await readFile(
      resolve("src/assets/legacy/default-avatar-34.png"),
    )) as unknown as Uint8Array),
  ),
)}`;
const owners = {
  count: "projects-directory-member-count",
  icon: "projects-directory-stats-icon",
} as const;

test.use({ locale: "ko-KR" });

async function mockProjects(page: Page) {
  await page.clock.setFixedTime("2026-07-17T12:00:00Z");
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: null,
    defaultLandingPath: "/",
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    userLabel: "",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            createdAt: "2026-07-07T12:00:00Z",
            lastPushedAt: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdAt: "2026-07-07T12:00:00Z",
            lastPushedAt: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdAt: "2026-07-07T12:00:00Z",
            lastPushedAt: "2026-07-12T12:00:00Z",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 3,
        totalPages: 1,
      },
    }),
  );
}

async function open(page: Page) {
  await mockProjects(page);
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-owner="${owners.icon}"]`).first()).toBeVisible({
    timeout: 2_000,
  });
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`stats alignment/weight wave preserves exact ${viewport.name} output`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const icons = page.locator(`[data-owner="${owners.icon}"]`);
    const counts = page.locator(`[data-owner="${owners.count}"]`);
    await expect(icons).toHaveCount(6);
    await expect(counts).toHaveCount(6);
    expect(
      await icons.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            !node.classList.contains("yobicon-middle") &&
            !node.classList.contains("yobicon-friends") &&
            !node.classList.contains("yobicon-eye"),
        ),
      ),
    ).toBe(true);
    await expect(counts).toHaveText(["1", "1", "1", "1", "1", "1"]);
    const paragraphs = page.locator('[data-owner="projects-directory-members"] > p');
    await expect(paragraphs).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      // wtr-compat: plainLocator.nth(i).locator(":scope > X") drops the parent
      // index in resolveElements (count sums every parent's children) —
      // bucket-1 gap reported to main; the members-scoped compose chain
      // (scopedChild kept across nth) resolves the nth p's children only.
      const children = page
        .locator('[data-owner="projects-directory-members"]')
        .locator(":scope > p")
        .nth(index)
        .locator(":scope > *");
      await expect(children).toHaveCount(4);
      await expect(children.nth(0)).toHaveAttribute("data-owner", owners.icon);
      await expect(children.nth(1)).toHaveAttribute("data-owner", owners.count);
      await expect(children.nth(2)).toHaveAttribute("data-owner", owners.icon);
      await expect(children.nth(3)).toHaveAttribute("data-owner", owners.count);
    }

    const actual = await page.evaluate((ownerNames) => {
      const icons = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.icon}"]`),
      );
      const counts = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.count}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      return {
        counts: counts.map((count) => {
          const style = getComputedStyle(count);
          return {
            box: box(count),
            style: {
              color: style.color,
              display: style.display,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              margin: style.margin,
              verticalAlign: style.verticalAlign,
            },
          };
        }),
        icons: icons.map((icon) => {
          const style = getComputedStyle(icon);
          return {
            box: box(icon),
            glyph: getComputedStyle(icon, "::before").content,
            style: {
              color: style.color,
              display: style.display,
              fontFamily: style.fontFamily,
              fontSize: style.fontSize,
              fontStyle: style.fontStyle,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              margin: style.margin,
              verticalAlign: style.verticalAlign,
            },
          };
        }),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.icons.map(({ box }) => box)).toEqual(
      [
        [1288.65625, 214],
        [1324.828125, 214],
        [1288.65625, desktop ? 305 : 430],
        [1324.828125, desktop ? 305 : 430],
        [1288.65625, desktop ? 396 : 581],
        [1324.828125, desktop ? 396 : 581],
      ].map(([desktopX, y], index) => ({
        height: 16,
        width: 16,
        x: desktop ? desktopX : index % 2 === 0 ? 322.65625 : 358.828125,
        y: desktop ? y : index < 2 ? 279 : y,
      })),
    );
    expect(actual.counts.map(({ box }) => box)).toEqual(
      [
        [1309.65625, desktop ? 215 : 245],
        [1349.421875, 215],
        // F5 dist-truth (2026-08-11): the mobile count glyphs sit 30px
        // higher (pair rows at 431/582).
        [1309.65625, desktop ? 306 : 431],
        [1349.421875, desktop ? 306 : 431],
        [1309.65625, desktop ? 397 : 582],
        [1349.421875, desktop ? 397 : 582],
      ].map(([desktopX, y], index) => ({
        height: 16,
        width: 6.578125,
        x: desktop ? desktopX : index % 2 === 0 ? 343.65625 : 383.421875,
        y: desktop ? y : index < 2 ? 280 : y,
      })),
    );
    expect(actual.icons.map(({ glyph }) => glyph)).toEqual([
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
    ]);
    for (const icon of actual.icons)
      expect(icon.style).toEqual({
        color: "rgb(51, 51, 51)",
        display: "inline-block",
        fontFamily: "yobicon",
        fontSize: "16px",
        fontStyle: "normal",
        fontWeight: "400",
        lineHeight: "16px",
        margin: "0px 5px 3px",
        verticalAlign: "bottom",
      });
    for (const count of actual.counts)
      expect(count.style).toEqual({
        color: "rgb(81, 170, 204)",
        display: "inline",
        fontSize: "13px",
        fontWeight: "700",
        lineHeight: "20px",
        margin: "0px",
        verticalAlign: "baseline",
      });
    expect(actual.scrollWidth).toBe(viewport.width);

    const screenshotDirectory = resolve("..", "output/playwright/visual-sweep");
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `style-projects-stats-alignment-weight-${viewport.name}.png`,
      ),
    });
  });
