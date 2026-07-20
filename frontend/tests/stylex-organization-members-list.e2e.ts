import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const owners = {
  page: "organization-members-page",
  shell: "organization-members-shell",
  header: "organization-members-header",
  addForm: "organization-members-add-form",
  avatar: "organization-member-avatar",
  avatarImage: "organization-member-avatar-image",
  id: "organization-member-id",
  meta: "organization-member-meta",
  list: "organization-members-list",
  name: "organization-member-name",
  row: "organization-member-row",
} as const;

test.use({ locale: "en-US" });

test("organization member list records the exact six-owner legacy boundary", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/members.tsx", "utf8");
  const theme = readFileSync(
    "src/routes/organizations/$organizationName/-members.stylex.ts",
    "utf8",
  );

  for (const owner of Object.values(owners)) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(route).toContain("members project row-fluid");
  expect(route).toContain("member span6 span-hard-wrap");
  expect(route).toContain('marginLeft: "5px"');
  expect(route).toContain('[globalBreakpoints.mobile]: "95%"');
  expect(route).toContain('[globalBreakpoints.mobile]: "100vw"');
  expect(route).not.toContain('className="avatar-wrap mlarge pull-left mr10"');
  expect(route).not.toContain('className="member-name"');
  expect(route).not.toContain('className="member-id"');
  expect(theme).toContain("organizationMemberColors");
  expect(theme).toContain('rowBorder: "#dddddd"');
  expect(theme).toContain('avatarSurface: "#dddddd"');
  expect(theme).toContain('idText: "#cccccc"');
  expect(theme).not.toMatch(/(?:margin|padding|width|height|font|lineHeight)/u);
});

for (const viewport of [
  { height: 900, name: "desktop", rowWidthRatio: 0.4893617021276595, width: 1366 },
  { height: 844, name: "mobile", rowWidthRatio: 1, width: 390 },
] as const) {
  test(`organization member list preserves populated and empty ${viewport.name} output`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const fixture = { populated: true };
    await mockMembers(page, fixture);
    await page.goto(`${basePath}/organizations/weblabs/members`);

    const list = page.locator(`[data-stylex-owner="${owners.list}"]`);
    const rows = page.locator(`[data-stylex-owner="${owners.row}"]`);
    const avatars = page.locator(`[data-stylex-owner="${owners.avatar}"]`);
    const avatarImages = page.locator(`[data-stylex-owner="${owners.avatarImage}"]`);
    const names = page.locator(`[data-stylex-owner="${owners.name}"]`);
    const ids = page.locator(`[data-stylex-owner="${owners.id}"]`);
    await expect(list).toBeAttached();
    await expect(rows).toHaveCount(2);
    await expect(avatars).toHaveCount(2);
    await expect(avatarImages).toHaveCount(2);
    await expect(names).toHaveText(["Site Admin", "Dev Member"]);
    await expect(ids).toHaveText(["@admin", "@dev"]);
    await expect(list).toHaveClass(/\bmembers project row-fluid\b/u);
    await expect(rows.first()).toHaveClass(/\bmember span6 span-hard-wrap\b/u);
    await expect(avatars.first()).not.toHaveClass(/\b(?:avatar-wrap|mlarge|pull-left|mr10)\b/u);
    await expect(names.first()).not.toHaveClass(/\bmember-name\b/u);
    await expect(ids.first()).not.toHaveClass(/\bmember-id\b/u);

    await expect(list).toHaveCSS("list-style-type", "none");
    await expect(list).toHaveCSS("margin", "0px");
    await expect(rows.first()).toHaveCSS("border-bottom", "1px solid rgb(221, 221, 221)");
    await expect(rows.first()).toHaveCSS("padding", "10px 5px");
    await expect(avatars.first()).toHaveCSS("background-color", "rgb(221, 221, 221)");
    await expect(avatars.first()).toHaveCSS("border-radius", "3px");
    await expect(names.first()).toHaveCSS("font-weight", "700");
    await expect(ids.first()).toHaveCSS("color", "rgb(204, 204, 204)");

    const geometry = await list.evaluate((element) => {
      const rowElements = Array.from(
        element.querySelectorAll<HTMLElement>('[data-stylex-owner="organization-member-row"]'),
      );
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      };
      const textBox = (target: Element) => {
        const range = document.createRange();
        range.selectNodeContents(target);
        const rect = range.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
      };
      return {
        list: box(element),
        rows: rowElements.map((row) => ({
          avatar: box(row.querySelector('[data-stylex-owner="organization-member-avatar"]')!),
          id: box(row.querySelector('[data-stylex-owner="organization-member-id"]')!),
          idText: textBox(row.querySelector('[data-stylex-owner="organization-member-id"]')!),
          name: box(row.querySelector('[data-stylex-owner="organization-member-name"]')!),
          nameText: textBox(row.querySelector('[data-stylex-owner="organization-member-name"]')!),
          row: box(row),
        })),
      };
    });
    if (viewport.name === "mobile") {
      expect(geometry.list.width).toBe(viewport.width);
      expect(geometry.list.right).toBe(viewport.width);
      expect(geometry.rows[0]!.row.width).toBe(viewport.width);
      expect(geometry.rows[0]!.row.left).toBe(5);
    }
    for (const row of geometry.rows) {
      expect(row.row.height).toBe(63);
      expect(row.row.width / geometry.list.width).toBeCloseTo(viewport.rowWidthRatio, 4);
      expect(row.avatar.width).toBe(40);
      expect(row.avatar.height).toBe(40);
      expect(row.avatar.left).toBe(row.row.left + 5);
      expect(row.avatar.top).toBe(row.row.top + 10);
      expect(row.name.left).toBe(row.row.left + 5);
      expect(row.name.top).toBe(row.row.top + 12);
      expect(row.id.left).toBe(row.name.left);
      expect(row.nameText.left).toBe(row.avatar.right + 10);
      expect(row.idText.left).toBe(row.avatar.right + 10);
      expect(row.id.bottom).toBeLessThanOrEqual(row.row.bottom - 8);
    }
    if (viewport.name === "desktop") {
      expect(geometry.rows[1]!.row.top).toBe(geometry.rows[0]!.row.top);
      expect(geometry.rows[1]!.row.left).toBeGreaterThan(geometry.rows[0]!.row.right);
    } else {
      expect(geometry.rows[1]!.row.top).toBe(geometry.rows[0]!.row.bottom);
    }

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-organization-members-${viewport.name}.png`),
    });

    fixture.populated = false;
    await page.reload();
    await expect(list).toBeAttached();
    await expect(rows).toHaveCount(0);
    const emptyListGeometry = await list.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { height: rect.height, right: rect.right, width: rect.width };
    });
    expect(emptyListGeometry.height).toBe(0);
    if (viewport.name === "mobile") {
      expect(emptyListGeometry.width).toBe(viewport.width);
      expect(emptyListGeometry.right).toBe(viewport.width);
    }
  });
}

async function mockMembers(page: Page, fixture: { populated: boolean }) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);

  await page.route("**/api/v1/organizations/weblabs/admin", (route) =>
    route.fulfill({ contentType: "application/json", json: adminPayload(fixture.populated) }),
  );
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        logoUrl: "",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      },
    }),
  );
  await page.route("**/api/v1/organizations/weblabs", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        description: "Web labs group",
        id: 42,
        logoUrl: "",
        organizationName: "weblabs",
        viewerCanUpdate: true,
      },
    }),
  );
}

function adminPayload(populated: boolean) {
  return {
    deleteAllowed: true,
    enrollmentRequests: [],
    id: 42,
    logoUrl: "",
    members: populated
      ? [
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "admin",
            role: "org_admin",
            userId: 1,
            userLabel: "Site Admin",
          },
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "dev",
            role: "org_member",
            userId: 2,
            userLabel: "Dev Member",
          },
        ]
      : [],
    organizationName: "weblabs",
    roleOptions: [
      { label: "Group Manager", role: "org_admin" },
      { label: "Group Member", role: "org_member" },
    ],
    viewerCanUpdate: true,
  };
}
