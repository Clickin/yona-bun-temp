import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("populated public profile pull-request row owns receiver and state floats", async ({
  page,
}) => {
  const [
    source,
    styleSource,
    legacyView,
    legacyPartial,
    pageLess,
    commonLess,
    responsiveLess,
    yobiLess,
    bootstrap,
    bootstrapResponsive,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/-user-profile.stylex.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../../yona-original/app/views/user/view.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../../yona-original/app/views/user/partial_pullRequests.scala.html",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(legacyView).toContain("partial_pullRequests");
  expect(legacyPartial).toContain('<div class="mt5 pull-right">');
  expect(legacyPartial).toContain('<div class="state @if(req.isConflict == true)');
  expect(legacyPartial).toContain('class="empty-avatar-wrap"');
  expect(pageLess).toContain(".post-item");
  expect(pageLess).toContain(".state {");
  expect(pageLess).toContain(".empty-avatar-wrap {");
  expect(commonLess).toContain(".mr10");
  expect(responsiveLess).toContain("@media");
  expect(yobiLess).toContain('@import "less/_common.less";');
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(bootstrapResponsive).toContain("@media");
  expect(messages).toContain("pullRequest.state.open");

  expect(source).toContain('data-stylex-owner="user-profile-pull-request-receiver-rail"');
  expect(source).toContain('data-stylex-owner="user-profile-pull-request-state"');
  expect(source).not.toContain("mt5 pull-right");
  expect(source).not.toContain("state ${state} pull-right");
  expect(styleSource).toContain('pullRequestReceiverRail: { float: "right" }');
  expect(styleSource).toContain('pullRequestState: { float: "right" }');

  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/door/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "issues",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door User",
          englishName: "Door",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "2026-01-01",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [
          {
            commentCount: 1,
            contributorLabel: "Contributor",
            contributorLoginId: "contributor",
            ownerName: "door",
            projectName: "sample",
            projectLogoUrl: "/assets/images/project_default_logo.png",
            pullRequestNumber: 12,
            receiverAvatarUrl: "/assets/images/default-avatar-32.png",
            receiverLabel: "Receiver User",
            receiverLoginId: "receiver",
            state: "open",
            title: "Profile pull request",
            updatedLabel: "today",
          },
        ],
      },
    }),
  );

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/door`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Pull request/i }).click();

  const row = page.locator("#pullRequests > ul > li.post-item");
  const receiver = page.locator('[data-stylex-owner="user-profile-pull-request-receiver-rail"]');
  const state = page.locator('[data-stylex-owner="user-profile-pull-request-state"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Profile pull request");
  await expect(receiver).toHaveCount(1);
  await expect(receiver.locator('a.avatar-wrap.assinee img[alt="Receiver User"]')).toHaveCount(1);
  await expect(state).toHaveText("Open");
  await expect(state).toHaveClass(/state open/u);
  await expect(receiver).not.toHaveClass(/pull-right/u);
  await expect(state).not.toHaveClass(/pull-right/u);
  await expect(receiver).not.toHaveAttribute("data-toggle");
  await expect(receiver).not.toHaveAttribute("data-placement");
  await expect(state).not.toHaveAttribute("data-toggle");
  await expect(state).not.toHaveAttribute("data-placement");

  for (const locator of [receiver, state]) {
    await expect(locator).toHaveCSS("float", "right");
    const geometry = await locator.evaluate((node) => {
      const rowBox = node.closest("li.post-item")?.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      const computed = getComputedStyle(node);
      return {
        hasInlineStyle: node.hasAttribute("style"),
        float: computed.float,
        left: box.left,
        right: box.right,
        rowLeft: rowBox?.left ?? -1,
        rowRight: rowBox?.right ?? -1,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry.hasInlineStyle).toBe(false);
    expect(geometry.float).toBe("right");
    expect(geometry.left).toBeGreaterThanOrEqual(geometry.rowLeft);
    expect(geometry.right).toBeLessThanOrEqual(geometry.rowRight + 1);
    expect(geometry.documentWidth).toBe(geometry.viewportWidth);
  }

  const order = await row
    .locator(".span2")
    .evaluate((node) => Array.from(node.children).map((child) => child.className));
  expect(order).toEqual([expect.stringContaining("mt5"), expect.stringContaining("state")]);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const locator of [receiver, state]) {
    const mobileGeometry = await locator.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const span2 = node.closest(".span2")?.getBoundingClientRect();
      return {
        right: box.right,
        span2Right: span2?.right ?? -1,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(mobileGeometry.documentWidth).toBe(mobileGeometry.viewportWidth);
    expect(mobileGeometry.right).toBeLessThanOrEqual(mobileGeometry.span2Right + 1);
  }
});
