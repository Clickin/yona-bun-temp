import { readFileSync } from "node:fs";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records organization directory StyleX ownership and responsive geometry", async ({
  page,
}) => {
  const route = readFileSync("src/routes/orgs.tsx", "utf8");
  const theme = readFileSync("src/routes/-orgs.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/organization/list.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  expect(template).toContain('<ul class="all-projects">');
  expect(template).toContain('placeholder="@Messages("site.organization.filter")"');
  expect(pageLess).toContain(".all-projects {");
  expect(route).toContain('data-stylex-owner="organization-directory-search-input"');
  expect(route).toContain('data-stylex-owner="organization-directory-list"');
  expect(theme).toContain("export const organizationDirectoryColors");
  expect(theme).toContain("descriptionText");

  await mockOrganizations(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/orgs`);
    const search = owner(page, "organization-directory-search-input");
    const list = owner(page, "organization-directory-list");
    await expect(search).toHaveAttribute("name", "filter");
    await expect(search).toHaveAttribute("placeholder", "키워드로 그룹 찾기");
    await expect(list.locator('[data-stylex-owner="organization-directory-row"]')).toHaveCount(1);
    await expect(owner(page, "organization-directory-search-bar")).toHaveCSS(
      "border",
      "1px solid rgb(204, 204, 204)",
    );
    const geometry = await list.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width, scrollWidth: document.documentElement.scrollWidth };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  }
  await searchAndNavigate(page);
});

async function searchAndNavigate(page: Page) {
  await owner(page, "organization-directory-search-input").fill("alpha");
  await owner(page, "organization-directory-search-button").click();
  await expect(page).toHaveURL(/\/orgs\?filter=alpha/u);
}

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
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            name: "alpha",
            descr: "Description",
            createdLabel: "today",
            createdTitle: "today",
            logoUrl: "/assets/images/organization_default_logo.png",
          },
        ],
        totalPages: 1,
        pageNum: 1,
      },
    }),
  );
}
