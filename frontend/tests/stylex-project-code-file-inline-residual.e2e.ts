import { expect, test, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

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

test("code file residual static declarations are StyleX-owned", () => {
  expect(routeSource).toContain('data-stylex-owner="project-code-file-spinner"');
  expect(routeSource).not.toContain('style={{ position: "fixed", top: "50%", left: "50%" }}');
  expect(styleSource).toContain('spinner: { left: "50%", position: "fixed", top: "50%" }');
  expect(routeSource).toContain('data-stylex-owner="project-code-file-no-files"');
  expect(routeSource).toContain('data-stylex-owner="project-code-file-open-wrap"');
  expect(routeSource).not.toContain('style={{ borderTop: 0, paddingLeft: "23px" }}');
  expect(routeSource).toContain('style={{ display: "inline-block", position: "relative" }}');
  expect(styleSource).toContain("noFiles:");
  expect(styleSource).toContain('paddingLeft: "23px"');
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
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route: Route) =>
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
    const spinner = page.locator('[data-stylex-owner="project-code-file-spinner"]');
    await expect(spinner).toHaveCSS("position", "fixed");
    await expect(spinner).toHaveCSS("top", `${viewport.height / 2}px`);
    await expect(spinner).toHaveCSS("left", `${viewport.width / 2}px`);
    expect(await spinner.getAttribute("style")).toBeNull();
  }
});
