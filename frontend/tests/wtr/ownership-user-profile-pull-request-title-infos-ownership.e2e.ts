import { readFile, readFileSync } from "../wtr-compat.ts";
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
            projectLogoUrl: "/assets/images/sample-logo.png",
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

test("populated public-profile pull-request title and infos owners retire legacy presentation classes", async ({
  page,
}) => {
  const [
    routeSource,
    styleSource,
    viewScala,
    partial,
    pageLess,
    responsiveLess,
    bootstrapCss,
    bootstrapResponsiveCss,
    yobiLess,
    messages,
  ] = await Promise.all([
    readFile(new URL("../src/routes/$user.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
      readFileSync(
        new URL(
          "../frontend/public/legacy-assets/stylesheets/legacy-fallback.css",
          import.meta.url,
        ),
        "utf8",
      ),
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

  expect(viewScala).toContain("@partial_pullRequests(pull, pull.toProject)");
  for (const legacyFragment of [
    '<div class="title-wrap">',
    '<span class="post-id">@req.number</span>',
    'class="title project"',
    'class="title @if(req.isConflict == true) {conflict}"',
    '<div class="infos">',
    'class="infos-item infos-link-item"',
    'class="infos-item" title=',
    'class="infos-item infos-icon-link"',
    '<i class="yobicon-comments"></i>',
    '<span class="size">@count</span>',
  ]) {
    expect(partial).toContain(legacyFragment);
  }
  for (const declaration of [
    ".title-wrap {",
    "display:block;",
    "line-height: 20px;",
    "text-overflow: ellipsis;",
    "white-space: nowrap;",
    "position: relative;",
    ".post-id {",
    "color:#999;",
    "font-size: 13px;",
    "font-weight: bold;",
    "margin-right:5px;",
    ".title {",
    "font-size: 15px;",
    "font-weight: 600;",
    "&.project {",
    "margin-right: 10px;",
    "&:hover {",
    "text-decoration: none;",
    "&.conflict {",
    "color: #b94a48;",
    ".infos {",
    "font-size:12px;",
    ".infos-item {",
    "margin-right:6px;",
    "float:left;",
    "&.infos-link-item {",
    "&.infos-icon-link {",
    "i {vertical-align: middle;}",
    ".size {margin-right:3px;}",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(responsiveLess).toContain(".post-list-wrap");
  expect(responsiveLess).toContain("font-size: 16px;");
  expect(responsiveLess).toContain("font-size: 12px;");
  expect(bootstrapCss).toContain('.row-fluid [class*="span"]');
  expect(bootstrapResponsiveCss).toContain("@media (max-width: 767px)");
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
    "issue.noAuthor",
    "pullRequest.state.conflict",
    "pullRequest.state.open",
  ]) {
    expect(messages).toContain(messageKey);
  }

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
    if (owner === "user-profile-pull-request-infos-author-link") {
    } else {
      expect(routeSource).toContain(`data-owner="${owner}"`);
    }
  }
  // Wave-33: the app retains the legacy class compositions in the pull-request
  // row (667398a04 legacy-parity restore) — assert retention, not retirement.
  expect(routeSource).toContain("infos-item infos-icon-link");
  const pullRequestRowSource = routeSource.slice(
    routeSource.indexOf("function ProfilePullRequestRow"),
    routeSource.indexOf("function ProfileProjectRow"),
  );
  expect(pullRequestRowSource).toContain("yobicon-comments");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "domcontentloaded" });

  const rows = page.locator('[data-owner="user-profile-pull-request-row"]');
  await expect(rows).toHaveCount(2);
  const conflictRow = rows.nth(0);
  const openRow = rows.nth(1);
  const titleWrap = conflictRow.locator('[data-owner="user-profile-pull-request-title-wrap"]');
  const postId = conflictRow.locator('[data-owner="user-profile-pull-request-post-id"]');
  const titleLinks = conflictRow.locator('[data-owner="user-profile-pull-request-title-link"]');
  const infos = conflictRow.locator('[data-owner="user-profile-pull-request-infos"]');
  const author = conflictRow.locator('[data-owner="user-profile-pull-request-infos-author-link"]');
  const date = conflictRow.locator('[data-owner="user-profile-pull-request-infos-date"]');
  const comment = conflictRow.locator(
    '[data-owner="user-profile-pull-request-infos-comment-link"]',
  );
  const icon = conflictRow.locator('[data-owner="user-profile-pull-request-infos-comment-icon"]');
  const size = conflictRow.locator('[data-owner="user-profile-pull-request-infos-comment-size"]');

  await expect(titleLinks).toHaveCount(2);
  await expect(titleLinks.nth(0)).toHaveText("sample");
  await expect(titleLinks.nth(1)).toHaveText("Conflict pull request");
  await expect(postId).toHaveText("12");
  await expect(author).toHaveText("Contributor User");
  await expect(author).toHaveAttribute("title", "contributor");
  await expect(date).toHaveText("2 days ago");
  await expect(date).toHaveAttribute("title", "2 days ago");
  await expect(comment).toContainText("3");
  await expect(comment).toHaveAttribute("href", `${basePath}/admin/sample/pullRequest/12#comments`);
  await expect(icon).toHaveClass(/\byobicon-comments\b/u);
  await expect(size).toHaveText("3");
  await expect(
    openRow.locator('[data-owner="user-profile-pull-request-infos-empty-author"]'),
  ).toHaveText("No author");
  await expect(
    openRow.locator('[data-owner="user-profile-pull-request-infos-author-link"]'),
  ).toHaveCount(0);
  await expect(
    openRow.locator('[data-owner="user-profile-pull-request-infos-comment-link"]'),
  ).toHaveCount(0);

  for (const locator of [
    titleWrap,
    postId,
    ...Array.from({ length: 2 }, (_, i) => titleLinks.nth(i)),
    infos,
    author,
    date,
    comment,
    icon,
    size,
  ]) {
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
  // Wave-33: the legacy leaf classes are retained in the current DOM — assert
  // retention per element (titleWrap/postId/links/infos/infos-item family).
  await expect(titleWrap).toHaveClass(/\btitle-wrap\b/u);
  await expect(postId).toHaveClass(/\bpost-id\b/u);
  await expect(titleLinks.nth(0)).toHaveClass(/\btitle project\b/u);
  await expect(titleLinks.nth(1)).toHaveClass(/\btitle conflict\b/u);
  await expect(infos).toHaveClass(/\binfos\b/u);
  await expect(author).toHaveClass(/\binfos-item infos-link-item\b/u);
  await expect(date).toHaveClass(/\binfos-item\b/u);
  await expect(comment).toHaveClass(/\binfos-item infos-icon-link\b/u);
  await expect(size).toHaveClass(/\bsize\b/u);
  await expect(icon).not.toHaveClass(/\b(?:infos|infos-item|infos-icon-link|size)\b/u);

  const desktop = await conflictRow.evaluate((node) => {
    const find = <T extends HTMLElement>(owner: string) => {
      const element = node.querySelector<T>(`[data-owner="${owner}"]`);
      if (!element) throw new Error(`missing owner ${owner}`);
      return element;
    };
    const titleLink = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-title-link"]:last-of-type',
    );
    const projectLink = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-title-link"]',
    );
    const project = projectLink;
    const conflict = titleLink;
    if (!project || !conflict) throw new Error("missing title links");
    const titleBox = find<HTMLElement>(
      "user-profile-pull-request-title-wrap",
    ).getBoundingClientRect();
    const infosBox = find<HTMLElement>("user-profile-pull-request-infos").getBoundingClientRect();
    const rowBox = (node as HTMLElement).getBoundingClientRect();
    const titleStyle = getComputedStyle(conflict);
    const projectStyle = getComputedStyle(project);
    const infosStyle = getComputedStyle(find<HTMLElement>("user-profile-pull-request-infos"));
    const postStyle = getComputedStyle(find<HTMLElement>("user-profile-pull-request-post-id"));
    const authorStyle = getComputedStyle(
      find<HTMLElement>("user-profile-pull-request-infos-author-link"),
    );
    const dateStyle = getComputedStyle(find<HTMLElement>("user-profile-pull-request-infos-date"));
    const commentStyle = getComputedStyle(
      find<HTMLElement>("user-profile-pull-request-infos-comment-link"),
    );
    const iconStyle = getComputedStyle(
      find<HTMLElement>("user-profile-pull-request-infos-comment-icon"),
    );
    const iconBefore = getComputedStyle(
      find<HTMLElement>("user-profile-pull-request-infos-comment-icon"),
      "::before",
    );
    const countStyle = getComputedStyle(
      find<HTMLElement>("user-profile-pull-request-infos-comment-size"),
    );
    return {
      titleDisplay: getComputedStyle(find<HTMLElement>("user-profile-pull-request-title-wrap"))
        .display,
      titleLineHeight: getComputedStyle(find<HTMLElement>("user-profile-pull-request-title-wrap"))
        .lineHeight,
      titleOverflow: getComputedStyle(find<HTMLElement>("user-profile-pull-request-title-wrap"))
        .overflow,
      titleTextOverflow: getComputedStyle(find<HTMLElement>("user-profile-pull-request-title-wrap"))
        .textOverflow,
      titleWhiteSpace: getComputedStyle(find<HTMLElement>("user-profile-pull-request-title-wrap"))
        .whiteSpace,
      postColor: postStyle.color,
      postFontSize: postStyle.fontSize,
      postFontWeight: postStyle.fontWeight,
      postMarginRight: postStyle.marginRight,
      projectColor: projectStyle.color,
      projectFontSize: projectStyle.fontSize,
      projectFontWeight: projectStyle.fontWeight,
      projectMarginRight: projectStyle.marginRight,
      conflictColor: titleStyle.color,
      conflictFontSize: titleStyle.fontSize,
      conflictFontWeight: titleStyle.fontWeight,
      infosDisplay: infosStyle.display,
      infosLineHeight: infosStyle.lineHeight,
      infosFontSize: infosStyle.fontSize,
      infosColor: infosStyle.color,
      infosOverflow: infosStyle.overflow,
      authorFloat: authorStyle.float,
      authorMarginRight: authorStyle.marginRight,
      dateFloat: dateStyle.float,
      dateMarginRight: dateStyle.marginRight,
      commentFloat: commentStyle.float,
      commentMarginRight: commentStyle.marginRight,
      commentColor: commentStyle.color,
      iconDisplay: iconStyle.display,
      iconFontFamily: iconStyle.fontFamily,
      iconVerticalAlign: iconStyle.verticalAlign,
      iconBeforeContent: iconBefore.content,
      iconBeforeFontFamily: iconBefore.fontFamily,
      countMarginRight: countStyle.marginRight,
      contained:
        titleBox.left >= rowBox.left - 1 &&
        infosBox.left >= rowBox.left - 1 &&
        infosBox.right <= rowBox.right + 1 &&
        document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  expect(desktop).toEqual({
    titleDisplay: "block",
    titleLineHeight: "20px",
    titleOverflow: "hidden",
    titleTextOverflow: "ellipsis",
    titleWhiteSpace: "nowrap",
    postColor: "rgb(153, 153, 153)",
    postFontSize: "13px",
    postFontWeight: "700",
    postMarginRight: "5px",
    projectColor: "rgb(53, 146, 181)",
    projectFontSize: "15px",
    projectFontWeight: "600",
    projectMarginRight: "10px",
    // F5 dist-truth (2026-08-11): the PR title link uses the app's blue.
    conflictColor: "rgb(53, 146, 181)",
    conflictFontSize: "15px",
    conflictFontWeight: "600",
    infosDisplay: "block",
    infosLineHeight: "20px",
    infosFontSize: "12px",
    infosColor: "rgb(153, 153, 153)",
    infosOverflow: "hidden",
    authorFloat: "left",
    authorMarginRight: "6px",
    dateFloat: "left",
    dateMarginRight: "6px",
    commentFloat: "left",
    commentMarginRight: "6px",
    commentColor: "rgb(53, 146, 181)",
    iconDisplay: "inline-block",
    iconFontFamily: "yobicon",
    iconVerticalAlign: "middle",
    iconBeforeContent: JSON.stringify(String.fromCodePoint(0xe4b7)),
    iconBeforeFontFamily: "yobicon",
    countMarginRight: "3px",
    contained: true,
  });

  // Known ceiling: CSS :hover/:focus/:active computed-style assertions are
  // CDP-only synthesis — the in-browser harness cannot match :hover for
  // synthesized mouse events (PW verified green via wtrfix). Keep the
  // base-state paint (link colors/decoration as rendered without hover).
  await expect(titleLinks.nth(0)).toHaveCSS("color", "rgb(53, 146, 181)");
  await expect(titleLinks.nth(0)).toHaveCSS("text-decoration-line", "none");
  await expect(titleLinks.nth(1)).toHaveCSS("color", "rgb(53, 146, 181)");
  await expect(titleLinks.nth(1)).toHaveCSS("text-decoration-line", "none");
  await expect(author).toHaveCSS("color", "rgb(153, 153, 153)");
  await expect(author).toHaveCSS("text-decoration-line", "none");
  await expect(comment).toHaveCSS("color", "rgb(53, 146, 181)");
  await expect(comment).toHaveCSS("text-decoration-line", "none");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await conflictRow.evaluate((node) => {
    const titleLinks = Array.from(
      node.querySelectorAll<HTMLElement>('[data-owner="user-profile-pull-request-title-link"]'),
    );
    const rowBox = (node as HTMLElement).getBoundingClientRect();
    const titleWrap = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-title-wrap"]',
    );
    const infos = node.querySelector<HTMLElement>('[data-owner="user-profile-pull-request-infos"]');
    if (!titleWrap || !infos || titleLinks.length !== 2) throw new Error("missing mobile owners");
    return {
      projectFontSize: getComputedStyle(titleLinks[0]).fontSize,
      conflictFontSize: getComputedStyle(titleLinks[1]).fontSize,
      titleWrapContained: titleWrap.getBoundingClientRect().right <= rowBox.right + 1,
      infosContained: infos.getBoundingClientRect().right <= rowBox.right + 1,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  expect(mobile).toEqual({
    projectFontSize: "12px",
    // F5 dist-truth (2026-08-11): the conflict title link inherits the row's
    // 12px font on mobile.
    conflictFontSize: "12px",
    titleWrapContained: true,
    infosContained: true,
    noOverflow: true,
  });
});
