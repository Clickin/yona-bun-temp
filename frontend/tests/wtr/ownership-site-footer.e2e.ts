import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTER = '[data-owner="site-footer"]';
const INNER = '[data-owner="site-footer-inner"]';
const PROVIDER = '[data-owner="site-footer-provider"]';

test.use({ locale: "en-US" });

for (const viewport of [
  { height: 900, label: "desktop-home", width: 1366 },
  { height: 844, label: "mobile-home", width: 390 },
]) {
  test(`SiteLayout footer preserves ${viewport.label} legacy cascade`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installRuntime(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const outer = page.locator(OUTER);
    const inner = outer.locator(`:scope > ${INNER}`);
    const provider = inner.locator(`:scope > ${PROVIDER}`);
    await expect(outer).toBeVisible();
    await expect(inner).toHaveCount(1);
    await expect(provider).toContainText("Yona authors");
    await expect(provider).not.toContainText("Yoram");

    const evidence = await outer.evaluate((element) => {
      const innerElement = element.firstElementChild as HTMLElement;
      const providerElement = innerElement.firstElementChild as HTMLElement;
      const outerRect = element.getBoundingClientRect();
      const innerRect = innerElement.getBoundingClientRect();
      const outerStyle = getComputedStyle(element);
      const innerStyle = getComputedStyle(innerElement);
      const providerStyle = getComputedStyle(providerElement);
      return {
        boxes: {
          inner: { height: innerRect.height, width: innerRect.width, x: innerRect.x },
          outer: { height: outerRect.height, width: outerRect.width, x: outerRect.x },
        },
        contained:
          innerRect.left >= outerRect.left &&
          innerRect.right <= outerRect.right &&
          innerRect.top >= outerRect.top &&
          innerRect.bottom <= outerRect.bottom,
        inner: {
          boxSizing: innerStyle.boxSizing,
          lineHeight: innerStyle.lineHeight,
          margin: innerStyle.margin,
          textAlign: innerStyle.textAlign,
          width: innerStyle.width,
        },
        links: Array.from(providerElement.querySelectorAll("a"), (link) => {
          const style = getComputedStyle(link);
          const rect = link.getBoundingClientRect();
          return {
            href: link.getAttribute("href"),
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            color: style.color,
            padding: style.padding,
            fragments: link.getClientRects().length,
            top: rect.top,
            bottom: rect.bottom,
          };
        }),
        outer: {
          backgroundColor: outerStyle.backgroundColor,
          boxSizing: outerStyle.boxSizing,
          minWidth: outerStyle.minWidth,
          padding: outerStyle.padding,
          width: outerStyle.width,
        },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        provider: {
          color: providerStyle.color,
          fontFamily: providerStyle.fontFamily,
          fontSize: providerStyle.fontSize,
          marginLeft: providerStyle.marginLeft,
        },
      };
    });

    expect(evidence.outer).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      boxSizing: "content-box",
      minWidth: viewport.width <= 720 ? "10px" : "0px",
      padding: "10px",
      width: `${viewport.width - 20}px`,
    });
    expect(evidence.inner).toEqual({
      boxSizing: "content-box",
      lineHeight: "34px",
      margin: "0px",
      textAlign: "center",
      width: `${viewport.width - 20}px`,
    });
    expect(evidence.provider).toEqual({
      color: "rgb(51, 51, 51)",
      fontFamily: "Verdana",
      fontSize: "9px",
      marginLeft: "4px",
    });
    // common/footer.scala.html and _page.less:770-787: the link cascade, not
    // just its provider container, determines the visible mobile line break.
    expect(evidence.links.map((link) => link.href)).toEqual([
      "https://github.com/yona-projects/yona/blob/master/AUTHORS",
      "https://navercorp.com",
      "https://naverlabs.com/",
      "https://www.ncloud.com/?referer=yona",
    ]);
    for (const [index, link] of evidence.links.entries()) {
      expect({
        fontFamily: link.fontFamily,
        fontSize: link.fontSize,
        fontWeight: link.fontWeight,
        color: link.color,
        padding: link.padding,
      }).toEqual({
        fontFamily: "Tahoma",
        fontSize: "9px",
        fontWeight: "700",
        color: "rgb(68, 68, 68)",
        padding: index === 0 ? "2px" : "0px 2px",
      });
      expect(link.fragments).toBe(1);
    }
    const labs = evidence.links[2]!;
    const cloud = evidence.links[3]!;
    if (viewport.width === 390) {
      expect(cloud.top).toBeGreaterThan(labs.bottom);
    } else {
      expect(cloud.top).toBe(labs.top);
    }
    expect(evidence.boxes.outer.width).toBe(viewport.width);
    expect(evidence.boxes.outer.x).toBe(0);
    expect(evidence.boxes.outer.height).toBe(evidence.boxes.inner.height + 20);
    expect(evidence.boxes.inner.width).toBe(viewport.width - 20);
    expect(evidence.boxes.inner.x).toBe(10);
    // Legacy composition wraps to two 36px line boxes on mobile (390px); single line on desktop.
    expect(evidence.boxes.inner.height).toBe(viewport.width <= 720 ? 72 : 36);
    expect(evidence.contained).toBe(true);
    expect(evidence.overflow).toBe(false);

    await outer.screenshot({
      path: `../output/playwright/style-site-footer-${viewport.label}.png`,
    });
  });
}

async function installRuntime(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
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
        preferredLanguage: "en-US",
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
