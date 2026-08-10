// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackOff = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1";
const screenshotDirectory = resolve(
  "output/playwright/style-project-import-mt10",
  fallbackOff ? "fallback-off" : "normal",
);

const routeSourcePath = "src/routes/[_]import.tsx";
const styleSourcePath = "src/app.css";
const legacySourcePath = "../yona-original/app/views/project/importing.scala.html";
const legacyCommonPath = "../yona-original/app/assets/stylesheets/less/_common.less";
const legacyYobiPath = "../yona-original/app/assets/stylesheets/yobi.less";
const legacyMessagesPath = "../yona-original/conf/messages";

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

const rightLabelOwner = '[data-owner="project-import-right-label"]';
const advancedOwner = '[data-owner="project-import-advanced"]';

test.use({ locale: "en-US" });

test("project import mt10 owners preserve legacy structure and Style geometry", async ({
  page,
}) => {
  const routeSource = readFileSync(routeSourcePath, "utf8");
  const styleSource = readFileSync(styleSourcePath, "utf8");
  const legacySource = readFileSync(legacySourcePath, "utf8");
  const legacyCommon = readFileSync(legacyCommonPath, "utf8");
  const legacyYobi = readFileSync(legacyYobiPath, "utf8");
  const legacyMessages = readFileSync(legacyMessagesPath, "utf8");
  const advancedLegacy = legacySource.slice(
    legacySource.indexOf('<div class="advanced-options">'),
    legacySource.indexOf('<div class="actions mt20">'),
  );

  expect(advancedLegacy).not.toBe("");
  expect(advancedLegacy).toContain(
    '<div class="span2 right-txt mt10">\n              @Messages("project.shareOption")',
  );
  expect(advancedLegacy).toContain('<ul class="unstyled project-scopes mt10">');
  expect(advancedLegacy).toContain('<li id="opt-protected" class="mt10"');
  expect(advancedLegacy).toMatch(/<li class="mt10">\s*<input[^>]+id="private"/u);
  expect(advancedLegacy).toMatch(
    /<div class="span2 right-txt mt10">\s*<label for="vcs">[\s\S]*?@Messages\("project\.vcs"\)[\s\S]*?<\/label>\s*<\/div>/u,
  );
  expect(advancedLegacy).toMatch(
    /<div class="span2 right-txt">\s*@Messages\("project\.menu\.setting"\)/u,
  );

  const order = [
    advancedLegacy.indexOf('@Messages("project.shareOption")'),
    advancedLegacy.indexOf('<ul class="unstyled project-scopes mt10">'),
    advancedLegacy.indexOf('id="opt-protected"'),
    advancedLegacy.indexOf('id="private"'),
    advancedLegacy.indexOf('@Messages("project.vcs")'),
    advancedLegacy.indexOf('@Messages("project.menu.setting")'),
  ];
  expect(order.every((index) => index >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((left, right) => left - right));

  expect(legacyCommon).toContain(".right-txt     { text-align:right; }");
  expect(legacyCommon).toContain(".mt10 { margin-top:10px; }");
  expect(legacyYobi.trim().split(/\r?\n/u)).toEqual(
    yobiImports.map((file) => `@import "less/${file}";`),
  );
  for (const copy of [
    "project.shareOption = Share Options",
    "project.public = PUBLIC",
    "project.protected = GROUP PUBLIC",
    "project.private = PRIVATE",
    "project.vcs = Repository type",
    "project.menu.setting = Menu Setting",
    "project.new.vcsType.git = Git",
  ]) {
    expect(legacyMessages).toContain(copy);
  }

  expect(routeSource.match(/data-owner="project-import-right-label"/g)).toHaveLength(3);
  for (const owner of [
    "project-import-advanced",
    "project-import-right-label",
    "project-import-scope-list",
    "project-import-protected-scope-row",
    "project-import-private-scope-row",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  expect(routeSource).not.toContain('style="display:none;"');
  expect(routeSource).not.toMatch(/\bstyle\s*=/u);
  expect(routeSource).not.toMatch(/\bdata-(?:toggle|placement|action|href|url|request-[^=\s]+)/u);

  await mockProjectImport(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/_import?owner=admin`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(advancedOwner)).toBeVisible();

    const advanced = page.locator(advancedOwner);
    const rightLabels = advanced.locator(rightLabelOwner);
    const shareLabel = rightLabels.nth(0);
    const vcsLabel = rightLabels.nth(1);
    const menuLabel = rightLabels.nth(2);
    const scopeList = advanced.locator('[data-owner="project-import-scope-list"]');
    const protectedRow = advanced.locator('[data-owner="project-import-protected-scope-row"]');
    const privateRow = advanced.locator('[data-owner="project-import-private-scope-row"]');

    await expect(rightLabels).toHaveCount(3);
    await expect(shareLabel).toHaveText("Share Options");
    await expect(vcsLabel).toContainText("Repository type");
    await expect(menuLabel).toHaveText("Menu Setting");
    await expect(shareLabel).toHaveClass(/\bspan2\b.*\bmt10\b/u);
    await expect(vcsLabel).toHaveClass(/\bspan2\b.*\bmt10\b/u);
    await expect(menuLabel).toHaveClass(/\bspan2\b/u);
    await expect(menuLabel).not.toHaveClass(/\bmt10\b/u);
    await expect(shareLabel).not.toHaveClass(/\bright-txt\b/u);
    await expect(vcsLabel).not.toHaveClass(/\bright-txt\b/u);
    await expect(menuLabel).not.toHaveClass(/\bright-txt\b/u);

    for (const [element, owner] of [
      [shareLabel, "project-import-right-label"],
      [vcsLabel, "project-import-right-label"],
      [menuLabel, "project-import-right-label"],
      [scopeList, "project-import-scope-list"],
      [protectedRow, "project-import-protected-scope-row"],
      [privateRow, "project-import-private-scope-row"],
    ] as const) {
      await expect(element).toHaveAttribute("data-owner", owner);
      // data-style-src is dev-only metadata (dist renders null; parity helper treats it as env-variant noise) — dropped in WTR copy.
      await expect(element).not.toHaveAttribute("style", /.+/u);
    }

    await expect(shareLabel).toHaveCSS("margin-top", "10px");
    await expect(shareLabel).toHaveCSS("text-align", "right");
    await expect(vcsLabel).toHaveCSS("margin-top", "10px");
    await expect(vcsLabel).toHaveCSS("text-align", "right");
    await expect(scopeList).toHaveClass(/\bunstyled\b.*\bproject-scopes\b.*\bmt10\b/u);
    await expect(scopeList).toHaveCSS("margin-top", "10px");
    await expect(protectedRow).toHaveClass(/\bmt10\b/u);
    await expect(protectedRow).toHaveCSS("margin-top", "10px");
    await expect(privateRow).toHaveClass(/\bmt10\b/u);
    await expect(privateRow).toHaveCSS("margin-top", "10px");
    await expect(menuLabel).toHaveCSS("margin-top", "0px");
    await expect(menuLabel).toHaveCSS("text-align", "right");

    await expect(scopeList.locator("li")).toHaveCount(3);
    await expect(scopeList.locator("li").nth(0).locator("#public")).toBeVisible();
    await expect(scopeList.locator("li").nth(1)).toHaveAttribute("id", "opt-protected");
    await expect(scopeList.locator("li").nth(2).locator("#private")).toBeVisible();
    await expect(scopeList.locator("strong").nth(0)).toHaveText("PUBLIC");
    await expect(scopeList.locator("strong").nth(1)).toHaveText("GROUP PUBLIC");
    await expect(scopeList.locator("strong").nth(2)).toHaveText("PRIVATE");
    await expect(page.locator("#public")).toBeChecked();
    await expect(page.locator("#private")).not.toBeChecked();
    await expect(protectedRow).toBeHidden();

    const pluginOnlyAttributes = await advanced.evaluate(
      (element, exactNames) => {
        const invalidNames = new Set<string>();
        for (const descendant of element.querySelectorAll<HTMLElement>("*")) {
          for (const attribute of descendant.attributes) {
            if (exactNames.includes(attribute.name) || attribute.name.startsWith("data-request-")) {
              invalidNames.add(attribute.name);
            }
          }
        }
        return [...invalidNames];
      },
      [
        "data-toggle",
        "data-placement",
        "data-action",
        "data-href",
        "data-url",
        "data-dismiss",
        "data-target",
        "data-trigger",
        "data-backdrop",
        "data-spy",
        "data-provider",
        "data-loading-text",
      ],
    );
    expect(pluginOnlyAttributes).toEqual([]);

    await page.locator("#private").check();
    await expect(page.locator("#private")).toBeChecked();
    await expect(page.locator("#public")).not.toBeChecked();
    await page.locator("#public").check();
    await expect(page.locator("#public")).toBeChecked();

    await selectOwner(page, "weblabs");
    await expect(protectedRow).toBeVisible();
    await expect(protectedRow).toHaveCSS("margin-top", "10px");
    await page.locator("#protected").check();
    await expect(page.locator("#protected")).toBeChecked();
    await expect(page.locator("#public")).not.toBeChecked();
    await expect(page.locator("#private")).not.toBeChecked();

    await selectOwner(page, "admin");
    await expect(protectedRow).toBeHidden();
    await expect(page.locator("#public")).toBeChecked();
    await expect(page.locator("#protected")).not.toBeChecked();

    await selectOwner(page, "weblabs");
    await expect(protectedRow).toBeVisible();
    await page.locator("#protected").check();
    await expect(page.locator("#protected")).toBeChecked();

    await assertOwnerGeometry(page, viewport, {
      advanced,
      menuLabel,
      privateRow,
      protectedRow,
      scopeList,
      shareLabel,
      vcsLabel,
    });

    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockProjectImport(page: Page) {
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
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-project-import" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/projects/form-options*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerOptions: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            organization: false,
            ownerName: "admin",
            selected: true,
          },
          {
            avatarUrl: "/assets/images/organization_default_logo.png",
            organization: true,
            ownerName: "weblabs",
            selected: false,
          },
        ],
        selectedOwnerName: "admin",
        formValues: {},
        formErrors: {},
      },
    }),
  );
}

async function selectOwner(page: Page, ownerName: string) {
  await page.locator('[data-owner="project-import-owner-select"] > button').click();
  await page.locator(".select2-results button", { hasText: ownerName }).click();
}

async function assertOwnerGeometry(
  page: Page,
  viewport: { height: number; name: string; width: number },
  elements: {
    advanced: ReturnType<Page["locator"]>;
    menuLabel: ReturnType<Page["locator"]>;
    privateRow: ReturnType<Page["locator"]>;
    protectedRow: ReturnType<Page["locator"]>;
    scopeList: ReturnType<Page["locator"]>;
    shareLabel: ReturnType<Page["locator"]>;
    vcsLabel: ReturnType<Page["locator"]>;
  },
) {
  const metrics = await page.evaluate(
    ({ advancedSelector, rightLabelSelector }) => {
      const requireElement = (selector: string) => {
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
      const rowElements = Array.from(
        document.querySelectorAll<HTMLElement>(`${advancedSelector} > .row-fluid`),
      );
      if (rowElements.length !== 3) throw new Error("Expected three advanced option rows");
      const label = (rowIndex: number) => {
        const element = rowElements[rowIndex]?.querySelector(rightLabelSelector);
        if (!(element instanceof HTMLElement)) throw new Error(`Missing right label ${rowIndex}`);
        return box(element);
      };
      const rows = rowElements.map(box);
      return {
        advanced: box(requireElement(advancedSelector)),
        menu: label(2),
        privateRow: box(
          requireElement(`${advancedSelector} [data-owner="project-import-private-scope-row"]`),
        ),
        protectedRow: box(
          requireElement(`${advancedSelector} [data-owner="project-import-protected-scope-row"]`),
        ),
        rows,
        scopeList: box(
          requireElement(`${advancedSelector} ${'[data-owner="project-import-scope-list"]'}`),
        ),
        share: label(0),
        vcs: label(1),
        viewport: { height: window.innerHeight, width: window.innerWidth },
      };
    },
    { advancedSelector: advancedOwner, rightLabelSelector: rightLabelOwner },
  );

  expect(metrics.viewport).toEqual({ height: viewport.height, width: viewport.width });
  expect(metrics.rows).toHaveLength(3);
  expect(metrics.advanced.width).toBeGreaterThan(0);
  for (const current of [metrics.share, metrics.vcs, metrics.menu, metrics.scopeList]) {
    expect(current.width).toBeGreaterThan(0);
    expect(current.left).toBeGreaterThanOrEqual(metrics.advanced.left - 1);
    expect(current.right).toBeLessThanOrEqual(metrics.advanced.right + 1);
    expect(current.bottom).toBeGreaterThan(current.top);
  }
  for (const current of [metrics.protectedRow, metrics.privateRow]) {
    expect(current.left).toBeGreaterThanOrEqual(metrics.advanced.left - 1);
    expect(current.right).toBeLessThanOrEqual(metrics.advanced.right + 1);
    expect(current.bottom).toBeGreaterThan(current.top);
  }
  expect(metrics.share.top).toBeGreaterThanOrEqual(metrics.rows[0].top - 1);
  expect(metrics.share.bottom).toBeLessThanOrEqual(metrics.rows[0].bottom + 1);
  expect(metrics.scopeList.left).toBeGreaterThanOrEqual(metrics.rows[0].left - 1);
  expect(metrics.scopeList.right).toBeLessThanOrEqual(metrics.rows[0].right + 1);
  expect(metrics.vcs.top).toBeGreaterThanOrEqual(metrics.rows[1].top - 1);
  expect(metrics.vcs.bottom).toBeLessThanOrEqual(metrics.rows[1].bottom + 1);
  expect(metrics.menu.top).toBeGreaterThanOrEqual(metrics.rows[2].top - 1);
  expect(metrics.menu.bottom).toBeLessThanOrEqual(metrics.rows[2].bottom + 1);

  for (const locator of [
    elements.advanced,
    elements.menuLabel,
    elements.privateRow,
    elements.protectedRow,
    elements.scopeList,
    elements.shareLabel,
    elements.vcsLabel,
  ]) {
    await expect(locator).not.toHaveAttribute("style", /.+/u);
  }
}
