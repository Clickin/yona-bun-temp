import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

type Session = {
  isAnonymous: boolean;
  isSiteAdmin: boolean;
  loginId?: string;
};

async function openForbiddenSiteRoute(page: Page, session: Session) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: session,
    });

  await page.route("**/api/v1/session", fulfillSession);
  await page.goto(`${basePath}/sites/userList`);
  return page.locator(".error-wrap");
}

for (const [label, session] of [
  ["anonymous", { isAnonymous: true, isSiteAdmin: false }],
  ["non-site-admin", { isAnonymous: false, isSiteAdmin: false, loginId: "member" }],
] as const) {
  test(`site administration returns the legacy forbidden screen for a ${label} visitor`, async ({
    page,
  }) => {
    const error = await openForbiddenSiteRoute(page, session);

    await expect(error).toBeVisible();
    await expect(error.locator("i.ico.ico-err2")).toHaveCount(1);
    await expect(error.locator("p")).toHaveText(
      "You are not authorized to access this page or not logged in.",
    );
    const home = error.getByRole("link", { name: "Home" });
    await expect(home).toHaveClass(/(?:^|\s)ybtn(?:\s|$)/u);
    await expect(home).toHaveClass(/(?:^|\s)ybtn-primary(?:\s|$)/u);
    await expect(home).toHaveAttribute("href", `${basePath}/`);
    await expect(page).toHaveTitle("You are not authorized to access this page or not logged in.");

    const boxes = await page.evaluate(() => {
      const error = document.querySelector<HTMLElement>(".error-wrap");
      const pageWrap = document.querySelector<HTMLElement>(".page-wrap-outer");
      const projectWrap = document.querySelector<HTMLElement>(".project-page-wrap");
      if (!error || !pageWrap || !projectWrap) return null;
      return {
        error: error.getBoundingClientRect().toJSON(),
        pageWrap: pageWrap.getBoundingClientRect().toJSON(),
        projectWrap: projectWrap.getBoundingClientRect().toJSON(),
      };
    });
    expect(boxes).not.toBeNull();
    expect(boxes!.error.left).toBeGreaterThanOrEqual(boxes!.projectWrap.left);
    expect(boxes!.error.right).toBeLessThanOrEqual(boxes!.projectWrap.right);
    expect(boxes!.projectWrap.left).toBeGreaterThanOrEqual(boxes!.pageWrap.left);
    expect(boxes!.projectWrap.right).toBeLessThanOrEqual(boxes!.pageWrap.right);
  });
}
