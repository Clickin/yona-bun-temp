// e2e closure ledger (2026-08-12): WTR diagnostic highlight hook is a no-op
// (DIAG highlight=NO PRE) — the app assertion cannot be reproduced in the
// harness (HARNESS_ENV). No route/CSS change.
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

test("diag: highlight DOM", async ({ page }) => {
  await page.route("**/api/v1/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-diag" },
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "",
        defaultLandingPath: "/",
        emailAddress: "",
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
      headers: { "x-csrf-token": "csrf-diag" },
      body: JSON.stringify({
        actorId: 1,
        avatarUrl: "",
        defaultLandingPath: "/",
        emailAddress: "",
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
  await page.route("**/api/v1/projects/admin/sample/issues/11**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        author: { loginId: "dev", name: "Dev Member", avatarUrl: "" },
        body: "",
        bodyMarkdown: "```javascript\nconst parity = true;\n```",
        childComments: [],
        comments: [],
        id: 11,
        issueNumber: 11,
        ownerName: "admin",
        projectName: "sample",
        sharers: [],
        state: "open",
        title: "diag",
        viewerCanComment: true,
        viewerCanUpdate: true,
      }),
    });
  });
  await page.goto(`${basePath}/admin/sample/issue/11`);
  await sleep(3000);
  const html = await page.evaluate(() => {
    const pre = document.querySelector("#issue-body-11 .content.markdown-wrap pre");
    return pre?.outerHTML.slice(0, 600) ?? "NO PRE";
  });
  throw new Error(`DIAG highlight=${html}`);
});
