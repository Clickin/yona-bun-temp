import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-massmail-project-wrapper"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-massmail.stylex.ts", import.meta.url);

async function mockSession(page: Page) {
  const fulfill = (route: Route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-project-wrapper" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({ json: { projects: [{ ownerName: "admin", projectName: "projectYobi" }] } }),
  );
}

async function openMassMail(page: Page) {
  await mockSession(page);
  await page.goto(`${basePath}/sites/massmail`);
  return page.locator(ownerSelector);
}

test.describe("StyleX site massmail project wrapper", () => {
  test("owns only the applicable Bootstrap control-group margin", async ({ page }) => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="site-massmail-project-wrapper"');
    expect(route).toContain("styles.projectWrapper");
    expect(route).toContain('projectWrapper: {\n    marginBottom: "10px"');
    expect(route).not.toContain("globalColors.");
    expect(theme).toContain("defineVars");

    const wrapper = await openMassMail(page);
    await expect(wrapper).toHaveAttribute("id", "project-list-wrap");
    await expect(wrapper).toHaveClass(/(?:^|\s)hide(?:\s|$)/u);
    await expect(wrapper).not.toHaveClass(/(?:^|\s)control-group(?:\s|$)/u);
    await expect(wrapper).toBeHidden();
    await expect(wrapper.locator(":scope > .controls > #input-project")).toHaveCount(1);
  });

  test("keeps projects visibility and reset behavior", async ({ page }) => {
    const wrapper = await openMassMail(page);
    await page.locator("#mailtoPrj").check();
    await expect(wrapper).toBeVisible();
    await wrapper.locator("#input-project").fill("admin/projectYobi");
    await wrapper.locator("#select-project").click();
    await expect(wrapper.locator("#selected-projects")).toHaveText("admin/projectYobi x");
    await page.locator("#mailtoAll").check();
    await expect(wrapper).toBeHidden();
    await expect(wrapper.locator("#selected-projects")).toBeEmpty();
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`${viewport.name} preserves wrapper margin and excludes unmatched control-group variants`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const wrapper = await openMassMail(page);
      await page.locator("#mailtoPrj").check();
      await expect(wrapper).toHaveCSS("margin-bottom", "10px");
      expect(
        await wrapper.evaluate((element) => {
          const computed = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          const input = element.querySelector<HTMLElement>("#input-project");
          const inputBox = input?.getBoundingClientRect();
          return {
            hasFormHorizontalAncestor: element.closest(".form-horizontal") !== null,
            hasLegendPreviousSibling: element.previousElementSibling?.tagName === "LEGEND",
            hasValidationStateAncestor:
              element.closest(".error, .warning, .success, .info") !== null,
            inputContained: Boolean(
              inputBox && inputBox.left >= box.left && inputBox.right <= box.right,
            ),
            marginBottom: computed.marginBottom,
          };
        }),
      ).toEqual({
        hasFormHorizontalAncestor: false,
        hasLegendPreviousSibling: false,
        hasValidationStateAncestor: false,
        inputContained: true,
        marginBottom: "10px",
      });
      await expect(wrapper).toHaveScreenshot(
        `stylex-site-massmail-project-wrapper-${viewport.name}.png`,
      );
    });
  }

  test("generated classes remain isolated to the project wrapper", async ({ page }) => {
    const wrapper = await openMassMail(page);
    expect(
      await wrapper.evaluate((element) => {
        const generated = (current: Element | null) =>
          [...(current?.classList ?? [])].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token));
        return {
          input: generated(element.querySelector("#input-project")),
          wrapper: generated(element),
          writeAction: generated(document.querySelector("#write-email")),
        };
      }),
    ).toEqual({ input: true, wrapper: true, writeAction: true });
  });
});
