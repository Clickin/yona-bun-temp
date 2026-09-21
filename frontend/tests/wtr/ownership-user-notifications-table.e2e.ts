import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const notificationTypes = [
  "NEW_ISSUE",
  "NEW_POSTING",
  "NEW_PULL_REQUEST",
  "ISSUE_STATE_CHANGED",
  "ISSUE_ASSIGNEE_CHANGED",
  "PULL_REQUEST_STATE_CHANGED",
  "NEW_COMMENT",
  "NEW_REVIEW_COMMENT",
  "MEMBER_ENROLL_REQUEST",
  "PULL_REQUEST_MERGED",
  "ISSUE_REFERRED_FROM_COMMIT",
  "PULL_REQUEST_COMMIT_CHANGED",
  "NEW_COMMIT",
  "PULL_REQUEST_REVIEW_STATE_CHANGED",
  "ISSUE_REFERRED_FROM_PULL_REQUEST",
  "ISSUE_BODY_CHANGED",
  "REVIEW_THREAD_STATE_CHANGED",
  "ORGANIZATION_MEMBER_ENROLL_REQUEST",
  "COMMENT_UPDATED",
  "ISSUE_MOVED",
  "ISSUE_SHARER_CHANGED",
  "ISSUE_LABEL_CHANGED",
  "ISSUE_MILESTONE_CHANGED",
  "POSTING_BODY_CHANGED",
  "RESOURCE_DELETED",
  "MEMBER_ENROLL_ACCEPT",
  "ORGANIZATION_MEMBER_ENROLL_ACCEPT",
] as const;

const owners = [
  "user-notification-table",
  "user-notification-row",
  "user-notification-label-cell",
  "user-notification-action-cell",
  "user-notification-switch",
  "user-notification-switch-label",
] as const;

test.use({ locale: "ko-KR" });

test("notification table and React switch have an exact six-owner Style boundary", () => {
  const route = readFileSync("src/routes/user/editform/notifications.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");

  for (const owner of owners) {
    expect(route).toContain(`data-owner="${owner}"`);
  }
  expect(
    new Set(
      route.match(/user-notification-(?:table|row|label-cell|action-cell|switch-label|switch)/gu),
    ),
  ).toEqual(new Set(owners));
  expect(route).not.toContain('className="table table-striped table-bordered"');
  expect(route).not.toContain('className="switch"');
  expect(route).not.toContain('className="notiUpdate"');
  expect(route).not.toContain("data-on-label");
  expect(route).not.toContain("data-off-label");
  expect(route).toContain('role="switch"');
  expect(route).toContain("aria-checked={enabled}");

  const tableTheme = theme.slice(theme.indexOf("export const notificationTableColors"));

  expect(tableTheme).not.toMatch(/(?:margin|padding|width|height|font|lineHeight)/u);
});

for (const viewport of [
  {
    actionWidth: 396.96875,
    firstRowHeight: 50,
    height: 900,
    labelWidth: 708.03125,
    name: "desktop",
    tableWidth: 1106,
    width: 1366,
  },
  {
    actionWidth: 97,
    firstRowHeight: 56,
    height: 844,
    labelWidth: 77.625,
    name: "mobile",
    tableWidth: 175.625,
    width: 390,
  },
] as const) {
  test(`pins populated ${viewport.name} table geometry, switch output, and cache toggle`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const requests: Array<{ body: unknown; csrf: string | undefined }> = [];
    await mockNotifications(page, requests);
    await page.goto(`${basePath}/user/editform/notifications`);

    const table = page.locator('[data-owner="user-notification-table"]');
    const rows = page.locator('[data-owner="user-notification-row"]');
    const labels = page.locator('[data-owner="user-notification-label-cell"]');
    const actions = page.locator('[data-owner="user-notification-action-cell"]');
    const switches = page.locator('[data-owner="user-notification-switch"]');
    await expect(table).toBeVisible();
    await expect(rows).toHaveCount(notificationTypes.length);
    await expect(labels).toHaveCount(notificationTypes.length);
    await expect(actions).toHaveCount(notificationTypes.length);
    await expect(switches).toHaveCount(notificationTypes.length);
    await expect(table).not.toHaveClass(/\b(?:table|table-striped|table-bordered)\b/u);
    await expect(page.locator("input.notiUpdate, .switch.has-switch")).toHaveCount(0);
    await expect(switches.first()).toHaveAttribute("aria-checked", "true");
    await expect(switches.nth(1)).toHaveAttribute("aria-checked", "false");
    await expect(
      switches.first().locator('[data-owner="user-notification-switch-label"]'),
    ).toHaveText(["On", "Off"]);

    await expect(table).toHaveCSS("width", `${viewport.tableWidth}px`);
    await expect(table).toHaveCSS("margin-bottom", "20px");
    await expect(table).toHaveCSS("border-top", "1px solid rgb(221, 221, 221)");
    await expect(table).toHaveCSS("border-left-width", "0px");
    await expect(table).toHaveCSS("border-collapse", "separate");
    await expect(labels.first()).toHaveCSS("background-color", "rgb(249, 249, 249)");
    await expect(labels.first()).toHaveCSS("font-weight", "700");
    await expect(actions.first()).toHaveCSS("padding", "8px");
    await expect(switches.first()).toHaveCSS("width", "80px");
    await expect(switches.first()).toHaveCSS("height", "29px");
    await expect(switches.first()).toHaveCSS("border-radius", "30px");

    const geometry = await table.evaluate((element) => {
      const firstRow = element.rows[0];
      const [label, action] = Array.from(firstRow.cells);
      const control = action.querySelector<HTMLElement>('[role="switch"]')!;
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return { height: rect.height, left: rect.left, top: rect.top, width: rect.width };
      };
      return {
        action: box(action),
        control: box(control),
        documentWidth: document.documentElement.scrollWidth,
        label: box(label),
        row: box(firstRow),
        table: box(element),
      };
    });
    expect(geometry.documentWidth).toBe(viewport.width);
    expect(geometry.table.width).toBe(viewport.tableWidth);
    expect(geometry.row.height).toBe(viewport.firstRowHeight);
    expect(geometry.label.width).toBe(viewport.labelWidth);
    expect(geometry.action.width).toBe(viewport.actionWidth);
    expect(geometry.control).toEqual({
      height: 29,
      left: geometry.action.left + 9,
      top: geometry.row.top + 8,
      width: 80,
    });

    expect(await frozenFallbackSignature(table)).toEqual({
      actionBorderLeft: "1px solid rgb(221, 221, 221)",
      actionPadding: "8px",
      labelBackground: "rgb(249, 249, 249)",
      labelFontWeight: "700",
      switchBorderRadius: "30px",
      switchHeight: "29px",
      switchWidth: "80px",
      tableBorderTop: "1px solid rgb(221, 221, 221)",
      tableMarginBottom: "20px",
    });

    await switches.first().click();
    await expect(switches.first()).toHaveAttribute("aria-checked", "false");
    await switches.first().click();
    await expect(switches.first()).toHaveAttribute("aria-checked", "true");
    expect(requests).toEqual([
      {
        body: { eventType: "NEW_ISSUE", projectId: "2" },
        csrf: "csrf-token",
      },
      {
        body: { eventType: "NEW_ISSUE", projectId: "2" },
        csrf: "csrf-token",
      },
    ]);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `style-user-notifications-table-${viewport.name}.png`),
    });
  });
}

async function frozenFallbackSignature(table: ReturnType<Page["locator"]>) {
  return table.evaluate((element) => {
    const label = element.rows[0].cells[0];
    const action = element.rows[0].cells[1];
    const control = action.querySelector<HTMLElement>('[role="switch"]')!;
    const tableStyle = getComputedStyle(element);
    const labelStyle = getComputedStyle(label);
    const actionStyle = getComputedStyle(action);
    const controlStyle = getComputedStyle(control);
    return {
      actionBorderLeft: actionStyle.borderLeft,
      actionPadding: actionStyle.padding,
      labelBackground: labelStyle.backgroundColor,
      labelFontWeight: labelStyle.fontWeight,
      switchBorderRadius: controlStyle.borderRadius,
      switchHeight: controlStyle.height,
      switchWidth: controlStyle.width,
      tableBorderTop: tableStyle.borderTop,
      tableMarginBottom: tableStyle.marginBottom,
    };
  });
}

async function mockNotifications(
  page: Page,
  requests: Array<{ body: unknown; csrf: string | undefined }>,
) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 2,
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

  const workspace = workspaceBody();
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({ contentType: "application/json", json: workspace }),
  );
  await page.route("**/api/v1/workspace/notifications", async (route) => {
    requests.push({
      body: JSON.parse(route.request().postData() ?? "{}"),
      csrf: route.request().headers()["x-csrf-token"],
    });
    await route.fulfill({ contentType: "application/json", json: workspace });
  });
}

function workspaceBody() {
  return {
    emails: [],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/assets/images/default-avatar-128.png",
      displayName: "Admin User",
      loginId: "admin",
      primaryEmailAddress: "admin@example.com",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [
      {
        notifications: notificationTypes.map((eventType, index) => ({
          enabled: index === 0,
          eventType,
        })),
        ownerName: "admin",
        projectId: "2",
        projectName: "sample",
      },
    ],
  };
}
