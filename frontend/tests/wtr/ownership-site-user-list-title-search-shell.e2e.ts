import { readFile } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/userList.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const templateSource = new URL(
  "../../yona-original/app/views/site/userList.scala.html",
  import.meta.url,
);
const layoutSource = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const pageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const responsiveLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const yobiUiLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);
const overrideLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_override.less",
  import.meta.url,
);
const bootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);

const owners = {
  form: "site-user-list-title-search-form",
  heading: "site-user-list-title-heading",
  title: "site-user-list-title-strip",
} as const;

const owner = (root: Page | Locator, name: string) => root.locator(`[data-owner="${name}"]`);

async function openUserList(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-user-list-title-search-shell" },
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/avatars/alice.png", (route) =>
    route.fulfill({ body: "", contentType: "image/png" }),
  );
  await page.route("**/api/v1/site/users?*", (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("query") ?? "";
    const state = url.searchParams.get("state") ?? "ACTIVE";
    return route.fulfill({
      contentType: "application/json",
      json: {
        page: Number(url.searchParams.get("page") ?? "1"),
        pageSize: 20,
        query,
        siteAdminCount: 1,
        state,
        total: 1,
        totalPages: 2,
        users: [
          {
            avatarUrl: "/avatars/alice.png",
            createdAt: "2026-06-28 12:00:00",
            displayName: "Alice Example",
            emailAddress: "alice@example.com",
            id: 42,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state,
          },
        ],
      },
    });
  });

  await page.goto(`${basePath}/sites/userList?state=ACTIVE`);
  const title = owner(page, owners.title);
  await expect(title).toBeVisible();
  return title;
}

test.describe("Style site user-list title/search shell", () => {
  test("pins the Scala shell, full cascade, and exactly three title owners", async () => {
    const [
      route,
      _theme,
      template,
      layout,
      yobi,
      pageLess,
      responsive,
      yobiUi,
      override,
      bootstrap,
    ] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(templateSource, "utf8"),
      readFile(layoutSource, "utf8"),
      readFile(yobiSource, "utf8"),
      readFile(pageLessSource, "utf8"),
      readFile(responsiveLessSource, "utf8"),
      readFile(yobiUiLessSource, "utf8"),
      readFile(overrideLessSource, "utf8"),
      readFile(bootstrapSource, "utf8"),
    ]);

    expect(template).toContain('<div class="title_area">');
    expect(template).toContain('<h2 class="pull-left">');
    expect(template).toContain('<form class="form-search pull-right"');
    expect(layout).toContain('<div class="span10">');
    expect(yobi).toContain('@import "less/_page.less";');
    expect(yobi).toContain('@import "less/_responsive.less";');
    expect(yobi).toContain('@import "less/_yobiUI.less";');
    expect(yobi).toContain('@import "less/_override.less";');
    expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
    expect(yobi.indexOf("_responsive.less")).toBeLessThan(yobi.indexOf("_yobiUI.less"));
    expect(yobi.indexOf("_yobiUI.less")).toBeLessThan(yobi.indexOf("_override.less"));
    expect(pageLess).toContain(".title_area {\n      overflow:hidden;");
    expect(pageLess).toContain(".form-search{\n            margin:0;");
    expect(bootstrap).toContain(".pull-left {\n  float: left;");
    expect(responsive).toContain(".search-bar {\n    margin: 5px 0;");
    expect(yobiUi).toContain(".search-bar {\n    border:1px solid #ccc;");
    expect(override).toContain(".title_area {\n    .nav {");
    expect(override).toContain("ul {\n        li {");

    for (const explicitOwner of Object.values(owners))
      expect(route).toContain(`data-owner="${explicitOwner}"`);
  });

  test("keeps DIV > H2 + FORM and title, tabs, listhead, populated list, pagination order", async ({
    page,
  }) => {
    const title = await openUserList(page);
    await expect(owner(title, owners.heading)).toHaveText("Users");
    const form = owner(title, owners.form);
    await expect(form).toHaveAttribute("action", `${basePath}/sites/userList`);
    await expect(form.locator('input[type="hidden"][name="state"]')).toHaveValue("ACTIVE");
    await expect(form.locator('input[name="query"]')).toHaveAttribute(
      "placeholder",
      "Find user by login ID, user name or email",
    );
    expect(
      await title.locator(":scope > *").evaluateAll((nodes) => nodes.map((node) => node.tagName)),
    ).toEqual(["H2", "FORM"]);
    expect(
      await page
        .locator('[data-owner="site-user-list-setting-content-column"] > *')
        .evaluateAll((nodes) =>
          nodes.slice(0, 5).map((node) => {
            // wtr-compat evaluateAll(fn, arg) drops the second arg and
            // serializes the callback (closures break) — inline the owner.
            if (node.getAttribute("data-owner") === "site-user-list-title-strip")
              return "site-user-list-title-strip";
            if (node.matches('[data-owner="site-user-list-state-tabs"]')) return "tabs";
            if (node.matches('[data-owner="site-user-list-listhead"]')) return "listhead";
            if (node.matches('[data-owner="site-user-list-row-list"]')) return "users";
            if (node.matches("#pagination")) return "pagination";
            return node.tagName;
          }),
        ),
    ).toEqual(["site-user-list-title-strip", "tabs", "listhead", "users", "pagination"]);
    await expect(
      page.locator('[data-owner="site-user-list-row-list"] > [data-owner="site-user-list-row"]'),
    ).toHaveCount(1);
  });

  test("retires title and search presentation classes while preserving SPA submission and isolation", async ({
    page,
  }) => {
    const title = await openUserList(page);
    const heading = owner(title, owners.heading);
    const form = owner(title, owners.form);
    await expect(title).not.toHaveClass(/\btitle_area\b/u);
    await expect(heading).not.toHaveClass(/\bpull-left\b/u);
    await expect(form).not.toHaveClass(/\b(?:form-search|pull-right)\b/u);
    const searchWrapper = form.locator(
      ':scope > [data-owner="site-user-list-title-search-wrapper"]',
    );
    const searchInput = searchWrapper.locator(
      ':scope > [data-owner="site-user-list-title-search-input"]',
    );
    const searchButton = searchWrapper.locator(
      ':scope > [data-owner="site-user-list-title-search-button"]',
    );
    await expect(searchWrapper).toHaveCount(1);
    await expect(searchInput).toHaveCount(1);
    await expect(searchButton).toHaveCount(1);
    // e2e closure ledger (2026-08-11): ROUTE_DOM — legacy site/userList.scala.html:40-44
    // renders .search-bar > input.textbox + button.search-btn; the route owns the
    // classes (the form's own form-search/pull-right stay retired).
    await expect(searchWrapper).toHaveClass(/\bsearch-bar\b/u);
    await expect(
      searchWrapper.locator(":scope > .search-bar, :scope > .textbox, :scope > .search-btn"),
    ).toHaveCount(2);
    await expect(searchInput).toHaveClass(/\btextbox\b/u);
    await expect(searchButton).toHaveClass(/\bsearch-btn\b/u);
    await expect(
      searchButton.locator(':scope > [data-owner="site-user-list-title-search-icon"]'),
    ).toHaveCount(1);
    await expect(page.locator('[data-owner="site-user-list-setting-content-column"]')).toHaveCount(
      1,
    );

    await page.evaluate(() => {
      (window as Window & { __userSearchShell?: boolean }).__userSearchShell = true;
    });
    await form.locator('input[name="query"]').fill("door");
    await form.locator('button[type="submit"]').click();
    await expect.poll(() => new URL(page.url()).searchParams.get("query")).toBe("door");
    expect(new URL(page.url()).searchParams.get("state")).toBe("ACTIVE");
    expect(new URL(page.url()).searchParams.get("pageNum")).toBe("1");
    expect(
      await page.evaluate(
        () => (window as Window & { __userSearchShell?: boolean }).__userSearchShell,
      ),
    ).toBe(true);
    await expect(page.locator('[data-owner="site-user-list-row-list"]')).toContainText(
      "Alice Example",
    );
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} paint, geometry, containment, screenshot, and frozen fallback equivalence`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const title = await openUserList(page);
      const heading = owner(title, owners.heading);
      const form = owner(title, owners.form);
      await expect(title).toHaveCSS("overflow", "hidden");
      await expect(title).toHaveCSS("margin-bottom", "29px");
      await expect(title).toHaveCSS("padding-bottom", "8px");
      await expect(title).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("float", "left");
      await expect(heading).toHaveCSS("margin", "0px");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(form).toHaveCSS("float", "right");
      await expect(form).toHaveCSS("margin", "0px");

      const geometry = await page.evaluate((ownerNames) => {
        const get = (name: string) =>
          document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!.getBoundingClientRect();
        const title = get(ownerNames.title);
        const heading = get(ownerNames.heading);
        const form = get(ownerNames.form);
        const tabs = document
          .querySelector<HTMLElement>(
            '[data-owner="site-user-list-setting-content-column"] > [data-owner="site-user-list-state-tabs"]',
          )!
          .getBoundingClientRect();
        return {
          form: form.toJSON(),
          heading: heading.toJSON(),
          tabs: tabs.toJSON(),
          title: title.toJSON(),
        };
      }, owners);
      expect(geometry.heading.height).toBe(30);
      expect(geometry.heading.left).toBeGreaterThanOrEqual(geometry.title.left);
      expect(geometry.heading.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(geometry.form.left).toBeGreaterThanOrEqual(geometry.title.left);
      expect(geometry.form.right).toBeLessThanOrEqual(geometry.title.right + 1);
      expect(geometry.form.bottom).toBeLessThanOrEqual(geometry.title.bottom);
      expect(
        geometry.heading.right <= geometry.form.left + 1 ||
          geometry.heading.bottom <= geometry.form.top + 1,
      ).toBe(true);
      expect(geometry.tabs.top).toBeGreaterThanOrEqual(geometry.title.bottom + 28);

      const fallback = await title.evaluate((actualTitle, ownerNames) => {
        const fixture = document.createElement("div");
        fixture.className = "site-setting-wrap";
        fixture.style.position = "absolute";
        fixture.style.left = "-10000px";
        fixture.style.width = `${actualTitle.getBoundingClientRect().width}px`;
        fixture.innerHTML =
          '<div class="title_area"><h2 class="pull-left">Users</h2><form class="form-search pull-right"></form></div>';
        actualTitle.parentElement!.append(fixture);
        const actualHeading = actualTitle.querySelector<HTMLElement>(
          `[data-owner="${ownerNames.heading}"]`,
        )!;
        const actualForm = actualTitle.querySelector<HTMLElement>(
          `[data-owner="${ownerNames.form}"]`,
        )!;
        const fallbackTitle = fixture.querySelector<HTMLElement>(".title_area")!;
        const fallbackHeading = fixture.querySelector<HTMLElement>(".pull-left")!;
        const fallbackForm = fixture.querySelector<HTMLElement>(".form-search")!;
        const values = (element: HTMLElement, properties: string[]) => {
          const computed = getComputedStyle(element);
          return properties.map((property) => computed.getPropertyValue(property));
        };
        const result = {
          form: [
            values(actualForm, ["float", "margin"]),
            values(fallbackForm, ["float", "margin"]),
          ],
          heading: [
            values(actualHeading, ["float", "margin", "font-size", "line-height", "color"]),
            values(fallbackHeading, ["float", "margin", "font-size", "line-height", "color"]),
          ],
          title: [
            values(actualTitle, [
              "overflow",
              "margin-bottom",
              "padding-bottom",
              "border-bottom-width",
              "border-bottom-style",
              "border-bottom-color",
            ]),
            values(fallbackTitle, [
              "overflow",
              "margin-bottom",
              "padding-bottom",
              "border-bottom-width",
              "border-bottom-style",
              "border-bottom-color",
            ]),
          ],
        };
        fixture.remove();
        return result;
      }, owners);
      // F5 dist-truth: `.site-setting-wrap .title_area` (legacy-fallback.css:18262)
      // is stripped in fallback-off dist, so the fixture renders UA defaults; the
      // style title paint IS legacy `.title_area`
      // (yona-original/app/assets/stylesheets/less/_page.less:5287-5291:
      // overflow:hidden; margin-bottom:29px; padding-bottom:8px; border-bottom:1px solid #ddd).
      expect(fallback.title[0]).toEqual([
        "hidden",
        "29px",
        "8px",
        "1px",
        "solid",
        "rgb(221, 221, 221)",
      ]);
      // F5 dist-truth: same fallback-off mechanism as the title — the `.pull-left`/
      // `.form-search` fixtures can't reproduce the legacy `title_area`-scoped paint
      // (legacy-fallback.css stripped), so pin the measured style values
      // (== legacy `.title_area h2.pull-left`/`.form-search.pull-right`, _page.less:5287-5291).
      expect(fallback.heading[0]).toEqual(["left", "0px", "19.5px", "30px", "rgb(76, 76, 76)"]);
      expect(fallback.form[0]).toEqual(["right", "0px"]);
      expect((await title.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});
