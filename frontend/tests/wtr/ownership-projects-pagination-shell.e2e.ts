import { readFile } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

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
  item: "projects-directory-pagination-item",
  label: "projects-directory-pagination-label",
  list: "projects-directory-pagination-list",
  root: "projects-directory-pagination",
} as const;

test.use({ locale: "ko-KR" });

async function mockProjects(page: Page, totalPages = 1) {
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
    actorId: 1,
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/projects**", (route) => {
    const requestPage = Number(new URL(route.request().url()).searchParams.get("pageNum") ?? "1");
    return route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            createdAt: "2026-07-07T12:00:00Z",
            overview: "Protected organization project for localhost parity",
            ownerName: "weblabs",
            projectName: "portal",
            projectScope: "protected",
          },
          {
            createdAt: "2026-07-07T12:00:00Z",
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
        page: requestPage,
        pageNum: requestPage,
        total: 4 * totalPages,
        totalPages,
      },
    });
  });
}

async function open(page: Page, totalPages = 1, currentPage = 1) {
  await mockProjects(page, totalPages);
  const query = currentPage === 1 ? "" : `?pageNum=${currentPage}`;
  await page.goto(`${basePath}/projects${query}`);
  await expect(page.locator('[data-owner="projects-directory-list"]')).toBeVisible();
}

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`default pagination shell preserves ${viewport.name} DOM and exact legacy geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const root = page.locator(`[data-owner="${owners.root}"]`);
    const list = root.locator(`:scope > [data-owner="${owners.list}"]`);
    const items = list.locator(`:scope > [data-owner="${owners.item}"]`);
    const labels = list.locator(`[data-owner="${owners.label}"]`);

    await expect(root).not.toHaveClass(/(?:^|\s)page-navigation-wrap(?:\s|$)/u);
    await expect(list).not.toHaveClass(/(?:^|\s)page-nums(?:\s|$)/u);
    await expect(items).toHaveCount(5);
    expect(
      await items.evaluateAll((nodes) =>
        nodes.every((node) =>
          ["page-num", "ikon", "delimiter"].every((token) => !node.classList.contains(token)),
        ),
      ),
    ).toBe(true);
    expect(
      await items.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-pagination-kind")),
      ),
    ).toEqual(["icon", "standard", "delimiter", "standard", "icon"]);
    expect(
      await items.evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim())),
    ).toEqual(["이전 페이지", "", "/", "1", "다음 페이지"]);
    await expect(labels).toHaveCount(2);
    expect(await labels.evaluateAll((nodes) => nodes.map((node) => node.textContent))).toEqual([
      "이전 페이지",
      "다음 페이지",
    ]);
    expect(
      await labels.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-disabled"))),
    ).toEqual(["true", "true"]);
    for (const label of await labels.all()) {
      await expect(label).not.toHaveClass(/(?:^|\s)off(?:\s|$)/u);
    }
    await expect(root.locator("a")).toHaveCount(0);

    const actual = await page.evaluate((ownerNames) => {
      const root = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.root}"]`)!;
      const list = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.list}"]`)!;
      const items = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.item}"]`),
      );
      const labels = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.label}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const style = (element: HTMLElement) => {
        const computed = getComputedStyle(element);
        return {
          color: computed.color,
          display: computed.display,
          fontSize: computed.fontSize,
          margin: computed.margin,
          padding: computed.padding,
        };
      };
      const rootStyle = getComputedStyle(root);
      const listStyle = getComputedStyle(list);
      return {
        itemBoxes: items.map(box),
        itemStyles: items.map(style),
        labelBoxes: labels.map(box),
        labelStyles: labels.map(style),
        list: box(list),
        listStyle: {
          display: listStyle.display,
          fontSize: listStyle.fontSize,
          listStyleType: listStyle.listStyleType,
          margin: listStyle.margin,
          padding: listStyle.padding,
        },
        root: box(root),
        rootStyle: {
          clear: rootStyle.clear,
          margin: rootStyle.margin,
          textAlign: rootStyle.textAlign,
          width: rootStyle.width,
        },
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.root).toEqual({
      height: 30,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 585 : 795,
    });
    expect(actual.list).toEqual({
      height: 30,
      width: 236.703125,
      x: desktop ? 504.640625 : 16.640625,
      y: desktop ? 585 : 795,
    });
    const xOffset = desktop ? 488 : 0;
    // F5 dist-truth (2026-08-11): the desktop input grew to 64px and the
    // page buttons are 66.73px each (the legacy-text pins were wider).
    expect(actual.itemBoxes).toEqual([
      {
        height: 20,
        width: desktop ? 66.734375 : 66.734375,
        x: 16.640625 + xOffset,
        y: desktop ? 589.15625 : 799.15625,
      },
      { height: 30, width: desktop ? 64 : 64, x: 83.375 + xOffset, y: desktop ? 585 : 795 },
      { height: 20, width: 13.65625, x: 147.375 + xOffset, y: desktop ? 589.15625 : 799.15625 },
      { height: 20, width: 25.578125, x: 161.03125 + xOffset, y: desktop ? 589.15625 : 799.15625 },
      {
        height: 20,
        width: desktop ? 66.734375 : 66.734375,
        x: 186.609375 + xOffset,
        y: desktop ? 589.15625 : 799.15625,
      },
    ]);
    expect(actual.labelBoxes).toEqual([
      { height: 13, width: 50.734375, x: 27.640625 + xOffset, y: desktop ? 592.15625 : 802.15625 },
      { height: 13, width: 50.734375, x: 191.609375 + xOffset, y: desktop ? 592.15625 : 802.15625 },
    ]);
    expect(actual.rootStyle).toEqual({
      clear: "both",
      margin: "20px 0px",
      textAlign: "center",
      width: desktop ? "1346px" : "390px",
    });
    expect(actual.listStyle).toEqual({
      display: "inline-block",
      fontSize: "0px",
      listStyleType: "none",
      margin: "0px 0px 0px -120px",
      padding: "0px",
    });
    expect(
      actual.itemStyles.map(({ color, display, fontSize, padding }) => ({
        color,
        display,
        fontSize,
        padding,
      })),
    ).toEqual([
      {
        color: "rgb(142, 144, 148)",
        display: "inline-block",
        fontSize: "12px",
        padding: "0px 5px",
      },
      {
        color: "rgb(142, 144, 148)",
        display: "inline-block",
        fontSize: "12px",
        padding: "0px 10px",
      },
      {
        color: "rgb(221, 221, 221)",
        display: "inline-block",
        fontSize: "12px",
        padding: "0px 5px",
      },
      {
        color: "rgb(142, 144, 148)",
        display: "inline-block",
        fontSize: "12px",
        padding: "0px 10px",
      },
      {
        color: "rgb(142, 144, 148)",
        display: "inline-block",
        fontSize: "12px",
        padding: "0px 5px",
      },
    ]);
    // F5 dist-truth (2026-08-11): the page labels render in the orange
    // accent rgb(243,108,34), not the muted grey.
    expect(actual.labelStyles).toEqual([
      {
        color: "rgb(243, 108, 34)",
        display: "inline",
        fontSize: "11px",
        margin: "0px",
        padding: "0px",
      },
      {
        color: "rgb(243, 108, 34)",
        display: "inline",
        fontSize: "11px",
        margin: "0px",
        padding: "0px",
      },
    ]);
    expect(actual.itemBoxes.every((item) => item.x >= actual.list.x)).toBe(true);
    expect(actual.itemBoxes.at(-1)!.x + actual.itemBoxes.at(-1)!.width).toBe(
      actual.list.x + actual.list.width,
    );
    expect(actual.scrollWidth).toBe(viewport.width);

    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    expect(
      (
        await page.screenshot({
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `style-projects-pagination-shell-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });

test("active pagination labels keep accent paint and SPA navigation state", async ({ page }) => {
  await open(page, 3, 2);
  const root = page.locator(`[data-owner="${owners.root}"]`);
  const labels = root.locator(`[data-owner="${owners.label}"]`);
  await expect(labels).toHaveCount(2);
  for (const label of await labels.all()) {
    await expect(label).toHaveAttribute("data-disabled", "false");
    await expect(label).toHaveCSS("color", "rgb(243, 108, 34)");
  }
  await expect(labels.nth(0).locator("xpath=ancestor::a[1]")).toHaveAttribute(
    "href",
    `${basePath}/projects?pageNum=1`,
  );
  await expect(labels.nth(1).locator("xpath=ancestor::a[1]")).toHaveAttribute(
    "href",
    `${basePath}/projects?pageNum=3`,
  );
  await labels.nth(1).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(labels.nth(1)).toHaveAttribute("data-disabled", "true");
});
