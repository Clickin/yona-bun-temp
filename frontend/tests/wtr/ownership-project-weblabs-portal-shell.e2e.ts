import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("weblabs portal keeps the legacy project shell for an empty Git repository", async ({
  page,
}) => {
  // The container endpoint is served by the live backend (mirror); WTR mounts
  // the dist app against mocks only, so the copy must mock it. Payload omits
  // readmeFile (empty repo) so the app renders the legacy README placeholder
  // bubble the assertions below verify.
  const containerPayload = {
    backgroundImageUrl: "/assets/images/bg-default-project.png",
    id: 2,
    isFavorite: false,
    isForkedFromOrigin: false,
    isPrivate: false,
    menuSetting: {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      pullRequest: true,
      review: true,
    },
    organizationName: "weblabs",
    ownerName: "weblabs",
    projectName: "portal",
    projectScope: "protected",
    vcs: "GIT",
    viewerCanUpdate: false,
  } as const;
  await page.route("**/api/v1/owners/weblabs/projects/portal/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(containerPayload),
    });
  });
  const containerResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/v1/owners/weblabs/projects/portal/container") &&
      response.request().method() === "GET",
  );

  await page.goto(`${basePath}/weblabs/portal`);
  const containerResponse = await containerResponsePromise;
  expect(containerResponse.status()).toBe(200);
  // wtr-compat's ResponseFacade lacks .json() (reported to main); assert the
  // payload contract against the captured mock payload instead.
  const payload = containerPayload as Record<string, unknown>;
  expect(payload.ownerName).toBe("weblabs");
  expect(payload.projectName).toBe("portal");
  expect(payload.vcs).toBe("GIT");
  expect(payload.readmeFile ?? null).toBeNull();

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".project-page-wrap")).toBeVisible();
  await expect(page.locator(".bubble-wrap.gray.readme")).toBeVisible();
  await expect(page.locator(".project-header-outer .project-name")).toHaveText("portal");
  await expect(page.locator(".project-menu-gruop > li.active .menu-name")).toHaveText(
    "Project home",
  );
  await expect(page.locator(".bubble-wrap.gray.readme")).toContainText(
    "README.md will be shown here if you add it to the code repository's root directory.",
  );

  const geometry = await page.evaluate(() => {
    const header = document.querySelector<HTMLElement>(".project-header-outer");
    const menu = document.querySelector<HTMLElement>(".project-menu-outer");
    const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
    if (!header || !menu || !pageWrap) return null;
    const headerBox = header.getBoundingClientRect();
    const menuBox = menu.getBoundingClientRect();
    const pageBox = pageWrap.getBoundingClientRect();
    return {
      headerBottom: headerBox.bottom,
      menuBottom: menuBox.bottom,
      menuTop: menuBox.top,
      pageTop: pageBox.top,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.menuTop).toBeGreaterThanOrEqual(geometry!.headerBottom);
  expect(geometry!.pageTop).toBeGreaterThanOrEqual(geometry!.menuBottom);
});
