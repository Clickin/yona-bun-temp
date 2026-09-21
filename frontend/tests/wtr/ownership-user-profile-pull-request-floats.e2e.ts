import { readFile, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("populated public profile pull-request row owns receiver and state floats", async ({
  page,
}) => {
  const [
    source,
    _styleSource,
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
    Promise.resolve(curatedAppCss()),
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
  expect(legacyPartial).toContain('<div class="span2">');
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

  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrap).toContain("margin-left: 2.127659574468085%;");
  expect(bootstrap).toContain("box-sizing: border-box;");
  expect(bootstrap).toContain(".row-fluid .span2");
  expect(bootstrap).toContain("width: 14.893617021276595%;");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsive).toContain("float: none;");
  expect(bootstrapResponsive).toContain("margin-left: 0;");
  expect(bootstrapResponsive).toContain("width: 100%;");
  expect(bootstrap).toContain(".pull-right {\n  float: right;");
  expect(bootstrapResponsive).toContain("@media");
  expect(messages).toContain("pullRequest.state.open");

  expect(source).toContain('data-owner="user-profile-pull-request-receiver-rail"');
  expect(source).toContain('data-owner="user-profile-pull-request-receiver-column"');
  expect(source).toContain('data-owner="user-profile-pull-request-state"');
  // 667398a04 legacy-parity restore: PR row retains mt5 pull-right, state ${displayState} pull-right and span2 (wave-33).
  expect(source).toContain("mt5 pull-right");

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

  const row = page.locator('[data-owner="user-profile-pull-request-row"]');
  const receiverColumn = page.locator('[data-owner="user-profile-pull-request-receiver-column"]');
  const receiver = page.locator('[data-owner="user-profile-pull-request-receiver-rail"]');
  const state = page.locator('[data-owner="user-profile-pull-request-state"]');
  await expect(row).toHaveCount(1);
  // 667398a04 legacy-parity restore: row retains post-item; receiver column retains span2 (wave-33).
  await expect(row).toHaveClass(/(?:^|\s)post-item(?:\s|$)/u);
  await expect(row.locator(".span2")).toHaveCount(1);
  await expect(row).toContainText("Profile pull request");
  await expect(receiverColumn).toHaveCount(1);
  await expect(receiver).toHaveCount(1);
  const receiverLink = receiver.locator(
    '[data-owner="user-profile-pull-request-receiver-avatar-link"]',
  );
  const receiverImage = receiver.locator(
    '[data-owner="user-profile-pull-request-receiver-avatar-image"]',
  );
  await expect(receiverLink).toHaveCount(1);
  await expect(receiverImage).toHaveCount(1);
  await expect(receiverImage).toHaveAttribute("alt", "Receiver User");
  await expect(receiverLink).toHaveClass(/(?:^|\s)(?:avatar-wrap|assinee)(?:\s|$)/u);
  await expect(state).toHaveText("Open");
  // 667398a04 legacy-parity restore: state retains `state open`; rail + state retain pull-right (wave-33).
  await expect(state).toHaveClass(/(?:^|\s)(?:state|open)(?:\s|$)/u);
  await expect(receiver).toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
  await expect(state).toHaveClass(/(?:^|\s)pull-right(?:\s|$)/u);
  await expect(receiver).not.toHaveAttribute("data-toggle");
  await expect(receiver).not.toHaveAttribute("data-placement");
  await expect(state).not.toHaveAttribute("data-toggle");
  await expect(state).not.toHaveAttribute("data-placement");
  await expect(receiverColumn).not.toHaveAttribute("data-toggle");
  await expect(receiverColumn).not.toHaveAttribute("data-placement");
  await expect(receiverLink).not.toHaveAttribute("data-toggle");
  await expect(receiverLink).not.toHaveAttribute("data-placement");

  await expect(receiverColumn).toHaveCSS("display", "block");
  await expect(receiverColumn).toHaveCSS("float", "left");
  await expect(receiverColumn).toHaveCSS("box-sizing", "border-box");

  for (const locator of [receiver, state]) {
    await expect(locator).toHaveCSS("float", "right");
    const geometry = await locator.evaluate((node) => {
      const rowBox = node
        .closest('[data-owner="user-profile-pull-request-row"]')
        ?.getBoundingClientRect();
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

  const order = await receiverColumn.evaluate((node) =>
    Array.from(node.children).map((child) => child.getAttribute("data-owner")),
  );
  expect(order).toEqual([
    "user-profile-pull-request-receiver-rail",
    "user-profile-pull-request-state",
  ]);

  await page.setViewportSize({ width: 767, height: 844 });
  await expect(receiverColumn).toHaveCSS("float", "none");
  await expect(receiverColumn).toHaveCSS("margin-left", "0px");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(receiverColumn).toHaveCSS("float", "none");
  await expect(receiverColumn).toHaveCSS("margin-left", "0px");
  const mobileColumnGeometry = await receiverColumn.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const parent = node.parentElement;
    if (!parent) return null;
    const parentStyle = getComputedStyle(parent);
    const parentContentWidth =
      parent.clientWidth -
      Number.parseFloat(parentStyle.paddingLeft) -
      Number.parseFloat(parentStyle.paddingRight);
    return {
      columnWidth: box.width,
      parentContentWidth,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
  expect(mobileColumnGeometry).not.toBeNull();
  expect(mobileColumnGeometry!.columnWidth).toBeCloseTo(
    mobileColumnGeometry!.parentContentWidth,
    3,
  );
  expect(mobileColumnGeometry!.documentWidth).toBe(mobileColumnGeometry!.viewportWidth);
  for (const locator of [receiver, state]) {
    const mobileGeometry = await locator.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const receiverColumn = node
        .closest('[data-owner="user-profile-pull-request-receiver-column"]')
        ?.getBoundingClientRect();
      return {
        right: box.right,
        receiverColumnRight: receiverColumn?.right ?? -1,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(mobileGeometry.documentWidth).toBe(mobileGeometry.viewportWidth);
    expect(mobileGeometry.right).toBeLessThanOrEqual(mobileGeometry.receiverColumnRight + 1);
  }
});
