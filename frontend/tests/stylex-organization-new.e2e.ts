import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const owners = {
  actions: "organization-new-actions",
  field: "organization-new-field",
  form: "organization-new-form",
  label: "organization-new-label",
  validation: "organization-new-validation",
} as const;

test("organization create visible skeleton has exactly five route-local StyleX owner types", () => {
  const routeSource = readFileSync(
    fileURLToPath(new URL("../src/routes/organizations/new.tsx", import.meta.url)),
    "utf8",
  );
  const styleSource = readFileSync(
    fileURLToPath(new URL("../src/routes/organizations/-new.stylex.ts", import.meta.url)),
    "utf8",
  );
  const declaredOwners = new Set(
    [...routeSource.matchAll(/data-stylex-owner="([^"]+)"/gu)].map((match) => match[1]),
  );

  expect([...declaredOwners].sort()).toEqual(Object.values(owners).sort());
  expect(routeSource).toContain('import * as stylex from "@stylexjs/stylex"');
  expect(routeSource).toContain('from "./-new.stylex"');
  expect(styleSource).toContain("stylex.defineVars");
  expect(styleSource).not.toMatch(/\b(?:width|height|margin|padding|fontSize|lineHeight)\s*:/u);
  for (const retired of [
    'className="form-wrap new-project"',
    'className="frm-wrap"',
    'className="text"',
    'className="text textarea.span4"',
    'className="n-alert"',
    'className="orange-txt"',
    'className="msg wrongName"',
    'className="actions"',
    'className="ybtn ybtn-success"',
    'className="ybtn"',
  ]) {
    expect(routeSource).not.toContain(retired);
  }
  expect(routeSource).not.toMatch(
    /dangerouslySetInnerHTML|document\.|addEventListener|classList|\.style\.display/u,
  );
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`organization create default and invalid-name state match live legacy on ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    const requests = await mockAuthenticatedSession(page);
    await page.setViewportSize(viewport);
    await page.goto("/yona/organizations/new");

    const frame = page.locator(`[data-stylex-owner="${owners.form}"]`).first();
    const legend = page.locator(`legend[data-stylex-owner="${owners.label}"]`);
    const labels = page.locator(`label[data-stylex-owner="${owners.label}"]`);
    const fields = page.locator(`[data-stylex-owner="${owners.field}"]`);
    const validation = page.locator(
      `[data-stylex-owner="${owners.validation}"][data-errtype="name"]`,
    );
    const actions = page.locator(`div[data-stylex-owner="${owners.actions}"]`);

    await expect(frame).toBeVisible();
    await expect(legend).toHaveText("New Group");
    await expect(labels).toHaveText(["input group name", "input group's description"]);
    await expect(fields).toHaveCount(2);
    await expect(page.locator("#name")).toBeFocused();
    await expect
      .poll(() =>
        page.locator("#name").evaluate((element) => getComputedStyle(element).borderColor),
      )
      .toBe("rgb(243, 108, 34)");
    await expect(validation.locator("span").last()).toBeHidden();
    await expect(actions.locator("button")).toHaveText(/Create Group/u);
    await expect(actions.locator("a")).toHaveText("Cancel");

    const metrics = await page.evaluate((stableOwners) => {
      const frameElement = required(`[data-stylex-owner="${stableOwners.form}"]`) as HTMLElement;
      const legendElement = required(
        `legend[data-stylex-owner="${stableOwners.label}"]`,
      ) as HTMLElement;
      const name = required("#name") as HTMLElement;
      const description = required("#descr") as HTMLElement;
      const actionRow = required(`div[data-stylex-owner="${stableOwners.actions}"]`) as HTMLElement;
      const frameBox = box(frameElement);
      const legendBox = box(legendElement);
      const nameBox = box(name);
      const descriptionBox = box(description);
      const actionsBox = box(actionRow);
      const nameStyle = getComputedStyle(name);
      const legendStyle = getComputedStyle(legendElement);

      return {
        actions: actionsBox,
        description: descriptionBox,
        frame: frameBox,
        legend: legendBox,
        legendBorder: legendStyle.borderBottomColor,
        legendFont: legendStyle.fontSize,
        legendLine: legendStyle.lineHeight,
        name: nameBox,
        nameBorder: nameStyle.borderColor,
        nameFont: nameStyle.fontSize,
        scrollWidth: document.documentElement.scrollWidth,
      };

      function box(element: HTMLElement) {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      }

      function required(selector: string) {
        const element = document.querySelector(selector);
        if (!element) throw new Error(`Missing ${selector}`);
        return element;
      }
    }, owners);

    expect(metrics.frame.width).toBe(700);
    expect(metrics.legend.width).toBe(700);
    expect(metrics.legend.height).toBe(41);
    expect(metrics.legendFont).toBe("21px");
    expect(metrics.legendLine).toBe("40px");
    expect(metrics.legendBorder).toBe("rgb(229, 229, 229)");
    expect(metrics.name.width).toBe(700);
    expect(metrics.name.height).toBe(30);
    expect(metrics.description.width).toBe(700);
    expect(metrics.description.height).toBe(50);
    expect(metrics.actions.width).toBe(700);
    expect(metrics.actions.height).toBe(30);
    expect(metrics.nameFont).toBe(viewport.name === "mobile" ? "16px" : "12px");
    expect(metrics.nameBorder).toBe("rgb(243, 108, 34)");
    expect(metrics.name.top - metrics.legend.bottom).toBe(47);
    expect(metrics.description.top - metrics.name.bottom).toBe(40);
    expect(metrics.actions.top - metrics.description.bottom).toBe(10);
    expect(metrics.frame.left).toBe(viewport.name === "mobile" ? 0 : 333);
    expect(metrics.scrollWidth).toBe(viewport.name === "mobile" ? 700 : 1366);

    await page.locator("#name").fill("bad name");
    await actions.locator("button").click();
    const error = validation.locator("span").last();
    await expect(error).toBeVisible();
    await expect(error).toHaveText(
      "Enter the group name in alphanumerical or symbol characters(_-.)",
    );
    expect(requests.createdOrganizations).toEqual([]);
    await frame.screenshot({
      path: testInfo.outputPath(`organization-new-${viewport.name}.png`),
    });
  });
}

test("organization create preserves REST/CSRF success and TanStack cancel boundaries", async ({
  page,
}) => {
  const requests = await mockAuthenticatedSession(page);
  await page.goto("/yona/organizations/new");
  await page.locator("#name").fill("한글-group");
  await page.locator("#descr").fill("Hangul team");
  await page.locator(`div[data-stylex-owner="${owners.actions}"] button`).click();

  await expect
    .poll(() => requests.createdOrganizations)
    .toEqual([{ description: "Hangul team", organizationName: "한글-group" }]);
  expect(requests.csrfHeaders).toHaveLength(1);
  expect(requests.csrfHeaders[0]).not.toBe("");
  await expect(page).toHaveURL("/yona/organizations/team-alpha");

  await page.goto("/yona/organizations/new");
  const documents: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") documents.push(request.url());
  });
  await page.evaluate(() => {
    (window as Window & { __orgNewSpa?: string }).__orgNewSpa = "kept";
  });
  await page.locator(`div[data-stylex-owner="${owners.actions}"] a`).click();
  await expect(page).toHaveURL("/yona/");
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __orgNewSpa?: string }).__orgNewSpa))
    .toBe("kept");
  expect(documents).toEqual([]);
});

test("organization create keeps a duplicate-name REST error in the legacy validation position", async ({
  page,
}) => {
  const requests = await mockAuthenticatedSession(page, { duplicateName: true });
  await page.goto("/yona/organizations/new");

  await page.locator("#name").fill("team-alpha");
  await page.locator("#descr").fill("Existing team");
  await page.locator(`div[data-stylex-owner="${owners.actions}"] button`).click();

  const validation = page.locator(
    `[data-stylex-owner="${owners.validation}"][data-errtype="name"]`,
  );
  await expect(validation.locator("span").first()).toBeVisible();
  await expect(validation.locator("span").first()).toHaveText(
    "Already existent user's login id or group name.",
  );
  await expect(validation.locator("span").last()).toBeHidden();
  await expect(page).toHaveURL("/yona/organizations/new");
  expect(requests.createdOrganizations).toEqual([
    { description: "Existing team", organizationName: "team-alpha" },
  ]);
  await expect(page.locator("#name")).toHaveValue("team-alpha");
  await expect(page.locator("#descr")).toHaveValue("Existing team");
});

async function mockAuthenticatedSession(page: Page, options: { duplicateName?: boolean } = {}) {
  const requests = {
    createdOrganizations: [] as Array<{ description: string; organizationName: string }>,
    csrfHeaders: [] as string[],
  };
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
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
    }),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({
      body: JSON.stringify({ user: { loginId: "admin" } }),
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
    }),
  );
  await page.route("**/api/v1/organizations", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as {
        description?: string;
        organizationName?: string;
      };
      requests.createdOrganizations.push({
        description: body.description ?? "",
        organizationName: body.organizationName ?? "",
      });
      requests.csrfHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
      if (options.duplicateName) {
        await route.fulfill({
          body: JSON.stringify({
            error: {
              code: "organization_name_duplicate",
              message: "organization.name.duplicate",
              status: 400,
            },
          }),
          contentType: "application/json",
          status: 400,
        });
        return;
      }
    }
    await route.fulfill({
      body: JSON.stringify({
        description: "Alpha team",
        id: 44,
        logoUrl: "/assets/images/organization_default_logo.png",
        organizationName: "team-alpha",
        redirectPath: "/organizations/team-alpha",
      }),
      contentType: "application/json",
    });
  });
  return requests;
}
// Batch 1112: geometry fix verified
