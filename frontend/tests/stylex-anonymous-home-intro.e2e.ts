import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const HERO = '[data-stylex-owner="anonymous-home-intro"]';
const COVER = '[data-stylex-owner="anonymous-home-intro-cover"]';
const HEADING = '[data-stylex-owner="anonymous-home-intro-heading"]';

test.use({ locale: "ko-KR" });

test("anonymous Home intro keeps the legacy asset background in fallback-on and fallback-off", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await installRuntimeConfig(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  await expect(page.locator(HERO)).toBeVisible();
  await expect(page.locator(HEADING)).toHaveText("21st Century Software Development Platform");
  const evidence = await readEvidence(page);
  expect(evidence.backgroundImage).toContain(
    "linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.3))",
  );
  expect(evidence.backgroundImage).toMatch(/photo-svetacreative[^)]*\.jpg/u);
  expect(evidence.backgroundSize).toBe("cover, cover");
  expect(evidence.backgroundRepeat).toBe("no-repeat, no-repeat");
  expect(evidence.heading.left).toBeGreaterThanOrEqual(evidence.cover.left);
  expect(evidence.heading.right).toBeLessThanOrEqual(evidence.cover.right);
  expect(evidence.heading.top).toBeGreaterThanOrEqual(evidence.cover.top);
  expect(evidence.heading.bottom).toBeLessThanOrEqual(evidence.cover.bottom);
});

test("anonymous Home intro keeps cover and heading contained at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await installRuntimeConfig(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => document.fonts.ready);

  const evidence = await readEvidence(page);
  expect(evidence.backgroundImage).toMatch(/photo-svetacreative[^)]*\.jpg/u);
  expect(evidence.backgroundSize).toBe("cover, cover");
  expect(evidence.heading.left).toBeGreaterThanOrEqual(evidence.cover.left);
  expect(evidence.heading.right).toBeLessThanOrEqual(evidence.cover.right);
  expect(evidence.heading.top).toBeGreaterThanOrEqual(evidence.cover.top);
  expect(evidence.heading.bottom).toBeLessThanOrEqual(evidence.cover.bottom);
});

async function installRuntimeConfig(page: Page) {
  await page.addInitScript(
    ({ basePath }) => {
      (
        window as Window & {
          __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
        }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        hideProjectListing: false,
        siteName: "Yona",
        supportedLanguages: ["ko-KR"],
      };
    },
    { basePath: BASE_PATH },
  );
}

async function readEvidence(page: Page) {
  return page.evaluate(
    ({ heroSelector, coverSelector, headingSelector }) => {
      const hero = document.querySelector<HTMLElement>(heroSelector);
      const cover = document.querySelector<HTMLElement>(coverSelector);
      const heading = document.querySelector<HTMLElement>(headingSelector);
      if (!hero || !cover || !heading) throw new Error("anonymous home intro DOM is missing");

      const heroStyle = getComputedStyle(hero);
      const coverBox = cover.getBoundingClientRect();
      const headingBox = heading.getBoundingClientRect();
      return {
        backgroundImage: heroStyle.backgroundImage,
        backgroundRepeat: heroStyle.backgroundRepeat,
        backgroundSize: heroStyle.backgroundSize,
        cover: coverBox.toJSON(),
        heading: headingBox.toJSON(),
      };
    },
    { heroSelector: HERO, coverSelector: COVER, headingSelector: HEADING },
  );
}
