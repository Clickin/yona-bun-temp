import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-massmail-project-input"]';
const selectedProjectTagSelector =
  '#selected-projects [data-owner="site-massmail-selected-project-tag"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);

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

test.describe("Style site massmail project input", () => {
  test("uses a stable owner and canonical global margin only", async ({ page }) => {
    const [route, _theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-owner="site-massmail-project-input"');

    await mockSession(page);
    await page.goto(`${basePath}/sites/massmail`);
    await expect(page.locator(ownerSelector)).toBeHidden();
    await page.locator("#mailtoPrj").check();
    const input = page.locator(ownerSelector);
    const wrapper = page.locator('[data-owner="site-massmail-project-wrapper"]');
    await expect(wrapper).toHaveCSS("display", "block");
    await expect(wrapper).not.toHaveAttribute("style", /display/u);
    await expect(input).toHaveAttribute("id", "input-project");
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveClass(/(?:^|\s)span3(?:\s|$)/u);
    await expect(input).toHaveAttribute("placeholder", "Project name");
    expect(await input.evaluate((element) => element.classList.contains("span3"))).toBe(true);
  });

  test("preserves projects typeahead selection and add behavior", async ({ page }) => {
    const input = await openProjects(page);
    await input.fill("project");
    const suggestions = page.locator('[data-owner="site-massmail-project-suggestion-menu"]');
    await expect(suggestions).toBeVisible();
    await expect(suggestions).toHaveCSS("display", "block");
    await expect(suggestions).not.toHaveAttribute("style", /display/u);
    await expect(suggestions.locator("li")).toHaveText(["admin/projectYobi"]);
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
    });
  }

  test("generated classes remain scoped to explicit mass-mail owners", async ({ page }) => {
    await openProjects(page);
    const migratedOwnerSelector = [
      '[data-owner="site-massmail-title-strip"]',
      '[data-owner="site-massmail-recipient-radios"]',
      '[data-owner="site-massmail-project-wrapper"]',
      '[data-owner="site-massmail-project-input"]',
      '[data-owner="site-massmail-select-project-action"]',
      '[data-owner="site-massmail-selected-project-tag"]',
      '[data-owner="site-massmail-write-action"]',
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
