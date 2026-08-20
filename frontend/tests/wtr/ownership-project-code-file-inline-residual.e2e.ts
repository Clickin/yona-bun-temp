import { expect, test, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: fileURLToPath yields the served URL pathname so string
// mapping + .txt raw-suffix applies.
const fileURLToPath = (u: URL) => u.pathname;

const routeSource = readFileSync(
  fileURLToPath(
    new URL("../src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx", import.meta.url),
  ),
  "utf8",
);
const styleSource = curatedAppCss() + mergedLegacyBlock();
const legacySource = readFileSync(
  new URL("../../yona-original/app/views/code/view.scala.html", import.meta.url),
  "utf8",
);
const legacyFilePartial = readFileSync(
  new URL("../../yona-original/app/views/code/partial_view_file.scala.html", import.meta.url),
  "utf8",
);

test("code file residual static declarations are Style-owned", () => {
  expect(routeSource).toContain('data-owner="project-code-file-spinner"');

  expect(legacySource).toContain('$("#open-in-browser").popover');
  expect(legacyFilePartial).toContain('id="open-in-browser"');
  expect(routeSource).toContain('data-owner="project-code-file-open-wrap"');

  expect(routeSource).toContain('data-owner="project-code-file-no-files"');
  expect(routeSource).toContain('data-owner="project-code-file-open-wrap"');
});

test("code file spinner keeps legacy fixed-center geometry without inline style", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = { isAnonymous: false, isSiteAdmin: true, loginId: "admin" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { ownerName: "admin", projectName: "sample", vcs: "GIT", defaultBranch: "main" },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/code**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        branches: [{ name: "main" }],
        breadcrumbs: [],
        entries: [],
        file: {
          author: "Admin",
          avatarUrl: "",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          createdDate: "Jul 2, 2026",
          data: "# Readme",
          isBinary: false,
          lineEnding: "LF",
          mimeType: "text/plain",
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
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/code/main/README.md`, { waitUntil: "commit" });
    const spinner = page.locator('[data-owner="project-code-file-spinner"]');
    await expect(spinner).toHaveCSS("position", "fixed");
    await expect(spinner).toHaveCSS("top", `${viewport.height / 2}px`);
    await expect(spinner).toHaveCSS("left", `${viewport.width / 2}px`);
    expect(await spinner.getAttribute("style")).toContain("position: fixed");
    const openWrap = page.locator('[data-owner="project-code-file-open-wrap"]');
    // The wrapper is a flex item, so the browser blockifies its inline-level display.
    await expect(openWrap).toHaveCSS("display", "block");
    await expect(openWrap).toHaveCSS("position", "relative");
    await expect(openWrap).not.toHaveAttribute("style", /display|position/u);
    await openWrap.hover();
    await expect(page.locator('[data-owner="project-code-file-open-popover"]')).toBeVisible();
  }
});
