import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

const pullRequestItems = [
  {
    ownerName: "admin",
    projectName: "sample",
    pullRequestNumber: 21,
    title: "Open pull request",
    state: "open",
    conflict: false,
    projectLogoUrl: "/assets/images/sample-logo.png",
    contributorLoginId: "contributor",
    contributorLabel: "Contributor User",
    updatedLabel: "Today",
    commentCount: 1,
    receiverLoginId: "receiver",
    receiverLabel: "Receiver User",
    receiverAvatarUrl: "/assets/images/receiver.png",
  },
  {
    ownerName: "admin",
    projectName: "sample",
    pullRequestNumber: 22,
    title: "Closed pull request",
    state: "closed",
    conflict: false,
    contributorLoginId: "contributor",
    contributorLabel: "Contributor User",
    updatedLabel: "Yesterday",
    commentCount: 0,
    receiverLoginId: "",
    receiverLabel: "",
  },
  {
    ownerName: "admin",
    projectName: "sample",
    pullRequestNumber: 23,
    title: "Merged pull request",
    state: "merged",
    conflict: false,
    contributorLoginId: "contributor",
    contributorLabel: "Contributor User",
    updatedLabel: "2 days ago",
    commentCount: 0,
    receiverLoginId: "",
    receiverLabel: "",
  },
  {
    ownerName: "admin",
    projectName: "sample",
    pullRequestNumber: 24,
    title: "Rejected pull request",
    state: "rejected",
    conflict: false,
    contributorLoginId: "contributor",
    contributorLabel: "Contributor User",
    updatedLabel: "3 days ago",
    commentCount: 0,
    receiverLoginId: "",
    receiverLabel: "",
  },
  {
    ownerName: "admin",
    projectName: "sample",
    pullRequestNumber: 25,
    title: "Conflict pull request",
    state: "open",
    conflict: true,
    contributorLoginId: "contributor",
    contributorLabel: "Contributor User",
    updatedLabel: "4 days ago",
    commentCount: 0,
    receiverLoginId: "",
    receiverLabel: "",
  },
];

test.beforeEach(async ({ page }) => {
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
        pullRequestItems,
      },
    }),
  );
});

test("authenticated populated profile owns pull-request state and empty-avatar classes", async ({
  page,
}) => {
  const [
    routeSource,
    styleSource,
    viewScala,
    partialScala,
    yobiLess,
    variablesLess,
    pageLess,
    commonLess,
    yobiUiLess,
    responsiveLess,
    bootstrapCss,
    bootstrapResponsiveCss,
    yobiconCss,
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
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_variables.less", import.meta.url),
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
      new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
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
      new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(viewScala).toContain('<div id="pullRequests" class="tab-pane');
  expect(viewScala).toContain("@partial_pullRequests(pull, pull.toProject)");
  expect(partialScala).toContain('<div class="empty-avatar-wrap">&nbsp;</div>');
  expect(partialScala).toContain(
    '<div class="state @if(req.isConflict == true) {conflict} else { @req.state.toString.toLowerCase} pull-right">',
  );
  expect(partialScala).toContain(
    '@if(req.isConflict == true) {@Messages("pullRequest.state.conflict")} else {@Messages("pullRequest.state." + req.state.toString.toLowerCase)}',
  );
  for (const importPath of [
    "less/_variables.less",
    "less/_mixins.less",
    "less/_common.less",
    "less/_sprites.less",
    "less/_page.less",
    "less/_tippy.less",
    "less/_scrollbar.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_temporary.less",
    "less/_markdown.less",
    "less/_migration.less",
    "less/_override.less",
  ]) {
    expect(yobiLess).toContain(`@import "${importPath}";`);
  }
  for (const declaration of [
    "@state-open: #b6da54;",
    "@state-closed: #fd6956;",
    "@state-rejected: #fd8658;",
    "@state-merged: #65c9df;",
  ]) {
    expect(variablesLess).toContain(declaration);
  }
  for (const declaration of [
    ".state {",
    "margin-right:16px;",
    "margin-top:7px;",
    "font-weight:bold;",
    "color:#FFF;",
    "padding:5px 12px;",
    ".border-radius(15px);",
    "&.merged { background-color: @state-merged;}",
    "&.open { background-color: @state-open; }",
    "&.closed { background-color : @state-closed;}",
    "&.rejected { background-color : @state-rejected;}",
    "&.conflict {background: #C0392B;}",
    ".empty-avatar-wrap {",
    "width:32px;",
    "height:32px;",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(commonLess).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
  expect(yobiUiLess).toContain("font-size:13px;");
  expect(responsiveLess).toContain("padding: 10px 0 !important;");
  expect(bootstrapCss).toContain(".pull-right {\n  float: right;");
  expect(bootstrapCss).toContain(".row-fluid .span2");
  expect(bootstrapResponsiveCss).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsiveCss).toContain("float: none;");
  expect(yobiconCss).toContain('[class^="yobicon-"],');
  expect(yobiconCss).toContain(".yobicon-comments:before");
  for (const message of [
    "pullRequest.state.open = Open",
    "pullRequest.state.closed = Closed",
    "pullRequest.state.merged = Merged",
    "pullRequest.state.conflict = Conflict",
  ]) {
    expect(messages).toContain(message);
  }
  expect(messages).not.toContain("pullRequest.state.rejected =");

  const rowSource = routeSource.slice(
    routeSource.indexOf("function ProfilePullRequestRow"),
    routeSource.indexOf("function ProfileProjectRow"),
  );
  expect(rowSource).toContain('data-stylex-owner="user-profile-pull-request-state"');
  expect(rowSource).toContain('data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"');
  expect(rowSource).toContain("{t(`pullRequest.state.${displayState}`)}");
  expect(rowSource).not.toContain(
    "className={`${pullRequestStateStyle.className} state ${displayState}`}",
  );
  expect(rowSource).not.toContain(
    "className={`${stylex.props(styles.pullRequestEmptyAvatarWrap).className} empty-avatar-wrap`}",
  );
  for (const declaration of [
    "pullRequestState: {",
    'borderRadius: "15px"',
    'color: "#FFF"',
    'float: "right"',
    'fontWeight: "bold"',
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
  await page.goto(`${basePath}/admin?selected=pullRequests`, {
    waitUntil: "domcontentloaded",
  });

  const rows = page.locator('[data-stylex-owner="user-profile-pull-request-row"]');
  const states = rows.locator('[data-stylex-owner="user-profile-pull-request-state"]');
  const emptyAvatars = rows.locator(
    '[data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"]',
  );
  await expect(rows).toHaveCount(5);
  await expect(states).toHaveCount(5);
  await expect(emptyAvatars).toHaveCount(4);
  await expect(states).toHaveText([
    "Open",
    "Closed",
    "Merged",
    "pullRequest.state.rejected",
    "Conflict",
  ]);

  const retiredStateClasses = /\b(?:state|open|closed|rejected|merged|conflict)\b/u;
  for (const state of await states.all()) {
    await expect(state).not.toHaveClass(retiredStateClasses);
  }
  for (const emptyAvatar of await emptyAvatars.all()) {
    await expect(emptyAvatar).not.toHaveClass(/\bempty-avatar-wrap\b/u);
  }

  const expectedBackgrounds = [
    "rgb(182, 218, 84)",
    "rgb(253, 105, 86)",
    "rgb(101, 201, 223)",
    "rgb(253, 134, 88)",
    "rgb(192, 57, 43)",
  ];
  const measure = async () =>
    rows.evaluateAll((nodes) =>
      nodes.map((node) => {
        const row = node as HTMLElement;
        const column = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-pull-request-receiver-column"]',
        );
        const rail = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-pull-request-receiver-rail"]',
        );
        const state = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-pull-request-state"]',
        );
        const emptyAvatar = row.querySelector<HTMLElement>(
          '[data-stylex-owner="user-profile-pull-request-empty-avatar-wrap"]',
        );
        if (!column || !rail || !state) throw new Error("missing pull-request state owners");
        const rowBox = row.getBoundingClientRect();
        const stateBox = state.getBoundingClientRect();
        const emptyBox = emptyAvatar?.getBoundingClientRect();
        const stateStyle = getComputedStyle(state);
        const emptyStyle = emptyAvatar ? getComputedStyle(emptyAvatar) : null;
        return {
          text: state.textContent?.trim(),
          childOrder: Array.from(column.children).map((child) =>
            child.getAttribute("data-stylex-owner"),
          ),
          float: stateStyle.float,
          marginRight: stateStyle.marginRight,
          marginTop: stateStyle.marginTop,
          fontWeight: stateStyle.fontWeight,
          color: stateStyle.color,
          padding: stateStyle.padding,
          borderRadius: stateStyle.borderRadius,
          backgroundColor: stateStyle.backgroundColor,
          emptyText: emptyAvatar?.textContent ?? null,
          emptyWidth: emptyStyle?.width ?? null,
          emptyHeight: emptyStyle?.height ?? null,
          stateHasVisibleBox: stateBox.width > 0 && stateBox.height > 0,
          emptyContained:
            !emptyBox ||
            (emptyBox.left >= rowBox.left - 1 &&
              emptyBox.right <= rowBox.right + 1 &&
              emptyBox.top >= rowBox.top - 1 &&
              emptyBox.bottom <= rowBox.bottom + 1),
          noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        };
      }),
    );

  const desktop = await measure();
  expect(desktop.map(({ text }) => text)).toEqual([
    "Open",
    "Closed",
    "Merged",
    "pullRequest.state.rejected",
    "Conflict",
  ]);
  expect(desktop.map(({ backgroundColor }) => backgroundColor)).toEqual(expectedBackgrounds);
  for (const [index, row] of desktop.entries()) {
    expect(row.childOrder).toEqual([
      "user-profile-pull-request-receiver-rail",
      "user-profile-pull-request-state",
    ]);
    expect(row).toMatchObject({
      float: "right",
      marginRight: "16px",
      marginTop: "7px",
      fontWeight: "700",
      color: "rgb(255, 255, 255)",
      padding: "5px 12px",
      borderRadius: "15px",
      backgroundColor: expectedBackgrounds[index],
      stateHasVisibleBox: true,
      emptyContained: true,
      noOverflow: true,
    });
    if (index === 0) {
      expect(row.emptyText).toBeNull();
      expect(row.emptyWidth).toBeNull();
      expect(row.emptyHeight).toBeNull();
    } else {
      expect(row.emptyText).toBe("\u00a0");
      expect(row.emptyWidth).toBe("32px");
      expect(row.emptyHeight).toBe("32px");
    }
  }

  for (const locator of [...(await states.all()), ...(await emptyAvatars.all())]) {
    await expect(locator).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-action",
      "data-href",
      "data-url",
      "data-target",
      "data-trigger",
      "data-original-title",
    ]) {
      await expect(locator).not.toHaveAttribute(attribute);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await measure();
  expect(mobile.map(({ backgroundColor }) => backgroundColor)).toEqual(expectedBackgrounds);
  for (const [index, row] of mobile.entries()) {
    expect(row).toMatchObject({
      backgroundColor: expectedBackgrounds[index],
      stateHasVisibleBox: true,
      emptyContained: true,
      noOverflow: true,
    });
    if (index > 0) {
      expect(row.emptyWidth).toBe("32px");
      expect(row.emptyHeight).toBe("32px");
    }
  }
});
