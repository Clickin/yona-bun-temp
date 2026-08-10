import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const modal = '[data-owner="site-project-list-delete-modal"]';
const footer = '[data-owner="site-project-list-delete-modal-footer"]';
const backdrop = '[data-owner="site-project-list-delete-modal-backdrop"]';
const actions = {
  cancel: '[data-owner="site-project-list-delete-modal-cancel-action"]',
  confirm: '[data-owner="site-project-list-delete-modal-confirm-action"]',
};

async function openProjectList(page: Page) {
  const deletedProjectIds: string[] = [];
  let projects = [
    {
      createdAt: "2026-06-29",
      id: 77,
      ownerName: "acme",
      overview: "Release planning",
      projectLogoUrl: "/assets/images/default-project-logo.png",
      projectName: "roadmap",
    },
  ];
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-project-list-modal-actions" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects,
        total: projects.length,
        totalPages: projects.length ? 1 : 0,
      },
    }),
  );
  await page.route("**/api/v1/site/projects/77", async (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-site-project-list-modal-actions");
    deletedProjectIds.push("77");
    projects = [];
    await route.fulfill({ contentType: "application/json", json: { deleted: true } });
  });

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  await expect(page.locator('[data-owner="site-project-list-row"]')).toHaveCount(1);
  return { deletedProjectIds };
}

async function showDeleteModal(page: Page) {
  await page.locator('[data-owner="site-project-list-delete-action"]').click();
  await expect(page.locator(modal)).toBeVisible();
  await expect(page.locator(backdrop)).toBeVisible();
}

type ActionPaint = {
  backgroundColor: string;
  border: string;
  borderRadius: string;
  boxShadow: string;
  color: string;
  cursor: string;
  display: string;
  fontSize: string;
  lineHeight: string;
  marginBottom: string;
  marginLeft: string;
  outline: string;
  padding: string;
  position: string;
  textAlign: string;
  textDecoration: string;
  textShadow: string;
  transitionDuration: string;
  transitionTimingFunction: string;
  verticalAlign: string;
  whiteSpace: string;
  zIndex: string;
};

async function paint(page: Page, selector: string): Promise<ActionPaint> {
  return page.locator(selector).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      backgroundColor: style.backgroundColor,
      border: style.border,
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      color: style.color,
      cursor: style.cursor,
      display: style.display,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight,
      marginBottom: style.marginBottom,
      marginLeft: style.marginLeft,
      outline: style.outline,
      padding: style.padding,
      position: style.position,
      textAlign: style.textAlign,
      textDecoration: style.textDecoration,
      textShadow: style.textShadow,
      transitionDuration: style.transitionDuration,
      transitionTimingFunction: style.transitionTimingFunction,
      verticalAlign: style.verticalAlign,
      whiteSpace: style.whiteSpace,
      zIndex: style.zIndex,
    };
  });
}

test.describe("Style site project-list delete modal actions", () => {
  test("keeps exact action order, copy, ids, React dismiss paths, and REST deletion", async ({
    page,
  }) => {
    const requests = await openProjectList(page);
    await showDeleteModal(page);
    const buttons = page.locator(`${footer} > button`);
    await expect(buttons).toHaveCount(2);
    await expect(buttons).toHaveText(["Yes", "No"]);
    await expect(buttons.first()).toHaveAttribute("id", "projectDeleteBtn");
    await expect(buttons.last()).not.toHaveAttribute("id", /./);
    for (const button of [buttons.first(), buttons.last()]) {
      await expect(button).toHaveAttribute("type", "button");
      await expect(button).not.toHaveAttribute("data-toggle", /./);
      await expect(button).not.toHaveAttribute("data-dismiss", /./);
      await expect(button).not.toHaveAttribute("data-target", /./);
      await expect(button).not.toHaveAttribute("data-href", /./);
      await expect(button).not.toHaveAttribute("data-request-uri", /./);
      await expect(button).not.toHaveAttribute("data-request-method", /./);
    }

    await buttons.last().click();
    await expect(page.locator(modal)).toBeHidden();
    await showDeleteModal(page);
    await page.locator('[data-owner="site-project-list-delete-modal-close"]').click();
    await expect(page.locator(modal)).toBeHidden();
    await showDeleteModal(page);
    await page.locator(backdrop).click({ position: { x: 2, y: 2 } });
    await expect(page.locator(modal)).toBeHidden();
    await showDeleteModal(page);
    await page.locator("#projectDeleteBtn").click();
    await expect.poll(() => requests.deletedProjectIds).toEqual(["77"]);
    await expect(page.locator('[data-owner="site-project-list-row"]')).toHaveCount(0);
    await expect(page.locator(modal)).toBeHidden();
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} frozen paint, states, geometry, and same-fixture fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openProjectList(page);
      await showDeleteModal(page);
      const confirm = page.locator("#projectDeleteBtn");
      const cancel = page.locator(`${footer} > button`).last();

      const cancelDefault = await paint(page, `${footer} > button:last-child`);
      expect(cancelDefault).toMatchObject({
        backgroundColor: "rgb(255, 255, 255)",
        border: "1px solid rgba(0, 0, 0, 0.15)",
        borderRadius: "3px",
        boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px",
        color: "rgb(51, 51, 51)",
        cursor: "pointer",
        display: "inline-block",
        fontSize: "14px",
        lineHeight: "20px",
        marginBottom: "0px",
        marginLeft: "4.2px",
        outline: "rgb(51, 51, 51) none 0px",
        padding: "4px 12px",
        position: "relative",
        textAlign: "center",
        textDecoration: "none",
        textShadow: "none",
        transitionDuration: "0.3s",
        transitionTimingFunction: "ease",
        verticalAlign: "middle",
        whiteSpace: "nowrap",
        zIndex: "2",
      });
      const confirmDefault = await paint(page, "#projectDeleteBtn");
      expect(confirmDefault).toMatchObject({
        ...cancelDefault,
        backgroundColor: "rgb(201, 52, 38)",
        border: "1px solid rgb(177, 52, 39)",
        color: "rgb(255, 255, 255)",
        marginLeft: "0px",
        outline: "rgb(255, 255, 255) none 0px",
        textDecoration: "none",
      });

      await cancel.hover();
      await expect(cancel).toHaveCSS("background-color", "rgb(241, 241, 241)");
      await expect(cancel).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.25)");
      await expect(cancel).toHaveCSS("color", "rgb(41, 41, 41)");
      expect(await paint(page, `${footer} > button:last-child`)).toMatchObject({
        backgroundColor: "rgb(241, 241, 241)",
        border: "1px solid rgba(0, 0, 0, 0.25)",
        color: "rgb(41, 41, 41)",
        textDecoration: "none",
      });
      await cancel.focus();
      expect(await paint(page, `${footer} > button:last-child`)).toMatchObject({
        backgroundColor: "rgb(241, 241, 241)",
        border: "1px solid rgba(0, 0, 0, 0.25)",
        color: "rgb(41, 41, 41)",
      });
      await cancel.hover();
      await page.mouse.down();
      expect(await paint(page, `${footer} > button:last-child`)).toMatchObject({
        backgroundColor: "rgb(241, 241, 241)",
        border: "1px solid rgba(0, 0, 0, 0.25)",
        color: "rgb(41, 41, 41)",
      });
      await page.mouse.move(0, 0);
      await page.mouse.up();

      await confirm.hover();
      await expect(confirm).toHaveCSS("background-color", "rgb(177, 52, 39)");
      await expect(confirm).toHaveCSS("border", "1px solid rgb(177, 52, 39)");
      expect(await paint(page, "#projectDeleteBtn")).toMatchObject({
        backgroundColor: "rgb(177, 52, 39)",
        border: "1px solid rgb(177, 52, 39)",
        color: "rgb(255, 255, 255)",
      });
      await confirm.focus();
      expect(await paint(page, "#projectDeleteBtn")).toMatchObject({
        backgroundColor: "rgb(177, 52, 39)",
        border: "1px solid rgb(177, 52, 39)",
      });
      await confirm.hover();
      await page.mouse.down();
      expect(await paint(page, "#projectDeleteBtn")).toMatchObject({
        backgroundColor: "rgb(177, 52, 39)",
        border: "1px solid rgb(177, 52, 39)",
      });
      await page.mouse.move(0, 0);
      await page.mouse.up();

      const boxes = await page.evaluate((footerSelector) => {
        const footerElement = document.querySelector<HTMLElement>(footerSelector)!;
        const buttons = Array.from(footerElement.querySelectorAll<HTMLElement>(":scope > button"));
        const box = (element: HTMLElement) => {
          const value = element.getBoundingClientRect();
          return {
            bottom: value.bottom,
            height: value.height,
            left: value.left,
            right: value.right,
            top: value.top,
            width: value.width,
          };
        };
        return { cancel: box(buttons[1]!), confirm: box(buttons[0]!), footer: box(footerElement) };
      }, footer);
      expect(boxes.confirm.top).toBeCloseTo(boxes.cancel.top, 1);
      expect(boxes.confirm.bottom).toBeCloseTo(boxes.cancel.bottom, 1);
      expect(boxes.confirm.right).toBeLessThanOrEqual(boxes.cancel.left);
      expect(boxes.cancel.left - boxes.confirm.right).toBeCloseTo(4.2, 1);
      for (const button of [boxes.confirm, boxes.cancel]) {
        expect(button.top).toBeGreaterThan(boxes.footer.top);
        expect(button.bottom).toBeLessThan(boxes.footer.bottom);
        expect(button.left).toBeGreaterThan(boxes.footer.left);
        expect(button.right).toBeLessThan(boxes.footer.right);
        expect(button.height).toBeCloseTo(30, 1);
      }
      expect(boxes.cancel.right).toBeCloseTo(boxes.footer.right - 15, 1);
      expect((await page.locator(footer).screenshot()).byteLength).toBeGreaterThan(0);

      await confirm.blur();
      await cancel.blur();
      await page.mouse.move(0, 0);
      await expect(confirm).toHaveCSS("background-color", "rgb(201, 52, 38)");
      await expect(cancel).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(cancel).toHaveCSS("margin-left", "4.2px");
      const evidence = await page.evaluate((footerSelector) => {
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>(`${footerSelector} > button`),
        );
        const capture = () =>
          buttons.map((button) => {
            const style = getComputedStyle(button);
            const box = button.getBoundingClientRect();
            return {
              backgroundColor: style.backgroundColor,
              border: style.border,
              borderRadius: style.borderRadius,
              box: { height: box.height, left: box.left, top: box.top, width: box.width },
              boxShadow: style.boxShadow,
              color: style.color,
              marginLeft: style.marginLeft,
              padding: style.padding,
            };
          });
        const migrated = capture();
        for (const [index, button] of buttons.entries()) {
          for (const token of Array.from(button.classList)) {
            if (token.startsWith("x")) button.classList.remove(token);
          }
          button.classList.add("ybtn");
          if (index === 0) button.classList.add("ybtn-danger");
        }
        return { fallback: capture(), migrated };
      }, footer);
      expect(evidence.fallback).toEqual(evidence.migrated);
      expect(evidence.fallback[0]!.backgroundColor).toBe("rgb(201, 52, 38)");
      expect(evidence.fallback[1]!.backgroundColor).toBe("rgb(255, 255, 255)");
    });
  }

  test("uses exactly two stable Style owners and removes only modal action fallbacks", async ({
    page,
  }) => {
    await openProjectList(page);
    await showDeleteModal(page);
    await expect(page.locator(actions.confirm)).toHaveText("Yes");
    await expect(page.locator(actions.cancel)).toHaveText("No");
    for (const selector of Object.values(actions)) {
      const owner = page.locator(selector);
      const classes = (await owner.getAttribute("class"))?.split(/\s+/).filter(Boolean) ?? [];

      expect(classes).not.toEqual(expect.arrayContaining(["ybtn", "ybtn-danger"]));
    }
    const actionOwnerIds = await page.evaluate(
      (footerSelector) =>
        Array.from(document.querySelectorAll<HTMLElement>(`${footerSelector} > button`))
          .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
          .map((element) => element.getAttribute("data-owner")),
      footer,
    );
    expect(new Set(actionOwnerIds)).toEqual(
      new Set([
        "site-project-list-delete-modal-confirm-action",
        "site-project-list-delete-modal-cancel-action",
      ]),
    );
  });

  test("declares modal action geometry inline and paint in the route theme", async () => {
    const route = await readFile(routeSource, "utf8");

    for (const owner of Object.values(actions)) expect(route).toContain(owner.slice(1, -1));
  });
});
