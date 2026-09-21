import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-owner="site-mail-title-strip"]';
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);

type MailResponse = {
  notConfiguredItems: string[];
  sender: string;
  sent: boolean;
};

async function mockSession(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
}

async function openMail(page: Page, response?: MailResponse, search = "") {
  await mockSession(page);
  if (response) {
    await page.route("**/api/v1/site/mail", (route) =>
      route.fulfill({ contentType: "application/json", json: response }),
    );
  } else {
    // Loading case: keep the fetch pending so the app renders the title
    // strip above the loading body (the real network 404 would flip the
    // route into the forbidden state).
    await page.route("**/api/v1/site/mail", () => new Promise<void>(() => {}));
  }
  await page.goto(`${basePath}/sites/mail${search}`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("Style site mail title strip", () => {
  test("reuses canonical frozen title globals through the stable owner", async () => {
    const [route, _theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-owner="site-mail-title-strip"');
  });

  test("keeps the legacy heading first across loading, error, success, not-configured, and default bodies", async ({
    page,
  }) => {
    const cases: Array<{
      body: RegExp;
      response?: MailResponse;
      search?: string;
      secondTag: "DIV" | "FORM" | "P";
    }> = [
      { body: /Loading/u, secondTag: "P" },
      {
        body: /Failed to send mail/u,
        response: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
        search: "?errorMessage=validation.invalidEmail",
        secondTag: "DIV",
      },
      {
        body: /Mail has been sent/u,
        response: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
        search: "?sended=true",
        secondTag: "DIV",
      },
      {
        body: /Mailer has not been configured/u,
        response: {
          notConfiguredItems: ["smtp.host"],
          sender: "site-admin@yona.local",
          sent: false,
        },
        secondTag: "DIV",
      },
      {
        body: /mailForm/u,
        response: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
        secondTag: "FORM",
      },
    ];

    for (const entry of cases) {
      const owner = await openMail(page, entry.response, entry.search);
      await expect(page.locator(ownerSelector)).toHaveCount(1);
      await expect(owner).toHaveClass(/(?:^|\s)title_area(?:\s|$)/u);
      await expect(owner.locator(":scope > h2.pull-left")).toHaveText("Send email");
      expect(
        await page
          .locator(".site-setting-wrap .span10 > *")
          .evaluateAll((nodes) => nodes.slice(0, 2).map((node) => node.tagName)),
      ).toEqual(["DIV", entry.secondTag]);
      await expect(owner.locator("p, form, input, textarea, button, .alert")).toHaveCount(0);
      if (entry.body.source === "mailForm") {
        await expect(page.locator("#mailForm")).toBeVisible();
      } else {
        await expect(page.getByText(entry.body).first()).toBeVisible();
      }
    }
  });

  test("matches desktop and mobile title geometry and paint", async ({ page }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const owner = await openMail(page, {
        notConfiguredItems: [],
        sender: "site-admin@yona.local",
        sent: false,
      });
      const heading = owner.locator("h2.pull-left");

      await expect(owner).toHaveCSS("overflow", "hidden");
      await expect(owner).toHaveCSS("margin-bottom", "29px");
      await expect(owner).toHaveCSS("padding-bottom", "8px");
      await expect(owner).toHaveCSS("border-bottom-color", "rgb(221, 221, 221)");
      await expect(heading).toHaveCSS("color", "rgb(76, 76, 76)");
      await expect(heading).toHaveCSS("font-size", "19.5px");
      await expect(heading).toHaveCSS("line-height", "30px");
      const boxes = await page.evaluate((selector) => {
        const owner = document.querySelector<HTMLElement>(selector);
        const heading = owner?.querySelector<HTMLElement>("h2.pull-left");
        const content = owner?.parentElement;
        if (!owner || !heading || !content) return null;
        return {
          content: content.getBoundingClientRect().toJSON(),
          heading: heading.getBoundingClientRect().toJSON(),
          owner: owner.getBoundingClientRect().toJSON(),
        };
      }, ownerSelector);
      expect(boxes).not.toBeNull();
      expect(boxes!.owner.left).toBeGreaterThanOrEqual(boxes!.content.left);
      expect(boxes!.owner.right).toBeLessThanOrEqual(boxes!.content.right + 1);
      expect(boxes!.heading.top).toBeGreaterThanOrEqual(boxes!.owner.top);
      expect(boxes!.heading.bottom).toBeLessThanOrEqual(boxes!.owner.bottom);
    }
  });
});
