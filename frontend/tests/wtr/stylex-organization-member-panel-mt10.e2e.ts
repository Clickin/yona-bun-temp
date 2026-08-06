import { readFile } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync/resolve only feed page.screenshot paths (no-op).
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/stylex-organization-member-panel-mt10",
  fallbackOff ? "fallback-off" : "normal",
);

const routeSource = new URL("../src/routes/organizations/$organizationName.tsx", import.meta.url);
const styleSource = new URL(
  "../src/routes/organizations/-organization-home.stylex.ts",
  import.meta.url,
);
const legacyViewSource = new URL(
  "../../yona-original/app/views/organization/view.scala.html",
  import.meta.url,
);
const legacyCommonSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const legacyPageSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyResponsiveSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const legacyYobiSource = new URL(
  "../../yona-original/app/assets/stylesheets/yobi.less",
  import.meta.url,
);
const legacyBootstrapSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap.css",
  import.meta.url,
);
const legacyBootstrapResponsiveSource = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  import.meta.url,
);
const legacyMessagesSource = new URL("../../yona-original/conf/messages", import.meta.url);

const yobiImports = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
];

test.use({ locale: "en-US" });

test("organization member panel mt10 preserves frozen source and StyleX ownership", async () => {
  const [
    route,
    style,
    legacyView,
    common,
    page,
    responsive,
    yobi,
    bootstrap,
    bootstrapResponsive,
    messages,
  ] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(styleSource, "utf8"),
    readFile(legacyViewSource, "utf8"),
    readFile(legacyCommonSource, "utf8"),
    readFile(legacyPageSource, "utf8"),
    readFile(legacyResponsiveSource, "utf8"),
    readFile(legacyYobiSource, "utf8"),
    readFile(legacyBootstrapSource, "utf8"),
    readFile(legacyBootstrapResponsiveSource, "utf8"),
    readFile(legacyMessagesSource, "utf8"),
  ]);

  const legacyMemberPanels = legacyView.split(/\r?\n/u).slice(145, 176).join("\n");
  const managerStart = legacyMemberPanels.indexOf('<div class="bubble-wrap gray project-home">');
  const memberStart = legacyMemberPanels.indexOf(
    '<div class="bubble-wrap gray project-home mt10">',
  );

  expect(managerStart).toBeGreaterThanOrEqual(0);
  expect(memberStart).toBeGreaterThan(managerStart);
  expect(legacyMemberPanels.slice(managerStart, memberStart)).not.toContain("mt10");
  expect(legacyMemberPanels).toContain('<div class="inner member-info">');
  expect(legacyMemberPanels).toContain('<h3>@Messages("user.role.org_admin")</h3>');
  expect(legacyMemberPanels).toContain('<h3>@Messages("user.role.org_member")</h3>');
  expect(legacyMemberPanels).toContain('<div class="member-wrap ">');
  expect(legacyMemberPanels).toContain('<div class="member-wrap">');
  expect(legacyMemberPanels).toContain('<ul class="project-members">');
  expect(legacyMemberPanels).toContain('<ul class="unstyled project-members">');
  expect(common).toContain(".mt10 { margin-top:10px; }");
  expect(page).toContain(".project-home {");
  expect(page).toContain("padding: 10px;");
  expect(page).toMatch(/\.inner\s*\{[\s\S]*?margin-bottom:10px;/u);
  expect(page).toContain("&.member-info {");
  expect(page).toContain(".project-members {");
  expect(responsive).toContain(".span-hard-wrap {");
  expect(responsive).toContain("min-width: 95%;");
  expect(responsive).toContain("width: 100vw;");
  expect(yobi.trim().split(/\r?\n/u)).toEqual(yobiImports.map((file) => `@import "less/${file}";`));
  expect(bootstrap).toContain('.row-fluid [class*="span"] {');
  expect(bootstrap).toContain(".row-fluid .span9 {");
  expect(bootstrap).toContain(".row-fluid .span3 {");
  expect(bootstrap).toContain(".pull-right {");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsive).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsive).toContain(".row-fluid .span3 {");
  expect(messages).toContain("user.role.org_admin = Group Manager");
  expect(messages).toContain("user.role.org_member = Group Member");
  expect(messages).toContain("organization.member.leave = Leave the group");

  expect(route).toContain('const panelKey = className.includes("mt10") ? "member" : "manager";');
  expect(route).toContain('panelKey === "member" ? styles.memberPanelMember : null');
  expect(route).toContain('data-stylex-owner="organization-home-members-panel"');
  expect(route).toContain('data-stylex-owner="organization-home-members-panel-inner"');
  expect(style).toContain('memberPanel: { padding: "10px" }');
  expect(style).toContain('memberPanelMember: { marginTop: "10px" }');
  expect(route).not.toContain('style={{ marginTop: "10px" }}');
});

test(`organization member panel mt10 geometry ${fallbackOff ? "fallback-off" : "normal"}`, async ({
  page,
}) => {
  await mockOrganizationHome(page);
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/organizations/weblabs`, { waitUntil: "domcontentloaded" });

  // Fallback mode is global shell evidence only; panel assertions are unchanged.
  await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(fallbackOff ? 0 : 1);

  // Panels share one static owner since the 2026-08-05 refactor; kind is DOM order.
  const panels = page.locator('[data-stylex-owner="organization-home-members-panel"]');
  const manager = panels.nth(0);
  const member = panels.nth(1);
  await assertPanelDom(manager, "manager", "Manager User", "manager-user");
  await assertPanelDom(member, "member", "Member User", "member-user");

  const panelOrder = await panels.evaluateAll((nodes) =>
    nodes.map((node) => (node.className.includes("mt10") ? "member" : "manager")),
  );
  expect(panelOrder).toEqual(["manager", "member"]);

  await expect(manager).not.toHaveClass(/\bmt10\b/u);
  await expect(manager).toHaveCSS("margin-top", "0px");
  await expect(manager).not.toHaveAttribute("style", /.+/u);
  await expect(member).toHaveClass(/\bmt10\b/u);
  await expect(member).toHaveCSS("margin-top", "10px");
  await expect(member).not.toHaveAttribute("style", /.+/u);

  const desktop = await memberPanelGeometry(page);
  assertPanelContainment(desktop, { height: 900, width: 1366 });
  expect(desktop.member.element.top - desktop.manager.element.bottom).toBeCloseTo(20, 0);

  const leave = member.getByRole("button", { name: "Leave the group" });
  await expect(manager.getByRole("button", { name: "Leave the group" })).toHaveCount(0);
  await expect(leave).toBeVisible();
  await leave.click();
  await expect(page.locator("#alertLeave")).toHaveClass(/\bmodal\b.*\bin\b/u);
  await expect(page.locator("#alertLeave")).toContainText("Do you want to leave this group?");
  await page.getByRole("button", { name: "No" }).click();
  await expect(page.locator("#alertLeave")).not.toHaveClass(/\bin\b/u);
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "desktop.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(member).toBeVisible();
  const mobile = await memberPanelGeometry(page);
  assertPanelContainment(mobile, { height: 844, width: 390 });
  expect(mobile.member.element.top - mobile.manager.element.bottom).toBeCloseTo(20, 0);
  await page.screenshot({
    fullPage: true,
    path: resolve(screenshotDirectory, "mobile.png"),
  });
});

async function mockOrganizationHome(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "admin",
    preferredLanguage: "en-US",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/organizations/weblabs/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        organizationName: "weblabs",
        description: "Web labs group",
        logoUrl: "",
        viewerCanUpdate: false,
        viewerCanLeave: true,
        viewerCanLeaveAfterValidation: true,
        viewerCanCreateProject: false,
        visibleProjects: [],
        adminMembers: [
          {
            loginId: "manager-user",
            userLabel: "Manager User",
            avatarUrl: "/legacy-assets/images/default-avatar-45.png",
          },
        ],
        memberMembers: [
          {
            loginId: "member-user",
            userLabel: "Member User",
            avatarUrl: "/legacy-assets/images/default-avatar-45.png",
          },
        ],
      },
    }),
  );
}

async function assertPanelDom(
  panel: ReturnType<Page["locator"]>,
  kind: "manager" | "member",
  label: string,
  loginId: string,
) {
  const inner = panel.locator('[data-stylex-owner="organization-home-members-panel-inner"]');
  const list = inner.locator('[data-stylex-owner="organization-home-members-list"]');
  const row = list.locator('[data-stylex-owner="organization-home-member"]');
  const links = row.locator("a");

  await expect(panel).toBeVisible();
  await expect(panel).toHaveClass(/bubble-wrap gray project-home/u);
  await expect(panel).toHaveAttribute("data-stylex-owner", "organization-home-members-panel");
  // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
  await expect(
    panel.locator("[data-toggle], [data-dismiss], [data-target], [data-url]"),
  ).toHaveCount(0);
  await expect(inner).toHaveClass(/\binner\b.*\bmember-info\b/u);
  await expect(inner).toHaveAttribute("data-stylex-owner", "organization-home-members-panel-inner");
  // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
  await expect(inner.locator("h3")).toHaveText(
    kind === "manager" ? "Group Manager" : "Group Member",
  );
  await expect(list).toBeVisible();
  await expect(list).toHaveClass(
    kind === "member" ? /\bunstyled\b.*\bproject-members\b/u : /\bproject-members\b/u,
  );
  if (kind === "manager") await expect(list).not.toHaveClass(/\bunstyled\b/u);
  await expect(row).toHaveCount(1);
  await expect(links).toHaveCount(2);
  await expect(links.nth(0)).toHaveAttribute("href", `${basePath}/${loginId}`);
  await expect(links.nth(0)).toHaveAttribute("title", loginId);
  await expect(links.nth(1)).toHaveText(label);
  await expect(links.nth(1)).toHaveAttribute("href", `${basePath}/${loginId}`);
  await expect(links.nth(1)).toHaveAttribute("title", loginId);
}

type PanelGeometry = Awaited<ReturnType<typeof memberPanelGeometry>>;

async function memberPanelGeometry(page: Page) {
  return page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector(selector);
      if (!(element instanceof HTMLElement)) throw new Error(`Missing ${selector}`);
      return element;
    };
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const panel = (kind: "manager" | "member") => {
      const panels = document.querySelectorAll<HTMLElement>(
        '[data-stylex-owner="organization-home-members-panel"]',
      );
      const element = panels[kind === "manager" ? 0 : 1];
      if (!element) throw new Error(`Missing organization-home-members-panel ${kind}`);
      const inner = required('[data-stylex-owner="organization-home-members-panel-inner"]');
      const list = required(
        '[data-stylex-owner="organization-home-members-panel-inner"] [data-stylex-owner="organization-home-members-list"]',
      );
      const link = required(
        '[data-stylex-owner="organization-home-members-panel-inner"] [data-stylex-owner="organization-home-member"] a',
      );
      return { element: box(element), inner: box(inner), link: box(link), list: box(list) };
    };

    return {
      column: box(required('[data-stylex-owner="organization-home-members"]')),
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      manager: panel("manager"),
      member: panel("member"),
      viewport: { height: window.innerHeight, width: window.innerWidth },
    };
  });
}

function assertPanelContainment(
  metrics: PanelGeometry,
  viewport: { height: number; width: number },
) {
  expect(metrics.viewport).toEqual(viewport);
  expect(metrics.documentClientWidth).toBe(viewport.width);
  expect(metrics.documentScrollWidth).toBeLessThanOrEqual(viewport.width + 1);
  expect(metrics.column.left).toBeGreaterThanOrEqual(0);
  expect(metrics.column.right).toBeLessThanOrEqual(viewport.width + 1);

  for (const current of [metrics.manager, metrics.member]) {
    expect(current.element.width).toBeGreaterThan(0);
    expect(current.element.left).toBeGreaterThanOrEqual(metrics.column.left);
    expect(current.element.right).toBeLessThanOrEqual(metrics.column.right + 1);
    expect(current.inner.left).toBeGreaterThanOrEqual(current.element.left);
    expect(current.inner.right).toBeLessThanOrEqual(current.element.right + 1);
    expect(current.list.left).toBeGreaterThanOrEqual(current.inner.left);
    expect(current.list.right).toBeLessThanOrEqual(current.inner.right + 1);
    expect(current.link.left).toBeGreaterThanOrEqual(current.list.left);
    expect(current.link.right).toBeLessThanOrEqual(current.list.right + 1);
  }

  expect(metrics.member.element.top).toBeGreaterThanOrEqual(metrics.manager.element.bottom);
  expect(metrics.member.element.bottom).toBeGreaterThan(metrics.member.element.top);
}
