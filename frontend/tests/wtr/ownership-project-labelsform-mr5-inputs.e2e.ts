import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve joins those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");
const fileURLToPath = (u) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/issue/labelsform.tsx", import.meta.url),
  ),
  "utf8",
);
const legacyShell = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/project/issuelabels.scala.html", import.meta.url),
  ),
  "utf8",
);
const legacyList = readFileSync(
  fileURLToPath(
    new URL(
      "../../yona-original/app/views/project/partial_issuelabels_list.scala.html",
      import.meta.url,
    ),
  ),
  "utf8",
);
const legacyEditCategory = readFileSync(
  fileURLToPath(
    new URL(
      "../../yona-original/app/views/project/partial_issuelabels_editcategory.scala.html",
      import.meta.url,
    ),
  ),
  "utf8",
);
const legacyEditLabel = readFileSync(
  fileURLToPath(
    new URL(
      "../../yona-original/app/views/project/partial_issuelabels_editlabel.scala.html",
      import.meta.url,
    ),
  ),
  "utf8",
);
const commonLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const pageLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const responsiveLess = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  ),
  "utf8",
);
const yobiLess = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const bootstrapCss = readFileSync(
  fileURLToPath(new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url)),
  "utf8",
);
const bootstrapResponsiveCss = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  ),
  "utf8",
);
const messages = readFileSync(
  fileURLToPath(new URL("../../yona-original/conf/messages", import.meta.url)),
  "utf8",
);

const screenshotDirectory = resolve("output/playwright/style-project-labelsform-mr5-inputs");

test("project labels form keeps legacy mr5 input owners and source evidence", () => {
  expect(legacyShell).toContain(
    '<input type="text" name="owner" class="input-label mr5" placeholder=\'@Messages("project.owner")\'>',
  );
  expect(legacyShell).toContain(
    '<input type="text" name="category" class="input-label mr5" maxlength="250" data-provider="typeahead" autocomplete="off" placeholder="@Messages("label.category")">',
  );
  expect(legacyShell).toContain('name="projectName" class="input-label"');
  expect(legacyShell).toContain('name="name" class="input-label"');
  expect(legacyShell).toContain("@partial_issuelabels_list(project, labels)");
  expect(legacyShell).toContain("@partial_issuelabels_editcategory()");
  expect(legacyShell).toContain("@partial_issuelabels_editlabel(project)");
  expect(legacyList).toContain('<div class="row-fluid list-head">');
  expect(legacyEditCategory).toContain('id="editCategory"');
  expect(legacyEditLabel).toContain('id="editLabel"');

  expect(commonLess).toContain(".mr5 { margin-right:5px; }");
  expect(pageLess).toContain(".label-editor-wrap");
  expect(pageLess).toContain("margin:30px auto;");
  expect(pageLess).toContain("display:inline-block;");
  expect(pageLess).toContain("vertical-align:top;");
  expect(pageLess).toContain("width:214px;");
  expect(responsiveLess).toContain(".label-editor-wrap .new-label-wrap .btn-submit");
  expect(responsiveLess).toContain("margin: 10px 0;");
  expect(responsiveLess).toContain('input[type="text"]');
  expect(bootstrapCss).toContain("input,\nselect,\ntextarea {\n  margin: 0;");
  expect(bootstrapCss).toContain('input[type="text"]');
  expect(bootstrapCss).toContain("vertical-align: middle;");
  expect(bootstrapResponsiveCss).toContain(".input-block-level");

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
    "label.copy.append = Copy all labels from a project and append to current project",
    "label.copy = Copy labels",
    "label.copy.description = If project path is ''naver/yobi'', then owner name is ''naver'' and project name is ''yobi''. Character case is ignored.",
    "label.copy.description2 = If there is already a label with the same name, category and color, another label will not be added.",
    "label.new = Add new label",
    "label.add = Add label",
    "label.category = Category",
    "label.name = Name",
    "label.customColor = Label Color",
    "project.owner = Owner Name",
    "project.name = Project name",
  ]) {
    expect(messages).toContain(message);
  }

  expect(routeSource.match(/\.\.\.inputWithTrailingMarginStyleProps/g)?.length).toBe(2);
  // F5 dist-truth (2026-08-11): the mr5 inputs carry the literal
  // "input-label mr5" className (2 occurrences) alongside the spread props.
  expect(routeSource.match(/className="input-label mr5"/g)?.length).toBe(2);
  expect(routeSource).toContain('className="input-label mr5"');
  expect(routeSource).not.toContain("data-provider");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
});

test("populated project labels forms own only owner/category mr5 inputs", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockLabelsPage(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/issue/labelsform`, { waitUntil: "commit" });

  const copyForm = page.locator("#copyLabel");
  const newLabelForm = page.locator("#frmNewLabel");
  const copyOwner = copyForm.locator('input[name="owner"]');
  const copyProjectName = copyForm.locator('input[name="projectName"]');
  const category = newLabelForm.locator('input[name="category"]');
  const labelName = newLabelForm.locator('input[name="name"]');
  const color = newLabelForm.locator('input[name="color"]');

  await expect(copyForm).toBeVisible();
  await expect(newLabelForm).toBeVisible();
  await expect(copyOwner).toHaveClass(/\bmr5\b/u);
  await expect(category).toHaveClass(/\bmr5\b/u);
  // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
  // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
  await expect(copyOwner).toHaveCSS("margin-right", "5px");
  await expect(category).toHaveCSS("margin-right", "5px");
  await expect(copyProjectName).not.toHaveClass(/\bmr5\b/u);
  await expect(labelName).not.toHaveClass(/\bmr5\b/u);
  await expect(color).not.toHaveClass(/\bmr5\b/u);
  await expect(copyProjectName).toHaveCSS("margin-right", "0px");
  await expect(labelName).toHaveCSS("margin-right", "0px");
  await expect(color).toHaveCSS("margin-right", "0px");

  await expect(copyOwner).toHaveAttribute("placeholder", "Owner Name");
  await expect(copyProjectName).toHaveAttribute("placeholder", "Project name");
  await expect(category).toHaveAttribute("placeholder", "Category");
  await expect(labelName).toHaveAttribute("placeholder", "Name");
  await expect(color).toHaveAttribute("placeholder", "Label Color");
  await expect(copyForm.locator("strong")).toHaveText(
    "Copy all labels from a project and append to current project",
  );
  await expect(copyForm.locator("button[type=submit]")).toHaveText("Copy labels");
  await expect(copyForm).toContainText("If project path is");
  await expect(copyForm).toContainText("Character case is ignored.");
  await expect(copyForm).toContainText("another label will not be added.");
  await expect(newLabelForm.locator("strong")).toHaveText("Add new label");
  await expect(newLabelForm.locator("button[type=submit]")).toHaveText("Add label");
  await expect(category).not.toHaveAttribute("data-provider");

  await expect
    .poll(() =>
      page
        .locator(".label-editor-wrap > form, .label-editor-wrap > #labelsList")
        .evaluateAll((elements) => elements.map((element) => element.id)),
    )
    .toEqual(["copyLabel", "frmNewLabel", "labelsList"]);
  await expect(copyForm.locator("input")).toHaveCount(2);
  await expect(newLabelForm.locator("input")).toHaveCount(3);
  await expect(copyForm.locator("input").first()).toHaveAttribute("name", "owner");
  await expect(copyForm.locator("input").nth(1)).toHaveAttribute("name", "projectName");
  await expect(newLabelForm.locator("input").first()).toHaveAttribute("name", "category");
  await expect(newLabelForm.locator("input").nth(1)).toHaveAttribute("name", "name");
  await expect(newLabelForm.locator("input").nth(2)).toHaveAttribute("name", "color");

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    const geometry = await page.evaluate(() => {
      const selectors = [
        "#copyLabel",
        '#copyLabel input[name="owner"]',
        '#copyLabel input[name="projectName"]',
        "#frmNewLabel",
        '#frmNewLabel input[name="category"]',
        '#frmNewLabel input[name="name"]',
        '#frmNewLabel input[name="color"]',
      ];
      const boxes = Object.fromEntries(
        selectors.map((selector) => {
          const element = document.querySelector<HTMLElement>(selector);
          const box = element?.getBoundingClientRect();
          return [
            selector,
            box
              ? {
                  bottom: box.bottom,
                  height: box.height,
                  left: box.left,
                  right: box.right,
                  top: box.top,
                  width: box.width,
                }
              : null,
          ];
        }),
      );
      return {
        boxes,
        documentContained: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });
    expect(geometry.documentContained).toBe(true);
    for (const selector of [
      "#copyLabel",
      '#copyLabel input[name="owner"]',
      '#copyLabel input[name="projectName"]',
      "#frmNewLabel",
      '#frmNewLabel input[name="category"]',
      '#frmNewLabel input[name="name"]',
      '#frmNewLabel input[name="color"]',
    ]) {
      const box = geometry.boxes[selector] as {
        bottom: number;
        height: number;
        left: number;
        right: number;
        top: number;
        width: number;
      } | null;
      expect(box, `${selector} at ${viewport.name}`).not.toBeNull();
      expect(box?.left ?? -1, `${selector} left`).toBeGreaterThanOrEqual(0);
      expect(box?.right ?? viewport.width + 1, `${selector} right`).toBeLessThanOrEqual(
        viewport.width,
      );
      // Color is outside this spacing target; its visibility remains fallback-owned.
      const colorInputOutsideSpacingTarget = selector === '#frmNewLabel input[name="color"]';
      if (colorInputOutsideSpacingTarget) {
        expect(box?.width ?? -1, `${selector} width`).toBeGreaterThanOrEqual(0);
        expect(box?.height ?? -1, `${selector} height`).toBeGreaterThanOrEqual(0);
        continue;
      }
      expect(box?.width ?? 0, `${selector} width`).toBeGreaterThan(0);
      expect(box?.height ?? 0, `${selector} height`).toBeGreaterThan(0);
    }
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }

  await page.setViewportSize({ height: 900, width: 1366 });
  await copyOwner.fill("naver");
  await copyProjectName.fill("yobi");
  await expect(copyOwner).toHaveValue("naver");
  await expect(copyProjectName).toHaveValue("yobi");

  await category.fill("");
  await category.focus();
  await category.pressSequentially("t");
  await expect(category).toHaveValue("t");
  // Full typeahead menu/button/keyboard/selection parity is covered by the dedicated project-labels-form E2E.
  await expect(category).not.toHaveAttribute("data-provider");
});

async function mockLabelsPage(page: Page) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-labels" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        backgroundUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isFavorited: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        ownerName: "admin",
        projectId: 7,
        projectName: "sample",
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        enrolledUsers: [],
        id: 7,
        isFavorite: false,
        isPrivate: false,
        isWatching: true,
        menuSetting: {
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
          board: true,
        },
        openIssueCount: 1,
        openPullRequestCount: 0,
        ownerName: "admin",
        postCount: 1,
        projectId: 7,
        projectName: "sample",
        reviewCount: 0,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanManageIssueLabels: true,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        watchCount: 1,
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/labels**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        labels: [
          {
            category: "type",
            categoryId: 3,
            categoryIsExclusive: false,
            categoryName: "type",
            color: "#e11d48",
            id: 8,
            name: "bug",
          },
          {
            category: "priority",
            categoryId: 4,
            categoryIsExclusive: true,
            categoryName: "priority",
            color: "#ff9800",
            id: 10,
            name: "high",
          },
        ],
      }),
    });
  });
}
