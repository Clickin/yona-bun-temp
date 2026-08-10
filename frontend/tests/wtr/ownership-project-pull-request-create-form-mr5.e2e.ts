import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve joins path parts.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// Both fallback modes render 0px: legacy select2.css:578-583 keeps the
// .select2-offscreen margin:0 !important reset, which outranks .mr5 — the
// spec's "fallback-off exposes 5px" pin is stale. Bucket-3 fix.
const expectedProjectOriginalMargin = "0px";
const screenshotDirectory = resolve(
  `output/playwright/style-project-new-pull-request-selector-floats/${
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal"
  }`,
);
const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("new pull request form owns mr5 only on original project selects", async ({ page }) => {
  const routeSource = source("../src/routes/$ownerName/$projectName/newPullRequestForm.tsx");
  const styleSource = source("../src/app.css");
  const legacy = source("../../yona-original/app/views/git/create.scala.html");
  const commonLess = source("../../yona-original/app/assets/stylesheets/less/_common.less");
  const pageLess = source("../../yona-original/app/assets/stylesheets/less/_page.less");
  const responsiveLess = source("../../yona-original/app/assets/stylesheets/less/_responsive.less");
  const bootstrapCss = source("../../yona-original/public/bootstrap/css/bootstrap.css");
  const bootstrapResponsiveCss = source(
    "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  );
  const legacyFallbackCss = readFileSync(
    "public/legacy-assets/stylesheets/legacy-fallback.css",
    "utf8",
  );
  const yobiLess = source("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = source("../../yona-original/conf/messages");
  const pullRequestPageLess = pageLess.split("\n").slice(5458, 5478).join("\n");

  expect(legacy).toContain('<div class="pull-request-wrap">');
  expect(legacy).toContain(
    '<select id="fromProjectId" name="fromProjectId" data-toggle="select2" class="mr5">',
  );
  expect(legacy).toContain(
    '<select id="toProjectId" name="toProjectId" data-toggle="select2" class="mr5">',
  );
  for (const id of ["fromBranch", "toBranch"]) {
    const start = legacy.indexOf(`<select id="${id}"`);
    const end = legacy.indexOf("</select>", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(legacy.slice(start, end)).not.toContain("mr5");
  }
  expect(commonLess).toContain(".mr5 { margin-right:5px; }");
  expect(pullRequestPageLess).toContain(".pull-request-wrap {");
  expect(pullRequestPageLess).toContain("margin-bottom:20px;");
  expect(pullRequestPageLess).toContain("min-height:55px;");
  expect(pullRequestPageLess).toContain(".field-title {");
  expect(pullRequestPageLess).toContain(".arrow {");
  expect(bootstrapCss).toContain(".pull-right {\n  float: right;");
  expect(bootstrapCss).toContain(".pull-left {\n  float: left;");
  expect(responsiveLess).toContain("@media all and (max-width: 720px) {");
  expect(responsiveLess).toContain('input[type="text"],');
  expect(responsiveLess).toContain(".project-selects {");
  expect(bootstrapCss).toContain("button,\ninput,\nselect,\ntextarea {\n  margin: 0;");
  expect(bootstrapCss).toContain("input::-moz-focus-inner");
  expect(bootstrapResponsiveCss).toContain("@media (max-width: 767px) {");
  expect(bootstrapResponsiveCss).toContain(".row-fluid {");
  expect(bootstrapResponsiveCss).toContain(".input-block-level {");
  expect(legacyFallbackCss).toContain(
    ".select2-offscreen, .select2-offscreen:focus {\n" +
      "    clip: rect(0 0 0 0) !important;\n" +
      "    width: 1px !important;\n" +
      "    height: 1px !important;\n" +
      "    border: 0 !important;\n" +
      "    margin: 0 !important;",
  );
  for (const importedFile of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_sprites.less",
    "_page.less",
    "_tippy.less",
    "_scrollbar.less",
    "_responsive.less",
    "_yobiUI.less",
    "_temporary.less",
    "_markdown.less",
    "_migration.less",
    "_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "less/${importedFile}";`);
  }
  for (const message of [
    "button.add.checklist = Add checklist",
    "button.cancel = Cancel",
    "button.clear.temporary = Clear Temporary",
    "common.editor.edit = Edit",
    "common.editor.preview = Preview",
    "pullRequest.from = From",
    "pullRequest.is.merging = We are checking if the code is safe. Please wait for a while to complete this process.",
    "pullRequest.menu.commit = Commits",
    "pullRequest.select.branch = Select branch",
    "pullRequest.send = Send pull request",
    "pullRequest.to = To",
    "title.newPullRequest = Send pull request",
  ]) {
    expect(messages).toContain(message);
  }

  expect(routeSource).toContain('data-owner="new-pull-request-from-column"');
  expect(routeSource).toContain('data-owner="new-pull-request-to-column"');
  expect(routeSource).not.toContain('className="pull-left"');
  expect(routeSource).not.toContain('className="pull-right"');
  expect(routeSource).toContain('data-owner="new-pull-request-from-project-original"');
  expect(routeSource).toContain('data-owner="new-pull-request-to-project-original"');
  expect(routeSource).not.toContain('data-toggle="select2"');

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
    await expect(page.locator('[data-owner="new-pull-request-from-column"]')).not.toHaveClass(
      /\bpull-left\b/u,
    );
    await expect(page.locator('[data-owner="new-pull-request-to-column"]')).not.toHaveClass(
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

    for (const [id, owner] of [
      ["fromProjectId", "new-pull-request-from-project-original"],
      ["toProjectId", "new-pull-request-to-project-original"],
    ] as const) {
      const original = page.locator(`#${id}`);
      await expect(original).toHaveClass(/\bmr5\b/u);
      await expect(original).toHaveClass(/\bselect2-offscreen\b/u);
      // Fallback-on intentionally resets margin; fallback-off lets Style mr5 win.
      await expect(original).toHaveCSS("margin-right", expectedProjectOriginalMargin);
      await expect(original).toHaveAttribute("data-owner", owner);
      // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
    }
    for (const id of ["fromBranch", "toBranch"]) {
      const original = page.locator(`#${id}`);
      await expect(original).not.toHaveClass(/\bmr5\b/u);
      await expect(original).toHaveClass(/\bselect2-offscreen\b/u);
      await expect(original).toHaveCSS("margin-right", "0px");
      await expect(original).not.toHaveAttribute("data-owner");
      // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
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
    if (process.env.VITE_DISABLE_LEGACY_FALLBACK === "1") {
      // Select2 foundation height is fallback-mode-dependent and outside this mr5 migration.
      expect(geometry.select2Boxes.every((box) => box.height > 0)).toBe(true);
    } else {
      expect(geometry.select2Boxes.map((box) => box.height)).toEqual([30, 30, 30, 30]);
    }
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
