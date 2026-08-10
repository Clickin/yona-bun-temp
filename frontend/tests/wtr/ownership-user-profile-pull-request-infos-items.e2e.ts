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
        ],
      },
    }),
  );
});

test("authenticated public profile owns pull-request infos item residuals", async ({ page }) => {
  const [
    routeSource,
    styleSource,
    viewScala,
    partial,
    pageLess,
    responsiveLess,
    bootstrapCss,
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
      new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../../yona-original/conf/messages", import.meta.url), "utf8"),
  ]);

  expect(viewScala).toContain("@partial_pullRequests(pull, pull.toProject)");
  expect(partial).toContain('<div class="infos">');
  expect(partial).toContain('class="infos-item infos-link-item"');
  expect(partial).toContain('class="infos-item" title=');
  expect(partial).toContain('class="infos-item infos-icon-link"');
  expect(partial).toContain('<i class="yobicon-comments"></i>');
  expect(partial).toContain('<span class="size">@count</span>');
  for (const declaration of [
    ".infos-item {",
    "margin-right:6px;",
    "float:left;",
    "&.infos-link-item {",
    "color:#3592b5;",
    "text-decoration: none;",
    "&.infos-icon-link {",
    "i {vertical-align: middle;}",
    ".size {margin-right:3px;}",
  ]) {
    expect(pageLess).toContain(declaration);
  }
  expect(responsiveLess).toContain("padding: 10px 0 !important;");
  expect(bootstrapCss).toContain(".pull-left");
  expect(yobiLess).toContain('@import "less/_page.less";');
  expect(messages).toContain("pullRequest.state.conflict");

  for (const owner of [
    "user-profile-pull-request-infos-date",
    "user-profile-pull-request-infos-comment-link",
    "user-profile-pull-request-infos-comment-icon",
    "user-profile-pull-request-infos-comment-size",
  ]) {
    expect(routeSource).toContain(`data-owner="${owner}"`);
  }
  const pullRequestRowSource = routeSource.slice(
    routeSource.indexOf("function ProfilePullRequestRow"),
    routeSource.indexOf("function ProfileProjectRow"),
  );
  // 667398a04 legacy-parity restore: PR row retains the yobicon-comments glyph (wave-33).
  expect(pullRequestRowSource).toContain("yobicon-comments");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin?selected=pullRequests`, { waitUntil: "domcontentloaded" });

  const row = page.locator('[data-owner="user-profile-pull-request-row"]').first();
  const author = row.locator('[data-owner="user-profile-pull-request-infos-author-link"]');
  const date = row.locator('[data-owner="user-profile-pull-request-infos-date"]');
  const comment = row.locator('[data-owner="user-profile-pull-request-infos-comment-link"]');
  const icon = row.locator('[data-owner="user-profile-pull-request-infos-comment-icon"]');
  const size = row.locator('[data-owner="user-profile-pull-request-infos-comment-size"]');

  await expect(author).toHaveText("Contributor User");
  await expect(date).toHaveText("2 days ago");
  await expect(comment).toContainText("3");
  await expect(icon).toHaveClass(/(?:^|\s)yobicon-comments(?:\s|$)/u);

  const desktop = await row.evaluate((node) => {
    const authorEl = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-infos-author-link"]',
    );
    const dateEl = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-infos-date"]',
    );
    const commentEl = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-infos-comment-link"]',
    );
    const iconEl = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-infos-comment-icon"]',
    );
    const sizeEl = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-infos-comment-size"]',
    );
    if (!authorEl || !dateEl || !commentEl || !iconEl || !sizeEl) {
      throw new Error("missing infos owners");
    }
    const iconStyle = getComputedStyle(iconEl);
    const iconBefore = getComputedStyle(iconEl, "::before");
    return {
      authorFloat: getComputedStyle(authorEl).float,
      authorMarginRight: getComputedStyle(authorEl).marginRight,
      dateFloat: getComputedStyle(dateEl).float,
      dateMarginRight: getComputedStyle(dateEl).marginRight,
      commentFloat: getComputedStyle(commentEl).float,
      commentMarginRight: getComputedStyle(commentEl).marginRight,
      commentColor: getComputedStyle(commentEl).color,
      iconBackgroundImage: iconStyle.backgroundImage,
      iconDisplay: iconStyle.display,
      iconFontFamily: iconStyle.fontFamily,
      iconFontStyle: iconStyle.fontStyle,
      iconFontVariant: iconStyle.fontVariant,
      iconFontWeight: iconStyle.fontWeight,
      iconTextDecoration: iconStyle.textDecorationLine,
      iconVerticalAlign: iconStyle.verticalAlign,
      iconBeforeContent: iconBefore.content,
      iconBeforeFontFamily: iconBefore.fontFamily,
      sizeMarginRight: getComputedStyle(sizeEl).marginRight,
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  expect(desktop).toEqual({
    authorFloat: "left",
    authorMarginRight: "6px",
    dateFloat: "left",
    dateMarginRight: "6px",
    commentFloat: "left",
    commentMarginRight: "6px",
    commentColor: "rgb(53, 146, 181)",
    iconBackgroundImage: "none",
    iconDisplay: "inline-block",
    iconFontFamily: "yobicon",
    iconFontStyle: "normal",
    iconFontVariant: "normal",
    iconFontWeight: "400",
    iconTextDecoration: "none",
    iconVerticalAlign: "middle",
    iconBeforeContent: JSON.stringify(String.fromCodePoint(0xe4b7)),
    iconBeforeFontFamily: "yobicon",
    sizeMarginRight: "3px",
    noOverflow: true,
  });

  // CSS :hover computed-style assertions are CDP-only synthesis (known
  // ceiling): WTR cannot activate the :hover pseudo-class, so the author
  // link's style `:hover { color: #3592b5 }` never applies. Retired per
  // ceiling; base-state paint asserted instead (comment link is #3592b5 in
  // base state, author link is the app default link color).
  await expect(author).toHaveCSS("color", "rgb(153, 153, 153)");
  await expect(author).toHaveCSS("text-decoration-line", "none");
  await expect(comment).toHaveCSS("color", "rgb(53, 146, 181)");
  await expect(comment).toHaveCSS("text-decoration-line", "none");

  for (const locator of [author, date, comment, icon, size]) {
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
  const mobile = await row.evaluate((node) => {
    const rowEl = node as HTMLElement;
    const authorEl = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-infos-author-link"]',
    );
    const commentEl = node.querySelector<HTMLElement>(
      '[data-owner="user-profile-pull-request-infos-comment-link"]',
    );
    if (!authorEl || !commentEl) throw new Error("missing infos owners");
    const rowBox = rowEl.getBoundingClientRect();
    const authorBox = authorEl.getBoundingClientRect();
    const commentBox = commentEl.getBoundingClientRect();
    return {
      authorMarginRight: getComputedStyle(authorEl).marginRight,
      commentMarginRight: getComputedStyle(commentEl).marginRight,
      contained:
        authorBox.left >= rowBox.left - 1 &&
        commentBox.right <= rowBox.right + 1 &&
        document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  expect(mobile).toEqual({
    authorMarginRight: "6px",
    commentMarginRight: "6px",
    contained: true,
  });
});
