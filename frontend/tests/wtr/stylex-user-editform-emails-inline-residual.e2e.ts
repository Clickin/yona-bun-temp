import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = (page: Page, name: string) => page.locator(`[data-stylex-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("records the legacy set-main email width owner", () => {
  const route = readFileSync("src/routes/user/editform/emails.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/user/edit_emails.scala.html", "utf8");
  const yobiUi = readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8");

  expect(template).toContain('class="ybtn ybtn-small" style="width:150px;">');
  expect(yobiUi).toContain("&.ybtn-small {");
  expect(route).toContain('data-stylex-owner="user-email-primary-action"');
  expect(route).toContain('primaryEmailAction: {\n    width: "150px",');
  expect(route).not.toContain('style={{ width: "150px" }}');
  expect(route).toContain("ybtn ybtn-small");

  // legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다.
});

test("pins the set-main email action width and containment on desktop/mobile", async ({ page }) => {
  const requests: string[] = [];
  await mockEmailSettings(page, requests);

  for (const viewport of [
    { height: 900, width: 1366 },
    { height: 844, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform/emails`);

    const table = owner(page, "user-email-table");
    const row = table.locator("tr", { hasText: "valid@example.com" });
    const action = owner(page, "user-email-primary-action");
    await expect(row).toBeVisible();
    await expect(action).toBeVisible();
    await expect(action).toHaveText("대표 이메일로 설정");
    await expect(action).toHaveCSS("width", "150px");
    await expect(action).toHaveClass(/\bybtn\b/u);
    await expect(action).toHaveClass(/\bybtn-small\b/u);
    await expect(action).not.toHaveAttribute("style");
    await expect(table).toContainText("admin@example.com");
    await expect(table).toContainText("valid@example.com");

    const geometry = await row.evaluate((element) => {
      const action = element.querySelector<HTMLElement>(
        '[data-stylex-owner="user-email-primary-action"]',
      );
      const cell = action?.closest("td");
      const table = element.closest("table");
      if (!action || !cell || !table) return null;
      const actionBox = action.getBoundingClientRect();
      const cellBox = cell.getBoundingClientRect();
      const tableBox = table.getBoundingClientRect();
      return {
        action: {
          bottom: actionBox.bottom,
          left: actionBox.left,
          right: actionBox.right,
          top: actionBox.top,
          width: actionBox.width,
        },
        cell: {
          bottom: cellBox.bottom,
          left: cellBox.left,
          right: cellBox.right,
          top: cellBox.top,
        },
        documentWidth: document.documentElement.scrollWidth,
        table: { left: tableBox.left, right: tableBox.right },
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.action.width).toBe(150);
    expect(geometry!.action.right).toBeLessThanOrEqual(geometry!.cell.right);
    expect(geometry!.action.right).toBeLessThanOrEqual(geometry!.table.right);
    expect(geometry!.action.left).toBeGreaterThanOrEqual(geometry!.cell.left);
    expect(geometry!.documentWidth).toBeLessThanOrEqual(viewport.width);
  }

  await owner(page, "user-email-primary-action").click();
  await expect.poll(() => requests).toContain("POST /yona/api/v1/workspace/emails/11/main");
});

async function mockEmailSettings(page: Page, requests: string[]) {
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfillSession);
  }
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({ contentType: "application/json", json: workspaceBody() }),
  );
  await page.route("**/api/v1/workspace/emails/**", async (route) => {
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    requests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await route.fulfill({ contentType: "application/json", json: workspaceBody() });
  });
}

function workspaceBody() {
  return {
    emails: [{ avatarUrl: "", emailAddress: "valid@example.com", id: "11", valid: true }],
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
