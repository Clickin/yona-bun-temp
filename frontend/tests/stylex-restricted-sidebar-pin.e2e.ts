import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OWNER = '[data-stylex-owner="restricted-sidebar-pin"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("restricted sidebar pin has complete global-theme StyleX ownership", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/restricted.tsx", "utf8");
  const start = route.indexOf("const restrictedSidebarPinStyles");
  const end = route.indexOf("function asRecord", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const owner = route.slice(start, end);

  for (const token of [
    "globalSidebarOpenPinSurface",
    "globalSidebarOpenPinText",
    "globalSidebarOpenPinInteractionText",
    "globalSidebarOpenPinLeft",
    "globalSidebarOpenPinTop",
    "globalSidebarOpenPinMargin",
    "globalSidebarOpenPinPadding",
    "globalSidebarOpenPinFontSize",
    "globalSidebarOpenPinLineHeight",
    "globalSidebarOpenPinRadius",
    "globalSidebarOpenPinBorderWidth",
    "globalSidebarOpenPinIconPadding",
  ]) {
    expect(owner).toContain(`globalColors.${token}`);
  }
  expect(owner).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|-?\d+(?:\.\d+)?px|!important/iu);
  expect(route).toContain('data-stylex-owner="restricted-sidebar-pin"');
  expect(route).not.toContain('className="pin"');
  expect(route).not.toContain('data-placement="bottom"');
  expect(route).toContain('title="Sidebar"');
  expect(owner).not.toContain("onClick");
  expect(appCss).not.toMatch(/^\.pin(?:\s|\{|:)/mu);
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
    const leftIcon = pin.locator(":scope > .yobicon-arrow-left");
    const rightIcon = pin.locator(":scope > .yobicon-arrow-right");
    await expect(pin).toHaveCount(1);
    await expect(pin).toHaveJSProperty("tagName", "DIV");
    await expect(pin).toHaveAttribute("title", "Sidebar");
    await expect(pin).not.toHaveAttribute("data-placement");
    await expect(pin).not.toHaveClass(/(?:^|\s)pin(?:\s|$)/u);
    await expect(leftIcon).toBeHidden();
    await expect(rightIcon).toBeVisible();
    expect(await readEvidence(pin)).toEqual({
      leftIconBox: { height: 0, width: 0, x: 0, y: 0 },
      pin: {
        box: { height: 26, width: 25, x: -6, y: 6 },
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
        box: { height: 26, width: 23, x: -5, y: 6 },
        styles: {
          color: "rgb(62, 39, 35)",
          cursor: "auto",
          display: "block",
          fontSize: "18px",
          lineHeight: "18px",
          padding: "4px 0px 4px 5px",
        },
      },
    });

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await pin.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-restricted-sidebar-pin-local-${viewport.label}.png`,
      ),
    });

    await rightIcon.hover();
    await expect(pin).toHaveCSS("background-color", "rgb(3, 169, 244)");
    await expect(pin).toHaveCSS("color", "rgb(62, 39, 35)");
    await expect(pin).toHaveCSS("cursor", "pointer");
    await expect(rightIcon).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(rightIcon).toHaveCSS("cursor", "pointer");
  });
}

test("restricted sidebar pin loses its surface when StyleX classes are removed", async ({
  page,
}) => {
  await mockRestrictedSession(page);
  await page.goto(`${BASE_PATH}/restricted`);
  const pin = page.locator(OWNER);
  const styled = await readEvidence(pin);
  await removeStyleXClasses(pin);
  const unstyled = await readEvidence(pin);
  expect(unstyled.pin.styles).not.toEqual(styled.pin.styles);
  expect(unstyled.pin.styles.backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(unstyled.pin.styles.padding).toBe("0px");
  expect(unstyled.pin.styles.position).toBe("static");
  await expect(pin.locator(":scope > .yobicon-arrow-left")).toBeVisible();
  await expect(pin.locator(":scope > .yobicon-arrow-right")).toBeVisible();
});

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

async function removeStyleXClasses(pin: Locator) {
  await pin.evaluate((element) => {
    for (const target of [element, ...element.querySelectorAll("*")]) {
      target.className = Array.from(target.classList)
        .filter((className) => !className.startsWith("x") && !className.includes("restricted__"))
        .join(" ");
    }
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
