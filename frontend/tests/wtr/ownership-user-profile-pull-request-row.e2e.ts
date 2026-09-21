import { readFile, curatedAppCss } from "../wtr-compat.ts";
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

test("authenticated public profile owns populated pull-request row residuals", async ({ page }) => {
  const [
    source,
    _styleSource,
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
    curatedAppCss(),
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
  expect(partial).toContain(
    '<a href="@routes.ProjectApp.project(project.owner, project.name)" class="avatar-wrap mlarge">',
  );
  expect(partial).toContain(
    '<img src="@urlToProjectLogo(project)" alt="@project.owner / @project.name">',
  );
  expect(partial).toContain('<div class="title-wrap">');
  expect(partial).toContain('<span class="post-id">@req.number</span>');
  expect(partial).toContain('class="title @if(req.isConflict == true) {conflict}"');
  expect(partial).toContain('<div class="infos">');
  expect(partial).toContain('class="avatar-wrap assinee"');
  expect(partial).toContain(
    '<img src="@req.receiver.avatarUrl" width="32" height="32" alt="@req.receiver.name">',
  );
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
    "user-profile-pull-request-project-avatar-image",
    "user-profile-pull-request-title-wrap",
    "user-profile-pull-request-post-id",
    "user-profile-pull-request-title-link",
    "user-profile-pull-request-infos",
    "user-profile-pull-request-receiver-rail",
    "user-profile-pull-request-receiver-avatar-link",
    "user-profile-pull-request-receiver-avatar-image",
    "user-profile-pull-request-state",
  ]) {
    expect(source).toContain(`data-owner="${owner}"`);
  }
  // 667398a04 legacy-parity restore: PR row retains post-item, span10, avatar-wrap mlarge/assinee (wave-33).

  expect(source).toContain("avatar-wrap mlarge");
  expect(source).toContain("avatar-wrap assinee");
  expect(source).toContain('data-owner="user-profile-pull-request-content-column"');
  const pullRequestRowSource = source.slice(
    source.indexOf("function ProfilePullRequestRow"),
    source.indexOf("function ProfileProjectRow"),
  );
  expect(pullRequestRowSource).toContain("yobicon-comments");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "domcontentloaded" });
  const rows = page.locator('[data-owner="user-profile-pull-request-row"]');
  await expect(rows).toHaveCount(2);
  const titleLinks = rows.nth(0).locator('[data-owner="user-profile-pull-request-title-link"]');
  // 667398a04 legacy-parity restore: rows retain post-item; avatar rails retain avatar-wrap mlarge/assinee (wave-33).
  await expect(rows.nth(0)).toHaveClass(/(?:^|\s)post-item(?:\s|$)/u);
  await expect(rows.nth(1)).toHaveClass(/(?:^|\s)post-item(?:\s|$)/u);
  for (const owner of [
    "user-profile-pull-request-project-avatar-rail",
    "user-profile-pull-request-receiver-avatar-link",
  ]) {
    await expect(rows.nth(0).locator(`[data-owner="${owner}"]`)).toHaveClass(
      /(?:^|\s)(?:avatar-wrap|mlarge|assinee)(?:\s|$)/u,
    );
  }
  await expect(
    rows.nth(0).locator('[data-owner="user-profile-pull-request-project-avatar-image"]'),
  ).toHaveCount(1);
  await expect(
    rows.nth(0).locator('[data-owner="user-profile-pull-request-receiver-avatar-image"]'),
  ).toHaveCount(1);
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
  await expect(titleLinks.nth(1)).toHaveText("Conflict pull request");
  await expect(rows.nth(0).locator('[data-owner="user-profile-pull-request-state"]')).toHaveText(
    "Conflict",
  );
  await expect(rows.nth(1).locator('[data-owner="user-profile-pull-request-state"]')).toHaveText(
    "Open",
  );
  await expect(
    rows.nth(0).locator('[data-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveAttribute("href", `${basePath}/receiver`);
  await expect(
    rows.nth(0).locator('[data-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveAttribute("title", "Receiver User");
  await expect(rows.nth(0).locator('a[href$="/admin/sample/pullRequest/12#comments"]')).toHaveCount(
    1,
  );
  // 667398a04 legacy-parity restore: comment icon retains yobicon-comments (wave-33).
  await expect(
    rows.nth(0).locator('[data-owner="user-profile-pull-request-infos-comment-icon"]'),
  ).toHaveClass(/(?:^|\s)yobicon-comments(?:\s|$)/u);
  await expect(
    rows.nth(0).locator('[data-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveCount(1);
  await expect(
    rows.nth(1).locator('[data-owner="user-profile-pull-request-empty-avatar-wrap"]'),
  ).toHaveCount(1);
  await expect(
    rows.nth(1).locator('[data-owner="user-profile-pull-request-receiver-rail"] a'),
  ).toHaveCount(0);

  const rowChildOrder = await rows
    .nth(0)
    .evaluate((node) =>
      Array.from(node.children).map(
        (child) => child.getAttribute("data-owner") ?? child.getAttribute("class"),
      ),
    );
  expect(rowChildOrder).toEqual([
    "user-profile-pull-request-content-column",
    "user-profile-pull-request-receiver-column",
  ]);
  const contentChildOrder = await rows
    .nth(0)
    .locator(':scope > [data-owner="user-profile-pull-request-content-column"]')
    .evaluate((node) => Array.from(node.children).map((child) => child.getAttribute("data-owner")));
  expect(contentChildOrder).toEqual([
    "user-profile-pull-request-project-avatar-rail",
    "user-profile-pull-request-title-wrap",
    "user-profile-pull-request-infos",
  ]);
  const titleLinkData = await titleLinks.evaluateAll((links) =>
    links.map((link) => ({ href: link.getAttribute("href"), text: link.textContent })),
  );
  expect(titleLinkData).toEqual([
    { href: `${basePath}/admin/sample`, text: "sample" },
    { href: `${basePath}/admin/sample/pullRequest/12`, text: "Conflict pull request" },
  ]);

  // 667398a04 legacy-parity restore: PR row infos retain their legacy classes (wave-33).
  const retainedPullRequestClassPattern =
    /\b(?:title-wrap|post-id|title|project|conflict|infos|infos-item|infos-link-item|infos-icon-link|size|yobicon-comments)\b/u;
  for (const row of await rows.all()) {
    for (const owner of [
      "user-profile-pull-request-title-wrap",
      "user-profile-pull-request-post-id",
      "user-profile-pull-request-title-link",
      "user-profile-pull-request-infos",
      "user-profile-pull-request-infos-author-link",
      "user-profile-pull-request-infos-empty-author",
      "user-profile-pull-request-infos-date",
      "user-profile-pull-request-infos-comment-link",
      "user-profile-pull-request-infos-comment-icon",
      "user-profile-pull-request-infos-comment-size",
    ]) {
      for (const element of await row.locator(`[data-owner="${owner}"]`).all()) {
        await expect(element).toHaveClass(retainedPullRequestClassPattern);
      }
    }
  }

  const measure = async () =>
    rows.nth(0).evaluate((node) => {
      const row =
        node.querySelector<HTMLElement>('[data-owner="user-profile-pull-request-row"]') ?? node;
      const content = node.querySelector<HTMLElement>(
        '[data-owner="user-profile-pull-request-content-column"]',
      );
      const receiver = node.querySelector<HTMLElement>(
        '[data-owner="user-profile-pull-request-receiver-column"]',
      );
      const avatar = node.querySelector<HTMLElement>(
        '[data-owner="user-profile-pull-request-project-avatar-rail"]',
      );
      const titleWrap = node.querySelector<HTMLElement>(
        '[data-owner="user-profile-pull-request-title-wrap"]',
      );
      const postId = node.querySelector<HTMLElement>(
        '[data-owner="user-profile-pull-request-post-id"]',
      );
      const titleLinks = Array.from(
        node.querySelectorAll<HTMLElement>('[data-owner="user-profile-pull-request-title-link"]'),
      );
      const title = titleLinks[1];
      const infos = node.querySelector<HTMLElement>(
        '[data-owner="user-profile-pull-request-infos"]',
      );
      const icon = node.querySelector<HTMLElement>(
        '[data-owner="user-profile-pull-request-infos-comment-icon"]',
      );
      const list = node.closest<HTMLElement>('[data-owner="user-profile-pull-request-list"]');
      const stream = node.closest<HTMLElement>('[data-owner="user-profile-stream"]');
      if (
        !content ||
        !receiver ||
        !avatar ||
        !titleWrap ||
        !postId ||
        titleLinks.length !== 2 ||
        !title ||
        !infos ||
        !icon ||
        !list ||
        !stream
      )
        throw new Error("Batch 964 owners missing");
      const rowStyle = getComputedStyle(row);
      const rowContentWidth =
        row.clientWidth -
        Number.parseFloat(rowStyle.paddingLeft) -
        Number.parseFloat(rowStyle.paddingRight);
      const contentBox = content.getBoundingClientRect();
      const receiverBox = receiver.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const streamBox = stream.getBoundingClientRect();
      const streamStyle = getComputedStyle(stream);
      const iconStyle = getComputedStyle(icon);
      const iconBefore = getComputedStyle(icon, "::before");
      const visibleBoxes = [content, receiver, avatar, titleWrap, infos].map((element) =>
        element.getBoundingClientRect(),
      );
      return {
        rowPadding: rowStyle.padding,
        rowBorderColor: rowStyle.borderBottomColor,
        rowBorderWidth: rowStyle.borderBottomWidth,
        rowBorder: rowStyle.borderBottomStyle,
        rowClear: rowStyle.clear,
        rowDisplay: rowStyle.display,
        rowOverflow: rowStyle.overflow,
        contentDisplay: getComputedStyle(content).display,
        contentFloat: getComputedStyle(content).float,
        contentBoxSizing: getComputedStyle(content).boxSizing,
        contentMarginLeft: getComputedStyle(content).marginLeft,
        contentMinHeight: getComputedStyle(content).minHeight,
        contentWidthRatio: contentBox.width / rowContentWidth,
        contentLeft: contentBox.left,
        contentRight: contentBox.right,
        receiverLeft: receiverBox.left,
        receiverRight: receiverBox.right,
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
        iconDisplay: iconStyle.display,
        iconFontFamily: iconStyle.fontFamily,
        iconVerticalAlign: iconStyle.verticalAlign,
        iconBeforeContent: iconBefore.content,
        contained: visibleBoxes.every((box) => box.left >= 0 && box.right <= window.innerWidth + 1),
        columnsContained: contentBox.left >= rowBox.left && receiverBox.right <= rowBox.right + 1,
        streamLeft: streamBox.left,
        streamContentRailLeft: streamBox.left + Number.parseFloat(streamStyle.paddingLeft),
        listLeft: list.getBoundingClientRect().left,
        rowLeft: rowBox.left,
        scrollWidth: document.documentElement.scrollWidth,
        documentOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
  const desktopMeasure = await measure();
  expect(desktopMeasure).toMatchObject({
    rowPadding: "10px",
    rowBorderColor: "rgb(221, 221, 221)",
    rowBorderWidth: "1px",
    rowBorder: "solid",
    rowClear: "both",
    rowDisplay: "block",
    rowOverflow: "auto",
    contentDisplay: "block",
    contentFloat: "left",
    contentBoxSizing: "border-box",
    contentMarginLeft: "0px",
    contentMinHeight: "30px",
    contentLeft: expect.any(Number),
    contentRight: expect.any(Number),
    receiverLeft: expect.any(Number),
    receiverRight: expect.any(Number),
    avatarFloat: "left",
    avatarMarginRight: "10px",
    titleDisplay: "block",
    titleLineHeight: "20px",
    titleOverflow: "hidden",
    postIdFontSize: "13px",
    postIdColor: "rgb(153, 153, 153)",
    // F5 dist-truth (2026-08-11): the PR title link uses the app's blue
    // rgb(53,146,181) instead of the legacy red.
    linkColor: "rgb(53, 146, 181)",
    infosDisplay: "block",
    infosLineHeight: "20px",
    infosFontSize: "12px",
    infosColor: "rgb(153, 153, 153)",
    iconDisplay: "inline-block",
    iconFontFamily: "yobicon",
    iconVerticalAlign: "middle",
    iconBeforeContent: JSON.stringify(String.fromCodePoint(0xe4b7)),
    contained: true,
    columnsContained: true,
    scrollWidth: 1366,
  });
  expect(desktopMeasure.contentWidthRatio).toBeCloseTo(0.8297872340425532, 4);

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

  await page.setViewportSize({ width: 767, height: 900 });
  const tabletMeasure = await measure();
  expect(tabletMeasure).toMatchObject({
    contentDisplay: "block",
    contentFloat: "none",
    contentBoxSizing: "border-box",
    contentMarginLeft: "0px",
    contentMinHeight: "30px",
    contained: true,
    columnsContained: true,
    scrollWidth: 767,
  });
  expect(tabletMeasure.contentWidthRatio).toBeCloseTo(1, 4);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMeasure = await measure();
  expect(mobileMeasure).toMatchObject({
    rowPadding: "10px 0px",
    rowBorderColor: "rgb(221, 221, 221)",
    rowBorderWidth: "1px",
    rowDisplay: "block",
    rowClear: "both",
    contentDisplay: "block",
    contentFloat: "none",
    contentBoxSizing: "border-box",
    contentMarginLeft: "0px",
    contentMinHeight: "30px",
    avatarFloat: "left",
    avatarMarginRight: "10px",
    titleDisplay: "block",
    titleLineHeight: "20px",
    infosDisplay: "block",
    infosLineHeight: "20px",
    infosFontSize: "12px",
    contained: false,
    columnsContained: true,
    streamLeft: 200,
    streamContentRailLeft: 220,
    listLeft: 230,
    rowLeft: 230,
    scrollWidth: 390,
    documentOverflow: 0,
  });
  expect(mobileMeasure.contentWidthRatio).toBeCloseTo(1, 4);
});
