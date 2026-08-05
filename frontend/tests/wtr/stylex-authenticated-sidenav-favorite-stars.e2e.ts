import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");

const BASE_PATH = "/yona";
const SCREENSHOT_DIRECTORY = resolve(process.cwd(), "../output/playwright");

test.setTimeout(20_000);

test("authenticated Favorite stars have one narrow themed StyleX owner", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const ownerSource = routeSource.match(
    /const authenticatedSidenavFavoriteStarStyles = stylex\.create\([\s\S]*?\n\}\);/,
  )?.[0];

  expect(ownerSource).toBeDefined();
  expect(ownerSource).toContain("homeColors.sidenavFavoriteStarIdle");
  expect(ownerSource).toContain("homeColors.sidenavFavoriteStarActive");
  expect(ownerSource).toContain("homeColors.sidenavFavoriteStarActiveHover");
  expect(ownerSource).toContain('"transparent"');
  expect(ownerSource).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/i);
  expect(themeSource).toContain('sidenavFavoriteStarIdle: "#eeeeee"');
  expect(themeSource).toContain('sidenavFavoriteStarActive: "#e91e63"');
  expect(themeSource).toContain('sidenavFavoriteStarActiveHover: "#8a123b"');
  expect(routeSource).toContain('"authenticated-sidenav-favorite-stars"');
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Favorite stars preserve ${viewport.label} styles, geometry, and behavior`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const requests = await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole("button", { name: "User menu, Shortcut (F)" }).click();
    // The side nav slides open with a 0.5s width transition
    // (rootSidebarMotionStyles.shell). The force-clicks below dispatch at the
    // toggles' mid-transition positions and silently miss; let it settle.
    await page.waitForTimeout(600);

    const favorite = page.locator("#myOrganizationList");
    const ownToggle = favorite.locator("[aria-expanded]").filter({ hasText: "admin" });
    const organizationToggle = favorite.locator("[aria-expanded]").filter({ hasText: "weblabs" });
    await ownToggle.click({ force: true });
    await organizationToggle.click({ force: true });

    const placeholder = ownToggle.locator("xpath=..").locator(":scope > .star-org");
    const organization = favorite.getByRole("button", {
      name: "Remove weblabs from favorites",
    });
    const ownProject = favorite.getByRole("button", {
      name: "Add admin/own-project to favorites",
    });
    const organizationProject = favorite.getByRole("button", {
      name: "Remove weblabs/web-project from favorites",
    });
    const directProject = favorite.getByRole("button", {
      name: "Remove external/direct-favorite from favorites",
    });
    const owned = [placeholder, organization, ownProject, organizationProject, directProject];
    await expect(placeholder).toBeAttached();
    for (const element of [organization, ownProject, organizationProject, directProject]) {
      await expect(element).toBeVisible();
    }

    const baseline = {
      directProject: await readStarEvidence(directProject),
      organization: await readStarEvidence(organization),
      organizationProject: await readStarEvidence(organizationProject),
      ownProject: await readStarEvidence(ownProject),
      placeholder: await readStarEvidence(placeholder),
    };
    console.log(`authenticated-sidenav-favorite-stars-${viewport.label}`, JSON.stringify(baseline));
    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `stylex-authenticated-sidenav-favorite-stars-${viewport.label}-${baseline.ownProject.owner ? "after" : "before"}.png`,
      ),
    });

    for (const element of owned) {
      await expect(element).toHaveAttribute(
        "data-stylex-owner",
        "authenticated-sidenav-favorite-stars",
      );
    }
    await expect(placeholder).toHaveAttribute("data-stylex-owner-state", "placeholder");
    await expect(ownProject).toHaveAttribute("data-stylex-owner-state", "unstarred");
    for (const element of [organization, organizationProject, directProject]) {
      await expect(element).toHaveAttribute("data-stylex-owner-state", "starred");
    }

    expect(baseline.placeholder.box.width).toBe(29);
    expect(baseline.placeholder.box.height).toBe(0);
    expect(baseline.placeholder.icon).toBeNull();
    for (const evidence of [
      baseline.organization,
      baseline.ownProject,
      baseline.organizationProject,
      baseline.directProject,
    ]) {
      expect(evidence.button).toEqual({
        appearance: "none",
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderBottomWidth: "0px",
        borderLeftWidth: "0px",
        borderRightWidth: "0px",
        borderTopWidth: "0px",
        boxShadow: "none",
        boxSizing: "border-box",
        cursor: "pointer",
        flexShrink: "0",
        height: "16px",
        lineHeight: "normal",
        margin: "0px",
        minHeight: "0px",
        padding: "0px",
        position: "static",
        right: "auto",
        textAlign: "start",
        top: "auto",
        transform: "none",
        width: "29px",
      });
      expect(evidence.box.height).toBe(16);
      expect(evidence.box.width).toBe(29);
      expect(evidence.box.right).toBe(evidence.parentBox.right);
      expect(evidence.box.top + evidence.box.height / 2).toBe(
        evidence.parentBox.top + evidence.parentBox.height / 2,
      );
      expect(evidence.icon).toMatchObject({
        fontFamily: "Material Icons",
        fontSize: "16px",
        height: "15px",
        lineHeight: "16px",
        verticalAlign: "bottom",
      });
      expect(evidence.iconBox).toMatchObject({
        height: 15,
        left: evidence.box.left,
        width: 23.109375,
      });
    }
    expect(baseline.ownProject.icon?.color).toBe("rgb(238, 238, 238)");
    for (const evidence of [
      baseline.organization,
      baseline.organizationProject,
      baseline.directProject,
    ]) {
      expect(evidence.icon?.color).toBe("rgb(233, 30, 99)");
    }

    await ownProject.hover();
    expect(await colors(ownProject)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(233, 30, 99)",
    });
    await ownProject.focus();
    expect(await colors(ownProject)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(233, 30, 99)",
    });
    await organizationProject.locator("i").hover();
    expect(await colors(organizationProject)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(138, 18, 59)",
    });

    const pendingResponse = deferredResponse();
    requests.nextProjectResponse = pendingResponse.promise;
    await ownProject.click();
    await expect(ownProject).toBeDisabled();
    await expect(ownProject).toHaveAttribute("data-stylex-owner-state", "pending-unstarred");
    expect(await colors(ownProject)).toEqual({
      button: "rgb(233, 30, 99)",
      icon: "rgb(233, 30, 99)",
    });
    pendingResponse.resolve({ favorited: true });
    await expect(
      favorite.getByRole("button", { name: "Remove admin/own-project from favorites" }),
    ).toHaveAttribute("data-stylex-owner-state", "starred");
    expect(requests.project).toContainEqual({
      csrfToken: "csrf-favorite-stars",
      method: "POST",
      path: `${BASE_PATH}/api/v1/owners/admin/projects/own-project/favorite`,
    });
    await expect(ownToggle).toHaveAttribute("aria-expanded", "true");

    await organization.click();
    await expect(
      favorite.getByRole("button", { name: "Add weblabs to favorites" }),
    ).toHaveAttribute("data-stylex-owner-state", "unstarred");
    expect(requests.organization).toEqual([
      {
        csrfToken: "csrf-favorite-stars",
        method: "POST",
        path: `${BASE_PATH}/api/v1/organizations/weblabs/favorite`,
      },
    ]);

    await page.getByRole("button", { exact: true, name: "Project" }).click();
    const projectTabStar = page.getByRole("button", {
      name: "Add outside/project-tab-project to favorites",
    });
    await expect(projectTabStar).toBeVisible();
    await expect(projectTabStar).toHaveAttribute(
      "data-stylex-owner",
      "authenticated-sidenav-direct-project-rows",
    );
    await expect(projectTabStar).toHaveAttribute("data-stylex-owner-state", "unstarred");
  });
}

async function readStarEvidence(element: Locator) {
  return element.evaluate((node) => {
    const html = node as HTMLElement;
    const icon = html.querySelector<HTMLElement>("i");
    const parent = html.parentElement as HTMLElement;
    const box = html.getBoundingClientRect();
    const parentBox = parent.getBoundingClientRect();
    const rectangle = (value: DOMRect) => ({
      bottom: value.bottom,
      height: value.height,
      left: value.left,
      right: value.right,
      top: value.top,
      width: value.width,
    });
    const style = getComputedStyle(html);
    const iconStyle = icon ? getComputedStyle(icon) : null;
    return {
      box: rectangle(box),
      button: {
        appearance: style.appearance,
        backgroundColor: style.backgroundColor,
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
        borderRightWidth: style.borderRightWidth,
        borderTopWidth: style.borderTopWidth,
        boxShadow: style.boxShadow,
        boxSizing: style.boxSizing,
        cursor: style.cursor,
        flexShrink: style.flexShrink,
        height: style.height,
        lineHeight: style.lineHeight,
        margin: style.margin,
        minHeight: style.minHeight,
        padding: style.padding,
        position: style.position,
        right: style.right,
        textAlign: style.textAlign,
        top: style.top,
        transform: style.transform,
        width: style.width,
      },
      icon: iconStyle
        ? {
            color: iconStyle.color,
            fontFamily: iconStyle.fontFamily.replaceAll('"', ""),
            fontSize: iconStyle.fontSize,
            height: iconStyle.height,
            lineHeight: iconStyle.lineHeight,
            verticalAlign: iconStyle.verticalAlign,
          }
        : null,
      iconBox: icon ? rectangle(icon.getBoundingClientRect()) : null,
      owner: html.dataset.stylexOwner ?? null,
      parentBox: rectangle(parentBox),
      state: html.dataset.stylexOwnerState ?? null,
    };
  });
}

async function colors(element: Locator) {
  return element.evaluate((node) => ({
    button: getComputedStyle(node).color,
    icon: getComputedStyle(node.querySelector("i")!).color,
  }));
}

function deferredResponse() {
  let resolve!: (value: { favorited: boolean }) => void;
  const promise = new Promise<{ favorited: boolean }>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function installAuthenticatedHome(page: Page) {
  const requests: {
    nextProjectResponse?: Promise<{ favorited: boolean }>;
    organization: Array<{ csrfToken?: string; method: string; path: string }>;
    project: Array<{ csrfToken?: string; method: string; path: string }>;
  } = { organization: [], project: [] };
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
      headers: { "x-csrf-token": "csrf-favorite-stars" },
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
    requests.project.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    const json = requests.nextProjectResponse
      ? await requests.nextProjectResponse
      : { favorited: true };
    requests.nextProjectResponse = undefined;
    await route.fulfill({ contentType: "application/json", json });
  });
  await page.route("**/api/v1/organizations/*/favorite", async (route) => {
    const request = route.request();
    requests.organization.push({
      csrfToken: request.headers()["x-csrf-token"],
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
    await route.fulfill({ contentType: "application/json", json: { favorited: false } });
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
        favoriteProjects: [
          {
            isFavorited: true,
            ownerName: "external",
            projectId: 42,
            projectName: "direct-favorite",
          },
        ],
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
        recentProjects: [
          {
            isFavorited: false,
            ownerName: "outside",
            projectId: 41,
            projectName: "project-tab-project",
          },
        ],
        issueItems: [],
        recentIssues: [],
      },
    }),
  );
  return requests;
}
