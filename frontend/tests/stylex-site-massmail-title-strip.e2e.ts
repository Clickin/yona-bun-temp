import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-massmail-title-strip"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);

async function mockSession(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-massmail-title-strip" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/mail", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
    }),
  );
}

async function openMassMail(page: Page) {
  await mockSession(page);
  await page.goto(`${basePath}/sites/massmail`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX site massmail title strip", () => {
  test("reuses canonical frozen title globals through the stable owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-massmail-title-strip"');
    expect(route).toContain("styles.titleArea");
    expect(route).toContain("styles.title");
    expect(route).toContain("globalColors.siteDiagnosticNoErrorTitleBorder");
    expect(theme).toContain("siteDiagnosticNoErrorHeadingText");
  });

  test("composes generated classes with the legacy title classes", async ({ page }) => {
    const owner = await openMassMail(page);
    const classPresence = await owner.evaluate((element) => {
      const heading = element.querySelector("h2");
      const hasGeneratedClass = (node: Element | null) =>
        [...(node?.classList ?? [])].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token));
      return {
        headingHasGeneratedClass: hasGeneratedClass(heading),
        headingHasPullLeft: heading?.classList.contains("pull-left") ?? false,
        ownerHasGeneratedClass: hasGeneratedClass(element),
        ownerHasTitleArea: element.classList.contains("title_area"),
      };
    });
    expect(classPresence).toEqual({
      headingHasGeneratedClass: true,
      headingHasPullLeft: true,
      ownerHasGeneratedClass: true,
      ownerHasTitleArea: true,
    });
  });

  test("keeps the legacy heading first in default and pending mass-mail states", async ({
    page,
  }) => {
    await mockSession(page);
    let releaseMailListResponse = () => {};
    const mailListRequest = page.waitForRequest(
      (request) =>
        request.method() === "POST" && new URL(request.url()).pathname.endsWith("/site/mail-list"),
    );
    const mailListResponse = new Promise<void>((resolve) => {
      releaseMailListResponse = resolve;
    });
    await page.route("**/site/mail-list**", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }
      await mailListResponse;
      await route.fulfill({ json: { recipients: ["maintainer@example.com"] } });
    });
    await page.addInitScript(() => {
      window.open = () => null;
    });
    await page.goto(`${basePath}/sites/massmail`);

    const owner = page.locator(ownerSelector);
    const action = page.locator("#write-email");
    await expect(owner.locator(":scope > h2.pull-left")).toHaveText("Send mass mails");
    expect(
      await page
        .locator(".site-setting-wrap .span10 > *")
        .evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["DIV", "DIV"]);
    await expect(owner.locator("button, input, .mess-mail-wrap")).toHaveCount(0);
    const actionClick = action.click({ noWaitAfter: true });
    await mailListRequest;
    await expect(action).toBeDisabled();
    await expect(owner.locator(":scope > h2.pull-left")).toHaveText("Send mass mails");
    releaseMailListResponse();
    await actionClick;
    await expect(action).toBeEnabled();
  });

  test("matches desktop and mobile title geometry and paint", async ({ page }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const owner = await openMassMail(page);
      const heading = owner.locator("h2.pull-left");

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate((selector) => {
        const owner = document.querySelector<HTMLElement>(selector);
        const heading = owner?.querySelector<HTMLElement>("h2.pull-left");
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
      await expect(owner).toHaveScreenshot(`stylex-site-massmail-title-strip-${viewport.name}.png`);
    }
  });

  test("isolates generated StyleX classes to explicit mass-mail owners", async ({ page }) => {
    await openMassMail(page);
    const migratedOwnerSelector = [
      '[data-stylex-owner="site-massmail-title-strip"]',
      '[data-stylex-owner="site-massmail-recipient-radios"]',
      '[data-stylex-owner="site-massmail-project-wrapper"]',
      '[data-stylex-owner="site-massmail-project-input"]',
      '[data-stylex-owner="site-massmail-select-project-action"]',
      '[data-stylex-owner="site-massmail-selected-project-tag"]',
      '[data-stylex-owner="site-massmail-write-action"]',
    ].join(", ");

    const generatedOutsideOwners = await page.evaluate(
      (selector) =>
        Array.from(document.querySelectorAll(".site-setting-wrap .span10 *"))
          .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
          .filter((element) => element.closest(selector) === null)
          .map((element) => element.tagName),
      migratedOwnerSelector,
    );
    expect(generatedOutsideOwners).toEqual([]);
  });
});
