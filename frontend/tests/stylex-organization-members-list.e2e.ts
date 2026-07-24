import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const repoRoot = resolve("..");
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const owners = {
  page: "organization-members-page",
  shell: "organization-members-shell",
  header: "organization-members-header",
  addForm: "organization-members-add-form",
  avatar: "organization-member-avatar",
  avatarImage: "organization-member-avatar-image",
  enrollmentAvatarWrap: "organization-enrollment-avatar-wrap",
  enrollmentDetails: "organization-members-enrollment-details",
  id: "organization-member-id",
  meta: "organization-member-meta",
  list: "organization-members-list",
  name: "organization-member-name",
  row: "organization-member-row",
} as const;

test.use({ locale: "en-US" });

test("organization member list records the exact six-owner legacy boundary", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/members.tsx", "utf8");
  const legacyTemplate = readFileSync(
    resolve(repoRoot, "yona-original/app/views/organization/members.scala.html"),
    "utf8",
  );
  const legacyPage = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_page.less"),
    "utf8",
  );
  const legacyResponsive = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_responsive.less"),
    "utf8",
  );
  const legacyYobi = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );
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
  expect(route).toContain("onAccept={(userId, loginId) =>");
  expect(route).toContain("onAccept(Number(user.userId), loginId)");
  expect(route).toContain('data-stylex-owner="organization-members-header"');
  expect(route).toContain('data-stylex-owner="organization-members-add-form-input"');
  expect(route).toContain('marginBottom: "10px"');
  expect(route).toContain('position: "relative"');
  expect(route).toContain('default: "384px"');
  expect(route).toContain('[globalBreakpoints.mobile]: "inherit !important"');
  expect(route).toContain("margin: 0");
  expect(route).toContain('borderRadius: "2px"');
  expect(legacyTemplate).toContain('<div class="inner-bubble">');
  expect(legacyTemplate).toContain('<form class="nm"');
  expect(legacyTemplate).toContain('class="text uname"');
  expect(legacyTemplate).toContain('<div class="member-setting">');
  expect(legacyTemplate).toContain('<div class="btn-group" data-name="roleof-');
  expect(legacyTemplate).toContain('class="ybtn ybtn-danger ybtn-small"');
  expect(legacyPage).toContain(".inner-bubble {");
  expect(legacyPage).toContain("margin-bottom: 10px;");
  expect(legacyPage).toContain("position: relative;");
  expect(legacyPage).toContain("width: 384px;");
  expect(legacyPage).toContain("margin: 0;");
  expect(legacyPage).toContain(".border-radius(2px);");
  expect(legacyResponsive).toContain(".inner-bubble .text.uname {");
  expect(legacyResponsive).toContain("width: inherit !important;");
  expect(legacyPage).toContain(".member-setting {");
  expect(legacyPage).toContain("position: absolute;");
  expect(legacyPage).toContain("right:0;");
  expect(legacyPage).toContain("top: 15px;");
  for (const importedStylesheet of [
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
  ]) {
    expect(legacyYobi).toContain(importedStylesheet);
  }
  expect(route).not.toContain('className="avatar-wrap mlarge pull-left mr10"');
  expect(route).not.toContain('className="member-name"');
  expect(route).not.toContain('className="member-id"');
  expect(theme).toContain("organizationMemberColors");
  expect(theme).toContain('rowBorder: "#dddddd"');
  expect(theme).toContain('avatarSurface: "#dddddd"');
  expect(theme).toContain('idText: "#cccccc"');
  expect(theme).not.toMatch(/(?:margin|padding|width|height|font|lineHeight)/u);
});

for (const fallbackOff of [false, true]) {
  test(`organization member add form StyleX boundary ${fallbackOff ? "fallback-off" : "normal"}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await mockMembers(page, { populated: false });
    await page.goto(`${basePath}/organizations/weblabs/members`);
    if (fallbackOff) {
      const fallback = page.locator('link[href*="legacy-fallback.css"]');
      if (await fallback.count()) await fallback.evaluate((element) => element.remove());
    }

    const bubble = page.locator('[data-stylex-owner="organization-members-header"]');
    const input = page.locator('[data-stylex-owner="organization-members-add-form-input"]');
    await expect(bubble).toBeVisible();
    await expect(input).toBeVisible();
    await expect(input).toHaveClass(/\btext\b.*\buname\b/u);
    await expect(bubble).toHaveCSS("margin-bottom", "10px");
    await expect(bubble).toHaveCSS("position", "relative");
    await expect(input).toHaveCSS("width", "384px");
    await expect(input).toHaveCSS("margin", "0px");
    await expect(input).toHaveCSS("border-radius", "2px");
    await expect(bubble).not.toHaveAttribute("style", /.+/u);
    await expect(input).not.toHaveAttribute("style", /.+/u);

    const requests = await mockMemberAddFormRoutes(page);
    await input.fill("car");
    const menu = page.locator(".inner-bubble .typeahead.dropdown-menu");
    await expect(menu).toBeVisible();
    await expect(menu.locator("li")).toHaveCount(1);
    await menu.locator("button").click();
    await expect(input).toHaveValue("carol");
    await expect(menu).toHaveCount(0);
    await page.locator("#addNewMember").evaluate((form: HTMLFormElement) => form.requestSubmit());
    await expect.poll(() => requests.addedLoginIds).toEqual(["carol"]);

    const desktop = await bubble.evaluate((element) => {
      const bubbleBox = element.getBoundingClientRect();
      const inputBox = element.querySelector<HTMLInputElement>("#loginId")!.getBoundingClientRect();
      return { bubbleBox, inputBox, scrollWidth: document.documentElement.scrollWidth };
    });
    expect(desktop.inputBox.left).toBeGreaterThanOrEqual(desktop.bubbleBox.left);
    expect(desktop.inputBox.right).toBeLessThanOrEqual(desktop.bubbleBox.right + 2);
    expect(desktop.scrollWidth).toBeLessThanOrEqual(1366);
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `stylex-organization-members-add-form-${fallbackOff ? "fallback-off" : "normal"}-desktop.png`,
      ),
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const mobile = await bubble.evaluate((element) => {
      const bubbleBox = element.getBoundingClientRect();
      const inputBox = element.querySelector<HTMLInputElement>("#loginId")!.getBoundingClientRect();
      return { bubbleBox, inputBox, scrollWidth: document.documentElement.scrollWidth };
    });
    expect(mobile.inputBox.left).toBeGreaterThanOrEqual(mobile.bubbleBox.left);
    expect(mobile.inputBox.right).toBeLessThanOrEqual(mobile.bubbleBox.right + 2);
    expect(mobile.inputBox.width).toBeLessThan(384);
    expect(mobile.inputBox.width).toBeLessThanOrEqual(mobile.bubbleBox.width);
    expect(mobile.scrollWidth).toBeLessThanOrEqual(390);
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `stylex-organization-members-add-form-${fallbackOff ? "fallback-off" : "normal"}-mobile.png`,
      ),
    });
  });
}

for (const fallbackOff of [false, true]) {
  test(`organization member role/action geometry ${fallbackOff ? "fallback-off" : "normal"}`, async ({
    page,
  }) => {
    const viewports = [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ] as const;
    const requests = { deleted: [] as number[], roles: [] as string[] };
    await mockMembers(page, { populated: true });
    await page.route("**/api/v1/organizations/weblabs/members/*", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as { role?: string };
        requests.roles.push(body.role ?? "");
      }
      if (route.request().method() === "DELETE") {
        requests.deleted.push(1);
      }
      await route.fulfill({ contentType: "application/json", json: adminPayload(true) });
    });

    await page.setViewportSize(viewports[0]);
    await page.goto(`${basePath}/organizations/weblabs/members`);
    if (fallbackOff) {
      const fallback = page.locator('link[href*="legacy-fallback.css"]');
      if (await fallback.count()) await fallback.evaluate((element) => element.remove());
    }

    const row = page.locator('[data-stylex-owner="organization-member-row"]').first();
    const meta = row.locator('[data-stylex-owner="organization-member-meta"]');
    const roleButton = meta.locator(".btn-group > button");
    await expect(row).toBeVisible();
    await expect(meta).toHaveClass(/\bmember-setting\b/u);
    await expect(meta).not.toHaveAttribute("style", /.+/u);
    await expect(meta).toHaveCSS("position", "absolute");
    await expect(meta).toHaveCSS("right", "0px");
    await expect(meta).toHaveCSS("top", "15px");
    await expect(roleButton).toContainText("Group Manager");

    await roleButton.click();
    const memberRole = meta.locator('li[data-value="org_member"] button');
    if (!fallbackOff) await expect(memberRole).toBeVisible();
    await memberRole.click({ force: fallbackOff });
    await expect.poll(() => requests.roles).toEqual(["org_member"]);

    await meta.locator("button.ybtn-danger").click();
    const deleteModal = page.locator("#alertDeletion");
    await expect(deleteModal).toBeVisible();
    const deleteRequest = page.waitForRequest(
      (request) =>
        request.method() === "DELETE" &&
        request.url().includes("/api/v1/organizations/weblabs/members/1"),
    );
    await deleteModal.locator("#deleteBtn").dispatchEvent("click");
    await deleteRequest;
    await expect.poll(() => requests.deleted).toEqual([1]);

    for (const viewport of viewports) {
      if (viewport.name === "mobile") {
        await page.setViewportSize(viewport);
        await page.reload();
      }
      const metrics = await row.evaluate((element) => {
        const rowBox = element.getBoundingClientRect();
        const metaElement = element.querySelector<HTMLElement>(
          '[data-stylex-owner="organization-member-meta"]',
        );
        if (!metaElement) return null;
        const metaBox = metaElement.getBoundingClientRect();
        return {
          documentScrollWidth: document.documentElement.scrollWidth,
          metaBox,
          rowBox,
        };
      });
      expect(metrics).not.toBeNull();
      expect(metrics!.metaBox.left).toBeGreaterThanOrEqual(metrics!.rowBox.left);
      expect(metrics!.metaBox.right).toBeLessThanOrEqual(metrics!.rowBox.right + 1);
      // Frozen _page.less keeps member margin-left:5px with width:100vw; allow its
      // legacy boundary tolerance while retaining strict row/meta containment.
      const documentWidthLimit = viewport.name === "mobile" ? viewport.width + 8 : viewport.width;
      expect(metrics!.documentScrollWidth).toBeLessThanOrEqual(documentWidthLimit);
      mkdirSync(screenshotDirectory, { recursive: true });
      await page.screenshot({
        fullPage: true,
        path: resolve(
          screenshotDirectory,
          `stylex-organization-members-role-action-${fallbackOff ? "fallback-off" : "normal"}-${viewport.name}.png`,
        ),
      });
    }
  });
}

test("organization enrollment avatar owner follows the frozen legacy float boundary", () => {
  const route = readFileSync("src/routes/organizations/$organizationName/members.tsx", "utf8");
  const legacyTemplate = readFileSync(
    resolve(repoRoot, "yona-original/app/views/organization/members.scala.html"),
    "utf8",
  );
  const legacyCommon = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/less/_common.less"),
    "utf8",
  );
  const legacyBootstrap = readFileSync(
    resolve(repoRoot, "yona-original/public/bootstrap/css/bootstrap.css"),
    "utf8",
  );
  const legacyYobi = readFileSync(
    resolve(repoRoot, "yona-original/app/assets/stylesheets/yobi.less"),
    "utf8",
  );

  expect(route).toContain('data-stylex-owner="organization-enrollment-avatar-wrap"');
  expect(route).toContain('data-stylex-owner="organization-members-enrollment-details"');
  expect(route).toContain('float: "left"');
  expect(route).toContain('marginRight: "10px"');
  expect(route).toContain('width: "60px"');
  expect(legacyTemplate).toContain('<div class="pull-left mr10">');
  expect(legacyTemplate).toContain('<div class="pull-left" style="width: 60px;">');
  expect(legacyTemplate).toContain(
    '<img src="@user.avatarUrl" height="65" width="65" class="img-circle"/>',
  );
  expect(legacyCommon).toContain(".mr10 { margin-right:10px; }");
  expect(legacyBootstrap).toContain(".pull-left {");
  expect(legacyBootstrap).toContain("  float: left;");
  for (const importedStylesheet of [
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_responsive.less";',
  ]) {
    expect(legacyYobi).toContain(importedStylesheet);
  }
});

test("organization enrollment request preserves avatar geometry, order, copy, and accept interaction", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  const fixture = { populated: false, enrollment: true };
  const enrollmentFixture = { loginId: "pending", userId: 3 };
  const requests = await mockMembers(page, fixture, enrollmentFixture);
  await page.goto(`${basePath}/organizations/weblabs/members`);

  const request = page.locator(".project-page-wrap .row-fluid").last().locator(".span2").first();
  const avatarWrap = request.locator(`[data-stylex-owner="${owners.enrollmentAvatarWrap}"]`);
  const avatar = request.locator("img.img-circle");
  const details = request.locator('[data-stylex-owner="organization-members-enrollment-details"]');
  const accept = request.locator(".enrollAcceptBtn");

  await expect(request).toBeVisible();
  await expect(avatarWrap).toHaveCount(1);
  await expect(avatarWrap).toHaveClass(/\bmr10\b/u);
  await expect(avatarWrap).not.toHaveClass(/\bpull-left\b/u);
  await expect(avatar).toHaveAttribute("width", "65");
  await expect(avatar).toHaveAttribute("height", "65");
  await expect(request.locator("a")).toHaveCount(2);
  await expect(request).toContainText("Pending User");
  await expect(request).toContainText("(pending)");
  await expect(accept).toHaveText(/Add/u);
  await expect(accept).toHaveAttribute("data-loginid", "pending");
  await expect(avatarWrap).toHaveCSS("float", "left");
  await expect(avatarWrap).toHaveCSS("margin-right", "10px");
  await expect(details).not.toHaveClass(/\bpull-left\b/u);
  await expect(details).toHaveCSS("float", "left");
  await expect(details).toHaveCSS("width", "60px");

  await expect(request.locator(":scope > div").nth(0)).toHaveAttribute(
    "data-stylex-owner",
    owners.enrollmentAvatarWrap,
  );
  await expect(request.locator(":scope > div").nth(1)).toHaveAttribute(
    "data-stylex-owner",
    "organization-members-enrollment-details",
  );

  const desktopGeometry = await request.evaluate((element) => {
    const wrap = element.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-enrollment-avatar-wrap"]',
    );
    const image = wrap?.querySelector<HTMLImageElement>("img");
    const details = element.querySelector<HTMLElement>(
      '[data-stylex-owner="organization-members-enrollment-details"]',
    );
    if (!wrap || !image || !details) return null;
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
    const row = element.parentElement?.getBoundingClientRect() ?? element.getBoundingClientRect();
    return {
      details: box(details),
      image: box(image),
      row: { bottom: row.bottom, left: row.left, right: row.right, top: row.top },
      scrollWidth: document.documentElement.scrollWidth,
      wrap: box(wrap),
    };
  });
  expect(desktopGeometry).not.toBeNull();
  expect(desktopGeometry!.scrollWidth).toBeLessThanOrEqual(1374);
  expect(desktopGeometry!.wrap.width).toBe(65);
  expect(desktopGeometry!.wrap.left).toBeGreaterThanOrEqual(desktopGeometry!.row.left);
  expect(desktopGeometry!.wrap.right).toBe(desktopGeometry!.image.right);
  expect(desktopGeometry!.details.left).toBe(desktopGeometry!.wrap.right + 10);
  expect(desktopGeometry!.details.right).toBeLessThanOrEqual(desktopGeometry!.row.right);
  expect(desktopGeometry!.image.width).toBe(65);
  expect(desktopGeometry!.image.height).toBe(65);

  const acceptRequestPromise = page.waitForRequest(
    (request) => request.method() === "POST" && request.url().includes("/api/v1/organizations/"),
  );
  await accept.click();
  const acceptRequest = await acceptRequestPromise;
  expect(acceptRequest.url()).toContain(
    `/api/v1/organizations/weblabs/enrollments/${enrollmentFixture.userId}/accept`,
  );
  await expect.poll(() => requests.acceptedEnrollments).toEqual([enrollmentFixture]);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileGeometry = await request.evaluate((element) => {
    const row = element.getBoundingClientRect();
    const container = element.parentElement?.getBoundingClientRect();
    const wrap = element
      .querySelector<HTMLElement>('[data-stylex-owner="organization-enrollment-avatar-wrap"]')
      ?.getBoundingClientRect();
    const image = element.querySelector<HTMLImageElement>("img")?.getBoundingClientRect();
    const details = element
      .querySelector<HTMLElement>('[data-stylex-owner="organization-members-enrollment-details"]')
      ?.getBoundingClientRect();
    return wrap && image && container
      ? { container, details, image, row, wrap, scrollWidth: document.documentElement.scrollWidth }
      : null;
  });
  expect(mobileGeometry).not.toBeNull();
  expect(mobileGeometry!.scrollWidth).toBeLessThanOrEqual(398);
  expect(mobileGeometry!.wrap.left).toBeGreaterThanOrEqual(mobileGeometry!.container.left);
  expect(mobileGeometry!.image.right).toBeLessThanOrEqual(mobileGeometry!.container.right);
  expect(mobileGeometry!.details?.right).toBeLessThanOrEqual(mobileGeometry!.container.right);
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

async function mockMembers(
  page: Page,
  fixture: { populated: boolean; enrollment?: boolean },
  enrollmentFixture = { loginId: "pending", userId: 3 },
) {
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
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);

  await page.route("**/api/v1/organizations/weblabs/admin", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: adminPayload(fixture.populated, fixture.enrollment ?? false),
    }),
  );
  const acceptedEnrollments: Array<{ loginId: string; userId: number }> = [];
  await page.route(
    `**/api/v1/organizations/weblabs/enrollments/${enrollmentFixture.userId}/accept`,
    async (route) => {
      if (route.request().method() === "POST") {
        acceptedEnrollments.push(enrollmentFixture);
      }
      await route.fulfill({
        contentType: "application/json",
        json: adminPayload(fixture.populated, fixture.enrollment ?? false),
      });
    },
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
  return { acceptedEnrollments };
}

async function mockMemberAddFormRoutes(page: Page) {
  const addedLoginIds: string[] = [];
  await page.route("**/-_-api/v1/users?*", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "Content-Range": "items 1/1" },
      json: [
        {
          info: '<img class="mention_image" src="/assets/images/default-avatar-32.png"><b class="mention_name">Carol Jones</b><span class="mention_username"> @carol</span>',
          loginId: "carol",
        },
      ],
    });
  });
  await page.route("**/api/v1/organizations/weblabs/members", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { loginId?: string };
      addedLoginIds.push(body.loginId ?? "");
    }
    await route.fulfill({ contentType: "application/json", json: adminPayload(false) });
  });
  return { addedLoginIds };
}

function adminPayload(populated: boolean, enrollment = false) {
  return {
    deleteAllowed: true,
    enrollmentRequests: enrollment
      ? [
          {
            avatarUrl: "/assets/images/default-avatar-64.png",
            loginId: "pending",
            userId: 3,
            userLabel: "Pending User",
          },
        ]
      : [],
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
