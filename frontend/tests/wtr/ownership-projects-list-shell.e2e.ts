import { readFileSync, readFile } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
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
const listOwner = "projects-directory-list";
const rowOwner = "projects-directory-row";
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
            members: [
              {
                avatarUrl: memberAvatarDataUrl,
                loginId: "alice",
                userLabel: "Alice Kim",
              },
            ],
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
              {
                avatarUrl: memberAvatarDataUrl,
                loginId: "admin",
                userLabel: "Site Admin",
              },
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
              {
                avatarUrl: memberAvatarDataUrl,
                loginId: "admin",
                userLabel: "Site Admin",
              },
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
  await expect(page.locator(`[data-owner="${listOwner}"]`)).toBeVisible();
}

test("list shell records the two direct Style owners", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  expect(scala).toContain('<ul class="all-projects">');
  expect(scala).toContain('<li class="project">');
  expect(siteLayout).toContain('@layout(Messages(title))("")');
  expect(yobi).toContain("_page.less");
  expect(pageLess).toContain(".all-projects {");
  expect(pageLess).toContain("border-bottom: 1px solid #DCDCDC;");
  expect(bootstrap).toContain("ul,\nol {");
  expect(route).toContain(`data-owner="${listOwner}"`);
  expect(route).toContain(`data-owner="${rowOwner}"`);
  expect(route).not.toMatch(/className=.*all-projects/u);
  expect(route).not.toMatch(/className="project(?:\s|")/u);
  expect(route).not.toContain('className="info-wrap"');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`list shell preserves exact ${viewport.name} geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const list = page.locator(`[data-owner="${listOwner}"]`);
    const rows = list.locator(`:scope > li[data-owner="${rowOwner}"]`);
    await expect(rows).toHaveCount(4);
    for (const row of await rows.all()) {
      const logoLink = row.locator(
        ':scope > div > [data-owner="projects-directory-owner-avatar"] > a',
      );
      await expect(logoLink).toHaveCount(1);
      await expect(logoLink.locator(":scope > img")).toHaveCount(0);
    }
    await expect(rows.nth(0).locator(":scope > .stats-wrap")).toHaveCount(0);
    await expect(rows.nth(0).locator("a.avatar-wrap")).toHaveCount(0);
    const expectedMembers = [
      { loginId: "alice", userLabel: "Alice Kim" },
      { loginId: "admin", userLabel: "Site Admin" },
      { loginId: "admin", userLabel: "Site Admin" },
    ];
    for (let index = 1; index < 4; index++) {
      const memberLinks = rows
        .nth(index)
        .locator(
          ':scope > [data-owner="projects-directory-stats"] [data-owner="projects-directory-members-list"] > [data-owner="projects-directory-member-item"] > [data-owner="projects-directory-member-avatar"]',
        );
      await expect(memberLinks).toHaveCount(1);
      await expect(memberLinks).toHaveAttribute(
        "href",
        `${basePath}/${expectedMembers[index - 1]!.loginId}`,
      );
      const image = memberLinks.locator(":scope > img");
      await expect(image).toHaveAttribute("alt", expectedMembers[index - 1]!.userLabel);
      await expect(image).toHaveAttribute("src", memberAvatarDataUrl);
    }
    const actual = await page.evaluate(
      ({ listOwner, rowOwner }) => {
        const list = document.querySelector<HTMLElement>(`[data-owner="${listOwner}"]`)!;
        const rows = Array.from(
          list.querySelectorAll<HTMLElement>(`:scope > [data-owner="${rowOwner}"]`),
        );
        const box = (e: HTMLElement) => {
          const r = e.getBoundingClientRect();
          return { height: r.height, width: r.width, x: r.x, y: r.y };
        };
        const ls = getComputedStyle(list),
          rs = getComputedStyle(rows[0]!);
        return {
          list: box(list),
          rows: rows.map(box),
          listStyle: { clear: ls.clear, listStyle: ls.listStyleType, margin: ls.margin },
          rowStyle: { borderBottom: rs.borderBottom, overflow: rs.overflow, padding: rs.padding },
          paginationY: document.querySelector<HTMLElement>("#pagination")!.getBoundingClientRect()
            .y,
          scrollWidth: document.documentElement.scrollWidth,
        };
      },
      { listOwner, rowOwner },
    );
    expect(actual.list).toEqual(
      viewport.name === "desktop"
        ? { height: 364, width: 1346, x: 10, y: 201 }
        : { height: 544, width: 390, x: 0, y: 254 },
    );
    const heights = viewport.name === "desktop" ? [91, 91, 91, 91] : [91, 151, 151, 151];
    let y = viewport.name === "desktop" ? 201 : 254;
    expect(actual.rows).toEqual(
      heights.map((height) => {
        const box = {
          height,
          width: viewport.name === "desktop" ? 1346 : 390,
          x: viewport.name === "desktop" ? 10 : 0,
          y,
        };
        y += height;
        return box;
      }),
    );
    expect(actual.listStyle).toEqual({ clear: "both", listStyle: "none", margin: "0px 0px 20px" });
    expect(actual.rowStyle).toEqual({
      borderBottom: "1px solid rgb(220, 220, 220)",
      overflow: "hidden",
      padding: "15px 0px 10px",
    });
    expect(actual.paginationY).toBe(viewport.name === "desktop" ? 585 : 818);
    expect(actual.scrollWidth).toBe(viewport.width);
    for (let index = 1; index < actual.rows.length; index++)
      expect(actual.rows[index]!.y).toBe(
        actual.rows[index - 1]!.y + actual.rows[index - 1]!.height,
      );
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    expect(
      (
        await list.screenshot({
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `style-projects-list-shell-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
