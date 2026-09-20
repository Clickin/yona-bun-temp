import { expect, test, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath yields the served URL pathname so string
// mapping + .txt raw-suffix applies.
const fileURLToPath = (u: URL) => u.pathname;
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = curatedAppCss() + mergedLegacyBlock();
const legacyFilePartial = readFileSync(
  new URL("../../yona-original/app/views/code/partial_view_file.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const legacyYobiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const screenshotDir = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
  "output/playwright/style-project-code-file",
);

test("code file route declares Style owners and paint-only theme vars", () => {
  for (const owner of [
    "project-code-file-wrap",
    "project-code-file-header",
    "project-code-file-actions",
    "project-code-file-source",
    "project-code-file-author",
    "project-code-file-date",
    "project-code-file-revision",
    "project-code-file-message",
    "project-code-file-raw-action",
    "project-code-file-open-action",
    "project-code-file-open-popover",
    "project-code-file-history-action",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }

  const themeBlock = styleSource.slice(
    styleSource.indexOf("style.defineVars({"),
    styleSource.indexOf("});") + 3,
  );
  for (const geometry of ["margin:", "padding:", "width:", "height:"])
    expect(themeBlock).not.toContain(geometry);
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("populated code-file author link owns the legacy ml5 margin", async ({ page }) => {
  expect(legacyFilePartial).toContain('class="ml5"');
  expect(legacyFilePartial).toContain('id="commiter"');
  expect(legacyFilePartial).toContain('class="commitDate"');
  expect(legacyFilePartial).toContain('class="revision"');
  expect(legacyCommonSource).toContain(".ml5 { margin-left:5px; }");
  expect(legacyYobiSource).toContain('@import "less/_common.less";');

  expect(routeSource).toContain('data-owner="project-code-file-author-link"');

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { isAnonymous: false, isSiteAdmin: true, loginId: "admin" },
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
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
  page.clock.setFixedTime(new Date(2026, 6, 20, 12));

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/code/main/README.md`, { waitUntil: "networkidle" });
    const metadata = page.locator('[data-owner="project-code-file-author"]');
    const authorLink = page.locator('[data-owner="project-code-file-author-link"]');
    const avatarLink = metadata.locator("a").first();
    const date = page.locator('[data-owner="project-code-file-date"]');
    const revision = page.locator('[data-owner="project-code-file-revision"]');

    await expect(metadata).toContainText("Admin");
    await expect(authorLink).toHaveClass(/ml5/u);
    await expect(authorLink).toHaveCSS("margin-left", "5px");
    // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
    await expect(authorLink).toHaveAttribute("href", /\/yona\/admin/u);
    await expect(avatarLink).toHaveAttribute("href", /\/yona\/admin/u);
    await expect(date).toContainText("07-02");
    await expect(revision).toContainText("1234567");

    const [metadataBox, avatarBox, authorBox, dateBox, revisionBox] = await Promise.all([
      metadata.boundingBox(),
      avatarLink.boundingBox(),
      authorLink.boundingBox(),
      date.boundingBox(),
      revision.boundingBox(),
    ]);
    expect(metadataBox).not.toBeNull();
    expect(avatarBox).not.toBeNull();
    expect(authorBox).not.toBeNull();
    expect(dateBox).not.toBeNull();
    expect(revisionBox).not.toBeNull();
    expect(authorBox!.x).toBeGreaterThanOrEqual(avatarBox!.x + avatarBox!.width);
    expect(authorBox!.y).toBeGreaterThanOrEqual(metadataBox!.y);
    expect(authorBox!.y + authorBox!.height).toBeLessThanOrEqual(
      metadataBox!.y + metadataBox!.height,
    );
    for (const box of [metadataBox!, avatarBox!, authorBox!, dateBox!, revisionBox!]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    if (viewport.width >= 768) {
      expect(dateBox!.x).toBeGreaterThanOrEqual(authorBox!.x + authorBox!.width);
      expect(revisionBox!.x).toBeGreaterThanOrEqual(dateBox!.x + dateBox!.width);
    }
    mkdirSync(screenshotDir, { recursive: true });
    await page.screenshot({
      path: resolve(screenshotDir, `${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });

    await authorLink.click();
    await expect(page).toHaveURL(/\/yona\/admin(?:\?|$)/u);
    await page.goBack({ waitUntil: "networkidle" });
  }
});

test("code file renders legacy metadata, markdown, and actions", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: { isAnonymous: false, isSiteAdmin: true, loginId: "admin" },
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", viewerCanUpdate: true },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
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
  await page.goto("/yona/admin/sample/code/main/README.md");
  await expect(page.locator('[data-owner="project-code-file-header"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-code-file-markdown"]')).toContainText("hello");
  await expect(page.locator('[data-owner="project-code-file-actions"]')).toContainText("Raw");
  await expect(page.locator('[data-owner="project-code-file-author"]')).toContainText("Admin");
});
