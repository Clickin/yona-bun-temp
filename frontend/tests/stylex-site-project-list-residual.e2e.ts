import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const containerSelector = '[data-stylex-owner="site-project-list-container"]';
const projectNameSelector = '[data-stylex-owner="site-project-list-project-name"]';
const deleteActionSelector = '[data-stylex-owner="site-project-list-delete-action"]';
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const appCssSource = new URL("../src/app.css", import.meta.url);
const legacyTemplateSource = new URL(
  "../../yona-original/app/views/site/projectList.scala.html",
  import.meta.url,
);
const legacyLayoutSource = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const legacyPageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

async function openPopulatedProjectList(page: Page) {
  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-project-list-residual" },
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
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
          {
            createdAt: "2026-06-30",
            id: 78,
            ownerName: "yona",
            overview: "Migration tracking",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "conversion",
          },
        ],
        total: 2,
        totalPages: 1,
      },
    }),
  );

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  const container = page.locator(containerSelector);
  await expect(container).toBeVisible();
  await expect(
    page.locator('[data-stylex-owner="site-project-list-setting-wrap"]'),
  ).toHaveAttribute("data-stylex-owner-page", "site-project-list-page");
  await expect(
    container.locator(':scope > [data-stylex-owner="site-project-list-row"]'),
  ).toHaveCount(2);
  return container;
}

test.describe("StyleX site project-list residual populated surfaces", () => {
  test("keeps residual geometry inline and delete paint in the route theme", async () => {
    const [route, appCss, legacyTemplate, legacyLayout, legacyPageLess] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(appCssSource, "utf8"),
      readFile(legacyTemplateSource, "utf8"),
      readFile(legacyLayoutSource, "utf8"),
      readFile(legacyPageLessSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-project-list-container"');
    expect(route).toContain('data-stylex-owner-page="site-project-list-page"');
    expect(route).toContain('data-stylex-owner="site-project-list-project-name"');
    expect(route).toContain('data-stylex-owner="site-project-list-delete-action"');
    expect(route).toContain("styles.projectListContainer");
    expect(route).toContain("styles.projectListProjectName");
    expect(route).toContain("styles.projectListDeleteAction");
    expect(route).toContain('listStyle: "none"');
    expect(route).toContain('fontSize: "14px"');
    expect(route).toContain('fontWeight: "bold"');
    expect(route).toContain("default: siteProjectListTheme.deleteSurface");
    expect(route).toContain('":hover": siteProjectListTheme.deleteInteractiveSurface');
    expect(route).toContain('padding: "4px 12px"');
    expect(route).toContain('transition: "all 0.3s ease"');
    expect(route).not.toContain("globalColors.");
    expect(legacyTemplate).toContain('<div class="row-fluid listhead">');
    expect(legacyTemplate).toContain('<ul class="project-list-wrap">');
    expect(legacyLayout).toContain('<div class="site-setting-wrap">');
    expect(legacyPageLess).toContain(".project-list-wrap {");
    expect(legacyPageLess).toContain("font-size:14px;");
    expect(legacyPageLess).toContain("font-weight: bold;");
    expect(appCss).not.toContain(".site-setting-wrap .project-list-wrap {");
    expect(appCss).not.toContain(".site-setting-wrap .project-list-wrap .project-name {");
    expect(appCss).not.toContain(".site-setting-wrap .listhead {");
    expect(appCss).not.toContain(".site-admin-page .project-list-wrap");
    expect(route).not.toContain("site-admin-page");
    expect(route).not.toContain("project-list-wrap");
  });

  test("keeps copy, row order, project navigation, and React-owned delete interaction", async ({
    page,
  }) => {
    const container = await openPopulatedProjectList(page);
    const names = container.locator(projectNameSelector);
    const actions = container.locator(deleteActionSelector);

    await expect(names).toHaveText(["acme/roadmap", "yona/conversion"]);
    await expect(names.nth(0)).toHaveAttribute("href", /\/acme\/roadmap$/);
    await expect(names.nth(1)).toHaveAttribute("href", /\/yona\/conversion$/);
    await expect(actions).toHaveText(["Delete", "Delete"]);
    await expect(actions.first()).not.toHaveAttribute("data-toggle");
    await expect(actions.first()).not.toHaveAttribute("data-href");

    await actions.first().click();
    const modal = page.locator("#alertDeletionWrap");
    await expect(modal).toBeVisible();
    await expect(
      modal.locator('[data-stylex-owner="site-project-list-delete-modal-header"]'),
    ).toContainText("acme/roadmapDelete project");
    await expect(
      modal.locator('[data-stylex-owner="site-project-list-delete-modal-body"]'),
    ).toContainText("Do you really want to delete this project?");
    await modal.locator('[data-stylex-owner="site-project-list-delete-modal-close"]').click();
    await expect(modal).toBeHidden();

    await actions.nth(1).click();
    await expect(modal.locator("#project-name")).toHaveText("yona/conversion");
    await page
      .locator('[data-stylex-owner="site-project-list-delete-modal-backdrop"]')
      .click({ position: { x: 2, y: 2 } });
    await expect(modal).toBeHidden();
  });

  test("removes migrated presentation classes while retaining generated ownership", async ({
    page,
  }) => {
    const container = await openPopulatedProjectList(page);
    const classes = await container.evaluate((list) => ({
      container: Array.from(list.classList),
      deleteActions: Array.from(
        list.querySelectorAll('[data-stylex-owner="site-project-list-delete-action"]'),
        (element) => Array.from(element.classList),
      ),
      projectNames: Array.from(
        list.querySelectorAll('[data-stylex-owner="site-project-list-project-name"]'),
        (element) => Array.from(element.classList),
      ),
    }));

    expect(classes.container).not.toContain("project-list-wrap");
    expect(classes.container.some((token) => token.startsWith("x"))).toBe(true);
    for (const projectName of classes.projectNames) {
      expect(projectName).not.toContain("project-name");
      expect(projectName.some((token) => token.startsWith("x"))).toBe(true);
    }
    for (const action of classes.deleteActions) {
      expect(action).not.toContain("ybtn");
      expect(action).not.toContain("ybtn-danger");
      expect(action.some((token) => token.startsWith("x"))).toBe(true);
    }

    const modalConfirm = page.locator(
      '[data-stylex-owner="site-project-list-delete-modal-confirm-action"]',
    );
    const modalCancel = page.locator(
      '[data-stylex-owner="site-project-list-delete-modal-cancel-action"]',
    );
    await expect(modalConfirm).toHaveAttribute("id", "projectDeleteBtn");
    await expect(modalConfirm).not.toHaveClass(/(?:^|\s)ybtn(?:-danger)?(?:\s|$)/);
    await expect(modalCancel).not.toHaveClass(/(?:^|\s)ybtn(?:-danger)?(?:\s|$)/);
    await expect(modalConfirm).toHaveClass(/(?:^|\s)x\S*/);
    await expect(modalCancel).toHaveClass(/(?:^|\s)x\S*/);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} exact paint, states, containment, and capture`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const container = await openPopulatedProjectList(page);
      const firstRow = container
        .locator(':scope > [data-stylex-owner="site-project-list-row"]')
        .first();
      const name = firstRow.locator(projectNameSelector);
      const action = firstRow.locator(deleteActionSelector);

      await expect(container).toHaveCSS("list-style-type", "none");
      await expect(name).toHaveCSS("font-size", "14px");
      await expect(name).toHaveCSS("font-weight", "700");
      await expect(action).toHaveCSS("text-align", "center");
      await expect(action).toHaveCSS("white-space", "nowrap");
      await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(action).toHaveCSS("background-color", "rgb(201, 52, 38)");
      await expect(action).toHaveCSS("border-color", "rgb(177, 52, 39)");
      await expect(action).toHaveCSS("border-style", "solid");
      await expect(action).toHaveCSS("border-width", "1px");
      await expect(action).toHaveCSS("border-radius", "3px");
      await expect(action).toHaveCSS("display", "inline-block");
      await expect(action).toHaveCSS("padding", "4px 12px");
      await expect(action).toHaveCSS("vertical-align", "middle");
      await expect(action).toHaveCSS("cursor", "pointer");
      await expect(action).toHaveCSS("line-height", "20px");
      await expect(action).toHaveCSS("font-size", "14px");
      await expect(action).toHaveCSS("transition-property", "all");
      await expect(action).toHaveCSS("transition-duration", "0.3s");
      await expect(action).toHaveCSS("transition-timing-function", "ease");
      await expect(action).toHaveCSS("outline-style", "none");
      await expect(action).toHaveCSS("position", "relative");
      await expect(action).toHaveCSS("margin-bottom", "0px");
      await expect(action).toHaveCSS("margin-left", "0px");
      await expect(action).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px");
      await expect(action).toHaveCSS("z-index", "2");

      await action.hover();
      await expect(action).toHaveCSS("background-color", "rgb(177, 52, 39)");
      await expect(action).toHaveCSS("border-color", "rgb(177, 52, 39)");
      await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
      await action.focus();
      await expect(action).toHaveCSS("background-color", "rgb(177, 52, 39)");
      await expect(action).toHaveCSS("border-color", "rgb(177, 52, 39)");
      await expect(action).toHaveCSS("text-decoration-line", "none");
      const actionBox = await action.boundingBox();
      expect(actionBox).not.toBeNull();
      await page.mouse.move(
        actionBox!.x + actionBox!.width / 2,
        actionBox!.y + actionBox!.height / 2,
      );
      await page.mouse.down();
      await expect(action).toHaveCSS("background-color", "rgb(201, 52, 38)");
      await expect(action).toHaveCSS("border-color", "rgb(177, 52, 39)");
      await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
      await page.mouse.up();

      const box = await firstRow.evaluate((row) => {
        const list = row.parentElement!.getBoundingClientRect();
        const rowBox = row.getBoundingClientRect();
        const projectName = row
          .querySelector('[data-stylex-owner="site-project-list-project-name"]')!
          .getBoundingClientRect();
        const deleteAction = row
          .querySelector('[data-stylex-owner="site-project-list-delete-action"]')!
          .getBoundingClientRect();
        return {
          action: {
            bottom: deleteAction.bottom,
            left: deleteAction.left,
            right: deleteAction.right,
            top: deleteAction.top,
          },
          list: { bottom: list.bottom, left: list.left, right: list.right, top: list.top },
          name: {
            bottom: projectName.bottom,
            left: projectName.left,
            right: projectName.right,
            top: projectName.top,
          },
          row: {
            bottom: rowBox.bottom,
            left: rowBox.left,
            right: rowBox.right,
            top: rowBox.top,
          },
        };
      });
      const widths = await page.evaluate(() => ({
        document: document.documentElement.scrollWidth,
        pageWrap: document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-project-list-page-wrap-outer"]',
        )!.scrollWidth,
      }));
      for (const child of [box.name, box.action]) {
        expect(child.left).toBeGreaterThanOrEqual(box.row.left - 1);
        expect(child.right).toBeLessThanOrEqual(
          viewport.name === "mobile" ? widths.document + 1 : box.row.right + 1,
        );
        expect(child.top).toBeGreaterThanOrEqual(box.row.top - 1);
        expect(child.bottom).toBeLessThanOrEqual(box.row.bottom + 1);
      }
      expect(box.row.left).toBeGreaterThanOrEqual(box.list.left - 1);
      expect(box.row.right).toBeLessThanOrEqual(box.list.right + 1);
      expect(box.list.right).toBeLessThanOrEqual(widths.document + 1);
      if (viewport.name === "desktop") {
        expect(widths.document).toBeLessThanOrEqual(viewport.width);
        expect(widths.pageWrap).toBeLessThanOrEqual(viewport.width);
      }
      expect((await container.screenshot()).byteLength).toBeGreaterThan(0);

      const equivalence = await container.evaluate((list) => {
        const projectName = list.querySelector<HTMLElement>(
          '[data-stylex-owner="site-project-list-project-name"]',
        )!;
        const deleteAction = list.querySelector<HTMLElement>(
          '[data-stylex-owner="site-project-list-delete-action"]',
        )!;
        const pageWrap = document.querySelector<HTMLElement>(
          '[data-stylex-owner="site-project-list-page-wrap-outer"]',
        )!;
        const rect = (element: Element) => {
          const box = element.getBoundingClientRect();
          return {
            bottom: box.bottom,
            height: box.height,
            left: box.left,
            right: box.right,
            top: box.top,
            width: box.width,
          };
        };
        const capture = () => {
          const containerStyle = getComputedStyle(list);
          const nameStyle = getComputedStyle(projectName);
          const actionStyle = getComputedStyle(deleteAction);
          return {
            boxes: {
              action: rect(deleteAction),
              list: rect(list),
              name: rect(projectName),
            },
            styles: {
              action: {
                backgroundColor: actionStyle.backgroundColor,
                borderColor: actionStyle.borderColor,
                borderRadius: actionStyle.borderRadius,
                borderStyle: actionStyle.borderStyle,
                borderWidth: actionStyle.borderWidth,
                boxShadow: actionStyle.boxShadow,
                color: actionStyle.color,
                cursor: actionStyle.cursor,
                display: actionStyle.display,
                fontSize: actionStyle.fontSize,
                lineHeight: actionStyle.lineHeight,
                marginBottom: actionStyle.marginBottom,
                marginLeft: actionStyle.marginLeft,
                outlineStyle: actionStyle.outlineStyle,
                padding: actionStyle.padding,
                position: actionStyle.position,
                textAlign: actionStyle.textAlign,
                textDecorationLine: actionStyle.textDecorationLine,
                textShadow: actionStyle.textShadow,
                transitionDuration: actionStyle.transitionDuration,
                transitionProperty: actionStyle.transitionProperty,
                transitionTimingFunction: actionStyle.transitionTimingFunction,
                verticalAlign: actionStyle.verticalAlign,
                whiteSpace: actionStyle.whiteSpace,
                zIndex: actionStyle.zIndex,
              },
              container: { listStyleType: containerStyle.listStyleType },
              name: { fontSize: nameStyle.fontSize, fontWeight: nameStyle.fontWeight },
            },
            widths: {
              document: document.documentElement.scrollWidth,
              pageWrap: pageWrap.scrollWidth,
            },
          };
        };

        const migrated = capture();
        const setting = list.closest<HTMLElement>(
          '[data-stylex-owner="site-project-list-setting-wrap"]',
        )!;
        const originalSettingClassName = setting.className;
        setting.classList.add("site-setting-wrap");
        for (const owner of [list, ...list.querySelectorAll<HTMLElement>("[data-stylex-owner]")]) {
          const ownerName = owner.getAttribute("data-stylex-owner");
          if (
            ownerName !== "site-project-list-container" &&
            ownerName !== "site-project-list-project-name" &&
            ownerName !== "site-project-list-delete-action"
          ) {
            continue;
          }
          for (const token of Array.from(owner.classList)) {
            if (token.startsWith("x")) owner.classList.remove(token);
          }
          if (ownerName === "site-project-list-container") owner.classList.add("project-list-wrap");
          if (ownerName === "site-project-list-project-name") owner.classList.add("project-name");
          if (ownerName === "site-project-list-delete-action") {
            owner.classList.add("ybtn", "ybtn-danger");
          }
        }

        const fallback = capture();
        setting.className = originalSettingClassName;
        return { fallback, migrated };
      });
      expect(equivalence.fallback.styles).toEqual(equivalence.migrated.styles);
      for (const owner of ["list", "name", "action"] as const) {
        for (const edge of ["top", "right", "bottom", "left", "width", "height"] as const) {
          expect(equivalence.fallback.boxes[owner][edge]).toBeCloseTo(
            equivalence.migrated.boxes[owner][edge],
            1,
          );
        }
      }
      expect(equivalence.fallback.widths.document).toBeCloseTo(
        equivalence.migrated.widths.document,
        0,
      );
      expect(equivalence.fallback.widths.pageWrap).toBeCloseTo(
        equivalence.migrated.widths.pageWrap,
        0,
      );
    });
  }

  test("isolates new generated classes to the three residual owners", async ({ page }) => {
    const container = await openPopulatedProjectList(page);
    const newOwnerClasses = await container.evaluate((list) => {
      const residualOwners = new Set([
        "site-project-list-container",
        "site-project-list-project-name",
        "site-project-list-delete-action",
      ]);
      return [list, ...list.querySelectorAll("*")]
        .filter((element) => residualOwners.has(element.getAttribute("data-stylex-owner") ?? ""))
        .map((element) => ({
          generated: Array.from(element.classList).filter((token) => token.startsWith("x")),
          owner: element.getAttribute("data-stylex-owner"),
        }));
    });

    expect(newOwnerClasses).toHaveLength(5);
    expect(newOwnerClasses.every(({ generated }) => generated.length > 0)).toBe(true);
    expect(new Set(newOwnerClasses.map(({ owner }) => owner))).toEqual(
      new Set([
        "site-project-list-container",
        "site-project-list-project-name",
        "site-project-list-delete-action",
      ]),
    );
  });
});
