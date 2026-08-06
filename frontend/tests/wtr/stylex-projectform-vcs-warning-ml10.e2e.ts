import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
const fs = { mkdirSync: () => undefined };
const path = { join: (...parts: string[]) => parts.join("/") };

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const testDir = "tests/wtr";
const frontendRoot = ".";
const legacyRoot = "../yona-original";
const screenshotRoot = path.join(
  "output",
  "playwright",
  "stylex-projectform-vcs-warning-ml10",
  process.env.VITE_DISABLE_LEGACY_FALLBACK ? "fallback-off" : "normal",
);

test("project form VCS warning keeps legacy ml10 spacing and visibility", async ({ page }) => {
  const route = readFileSync("src/routes/projectform.tsx", "utf8");
  const style = readFileSync("src/routes/-projectform.stylex.ts", "utf8");
  const legacyView = readFileSync(
    path.join(legacyRoot, "app/views/project/create.scala.html"),
    "utf8",
  );
  const legacyCommon = readFileSync(
    path.join(legacyRoot, "app/assets/stylesheets/less/_common.less"),
    "utf8",
  );
  const legacyPage = readFileSync(
    path.join(legacyRoot, "app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const legacyYobi = readFileSync(
    path.join(legacyRoot, "app/assets/stylesheets/yobi.less"),
    "utf8",
  );
  const messages = readFileSync(path.join(legacyRoot, "conf/messages"), "utf8");

  expect(legacyView).toMatch(/<select id="vcs"[\s\S]*?name="vcs"/u);
  expect(legacyView).toContain('<span id="svn" class="ml10 notice"');
  expect(legacyView).toMatch(/<span id="svn" class="ml10 notice"[\s\S]*?style="display: none;"/u);
  expect(legacyCommon).toMatch(/\.ml10\s*\{\s*margin-left\s*:\s*10px\s*;/u);
  expect(legacyPage).toMatch(/\.notice\s*\{\s*color\s*:\s*#DB3A67\s*;/u);
  expect(legacyYobi).toContain('@import "less/_common.less";');
  expect(legacyYobi).toContain('@import "less/_page.less";');
  expect(legacyYobi).toContain('@import "less/_responsive.less";');
  expect(messages).toContain("project.svn.warning = Subversion can''t use pull request");
  expect(messages).toContain("project.new.vcsType.git = Git");
  expect(messages).toContain("project.new.vcsType.subversion = Subversion");

  expect(route).toContain('data-stylex-owner="project-form-vcs-warning"');
  expect(route).toContain("projectFormLayout.svnWarning");
  expect(route).toContain("projectFormConditionalStyles.hidden");
  expect(style).toContain('svnWarning: {\n    marginLeft: "10px",');

  await mockProjectCreate(page);
  fs.mkdirSync(screenshotRoot, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "1366x900" },
    { width: 390, height: 844, name: "390x844" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/projectform`, { waitUntil: "domcontentloaded" });

    const vcs = page.locator("#vcs");
    const warning = page.locator("#svn");
    await expect(vcs).toHaveValue("GIT");
    await expect(warning).toBeHidden();

    await vcs.selectOption("SUBVERSION");
    await expect(warning).toBeVisible();
    await expect(warning).toHaveClass(/ml10 notice/);
    await expect(warning).toHaveCSS("margin-left", "10px");
    await expect(warning).toHaveCSS("color", "rgb(219, 58, 103)");
    await expect(warning).toHaveText("Subversion can't use pull request");

    const attributes = await warning.evaluate((element) => ({
      style: element.getAttribute("style"),
      forbidden: [
        "data-toggle",
        "data-placement",
        "data-action",
        "data-href",
        "data-url",
        "data-request-method",
        "data-dismiss",
        "data-target",
        "data-trigger",
        "data-backdrop",
        "data-spy",
        "data-provider",
        "data-loading-text",
        "data-format",
        "data-dropdown-css-class",
      ].filter((name) => element.hasAttribute(name)),
    }));
    expect(attributes.style).toBeNull();
    expect(attributes.forbidden).toEqual([]);
    const warningBox = await warning.boundingBox();
    expect(warningBox).not.toBeNull();
    expect(warningBox!.x).toBeGreaterThanOrEqual(0);
    const pageScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    test.info().annotations.push({
      type: "diagnostic",
      description:
        `projectform warning width=${warningBox!.width}px, page scrollWidth=${pageScrollWidth}px at ${viewport.name}; ` +
        "legacy-derived mobile form/warning text wrapping overflow is outside #svn margin ownership and receives no compensation.",
    });

    await page.screenshot({
      path: path.join(screenshotRoot, `projectform-vcs-warning-ml10-${viewport.name}.png`),
      fullPage: true,
    });

    await vcs.selectOption("GIT");
    await expect(warning).toBeHidden();
  }
});

async function mockProjectCreate(page: Page) {
  await page.route("**/api/v1/session", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        isAnonymous: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    }),
  );
  await page.route("**/api/auth/session", async (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-project-create" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: { loginId: "admin", name: "Site Admin" },
      }),
    }),
  );
  await page.route("**/api/v1/projects/form-options*", async (route) =>
    route.fulfill({
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
      }),
    }),
  );
}
