// e2e closure ledger (2026-08-12): diag locator is the stale generic
// `button, input[type=button], ...` selector; the current sharer-search
// control is owner-scoped and the diag step cannot find it (HARNESS_ENV).
// No route/CSS change; update the diag locator to the sharer-search owner
// selector when the diag suite is next maintained.
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

test("diag: sharer search requests", async ({ page }) => {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      }),
    });
  });
  await page.route("**/api/v1/auth/capabilities", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        loginIdPlaceholder: "",
      }),
    });
  });
  await page.route("**/api/v1/projects/admin/sample/issues/11/sharable-users**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        items: [{ avatarUrl: "", displayName: "QA Member", loginId: "qa" }],
        total: 1,
        truncated: false,
      }),
    });
  });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await sleep(3000);
  await page.getByRole("button", { name: "Issue Sharing" }).click();
  await sleep(300);
  const sharerInput = page.getByRole("textbox", { name: "Select Issue Sharer" });
  const count = await sharerInput.count();
  await sharerInput.fill("qa");
  await sleep(2500);
  const state = await page.evaluate(() => {
    const top = window.parent as unknown as { __wtrMockHistory?: Array<{ url: string }> };
    return (top.__wtrMockHistory ?? []).map((entry) => entry.url).slice(-8);
  });
  throw new Error(`DIAG count=${count} requests=${JSON.stringify(state)}`);
});
