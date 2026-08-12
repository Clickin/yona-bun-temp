import { expect, test } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

// the WTR runner launches the same installed Chrome used by the parity sweep.

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const mode = fallbackOff ? "fallback-off" : "normal";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        session: { csrfToken: "gnb-search-scope", projection: {}, userId: 1 },
        user: {
          emailAddress: "admin@example.com",
          id: 1,
          isConfirmed: true,
          isSiteAdmin: true,
          loginId: "admin",
          name: "Admin",
        },
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/admin/sample.git",
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        enrollmentRequestCount: 0,
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: true,
        viewerCanLeave: false,
        viewerCanUpdate: true,
      },
    }),
  );
});

test(`scoped global GNB search keeps the exact legacy scope button classes (${mode})`, async ({
  page,
}) => {
  const [
    navbar,
    scripts,
    yobi,
    pageLess,
    responsive,
    yobiUi,
    temporary,
    bootstrap,
    bootstrapResponsive,
    messages,
  ] = await Promise.all([
    readFile(
      new URL("../../yona-original/app/views/common/navbar.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/common/scripts.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_temporary.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(navbar).toContain('<button class="ybtn dropdown-toggle" data-toggle="dropdown"');
  expect(scripts).toContain("$('[data-toggle=\"search-scope\"]')");
  expect(yobi).toMatch(
    /@import "less\/_page\.less";[\s\S]*@import "less\/_responsive\.less";[\s\S]*@import "less\/_yobiUI\.less";[\s\S]*@import "less\/_temporary\.less";/,
  );
  expect(pageLess).toMatch(/\.gnb-search-form[\s\S]*\.dropdown-toggle/);
  expect(responsive).toMatch(/@media all and \(max-width: 720px\)[\s\S]*\.gnb-search-form/);
  expect(yobiUi).toMatch(/\.ybtn, \.flat > li > \.ybtn[\s\S]*&\.dropdown-toggle/);
  expect(temporary).toContain("button.dropdown-toggle");
  expect(bootstrap).toContain(".input-prepend .btn-group > .dropdown-toggle");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(messages).toMatch(
    /search\.scope\.all = All Projects[\s\S]*search\.scope\.group = This Group[\s\S]*search\.scope\.project = This Project/,
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample`);

  const form = page.locator('form[name="gnb-search-form"]');
  const toggle = page.locator("#gnb-search-scope-title");
  const menu = page.locator('[data-owner="global-gnb-search-scope-menu"]');
  const items = page.locator('[data-owner="global-gnb-search-scope-item"] > button');

  await expect(form).toBeVisible();
  await expect(toggle).toHaveText("This Project");
  await expect(toggle).not.toHaveAttribute("data-toggle");
  await expect(items).toHaveText(["This Project", "All Projects"]);

  const desktop = await page.evaluate(() => {
    const formElement = document.querySelector<HTMLElement>('form[name="gnb-search-form"]')!;
    const scopeElement = document.querySelector<HTMLElement>(
      '[data-owner="global-gnb-search-scope"]',
    )!;
    const toggleElement = document.querySelector<HTMLElement>("#gnb-search-scope-title")!;
    const menuElement = document.querySelector<HTMLElement>(
      '[data-owner="global-gnb-search-scope-menu"]',
    )!;
    const searchBox = document.querySelector<HTMLElement>('[data-owner="global-gnb-search-box"]')!;
    const formRect = formElement.getBoundingClientRect();
    const scopeRect = scopeElement.getBoundingClientRect();
    const toggleRect = toggleElement.getBoundingClientRect();
    const style = getComputedStyle(toggleElement);
    const caret = getComputedStyle(toggleElement, "::after");
    return {
      classTokens: [...toggleElement.classList],
      order: [
        scopeElement.parentElement === formElement,
        scopeElement.nextElementSibling === searchBox,
        toggleElement.parentElement === scopeElement,
        toggleElement.nextElementSibling === menuElement,
      ],
      style: {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        display: style.display,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        padding: style.padding,
        position: style.position,
        verticalAlign: style.verticalAlign,
        whiteSpace: style.whiteSpace,
      },
      caret: {
        borderTopWidth: caret.borderTopWidth,
        content: caret.content,
        display: caret.display,
        marginLeft: caret.marginLeft,
      },
      contained:
        scopeRect.left >= formRect.left &&
        scopeRect.right <= formRect.right &&
        toggleRect.top >= formRect.top &&
        toggleRect.bottom <= formRect.bottom,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  // RED until the React-owned button restores navbar.scala.html's literal class composition.
  expect(desktop.classTokens.slice(0, 2)).toEqual(["ybtn", "dropdown-toggle"]);
  expect(desktop.order).toEqual([true, true, true, true]);
  expect(desktop.style).toMatchObject({
    backgroundColor: "rgb(247, 247, 247)",
    borderRadius: "3px",
    display: "inline-block",
    fontSize: "14px",
    lineHeight: "20px",
    padding: "4px 12px",
    position: "relative",
    // F5 dist-truth (2026-08-11): the scope button keeps the legacy
    // vertical-align middle.
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  });
  expect(desktop.caret).toMatchObject({
    borderTopWidth: "4px",
    content: '""',
    display: "inline-block",
    marginLeft: "5px",
  });
  expect(desktop.contained).toBe(true);
  expect(desktop.overflow).toBe(0);

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(menu).toBeVisible();
  await items.nth(1).click();
  await expect(toggle).toHaveText("All Projects");
  await expect(form).toHaveAttribute("action", `${basePath}/search`);
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(form).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
