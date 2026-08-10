import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const CTA = '[data-owner="authenticated-home-intro-guide-cta"]';

test.use({ locale: "ko-KR" });

for (const viewport of [
  { name: "desktop", width: 1366, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  test(`authenticated Home intro-guide CTAs preserve Legacy ${viewport.name} roles and geometry`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const ctas = page.locator(CTA);
    await expect(ctas).toHaveCount(3);
    await expect(ctas).toHaveText(["새 프로젝트 만들기", "새 그룹 만들기", "프로젝트 목록"]);
    for (const [index, href] of ["/projectform", "/organizations/new", "/projects"].entries()) {
      await expect(ctas.nth(index)).toHaveAttribute("href", `${BASE_PATH}${href}`);
      await expect(ctas.nth(index)).toHaveClass(/\bybtn\b/u);
      await expect(ctas.nth(index)).toHaveClass(/\bybtn-success\b/u);
    }

    const evidence = await readEvidence(page);
    expect(evidence.links.map(({ style }) => style)).toEqual([
      baseStyle(),
      baseStyle(),
      baseStyle(),
    ]);
    for (const [index, link] of evidence.links.entries()) {
      expect(link.box.x).toBeGreaterThanOrEqual(link.cell.x);
      expect(link.box.y).toBeGreaterThanOrEqual(link.cell.y);
      expect(link.box.y + link.box.height).toBeLessThanOrEqual(link.cell.y + link.cell.height);
      expect(link.box.x + link.box.width).toBeLessThanOrEqual(evidence.clientWidth);
      if (index > 0) {
        const previous = evidence.links[index - 1]!;
        expect(link.box.x).toBeCloseTo(previous.box.x, 1);
        expect(link.box.width).toBeCloseTo(previous.box.width, 1);
        expect(previous.box.y + previous.box.height).toBeLessThanOrEqual(link.box.y);
      }
    }
    await assertStates(page, evidence.links[0]!.box);
    await expect(page).toHaveURL(`${BASE_PATH}/`);
  });
}

async function assertStates(page: Page, expectedBox: Box) {
  const cta = page.locator(CTA).first();
  await cta.hover();
  await expect(cta).toHaveCSS("background-color", "rgb(233, 94, 1)");
  expect(await state(cta)).toEqual({ box: expectedBox, ...interactivePaint() });
  await page.mouse.move(0, 800);
  await cta.focus();
  await expect(cta).toHaveCSS("background-color", "rgb(233, 94, 1)");
  expect(await state(cta)).toEqual({ box: expectedBox, ...interactivePaint() });
}

function baseStyle() {
  return {
    backgroundColor: "rgb(255, 115, 50)",
    border: "1px solid rgb(233, 94, 1)",
    borderRadius: "3px",
    boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
    boxSizing: "content-box",
    color: "rgb(255, 255, 255)",
    cursor: "pointer",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "400",
    lineHeight: "20px",
    margin: "0px",
    outline: "rgb(255, 255, 255) none 0px",
    padding: "4px 12px",
    position: "relative",
    textAlign: "center",
    textDecoration: "none",
    textShadow: "none",
    transitionDuration: "0.3s",
    transitionProperty: "all",
    transitionTimingFunction: "ease",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
    zIndex: "2",
  };
}

function interactivePaint() {
  return {
    backgroundColor: "rgb(233, 94, 1)",
    border: "1px solid rgb(233, 94, 1)",
    color: "rgb(255, 255, 255)",
    textDecoration: "none",
  };
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
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
        preferredLanguage: "ko-KR",
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

type Box = { x: number; y: number; width: number; height: number };

async function readEvidence(page: Page) {
  const ctas = page.locator(CTA);
  return {
    clientWidth: await page.evaluate(() => document.documentElement.clientWidth),
    links: await Promise.all(
      Array.from({ length: await ctas.count() }, async (_, index) => {
        const cta = ctas.nth(index);
        return {
          box: await box(cta),
          cell: await cta.evaluate((element) => {
            const rect = element.closest("td")!.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
          }),
          style: await styles(cta),
        };
      }),
    ),
  };
}

async function box(locator: Locator): Promise<Box> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function state(locator: Locator) {
  const style = await styles(locator);
  return {
    box: await box(locator),
    backgroundColor: style.backgroundColor,
    border: style.border,
    color: style.color,
    textDecoration: style.textDecoration,
  };
}

async function styles(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      border: style.border,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      boxSizing: style.boxSizing,
      color: style.color,
      cursor: style.cursor,
      display: style.display,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      margin: style.margin,
      outline: style.outline,
      padding: style.padding,
      position: style.position,
      textAlign: style.textAlign,
      textDecoration: style.textDecoration,
      textShadow: style.textShadow,
      transitionDuration: style.transitionDuration,
      transitionProperty: style.transitionProperty,
      transitionTimingFunction: style.transitionTimingFunction,
      verticalAlign: style.verticalAlign,
      whiteSpace: style.whiteSpace,
      zIndex: style.zIndex,
    };
  });
}
