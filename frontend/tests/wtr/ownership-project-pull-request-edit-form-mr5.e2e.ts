import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem; screenshot paths are served by the runner.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/style-project-pull-request-edit-form-mr5");

test("pull request edit keeps disabled project picker spacing on desktop and mobile", async ({
  page,
}) => {
  await mockEditForm(page);
  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`, { waitUntil: "commit" });

    const form = page.locator('[data-owner="pull-request-edit-form"]');
    const selectors = page.locator('[data-owner="pull-request-edit-selectors"]');
    const fromProject = page.locator("#fromProjectId");
    const fromBranch = page.locator("#fromBranch");
    const toProject = page.locator("#toProjectId");
    const toBranch = page.locator("#toBranch");
    await expect(form).toBeVisible();
    await expect(selectors).toBeVisible();
    await expect(selectors.locator("select")).toHaveCount(4);
    await expect(selectors.locator(".field-title")).toHaveText(["From", "To"]);
    expect(
      await selectors
        .locator("select")
        .evaluateAll((elements) => elements.map((element) => element.id)),
    ).toEqual(["fromProjectId", "fromBranch", "toProjectId", "toBranch"]);

    // Select2 transfers mr5 to its visible container; the offscreen backing select has no margin.
    for (const id of ["fromProjectId", "toProjectId"]) {
      const picker = page.locator(`#s2id_${id}`);
      await expect(picker).toBeVisible();
      await expect(picker).toHaveCSS("margin-right", "5px");
      await expect(picker.locator(".select2-choice")).toBeDisabled();
    }
    for (const id of ["fromBranch", "toBranch"]) {
      const picker = page.locator(`#s2id_${id}`);
      await expect(picker).toBeVisible();
      await expect(picker).toHaveCSS("margin-right", "0px");
      await expect(picker.locator(".select2-choice")).toBeDisabled();
    }

    await expect(fromProject).toHaveValue("8");
    await expect(fromProject.locator("option:checked")).toHaveText("dev / fork");
    await expect(fromBranch).toHaveValue("feature/ui");
    await expect(fromBranch.locator("option:checked")).toHaveText("feature/ui");
    await expect(toProject).toHaveValue("7");
    await expect(toProject.locator("option:checked")).toHaveText("admin / sample");
    await expect(toBranch).toHaveValue("main");
    await expect(toBranch.locator("option:checked")).toHaveText("main");
    await expect(fromBranch).toHaveAttribute("data-placeholder", "Select branch");
    await expect(toBranch).toHaveAttribute("data-placeholder", "Select branch");
    await expect(selectors.locator('input[type="hidden"]')).toHaveCount(4);
    expect(
      await selectors
        .locator('input[type="hidden"]')
        .evaluateAll((elements) =>
          elements.map((element) => [element.name, (element as HTMLInputElement).value]),
        ),
    ).toEqual([
      ["fromProjectId", "8"],
      ["fromBranch", "feature/ui"],
      ["toProjectId", "7"],
      ["toBranch", "main"],
    ]);
    await expect(page.locator("#title")).toHaveValue("Initial title");
    await expect(page.locator("#editor-body-body")).toHaveValue("Initial body");
    await expect(form.locator(".actions button")).toHaveText(["Save", "Cancel"]);

    const geometry = await page.evaluate(() => {
      const targets = [
        ".content-wrap.frm-wrap",
        "form.nm",
        ".pull-request-wrap",
        "#s2id_fromProjectId",
        "#s2id_fromBranch",
        "#s2id_toProjectId",
        "#s2id_toBranch",
      ];
      const boxes = targets.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        const box = element?.getBoundingClientRect();
        return box
          ? { bottom: box.bottom, left: box.left, right: box.right, top: box.top, width: box.width }
          : null;
      });
      return {
        boxes,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(geometry.overflow).toBeLessThanOrEqual(2);
    for (const [index, box] of geometry.boxes.entries()) {
      expect(box, `geometry target ${index} at ${viewport.name}`).not.toBeNull();
      expect(box?.left ?? -1, `left at ${viewport.name}`).toBeGreaterThanOrEqual(0);
      expect(box?.right ?? viewport.width + 1, `right at ${viewport.name}`).toBeLessThanOrEqual(
        viewport.width + 2,
      );
      expect(box?.width ?? 0, `width at ${viewport.name}`).toBeGreaterThan(0);
      expect(box?.bottom ?? 0, `height at ${viewport.name}`).toBeGreaterThan(box?.top ?? 0);
    }

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockEditForm(page: Page) {
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  for (const url of ["**/auth/session", "**/api/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-token" },
        json: { user: { loginId: "admin" } },
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/7/form-options",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          fromBranches: [{ name: "feature/ui", selected: true }],
          fromProjects: [{ id: 8, ownerName: "dev", projectName: "fork", selected: true }],
          mode: "edit",
          pullRequest: {
            bodyMarkdown: "Initial body",
            fromBranch: "feature/ui",
            fromOwnerName: "dev",
            fromProjectName: "fork",
            id: 90,
            projectName: "sample",
            state: "OPEN",
            title: "Initial title",
          },
          selected: {
            fromBranch: "feature/ui",
            fromProjectId: 8,
            toBranch: "main",
            toProjectId: 7,
          },
          toBranches: [{ name: "main", selected: true }],
          toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
        },
      }),
  );
}
