import { expect, test, type Page } from "../wtr-compat.ts";
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
  fileURLToPath(new URL("../../yona-original/app/views/code/view.scala.html", import.meta.url)),
  "utf8",
);
const legacyFilePartial = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/views/code/partial_view_file.scala.html", import.meta.url),
  ),
  "utf8",
);
const legacyCommonSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  ),
  "utf8",
);
const legacyPageSource = readFileSync(
  fileURLToPath(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  ),
  "utf8",
);
const legacyYobiSource = readFileSync(
  fileURLToPath(new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url)),
  "utf8",
);
const screenshotDirectory = resolve(
  fileURLToPath(new URL("../", import.meta.url)),
  "output/playwright/stylex-project-code-file-comment-count",
);
mkdirSync(screenshotDirectory, { recursive: true });

test("populated code-file comment count owns the legacy revision span", async ({ page }) => {
  expect(legacyViewSource).toContain("@partial_view_file(project, files, branch, path)");
  expect(legacyFilePartial).toContain('id="revisionNo" class="revision"');
  expect(legacyFilePartial).toContain(
    '<span class="number-of-comments ml5"><i class="yobicon-comments"></i> @numOfComment</span>',
  );
  expect(legacyCommonSource).toContain(".ml5 { margin-left:5px; }");
  expect(legacyPageSource).toContain(".number-of-comments { float: right; position: relative; }");
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

  expect(styleSource).toContain("commentCount: {");
  expect(styleSource).toContain('marginLeft: "5px"');
  expect(styleSource).toContain('marginRight: "8px"');
  expect(styleSource).toContain("commentText");
  expect(routeSource).toContain(
    "const commentCountStyleProps = stylex.props(styles.commentCount);",
  );
  expect(routeSource).toContain("...commentCountStyleProps");
  expect(routeSource).toContain("`${commentCountStyleProps.className} number-of-comments ml5`");
  expect(routeSource).toContain("number-of-comments");

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockCodeFile(page);

  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/code/main/README.md`, { waitUntil: "networkidle" });

    const metadata = page.locator('[data-stylex-owner="project-code-file-info"]');
    const revision = page.locator('[data-stylex-owner="project-code-file-revision"]');
    const revisionLink = revision.locator("a");
    const commentCount = page.locator('[data-stylex-owner="project-code-file-comment-count"]');

    await expect(metadata).toBeVisible();
    await expect(revision).toBeVisible();
    await expect(commentCount).toHaveCount(1);
    await expect(commentCount).toHaveClass(/\bml5\b/u);
    await expect(commentCount).toHaveClass(/\bnumber-of-comments\b/u);
    // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
    await expect(commentCount).toHaveCSS("margin-left", "5px");
    await expect(commentCount).toHaveCSS("margin-right", "8px");
    await expect(commentCount).toHaveCSS("color", "rgb(102, 102, 102)");
    await expect(commentCount.locator(".yobicon-comments")).toHaveCount(1);
    await expect(commentCount).toHaveText(/2/u);

    const href = await revisionLink.getAttribute("href");
    expect(href).not.toBeNull();
    const revisionUrl = new URL(
      href!,
      `http://localhost${basePath}/admin/sample/code/main/README.md`,
    );
    expect(revisionUrl.pathname).toBe(`${basePath}/admin/sample/commit/1234567890abcdef`);
    expect(revisionUrl.searchParams.get("branch")).toBe("main");
    expect(revisionUrl.searchParams.get("path")).toBeNull();
    expect(revisionUrl.hash).toBe("#README.md");

    const geometry = await metadata.evaluate((element) => {
      const revisionElement = element.querySelector<HTMLElement>(
        '[data-stylex-owner="project-code-file-revision"]',
      );
      const commentElement = element.querySelector<HTMLElement>(
        '[data-stylex-owner="project-code-file-comment-count"]',
      );
      if (!revisionElement || !commentElement) throw new Error("revision owners are missing");
      const metadataBox = element.getBoundingClientRect();
      const revisionBox = revisionElement.getBoundingClientRect();
      const commentBox = commentElement.getBoundingClientRect();
      return {
        metadataBottom: metadataBox.bottom,
        metadataTop: metadataBox.top,
        commentBottom: commentBox.bottom,
        commentLeft: commentBox.left,
        commentRight: commentBox.right,
        commentTop: commentBox.top,
        revisionBottom: revisionBox.bottom,
        revisionLeft: revisionBox.left,
        revisionRight: revisionBox.right,
        revisionTop: revisionBox.top,
        documentScrollWidth: Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth,
        ),
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.revisionLeft).toBeGreaterThanOrEqual(-1);
    expect(geometry.revisionRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
    expect(geometry.revisionTop).toBeGreaterThanOrEqual(geometry.metadataTop - 1);
    expect(geometry.revisionBottom).toBeLessThanOrEqual(geometry.metadataBottom + 1);
    expect(geometry.commentLeft).toBeGreaterThanOrEqual(geometry.revisionLeft - 1);
    expect(geometry.commentRight).toBeLessThanOrEqual(geometry.revisionRight + 1);
    expect(geometry.commentTop).toBeGreaterThanOrEqual(geometry.revisionTop - 1);
    expect(geometry.commentBottom).toBeLessThanOrEqual(geometry.revisionBottom + 1);
    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    await page.screenshot({
      path: resolve(screenshotDirectory, `${viewport.width}x${viewport.height}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/code/main/README.md`, { waitUntil: "networkidle" });
  await page.locator('[data-stylex-owner="project-code-file-comment-count"]').click();
  await expect(page).toHaveURL(
    new RegExp(
      `${basePath}/admin/sample/commit/1234567890abcdef\\?branch=main&path=#README\\.md$`,
      "u",
    ),
  );
});

async function mockCodeFile(page: Page) {
  const session = {
    actorId: 1,
    avatarUrl: "/yona/legacy-assets/images/default-avatar-34.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
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
        branches: [{ name: "main" }],
        breadcrumbs: [{ name: "README.md", path: "README.md" }],
        entries: [],
        file: {
          author: "Admin",
          avatarUrl: "/yona/legacy-assets/images/default-avatar-34.png",
          commitId: "1234567890abcdef",
          commitCount: 0,
          commitMessage: "Update README",
          commentCount: 2,
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
