// WTR smoke spec: verifies the in-browser harness core (mock routing through
// the injected fetch override + the app booting inside the same-origin iframe).
import { expect, test } from "../wtr-compat.ts";

test("fetch mock intercepts iframe fetches", async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({ contentType: "application/json", json: { mocked: true } }),
  );
  await page.goto("/yona/");
  await page.waitForTimeout(800);
  const result = await page.evaluate(async () => {
    const response = await fetch("/yona/api/v1/session");
    return { status: response.status, body: await response.text() };
  });
  expect(result.status).toBe(200);
  if (!result.body.includes("mocked")) {
    throw new Error("PROBE BODY: " + JSON.stringify(result.body.slice(0, 200)));
  }
});

test("login form renders under the full standalone-login mock set", async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: null,
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-standalone-login" },
      json: { isAnonymous: true },
    }),
  );
  await page.route("**/api/v1/auth/sign-in", (route) =>
    route.fulfill({ contentType: "application/json", json: { isAnonymous: false } }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: false,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/users/me/profile?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-128.png",
          displayName: "Site Admin",
          loginId: "me",
        },
        pullRequestItems: [],
        selected: "issues",
      },
    }),
  );
  await page.goto("/yona/users/loginform?redirectUrl=%2Fme");
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const form = document.querySelector(".page.full .login-form-wrap > form");
    return {
      wrap: !!document.querySelector(".login-form-wrap"),
      action: form?.getAttribute("action") ?? "NULL",
      bodyHead: document.body.innerText.slice(0, 150),
    };
  });
  if (!info.wrap || info.action === "NULL") {
    throw new Error("PROBE FORM: " + JSON.stringify(info));
  }
});
