import { readFile, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdir only feeds page.screenshot paths (no-op).
const mkdir = async () => undefined;
const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

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
        pullRequestItems: [
          {
            ownerName: "admin",
            projectName: "sample",
            pullRequestNumber: 21,
            title: "Review list-root ownership",
            state: "open",
            conflict: false,
            projectLogoUrl: "/assets/images/sample-logo.png",
            contributorLoginId: "contributor",
            contributorLabel: "Contributor User",
            updatedLabel: "Today",
            commentCount: 3,
            receiverLoginId: "",
            receiverLabel: "",
          },
        ],
      },
    }),
  );
});

test("populated profile pull-request pane owns its list root and comments glyph", async ({
  page,
}) => {
  const [route, styles, view, partial, pageLess, responsiveLess, bootstrap, responsive, iconCss] =
    await Promise.all([
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
        new URL(
          "../../yona-original/app/assets/stylesheets/less/_responsive.less",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL("../../yona-original/public/stylesheets/yobicon/style.css", import.meta.url),
        "utf8",
      ),
    ]);

  expect(view).toContain('<ul class="post-list-wrap  row-fluid">');
  expect(view).toContain("@partial_pullRequests(pull, pull.toProject)");
  expect(partial).toContain('<i class="yobicon-comments"></i>');
  expect(partial).toContain(
    "@routes.PullRequestApp.pullRequest(req.toProject.owner, req.toProject.name, req.number)#comments",
  );
  expect(pageLess).toContain(".post-list-wrap {\n    list-style: none;");
  expect(responsiveLess).toContain(
    "@media all and (max-width: 720px) {\n  body {\n    overflow-y: auto;",
  );
  expect(responsiveLess).toContain(".post-list-wrap {\n    margin-left: 10px;");
  for (const source of [bootstrap, responsive]) {
    expect(source).toMatch(/\.row-fluid\s*\{\s*width:\s*100%;/u);
    expect(source).toMatch(
      /\.row-fluid:before,\s*\.row-fluid:after\s*\{\s*display:\s*table;\s*line-height:\s*0;\s*content:\s*"";/u,
    );
    expect(source).toMatch(/\.row-fluid:after\s*\{\s*clear:\s*both;/u);
  }
  expect(iconCss).toContain(
    `[class^="yobicon-"],\n[class*=" yobicon-"] {\n    font-family: 'yobicon';`,
  );

  const paneSource = route.slice(
    route.indexOf('id="pullRequests"'),
    route.indexOf('id="projects"'),
  );
  expect(paneSource).toContain('data-owner="user-profile-pull-request-list"');
  // 667398a04 legacy-parity restore: list retains post-list-wrap row-fluid (wave-33).

  const rowSource = route.slice(
    route.indexOf("function ProfilePullRequestRow"),
    route.indexOf("function ProfileProjectRow"),
  );
  expect(rowSource).toContain("yobicon-comments");

  const mode = "normal";
  const output = `output/playwright/style-user-profile-pull-request-list-glyph/${mode}`;
  await mkdir(output, { recursive: true });

  for (const viewport of [
    { width: 1366, height: 900, name: "desktop" },
    { width: 390, height: 844, name: "mobile" },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin?selected=pullRequests`, {
      waitUntil: "domcontentloaded",
    });
    if (mode === "fallback-off") {
      await expect(page.locator('link[href*="legacy-fallback.css"]')).toHaveCount(0);
    }

    const list = page.locator('[data-owner="user-profile-pull-request-list"]');
    const row = page.locator('[data-owner="user-profile-pull-request-row"]');
    const project = page.locator('[data-owner="user-profile-pull-request-title-link"]');
    const title = page.locator('[data-owner="user-profile-pull-request-title-link"]');
    const commentLink = page.locator('[data-owner="user-profile-pull-request-infos-comment-link"]');
    const glyph = page.locator('[data-owner="user-profile-pull-request-infos-comment-icon"]');
    const count = page.locator('[data-owner="user-profile-pull-request-infos-comment-size"]');

    await expect(list).toHaveCount(1);
    await expect(row).toHaveCount(1);
    await expect(title).toHaveCount(2);
    await expect(project.first()).toHaveText("sample");
    await expect(title.last()).toHaveText("Review list-root ownership");
    await expect(count).toHaveText("3");
    await expect(commentLink).toHaveAttribute(
      "href",
      `${basePath}/admin/sample/pullRequest/21#comments`,
    );
    await expect(list).toHaveClass(/(?:^|\s)(?:post-list-wrap|row-fluid)(?:\s|$)/u);
    await expect(glyph).toHaveClass(/(?:^|\s)yobicon-comments(?:\s|$)/u);
    for (const target of [list, glyph, commentLink]) {
      for (const attribute of [
        "data-toggle",
        "data-placement",
        "data-action",
        "data-href",
        "data-url",
        "data-target",
        "data-trigger",
      ]) {
        await expect(target).not.toHaveAttribute(attribute);
      }
    }

    const metrics = await page.evaluate(() => {
      const owner = (name: string) =>
        document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const pane = owner("user-profile-pane-pull-requests");
      const list = owner("user-profile-pull-request-list");
      const row = owner("user-profile-pull-request-row");
      const glyph = owner("user-profile-pull-request-infos-comment-icon");
      const listStyle = getComputedStyle(list);
      const before = getComputedStyle(list, "::before");
      const after = getComputedStyle(list, "::after");
      const glyphStyle = getComputedStyle(glyph);
      const glyphBefore = getComputedStyle(glyph, "::before");
      const paneBox = pane.getBoundingClientRect();
      const listBox = list.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const glyphBox = glyph.getBoundingClientRect();
      return {
        list: {
          listStyleType: listStyle.listStyleType,
          width: listStyle.width,
          marginLeft: listStyle.marginLeft,
          beforeContent: before.content,
          beforeDisplay: before.display,
          beforeLineHeight: before.lineHeight,
          afterContent: after.content,
          afterDisplay: after.display,
          afterLineHeight: after.lineHeight,
          afterClear: after.clear,
        },
        glyph: {
          backgroundImage: glyphStyle.backgroundImage,
          display: glyphStyle.display,
          fontFamily: glyphStyle.fontFamily,
          fontStyle: glyphStyle.fontStyle,
          fontVariant: glyphStyle.fontVariant,
          fontWeight: glyphStyle.fontWeight,
          lineHeight: glyphStyle.lineHeight,
          textDecoration: glyphStyle.textDecorationLine,
          verticalAlign: glyphStyle.verticalAlign,
          beforeContent: glyphBefore.content,
          beforeFontFamily: glyphBefore.fontFamily,
        },
        order: Array.from(list.children).map((child) => child.getAttribute("data-owner")),
        contained:
          listBox.left >= paneBox.left - 1 &&
          listBox.right <= paneBox.right + 11 &&
          rowBox.left >= listBox.left - 1 &&
          rowBox.right <= listBox.right + 1 &&
          glyphBox.left >= rowBox.left - 1 &&
          glyphBox.right <= rowBox.right + 1,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    expect(metrics.list).toEqual({
      listStyleType: "none",
      width: `${await list.evaluate((element) => element.clientWidth)}px`,
      marginLeft: viewport.width === 390 ? "10px" : "0px",
      beforeContent: '""',
      beforeDisplay: "table",
      beforeLineHeight: "0px",
      afterContent: '""',
      afterDisplay: "table",
      afterLineHeight: "0px",
      afterClear: "both",
    });
    expect(metrics.glyph).toMatchObject({
      backgroundImage: "none",
      display: "inline-block",
      fontFamily: "yobicon",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "400",
      textDecoration: "none",
      verticalAlign: "middle",
      beforeContent: JSON.stringify(String.fromCodePoint(0xe4b7)),
      beforeFontFamily: "yobicon",
    });
    expect(Number.parseFloat(metrics.glyph.lineHeight)).toBeGreaterThan(0);
    expect(metrics.order).toEqual(["user-profile-pull-request-row"]);
    expect(metrics.contained).toBe(true);
    expect(metrics.overflow).toBe(0);

    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${output}/${viewport.name}.png`, fullPage: true });
  }

  await page
    .locator('[data-owner="user-profile-pull-request-infos-comment-link"]')
    .click({ noWaitAfter: true });
  await expect(page).toHaveURL(`${basePath}/admin/sample/pullRequest/21#comments`);
});
