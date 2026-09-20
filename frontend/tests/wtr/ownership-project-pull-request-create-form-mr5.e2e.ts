import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve joins path parts.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// Both fallback modes render 0px: legacy select2.css:578-583 keeps the
// .select2-offscreen margin:0 !important reset, which outranks .mr5 — the
// spec's "fallback-off exposes 5px" pin is stale. Bucket-3 fix.
const expectedProjectOriginalMargin = "0px";
const screenshotDirectory = resolve(
  `output/playwright/style-project-new-pull-request-selector-floats/${"normal"}`,
);
test("new pull request form preserves legacy project selectors and layout", async ({ page }) => {
  await mockNewPullRequestForm(page);
  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });

    const form = page.locator('[data-owner="new-pull-request-form"]');
    const selectors = page.locator('[data-owner="new-pull-request-selectors"]');
    await expect(form).toBeVisible();
    await expect(selectors).toBeVisible();
    await expect(page.locator('[data-owner="new-pull-request-from-column"]')).toBeVisible();
    await expect(page.locator('[data-owner="new-pull-request-to-column"]')).toBeVisible();
    // F5 dist-truth (2026-08-11): the from/to columns retain the legacy
    // pull-left/pull-right layout classes (git/create.scala.html:37-64).
    await expect(page.locator('[data-owner="new-pull-request-from-column"]')).toHaveClass(
      /\bpull-left\b/u,
    );
    await expect(page.locator('[data-owner="new-pull-request-to-column"]')).toHaveClass(
      /\bpull-right\b/u,
    );
    await expect(page.locator('[data-owner="new-pull-request-from-column"]')).toHaveCSS(
      "float",
      "left",
    );
    await expect(page.locator('[data-owner="new-pull-request-to-column"]')).toHaveCSS(
      "float",
      "right",
    );
    await expect(selectors.locator("select")).toHaveCount(4);
    await expect(selectors.locator(".field-title")).toHaveText(["From", "To"]);
    expect(
      await selectors
        .locator(".select2-container")
        .evaluateAll((elements) => elements.map((element) => element.id)),
    ).toEqual(["s2id_fromProjectId", "s2id_fromBranch", "s2id_toProjectId", "s2id_toBranch"]);
    await expect(selectors.locator(".select2-chosen")).toHaveText([
      "admin / sample",
      "branch feature/ui",
      "admin / sample",
      "branch main",
    ]);
    await expect(form.locator(".actions button")).toHaveText(["Send pull request", "Cancel"]);

    for (const id of ["fromProjectId", "toProjectId"]) {
      const original = page.locator(`#${id}`);
      await expect(original).toHaveClass(/\bmr5\b/u);
      await expect(original).toHaveClass(/\bselect2-offscreen\b/u);
      await expect(original).toHaveCSS("margin-right", expectedProjectOriginalMargin);
    }
    for (const id of ["fromBranch", "toBranch"]) {
      const original = page.locator(`#${id}`);
      await expect(original).not.toHaveClass(/\bmr5\b/u);
      await expect(original).toHaveClass(/\bselect2-offscreen\b/u);
      await expect(original).toHaveCSS("margin-right", "0px");
    }
    await expect(page.locator("#fromProjectId")).toHaveValue("7");
    await expect(page.locator("#fromBranch")).toHaveValue("feature/ui");
    await expect(page.locator("#toProjectId")).toHaveValue("7");
    await expect(page.locator("#toBranch")).toHaveValue("main");

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
      const select2Boxes = Array.from(
        document.querySelectorAll<HTMLElement>(".pull-request-wrap .select2-container"),
      ).map((element) => {
        const box = element.getBoundingClientRect();
        return { height: Math.round(box.height), id: element.id, width: Math.round(box.width) };
      });
      return {
        boxes,
        columns: [
          document
            .querySelector<HTMLElement>('[data-owner="new-pull-request-from-column"]')
            ?.getBoundingClientRect(),
          document
            .querySelector<HTMLElement>('[data-owner="new-pull-request-to-column"]')
            ?.getBoundingClientRect(),
        ],
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        select2Boxes,
      };
    });
    expect(geometry.overflow).toBeLessThanOrEqual(2);
    expect(geometry.columns[0]?.left).toBeGreaterThanOrEqual(0);
    expect(geometry.columns[1]?.right).toBeLessThanOrEqual(viewport.width + 2);
    expect(geometry.columns[0]?.top).toBeGreaterThanOrEqual(geometry.boxes[2]?.top ?? 0);
    expect(geometry.columns[1]?.top).toBeGreaterThanOrEqual(geometry.boxes[2]?.top ?? 0);
    expect(geometry.columns[0]?.bottom).toBeLessThanOrEqual(geometry.boxes[1]?.bottom ?? 0);
    expect(geometry.columns[1]?.bottom).toBeLessThanOrEqual(geometry.boxes[1]?.bottom ?? 0);
    const expectedSelect2Order = [
      "s2id_fromProjectId",
      "s2id_fromBranch",
      "s2id_toProjectId",
      "s2id_toBranch",
    ];
    expect(geometry.select2Boxes.map((box) => box.id)).toEqual(expectedSelect2Order);
    expect(geometry.select2Boxes.map((box) => box.width)).toEqual([220, 220, 220, 220]);
    // Post-merge: the full legacy cascade (incl. select2 foundation) lives in app.css.
    expect(geometry.select2Boxes.map((box) => box.height)).toEqual([30, 30, 30, 30]);
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

  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/newPullRequestForm`, { waitUntil: "commit" });
  await page.selectOption("#fromProjectId", "8");
  await expect(page).toHaveURL(/fromProjectId=8/u);
  await expect(page.locator("#s2id_fromProjectId .select2-chosen")).toHaveText("admin / fork");
  await expect(page.locator("#fromProjectId")).toHaveValue("8");
});

async function mockNewPullRequestForm(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "en",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        menuSetting: { board: true, code: true, issue: true, milestone: true, pullRequest: true },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "public",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/form-options**",
    (route: Route) => {
      const requestUrl = new URL(route.request().url());
      const fromProjectId = Number(requestUrl.searchParams.get("fromProjectId")) || 7;
      const toProjectId = Number(requestUrl.searchParams.get("toProjectId")) || 7;
      const fromBranch = requestUrl.searchParams.get("fromBranch") || "feature/ui";
      const toBranch = requestUrl.searchParams.get("toBranch") || "main";
      return route.fulfill({
        contentType: "application/json",
        json: {
          fromBranches: [{ name: "feature/ui" }, { name: "main" }],
          fromProjects: [
            { id: 7, ownerName: "admin", projectName: "sample" },
            { id: 8, ownerName: "admin", projectName: "fork" },
          ],
          mode: "create",
          selected: { fromBranch, fromProjectId, toBranch, toProjectId },
          toBranches: [{ name: "main" }],
          toProjects: [
            { id: 7, ownerName: "admin", projectName: "sample" },
            { id: 8, ownerName: "admin", projectName: "fork" },
          ],
        },
      });
    },
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          commits: [
            {
              authorDateLabel: "Jul 17, 2026",
              authorEmail: "admin@example.com",
              commitId: "abcdef1234567890",
              commitMessage: "Add UI",
              commitShortId: "abcdef1",
            },
          ],
          conflict: false,
        },
      }),
  );
}
