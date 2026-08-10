import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/webhooks.tsx", import.meta.url),
  "utf8",
);
const styleSource =
  readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
  readFileSync(
    new URL("../frontend/public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
    "utf8",
  );
const legacyPartialSource = readFileSync(
  new URL(
    "../../yona-original/app/views/project/partial_webhooks_list.scala.html",
    import.meta.url,
  ),
  "utf8",
);
const legacyTemplateSource = readFileSync(
  new URL("../../yona-original/app/views/project/webhooks.scala.html", import.meta.url),
  "utf8",
);
const legacyCommonLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const legacyPageLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("project webhook payload heading keeps the legacy mr20 source and Style owner", () => {
  // Legacy Scala HTML/JS is output DOM/UX evidence; behavior stays React-owned.
  expect(legacyPartialSource).toContain('<h6 class="mr20 truncate">');
  expect(legacyTemplateSource).toContain('class="webhook-list-wrap"');
  expect(legacyCommonLessSource).toContain(".mr20 { margin-right:20px; }");
  expect(legacyPageLessSource).toContain("padding-left: 8px");
  expect(legacyPageLessSource).toContain("white-space: nowrap;");
  expect(legacyPageLessSource).toContain("overflow: hidden;");
  expect(legacyPageLessSource).toContain("text-overflow: ellipsis;");

  expect(routeSource).toContain('data-owner="project-webhooks-list-item-heading"');
  expect(routeSource.match(/data-owner="project-webhooks-list-item-heading"/g) ?? []).toHaveLength(
    3,
  );
});

const viewports = [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
] as const;

for (const viewport of viewports) {
  test(`project webhook payload heading preserves mr20/truncate at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await mockProjectWebhooks(page);
    await page.goto(`${basePath}/admin/sample/webhooks`);

    const headings = page.locator('[data-owner="project-webhooks-list-item-heading"]');
    await expect(headings).toHaveCount(6);
    const payloadHeading = page
      .locator("#webhooksList .list-item")
      .first()
      .locator('[data-owner="project-webhooks-list-item-heading"]')
      .first();
    await expect(payloadHeading).toHaveClass(/\bmr20\b/u);
    await expect(payloadHeading).toHaveClass(/\btruncate\b/u);
    await expect(payloadHeading).toHaveText(
      "https://hooks.example.test/yona/this-is-a-long-payload-path-used-to-prove-truncation",
    );
    await expect(payloadHeading).toHaveCSS("margin-right", "20px");
    await expect(payloadHeading).toHaveCSS("padding-left", "8px");
    await expect(payloadHeading).toHaveCSS("text-overflow", "ellipsis");
    await expect(payloadHeading).toHaveCSS("overflow", "hidden");
    await expect(payloadHeading).toHaveCSS("white-space", "nowrap");

    const diagnostic = await payloadHeading.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        marginRight: style.marginRight,
        paddingLeft: style.paddingLeft,
        rectWidth: rect.width,
        textOverflow: style.textOverflow,
        overflow: style.overflow,
        whiteSpace: style.whiteSpace,
      };
    });
    expect(diagnostic.marginRight).toBe("20px");
    expect(diagnostic.paddingLeft).toBe("8px");
    expect(diagnostic.textOverflow).toBe("ellipsis");
    expect(diagnostic.overflow).toBe("hidden");
    expect(diagnostic.whiteSpace).toBe("nowrap");

    const screenshotMode =
      process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
    const screenshotDirectory = resolve(
      "output/playwright/style-project-webhooks-list-item-mr20",
      screenshotMode,
    );
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  });
}

async function mockProjectWebhooks(page: Page) {
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
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-webhooks" },
      body: JSON.stringify({
        isAuthenticated: true,
        user: {
          avatarUrl: "/assets/images/default-avatar-32.png",
          loginId: "admin",
          name: "Site Admin",
        },
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/container**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
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
      }),
    });
  });
  await page.route("**/api/v1/owners/admin/projects/sample/webhooks", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        deliveries: [],
        ownerName: "admin",
        projectName: "sample",
        viewerCanUpdate: true,
        webhookTypes: ["SIMPLE", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT", "JSON"],
        webhooks: [
          {
            gitPush: true,
            id: 11,
            payloadUrl:
              "https://hooks.example.test/yona/this-is-a-long-payload-path-used-to-prove-truncation",
            secret: "",
            webhookType: "SIMPLE",
          },
          {
            gitPush: false,
            id: 12,
            payloadUrl: "https://hooks.example.test/yona/slack",
            secret: "secret-token",
            webhookType: "DETAIL_SLACK",
          },
        ],
      }),
    });
  });
}
