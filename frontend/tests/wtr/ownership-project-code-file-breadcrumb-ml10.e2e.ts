import { expect, globSync, readFileSync, test } from "../wtr-compat.ts";

// Browser harness: no node:fs/path — directory discovery goes through globSync
// (served by the fixture middleware) and file reads through readFileSync.
const sourceRoot = "src";
const legacyViewsRoot = "yona-original/app/views";
const legacyStylesRoot = "yona-original/app/assets/stylesheets";

type Source = { file: string; text: string };

function findSource(root: string, predicate: (file: string, text: string) => boolean): Source {
  const globPattern =
    root === sourceRoot ? "src/**/*.{ts,tsx}" : `../${root}/**/*.{scala.html,less,css,js}`;
  for (const file of globSync(globPattern, { nodir: true })) {
    const text = readFileSync(root === sourceRoot ? file : `../${file}`, "utf8");
    if (predicate(file, text)) return { file, text };
  }
  throw new Error(`Source not found under ${root}`);
}

const routeSource = findSource(
  sourceRoot,
  (file, text) =>
    file.endsWith(".tsx") && text.includes('data-owner="project-code-file-breadcrumbs"'),
);
const legacyViewSource = findSource(
  legacyViewsRoot,
  (file, text) =>
    file.endsWith(".scala.html") &&
    text.includes("code-breadcrumb-wrap") &&
    /class=["'][^"']*\bml10\b[^"']*["']/.test(text),
);
const legacyCommonSource = findSource(
  legacyStylesRoot,
  (file, text) => file.split("/").pop() === "_common.less" && text.includes(".ml10"),
);

const screenshotRoot = `output/playwright/style-project-code-file-breadcrumb-ml10/${"normal"}`;

test("project code file breadcrumbs preserve the legacy ml10 layout", async ({ page }) => {
  expect(legacyViewSource.text).toContain("code-breadcrumb-wrap");
  expect(legacyViewSource.text).toMatch(/class=["'][^"']*\bml10\b[^"']*["']/);
  expect(legacyCommonSource.text).toMatch(/\.ml10\s*\{[\s\S]*?margin-left\s*:\s*10px\s*;/);
  expect(routeSource.text).toContain('data-owner="project-code-file-breadcrumbs"');

  const session = { isAnonymous: false, isSiteAdmin: true, loginId: "admin" };
  for (const pattern of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(pattern, (route) => route.fulfill({ json: session }));
  }

  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
        defaultBranch: "main",
      },
    }),
  );

  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [{ name: "README.md", path: "README.md" }],
        entries: [],
        file: {
          authorLabel: "Admin",
          authorAvatarUrl: "",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          commitDate: "2026-07-02T12:00:00Z",
          text: "# Readme\n\nhello",
          isBinary: false,
          isTooLarge: false,
          mimeType: "text/markdown",
          authorLoginId: "admin",
        },
        noHead: false,
        ownerName: "admin",
        path: "README.md",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );

  // Screenshots are artifact-only no-ops in the browser harness.
  const mkdirSync = () => undefined;
  mkdirSync();

  for (const viewport of [
    { width: 1366, height: 900, name: "1366x900" },
    { width: 390, height: 844, name: "390x844" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/yona/admin/sample/code/main/README.md");

    const breadcrumbs = page.locator("#breadcrumbs");
    await expect(breadcrumbs).toBeVisible();
    await expect(breadcrumbs).toHaveClass(/code-breadcrumb-wrap/);
    await expect(breadcrumbs).toHaveClass(/ml10/);
    await expect(breadcrumbs).toHaveClass(/pull-left/);
    await expect(breadcrumbs).toHaveCSS("margin-left", "10px");
    await expect(breadcrumbs.getByRole("link")).toHaveText(["sample", "README.md"]);

    const attributes = await breadcrumbs.evaluate((element) => ({
      style: element.getAttribute("style"),
      forbidden: ["data-toggle", "data-placement", "data-action", "data-url", "data-href"].filter(
        (name) => element.hasAttribute(name),
      ),
    }));
    expect(attributes.style).toBeNull();
    expect(attributes.forbidden).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );

    await page.screenshot({
      path: `${screenshotRoot}/project-code-file-breadcrumb-ml10-${viewport.name}.png`,
      fullPage: true,
    });
  }
});
