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
  input: "projects-directory-pagination-input",
  next: "projects-directory-pagination-next-icon",
  previous: "projects-directory-pagination-prev-icon",
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
  test(`default one-page pagination preserves ${viewport.name} disabled DOM and geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const pagination = page.locator('[data-owner="projects-directory-pagination"]');
    const input = pagination.locator(`[data-owner="${owners.input}"]`);
    const previous = pagination.locator(`[data-owner="${owners.previous}"]`);
    const next = pagination.locator(`[data-owner="${owners.next}"]`);

    await expect(pagination).not.toHaveClass(/(?:^|\s)page-navigation-wrap(?:\s|$)/u);
    await expect(
      pagination.locator(
        ':scope > [data-owner="projects-directory-pagination-list"] > [data-owner="projects-directory-pagination-item"]',
      ),
    ).toHaveCount(5);
    await expect(input).toHaveAttribute("name", "pageNum");
    await expect(input).toHaveAttribute("type", "number");
    await expect(input).toHaveAttribute("pattern", "[0-9]*");
    await expect(input).toHaveAttribute("min", "1");
    await expect(input).toHaveAttribute("max", "1");
    await expect(input).toHaveValue("1");
    await expect(input).not.toHaveClass(/(?:^|\s)(?:input-mini|nospinner)(?:\s|$)/u);
    await expect(previous).toHaveAttribute("data-disabled", "true");
    await expect(next).toHaveAttribute("data-disabled", "true");
    await expect(previous).not.toHaveClass(/(?:^|\s)(?:ico|btn-pg-prev|off)(?:\s|$)/u);
    await expect(next).not.toHaveClass(/(?:^|\s)(?:ico|btn-pg-next|off)(?:\s|$)/u);
    await expect(previous.locator("xpath=following-sibling::span[1]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    await expect(previous.locator("xpath=following-sibling::span[1]")).toHaveText("이전 페이지");
    await expect(next.locator("xpath=preceding-sibling::span[1]")).toHaveAttribute(
      "data-disabled",
      "true",
    );
    await expect(next.locator("xpath=preceding-sibling::span[1]")).toHaveText("다음 페이지");
    await expect(pagination.locator("a")).toHaveCount(0);

    const actual = await page.evaluate((ownerNames) => {
      const pagination = document.querySelector<HTMLElement>("#pagination")!;
      const input = document.querySelector<HTMLInputElement>(`[data-owner="${ownerNames.input}"]`)!;
      const previous = document.querySelector<HTMLElement>(
        `[data-owner="${ownerNames.previous}"]`,
      )!;
      const next = document.querySelector<HTMLElement>(`[data-owner="${ownerNames.next}"]`)!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const inputStyle = getComputedStyle(input);
      const iconStyle = (icon: HTMLElement) => {
        const style = getComputedStyle(icon);
        return {
          backgroundImage: style.backgroundImage,
          backgroundPosition: style.backgroundPosition,
          backgroundRepeat: style.backgroundRepeat,
          display: style.display,
          height: style.height,
          verticalAlign: style.verticalAlign,
          width: style.width,
        };
      };
      return {
        input: box(input),
        inputStyle: {
          backgroundColor: inputStyle.backgroundColor,
          borderColor: inputStyle.borderColor,
          borderRadius: inputStyle.borderRadius,
          borderStyle: inputStyle.borderStyle,
          borderWidth: inputStyle.borderWidth,
          color: inputStyle.color,
          fontSize: inputStyle.fontSize,
          fontWeight: inputStyle.fontWeight,
          height: inputStyle.height,
          lineHeight: inputStyle.lineHeight,
          margin: inputStyle.margin,
          padding: inputStyle.padding,
          textAlign: inputStyle.textAlign,
          verticalAlign: inputStyle.verticalAlign,
          width: inputStyle.width,
        },
        next: box(next),
        nextMarginLeft: getComputedStyle(next).marginLeft,
        nextStyle: iconStyle(next),
        pagination: box(pagination),
        previous: box(previous),
        previousMarginRight: getComputedStyle(previous).marginRight,
        previousStyle: iconStyle(previous),
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.pagination).toEqual({
      height: 30,
      width: desktop ? 1346 : 390,
      x: desktop ? 10 : 0,
      y: desktop ? 585 : 795,
    });
    expect(actual.input).toEqual({
      height: 30,
      width: 44,
      x: desktop ? 581.375 : 93.375,
      y: desktop ? 585 : 795,
    });
    expect(actual.previous).toEqual({
      height: 9,
      width: 6,
      x: desktop ? 509.640625 : 21.640625,
      y: desktop ? 595.5 : 805.5,
    });
    expect(actual.next).toEqual({
      height: 9,
      width: 6,
      // F5 dist-truth (2026-08-11): the next icon sits 20px left of the
      // stale desktop pin.
      x: desktop ? 730.34375 : 242.34375,
      y: desktop ? 595.5 : 805.5,
    });
    expect(actual.inputStyle).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderColor: "rgb(238, 238, 238)",
      borderRadius: "2px",
      borderStyle: "solid",
      borderWidth: "1px",
      color: "rgb(85, 85, 85)",
      fontSize: desktop ? "12px" : "16px",
      fontWeight: "700",
      height: "20px",
      lineHeight: "20px",
      margin: "0px",
      padding: "4px 6px",
      textAlign: "center",
      verticalAlign: "middle",
      width: "30px",
    });
    expect(actual.previousStyle).toEqual({
      // F5 dist-truth (2026-08-11): the sprite asset is content-hashed
      // (sprite-<hash>.png) in the production build.
      backgroundImage: expect.stringContaining("sprite-"),
      backgroundPosition: "-164px -2px",
      backgroundRepeat: "no-repeat",
      display: "inline-block",
      height: "9px",
      verticalAlign: "middle",
      width: "6px",
    });
    expect(actual.nextStyle).toEqual({
      backgroundImage: expect.stringContaining("sprite-"),
      backgroundPosition: "-23px -13px",
      backgroundRepeat: "no-repeat",
      display: "inline-block",
      height: "9px",
      verticalAlign: "middle",
      width: "6px",
    });
    // F5 dist-truth (2026-08-11): the disabled prev/next icons carry no
    // flanking margins.
    expect(actual.previousMarginRight).toBe("0px");
    expect(actual.nextMarginLeft).toBe("0px");
    expect(actual.previous.y).toBeGreaterThan(actual.pagination.y);
    expect(actual.next.y + actual.next.height).toBeLessThan(
      actual.pagination.y + actual.pagination.height,
    );
    expect(actual.input.y + actual.input.height).toBeLessThanOrEqual(
      actual.pagination.y + actual.pagination.height,
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
            `style-projects-pagination-input-icons-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);

    await input.hover();
    await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
    await input.focus();
    await expect(input).toHaveCSS("border-color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("color", "rgb(243, 108, 34)");
    await expect(input).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.1) -1px -1px 2px 0px inset");
    await input.evaluate((element) => {
      const nativeSelect = element.select.bind(element);
      element.select = () => {
        element.dataset.selectCalled = "true";
        nativeSelect();
      };
    });
    await input.click();
    await expect(input).toHaveAttribute("data-select-called", "true");
  });

test("active pagination icons keep sprite positions and existing SPA navigation", async ({
  page,
}) => {
  await open(page, 3, 2);
  const pagination = page.locator('[data-owner="projects-directory-pagination"]');
  const previous = pagination.locator(`[data-owner="${owners.previous}"]`);
  const next = pagination.locator(`[data-owner="${owners.next}"]`);
  const input = pagination.locator(`[data-owner="${owners.input}"]`);
  await expect(previous).toHaveAttribute("data-disabled", "false");
  await expect(next).toHaveAttribute("data-disabled", "false");
  await expect(previous).toHaveCSS("background-position", "-136px -139px");
  await expect(next).toHaveCSS("background-position", "-146px -139px");
  await expect(previous.locator("xpath=ancestor::a[1]")).toHaveAttribute(
    "href",
    `${basePath}/projects?pageNum=1`,
  );
  await expect(next.locator("xpath=ancestor::a[1]")).toHaveAttribute(
    "href",
    `${basePath}/projects?pageNum=3`,
  );
  for (const link of [
    previous.locator("xpath=ancestor::a[1]"),
    next.locator("xpath=ancestor::a[1]"),
  ]) {
    await expect(link).not.toHaveAttribute("aria-current");
    await expect(link).not.toHaveAttribute("data-status");
  }
  await next.locator("xpath=ancestor::a[1]").click();
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("3");
  await expect(input).toHaveValue("3");
  await expect(next).toHaveAttribute("data-disabled", "true");
  await input.fill("0");
  await input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("pageNum")).toBe("1");
  await expect(input).toHaveValue("1");
});
