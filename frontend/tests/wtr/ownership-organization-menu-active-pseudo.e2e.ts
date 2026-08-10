import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. resolve builds readFileSync fixture paths.
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");

test.use({ locale: "en-US" });

test("organization home menu owns the legacy active pseudo state", async ({ page }) => {
  const route = readFileSync("src/routes/organizations/$organizationName.tsx", "utf8");
  const legacy = readFileSync(
    resolve(repoRoot, "yona-original/app/views/organization/menu.scala.html"),
    "utf8",
  );
  const yobi = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );
  const pageLess = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const common = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_common.less"),
    "utf8",
  );
  const bootstrap = readFileSync(
    resolve(repoRoot, "yona-original/public/bootstrap/css/bootstrap.css"),
    "utf8",
  );
  const messages = readFileSync(resolve(repoRoot, "yona-original/conf/messages"), "utf8");

  expect(legacy).toContain('<ul class="project-menu-nav project-menu-gruop">');
  expect(legacy).toContain("@if(request.path.endsWith(org.name)){active}");
  expect(legacy).toContain('@if(request.path.contains(org.name + "/issues")){active}');
  expect(legacy).toContain('@if(request.path.contains(org.name + "/boards")){active}');
  expect(legacy).toContain('@if(request.path.contains(org.name + "/pullrequests")){active}');
  expect(legacy).toContain('@Messages("title.organizationHome")');
  expect(legacy).toContain('@Messages("menu.issue")');
  expect(legacy).toContain('@Messages("menu.board")');
  expect(legacy).toContain('@Messages("menu.pullRequest")');
  // Legacy organization menu links are plain text anchors; unlike project links, they have no short-menu spans.
  expect(legacy).not.toContain("short-menu");
  expect(yobi.trim().split("\n")).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(pageLess).toContain("&.active {");
  expect(pageLess).toContain("color : #fc491e;");
  for (const declaration of [
    'content:" ";',
    "position: absolute;",
    "bottom: 0;",
    "bottom: -1px;",
    "left: 50%;",
    "width: 0;",
    "height: 0;",
    "overflow: hidden;",
    "border: 8px solid transparent;",
    "border-style: outset outset solid outset;",
    "border-bottom-color: #ddd;",
    "border-bottom-color: #FFF;",
    "margin-left: -8px;",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(common).toContain("body,div,dl,dt,dd,ul,ol,li");
  expect(bootstrap).toContain(".pull-left {");
  for (const message of [
    "title.organizationHome =",
    "menu.issue = Issue",
    "menu.board = Board",
    "menu.pullRequest = Pull request",
    "menu.admin = Project configuration",
  ]) {
    expect(messages).toContain(message);
  }
  for (const owner of [
    "organization-menu-shell",
    "organization-menu-inner",
    "organization-menu-group",
    "organization-menu-item-home",
    "organization-menu-link-home",
  ]) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  await mockOrganizationHome(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });

  const group = page.locator('[data-owner="organization-menu-group"]');
  const items = group.locator(":scope > li");
  const links = group.locator(":scope > li > a");
  await expect(group).toBeVisible();
  await expect(items).toHaveCount(4);
  await expect(links).toHaveText(["Group Home", "Issue", "Board", "Pull request"]);
  expect(
    await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href"))),
  ).toEqual([
    `${basePath}/organizations/weblabs`,
    expect.stringContaining(`${basePath}/organizations/weblabs/issues`),
    expect.stringContaining(`${basePath}/organizations/weblabs/boards`),
    expect.stringContaining(`${basePath}/organizations/weblabs/pullrequests`),
  ]);
  await expect(items.nth(0)).toHaveClass(/\bactive\b/u);
  await expect(items.nth(1)).not.toHaveClass(/\bactive\b/u);
  await expect(page.locator('[data-owner="organization-menu-settings"] > li')).toHaveCount(0);
  await expect(items.nth(0)).toHaveCSS("color", "rgb(252, 73, 30)");

  const pseudo = await items.nth(0).evaluate((element) => ({
    after: getComputedStyle(element, "::after"),
    before: getComputedStyle(element, "::before"),
  }));
  expect(pseudo.before.content).toBe('" "');
  expect(pseudo.before.position).toBe("absolute");
  expect(pseudo.before.bottom).toBe("0px");
  expect(pseudo.before.borderBottomColor).toBe("rgb(221, 221, 221)");
  expect(pseudo.after.content).toBe('" "');
  expect(pseudo.after.bottom).toBe("-1px");
  expect(pseudo.after.borderBottomColor).toBe("rgb(255, 255, 255)");
  // C2 retired: CSS :hover/:focus/:active synthesis is CDP-only; base-state
  // paint + geometry remain pinned (hover coverage lives in the sibling
  // style-organization-home-header-menu spec).
  await links.nth(1).hover();

  for (const fallbackOff of [false, true]) {
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((elements) => elements.forEach((element) => element.remove()));
    }
    for (const viewport of [
      { height: 900, width: 1366 },
      { height: 844, width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const geometry = await page.evaluate(() => {
        const outer = document.querySelector<HTMLElement>('[data-owner="organization-menu-shell"]');
        const inner = document.querySelector<HTMLElement>('[data-owner="organization-menu-inner"]');
        const group = document.querySelector<HTMLElement>('[data-owner="organization-menu-group"]');
        const active = document.querySelector<HTMLElement>(
          '[data-owner="organization-menu-item-home"]',
        );
        const links = Array.from(
          document.querySelectorAll<HTMLElement>('[data-owner^="organization-menu-link-"]'),
        );
        if (!outer || !inner || !group || !active || links.length !== 4) {
          throw new Error("organization menu geometry missing");
        }
        const box = (element: Element) => {
          const rect = element.getBoundingClientRect();
          return { bottom: rect.bottom, left: rect.left, right: rect.right, top: rect.top };
        };
        return {
          active: box(active),
          group: box(group),
          inner: box(inner),
          links: links.map(box),
          outer: box(outer),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        };
      });
      expect(geometry.inner.left).toBeGreaterThanOrEqual(geometry.outer.left);
      expect(geometry.inner.right).toBeLessThanOrEqual(geometry.outer.right);
      expect(geometry.group.left).toBeGreaterThanOrEqual(geometry.inner.left);
      expect(geometry.group.right).toBeLessThanOrEqual(geometry.inner.right);
      expect(geometry.active.top).toBeGreaterThanOrEqual(geometry.outer.top);
      for (const link of geometry.links) {
        expect(link.left).toBeGreaterThanOrEqual(geometry.outer.left);
        expect(link.right).toBeLessThanOrEqual(geometry.outer.right);
        expect(link.top).toBeGreaterThanOrEqual(geometry.outer.top);
        if (viewport.width > 720) {
          expect(link.bottom).toBeLessThanOrEqual(geometry.outer.bottom);
        }
      }
      if (viewport.width > 720) {
        expect(geometry.active.bottom).toBeLessThanOrEqual(geometry.outer.bottom);
      }
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 8);
    }
  }
});

async function mockOrganizationHome(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = { isAnonymous: false, isGuest: false, isSiteAdmin: false, loginId: "admin" };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanCreateProject: false,
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
        adminMembers: [],
        memberMembers: [],
      },
    }),
  );
}
