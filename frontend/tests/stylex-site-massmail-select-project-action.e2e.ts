import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-massmail-select-project-action"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-massmail.stylex.ts", import.meta.url);

async function mockSession(page: Page) {
  const fulfill = (route: Route) =>
    route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-select-project-action" },
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
  await expect(page.locator(ownerSelector)).toBeHidden();
  await page.locator("#mailtoPrj").check();
  const action = page.locator(ownerSelector);
  await expect(action).toBeVisible();
  return action;
}

test.describe("StyleX site massmail select-project action", () => {
  test("retires only this ybtn fallback and keeps the exact project-controls order", async ({
    page,
  }) => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-stylex-owner="site-massmail-select-project-action"');
    expect(route).toContain("styles.selectProjectAction");
    expect(route).not.toMatch(/id="select-project"[\s\S]{0,120}className="ybtn"/u);
    const actionStyle = route.slice(
      route.indexOf("selectProjectAction: {"),
      route.indexOf("writeAction: {"),
    );
    expect(actionStyle).toContain('":hover": siteMassMailColors.secondaryHoverSurface');
    expect(theme).toContain("secondaryHoverSurface");
    expect(theme).toContain("secondaryInteractiveBorder");
    expect(actionStyle).not.toContain("globalColors.");

    const action = await openProjects(page);
    await expect(action).toHaveAttribute("id", "select-project");
    await expect(action).toHaveAttribute("type", "submit");
    await expect(action.locator("strong")).toHaveText("Add");
    await expect(action).not.toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    expect(
      await page
        .locator("#project-list-wrap .controls > *")
        .evaluateAll((nodes) => nodes.map((node) => node.id || node.tagName.toLowerCase())),
    ).toEqual(["input-project", "select-project"]);
    expect(
      await action.evaluate((element) => ({
        isFirstChild: element.matches(":first-child"),
        marginLeft: getComputedStyle(element).marginLeft,
        previousSiblingId: element.previousElementSibling?.id,
      })),
    ).toEqual({ isFirstChild: false, marginLeft: "4.2px", previousSiblingId: "input-project" });
  });

  test("preserves typeahead selection and add behavior", async ({ page }) => {
    const action = await openProjects(page);
    const input = page.locator("#input-project");
    await input.fill("project");
    await expect(page.locator(".typeahead.dropdown-menu li")).toHaveText(["admin/projectYobi"]);
    await page.locator(".typeahead.dropdown-menu button").click();
    await expect(input).toHaveValue("admin/projectYobi");
    await action.click();
    await expect(input).toHaveValue("");
    await expect(
      page.locator('[data-stylex-owner="site-massmail-selected-project-tag"]'),
    ).toHaveText("admin/projectYobi x");
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`${viewport.name} preserves default and interactive ybtn paint plus geometry`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const action = await openProjects(page);

      expect(
        await action.evaluate((element) => {
          const style = getComputedStyle(element);
          const actionBox = element.getBoundingClientRect();
          const controlsBox = element.parentElement?.getBoundingClientRect();
          return {
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
            borderRadius: style.borderRadius,
            borderStyle: style.borderStyle,
            borderWidth: style.borderWidth,
            boxShadow: style.boxShadow,
            color: style.color,
            cursor: style.cursor,
            display: style.display,
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            marginBottom: style.marginBottom,
            marginLeft: style.marginLeft,
            outlineStyle: style.outlineStyle,
            padding: style.padding,
            position: style.position,
            textAlign: style.textAlign,
            textShadow: style.textShadow,
            verticalAlign: style.verticalAlign,
            whiteSpace: style.whiteSpace,
            zIndex: style.zIndex,
            withinControls: Boolean(
              controlsBox &&
              actionBox.left >= controlsBox.left &&
              actionBox.right <= controlsBox.right + 1 &&
              actionBox.top >= controlsBox.top &&
              actionBox.bottom <= controlsBox.bottom + 1,
            ),
          };
        }),
      ).toEqual({
        backgroundColor: "rgb(255, 255, 255)",
        borderColor: "rgba(0, 0, 0, 0.15)",
        borderRadius: "3px",
        borderStyle: "solid",
        borderWidth: "1px",
        boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
        color: "rgb(51, 51, 51)",
        cursor: "pointer",
        display: "inline-block",
        fontSize: "14px",
        lineHeight: "20px",
        marginBottom: "0px",
        marginLeft: "4.2px",
        outlineStyle: "none",
        padding: "4px 12px",
        position: "relative",
        textAlign: "center",
        textShadow: "none",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        withinControls: true,
        zIndex: "2",
      });
      await action.hover();
      await page.waitForTimeout(350);
      await expect(action).toHaveCSS("background-color", "rgb(241, 241, 241)");
      await expect(action).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
      await expect(action).toHaveCSS("color", "rgb(41, 41, 41)");
      await expect(action).toHaveCSS("text-decoration-line", "none");
      await action.focus();
      await page.waitForTimeout(350);
      await expect(action).toHaveCSS("background-color", "rgb(241, 241, 241)");
      await expect(action).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
      await expect(action).toHaveCSS("color", "rgb(41, 41, 41)");
      await expect(action).toHaveCSS("text-decoration-line", "none");
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();
      await expect(action).toHaveCSS("background-color", "rgb(241, 241, 241)");
      await expect(action).toHaveCSS("border-color", "rgba(0, 0, 0, 0.25)");
      await expect(action).toHaveCSS("color", "rgb(41, 41, 41)");
      await expect(action).toHaveCSS("text-decoration-line", "none");
      await page.mouse.up();
      await expect(action).toHaveScreenshot(
        `stylex-site-massmail-select-project-action-${viewport.name}.png`,
      );
    });
  }

  test("generated classes remain isolated to the action owner", async ({ page }) => {
    const action = await openProjects(page);
    expect(
      await action.evaluate((element) => {
        const hasGeneratedToken = (current: Element | null) =>
          [...(current?.classList ?? [])].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token));
        return {
          actionHasGeneratedToken: hasGeneratedToken(element),
          inputHasGeneratedToken: hasGeneratedToken(element.previousElementSibling),
          strongHasGeneratedToken: hasGeneratedToken(element.querySelector("strong")),
          wrapperHasGeneratedToken: hasGeneratedToken(element.parentElement),
        };
      }),
    ).toEqual({
      actionHasGeneratedToken: true,
      inputHasGeneratedToken: true,
      strongHasGeneratedToken: false,
      wrapperHasGeneratedToken: false,
    });
  });
});
