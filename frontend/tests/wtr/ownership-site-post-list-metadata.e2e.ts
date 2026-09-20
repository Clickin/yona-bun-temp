import { expect, test, type Locator, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// TemplateHelper.agoOrDateString uses elapsed whole days/hours below eight days.
const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1_000).toISOString();
const twoHoursAgo = new Date(Date.now() - 150 * 60 * 1_000).toISOString();

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
            createdTitle: yesterday,
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
            createdTitle: twoHoursAgo,
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

test.describe("Style site post-list metadata subtree", () => {
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
    await expect(secondItems.nth(1)).toHaveAttribute(
      "title",
      /^\d{4}-\d{2}-\d{2} \d{1,2}:\d{2}:\d{2} (AM|PM)$/u,
    );
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
            if (element.matches('[data-owner="site-post-list-author-avatar"]')) return "avatar";
            if (element.matches('[data-owner="site-post-list-metadata-item"]')) return "item";
            return element.tagName;
          }),
        ),
      ).toEqual(["avatar", "item", "item", "item"]);
    }
  });

  test("preserves the visible comments glyph", async ({ page }) => {
    const rows = await openPostList(page);
    for (const row of [rows.nth(0), rows.nth(1)]) {
      const meta = owner(row, owners.metadata);
      const commentsIcon = owner(meta, owners.commentsIcon);
      await expect(commentsIcon).toHaveCSS("display", "inline-block");
      await expect(commentsIcon).toHaveCSS("font-family", "yobicon");
      await expect(commentsIcon).toHaveCSS("font-style", "normal");
      await expect(commentsIcon).toHaveCSS("font-variant", "normal");
      await expect(commentsIcon).toHaveCSS("font-weight", "400");
      await expect(commentsIcon).toHaveCSS("line-height", "11px");
      await expect(commentsIcon).toHaveCSS("text-decoration-line", "none");
      await expect(commentsIcon).toHaveCSS("background-image", "none");
      expect(
        await commentsIcon.evaluate((node) => getComputedStyle(node, "::before").content),
      ).toBe('"\ue4b7"');
    }
  });

  test("keeps desktop and mobile metadata geometry, flow, and containment", async ({ page }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const rows = await openPostList(page);
      // wtr-compat mocks fetch() only; native <img> loads bypass page.route, so
      // the default avatar 404s and its broken-image box computes 16px instead
      // of the 14px width:100% target. Swap both avatars to a data: URI so the
      // geometry assertions resolve deterministically (loadFixtureLogo
      // precedent); src-attribute pins elsewhere keep the original URLs.
      await page.evaluate(() => {
        const dataUri =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'/%3E";
        for (const img of document.querySelectorAll<HTMLImageElement>(
          '[data-owner="site-post-list-author-avatar"] img',
        ))
          img.src = dataUri;
      });
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
            ':scope > [data-owner="site-post-list-author-avatar"]',
          );
          const items = element.querySelectorAll(
            ':scope > [data-owner="site-post-list-metadata-item"]',
          );
          const row = element.closest('[data-owner="site-post-list-row"]');
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
        expect(boxes.items[0].left - boxes.avatar.right).toBeGreaterThan(5);
        expect(boxes.items[1].left).toBeGreaterThanOrEqual(boxes.items[0].right - 1);
        expect(boxes.items[2].left).toBeGreaterThanOrEqual(boxes.items[1].right - 1);
        expect(Math.abs(boxes.avatar.top - boxes.items[0].top)).toBeLessThanOrEqual(4);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
  });
});

function owner(root: Page | Locator, ownerName: string) {
  return root.locator(`[data-owner="${ownerName}"]`);
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
