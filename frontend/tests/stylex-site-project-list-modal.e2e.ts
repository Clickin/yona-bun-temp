import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/projectList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const owners = {
  backdrop: '[data-stylex-owner="site-project-list-delete-modal-backdrop"]',
  body: '[data-stylex-owner="site-project-list-delete-modal-body"]',
  close: '[data-stylex-owner="site-project-list-delete-modal-close"]',
  footer: '[data-stylex-owner="site-project-list-delete-modal-footer"]',
  frame: '[data-stylex-owner="site-project-list-delete-modal"]',
  header: '[data-stylex-owner="site-project-list-delete-modal-header"]',
};
const actionOwners = {
  cancel: '[data-stylex-owner="site-project-list-delete-modal-cancel-action"]',
  confirm: '[data-stylex-owner="site-project-list-delete-modal-confirm-action"]',
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
      headers: { "x-csrf-token": "csrf-site-project-list-modal" },
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
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-site-project-list-modal");
    deletedProjectIds.push("77");
    projects = [];
    await route.fulfill({ contentType: "application/json", json: { deleted: true } });
  });

  await page.goto(`${basePath}/sites/projectList?filter=road`);
  await expect(page.locator('[data-stylex-owner="site-project-list-row"]')).toHaveCount(1);
  return { deletedProjectIds };
}

async function showDeleteModal(page: Page) {
  await page.locator('[data-stylex-owner="site-project-list-delete-action"]').click();
  const modal = page.locator(owners.frame);
  await expect(modal).toBeVisible();
  await expect(page.locator(owners.backdrop)).toBeVisible();
  return modal;
}

test.describe("StyleX site project-list delete modal", () => {
  test("uses exactly six stable presentation owners and global theme variables", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    for (const owner of Object.values(owners)) expect(route).toContain(owner.slice(1, -1));
    for (const style of [
      "deleteModal",
      "deleteModalHeader",
      "deleteModalClose",
      "deleteModalBody",
      "deleteModalFooter",
      "deleteModalBackdrop",
    ]) {
      expect(route).toContain(`styles.${style}`);
    }
    expect(route).toContain("globalBreakpoints.mobile");
    for (const token of [
      "siteProjectListModalPosition",
      "siteProjectListModalDesktopTop",
      "siteProjectListModalMobileTop",
      "siteProjectListModalDesktopLeft",
      "siteProjectListModalMobileLeft",
      "siteProjectListModalDesktopRight",
      "siteProjectListModalMobileRight",
      "siteProjectListModalZIndex",
      "siteProjectListModalDesktopWidth",
      "siteProjectListModalMobileWidth",
      "siteProjectListModalDesktopMarginLeft",
      "siteProjectListModalMobileMarginLeft",
      "siteProjectListModalMobileMarginRight",
      "siteProjectListModalSurface",
      "siteProjectListModalBorder",
      "siteProjectListModalBorderRadius",
      "siteProjectListModalBorderStyle",
      "siteProjectListModalBorderWidth",
      "siteProjectListModalOutline",
      "siteProjectListModalShadow",
      "siteProjectListModalBackgroundClip",
      "siteProjectListModalOpacity",
      "siteProjectListModalTransition",
      "siteProjectListModalHeaderPadding",
      "siteProjectListModalHeaderBorder",
      "siteProjectListModalHeaderBorderStyle",
      "siteProjectListModalHeaderBorderWidth",
      "siteProjectListModalCloseFloat",
      "siteProjectListModalCloseFontSize",
      "siteProjectListModalCloseFontWeight",
      "siteProjectListModalCloseLineHeight",
      "siteProjectListModalCloseText",
      "siteProjectListModalCloseTextShadow",
      "siteProjectListModalCloseOpacity",
      "siteProjectListModalCloseHoverOpacity",
      "siteProjectListModalCloseDesktopPadding",
      "siteProjectListModalCloseMobilePadding",
      "siteProjectListModalCloseDesktopMargin",
      "siteProjectListModalCloseMobileMargin",
      "siteProjectListModalCloseSurface",
      "siteProjectListModalCloseBorderStyle",
      "siteProjectListModalCloseBorderWidth",
      "siteProjectListModalCloseCursor",
      "siteProjectListModalCloseAppearance",
      "siteProjectListModalBodyPosition",
      "siteProjectListModalBodyMaxHeight",
      "siteProjectListModalBodyPadding",
      "siteProjectListModalBodyOverflowY",
      "siteProjectListModalFooterPadding",
      "siteProjectListModalFooterMarginBottom",
      "siteProjectListModalFooterTextAlign",
      "siteProjectListModalFooterSurface",
      "siteProjectListModalFooterBorder",
      "siteProjectListModalFooterBorderStyle",
      "siteProjectListModalFooterBorderWidth",
      "siteProjectListModalFooterRadius",
      "siteProjectListModalFooterShadow",
      "siteProjectListModalBackdropPosition",
      "siteProjectListModalBackdropInset",
      "siteProjectListModalBackdropSurface",
      "siteProjectListModalBackdropOpacity",
      "siteProjectListModalBackdropZIndex",
    ]) {
      expect(route).toContain(`globalColors.${token}`);
      expect(theme).toContain(token);
    }
  });

  test("keeps legacy copy and order while React owns every dismiss path", async ({ page }) => {
    await openProjectList(page);
    const modal = await showDeleteModal(page);
    await expect(modal.locator(`:scope > ${owners.header}`)).toHaveText(
      "×acme/roadmapDelete project",
    );
    await expect(modal.locator(`${owners.body} > p`)).toHaveText(
      "Do you really want to delete this project?",
    );
    await expect(modal.locator(`${owners.footer} > button`)).toHaveText(["Yes", "No"]);
    await expect(modal.locator(actionOwners.confirm)).toHaveCount(1);
    await expect(modal.locator(actionOwners.cancel)).toHaveCount(1);
    await expect(modal.locator(`:scope > ${owners.header} + ${owners.body}`)).toHaveCount(1);
    await expect(modal.locator(`:scope > ${owners.body} + ${owners.footer}`)).toHaveCount(1);

    for (const selector of Object.values(owners)) {
      const owner = page.locator(selector);
      await expect(owner).not.toHaveAttribute("data-toggle", /./);
      await expect(owner).not.toHaveAttribute("data-dismiss", /./);
      await expect(owner).not.toHaveAttribute("data-target", /./);
      await expect(owner).not.toHaveAttribute("data-backdrop", /./);
    }

    await page.locator(owners.close).click();
    await expect(modal).toBeHidden();
    await expect(page.locator(owners.backdrop)).toHaveCount(0);
    await showDeleteModal(page);
    await page.locator(`${owners.footer} > button`, { hasText: "No" }).click();
    await expect(modal).toBeHidden();
    await showDeleteModal(page);
    await page.locator(owners.backdrop).click({ position: { x: 2, y: 2 } });
    await expect(modal).toBeHidden();
  });

  test("confirms through the REST mutation and invalidates the project-list cache", async ({
    page,
  }) => {
    const requests = await openProjectList(page);
    const modal = await showDeleteModal(page);
    await modal.locator("#projectDeleteBtn").click();

    await expect.poll(() => requests.deletedProjectIds).toEqual(["77"]);
    await expect(page.locator('[data-stylex-owner="site-project-list-row"]')).toHaveCount(0);
    await expect(modal).toBeHidden();
    await expect(page.locator(owners.backdrop)).toHaveCount(0);
  });

  test("removes migrated modal and action presentation classes", async ({ page }) => {
    await openProjectList(page);
    const modal = await showDeleteModal(page);
    const classes = await page.evaluate(
      (selectors) =>
        Object.fromEntries(
          Object.entries(selectors).map(([name, selector]) => [
            name,
            Array.from(document.querySelector<HTMLElement>(selector)!.classList),
          ]),
        ) as Record<string, string[]>,
      owners,
    );

    for (const ownerClasses of Object.values(classes)) {
      expect(ownerClasses.some((token) => token.startsWith("x"))).toBe(true);
      expect(ownerClasses).not.toEqual(
        expect.arrayContaining([
          "modal",
          "fade",
          "in",
          "modal-header",
          "close",
          "modal-body",
          "modal-footer",
          "modal-backdrop",
        ]),
      );
    }
    for (const selector of Object.values(actionOwners)) {
      await expect(modal.locator(selector)).not.toHaveClass(/(?:^|\s)ybtn(?:-danger)?(?:\s|$)/);
    }
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} settled paint, geometry, and frozen fallback evidence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openProjectList(page);
      const modal = await showDeleteModal(page);
      const header = page.locator(owners.header);
      const close = page.locator(owners.close);
      const body = page.locator(owners.body);
      const footer = page.locator(owners.footer);
      const backdrop = page.locator(owners.backdrop);

      await expect(modal).toHaveCSS("position", "fixed");
      await expect(modal).toHaveCSS("top", viewport.name === "desktop" ? "90px" : "10px");
      await expect(modal).toHaveCSS("z-index", "1050");
      await expect(modal).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(modal).toHaveCSS("border", "1px solid rgba(0, 0, 0, 0.3)");
      await expect(modal).toHaveCSS("border-radius", "6px");
      await expect(modal).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.3) 0px 3px 7px 0px");
      await expect(modal).toHaveCSS("background-clip", "padding-box");
      await expect(modal).toHaveCSS("opacity", "1");
      await expect(modal).toHaveCSS("transition-duration", "0.3s, 0.3s");
      await expect(header).toHaveCSS("padding", "9px 15px");
      await expect(header).toHaveCSS("border-bottom", "1px solid rgb(238, 238, 238)");
      await expect(close).toHaveCSS("float", "right");
      await expect(close).toHaveCSS("font-size", "20px");
      await expect(close).toHaveCSS("font-weight", "700");
      await expect(close).toHaveCSS("line-height", "20px");
      await expect(close).toHaveCSS("color", "rgb(0, 0, 0)");
      await expect(close).toHaveCSS("text-shadow", "rgb(255, 255, 255) 0px 1px 0px");
      await expect(close).toHaveCSS("opacity", "0.2");
      await expect(close).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(close).toHaveCSS("border-width", "0px");
      await expect(close).toHaveCSS("padding", viewport.name === "desktop" ? "0px" : "10px");
      await expect(close).toHaveCSS(
        "margin",
        viewport.name === "desktop" ? "2px 0px 0px" : "-10px",
      );
      await close.hover();
      await expect(close).toHaveCSS("opacity", "0.4");
      await expect(body).toHaveCSS("position", "relative");
      await expect(body).toHaveCSS("max-height", "400px");
      await expect(body).toHaveCSS("padding", "15px");
      await expect(body).toHaveCSS("overflow-y", "auto");
      await expect(footer).toHaveCSS("padding", "14px 15px 15px");
      await expect(footer).toHaveCSS("margin-bottom", "0px");
      await expect(footer).toHaveCSS("text-align", "right");
      await expect(footer).toHaveCSS("background-color", "rgb(245, 245, 245)");
      await expect(footer).toHaveCSS("border-top", "1px solid rgb(221, 221, 221)");
      await expect(footer).toHaveCSS("border-radius", "0px 0px 6px 6px");
      await expect(footer).toHaveCSS("box-shadow", "rgb(255, 255, 255) 0px 1px 0px 0px inset");
      await expect(backdrop).toHaveCSS("position", "fixed");
      await expect(backdrop).toHaveCSS("inset", "0px");
      await expect(backdrop).toHaveCSS("z-index", "1040");
      await expect(backdrop).toHaveCSS("background-color", "rgb(0, 0, 0)");
      await expect(backdrop).toHaveCSS("opacity", "0.8");

      const boxes = await page.evaluate((selectors) => {
        const rect = (selector: string) => {
          const value = document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
          return {
            bottom: value.bottom,
            height: value.height,
            left: value.left,
            right: value.right,
            top: value.top,
            width: value.width,
          };
        };
        return {
          backdrop: rect(selectors.backdrop),
          body: rect(selectors.body),
          footer: rect(selectors.footer),
          frame: rect(selectors.frame),
          header: rect(selectors.header),
        };
      }, owners);
      expect(boxes.backdrop).toEqual({
        bottom: viewport.height,
        height: viewport.height,
        left: 0,
        right: viewport.width,
        top: 0,
        width: viewport.width,
      });
      expect(boxes.frame.top).toBeCloseTo(viewport.name === "desktop" ? 90 : 10, 0);
      expect(boxes.frame.width).toBeCloseTo(viewport.name === "desktop" ? 562 : 278.625, 0);
      expect(boxes.frame.left).toBeCloseTo(viewport.name === "desktop" ? 403 : 101.375, 0);
      expect(boxes.frame.right).toBeCloseTo(viewport.name === "desktop" ? 965 : 380, 0);
      expect(boxes.header.top).toBeCloseTo(boxes.frame.top + 1, 0);
      expect(boxes.header.bottom).toBeCloseTo(boxes.body.top, 0);
      expect(boxes.body.bottom).toBeCloseTo(boxes.footer.top, 0);
      for (const section of [boxes.header, boxes.body, boxes.footer]) {
        expect(section.left).toBeCloseTo(boxes.frame.left + 1, 0);
        expect(section.right).toBeCloseTo(boxes.frame.right - 1, 0);
      }
      expect((await modal.screenshot()).byteLength).toBeGreaterThan(0);

      const evidence = await page.evaluate((selectors) => {
        const nodes = Object.fromEntries(
          Object.entries(selectors).map(([name, selector]) => [
            name,
            document.querySelector<HTMLElement>(selector)!,
          ]),
        ) as Record<string, HTMLElement>;
        const capture = () => ({
          backdrop: ((style) => ({ opacity: style.opacity, position: style.position }))(
            getComputedStyle(nodes.backdrop),
          ),
          body: ((style) => ({ maxHeight: style.maxHeight, padding: style.padding }))(
            getComputedStyle(nodes.body),
          ),
          footer: ((style) => ({
            backgroundColor: style.backgroundColor,
            borderTop: style.borderTop,
            padding: style.padding,
          }))(getComputedStyle(nodes.footer)),
          frame: ((style) => ({
            backgroundColor: style.backgroundColor,
            border: style.border,
            borderRadius: style.borderRadius,
            position: style.position,
            top: style.top,
          }))(getComputedStyle(nodes.frame)),
          header: ((style) => ({ borderBottom: style.borderBottom, padding: style.padding }))(
            getComputedStyle(nodes.header),
          ),
        });
        const migrated = capture();
        const legacyClasses: Record<string, string[]> = {
          backdrop: ["modal-backdrop", "fade", "in"],
          body: ["modal-body"],
          close: ["close"],
          footer: ["modal-footer"],
          frame: ["modal", "fade", "in"],
          header: ["modal-header"],
        };
        for (const [name, node] of Object.entries(nodes)) {
          for (const token of Array.from(node.classList)) {
            if (token.startsWith("x")) node.classList.remove(token);
          }
          node.classList.add(...legacyClasses[name]!);
        }
        return { fallback: capture(), migrated };
      }, owners);
      expect(evidence.fallback.frame).toEqual(evidence.migrated.frame);
      expect(evidence.fallback.header).toEqual(evidence.migrated.header);
      expect(evidence.fallback.body).toEqual(evidence.migrated.body);
      expect(evidence.fallback.footer).toEqual(evidence.migrated.footer);
      expect(evidence.fallback.backdrop.position).toBe(evidence.migrated.backdrop.position);
      expect(evidence.fallback.backdrop.opacity).toBe(evidence.migrated.backdrop.opacity);
      expect(evidence.fallback.backdrop.opacity).toBe("0.8");
      expect(evidence.migrated.backdrop.opacity).toBe("0.8");
    });
  }

  test("isolates generated modal classes to the eight explicit owners", async ({ page }) => {
    await openProjectList(page);
    await showDeleteModal(page);
    const modalOwnerIds = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll<HTMLElement>(
          '#alertDeletionWrap, #alertDeletionWrap *, [data-stylex-owner="site-project-list-delete-modal-backdrop"]',
        ),
      )
        .filter((element) => Array.from(element.classList).some((token) => token.startsWith("x")))
        .map((element) =>
          element.closest("[data-stylex-owner]")?.getAttribute("data-stylex-owner"),
        ),
    );
    expect(modalOwnerIds).not.toContain(null);
    expect(modalOwnerIds).not.toContain(undefined);
    expect(new Set(modalOwnerIds)).toEqual(
      new Set([
        "site-project-list-delete-modal",
        "site-project-list-delete-modal-header",
        "site-project-list-delete-modal-close",
        "site-project-list-delete-modal-body",
        "site-project-list-delete-modal-footer",
        "site-project-list-delete-modal-backdrop",
        "site-project-list-delete-modal-confirm-action",
        "site-project-list-delete-modal-cancel-action",
      ]),
    );
  });
});
