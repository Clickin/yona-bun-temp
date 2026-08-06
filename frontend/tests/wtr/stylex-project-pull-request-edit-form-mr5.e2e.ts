import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths; fileURLToPath yields the served URL
// pathname so string mapping + .txt raw-suffix applies.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("output/playwright/stylex-project-pull-request-edit-form-mr5");
const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("pull request edit form owns mr5 only on disabled project selects", async ({ page }) => {
  const routeSource = source(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/editform.tsx",
  );
  const styleSource = source(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-editform.stylex.ts",
  );
  const legacy = source("../../yona-original/app/views/git/edit.scala.html");
  const commonLess = source("../../yona-original/app/assets/stylesheets/less/_common.less");
  const pageLess = source("../../yona-original/app/assets/stylesheets/less/_page.less");
  const responsiveLess = source("../../yona-original/app/assets/stylesheets/less/_responsive.less");
  const bootstrapCss = source("../../yona-original/public/bootstrap/css/bootstrap.css");
  const bootstrapResponsiveCss = source(
    "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  );
  const yobiLess = source("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = source("../../yona-original/conf/messages");
  const pullRequestPageLess = pageLess.split("\n").slice(5458, 5478).join("\n");

  expect(legacy).toContain(
    '<select id="fromProjectId" name="fromProjectId" data-toggle="select2" class="mr5" disabled>',
  );
  expect(legacy).toContain(
    '<select id="toProjectId" name="toProjectId" data-toggle="select2" class="mr5" disabled>',
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
  expect(responsiveLess).toContain("@media all and (max-width: 720px) {");
  expect(responsiveLess).toContain('input[type="text"],');
  expect(responsiveLess).toContain(".project-selects {");
  expect(bootstrapCss).toContain("button,\ninput,\nselect,\ntextarea {\n  margin: 0;");
  expect(bootstrapCss).toContain("input::-moz-focus-inner");
  expect(bootstrapResponsiveCss).toContain("@media (max-width: 767px) {");
  expect(bootstrapResponsiveCss).toContain(".row-fluid {");
  expect(bootstrapResponsiveCss).toContain(".input-block-level {");
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
    "button.save = Save",
    "common.attach.attachIfYouSave = Selected file will be attached when your comment is saved.",
    "common.attach.clickbutton = Click upload button",
    "common.attach.drophere = Drag & Drop files to attach here or",
    "common.attach.pastehere = Paste the clipboard image",
    "common.editor.edit = Edit",
    "common.editor.preview = Preview",
    "pullRequest.from = From",
    "pullRequest.select.branch = Select branch",
    "pullRequest.to = To",
    "title.editPullRequest = Edit pull request",
  ]) {
    expect(messages).toContain(message);
  }

  expect(styleSource).toContain('projectSelect: { marginRight: "5px" }');
  expect(routeSource).toContain("stylex.props(sx.projectSelect)");
  expect(routeSource.match(/\.\.\.stylex\.props\(sx\.projectSelect\)/g)?.length).toBe(2);
  expect(routeSource).toContain('data-stylex-owner="pull-request-edit-from-project-select"');
  expect(routeSource).toContain('data-stylex-owner="pull-request-edit-to-project-select"');
  expect(routeSource).toContain("className={`${stylex.props(sx.projectSelect).className} mr5`}");
  expect(routeSource).not.toContain('data-toggle="select2"');

  await mockEditForm(page);
  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`, { waitUntil: "commit" });

    const form = page.locator('[data-stylex-owner="pull-request-edit-form"]');
    const selectors = page.locator('[data-stylex-owner="pull-request-edit-selectors"]');
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

    for (const [select, owner] of [
      [fromProject, "pull-request-edit-from-project-select"],
      [toProject, "pull-request-edit-to-project-select"],
    ] as const) {
      await expect(select).toHaveClass(/\bmr5\b/u);
      await expect(select).toHaveCSS("margin-right", "5px");
      await expect(select).toHaveAttribute("data-stylex-owner", owner);
      // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
      await expect(select).toBeDisabled();
    }
    for (const select of [fromBranch, toBranch]) {
      await expect(select).not.toHaveClass(/\bmr5\b/u);
      await expect(select).not.toHaveCSS("margin-right", "5px");
      await expect(select).not.toHaveAttribute("data-style-src");
      await expect(select).toBeDisabled();
    }

    await expect(fromProject).toHaveValue("8");
    await expect(fromProject.locator("option:checked")).toHaveText("dev/fork");
    await expect(fromBranch).toHaveValue("feature/ui");
    await expect(fromBranch.locator("option:checked")).toHaveText("feature/ui");
    await expect(toProject).toHaveValue("7");
    await expect(toProject.locator("option:checked")).toHaveText("admin/sample");
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
        "#fromProjectId",
        "#fromBranch",
        "#toProjectId",
        "#toBranch",
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
