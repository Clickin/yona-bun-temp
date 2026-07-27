import { expect, test } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(testDir, "..");
const sourceRoot = path.join(repoDir, "src");
const legacyViewsRoot = path.join(repoDir, "..", "yona-original", "app", "views");
const legacyStylesRoot = path.join(repoDir, "..", "yona-original", "app", "assets", "stylesheets");

type Source = { file: string; text: string };

function findSource(root: string, predicate: (file: string, text: string) => boolean): Source {
  const pending = [root];

  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || !fs.existsSync(current)) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && entry.name !== "node_modules") pending.push(file);
        continue;
      }

      const text = fs.readFileSync(file, "utf8");
      if (predicate(file, text)) return { file, text };
    }
  }

  throw new Error(`Source not found under ${root}`);
}

const routeSource = findSource(
  sourceRoot,
  (file, text) =>
    file.endsWith(".tsx") && text.includes('data-stylex-owner="project-code-file-breadcrumbs"'),
);
const styleSource = findSource(
  sourceRoot,
  (file, text) =>
    file.includes("stylex") && text.includes("breadcrumbs") && text.includes("marginLeft"),
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
  (file, text) => path.basename(file) === "_common.less" && text.includes(".ml10"),
);

const screenshotRoot = path.join(
  repoDir,
  "output",
  "playwright",
  "stylex-project-code-file-breadcrumb-ml10",
  process.env.VITE_DISABLE_LEGACY_FALLBACK ? "fallback-off" : "normal",
);

test("project code file breadcrumbs preserve the legacy ml10 layout", async ({ page }) => {
  expect(legacyViewSource.text).toContain("code-breadcrumb-wrap");
  expect(legacyViewSource.text).toMatch(/class=["'][^"']*\bml10\b[^"']*["']/);
  expect(legacyCommonSource.text).toMatch(/\.ml10\s*\{[\s\S]*?margin-left\s*:\s*10px\s*;/);
  expect(routeSource.text).toContain('data-stylex-owner="project-code-file-breadcrumbs"');
  expect(routeSource.text).toMatch(/stylex\.props\(\s*styles\.breadcrumbs\s*\)/);
  expect(styleSource.text).toMatch(/breadcrumbs[\s\S]*?marginLeft\s*:\s*["']10px["']/);

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
          author: "Admin",
          avatarUrl: "",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          createdDate: "Jul 2, 2026",
          data: "# Readme\n\nhello",
          isBinary: false,
          lineEnding: "LF",
          mimeType: "text/markdown",
          userLoginId: "admin",
        },
        noHead: false,
        ownerName: "admin",
        path: "README.md",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );

  fs.mkdirSync(screenshotRoot, { recursive: true });

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
      path: path.join(screenshotRoot, `project-code-file-breadcrumb-ml10-${viewport.name}.png`),
      fullPage: true,
    });
  }
});
