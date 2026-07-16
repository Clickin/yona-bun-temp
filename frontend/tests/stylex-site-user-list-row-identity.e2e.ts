import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const owners = {
  avatar: "site-user-list-row-avatar",
  id: "site-user-list-row-user-id",
  name: "site-user-list-row-user-name",
} as const;

test("identity descendants own legacy overrides while generic avatar fallback remains", () => {
  const route = readFileSync("src/routes/sites/userList.tsx", "utf8");
  const theme = readFileSync("src/routes/sites/-userList.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/site/userList.scala.html", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");
  expect(legacy).toContain('class="avatar-wrap list-avatar"');
  expect(common).toContain(".avatar-wrap {");
  expect(pageLess).toContain("&.list-avatar {");
  expect(yobiUi).toContain("img {\n        width:100%;\n        vertical-align:top;");
  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).toContain('className={`avatar-wrap ${avatarStyleProps.className ?? ""}`}');
  for (const retired of ["user-list-wrap", "list-avatar", "user-name", "user-id"])
    expect(route).not.toContain(`className="${retired}"`);
  expect(theme).toContain('identityName: "#0088cc"');
  expect(theme).toContain('identityId: "#999999"');
  expect(route).not.toContain("globalColors.");
});

test("ACTIVE identity preserves links, generic fallback, and desktop/mobile geometry", async ({
  page,
}) => {
  await installFixture(page);
  for (const viewport of [
    { name: "desktop", width: 1366, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${process.env.YONA_DEV_BASE_PATH ?? "/yona"}/sites/userList`);
    const row = page.locator('[data-stylex-owner="site-user-list-row"]').first();
    const avatar = row.locator(`[data-stylex-owner="${owners.avatar}"]`);
    const name = row.locator(`[data-stylex-owner="${owners.name}"]`);
    const id = row.locator(`[data-stylex-owner="${owners.id}"]`);
    await expect(name).toHaveText("Alice Example Long");
    await expect(id).toHaveText("@alice");
    await expect(avatar).toHaveAttribute("href", /\/alice$/u);
    await expect(name).toHaveAttribute("href", /\/alice$/u);
    await expect(id).toHaveAttribute("href", /\/alice$/u);
    expect(
      await row.evaluate((node) =>
        Array.from(node.classList).some((token) => token === "listitem"),
      ),
    ).toBe(false);
    expect(
      await avatar.evaluate((node) => ({
        generic: node.classList.contains("avatar-wrap"),
        generated: Array.from(node.classList).some((token) => token.startsWith("x")),
      })),
    ).toEqual({ generic: true, generated: true });
    const evidence = await row.evaluate((row, owners) => {
      const get = (owner: string) =>
        row.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`)!;
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
      const image = style(avatar.querySelector("img")!);
      avatar.classList.remove("avatar-wrap");
      const withoutGeneric = { avatar: style(avatar), id: style(id), name: style(name) };
      avatar.classList.add("avatar-wrap");
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
        withoutGeneric,
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
    expect(evidence.withoutGeneric.avatar).toMatchObject({
      display: "block",
      float: "left",
      height: "45px",
      margin: "3px 10px 0px 0px",
      width: "45px",
    });
    expect(evidence.genericFallback).toMatchObject({
      backgroundColor: "rgb(221, 221, 221)",
      borderRadius: "3px",
      display: "inline-block",
      overflow: "hidden",
      verticalAlign: "middle",
    });
    // The local default-avatar fixture URL is intentionally unresolved and renders a 16px
    // broken-image intrinsic box; the owned wrapper remains 45px and frozen source owns width.
    expect(evidence.image.verticalAlign).toBe("top");
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
