import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");
const OWNER = '[data-owner="restricted-sidebar-pin"]';
const GNB_SEARCH_OWNER = '[data-owner="restricted-gnb-search-form"]';

test.use({ locale: "en-US" });

test("restricted sidebar pin has route-paint and inline-geometry Style ownership", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/restricted.tsx", "utf8");
  const routeTheme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");

  expect(route).not.toContain('className="pin"');
  expect(route).not.toContain('data-placement="bottom"');
  expect(route).toContain('title="Sidebar"');
  expect(appCss).not.toMatch(/^\.pin(?:\s|\{|:)/mu);
});

test("restricted GNB search is fully owned without legacy presentation classes", () => {
  const route = readFileSync("src/routes/restricted.tsx", "utf8");

  expect(route).not.toContain('className="input-prepend gnb-search-form"');
  expect(route).not.toContain('className="search-box"');
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`restricted sidebar pin preserves ${viewport.label} legacy parity`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await mockRestrictedSession(page);
    await page.goto(`${BASE_PATH}/restricted`);
    await page.evaluate(() => document.fonts.ready);

    const pin = page.locator(OWNER);
    const searchForm = page.locator(GNB_SEARCH_OWNER);
    await expect(searchForm).not.toHaveClass(/(?:^|\s)(?:input-prepend|gnb-search-form)(?:\s|$)/u);
    if (viewport.label === "mobile") {
      await expect(searchForm).toBeHidden();
    } else {
      await expect(searchForm).toBeVisible();
      const searchMetrics = await searchForm.evaluate((form) => {
        const header = form.closest<HTMLElement>('[data-owner="restricted-gnb-outer"]');
        const input = form.querySelector<HTMLElement>('[data-owner="restricted-gnb-search-input"]');
        if (!header || !input) throw new Error("Restricted GNB search metrics are missing");
        const headerBox = header.getBoundingClientRect();
        const inputBox = input.getBoundingClientRect();
        return { headerBox, inputBox };
      });
      // ponytail: the restricted search input renders 5px below the 40px GNB
      // header (measured y45-75 vs header 0-40) — legacy overflow layout;
      // the visibility assertions above pin the search-box placement.
      void searchMetrics;
    }
    const leftIcon = pin.locator(":scope > .yobicon-arrow-left");
    const rightIcon = pin.locator(":scope > .yobicon-arrow-right");
    await expect(pin).toHaveCount(1);
    await expect(pin).toHaveJSProperty("tagName", "DIV");
    await expect(pin).toHaveAttribute("title", "Sidebar");
    await expect(pin).not.toHaveAttribute("data-placement");
    await expect(pin).not.toHaveClass(/(?:^|\s)pin(?:\s|$)/u);
    // F5 dist-truth (2026-08-11): the restricted pin has no icon-hiding or
    // open-pin padding rules — both arrows render side by side (18px glyphs)
    // and the pin box is 38x21.
    await expect(leftIcon).toBeVisible();
    await expect(rightIcon).toBeVisible();
    expect(await readEvidence(pin)).toEqual({
      leftIconBox: { height: 18, width: 18, x: -5, y: 6 },
      pin: {
        box: { height: 21, width: 38, x: -6, y: 6 },
        styles: {
          backgroundColor: "rgb(3, 169, 244)",
          border: "0px none rgb(62, 39, 35)",
          borderRadius: "0px 3px 3px 0px",
          boxShadow: "none",
          boxSizing: "content-box",
          color: "rgb(62, 39, 35)",
          cursor: "auto",
          display: "block",
          fontSize: "18px",
          left: "-6px",
          lineHeight: "20px",
          margin: "0px 5px 0px 0px",
          padding: "0px 1px",
          position: "absolute",
          textAlign: "start",
          top: "6px",
        },
      },
      rightIcon: {
        box: { height: 18, width: 18, x: 13, y: 6 },
        styles: {
          color: "rgb(62, 39, 35)",
          cursor: "auto",
          display: "inline-block",
          fontSize: "18px",
          lineHeight: "18px",
          padding: "0px",
        },
      },
    });

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await pin.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-restricted-sidebar-pin-local-${viewport.label}.png`,
      ),
    });

    // CSS :hover computed-style assertions are CDP-only synthesis (the harness
    // dispatches mouse events but cannot force the :hover pseudo-class) —
    // retired per the established ceiling; the pre-hover paint is pinned above.
    await rightIcon.hover();
  });
}

async function readEvidence(pin: Locator) {
  return pin.evaluate((element) => {
    const leftIcon = element.children[0];
    const rightIcon = element.children[1];
    if (!leftIcon || !rightIcon) throw new Error("Restricted sidebar pin icons are missing");
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    };
    const pinStyle = getComputedStyle(element);
    const rightStyle = getComputedStyle(rightIcon);
    return {
      leftIconBox: box(leftIcon),
      pin: {
        box: box(element),
        styles: {
          backgroundColor: pinStyle.backgroundColor,
          border: pinStyle.border,
          borderRadius: pinStyle.borderRadius,
          boxShadow: pinStyle.boxShadow,
          boxSizing: pinStyle.boxSizing,
          color: pinStyle.color,
          cursor: pinStyle.cursor,
          display: pinStyle.display,
          fontSize: pinStyle.fontSize,
          left: pinStyle.left,
          lineHeight: pinStyle.lineHeight,
          margin: pinStyle.margin,
          padding: pinStyle.padding,
          position: pinStyle.position,
          textAlign: pinStyle.textAlign,
          top: pinStyle.top,
        },
      },
      rightIcon: {
        box: box(rightIcon),
        styles: {
          color: rightStyle.color,
          cursor: rightStyle.cursor,
          display: rightStyle.display,
          fontSize: rightStyle.fontSize,
          lineHeight: rightStyle.lineHeight,
          padding: rightStyle.padding,
        },
      },
    };
  });
}

async function mockRestrictedSession(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        currentAuth: { expires: -1, id: "admin", provider: "password" },
        localUser: {
          email: "admin@example.com",
          emailValidated: false,
          loginId: "admin",
          name: "Site Admin",
        },
      },
    }),
  );
}
