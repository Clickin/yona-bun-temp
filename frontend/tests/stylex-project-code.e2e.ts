import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const routeSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/code.tsx", import.meta.url)),
  "utf8",
);
const styleSource = readFileSync(
  fileURLToPath(new URL("../src/routes/$ownerName/$projectName/-code.stylex.ts", import.meta.url)),
  "utf8",
);
const owners = [
  "project-code-nohead-page",
  "project-code-nohead-column",
  "project-code-nohead-alert",
  "project-code-nohead-heading",
] as const;

test("code no-head state exposes direct StyleX owners for legacy output", () => {
  expect(new Set(owners).size).toBe(4);
  for (const owner of owners) {
    expect(routeSource).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-code.stylex"');
  expect(styleSource).toContain("stylex.defineVars({");
});

test("code route keeps geometry in route declarations and theme variables paint-only", () => {
  for (const geometryProperty of ["margin:", "padding:", "width:", "height:", "top:", "left:"]) {
    expect(styleSource).not.toContain(geometryProperty);
  }
  expect(routeSource).toContain('margin: "20px auto 0px"');
  expect(routeSource).toContain('padding: "8px 35px 8px 14px"');
  expect(routeSource).toContain("svnCheckoutUrl");
});

test("code route translates no-head clone instructions without legacy DOM scripts", () => {
  expect(routeSource).toContain("code.nohead.clone");
  expect(routeSource).toContain("code.nohead.init");
  expect(routeSource).not.toContain("document.querySelector");
  expect(routeSource).not.toContain("addEventListener");
  expect(routeSource).not.toContain("dangerouslySetInnerHTML");
});

test("code no-head state renders alert and clone instructions", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        codeUrl: "https://example.test/admin/sample.git",
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/code", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        branches: [],
        breadcrumbs: [],
        entries: [],
        file: null,
        noHead: true,
        ownerName: "admin",
        path: "",
        projectName: "sample",
        selectedBranch: "",
      }),
    });
  });
  await page.goto(`${basePath}/admin/sample/code`);
  await expect(page.locator('[data-stylex-owner="project-code-nohead-alert"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-code-nohead-heading"]')).toBeVisible();
  await expect(page.locator("pre").first()).toContainText("git clone");
  const geometry = await page
    .locator('[data-stylex-owner="project-code-nohead-alert"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, width: rect.width };
    });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.width).toBeGreaterThan(0);
});
