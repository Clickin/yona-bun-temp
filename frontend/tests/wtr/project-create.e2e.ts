import { expect, test, type Page } from "../wtr-compat.ts";

test("project create preserves legacy form controls and geometry", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);
  await expect(page).toHaveTitle("Create new project");
  expect(await page.evaluate(() => document.head.querySelector("title")?.textContent)).toBe(
    "Create new project",
  );
  await expect(page.locator("#newProjectForm")).toBeVisible();
  await expect(page.locator("#project-owner")).toHaveValue("admin");
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator(".actions.mt20 .ybtn").last()).toHaveAttribute("href", `${basePath}/`);

  const ownerTrigger = page
    .locator('[data-owner="project-form-select"]')
    .first()
    .locator(".select2-choice");
  await expect(ownerTrigger).toBeVisible();
  await expect(ownerTrigger.locator(".name")).toHaveText("admin");
  await expect(ownerTrigger.locator("img")).toHaveAttribute(
    "src",
    `${basePath}/assets/images/default-avatar-32.png`,
  );
  await expect(ownerTrigger.locator("img")).toHaveCSS("width", "20px");
  await expect(ownerTrigger.locator("img")).toHaveCSS("height", "20px");
  expect(await projectCreateMetrics(page)).toMatchObject({
    actionTextAlign: "center",
    actionButtonsContained: true,
    advancedBackground: "rgb(250, 250, 250)",
    advancedBorderRadius: "10px",
    formAction: `${basePath}/projects`,
    formMethod: "post",
    formWidth: 700,
    importLinkContained: true,
    // F5 dist-truth (2026-08-11): the name input spans the full form width.
    inputWidthRatio: 1,
    ownerDataFormat: "user",
    ownerDataToggle: null,
    ownerStyle: "min-width: 220px;",
    vcsDataDropdownCssClass: "select2-without-searchbox",
    vcsDataToggle: null,
    vcsStyle: "min-width: 220px;",
  });
});

test("project create form mirrors legacy owner, VCS, and menu dependencies", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);

  const ownerPicker = page.locator('[data-owner="project-form-select"]').first();
  const vcsPicker = page.locator('[data-owner="project-form-select"]').last();
  await ownerPicker.locator(".select2-choice").click();
  await ownerPicker.locator(".select2-search input").fill("web");
  await expect(ownerPicker.locator(".select2-result-label")).toHaveCount(1);
  await ownerPicker.locator(".select2-result-label").click();
  await expect(ownerPicker.locator(".select2-choice .name")).toHaveText("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await page.locator("#protected").check();
  await ownerPicker.locator(".select2-choice").click();
  await ownerPicker.locator(".select2-result-label").first().click();
  await expect(page.locator("#opt-protected")).toBeHidden();
  await expect(page.locator("#public")).toBeChecked();

  await vcsPicker.locator(".select2-choice").click();
  await vcsPicker.locator(".select2-result-label").last().click();
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeHidden();
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();

  await vcsPicker.locator(".select2-choice").click();
  await vcsPicker.locator(".select2-result-label").first().click();
  await expect(page.locator("#svn")).toBeHidden();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeVisible();
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();

  await page.locator("#menuSettingCode").uncheck();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();

  await page.locator("#menuSettingPullRequest").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();

  await page.locator("#menuSettingReview").check();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
});

test("project create select controls drop delegated select2 option markers only", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);

  const owner = page.locator("#project-owner");
  const vcs = page.locator("#vcs");
  const adminOption = owner.locator('option[value="admin"]');
  const groupOption = owner.locator('option[value="weblabs"]');
  await expect(owner).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(owner).toHaveAttribute("data-format", "user");
  await expect(owner).toHaveAttribute("style", "min-width: 220px;");
  await expect(adminOption).toHaveText("admin");
  await expect(adminOption).not.toHaveAttribute("data-type", /.+/u);
  await expect(adminOption).not.toHaveAttribute("data-avatar-url", /.+/u);
  await expect(groupOption).toHaveText("weblabs");
  await expect(groupOption).not.toHaveAttribute("data-type", /.+/u);
  await expect(groupOption).not.toHaveAttribute("data-avatar-url", /.+/u);
  await expect(vcs).not.toHaveAttribute("data-toggle", /.+/u);
  await expect(vcs).toHaveAttribute("data-dropdown-css-class", "select2-without-searchbox");
  await expect(vcs).toHaveAttribute("style", "min-width: 220px;");

  await owner.selectOption("weblabs");
  await expect(page.locator("#opt-protected")).toBeVisible();
  await vcs.selectOption("SUBVERSION");
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeHidden();
});

test("project create form mirrors legacy project-name blur and validation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);
  let createRequests = 0;
  await page.route("**/api/v1/owners/*/projects", async (route) => {
    createRequests += 1;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerName: "admin",
        projectName: "valid-project",
      }),
    });
  });

  await page.goto(`${basePath}/projectform`);

  await page.locator("#project-name").fill("  project with spaces  ");
  await page.locator("#description").focus();
  await expect(page.locator("#project-name")).toHaveValue("project-with-spaces");

  await page.locator("#project-name").fill(".git");
  await page.locator("#newProjectForm button.ybtn-success").click();
  await expect(page.locator("#newProjectForm .popover-content")).toHaveText(
    "You can't use reserved names.",
  );
  expect(createRequests).toBe(0);

  await page.locator("#project-name").fill("invalid project!");
  await page.locator("#newProjectForm button.ybtn-success").click();
  await expect(page.locator("#newProjectForm .popover-content")).toHaveText(
    "Enter name in alphabetnumerical or symbol characters(_-.)",
  );
  expect(createRequests).toBe(0);
});

test("project create form honors configured default scope and menus", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript((configuredBasePath) => {
    (
      window as Window & {
        __YONA_RUNTIME_CONFIG__?: Record<string, unknown>;
      }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      projectDefaultMenus: ["issue", "board"],
      projectDefaultScope: "private",
    };
  }, basePath);
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);

  await expect(page.locator("#public")).not.toBeChecked();
  await expect(page.locator("#protected")).not.toBeChecked();
  await expect(page.locator("#private")).toBeChecked();
  await expect(page.locator("#menuSettingCode")).not.toBeChecked();
  await expect(page.locator("#menuSettingIssue")).toBeChecked();
  await expect(page.locator("#menuSettingPullRequest")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();
  await expect(page.locator("#menuSettingMilestone")).not.toBeChecked();
  await expect(page.locator("#menuSettingBoard")).toBeChecked();
});

test("project create form restores legacy server validation values", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page, {
    name: "restored-project",
    overview: "Restored overview",
    owner: "weblabs",
    projectScope: "PROTECTED",
    selectedOwnerName: "weblabs",
    vcs: "SUBVERSION",
  });

  await page.goto(`${basePath}/projectform`);

  await expect(page.locator("#project-owner")).toHaveValue("weblabs");
  await expect(page.locator("#project-name")).toHaveValue("restored-project");
  await expect(page.locator("#description")).toHaveValue("Restored overview");
  await expect(page.locator("#protected")).toBeChecked();
  await expect(page.locator("#vcs")).toHaveValue("SUBVERSION");
  await expect(page.locator("#svn")).toBeVisible();
  await expect(page.locator("label[for='menuSettingPullRequest']")).toBeHidden();
  await expect(page.locator("#menuSettingPullRequest")).toBeChecked();
  await expect(page.locator("#newProjectForm legend a.ybtn-small")).toHaveAttribute(
    "href",
    `${basePath}/_import?owner=weblabs`,
  );
});

test("project create import link keeps legacy href and navigates through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);
  const importLink = page.locator("#newProjectForm legend a.ybtn-small");

  await expect(importLink).toHaveAttribute("href", `${basePath}/_import?owner=admin`);
  await expect(importLink).toHaveClass("ybtn ybtn-small nm");
  await expect(importLink).toHaveText("Import Git repository.");

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    (window as Window & { __projectCreateSpaMarker?: string }).__projectCreateSpaMarker = "kept";
  });

  await importLink.click({ noWaitAfter: true });

  await expect(page).toHaveURL(`${basePath}/_import?owner=admin`);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __projectCreateSpaMarker?: string }).__projectCreateSpaMarker,
      ),
    )
    .toBe("kept");
  expect(documentRequests).toEqual([]);
});

test("project create cancel link keeps root navigation and navigates through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockProjectCreate(page);

  await page.goto(`${basePath}/projectform`);
  const cancelLink = page.locator(".actions.mt20 .ybtn").last();

  await expect(cancelLink).toHaveAttribute("href", `${basePath}/`);
  await expect(cancelLink).not.toHaveAttribute("data-status", /.+/u);
  await expect(cancelLink).not.toHaveAttribute("aria-current", /.+/u);

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    (
      window as Window & { __projectCreateCancelSpaMarker?: string }
    ).__projectCreateCancelSpaMarker = "kept";
  });

  await cancelLink.click({ noWaitAfter: true });

  await expect(page).toHaveURL(`${basePath}/`);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __projectCreateCancelSpaMarker?: string })
            .__projectCreateCancelSpaMarker,
      ),
    )
    .toBe("kept");
  expect(documentRequests).toEqual([]);
});

async function mockProjectCreate(page: Page, formOptions: Record<string, unknown> = {}) {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
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
  await page.route("**/api/v1/projects/form-options*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ownerOptions: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            organization: false,
            ownerName: "admin",
            selected: true,
          },
          {
            avatarUrl: "/assets/images/organization_default_logo.png",
            organization: true,
            ownerName: "weblabs",
            selected: false,
          },
        ],
        selectedOwnerName: "admin",
        ...formOptions,
      }),
    });
  });
}

async function projectCreateMetrics(page: Page) {
  return page.evaluate(() => {
    const formWrap = requireElement(".form-wrap.new-project");
    const form = requireElement<HTMLFormElement>("#newProjectForm");
    const owner = requireElement<HTMLSelectElement>("#project-owner");
    const vcs = requireElement<HTMLSelectElement>("#vcs");
    const nameInput = requireElement<HTMLInputElement>("#project-name");
    const advanced = requireElement(".advanced-options");
    const actions = requireElement(".actions");
    const submitButton = requireElement<HTMLButtonElement>(".actions .ybtn-success");
    const cancelLink = requireElement<HTMLAnchorElement>(".actions a.ybtn");
    const legend = requireElement("legend");
    const importLink = requireElement<HTMLAnchorElement>("legend a.ybtn-small");
    const formWrapRect = formWrap.getBoundingClientRect();
    const nameRect = nameInput.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const submitRect = submitButton.getBoundingClientRect();
    const cancelRect = cancelLink.getBoundingClientRect();
    const legendRect = legend.getBoundingClientRect();
    const importRect = importLink.getBoundingClientRect();
    const advancedStyle = getComputedStyle(advanced);

    return {
      actionTextAlign: getComputedStyle(actions).textAlign,
      actionButtonsContained:
        submitRect.top >= actionsRect.top &&
        cancelRect.top >= actionsRect.top &&
        submitRect.bottom <= actionsRect.bottom &&
        cancelRect.bottom <= actionsRect.bottom &&
        submitRect.left >= actionsRect.left &&
        cancelRect.right <= actionsRect.right,
      advancedBackground: advancedStyle.backgroundColor,
      advancedBorderRadius: advancedStyle.borderTopLeftRadius,
      formAction: form.getAttribute("action"),
      formMethod: form.getAttribute("method"),
      formWidth: Math.round(formWrapRect.width),
      importLinkContained:
        importRect.top >= legendRect.top &&
        importRect.bottom <= legendRect.bottom &&
        importRect.left >= legendRect.left &&
        importRect.right <= legendRect.right,
      inputWidthRatio: Number((nameRect.width / formWrapRect.width).toFixed(2)),
      ownerDataFormat: owner.getAttribute("data-format"),
      ownerDataToggle: owner.getAttribute("data-toggle"),
      ownerStyle: owner.getAttribute("style"),
      vcsDataDropdownCssClass: vcs.getAttribute("data-dropdown-css-class"),
      vcsDataToggle: vcs.getAttribute("data-toggle"),
      vcsStyle: vcs.getAttribute("style"),
    };

    function requireElement<T extends HTMLElement = HTMLElement>(selector: string) {
      const element = document.querySelector<T>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}
