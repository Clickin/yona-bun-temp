import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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

test("authenticated public profile owns pull-request state badge shell and empty avatar shell", async ({
  page,
}) => {
  const [
    routeSource,
    styleSource,
    viewScala,
    partial,
    pageLess,
    variablesLess,
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
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
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
  expect(partial).toContain('<div class="empty-avatar-wrap">&nbsp;</div>');
  expect(partial).toContain('class="state @if(req.isConflict == true) {conflict}');
  for (const declaration of [
    "margin-right:16px;",
    "margin-top:7px;",
    "font-weight:bold;",
    "color:#FFF;",
    "padding:5px 12px;",
    ".border-radius(15px);",
    "&.open { background-color: @state-open; }",
    "&.closed { background-color : @state-closed;}",
    "&.rejected { background-color : @state-rejected;}",
    "&.merged { background-color: @state-merged;}",
    "&.conflict {background: #C0392B;}",
    ".empty-avatar-wrap {",
    "width:32px;",
    "height:32px;",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  for (const declaration of [
    "@state-open: #b6da54;",
    "@state-closed: #fd6956;",
    "@state-rejected: #fd8658;",
    "@state-merged: #65c9df;",
  ]) {
    expect(variablesLess).toContain(declaration);
  }
  expect(responsiveLess).toContain("padding: 10px 0 !important;");
  expect(bootstrapCss).toContain(".pull-right");
  expect(yobiLess).toContain('@import "less/_page.less";');
  for (const messageKey of ["pullRequest.state.conflict", "pullRequest.state.open"]) {
    expect(messages).toContain(messageKey);
  }

  expect(routeSource).toContain('data-stylex-owner="user-profile-pull-request-state"');
  expect(routeSource).toContain('data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"');
  for (const declaration of [
    'borderRadius: "15px"',
    'marginRight: "16px"',
    'marginTop: "7px"',
    'padding: "5px 12px"',
    'pullRequestStateOpen: { backgroundColor: "#b6da54" }',
    'pullRequestStateClosed: { backgroundColor: "#fd6956" }',
    'pullRequestStateRejected: { backgroundColor: "#fd8658" }',
    'pullRequestStateMerged: { backgroundColor: "#65c9df" }',
    'pullRequestStateConflict: { backgroundColor: "#c0392b" }',
    'pullRequestEmptyAvatarWrap: { height: "32px", width: "32px" }',
  ]) {
    expect(styleSource).toContain(declaration);
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "domcontentloaded" });

  const rows = page.locator('[data-stylex-owner="user-profile-pull-request-row"]');
  await expect(rows).toHaveCount(2);

  const conflictState = rows
    .nth(0)
    .locator('[data-stylex-owner="user-profile-pull-request-state"]');
  const openState = rows.nth(1).locator('[data-stylex-owner="user-profile-pull-request-state"]');
  const emptyAvatar = rows
    .nth(1)
    .locator('[data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"]');

  await expect(conflictState).toHaveText("Conflict");
  await expect(openState).toHaveText("Open");
  // Wave-33: the app retains the legacy state/conflict/empty-avatar-wrap classes
  // (667398a04 legacy-parity restore) — assert retention instead of absence.
  await expect(conflictState).toHaveClass(/\bstate\b/u);
  await expect(conflictState).toHaveClass(/\bconflict\b/u);
  await expect(openState).toHaveClass(/\bstate\b/u);
  await expect(openState).toHaveClass(/\bopen\b/u);
  await expect(emptyAvatar).toHaveClass(/\bempty-avatar-wrap\b/u);

  const desktop = await rows.evaluateAll((nodes) =>
    nodes.map((node) => {
      const row = node as HTMLElement;
      const state = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-state"]',
      );
      const receiverRail = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-receiver-rail"]',
      );
      const empty = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"]',
      );
      if (!state || !receiverRail) throw new Error("missing pull request state shell");
      const rowBox = row.getBoundingClientRect();
      const stateBox = state.getBoundingClientRect();
      return {
        text: state.textContent?.trim(),
        float: getComputedStyle(state).float,
        marginRight: getComputedStyle(state).marginRight,
        marginTop: getComputedStyle(state).marginTop,
        fontWeight: getComputedStyle(state).fontWeight,
        color: getComputedStyle(state).color,
        padding: getComputedStyle(state).padding,
        borderRadius: getComputedStyle(state).borderRadius,
        backgroundColor: getComputedStyle(state).backgroundColor,
        receiverFloat: getComputedStyle(receiverRail).float,
        emptyWidth: empty ? getComputedStyle(empty).width : null,
        emptyHeight: empty ? getComputedStyle(empty).height : null,
        contained:
          stateBox.left >= rowBox.left - 1 &&
          stateBox.right <= rowBox.right + 1 &&
          stateBox.top >= rowBox.top - 1,
        noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    }),
  );

  expect(desktop).toEqual([
    {
      text: "Conflict",
      float: "right",
      marginRight: "16px",
      marginTop: "7px",
      fontWeight: "700",
      color: "rgb(255, 255, 255)",
      padding: "5px 12px",
      borderRadius: "15px",
      backgroundColor: "rgb(192, 57, 43)",
      receiverFloat: "right",
      emptyWidth: null,
      emptyHeight: null,
      contained: true,
      noOverflow: true,
    },
    {
      text: "Open",
      float: "right",
      marginRight: "16px",
      marginTop: "7px",
      fontWeight: "700",
      color: "rgb(255, 255, 255)",
      padding: "5px 12px",
      borderRadius: "15px",
      backgroundColor: "rgb(182, 218, 84)",
      receiverFloat: "right",
      emptyWidth: "32px",
      emptyHeight: "32px",
      contained: true,
      noOverflow: true,
    },
  ]);

  for (const locator of [conflictState, openState, emptyAvatar]) {
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
      const state = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-state"]',
      );
      const empty = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"]',
      );
      if (!state) throw new Error("missing pull request state shell");
      const rowBox = row.getBoundingClientRect();
      const stateBox = state.getBoundingClientRect();
      return {
        rowPadding: getComputedStyle(row).padding,
        backgroundColor: getComputedStyle(state).backgroundColor,
        emptyWidth: empty ? getComputedStyle(empty).width : null,
        emptyHeight: empty ? getComputedStyle(empty).height : null,
        contained:
          stateBox.left >= rowBox.left - 1 &&
          stateBox.right <= rowBox.right + 1 &&
          document.documentElement.scrollWidth <= window.innerWidth,
      };
    }),
  );

  expect(mobile).toEqual([
    {
      rowPadding: "10px 0px",
      backgroundColor: "rgb(192, 57, 43)",
      emptyWidth: null,
      emptyHeight: null,
      contained: true,
    },
    {
      rowPadding: "10px 0px",
      backgroundColor: "rgb(182, 218, 84)",
      emptyWidth: "32px",
      emptyHeight: "32px",
      contained: true,
    },
  ]);
});
