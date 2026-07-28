import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const mode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";

test.use({ locale: "en-US" });

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`right Favorite project and organization stars own 29px-wide centered action geometry (${mode}, ${viewport.label})`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const api = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();

    const pane = page.locator("#mySidenav #myOrganizationList");
    await expect(pane).toBeVisible();
    const organization = pane.getByRole("button", {
      name: "Remove weblabs from favorites",
    });
    const organizationToggle = pane.locator("[aria-expanded]").filter({ hasText: "weblabs" });
    await organizationToggle.click();
    const favoredProject = pane.getByRole("button", {
      name: "Remove weblabs/web-project from favorites",
    });
    const unfavoredProject = pane.getByRole("button", {
      name: "Add admin/own-project to favorites",
    });
    const ownToggle = pane.locator("[aria-expanded]").filter({ hasText: "admin" });
    await ownToggle.click();

    for (const star of [organization, favoredProject, unfavoredProject]) {
      await expect(star).toBeVisible();
      await expect(star).toHaveAttribute(
        "data-stylex-owner",
        "authenticated-sidenav-favorite-stars",
      );
      await expect(star).not.toHaveAttribute("data-toggle");
      await expect(star).not.toHaveAttribute("data-action");
      await expect(star).not.toHaveAttribute("data-url");
      const evidence = await geometry(star);
      expect(evidence.button).toMatchObject({
        appearance: "none",
        borderWidth: "0px",
        boxSizing: "border-box",
        height: "16px",
        margin: "0px",
        padding: "0px",
        width: "29px",
      });
      expect(evidence.box).toMatchObject({ height: 16, width: 29 });
      expect(evidence.icon).toMatchObject({
        fontSize: "16px",
        height: "15px",
        lineHeight: "16px",
      });
      expect(evidence.parent.height).toBe(star === organization ? 25 : 26);
      expect(evidence.box.left).toBeGreaterThanOrEqual(evidence.parent.left);
      expect(evidence.box.right).toBeLessThanOrEqual(evidence.parent.right);
      expect(evidence.box.top).toBeGreaterThanOrEqual(evidence.parent.top);
      expect(evidence.box.bottom).toBeLessThanOrEqual(evidence.parent.bottom);
      expect(evidence.box.right).toBe(evidence.parent.right);
      expect(evidence.box.top + evidence.box.height / 2).toBeCloseTo(
        evidence.parent.top + evidence.parent.height / 2,
        5,
      );
    }

    await expect(organization).toHaveAttribute("aria-pressed", "true");
    await expect(favoredProject).toHaveAttribute("aria-pressed", "true");
    await expect(unfavoredProject).toHaveAttribute("aria-pressed", "false");

    const pending = deferredResponse();
    api.nextProjectResponse = pending.promise;
    await unfavoredProject.click();
    await expect(unfavoredProject).toBeDisabled();
    await expect(unfavoredProject).toHaveAttribute("data-stylex-owner-state", "pending-unstarred");
    const pendingGeometry = await geometry(unfavoredProject);
    expect(pendingGeometry.box).toMatchObject({ height: 16, width: 29 });
    expect(pendingGeometry.parent.height).toBe(26);
    expect(pendingGeometry.box.top + pendingGeometry.box.height / 2).toBeCloseTo(
      pendingGeometry.parent.top + pendingGeometry.parent.height / 2,
      5,
    );
    pending.resolve({ favorited: true });
    const newlyFavoredProject = pane.getByRole("button", {
      name: "Remove admin/own-project from favorites",
    });
    await expect(newlyFavoredProject).toHaveAttribute("aria-pressed", "true");
    await expect(newlyFavoredProject).toHaveAttribute("data-stylex-owner-state", "starred");

    api.nextOrganizationError = "organization denied";
    const errorDialogHandled = page.waitForEvent("dialog").then(async (dialog) => {
      expect(dialog.message()).toBe("Update failed: REST request failed with 403.");
      await dialog.accept();
    });
    await organization.click();
    await errorDialogHandled;
    await expect(organization).toHaveAttribute("aria-pressed", "true");
    await expect(organization).toHaveAttribute("data-stylex-owner-state", "starred");

    await organization.click();
    await expect(pane.getByRole("button", { name: "Add weblabs to favorites" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    expect(api.projectRequests).toEqual([
      {
        csrfToken: "csrf-star-geometry",
        method: "POST",
        path: `${BASE_PATH}/api/v1/owners/admin/projects/own-project/favorite`,
      },
    ]);
    expect(api.organizationRequests).toHaveLength(2);
    expect(api.organizationRequests[0]).toMatchObject({
      csrfToken: "csrf-star-geometry",
      method: "POST",
      path: `${BASE_PATH}/api/v1/organizations/weblabs/favorite`,
    });

    await expect(page.locator("#sidebar")).toHaveCount(0);
    await expect(page.locator("#mySidenav #myProjectList")).toBeHidden();
    await expect(page.locator("#mySidenav #myRecentIssueList")).toBeHidden();
    expect(
      await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      })),
    ).toEqual({ clientWidth: viewport.width, scrollWidth: viewport.width });
  });
}

async function geometry(star: Locator) {
  return star.evaluate((node) => {
    const element = node as HTMLElement;
    const icon = element.querySelector<HTMLElement>("i")!;
    const parent = element.parentElement!;
    const rect = (value: DOMRect) => ({
      bottom: value.bottom,
      height: value.height,
      left: value.left,
      right: value.right,
      top: value.top,
      width: value.width,
    });
    const style = getComputedStyle(element);
    const iconStyle = getComputedStyle(icon);
    return {
      box: rect(element.getBoundingClientRect()),
      button: {
        appearance: style.appearance,
        borderWidth: style.borderWidth,
        boxSizing: style.boxSizing,
        height: style.height,
        margin: style.margin,
        padding: style.padding,
        width: style.width,
      },
      icon: {
        fontSize: iconStyle.fontSize,
        height: iconStyle.height,
        lineHeight: iconStyle.lineHeight,
      },
      parent: rect(parent.getBoundingClientRect()),
    };
  });
}

function deferredResponse() {
  let resolve!: (value: { favorited: boolean }) => void;
  const promise = new Promise<{ favorited: boolean }>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function installAuthenticatedHome(page: Page) {
  const state: {
    nextOrganizationError?: string;
    nextProjectResponse?: Promise<{ favorited: boolean }>;
    organizationRequests: Array<{ csrfToken?: string; method: string; path: string }>;
    projectRequests: Array<{ csrfToken?: string; method: string; path: string }>;
  } = { organizationRequests: [], projectRequests: [] };
  await page.addInitScript((basePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-star-geometry" },
      json: { isAnonymous: false },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/owners/*/projects/*/favorite", async (route) => {
    const request = route.request();
    state.projectRequests.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    const json = state.nextProjectResponse ? await state.nextProjectResponse : { favorited: true };
    state.nextProjectResponse = undefined;
    await route.fulfill({ contentType: "application/json", json });
  });
  await page.route("**/api/v1/organizations/*/favorite", async (route) => {
    const request = route.request();
    state.organizationRequests.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    if (state.nextOrganizationError) {
      const reason = state.nextOrganizationError;
      state.nextOrganizationError = undefined;
      await route.fulfill({ contentType: "application/json", json: { reason }, status: 403 });
      return;
    }
    await route.fulfill({ contentType: "application/json", json: { favored: false } });
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: 1,
            projects: [
              {
                isFavorited: true,
                ownerName: "weblabs",
                projectId: 32,
                projectName: "web-project",
              },
            ],
          },
        ],
        favoriteProjects: [],
        organizations: [{ organizationId: 11, organizationName: "weblabs", projects: [] }],
        ownProjects: [
          {
            isFavorited: false,
            ownerName: "admin",
            projectId: 31,
            projectName: "own-project",
          },
        ],
        profile: { loginId: "admin" },
        recentProjects: [],
        issueItems: [],
        recentIssues: [],
      },
    }),
  );
  return state;
}
