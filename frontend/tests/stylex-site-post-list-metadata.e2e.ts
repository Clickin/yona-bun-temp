import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/postList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const legacyTemplateSource = new URL(
  "../../yona-original/app/views/site/postList.scala.html",
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

const owners = {
  avatar: "site-post-list-author-avatar",
  avatarImage: "site-post-list-author-avatar-image",
  commentsIcon: "site-post-list-comments-icon",
  item: "site-post-list-metadata-item",
  metadata: "site-post-list-metadata",
  row: "site-post-list-row",
} as const;

const defaultAvatarUrl = "/assets/images/default-avatar-128.png";
const customAvatarUrl = "https://www.gravatar.com/avatar/bob-custom?s=16&d=retro";

async function openPostList(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-metadata" },
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
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: defaultAvatarUrl,
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            labels: [],
            notice: false,
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            readme: false,
            title: "Release checklist",
            updatedLabel: "1 day ago",
          },
          {
            authorAvatarUrl: customAvatarUrl,
            authorLabel: "Bob Builder",
            authorLoginId: "bob",
            commentCount: 1,
            createdLabel: "2 hours ago",
            createdTitle: "2026-06-30 11:45",
            labels: [],
            notice: false,
            ownerName: "labs",
            postNumber: "12",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "console",
            readme: false,
            title: "Deployment notes",
            updatedLabel: "2 hours ago",
          },
        ],
        total: 2,
        totalPages: 1,
      },
    }),
  );
  await routeFixtureImage(page, defaultAvatarUrl, 16, 16);
  await routeFixtureImage(page, customAvatarUrl, 16, 16);
  await routeFixtureImage(page, "/assets/images/default-project-logo.png", 45, 45);

  await page.goto(`${basePath}/sites/postList`);
  const rows = owner(page, owners.row);
  await expect(rows).toHaveCount(2);
  return rows;
}

test.describe("StyleX site post-list metadata subtree", () => {
  test("declares the five explicit metadata owners from the frozen final cascade", async () => {
    const [route, theme, template, commonLess, pageLess, yobiUiLess] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyTemplateSource, "utf8"),
      readFile(legacyCommonLessSource, "utf8"),
      readFile(legacyPageLessSource, "utf8"),
      readFile(legacyYobiUiLessSource, "utf8"),
    ]);

    expect(template).toContain('<div class="post-meta-wrap">');
    expect(template).toContain('class="avatar-wrap"');
    expect(template.match(/class="post-meta-item"/gu)).toHaveLength(2);
    expect(template).toContain('class="post-comments post-meta-item"');
    expect(template).toContain('<i class="yobicon-comments"></i>');
    expect(commonLess).toContain(`.avatar-wrap {
    width:32px; height:32px;
    vertical-align:top;
    overflow:hidden; display:inline-block;`);
    expect(yobiUiLess).toContain(`.avatar-wrap {
    width:32px; height:32px; /* default size: medium */
    display:inline-block;
    vertical-align:middle;
    overflow:hidden;
    background:#ddd;`);
    expect(yobiUiLess).toContain(`img {
        width:100%;
        vertical-align:top;`);
    expect(pageLess).toContain(`.post-meta-wrap {
            font-size:11px;
            line-height: 20px;

            .avatar-wrap {
                width:14px;
                height: 14px;
            }

            .post-meta-item {
                margin:0 5px;
            }

            .post-comments {
                i { vertical-align: middle;}`);

    for (const explicitOwner of Object.values(owners).filter((value) => value !== owners.row)) {
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    }
    for (const style of [
      "postMetadata",
      "postAuthorAvatar",
      "postAuthorAvatarImage",
      "postMetadataItem",
      "postCommentsIcon",
    ]) {
      expect(route).toContain(`styles.${style}`);
    }
    for (const variable of [
      "sitePostListMetadataFontSize",
      "sitePostListMetadataLineHeight",
      "sitePostListAuthorAvatarWidth",
      "sitePostListAuthorAvatarHeight",
      "sitePostListAuthorAvatarDisplay",
      "sitePostListAuthorAvatarVerticalAlign",
      "sitePostListAuthorAvatarOverflow",
      "sitePostListAuthorAvatarSurface",
      "sitePostListAuthorAvatarRadius",
      "sitePostListAuthorAvatarImageWidth",
      "sitePostListAuthorAvatarImageVerticalAlign",
      "sitePostListMetadataItemMarginBlock",
      "sitePostListMetadataItemMarginInline",
      "sitePostListCommentsIconVerticalAlign",
    ]) {
      expect(route).toContain(`globalColors.${variable}`);
      expect(theme).toContain(variable);
    }
  });

  test("keeps default and custom avatar branches, copy, order, and semantic destinations", async ({
    page,
  }) => {
    const rows = await openPostList(page);
    const firstMeta = metadata(rows.nth(0));
    const secondMeta = metadata(rows.nth(1));
    const firstItems = metadataItems(firstMeta);
    const secondItems = metadataItems(secondMeta);
    const defaultImage = authorAvatar(firstMeta).locator("img");
    const customImage = authorAvatar(secondMeta).locator("img");

    await expect(firstItems).toHaveCount(3);
    await expect(secondItems).toHaveCount(3);
    await expect(authorAvatar(firstMeta)).toHaveAttribute("href", `${basePath}/alice`);
    await expect(firstItems.nth(0)).toHaveAttribute("href", `${basePath}/alice`);
    await expect(firstItems.nth(0)).toHaveText("Alice");
    await expect(firstItems.nth(1)).toHaveText("1 day ago");
    await expect(firstItems.nth(1)).toHaveAttribute("title", "2026-06-29 14:30");
    await expect(firstItems.nth(2).locator("a")).toHaveAttribute(
      "href",
      `${basePath}/acme/roadmap/post/7#comments`,
    );
    await expect(firstItems.nth(2)).toContainText("3");
    await expect(defaultImage).toHaveAttribute("src", defaultAvatarUrl);
    await expect(defaultImage).not.toHaveAttribute("alt");
    await expect(defaultImage).not.toHaveAttribute("width");
    await expect(defaultImage).not.toHaveAttribute("height");

    await expect(authorAvatar(secondMeta)).toHaveAttribute("href", `${basePath}/bob`);
    await expect(secondItems.nth(0)).toHaveAttribute("href", `${basePath}/bob`);
    await expect(secondItems.nth(0)).toHaveText("Bob Builder");
    await expect(secondItems.nth(1)).toHaveText("2 hours ago");
    await expect(secondItems.nth(1)).toHaveAttribute("title", "2026-06-30 11:45");
    await expect(secondItems.nth(2).locator("a")).toHaveAttribute(
      "href",
      `${basePath}/labs/console/post/12#comments`,
    );
    await expect(secondItems.nth(2)).toContainText("1");
    await expect(customImage).toHaveAttribute("src", customAvatarUrl);
    await expect(customImage).toHaveAttribute("alt", "Bob Builder");
    await expect(customImage).toHaveAttribute("width", "16");
    await expect(customImage).toHaveAttribute("height", "16");

    for (const meta of [firstMeta, secondMeta]) {
      expect(
        await meta.locator(":scope > *").evaluateAll((elements) =>
          elements.map((element) => {
            if (element.matches('[data-stylex-owner="site-post-list-author-avatar"]'))
              return "avatar";
            if (element.matches('[data-stylex-owner="site-post-list-metadata-item"]'))
              return "item";
            return element.tagName;
          }),
        ),
      ).toEqual(["avatar", "item", "item", "item"]);
    }
  });

  test("retires only the fully migrated metadata fallback classes", async ({ page }) => {
    const rows = await openPostList(page);
    for (const row of [rows.nth(0), rows.nth(1)]) {
      const meta = owner(row, owners.metadata);
      const avatar = owner(meta, owners.avatar);
      const avatarImage = owner(avatar, owners.avatarImage);
      const items = owner(meta, owners.item);
      const commentsIcon = owner(meta, owners.commentsIcon);

      await expect(meta).toHaveAttribute("data-stylex-owner", owners.metadata);
      await expect(avatar).toHaveAttribute("data-stylex-owner", owners.avatar);
      await expect(avatarImage).toHaveAttribute("data-stylex-owner", owners.avatarImage);
      await expect(items).toHaveCount(3);
      await expect(commentsIcon).toHaveAttribute("data-stylex-owner", owners.commentsIcon);
      await expect(meta).not.toHaveClass(/\bpost-meta-wrap\b/u);
      await expect(avatar).not.toHaveClass(/\bavatar-wrap\b/u);
      for (const item of await items.all()) {
        await expect(item).not.toHaveClass(/\bpost-meta-item\b/u);
      }
      await expect(items.nth(2)).not.toHaveClass(/\bpost-comments\b/u);
      await expect(commentsIcon).toHaveClass(/\byobicon-comments\b/u);
      for (const element of [meta, avatar, avatarImage, ...(await items.all()), commentsIcon]) {
        expect(
          await element.evaluate((node) =>
            Array.from(node.classList).some((token) => token.startsWith("x")),
          ),
        ).toBe(true);
      }
    }
  });

  test("keeps desktop and mobile metadata geometry, flow, containment, and captures", async ({
    page,
  }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const rows = await openPostList(page);
      for (const row of [rows.nth(0), rows.nth(1)]) {
        const meta = metadata(row);
        const avatar = authorAvatar(meta);
        const avatarImage = avatar.locator("img");
        const items = metadataItems(meta);
        const icon = commentsIcon(meta);
        await expect(meta).toHaveCSS("font-size", "11px");
        await expect(meta).toHaveCSS("line-height", "20px");
        await expect(avatar).toHaveCSS("width", "14px");
        await expect(avatar).toHaveCSS("height", "14px");
        await expect(avatar).toHaveCSS("display", "inline-block");
        await expect(avatar).toHaveCSS("vertical-align", "middle");
        await expect(avatar).toHaveCSS("overflow", "hidden");
        await expect(avatar).toHaveCSS("background-color", "rgb(221, 221, 221)");
        await expect(avatar).toHaveCSS("border-radius", "3px");
        await expect(avatarImage).toHaveCSS("width", "14px");
        await expect(avatarImage).toHaveCSS("vertical-align", "top");
        for (const item of await items.all()) {
          await expect(item).toHaveCSS("margin-top", "0px");
          await expect(item).toHaveCSS("margin-right", "5px");
          await expect(item).toHaveCSS("margin-bottom", "0px");
          await expect(item).toHaveCSS("margin-left", "5px");
        }
        await expect(icon).toHaveCSS("vertical-align", "middle");

        const boxes = await meta.evaluate((element) => {
          const pick = (node: Element) => {
            const { bottom, left, right, top } = node.getBoundingClientRect();
            return { bottom, left, right, top };
          };
          const avatar = element.querySelector(
            ':scope > [data-stylex-owner="site-post-list-author-avatar"]',
          );
          const items = element.querySelectorAll(
            ':scope > [data-stylex-owner="site-post-list-metadata-item"]',
          );
          const row = element.closest('[data-stylex-owner="site-post-list-row"]');
          if (!avatar || items.length !== 3 || !row) throw new Error("Missing metadata geometry");
          return {
            avatar: pick(avatar),
            items: Array.from(items, pick),
            metadata: pick(element),
            row: pick(row),
          };
        });
        for (const box of [boxes.metadata, boxes.avatar, ...boxes.items]) {
          expect(box.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
          expect(box.right).toBeLessThanOrEqual(boxes.row.right + 1);
          expect(box.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
          expect(box.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
        }
        expect(boxes.items[0].left).toBeGreaterThanOrEqual(boxes.avatar.right - 1);
        expect(boxes.items[1].left).toBeGreaterThanOrEqual(boxes.items[0].right - 1);
        expect(boxes.items[2].left).toBeGreaterThanOrEqual(boxes.items[1].right - 1);
        expect(Math.abs(boxes.avatar.top - boxes.items[0].top)).toBeLessThanOrEqual(4);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await metadata(rows.nth(0)).screenshot()).byteLength).toBeGreaterThan(0);
    }
  });
});

function owner(root: Page | Locator, ownerName: string) {
  return root.locator(`[data-stylex-owner="${ownerName}"]`);
}

function metadata(row: Locator) {
  return owner(row, owners.metadata);
}

function authorAvatar(meta: Locator) {
  return owner(meta, owners.avatar);
}

function metadataItems(meta: Locator) {
  return owner(meta, owners.item);
}

function commentsIcon(meta: Locator) {
  return owner(meta, owners.commentsIcon);
}

async function routeFixtureImage(page: Page, imageUrl: string, width: number, height: number) {
  await page.route(imageUrl, (route) =>
    route.fulfill({
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
      contentType: "image/svg+xml",
    }),
  );
}
