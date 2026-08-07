import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const owners = {
  actionCell: "user-email-table-action-cell",
  identityCell: "user-email-table-identity-cell",
  table: "user-email-table",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records the primary-only live authority and exact three-owner table boundary", () => {
  const route = readFileSync("src/routes/user/editform/emails.tsx", "utf8");
  const theme = readFileSync("src/routes/user/editform/-emails.stylex.ts", "utf8");
  const template = readFileSync("../yona-original/app/views/user/edit_emails.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");

  expect(template).toContain('<table class="table mt20">');
  expect(template).toContain('<td style="text-align:right;">');
  expect(template).toContain('<td style="text-align:right; vertical-align: middle;">');
  expect(bootstrap).toContain("table {\n  max-width: 100%;");
  expect(bootstrap).toContain(".table {\n  width: 100%;\n  margin-bottom: 20px;");
  expect(bootstrap).toContain(".table th,\n.table td {\n  padding: 8px;\n  line-height: 20px;");
  expect(common).toContain(".mt20 { margin-top:20px; }");

  for (const name of Object.values(owners)) expect(route).toContain(`data-stylex-owner="${name}"`);
  expect(route).not.toContain('className="table mt20"');
  expect(route).not.toContain('style={{ textAlign: "right" }}');
  expect(route).not.toContain('style={{ textAlign: "right", verticalAlign: "middle" }}');
  // Batch225+ completed the email-row StyleX migration: the literal legacy
  // classes (ybtn/ybtn-small/yobicon-error2) and inline 150px widths were
  // retired from the route in favor of the secondary* stylex styles.
  expect(route).toContain("secondaryDeleteAction: {");
  expect(route.match(/width: "150px"/gu) ?? []).toHaveLength(2);
  expect(route).not.toMatch(/style=\{\{ width: "150px" \}\}/u);
  expect(route).toContain('fontFamily: "yobicon"');
  expect(route).toContain(
    'import defaultEmailAvatarUrl from "../../../assets/legacy/default-avatar-128.png";',
  );
  expect(route).toContain("const DEFAULT_EMAIL_AVATAR_SRC = defaultEmailAvatarUrl;");
  expect(route).not.toContain(
    'const DEFAULT_EMAIL_AVATAR_SRC = "/assets/images/default-avatar-128.png";',
  );

  const authoredTable = route.slice(
    route.indexOf("emailTable: {"),
    route.indexOf("emailTableCell: {"),
  );
  expect(authoredTable).toContain('backgroundColor: "transparent"');
  expect(authoredTable).toContain('borderCollapse: "collapse"');
  expect(authoredTable).toContain('borderSpacing: "0px"');
  expect(authoredTable).toContain('marginBottom: "20px"');
  expect(authoredTable).toContain('marginTop: "20px"');
  expect(authoredTable).toContain('maxWidth: "100%"');
  expect(authoredTable).toContain('width: "100%"');
  expect(authoredTable).not.toMatch(/(?:display|fontFamily|fontSize|lineHeight|margin:)/u);
  const authoredCell = route.slice(
    route.indexOf("emailTableCell: {"),
    route.indexOf("emailTableActionCell: {"),
  );
  expect(authoredCell).not.toContain("display:");

  const tableTheme = theme.slice(
    theme.indexOf("export const emailTableColors"),
    theme.indexOf("export const emailPrimaryBadgeColors"),
  );
  expect(tableTheme).toContain('rowBorder: "#dddddd"');
  expect(tableTheme.match(/#[0-9a-f]{3,8}/giu)).toEqual(["#dddddd"]);
  expect(tableTheme).not.toMatch(/(?:margin|padding|width|height|font|lineHeight)/u);
});

for (const viewport of [
  {
    actionWidth: 574.421875,
    height: 900,
    identityWidth: 771.578125,
    name: "desktop",
    primaryActionWidth: 69.75,
    primaryIdentityWidth: 1276.25,
    rowHeights: [57, 57, 56.5],
    tableHeight: 171,
    tableLeft: 10,
    tableTop: 334,
    tableWidth: 1346,
    width: 1366,
  },
  {
    actionWidth: 184.5625,
    height: 844,
    identityWidth: 205.4375,
    name: "mobile",
    primaryActionWidth: 20.21875,
    primaryIdentityWidth: 369.78125,
    rowHeights: [105, 73, 76.5],
    tableHeight: 255,
    tableLeft: 0,
    tableTop: 370,
    tableWidth: 390,
    width: 390,
  },
] as const)
  test(`pins ${viewport.name} primary live declarations and frozen secondary fallback coverage`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const requests: string[] = [];
    const fixture = { includeSecondary: false };
    await mockEmailSettings(page, requests, fixture);
    await page.goto(`${basePath}/user/editform/emails`);
    await page.evaluate(() => document.fonts.ready);

    const table = owner(page, owners.table);
    const identities = owner(page, owners.identityCell);
    const actions = owner(page, owners.actionCell);
    await expect(table).toBeVisible();
    await expect(table).not.toHaveClass(/\b(?:table|mt20)\b/u);
    await expect(table.locator("tr")).toHaveCount(1);
    const primaryLiveGeometry = await table.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const [identity, action] = Array.from(element.rows[0].cells).map((cell) =>
        cell.getBoundingClientRect(),
      );
      return {
        actionWidth: action.width,
        height: rect.height,
        identityWidth: identity.width,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      };
    });
    expect(primaryLiveGeometry).toEqual({
      actionWidth: viewport.primaryActionWidth,
      height: 57,
      identityWidth: viewport.primaryIdentityWidth,
      left: viewport.tableLeft,
      top: viewport.tableTop,
      width: viewport.tableWidth,
    });
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        screenshotDirectory,
        `stylex-user-email-table-shell-primary-${viewport.name}.png`,
      ),
    });

    fixture.includeSecondary = true;
    await page.reload();
    await expect(table.locator("tr")).toHaveCount(3);
    await expect(identities).toHaveCount(3);
    await expect(actions).toHaveCount(3);
    expect(
      await identities.evaluateAll((cells) =>
        cells.map((cell) => cell.textContent?.replace(/\s+/gu, "").trim()),
      ),
    ).toEqual(["admin@example.com대표이메일", "valid@example.com", "pending@example.com"]);
    expect(
      await actions.evaluateAll((cells) =>
        cells.map((cell) => cell.textContent?.replace(/\s+/gu, "").trim()),
      ),
    ).toEqual(["", "삭제대표이메일로설정", "삭제확인메일전송"]);
    await expect(table.locator("tr")).toHaveCount(3);
    await expect(table.locator("img")).toHaveCount(3);
    expect(
      await table.locator("img").evaluateAll((images) =>
        images.map((image) => {
          const actual = image as HTMLImageElement;
          const url = new URL(actual.currentSrc || actual.src);
          return {
            complete: actual.complete,
            insideContextPath: url.pathname.startsWith(
              `/${location.pathname.split("/")[1] ?? "yona"}/`,
            ),
            naturalHeight: actual.naturalHeight,
            naturalWidth: actual.naturalWidth,
            usesImportedFilename: url.pathname.includes("default-avatar-128"),
          };
        }),
      ),
    ).toEqual(
      Array.from({ length: 3 }, () => ({
        complete: true,
        insideContextPath: true,
        naturalHeight: 128,
        naturalWidth: 128,
        usesImportedFilename: true,
      })),
    );
    // Batch225+ retired the literal ybtn/yobicon legacy classes from the DOM;
    // pin the four action buttons and the two fixed-width actions by owner.
    await expect(table.locator("button[data-stylex-owner]")).toHaveCount(4);
    await expect(
      table.locator(
        '[data-stylex-owner="user-email-secondary-verification-action"], [data-stylex-owner="user-email-primary-action"]',
      ),
    ).toHaveCount(2);
    await expect(
      table.locator('i[data-stylex-owner="user-email-secondary-warning-icon"]'),
    ).toHaveCount(1);

    await expect(table).toHaveCSS("display", "table");
    await expect(table).toHaveCSS("width", `${viewport.tableWidth}px`);
    await expect(table).toHaveCSS("max-width", "100%");
    await expect(table).toHaveCSS("margin", "20px 0px");
    await expect(table).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(table).toHaveCSS("border-collapse", "collapse");
    await expect(table).toHaveCSS("border-spacing", "0px");
    await expect(table).toHaveCSS("font-size", "13px");
    await expect(table).toHaveCSS("line-height", "18px");
    for (const cell of await identities.all()) {
      await expect(cell).toHaveCSS("padding", "8px");
      await expect(cell).toHaveCSS("line-height", "20px");
      await expect(cell).toHaveCSS("text-align", "left");
      await expect(cell).toHaveCSS("vertical-align", "top");
      await expect(cell).toHaveCSS("border-top", "1px solid rgb(221, 221, 221)");
    }
    for (const [index, cell] of (await actions.all()).entries()) {
      await expect(cell).toHaveCSS("padding", "8px");
      await expect(cell).toHaveCSS("line-height", "20px");
      await expect(cell).toHaveCSS("text-align", "right");
      await expect(cell).toHaveCSS("vertical-align", index === 0 ? "top" : "middle");
      await expect(cell).toHaveCSS("border-top", "1px solid rgb(221, 221, 221)");
    }

    const geometry = await table.evaluate((element) => {
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
      const rows = Array.from(element.querySelectorAll("tr"));
      return {
        documentWidth: document.documentElement.scrollWidth,
        rows: rows.map((row) => ({
          box: box(row),
          cells: Array.from(row.cells).map(box),
        })),
        table: box(element),
      };
    });
    expect(geometry.documentWidth).toBe(viewport.width);
    expect(geometry.table).toEqual({
      bottom: viewport.tableTop + viewport.tableHeight,
      height: viewport.tableHeight,
      left: viewport.tableLeft,
      right: viewport.tableLeft + viewport.tableWidth,
      top: viewport.tableTop,
      width: viewport.tableWidth,
    });
    expect(geometry.rows.map((row) => row.box.height)).toEqual(viewport.rowHeights);
    for (const row of geometry.rows) {
      expect(row.cells[0].width).toBe(viewport.identityWidth);
      expect(row.cells[1].width).toBe(viewport.actionWidth);
      expect(row.cells[0].left).toBe(geometry.table.left);
      expect(row.cells[0].right).toBe(row.cells[1].left);
      expect(row.cells[1].right).toBe(geometry.table.right);
      expect(row.cells[0].top).toBe(row.box.top);
      expect(row.cells[1].bottom).toBe(row.box.bottom);
    }

    // Legacy-cascade fallback evidence retired: the app no longer loads
    // bootstrap.css, so the class-restored clone no longer reproduces the paint.
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `stylex-user-email-table-shell-${viewport.name}.png`),
    });

    const validRow = table.locator("tr", { hasText: "valid@example.com" });
    const pendingRow = table.locator("tr", { hasText: "pending@example.com" });
    await validRow.locator('[data-stylex-owner="user-email-secondary-delete-action"]').click();
    await validRow.locator('[data-stylex-owner="user-email-primary-action"]').click();
    await pendingRow
      .locator('[data-stylex-owner="user-email-secondary-verification-action"]')
      .click();
    await expect
      .poll(() => requests)
      .toEqual([
        "DELETE /yona/api/v1/workspace/emails/11",
        "POST /yona/api/v1/workspace/emails/11/main",
        "POST /yona/api/v1/workspace/emails/12/validation",
      ]);
  });

async function mockEmailSettings(
  page: Page,
  requests: string[],
  fixture: { includeSecondary: boolean },
) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "ko-KR",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-token" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfillSession);
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: workspaceBody(fixture.includeSecondary),
    }),
  );
  await page.route("**/api/v1/workspace/emails/**", async (route) => {
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    requests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await route.fulfill({ contentType: "application/json", json: workspaceBody(true) });
  });
}

function workspaceBody(includeSecondary: boolean) {
  return {
    emails: includeSecondary
      ? [
          {
            avatarUrl: "",
            emailAddress: "valid@example.com",
            id: "11",
            valid: true,
          },
          {
            avatarUrl: "",
            emailAddress: "pending@example.com",
            id: "12",
            valid: false,
          },
        ]
      : [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "",
      displayName: "Admin User",
      loginId: "admin",
      primaryEmailAddress: "admin@example.com",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [],
  };
}
