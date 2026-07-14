import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-massmail-project-input"]';
const selectedProjectTagSelector =
  '#selected-projects [data-stylex-owner="site-massmail-selected-project-tag"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);

async function mockSession(page: Page) {
  const fulfill = (route: Route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-project-input" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/mail", (route) =>
    route.fulfill({
      json: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
    }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({
      json: {
        projects: [
          { ownerName: "admin", projectName: "projectYobi" },
          { ownerName: "yona", projectName: "docs" },
        ],
      },
    }),
  );
}

async function openProjects(page: Page) {
  await mockSession(page);
  await page.goto(`${basePath}/sites/massmail`);
  await page.locator("#mailtoPrj").check();
  const input = page.locator(ownerSelector);
  await expect(input).toBeVisible();
  return input;
}

test.describe("StyleX site massmail project input", () => {
  test("uses a stable owner and canonical global margin only", async ({ page }) => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="site-massmail-project-input"');
    expect(route).toContain("styles.projectInput");
    expect(route).toContain("margin: globalColors.siteMassMailProjectInputMargin");
    expect(theme).toContain('siteMassMailProjectInputMargin: "0px"');

    await mockSession(page);
    await page.goto(`${basePath}/sites/massmail`);
    await expect(page.locator(ownerSelector)).toBeHidden();
    await page.locator("#mailtoPrj").check();
    const input = page.locator(ownerSelector);
    await expect(input).toHaveAttribute("id", "input-project");
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveClass(/(?:^|\s)span3(?:\s|$)/u);
    await expect(input).toHaveAttribute("placeholder", "Project name");
    expect(
      await input.evaluate((element) => ({
        hasGeneratedClass: [...element.classList].some((token) =>
          /^x[a-z0-9_-]{5,}$/iu.test(token),
        ),
        hasSpan3: element.classList.contains("span3"),
      })),
    ).toEqual({ hasGeneratedClass: true, hasSpan3: true });
  });

  test("preserves projects typeahead selection and add behavior", async ({ page }) => {
    const input = await openProjects(page);
    await input.fill("project");
    await expect(page.locator(".typeahead.dropdown-menu li")).toHaveText(["admin/projectYobi"]);
    await page.locator(".typeahead.dropdown-menu button").click();
    await expect(input).toHaveValue("admin/projectYobi");
    await expect(page.locator(selectedProjectTagSelector)).toHaveCount(0);
    await page.locator("#select-project").click();
    await expect(input).toHaveValue("");
    await expect(page.locator(selectedProjectTagSelector)).toHaveText("admin/projectYobi x");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`${viewport.name} keeps legacy margin and project-input containment`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const input = await openProjects(page);
      await expect(input).toHaveCSS("margin", "0px");
      const boxes = await page.evaluate((selector) => {
        const input = document.querySelector<HTMLElement>(selector);
        const controls = input?.closest<HTMLElement>(".controls");
        const wrapper = input?.closest<HTMLElement>("#project-list-wrap");
        if (!input || !controls || !wrapper) return null;
        return {
          controls: controls.getBoundingClientRect().toJSON(),
          input: input.getBoundingClientRect().toJSON(),
          wrapper: wrapper.getBoundingClientRect().toJSON(),
        };
      }, ownerSelector);
      expect(boxes).not.toBeNull();
      expect(boxes!.input.left).toBeGreaterThanOrEqual(boxes!.controls.left);
      expect(boxes!.input.right).toBeLessThanOrEqual(boxes!.controls.right + 1);
      expect(boxes!.input.top).toBeGreaterThanOrEqual(boxes!.wrapper.top);
      expect(boxes!.input.bottom).toBeLessThanOrEqual(boxes!.wrapper.bottom);
      await expect(input).toHaveScreenshot(
        `stylex-site-massmail-project-input-${viewport.name}.png`,
      );
    });
  }

  test("generated classes remain scoped to explicit mass-mail owners", async ({ page }) => {
    await openProjects(page);
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
