import { expect, test, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-project-code-file-header-floats",
  fallbackOff ? "fallback-off" : "normal",
);
const readSource = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), "utf8");

test("project code-file header float ownership has legacy provenance", () => {
  const route = readSource("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx");
  const styles = readSource(
    "../src/routes/$ownerName/$projectName/code/$branch/-code-file.stylex.ts",
  );
  const legacyView = readSource("../../yona-original/app/views/code/view.scala.html");
  const bootstrap = readSource("../../yona-original/public/bootstrap/css/bootstrap.css");
  const pageLess = readSource("../../yona-original/app/assets/stylesheets/less/_page.less");
  const yobiLess = readSource("../../yona-original/app/assets/stylesheets/yobi.less");
  const messages = readSource("../../yona-original/conf/messages");

  expect(legacyView).toContain('<select id="branches" data-toggle="select2" data-format="branch"');
  expect(legacyView).toContain(
    '<div id="breadcrumbs" class="code-breadcrumb-wrap ml10 pull-left">',
  );
  expect(legacyView).toContain('@Messages("code.download")');
  expect(legacyView).toContain('@Messages("code.new.file")');
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(bootstrap).toContain(".pull-left {\n  float: left;");
  expect(pageLess).toContain(".code-browse-header");
  expect(pageLess).toContain(".code-breadcrumb-wrap");
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(messages).toContain("code.download = Download as .zip file");
  expect(messages).toContain("code.new.file = New file");

  for (const declaration of [
    'branchPicker: {\n    float: "left"',
    'breadcrumbs: {\n    float: "left"',
    'downloadAction: {\n    float: "right"',
    'newFileAction: {\n    float: "right"',
  ])
    expect(styles).toContain(declaration);
  for (const owner of [
    "project-code-file-branch-picker",
    "project-code-file-breadcrumbs",
    "project-code-file-download-action",
    "project-code-file-new-file-action",
  ])
    expect(route).toContain(`data-stylex-owner="${owner}"`);

  expect(route).toContain(
    'className={`${branchPickerStyleProps.className}${isFolder ? "" : " mb10"}`}',
  );
  expect(route).toContain("reloadDocument");
  expect(route).not.toMatch(
    /project-code-file-branch-picker[\s\S]{0,260}className=[^\n]*pull-left/u,
  );
  expect(route).not.toMatch(/project-code-file-download-action[\s\S]{0,180}pull-right/u);
  expect(route).not.toMatch(/project-code-file-new-file-action[\s\S]{0,180}pull-right/u);
  expect(route).toMatch(/code-breadcrumb-wrap ml10 pull-left/u);
  expect(route).not.toContain('data-toggle="select2"');
});

test("project code-file header preserves navigation, permissions, and containment", async ({
  page,
}) => {
  await mockCodeFile(page, false);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/code/main/README.md`, { waitUntil: "networkidle" });

    const picker = page.locator('[data-stylex-owner="project-code-file-branch-picker"]');
    const breadcrumbs = page.locator('[data-stylex-owner="project-code-file-breadcrumbs"]');
    const download = page.locator('[data-stylex-owner="project-code-file-download-action"]');
    const newFile = page.locator('[data-stylex-owner="project-code-file-new-file-action"]');
    await expect(picker).toBeVisible();
    await expect(breadcrumbs).toBeVisible();
    await expect(download).toBeVisible();
    await expect(newFile).toBeVisible();
    await expect(picker).toHaveCSS("float", "left");
    await expect(breadcrumbs).toHaveCSS("float", "left");
    await expect(download).toHaveCSS("float", "right");
    await expect(newFile).toHaveCSS("float", "right");
    await expect(picker).not.toHaveClass(/pull-left/u);
    await expect(breadcrumbs).toHaveClass(/pull-left/u);
    await expect(download).not.toHaveClass(/pull-right/u);
    await expect(newFile).not.toHaveClass(/pull-right/u);
    await expect(picker).toHaveClass(/mb10/u);
    await expect(download.locator("a")).toHaveText("Download as .zip file");
    await expect(download.locator("a")).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/archive/main.zip`,
    );
    await expect(newFile.locator("a")).toHaveText("New file");
    await expect(newFile.locator("a")).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/postform?path=&branch=main`,
    );

    const metrics = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>(".code-browse-header");
      const owners = [
        ...document.querySelectorAll<HTMLElement>('[data-stylex-owner^="project-code-file-"]'),
      ].filter((element) =>
        [
          "project-code-file-branch-picker",
          "project-code-file-breadcrumbs",
          "project-code-file-download-action",
          "project-code-file-new-file-action",
        ].includes(element.dataset.stylexOwner ?? ""),
      );
      if (!header || owners.length !== 4) return null;
      const headerBox = header.getBoundingClientRect();
      return {
        contained: owners.every((owner) => {
          const box = owner.getBoundingClientRect();
          return box.left >= headerBox.left - 1 && box.right <= headerBox.right + 1;
        }),
        noOverflow: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      };
    });
    expect(metrics).toEqual({ contained: true, noOverflow: true });
    await page.screenshot({
      animations: "disabled",
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });

    await picker.selectOption(`${basePath}/admin/sample/code/feature%2Frelease/README.md`);
    await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Frelease/README.md`);
  }

  const anonymousPage = await page.context().newPage();
  await mockCodeFile(anonymousPage, true);
  await anonymousPage.goto(`${basePath}/admin/sample/code/main/README.md`, {
    waitUntil: "networkidle",
  });
  await expect(
    anonymousPage.locator('[data-stylex-owner="project-code-file-download-action"]'),
  ).toBeVisible();
  await expect(
    anonymousPage.locator('[data-stylex-owner="project-code-file-new-file-action"]'),
  ).toHaveCount(0);
  await anonymousPage.close();
});

async function mockCodeFile(page: Page, anonymous: boolean) {
  const session = {
    actorId: 1,
    avatarUrl: "/yona/legacy-assets/images/default-avatar-34.png",
    isAnonymous: anonymous,
    isConfirmed: !anonymous,
    isGuest: false,
    isSiteAdmin: false,
    loginId: anonymous ? "" : "admin",
    preferredLanguage: "en",
    userLabel: anonymous ? "" : "Admin",
  };
  for (const pattern of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(pattern, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [{ name: "README.md", path: "README.md" }],
        entries: [],
        file: {
          author: "Admin",
          avatarUrl: "/yona/legacy-assets/images/default-avatar-34.png",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          createdDate: "Jul 2, 2026",
          data: "# README\n\nhello",
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
}
