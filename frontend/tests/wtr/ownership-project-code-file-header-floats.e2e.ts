import { expect, test, type Page } from "../wtr-compat.ts";
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "output/playwright/style-project-code-file-header-floats",
  "normal",
);

test("project code-file header preserves navigation, permissions, and containment", async ({
  page,
}) => {
  await mockCodeFile(page, false);

  for (const viewport of [
    { height: 900, name: "1366x900", width: 1366 },
    { height: 844, name: "390x844", width: 390 },
  ]) {
    await page.setViewportSize({ height: viewport.height, width: viewport.width });
    await page.goto(`${basePath}/admin/sample/code/main/README.md`, { waitUntil: "networkidle" });

    const picker = page.locator('[data-owner="project-code-file-branch-picker"]');
    const breadcrumbs = page.locator('[data-owner="project-code-file-breadcrumbs"]');
    const download = page.locator('[data-owner="project-code-file-download-action"]');
    const newFile = page.locator('[data-owner="project-code-file-new-file-action"]');
    await expect(picker).toBeVisible();
    await expect(breadcrumbs).toBeVisible();
    await expect(download).toBeVisible();
    await expect(newFile).toBeVisible();
    await expect(picker).toHaveCSS("float", "left");
    await expect(breadcrumbs).toHaveCSS("float", "left");
    await expect(download).toHaveCSS("float", "right");
    await expect(newFile).toHaveCSS("float", "right");
    await expect(page.locator(".file-header")).toHaveCSS("display", "block");
    await expect(page.locator("#fileInfo")).toHaveCSS("float", "left");
    await expect(page.locator("#fileInfo")).toHaveCSS("color", "rgb(32, 32, 32)");
    await expect(page.locator(".file-header .pull-right")).toHaveCSS("float", "right");
    const raw = page.locator('[data-owner="project-code-file-raw-action"]');
    await expect(raw).toHaveCSS("display", "inline-block");
    expect(await raw.evaluate((node) => node.getBoundingClientRect().height)).toBe(30);
    await expect(page.locator("#open-in-browser")).toHaveCSS("margin-left", "4.2px");
    await expect(picker).toHaveClass(/pull-left/u);
    await expect(breadcrumbs).toHaveClass(/pull-left/u);
    await expect(download).toHaveClass(/pull-right/u);
    await expect(newFile).toHaveClass(/pull-right/u);
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
        ...document.querySelectorAll<HTMLElement>('[data-owner^="project-code-file-"]'),
      ].filter((element) =>
        [
          "project-code-file-branch-picker",
          "project-code-file-breadcrumbs",
          "project-code-file-download-action",
          "project-code-file-new-file-action",
        ].includes(element.dataset.owner ?? ""),
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

    await picker.locator(".select2-choice").click();
    const branchOption = picker
      .locator(".select2-result-label")
      .filter({ hasText: "feature/release" });
    await expect(branchOption).toBeVisible();
    await branchOption.click();
    await expect(page).toHaveURL(`${basePath}/admin/sample/code/feature%2Frelease/README.md`);
    await expect(picker.locator(".select2-chosen")).toHaveText("branch feature/release");
    await expect(download.locator("a")).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/archive/feature%2Frelease.zip`,
    );
  }

  const anonymousPage = await page.context().newPage();
  await mockCodeFile(anonymousPage, true);
  await anonymousPage.goto(`${basePath}/admin/sample/code/main/README.md`, {
    waitUntil: "networkidle",
  });
  await expect(
    anonymousPage.locator('[data-owner="project-code-file-download-action"]'),
  ).toBeVisible();
  await expect(
    anonymousPage.locator('[data-owner="project-code-file-new-file-action"]'),
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
    await page.route(pattern, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
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
        branches: [{ name: "main" }, { name: "feature/release" }],
        breadcrumbs: [{ name: "README.md", path: "README.md" }],
        entries: [],
        file: {
          authorLabel: "Admin",
          authorAvatarUrl: "/yona/legacy-assets/images/default-avatar-34.png",
          commitId: "1234567890abcdef",
          commitMessage: "Update README",
          commitDate: "2026-07-02T12:00:00Z",
          text: "# README\n\nhello",
          isBinary: false,
          isTooLarge: false,
          mimeType: "text/markdown",
          authorLoginId: "admin",
        },
        noHead: false,
        ownerName: "admin",
        path: "README.md",
        projectName: "sample",
        selectedBranch: new URL(route.request().url()).searchParams.get("branch") ?? "main",
      },
    }),
  );
}
