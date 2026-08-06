import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFile, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a no-op); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "site-user-list-breadcrumb-heading",
  inner: "site-user-list-breadcrumb-inner",
  outer: "site-user-list-breadcrumb-outer",
} as const;

test.use({ locale: "en-US" });

test("breadcrumb owns only declarations lost with its two presentation classes", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const userList = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const manifest = readFileSync(
    "public/legacy-assets/stylesheets/legacy-fallback.manifest.json",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(userList).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-breadcrumb-outer">');
  expect(layout).toContain('<div class="site-breadcrumb-inner">');
  expect(layout).toContain('<h3>@Messages("site.sidebar")</h3>');
  expect(messages).toContain("site.sidebar = Site management");
  for (const imported of ["_common.less", "_page.less", "_responsive.less"])
    expect(yobi).toContain(imported);
  expect(yobi.indexOf("_common.less")).toBeLessThan(yobi.indexOf("_page.less"));
  expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
  expect(common).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
  expect(common).toContain("h1,h2,h3,h4,h5,h6 { text-rendering:auto !important; }");
  expect(bootstrap).toContain("h3 {\n  font-size: 24.5px;");
  expect(pageLess).toContain(".site-breadcrumb-inner {\n        margin:0 auto;");
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(pageLess).toContain("line-height: 30px;");
  expect(responsive).toContain(".site-breadcrumb-outer {\n    min-width: 10px !important;");
  expect(responsive).toContain(
    ".site-breadcrumb-outer {\n    width: 100%;\n    padding: 0 10px;\n    box-sizing: border-box;",
  );
  expect(manifest).toContain('"id": "bootstrap-responsive"');
  expect(manifest).toContain(
    "inactive in legacy layout.scala.html and retained as parity evidence",
  );

  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('className="site-breadcrumb-outer"');
  expect(route).not.toContain('className="site-breadcrumb-inner"');
  for (const declaration of [
    'boxSizing: "border-box"',
    '"@media (max-width: 720px)": "10px"',
    'padding: "0px 10px"',
    'width: "100%"',
    'margin: "0px auto"',
    'lineHeight: "30px"',
    'padding: "10px 10px 5px"',
  ])
    expect(route).toContain(declaration);
  const breadcrumbHeadingBlock = route.slice(
    route.indexOf("breadcrumbHeading: {"),
    route.indexOf("stateTabs: {"),
  );
  expect(breadcrumbHeadingBlock).toContain('lineHeight: "30px"');
  expect(breadcrumbHeadingBlock).toContain('padding: "10px 10px 5px"');
  for (const sharedHeadingDeclaration of [
    'fontFamily: "inherit"',
    'fontSize: "24.5px"',
    'fontWeight: "700"',
    'textRendering: "auto"',
  ])
    expect(breadcrumbHeadingBlock).not.toContain(sharedHeadingDeclaration);
});

test("breadcrumb preserves authenticated desktop and mobile output in one browser", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/sites/userList`);
    const outer = page.locator(`[data-stylex-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-stylex-owner="${owners.inner}"]`);
    const heading = page.locator(`[data-stylex-owner="${owners.heading}"]`);
    await expect(heading).toHaveText("Site management");
    await expect(outer).not.toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);
    expect(await outer.locator(":scope > *").count()).toBe(1);
    expect(await inner.locator(":scope > *").count()).toBe(1);
    await expect(inner.locator(":scope > h3")).toHaveCount(1);

    const evidence = await page.evaluate((names) => {
      const find = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
      const outer = find(names.outer);
      const inner = find(names.inner);
      const heading = find(names.heading);
      const pageWrap = find("site-user-list-page-wrap-outer");
      const box = (element: HTMLElement) => element.getBoundingClientRect().toJSON();
      const style = (element: HTMLElement, properties: string[]) => {
        const computed = getComputedStyle(element);
        return Object.fromEntries(
          properties.map((property) => [property, computed.getPropertyValue(property)]),
        );
      };
      return {
        boxes: { heading: box(heading), inner: box(inner), outer: box(outer), page: box(pageWrap) },
        documentWidth: document.documentElement.scrollWidth,
        heading: style(heading, [
          "color",
          "font-family",
          "font-size",
          "font-weight",
          "line-height",
          "margin",
          "padding",
          "text-rendering",
        ]),
        inner: style(inner, ["margin"]),
        outer: style(outer, ["border-bottom-width", "box-sizing", "min-width", "padding", "width"]),
      };
    }, owners);
    expect(evidence.outer).toEqual({
      "border-bottom-width": "0px",
      "box-sizing": "border-box",
      "min-width": viewport.name === "mobile" ? "10px" : "0px",
      padding: "0px 10px",
      width: `${viewport.width}px`,
    });
    expect(evidence.inner).toEqual({ margin: "0px" });
    expect(evidence.heading).toMatchObject({
      "font-size": "15.21px",
      "font-weight": "700",
      "line-height": "30px",
      margin: "0px",
      padding: "10px 10px 5px",
      "text-rendering": "auto",
    });
    expect(evidence.heading.color).toBe("rgb(51, 51, 51)");
    expect(evidence.heading["font-family"]).toMatch(/Segoe UI|Helvetica/u);
    const { heading: headingBox, inner: innerBox, outer: outerBox, page: pageBox } = evidence.boxes;
    expect(outerBox).toMatchObject({ height: 45, left: 0, width: viewport.width });
    expect(outerBox.right).toBe(viewport.width);
    if (viewport.name === "desktop") expect(outerBox.top).toBe(83);
    // Authenticated legacy mobile is also y=83. Local mobile starts at y=106 because the excluded
    // global mobile GNB is 23px taller, so this owner gates its local geometry and following rhythm.
    expect(innerBox).toMatchObject({
      height: 45,
      left: 10,
      top: outerBox.top,
      width: viewport.width - 20,
    });
    expect(headingBox).toMatchObject({
      height: 45,
      left: 10,
      top: outerBox.top,
      width: viewport.width - 20,
    });
    expect(headingBox.left).toBe(innerBox.left);
    expect(headingBox.right).toBe(innerBox.right);
    expect(innerBox.left).toBeGreaterThanOrEqual(outerBox.left);
    expect(innerBox.right).toBeLessThanOrEqual(outerBox.right);
    expect(headingBox.left).toBeGreaterThanOrEqual(outerBox.left);
    expect(headingBox.right).toBeLessThanOrEqual(outerBox.right);
    expect(pageBox.top).toBe(outerBox.bottom + 10);
    // The populated English action row is excluded and independently accounts for mobile's 3px
    // document overflow; breadcrumb containment remains exact, while desktop keeps the document gate.
    if (viewport.name === "desktop") expect(evidence.documentWidth).toBe(viewport.width);
    mkdirSync(resolve("..", "output", "playwright"), { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        "..",
        "output",
        "playwright",
        `stylex-site-user-list-breadcrumb-${viewport.name}.png`,
      ),
    });
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 3,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28 12:00:00",
            displayName: "Alice Kim",
            emailAddress: "alice@example.com",
            id: 43,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state: "ACTIVE",
          },
        ],
      },
    }),
  );
}
