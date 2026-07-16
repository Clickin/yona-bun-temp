import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/postList.tsx", import.meta.url);
const themeSource = new URL("../src/routes/sites/-postList.stylex.ts", import.meta.url);
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
const appCssSource = new URL("../src/app.css", import.meta.url);

const owners = {
  avatar: "site-post-list-project-avatar",
  avatarImage: "site-post-list-project-avatar-image",
  info: "site-post-list-info",
  project: "site-post-list-project-link",
  row: "site-post-list-row",
  title: "site-post-list-title-link",
} as const;

async function openPostList(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-row-avatar" },
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
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
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
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Bob",
            authorLoginId: "bob",
            commentCount: 1,
            createdLabel: "2 days ago",
            createdTitle: "2026-06-28 09:00",
            labels: [],
            notice: false,
            ownerName: "labs",
            postNumber: "12",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "console",
            readme: false,
            title: "Deployment notes",
            updatedLabel: "2 days ago",
          },
        ],
        total: 2,
        totalPages: 1,
      },
    }),
  );
  await routeFixtureImage(page, "/assets/images/default-avatar-128.png", 16, 16);
  await routeFixtureImage(page, "/assets/images/default-project-logo.png", 45, 45);

  await page.goto(`${basePath}/sites/postList`);
  const rows = owner(page, owners.row);
  await expect(rows).toHaveCount(2);
  return rows;
}

test.describe("StyleX site post-list row and project avatar", () => {
  test("declares the three explicit owners from the frozen final cascade", async () => {
    const [route, theme, template, commonLess, pageLess, yobiUiLess, appCss] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyTemplateSource, "utf8"),
      readFile(legacyCommonLessSource, "utf8"),
      readFile(legacyPageLessSource, "utf8"),
      readFile(legacyYobiUiLessSource, "utf8"),
      readFile(appCssSource, "utf8"),
    ]);

    expect(template).toContain('<li class="row-fluid listitem">');
    expect(template).toContain('class="avatar-wrap list-avatar"');
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
    expect(pageLess).toContain(`.listitem {
        border-bottom:1px solid #efefef;
        line-height: 70px;`);
    expect(pageLess).toContain(`&.list-avatar {
                width:45px;
                height:45px;
                margin-right: 10px;
                margin-top:3px;
                float:left;`);
    expect(appCss).toContain(`.site-setting-wrap .listitem .avatar-wrap.list-avatar img {
  width: 32px;
  height: 32px;`);

    for (const explicitOwner of [owners.row, owners.avatar, owners.avatarImage]) {
      expect(route).toContain(`data-stylex-owner="${explicitOwner}"`);
    }
    expect(route).toContain("styles.postListRow");
    expect(route).toContain("styles.postListProjectAvatar");
    expect(route).toContain("styles.postListProjectAvatarImage");

    // The previous row-padding declarations must remain composed into the expanded owner.
    expect(route).toContain('paddingBlock: "10px"');
    expect(route).toContain('paddingInline: "0px"');
    for (const variable of [
      "sitePostListRowBorder",
      "sitePostListRowBorderStyle",
      "sitePostListRowBorderWidth",
      "sitePostListRowLineHeight",
      "sitePostListRowEvenSurface",
      "sitePostListAvatarWidth",
      "sitePostListAvatarHeight",
      "sitePostListAvatarMarginRight",
      "sitePostListAvatarMarginTop",
      "sitePostListAvatarFloat",
      "sitePostListAvatarDisplay",
      "sitePostListAvatarVerticalAlign",
      "sitePostListAvatarOverflow",
      "sitePostListAvatarSurface",
      "sitePostListAvatarRadius",
      "sitePostListAvatarImageWidth",
      "sitePostListAvatarImageVerticalAlign",
    ]) {
      expect(route).not.toContain("globalColors.");
      expect(theme).not.toContain(variable);
    }
  });

  test("keeps populated-row copy, order, and semantic destinations", async ({ page }) => {
    const rows = await openPostList(page);
    const first = rows.nth(0);
    const avatar = owner(first, owners.avatar);
    const info = owner(first, owners.info);
    const project = owner(info, owners.project);
    const title = owner(info, owners.title);
    const meta = first.locator(':scope > [data-stylex-owner="site-post-list-metadata"]');

    await expect(project).toHaveText("acme/roadmap");
    await expect(title).toHaveText("Release checklist");
    await expect(project).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(title).toHaveAttribute("href", `${basePath}/acme/roadmap/post/7`);
    await expect(avatar).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(avatar.locator("img")).toHaveAttribute("alt", "roadmap");
    await expect(meta).toContainText("Alice");
    expect(
      await first.locator(":scope > *").evaluateAll((elements) =>
        elements.map((element) => {
          const ownerName = element.getAttribute("data-stylex-owner");
          if (ownerName === "site-post-list-project-avatar") return "avatar";
          if (ownerName === "site-post-list-info") return "info";
          if (element.matches('[data-stylex-owner="site-post-list-metadata"]')) return "meta";
          return element.tagName;
        }),
      ),
    ).toEqual(["avatar", "info", "meta"]);
  });

  test("retires the three fully migrated fallbacks and restores the 45px image", async ({
    page,
  }) => {
    const rows = await openPostList(page);
    const first = rows.nth(0);
    const second = rows.nth(1);
    const avatar = owner(first, owners.avatar);
    const avatarImage = owner(avatar, owners.avatarImage);

    await expect(first).toHaveAttribute("data-stylex-owner", owners.row);
    await expect(avatar).toHaveAttribute("data-stylex-owner", owners.avatar);
    await expect(avatarImage).toHaveAttribute("data-stylex-owner", owners.avatarImage);
    await expect(first).not.toHaveClass(/\brow-fluid\b/u);
    await expect(first).not.toHaveClass(/\blistitem\b/u);
    await expect(avatar).not.toHaveClass(/\bavatar-wrap\b/u);
    await expect(avatar).not.toHaveClass(/\blist-avatar\b/u);
    for (const element of [first, avatar, avatarImage]) {
      expect(
        await element.evaluate((node) =>
          Array.from(node.classList).some((token) => token.startsWith("x")),
        ),
      ).toBe(true);
    }

    await expect(first).toHaveCSS("padding-top", "10px");
    await expect(first).toHaveCSS("padding-right", "0px");
    await expect(first).toHaveCSS("padding-bottom", "10px");
    await expect(first).toHaveCSS("padding-left", "0px");
    await expect(first).toHaveCSS("border-bottom-color", "rgb(239, 239, 239)");
    await expect(first).toHaveCSS("border-bottom-style", "solid");
    await expect(first).toHaveCSS("border-bottom-width", "1px");
    await expect(first).toHaveCSS("line-height", "70px");
    await expect(first).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(second).toHaveCSS("background-color", "rgb(249, 249, 249)");
    await expect(avatar).toHaveCSS("width", "45px");
    await expect(avatar).toHaveCSS("height", "45px");
    await expect(avatar).toHaveCSS("margin-right", "10px");
    await expect(avatar).toHaveCSS("margin-top", "3px");
    await expect(avatar).toHaveCSS("float", "left");
    await expect(avatar).toHaveCSS("display", "block");
    await expect(avatar).toHaveCSS("vertical-align", "middle");
    await expect(avatar).toHaveCSS("overflow", "hidden");
    await expect(avatar).toHaveCSS("background-color", "rgb(221, 221, 221)");
    await expect(avatar).toHaveCSS("border-radius", "3px");
    await expect(avatarImage).toHaveCSS("width", "45px");
    await expect(avatarImage).toHaveCSS("height", "45px");
    await expect(avatarImage).toHaveCSS("vertical-align", "top");
  });

  test("keeps desktop and mobile avatar flow, containment, and captures", async ({ page }) => {
    for (const viewport of [
      { height: 900, name: "desktop", width: 1366 },
      { height: 844, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize(viewport);
      const rows = await openPostList(page);
      const first = rows.nth(0);
      const avatar = owner(first, owners.avatar);
      const avatarImage = avatar.locator("img");
      await expect(first).toHaveCSS("border-bottom-color", "rgb(239, 239, 239)");
      await expect(first).toHaveCSS("border-bottom-style", "solid");
      await expect(first).toHaveCSS("border-bottom-width", "1px");
      await expect(first).toHaveCSS("line-height", "70px");
      await expect(rows.nth(1)).toHaveCSS("background-color", "rgb(249, 249, 249)");
      await expect(avatar).toHaveCSS("width", "45px");
      await expect(avatar).toHaveCSS("height", "45px");
      await expect(avatar).toHaveCSS("margin-right", "10px");
      await expect(avatar).toHaveCSS("margin-top", "3px");
      await expect(avatar).toHaveCSS("float", "left");
      await expect(avatar).toHaveCSS("display", "block");
      await expect(avatar).toHaveCSS("vertical-align", "middle");
      await expect(avatar).toHaveCSS("overflow", "hidden");
      await expect(avatar).toHaveCSS("background-color", "rgb(221, 221, 221)");
      await expect(avatar).toHaveCSS("border-radius", "3px");
      await expect(avatarImage).toHaveCSS("vertical-align", "top");
      const boxes = await first.evaluate((element) => {
        const pick = (selector: string) => {
          const node = element.querySelector<HTMLElement>(selector);
          if (!node) throw new Error(`Missing ${selector}`);
          const { bottom, height, left, right, top, width } = node.getBoundingClientRect();
          return { bottom, height, left, right, top, width };
        };
        const { bottom, left, right, top } = element.getBoundingClientRect();
        const avatar = element.querySelector<HTMLElement>(
          ':scope > [data-stylex-owner="site-post-list-project-avatar"]',
        );
        if (!avatar) throw new Error("Missing project avatar");
        const imageSelector = '[data-stylex-owner="site-post-list-project-avatar-image"]';
        return {
          avatar: pick(':scope > [data-stylex-owner="site-post-list-project-avatar"]'),
          imageActual: (() => {
            const image = avatar.querySelector<HTMLElement>(imageSelector);
            if (!image) throw new Error("Missing project avatar image");
            const { bottom, height, left, right, top, width } = image.getBoundingClientRect();
            return { bottom, height, left, right, top, width };
          })(),
          info: pick(':scope > [data-stylex-owner="site-post-list-info"]'),
          meta: pick(':scope > [data-stylex-owner="site-post-list-metadata"]'),
          project: pick(
            ':scope > [data-stylex-owner="site-post-list-info"] > [data-stylex-owner="site-post-list-project-link"]',
          ),
          row: { bottom, left, right, top },
        };
      });

      expect(boxes.avatar.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
      expect(boxes.avatar.right).toBeLessThanOrEqual(boxes.row.right + 1);
      expect(boxes.avatar.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
      expect(boxes.avatar.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
      expect(boxes.imageActual.left).toBeGreaterThanOrEqual(boxes.avatar.left - 1);
      expect(boxes.imageActual.top).toBeGreaterThanOrEqual(boxes.avatar.top - 1);
      expect(boxes.imageActual.right).toBeLessThanOrEqual(boxes.avatar.right + 1);
      expect(boxes.imageActual.bottom).toBeLessThanOrEqual(boxes.avatar.bottom + 1);
      expect(boxes.project.left).toBeGreaterThanOrEqual(boxes.avatar.right - 1);
      expect(boxes.meta.top).toBeGreaterThanOrEqual(boxes.info.top);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await owner(page, "site-post-list-container").screenshot()).byteLength,
      ).toBeGreaterThan(0);

      // Preserve the stable DOM handles while changing viewport in this same browser page.
      await expect(avatar).toBeVisible();
      await expect(avatarImage).toBeVisible();
    }
  });
});

function owner(root: Page | Locator, ownerName: string) {
  return root.locator(`[data-stylex-owner="${ownerName}"]`);
}

async function routeFixtureImage(page: Page, imageUrl: string, width: number, height: number) {
  await page.route(imageUrl, (route) =>
    route.fulfill({
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`,
      contentType: "image/svg+xml",
    }),
  );
}
