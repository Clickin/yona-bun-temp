import { readFileSync, expect, test, type Page, mergedLegacyBlock } from "../wtr-compat.ts";
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "ko-KR" });

test("organization directory private-card residual inline owners use route-local Style", async ({
  page,
}) => {
  const route = readFileSync("src/routes/orgs.tsx", "utf8");
  const styleSource = readFileSync("src/app.css", "utf8");
  const template = readFileSync("../yona-original/app/views/organization/list.scala.html", "utf8");

  expect(template).toContain('<li class="project" style="background-color: #fcfcfc;">');
  expect(template).toContain('<div class="info-wrap" style="opacity: 0.3">');
  expect(template).toContain('<div style="float:left; color: gray">');
  expect(route).toContain('data-owner="organization-directory-private-message"');
  expect(route).toContain('data-owner-private="organization-directory-private-row"');

  await mockOrganizations(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/orgs`);

    const privateIdentity = page.locator('[data-owner="organization-directory-private"]');
    const privateRow = privateIdentity.locator("..");
    await expect(privateRow).toHaveCSS("background-color", "rgb(252, 252, 252)");
    await expect(privateIdentity).toHaveCSS("opacity", "0.3");
    await expect(page.locator('[data-owner="organization-directory-private-message"]')).toHaveCSS(
      "color",
      "rgb(128, 128, 128)",
    );
    await expect(page.locator('[data-owner="organization-directory-private-message"]')).toHaveCSS(
      "float",
      "left",
    );
    await expect(privateRow).toContainText(
      "You do not have permission to view this project's information",
    );
    const geometry = await privateRow.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, scrollWidth: document.documentElement.scrollWidth };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  }
});

async function mockOrganizations(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          { name: "alpha", descr: "Description", logoUrl: "" },
          { name: "secret", viewerCanRead: false },
        ],
        totalPages: 1,
        pageNum: 1,
      },
    }),
  );
}
