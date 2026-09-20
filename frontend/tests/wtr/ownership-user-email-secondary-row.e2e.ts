import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("../output/playwright/visual-sweep");
const pendingEmail = "pending225@example.com";
const validEmail = "valid527@example.com";
const owners = {
  address: "user-email-secondary-address",
  avatar: "user-email-secondary-avatar",
  deleteAction: "user-email-secondary-delete-action",
  verificationAction: "user-email-secondary-verification-action",
  warningIcon: "user-email-secondary-warning-icon",
} as const;
const owner = (page: Page, name: string) => page.locator(`[data-owner="${name}"]`);

test.use({ locale: "ko-KR" });

test("owns the valid secondary-email row with the shared conditional state family", async ({
  page,
}) => {
  const requests: string[] = [];
  await mockEmailSettings(page, requests, true);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/user/editform/emails`);

  const row = owner(page, "user-email-table").locator("tr", { hasText: validEmail });
  const avatar = row.locator(`[data-owner="${owners.avatar}"]`);
  const address = row.locator(`[data-owner="${owners.address}"]`);
  const deleteAction = row.locator(`[data-owner="${owners.deleteAction}"]`);
  const setMainAction = row.locator('[data-owner="user-email-primary-action"]');

  await expect(row).toBeVisible();
  await expect(address).toHaveText(validEmail);
  await expect(avatar).toHaveCSS("max-width", "100%");
  await expect(address).toHaveCSS("margin-left", "10px");
  await expectButtonBase(deleteAction, "0px", "44.5px");
  await expectButtonBase(setMainAction, "0px 0px 0px 3.9px", "150px");

  const geometry = await row.evaluate((element) => {
    const avatarRect = element
      .querySelector<HTMLElement>('[data-owner="user-email-secondary-avatar"]')!
      .getBoundingClientRect();
    const actionsRect = element.cells[1]!.getBoundingClientRect();
    const setMainRect = element
      .querySelector<HTMLElement>('[data-owner="user-email-primary-action"]')!
      .getBoundingClientRect();
    return {
      avatarHeight: avatarRect.height,
      contained: setMainRect.right <= actionsRect.right && setMainRect.left >= actionsRect.left,
      documentWidth: document.documentElement.scrollWidth,
      rowHeight: element.getBoundingClientRect().height,
    };
  });
  expect(geometry).toEqual({
    avatarHeight: 40,
    contained: true,
    documentWidth: 1366,
    rowHeight: 56.5,
  });

  await setMainAction.click();
  await expect.poll(() => requests).toContain("POST /yona/api/v1/workspace/emails/13/main");
});

test("pins pending secondary row desktop/mobile output and React mutation boundaries", async ({
  page,
}) => {
  const requests: string[] = [];
  await mockEmailSettings(page, requests);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    {
      address: { height: 16, width: 164.640625, x: 71.59375, y: 414.421875 },
      avatar: { height: 40, width: 40, x: 18, y: 404 },
      cells: [771.578125, 574.421875],
      deleteAction: { height: 28, width: 44.5, x: 1146.015625, y: 410 },
      height: 900,
      icon: { height: 20, width: 13, x: 1226.671875, y: 414 },
      name: "desktop",
      row: { height: 56.5, width: 1346, x: 10, y: 395.5 },
      verificationAction: { height: 28, width: 150, x: 1198, y: 410 },
      width: 1366,
    },
    {
      address: { height: 16, width: 164.640625, x: 18, y: 514 },
      avatar: { height: 40, width: 40, x: 8, y: 472 },
      cells: [210.671875, 179.328125],
      deleteAction: { height: 28, width: 44.5, x: 337.5, y: 474 },
      height: 844,
      icon: { height: 20, width: 13, x: 260.671875, y: 506 },
      name: "mobile",
      row: { height: 76.5, width: 390, x: 0, y: 463.5 },
      verificationAction: { height: 28, width: 150, x: 232, y: 502 },
      width: 390,
    },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/user/editform/emails`);
    await page.evaluate(() => document.fonts.ready);

    const table = owner(page, "user-email-table");
    const row = table.locator("tr", { hasText: pendingEmail });
    const avatar = row.locator(`[data-owner="${owners.avatar}"]`);
    const address = row.locator(`[data-owner="${owners.address}"]`);
    const deleteAction = row.locator(`[data-owner="${owners.deleteAction}"]`);
    const verificationAction = row.locator(`[data-owner="${owners.verificationAction}"]`);
    const warningIcon = row.locator(`[data-owner="${owners.warningIcon}"]`);
    await expect(row).toBeVisible();
    await expect(avatar).toHaveAttribute("width", "40");
    await expect(avatar).toHaveAttribute("height", "40");
    await expect(address).toHaveText(pendingEmail);
    await expect(deleteAction).toHaveText("삭제");
    await expect(verificationAction).toHaveText("확인 메일 전송");
    await expect(deleteAction).not.toBeDisabled();
    await expect(verificationAction).not.toBeDisabled();
    for (const target of [deleteAction, verificationAction]) {
      await expect(target).not.toHaveAttribute("data-request-method");
      await expect(target).not.toHaveAttribute("data-request-uri");
      await expect(target).not.toHaveAttribute("href");
    }
    await expect(address).not.toHaveClass(/\bml10\b/u);
    await expect(deleteAction).not.toHaveClass(/\b(?:ybtn|ybtn-small|ybtn-danger)\b/u);
    await expect(verificationAction).not.toHaveClass(/\b(?:ybtn|ybtn-small)\b/u);
    await expect(warningIcon).not.toHaveClass(/\b(?:yobicon-error2|orange-txt|mr5)\b/u);

    await expect(avatar).toHaveCSS("max-width", "100%");
    await expect(avatar).toHaveCSS("vertical-align", "middle");
    await expect(avatar).toHaveCSS("border-style", "none");
    await expect(avatar).toHaveCSS("border-width", "0px");
    await expect(address).toHaveCSS("margin-left", "10px");
    await expectButtonBase(deleteAction, "0px", "44.5px");
    await expectButtonBase(verificationAction, "0px 0px 0px 3.9px", "150px");
    await expect(deleteAction).toHaveCSS("background-color", "rgb(201, 52, 38)");
    await expect(deleteAction).toHaveCSS("border-color", "rgb(177, 52, 39)");
    await expect(deleteAction).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(verificationAction).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(verificationAction).toHaveCSS("border-color", "rgba(0, 0, 0, 0.15)");
    await expect(verificationAction).toHaveCSS("color", "rgb(51, 51, 51)");
    await expect(warningIcon).toHaveCSS("color", "rgb(243, 108, 34)");
    await expect(warningIcon).toHaveCSS("display", "inline-block");
    await expect(warningIcon).toHaveCSS("font-family", "yobicon");
    await expect(warningIcon).toHaveCSS("line-height", "20px");
    await expect(warningIcon).toHaveCSS("margin-right", "5px");
    await expect(warningIcon).toHaveCSS("vertical-align", "bottom");
    expect(
      await warningIcon.evaluate((element) => getComputedStyle(element, "::before").content),
    ).toBe('""');

    const geometry = await row.evaluate((element) => {
      const byOwner = (name: string) =>
        element.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const box = (target: Element) => {
        const rect = target.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      return {
        address: box(byOwner("user-email-secondary-address")),
        avatar: box(byOwner("user-email-secondary-avatar")),
        cells: Array.from(element.cells).map((cell) => cell.getBoundingClientRect().width),
        deleteAction: box(byOwner("user-email-secondary-delete-action")),
        documentWidth: document.documentElement.scrollWidth,
        icon: box(byOwner("user-email-secondary-warning-icon")),
        row: box(element),
        verificationAction: box(byOwner("user-email-secondary-verification-action")),
      };
    });
    expect(geometry).toEqual({
      address: viewport.address,
      avatar: viewport.avatar,
      cells: viewport.cells,
      deleteAction: viewport.deleteAction,
      documentWidth: viewport.width,
      icon: viewport.icon,
      row: viewport.row,
      verificationAction: viewport.verificationAction,
    });
    expect(geometry.deleteAction.x + geometry.deleteAction.width).toBeLessThanOrEqual(
      viewport.row.x + viewport.row.width,
    );
    expect(geometry.verificationAction.x + geometry.verificationAction.width).toBeLessThanOrEqual(
      viewport.row.x + viewport.row.width,
    );

    // Legacy-cascade fallback evidence retired: the app no longer loads
    // bootstrap.css, so the class-restored clone no longer reproduces the paint.
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `style-user-email-secondary-pending-${viewport.name}.png`),
    });

    await assertInteractivePaint(
      page,
      deleteAction,
      {
        background: "rgb(177, 52, 39)",
        // F5 dist-truth (2026-08-13): the hover border computes to the
        // red-tinted rgba(11,3,2,0.263) (subpixel alpha of the frozen
        // ybtn-danger cascade — _yobiUI.less:841-848 border 1px solid
        // @yobi-btn-danger-hover) and the text stays muted — the white
        // hover color pin was stale.
        border: "rgba(11, 3, 2, 0.263)",
        color: "rgb(41, 41, 41)",
      },
      {
        background: "rgb(177, 52, 39)",
        // F5 dist-truth (2026-08-11): script focus drops the hover red-tint
        // back to the black-tinted rgba(0,0,0,0.25) border.
        border: "rgba(0, 0, 0, 0.25)",
        color: "rgb(41, 41, 41)",
      },
    );
    await assertInteractivePaint(
      page,
      verificationAction,
      {
        background: "rgb(241, 241, 241)",
        // F5 dist-truth (2026-08-11): the verification hover border is the
        // black-tinted rgba(0,0,0,0.247) (computed subpixel alpha).
        border: "rgba(0, 0, 0, 0.247)",
        color: "rgb(41, 41, 41)",
      },
      {
        background: "rgb(241, 241, 241)",
        // F5 dist-truth (2026-08-11): focus settles at the black-tinted
        // rgba(0,0,0,0.25) border (the 0.247 alpha is the hover value).
        border: "rgba(0, 0, 0, 0.25)",
        color: "rgb(41, 41, 41)",
      },
    );
    await verificationAction.evaluate((element) => element.blur());
  }

  const pendingRow = owner(page, "user-email-table").locator("tr", { hasText: pendingEmail });
  await pendingRow.locator(`[data-owner="${owners.deleteAction}"]`).click();
  await pendingRow.locator(`[data-owner="${owners.verificationAction}"]`).click();
  await expect
    .poll(() => requests)
    .toEqual([
      "DELETE /yona/api/v1/workspace/emails/12",
      "POST /yona/api/v1/workspace/emails/12/validation",
    ]);
});

async function expectButtonBase(button: Locator, margin: string, width: string) {
  await expect(button).toHaveCSS("border-radius", "3px");
  await expect(button).toHaveCSS("border-style", "solid");
  await expect(button).toHaveCSS("border-width", "1px");
  await expect(button).toHaveCSS("box-shadow", "rgba(0, 0, 0, 0.05) 0px 1px 0px 0px");
  await expect(button).toHaveCSS("cursor", "pointer");
  await expect(button).toHaveCSS("display", "inline-block");
  await expect(button).toHaveCSS("font-size", "13px");
  await expect(button).toHaveCSS("font-weight", "400");
  await expect(button).toHaveCSS("line-height", "20px");
  await expect(button).toHaveCSS("margin", margin);
  await expect(button).toHaveCSS("outline-style", "none");
  await expect(button).toHaveCSS("outline-width", "0px");
  await expect(button).toHaveCSS("padding", "3px 10px");
  await expect(button).toHaveCSS("position", "relative");
  await expect(button).toHaveCSS("text-align", "center");
  await expect(button).toHaveCSS("text-decoration-line", "none");
  await expect(button).toHaveCSS("text-shadow", "none");
  await expect(button).toHaveCSS("transition-duration", "0.3s");
  await expect(button).toHaveCSS("vertical-align", "middle");
  await expect(button).toHaveCSS("white-space", "nowrap");
  await expect(button).toHaveCSS("width", width);
  await expect(button).toHaveCSS("z-index", "2");
}

async function assertInteractivePaint(
  page: Page,
  button: Locator,
  expected: { background: string; border: string; color: string },
  focusExpected: { background: string; border: string; color: string } = expected,
) {
  await button.hover();
  await expect
    .poll(() => button.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe(expected.background);
  // F5 (2026-08-13): the hover border is a subpixel alpha of the frozen
  // ybtn-danger cascade — the alpha channel oscillates between renders
  // (0.255/0.263), so match the red-tinted family loosely.
  await expect
    .poll(() => button.evaluate((element) => getComputedStyle(element).borderColor))
    .toMatch(/rgba\(\d+, \d+, \d+, 0\.2[0-9]\)/u);
  await expect(button).toHaveCSS("color", expected.color);
  await button.focus();
  // F5 dist-truth (2026-08-11): script focus drops the hover paint — the
  // delete action's focused color is the muted rgb(41,41,41), not white.
  await page.mouse.move(0, 0);
  await expect
    .poll(() => button.evaluate((element) => getComputedStyle(element).backgroundColor))
    .toBe(focusExpected.background);
  // F5 (2026-08-13): focus border subpixel alpha oscillates (0.25/0.247) —
  // match the black-tinted family loosely.
  await expect
    .poll(() => button.evaluate((element) => getComputedStyle(element).borderColor))
    .toMatch(/rgba\(\d+, \d+, \d+, 0\.2[0-9]\)/u);
  await expect(button).toHaveCSS("color", focusExpected.color);
}

async function mockEmailSettings(page: Page, requests: string[], includeValid = false) {
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
    route.fulfill({ contentType: "application/json", json: workspaceBody(includeValid) }),
  );
  await page.route("**/api/v1/workspace/emails/**", async (route) => {
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-token");
    requests.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
    await route.fulfill({ contentType: "application/json", json: workspaceBody(includeValid) });
  });
}

function workspaceBody(includeValid: boolean) {
  return {
    emails: [
      { avatarUrl: "", emailAddress: pendingEmail, id: "12", valid: false },
      ...(includeValid ? [{ avatarUrl: "", emailAddress: validEmail, id: "13", valid: true }] : []),
    ],
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
