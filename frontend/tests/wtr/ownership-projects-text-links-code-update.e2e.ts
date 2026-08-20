import { readFileSync, readFile, mergedLegacyBlock } from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

import { expect, test } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
// wtr-compat readFileSync's binary branch sets responseType=arraybuffer on a
// synchronous XHR, which documents reject (InvalidAccessError) — bucket-1 gap
// reported to main. readFile (async fetch) returns the PNG bytes; btoa keeps
// the original data-URL semantics.
const avatarDataUrl = `data:image/png;base64,${btoa(
  String.fromCharCode(
    ...((await readFile(
      resolve("src/assets/legacy/default-avatar-34.png"),
    )) as unknown as Uint8Array),
  ),
)}`;
const owners = {
  codeUpdate: "projects-directory-code-update",
  ownerLink: "projects-directory-owner-link",
  titleLink: "projects-directory-title-link",
} as const;

test.use({ locale: "ko-KR" });

async function mockProjects(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = {
    actorId: null,
    defaultLandingPath: "/",
    emailAddress: "",
    isAnonymous: true,
    isConfirmed: false,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "",
    userLabel: "",
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
            lastPushedLabel: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "alice", userLabel: "Alice Kim" }],
            overview: "Parity seed project for the alice workspace",
            ownerName: "alice",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            lastPushedLabel: "",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed Subversion project for localhost checks",
            ownerName: "admin",
            projectName: "svnplayground",
            projectScope: "public",
            watchCount: 1,
          },
          {
            createdLabel: "07-07",
            lastPushedLabel: "5일 전",
            memberCount: 1,
            members: [{ avatarUrl: avatarDataUrl, loginId: "admin", userLabel: "Site Admin" }],
            overview: "Parity seed project for the admin workspace",
            ownerName: "admin",
            projectName: "sample",
            projectScope: "public",
            watchCount: 1,
          },
        ],
        page: 1,
        pageNum: 1,
        total: 3,
        totalPages: 1,
      },
    }),
  );
}

async function open(page: Page) {
  await mockProjects(page);
  await page.goto(`${basePath}/projects`);
  await expect(page.locator(`[data-owner="${owners.titleLink}"]`).first()).toBeVisible({
    timeout: 2_000,
  });
}

test("projects text-link/code-update wave records the final frozen cascade and class retirement", () => {
  const route = readFileSync("src/routes/projects.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const scala = readFileSync("../yona-original/app/views/project/list.scala.html", "utf8");
  const siteLayout = readFileSync("../yona-original/app/views/siteLayout.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/layout.scala.html", "utf8");
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const messages = readFileSync("../yona-original/conf/messages.ko-KR", "utf8");

  expect(scala).toContain('<div class="header">');
  expect(scala).toContain('class="black">@project.name</a>');
  expect(scala).toContain('class="owner-name-small">@project.owner</a>');
  expect(scala).toContain(
    '<span class="small-font">@if(project.lastPushedDateAgo() != null) {, @Messages("project.codeUpdate")',
  );
  expect(siteLayout).toContain('@layout(Messages(title))("")');
  expect(layout).toContain('href="@routes.Assets.at("bootstrap/css/bootstrap.css")"');
  expect(layout).toContain('href="@routes.Assets.at("stylesheets/yobi.css")"');
  expect(yobi.trim().split("\n")).toEqual([
    '@import "less/_variables.less";',
    '@import "less/_mixins.less";',
    '@import "less/_common.less";',
    '@import "less/_sprites.less";',
    '@import "less/_page.less";',
    '@import "less/_tippy.less";',
    '@import "less/_scrollbar.less";',
    '@import "less/_responsive.less";',
    '@import "less/_yobiUI.less";',
    '@import "less/_temporary.less";',
    '@import "less/_markdown.less";',
    '@import "less/_migration.less";',
    '@import "less/_override.less";',
  ]);
  expect(bootstrap).toContain("a {\n  color: #0088cc;\n  text-decoration: none;");
  expect(bootstrap).toContain(
    "a:hover,\na:focus {\n  color: #005580;\n  text-decoration: underline;",
  );
  expect(common).toContain(
    "a {\n    color: inherit;\n    text-decoration: none;\n    outline: none;",
  );
  expect(common).toContain(".small-font{\n    font-size: 10px;\n    font-weight: normal;");
  expect(pageLess).toContain(".name-tag {\n                margin: 0;");
  expect(messages).toContain("project.codeUpdate = 마지막 코드 업데이트");

  expect(route.match(/data-owner="projects-directory-title-link"/gu)).toHaveLength(1);
  expect(route.match(/data-owner="projects-directory-owner-link"/gu)).toHaveLength(1);
  expect(route.match(/data-owner="projects-directory-code-update"/gu)).toHaveLength(1);
  expect(route).not.toContain('className="black"');

  expect(route).not.toContain('className="owner-name-small"');

  expect(route).not.toContain('className="small-font"');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
])
  test(`projects text-link/code-update wave preserves ${viewport.name} output`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await open(page);
    const titleLinks = page.locator(`[data-owner="${owners.titleLink}"]`);
    const ownerLinks = page.locator(`[data-owner="${owners.ownerLink}"]`);
    const codeUpdates = page.locator(`[data-owner="${owners.codeUpdate}"]`);

    await expect(titleLinks).toHaveCount(3);
    await expect(ownerLinks).toHaveCount(3);
    await expect(codeUpdates).toHaveCount(3);
    expect(await titleLinks.allTextContents()).toEqual(["sample", "svnplayground", "sample"]);
    expect(await ownerLinks.allTextContents()).toEqual(["alice", "admin", "admin"]);
    expect(
      await titleLinks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
    ).toEqual([
      `${basePath}/alice/sample`,
      `${basePath}/admin/svnplayground`,
      `${basePath}/admin/sample`,
    ]);
    expect(
      await ownerLinks.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href"))),
    ).toEqual([
      `${basePath}/alice?daysAgo=14&selected=issues`,
      `${basePath}/admin?daysAgo=14&selected=issues`,
      `${basePath}/admin?daysAgo=14&selected=issues`,
    ]);
    expect(await codeUpdates.allTextContents()).toEqual(["", "", ", 마지막 코드 업데이트 5일 전"]);
    // wtr-compat: plainLocator.nth(i).locator(":scope > X") drops the parent
    // index in resolveElements (count aggregates across all parents) —
    // bucket-1 gap reported to main; evaluate narrows to the single nth element.
    expect(
      await codeUpdates.nth(0).evaluate((node) => node.querySelectorAll(":scope > strong").length),
    ).toBe(0);
    expect(
      await codeUpdates.nth(1).evaluate((node) => node.querySelectorAll(":scope > strong").length),
    ).toBe(0);
    // wtr-compat: nth(i).locator(":scope > X") keeps the parent index on the
    // aggregate children set, so current() can land out of range ("" here) —
    // bucket-1 gap reported to main; evaluate narrows to the nth element.
    expect(
      await codeUpdates
        .nth(2)
        .evaluate((node) => node.querySelector(":scope > strong")?.textContent ?? ""),
    ).toBe("5일 전");
    expect(
      await titleLinks.evaluateAll((nodes) =>
        nodes.every((node) => !node.classList.contains("black")),
      ),
    ).toBe(true);
    expect(
      await ownerLinks.evaluateAll((nodes) =>
        nodes.every((node) => !node.classList.contains("owner-name-small")),
      ),
    ).toBe(true);
    expect(
      await codeUpdates.evaluateAll((nodes) =>
        nodes.every((node) => !node.classList.contains("small-font")),
      ),
    ).toBe(true);
    for (const link of [titleLinks.first(), ownerLinks.first()]) {
      await expect(link).not.toHaveAttribute("aria-current");
      await expect(link).not.toHaveAttribute("data-status");
    }

    const actual = await page.evaluate((ownerNames) => {
      const titleLinks = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.titleLink}"]`),
      );
      const ownerLinks = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.ownerLink}"]`),
      );
      const codeUpdates = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-owner="${ownerNames.codeUpdate}"]`),
      );
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const style = (element: HTMLElement) => {
        const computed = getComputedStyle(element);
        return {
          color: computed.color,
          display: computed.display,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          outlineColor: computed.outlineColor,
          outlineStyle: computed.outlineStyle,
          outlineWidth: computed.outlineWidth,
          textDecorationLine: computed.textDecorationLine,
        };
      };
      return {
        codeUpdates: codeUpdates.map((element) => ({ box: box(element), style: style(element) })),
        ownerLinks: ownerLinks.map((element) => ({ box: box(element), style: style(element) })),
        scrollWidth: document.documentElement.scrollWidth,
        strong: {
          box: box(codeUpdates[2]!.querySelector("strong")!),
          style: style(codeUpdates[2]!.querySelector("strong")!),
        },
        titleLinks: titleLinks.map((element) => ({ box: box(element), style: style(element) })),
      };
    }, owners);

    const desktop = viewport.name === "desktop";
    expect(actual.titleLinks.map(({ box }) => box)).toEqual(
      [
        [68.4375, desktop ? 80 : 70, desktop ? 171 : 171],
        [139.9375, desktop ? 80 : 70, desktop ? 262 : 322],
        [68.4375, desktop ? 80 : 70, desktop ? 353 : 473],
      ].map(([width, x, y]) => ({ height: 23, width, x, y })),
    );
    expect(actual.ownerLinks.map(({ box }) => box)).toEqual(
      [
        [24.34375, desktop ? 95.8125 : 85.8125, 221],
        [31.859375, desktop ? 95.8125 : 85.8125, desktop ? 312 : 372],
        [31.859375, desktop ? 95.8125 : 85.8125, desktop ? 403 : 523],
      ].map(([width, x, y]) => ({ height: 13, width, x, y })),
    );
    expect(actual.codeUpdates.map(({ box }) => box)).toEqual(
      [
        [0, desktop ? 170.265625 : 160.265625, 222],
        [0, desktop ? 177.78125 : 167.78125, desktop ? 313 : 373],
        [119.40625, desktop ? 180.953125 : 170.953125, desktop ? 404 : 524],
      ].map(([width, x, y]) => ({ height: 12, width, x, y })),
    );
    expect(actual.strong.box).toEqual({
      height: 12,
      width: 26.75,
      x: desktop ? 273.609375 : 263.609375,
      y: desktop ? 404 : 524,
    });
    for (const title of actual.titleLinks)
      expect(title.style).toEqual({
        color: "rgb(51, 51, 51)",
        display: "inline",
        fontSize: "20px",
        fontWeight: "700",
        lineHeight: "20px",
        outlineColor: "rgb(51, 51, 51)",
        outlineStyle: "none",
        outlineWidth: "3px",
        textDecorationLine: "none",
      });
    for (const owner of actual.ownerLinks)
      expect(owner.style).toEqual({
        color: "rgb(153, 153, 153)",
        display: "inline",
        fontSize: "11px",
        fontWeight: "400",
        lineHeight: "20px",
        outlineColor: "rgb(153, 153, 153)",
        outlineStyle: "none",
        outlineWidth: "3px",
        textDecorationLine: "none",
      });
    for (const update of actual.codeUpdates)
      expect(update.style).toEqual({
        color: "rgb(153, 153, 153)",
        display: "inline",
        fontSize: "10px",
        fontWeight: "400",
        lineHeight: "20px",
        outlineColor: "rgb(153, 153, 153)",
        outlineStyle: "none",
        outlineWidth: "3px",
        textDecorationLine: "none",
      });
    expect(actual.strong.style).toMatchObject({
      color: "rgb(153, 153, 153)",
      fontSize: "10px",
      fontWeight: "700",
      lineHeight: "20px",
    });
    expect(actual.scrollWidth).toBe(viewport.width);

    for (const link of [titleLinks.first(), ownerLinks.first()]) {
      await link.hover();
      await expect
        .poll(() =>
          link.evaluate((node) => {
            const style = getComputedStyle(node);
            return [style.color, style.textDecorationLine, style.outlineStyle];
          }),
        )
        .toEqual(["rgb(0, 85, 128)", "underline", "none"]);
      await link.focus();
      await expect
        .poll(() =>
          link.evaluate((node) => {
            const style = getComputedStyle(node);
            return [style.color, style.textDecorationLine, style.outlineStyle];
          }),
        )
        .toEqual(["rgb(0, 85, 128)", "underline", "none"]);
    }

    await page.mouse.move(0, 0);
    await page.locator('#search input[name="filter"]').focus();
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    expect(
      (
        await page.screenshot({
          path: resolve(
            "..",
            "output",
            "playwright",
            "visual-sweep",
            `style-projects-text-links-code-update-${viewport.name}.png`,
          ),
        })
      ).byteLength,
    ).toBeGreaterThan(0);
  });
