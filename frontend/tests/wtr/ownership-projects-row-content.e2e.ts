import { readFileSync, readFile } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const avatarOwner = "projects-directory-owner-avatar";
const descriptionOwner = "projects-directory-description";
const headerOwner = "projects-directory-header";
const nameTagOwner = "projects-directory-name-tag";
const statsOwner = "projects-directory-stats";
// wtr-compat readFileSync's binary branch sets responseType=arraybuffer on a
// synchronous XHR, which documents reject (InvalidAccessError) — bucket-1 gap
// reported to main. readFile (async fetch) returns the PNG bytes; btoa keeps
// the original data-URL semantics.
const memberAvatarDataUrl = `data:image/png;base64,${btoa(
  String.fromCharCode(
    ...((await readFile(
      resolve("src/assets/legacy/default-avatar-34.png"),
    )) as unknown as Uint8Array),
  ),
)}`;
test.use({ locale: "ko-KR" });

async function open(page: Page) {
  await page.addInitScript((basePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: 1,
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            overview: "Protected organization project for localhost parity",
            ownerName: "weblabs",
            projectName: "portal",
            projectScope: "protected",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [{ avatarUrl: memberAvatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "",
            logoUrl: "",
            memberCount: 1,
            members: [
              { avatarUrl: memberAvatarDataUrl, loginId: "admin", userLabel: "Site Admin" },
            ],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            labels: [],
            lastPushedLabel: "5일 전",
            logoUrl: "",
            memberCount: 1,
            members: [
              { avatarUrl: memberAvatarDataUrl, loginId: "admin", userLabel: "Site Admin" },
            ],
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 4,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-owner="${avatarOwner}"]`).nth(1)).toBeVisible();
}

test("row content records exactly four owners and the fallback boundaries", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");
  const allProjectsBlock = pageLess.slice(
    pageLess.indexOf(".all-projects {"),
    pageLess.indexOf("// -- userinfo -- //", pageLess.indexOf(".all-projects {")),
  );
  const ownerAvatarBlock = allProjectsBlock.slice(
    allProjectsBlock.indexOf(".owner-avatar-wrap {"),
    allProjectsBlock.indexOf(".header {", allProjectsBlock.indexOf(".owner-avatar-wrap {")),
  );
  expect(scala).toContain("@siteLayout(message, utils.MenuType.PROJECTS)");
  expect(scala).toContain('<div class="owner-avatar-wrap">');
  expect(scala).toContain('<div class="header">');
  expect(scala).toContain('<div class="desc">');
  expect(scala).toContain('<p class="name-tag">');
  expect(siteLayout).toContain('@layout(Messages(title))("")');
  expect(yobi).toContain('@import "less/_page.less";');
  expect(messages).toContain("project.codeUpdate = 마지막 코드 업데이트");
  expect(ownerAvatarBlock).toContain("border-radius: 3px !important;");
  expect(ownerAvatarBlock).toMatch(
    /img\s*\{\s*vertical-align:\s*top;\s*width:\s*100%;\s*height:\s*100%;/u,
  );
  expect(pageLess).toContain(".yobicon-lock { color:#7F8C8D;}");
  expect(bootstrap).toMatch(/body\s*\{[\s\S]*?line-height:\s*20px;/u);
  for (const owner of [avatarOwner, headerOwner, descriptionOwner, nameTagOwner, statsOwner])
    expect(route).toContain(`data-owner="${owner}"`);
  expect(route).not.toContain("owner-avatar-wrap");
  expect(route).not.toContain("className={`header ");
  expect(route).not.toContain('<div className="desc">');
  expect(route).not.toContain('<p className="name-tag">');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`row content preserves exact ${viewport.name} geometry and declarations`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const row = page.locator('[data-owner="projects-directory-row"]').nth(1);
    const avatar = row.locator(`[data-owner="${avatarOwner}"]`);
    const header = row.locator(`[data-owner="${headerOwner}"]`);
    const description = row.locator(`[data-owner="${descriptionOwner}"]`);
    const nameTag = row.locator(`[data-owner="${nameTagOwner}"]`);
    await expect(avatar).not.toHaveClass(/(?:^|\s)owner-avatar-wrap(?:\s|$)/u);
    await expect(header).not.toHaveClass(/(?:^|\s)header(?:\s|$)/u);
    await expect(description).not.toHaveClass(/(?:^|\s)desc(?:\s|$)/u);
    await expect(nameTag).not.toHaveClass(/(?:^|\s)name-tag(?:\s|$)/u);
    await expect(avatar.locator(":scope > a")).toHaveCount(1);
    await expect(avatar.locator(":scope > a > img")).toHaveCount(0);
    await expect(
      header.locator(':scope > [data-owner="projects-directory-title-link"]'),
    ).toHaveText("sample");
    await expect(description).toHaveText("Parity seed project for the alice workspace");
    await expect(nameTag).toContainText("by alice at 07-07");

    const actual = await page.evaluate(
      ({ avatarOwner, descriptionOwner, headerOwner, nameTagOwner, statsOwner }) => {
        const elements = [avatarOwner, headerOwner, descriptionOwner, nameTagOwner, statsOwner].map(
          (owner) => document.querySelectorAll<HTMLElement>(`[data-owner="${owner}"]`)[1]!,
        );
        const [avatar, header, description, nameTag, stats] = elements;
        const box = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
        };
        const avatarStyle = getComputedStyle(avatar!);
        const headerStyle = getComputedStyle(header!);
        const descriptionStyle = getComputedStyle(description!);
        const nameTagStyle = getComputedStyle(nameTag!);
        const statsStyle = getComputedStyle(stats!);
        const row = avatar!.closest<HTMLElement>('[data-owner="projects-directory-row"]')!;
        const rowBox = box(row);
        return {
          boxes: {
            avatar: box(avatar!),
            description: box(description!),
            header: box(header!),
            nameTag: box(nameTag!),
            row: rowBox,
          },
          avatar: {
            borderRadius: avatarStyle.borderRadius,
            display: avatarStyle.display,
            float: avatarStyle.cssFloat,
            marginRight: avatarStyle.marginRight,
            overflow: avatarStyle.overflow,
            position: avatarStyle.position,
          },
          description: {
            color: descriptionStyle.color,
            lineHeight: descriptionStyle.lineHeight,
            marginLeft: descriptionStyle.marginLeft,
            maxHeight: descriptionStyle.maxHeight,
            maxWidth: descriptionStyle.maxWidth,
            overflowY: descriptionStyle.overflowY,
            textOverflow: descriptionStyle.textOverflow,
          },
          header: {
            fontSize: headerStyle.fontSize,
            fontWeight: headerStyle.fontWeight,
            lineHeight: headerStyle.lineHeight,
            margin: headerStyle.margin,
          },
          nameTag: {
            color: nameTagStyle.color,
            fontSize: nameTagStyle.fontSize,
            lineHeight: nameTagStyle.lineHeight,
            margin: nameTagStyle.margin,
          },
          stats: { lineHeight: statsStyle.lineHeight },
          scrollWidth: document.documentElement.scrollWidth,
        };
      },
      { avatarOwner, descriptionOwner, headerOwner, nameTagOwner, statsOwner },
    );
    const contentWidth = viewport.name === "desktop" ? 257.65625 : 257.65625;
    expect(actual.boxes).toEqual({
      avatar: {
        height: 50,
        width: 50,
        x: viewport.name === "desktop" ? 10 : 0,
        y: viewport.name === "desktop" ? 307 : 360,
      },
      description: {
        height: 20,
        width: contentWidth,
        x: viewport.name === "desktop" ? 80 : 70,
        y: viewport.name === "desktop" ? 332 : 385,
      },
      header: {
        height: 20,
        width: contentWidth,
        x: viewport.name === "desktop" ? 80 : 70,
        y: viewport.name === "desktop" ? 307 : 360,
      },
      nameTag: {
        height: 20,
        width: contentWidth,
        x: viewport.name === "desktop" ? 80 : 70,
        y: viewport.name === "desktop" ? 352 : 405,
      },
      row: {
        height: viewport.name === "desktop" ? 91 : 151,
        width: viewport.name === "desktop" ? 1346 : 390,
        x: viewport.name === "desktop" ? 10 : 0,
        y: viewport.name === "desktop" ? 292 : 345,
      },
    });
    expect(actual.avatar).toEqual({
      borderRadius: "3px",
      display: "block",
      float: "left",
      marginRight: "10px",
      overflow: "hidden",
      position: "relative",
    });
    expect(actual.header).toEqual({
      fontSize: "20px",
      fontWeight: "700",
      lineHeight: "20px",
      margin: "0px 0px 5px 10px",
    });
    expect(actual.description).toEqual({
      color: "rgb(186, 186, 186)",
      lineHeight: "20px",
      marginLeft: "10px",
      maxHeight: "100px",
      maxWidth: "647px",
      overflowY: "auto",
      textOverflow: "ellipsis",
    });
    expect(actual.nameTag).toEqual({
      color: "rgb(153, 153, 153)",
      fontSize: "11px",
      lineHeight: "20px",
      margin: "0px 0px 0px 10px",
    });
    expect(actual.stats).toEqual({ lineHeight: "20px" });
    expect(actual.scrollWidth).toBe(viewport.width);
    expect(actual.boxes.avatar.y).toBe(actual.boxes.header.y);
    expect(actual.boxes.description.y).toBe(actual.boxes.header.y + actual.boxes.header.height + 5);
    expect(actual.boxes.nameTag.y).toBe(
      actual.boxes.description.y + actual.boxes.description.height,
    );
    expect(actual.boxes.nameTag.y + actual.boxes.nameTag.height).toBeLessThanOrEqual(
      actual.boxes.row.y + actual.boxes.row.height,
    );
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    expect(
      (
        await row.screenshot({
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `style-projects-row-content-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
