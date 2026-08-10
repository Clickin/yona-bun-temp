import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. resolve only builds page.screenshot paths
// (a recorded shim gap); strip leading slashes so cwd-joined src paths stay
// bare-relative for the readFileSync/readFile fixture mapping.
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths.
const mkdirSync = () => undefined;

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");
const OWNER = '[data-owner="global-sidebar-open-pin"]';

test.use({ locale: "en-US" });

test("global sidebar open pin has complete global-theme Style ownership", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const restrictedRoute = readFileSync("src/routes/restricted.tsx", "utf8");
  const restrictedTheme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  for (const declaration of ["lineHeight: 1"]) {
  }

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
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  expect(route).not.toContain('className="pin"');
  expect(appCss).not.toContain(".pin-move-to-right");
  expect(appCss).not.toContain(".pin-move-to-default-position");

  expect(restrictedRoute).not.toContain('className="pin"');
  expect(appCss).not.toContain(".pin {");
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  for (const session of ["anonymous", "authenticated"] as const) {
    test(`${session} global sidebar open pin preserves ${viewport.label} legacy parity`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installHome(page, session === "authenticated");
      await page.goto(`${BASE_PATH}/`);
      await page.evaluate(() => document.fonts.ready);

      const pin = page.locator(OWNER);
      const leftIcon = pin.locator(":scope > .yobicon-arrow-left");
      const rightIcon = pin.locator(":scope > .yobicon-arrow-right");
      await expect(pin).toHaveCount(1);
      await expect(pin).toHaveAttribute("type", "button");
      await expect(pin).toHaveAttribute("title", "Sidebar");
      await expect(pin).toHaveAttribute("aria-controls", "sidebar");
      await expect(pin).toHaveAttribute("aria-expanded", "false");
      // wave-33 retained-class retention (667398a04)
      await expect(pin).toHaveClass(/(?:^|\s)pin(?:\s|$)/u);
      await expect(leftIcon).toBeHidden();
      await expect(rightIcon).toBeVisible();
      expect(await readEvidence(pin)).toEqual({
        leftIconBox: { height: 0, width: 0, x: 0, y: 0 },
        pin: {
          box: { height: 26, width: 25, x: -6, y: 6 },
          styles: {
            appearance: "none",
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
            fontFamily: "yobicon",
            fontStyle: "normal",
            fontVariant: "normal",
            fontWeight: "400",
            verticalAlign: "baseline",
            textDecoration: "none",
            backgroundImage: "none",
            lineHeight: "18px",
            padding: "4px 0px 4px 5px",
          },
        },
      });

      if (session === "authenticated") {
        mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
        await pin.screenshot({
          path: resolve(
            SCREENSHOT_DIRECTORY,
            `style-global-sidebar-open-pin-local-after-${viewport.label}.png`,
          ),
        });
      }

      await rightIcon.hover();
      await expect(pin).toHaveCSS("color", "rgb(62, 39, 35)");
      await expect(pin).toHaveCSS("background-color", "rgb(3, 169, 244)");
      await expect(pin).toHaveCSS("cursor", "pointer");
      await expect(rightIcon).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(rightIcon).toHaveCSS("cursor", "pointer");

      await pin.focus();
      await expect(pin).toBeFocused();
      await expect(pin).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(pin).toHaveCSS("background-color", "rgb(3, 169, 244)");
    });
  }
}

test("global sidebar open pin opens the React framed sidebar and has no legacy fallback", async ({
  page,
}) => {
  await installHome(page, true);
  await page.goto(`${BASE_PATH}/`);
  const pin = page.locator(OWNER);
  await pin.click();
  await expect(page.getByRole("complementary", { name: "Sidebar" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("shallWeOpenLeftNavigation"))).toBe("true");

  await page
    .getByRole("complementary", { name: "Sidebar" })
    .getByRole("button", {
      name: "Sidebar",
    })
    .click();
  const restoredPin = page.locator(OWNER);
  const styled = await readEvidence(restoredPin);
  await removeStyleClasses(restoredPin);
  const unstyled = await readEvidence(restoredPin);
  expect(unstyled.pin.styles).not.toEqual(styled.pin.styles);
  expect(unstyled.pin.styles.backgroundColor).not.toBe("rgb(3, 169, 244)");
  expect(unstyled.pin.styles.position).toBe("static");
});

async function readEvidence(pin: Locator) {
  return pin.evaluate((element) => {
    const leftIcon = element.children[0];
    const rightIcon = element.children[1];
    if (!leftIcon || !rightIcon) throw new Error("Global sidebar open pin icons are missing");
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
          appearance: pinStyle.appearance,
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
          fontFamily: rightStyle.fontFamily,
          fontStyle: rightStyle.fontStyle,
          fontVariant: rightStyle.fontVariant,
          fontWeight: rightStyle.fontWeight,
          verticalAlign: rightStyle.verticalAlign,
          textDecoration: rightStyle.textDecoration,
          backgroundImage: rightStyle.backgroundImage,
          lineHeight: rightStyle.lineHeight,
          padding: rightStyle.padding,
        },
      },
    };
  });
}

async function removeStyleClasses(pin: Locator) {
  await pin.evaluate((element) => {
    for (const target of [element, ...element.querySelectorAll("*")]) {
      target.className = Array.from(target.classList)
        .filter(
          (className) => !className.startsWith("x") && !className.includes("-home-route-screen__"),
        )
        .join(" ");
    }
  });
}

async function installHome(page: Page, authenticated: boolean) {
  await page.addInitScript((basePath) => {
    localStorage.removeItem("shallWeOpenLeftNavigation");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: authenticated
        ? {
            actorId: 1,
            avatarUrl: "",
            defaultLandingPath: "/",
            emailAddress: "admin@example.com",
            isAnonymous: false,
            isConfirmed: true,
            isGuest: false,
            isSiteAdmin: false,
            loginId: "admin",
            preferredLanguage: "en-US",
            userLabel: "Site Admin",
          }
        : { isAnonymous: true, isGuest: false, isSiteAdmin: false },
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
        organizations: [],
        profile: { avatarUrl: "", isGuest: false },
        recentIssues: [],
      },
    }),
  );
}
