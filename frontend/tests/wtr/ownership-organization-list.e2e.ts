import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`).first();

test.use({ locale: "ko-KR" });

test("records organization directory Style ownership and responsive geometry", async ({ page }) => {
  const route = readFileSync("src/routes/orgs.tsx", "utf8");

  const template = readFileSync("../yona-original/app/views/organization/list.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsiveLess = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const appCss = curatedAppCss();
  expect(template).toContain('<ul class="all-projects">');
  expect(template).toContain('placeholder="@Messages("site.organization.filter")"');
  expect(pageLess).toContain(".all-projects {");
  expect(pageLess).toContain("float:right;");
  expect(pageLess).toContain("margin-right:3px; margin-bottom:3px;");
  expect(appCss).not.toContain(".all-projects .project .stats-wrap .members ul li {");
  expect(appCss).not.toContain(".all-projects .project .stats-wrap .members ul li .avatar-wrap {");
  expect(route).not.toContain('className="avatar-wrap"');
  expect(route).toContain('data-owner="organization-directory-search-input"');
  expect(route).toContain('data-owner="organization-directory-title-area"');
  expect(route).toContain('data-owner="organization-directory-list"');
  expect(responsiveLess).toContain(".search-wrap {");
  expect(responsiveLess).toContain("height: inherit !important;");
  expect(responsiveLess).toContain(".search-bar {");
  expect(responsiveLess).toContain("margin: 5px 0;");
  expect(responsiveLess).toContain("width: inherit !important;");

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
    await expect(list.locator('[data-owner="organization-directory-row"]')).toHaveCount(1);
    await expect(owner(page, "organization-directory-search-bar")).toHaveCSS(
      "border",
      "1px solid rgb(204, 204, 204)",
    );
    if (viewport.width === 390) {
      const searchBar = owner(page, "organization-directory-search-bar");
      const input = owner(page, "organization-directory-search-input");
      const button = owner(page, "organization-directory-search-button");
      await expect(button).toBeVisible();
      const containment = await Promise.all(
        [searchBar, input, button].map(async (element) => {
          const box = await element.boundingBox();
          return box;
        }),
      );
      expect(containment[0]).not.toBeNull();
      expect(containment[1]).not.toBeNull();
      expect(containment[2]).not.toBeNull();
      const [bar, inputBox, buttonBox] = containment as [
        NonNullable<(typeof containment)[0]>,
        NonNullable<(typeof containment)[1]>,
        NonNullable<(typeof containment)[2]>,
      ];
      expect(inputBox.x).toBeGreaterThanOrEqual(bar.x);
      expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(bar.x + bar.width + 1);
      expect(buttonBox.x).toBeGreaterThanOrEqual(bar.x);
      expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(bar.x + bar.width + 1);
    }
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
