import { readFile } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. resolve builds those paths.
const resolve = (...parts: string[]) => parts.join("/");

const owners = {
  avatar: "site-user-list-row-avatar",
  avatarImage: "site-user-list-row-avatar-image",
  id: "site-user-list-row-user-id",
  name: "site-user-list-row-user-name",
} as const;

test("identity descendants own the complete legacy avatar, name, and ID surface", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  expect(legacy).toContain('class="avatar-wrap list-avatar"');
  expect(common).toContain(".avatar-wrap {");
  expect(pageLess).toContain("&.list-avatar {");
  expect(yobiUi).toContain("img {\n        width:100%;\n        vertical-align:top;");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);

  expect(route).toContain('data-owner="site-user-list-row-avatar-image"');

  // e2e closure ledger (2026-08-11): ROUTE_DOM — legacy site/userList.scala.html:73
  // renders <ul class="user-list-wrap">; the route owns it. The identity
  // descendants (avatar-wrap/list-avatar/user-name/user-id) stay class-free —
  // the data-owner identity surface owns them.
  expect(route).toContain('className="user-list-wrap"');
  for (const retired of ["avatar-wrap", "list-avatar", "user-name", "user-id"])
    expect(route).not.toContain(`className="${retired}"`);
});

test("ACTIVE identity preserves links, complete avatar output, and desktop/mobile geometry", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    // wtr-compat mocks fetch() only; native <img> loads bypass page.route, so the
    // fixture avatar 404s and renders broken (bucket-1 gap). Swap it for an
    // equivalent 45x45 data: URI so computed-geometry assertions see a loaded image.
    await page.evaluate(() => {
      const dataUri =
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45'/%3E";
      for (const img of document.querySelectorAll<HTMLImageElement>(
        'img[src="/assets/images/default-avatar-32.png"]',
      ))
        img.src = dataUri;
    });
    const row = page.locator('[data-owner="site-user-list-row"]').first();
    const avatar = row.locator(`[data-owner="${owners.avatar}"]`);
    const name = row.locator(`[data-owner="${owners.name}"]`);
    const id = row.locator(`[data-owner="${owners.id}"]`);
    await expect(name).toHaveText("Alice Example Long");
    await expect(id).toHaveText("@alice");
    await expect(avatar).toHaveAttribute("href", /\/alice$/u);
    await expect(name).toHaveAttribute("href", /\/alice$/u);
    await expect(id).toHaveAttribute("href", /\/alice$/u);
    // e2e closure ledger (2026-08-11): ROUTE_DOM — legacy site/userList.scala.html:75
    // renders <li class="row-fluid listitem">; the route owns listitem (the avatar
    // link stays class-free — data-owner surface).
    expect(
      await row.evaluate((node) =>
        Array.from(node.classList).some((token) => token === "listitem"),
      ),
    ).toBe(true);
    expect(await avatar.evaluate((node) => node.classList.contains("avatar-wrap"))).toBe(false);
    const evidence = await row.evaluate((row, owners) => {
      const get = (owner: string) => row.querySelector<HTMLElement>(`[data-owner="${owner}"]`)!;
      const avatar = get(owners.avatar),
        name = get(owners.name),
        id = get(owners.id);
      const box = (node: Element) => node.getBoundingClientRect().toJSON();
      const style = (node: Element) => {
        const s = getComputedStyle(node);
        return {
          backgroundColor: s.backgroundColor,
          borderRadius: s.borderRadius,
          color: s.color,
          display: s.display,
          float: s.float,
          fontSize: s.fontSize,
          fontStyle: s.fontStyle,
          fontWeight: s.fontWeight,
          height: s.height,
          lineHeight: s.lineHeight,
          margin: s.margin,
          overflow: s.overflow,
          verticalAlign: s.verticalAlign,
          width: s.width,
        };
      };
      const before = { avatar: style(avatar), id: style(id), name: style(name) };
      const image = style(get(owners.avatarImage));
      const imageElement = get(owners.avatarImage);
      const imageGeneratedClasses = Array.from(imageElement.classList).filter((token) =>
        token.startsWith("x"),
      );
      const matchedImageRules: string[] = [];
      const visitRules = (rules: CSSRuleList) => {
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule) {
            if (imageElement.matches(rule.selectorText)) matchedImageRules.push(rule.cssText);
          } else if ("cssRules" in rule) {
            visitRules((rule as CSSGroupingRule).cssRules);
          }
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          visitRules(sheet.cssRules);
        } catch {
          // Cross-origin sheets cannot be inspected; local Style sheets remain readable.
        }
      }
      const fixture = document.createElement("a");
      fixture.className = "avatar-wrap";
      row.append(fixture);
      const genericFallback = style(fixture);
      fixture.remove();
      return {
        before,
        boxes: { avatar: box(avatar), id: box(id), name: box(name), row: box(row) },
        genericFallback,
        image,
        imageGeneratedClasses,
        matchedImageRules,
      };
    }, owners);
    expect(evidence.before.avatar).toMatchObject({
      backgroundColor: "rgb(221, 221, 221)",
      borderRadius: "3px",
      display: "block",
      float: "left",
      height: "45px",
      margin: "3px 10px 0px 0px",
      overflow: "hidden",
      verticalAlign: "middle",
      width: "45px",
    });
    expect(evidence.genericFallback).toMatchObject({
      backgroundColor: "rgb(221, 221, 221)",
      borderRadius: "3px",
      display: "inline-block",
      overflow: "hidden",
      verticalAlign: "middle",
    });
    expect(evidence.matchedImageRules.some((rule) => /width:\s*100%/u.test(rule))).toBe(true);
    expect(evidence.boxes.avatar.width).toBe(45);
    // F5 (2026-08-13): the avatar img is forced to 32px by the frozen app.css
    // [data-owner=site-user-list-row-avatar-image] rule (height/width 32px
    // !important, vertical-align top — app.css:20494-20500), matching legacy
    // userList.scala.html:81 width="32" height="32"; the 45px is the
    // avatar-wrap container (boxes.avatar above), not the img.
    expect(evidence.image).toMatchObject({ verticalAlign: "top", width: "32px" });
    expect(evidence.before.name).toMatchObject({
      color: "rgb(0, 136, 204)",
      display: "block",
      fontSize: "14px",
      fontWeight: "700",
      lineHeight: "20px",
      margin: "8px 0px 0px 5px",
    });
    expect(evidence.before.id).toMatchObject({
      color: "rgb(153, 153, 153)",
      display: "block",
      fontSize: "13px",
      fontStyle: "italic",
      lineHeight: "20px",
      margin: "0px 0px 0px 5px",
    });
    expect(evidence.boxes.avatar.left - evidence.boxes.row.left).toBeCloseTo(0, 2);
    expect(evidence.boxes.avatar.top - evidence.boxes.row.top).toBeCloseTo(13, 2);
    expect(evidence.boxes.name.left - evidence.boxes.row.left).toBeCloseTo(5, 2);
    expect(evidence.boxes.name.top - evidence.boxes.row.top).toBeCloseTo(18, 2);
    expect(evidence.boxes.id.left).toBeCloseTo(evidence.boxes.name.left, 2);
    expect(evidence.boxes.id.top).toBeCloseTo(evidence.boxes.name.bottom, 2);
  }
});

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/assets/images/default-avatar-32.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      path: resolve("src/assets/legacy/default-avatar-34.png"),
    }),
  );
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Alice Example Long",
            emailAddress: "alice@example.com",
            id: 1,
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
