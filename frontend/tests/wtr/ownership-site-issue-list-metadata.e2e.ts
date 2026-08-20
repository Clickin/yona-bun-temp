import { readFileSync, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/issueList.tsx", import.meta.url);
const themeSource = new URL("../src/app.css", import.meta.url);
const legacyTemplateSource = new URL(
  "../../yona-original/app/views/site/issueList.scala.html",
  import.meta.url,
);
const legacyCommonLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_common.less",
  import.meta.url,
);
const legacyPageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const legacyYobiUiLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_yobiUI.less",
  import.meta.url,
);
const legacyYobiconCssSource = new URL(
  "../../yona-original/public/stylesheets/yobicon/style.css",
  import.meta.url,
);

const owners = {
  authorAvatar: "site-issue-list-author-avatar",
  authorAvatarImage: "site-issue-list-author-avatar-image",
  commentsIcon: "site-issue-list-comments-icon",
  metadata: "site-issue-list-metadata",
  metadataItem: "site-issue-list-metadata-item",
  row: "site-issue-list-row",
} as const;

async function openIssueList(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-metadata" },
      json: {
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        issues: [
          issueFixture({
            authorAvatarUrl: "https://www.gravatar.com/avatar/alice-default?s=16",
            authorLabel: "Alice Display",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 5,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 13:00",
            issueNumber: "42",
            ownerName: "acme",
            projectName: "roadmap",
            title: "Fix release blocker",
          }),
          issueFixture({
            authorAvatarUrl: "/uploads/bob-avatar.png",
            authorLabel: "Bob Display",
            authorLoginId: "bob",
            authorName: "Bob Example",
            commentCount: 12,
            createdLabel: "2 days ago",
            createdTitle: "2026-06-28 09:30",
            issueNumber: "57",
            ownerName: "labs",
            projectName: "console",
            title: "Trace deployment failure",
          }),
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 2,
        totalPages: 1,
      },
    }),
  );
  await routeFixtureImage(page, "/assets/images/default-project-logo.png", 45, 45);
  await routeFixtureImage(page, "https://www.gravatar.com/avatar/alice-default?s=16", 16, 16);
  await routeFixtureImage(page, "/uploads/bob-avatar.png", 16, 16);

  await page.goto(`${basePath}/sites/issueList?state=open`);
  const metadata = owner(page, owners.metadata);
  await expect(metadata).toHaveCount(2);
  return metadata;
}

test.describe("Style site issue-list metadata", () => {
  test("declares five explicit owners from the frozen final cascade", async () => {
    const [route, theme, template, commonLess, pageLess, yobiUiLess, yobiconCss] =
      await Promise.all([
        readFile(routeSource, "utf8"),
        Promise.resolve(curatedAppCss()),
        readFile(legacyTemplateSource, "utf8"),
        readFile(legacyCommonLessSource, "utf8"),
        readFile(legacyPageLessSource, "utf8"),
        readFile(legacyYobiUiLessSource, "utf8"),
        readFile(legacyYobiconCssSource, "utf8"),
      ]);

    expect(template).toContain('<div class="post-meta-wrap">');
    expect(template).toContain('class="post-comments post-meta-item"');
    expect(commonLess).toContain(`.avatar-wrap {
    width:32px; height:32px;
    vertical-align:top;
    overflow:hidden; display:inline-block;`);
    expect(pageLess).toContain(`.post-meta-wrap {
            font-size:11px;
            line-height: 20px;`);
    expect(pageLess).toContain(`.avatar-wrap {
                width:14px;
                height: 14px;`);
    expect(pageLess).toContain(`.post-meta-item {
                margin:0 5px;`);
    expect(pageLess).toContain(`.post-comments {
                i { vertical-align: middle;}`);
    expect(yobiUiLess).toContain(`.avatar-wrap {
    width:32px; height:32px; /* default size: medium */
    display:inline-block;
    vertical-align:middle;
    overflow:hidden;
    background:#ddd;`);
    expect(yobiUiLess).toContain(`img {
        width:100%;
        vertical-align:top;`);
    expect(yobiconCss).toContain('[class^="yobicon-"],');
    expect(yobiconCss).toContain("font-family: 'yobicon';");

    for (const explicitOwner of [
      owners.metadata,
      owners.authorAvatar,
      owners.authorAvatarImage,
      owners.metadataItem,
      owners.commentsIcon,
    ]) {
      expect(route).toContain(`data-owner="${explicitOwner}"`);
    }
    for (const styleName of [
      "issueListMetadata",
      "issueListAuthorAvatar",
      "issueListAuthorAvatarImage",
      "issueListMetadataItem",
      "issueListCommentsIcon",
    ]) {
    }

    // F5 dist-truth (2026-08-13): the route owns the comments glyph class —
    // legacy yona-original/app/views/site/issueList.scala.html:70 renders
    // `<i class="yobicon-comments"></i>` for the issue comment count; the app
    // renders the same class on the owned icon (issueList.tsx), app == legacy.
    expect(route).toContain('className="yobicon-comments"');
    for (const variable of [
      "siteIssueListMetadataFontSize",
      "siteIssueListMetadataLineHeight",
      "siteIssueListMetadataAvatarWidth",
      "siteIssueListMetadataAvatarHeight",
      "siteIssueListMetadataAvatarDisplay",
      "siteIssueListMetadataAvatarVerticalAlign",
      "siteIssueListMetadataAvatarOverflow",
      "siteIssueListMetadataAvatarSurface",
      "siteIssueListMetadataAvatarRadius",
      "siteIssueListMetadataAvatarImageWidth",
      "siteIssueListMetadataAvatarImageVerticalAlign",
      "siteIssueListMetadataItemMarginBlock",
      "siteIssueListMetadataItemMarginInline",
      "siteIssueListCommentsIconVerticalAlign",
    ]) {
      expect(theme).not.toContain(variable);
    }
  });

  test("keeps metadata order, profile masks, comments hashes, and both avatar branches", async ({
    page,
  }) => {
    const metadata = await openIssueList(page);
    const first = metadata.nth(0);
    const second = metadata.nth(1);

    for (const [row, expected] of [
      [first, { author: "Alice Display", comments: "5", date: "1 day ago", loginId: "alice" }],
      [second, { author: "Bob Display", comments: "12", date: "2 days ago", loginId: "bob" }],
    ] as const) {
      const avatar = owner(row, owners.authorAvatar);
      const items = owner(row, owners.metadataItem);
      // wtr-compat scopedChild resolution ignores the parent index (bucket-1
      // gap): nth(N).locator(":scope > *") returns children of ALL matches.
      // evaluate on the indexed element is the equivalent supported API.
      expect(
        await row.evaluate((element) =>
          Array.from(element.children).map((child) => child.getAttribute("data-owner")),
        ),
      ).toEqual([
        owners.authorAvatar,
        owners.metadataItem,
        owners.metadataItem,
        owners.metadataItem,
      ]);
      await expect(avatar).toHaveAttribute("href", `${basePath}/${expected.loginId}`);
      await expect(items).toHaveCount(3);
      await expect(items.nth(0)).toHaveText(expected.author);
      await expect(items.nth(0)).toHaveAttribute("href", `${basePath}/${expected.loginId}`);
      await expect(items.nth(1)).toHaveText(expected.date);
      await expect(items.nth(2)).toContainText(expected.comments);
    }
    await expect(owner(first, owners.metadataItem).nth(1)).toHaveAttribute(
      "title",
      "2026-06-29 13:00",
    );
    await expect(owner(first, owners.metadataItem).nth(2).locator("a")).toHaveAttribute(
      "href",
      `${basePath}/acme/roadmap/issue/42#comments`,
    );
    await expect(owner(second, owners.metadataItem).nth(2).locator("a")).toHaveAttribute(
      "href",
      `${basePath}/labs/console/issue/57#comments`,
    );

    const defaultImage = owner(first, owners.authorAvatarImage);
    await expect(defaultImage).toHaveAttribute(
      "src",
      "https://www.gravatar.com/avatar/alice-default?s=16",
    );
    await expect(defaultImage).not.toHaveAttribute("alt");
    await expect(defaultImage).not.toHaveAttribute("width");
    await expect(defaultImage).not.toHaveAttribute("height");
    const customImage = owner(second, owners.authorAvatarImage);
    await expect(customImage).toHaveAttribute("src", "/uploads/bob-avatar.png");
    await expect(customImage).toHaveAttribute("alt", "Bob Example");
    await expect(customImage).toHaveAttribute("width", "16");
    await expect(customImage).toHaveAttribute("height", "16");
    expect(new URL(page.url()).searchParams.get("state")).toBe("open");
  });

  test("retires metadata fallbacks while preserving the owned comments glyph", async ({ page }) => {
    const metadata = await openIssueList(page);
    const first = metadata.nth(0);
    const avatar = owner(first, owners.authorAvatar);
    const avatarImage = owner(first, owners.authorAvatarImage);
    const items = owner(first, owners.metadataItem);
    const icon = owner(first, owners.commentsIcon);

    await expect(first).not.toHaveClass(/\bpost-meta-wrap\b/u);
    await expect(avatar).not.toHaveClass(/\bavatar-wrap\b/u);
    await expect(first.locator(".post-meta-item")).toHaveCount(0);
    await expect(first.locator(".post-comments")).toHaveCount(0);
    // F5 dist-truth (2026-08-13): the owned comments icon keeps the legacy
    // yobicon-comments glyph class (issueList.scala.html:70); the glyph font,
    // ::before content, and geometry come from the frozen yobicon.css and the
    // app.css [data-owner="site-issue-list-comments-icon"] rules.
    await expect(icon).toHaveClass(/\byobicon-comments\b/u);
    await expect(icon).not.toHaveClass(/\bpost-comments\b/u);
    for (const element of [
      first,
      avatar,
      avatarImage,
      items.nth(0),
      items.nth(1),
      items.nth(2),
      icon,
    ]) {
    }

    await expect(first).toHaveCSS("font-size", "11px");
    await expect(first).toHaveCSS("line-height", "20px");
    await expect(avatar).toHaveCSS("width", "14px");
    await expect(avatar).toHaveCSS("height", "14px");
    await expect(avatar).toHaveCSS("display", "inline-block");
    await expect(avatar).toHaveCSS("vertical-align", "middle");
    await expect(avatar).toHaveCSS("overflow", "hidden");
    await expect(avatar).toHaveCSS("background-color", "rgb(221, 221, 221)");
    await expect(avatar).toHaveCSS("border-radius", "3px");
    await expect(avatarImage).toHaveCSS("width", "14px");
    await expect(avatarImage).toHaveCSS("height", "14px");
    await expect(avatarImage).toHaveCSS("vertical-align", "top");
    for (const item of await items.all()) {
      await expect(item).toHaveCSS("margin-top", "0px");
      await expect(item).toHaveCSS("margin-right", "5px");
      await expect(item).toHaveCSS("margin-bottom", "0px");
      await expect(item).toHaveCSS("margin-left", "5px");
    }
    await expect(icon).toHaveCSS("vertical-align", "middle");
    await expect(icon).toHaveCSS("display", "inline-block");
    await expect(icon).toHaveCSS("font-family", "yobicon");
    await expect(icon).toHaveCSS("font-style", "normal");
    await expect(icon).toHaveCSS("font-weight", "400");
    await expect(icon).toHaveCSS("line-height", "11px");
    expect(await icon.evaluate((node) => getComputedStyle(node, "::before").content)).toBe(
      '"\ue4b7"',
    );

    const unauthorizedOwners = await first.evaluate((element) => {
      const allowed = new Set([
        "site-issue-list-metadata",
        "site-issue-list-author-avatar",
        "site-issue-list-author-avatar-image",
        "site-issue-list-metadata-item",
        "site-issue-list-comments-icon",
      ]);
      return Array.from(element.querySelectorAll("*"))
        .filter((node) => Array.from(node.classList).some((token) => token.startsWith("x")))
        .map((node) => node.closest<HTMLElement>("[data-owner]")?.dataset.owner)
        .filter((ownerName) => !ownerName || !allowed.has(ownerName));
    });
    expect(unauthorizedOwners).toEqual([]);
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} metadata flow, containment, no overflow, and capture`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const metadata = await openIssueList(page);
      const first = metadata.nth(0);
      const row = first.locator(`xpath=ancestor::*[@data-owner="${owners.row}"]`);
      const avatar = owner(first, owners.authorAvatar);
      const items = owner(first, owners.metadataItem);

      const boxes = await first.evaluate((element) => {
        const pick = (node: Element) => {
          const { bottom, height, left, right, top, width } = node.getBoundingClientRect();
          return { bottom, height, left, right, top, width };
        };
        const row = element.closest('[data-owner="site-issue-list-row"]');
        const avatar = element.querySelector(
          ':scope > [data-owner="site-issue-list-author-avatar"]',
        );
        const items = Array.from(
          element.querySelectorAll(':scope > [data-owner="site-issue-list-metadata-item"]'),
        );
        if (!row || !avatar || items.length !== 3) throw new Error("Missing metadata geometry");
        return {
          avatar: pick(avatar),
          items: items.map(pick),
          metadata: pick(element),
          row: pick(row),
        };
      });

      expect(boxes.metadata.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
      expect(boxes.metadata.right).toBeLessThanOrEqual(boxes.row.right + 1);
      expect(boxes.metadata.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
      expect(boxes.metadata.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
      expect(boxes.avatar.width).toBeCloseTo(14, 0);
      expect(boxes.avatar.height).toBeCloseTo(14, 0);
      expect(boxes.avatar.top).toBeGreaterThanOrEqual(boxes.metadata.top - 1);
      expect(boxes.avatar.bottom).toBeLessThanOrEqual(boxes.metadata.bottom + 1);
      expect(boxes.items[0].left).toBeGreaterThanOrEqual(boxes.avatar.right);
      expect(boxes.items[1].left).toBeGreaterThanOrEqual(boxes.items[0].right);
      expect(boxes.items[2].left).toBeGreaterThanOrEqual(boxes.items[1].right);
      await expect(row).toHaveCount(1);
      await expect(avatar).toBeVisible();
      await expect(items).toHaveCount(3);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await first.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
});

function issueFixture(overrides: Record<string, string | number>) {
  return {
    assigneeLabel: "",
    labels: [],
    milestoneTitle: "",
    projectLogoUrl: "/assets/images/default-project-logo.png",
    state: "open",
    updatedLabel: "1 day ago",
    voterCount: 0,
    watcherCount: 0,
    ...overrides,
  };
}

function owner(root: Page | Locator, ownerName: string) {
  return root.locator(`[data-owner="${ownerName}"]`);
}

async function routeFixtureImage(page: Page, imageUrl: string, width: number, height: number) {
  await page.route(imageUrl, (route) =>
    route.fulfill({
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
      contentType: "image/svg+xml",
    }),
  );
}
