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

test("authenticated public profile owns populated pull-request row residuals", async ({ page }) => {
  const [
    source,
    styleSource,
    viewScala,
    partial,
    pageLess,
    common,
    responsive,
    bootstrap,
    bootstrapResponsive,
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
      new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
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
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(viewScala).toContain('<div id="pullRequests" class="tab-pane');
  expect(viewScala).toContain("@partial_pullRequests(pull, pull.toProject)");
  expect(partial).toContain('<li class="post-item">');
  expect(partial).toContain('<div class="span10">');
  expect(partial).toContain('<div class="title-wrap">');
  expect(partial).toContain('<span class="post-id">@req.number</span>');
  expect(partial).toContain('class="title @if(req.isConflict == true) {conflict}"');
  expect(partial).toContain('<div class="infos">');
  expect(partial).toContain('class="avatar-wrap assinee"');
  expect(partial).toContain('class="state @if(req.isConflict == true) {conflict}');
  expect(pageLess).toContain(".post-item {");
  for (const declaration of [
    "padding:10px;",
    "border-bottom:1px solid #ddd;",
    "display:block;",
    "overflow: auto;",
    "clear: both;",
    "margin-right:10px;",
    "line-height: 20px;",
    "font-size: 13px;",
    "font-size:15px;",
    "color: #b94a48;",
    "font-size:12px;",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(common).toContain(".mt5");
  expect(responsive).toContain(".post-item");
  expect(responsive).toContain("padding: 10px 0 !important;");
  expect(responsive).toContain(".hide-in-mobile");
  expect(bootstrap).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
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
  for (const messageKey of [
    "pullRequest.state.conflict",
    "pullRequest.state.open",
    "pullRequest.is.empty",
  ]) {
    expect(messages).toContain(messageKey);
  }
  for (const owner of [
    "user-profile-pull-request-row",
    "user-profile-pull-request-project-avatar-rail",
    "user-profile-pull-request-title-wrap",
    "user-profile-pull-request-post-id",
    "user-profile-pull-request-title-link",
    "user-profile-pull-request-infos",
    "user-profile-pull-request-receiver-rail",
    "user-profile-pull-request-state",
  ]) {
    expect(source).toContain(`data-stylex-owner="${owner}"`);
  }
  expect(source).not.toContain(
    "className={`${stylex.props(styles.pullRequestRow).className} post-item`}",
  );
  expect(source).toContain('className: "post-item title"');
  for (const declaration of [
    'borderBottomColor: "#ddd"',
    'borderBottomStyle: "solid"',
    'borderBottomWidth: "1px"',
    'clear: "both"',
    'display: "block"',
    'overflow: "auto"',
    'padding: "10px"',
    '"@media (max-width: 767px)": { padding: "10px 0px !important" }',
    'pullRequestProjectAvatarRail: { float: "left", marginRight: "10px" }',
    'lineHeight: "20px"',
    "pullRequestPostId:",
    "pullRequestInfos:",
  ]) {
    expect(styleSource).toContain(declaration);
  }

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "domcontentloaded" });
  const rows = page.locator('[data-stylex-owner="user-profile-pull-request-row"]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).not.toHaveClass(/\bpost-item\b/);
  await expect(rows.nth(1)).not.toHaveClass(/\bpost-item\b/);
  await expect(rows.nth(0)).toContainText(
    "sample12Conflict pull requestContributor User2 days ago3Conflict",
  );
  await expect(rows.nth(1)).toContainText("sample13Open pull request");
  await expect(rows.nth(1)).toContainText("No author");
  await expect(rows.nth(1)).toContainText("Yesterday");
  await expect(rows.nth(1)).toContainText("Open");
  await expect(rows.nth(0).locator('a[href$="/admin/sample"]')).toHaveCount(2);
  await expect(rows.nth(0).locator('a[href$="/admin/sample/pullRequest/12"]')).toHaveCount(1);
  await expect(rows.nth(1).locator('a[href$="/admin/sample/pullRequest/13"]')).toHaveCount(1);
  await expect(rows.nth(0).locator(".title.conflict")).toHaveText("Conflict pull request");
  await expect(rows.nth(0).locator(".state.conflict")).toHaveText("Conflict");
  await expect(rows.nth(1).locator(".state.open")).toHaveText("Open");
  await expect(
    rows.nth(0).locator('[data-stylex-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveAttribute("href", `${basePath}/receiver`);
  await expect(
    rows.nth(0).locator('[data-stylex-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveAttribute("title", "Receiver User");
  await expect(rows.nth(0).locator('a[href$="/admin/sample/pullRequest/12#comments"]')).toHaveCount(
    1,
  );
  await expect(
    rows.nth(0).locator('[data-stylex-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveCount(1);
  await expect(rows.nth(1).locator(".empty-avatar-wrap")).toHaveCount(1);
  await expect(
    rows.nth(1).locator('[data-stylex-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveCount(0);

  const rowChildOrder = await rows
    .nth(0)
    .evaluate((node) =>
      Array.from(node.children).map(
        (child) => child.getAttribute("data-stylex-owner") ?? child.getAttribute("class"),
      ),
    );
  expect(rowChildOrder).toEqual(["span10", "user-profile-pull-request-receiver-column"]);
  const contentChildOrder = await rows
    .nth(0)
    .locator(":scope > .span10")
    .evaluate((node) =>
      Array.from(node.children).map((child) => child.getAttribute("data-stylex-owner")),
    );
  expect(contentChildOrder).toEqual([
    "user-profile-pull-request-project-avatar-rail",
    "user-profile-pull-request-title-wrap",
    "user-profile-pull-request-infos",
  ]);
  const titleLinks = await rows
    .nth(0)
    .locator('[data-stylex-owner="user-profile-pull-request-title-link"]')
    .evaluateAll((links) =>
      links.map((link) => ({ href: link.getAttribute("href"), text: link.textContent })),
    );
  expect(titleLinks).toEqual([
    { href: `${basePath}/admin/sample`, text: "sample" },
    { href: `${basePath}/admin/sample/pullRequest/12`, text: "Conflict pull request" },
  ]);

  const measure = async () =>
    rows.nth(0).evaluate((node) => {
      const row =
        node.querySelector<HTMLElement>('[data-stylex-owner="user-profile-pull-request-row"]') ??
        node;
      const avatar = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-project-avatar-rail"]',
      );
      const titleWrap = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-title-wrap"]',
      );
      const postId = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-post-id"]',
      );
      const title = node.querySelector<HTMLElement>(
        'a[data-stylex-owner="user-profile-pull-request-title-link"].title:not(.project)',
      );
      const infos = node.querySelector<HTMLElement>(
        '[data-stylex-owner="user-profile-pull-request-infos"]',
      );
      if (!avatar || !titleWrap || !postId || !title || !infos)
        throw new Error("Batch 964 owners missing");
      const visibleBoxes = [avatar, titleWrap, infos].map((element) =>
        element.getBoundingClientRect(),
      );
      return {
        rowPadding: getComputedStyle(row).padding,
        rowBorderColor: getComputedStyle(row).borderBottomColor,
        rowBorderWidth: getComputedStyle(row).borderBottomWidth,
        rowBorder: getComputedStyle(row).borderBottomStyle,
        rowClear: getComputedStyle(row).clear,
        rowDisplay: getComputedStyle(row).display,
        rowOverflow: getComputedStyle(row).overflow,
        avatarFloat: getComputedStyle(avatar).float,
        avatarMarginRight: getComputedStyle(avatar).marginRight,
        titleDisplay: getComputedStyle(titleWrap).display,
        titleLineHeight: getComputedStyle(titleWrap).lineHeight,
        titleOverflow: getComputedStyle(titleWrap).overflow,
        postIdFontSize: getComputedStyle(postId).fontSize,
        postIdColor: getComputedStyle(postId).color,
        linkColor: getComputedStyle(title).color,
        infosDisplay: getComputedStyle(infos).display,
        infosLineHeight: getComputedStyle(infos).lineHeight,
        infosFontSize: getComputedStyle(infos).fontSize,
        infosColor: getComputedStyle(infos).color,
        contained: visibleBoxes.every((box) => box.left >= 0 && box.right <= window.innerWidth + 1),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
  expect(await measure()).toEqual({
    rowPadding: "10px",
    rowBorderColor: "rgb(221, 221, 221)",
    rowBorderWidth: "1px",
    rowBorder: "solid",
    rowClear: "both",
    rowDisplay: "block",
    rowOverflow: "auto",
    avatarFloat: "left",
    avatarMarginRight: "10px",
    titleDisplay: "block",
    titleLineHeight: "20px",
    titleOverflow: "hidden",
    postIdFontSize: "13px",
    postIdColor: "rgb(153, 153, 153)",
    linkColor: "rgb(185, 74, 72)",
    infosDisplay: "block",
    infosLineHeight: "20px",
    infosFontSize: "12px",
    infosColor: "rgb(153, 153, 153)",
    contained: true,
    scrollWidth: 1366,
  });

  for (const element of [...(await rows.all()), ...(await rows.locator("*").all())]) {
    await expect(element).not.toHaveAttribute("style");
    for (const attribute of [
      "data-toggle",
      "data-placement",
      "data-target",
      "data-action",
      "data-href",
      "data-url",
      "data-original-title",
    ]) {
      await expect(element).not.toHaveAttribute(attribute);
    }
    const pluginAttributes = await element.evaluate((node) =>
      Array.from(node.attributes)
        .map((attribute) => attribute.name)
        .filter((name) => name.startsWith("data-request-")),
    );
    expect(pluginAttributes).toEqual([]);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await measure()).toMatchObject({
    rowPadding: "10px 0px",
    rowBorderColor: "rgb(221, 221, 221)",
    rowBorderWidth: "1px",
    rowDisplay: "block",
    rowClear: "both",
    avatarFloat: "left",
    avatarMarginRight: "10px",
    titleDisplay: "block",
    titleLineHeight: "20px",
    infosDisplay: "block",
    infosLineHeight: "20px",
    infosFontSize: "12px",
    contained: true,
    scrollWidth: 390,
  });
});
