import { expect, test, type Page } from "../wtr-compat.ts";

const validationSelector = '[data-errtype="name"]';

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`organization create default and invalid-name state preserve legacy layout on ${viewport.name}`, async ({
    page,
  }) => {
    const requests = await mockAuthenticatedSession(page);
    await page.setViewportSize(viewport);
    await page.goto("/yona/organizations/new");

    const frame = page.locator(".form-wrap.new-project");
    const legend = frame.locator("legend");
    const labels = frame.locator("label");
    const fields = frame.locator("input, textarea");
    const validation = page.locator(validationSelector);
    const actions = frame.locator(".actions");

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

    const metrics = await page.evaluate(() => {
      const frameElement = required(".form-wrap.new-project") as HTMLElement;
      const legendElement = required('form[name="new-org"] legend') as HTMLElement;
      const name = required("#name") as HTMLElement;
      const description = required("#descr") as HTMLElement;
      const actionRow = required('form[name="new-org"] .actions') as HTMLElement;
      const frameBox = box(frameElement);
      const legendBox = box(legendElement);
      const nameBox = box(name);
      const descriptionBox = box(description);
      const actionsBox = box(actionRow);
      const nameStyle = getComputedStyle(name);
      const legendStyle = getComputedStyle(legendElement);
      const definitions = required('form[name="new-org"] dl');
      const terms = definitions.querySelectorAll("dt");

      return {
        actions: actionsBox,
        createButton: box(required('form[name="new-org"] .actions button') as HTMLElement),
        cancelLink: box(required('form[name="new-org"] .actions a') as HTMLElement),
        description: descriptionBox,
        frame: frameBox,
        legend: legendBox,
        legendBorder: legendStyle.borderBottomColor,
        legendFont: legendStyle.fontSize,
        legendLine: legendStyle.lineHeight,
        name: nameBox,
        nameBorder: nameStyle.borderColor,
        nameFont: nameStyle.fontSize,
        nameMarginBottom: nameStyle.marginBottom,
        definitionsPadding: getComputedStyle(definitions).padding,
        termMargins: Array.from(terms, (term) => getComputedStyle(term).margin),
        pageWrap: box(required(".project-page-wrap") as HTMLElement),
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
    });

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
    expect(metrics.nameFont).toBe(viewport.name === "mobile" ? "16px" : "12px");
    expect(metrics.nameBorder).toBe("rgb(243, 108, 34)");
    expect(metrics.definitionsPadding).toBe("0px");
    expect(metrics.termMargins).toEqual(["3px 0px 1px", "3px 0px 1px"]);
    expect(metrics.nameMarginBottom).toBe("10px");
    expect(metrics.name.top).toBeGreaterThan(metrics.legend.bottom);
    expect(metrics.description.top).toBeGreaterThan(metrics.name.bottom);
    expect(metrics.actions.top - metrics.description.bottom).toBe(10);
    expect(metrics.frame.left - metrics.pageWrap.left).toBeCloseTo(
      Math.max(0, (metrics.pageWrap.width - metrics.frame.width) / 2),
      1,
    );
    expect((metrics.createButton.left + metrics.cancelLink.right) / 2).toBeCloseTo(
      (metrics.frame.left + metrics.frame.right) / 2,
      1,
    );
    expect(metrics.cancelLink.left).toBeGreaterThan(metrics.createButton.right);

    await page.locator("#name").fill("bad name");
    await actions.locator("button").click();
    const error = validation.locator("span").last();
    await expect(error).toBeVisible();
    await expect(error).toHaveText(
      "Enter the group name in alphanumerical or symbol characters(_-.)",
    );
    expect(requests.createdOrganizations).toEqual([]);
    await frame.screenshot({
      path: `organization-new-${viewport.name}.png`,
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
  await page.locator('form[name="new-org"] .actions button').click();

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
  await page.locator('form[name="new-org"] .actions a').click();
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
  await page.locator('form[name="new-org"] .actions button').click();

  const validation = page.locator(validationSelector);
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
