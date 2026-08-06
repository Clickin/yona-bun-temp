import { expect, test } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: mkdirSync/resolve only feed page.screenshot paths
// (artifact-only no-ops); fileURLToPath reduces URL objects to their
// pathname so readFileSync maps them through the fixture middleware.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(
    new URL(
      "../src/routes/$ownerName/$projectName/code/$branch/-code-file.stylex.ts",
      import.meta.url,
    ),
  ),
  "utf8",
);
const legacyViewSource = readFileSync(
  new URL("../../yona-original/app/views/code/view.scala.html", import.meta.url),
  "utf8",
);
const legacyFolderSource = readFileSync(
  new URL("../../yona-original/app/views/code/partial_view_folder.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const legacyPageSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const legacyYobiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const screenshotDirectory = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
  "output/playwright/stylex-project-code-folder",
);
mkdirSync(screenshotDirectory, { recursive: true });

test("populated folder rows declare the legacy folder-list sources", () => {
  expect(legacyViewSource).toContain(
    '@partial_view_folder(project, files.get("data"), branch, fieldText(files, "path"))',
  );
  expect(legacyFolderSource).toContain(
    '<span class="ml5"><a href="@fieldText(file, "commitUrl")">',
  );
  expect(legacyFolderSource).toContain(
    '<span class="ml5"><a href="${commitUrl}">${commitMsg}</a></span>',
  );
  expect(legacyCommonSource).toContain(".ml5 { margin-left:5px; }");
  expect(legacyPageSource).toContain(".row-fluid   { line-height:40px; }");
  expect(legacyPageSource).toContain(".listhead { display:none; }");
  expect(legacyPageSource).toContain(".listitem {");
  expect(legacyPageSource).toContain(
    ".commitMsg { font-size:10pt; color:#7e7e7e; .text-overflow; }",
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
    expect(legacyYobiSource).toContain(`@import "less/${importedFile}";`);
  }
  expect(styleSource).toContain("folderCommitMessageWrapper: {");
  expect(styleSource).toContain('marginLeft: "5px"');
  expect(routeSource).toContain("stylex.props(styles.folderCommitMessageWrapper)");
  expect(routeSource).toContain('data-stylex-owner="project-code-folder-commit-message-wrapper"');
});

test("populated folder rows own ml5 and preserve folder/file navigation", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
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
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [{ name: "src", path: "src" }],
        entries: [
          {
            commitDate: "2h",
            commitMessage: "Add components",
            commitShortId: "abcdef1",
            kind: "folder",
            name: "components",
            path: "src/components",
          },
          {
            commitDate: "1d",
            commitMessage: "Document source",
            commitShortId: "1234567",
            kind: "file",
            name: "README.md",
            path: "src/README.md",
          },
        ],
        file: null,
        noHead: false,
        ownerName: "admin",
        path: "src",
        projectName: "sample",
        selectedBranch: "main",
      },
    }),
  );

  const expectedEntries = [
    {
      commitId: "abcdef1",
      commitMessage: "Add components",
      date: "2h",
      fileName: "components",
      fileHref: `${basePath}/admin/sample/code/main/src/components#cb-srccomponents`,
    },
    {
      commitId: "1234567",
      commitMessage: "Document source",
      date: "1d",
      fileName: "README.md",
      fileHref: `${basePath}/admin/sample/code/main/src/README.md`,
    },
  ];

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/code/main/src`, { waitUntil: "commit" });
    await expect(page.locator('[data-stylex-owner="project-code-folder-list-wrap"]')).toBeVisible();

    const rows = page.locator('[data-stylex-owner="project-code-folder-row"]');
    const wrappers = page.locator(
      '[data-stylex-owner="project-code-folder-commit-message-wrapper"]',
    );
    await expect(rows).toHaveCount(expectedEntries.length);
    await expect(wrappers).toHaveCount(expectedEntries.length);

    for (let index = 0; index < expectedEntries.length; index += 1) {
      const expected = expectedEntries[index];
      const row = rows.nth(index);
      const wrapper = wrappers.nth(index);
      const filenameLink = row.locator(".filename a");
      const commitLink = wrapper.locator("a");
      const date = row.locator(".commitDate");

      await expect(filenameLink).toBeVisible();
      await expect(filenameLink).toHaveText(expected.fileName);
      await expect(filenameLink).toHaveAttribute("href", expected.fileHref);
      await expect(wrapper).toBeVisible();
      await expect(wrapper).toHaveClass(/\bml5\b/u);
      await expect(wrapper).toHaveAttribute("data-style-src", /-code-file\.stylex\.ts/u);
      await expect(commitLink).toHaveCount(1);
      await expect(commitLink).toBeVisible();
      await expect(commitLink).toHaveText(expected.commitMessage);
      await expect(commitLink).toHaveAttribute(
        "href",
        `${basePath}/admin/sample/commit/${expected.commitId}?branch=main`,
      );
      await expect(date).toHaveText(expected.date);

      const metrics = await row.evaluate((element) => {
        const list = element.closest<HTMLElement>(".list-wrap");
        const message = element.querySelector<HTMLElement>(
          '[data-stylex-owner="project-code-folder-commit-message"]',
        );
        const wrapper = element.querySelector<HTMLElement>(
          '[data-stylex-owner="project-code-folder-commit-message-wrapper"]',
        );
        if (!list || !message || !wrapper) {
          throw new Error("folder row geometry owners are missing");
        }
        const listBox = list.getBoundingClientRect();
        const rowBox = element.getBoundingClientRect();
        const messageBox = message.getBoundingClientRect();
        const wrapperBox = wrapper.getBoundingClientRect();
        const wrapperStyle = getComputedStyle(wrapper);
        return {
          listClientWidth: list.clientWidth,
          listScrollWidth: list.scrollWidth,
          listLeft: listBox.left,
          listRight: listBox.right,
          rowClientWidth: element.clientWidth,
          rowScrollWidth: element.scrollWidth,
          rowLeft: rowBox.left,
          rowRight: rowBox.right,
          messageLeft: messageBox.left,
          messageRight: messageBox.right,
          wrapperLeft: wrapperBox.left,
          wrapperRight: wrapperBox.right,
          marginLeft: wrapperStyle.marginLeft,
        };
      });
      expect(metrics.marginLeft).toBe("5px");
      expect(metrics.listScrollWidth).toBeLessThanOrEqual(metrics.listClientWidth + 1);
      expect(metrics.rowScrollWidth).toBeLessThanOrEqual(metrics.rowClientWidth + 1);
      expect(metrics.rowLeft).toBeGreaterThanOrEqual(metrics.listLeft - 1);
      expect(metrics.rowRight).toBeLessThanOrEqual(metrics.listRight + 1);
      expect(metrics.messageLeft).toBeGreaterThanOrEqual(metrics.rowLeft - 1);
      expect(metrics.messageRight).toBeLessThanOrEqual(metrics.rowRight + 1);
      expect(metrics.wrapperLeft).toBeGreaterThanOrEqual(metrics.messageLeft - 1);
      expect(metrics.wrapperRight).toBeLessThanOrEqual(metrics.messageRight + 1);

      const rowText = await row.innerText();
      expect(rowText.indexOf(expected.fileName)).toBeLessThan(
        rowText.indexOf(expected.commitMessage),
      );
      expect(rowText.indexOf(expected.commitMessage)).toBeLessThan(rowText.indexOf(expected.date));
    }

    const documentOverflow = await page.evaluate(
      () =>
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) -
        window.innerWidth,
    );
    expect(documentOverflow).toBeLessThanOrEqual(1);
    await page.screenshot({
      path: resolve(screenshotDirectory, `${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/code/main/src`, { waitUntil: "commit" });
  await page
    .locator('[data-stylex-owner="project-code-folder-row"]')
    .nth(0)
    .locator(".filename a")
    .click();
  await expect(page).toHaveURL(
    `${basePath}/admin/sample/code/main/src/components#cb-srccomponents`,
  );

  await page.goto(`${basePath}/admin/sample/code/main/src`, { waitUntil: "commit" });
  await page
    .locator('[data-stylex-owner="project-code-folder-row"]')
    .nth(1)
    .locator(".filename a")
    .click();
  await expect(page).toHaveURL(`${basePath}/admin/sample/code/main/src/README.md`);
});
