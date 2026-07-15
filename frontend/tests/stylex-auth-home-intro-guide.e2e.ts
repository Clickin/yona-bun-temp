import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const GUIDE = '[data-stylex-owner="authenticated-home-intro-guide"]';
const TOGGLE = '[data-stylex-owner="authenticated-home-intro-guide-toggle"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "ko-KR" });

test("authenticated Home intro guide has bounded global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const bootstrapCss = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobiconCss = readFileSync("../yona-original/public/stylesheets/yobicon/style.css", "utf8");
  const start = route.indexOf("const authenticatedHomeIntroGuideStyles");
  const end = route.indexOf("const authenticatedHomePageWrapStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  const guideStart = route.indexOf('data-stylex-owner="authenticated-home-intro-guide-table"');
  const guideBodyStart = route.indexOf("<tbody>", guideStart);
  const guideBody = route.slice(guideBodyStart, route.indexOf("</tbody>", guideBodyStart));

  for (const token of [
    "authenticatedHomeIntroGuideMargin",
    "authenticatedHomeIntroGuideMobileMargin",
    "authenticatedHomeIntroGuideHiddenDisplay",
    "authenticatedHomeIntroGuideHiddenMarginTop",
    "authenticatedHomeIntroGuideHiddenMobileMarginTop",
    "authenticatedHomeIntroGuideHeadingMargin",
    "authenticatedHomeIntroGuideHeadingPadding",
    "authenticatedHomeIntroGuideHeadingFontSize",
    "authenticatedHomeIntroGuideHeadingFontWeight",
    "authenticatedHomeIntroGuideHeadingText",
    "authenticatedHomeIntroGuideTableMarginBottom",
    "authenticatedHomeIntroGuideTableBorderBottomColor",
    "authenticatedHomeIntroGuideTableBorderBottomStyle",
    "authenticatedHomeIntroGuideTableBorderBottomWidth",
    "authenticatedHomeIntroGuideCellFontSize",
    "authenticatedHomeIntroGuideCellVerticalAlign",
    "authenticatedHomeIntroGuideCellBorderTopStyle",
    "authenticatedHomeIntroGuideLinkWidth",
    "authenticatedHomeIntroGuideToggleTextAlign",
    "authenticatedHomeIntroGuideToggleDisplay",
    "authenticatedHomeIntroGuideTogglePadding",
    "authenticatedHomeIntroGuideToggleText",
    "authenticatedHomeIntroGuideToggleBorderColor",
    "authenticatedHomeIntroGuideToggleBorderStyle",
    "authenticatedHomeIntroGuideToggleBorderWidth",
    "authenticatedHomeIntroGuideToggleBorderTopColor",
    "authenticatedHomeIntroGuideToggleBorderTopWidth",
    "authenticatedHomeIntroGuideToggleRadius",
    "authenticatedHomeIntroGuideToggleSurface",
    "authenticatedHomeIntroGuideToggleOutline",
    "authenticatedHomeIntroGuideIconFontSize",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles.replaceAll('"@media (max-width: 720px)"', '"@media (mobile)"')).not.toMatch(
    /#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu,
  );

  expect(route).toContain('data-stylex-owner="authenticated-home-intro-guide"');
  expect(route).toContain('data-stylex-owner="authenticated-home-intro-guide-toggle"');
  const toggleButtonOwner = route.indexOf('id="toggleIntro"');
  const toggleButtonBlock = route.slice(
    route.lastIndexOf("<button", toggleButtonOwner),
    route.indexOf(">", toggleButtonOwner) + 1,
  );
  expect(toggleButtonBlock).toContain(
    "{...stylex.props(authenticatedHomeIntroGuideStyles.toggleButton)}",
  );
  expect(toggleButtonBlock).not.toMatch(/\bbtn-transparent\b/u);
  expect(route).not.toContain('className={isIntroVisible ? "site-guide-outer"');
  expect(route).not.toContain("welcome-table");
  expect(route).not.toContain("borderless");
  expect(route).not.toContain('className="guide-toggle"');
  for (const selector of [
    ".site-guide-outer {",
    ".site-guide-outer.hide",
    ".site-guide-outer h3",
    ".site-guide-outer h3 span",
    ".welcome-table {",
    ".welcome-table td",
    ".welcome-table a",
    ".guide-toggle {",
    ".guide-toggle button",
    ".guide-toggle i",
  ]) {
    expect(appCss).not.toContain(selector);
  }

  for (const retainedPrimitive of [".btn-transparent {", ".ybtn {", ".ybtn-success,"]) {
    expect(appCss).toContain(retainedPrimitive);
  }
  expect(
    route.match(/data-stylex-owner="authenticated-home-intro-guide-cta"/gu) ?? [],
  ).toHaveLength(3);
  expect(guideBody).not.toMatch(/\bybtn(?:-success)?\b/u);
  expect(route).toContain("yobicon-resizev");
  expect(bootstrapCss).toContain(".table {");
  expect(yobiconCss).toContain(".yobicon-resizev:before {");
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Home intro guide preserves ${viewport.label} legacy geometry and paint`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const guide = page.locator(GUIDE);
    const toggle = page.locator(TOGGLE);
    const table = guide.locator("table");
    const button = toggle.locator("button#toggleIntro");

    await expect(guide).toBeVisible();
    await expect(guide).not.toHaveClass(/\b(?:site-guide-outer|hide)\b/u);
    await expect(table).not.toHaveClass(/\bwelcome-table\b/u);
    await expect(table).toHaveClass(/\btable\b/u);
    await expect(table).not.toHaveClass(/\bborderless\b/u);
    await expect(toggle).not.toHaveClass(/\bguide-toggle\b/u);
    await expect(button).not.toHaveClass(/\bbtn-transparent\b/u);
    await expect(guide.locator("h3 > span")).toHaveText("Yoram - 21세기 소프트웨어 개발 플랫폼");
    await expect(table.locator("tr")).toHaveCount(3);
    await expect(table.locator("td")).toHaveText([
      "새 프로젝트 만들기",
      "당신만의 프로젝트를 만들어 보세요",
      "새 그룹 만들기",
      "다른 멤버들과 함께 그룹으로 작업을 하고싶으시면, 그룹을 생성하여 여러 프로젝트를 공동으로 관리해보세요.",
      "프로젝트 목록",
      "관심있는 프로젝트를 찾아보세요",
    ]);
    expect(
      await table
        .getByRole("link")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href"))),
    ).toEqual([
      `${BASE_PATH}/projects/new`,
      `${BASE_PATH}/organizations/new`,
      `${BASE_PATH}/projects`,
    ]);

    const evidence = await guide.evaluate((guideElement) => {
      const heading = guideElement.querySelector("h3") as HTMLElement;
      const headingSpan = heading.querySelector("span") as HTMLElement;
      const tableElement = guideElement.querySelector("table") as HTMLElement;
      const cell = tableElement.querySelector("td") as HTMLElement;
      const link = cell.querySelector("a") as HTMLElement;
      const toggleElement = guideElement.nextElementSibling as HTMLElement;
      const buttonElement = toggleElement.querySelector("button") as HTMLElement;
      const iconElement = buttonElement.querySelector("i") as HTMLElement;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const guideStyle = getComputedStyle(guideElement);
      const headingStyle = getComputedStyle(headingSpan);
      const tableStyle = getComputedStyle(tableElement);
      const cellStyle = getComputedStyle(cell);
      const linkStyle = getComputedStyle(link);
      const toggleStyle = getComputedStyle(toggleElement);
      const buttonStyle = getComputedStyle(buttonElement);
      const iconStyle = getComputedStyle(iconElement);
      return {
        button: {
          backgroundColor: buttonStyle.backgroundColor,
          borderRadius: buttonStyle.borderRadius,
          borderRight: buttonStyle.borderRight,
          borderTop: buttonStyle.borderTop,
          box: box(buttonElement),
          color: buttonStyle.color,
          display: buttonStyle.display,
          outlineStyle: buttonStyle.outlineStyle,
          outlineWidth: buttonStyle.outlineWidth,
          padding: buttonStyle.padding,
        },
        cell: {
          borderTop: cellStyle.borderTopWidth,
          box: box(cell),
          fontSize: cellStyle.fontSize,
          padding: cellStyle.padding,
          verticalAlign: cellStyle.verticalAlign,
        },
        clientWidth: document.documentElement.clientWidth,
        guide: { box: box(guideElement), margin: guideStyle.margin },
        heading: {
          box: box(heading),
          color: headingStyle.color,
          fontSize: headingStyle.fontSize,
          fontWeight: headingStyle.fontWeight,
          margin: getComputedStyle(heading).margin,
          padding: getComputedStyle(heading).padding,
        },
        icon: { box: box(iconElement), fontSize: iconStyle.fontSize },
        link: { box: box(link), display: linkStyle.display, width: linkStyle.width },
        table: {
          borderBottom: tableStyle.borderBottom,
          box: box(tableElement),
          borderCollapse: tableStyle.borderCollapse,
          marginBottom: tableStyle.marginBottom,
        },
        toggle: { box: box(toggleElement), textAlign: toggleStyle.textAlign },
      };
    });

    const mobile = viewport.width <= 720;
    expect(evidence.guide.margin).toBe(mobile ? "40px 0px 0px" : "30px 0px 0px");
    expect(evidence.guide.box.x).toBe(mobile ? 0 : 10);
    expect(evidence.guide.box.width).toBe(evidence.clientWidth - (mobile ? 0 : 20));
    expect(evidence.heading).toMatchObject({
      color: "rgb(51, 51, 51)",
      fontSize: "14px",
      fontWeight: "700",
      margin: "0px",
      padding: "0px",
    });
    expect(evidence.heading.box.height).toBe(44);
    expect(evidence.table).toMatchObject({
      borderBottom: "1px solid rgb(238, 238, 238)",
      borderCollapse: "collapse",
      marginBottom: "-1px",
    });
    expect(evidence.table.box.width).toBe(evidence.guide.box.width);
    expect(evidence.table.box.height).toBe(mobile ? 169 : 139);
    expect(evidence.cell).toMatchObject({
      borderTop: "0px",
      fontSize: "14px",
      padding: "8px",
      verticalAlign: "middle",
    });
    expect(evidence.cell.box.height).toBe(46);
    expect(evidence.link.display).toBe("inline-block");
    expect(evidence.link.box.height).toBe(30);
    const legacyLinkWidth = mobile ? 136.890625 : 232.078125;
    expect(evidence.link.box.width).toBeCloseTo(
      mobile ? legacyLinkWidth : legacyLinkWidth + (evidence.guide.box.width - 1336) * 0.1640625,
      1,
    );
    expect(evidence.toggle.textAlign).toBe("center");
    expect(evidence.toggle.box.width).toBe(evidence.guide.box.width);
    expect(evidence.toggle.box.height).toBeCloseTo(23.078125, 2);
    expect(evidence.button).toMatchObject({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderRadius: "0px 0px 6px 6px",
      borderRight: "1px solid rgba(0, 0, 0, 0.1)",
      borderTop: "2px solid rgb(255, 255, 255)",
      color: "rgb(149, 165, 166)",
      display: "inline-block",
      outlineStyle: "none",
      padding: "0px 25px",
    });
    expect(evidence.button.box.width).toBe(64);
    expect(evidence.button.box.height).toBeCloseTo(23, 1);
    expect(evidence.icon.fontSize).toBe("12px");
    expect(evidence.icon.box.width).toBe(12);

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await guide.locator("xpath=..").screenshot({
      path: resolve(SCREENSHOT_DIRECTORY, `stylex-auth-home-intro-guide-${viewport.label}.png`),
    });
    await button.click();
    await expect(guide).toBeHidden();
    expect(await guide.evaluate((element) => getComputedStyle(element).marginTop)).toBe(
      mobile ? "40px" : "0px",
    );
    await button.click();
    await expect(guide).toBeVisible();
  });
}

test("authenticated Home intro toggle persists React-owned visible and hidden states", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);

  const guide = page.locator(GUIDE);
  const toggle = page.locator(`${TOGGLE} #toggleIntro`);
  await expect(guide).toBeVisible();
  await toggle.click();
  await expect(guide).toBeHidden();
  await expect(guide).not.toHaveClass(/\bhide\b/u);
  expect(await page.evaluate(() => localStorage.getItem("yobi-intro"))).toBe("false");
  const hidden = await guide.evaluate((element) => ({
    display: getComputedStyle(element).display,
    height: element.getBoundingClientRect().height,
    marginTop: getComputedStyle(element).marginTop,
    width: element.getBoundingClientRect().width,
  }));
  expect(hidden).toEqual({ display: "none", height: 0, marginTop: "40px", width: 0 });

  await page.reload();
  await expect(guide).toBeHidden();
  await toggle.click();
  await expect(guide).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("yobi-intro"))).toBe("true");
});

test("authenticated Home intro StyleX paint is isolated from retired owner classes", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);

  const result = await page.locator(GUIDE).evaluate((guide) => {
    const table = guide.querySelector("table") as HTMLElement;
    const toggle = guide.nextElementSibling as HTMLElement;
    const button = toggle.querySelector("button") as HTMLElement;
    const snapshot = () => ({
      button: [
        getComputedStyle(button).backgroundColor,
        getComputedStyle(button).outlineStyle,
        getComputedStyle(button).borderRight,
        getComputedStyle(button).borderTop,
        getComputedStyle(button).padding,
      ],
      guide: [getComputedStyle(guide).display, getComputedStyle(guide).margin],
      table: [getComputedStyle(table).borderBottom, getComputedStyle(table).marginBottom],
      toggle: getComputedStyle(toggle).textAlign,
    });
    const owned = snapshot();
    guide.classList.add("site-guide-outer");
    table.classList.add("welcome-table");
    toggle.classList.add("guide-toggle");
    button.classList.add("btn-transparent");
    return { owned, withRetiredClasses: snapshot() };
  });
  expect(result.withRetiredClasses).toEqual(result.owned);
});

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
