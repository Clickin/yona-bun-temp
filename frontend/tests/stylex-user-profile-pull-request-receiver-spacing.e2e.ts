import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isGuest: false, loginId: "viewer" },
    }),
  );
  await page.route("**/api/v1/users/admin/profile**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        daysAgo: 14,
        selected: "pullRequests",
        viewerCanEditProfile: false,
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Admin User",
          englishName: "Admin",
          isBlocked: false,
          isGuest: false,
          isSiteAdmin: false,
          loginId: "admin",
          primaryEmailAddress: null,
          sinceLabel: "2026-06-30",
        },
        issueItems: [],
        memberProjects: [],
        pullRequestItems: [
          {
            ownerName: "admin",
            projectName: "sample",
            pullRequestNumber: 12,
            title: "Conflict pull request",
            state: "open",
            conflict: true,
            projectLogoUrl: "/assets/images/sample-logo.png",
            contributorLoginId: "contributor",
            contributorLabel: "Contributor User",
            updatedLabel: "2 days ago",
            commentCount: 3,
            receiverLoginId: "receiver",
            receiverLabel: "Receiver User",
            receiverAvatarUrl: "/assets/images/receiver.png",
          },
          {
            ownerName: "admin",
            projectName: "sample",
            pullRequestNumber: 13,
            title: "Open pull request",
            state: "open",
            conflict: false,
            contributorLoginId: "",
            contributorLabel: "",
            updatedLabel: "Yesterday",
            commentCount: 0,
            receiverLoginId: "",
            receiverLabel: "",
          },
        ],
      },
    }),
  );
});

test("authenticated public profile owns pull-request receiver spacing shell", async ({ page }) => {
  const [
    routeSource,
    styleSource,
    viewScala,
    partial,
    commonLess,
    pageLess,
    responsiveLess,
    bootstrapCss,
    yobiLess,
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
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(viewScala).toContain("@partial_pullRequests(pull, pull.toProject)");
  expect(partial).toContain('<div class="mt5 pull-right">');
  expect(partial).toContain('class="avatar-wrap assinee"');
  expect(commonLess).toContain(".mt5 { margin-top:5px; }");
  expect(pageLess).toContain(".avatar-wrap {");
  expect(pageLess).toContain("margin-right:10px;");
  expect(pageLess).toContain("float: left;");
  expect(pageLess).toContain("&.assinee {");
  expect(pageLess).toContain("margin-right:0;");
  expect(responsiveLess).toContain("padding: 10px 0 !important;");
  expect(bootstrapCss).toContain(".pull-right");
  expect(yobiLess).toContain('@import "less/_common.less";');
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(messages).toContain("pullRequest.state.open");

  expect(routeSource).toContain('data-stylex-owner="user-profile-pull-request-receiver-rail"');
  expect(routeSource).toContain(
    'data-stylex-owner="user-profile-pull-request-receiver-avatar-link"',
  );
  expect(styleSource).toContain('pullRequestReceiverRail: { float: "right", marginTop: "5px" }');
  expect(styleSource).toContain('pullRequestReceiverAvatarLink: { marginRight: "0px" }');

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "domcontentloaded" });

  const rows = page.locator('[data-stylex-owner="user-profile-pull-request-row"]');
  await expect(rows).toHaveCount(2);

  const receiverLink = rows
    .nth(0)
    .locator('[data-stylex-owner="user-profile-pull-request-receiver-avatar-link"]');
  const receiverRail = rows
    .nth(0)
    .locator('[data-stylex-owner="user-profile-pull-request-receiver-rail"]');
  const emptyAvatar = rows
    .nth(1)
    .locator('[data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"]');

  await expect(receiverLink).toHaveClass(/avatar-wrap assinee/);
  await expect(emptyAvatar).toHaveClass(/empty-avatar-wrap/);

  const desktop = await rows.evaluateAll((nodes) =>
    nodes.map((node) => {
      const row = node as HTMLElement;
      const rail = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-receiver-rail"]',
      );
      const link = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-receiver-avatar-link"]',
      );
      const empty = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"]',
      );
      if (!rail) throw new Error("missing receiver rail");
      const rowBox = row.getBoundingClientRect();
      const railBox = rail.getBoundingClientRect();
      return {
        railFloat: getComputedStyle(rail).float,
        railMarginTop: getComputedStyle(rail).marginTop,
        linkMarginRight: link ? getComputedStyle(link).marginRight : null,
        emptyWidth: empty ? getComputedStyle(empty).width : null,
        emptyHeight: empty ? getComputedStyle(empty).height : null,
        contained:
          railBox.left >= rowBox.left - 1 &&
          railBox.right <= rowBox.right + 1 &&
          railBox.top >= rowBox.top - 1,
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    }),
  );

  expect(desktop).toEqual([
    {
      railFloat: "right",
      railMarginTop: "5px",
      linkMarginRight: "0px",
      emptyWidth: null,
      emptyHeight: null,
      contained: true,
      noOverflow: true,
    },
    {
      railFloat: "right",
      railMarginTop: "5px",
      linkMarginRight: null,
      emptyWidth: "32px",
      emptyHeight: "32px",
      contained: true,
      noOverflow: true,
    },
  ]);

  for (const locator of [receiverRail, receiverLink, emptyAvatar]) {
    await expect(locator).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-action",
      "data-href",
      "data-url",
      "data-target",
      "data-original-title",
    ]) {
      await expect(locator).not.toHaveAttribute(attribute);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await rows.evaluateAll((nodes) =>
    nodes.map((node) => {
      const row = node as HTMLElement;
      const rail = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-receiver-rail"]',
      );
      const link = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-receiver-avatar-link"]',
      );
      if (!rail) throw new Error("missing receiver rail");
      const rowBox = row.getBoundingClientRect();
      const railBox = rail.getBoundingClientRect();
      return {
        railMarginTop: getComputedStyle(rail).marginTop,
        linkMarginRight: link ? getComputedStyle(link).marginRight : null,
        contained:
          railBox.left >= rowBox.left - 1 &&
          railBox.right <= rowBox.right + 1 &&
          document.documentElement.scrollWidth <= window.innerWidth,
      };
    }),
  );

  expect(mobile).toEqual([
    { railMarginTop: "5px", linkMarginRight: "0px", contained: true },
    { railMarginTop: "5px", linkMarginRight: null, contained: true },
  ]);
});
