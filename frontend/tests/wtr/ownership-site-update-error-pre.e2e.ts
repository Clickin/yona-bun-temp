import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = '[data-owner="site-update-error-pre"]';
const errorText = "java.lang.IllegalStateException: update feed failed";

async function openError(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      json: {
        actorId: "1",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      json: {
        currentVersion: "1.0.0",
        error: errorText,
        releaseUrl: null,
        versionToUpdate: null,
      },
    }),
  );
  await page.goto(`${basePath}/sites/update`);
  const pre = page.locator(owner);
  await expect(pre).toBeVisible();
  return pre;
}

test("update error pre has a stable Style source contract through global theme variables", async () => {
  const [route, _theme] = await Promise.all([
    readFile("src/routes/sites/update.tsx", "utf8"),
    curatedAppCss(),
  ]);

  expect(route).toContain('data-owner="site-update-error-pre"');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`${viewport.name} update error keeps direct pre copy, order, geometry, and paint`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const pre = await openError(page);
    const message = page.getByText("Failed to check for updates because of the following error:");
    await expect(message).toBeVisible();
    await expect(pre).toHaveText(errorText);
    await expect(pre).toHaveCSS("font-family", 'Monaco, Menlo, Consolas, "Courier New", monospace');
    await expect(pre).toHaveCSS("font-size", "13px");
    await expect(pre).toHaveCSS("line-height", "20px");
    await expect(pre).toHaveCSS("color", "rgb(51, 51, 51)");
    await expect(pre).toHaveCSS("background-color", "rgb(245, 245, 245)");
    await expect(pre).toHaveCSS("border-top", "1px solid rgba(0, 0, 0, 0.15)");
    await expect(pre).toHaveCSS("border-radius", "4px");
    await expect(pre).toHaveCSS("white-space", "pre-wrap");
    const orderAndBoxes = await page.evaluate(() => {
      const content = document.querySelector<HTMLElement>(".site-setting-wrap .span10");
      const message = content?.querySelector<HTMLElement>(":scope > p:last-of-type");
      const pre = content?.querySelector<HTMLElement>('[data-owner="site-update-error-pre"]');
      if (!content || !message || !pre) return null;
      const contentBox = content.getBoundingClientRect();
      const messageBox = message.getBoundingClientRect();
      const preBox = pre.getBoundingClientRect();
      return {
        contentBox,
        messageBox,
        preBox,
        siblings: Array.from(content.children)
          .slice(-2)
          .map((node) => node.tagName),
      };
    });
    expect(orderAndBoxes).not.toBeNull();
    expect(orderAndBoxes!.siblings).toEqual(["P", "PRE"]);
    expect(orderAndBoxes!.preBox.top).toBeGreaterThanOrEqual(orderAndBoxes!.messageBox.bottom);
    expect(orderAndBoxes!.preBox.left).toBeGreaterThanOrEqual(orderAndBoxes!.contentBox.left);
    expect(orderAndBoxes!.preBox.right).toBeLessThanOrEqual(orderAndBoxes!.contentBox.right + 1);
  });
}

test("update error pre excludes available and no-update branches", async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ json: { isAnonymous: false, isSiteAdmin: true } }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      json: { currentVersion: "1.0.0", error: null, releaseUrl: null, versionToUpdate: null },
    }),
  );
  await page.goto(`${basePath}/sites/update`);
  await expect(page.locator(owner)).toHaveCount(0);
  await expect(page.getByText("You are using the latest version")).toBeVisible();
});

test("update error generated classes stay isolated to the direct pre owner", async ({ page }) => {
  const pre = await openError(page);
  const contract = await pre.evaluate((element) => {
    const message = element.previousElementSibling;
    return {
      ownerClass: element.className,
      messageClass: message?.getAttribute("class") ?? "",
      owner: element.getAttribute("data-owner"),
      previousTag: message?.tagName,
    };
  });
  expect(contract.owner).toBe("site-update-error-pre");
  expect(contract.previousTag).toBe("P");
  expect(contract.messageClass).not.toMatch(/\bx[a-z0-9_]+\b/u);
});
