import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/postList.tsx", import.meta.url);
const themeSource = new URL("../src/theme.stylex.ts", import.meta.url);
const legacyTemplateSource = new URL(
  "../../yona-original/app/views/site/postList.scala.html",
  import.meta.url,
);
const legacyPageLessSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);

const owners = {
  container: "site-post-list-container",
  info: "site-post-list-info",
  project: "site-post-list-project-link",
  row: "site-post-list-row",
  separator: "site-post-list-separator",
  title: "site-post-list-title-link",
} as const;

async function openPostList(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-post-list-row-content" },
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
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await routeFixtureImage(page, "/assets/images/default-avatar-128.png", 16, 16);
  await routeFixtureImage(page, "/assets/images/default-project-logo.png", 45, 45);

  await page.goto(`${basePath}/sites/postList`);
  const row = owner(page, owners.row);
  await expect(row).toBeVisible();
  return row;
}

test.describe("StyleX site post-list populated row content", () => {
  test("declares the six explicit owners from the exact frozen legacy rules", async () => {
    const [route, theme, template, pageLess] = await Promise.all([
      readFile(routeSource, "utf8"),
      readFile(themeSource, "utf8"),
      readFile(legacyTemplateSource, "utf8"),
      readFile(legacyPageLessSource, "utf8"),
    ]);

    expect(template).toContain('<ul class="post-list-wrap">');
    expect(template).toContain('<li class="row-fluid listitem">');
    expect(template).toContain('<div class="post-info-wrap">');
    expect(template).toContain('class="post-project"');
    expect(template).toContain('<span class="post-info-separator">·</span>');
    expect(template).toContain('class="post-title"');
    expect(pageLess).toContain(`.post-list-wrap {
        list-style: none;

        .listitem {
            padding:10px 0;
        }

        .post-info-wrap {
            line-height: 20px;
            margin-top: 5px;`);
    expect(pageLess).toContain(`.post-project {
                font-size:15px;
                font-weight: bold;
                display:inline-block;
                line-height: 20px;
                color:#0088cc;`);
    expect(pageLess).toContain(`.post-info-separator {
                font-size:15px;
                font-weight: bold;
                padding:0 5px;`);
    expect(pageLess).toContain(`.post-title {
                font-size:15px;
                font-weight: bold;`);

    for (const owner of Object.values(owners)) {
      expect(route).toContain(`data-stylex-owner="${owner}"`);
    }
    expect(route).toContain("styles.postListContainer");
    expect(route).toContain("styles.postListRow");
    expect(route).toContain("styles.postInfo");
    expect(route).toContain("styles.postProjectLink");
    expect(route).toContain("styles.postInfoSeparator");
    expect(route).toContain("styles.postTitleLink");

    for (const variable of [
      "sitePostListContainerListStyle",
      "sitePostListRowPaddingBlock",
      "sitePostListRowPaddingInline",
      "sitePostListInfoLineHeight",
      "sitePostListInfoMarginTop",
      "sitePostListProjectFontSize",
      "sitePostListProjectFontWeight",
      "sitePostListProjectDisplay",
      "sitePostListProjectLineHeight",
      "sitePostListProjectText",
      "sitePostListSeparatorFontSize",
      "sitePostListSeparatorFontWeight",
      "sitePostListSeparatorPaddingInline",
      "sitePostListTitleFontSize",
      "sitePostListTitleFontWeight",
    ]) {
      expect(route).toContain(`globalColors.${variable}`);
      expect(theme).toContain(variable);
    }
  });

  test("keeps copy, order, and semantic destinations inside the populated row", async ({
    page,
  }) => {
    const row = await openPostList(page);
    const avatar = owner(row, "site-post-list-project-avatar");
    const info = owner(row, owners.info);
    const project = owner(info, owners.project);
    const separator = owner(info, owners.separator);
    const title = owner(info, owners.title);
    const meta = row.locator(":scope > .post-meta-wrap");

    await expect(project).toHaveText("acme/roadmap");
    await expect(separator).toHaveText("·");
    await expect(title).toHaveText("Release checklist");
    await expect(project).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(title).toHaveAttribute("href", `${basePath}/acme/roadmap/post/7`);
    expect(
      await row
        .locator(":scope > *")
        .evaluateAll((elements) =>
          elements.map((element) =>
            element.matches('[data-stylex-owner="site-post-list-project-avatar"]')
              ? "avatar"
              : element.matches('[data-stylex-owner="site-post-list-info"]')
                ? "info"
                : element.matches(".post-meta-wrap")
                  ? "meta"
                  : element.tagName,
          ),
        ),
    ).toEqual(["avatar", "info", "meta"]);
    await expect(avatar).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(meta).toContainText("Alice");
    await expect(meta).toContainText("1 day ago");
    await expect(meta).toContainText("3");
  });

  test("retires only fully migrated content fallbacks and keeps shared residual classes", async ({
    page,
  }) => {
    const row = await openPostList(page);
    const container = owner(page, owners.container);
    const info = owner(row, owners.info);
    const project = owner(info, owners.project);
    const separator = owner(info, owners.separator);
    const title = owner(info, owners.title);

    await expect(container).toHaveAttribute("data-stylex-owner", owners.container);
    await expect(row).toHaveAttribute("data-stylex-owner", owners.row);
    await expect(info).toHaveAttribute("data-stylex-owner", owners.info);
    await expect(project).toHaveAttribute("data-stylex-owner", owners.project);
    await expect(separator).toHaveAttribute("data-stylex-owner", owners.separator);
    await expect(title).toHaveAttribute("data-stylex-owner", owners.title);

    // The container and Bootstrap grid class still own frozen responsive/grid declarations.
    await expect(container).toHaveClass(/\bpost-list-wrap\b/u);
    await expect(row).toHaveClass(/\brow-fluid\b/u);
    await expect(row).not.toHaveClass(/\blistitem\b/u);
    for (const [element, retiredClass] of [
      [info, "post-info-wrap"],
      [project, "post-project"],
      [separator, "post-info-separator"],
      [title, "post-title"],
    ] as const) {
      expect(await element.evaluate((node) => Array.from(node.classList))).not.toContain(
        retiredClass,
      );
      expect(
        await element.evaluate((node) =>
          Array.from(node.classList).some((token) => token.startsWith("x")),
        ),
      ).toBe(true);
    }
  });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} typography, containment, flow, and capture`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const row = await openPostList(page);
      const container = owner(page, owners.container);
      const info = owner(row, owners.info);
      const project = owner(info, owners.project);
      const separator = owner(info, owners.separator);
      const title = owner(info, owners.title);
      await expect(container).toHaveCSS("list-style-type", "none");
      await expect(row).toHaveCSS("padding-top", "10px");
      await expect(row).toHaveCSS("padding-right", "0px");
      await expect(row).toHaveCSS("padding-bottom", "10px");
      await expect(row).toHaveCSS("padding-left", "0px");
      await expect(info).toHaveCSS("line-height", "20px");
      await expect(info).toHaveCSS("margin-top", "5px");
      await expect(project).toHaveCSS("font-size", "15px");
      await expect(project).toHaveCSS("font-weight", "700");
      await expect(project).toHaveCSS("display", "inline-block");
      await expect(project).toHaveCSS("line-height", "20px");
      await expect(project).toHaveCSS("color", "rgb(0, 136, 204)");
      await expect(separator).toHaveCSS("font-size", "15px");
      await expect(separator).toHaveCSS("font-weight", "700");
      await expect(separator).toHaveCSS("padding-left", "5px");
      await expect(separator).toHaveCSS("padding-right", "5px");
      await expect(title).toHaveCSS("font-size", "15px");
      await expect(title).toHaveCSS("font-weight", "700");

      const boxes = await row.evaluate((element) => {
        const pick = (selector: string) => {
          const node = element.querySelector<HTMLElement>(selector);
          if (!node) throw new Error(`Missing ${selector}`);
          const { bottom, left, right, top } = node.getBoundingClientRect();
          return { bottom, left, right, top };
        };
        const { bottom, left, right, top } = element.getBoundingClientRect();
        return {
          avatar: pick(':scope > [data-stylex-owner="site-post-list-project-avatar"]'),
          info: pick(':scope > [data-stylex-owner="site-post-list-info"]'),
          meta: pick(":scope > .post-meta-wrap"),
          project: pick(
            ':scope > [data-stylex-owner="site-post-list-info"] > [data-stylex-owner="site-post-list-project-link"]',
          ),
          row: { bottom, left, right, top },
          separator: pick(
            ':scope > [data-stylex-owner="site-post-list-info"] > [data-stylex-owner="site-post-list-separator"]',
          ),
          title: pick(
            ':scope > [data-stylex-owner="site-post-list-info"] > [data-stylex-owner="site-post-list-title-link"]',
          ),
        };
      });

      for (const box of [boxes.avatar, boxes.info, boxes.meta]) {
        expect(box.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
        expect(box.right).toBeLessThanOrEqual(boxes.row.right + 1);
        expect(box.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
        expect(box.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
      }
      expect(boxes.project.right).toBeLessThanOrEqual(boxes.separator.left + 1);
      expect(boxes.separator.right).toBeLessThanOrEqual(boxes.title.left + 1);
      expect(Math.abs(boxes.project.top - boxes.separator.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(boxes.separator.top - boxes.title.top)).toBeLessThanOrEqual(1);
      expect(boxes.info.top).toBeGreaterThanOrEqual(boxes.avatar.top - 1);
      expect(boxes.meta.top).toBeGreaterThanOrEqual(boxes.info.top);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await container.screenshot()).byteLength).toBeGreaterThan(0);
    });
  }
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
