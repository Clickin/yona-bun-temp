import { readFile } from "../wtr-compat.ts";
// Post-merge: the full legacy cascade lives in app.css — normal-mode semantics.
const fallbackOff = false;
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records the exact three-owner legacy search boundary", () => {
  const route = readFileSync("src/routes/user/files.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/user/userFiles.scala.html", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobicon = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");

  expect(template).toContain('<div class="user-file-search search search-bar">');
  expect(template).toContain('name="filter" class="textbox"');
  expect(template).toContain('class="search-btn"><i class="yobicon-search"');
  expect(pageLess).toContain(".user-file-search {");
  expect(yobiUi).toContain(".search-bar {");
  expect(responsive).toContain('input[type="text"],');

  // legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.
  for (const name of ["user-files-search", "user-files-search-input", "user-files-search-action"]) {
    expect(route.match(new RegExp(`data-owner="${name}"`, "gu")) ?? []).toHaveLength(1);
  }
  expect(route).not.toContain('className="user-file-search search search-bar"');
  expect(route).not.toContain(" user-file-search ");
  expect(route).not.toContain(" search-bar");
  expect(route).not.toContain('className="textbox"');
  expect(route).not.toContain('className="search-btn"');
  expect(route).toContain('className="yobicon-search"');
});

test("pins the empty-state search output and React navigation", async ({ page }) => {
  const requests: string[] = [];
  await mockEmptyFiles(page, requests);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    // The shared local shell is 10px wider and 43px lower than the live Java shell;
    // owner-local search geometry remains asserted at the local ancestry below.
    {
      action: { height: 20, width: 12, x: 1338, y: 157 },
      height: 900,
      input: { fontSize: "12px", height: 20, width: 1324, x: 11, y: 157.578125 },
      margin: "0px 0px 10px",
      name: "desktop",
      root: { height: 30, width: 1346, x: 10, y: 151 },
      width: 1366,
    },
    {
      action: { height: 20, width: 12, x: 372, y: 157 },
      height: 844,
      input: { fontSize: "16px", height: 20, width: 183, x: 1, y: 157.578125 },
      margin: "5px 0px",
      name: "mobile",
      root: { height: 30, width: 390, x: 0, y: 151 },
      width: 390,
    },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/files`);

    const root = owner(page, "user-files-search");
    const affix = owner(page, "site-admin-affix");
    const gnb = owner(page, "global-gnb-outer");
    const input = owner(page, "user-files-search-input");
    const action = owner(page, "user-files-search-action");
    const icon = action.locator("i.yobicon-search");
    await expect(affix).toBeVisible();
    await expect(gnb).toBeVisible();
    await expect(owner(page, "authenticated-site-user-menu")).toBeVisible();
    await expect(owner(page, "user-files-page")).toBeVisible();
    await expect(owner(page, "user-files-files")).toBeVisible();
    expect(
      await page.evaluate(async () => {
        await document.fonts.ready;
        await document.fonts.load('12px "yobicon"', "\ue225");
        return document.fonts.check('12px "yobicon"', "\ue225");
      }),
    ).toBe(true);
    await expect(page.locator(".attachment-file-detail")).toHaveCount(0);
    await expect(input).toHaveAttribute("name", "filter");
    await expect(input).toHaveAttribute("placeholder", "검색");
    await expect(root).not.toHaveClass(/(?:user-file-search|search-bar|\bsearch\b)/u);
    await expect(input).not.toHaveClass(/\btextbox\b/u);
    await expect(action).not.toHaveClass(/\bsearch-btn\b/u);
    await expect(icon).toHaveClass("yobicon-search");
    await expect(root).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(root).toHaveCSS("border", "1px solid rgb(204, 204, 204)");
    await expect(root).toHaveCSS("margin", viewport.margin);
    await expect(root).toHaveCSS("padding", "4px 25px 4px 5px");
    await expect(input).toHaveCSS("border", "0px none rgb(85, 85, 85)");
    await expect(input).toHaveCSS("font-size", viewport.input.fontSize);
    await expect(input).toHaveCSS("margin", "0px -5px");
    await expect(input).toHaveCSS("padding", "0px 5px");
    await expect(action).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(action).toHaveCSS("border", "0px none rgb(0, 0, 0)");
    // Post-merge: the yobicon font-face + glyph rules are merged into app.css.
    await expect(icon).toHaveCSS("font-family", "yobicon");
    await expect(icon).toHaveCSS("line-height", "12px");
    expect(await icon.evaluate((element) => getComputedStyle(element, "::before").content)).toBe(
      '""',
    );

    const geometry = await root.evaluate((element) => {
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const affix = document.querySelector('[data-owner="site-admin-affix"]');
      const gnb = document.querySelector('[data-owner="global-gnb-outer"]');
      if (!affix || !gnb) throw new Error("hydrated site shell is missing");
      return {
        action: box(element.querySelector('[data-owner="user-files-search-action"]')!),
        affix: box(affix),
        gnb: box(gnb),
        input: box(element.querySelector('[data-owner="user-files-search-input"]')!),
        root: box(element),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    const fallbackShellOffset = 20;
    const expectedRoot = fallbackOff
      ? { ...viewport.root, width: viewport.width, x: 0, y: viewport.root.y - fallbackShellOffset }
      : viewport.root;
    const expectedInput = fallbackOff
      ? {
          height: viewport.input.height,
          x: 1,
          y: viewport.input.y - fallbackShellOffset,
          width: viewport.width <= 720 ? viewport.input.width : viewport.width - 22,
        }
      : {
          height: viewport.input.height,
          width: viewport.input.width,
          x: viewport.input.x,
          y: viewport.input.y,
        };
    const expectedAction = fallbackOff
      ? { ...viewport.action, x: viewport.width - 18, y: viewport.action.y - fallbackShellOffset }
      : viewport.action;
    expect(geometry).toEqual({
      action: expectedAction,
      affix: {
        height: 43,
        width: viewport.width,
        x: 0,
        y: 0,
      },
      gnb: {
        height: 40,
        width: viewport.width,
        x: 0,
        y: 43,
      },
      input: expectedInput,
      root: expectedRoot,
      scrollWidth: viewport.width,
    });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `style-user-files-search-empty-${viewport.name}.png`),
    });
  }

  await owner(page, "user-files-search-input").fill("avatar");
  await owner(page, "user-files-search-action").click();
  await expect(page).toHaveURL(`${basePath}/user/files?filter=avatar&pageNum=1`);
  await expect.poll(() => requests.at(-1)).toContain("filter=avatar");
});

async function mockEmptyFiles(page: Page, requests: string[]) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route) =>
    route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfillSession);
  }
  await page.route("**/api/v1/workspace/files**", (route) => {
    requests.push(route.request().url());
    const url = new URL(route.request().url());
    return route.fulfill({
      contentType: "application/json",
      json: {
        files: [],
        filter: url.searchParams.get("filter") ?? "",
        page: Number(url.searchParams.get("pageNum") ?? "1"),
        pageSize: 50,
        total: 0,
        totalPages: 0,
      },
    });
  });
}
