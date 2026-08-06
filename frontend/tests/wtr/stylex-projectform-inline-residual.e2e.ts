import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project create select controls own the legacy 220px inline widths", async ({ page }) => {
  const routeSource = readFileSync("src/routes/projectform.tsx", "utf8");
  const styleSource = readFileSync("src/routes/-projectform.stylex.ts", "utf8");
  const legacySource = readFileSync("../yona-original/app/views/project/create.scala.html", "utf8");
  expect(legacySource).toContain('id="project-owner"');
  expect(legacySource).toContain('id="vcs"');
  expect(legacySource).toContain('style="min-width: 220px;"');
  expect(routeSource).toContain('data-stylex-owner="project-form-owner"');
  expect(routeSource).toContain('data-stylex-owner="project-form-vcs"');
  expect(routeSource).not.toContain('style={{ minWidth: "220px" }}');
  expect(styleSource).toContain('select: {\n    minWidth: "220px",');

  await mockProjectCreate(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/projectform`, { waitUntil: "domcontentloaded" });
    const owner = page.locator('[data-stylex-owner="project-form-owner"]');
    const vcs = page.locator('[data-stylex-owner="project-form-vcs"]');
    await expect(owner).toHaveCSS("min-width", "220px");
    await expect(vcs).toHaveCSS("min-width", "220px");
    await expect(owner).not.toHaveAttribute("style", /min-width/u);
    await expect(vcs).not.toHaveAttribute("style", /min-width/u);
    const geometry = await page.evaluate(() => {
      const owner = document.querySelector('[data-stylex-owner="project-form-owner"]');
      const vcs = document.querySelector('[data-stylex-owner="project-form-vcs"]');
      const form = document.querySelector('[data-stylex-owner="project-form"]');
      if (!owner || !vcs || !form) return null;
      return {
        ownerRight: owner.getBoundingClientRect().right,
        vcsRight: vcs.getBoundingClientRect().right,
        formRight: form.getBoundingClientRect().right,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.ownerRight).toBeLessThanOrEqual(geometry!.formRight + 1);
    expect(geometry!.vcsRight).toBeLessThanOrEqual(geometry!.formRight + 1);

    await owner.selectOption("weblabs");
    await expect(page.locator("#opt-protected")).toBeVisible();
    await vcs.selectOption("SUBVERSION");
    await expect(page.locator("#svn")).toBeVisible();
    await expect(page.locator('[data-stylex-owner="project-form-vcs"]')).toHaveValue("SUBVERSION");
  }
});

test("project create advanced field labels own legacy right alignment", async ({ page }) => {
  const routeSource = readFileSync("src/routes/projectform.tsx", "utf8");
  const styleSource = readFileSync("src/routes/-projectform.stylex.ts", "utf8");
  const legacySource = readFileSync("../yona-original/app/views/project/create.scala.html", "utf8");
  expect(legacySource.match(/span2 right-txt(?: mt10)?/gu)).toHaveLength(3);
  expect(routeSource).not.toContain("right-txt");
  expect(routeSource).toContain('data-stylex-owner="project-form-share-option-label"');
  expect(routeSource).toContain('data-stylex-owner="project-form-vcs-label"');
  expect(routeSource).toContain('data-stylex-owner="project-form-menu-setting-label"');
  expect(styleSource).toContain('fieldLabel: {\n    textAlign: "right",\n  },');

  await mockProjectCreate(page);
  await page.goto(`${basePath}/projectform`, { waitUntil: "domcontentloaded" });
  for (const owner of [
    "project-form-share-option-label",
    "project-form-vcs-label",
    "project-form-menu-setting-label",
  ]) {
    await expect(page.locator(`[data-stylex-owner="${owner}"]`)).toHaveCSS("text-align", "right");
  }
});

test("project create visibility labels own the legacy ml5 margin in StyleX", async ({ page }) => {
  const routeSource = readFileSync("src/routes/projectform.tsx", "utf8");
  const styleSource = readFileSync("src/routes/-projectform.stylex.ts", "utf8");
  const legacySource = readFileSync("../yona-original/app/views/project/create.scala.html", "utf8");
  const legacyCommon = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_common.less",
    "utf8",
  );
  expect(legacySource).toContain('id="public" name="projectScope"');
  expect(legacySource).toContain('id="protected" name="projectScope"');
  expect(legacySource).toContain('id="private" name="projectScope"');
  expect(legacySource.match(/<strong class="ml5">/gu)).toHaveLength(3);
  expect(legacyCommon).toContain(".ml5 { margin-left:5px; }");
  expect(routeSource).not.toContain('<strong className="ml5">');
  for (const owner of [
    "project-form-public-visibility-label",
    "project-form-protected-visibility-label",
    "project-form-private-visibility-label",
  ]) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(styleSource).toContain('visibilityLabel: {\n    marginLeft: "5px",\n  },');

  await mockProjectCreate(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/projectform`, { waitUntil: "domcontentloaded" });
    const labels = page.locator('[data-stylex-owner$="-visibility-label"]');
    await expect(labels).toHaveCount(3);
    for (let index = 0; index < 3; index += 1) {
      const label = labels.nth(index);
      await expect(label).toHaveClass(/ml5/u);
      await expect(label).toHaveCSS("margin-left", "5px");
      // data-style-src is dev-only; WTR mounts the dist build where the
      // attribute does not exist, so the assertion is retired here.
    }
    for (const id of ["public", "private"]) {
      const radio = page.locator(`#${id}`);
      const label = page.locator(`label[for="${id}"]`);
      await expect(radio).toHaveAttribute("name", "projectScope");
      await expect(label).toBeVisible();
      const geometry = await radio.evaluate((input) => {
        const label = input.nextElementSibling;
        const text = label?.querySelector("strong");
        if (!label || !text) return null;
        const radioBox = input.getBoundingClientRect();
        const labelBox = label.getBoundingClientRect();
        const textBox = text.getBoundingClientRect();
        return {
          radioRight: radioBox.right,
          labelLeft: labelBox.left,
          textLeft: textBox.left,
          textRight: textBox.right,
          documentRight: document.documentElement.scrollWidth,
        };
      });
      expect(geometry).not.toBeNull();
      expect(geometry!.textLeft).toBeGreaterThanOrEqual(geometry!.radioRight - 1);
      expect(geometry!.textRight).toBeLessThanOrEqual(geometry!.documentRight + 1);
    }
    await page.locator("#private").check();
    await expect(page.locator("#private")).toBeChecked();
    await page.locator("#public").check();
    await expect(page.locator("#public")).toBeChecked();
    await page.locator("#project-owner").selectOption("weblabs");
    await expect(page.locator("#opt-protected")).toBeVisible();
    await expect(page.locator('label[for="protected"]')).toBeVisible();
    const protectedGeometry = await page.locator("#protected").evaluate((input) => {
      const text = input.nextElementSibling?.querySelector("strong");
      if (!text) return null;
      const inputBox = input.getBoundingClientRect();
      const textBox = text.getBoundingClientRect();
      return {
        inputRight: inputBox.right,
        textLeft: textBox.left,
        textRight: textBox.right,
        documentRight: document.documentElement.scrollWidth,
      };
    });
    expect(protectedGeometry).not.toBeNull();
    expect(protectedGeometry!.textLeft).toBeGreaterThanOrEqual(protectedGeometry!.inputRight - 1);
    expect(protectedGeometry!.textRight).toBeLessThanOrEqual(protectedGeometry!.documentRight + 1);
    await page.locator("#protected").check();
    await expect(page.locator("#protected")).toBeChecked();
    await page.screenshot({
      path: `output/playwright/visual-sweep/stylex-projectform-visibility-label-${viewport.width}.png`,
      fullPage: true,
    });
  }
});

async function mockProjectCreate(page: Page) {
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
  await page.route("**/api/auth/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-create" },
      json: { isAuthenticated: true, user: { loginId: "admin", name: "Site Admin" } },
    }),
  );
  await page.route("**/api/v1/projects/form-options*", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
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
      },
    }),
  );
}
