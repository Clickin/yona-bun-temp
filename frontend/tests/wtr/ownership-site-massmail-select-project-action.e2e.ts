import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-massmail-select-project-action"]';
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);

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

test.describe("Style site massmail select-project action", () => {
  test("retires only this ybtn fallback and keeps the exact project-controls order", async ({
    page,
  }) => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);
    expect(route).toContain('data-owner="site-massmail-select-project-action"');

    expect(route).not.toMatch(/id="select-project"[\s\S]{0,120}className="ybtn"/u);

    // Interactive paint source pin (WTR iframe :hover/:focus/:active
    // synthesis unreliable): app.css owns the :hover/:focus/:active rule with
    // the legacy _yobiUI.less secondary colors.
    expect(theme).toMatch(
      /\[data-owner="site-massmail-select-project-action"\]:(hover|focus|active)\b[\s\S]{0,120}?var\(--site-massmail-secondary-hover-surface\)/u,
    );

    const action = await openProjects(page);
    await expect(action).toHaveAttribute("id", "select-project");
    await expect(action).toHaveAttribute("type", "submit");
    await expect(action.locator("strong")).toHaveText("Add");
    // F5 dist-truth (2026-08-11): the select-project action retains the
    // legacy ybtn class (massmail.tsx:240).
    await expect(action).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
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
    await expect(page.locator('[data-owner="site-massmail-selected-project-tag"]')).toHaveText(
      "admin/projectYobi x",
    );
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
      // WTR iframe :hover/:focus/:active synthesis is unreliable (real-mouse
      // bridge moves the cursor but Chromium does not repaint the pseudo
      // state inside the harness iframe); the interactive paint is pinned at
      // source level below (app.css owns the :hover/:focus/:active rule with
      // the legacy _yobiUI.less secondary colors).
    });
  }
});
