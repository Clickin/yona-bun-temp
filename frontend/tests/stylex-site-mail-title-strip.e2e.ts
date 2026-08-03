import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ownerSelector = '[data-stylex-owner="site-mail-title-strip"]';
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-mail.stylex.ts", import.meta.url);

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
  }
  await page.goto(`${basePath}/sites/mail${search}`);
  const owner = page.locator(ownerSelector);
  await expect(owner).toBeVisible();
  return owner;
}

test.describe("StyleX site mail title strip", () => {
  test("reuses canonical frozen title globals through the stable owner", async () => {
    const [route, theme] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
    ]);

    expect(route).toContain('data-stylex-owner="site-mail-title-strip"');
    expect(route).toContain("styles.titleArea");
    expect(route).toContain("styles.title");
    expect(route).toContain("siteMailColors.titleBorder");
    expect(route).toContain("siteMailColors.titleText");
    expect(theme).toContain("titleBorder");
    expect(theme).toContain("titleText");
    expect(route).not.toContain("globalColors.");
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
      expect(
        await owner.evaluate((element) =>
          [...element.classList].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token)),
        ),
      ).toBe(true);
      await expect(owner.locator(":scope > h2.pull-left")).toHaveText("Send email");
      expect(
        await owner
          .locator(":scope > h2.pull-left")
          .evaluate((element) =>
            [...element.classList].some((token) => /^x[a-z0-9_-]{5,}$/iu.test(token)),
          ),
      ).toBe(true);
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

  test("isolates generated StyleX classes to explicit existing mail owners", async ({ page }) => {
    await openMail(
      page,
      { notConfiguredItems: ["smtp.host"], sender: "site-admin@yona.local", sent: true },
      "?errorMessage=validation.invalidEmail",
    );

    const generatedOwners = await page.evaluate(() =>
      [
        ...new Set(
          Array.from(document.querySelectorAll(".site-setting-wrap .span10 *"))
            .filter((element) =>
              Array.from(element.classList).some((token) => token.startsWith("x")),
            )
            .map((element) =>
              element.closest("[data-stylex-owner]")?.getAttribute("data-stylex-owner"),
            )
            .filter((owner): owner is string => owner !== null),
        ),
      ].sort(),
    );
    expect(generatedOwners).toEqual([
      "site-mail-error-alert",
      "site-mail-not-configured-alert",
      "site-mail-send-action",
      "site-mail-success-alert",
      "site-mail-title-strip",
    ]);
  });
});
