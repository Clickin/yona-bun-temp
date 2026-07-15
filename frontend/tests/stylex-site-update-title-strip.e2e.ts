import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-update-title-strip"]';
const routeSource = new URL("../src/routes/sites/update.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);

type UpdateResponse = {
  currentVersion: string;
  error: string | null;
  releaseUrl: string | null;
  versionToUpdate: string | null;
};

async function openUpdate(page: Page, response: UpdateResponse) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isSiteAdmin: true },
    }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: response }),
  );
  await page.goto(`${basePath}/sites/update`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX site update title strip", () => {
  test("reuses global frozen title-strip values through the stable owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-update-title-strip"');
    expect(route).toContain('data-stylex-owner="site-update-title-heading"');
    expect(route).toContain("styles.titleArea");
    expect(route).toContain("styles.title");
    expect(route).toContain("titleAreaStyleProps");
    expect(route).toContain("titleStyleProps");
    expect(route).not.toContain('`title_area ${titleAreaStyleProps.className ?? ""}`');
    expect(route).not.toContain('`pull-left ${titleStyleProps.className ?? ""}`');
    expect(route).toContain("globalColors.siteDiagnosticNoErrorTitleBorder");
    expect(theme).toContain("siteDiagnosticNoErrorHeadingText");
  });

  test("preserves the legacy heading before the no-update body", async ({ page }) => {
    const owner = await openUpdate(page, {
      currentVersion: "1.0.0",
      error: null,
      releaseUrl: null,
      versionToUpdate: null,
    });

    await expect(
      owner.locator(':scope > h2[data-stylex-owner="site-update-title-heading"]'),
    ).toHaveText("Software Update");
    await expect(owner.locator("+ p").first()).toHaveText("Current version is Yoram 1.0.0");
    expect(
      await page
        .locator(".site-setting-wrap .span10 > *")
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV", "P", "P"]);
  });

  test("matches desktop and mobile title geometry and paint", async ({ page }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const owner = await openUpdate(page, {
        currentVersion: "1.0.0",
        error: null,
        releaseUrl: null,
        versionToUpdate: null,
      });
      const heading = owner.locator('[data-stylex-owner="site-update-title-heading"]');

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate((selector) => {
        const owner = document.querySelector<HTMLElement>(selector);
        const heading = owner?.querySelector<HTMLElement>(
          '[data-stylex-owner="site-update-title-heading"]',
        );
        const content = owner?.parentElement;
        if (!owner || !heading || !content) return null;
        return {
          content: content.getBoundingClientRect().toJSON(),
          heading: heading.getBoundingClientRect().toJSON(),
          owner: owner.getBoundingClientRect().toJSON(),
        };
      }, ownerSelector);
      expect(boxes).not.toBeNull();
      expect(boxes!.owner.left).toBeGreaterThanOrEqual(boxes!.content.left);
      expect(boxes!.owner.right).toBeLessThanOrEqual(boxes!.content.right + 1);
      expect(boxes!.heading.top).toBeGreaterThanOrEqual(boxes!.owner.top);
      expect(boxes!.heading.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
      await expect(owner).toHaveScreenshot(`stylex-site-update-title-strip-${viewport.name}.png`);
    }
  });

  test("keeps exactly one title owner across available, current, no-update, and error bodies", async ({
    page,
  }) => {
    const states: Array<{ bodies: RegExp[]; response: UpdateResponse }> = [
      {
        bodies: [/Yoram 1\.1\.0 is available/u],
        response: {
          currentVersion: "1.0.0",
          error: null,
          releaseUrl: "https://example.test/yona-1.1.0",
          versionToUpdate: "1.1.0",
        },
      },
      {
        bodies: [/Current version is Yoram 1\.0\.0/u, /You are using the latest version/u],
        response: { currentVersion: "1.0.0", error: null, releaseUrl: null, versionToUpdate: null },
      },
      {
        bodies: [/Failed to check for updates/u],
        response: {
          currentVersion: "1.0.0",
          error: "java.lang.IllegalStateException: update feed failed",
          releaseUrl: null,
          versionToUpdate: null,
        },
      },
    ];

    for (const state of states) {
      await openUpdate(page, state.response);
      await expect(page.locator(ownerSelector)).toHaveCount(1);
      for (const body of state.bodies) {
        await expect(page.getByText(body)).toBeVisible();
      }
      await expect(
        page.locator(
          `${ownerSelector} p, ${ownerSelector} strong, ${ownerSelector} a, ${ownerSelector} pre`,
        ),
      ).toHaveCount(0);
    }
  });

  test("composes generated StyleX and legacy fallback classes inside explicit update owners", async ({
    page,
  }) => {
    const owner = await openUpdate(page, {
      currentVersion: "1.0.0",
      error: null,
      releaseUrl: null,
      versionToUpdate: null,
    });

    const classComposition = await owner.evaluate((titleArea) => {
      const heading = titleArea.querySelector("h2");
      if (!heading) return null;
      return {
        heading: Array.from(heading.classList),
        titleArea: Array.from(titleArea.classList),
      };
    });
    expect(classComposition).not.toBeNull();
    expect(classComposition!.titleArea).not.toContain("title_area");
    expect(classComposition!.heading).not.toContain("pull-left");
    expect(classComposition!.titleArea.some((token) => token.startsWith("x"))).toBe(true);
    expect(classComposition!.heading.some((token) => token.startsWith("x"))).toBe(true);

    const generatedOutsideExplicitOwners = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".site-setting-wrap .span10 *"))
        .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
        .filter(
          (element) =>
            element.closest(
              '[data-stylex-owner="site-update-sidebar"], [data-stylex-owner="site-update-sidebar-item"], [data-stylex-owner="site-update-sidebar-link"], [data-stylex-owner="site-update-sidebar-badge"], [data-stylex-owner="site-update-title-strip"], [data-stylex-owner="site-update-title-heading"], [data-stylex-owner="site-update-available-message"], [data-stylex-owner="site-update-available-message-strong"], [data-stylex-owner="site-update-current-version"], [data-stylex-owner="site-update-latest-version"], [data-stylex-owner="site-update-download-action"], [data-stylex-owner="site-update-error-pre"]',
            ) === null,
        )
        .map((element) => element.tagName),
    );
    expect(generatedOutsideExplicitOwners).toEqual([]);
  });
});
