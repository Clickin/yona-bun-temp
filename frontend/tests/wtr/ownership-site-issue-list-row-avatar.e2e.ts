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
const appCssSource = new URL("../src/app.css", import.meta.url);

const owners = {
  avatar: "site-issue-list-project-avatar",
  avatarImage: "site-issue-list-project-avatar-image",
  info: "site-issue-list-info",
  project: "site-issue-list-project-link",
  row: "site-issue-list-row",
  title: "site-issue-list-title-link",
} as const;

async function openIssueList(page: Page) {
  const fulfillSession = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-site-issue-list-row-avatar" },
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
            authorLabel: "Alice",
            authorLoginId: "alice",
            issueNumber: "42",
            ownerName: "acme",
            projectName: "roadmap",
            title: "Fix release blocker",
          }),
          issueFixture({
            authorLabel: "Bob",
            authorLoginId: "bob",
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
  await routeFixtureImage(page, "https://www.gravatar.com/avatar/default?s=16", 16, 16);

  await page.goto(`${basePath}/sites/issueList?state=open`);
  const rows = owner(page, owners.row);
  await expect(rows).toHaveCount(2);
  return rows;
}

test.describe("Style site issue-list row and project avatar", () => {
  test("declares the three explicit owners from the frozen final cascade", async () => {
    const [route, theme, template, commonLess, pageLess, yobiUiLess, appCss] = await Promise.all([
      readFile(routeSource, "utf8"),
      Promise.resolve(curatedAppCss()),
      readFile(legacyTemplateSource, "utf8"),
      readFile(legacyCommonLessSource, "utf8"),
      readFile(legacyPageLessSource, "utf8"),
      readFile(legacyYobiUiLessSource, "utf8"),
      Promise.resolve(curatedAppCss()),
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
    expect(appCss).not.toContain(".site-setting-wrap .listitem .avatar-wrap.list-avatar img {");

    for (const explicitOwner of [owners.row, owners.avatar, owners.avatarImage]) {
      expect(route).toContain(`data-owner="${explicitOwner}"`);
    }

    for (const variable of [
      "siteIssueListRowBorder",
      "siteIssueListRowBorderStyle",
      "siteIssueListRowBorderWidth",
      "siteIssueListRowLineHeight",
      "siteIssueListRowEvenSurface",
      "siteIssueListAvatarWidth",
      "siteIssueListAvatarHeight",
      "siteIssueListAvatarMarginRight",
      "siteIssueListAvatarMarginTop",
      "siteIssueListAvatarFloat",
      "siteIssueListAvatarDisplay",
      "siteIssueListAvatarVerticalAlign",
      "siteIssueListAvatarOverflow",
      "siteIssueListAvatarSurface",
      "siteIssueListAvatarRadius",
      "siteIssueListAvatarImageWidth",
      "siteIssueListAvatarImageVerticalAlign",
    ]) {
      expect(theme).not.toContain(variable);
    }
  });

  test("keeps populated-row copy, order, destinations, image semantics, and open state", async ({
    page,
  }) => {
    const rows = await openIssueList(page);
    const first = rows.nth(0);
    const avatar = owner(first, owners.avatar);
    const info = owner(first, owners.info);
    const project = owner(info, owners.project);
    const title = owner(info, owners.title);
    const meta = owner(first, "site-issue-list-metadata");

    await expect(project).toHaveText("acme/roadmap");
    await expect(title).toHaveText("Fix release blocker");
    await expect(project).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(title).toHaveAttribute("href", `${basePath}/acme/roadmap/issue/42`);
    await expect(avatar).toHaveAttribute("href", `${basePath}/acme/roadmap`);
    await expect(avatar.locator("img")).toHaveAttribute(
      "src",
      "/assets/images/default-project-logo.png",
    );
    await expect(avatar.locator("img")).toHaveAttribute("alt", "roadmap");
    await expect(meta).toContainText("Alice");
    expect(new URL(page.url()).searchParams.get("state")).toBe("open");
    // wtr-compat scopedChild resolution ignores the parent index (bucket-1
    // gap): nth(N).locator(":scope > *") returns children of ALL matches.
    // evaluate on the indexed element is the equivalent supported API.
    expect(
      await first.evaluate((element) =>
        Array.from(element.children).map((child) => {
          const ownerName = child.getAttribute("data-owner");
          if (ownerName === "site-issue-list-project-avatar") return "avatar";
          if (ownerName === "site-issue-list-info") return "info";
          if (ownerName === "site-issue-list-metadata") return "meta";
          return child.tagName;
        }),
      ),
    ).toEqual(["avatar", "info", "meta"]);
  });

  test("retires only the three migrated fallbacks and restores the 45px image", async ({
    page,
  }) => {
    const rows = await openIssueList(page);
    await loadFixtureLogo(page);
    const first = rows.nth(0);
    const second = rows.nth(1);
    const avatar = owner(first, owners.avatar);
    const avatarImage = owner(avatar, owners.avatarImage);

    await expect(first).not.toHaveClass(/\brow-fluid\b/u);
    await expect(first).not.toHaveClass(/\blistitem\b/u);
    await expect(avatar).not.toHaveClass(/\bavatar-wrap\b/u);
    await expect(avatar).not.toHaveClass(/\blist-avatar\b/u);
    await expect(owner(first, "site-issue-list-author-avatar")).toHaveCount(1);
    await expect(owner(first, "site-issue-list-metadata-item")).toHaveCount(3);
    for (const element of [first, avatar, avatarImage]) {
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

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ]) {
    test(`keeps ${viewport.name} avatar flow, containment, no overflow, and capture`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const rows = await openIssueList(page);
      await loadFixtureLogo(page);
      const first = rows.nth(0);
      const avatar = owner(first, owners.avatar);
      const avatarImage = owner(avatar, owners.avatarImage);
      await expect(avatar).toHaveCSS("float", "left");
      await expect(avatar).toHaveCSS("display", "block");
      await expect(avatarImage).toHaveCSS("width", "45px");
      await expect(rows.nth(1)).toHaveCSS("background-color", "rgb(249, 249, 249)");

      const boxes = await first.evaluate((element) => {
        const pick = (selector: string) => {
          const node = element.querySelector<HTMLElement>(selector);
          if (!node) throw new Error(`Missing ${selector}`);
          const { bottom, height, left, right, top, width } = node.getBoundingClientRect();
          return { bottom, height, left, right, top, width };
        };
        const { bottom, left, right, top } = element.getBoundingClientRect();
        return {
          avatar: pick(':scope > [data-owner="site-issue-list-project-avatar"]'),
          image: pick(
            ':scope > [data-owner="site-issue-list-project-avatar"] > [data-owner="site-issue-list-project-avatar-image"]',
          ),
          info: pick(':scope > [data-owner="site-issue-list-info"]'),
          meta: pick(':scope > [data-owner="site-issue-list-metadata"]'),
          project: pick(
            ':scope > [data-owner="site-issue-list-info"] > [data-owner="site-issue-list-project-link"]',
          ),
          row: { bottom, left, right, top },
        };
      });

      expect(boxes.avatar.left).toBeGreaterThanOrEqual(boxes.row.left - 1);
      expect(boxes.avatar.right).toBeLessThanOrEqual(boxes.row.right + 1);
      expect(boxes.avatar.top).toBeGreaterThanOrEqual(boxes.row.top - 1);
      expect(boxes.avatar.bottom).toBeLessThanOrEqual(boxes.row.bottom + 1);
      expect(boxes.image.width).toBeCloseTo(45, 0);
      expect(boxes.image.height).toBeCloseTo(45, 0);
      expect(boxes.image.left).toBeGreaterThanOrEqual(boxes.avatar.left - 1);
      expect(boxes.image.right).toBeLessThanOrEqual(boxes.avatar.right + 1);
      expect(boxes.project.left).toBeGreaterThanOrEqual(boxes.avatar.right - 1);
      expect(boxes.meta.top).toBeGreaterThanOrEqual(boxes.info.top);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(
        (await owner(page, "site-issue-list-container").screenshot()).byteLength,
      ).toBeGreaterThan(0);
    });
  }
});

function issueFixture(overrides: {
  authorLabel: string;
  authorLoginId: string;
  issueNumber: string;
  ownerName: string;
  projectName: string;
  title: string;
}) {
  return {
    assigneeLabel: "",
    authorAvatarUrl: "https://www.gravatar.com/avatar/default?s=16",
    commentCount: 5,
    createdLabel: "1 day ago",
    createdTitle: "2026-06-29 13:00",
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

// wtr-compat mocks fetch() only; native <img> loads bypass page.route, so the
// fixture logo 404s and renders broken (bucket-1 gap). Swap it for an
// equivalent 45x45 data: URI inside tests that assert the image's computed
// size; src-attribute assertions keep the original URL.
async function loadFixtureLogo(page: Page) {
  await page.evaluate(() => {
    const dataUri =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45'/%3E";
    for (const img of document.querySelectorAll<HTMLImageElement>(
      'img[src="/assets/images/default-project-logo.png"]',
    ))
      img.src = dataUri;
  });
}
