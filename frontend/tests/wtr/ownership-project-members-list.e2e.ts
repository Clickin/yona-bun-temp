import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owner = "project-members-enrollment-avatar-wrap";

test.use({ locale: "en-US" });

test("project enrollment avatar wrapper preserves frozen legacy geometry and accept behavior", async ({
  page,
}) => {
  const requests = await mockProjectMembers(page);
  await page.setViewportSize({ height: 900, width: 1366 });
  await page.goto(`${basePath}/admin/sample/members`);

  // F5 dist-truth: the enrollment request section renders a beat after the
  // members shell under shard load, and the chained row-fluid/span2 locator
  // resolution is unstable across that re-render (gate flake). Target the
  // enrollment nodes directly with page-level locators instead.
  const request = page.locator(
    '.project-page-wrap .row-fluid:has([data-owner="project-members-enrollment-avatar-wrap"])',
  );
  const avatarWrap = page.locator(`[data-owner="${owner}"]`);
  const avatar = page.locator(`[data-owner="${owner}"] img.img-circle`);
  const accept = page.locator(".enrollAcceptBtn");

  // F5 dist-truth: the enrollment request section renders a beat after the
  // members shell under shard load (gate flake: 10s poll window was marginal).
  // Poll with an explicit 30s window, tolerating the pre-render absence.
  const requestVisible = await (async () => {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      if ((await request.count()) > 0) {
        const visible = await request.evaluate(
          (element) =>
            getComputedStyle(element).display !== "none" && element.getClientRects().length > 0,
        );
        if (visible) return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return false;
  })();
  expect(requestVisible).toBe(true);
  await expect(avatar).toHaveAttribute("width", "65");
  await expect(avatar).toHaveAttribute("height", "65");
  await expect(request.locator(":scope > .span2 > div").nth(0)).toHaveAttribute(
    "data-owner",
    owner,
  );
  await expect(request.locator(":scope > .span2 > div").nth(1)).toHaveAttribute(
    "data-owner",
    "project-members-enrollment-details",
  );
  await expect(request.locator("strong")).toHaveText("Bob Smith");
  await expect(request.locator("span").nth(1)).toHaveText("(bob)");
  await expect(accept).toHaveText(/Add/u);
  await expect(accept).toHaveAttribute("data-loginid", "bob");
  await expect(avatarWrap).toHaveCSS("float", "left");
  await expect(avatarWrap).toHaveCSS("margin-right", "10px");

  const desktop = await request.evaluate((element) => {
    const wrap = element.querySelector<HTMLElement>(
      '[data-owner="project-members-enrollment-avatar-wrap"]',
    );
    const image = wrap?.querySelector("img");
    const container = element.parentElement;
    if (!wrap || !image || !container) return null;
    const box = (target: Element) => {
      const rect = target.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        height: rect.height,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    return {
      container: box(container),
      image: box(image),
      wrap: box(wrap),
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(desktop).not.toBeNull();
  expect(desktop!.wrap.width).toBe(65);
  expect(desktop!.wrap.height).toBeGreaterThanOrEqual(65);
  expect(desktop!.image.width).toBe(65);
  expect(desktop!.image.height).toBe(65);
  expect(desktop!.image.right).toBeLessThanOrEqual(desktop!.container.right);
  expect(desktop!.scrollWidth).toBeLessThanOrEqual(1374);

  await accept.click();
  await expect.poll(() => requests.addedLoginIds).toEqual(["bob"]);

  await page.setViewportSize({ height: 844, width: 390 });
  const mobile = await request.evaluate((element) => {
    const row = element.getBoundingClientRect();
    const container = element.parentElement?.getBoundingClientRect();
    const image = element.querySelector("img")?.getBoundingClientRect();
    return container && image
      ? { container, image, row, scrollWidth: document.documentElement.scrollWidth }
      : null;
  });
  expect(mobile).not.toBeNull();
  expect(mobile!.image.width).toBe(65);
  expect(mobile!.image.right).toBeLessThanOrEqual(mobile!.container.right);
  expect(mobile!.scrollWidth).toBeLessThanOrEqual(398);
  expect(mobile!.row.left).toBeGreaterThanOrEqual(mobile!.container.left);
});

async function mockProjectMembers(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "project-members-csrf" },
      json: session,
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);

  const members = {
    enrollmentRequests: [
      {
        avatarUrl: "/assets/images/default-avatar-64.png",
        loginId: "bob",
        userId: 3,
        userLabel: "Bob Smith",
      },
    ],
    members: [],
    ownerName: "admin",
    projectName: "sample",
    roleOptions: [],
    viewerCanUpdate: true,
  };
  const project = {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    enrollmentRequestCount: 1,
    id: 7,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    isProtected: false,
    logoUrl: "/assets/images/project_default_logo.png",
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    ownerName: "admin",
    projectName: "sample",
    vcs: "GIT",
    viewerCanUpdate: true,
  };
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({ contentType: "application/json", json: project }),
  );
  const addedLoginIds: string[] = [];
  await page.route("**/api/v1/owners/admin/projects/sample/members", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as { loginId?: string };
      addedLoginIds.push(body.loginId ?? "");
    }
    await route.fulfill({ contentType: "application/json", json: members });
  });
  return { addedLoginIds };
}
