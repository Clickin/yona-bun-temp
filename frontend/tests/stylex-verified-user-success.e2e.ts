import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const routeSource = new URL("../src/routes/verify/$loginId/$verificationCode.tsx", import.meta.url);
const routeThemeSource = new URL(
  "../src/routes/verify/$loginId/-verification.stylex.ts",
  import.meta.url,
);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

async function openVerifiedUser(page: Page) {
  await page.route("**/api/v1/auth/verify", async (route) => {
    await route.fulfill({ contentType: "application/json", json: { loginId: "door" } });
  });
  await page.goto(`${basePath}/verify/door/stylex-code`);
  const owner = page.locator('[data-stylex-owner="verified-user-success"]');
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX verified user success", () => {
  test("uses inline geometry and route paint values for success only", async () => {
    const [route, routeTheme, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(routeThemeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="verified-user-success"');
    expect(route).toContain("styles.taglineWrap");
    expect(route).toContain("taglineWrapStyleProps");
    expect(route).toContain("titleStyleProps");
    expect(route).toContain("taglineStyleProps");
    expect(route).toContain(
      '`center-wrap tag-line-wrap reset-password ${taglineWrapStyleProps.className ?? ""}`',
    );
    expect(route).toContain('`title ${titleStyleProps.className ?? ""}`');
    expect(route).toContain('`tag-line ${taglineStyleProps.className ?? ""}`');
    expect(route).toContain('paddingTop: "80px"');
    expect(route).toContain("color: verificationTheme.taglineText");
    expect(routeTheme).toContain('taglineText: "#7c7c7c"');
    expect(route).not.toContain("globalColors.");
    expect(theme).toContain("resetPasswordTaglinePaddingTop");
    expect(theme).toContain("resetPasswordTitleLineHeight");
  });

  test("composes generated classes with the legacy verified screen fallbacks", async ({ page }) => {
    const owner = await openVerifiedUser(page);
    const classComposition = await owner.evaluate((taglineWrap) => {
      const title = taglineWrap.querySelector("h1");
      const tagline = taglineWrap.querySelector("p.tag-line");
      return {
        tagline: tagline ? Array.from(tagline.classList) : [],
        taglineWrap: Array.from(taglineWrap.classList),
        title: title ? Array.from(title.classList) : [],
      };
    });

    expect(classComposition.taglineWrap).toEqual(
      expect.arrayContaining(["center-wrap", "tag-line-wrap", "reset-password"]),
    );
    expect(classComposition.title).toContain("title");
    expect(classComposition.tagline).toContain("tag-line");
    for (const classes of Object.values(classComposition)) {
      expect(classes.some((token) => token.startsWith("x"))).toBe(true);
    }

    const generatedOutsideVerifiedOwner = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".page.full *"))
        .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
        .filter(
          (element) => element.closest('[data-stylex-owner="verified-user-success"]') === null,
        )
        .map((element) => element.tagName),
    );
    expect(generatedOutsideVerifiedOwner).toEqual([]);
  });

  test("keeps the verified Scala HTML copy and element order", async ({ page }) => {
    const owner = await openVerifiedUser(page);
    await expect(owner.locator(":scope > h1.title")).toHaveText("Verified User");
    await expect(owner.locator(":scope > p")).toHaveText([
      "door",
      "User is verified. Try logging in.",
    ]);
    expect(
      await owner.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H1", "P", "HR", "P"]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`matches ${viewport.name} verified success geometry and paint`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const owner = await openVerifiedUser(page);
      const title = owner.locator("h1.title");
      const tagline = owner.locator(".tag-line");

      await expect(owner).toHaveCSS("padding-top", "80px");
      await expect(owner).toHaveCSS("text-align", "center");
      await expect(title).toHaveCSS("font-size", "42.9px");
      await expect(title).toHaveCSS("line-height", "42px");
      await expect(tagline).toHaveCSS("color", "rgb(124, 124, 124)");
      await expect(tagline).toHaveCSS("font-size", "15.6px");
      const boxes = await page.evaluate(() => {
        const owner = document.querySelector<HTMLElement>(
          '[data-stylex-owner="verified-user-success"]',
        );
        const title = owner?.querySelector<HTMLElement>("h1.title");
        const tagline = owner?.querySelector<HTMLElement>(".tag-line");
        if (!owner || !title || !tagline) return null;
        return {
          owner: owner.getBoundingClientRect().toJSON(),
          tagline: tagline.getBoundingClientRect().toJSON(),
          title: title.getBoundingClientRect().toJSON(),
        };
      });
      expect(boxes).not.toBeNull();
      expect(boxes!.title.top).toBeGreaterThanOrEqual(boxes!.owner.top);
      expect(boxes!.tagline.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
      expect(boxes!.title.left).toBeGreaterThanOrEqual(boxes!.owner.left);
      expect(boxes!.tagline.right).toBeLessThanOrEqual(boxes!.owner.right);
      await expect(owner).toHaveScreenshot(`stylex-verified-user-success-${viewport.name}.png`);
    });
  }

  test("excludes pending and invalid verification bodies", async ({ page }) => {
    await page.route("**/api/v1/auth/verify", () => {});
    await page.goto(`${basePath}/verify/door/pending-stylex-code`);
    await expect(page.locator('[data-stylex-owner="verified-user-success"]')).toHaveCount(0);
    await expect(page.locator(".tag-line-wrap.reset-password")).toContainText("Loading");

    await page.unroute("**/api/v1/auth/verify");
    await page.route("**/api/v1/auth/verify", async (route) => {
      await route.fulfill({ status: 404, body: "Invalid verification" });
    });
    await page.goto(`${basePath}/verify/door/invalid-stylex-code`);
    await expect(page.locator('[data-stylex-owner="verified-user-success"]')).toHaveCount(0);
    await expect(page.locator("body")).toHaveText("Invalid verification");
  });
});
