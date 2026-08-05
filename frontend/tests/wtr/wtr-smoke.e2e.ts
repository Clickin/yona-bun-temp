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

test("login form renders with legacy action under anonymous mocks", async ({ page }) => {
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
  await page.goto("/yona/users/loginform?redirectUrl=%2Fme");
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    const form = document.querySelector(".page.full .login-form-wrap > form");
    return {
      wrap: !!document.querySelector(".login-form-wrap"),
      action: form?.getAttribute("action") ?? "NULL",
    };
  });
  if (!info.wrap || info.action === "NULL") {
    throw new Error("PROBE FORM: " + JSON.stringify(info));
  }
});
