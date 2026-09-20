import { expect, test, type Page } from "../wtr-compat.ts";

test("organization create form preserves legacy controls and box model", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const cancelHref = rootHref(basePath);
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  await expect(page).toHaveTitle("Yoram");
  expect(
    await page.evaluate(() =>
      Array.from(document.head.querySelectorAll("title"), (title) => title.textContent ?? ""),
    ),
  ).toContain("Yoram");
  await expect(page.locator('form[name="new-org"]')).toBeVisible();
  await expect(page.locator("#name")).toBeFocused();
  await expect(page.locator(".n-alert")).toHaveAttribute("data-errType", "name");
  await expect(page.locator(".wrongName")).toBeHidden();
  const cancelLink = page.locator('form[name="new-org"] .actions a.ybtn', { hasText: "Cancel" });
  await expect(cancelLink).toHaveAttribute("href", cancelHref);
  await expect(cancelLink).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(cancelLink).toHaveText("Cancel");
  await expect(cancelLink).not.toHaveAttribute("data-status", "active");

  expect(await organizationCreateMetrics(page)).toEqual({
    actionsOffsetTop: 10,
    alertDataErrType: "name",
    descriptionHeight: 50,
    descriptionWidth: 700,
    formWidth: 700,
    nameInputWidth: 700,
    // F5 dist-truth: legacy .project-page-wrap { width: 100% } inside
    // .page-wrap-outer { padding: 0 10px; width: 100%; box-sizing: border-box }
    // (yona-original/.../less/_responsive.less:611-615) -> 1260 at this 1280
    // viewport; app renders 1260 == legacy, pin was stale
    pageWrapWidth: 1260,
    submitButtonBackgroundColor: "rgb(255, 115, 50)",
    submitButtonColor: "rgb(255, 255, 255)",
    submitButtonBorderWidth: "1px",
    submitButtonFontSize: "14px",
    submitButtonLineHeight: "20px",
    submitButtonMatchesLegacyHeight: true,
    submitButtonPadding: "4px 12px",
    titleFontSize: 21,
    warningDisplay: "none",
  });
});

test("organization create name alert keeps legacy data error attribute declaratively", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  await expect(page.locator(".n-alert")).toHaveAttribute("data-errType", "name");
  await expect(page.locator(".wrongName")).toBeHidden();
});

test("organization create form validates name and posts REST payload", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const requests = await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  await page.locator("#name").fill("bad name");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.locator(".wrongName")).toBeVisible();
  expect(requests.createdOrganizations).toEqual([]);

  await page.locator("#name").fill("team.");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());
  await expect(page.locator(".wrongName")).toBeVisible();
  expect(requests.createdOrganizations).toEqual([]);

  await page.locator("#name").fill("한글-group");
  await page.locator("#descr").fill("Hangul team");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());

  await expect
    .poll(() => requests.createdOrganizations)
    .toEqual([
      {
        description: "Hangul team",
        organizationName: "한글-group",
      },
    ]);
  await expect(page).toHaveURL(`${basePath}/organizations/team-alpha`);
});

test("organization create form renders legacy flash warning before wrongName", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new?warning=organization.name.duplicate`);

  const warning = page.locator(".n-alert .orange-txt > span.warning");
  const wrongName = page.locator(".n-alert .orange-txt > span.wrongName");
  await expect(warning).toHaveText("Already existent user's login id or group name.");
  await expect(wrongName).toBeHidden();
  expect(
    await page.locator(".n-alert .orange-txt > span").evaluateAll((spans) =>
      spans.map((span) => ({
        className: span.className,
        text: span.textContent ?? "",
      })),
    ),
  ).toEqual([
    {
      className: "warning",
      text: "Already existent user's login id or group name.",
    },
    {
      className: "msg wrongName",
      text: "",
    },
  ]);

  await page.locator("#name").fill("bad name");
  await page
    .locator('form[name="new-org"]')
    .evaluate((form: HTMLFormElement) => form.requestSubmit());

  await expect(warning).toBeHidden();
  await expect(wrongName).toBeVisible();
  await expect(wrongName).toHaveText(
    "Enter the group name in alphanumerical or symbol characters(_-.)",
  );
});

test("organization create cancel keeps legacy href and navigates through the SPA", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const cancelHref = rootHref(basePath);
  await mockAuthenticatedSession(page);

  await page.goto(`${basePath}/organizations/new`);
  const cancelLink = page.locator('form[name="new-org"] .actions a.ybtn', { hasText: "Cancel" });

  await expect(cancelLink).toHaveAttribute("href", cancelHref);
  await expect(cancelLink).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
  await expect(cancelLink).toHaveText("Cancel");

  const documentRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "document") {
      documentRequests.push(request.url());
    }
  });
  await page.evaluate(() => {
    (window as Window & { __organizationCreateSpaMarker?: string }).__organizationCreateSpaMarker =
      "kept";
  });

  await cancelLink.click({ noWaitAfter: true });

  await expect.poll(() => page.evaluate(() => window.location.pathname)).toBe(cancelHref);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __organizationCreateSpaMarker?: string })
            .__organizationCreateSpaMarker,
      ),
    )
    .toBe("kept");
  expect(documentRequests).toEqual([]);
});

async function mockAuthenticatedSession(page: Page) {
  const requests = {
    createdOrganizations: [] as Array<{ description: string; organizationName: string }>,
  };

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
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        ownProjects: [],
        profile: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          displayName: "Site Admin",
          isGuest: false,
          isSiteAdmin: true,
          loginId: "admin",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
    }),
  );
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      body: JSON.stringify({ user: { loginId: "admin" } }),
    });
  });
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
    }
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        description: "Alpha team",
        id: 44,
        logoUrl: "/assets/images/organization_default_logo.png",
        organizationName: "team-alpha",
        redirectPath: "/organizations/team-alpha",
      }),
    });
  });

  return requests;
}

function rootHref(basePath: string) {
  return basePath === "/" ? "/" : `${basePath}/`;
}

async function organizationCreateMetrics(page: Page) {
  return page.evaluate(() => {
    const pageWrap = requireElement(".project-page-wrap");
    const form = requireElement('form[name="new-org"]');
    const legend = requireElement("legend");
    const alert = requireElement(".n-alert");
    const warning = requireElement(".wrongName");
    const nameInput = requireElement("#name");
    const description = requireElement("#descr");
    const actions = requireElement(".actions");
    const submitButton = requireElement(".actions button");
    const formRect = form.getBoundingClientRect();
    const actionsRect = actions.getBoundingClientRect();
    const descriptionRect = description.getBoundingClientRect();
    const nameInputRect = nameInput.getBoundingClientRect();
    const pageWrapRect = pageWrap.getBoundingClientRect();
    const legendStyle = getComputedStyle(legend);
    const warningStyle = getComputedStyle(warning);
    // organization/create.scala.html:55-59 uses this class-only action button.
    // Compare its natural line box, including the baseline-aligned icon, rather
    // than assuming line-height + padding + border fixes the rendered height.
    const legacyActions = document.createElement("div");
    legacyActions.className = "actions";
    const legacyButton = document.createElement("button");
    legacyButton.className = "ybtn ybtn-success";
    const legacyIcon = document.createElement("i");
    legacyIcon.className = "yobicon-friends";
    legacyButton.append(legacyIcon, ` ${submitButton.textContent?.trim() ?? ""}`);
    legacyActions.append(legacyButton);
    form.append(legacyActions);
    const submitButtonMatchesLegacyHeight =
      submitButton.getBoundingClientRect().height === legacyButton.getBoundingClientRect().height;
    legacyActions.remove();

    return {
      actionsOffsetTop: Math.round(actionsRect.top - descriptionRect.bottom),
      alertDataErrType: alert.getAttribute("data-errType"),
      descriptionHeight: Math.round(descriptionRect.height),
      descriptionWidth: Math.round(descriptionRect.width),
      formWidth: Math.round(formRect.width),
      nameInputWidth: Math.round(nameInputRect.width),
      pageWrapWidth: Math.round(pageWrapRect.width),
      submitButtonBackgroundColor: getComputedStyle(submitButton).backgroundColor,
      submitButtonColor: getComputedStyle(submitButton).color,
      submitButtonBorderWidth: getComputedStyle(submitButton).borderWidth,
      submitButtonFontSize: getComputedStyle(submitButton).fontSize,
      submitButtonLineHeight: getComputedStyle(submitButton).lineHeight,
      submitButtonMatchesLegacyHeight,
      submitButtonPadding: getComputedStyle(submitButton).padding,
      titleFontSize: Math.round(parseFloat(legendStyle.fontSize)),
      warningDisplay: warningStyle.display,
    };

    function requireElement(selector: string) {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) {
        throw new Error(`Missing ${selector}`);
      }
      return element;
    }
  });
}
